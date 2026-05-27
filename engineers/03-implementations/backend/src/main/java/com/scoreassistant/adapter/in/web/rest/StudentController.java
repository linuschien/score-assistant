package com.scoreassistant.adapter.in.web.rest;

import com.scoreassistant.adapter.in.web.dto.OperationStatusDto;
import com.scoreassistant.adapter.in.web.dto.StudentDto.*;
import com.scoreassistant.application.service.StudentService;
import com.scoreassistant.domain.exception.ValidationException;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/semesters/{semesterId}/classes/{classId}")
public class StudentController {

    private final StudentService studentService;

    public StudentController(StudentService studentService) {
        this.studentService = studentService;
    }

    @PostMapping("/students")
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<StudentResponse> createStudent(
            @PathVariable UUID semesterId,
            @PathVariable UUID classId,
            @Valid @RequestBody StudentRequest req) {
        return studentService.create(classId, req);
    }

    @GetMapping("/students/{studentId}")
    public Mono<StudentResponse> getStudentById(
            @PathVariable UUID semesterId,
            @PathVariable UUID classId,
            @PathVariable UUID studentId) {
        return studentService.findById(studentId);
    }

    @PutMapping("/students/{studentId}")
    public Mono<StudentResponse> updateStudent(
            @PathVariable UUID semesterId,
            @PathVariable UUID classId,
            @PathVariable UUID studentId,
            @Valid @RequestBody StudentRequest req) {
        return studentService.update(studentId, req);
    }

    @PatchMapping("/students/{studentId}")
    public Mono<StudentResponse> patchStudent(
            @PathVariable UUID semesterId,
            @PathVariable UUID classId,
            @PathVariable UUID studentId,
            @RequestBody StudentPatchRequest req) {
        return studentService.patch(studentId, req);
    }

    @DeleteMapping("/students/{studentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> deleteStudent(
            @PathVariable UUID semesterId,
            @PathVariable UUID classId,
            @PathVariable UUID studentId) {
        return studentService.delete(studentId);
    }

    /**
     * Custom action: import students from multipart CSV.
     * Path: POST /semesters/{semesterId}/classes/{classId}/students:importStudents
     */
    @PostMapping("/students:importStudents")
    public Mono<OperationStatusDto> importStudents(
            @PathVariable UUID semesterId,
            @PathVariable UUID classId,
            @RequestParam(value = "conflictResolution", required = false, defaultValue = "SKIP") String conflictResolution,
            @RequestPart(value = "fileData", required = false) FilePart filePartData,
            @RequestPart(value = "file", required = false) FilePart filePartFile) {
        
        FilePart filePart = filePartData != null ? filePartData : filePartFile;
        if (filePart == null) {
            return Mono.error(new ValidationException("Missing CSV file part 'fileData' or 'file'"));
        }
        
        return filePart.content()
                .reduce(new byte[0], (acc, buf) -> {
                    byte[] bytes = new byte[buf.readableByteCount()];
                    buf.read(bytes);
                    byte[] combined = new byte[acc.length + bytes.length];
                    System.arraycopy(acc, 0, combined, 0, acc.length);
                    System.arraycopy(bytes, 0, combined, acc.length, bytes.length);
                    return combined;
                })
                .flatMap(bytes -> studentService.importStudents(classId, bytes, conflictResolution));
    }
}
