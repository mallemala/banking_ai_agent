package com.example.banking.repository;

import com.example.banking.model.Category;
import com.example.banking.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface CategoryRepository extends JpaRepository<Category, UUID> {
    List<Category> findByUserId(UUID userId);
    boolean existsByUserIdAndNameIgnoreCase(UUID userId, String name);
}
