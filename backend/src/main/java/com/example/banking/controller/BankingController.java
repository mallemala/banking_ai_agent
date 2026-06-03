package com.example.banking.controller;

import com.example.banking.model.*;
import com.example.banking.repository.BudgetRepository;
import com.example.banking.repository.CategoryRepository;
import com.example.banking.repository.GoalRepository;
import com.example.banking.repository.TransactionRepository;
import com.example.banking.repository.UserRepository;
import com.example.banking.service.StatementService;
import jakarta.servlet.http.HttpServletResponse;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.multipart.MultipartFile;

import java.io.OutputStream;
import java.io.PrintWriter;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/statement")
public class BankingController {

    private static final Logger logger = LoggerFactory.getLogger(BankingController.class);

    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;
    private final BudgetRepository budgetRepository;
    private final GoalRepository goalRepository;
    private final CategoryRepository categoryRepository;
    private final StatementService statementService;

    public BankingController(
            UserRepository userRepository,
            TransactionRepository transactionRepository,
            BudgetRepository budgetRepository,
            GoalRepository goalRepository,
            CategoryRepository categoryRepository,
            StatementService statementService
    ) {
        this.userRepository = userRepository;
        this.transactionRepository = transactionRepository;
        this.budgetRepository = budgetRepository;
        this.goalRepository = goalRepository;
        this.categoryRepository = categoryRepository;
        this.statementService = statementService;
    }

    private User getAuthenticatedUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));
    }

    @PostMapping("/upload")
    public ResponseEntity<?> upload(
            @RequestParam("files") MultipartFile[] files,
            @RequestHeader(value = "X-Gemini-API-Key", required = false) String clientApiKey
    ) {
        User user = getAuthenticatedUser();
        logger.info("Uploading {} files for user: {}", files.length, user.getEmail());
        
        List<String> successFiles = new ArrayList<>();
        List<String> errorFiles = new ArrayList<>();
        
        for (MultipartFile file : files) {
            if (file.isEmpty()) {
                continue;
            }
            logger.info("Processing file '{}' (size: {} bytes, type: {}) for user: {}", 
                    file.getOriginalFilename(), file.getSize(), file.getContentType(), user.getEmail());
            try {
                Statement stmt = statementService.uploadAndParse(
                        file.getBytes(),
                        file.getOriginalFilename(),
                        file.getContentType(),
                        user,
                        clientApiKey
                );
                logger.info("Successfully uploaded and parsed statement '{}'. ID: {}, status: {}", 
                        file.getOriginalFilename(), stmt.getId(), stmt.getProcessingStatus());
                successFiles.add(file.getOriginalFilename());
            } catch (Exception e) {
                logger.error("Error processing file upload '{}' for user '{}': {}", 
                        file.getOriginalFilename(), user.getEmail(), e.getMessage(), e);
                errorFiles.add(file.getOriginalFilename() + ": " + e.getMessage());
            }
        }
        
        try {
            Map<String, Object> summary = statementService.getDashboardSummary(user, clientApiKey);
            summary.put("successFiles", successFiles);
            if (!errorFiles.isEmpty()) {
                summary.put("errors", errorFiles);
            }
            return ResponseEntity.ok(summary);
        } catch (Exception e) {
            logger.error("Error fetching dashboard summary after processing upload for user '{}': {}", 
                    user.getEmail(), e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Error calculating dashboard summary: " + e.getMessage()));
        }
    }

    @GetMapping("/summary")
    public ResponseEntity<?> getSummary(@RequestHeader(value = "X-Gemini-API-Key", required = false) String clientApiKey) {
        User user = getAuthenticatedUser();
        logger.info("Fetching dashboard summary for user: {}", user.getEmail());
        try {
            Map<String, Object> summary = statementService.getDashboardSummary(user, clientApiKey);
            return ResponseEntity.ok(summary);
        } catch (Exception e) {
            logger.error("Error fetching dashboard summary for user '{}': {}", user.getEmail(), e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Error: " + e.getMessage()));
        }
    }

    @GetMapping("/transactions")
    public ResponseEntity<?> getTransactions(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size,
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "month", required = false) String month,
            @RequestParam(value = "sortBy", defaultValue = "date") String sortBy,
            @RequestParam(value = "sortDir", defaultValue = "desc") String sortDir
    ) {
        User user = getAuthenticatedUser();
        logger.info("Querying transactions for user: {} (page: {}, size: {}, search: '{}', month: '{}', sortBy: '{}', sortDir: '{}')",
                user.getEmail(), page, size, search, month, sortBy, sortDir);
        Sort.Direction direction = Sort.Direction.fromString(sortDir.toUpperCase());
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        
        Page<Transaction> txPage;
        if (month != null && !month.trim().isEmpty()) {
            LocalDate startDate = LocalDate.parse(month.trim() + "-01");
            LocalDate endDate = startDate.plusMonths(1).minusDays(1);
            if (search == null || search.trim().isEmpty()) {
                txPage = transactionRepository.findByUserIdAndDateRangePaged(user.getId(), startDate, endDate, pageable);
            } else {
                txPage = transactionRepository.findByUserIdAndSearchAndDateRangePaged(user.getId(), search.trim(), startDate, endDate, pageable);
            }
        } else {
            if (search == null || search.trim().isEmpty()) {
                txPage = transactionRepository.findByUserIdPaged(user.getId(), pageable);
            } else {
                txPage = transactionRepository.findByUserIdAndSearch(user.getId(), search.trim(), pageable);
            }
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("content", txPage.getContent());
        response.put("currentPage", txPage.getNumber());
        response.put("totalItems", txPage.getTotalElements());
        response.put("totalPages", txPage.getTotalPages());
        
        logger.info("Returned {} transactions of total {} items for user: {}", 
                txPage.getNumberOfElements(), txPage.getTotalElements(), user.getEmail());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/months")
    public ResponseEntity<?> getDistinctMonths() {
        User user = getAuthenticatedUser();
        logger.info("Fetching distinct transaction months for user: {}", user.getEmail());
        List<LocalDate> dates = transactionRepository.findDistinctTransactionDatesByUserId(user.getId());
        
        java.time.format.DateTimeFormatter valueFormatter = java.time.format.DateTimeFormatter.ofPattern("yyyy-MM");
        java.time.format.DateTimeFormatter labelFormatter = java.time.format.DateTimeFormatter.ofPattern("MMMM yyyy", java.util.Locale.ENGLISH);
        
        Map<String, String> monthMap = new TreeMap<>(Comparator.reverseOrder());
        for (LocalDate date : dates) {
            String val = date.format(valueFormatter);
            String label = date.format(labelFormatter);
            monthMap.put(val, label);
        }
        
        List<Map<String, String>> response = new ArrayList<>();
        for (Map.Entry<String, String> entry : monthMap.entrySet()) {
            Map<String, String> m = new HashMap<>();
            m.put("value", entry.getKey());
            m.put("label", entry.getValue());
            response.add(m);
        }
        
        return ResponseEntity.ok(response);
    }

    @PutMapping("/transactions/{id}/category")
    public ResponseEntity<?> updateCategory(
            @PathVariable("id") UUID id,
            @RequestBody Map<String, String> request
    ) {
        User user = getAuthenticatedUser();
        String newCategory = request.get("category");
        logger.info("Request to update transaction category. ID: {}, New Category: '{}', User: {}", 
                id, newCategory, user.getEmail());
        if (newCategory == null || newCategory.trim().isEmpty()) {
            logger.warn("Update category failed: category name cannot be empty");
            return ResponseEntity.badRequest().body(Map.of("message", "Category cannot be empty"));
        }
        try {
            Transaction t = statementService.updateTransactionCategory(id, newCategory, user);
            logger.info("Successfully updated transaction {} category to '{}'", id, newCategory);
            return ResponseEntity.ok(t);
        } catch (Exception e) {
            logger.error("Failed to update transaction category for transaction '{}': {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/suggestions")
    public ResponseEntity<?> getSuggestions(@RequestHeader(value = "X-Gemini-API-Key", required = false) String clientApiKey) {
        User user = getAuthenticatedUser();
        logger.info("Fetching savings recommendations for user: {}", user.getEmail());
        try {
            String suggestions = statementService.getSavingsRecommendations(user, clientApiKey);
            return ResponseEntity.ok(Map.of("recommendations", suggestions));
        } catch (Exception e) {
            logger.error("Error fetching savings recommendations for user '{}': {}", user.getEmail(), e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/forecast")
    public ResponseEntity<?> getForecast(@RequestHeader(value = "X-Gemini-API-Key", required = false) String clientApiKey) {
        User user = getAuthenticatedUser();
        logger.info("Fetching balance forecasting for user: {}", user.getEmail());
        try {
            Map<String, Object> forecast = statementService.getForecast(user, clientApiKey);
            return ResponseEntity.ok(forecast);
        } catch (Exception e) {
            logger.error("Error fetching forecast for user '{}': {}", user.getEmail(), e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/subscriptions")
    public ResponseEntity<?> getSubscriptions() {
        User user = getAuthenticatedUser();
        logger.info("Fetching active subscriptions list for user: {}", user.getEmail());
        return ResponseEntity.ok(statementService.getSubscriptions(user));
    }

    @PostMapping("/chat")
    public ResponseEntity<?> chat(
            @RequestBody Map<String, Object> request,
            @RequestHeader(value = "X-Gemini-API-Key", required = false) String clientApiKey
    ) {
        User user = getAuthenticatedUser();
        String message = (String) request.get("message");
        List<Map<String, String>> history = (List<Map<String, String>>) request.get("history");
        if (history == null) {
            history = Collections.emptyList();
        }

        logger.info("Received chatbot query from user '{}' (message length: {}, history size: {})", 
                user.getEmail(), message != null ? message.length() : 0, history.size());
        try {
            String reply = statementService.askChatbot(user, message, history, clientApiKey);
            logger.info("Chatbot query successfully answered (reply length: {})", reply != null ? reply.length() : 0);
            return ResponseEntity.ok(Map.of("reply", reply));
        } catch (Exception e) {
            logger.error("Error in chatbot conversation for user '{}': {}", user.getEmail(), e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", e.getMessage()));
        }
    }

    // Budgets endpoints
    @GetMapping("/budget")
    public ResponseEntity<List<Budget>> getBudgets() {
        User user = getAuthenticatedUser();
        logger.info("Fetching budgets for user: {}", user.getEmail());
        return ResponseEntity.ok(budgetRepository.findByUserId(user.getId()));
    }

    @PostMapping("/budget")
    public ResponseEntity<?> saveBudget(@RequestBody Map<String, Object> request) {
        User user = getAuthenticatedUser();
        String category = (String) request.get("category");
        double limit = Double.parseDouble(request.get("limit").toString());

        logger.info("Saving budget limit of {} for category '{}' for user: {}", limit, category, user.getEmail());
        Budget b = budgetRepository.findByUserIdAndCategory(user.getId(), category)
                .orElse(new Budget(user, category, limit));
        b.setMonthlyLimit(limit);
        budgetRepository.save(b);
        logger.info("Successfully saved budget. ID: {}", b.getId());
        return ResponseEntity.ok(b);
    }

    @DeleteMapping("/budget/{id}")
    public ResponseEntity<?> deleteBudget(@PathVariable("id") UUID id) {
        User user = getAuthenticatedUser();
        logger.info("Request to delete budget {} by user: {}", id, user.getEmail());
        Budget b = budgetRepository.findById(id).orElse(null);
        if (b == null || !b.getUser().getId().equals(user.getId())) {
            logger.warn("Unauthorized or non-existent budget deletion attempt of {} by user: {}", id, user.getEmail());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        budgetRepository.delete(b);
        logger.info("Successfully deleted budget {}", id);
        return ResponseEntity.ok(Map.of("message", "Budget deleted"));
    }

    // Goals endpoints
    @GetMapping("/goals")
    public ResponseEntity<List<Goal>> getGoals() {
        User user = getAuthenticatedUser();
        logger.info("Fetching goals for user: {}", user.getEmail());
        return ResponseEntity.ok(goalRepository.findByUserId(user.getId()));
    }

    @PostMapping("/goals")
    public ResponseEntity<?> saveGoal(@RequestBody Map<String, Object> request) {
        User user = getAuthenticatedUser();
        String name = (String) request.get("name");
        double target = Double.parseDouble(request.get("targetAmount").toString());
        double current = Double.parseDouble(request.get("currentAmount").toString());

        logger.info("Saving goal '{}' (target: {}, current: {}) for user: {}", name, target, current, user.getEmail());
        Goal g = new Goal(user, name, target, current);
        if (request.containsKey("id") && request.get("id") != null) {
            g.setId(UUID.fromString(request.get("id").toString()));
        }
        goalRepository.save(g);
        logger.info("Successfully saved goal. ID: {}", g.getId());
        return ResponseEntity.ok(g);
    }

    @DeleteMapping("/goals/{id}")
    public ResponseEntity<?> deleteGoal(@PathVariable("id") UUID id) {
        User user = getAuthenticatedUser();
        logger.info("Request to delete goal {} by user: {}", id, user.getEmail());
        Goal g = goalRepository.findById(id).orElse(null);
        if (g == null || !g.getUser().getId().equals(user.getId())) {
            logger.warn("Unauthorized or non-existent goal deletion attempt of {} by user: {}", id, user.getEmail());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        goalRepository.delete(g);
        logger.info("Successfully deleted goal {}", id);
        return ResponseEntity.ok(Map.of("message", "Goal deleted"));
    }

    // Exports
    @GetMapping("/export")
    public void exportTransactions(
            @RequestParam(value = "format", defaultValue = "csv") String format,
            HttpServletResponse response
    ) throws Exception {
        User user = getAuthenticatedUser();
        logger.info("Request to export transactions in format '{}' for user: {}", format, user.getEmail());
        List<Transaction> transactions = transactionRepository.findByUserId(user.getId());
        transactions.sort(Comparator.comparing(Transaction::getDate).reversed());
        logger.info("Exporting {} transactions for user: {}", transactions.size(), user.getEmail());

        if ("csv".equalsIgnoreCase(format)) {
            response.setContentType("text/csv");
            response.setHeader("Content-Disposition", "attachment; filename=\"transactions.csv\"");
            try (PrintWriter writer = response.getWriter()) {
                writer.println("Date,Description,Merchant,Category,Amount,Type,Running Balance");
                for (Transaction t : transactions) {
                    writer.printf("%s,\"%s\",\"%s\",%s,%.2f,%s,%.2f\n",
                            t.getDate(),
                            t.getDescription().replace("\"", "\"\""),
                            t.getMerchant().replace("\"", "\"\""),
                            t.getCategory(),
                            t.getAmount(),
                            t.getTransactionType(),
                            t.getRunningBalance()
                    );
                }
            }
            logger.info("Successfully exported transactions in CSV format for user: {}", user.getEmail());
        } else if ("xlsx".equalsIgnoreCase(format)) {
            response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            response.setHeader("Content-Disposition", "attachment; filename=\"transactions.xlsx\"");
            try (Workbook workbook = new XSSFWorkbook();
                 OutputStream out = response.getOutputStream()) {
                Sheet sheet = workbook.createSheet("Transactions");
                
                // Header row
                Row header = sheet.createRow(0);
                header.createCell(0).setCellValue("Date");
                header.createCell(1).setCellValue("Description");
                header.createCell(2).setCellValue("Merchant");
                header.createCell(3).setCellValue("Category");
                header.createCell(4).setCellValue("Amount");
                header.createCell(5).setCellValue("Type");
                header.createCell(6).setCellValue("Running Balance");

                int rowIdx = 1;
                for (Transaction t : transactions) {
                    Row row = sheet.createRow(rowIdx++);
                    row.createCell(0).setCellValue(t.getDate().toString());
                    row.createCell(1).setCellValue(t.getDescription());
                    row.createCell(2).setCellValue(t.getMerchant());
                    row.createCell(3).setCellValue(t.getCategory());
                    row.createCell(4).setCellValue(t.getAmount());
                    row.createCell(5).setCellValue(t.getTransactionType());
                    row.createCell(6).setCellValue(t.getRunningBalance());
                }
                workbook.write(out);
            }
            logger.info("Successfully exported transactions in XLSX format for user: {}", user.getEmail());
        } else if ("pdf".equalsIgnoreCase(format)) {
            response.setContentType("application/pdf");
            response.setHeader("Content-Disposition", "attachment; filename=\"transactions.pdf\"");
            try (PDDocument doc = new PDDocument();
                 OutputStream out = response.getOutputStream()) {
                PDPage page = new PDPage();
                doc.addPage(page);
                
                try (PDPageContentStream contentStream = new PDPageContentStream(doc, page)) {
                    contentStream.beginText();
                    contentStream.setFont(PDType1Font.HELVETICA_BOLD, 14);
                    contentStream.newLineAtOffset(50, 750);
                    contentStream.showText("Banking AI Agent - Transaction Statement");
                    contentStream.newLineAtOffset(0, -25);
                    
                    contentStream.setFont(PDType1Font.HELVETICA, 9);
                    contentStream.showText(String.format("Date: %s | User: %s", LocalDate.now(), user.getEmail()));
                    contentStream.newLineAtOffset(0, -30);
                    
                    // Simple table list
                    contentStream.setFont(PDType1Font.HELVETICA_BOLD, 9);
                    contentStream.showText("Date         | Merchant         | Category         | Amount    | Balance");
                    contentStream.newLineAtOffset(0, -15);
                    contentStream.setFont(PDType1Font.HELVETICA, 8);
                    
                    int lines = 0;
                    for (Transaction t : transactions) {
                        if (lines++ > 30) {
                            // limit to one page for simple mock PDF export
                            break;
                        }
                        String line = String.format("%-12s | %-16s | %-16s | %-9.2f | %-9.2f",
                                t.getDate().toString(),
                                truncate(t.getMerchant(), 15),
                                truncate(t.getCategory(), 15),
                                t.getAmount(),
                                t.getRunningBalance()
                        );
                        contentStream.showText(line);
                        contentStream.newLineAtOffset(0, -15);
                    }
                    contentStream.endText();
                }
                doc.save(out);
            }
        }
    }

    private String truncate(String val, int maxLen) {
        if (val == null) return "";
        if (val.length() <= maxLen) return val;
        return val.substring(0, maxLen - 3) + "...";
    }

    @GetMapping("/categories")
    public ResponseEntity<?> getCategories() {
        User user = getAuthenticatedUser();
        logger.info("Fetching categories list for user: {}", user.getEmail());
        List<String> categories = statementService.getUserCategories(user);
        return ResponseEntity.ok(categories);
    }

    @PostMapping("/categories")
    public ResponseEntity<?> createCategory(@RequestBody Map<String, String> request) {
        User user = getAuthenticatedUser();
        String name = request.get("name");
        logger.info("Request to create custom category '{}' for user: {}", name, user.getEmail());
        if (name == null || name.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Category name cannot be empty"));
        }
        name = name.trim();
        if (categoryRepository.existsByUserIdAndNameIgnoreCase(user.getId(), name)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Category already exists"));
        }
        Category cat = new Category(user, name);
        categoryRepository.save(cat);
        logger.info("Successfully created custom category '{}'. ID: {}", name, cat.getId());
        return ResponseEntity.ok(cat);
    }

    @PutMapping("/transactions/bulk-category")
    public ResponseEntity<?> bulkUpdateCategory(@RequestBody Map<String, Object> request) {
        User user = getAuthenticatedUser();
        List<String> idsStr = (List<String>) request.get("ids");
        String newCategory = (String) request.get("category");
        
        logger.info("Request from user '{}' to bulk update {} transactions to category '{}'", 
                user.getEmail(), idsStr != null ? idsStr.size() : 0, newCategory);
        
        if (idsStr == null || idsStr.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Transaction IDs cannot be empty"));
        }
        if (newCategory == null || newCategory.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Category cannot be empty"));
        }
        
        try {
            List<UUID> ids = idsStr.stream().map(UUID::fromString).collect(Collectors.toList());
            statementService.bulkUpdateTransactionCategory(ids, newCategory, user);
            return ResponseEntity.ok(Map.of("message", "Successfully updated " + ids.size() + " transactions"));
        } catch (Exception e) {
            logger.error("Failed to bulk update categories: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        }
    }
}
