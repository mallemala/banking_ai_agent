package com.example.banking.service;

import com.example.banking.model.Transaction;
import com.example.banking.model.Statement;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
public class StatementParser {

    private static final Logger logger = LoggerFactory.getLogger(StatementParser.class);

    private final GeminiClient geminiClient;
    private final ObjectMapper objectMapper;

    public StatementParser(GeminiClient geminiClient, ObjectMapper objectMapper) {
        this.geminiClient = geminiClient;
        this.objectMapper = objectMapper;
    }

    public List<Transaction> parse(byte[] fileBytes, String filename, String contentType, String clientApiKey, Statement statementEntity, List<String> categories) throws Exception {
        String lowerFilename = filename.toLowerCase();
        logger.info("Parsing file: '{}' with size: {} bytes, contentType: {}", filename, fileBytes.length, contentType);
        
        if (lowerFilename.endsWith(".pdf")) {
            logger.info("File '{}' detected as PDF format. Attempting text extraction...", filename);
            // Standard PDF or scanned PDF
            String extractedText = "";
            try (PDDocument document = PDDocument.load(fileBytes)) {
                PDFTextStripper stripper = new PDFTextStripper();
                extractedText = stripper.getText(document);
            } catch (Exception e) {
                logger.warn("Standard PDF text extraction failed for file '{}'. Will fallback to OCR rendering.", filename, e);
            }

            if (extractedText == null || extractedText.trim().length() < 100) {
                logger.info("Extracted text is empty or too short ({} chars). Running OCR rendering of PDF...", 
                        extractedText == null ? 0 : extractedText.trim().length());
                // Try rendering PDF page as image for OCR
                return parseScannedPdf(fileBytes, clientApiKey, statementEntity, categories);
            } else {
                logger.info("Successfully extracted text from standard PDF '{}' (length: {} chars). Sending to Gemini...", 
                        filename, extractedText.length());
                return parseTextWithGemini(extractedText, clientApiKey, statementEntity, categories);
            }
        } else if (lowerFilename.endsWith(".xlsx") || lowerFilename.endsWith(".xls")) {
            logger.info("File '{}' detected as Excel format. Extracting cells...", filename);
            // Excel parsing
            String text = parseExcel(fileBytes);
            logger.info("Successfully extracted text from Excel sheets (length: {} chars). Sending to Gemini...", text.length());
            return parseTextWithGemini(text, clientApiKey, statementEntity, categories);
        } else if (lowerFilename.endsWith(".csv") || contentType.contains("csv")) {
            logger.info("File '{}' detected as CSV format. Reading content...", filename);
            // CSV parsing
            String text = new String(fileBytes, "UTF-8");
            logger.info("Successfully loaded CSV content (length: {} chars). Sending to Gemini...", text.length());
            return parseTextWithGemini(text, clientApiKey, statementEntity, categories);
        } else if (lowerFilename.endsWith(".jpg") || lowerFilename.endsWith(".jpeg") || lowerFilename.endsWith(".png")) {
            logger.info("File '{}' detected as Image format. Performing direct OCR...", filename);
            // Image upload direct OCR
            String mimeType = contentType;
            if (lowerFilename.endsWith(".png")) mimeType = "image/png";
            else mimeType = "image/jpeg";
            return parseImageWithGemini(fileBytes, mimeType, clientApiKey, statementEntity, categories);
        } else {
            logger.error("Unsupported file extension or type for file '{}'", filename);
            throw new IllegalArgumentException("Unsupported file format: " + filename);
        }
    }

    private String parseExcel(byte[] fileBytes) throws Exception {
        StringBuilder sb = new StringBuilder();
        try (InputStream is = new ByteArrayInputStream(fileBytes);
             Workbook workbook = WorkbookFactory.create(is)) {
            Sheet sheet = workbook.getSheetAt(0);
            int rowCount = 0;
            for (Row row : sheet) {
                rowCount++;
                for (Cell cell : row) {
                    sb.append(cell.toString()).append("\t");
                }
                sb.append("\n");
            }
            logger.debug("Read {} rows from first sheet of Excel workbook", rowCount);
        }
        return sb.toString();
    }

    private List<Transaction> parseScannedPdf(byte[] fileBytes, String clientApiKey, Statement statementEntity, List<String> categories) throws Exception {
        try (PDDocument document = PDDocument.load(fileBytes)) {
            logger.info("PDF has {} pages. Rendering first page to image at 150 DPI...", document.getNumberOfPages());
            if (document.getNumberOfPages() == 0) {
                logger.warn("PDF is empty (0 pages)");
                return Collections.emptyList();
            }
            PDFRenderer renderer = new PDFRenderer(document);
            // Render first page at 150 DPI
            BufferedImage image = renderer.renderImageWithDPI(0, 150);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(image, "png", baos);
            byte[] imageBytes = baos.toByteArray();
            logger.info("First page rendered successfully ({} bytes). Sending to Gemini for image-based OCR...", imageBytes.length);
            return parseImageWithGemini(imageBytes, "image/png", clientApiKey, statementEntity, categories);
        }
    }

    private List<Transaction> parseTextWithGemini(String text, String clientApiKey, Statement statementEntity, List<String> categories) throws Exception {
        logger.info("Sending statement text ({} chars) to Gemini for transaction parsing...", text.length());
        String prompt = buildPrompt(text, categories);
        String responseJson = geminiClient.generateContent(prompt, clientApiKey, true);
        logger.info("Received JSON response from Gemini (length: {} chars)", responseJson.length());
        return parseJsonToTransactions(responseJson, statementEntity);
    }

    private List<Transaction> parseImageWithGemini(byte[] imageBytes, String mimeType, String clientApiKey, Statement statementEntity, List<String> categories) throws Exception {
        logger.info("Sending statement image ({} bytes, mime: {}) to Gemini for image-based OCR parsing...", imageBytes.length, mimeType);
        String prompt = buildPrompt("Please read the uploaded bank statement image and extract all transactions.", categories);
        String responseJson = geminiClient.generateContentWithImage(prompt, imageBytes, mimeType, clientApiKey, true);
        logger.info("Received JSON response from Gemini for image (length: {} chars)", responseJson.length());
        return parseJsonToTransactions(responseJson, statementEntity);
    }

    private String buildPrompt(String statementData, List<String> categories) {
        StringBuilder categoriesPrompt = new StringBuilder();
        for (String cat : categories) {
            categoriesPrompt.append("   - ").append(cat).append("\n");
        }
        return "You are an expert financial analysis AI. Parse the following bank statement data and extract all transactions.\n" +
                "\n" +
                "Requirements:\n" +
                "1. Extract Transaction Date (parse it to yyyy-MM-dd), Description, Amount (negative for debit/outgoing, positive for credit/incoming), Debit/Credit indicator, Running Balance, and Masked Account Number (if available).\n" +
                "2. Normalize merchant names: Clean up descriptions into simple, recognizable merchant names (e.g. \"TESCO STORE 123\" -> \"Tesco\", \"AMZN MKTPLACE\" -> \"Amazon\", \"NETFLIX.COM\" -> \"Netflix\").\n" +
                "3. Categorize each transaction into one of these strict categories:\n" +
                categoriesPrompt.toString() +
                "4. Automatically flag recurring subscription transactions (e.g. Netflix, Spotify, gym memberships, Prime) as category 'Subscriptions' and set their 'isSubscription' flag to true. Do not classify mortgage, credit card bills, loans, gambling, or insurance payments under Subscriptions category, even though they occur monthly; keep them in their respective Mortgage, Credit Card, Loans, Gambling, or Insurance categories.\n" +
                "5. Estimate the running balance if missing, or use the extracted one.\n" +
                "\n" +
                "Return the output STRICTLY as a JSON object of this structure:\n" +
                "{\n" +
                "  \"accountNumber\": \"masked_account_number_or_null\",\n" +
                "  \"transactions\": [\n" +
                "    {\n" +
                "      \"date\": \"yyyy-MM-dd\",\n" +
                "      \"description\": \"original description\",\n" +
                "      \"merchant\": \"normalized merchant name\",\n" +
                "      \"category\": \"category name\",\n" +
                "      \"amount\": -12.50,\n" +
                "      \"transactionType\": \"DEBIT\", // or CREDIT\n" +
                "      \"runningBalance\": 1500.25,\n" +
                "      \"isSubscription\": false // or true\n" +
                "    }\n" +
                "  ]\n" +
                "}\n" +
                "\n" +
                "Statement data to parse:\n" +
                "--------------------\n" +
                statementData + "\n" +
                "--------------------\n";
    }

    private List<Transaction> parseJsonToTransactions(String responseJson, Statement statementEntity) throws Exception {
        logger.info("Parsing Gemini JSON response to Transaction entities...");
        List<Transaction> transactions = new ArrayList<>();
        JsonNode root = objectMapper.readTree(responseJson);
        
        String accountNo = root.has("accountNumber") && !root.get("accountNumber").isNull() 
                ? root.get("accountNumber").asText() : "";
        logger.info("Extracted Account Number: {}", accountNo);

        JsonNode txArray = root.get("transactions");
        if (txArray != null && txArray.isArray()) {
            logger.info("Found {} transaction entries in JSON response", txArray.size());
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
            int idx = 0;
            for (JsonNode txNode : txArray) {
                idx++;
                Transaction t = new Transaction();
                t.setStatement(statementEntity);
                t.setAccountNumber(accountNo);
                
                // Parse date
                String dateStr = txNode.has("date") ? txNode.get("date").asText() : null;
                if (dateStr != null && !dateStr.isEmpty()) {
                    try {
                        t.setDate(LocalDate.parse(dateStr, formatter));
                    } catch (Exception e) {
                        logger.warn("Failed to parse date '{}' for transaction #{}. Fallback to current date.", dateStr, idx);
                        t.setDate(LocalDate.now()); // fallback
                    }
                } else {
                    t.setDate(LocalDate.now());
                }

                t.setDescription(txNode.has("description") ? txNode.get("description").asText() : "");
                t.setMerchant(txNode.has("merchant") ? txNode.get("merchant").asText() : "Unknown");
                t.setCategory(txNode.has("category") ? txNode.get("category").asText() : "Miscellaneous");
                t.setAmount(txNode.has("amount") ? txNode.get("amount").asDouble() : 0.0);
                
                String type = txNode.has("transactionType") ? txNode.get("transactionType").asText() : "";
                if (type.isEmpty()) {
                    type = t.getAmount() < 0 ? "DEBIT" : "CREDIT";
                }
                t.setTransactionType(type);
                
                t.setRunningBalance(txNode.has("runningBalance") ? txNode.get("runningBalance").asDouble() : 0.0);
                
                // Override category to Subscriptions if flagged as subscription,
                // but preserve Mortgage, Credit Card, Loans, Gambling, and Insurance categories.
                if (txNode.has("isSubscription") && txNode.get("isSubscription").asBoolean()) {
                    String currentCategory = t.getCategory();
                    if (!"Insurance".equalsIgnoreCase(currentCategory) && 
                        !"Mortgage".equalsIgnoreCase(currentCategory) && 
                        !"Loans".equalsIgnoreCase(currentCategory) && 
                        !"Gambling".equalsIgnoreCase(currentCategory) && 
                        !"Credit Card".equalsIgnoreCase(currentCategory)) {
                        logger.debug("Transaction #{} flagged as subscription, overriding category to 'Subscriptions'", idx);
                        t.setCategory("Subscriptions");
                    } else {
                        logger.debug("Transaction #{} flagged as subscription but kept original category '{}'", idx, currentCategory);
                    }
                }
                
                logger.debug("Parsed transaction #{}: date={}, merchant='{}', category='{}', amount={}", 
                        idx, t.getDate(), t.getMerchant(), t.getCategory(), t.getAmount());
                transactions.add(t);
            }
        } else {
            logger.warn("No transactions array found or it is not an array in Gemini JSON response");
        }
        logger.info("Successfully parsed {} transaction entities", transactions.size());
        return transactions;
    }
}
