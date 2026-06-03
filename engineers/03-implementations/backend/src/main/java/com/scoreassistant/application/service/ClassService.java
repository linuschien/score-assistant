package com.scoreassistant.application.service;

import com.scoreassistant.adapter.in.web.dto.ClassDto.*;
import com.scoreassistant.adapter.out.persistence.ClassRepository;
import com.scoreassistant.adapter.out.persistence.SemesterRepository;
import com.scoreassistant.domain.exception.ResourceNotFoundException;
import com.scoreassistant.domain.model.ClassEntity;
import com.scoreassistant.domain.model.SemesterEntity;
import org.springframework.data.domain.Example;
import org.springframework.data.domain.ExampleMatcher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class ClassService {

    private final ClassRepository classRepository;
    private final SemesterRepository semesterRepository;
    private final StudentService studentService;
    private final GradeItemService gradeItemService;

    public ClassService(ClassRepository classRepository,
                        SemesterRepository semesterRepository,
                        StudentService studentService,
                        GradeItemService gradeItemService) {
        this.classRepository = classRepository;
        this.semesterRepository = semesterRepository;
        this.studentService = studentService;
        this.gradeItemService = gradeItemService;
    }

    @Transactional
    public Mono<ClassResponse> create(UUID semesterId, ClassRequest req) {
        var semesterProbe = new SemesterEntity(semesterId, null, null, null, null, null, false, null);
        return semesterRepository.exists(Example.of(semesterProbe))
                .filter(exists -> exists)
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("Semester", semesterId)))
                .flatMap(exists -> {
                    var now = LocalDateTime.now();
                    var entity = new ClassEntity(
                            null, semesterId,
                            req.className(), req.classGroup(), req.passingThreshold() != null ? req.passingThreshold() : BigDecimal.valueOf(60.0),
                            now, now, false, null
                    );
                    return classRepository.save(entity);
                })
                .map(this::toResponse);
    }

    public Mono<ClassResponse> findById(UUID id) {
        return classRepository.findById(id)
                .filter(e -> !e.deleted())
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("Class", id)))
                .map(this::toResponse);
    }

    @Transactional
    public Mono<ClassResponse> update(UUID id, ClassRequest req) {
        return classRepository.findById(id)
                .filter(e -> !e.deleted())
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("Class", id)))
                .flatMap(existing -> classRepository.save(new ClassEntity(
                        existing.id(), existing.semesterId(),
                        req.className(), req.classGroup(), req.passingThreshold() != null ? req.passingThreshold() : existing.passingThreshold(),
                        existing.createdAt(), LocalDateTime.now(), false, null)))
                .map(this::toResponse);
    }

    @Transactional
    public Mono<ClassResponse> patch(UUID id, ClassPatchRequest req) {
        return classRepository.findById(id)
                .filter(e -> !e.deleted())
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("Class", id)))
                .flatMap(existing -> classRepository.save(new ClassEntity(
                        existing.id(), existing.semesterId(),
                        req.className() != null ? req.className() : existing.className(),
                        req.classGroup() != null ? req.classGroup() : existing.classGroup(),
                        req.passingThreshold() != null ? req.passingThreshold() : existing.passingThreshold(),
                        existing.createdAt(), LocalDateTime.now(), false, null)))
                .map(this::toResponse);
    }

    @Transactional
    public Mono<Void> delete(UUID id) {
        return classRepository.findById(id)
                .filter(e -> !e.deleted())
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("Class", id)))
                .flatMap(e -> classRepository.save(new ClassEntity(
                        e.id(), e.semesterId(), e.className(), e.classGroup(), e.passingThreshold(),
                        e.createdAt(), LocalDateTime.now(), true, LocalDateTime.now())))
                .flatMap(saved -> studentService.deleteByClassId(saved.id())
                        .then(gradeItemService.deleteByClassId(saved.id())))
                .then();
    }

    @Transactional
    public Mono<Void> deleteBySemesterId(UUID semesterId) {
        var probe = new ClassEntity(null, semesterId, null, null, null, null, null, false, null);
        var matcher = ExampleMatcher.matching().withIgnoreNullValues();
        return classRepository.findAll(Example.of(probe, matcher))
                .flatMap(c -> delete(c.id()))
                .then();
    }

    public Flux<ClassResponse> listAll(UUID semesterId, String className, String classGroup) {
        var probe = new ClassEntity(
                null,
                semesterId,
                (className != null && !className.isBlank()) ? className : null,
                (classGroup != null && !classGroup.isBlank()) ? classGroup : null,
                null, null, null, false, null
        );
        var matcher = ExampleMatcher.matching()
                .withMatcher("className", ExampleMatcher.GenericPropertyMatchers.contains().ignoreCase())
                .withIgnoreNullValues();
        return classRepository.findAll(Example.of(probe, matcher)).map(this::toResponse);
    }

    private ClassResponse toResponse(ClassEntity e) {
        return new ClassResponse(e.id().toString(), e.semesterId().toString(), e.className(), e.classGroup(), e.passingThreshold());
    }
}
