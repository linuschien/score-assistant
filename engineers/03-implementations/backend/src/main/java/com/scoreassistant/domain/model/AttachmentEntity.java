package com.scoreassistant.domain.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.time.LocalDateTime;
import java.util.UUID;

@Table("attachment")
public record AttachmentEntity(
        @Id @Column("id") UUID id,
        @Column("grade_record_id") UUID gradeRecordId,
        @Column("file_name")       String fileName,
        @Column("mime_type")       String mimeType,
        @Column("file_size")       int fileSize,
        @Column("file_data")       byte[] fileData,
        @Column("uploaded_at")     LocalDateTime uploadedAt,
        @Column("created_at")      LocalDateTime createdAt,
        @Column("updated_at")      LocalDateTime updatedAt,
        @Column("deleted")         boolean deleted,
        @Column("deleted_at")      LocalDateTime deletedAt
) {}
