package com.scoreassistant.adapter.in.web.graphql;

import com.scoreassistant.adapter.in.web.dto.SemesterDto.SemesterResponse;
import com.scoreassistant.adapter.in.web.dto.ClassDto.ClassResponse;
import com.scoreassistant.adapter.in.web.dto.StudentDto.StudentResponse;
import com.scoreassistant.adapter.in.web.dto.GradeItemDto.GradeItemResponse;
import com.scoreassistant.adapter.in.web.dto.GradeRecordDto.GradeRecordResponse;
import com.scoreassistant.adapter.in.web.dto.AttachmentDto.AttachmentResponse;
import com.scoreassistant.application.service.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import reactor.core.publisher.Flux;
import reactor.test.StepVerifier;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("GraphQL Resolvers Unit Tests")
class GraphQLResolverTest {

    @Mock private SemesterService semesterService;
    @Mock private ClassService classService;
    @Mock private StudentService studentService;
    @Mock private GradeItemService gradeItemService;
    @Mock private GradeRecordService gradeRecordService;
    @Mock private AttachmentService attachmentService;

    @Test
    @DisplayName("SemesterGraphQLResolver should resolve queries and map fields correctly")
    void testSemesterResolver() {
        var resolver = new SemesterGraphQLResolver(semesterService);
        var semId = UUID.randomUUID().toString();
        var response = new SemesterResponse(semId, "2026-Fall", LocalDate.of(2026, 9, 1), LocalDate.of(2027, 1, 31));
        when(semesterService.listAll(any())).thenReturn(Flux.just(response));

        var result = resolver.listSemesters(new SemesterGraphQLResolver.SemesterFilterInput("2026"));
        StepVerifier.create(result)
                .expectNext(response)
                .verifyComplete();

        assertEquals("2026-Fall", resolver.semesterName(response));
        assertEquals("2026-09-01", resolver.startDate(response));
        assertEquals("2027-01-31", resolver.endDate(response));
    }

    @Test
    @DisplayName("ClassGraphQLResolver should resolve queries and map fields correctly")
    void testClassResolver() {
        var resolver = new ClassGraphQLResolver(classService);
        var classId = UUID.randomUUID().toString();
        var semId = UUID.randomUUID().toString();
        var response = new ClassResponse(classId, semId, "CS-101", BigDecimal.valueOf(60.0));
        when(classService.listAll(any(), any())).thenReturn(Flux.just(response));

        var result = resolver.listClasses(new ClassGraphQLResolver.ClassFilterInput(semId, "CS-101"));
        StepVerifier.create(result)
                .expectNext(response)
                .verifyComplete();

        assertEquals(semId, resolver.semesterId(response));
        assertEquals("CS-101", resolver.className(response));
        assertEquals(BigDecimal.valueOf(60.0), resolver.passingThreshold(response));
    }

    @Test
    @DisplayName("StudentGraphQLResolver should resolve queries and map fields correctly")
    void testStudentResolver() {
        var resolver = new StudentGraphQLResolver(studentService);
        var studentId = UUID.randomUUID().toString();
        var classId = UUID.randomUUID().toString();
        var response = new StudentResponse(studentId, classId, 101, "Alice");
        when(studentService.listAll(any())).thenReturn(Flux.just(response));

        var result = resolver.listStudents(new StudentGraphQLResolver.StudentFilterInput(classId));
        StepVerifier.create(result)
                .expectNext(response)
                .verifyComplete();

        assertEquals(classId, resolver.classId(response));
        assertEquals(101, resolver.studentNumber(response));
        assertEquals("Alice", resolver.studentName(response));
    }

    @Test
    @DisplayName("GradeItemGraphQLResolver should resolve queries and map fields correctly")
    void testGradeItemResolver() {
        var resolver = new GradeItemGraphQLResolver(gradeItemService);
        var itemId = UUID.randomUUID().toString();
        var classId = UUID.randomUUID().toString();
        var date = LocalDate.of(2026, 10, 1);
        var response = new GradeItemResponse(itemId, classId, "Quiz 1", "ASSIGNMENT", date, "First quiz", BigDecimal.valueOf(100.0), BigDecimal.valueOf(0.1));
        when(gradeItemService.listAll(any(), any())).thenReturn(Flux.just(response));

        var result = resolver.listGradeItems(new GradeItemGraphQLResolver.GradeItemFilterInput(classId, "ASSIGNMENT"));
        StepVerifier.create(result)
                .expectNext(response)
                .verifyComplete();

        assertEquals(classId, resolver.classId(response));
        assertEquals("Quiz 1", resolver.itemName(response));
        assertEquals("ASSIGNMENT", resolver.itemType(response));
        assertEquals("2026-10-01", resolver.itemDate(response));
        assertEquals("First quiz", resolver.itemDescription(response));
        assertEquals(BigDecimal.valueOf(100.0), resolver.maxScore(response));
        assertEquals(BigDecimal.valueOf(0.1), resolver.weight(response));
    }

    @Test
    @DisplayName("GradeRecordGraphQLResolver should resolve queries and map fields correctly")
    void testGradeRecordResolver() {
        var resolver = new GradeRecordGraphQLResolver(gradeRecordService);
        var recordId = UUID.randomUUID().toString();
        var itemId = UUID.randomUUID().toString();
        var studentId = UUID.randomUUID().toString();
        var now = LocalDateTime.of(2026, 10, 1, 12, 0);
        var response = new GradeRecordResponse(recordId, itemId, studentId, BigDecimal.valueOf(95.0), now, 1);
        when(gradeRecordService.listAll(any(), any())).thenReturn(Flux.just(response));

        var result = resolver.listGradeRecords(new GradeRecordGraphQLResolver.GradeRecordFilterInput(itemId, studentId));
        StepVerifier.create(result)
                .expectNext(response)
                .verifyComplete();

        assertEquals(itemId, resolver.gradeItemId(response));
        assertEquals(studentId, resolver.studentId(response));
        assertEquals(BigDecimal.valueOf(95.0), resolver.score(response));
        assertEquals("2026-10-01T12:00", resolver.lastModifiedAt(response));
    }

    @Test
    @DisplayName("AttachmentGraphQLResolver should resolve queries and map fields correctly")
    void testAttachmentResolver() {
        var resolver = new AttachmentGraphQLResolver(attachmentService);
        var attId = UUID.randomUUID().toString();
        var recordId = UUID.randomUUID().toString();
        var now = LocalDateTime.of(2026, 10, 1, 12, 0);
        var response = new AttachmentResponse(attId, recordId, "report.pdf", "application/pdf", 1024, new byte[0], now);
        when(attachmentService.listAll(any())).thenReturn(Flux.just(response));

        var result = resolver.listAttachments(new AttachmentGraphQLResolver.AttachmentFilterInput(recordId));
        StepVerifier.create(result)
                .expectNext(response)
                .verifyComplete();

        assertEquals(recordId, resolver.gradeRecordId(response));
        assertEquals("report.pdf", resolver.fileName(response));
        assertEquals("application/pdf", resolver.mimeType(response));
        assertEquals(1024, resolver.fileSize(response));
        assertEquals("2026-10-01T12:00", resolver.uploadedAt(response));
    }
}
