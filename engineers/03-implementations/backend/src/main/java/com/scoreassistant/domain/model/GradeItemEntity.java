package com.scoreassistant.domain.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Table("grade_item")
public record GradeItemEntity(
        @Id @Column("id") UUID id,
        @Column("class_id")         UUID classId,
        @Column("item_name")        String itemName,
        @Column("item_type")        String itemType,
        @Column("item_date")        LocalDate itemDate,
        @Column("item_description") String itemDescription,
        @Column("max_score")        BigDecimal maxScore,
        @Column("weight")           BigDecimal weight,
        @Column("created_at")       LocalDateTime createdAt,
        @Column("updated_at")       LocalDateTime updatedAt,
        @Column("deleted")          boolean deleted,
        @Column("deleted_at")       LocalDateTime deletedAt
) {}
