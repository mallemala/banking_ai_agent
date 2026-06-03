package com.example.banking.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "audit_logs")
@Getter
@Setter
@NoArgsConstructor
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    private String userEmail;

    private String action;

    private LocalDateTime timestamp;

    @Column(length = 2000)
    private String details;

    public AuditLog(String userEmail, String action, String details) {
        this.userEmail = userEmail;
        this.action = action;
        this.timestamp = LocalDateTime.now();
        this.details = details;
    }
}
