package com.scoreassistant.application.service;

import com.scoreassistant.adapter.in.web.dto.SemesterDto.*;
import com.scoreassistant.adapter.out.persistence.SemesterRepository;
import com.scoreassistant.domain.exception.ResourceNotFoundException;
import com.scoreassistant.domain.model.SemesterEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class SemesterService {

    private final SemesterRepository semesterRepository;

    public SemesterService(SemesterRepository semesterRepository) {
        this.semesterRepository = semesterRepository;
    }

    @Transactional
    public Mono<SemesterResponse> create(SemesterRequest req) {
        var now = LocalDateTime.now();
        var entity = new SemesterEntity(
                UUID.randomUUID(),
                req.semester_name(),
                req.start_date(),
                req.end_date(),
                now, now, null
        );
        return semesterRepository.save(entity).map(this::toResponse);
    }

    public Mono<SemesterResponse> findById(UUID id) {
        return semesterRepository.findById(id)
                .filter(e -> e.deletedAt() == null)
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("Semester", id)))
                .map(this::toResponse);
    }

    @Transactional
    public Mono<SemesterResponse> update(UUID id, SemesterRequest req) {
        return semesterRepository.findById(id)
                .filter(e -> e.deletedAt() == null)
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("Semester", id)))
                .flatMap(existing -> {
                    var updated = new SemesterEntity(
                            existing.id(),
                            req.semester_name(),
                            req.start_date(),
                            req.end_date(),
                            existing.createdAt(),
                            LocalDateTime.now(),
                            null
                    );
                    return semesterRepository.save(updated);
                })
                .map(this::toResponse);
    }

    @Transactional
    public Mono<SemesterResponse> patch(UUID id, SemesterPatchRequest req) {
        return semesterRepository.findById(id)
                .filter(e -> e.deletedAt() == null)
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("Semester", id)))
                .flatMap(existing -> {
                    var updated = new SemesterEntity(
                            existing.id(),
                            req.semester_name() != null ? req.semester_name() : existing.semesterName(),
                            req.start_date() != null ? req.start_date() : existing.startDate(),
                            req.end_date() != null ? req.end_date() : existing.endDate(),
                            existing.createdAt(),
                            LocalDateTime.now(),
                            null
                    );
                    return semesterRepository.save(updated);
                })
                .map(this::toResponse);
    }

    @Transactional
    public Mono<Void> delete(UUID id) {
        return semesterRepository.findById(id)
                .filter(e -> e.deletedAt() == null)
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("Semester", id)))
                .flatMap(existing -> {
                    var soft = new SemesterEntity(
                            existing.id(),
                            existing.semesterName(),
                            existing.startDate(),
                            existing.endDate(),
                            existing.createdAt(),
                            LocalDateTime.now(),
                            LocalDateTime.now()
                    );
                    return semesterRepository.save(soft);
                })
                .then();
    }

    public Flux<SemesterResponse> listAll(String semesterName) {
        if (semesterName != null && !semesterName.isBlank()) {
            return semesterRepository.findByNameContaining(semesterName).map(this::toResponse);
        }
        return semesterRepository.findAllActive().map(this::toResponse);
    }

    private SemesterResponse toResponse(SemesterEntity e) {
        return new SemesterResponse(e.id().toString(), e.semesterName(), e.startDate(), e.endDate());
    }
}
