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
    @Mock GradeRecordService gradeRecordService;
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
        when(gradeRecordService.deleteByStudentId(any())).thenReturn(Mono.empty());

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

    @Test
    @DisplayName("importStudents() should parse Excel (XLSX) and save students")
    void importStudents_shouldParseExcelAndSave() throws Exception {
        when(classRepository.exists(any(Example.class))).thenReturn(Mono.just(true));
        when(studentRepository.findOne(any(Example.class))).thenReturn(Mono.empty());
        when(studentRepository.save(any())).thenReturn(Mono.just(studentEntity));

        // Create an in-memory XLSX workbook
        byte[] excelBytes;
        try (org.apache.poi.xssf.usermodel.XSSFWorkbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook()) {
            org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet("Students");
            
            // Header Row
            org.apache.poi.ss.usermodel.Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("學號");
            header.createCell(1).setCellValue("座號");
            header.createCell(2).setCellValue("姓名");
            header.createCell(3).setCellValue("信箱");
            
            // Data Row 1
            org.apache.poi.ss.usermodel.Row row1 = sheet.createRow(1);
            row1.createCell(0).setCellValue("S101");
            row1.createCell(1).setCellValue(2026001); // Numeric
            row1.createCell(2).setCellValue("Alice");
            row1.createCell(3).setCellValue("alice@gmail.com");
            
            // Data Row 2
            org.apache.poi.ss.usermodel.Row row2 = sheet.createRow(2);
            row2.createCell(0).setCellValue("S102");
            row2.createCell(1).setCellValue(2026002);
            row2.createCell(2).setCellValue("Bob");
            row2.createCell(3).setCellValue("bob@gmail.com");

            java.io.ByteArrayOutputStream bos = new java.io.ByteArrayOutputStream();
            workbook.write(bos);
            excelBytes = bos.toByteArray();
        }

        StepVerifier.create(studentService.importStudents(classId, excelBytes, "students.xlsx", "SKIP"))
                .expectNextMatches(r -> r.success() && r.affectedCount() == 2)
                .verifyComplete();
    }

    @Test
    @DisplayName("create() should throw ValidationException when studentNumber is less than 1")
    void create_shouldThrowWhenStudentNumberLessThanOne() {
        var req = new StudentRequest("S101", 0, "Alice", "alice@gmail.com");

        StepVerifier.create(studentService.create(classId, req))
                .expectErrorMatches(throwable -> throwable instanceof com.scoreassistant.domain.exception.ValidationException
                        && throwable.getMessage().contains("Student seat number must be at least 1"))
                .verify();
    }

    @Test
    @DisplayName("update() should throw ValidationException when studentNumber is less than 1")
    void update_shouldThrowWhenStudentNumberLessThanOne() {
        var req = new StudentRequest("S101", 0, "Alice", "alice@gmail.com");

        StepVerifier.create(studentService.update(studentId, req))
                .expectErrorMatches(throwable -> throwable instanceof com.scoreassistant.domain.exception.ValidationException
                        && throwable.getMessage().contains("Student seat number must be at least 1"))
                .verify();
    }
}
