package com.scoreassistant.application.service;

import com.scoreassistant.adapter.in.web.dto.SemesterDto.*;
import com.scoreassistant.adapter.out.persistence.SemesterRepository;
import com.scoreassistant.domain.exception.ResourceNotFoundException;
import com.scoreassistant.domain.model.SemesterEntity;
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

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("SemesterService Unit Tests")
class SemesterServiceTest {

    @Mock SemesterRepository semesterRepository;
    @InjectMocks SemesterService semesterService;

    private UUID testId;
    private SemesterEntity testEntity;

    @BeforeEach
    void setUp() {
        testId = UUID.randomUUID();
        testEntity = new SemesterEntity(
                testId, "2026-Fall",
                LocalDate.of(2026, 9, 1), LocalDate.of(2027, 1, 31),
                LocalDateTime.now(), LocalDateTime.now(), false, null
        );
    }

    @Test
    @DisplayName("create() should save and return a SemesterResponse")
    void create_shouldSaveAndReturnResponse() {
        when(semesterRepository.save(any())).thenReturn(Mono.just(testEntity));

        var req = new SemesterRequest("2026-Fall",
                LocalDate.of(2026, 9, 1), LocalDate.of(2027, 1, 31));

        StepVerifier.create(semesterService.create(req))
                .expectNextMatches(r -> r.semesterName().equals("2026-Fall"))
                .verifyComplete();
    }

    @Test
    @DisplayName("findById() should return semester when exists")
    void findById_shouldReturnWhenExists() {
        when(semesterRepository.findById(testId)).thenReturn(Mono.just(testEntity));

        StepVerifier.create(semesterService.findById(testId))
                .expectNextMatches(r -> r.id().equals(testId.toString()))
                .verifyComplete();
    }

    @Test
    @DisplayName("findById() should emit ResourceNotFoundException when not found")
    void findById_shouldThrowWhenNotFound() {
        when(semesterRepository.findById(testId)).thenReturn(Mono.empty());

        StepVerifier.create(semesterService.findById(testId))
                .expectError(ResourceNotFoundException.class)
                .verify();
    }

    @Test
    @DisplayName("findById() should throw when soft-deleted")
    void findById_shouldThrowWhenSoftDeleted() {
        var deleted = new SemesterEntity(testId, "2026-Fall",
                LocalDate.of(2026, 9, 1), LocalDate.of(2027, 1, 31),
                LocalDateTime.now(), LocalDateTime.now(), true, LocalDateTime.now());
        when(semesterRepository.findById(testId)).thenReturn(Mono.just(deleted));

        StepVerifier.create(semesterService.findById(testId))
                .expectError(ResourceNotFoundException.class)
                .verify();
    }

    @Test
    @DisplayName("update() should update and return SemesterResponse")
    void update_shouldUpdateAndReturn() {
        when(semesterRepository.findById(testId)).thenReturn(Mono.just(testEntity));
        when(semesterRepository.save(any())).thenReturn(Mono.just(testEntity));

        var req = new SemesterRequest("2026-Fall-Updated",
                LocalDate.of(2026, 9, 1), LocalDate.of(2027, 1, 31));

        StepVerifier.create(semesterService.update(testId, req))
                .expectNextCount(1)
                .verifyComplete();
    }

    @Test
    @DisplayName("delete() should soft-delete semester")
    void delete_shouldSoftDelete() {
        when(semesterRepository.findById(testId)).thenReturn(Mono.just(testEntity));
        when(semesterRepository.save(any())).thenReturn(Mono.just(testEntity));

        StepVerifier.create(semesterService.delete(testId))
                .verifyComplete();
    }

    @Test
    @DisplayName("listAll() without filter should return all active semesters")
    void listAll_shouldReturnActiveList() {
        when(semesterRepository.findAll(any(Example.class))).thenReturn(Flux.just(testEntity));

        StepVerifier.create(semesterService.listAll(null))
                .expectNextCount(1)
                .verifyComplete();
    }

    @Test
    @DisplayName("listAll() with name filter should use name-based query")
    void listAll_withFilter_shouldUseNameQuery() {
        when(semesterRepository.findAll(any(Example.class))).thenReturn(Flux.just(testEntity));

        StepVerifier.create(semesterService.listAll("Fall"))
                .expectNextCount(1)
                .verifyComplete();
    }
}
