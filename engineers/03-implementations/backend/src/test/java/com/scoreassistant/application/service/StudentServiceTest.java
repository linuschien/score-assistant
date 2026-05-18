package com.scoreassistant.application.service;

import com.scoreassistant.adapter.in.web.dto.StudentDto.*;
import com.scoreassistant.adapter.out.persistence.ClassRepository;
import com.scoreassistant.adapter.out.persistence.StudentRepository;
import com.scoreassistant.domain.exception.ResourceNotFoundException;
import com.scoreassistant.domain.model.ClassEntity;
import com.scoreassistant.domain.model.StudentEntity;
import org.springframework.data.domain.Example;
import org.springframework.data.domain.Sort;
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
@DisplayName("StudentService Unit Tests")
class StudentServiceTest {

    @Mock StudentRepository studentRepository;
    @Mock ClassRepository classRepository;
    @InjectMocks StudentService studentService;

    private UUID studentId;
    private UUID classId;
    private ClassEntity classEntity;
    private StudentEntity studentEntity;

    @BeforeEach
    void setUp() {
        classId   = UUID.randomUUID();
        studentId = UUID.randomUUID();
        classEntity   = new ClassEntity(classId, UUID.randomUUID(), "CS-101",
                BigDecimal.valueOf(60), LocalDateTime.now(), LocalDateTime.now(), false, null);
        studentEntity = new StudentEntity(studentId, classId, 2026001, "Alice",
                LocalDateTime.now(), LocalDateTime.now(), false, null);
    }

    @Test
    @DisplayName("create() should create student under valid class")
    void create_shouldSaveUnderValidClass() {
        when(classRepository.exists(any(Example.class))).thenReturn(Mono.just(true));
        when(studentRepository.save(any())).thenReturn(Mono.just(studentEntity));

        var req = new StudentRequest(2026001, "Alice");

        StepVerifier.create(studentService.create(classId, req))
                .expectNextMatches(r -> r.student_name().equals("Alice"))
                .verifyComplete();
    }

    @Test
    @DisplayName("create() should throw when class not found")
    void create_shouldThrowWhenClassMissing() {
        when(classRepository.exists(any(Example.class))).thenReturn(Mono.just(false));

        StepVerifier.create(studentService.create(classId, new StudentRequest(1, "Bob")))
                .expectError(ResourceNotFoundException.class)
                .verify();
    }

    @Test
    @DisplayName("findById() should return student")
    void findById_shouldReturnStudent() {
        when(studentRepository.findById(studentId)).thenReturn(Mono.just(studentEntity));

        StepVerifier.create(studentService.findById(studentId))
                .expectNextMatches(r -> r.id().equals(studentId.toString()))
                .verifyComplete();
    }

    @Test
    @DisplayName("findById() should throw when not found")
    void findById_shouldThrowWhenMissing() {
        when(studentRepository.findById(studentId)).thenReturn(Mono.empty());

        StepVerifier.create(studentService.findById(studentId))
                .expectError(ResourceNotFoundException.class)
                .verify();
    }

    @Test
    @DisplayName("delete() should soft-delete student")
    void delete_shouldSoftDeleteStudent() {
        when(studentRepository.findById(studentId)).thenReturn(Mono.just(studentEntity));
        when(studentRepository.save(any())).thenReturn(Mono.just(studentEntity));

        StepVerifier.create(studentService.delete(studentId))
                .verifyComplete();
    }

    @Test
    @DisplayName("listAll() should return ordered students")
    void listAll_shouldReturnStudents() {
        when(studentRepository.findAll(any(Example.class), any(Sort.class))).thenReturn(Flux.just(studentEntity));

        StepVerifier.create(studentService.listAll(classId))
                .expectNextCount(1)
                .verifyComplete();
    }

    @Test
    @DisplayName("importStudents() should parse CSV and save students")
    void importStudents_shouldParseCsvAndSave() {
        when(classRepository.exists(any(Example.class))).thenReturn(Mono.just(true));
        when(studentRepository.save(any())).thenReturn(Mono.just(studentEntity));

        var csv = "student_number,student_name\n2026001,Alice\n2026002,Bob\n".getBytes();

        StepVerifier.create(studentService.importStudents(classId, csv))
                .expectNextMatches(r -> r.success() && r.affectedCount() == 2)
                .verifyComplete();
    }
}
