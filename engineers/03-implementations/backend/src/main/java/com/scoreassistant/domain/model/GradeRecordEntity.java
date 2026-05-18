package com.scoreassistant.domain.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Table("grade_record")
public record GradeRecordEntity(
        @Id @Column("id") UUID id,
        @Column("grade_item_id")    UUID gradeItemId,
        @Column("student_id")       UUID studentId,
        @Column("score")            BigDecimal score,
        @Column("last_modified_at") LocalDateTime lastModifiedAt,
        @Version @Column("version") int version,
        @Column("created_at")       LocalDateTime createdAt,
        @Column("updated_at")       LocalDateTime updatedAt,
        @Column("deleted")          boolean deleted,
        @Column("deleted_at")       LocalDateTime deletedAt
) {}
