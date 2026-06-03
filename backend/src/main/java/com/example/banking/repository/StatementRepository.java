package com.example.banking.repository;

import com.example.banking.model.Statement;
import com.example.banking.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface StatementRepository extends JpaRepository<Statement, UUID> {
    List<Statement> findByUser(User user);
    List<Statement> findByUserIdOrderByUploadDateDesc(UUID userId);
    java.util.Optional<Statement> findByUserAndFileHash(User user, String fileHash);
}
