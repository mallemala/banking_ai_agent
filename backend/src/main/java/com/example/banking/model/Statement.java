package com.example.banking.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
    name = "statements",
    indexes = {
        @Index(name = "idx_statements_user_id", columnList = "user_id"),
        @Index(name = "idx_statements_file_hash", columnList = "file_hash")
    }
)
@Getter
@Setter
@NoArgsConstructor
public class Statement {

    public enum Status {
        PENDING,
        PROCESSING,
        SUCCESS,
        FAILED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    private LocalDateTime uploadDate;

    private String filePath;

    private String filename;

    @Enumerated(EnumType.STRING)
    private Status processingStatus;

    @Column(name = "file_hash", length = 64)
    private String fileHash;

    public Statement(User user, String filename, String filePath, Status status) {
        this.user = user;
        this.filename = filename;
        this.filePath = filePath;
        this.uploadDate = LocalDateTime.now();
        this.processingStatus = status;
    }
}
