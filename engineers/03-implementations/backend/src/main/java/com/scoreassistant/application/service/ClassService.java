package com.scoreassistant.application.service;

import com.scoreassistant.adapter.in.web.dto.ClassDto.*;
import com.scoreassistant.adapter.out.persistence.ClassRepository;
import com.scoreassistant.adapter.out.persistence.SemesterRepository;
import com.scoreassistant.domain.exception.ResourceNotFoundException;
import com.scoreassistant.domain.model.ClassEntity;
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
        return semesterRepository.findById(semesterId)
                .filter(e -> e.deletedAt() == null)
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("Semester", semesterId)))
                .flatMap(sem -> {
                    var now = LocalDateTime.now();
                    var entity = new ClassEntity(
                            UUID.randomUUID(), semesterId,
                            req.class_name(), req.passing_threshold() != null ? req.passing_threshold() : BigDecimal.valueOf(60.0),
                            now, now, null
                    );
                    return classRepository.save(entity);
                })
                .map(this::toResponse);
    }

    public Mono<ClassResponse> findById(UUID id) {
        return classRepository.findById(id)
                .filter(e -> e.deletedAt() == null)
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("Class", id)))
                .map(this::toResponse);
    }

    @Transactional
    public Mono<ClassResponse> update(UUID id, ClassRequest req) {
        return classRepository.findById(id)
                .filter(e -> e.deletedAt() == null)
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("Class", id)))
                .flatMap(existing -> classRepository.save(new ClassEntity(
                        existing.id(), existing.semesterId(),
                        req.class_name(), req.passing_threshold() != null ? req.passing_threshold() : existing.passingThreshold(),
                        existing.createdAt(), LocalDateTime.now(), null)))
                .map(this::toResponse);
    }

    @Transactional
    public Mono<ClassResponse> patch(UUID id, ClassPatchRequest req) {
        return classRepository.findById(id)
                .filter(e -> e.deletedAt() == null)
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("Class", id)))
                .flatMap(existing -> classRepository.save(new ClassEntity(
                        existing.id(), existing.semesterId(),
                        req.class_name() != null ? req.class_name() : existing.className(),
                        req.passing_threshold() != null ? req.passing_threshold() : existing.passingThreshold(),
                        existing.createdAt(), LocalDateTime.now(), null)))
                .map(this::toResponse);
    }

    @Transactional
    public Mono<Void> delete(UUID id) {
        return classRepository.findById(id)
                .filter(e -> e.deletedAt() == null)
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("Class", id)))
                .flatMap(e -> classRepository.save(new ClassEntity(
                        e.id(), e.semesterId(), e.className(), e.passingThreshold(),
                        e.createdAt(), LocalDateTime.now(), LocalDateTime.now())))
                .then();
    }

    public Flux<ClassResponse> listBySemester(UUID semesterId, String className) {
        if (className != null && !className.isBlank()) {
            return classRepository.findBySemesterIdAndNameContaining(semesterId, className).map(this::toResponse);
        }
        return classRepository.findBySemesterId(semesterId).map(this::toResponse);
    }

    public Flux<ClassResponse> listAll(UUID semesterId, String className) {
        if (semesterId != null) {
            return listBySemester(semesterId, className);
        }
        return classRepository.findAllActive().map(this::toResponse);
    }

    private ClassResponse toResponse(ClassEntity e) {
        return new ClassResponse(e.id().toString(), e.className(), e.passingThreshold());
    }
}
