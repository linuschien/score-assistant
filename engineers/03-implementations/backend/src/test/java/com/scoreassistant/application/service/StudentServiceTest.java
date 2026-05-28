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
        classEntity   = new ClassEntity(classId, UUID.randomUUID(), "CS-101", null,
                BigDecimal.valueOf(60), LocalDateTime.now(), LocalDateTime.now(), false, null);
        studentEntity = new StudentEntity(studentId, classId, "S101", 2026001, "Alice", "alice@gmail.com",
                LocalDateTime.now(), LocalDateTime.now(), false, null);
    }

    @Test
    @DisplayName("create() should create student under valid class")
    void create_shouldSaveUnderValidClass() {
        when(classRepository.exists(any(Example.class))).thenReturn(Mono.just(true));
        when(studentRepository.exists(any(Example.class))).thenReturn(Mono.just(false));
        when(studentRepository.save(any())).thenReturn(Mono.just(studentEntity));

        var req = new StudentRequest("S101", 2026001, "Alice", "alice@gmail.com");

        StepVerifier.create(studentService.create(classId, req))
                .expectNextMatches(r -> r.studentName().equals("Alice"))
                .verifyComplete();
    }

    @Test
    @DisplayName("create() should throw when class not found")
    void create_shouldThrowWhenClassMissing() {
        when(classRepository.exists(any(Example.class))).thenReturn(Mono.just(false));

        StepVerifier.create(studentService.create(classId, new StudentRequest("S102", 1, "Bob", "bob@gmail.com")))
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
    @DisplayName("importStudents() should parse CSV and save students with Chinese headers")
    void importStudents_shouldParseCsvAndSaveWithChineseHeaders() {
        when(classRepository.exists(any(Example.class))).thenReturn(Mono.just(true));
        when(studentRepository.findOne(any(Example.class))).thenReturn(Mono.empty());
        when(studentRepository.save(any())).thenReturn(Mono.just(studentEntity));

        var csv = "學號,座號,姓名,信箱\nS101,2026001,Alice,alice@gmail.com\nS102,2026002,Bob,bob@gmail.com\n".getBytes();

        StepVerifier.create(studentService.importStudents(classId, csv))
                .expectNextMatches(r -> r.success() && r.affectedCount() == 2)
                .verifyComplete();
    }

    @Test
    @DisplayName("importStudents() should parse CSV with shuffled Chinese headers")
    void importStudents_shouldParseCsvWithShuffledChineseHeaders() {
        when(classRepository.exists(any(Example.class))).thenReturn(Mono.just(true));
        when(studentRepository.findOne(any(Example.class))).thenReturn(Mono.empty());
        when(studentRepository.save(any())).thenReturn(Mono.just(studentEntity));

        // Column order: 信箱, 姓名, 座號, 學號
        var csv = "信箱,姓名,座號,學號\nalice@gmail.com,Alice,2026001,S101\nbob@gmail.com,Bob,2026002,S102\n".getBytes();

        StepVerifier.create(studentService.importStudents(classId, csv))
                .expectNextMatches(r -> r.success() && r.affectedCount() == 2)
                .verifyComplete();
    }

    @Test
    @DisplayName("importStudents() should throw ValidationException when headers are missing")
    void importStudents_shouldThrowWhenHeadersAreMissing() {
        when(classRepository.exists(any(Example.class))).thenReturn(Mono.just(true));

        // Missing 學號
        var csv = "座號,姓名,信箱\n2026001,Alice,alice@gmail.com\n".getBytes();

        StepVerifier.create(studentService.importStudents(classId, csv))
                .expectErrorMatches(throwable -> throwable instanceof com.scoreassistant.domain.exception.ValidationException
                        && throwable.getMessage().contains("Missing required columns: 學號"))
                .verify();
    }

    @Test
    @DisplayName("importStudents() should successfully parse CSV with a UTF-8 BOM")
    void importStudents_shouldParseCsvWithUtf8Bom() {
        when(classRepository.exists(any(Example.class))).thenReturn(Mono.just(true));
        when(studentRepository.findOne(any(Example.class))).thenReturn(Mono.empty());
        when(studentRepository.save(any())).thenReturn(Mono.just(studentEntity));

        // Prepend UTF-8 BOM (\uFEFF)
        var csv = "\uFEFF學號,座號,姓名,信箱\nS101,2026001,Alice,alice@gmail.com\nS102,2026002,Bob,bob@gmail.com\n".getBytes();

        StepVerifier.create(studentService.importStudents(classId, csv))
                .expectNextMatches(r -> r.success() && r.affectedCount() == 2)
                .verifyComplete();
    }
}
