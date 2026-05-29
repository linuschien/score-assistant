package com.scoreassistant.application.service;

import com.scoreassistant.adapter.in.web.dto.SemesterDto.*;
import com.scoreassistant.adapter.out.persistence.SemesterRepository;
import com.scoreassistant.domain.exception.ResourceNotFoundException;
import com.scoreassistant.domain.model.SemesterEntity;
import org.springframework.data.domain.Example;
import org.springframework.data.domain.ExampleMatcher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class SemesterService {

    private final SemesterRepository semesterRepository;
    private final ClassService classService;

    public SemesterService(SemesterRepository semesterRepository, ClassService classService) {
        this.semesterRepository = semesterRepository;
        this.classService = classService;
    }

    @Transactional
    public Mono<SemesterResponse> create(SemesterRequest req) {
        var now = LocalDateTime.now();
        var entity = new SemesterEntity(
                null,
                req.semesterName(),
                req.startDate(),
                req.endDate(),
                now, now, false, null
        );
        return semesterRepository.save(entity).map(this::toResponse);
    }

    public Mono<SemesterResponse> findById(UUID id) {
        return semesterRepository.findById(id)
                .filter(e -> !e.deleted())
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("Semester", id)))
                .map(this::toResponse);
    }

    @Transactional
    public Mono<SemesterResponse> update(UUID id, SemesterRequest req) {
        return semesterRepository.findById(id)
                .filter(e -> !e.deleted())
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("Semester", id)))
                .flatMap(existing -> {
                    var updated = new SemesterEntity(
                            existing.id(),
                            req.semesterName(),
                            req.startDate(),
                            req.endDate(),
                            existing.createdAt(),
                            LocalDateTime.now(),
                            false,
                            null
                    );
                    return semesterRepository.save(updated);
                })
                .map(this::toResponse);
    }

    @Transactional
    public Mono<SemesterResponse> patch(UUID id, SemesterPatchRequest req) {
        return semesterRepository.findById(id)
                .filter(e -> !e.deleted())
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("Semester", id)))
                .flatMap(existing -> {
                    var updated = new SemesterEntity(
                            existing.id(),
                            req.semesterName() != null ? req.semesterName() : existing.semesterName(),
                            req.startDate() != null ? req.startDate() : existing.startDate(),
                            req.endDate() != null ? req.endDate() : existing.endDate(),
                            existing.createdAt(),
                            LocalDateTime.now(),
                            false,
                            null
                    );
                    return semesterRepository.save(updated);
                })
                .map(this::toResponse);
    }

    @Transactional
    public Mono<Void> delete(UUID id) {
        return semesterRepository.findById(id)
                .filter(e -> !e.deleted())
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("Semester", id)))
                .flatMap(existing -> {
                    var soft = new SemesterEntity(
                            existing.id(),
                            existing.semesterName(),
                            existing.startDate(),
                            existing.endDate(),
                            existing.createdAt(),
                            LocalDateTime.now(),
                            true,
                            LocalDateTime.now()
                     );
                     return semesterRepository.save(soft);
                })
                .flatMap(saved -> classService.deleteBySemesterId(saved.id()))
                .then();
    }

    public Flux<SemesterResponse> listAll(String semesterName) {
        var probe = new SemesterEntity(
                null,
                (semesterName != null && !semesterName.isBlank()) ? semesterName : null,
                null, null, null, null, false, null
        );
        var matcher = ExampleMatcher.matching()
                .withMatcher("semesterName", ExampleMatcher.GenericPropertyMatchers.contains().ignoreCase())
                .withIgnoreNullValues();
        return semesterRepository.findAll(Example.of(probe, matcher)).map(this::toResponse);
    }

    private SemesterResponse toResponse(SemesterEntity e) {
        return new SemesterResponse(e.id().toString(), e.semesterName(), e.startDate(), e.endDate());
    }
}
