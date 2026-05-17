package com.scoreassistant.application.service;

import com.scoreassistant.adapter.in.web.dto.ClassDto.*;
import com.scoreassistant.adapter.out.persistence.ClassRepository;
import com.scoreassistant.adapter.out.persistence.SemesterRepository;
import com.scoreassistant.domain.exception.ResourceNotFoundException;
import com.scoreassistant.domain.model.ClassEntity;
import com.scoreassistant.domain.model.SemesterEntity;
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
@DisplayName("ClassService Unit Tests")
class ClassServiceTest {

    @Mock ClassRepository classRepository;
    @Mock SemesterRepository semesterRepository;
    @InjectMocks ClassService classService;

    private UUID classId;
    private UUID semesterId;
    private SemesterEntity semesterEntity;
    private ClassEntity classEntity;

    @BeforeEach
    void setUp() {
        semesterId = UUID.randomUUID();
        classId    = UUID.randomUUID();
        semesterEntity = new SemesterEntity(semesterId, "2026-Fall",
                LocalDate.of(2026, 9, 1), LocalDate.of(2027, 1, 31),
                LocalDateTime.now(), LocalDateTime.now(), null);
        classEntity = new ClassEntity(classId, semesterId, "CS-101",
                BigDecimal.valueOf(60.0), LocalDateTime.now(), LocalDateTime.now(), null);
    }

    @Test
    @DisplayName("create() should validate semester exists and save class")
    void create_shouldSaveClassUnderValidSemester() {
        when(semesterRepository.findById(semesterId)).thenReturn(Mono.just(semesterEntity));
        when(classRepository.save(any())).thenReturn(Mono.just(classEntity));

        var req = new ClassRequest("CS-101", BigDecimal.valueOf(60.0));

        StepVerifier.create(classService.create(semesterId, req))
                .expectNextMatches(r -> r.class_name().equals("CS-101"))
                .verifyComplete();
    }

    @Test
    @DisplayName("create() should fail when semester not found")
    void create_shouldFailWhenSemesterMissing() {
        when(semesterRepository.findById(semesterId)).thenReturn(Mono.empty());

        var req = new ClassRequest("CS-101", null);

        StepVerifier.create(classService.create(semesterId, req))
                .expectError(ResourceNotFoundException.class)
                .verify();
    }

    @Test
    @DisplayName("findById() should return ClassResponse for active class")
    void findById_shouldReturnWhenActive() {
        when(classRepository.findById(classId)).thenReturn(Mono.just(classEntity));

        StepVerifier.create(classService.findById(classId))
                .expectNextMatches(r -> r.id().equals(classId.toString()))
                .verifyComplete();
    }

    @Test
    @DisplayName("delete() should soft-delete class")
    void delete_shouldSoftDelete() {
        when(classRepository.findById(classId)).thenReturn(Mono.just(classEntity));
        when(classRepository.save(any())).thenReturn(Mono.just(classEntity));

        StepVerifier.create(classService.delete(classId))
                .verifyComplete();
    }

    @Test
    @DisplayName("listBySemester() should return classes for semester")
    void listBySemester_shouldReturnClasses() {
        when(classRepository.findBySemesterId(semesterId)).thenReturn(Flux.just(classEntity));

        StepVerifier.create(classService.listBySemester(semesterId, null))
                .expectNextCount(1)
                .verifyComplete();
    }
}
