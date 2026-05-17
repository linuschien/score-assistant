package com.scoreassistant.domain.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.time.LocalDateTime;
import java.util.UUID;

@Table("student")
public record StudentEntity(
        @Id @Column("id") UUID id,
        @Column("class_id")       UUID classId,
        @Column("student_number") int studentNumber,
        @Column("student_name")   String studentName,
        @Column("created_at")     LocalDateTime createdAt,
        @Column("updated_at")     LocalDateTime updatedAt,
        @Column("deleted_at")     LocalDateTime deletedAt
) {}
