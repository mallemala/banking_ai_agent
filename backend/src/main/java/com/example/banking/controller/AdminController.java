package com.example.banking.controller;

import com.example.banking.model.AuditLog;
import com.example.banking.model.User;
import com.example.banking.repository.AuditLogRepository;
import com.example.banking.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;

    public AdminController(UserRepository userRepository, AuditLogRepository auditLogRepository) {
        this.userRepository = userRepository;
        this.auditLogRepository = auditLogRepository;
    }

    @GetMapping("/users")
    public ResponseEntity<List<Map<String, Object>>> getUsers() {
        List<User> users = userRepository.findAll();
        List<Map<String, Object>> result = new ArrayList<>();
        for (User u : users) {
            Map<String, Object> m = new HashMap<>();
            m.put("id", u.getId());
            m.put("name", u.getName());
            m.put("email", u.getEmail());
            m.put("role", u.getRole().name());
            result.add(m);
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/audits")
    public ResponseEntity<List<AuditLog>> getAudits() {
        return ResponseEntity.ok(auditLogRepository.findAllByOrderByTimestampDesc());
    }

    @GetMapping("/ai-metrics")
    public ResponseEntity<Map<String, Object>> getAiMetrics() {
        // Return dummy/mock statistics for AI request monitoring
        Map<String, Object> metrics = new HashMap<>();
        metrics.put("totalRequests", 45);
        metrics.put("totalTokensUsed", 142050);
        metrics.put("costUSD", 0.0213);
        
        List<Map<String, Object>> hourlyUsage = List.of(
            Map.of("hour", "09:00", "requests", 5, "tokens", 15000),
            Map.of("hour", "10:00", "requests", 12, "tokens", 35000),
            Map.of("hour", "11:00", "requests", 18, "tokens", 56000),
            Map.of("hour", "12:00", "requests", 10, "tokens", 36050)
        );
        metrics.put("hourlyUsage", hourlyUsage);

        return ResponseEntity.ok(metrics);
    }
}
