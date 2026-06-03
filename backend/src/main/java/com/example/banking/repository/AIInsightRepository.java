package com.example.banking.repository;

import com.example.banking.model.AIInsight;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AIInsightRepository extends JpaRepository<AIInsight, UUID> {
    List<AIInsight> findByUserId(UUID userId);
    List<AIInsight> findByUserIdAndType(UUID userId, String type);
}
