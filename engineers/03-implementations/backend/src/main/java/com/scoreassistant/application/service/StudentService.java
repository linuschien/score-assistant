package com.scoreassistant.application.service;

import com.scoreassistant.adapter.in.web.dto.OperationStatusDto;
import com.scoreassistant.adapter.in.web.dto.StudentDto.*;
import com.scoreassistant.adapter.out.persistence.ClassRepository;
import com.scoreassistant.adapter.out.persistence.StudentRepository;
import com.scoreassistant.domain.exception.ResourceNotFoundException;
import com.scoreassistant.domain.model.ClassEntity;
import com.scoreassistant.domain.model.StudentEntity;
import org.springframework.data.domain.Example;
import org.springframework.data.domain.ExampleMatcher;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class StudentService {

    private final StudentRepository studentRepository;
    private final ClassRepository classRepository;

    public StudentService(StudentRepository studentRepository, ClassRepository classRepository) {
        this.studentRepository = studentRepository;
        this.classRepository = classRepository;
    }

    @Transactional
    public Mono<StudentResponse> create(UUID classId, StudentRequest req) {
        var classProbe = new ClassEntity(classId, null, null, null, null, null, false, null);
        return classRepository.exists(Example.of(classProbe))
                .filter(exists -> exists)
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("Class", classId)))
                .flatMap(exists -> {
                    var now = LocalDateTime.now();
                    var entity = new StudentEntity(
                            null, classId,
                            req.student_number(), req.student_name(),
                            now, now, false, null
                    );
                    return studentRepository.save(entity);
                })
                .map(this::toResponse);
    }

    public Mono<StudentResponse> findById(UUID id) {
        return studentRepository.findById(id)
                .filter(e -> !e.deleted())
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("Student", id)))
                .map(this::toResponse);
    }

    @Transactional
    public Mono<StudentResponse> update(UUID id, StudentRequest req) {
        return studentRepository.findById(id)
                .filter(e -> !e.deleted())
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("Student", id)))
                .flatMap(e -> studentRepository.save(new StudentEntity(
                        e.id(), e.classId(),
                        req.student_number(), req.student_name(),
                        e.createdAt(), LocalDateTime.now(), false, null)))
                .map(this::toResponse);
    }

    @Transactional
    public Mono<StudentResponse> patch(UUID id, StudentPatchRequest req) {
        return studentRepository.findById(id)
                .filter(e -> !e.deleted())
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("Student", id)))
                .flatMap(e -> studentRepository.save(new StudentEntity(
                        e.id(), e.classId(),
                        req.student_number() != null ? req.student_number() : e.studentNumber(),
                        req.student_name() != null ? req.student_name() : e.studentName(),
                        e.createdAt(), LocalDateTime.now(), false, null)))
                .map(this::toResponse);
    }

    @Transactional
    public Mono<Void> delete(UUID id) {
        return studentRepository.findById(id)
                .filter(e -> !e.deleted())
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("Student", id)))
                .flatMap(e -> studentRepository.save(new StudentEntity(
                        e.id(), e.classId(), e.studentNumber(), e.studentName(),
                        e.createdAt(), LocalDateTime.now(), true, LocalDateTime.now())))
                .then();
    }

    public Flux<StudentResponse> listAll(UUID classId) {
        var probe = new StudentEntity(
                null,
                classId,
                0, null, null, null, false, null
        );
        var matcher = ExampleMatcher.matching()
                .withIgnorePaths("studentNumber")
                .withIgnoreNullValues();
        return studentRepository.findAll(Example.of(probe, matcher), Sort.by("studentNumber")).map(this::toResponse);
    }

    /**
     * Batch import students from CSV lines.
     * Each line: student_number,student_name
     */
    @Transactional
    public Mono<OperationStatusDto> importStudents(UUID classId, byte[] csvBytes) {
        var classProbe = new ClassEntity(classId, null, null, null, null, null, false, null);
        return classRepository.exists(Example.of(classProbe))
                .filter(exists -> exists)
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("Class", classId)))
                .flatMapMany(exists -> {
                    var lines = new String(csvBytes).lines()
                             .filter(l -> !l.isBlank() && !l.startsWith("student_number"))
                             .toList();
                     return Flux.fromIterable(lines)
                             .flatMap(line -> {
                                 var parts = line.split(",");
                                 if (parts.length < 2) return Flux.empty();
                                 var now = LocalDateTime.now();
                                 var entity = new StudentEntity(
                                         null, classId,
                                         Integer.parseInt(parts[0].trim()),
                                         parts[1].trim(),
                                         now, now, false, null
                                 );
                                 return studentRepository.save(entity);
                             });
                 })
                 .count()
                 .map(count -> new OperationStatusDto(true, "Import completed", count.intValue()));
     }

    private StudentResponse toResponse(StudentEntity e) {
        return new StudentResponse(e.id().toString(), e.classId().toString(), e.studentNumber(), e.studentName());
    }
}
