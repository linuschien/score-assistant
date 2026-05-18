package com.scoreassistant.application.service;

import com.scoreassistant.adapter.in.web.dto.*;
import com.scoreassistant.adapter.in.web.dto.GradeItemDto.*;
import com.scoreassistant.adapter.out.persistence.*;
import com.scoreassistant.domain.exception.ResourceNotFoundException;
import com.scoreassistant.domain.model.*;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Example;
import org.springframework.data.domain.ExampleMatcher;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class GradeItemService {

    private final GradeItemRepository gradeItemRepository;
    private final ClassRepository classRepository;
    private final StudentRepository studentRepository;
    private final GradeRecordRepository gradeRecordRepository;

    public GradeItemService(
            GradeItemRepository gradeItemRepository,
            ClassRepository classRepository,
            StudentRepository studentRepository,
            GradeRecordRepository gradeRecordRepository) {
        this.gradeItemRepository = gradeItemRepository;
        this.classRepository = classRepository;
        this.studentRepository = studentRepository;
        this.gradeRecordRepository = gradeRecordRepository;
    }

    @Transactional
    public Mono<GradeItemResponse> create(UUID classId, GradeItemRequest req) {
        var classProbe = new ClassEntity(classId, null, null, null, null, null, false, null);
        return classRepository.exists(Example.of(classProbe))
                .filter(exists -> exists)
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("Class", classId)))
                .flatMap(exists -> {
                    var now = LocalDateTime.now();
                    var entity = new GradeItemEntity(
                            null, classId,
                            req.item_name(), req.item_type(),
                            req.item_date(), req.item_description(),
                            req.max_score(), req.weight(),
                            now, now, false, null
                    );
                    return gradeItemRepository.save(entity);
                })
                .map(this::toResponse);
    }

    public Mono<GradeItemResponse> findById(UUID id) {
        return gradeItemRepository.findById(id)
                .filter(e -> !e.deleted())
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("GradeItem", id)))
                .map(this::toResponse);
    }

    @Transactional
    public Mono<GradeItemResponse> update(UUID id, GradeItemRequest req) {
        return gradeItemRepository.findById(id)
                .filter(e -> !e.deleted())
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("GradeItem", id)))
                .flatMap(e -> gradeItemRepository.save(new GradeItemEntity(
                        e.id(), e.classId(),
                        req.item_name(), req.item_type(),
                        req.item_date(), req.item_description(),
                        req.max_score(), req.weight(),
                        e.createdAt(), LocalDateTime.now(), false, null)))
                .map(this::toResponse);
    }

    @Transactional
    public Mono<GradeItemResponse> patch(UUID id, GradeItemPatchRequest req) {
        return gradeItemRepository.findById(id)
                .filter(e -> !e.deleted())
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("GradeItem", id)))
                .flatMap(e -> gradeItemRepository.save(new GradeItemEntity(
                        e.id(), e.classId(),
                        req.item_name() != null ? req.item_name() : e.itemName(),
                        req.item_type() != null ? req.item_type() : e.itemType(),
                        req.item_date() != null ? req.item_date() : e.itemDate(),
                        req.item_description() != null ? req.item_description() : e.itemDescription(),
                        req.max_score() != null ? req.max_score() : e.maxScore(),
                        req.weight() != null ? req.weight() : e.weight(),
                        e.createdAt(), LocalDateTime.now(), false, null)))
                .map(this::toResponse);
    }

    @Transactional
    public Mono<Void> delete(UUID id) {
        return gradeItemRepository.findById(id)
                .filter(e -> !e.deleted())
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("GradeItem", id)))
                .flatMap(e -> gradeItemRepository.save(new GradeItemEntity(
                        e.id(), e.classId(), e.itemName(), e.itemType(),
                        e.itemDate(), e.itemDescription(), e.maxScore(), e.weight(),
                        e.createdAt(), LocalDateTime.now(), true, LocalDateTime.now())))
                .then();
    }

    public Flux<GradeItemResponse> listAll(UUID classId, String itemType) {
        var probe = new GradeItemEntity(
                null,
                classId,
                null,
                (itemType != null && !itemType.isBlank()) ? itemType : null,
                null, null, null, null, null, null, false, null
        );
        var matcher = ExampleMatcher.matching().withIgnoreNullValues();
        return gradeItemRepository.findAll(Example.of(probe, matcher)).map(this::toResponse);
    }

    // ── Custom Actions ────────────────────────────────────────────

    public Mono<OperationStatusDto> exportGrades(UUID classId, ExportGradesRequestDto req) {
        var itemProbe = new GradeItemEntity(null, classId, null, null, null, null, null, null, null, null, false, null);
        var studentProbe = new StudentEntity(null, classId, 0, null, null, null, false, null);
        var studentMatcher = ExampleMatcher.matching().withIgnorePaths("studentNumber").withIgnoreNullValues();

        return gradeItemRepository.findAll(Example.of(itemProbe, ExampleMatcher.matching().withIgnoreNullValues()))
                .collectList()
                .flatMap(items -> studentRepository.findAll(Example.of(studentProbe, studentMatcher), Sort.by("studentNumber")).collectList()
                        .flatMap(students -> gradeRecordRepository.findByClassId(classId).collectList()
                                .flatMap(records -> Mono.fromCallable(() -> {
                                    try (var wb = new XSSFWorkbook()) {
                                        var sheet = wb.createSheet("Grades");
                                        var header = sheet.createRow(0);
                                        header.createCell(0).setCellValue("Student Number");
                                        header.createCell(1).setCellValue("Student Name");
                                        for (int i = 0; i < items.size(); i++) {
                                            header.createCell(i + 2).setCellValue(items.get(i).itemName());
                                        }
                                        for (int r = 0; r < students.size(); r++) {
                                            var student = students.get(r);
                                            var row = sheet.createRow(r + 1);
                                            row.createCell(0).setCellValue(student.studentNumber());
                                            row.createCell(1).setCellValue(student.studentName());
                                            for (int c = 0; c < items.size(); c++) {
                                                var item = items.get(c);
                                                var score = records.stream()
                                                        .filter(gr -> gr.gradeItemId().equals(item.id()) && gr.studentId().equals(student.id()))
                                                        .findFirst()
                                                        .map(gr -> gr.score() != null ? gr.score().doubleValue() : 0.0)
                                                        .orElse(0.0);
                                                row.createCell(c + 2).setCellValue(score);
                                            }
                                        }
                                        var out = new ByteArrayOutputStream();
                                        wb.write(out);
                                        return students.size();
                                    }
                                }).subscribeOn(Schedulers.boundedElastic()))
                        ))
                .map(count -> new OperationStatusDto(true, "Export completed", count));
    }

    public Mono<OperationStatusDto> exportAttendance(UUID classId, ExportAttendanceRequestDto req) {
        var itemProbe = new GradeItemEntity(null, classId, null, "ATTENDANCE", null, null, null, null, null, null, false, null);
        var studentProbe = new StudentEntity(null, classId, 0, null, null, null, false, null);
        var studentMatcher = ExampleMatcher.matching().withIgnorePaths("studentNumber").withIgnoreNullValues();

        return gradeItemRepository.findAll(Example.of(itemProbe, ExampleMatcher.matching().withIgnoreNullValues()))
                .collectList()
                .flatMap(items -> studentRepository.findAll(Example.of(studentProbe, studentMatcher)).collectList()
                        .map(students -> new OperationStatusDto(true, "Attendance export completed", students.size()))
                );
    }

    public Mono<OperationStatusDto> calculateWeightedScores(UUID classId, CalculateWeightedScoresRequestDto req) {
        var itemProbe = new GradeItemEntity(null, classId, null, null, null, null, null, null, null, null, false, null);
        var studentProbe = new StudentEntity(null, classId, 0, null, null, null, false, null);
        var studentMatcher = ExampleMatcher.matching().withIgnorePaths("studentNumber").withIgnoreNullValues();

        return gradeItemRepository.findAll(Example.of(itemProbe, ExampleMatcher.matching().withIgnoreNullValues()))
                .collectList()
                .flatMap(items -> studentRepository.findAll(Example.of(studentProbe, studentMatcher)).collectList()
                        .flatMap(students -> gradeRecordRepository.findByClassId(classId).collectList()
                                .map(records -> {
                                    var count = new AtomicInteger(0);
                                    students.forEach(student -> {
                                        var weighted = items.stream()
                                                .mapToDouble(item -> {
                                                    var score = records.stream()
                                                            .filter(gr -> gr.gradeItemId().equals(item.id()) && gr.studentId().equals(student.id()))
                                                            .findFirst()
                                                            .map(gr -> gr.score() != null ? gr.score().doubleValue() : 0.0)
                                                            .orElse(0.0);
                                                    return score * item.weight().doubleValue();
                                                })
                                                .sum();
                                        count.incrementAndGet();
                                    });
                                    return new OperationStatusDto(true, "Weighted scores calculated", count.get());
                                })
                        )
                );
    }

    private GradeItemResponse toResponse(GradeItemEntity e) {
        return new GradeItemResponse(
                e.id().toString(), e.itemName(), e.itemType(),
                e.itemDate(), e.itemDescription(), e.maxScore(), e.weight()
        );
    }
}
