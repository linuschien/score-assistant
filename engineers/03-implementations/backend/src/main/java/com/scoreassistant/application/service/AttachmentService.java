package com.scoreassistant.application.service;

import com.scoreassistant.adapter.in.web.dto.AttachmentDto.*;
import com.scoreassistant.adapter.out.persistence.AttachmentRepository;
import com.scoreassistant.adapter.out.persistence.GradeRecordRepository;
import com.scoreassistant.domain.exception.ResourceNotFoundException;
import com.scoreassistant.domain.model.AttachmentEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class AttachmentService {

    private final AttachmentRepository attachmentRepository;
    private final GradeRecordRepository gradeRecordRepository;

    public AttachmentService(AttachmentRepository attachmentRepository,
                             GradeRecordRepository gradeRecordRepository) {
        this.attachmentRepository = attachmentRepository;
        this.gradeRecordRepository = gradeRecordRepository;
    }

    @Transactional
    public Mono<AttachmentResponse> create(UUID gradeRecordId, AttachmentRequest req) {
        return gradeRecordRepository.findById(gradeRecordId)
                .filter(e -> e.deletedAt() == null)
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("GradeRecord", gradeRecordId)))
                .flatMap(gr -> {
                    var now = LocalDateTime.now();
                    var entity = new AttachmentEntity(
                            UUID.randomUUID(), gradeRecordId,
                            req.file_name(), req.mime_type(), req.file_size(), req.file_data(),
                            req.uploaded_at(), now, now, null
                    );
                    return attachmentRepository.save(entity);
                })
                .map(this::toResponse);
    }

    public Mono<AttachmentResponse> findById(UUID id) {
        return attachmentRepository.findById(id)
                .filter(e -> e.deletedAt() == null)
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("Attachment", id)))
                .map(this::toResponse);
    }

    @Transactional
    public Mono<AttachmentResponse> update(UUID id, AttachmentRequest req) {
        return attachmentRepository.findById(id)
                .filter(e -> e.deletedAt() == null)
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("Attachment", id)))
                .flatMap(e -> attachmentRepository.save(new AttachmentEntity(
                        e.id(), e.gradeRecordId(),
                        req.file_name(), req.mime_type(), req.file_size(), req.file_data(),
                        req.uploaded_at(), e.createdAt(), LocalDateTime.now(), null)))
                .map(this::toResponse);
    }

    @Transactional
    public Mono<AttachmentResponse> patch(UUID id, AttachmentPatchRequest req) {
        return attachmentRepository.findById(id)
                .filter(e -> e.deletedAt() == null)
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("Attachment", id)))
                .flatMap(e -> attachmentRepository.save(new AttachmentEntity(
                        e.id(), e.gradeRecordId(),
                        req.file_name() != null ? req.file_name() : e.fileName(),
                        e.mimeType(), e.fileSize(), e.fileData(),
                        e.uploadedAt(), e.createdAt(), LocalDateTime.now(), null)))
                .map(this::toResponse);
    }

    @Transactional
    public Mono<Void> delete(UUID id) {
        return attachmentRepository.findById(id)
                .filter(e -> e.deletedAt() == null)
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("Attachment", id)))
                .flatMap(e -> attachmentRepository.save(new AttachmentEntity(
                        e.id(), e.gradeRecordId(), e.fileName(), e.mimeType(), e.fileSize(), e.fileData(),
                        e.uploadedAt(), e.createdAt(), LocalDateTime.now(), LocalDateTime.now())))
                .then();
    }

    public Flux<AttachmentResponse> listByGradeRecord(UUID gradeRecordId) {
        return attachmentRepository.findByGradeRecordId(gradeRecordId).map(this::toResponse);
    }

    public Flux<AttachmentResponse> listAll(UUID gradeRecordId) {
        if (gradeRecordId != null) return listByGradeRecord(gradeRecordId);
        return attachmentRepository.findAll()
                .filter(e -> e.deletedAt() == null)
                .map(this::toResponse);
    }

    private AttachmentResponse toResponse(AttachmentEntity e) {
        return new AttachmentResponse(
                e.id().toString(), e.fileName(), e.mimeType(),
                e.fileSize(), e.fileData(), e.uploadedAt()
        );
    }
}
