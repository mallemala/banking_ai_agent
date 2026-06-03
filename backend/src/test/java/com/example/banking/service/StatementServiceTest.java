package com.example.banking.service;

import com.example.banking.model.Statement;
import com.example.banking.model.Transaction;
import com.example.banking.model.User;
import com.example.banking.repository.StatementRepository;
import com.example.banking.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
public class StatementServiceTest {

    @Autowired
    private StatementService statementService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StatementRepository statementRepository;

    private User testUser;

    @TestConfiguration
    static class TestConfig {
        @Bean
        @Primary
        public StatementParser statementParser() {
            return new StatementParser(null, null) {
                @Override
                public List<Transaction> parse(byte[] fileBytes, String filename, String contentType, String clientApiKey, Statement statementEntity, List<String> categories) {
                    return new ArrayList<>();
                }
            };
        }
    }

    @BeforeEach
    public void setup() {
        statementRepository.deleteAll();
        userRepository.deleteAll();

        testUser = new User("John Doe", "john.doe@example.com", "password", User.Role.STANDARD_USER);
        testUser = userRepository.save(testUser);
    }

    @Test
    public void testUploadAndParse_SuccessAndThenDuplicate() throws Exception {
        byte[] fileBytes = "mock bank statement content".getBytes();
        String filename = "statement.pdf";
        String contentType = "application/pdf";
        String apiKey = "mock-api-key";

        // First upload should succeed
        Statement firstStatement = statementService.uploadAndParse(fileBytes, filename, contentType, testUser, apiKey);
        assertNotNull(firstStatement);
        assertEquals(Statement.Status.SUCCESS, firstStatement.getProcessingStatus());
        assertNotNull(firstStatement.getFileHash());

        // Second upload of the same file should throw IllegalArgumentException
        Exception exception = assertThrows(IllegalArgumentException.class, () -> {
            statementService.uploadAndParse(fileBytes, filename, contentType, testUser, apiKey);
        });

        assertEquals("This statement has already been uploaded and processed.", exception.getMessage());
    }

    @Test
    public void testUploadAndParse_DifferentFilesSucceed() throws Exception {
        byte[] fileBytes1 = "statement one content".getBytes();
        byte[] fileBytes2 = "statement two content".getBytes();
        String filename = "statement.pdf";
        String contentType = "application/pdf";
        String apiKey = "mock-api-key";

        // Both uploads should succeed because they have different content (hashes)
        Statement stmt1 = statementService.uploadAndParse(fileBytes1, filename, contentType, testUser, apiKey);
        Statement stmt2 = statementService.uploadAndParse(fileBytes2, filename, contentType, testUser, apiKey);

        assertNotNull(stmt1);
        assertNotNull(stmt2);
        assertNotEquals(stmt1.getFileHash(), stmt2.getFileHash());
    }
}
