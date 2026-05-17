package com.scoreassistant.application.service;

import com.scoreassistant.adapter.in.web.dto.GradeRecordDto.*;
import com.scoreassistant.adapter.out.persistence.GradeRecordRepository;
import com.scoreassistant.domain.exception.OptimisticLockingException;
import com.scoreassistant.domain.exception.ResourceNotFoundException;
import com.scoreassistant.domain.model.GradeRecordEntity;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class GradeRecordService {

    private final GradeRecordRepository gradeRecordRepository;

    public GradeRecordService(GradeRecordRepository gradeRecordRepository) {
        this.gradeRecordRepository = gradeRecordRepository;
    }

    @Transactional
    public Mono<GradeRecordResponse> create(GradeRecordRequest req) {
        var now = LocalDateTime.now();
        var entity = new GradeRecordEntity(
                UUID.randomUUID(),
                req.gradeItemId(), req.studentId(),
                req.score(), now, 1,
                now, now, null
        );
        return gradeRecordRepository.save(entity).map(this::toResponse);
    }

    public Mono<GradeRecordResponse> findById(UUID id) {
        return gradeRecordRepository.findById(id)
                .filter(e -> e.deletedAt() == null)
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("GradeRecord", id)))
                .map(this::toResponse);
    }

    @Transactional
    public Mono<GradeRecordResponse> update(UUID id, GradeRecordRequest req) {
        return gradeRecordRepository.findById(id)
                .filter(e -> e.deletedAt() == null)
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("GradeRecord", id)))
                .flatMap(e -> gradeRecordRepository.save(new GradeRecordEntity(
                        e.id(), req.gradeItemId(), req.studentId(), req.score(),
                        LocalDateTime.now(), e.version(), e.createdAt(), LocalDateTime.now(), null)))
                .onErrorMap(OptimisticLockingFailureException.class,
                        ex -> new OptimisticLockingException(0))
                .map(this::toResponse);
    }

    @Transactional
    public Mono<GradeRecordResponse> patch(UUID id, GradeRecordPatchRequest req) {
        return gradeRecordRepository.findById(id)
                .filter(e -> e.deletedAt() == null)
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("GradeRecord", id)))
                .flatMap(e -> gradeRecordRepository.save(new GradeRecordEntity(
                        e.id(), e.gradeItemId(), e.studentId(),
                        req.score() != null ? req.score() : e.score(),
                        LocalDateTime.now(), e.version(), e.createdAt(), LocalDateTime.now(), null)))
                .onErrorMap(OptimisticLockingFailureException.class,
                        ex -> new OptimisticLockingException(0))
                .map(this::toResponse);
    }

    @Transactional
    public Mono<Void> delete(UUID id) {
        return gradeRecordRepository.findById(id)
                .filter(e -> e.deletedAt() == null)
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("GradeRecord", id)))
                .flatMap(e -> gradeRecordRepository.save(new GradeRecordEntity(
                        e.id(), e.gradeItemId(), e.studentId(), e.score(),
                        e.lastModifiedAt(), e.version(), e.createdAt(), LocalDateTime.now(), LocalDateTime.now())))
                .then();
    }

    public Flux<GradeRecordResponse> listAll(UUID gradeItemId, UUID studentId) {
        if (gradeItemId != null) return gradeRecordRepository.findByGradeItemId(gradeItemId).map(this::toResponse);
        if (studentId != null) return gradeRecordRepository.findByStudentId(studentId).map(this::toResponse);
        return gradeRecordRepository.findAll()
                .filter(e -> e.deletedAt() == null)
                .map(this::toResponse);
    }

    private GradeRecordResponse toResponse(GradeRecordEntity e) {
        return new GradeRecordResponse(
                e.id().toString(), e.gradeItemId().toString(), e.studentId().toString(),
                e.score(), e.lastModifiedAt(), e.version()
        );
    }
}
