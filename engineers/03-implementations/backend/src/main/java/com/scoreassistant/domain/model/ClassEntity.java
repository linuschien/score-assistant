package com.scoreassistant.domain.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Table("class")
public record ClassEntity(
        @Id UUID id,
        @Column("semester_id")       UUID semesterId,
        @Column("class_name")        String className,
        @Column("passing_threshold") BigDecimal passingThreshold,
        @Column("created_at")        LocalDateTime createdAt,
        @Column("updated_at")        LocalDateTime updatedAt,
        @Column("deleted_at")        LocalDateTime deletedAt
) {}
