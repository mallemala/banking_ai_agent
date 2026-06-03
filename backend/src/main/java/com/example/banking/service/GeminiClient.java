package com.example.banking.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Base64;
import java.util.List;

@Service
public class GeminiClient {

    private static final Logger logger = LoggerFactory.getLogger(GeminiClient.class);

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    @Value("${gemini.api.key:}")
    private String defaultApiKey;

    @Value("${gemini.model:gemini-2.5-flash}")
    private String defaultModel;

    public GeminiClient(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(30))
                .build();
    }

    public String generateContent(String prompt, String clientApiKey, boolean requestJson) throws Exception {
        return callGemini(prompt, null, null, clientApiKey, requestJson);
    }

    public String generateContentWithImage(String prompt, byte[] imageBytes, String mimeType, String clientApiKey,
            boolean requestJson) throws Exception {
        return callGemini(prompt, imageBytes, mimeType, clientApiKey, requestJson);
    }

    private String callGemini(String prompt, byte[] imageBytes, String mimeType, String clientApiKey,
            boolean requestJson) throws Exception {
        String apiKeySource;
        String apiKey;
        if (clientApiKey != null && !clientApiKey.trim().isEmpty()) {
            apiKey = clientApiKey;
            apiKeySource = "client request header";
        } else if (defaultApiKey != null && !defaultApiKey.trim().isEmpty()) {
            apiKey = defaultApiKey;
            apiKeySource = "default configuration properties";
        } else {
            apiKey = System.getenv("GEMINI_API_KEY");
            apiKeySource = "environment variable GEMINI_API_KEY";
        }

        if (apiKey == null || apiKey.trim().isEmpty()) {
            logger.error(
                    "Gemini API key is not configured anywhere (checked headers, application.properties, environment variables).");
            throw new IllegalArgumentException("Gemini API key is not configured. Please set it in Settings.");
        }

        List<String> modelsToTry = new java.util.ArrayList<>();
        String primaryModel = (defaultModel != null && !defaultModel.isEmpty()) ? defaultModel : "gemini-2.5-flash";
        modelsToTry.add(primaryModel);
        for (String alt : List.of("gemini-3.5-flash", "gemini-3.1-pro-preview", "gemini-2.5-flash", "gemini-2.5-pro",
                "gemini-2.0-flash")) {
            if (!alt.equals(primaryModel)) {
                modelsToTry.add(alt);
            }
        }

        Exception lastException = null;
        for (int i = 0; i < modelsToTry.size(); i++) {
            String model = modelsToTry.get(i);
            logger.info("Preparing Gemini API call using model '{}' and API key source '{}'", model, apiKeySource);
            logger.info("Prompt length: {} characters, requestJson: {}, containsImage: {}",
                    prompt != null ? prompt.length() : 0, requestJson, imageBytes != null);

            String url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key="
                    + apiKey;

            ObjectNode rootNode = objectMapper.createObjectNode();
            ObjectNode contentNode = objectMapper.createObjectNode();
            contentNode.put("role", "user");

            ObjectNode textPart = objectMapper.createObjectNode();
            textPart.put("text", prompt);

            List<ObjectNode> partsList;
            if (imageBytes != null && mimeType != null) {
                logger.info("Including image attachment in Gemini payload (size: {} bytes, type: {})",
                        imageBytes.length, mimeType);
                ObjectNode imagePart = objectMapper.createObjectNode();
                ObjectNode inlineData = objectMapper.createObjectNode();
                inlineData.put("mimeType", mimeType);
                inlineData.put("data", Base64.getEncoder().encodeToString(imageBytes));
                imagePart.set("inlineData", inlineData);
                partsList = List.of(textPart, imagePart);
            } else {
                partsList = List.of(textPart);
            }

            contentNode.set("parts", objectMapper.valueToTree(partsList));
            rootNode.set("contents", objectMapper.valueToTree(List.of(contentNode)));

            if (requestJson) {
                ObjectNode configNode = objectMapper.createObjectNode();
                configNode.put("responseMimeType", "application/json");
                rootNode.set("generationConfig", configNode);
            }

            String requestBody = objectMapper.writeValueAsString(rootNode);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .timeout(Duration.ofSeconds(300))
                    .build();

            long startTime = System.currentTimeMillis();
            logger.info("Sending request to Gemini API (endpoint: {})...",
                    "https://generativelanguage.googleapis.com/v1beta/models/" + model);
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            long duration = System.currentTimeMillis() - startTime;

            logger.info("Received Gemini API response. Status: {}, Latency: {} ms", response.statusCode(), duration);

            if (response.statusCode() != 200) {
                String errorMessage = "Gemini API call failed with status: " + response.statusCode();
                try {
                    JsonNode errorNode = objectMapper.readTree(response.body());
                    if (errorNode.has("error") && errorNode.get("error").has("message")) {
                        errorMessage += " - " + errorNode.get("error").get("message").asText();
                    } else {
                        errorMessage += ". Response body: " + response.body();
                    }
                } catch (Exception parseException) {
                    errorMessage += ". Raw Response: " + response.body();
                }

                boolean quotaExceeded = response.statusCode() == 429 ||
                        (response.body() != null && (response.body().contains("RESOURCE_EXHAUSTED")
                                || response.body().toLowerCase().contains("quota exceeded")
                                || response.body().toLowerCase().contains("rate limit")));

                if (quotaExceeded && i < modelsToTry.size() - 1) {
                    logger.warn("Quota exceeded for model '{}'. Retrying with alternate model '{}'...", model,
                            modelsToTry.get(i + 1));
                    lastException = new RuntimeException(errorMessage);
                    continue; // try next model
                }

                logger.error("Gemini API Error: {}", errorMessage);
                throw new RuntimeException(errorMessage);
            }

            JsonNode responseNode = objectMapper.readTree(response.body());
            JsonNode candidates = responseNode.get("candidates");
            if (candidates != null && candidates.isArray() && candidates.size() > 0) {
                JsonNode parts = candidates.get(0).get("content").get("parts");
                if (parts != null && parts.isArray() && parts.size() > 0) {
                    String responseText = parts.get(0).get("text").asText();
                    logger.info("Successfully received generated content from Gemini. Length: {} chars",
                            responseText.length());
                    if (requestJson) {
                        responseText = cleanJsonResponse(responseText);
                    }
                    return responseText;
                }
            }

            logger.error("Unexpected response payload format from Gemini: {}", response.body());
            throw new RuntimeException("Unexpected response format from Gemini: " + response.body());
        }

        if (lastException != null) {
            throw lastException;
        }
        throw new RuntimeException("All candidate Gemini models failed.");
    }

    private String getApiKey(String clientApiKey) {
        if (clientApiKey != null && !clientApiKey.trim().isEmpty()) {
            return clientApiKey;
        }
        if (defaultApiKey != null && !defaultApiKey.trim().isEmpty()) {
            return defaultApiKey;
        }
        return System.getenv("GEMINI_API_KEY");
    }

    private String cleanJsonResponse(String response) {
        if (response == null) {
            return "";
        }
        response = response.trim();

        // If it starts with markdown code fence
        if (response.startsWith("```")) {
            // Find the first { or [ after the start
            int jsonStartIndex = response.indexOf("{");
            int arrayStartIndex = response.indexOf("[");
            int start = -1;
            if (jsonStartIndex != -1 && arrayStartIndex != -1) {
                start = Math.min(jsonStartIndex, arrayStartIndex);
            } else if (jsonStartIndex != -1) {
                start = jsonStartIndex;
            } else if (arrayStartIndex != -1) {
                start = arrayStartIndex;
            }

            if (start != -1) {
                int end = response.lastIndexOf("```");
                if (end > start) {
                    return response.substring(start, end).trim();
                } else {
                    return response.substring(start).trim();
                }
            }
        }

        // General fallback: locate the first '{' or '[' and the last '}' or ']'
        int firstBrace = response.indexOf("{");
        int firstBracket = response.indexOf("[");
        int start = -1;
        if (firstBrace != -1 && firstBracket != -1) {
            start = Math.min(firstBrace, firstBracket);
        } else if (firstBrace != -1) {
            start = firstBrace;
        } else if (firstBracket != -1) {
            start = firstBracket;
        }

        int lastBrace = response.lastIndexOf("}");
        int lastBracket = response.lastIndexOf("]");
        int end = -1;
        if (lastBrace != -1 && lastBracket != -1) {
            end = Math.max(lastBrace, lastBracket);
        } else if (lastBrace != -1) {
            end = lastBrace;
        } else if (lastBracket != -1) {
            end = lastBracket;
        }

        if (start != -1 && end != -1 && end > start) {
            return response.substring(start, end + 1).trim();
        }

        return response;
    }
}
