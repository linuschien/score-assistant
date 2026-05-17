package com.scoreassistant.adapter.in.web.rest;

import com.scoreassistant.adapter.in.web.dto.AttachmentDto.*;
import com.scoreassistant.application.service.AttachmentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/grade-records/{gradeRecordId}/attachments")
public class AttachmentController {

    private final AttachmentService attachmentService;

    public AttachmentController(AttachmentService attachmentService) {
        this.attachmentService = attachmentService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<AttachmentResponse> createAttachment(
            @PathVariable UUID gradeRecordId,
            @Valid @RequestBody AttachmentRequest req) {
        return attachmentService.create(gradeRecordId, req);
    }

    @GetMapping("/{attachmentId}")
    public Mono<AttachmentResponse> getAttachmentById(
            @PathVariable UUID gradeRecordId,
            @PathVariable UUID attachmentId) {
        return attachmentService.findById(attachmentId);
    }

    @PutMapping("/{attachmentId}")
    public Mono<AttachmentResponse> updateAttachment(
            @PathVariable UUID gradeRecordId,
            @PathVariable UUID attachmentId,
            @Valid @RequestBody AttachmentRequest req) {
        return attachmentService.update(attachmentId, req);
    }

    @PatchMapping("/{attachmentId}")
    public Mono<AttachmentResponse> patchAttachment(
            @PathVariable UUID gradeRecordId,
            @PathVariable UUID attachmentId,
            @RequestBody AttachmentPatchRequest req) {
        return attachmentService.patch(attachmentId, req);
    }

    @DeleteMapping("/{attachmentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> deleteAttachment(
            @PathVariable UUID gradeRecordId,
            @PathVariable UUID attachmentId) {
        return attachmentService.delete(attachmentId);
    }
}
