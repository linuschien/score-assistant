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

    public ClassService(ClassRepository classRepository, SemesterRepository semesterRepository) {
        this.classRepository = classRepository;
        this.semesterRepository = semesterRepository;
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
                            req.class_name(), req.passing_threshold() != null ? req.passing_threshold() : BigDecimal.valueOf(60.0),
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
                        req.class_name(), req.passing_threshold() != null ? req.passing_threshold() : existing.passingThreshold(),
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
                        req.class_name() != null ? req.class_name() : existing.className(),
                        req.passing_threshold() != null ? req.passing_threshold() : existing.passingThreshold(),
                        existing.createdAt(), LocalDateTime.now(), false, null)))
                .map(this::toResponse);
    }

    @Transactional
    public Mono<Void> delete(UUID id) {
        return classRepository.findById(id)
                .filter(e -> !e.deleted())
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("Class", id)))
                .flatMap(e -> classRepository.save(new ClassEntity(
                        e.id(), e.semesterId(), e.className(), e.passingThreshold(),
                        e.createdAt(), LocalDateTime.now(), true, LocalDateTime.now())))
                .then();
    }

    public Flux<ClassResponse> listAll(UUID semesterId, String className) {
        var probe = new ClassEntity(
                null,
                semesterId,
                (className != null && !className.isBlank()) ? className : null,
                null, null, null, false, null
        );
        var matcher = ExampleMatcher.matching()
                .withMatcher("className", ExampleMatcher.GenericPropertyMatchers.contains().ignoreCase())
                .withIgnoreNullValues();
        return classRepository.findAll(Example.of(probe, matcher)).map(this::toResponse);
    }

    private ClassResponse toResponse(ClassEntity e) {
        return new ClassResponse(e.id().toString(), e.semesterId().toString(), e.className(), e.passingThreshold());
    }
}
