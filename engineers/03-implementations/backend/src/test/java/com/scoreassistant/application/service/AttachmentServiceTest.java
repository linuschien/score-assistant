package com.scoreassistant.application.service;

import com.scoreassistant.adapter.in.web.dto.AttachmentDto.*;
import com.scoreassistant.adapter.out.persistence.AttachmentRepository;
import com.scoreassistant.adapter.out.persistence.GradeRecordRepository;
import com.scoreassistant.domain.exception.ResourceNotFoundException;
import com.scoreassistant.domain.model.AttachmentEntity;
import com.scoreassistant.domain.model.GradeRecordEntity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AttachmentService Unit Tests")
class AttachmentServiceTest {

    @Mock AttachmentRepository attachmentRepository;
    @Mock GradeRecordRepository gradeRecordRepository;
    @InjectMocks AttachmentService attachmentService;

    private UUID attachmentId;
    private UUID gradeRecordId;
    private GradeRecordEntity gradeRecordEntity;
    private AttachmentEntity attachmentEntity;

    @BeforeEach
    void setUp() {
        gradeRecordId = UUID.randomUUID();
        attachmentId = UUID.randomUUID();
        gradeRecordEntity = new GradeRecordEntity(gradeRecordId, UUID.randomUUID(), UUID.randomUUID(),
                BigDecimal.valueOf(80), LocalDateTime.now(), 1, LocalDateTime.now(), LocalDateTime.now(), null);
        attachmentEntity = new AttachmentEntity(attachmentId, gradeRecordId, "homework.pdf", "application/pdf",
                1024, new byte[]{1, 2, 3}, LocalDateTime.now(), LocalDateTime.now(), LocalDateTime.now(), null);
    }

    @Test
    @DisplayName("create() should save attachment under valid GradeRecord")
    void create_shouldSaveUnderValidRecord() {
        when(gradeRecordRepository.findById(gradeRecordId)).thenReturn(Mono.just(gradeRecordEntity));
        when(attachmentRepository.save(any())).thenReturn(Mono.just(attachmentEntity));

        var req = new AttachmentRequest("homework.pdf", "application/pdf", 1024,
                new byte[]{1, 2, 3}, LocalDateTime.now());

        StepVerifier.create(attachmentService.create(gradeRecordId, req))
                .expectNextMatches(r -> r.file_name().equals("homework.pdf"))
                .verifyComplete();
    }

    @Test
    @DisplayName("create() should throw when GradeRecord is missing")
    void create_shouldThrowWhenRecordMissing() {
        when(gradeRecordRepository.findById(gradeRecordId)).thenReturn(Mono.empty());

        var req = new AttachmentRequest("homework.pdf", "application/pdf", 1024,
                new byte[]{1, 2, 3}, LocalDateTime.now());

        StepVerifier.create(attachmentService.create(gradeRecordId, req))
                .expectError(ResourceNotFoundException.class)
                .verify();
    }

    @Test
    @DisplayName("findById() should return attachment")
    void findById_shouldReturnAttachment() {
        when(attachmentRepository.findById(attachmentId)).thenReturn(Mono.just(attachmentEntity));

        StepVerifier.create(attachmentService.findById(attachmentId))
                .expectNextMatches(r -> r.id().equals(attachmentId.toString()))
                .verifyComplete();
    }

    @Test
    @DisplayName("delete() should soft-delete attachment")
    void delete_shouldSoftDelete() {
        when(attachmentRepository.findById(attachmentId)).thenReturn(Mono.just(attachmentEntity));
        when(attachmentRepository.save(any())).thenReturn(Mono.just(attachmentEntity));

        StepVerifier.create(attachmentService.delete(attachmentId))
                .verifyComplete();
    }

    @Test
    @DisplayName("listAll() should return attachments")
    void listAll_shouldReturnAttachments() {
        when(attachmentRepository.findByGradeRecordId(gradeRecordId)).thenReturn(Flux.just(attachmentEntity));

        StepVerifier.create(attachmentService.listAll(gradeRecordId))
                .expectNextCount(1)
                .verifyComplete();
    }
}
