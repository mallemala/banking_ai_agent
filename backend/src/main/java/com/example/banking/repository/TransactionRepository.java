package com.example.banking.repository;

import com.example.banking.model.Statement;
import com.example.banking.model.Transaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, UUID> {
    List<Transaction> findByStatement(Statement statement);
    List<Transaction> findByStatementId(UUID statementId);
    
    @Query("SELECT t FROM Transaction t WHERE t.statement.user.id = :userId")
    List<Transaction> findByUserId(@Param("userId") UUID userId);

    @Query("SELECT t FROM Transaction t WHERE t.statement.user.id = :userId")
    Page<Transaction> findByUserIdPaged(@Param("userId") UUID userId, Pageable pageable);

    // NOTE: :search must never be null — call findByUserIdPaged when there is no search term.
    // Passing null causes PostgreSQL to infer the parameter type as bytea, breaking lower().
    @Query("SELECT t FROM Transaction t WHERE t.statement.user.id = :userId " +
           "AND (LOWER(t.description) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(t.merchant) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(t.category) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Transaction> findByUserIdAndSearch(@Param("userId") UUID userId, @Param("search") String search, Pageable pageable);

    @Query("SELECT DISTINCT t.date FROM Transaction t WHERE t.statement.user.id = :userId")
    List<java.time.LocalDate> findDistinctTransactionDatesByUserId(@Param("userId") UUID userId);

    @Query("SELECT t FROM Transaction t WHERE t.statement.user.id = :userId AND t.date >= :startDate AND t.date <= :endDate")
    Page<Transaction> findByUserIdAndDateRangePaged(
            @Param("userId") UUID userId,
            @Param("startDate") java.time.LocalDate startDate,
            @Param("endDate") java.time.LocalDate endDate,
            Pageable pageable
    );

    @Query("SELECT t FROM Transaction t WHERE t.statement.user.id = :userId AND t.date >= :startDate AND t.date <= :endDate " +
           "AND (LOWER(t.description) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(t.merchant) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(t.category) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Transaction> findByUserIdAndSearchAndDateRangePaged(
            @Param("userId") UUID userId,
            @Param("search") String search,
            @Param("startDate") java.time.LocalDate startDate,
            @Param("endDate") java.time.LocalDate endDate,
            Pageable pageable
    );
}
