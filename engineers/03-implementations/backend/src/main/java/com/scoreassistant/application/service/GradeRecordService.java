package com.scoreassistant.application.service;

import com.scoreassistant.adapter.in.web.dto.GradeRecordDto.*;
import com.scoreassistant.adapter.out.persistence.GradeItemRepository;
import com.scoreassistant.adapter.out.persistence.GradeRecordRepository;
import com.scoreassistant.adapter.out.persistence.StudentRepository;
import com.scoreassistant.domain.exception.OptimisticLockingException;
import com.scoreassistant.domain.exception.ResourceNotFoundException;
import com.scoreassistant.domain.model.GradeItemEntity;
import com.scoreassistant.domain.model.GradeRecordEntity;
import com.scoreassistant.domain.model.StudentEntity;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.data.domain.Example;
import org.springframework.data.domain.ExampleMatcher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class GradeRecordService {

    private final GradeRecordRepository gradeRecordRepository;
    private final GradeItemRepository gradeItemRepository;
    private final StudentRepository studentRepository;
    private final AttachmentService attachmentService;

    public GradeRecordService(GradeRecordRepository gradeRecordRepository,
                              GradeItemRepository gradeItemRepository,
                              StudentRepository studentRepository,
                              AttachmentService attachmentService) {
        this.gradeRecordRepository = gradeRecordRepository;
        this.gradeItemRepository = gradeItemRepository;
        this.studentRepository = studentRepository;
        this.attachmentService = attachmentService;
    }

    private Mono<Void> validateParentExistence(UUID gradeItemId, UUID studentId) {
        var itemProbe = new GradeItemEntity(gradeItemId, null, null, null, null, null, null, null, null, null, false, null);
        var studentProbe = new StudentEntity(studentId, null, null, 0, null, null, null, null, false, null);
        var studentMatcher = ExampleMatcher.matching().withIgnorePaths("studentNumber").withIgnoreNullValues();

        return Mono.zip(
                gradeItemRepository.exists(Example.of(itemProbe))
                        .filter(exists -> exists)
                        .switchIfEmpty(Mono.error(ResourceNotFoundException.of("GradeItem", gradeItemId))),
                studentRepository.exists(Example.of(studentProbe, studentMatcher))
                        .filter(exists -> exists)
                        .switchIfEmpty(Mono.error(ResourceNotFoundException.of("Student", studentId)))
        ).then();
    }

    @Transactional
    public Mono<GradeRecordResponse> create(GradeRecordRequest req) {
        return validateParentExistence(req.gradeItemId(), req.studentId())
                .then(Mono.defer(() -> {
                    var now = LocalDateTime.now();
                    var entity = new GradeRecordEntity(
                            null,
                            req.gradeItemId(), req.studentId(),
                            req.score(), now, 0,
                            now, now, false, null
                    );
                    return gradeRecordRepository.save(entity);
                }))
                .map(this::toResponse);
    }

    public Mono<GradeRecordResponse> findById(UUID id) {
        return gradeRecordRepository.findById(id)
                .filter(e -> !e.deleted())
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("GradeRecord", id)))
                .map(this::toResponse);
    }

    @Transactional
    public Mono<GradeRecordResponse> update(UUID id, GradeRecordRequest req) {
        return gradeRecordRepository.findById(id)
                .filter(e -> !e.deleted())
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("GradeRecord", id)))
                .flatMap(e -> validateParentExistence(req.gradeItemId(), req.studentId())
                        .then(Mono.defer(() -> gradeRecordRepository.save(new GradeRecordEntity(
                                e.id(), req.gradeItemId(), req.studentId(), req.score(),
                                LocalDateTime.now(), e.version(), e.createdAt(), LocalDateTime.now(), false, null)))))
                .onErrorMap(OptimisticLockingFailureException.class,
                        ex -> new OptimisticLockingException(0))
                .map(this::toResponse);
    }

    @Transactional
    public Mono<GradeRecordResponse> patch(UUID id, GradeRecordPatchRequest req) {
        return gradeRecordRepository.findById(id)
                .filter(e -> !e.deleted())
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("GradeRecord", id)))
                .flatMap(e -> gradeRecordRepository.save(new GradeRecordEntity(
                        e.id(), e.gradeItemId(), e.studentId(),
                        req.score() != null ? req.score() : e.score(),
                        LocalDateTime.now(), e.version(), e.createdAt(), LocalDateTime.now(), false, null)))
                .onErrorMap(OptimisticLockingFailureException.class,
                        ex -> new OptimisticLockingException(0))
                .map(this::toResponse);
    }

    @Transactional
    public Mono<Void> delete(UUID id) {
        return gradeRecordRepository.findById(id)
                .filter(e -> !e.deleted())
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("GradeRecord", id)))
                .flatMap(e -> gradeRecordRepository.save(new GradeRecordEntity(
                        e.id(), e.gradeItemId(), e.studentId(), e.score(),
                        e.lastModifiedAt(), e.version(), e.createdAt(), LocalDateTime.now(), true, LocalDateTime.now())))
                .flatMap(saved -> attachmentService.deleteByGradeRecordId(saved.id()))
                .then();
    }

    @Transactional
    public Mono<Void> deleteByStudentId(UUID studentId) {
        var probe = new GradeRecordEntity(null, null, studentId, null, null, 0, null, null, false, null);
        var matcher = ExampleMatcher.matching().withIgnorePaths("version").withIgnoreNullValues();
        return gradeRecordRepository.findAll(Example.of(probe, matcher))
                .flatMap(gr -> delete(gr.id()))
                .then();
    }

    @Transactional
    public Mono<Void> deleteByGradeItemId(UUID gradeItemId) {
        var probe = new GradeRecordEntity(null, gradeItemId, null, null, null, 0, null, null, false, null);
        var matcher = ExampleMatcher.matching().withIgnorePaths("version").withIgnoreNullValues();
        return gradeRecordRepository.findAll(Example.of(probe, matcher))
                .flatMap(gr -> delete(gr.id()))
                .then();
    }

    public Flux<GradeRecordResponse> listAll(UUID gradeItemId, UUID studentId) {
        var probe = new GradeRecordEntity(
                null,
                gradeItemId,
                studentId,
                null, null, 0, null, null, false, null
        );
        var matcher = ExampleMatcher.matching()
                .withIgnorePaths("version")
                .withIgnoreNullValues();
        return gradeRecordRepository.findAll(Example.of(probe, matcher)).map(this::toResponse);
    }

    @Transactional
    public Flux<GradeRecordResponse> batchUpsert(java.util.List<GradeRecordRequest> requests) {
        return Flux.fromIterable(requests)
                .flatMap(req -> validateParentExistence(req.gradeItemId(), req.studentId()).thenReturn(req))
                .flatMap(req -> {
                    var probe = new GradeRecordEntity(null, req.gradeItemId(), req.studentId(), null, null, 0, null, null, false, null);
                    var matcher = ExampleMatcher.matching().withIgnorePaths("version").withIgnoreNullValues();
                    return gradeRecordRepository.findOne(Example.of(probe, matcher))
                            .flatMap(existing -> {
                                var updated = new GradeRecordEntity(
                                        existing.id(), req.gradeItemId(), req.studentId(), req.score(),
                                        LocalDateTime.now(), existing.version(), existing.createdAt(), LocalDateTime.now(), false, null);
                                return gradeRecordRepository.save(updated);
                            })
                            .switchIfEmpty(Mono.defer(() -> {
                                var now = LocalDateTime.now();
                                var newEntity = new GradeRecordEntity(
                                        null, req.gradeItemId(), req.studentId(), req.score(),
                                        now, 0, now, now, false, null);
                                return gradeRecordRepository.save(newEntity);
                            }));
                })
                .map(this::toResponse);
    }

    private GradeRecordResponse toResponse(GradeRecordEntity e) {
        return new GradeRecordResponse(
                e.id().toString(), e.gradeItemId().toString(), e.studentId().toString(),
                e.score(), e.lastModifiedAt(), e.version()
        );
    }
}
