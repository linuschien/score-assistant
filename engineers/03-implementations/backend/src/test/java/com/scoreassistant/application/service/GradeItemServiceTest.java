package com.scoreassistant.application.service;

import com.scoreassistant.adapter.in.web.dto.GradeItemDto.*;
import com.scoreassistant.adapter.in.web.dto.ExportGradesRequestDto;
import com.scoreassistant.adapter.in.web.dto.ExportAttendanceRequestDto;
import com.scoreassistant.adapter.in.web.dto.CalculateWeightedScoresRequestDto;
import com.scoreassistant.adapter.out.persistence.*;
import com.scoreassistant.domain.exception.ResourceNotFoundException;
import com.scoreassistant.domain.model.*;
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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("GradeItemService Unit Tests")
class GradeItemServiceTest {

    @Mock GradeItemRepository gradeItemRepository;
    @Mock ClassRepository classRepository;
    @Mock StudentRepository studentRepository;
    @Mock GradeRecordRepository gradeRecordRepository;
    @InjectMocks GradeItemService gradeItemService;

    private UUID itemId;
    private UUID classId;
    private ClassEntity classEntity;
    private GradeItemEntity gradeItemEntity;

    @BeforeEach
    void setUp() {
        classId = UUID.randomUUID();
        itemId = UUID.randomUUID();
        classEntity = new ClassEntity(classId, UUID.randomUUID(), "CS-101",
                BigDecimal.valueOf(60), LocalDateTime.now(), LocalDateTime.now(), null);
        gradeItemEntity = new GradeItemEntity(itemId, classId, "Midterm Exam", "ASSIGNMENT",
                LocalDate.now(), "Midterm exam", BigDecimal.valueOf(100.0), BigDecimal.valueOf(0.3),
                LocalDateTime.now(), LocalDateTime.now(), null);
    }

    @Test
    @DisplayName("create() should save GradeItem")
    void create_shouldSaveGradeItem() {
        when(classRepository.findById(classId)).thenReturn(Mono.just(classEntity));
        when(gradeItemRepository.save(any())).thenReturn(Mono.just(gradeItemEntity));

        var req = new GradeItemRequest("Midterm Exam", "ASSIGNMENT", LocalDate.now(),
                "Midterm exam", BigDecimal.valueOf(100.0), BigDecimal.valueOf(0.3));

        StepVerifier.create(gradeItemService.create(classId, req))
                .expectNextMatches(r -> r.item_name().equals("Midterm Exam"))
                .verifyComplete();
    }

    @Test
    @DisplayName("findById() should return GradeItem")
    void findById_shouldReturnGradeItem() {
        when(gradeItemRepository.findById(itemId)).thenReturn(Mono.just(gradeItemEntity));

        StepVerifier.create(gradeItemService.findById(itemId))
                .expectNextMatches(r -> r.id().equals(itemId.toString()))
                .verifyComplete();
    }

    @Test
    @DisplayName("delete() should soft-delete GradeItem")
    void delete_shouldSoftDelete() {
        when(gradeItemRepository.findById(itemId)).thenReturn(Mono.just(gradeItemEntity));
        when(gradeItemRepository.save(any())).thenReturn(Mono.just(gradeItemEntity));

        StepVerifier.create(gradeItemService.delete(itemId))
                .verifyComplete();
    }

    @Test
    @DisplayName("listAll() should return grade items")
    void listAll_shouldReturnItems() {
        when(gradeItemRepository.findByClassId(classId)).thenReturn(Flux.just(gradeItemEntity));

        StepVerifier.create(gradeItemService.listAll(classId, null))
                .expectNextCount(1)
                .verifyComplete();
    }

    @Test
    @DisplayName("exportGrades() should build export spreadsheet")
    void exportGrades_shouldBuildSpreadsheet() {
        var studentId = UUID.randomUUID();
        var student = new StudentEntity(studentId, classId, 2026001, "Alice",
                LocalDateTime.now(), LocalDateTime.now(), null);
        var record = new GradeRecordEntity(UUID.randomUUID(), itemId, studentId,
                BigDecimal.valueOf(95.0), LocalDateTime.now(), 1, LocalDateTime.now(), LocalDateTime.now(), null);

        when(gradeItemRepository.findByClassId(classId)).thenReturn(Flux.just(gradeItemEntity));
        when(studentRepository.findByClassIdOrdered(classId)).thenReturn(Flux.just(student));
        when(gradeRecordRepository.findByClassId(classId)).thenReturn(Flux.just(record));

        StepVerifier.create(gradeItemService.exportGrades(classId, new ExportGradesRequestDto("xlsx")))
                .expectNextMatches(r -> r.success() && r.affectedCount() == 1)
                .verifyComplete();
    }

    @Test
    @DisplayName("exportAttendance() should succeed")
    void exportAttendance_shouldSucceed() {
        var student = new StudentEntity(UUID.randomUUID(), classId, 2026001, "Alice",
                LocalDateTime.now(), LocalDateTime.now(), null);
        when(gradeItemRepository.findByClassIdAndItemType(classId, "ATTENDANCE")).thenReturn(Flux.empty());
        when(studentRepository.findByClassIdOrdered(classId)).thenReturn(Flux.just(student));

        StepVerifier.create(gradeItemService.exportAttendance(classId, new ExportAttendanceRequestDto("xlsx")))
                .expectNextMatches(r -> r.success() && r.affectedCount() == 1)
                .verifyComplete();
    }

    @Test
    @DisplayName("calculateWeightedScores() should perform calculations")
    void calculateWeightedScores_shouldCalculate() {
        var studentId = UUID.randomUUID();
        var student = new StudentEntity(studentId, classId, 2026001, "Alice",
                LocalDateTime.now(), LocalDateTime.now(), null);
        var record = new GradeRecordEntity(UUID.randomUUID(), itemId, studentId,
                BigDecimal.valueOf(90.0), LocalDateTime.now(), 1, LocalDateTime.now(), LocalDateTime.now(), null);

        when(gradeItemRepository.findByClassId(classId)).thenReturn(Flux.just(gradeItemEntity));
        when(studentRepository.findByClassIdOrdered(classId)).thenReturn(Flux.just(student));
        when(gradeRecordRepository.findByClassId(classId)).thenReturn(Flux.just(record));

        StepVerifier.create(gradeItemService.calculateWeightedScores(classId, new CalculateWeightedScoresRequestDto(classId)))
                .expectNextMatches(r -> r.success() && r.affectedCount() == 1)
                .verifyComplete();
    }
}
