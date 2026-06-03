package com.example.banking.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.util.UUID;

@Entity
@Table(
    name = "ai_insights",
    indexes = {
        @Index(name = "idx_ai_insights_user_type", columnList = "user_id, type")
    }
)
@Getter
@Setter
@NoArgsConstructor
public class AIInsight {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    private String type; // e.g. HEALTH_SCORE, SAVINGS_RECOMMENDATIONS, FORECAST

    @Column(columnDefinition = "TEXT")
    private String content;

    public AIInsight(User user, String type, String content) {
        this.user = user;
        this.type = type;
        this.content = content;
    }
}
