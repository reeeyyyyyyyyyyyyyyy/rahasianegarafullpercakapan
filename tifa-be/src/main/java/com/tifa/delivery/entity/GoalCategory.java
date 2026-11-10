package com.tifa.delivery.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import javax.persistence.*;
import java.time.LocalDateTime;

/**
 * Goal Category Entity
 * Categories for grouping destinations/goals (e.g. dish-serving, washing, collecting)
 * Maps to IndexedDB 'categories' table in tifa-app.
 */
@Entity
@Table(name = "m_goal_category")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GoalCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "category_id")
    private Long categoryId;

    @Column(name = "category_name", nullable = false, length = 100)
    private String categoryName;

    @Column(name = "category_type", length = 50)
    private String categoryType;

    @Column(name = "color", length = 20)
    private String color;

    @Column(name = "sort_order")
    private Integer sortOrder;

    @Column(name = "is_active")
    private Integer isActive;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
