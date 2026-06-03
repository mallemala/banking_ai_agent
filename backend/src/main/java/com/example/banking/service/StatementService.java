package com.example.banking.service;

import com.example.banking.model.*;
import com.example.banking.repository.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class StatementService {

    private static final Logger logger = LoggerFactory.getLogger(StatementService.class);

    private final StatementRepository statementRepository;
    private final TransactionRepository transactionRepository;
    private final BudgetRepository budgetRepository;
    private final GoalRepository goalRepository;
    private final AIInsightRepository aiInsightRepository;
    private final AuditLogRepository auditLogRepository;
    private final CategoryRepository categoryRepository;
    private final StatementParser statementParser;
    private final GeminiClient geminiClient;
    private final ObjectMapper objectMapper;

    public StatementService(
            StatementRepository statementRepository,
            TransactionRepository transactionRepository,
            BudgetRepository budgetRepository,
            GoalRepository goalRepository,
            AIInsightRepository aiInsightRepository,
            AuditLogRepository auditLogRepository,
            CategoryRepository categoryRepository,
            StatementParser statementParser,
            GeminiClient geminiClient,
            ObjectMapper objectMapper
    ) {
        this.statementRepository = statementRepository;
        this.transactionRepository = transactionRepository;
        this.budgetRepository = budgetRepository;
        this.goalRepository = goalRepository;
        this.aiInsightRepository = aiInsightRepository;
        this.auditLogRepository = auditLogRepository;
        this.categoryRepository = categoryRepository;
        this.statementParser = statementParser;
        this.geminiClient = geminiClient;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public Statement uploadAndParse(byte[] fileBytes, String filename, String contentType, User user, String clientApiKey) throws Exception {
        logger.info("Initializing statement parse for file '{}', user: {}", filename, user.getEmail());
        
        String fileHash = calculateSHA256(fileBytes);
        Optional<Statement> existing = statementRepository.findByUserAndFileHash(user, fileHash);
        if (existing.isPresent()) {
            Statement existingStatement = existing.get();
            if (existingStatement.getProcessingStatus() == Statement.Status.SUCCESS) {
                logger.warn("User {} uploaded duplicate statement '{}' (already parsed successfully)", user.getEmail(), filename);
                throw new IllegalArgumentException("This statement has already been uploaded and processed.");
            } else if (existingStatement.getProcessingStatus() == Statement.Status.PROCESSING) {
                logger.warn("User {} uploaded duplicate statement '{}' (currently processing)", user.getEmail(), filename);
                throw new IllegalArgumentException("This statement is currently being processed.");
            }
            logger.info("Deleting old failed statement attempt for file: {}", filename);
            statementRepository.delete(existingStatement);
            statementRepository.flush();
        }

        // Save initial statement entry
        Statement statement = new Statement(user, filename, "", Statement.Status.PROCESSING);
        statement.setFileHash(fileHash);
        statement = statementRepository.save(statement);
        
        logAudit(user.getEmail(), "UPLOAD_STATEMENT", "Uploaded statement file: " + filename);

        try {
            // Parse transactions
            logger.info("Invoking statement parser for: {}", filename);
            List<String> categories = getUserCategories(user);
            List<Transaction> transactions = statementParser.parse(fileBytes, filename, contentType, clientApiKey, statement, categories);
            logger.info("Parsed {} transactions from file '{}'", transactions.size(), filename);
            
            // Save transactions
            transactionRepository.saveAll(transactions);
            logger.info("Saved {} transactions to DB for user: {}", transactions.size(), user.getEmail());
            
            // Mark statement success
            statement.setProcessingStatus(Statement.Status.SUCCESS);
            statement = statementRepository.save(statement);
            
            // Evict caches
            evictUserCaches(user.getId());
            
            logAudit(user.getEmail(), "PARSE_STATEMENT_SUCCESS", "Successfully extracted " + transactions.size() + " transactions from " + filename);
            return statement;
        } catch (Exception e) {
            logger.error("Failed to parse statement '{}' for user '{}': {}", filename, user.getEmail(), e.getMessage(), e);
            statement.setProcessingStatus(Statement.Status.FAILED);
            statementRepository.save(statement);
            logAudit(user.getEmail(), "PARSE_STATEMENT_FAILED", "Failed parsing " + filename + ": " + e.getMessage());
            throw e;
        }
    }

    public Map<String, Object> getDashboardSummary(User user, String clientApiKey) throws Exception {
        UUID userId = user.getId();
        List<Transaction> transactions = transactionRepository.findByUserId(userId);
        
        Map<String, Object> summary = new HashMap<>();
        
        if (transactions.isEmpty()) {
            summary.put("openingBalance", 0.0);
            summary.put("closingBalance", 0.0);
            summary.put("totalIncoming", 0.0);
            summary.put("totalOutgoing", 0.0);
            summary.put("netFlow", 0.0);
            summary.put("transactionCount", 0);
            summary.put("healthScore", 0);
            summary.put("healthInsight", "No data uploaded yet. Please upload a bank statement.");
            return summary;
        }

        // Run calculations
        double incoming = 0.0;
        double outgoing = 0.0;
        double minBalance = Double.MAX_VALUE;
        double maxBalance = -Double.MAX_VALUE;
        
        // Sort transactions by date
        transactions.sort(Comparator.comparing(Transaction::getDate).thenComparing(Transaction::getId));
        
        for (Transaction t : transactions) {
            if ("CREDIT".equalsIgnoreCase(t.getTransactionType()) || t.getAmount() > 0) {
                incoming += Math.abs(t.getAmount());
            } else {
                outgoing += Math.abs(t.getAmount());
            }
            double bal = t.getRunningBalance();
            if (bal != 0.0) {
                if (bal < minBalance) minBalance = bal;
                if (bal > maxBalance) maxBalance = bal;
            }
        }

        double netFlow = incoming - outgoing;
        
        // Resolve opening and closing balance
        double openingBalance = 0.0;
        double closingBalance = 0.0;
        
        if (!transactions.isEmpty()) {
            Transaction first = transactions.get(0);
            Transaction last = transactions.get(transactions.size() - 1);
            openingBalance = first.getRunningBalance() - first.getAmount();
            closingBalance = last.getRunningBalance();
            if (openingBalance == 0.0 && closingBalance == 0.0) {
                // Defaulting logic if running balance not extracted
                openingBalance = 1000.0; // fallback arbitrary
                closingBalance = openingBalance + netFlow;
            }
        }

        summary.put("openingBalance", openingBalance);
        summary.put("closingBalance", closingBalance);
        summary.put("totalIncoming", incoming);
        summary.put("totalOutgoing", outgoing);
        summary.put("netFlow", netFlow);
        summary.put("transactionCount", transactions.size());

        // Health Score (cache in database)
        Optional<AIInsight> scoreInsight = getCachedInsight(userId, "HEALTH_SCORE");
        if (scoreInsight.isPresent()) {
            logger.info("Retrieved health score from cache for user: {}", user.getEmail());
            JsonNode scoreNode = objectMapper.readTree(scoreInsight.get().getContent());
            summary.put("healthScore", scoreNode.get("score").asInt());
            summary.put("healthInsight", scoreNode.get("insight").asText());
        } else {
            logger.info("Cache miss: generating new health score for user: {}", user.getEmail());
            Map<String, Object> health = generateHealthScore(transactions, clientApiKey);
            AIInsight insight = new AIInsight(user, "HEALTH_SCORE", objectMapper.writeValueAsString(health));
            aiInsightRepository.save(insight);
            summary.put("healthScore", health.get("score"));
            summary.put("healthInsight", health.get("insight"));
            logger.info("Successfully cached new health score for user: {}", user.getEmail());
        }

        return summary;
    }

    private Map<String, Object> generateHealthScore(List<Transaction> transactions, String apiKey) throws Exception {
        String dataSummary = formatTransactionsForAI(transactions);
        String prompt = "Review these user banking transactions and evaluate their financial health.\n" +
                "Evaluate based on:\n" +
                "- Savings rate (surplus income)\n" +
                "- Spending consistency (discretionary spending patterns)\n" +
                "- Income stability\n" +
                "- Recurring obligations/subscriptions burden\n" +
                "\n" +
                "Provide a numeric score from 0-100 and a 2-3 sentence overall health insight summarizing strengths and improvement areas.\n" +
                "Return output strictly as a JSON object: \n" +
                "{\n" +
                "  \"score\": 75,\n" +
                "  \"insight\": \"Your savings rate is strong at 25%, but utilities and miscellaneous subscriptions represent a high percentage of monthly cash flow. Consider consolidating streaming packages to save $40 monthly.\"\n" +
                "}\n" +
                "\n" +
                "Transactions data:\n" +
                dataSummary;

        logger.info("Calling Gemini for health score generation...");
        String response = geminiClient.generateContent(prompt, apiKey, true);
        Map<String, Object> result = new HashMap<>();
        try {
            JsonNode node = objectMapper.readTree(response);
            result.put("score", node.get("score").asInt());
            result.put("insight", node.get("insight").asText());
        } catch (Exception e) {
            logger.warn("Failed to parse health score JSON response: '{}'. Falling back to regex extraction.", response, e);
            int score = extractScoreFromText(response);
            result.put("score", score);
            result.put("insight", response != null ? response.trim() : "Unable to generate insight from transaction history.");
        }
        logger.info("Generated health score: {}", result.get("score"));
        return result;
    }

    public List<Map<String, Object>> getSubscriptions(User user) {
        List<Transaction> transactions = transactionRepository.findByUserId(user.getId());
        List<Transaction> subs = transactions.stream()
                .filter(t -> "Subscriptions".equalsIgnoreCase(t.getCategory()))
                .collect(Collectors.toList());

        // Group by merchant and aggregate average amount
        Map<String, DoubleSummaryStatistics> stats = subs.stream()
                .collect(Collectors.groupingBy(
                        Transaction::getMerchant,
                        Collectors.summarizingDouble(t -> Math.abs(t.getAmount()))
                ));

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map.Entry<String, DoubleSummaryStatistics> entry : stats.entrySet()) {
            Map<String, Object> subMap = new HashMap<>();
            double monthlyCost = entry.getValue().getAverage();
            subMap.put("name", entry.getKey());
            subMap.put("monthlyCost", monthlyCost);
            subMap.put("annualCost", monthlyCost * 12);
            subMap.put("frequency", "Monthly");
            result.add(subMap);
        }
        return result;
    }

    public String getSavingsRecommendations(User user, String clientApiKey) throws Exception {
        UUID userId = user.getId();
        Optional<AIInsight> cached = getCachedInsight(userId, "SAVINGS_RECOMMENDATIONS");
        if (cached.isPresent()) {
            logger.info("Retrieved savings recommendations from cache for user: {}", user.getEmail());
            return cached.get().getContent();
        }

        List<Transaction> transactions = transactionRepository.findByUserId(userId);
        if (transactions.isEmpty()) {
            logger.warn("Savings recommendations requested but no transactions found for user: {}", user.getEmail());
            return "No statement uploaded. Please upload a bank statement to get saving recommendations.";
        }

        logger.info("Cache miss: generating new savings recommendations for user: {}", user.getEmail());
        String dataSummary = formatTransactionsForAI(transactions);
        String prompt = "Analyze the following bank statement details and provide 3-4 personalized savings recommendations.\n" +
                "Look for options to:\n" +
                "- Reduce redundant subscription plans\n" +
                "- Cut back on unusually high discretionary spending categories (like Dining or Shopping)\n" +
                "- Save on utility or insurance recurring items\n" +
                "\n" +
                "Provide actionable suggestions. Return a raw markdown string with clear bullet points. Be specific and refer to their merchants (e.g. Tesco, Amazon, Netflix) if found.";

        String recommendations = geminiClient.generateContent(prompt, clientApiKey, false);
        AIInsight insight = new AIInsight(user, "SAVINGS_RECOMMENDATIONS", recommendations);
        aiInsightRepository.save(insight);
        logger.info("Successfully generated and cached savings recommendations for user: {}", user.getEmail());
        return recommendations;
    }

    public Map<String, Object> getForecast(User user, String clientApiKey) throws Exception {
        UUID userId = user.getId();
        Optional<AIInsight> cached = getCachedInsight(userId, "FORECAST");
        if (cached.isPresent()) {
            logger.info("Retrieved balance forecast from cache for user: {}", user.getEmail());
            return objectMapper.readValue(cached.get().getContent(), Map.class);
        }

        List<Transaction> transactions = transactionRepository.findByUserId(userId);
        if (transactions.isEmpty()) {
            logger.warn("Forecast requested but no transactions found for user: {}", user.getEmail());
            Map<String, Object> fallback = new HashMap<>();
            fallback.put("forecastedBalance", 0.0);
            fallback.put("confidence", 0.0);
            fallback.put("forecastInsight", "No transactions available to generate a forecast.");
            return fallback;
        }

        logger.info("Cache miss: generating new balance forecast for user: {}", user.getEmail());
        String dataSummary = formatTransactionsForAI(transactions);
        String prompt = "Review these historical bank transactions and forecast the next month-end balance and cash flow.\n" +
                "Return a JSON response specifying:\n" +
                "1. \"forecastedBalance\": expected final balance at the end of next month (Double)\n" +
                "2. \"confidence\": confidence score between 0.0 and 1.0 based on transaction consistency (Double)\n" +
                "3. \"forecastInsight\": a brief explanation (2-3 sentences) detailing your savings and balance projections.\n" +
                "\n" +
                "Return JSON ONLY in this format:\n" +
                "{\n" +
                "  \"forecastedBalance\": 1850.50,\n" +
                "  \"confidence\": 0.85,\n" +
                "  \"forecastInsight\": \"Based on your recurring monthly salary of $3000 and consistent utility costs, we expect your balance to increase. Discretionary spending at Amazon is projected to drop slightly, yielding a net savings increase of $200.\"\n" +
                "}\n" +
                "\n" +
                "Data:\n" +
                dataSummary;

        String response = geminiClient.generateContent(prompt, clientApiKey, true);
        Map<String, Object> forecast = new HashMap<>();
        try {
            JsonNode node = objectMapper.readTree(response);
            forecast.put("forecastedBalance", node.get("forecastedBalance").asDouble());
            forecast.put("confidence", node.get("confidence").asDouble());
            forecast.put("forecastInsight", node.get("forecastInsight").asText());
        } catch (Exception e) {
            logger.warn("Failed to parse forecast JSON response: '{}'. Falling back to regex extraction.", response, e);
            double balance = extractDoubleFromText(response, "balance", 1000.0);
            double confidence = extractDoubleFromText(response, "confidence", 0.7);
            forecast.put("forecastedBalance", balance);
            forecast.put("confidence", confidence);
            forecast.put("forecastInsight", response != null ? response.trim() : "Unable to generate forecast insight.");
        }

        AIInsight insight = new AIInsight(user, "FORECAST", objectMapper.writeValueAsString(forecast));
        aiInsightRepository.save(insight);
        logger.info("Successfully generated and cached balance forecast for user: {}", user.getEmail());

        return forecast;
    }

    public String askChatbot(User user, String message, List<Map<String, String>> chatHistory, String clientApiKey) throws Exception {
        List<Transaction> transactions = transactionRepository.findByUserId(user.getId());
        String dataContext = formatTransactionsForAI(transactions);

        StringBuilder conversationBuilder = new StringBuilder();
        conversationBuilder.append("You are the AI Financial Assistant for 'Banking AI Agent'.\n");
        conversationBuilder.append("You have access to the user's bank transactions listed below.\n");
        conversationBuilder.append("Answer the user's questions accurately based on this data. Be helpful, concise, and professional.\n");
        conversationBuilder.append("If they ask about totals, categories, or trends, compute them directly using the transaction list.\n");
        conversationBuilder.append("\nTransactions context:\n").append(dataContext).append("\n\n");
        
        conversationBuilder.append("Conversation History:\n");
        for (Map<String, String> entry : chatHistory) {
            String role = entry.get("role");
            String content = entry.get("content");
            conversationBuilder.append(role.toUpperCase()).append(": ").append(content).append("\n");
        }
        
        conversationBuilder.append("USER: ").append(message).append("\n");
        conversationBuilder.append("ASSISTANT: ");

        logAudit(user.getEmail(), "CHATBOT_QUERY", "User asked: " + message);
        return geminiClient.generateContent(conversationBuilder.toString(), clientApiKey, false);
    }

    @Transactional
    public Transaction updateTransactionCategory(UUID transactionId, String newCategory, User user) {
        Transaction t = transactionRepository.findById(transactionId)
                .orElseThrow(() -> {
                    logger.warn("Transaction not found for ID: {}", transactionId);
                    return new IllegalArgumentException("Transaction not found");
                });
        
        // Secure validation
        if (!t.getStatement().getUser().getId().equals(user.getId())) {
            logger.error("Security violation: User {} attempted to modify transaction {} owned by another user", 
                    user.getEmail(), transactionId);
            throw new SecurityException("Unauthorized transaction correction");
        }

        String oldCat = t.getCategory();
        t.setCategory(newCategory);
        t = transactionRepository.save(t);
        logger.info("Transaction {} category updated from '{}' to '{}' for user: {}", 
                transactionId, oldCat, newCategory, user.getEmail());
        
        // Evict insights cache since data modified
        evictUserCaches(user.getId());

        logAudit(user.getEmail(), "UPDATE_CATEGORY", "Changed transaction " + transactionId + " category from " + oldCat + " to " + newCategory);
        return t;
    }

    private void evictUserCaches(UUID userId) {
        logger.info("Evicting AI insights caches for user ID: {}", userId);
        List<AIInsight> insights = aiInsightRepository.findByUserId(userId);
        aiInsightRepository.deleteAll(insights);
        logger.info("Deleted {} cached insight entries for user ID: {}", insights.size(), userId);
    }

    @Transactional
    public Optional<AIInsight> getCachedInsight(UUID userId, String type) {
        List<AIInsight> insights = aiInsightRepository.findByUserIdAndType(userId, type);
        if (insights.isEmpty()) {
            return Optional.empty();
        }
        if (insights.size() > 1) {
            logger.warn("Found {} duplicate AI insights of type '{}' for user ID: {}. Self-healing in progress...",
                    insights.size(), type, userId);
            List<AIInsight> duplicates = insights.subList(1, insights.size());
            aiInsightRepository.deleteAll(duplicates);
            aiInsightRepository.flush();
        }
        return Optional.of(insights.get(0));
    }

    private String formatTransactionsForAI(List<Transaction> transactions) {
        StringBuilder sb = new StringBuilder();
        sb.append("Date | Description | Merchant | Category | Amount | Type | Balance\n");
        for (Transaction t : transactions) {
            sb.append(t.getDate()).append(" | ")
              .append(t.getDescription()).append(" | ")
              .append(t.getMerchant()).append(" | ")
              .append(t.getCategory()).append(" | ")
              .append(t.getAmount()).append(" | ")
              .append(t.getTransactionType()).append(" | ")
              .append(t.getRunningBalance()).append("\n");
        }
        return sb.toString();
    }

    private void logAudit(String email, String action, String details) {
        AuditLog log = new AuditLog(email, action, details);
        auditLogRepository.save(log);
    }

    private String calculateSHA256(byte[] fileBytes) throws Exception {
        java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
        byte[] hashBytes = digest.digest(fileBytes);
        StringBuilder hexString = new StringBuilder();
        for (byte b : hashBytes) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) hexString.append('0');
            hexString.append(hex);
        }
        return hexString.toString();
    }

    public List<String> getUserCategories(User user) {
        List<Category> custom = categoryRepository.findByUserId(user.getId());
        List<String> list = new ArrayList<>(List.of(
            "Groceries", "Insurance", "Utilities", "Healthcare", "Fuel", "Shopping",
            "Entertainment", "Dining", "Travel", "Salary", "Investment", "Transfers",
            "Subscriptions", "Mortgage", "Credit Card", "Loans", "Gambling", "Miscellaneous"
        ));
        for (Category c : custom) {
            if (!list.contains(c.getName())) {
                list.add(c.getName());
            }
        }
        return list;
    }

    @Transactional
    public void bulkUpdateTransactionCategory(List<UUID> transactionIds, String newCategory, User user) {
        logger.info("Bulk updating {} transactions to category '{}' for user: {}", 
                transactionIds.size(), newCategory, user.getEmail());
        for (UUID id : transactionIds) {
            Transaction t = transactionRepository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Transaction not found: " + id));
            if (!t.getStatement().getUser().getId().equals(user.getId())) {
                throw new SecurityException("Unauthorized transaction correction");
            }
            t.setCategory(newCategory);
            transactionRepository.save(t);
        }
        evictUserCaches(user.getId());
        logAudit(user.getEmail(), "BULK_UPDATE_CATEGORY", "Changed " + transactionIds.size() + " transactions to category: " + newCategory);
    }

    private int extractScoreFromText(String text) {
        if (text == null || text.isEmpty()) {
            return 70;
        }
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile(
            "(?i)(?:score|health|rating)\\b.*?(\\d{1,3})|(\\d{1,3})\\s*/\\s*100|\\b(\\d{2})\\b"
        );
        java.util.regex.Matcher matcher = pattern.matcher(text);
        while (matcher.find()) {
            for (int i = 1; i <= matcher.groupCount(); i++) {
                String group = matcher.group(i);
                if (group != null) {
                    try {
                        int score = Integer.parseInt(group);
                        if (score >= 0 && score <= 100) {
                            return score;
                        }
                    } catch (NumberFormatException ignored) {}
                }
            }
        }
        return 70;
    }

    private double extractDoubleFromText(String text, String key, double defaultValue) {
        if (text == null || text.isEmpty()) {
            return defaultValue;
        }
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile(
            "(?i)" + key + "\\b.*?([\\d.,]+)"
        );
        java.util.regex.Matcher matcher = pattern.matcher(text);
        if (matcher.find()) {
            String val = matcher.group(1).replace(",", "");
            try {
                return Double.parseDouble(val);
            } catch (NumberFormatException ignored) {}
        }
        java.util.regex.Pattern fallbackPattern = java.util.regex.Pattern.compile("([\\d.,]+)");
        java.util.regex.Matcher fallbackMatcher = fallbackPattern.matcher(text);
        if (fallbackMatcher.find()) {
            String val = fallbackMatcher.group(1).replace(",", "");
            try {
                return Double.parseDouble(val);
            } catch (NumberFormatException ignored) {}
        }
        return defaultValue;
    }
}
