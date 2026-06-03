package com.example.banking.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(
    name = "transactions",
    indexes = {
        @Index(name = "idx_transactions_statement_id", columnList = "statement_id"),
        @Index(name = "idx_transactions_date", columnList = "date"),
        @Index(name = "idx_transactions_category", columnList = "category")
    }
)
@Getter
@Setter
@NoArgsConstructor
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "statement_id", nullable = false)
    private Statement statement;

    private LocalDate date;

    @Column(length = 1000)
    private String description;

    private String merchant;

    private String category;

    private double amount;

    private String transactionType; // DEBIT / CREDIT

    private double runningBalance;

    private String accountNumber;
}
