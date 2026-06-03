package com.example.banking.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class GeminiClientTest {

    private GeminiClient geminiClient;
    private ObjectMapper objectMapper = new ObjectMapper();

    static class StubHttpResponse implements HttpResponse<String> {
        private final int statusCode;
        private final String body;

        public StubHttpResponse(int statusCode, String body) {
            this.statusCode = statusCode;
            this.body = body;
        }

        @Override
        public int statusCode() { return statusCode; }
        @Override
        public HttpRequest request() { return null; }
        @Override
        public java.util.Optional<HttpResponse<String>> previousResponse() { return java.util.Optional.empty(); }
        @Override
        public java.net.http.HttpHeaders headers() { return null; }
        @Override
        public String body() { return body; }
        @Override
        public java.util.Optional<javax.net.ssl.SSLSession> sslSession() { return java.util.Optional.empty(); }
        @Override
        public java.net.URI uri() { return null; }
        @Override
        public HttpClient.Version version() { return null; }
    }

    static class StubHttpClient extends HttpClient {
        private final List<HttpResponse<String>> responses;
        private int callCount = 0;

        public StubHttpClient(List<HttpResponse<String>> responses) {
            this.responses = responses;
        }

        public int getCallCount() {
            return callCount;
        }

        @Override
        @SuppressWarnings("unchecked")
        public <T> HttpResponse<T> send(HttpRequest request, HttpResponse.BodyHandler<T> responseBodyHandler) {
            HttpResponse<String> resp = responses.get(callCount++);
            return (HttpResponse<T>) resp;
        }

        @Override
        public java.util.Optional<java.net.ProxySelector> proxy() { return java.util.Optional.empty(); }
        @Override
        public HttpClient.Redirect followRedirects() { return HttpClient.Redirect.NEVER; }
        @Override
        public java.util.Optional<java.net.CookieHandler> cookieHandler() { return java.util.Optional.empty(); }
        @Override
        public java.util.Optional<java.time.Duration> connectTimeout() { return java.util.Optional.empty(); }
        @Override
        public java.util.Optional<java.util.concurrent.Executor> executor() { return java.util.Optional.empty(); }
        @Override
        public javax.net.ssl.SSLContext sslContext() { throw new UnsupportedOperationException(); }
        @Override
        public javax.net.ssl.SSLParameters sslParameters() { throw new UnsupportedOperationException(); }
        @Override
        public java.util.Optional<java.net.Authenticator> authenticator() { return java.util.Optional.empty(); }
        @Override
        public HttpClient.Version version() { return HttpClient.Version.HTTP_2; }
        @Override
        public <T> java.util.concurrent.CompletableFuture<HttpResponse<T>> sendAsync(HttpRequest request, HttpResponse.BodyHandler<T> responseBodyHandler) { throw new UnsupportedOperationException(); }
        @Override
        public <T> java.util.concurrent.CompletableFuture<HttpResponse<T>> sendAsync(HttpRequest request, HttpResponse.BodyHandler<T> responseBodyHandler, HttpResponse.PushPromiseHandler<T> pushPromiseHandler) { throw new UnsupportedOperationException(); }
    }

    @BeforeEach
    public void setup() {
        geminiClient = new GeminiClient(objectMapper);
        ReflectionTestUtils.setField(geminiClient, "defaultApiKey", "test-key");
        ReflectionTestUtils.setField(geminiClient, "defaultModel", "gemini-2.5-flash");
    }

    @Test
    public void testGenerateContent_QuotaExceededFallback() throws Exception {
        HttpResponse<String> mockResponse429 = new StubHttpResponse(
                429, 
                "{\"error\": {\"message\": \"Quota exceeded\", \"status\": \"RESOURCE_EXHAUSTED\"}}"
        );

        HttpResponse<String> mockResponse200 = new StubHttpResponse(
                200, 
                "{\"candidates\": [{\"content\": {\"parts\": [{\"text\": \"Response from alternate model\"}]}}]}"
        );

        // Stub HttpClient: first call returns 429, second call returns 200
        StubHttpClient stubHttpClient = new StubHttpClient(List.of(mockResponse429, mockResponse200));
        ReflectionTestUtils.setField(geminiClient, "httpClient", stubHttpClient);

        String result = geminiClient.generateContent("hello", null, false);
        assertEquals("Response from alternate model", result);
        assertEquals(2, stubHttpClient.getCallCount());
    }
}
