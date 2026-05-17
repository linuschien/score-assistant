package com.scoreassistant.domain.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Table("semester")
public record SemesterEntity(
        @Id @Column("id") UUID id,
        @Column("semester_name") String semesterName,
        @Column("start_date")    LocalDate startDate,
        @Column("end_date")      LocalDate endDate,
        @Column("created_at")   LocalDateTime createdAt,
        @Column("updated_at")   LocalDateTime updatedAt,
        @Column("deleted_at")   LocalDateTime deletedAt
) {}
