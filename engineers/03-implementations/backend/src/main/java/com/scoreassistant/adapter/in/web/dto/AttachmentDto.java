package com.scoreassistant.adapter.in.web.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

public sealed interface AttachmentDto permits
        AttachmentDto.AttachmentRequest,
        AttachmentDto.AttachmentPatchRequest,
        AttachmentDto.AttachmentResponse {

    record AttachmentRequest(
            @NotBlank String fileName,
            @NotBlank String mimeType,
            @NotNull @Min(value = 1, message = "File size must be greater than 0") Integer fileSize,
            @NotNull  byte[] fileData,
            @NotNull  LocalDateTime uploadedAt
    ) implements AttachmentDto {}

    record AttachmentPatchRequest(
            String fileName
    ) implements AttachmentDto {}

    record AttachmentResponse(
            String id,
            String gradeRecordId,
            String fileName,
            String mimeType,
            int fileSize,
            byte[] fileData,
            LocalDateTime uploadedAt
    ) implements AttachmentDto {}
}
