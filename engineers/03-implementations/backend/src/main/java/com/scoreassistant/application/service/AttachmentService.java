package com.scoreassistant.application.service;

import com.scoreassistant.adapter.in.web.dto.AttachmentDto.*;
import com.scoreassistant.adapter.out.persistence.AttachmentRepository;
import com.scoreassistant.adapter.out.persistence.GradeRecordRepository;
import com.scoreassistant.domain.exception.ResourceNotFoundException;
import com.scoreassistant.domain.exception.ValidationException;
import com.scoreassistant.domain.model.AttachmentEntity;
import com.scoreassistant.domain.model.GradeRecordEntity;
import org.springframework.data.domain.Example;
import org.springframework.data.domain.ExampleMatcher;
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
        if (req.file_size() <= 0) {
            return Mono.error(new ValidationException("File size must be greater than 0"));
        }
        var recordProbe = new GradeRecordEntity(gradeRecordId, null, null, null, null, 0, null, null, false, null);
        var matcher = ExampleMatcher.matching()
                .withIgnorePaths("version")
                .withIgnoreNullValues();
        return gradeRecordRepository.exists(Example.of(recordProbe, matcher))
                .filter(exists -> exists)
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("GradeRecord", gradeRecordId)))
                .flatMap(exists -> {
                    var now = LocalDateTime.now();
                    var entity = new AttachmentEntity(
                            null, gradeRecordId,
                            req.file_name(), req.mime_type(), req.file_size(), req.file_data(),
                            req.uploaded_at(), now, now, false, null
                    );
                    return attachmentRepository.save(entity);
                })
                .map(this::toResponse);
    }

    public Mono<AttachmentResponse> findById(UUID id) {
        return attachmentRepository.findById(id)
                .filter(e -> !e.deleted())
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("Attachment", id)))
                .map(this::toResponse);
    }

    @Transactional
    public Mono<AttachmentResponse> update(UUID id, AttachmentRequest req) {
        if (req.file_size() <= 0) {
            return Mono.error(new ValidationException("File size must be greater than 0"));
        }
        return attachmentRepository.findById(id)
                .filter(e -> !e.deleted())
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("Attachment", id)))
                .flatMap(e -> attachmentRepository.save(new AttachmentEntity(
                        e.id(), e.gradeRecordId(),
                        req.file_name(), req.mime_type(), req.file_size(), req.file_data(),
                        req.uploaded_at(), e.createdAt(), LocalDateTime.now(), false, null)))
                .map(this::toResponse);
    }

    @Transactional
    public Mono<AttachmentResponse> patch(UUID id, AttachmentPatchRequest req) {
        return attachmentRepository.findById(id)
                .filter(e -> !e.deleted())
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("Attachment", id)))
                .flatMap(e -> attachmentRepository.save(new AttachmentEntity(
                        e.id(), e.gradeRecordId(),
                        req.file_name() != null ? req.file_name() : e.fileName(),
                        e.mimeType(), e.fileSize(), e.fileData(),
                        e.uploadedAt(), e.createdAt(), LocalDateTime.now(), false, null)))
                .map(this::toResponse);
    }

    @Transactional
    public Mono<Void> delete(UUID id) {
        return attachmentRepository.findById(id)
                .filter(e -> !e.deleted())
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("Attachment", id)))
                .flatMap(e -> attachmentRepository.save(new AttachmentEntity(
                        e.id(), e.gradeRecordId(), e.fileName(), e.mimeType(), e.fileSize(), e.fileData(),
                        e.uploadedAt(), e.createdAt(), LocalDateTime.now(), true, LocalDateTime.now())))
                .then();
    }

    public Flux<AttachmentResponse> listAll(UUID gradeRecordId) {
        var probe = new AttachmentEntity(
                null,
                gradeRecordId,
                null, null, 0, null, null, null, null, false, null
        );
        var matcher = ExampleMatcher.matching()
                .withIgnorePaths("fileSize")
                .withIgnoreNullValues();
        return attachmentRepository.findAll(Example.of(probe, matcher)).map(this::toResponse);
    }

    private AttachmentResponse toResponse(AttachmentEntity e) {
        return new AttachmentResponse(
                e.id().toString(), e.gradeRecordId().toString(), e.fileName(), e.mimeType(),
                e.fileSize(), e.fileData(), e.uploadedAt()
        );
    }
}
