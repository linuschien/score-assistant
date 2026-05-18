package com.scoreassistant.adapter.in.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

public sealed interface AttachmentDto permits
        AttachmentDto.AttachmentRequest,
        AttachmentDto.AttachmentPatchRequest,
        AttachmentDto.AttachmentResponse {

    record AttachmentRequest(
            @NotBlank String file_name,
            @NotBlank String mime_type,
            @NotNull  Integer file_size,
            @NotNull  byte[] file_data,
            @NotNull  LocalDateTime uploaded_at
    ) implements AttachmentDto {}

    record AttachmentPatchRequest(
            String file_name
    ) implements AttachmentDto {}

    record AttachmentResponse(
            String id,
            String grade_record_id,
            String file_name,
            String mime_type,
            int file_size,
            byte[] file_data,
            LocalDateTime uploaded_at
    ) implements AttachmentDto {}
}
