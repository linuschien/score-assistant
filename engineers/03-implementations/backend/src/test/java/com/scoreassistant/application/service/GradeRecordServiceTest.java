package com.scoreassistant.application.service;

import com.scoreassistant.adapter.in.web.dto.GradeRecordDto.*;
import com.scoreassistant.adapter.out.persistence.GradeItemRepository;
import com.scoreassistant.adapter.out.persistence.StudentRepository;
import com.scoreassistant.adapter.out.persistence.GradeRecordRepository;
import com.scoreassistant.domain.exception.ResourceNotFoundException;
import com.scoreassistant.domain.model.GradeRecordEntity;
import org.springframework.data.domain.Example;
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
@DisplayName("GradeRecordService Unit Tests")
class GradeRecordServiceTest {

    @Mock GradeRecordRepository gradeRecordRepository;
    @Mock GradeItemRepository gradeItemRepository;
    @Mock StudentRepository studentRepository;
    @InjectMocks GradeRecordService gradeRecordService;

    private UUID recordId;
    private UUID gradeItemId;
    private UUID studentId;
    private GradeRecordEntity testRecord;

    @BeforeEach
    void setUp() {
        recordId    = UUID.randomUUID();
        gradeItemId = UUID.randomUUID();
        studentId   = UUID.randomUUID();
        testRecord  = new GradeRecordEntity(
                recordId, gradeItemId, studentId,
                BigDecimal.valueOf(85.5), LocalDateTime.now(),
                1, LocalDateTime.now(), LocalDateTime.now(), false, null
        );
    }

    @Test
    @DisplayName("create() should save GradeRecord with version=1")
    void create_shouldSaveWithVersionOne() {
        when(gradeItemRepository.exists(any(Example.class))).thenReturn(Mono.just(true));
        when(studentRepository.exists(any(Example.class))).thenReturn(Mono.just(true));
        when(gradeRecordRepository.save(any())).thenReturn(Mono.just(testRecord));

        var req = new GradeRecordRequest(gradeItemId, studentId, BigDecimal.valueOf(85.5));

        StepVerifier.create(gradeRecordService.create(req))
                .expectNextMatches(r -> r.version() == 1 && r.score().compareTo(BigDecimal.valueOf(85.5)) == 0)
                .verifyComplete();
    }

    @Test
    @DisplayName("findById() should return GradeRecord")
    void findById_shouldReturnRecord() {
        when(gradeRecordRepository.findById(recordId)).thenReturn(Mono.just(testRecord));

        StepVerifier.create(gradeRecordService.findById(recordId))
                .expectNextMatches(r -> r.id().equals(recordId.toString()))
                .verifyComplete();
    }

    @Test
    @DisplayName("findById() should throw when not found")
    void findById_shouldThrowWhenMissing() {
        when(gradeRecordRepository.findById(recordId)).thenReturn(Mono.empty());

        StepVerifier.create(gradeRecordService.findById(recordId))
                .expectError(ResourceNotFoundException.class)
                .verify();
    }

    @Test
    @DisplayName("patch() should update only score field")
    void patch_shouldUpdateScore() {
        var updated = new GradeRecordEntity(
                recordId, gradeItemId, studentId,
                BigDecimal.valueOf(90.0), LocalDateTime.now(),
                1, LocalDateTime.now(), LocalDateTime.now(), false, null
        );
        when(gradeRecordRepository.findById(recordId)).thenReturn(Mono.just(testRecord));
        when(gradeRecordRepository.save(any())).thenReturn(Mono.just(updated));

        var req = new GradeRecordPatchRequest(BigDecimal.valueOf(90.0));

        StepVerifier.create(gradeRecordService.patch(recordId, req))
                .expectNextMatches(r -> r.score().compareTo(BigDecimal.valueOf(90.0)) == 0)
                .verifyComplete();
    }

    @Test
    @DisplayName("delete() should soft-delete GradeRecord")
    void delete_shouldSoftDelete() {
        when(gradeRecordRepository.findById(recordId)).thenReturn(Mono.just(testRecord));
        when(gradeRecordRepository.save(any())).thenReturn(Mono.just(testRecord));

        StepVerifier.create(gradeRecordService.delete(recordId))
                .verifyComplete();
    }

    @Test
    @DisplayName("listAll() by gradeItemId should delegate to findAll")
    void listAll_byGradeItemId_shouldReturnRecords() {
        when(gradeRecordRepository.findAll(any(Example.class))).thenReturn(Flux.just(testRecord));

        StepVerifier.create(gradeRecordService.listAll(gradeItemId, null))
                .expectNextCount(1)
                .verifyComplete();
    }
}
