package com.scoreassistant.application.service;

import com.scoreassistant.adapter.in.web.dto.*;
import com.scoreassistant.adapter.in.web.dto.GradeItemDto.*;
import com.scoreassistant.adapter.out.persistence.*;
import com.scoreassistant.domain.exception.ResourceNotFoundException;
import com.scoreassistant.domain.exception.ValidationException;
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
import java.util.Base64;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class GradeItemService {

    private final GradeItemRepository gradeItemRepository;
    private final ClassRepository classRepository;
    private final StudentRepository studentRepository;
    private final GradeRecordRepository gradeRecordRepository;
    private final GradeRecordService gradeRecordService;

    public GradeItemService(
            GradeItemRepository gradeItemRepository,
            ClassRepository classRepository,
            StudentRepository studentRepository,
            GradeRecordRepository gradeRecordRepository,
            GradeRecordService gradeRecordService) {
        this.gradeItemRepository = gradeItemRepository;
        this.classRepository = classRepository;
        this.studentRepository = studentRepository;
        this.gradeRecordRepository = gradeRecordRepository;
        this.gradeRecordService = gradeRecordService;
    }

    @Transactional
    public Mono<GradeItemResponse> create(UUID classId, GradeItemRequest req) {
        if (req.maxScore() != null && req.maxScore().doubleValue() < 0) {
            return Mono.error(new ValidationException("Max score must not be negative"));
        }
        if (req.weight() != null && (req.weight().doubleValue() < 0.0 || req.weight().doubleValue() > 1.0)) {
            return Mono.error(new ValidationException("Weight must be between 0.0 and 1.0"));
        }
        if (req.itemName() == null || req.itemName().isBlank()) {
            return Mono.error(new ValidationException("Item name must not be empty"));
        }

        var classProbe = new ClassEntity(classId, null, null, null, null, null, null, false, null);
        return classRepository.exists(Example.of(classProbe))
                .filter(exists -> exists)
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("Class", classId)))
                .flatMap(exists -> {
                    var nameProbe = new GradeItemEntity(null, classId, req.itemName(), null, null, null, null, null, null, null, false, null);
                    return gradeItemRepository.exists(Example.of(nameProbe))
                            .flatMap(existsName -> {
                                if (existsName) {
                                    return Mono.error(new ValidationException("Grade item name already exists in this class"));
                                }
                                var now = LocalDateTime.now();
                                var entity = new GradeItemEntity(
                                        null, classId,
                                        req.itemName(), req.itemType(),
                                        req.itemDate(), req.itemDescription(),
                                        req.maxScore(), req.weight(),
                                        now, now, false, null
                                );
                                return gradeItemRepository.save(entity);
                            });
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
        if (req.maxScore() != null && req.maxScore().doubleValue() < 0) {
            return Mono.error(new ValidationException("Max score must not be negative"));
        }
        if (req.weight() != null && (req.weight().doubleValue() < 0.0 || req.weight().doubleValue() > 1.0)) {
            return Mono.error(new ValidationException("Weight must be between 0.0 and 1.0"));
        }
        if (req.itemName() == null || req.itemName().isBlank()) {
            return Mono.error(new ValidationException("Item name must not be empty"));
        }

        return gradeItemRepository.findById(id)
                .filter(e -> !e.deleted())
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("GradeItem", id)))
                .flatMap(e -> {
                    var nameProbe = new GradeItemEntity(null, e.classId(), req.itemName(), null, null, null, null, null, null, null, false, null);
                    return gradeItemRepository.findOne(Example.of(nameProbe))
                            .filter(conflict -> !conflict.id().equals(id))
                            .flatMap(conflict -> Mono.error(new ValidationException("Grade item name already exists in this class")))
                            .then(Mono.defer(() -> gradeItemRepository.save(new GradeItemEntity(
                                    e.id(), e.classId(),
                                    req.itemName(), req.itemType(),
                                    req.itemDate(), req.itemDescription(),
                                    req.maxScore(), req.weight(),
                                    e.createdAt(), LocalDateTime.now(), false, null))));
                })
                .map(this::toResponse);
    }

    @Transactional
    public Mono<GradeItemResponse> patch(UUID id, GradeItemPatchRequest req) {
        return gradeItemRepository.findById(id)
                .filter(e -> !e.deleted())
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("GradeItem", id)))
                .flatMap(e -> {
                    String itemName = req.itemName() != null ? req.itemName() : e.itemName();
                    if (itemName == null || itemName.isBlank()) {
                        return Mono.error(new ValidationException("Item name must not be empty"));
                    }
                    BigDecimal maxScore = req.maxScore() != null ? req.maxScore() : e.maxScore();
                    if (maxScore != null && maxScore.doubleValue() < 0) {
                        return Mono.error(new ValidationException("Max score must not be negative"));
                    }
                    BigDecimal weight = req.weight() != null ? req.weight() : e.weight();
                    if (weight != null && (weight.doubleValue() < 0.0 || weight.doubleValue() > 1.0)) {
                        return Mono.error(new ValidationException("Weight must be between 0.0 and 1.0"));
                    }

                    var nameProbe = new GradeItemEntity(null, e.classId(), itemName, null, null, null, null, null, null, null, false, null);
                    return gradeItemRepository.findOne(Example.of(nameProbe))
                            .filter(conflict -> !conflict.id().equals(id))
                            .flatMap(conflict -> Mono.error(new ValidationException("Grade item name already exists in this class")))
                            .then(Mono.defer(() -> gradeItemRepository.save(new GradeItemEntity(
                                    e.id(), e.classId(),
                                    itemName,
                                    req.itemType() != null ? req.itemType() : e.itemType(),
                                    req.itemDate() != null ? req.itemDate() : e.itemDate(),
                                    req.itemDescription() != null ? req.itemDescription() : e.itemDescription(),
                                    maxScore, weight,
                                    e.createdAt(), LocalDateTime.now(), false, null))));
                })
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
                .flatMap(saved -> gradeRecordService.deleteByGradeItemId(saved.id()))
                .then();
    }

    @Transactional
    public Mono<Void> deleteByClassId(UUID classId) {
        var probe = new GradeItemEntity(null, classId, null, null, null, null, null, null, null, null, false, null);
        var matcher = ExampleMatcher.matching().withIgnoreNullValues();
        return gradeItemRepository.findAll(Example.of(probe, matcher))
                .flatMap(gi -> delete(gi.id()))
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
        return classRepository.findById(classId)
                .filter(c -> !c.deleted())
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("Class", classId)))
                .flatMap(clazz -> {
                    var itemProbe = new GradeItemEntity(null, classId, null, null, null, null, null, null, null, null, false, null);
                    var studentProbe = new StudentEntity(null, classId, null, 0, null, null, null, null, false, null);
                    var studentMatcher = ExampleMatcher.matching().withIgnorePaths("studentNumber").withIgnoreNullValues();

                    return gradeItemRepository.findAll(Example.of(itemProbe, ExampleMatcher.matching().withIgnoreNullValues()))
                            .collectList()
                            .flatMap(items -> studentRepository.findAll(Example.of(studentProbe, studentMatcher), Sort.by("studentNumber")).collectList()
                                    .flatMap(students -> gradeRecordRepository.findByClassId(classId).collectList()
                                            .flatMap(records -> Mono.fromCallable(() -> {
                                                try (var wb = new XSSFWorkbook()) {
                                                    var sheet = wb.createSheet("Grades");
                                                    var header = sheet.createRow(0);
                                                    header.createCell(0).setCellValue("學號");
                                                    header.createCell(1).setCellValue("座號");
                                                    header.createCell(2).setCellValue("姓名");
                                                    for (int i = 0; i < items.size(); i++) {
                                                        header.createCell(i + 3).setCellValue(items.get(i).itemName());
                                                    }
                                                    header.createCell(items.size() + 3).setCellValue("加權總分");
                                                    for (int r = 0; r < students.size(); r++) {
                                                        var student = students.get(r);
                                                        var row = sheet.createRow(r + 1);
                                                        row.createCell(0).setCellValue(student.studentId());
                                                        row.createCell(1).setCellValue(student.studentNumber());
                                                        row.createCell(2).setCellValue(student.studentName());
                                                        double weightedTotal = 0.0;
                                                        for (int c = 0; c < items.size(); c++) {
                                                            var item = items.get(c);
                                                            var score = records.stream()
                                                                    .filter(gr -> gr.gradeItemId().equals(item.id()) && gr.studentId().equals(student.id()))
                                                                    .findFirst()
                                                                    .map(gr -> gr.score() != null ? gr.score().doubleValue() : 0.0)
                                                                    .orElse(0.0);
                                                            row.createCell(c + 3).setCellValue(score);
                                                            double weight = item.weight() != null ? item.weight().doubleValue() : 0.0;
                                                            weightedTotal += score * weight;
                                                        }
                                                        row.createCell(items.size() + 3).setCellValue(weightedTotal);
                                                    }
                                                    var out = new ByteArrayOutputStream();
                                                    wb.write(out);
                                                    return new Object[] { out.toByteArray(), students.size() };
                                                }
                                            }).subscribeOn(Schedulers.boundedElastic()))
                                            .map(resObj -> {
                                                byte[] bytes = (byte[]) resObj[0];
                                                int count = (Integer) resObj[1];
                                                String base64 = Base64.getEncoder().encodeToString(bytes);
                                                String fileName = "成績總表.xlsx";
                                                return new OperationStatusDto(true, "Export completed", count, base64, fileName);
                                            })
                                    )
                            );
                });
    }

    public Mono<OperationStatusDto> exportAttendance(UUID classId, ExportAttendanceRequestDto req) {
        return classRepository.findById(classId)
                .filter(c -> !c.deleted())
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("Class", classId)))
                .flatMap(clazz -> {
                    var itemProbe = new GradeItemEntity(null, classId, null, "ATTENDANCE", null, null, null, null, null, null, false, null);
                    var studentProbe = new StudentEntity(null, classId, null, 0, null, null, null, null, false, null);
                    var studentMatcher = ExampleMatcher.matching().withIgnorePaths("studentNumber").withIgnoreNullValues();

                    return gradeItemRepository.findAll(Example.of(itemProbe, ExampleMatcher.matching().withIgnoreNullValues()))
                            .collectList()
                            .flatMap(items -> studentRepository.findAll(Example.of(studentProbe, studentMatcher), Sort.by("studentNumber")).collectList()
                                    .flatMap(students -> gradeRecordRepository.findByClassId(classId).collectList()
                                            .flatMap(records -> Mono.fromCallable(() -> {
                                                try (var wb = new XSSFWorkbook()) {
                                                    var sheet = wb.createSheet("Attendance");
                                                    var header = sheet.createRow(0);
                                                    header.createCell(0).setCellValue("學號");
                                                    header.createCell(1).setCellValue("座號");
                                                    header.createCell(2).setCellValue("姓名");

                                                    // Dynamic Date/Item columns (US-08-04 AC2)
                                                    for (int i = 0; i < items.size(); i++) {
                                                        var item = items.get(i);
                                                        String label = item.itemDate() != null ? item.itemDate().toString() : item.itemName();
                                                        header.createCell(i + 3).setCellValue(label);
                                                    }

                                                    int countStartIndex = items.size() + 3;
                                                    header.createCell(countStartIndex).setCellValue("出席次數");
                                                    header.createCell(countStartIndex + 1).setCellValue("缺席次數");
                                                    header.createCell(countStartIndex + 2).setCellValue("請假次數");

                                                    for (int r = 0; r < students.size(); r++) {
                                                        var student = students.get(r);
                                                        var row = sheet.createRow(r + 1);
                                                        row.createCell(0).setCellValue(student.studentId());
                                                        row.createCell(1).setCellValue(student.studentNumber());
                                                        row.createCell(2).setCellValue(student.studentName());

                                                        long present = 0;
                                                        long absent = 0;
                                                        long excused = 0;
                                                        for (int i = 0; i < items.size(); i++) {
                                                            var item = items.get(i);
                                                            var opt = records.stream()
                                                                    .filter(gr -> gr.gradeItemId().equals(item.id()) && gr.studentId().equals(student.id()))
                                                                    .findFirst();
                                                            String statusStr = "出席";
                                                            if (opt.isPresent()) {
                                                                var scoreVal = opt.get().score();
                                                                if (scoreVal != null) {
                                                                    double val = scoreVal.doubleValue();
                                                                    if (val == 1.0 || val == 100.0) {
                                                                        present++;
                                                                        statusStr = "出席";
                                                                    } else if (val == 0.0) {
                                                                        absent++;
                                                                        statusStr = "缺席";
                                                                    } else {
                                                                        excused++;
                                                                        statusStr = "請假";
                                                                    }
                                                                } else {
                                                                    present++;
                                                                    statusStr = "出席";
                                                                }
                                                            } else {
                                                                present++;
                                                                statusStr = "出席";
                                                            }
                                                            row.createCell(i + 3).setCellValue(statusStr);
                                                        }
                                                        row.createCell(countStartIndex).setCellValue(present);
                                                        row.createCell(countStartIndex + 1).setCellValue(absent);
                                                        row.createCell(countStartIndex + 2).setCellValue(excused);
                                                    }

                                                    var out = new ByteArrayOutputStream();
                                                    wb.write(out);
                                                    return new Object[] { out.toByteArray(), students.size() };
                                                }
                                            }).subscribeOn(Schedulers.boundedElastic()))
                                            .map(resObj -> {
                                                byte[] bytes = (byte[]) resObj[0];
                                                int count = (Integer) resObj[1];
                                                String base64 = Base64.getEncoder().encodeToString(bytes);
                                                String fileName = "出缺席總表.xlsx";
                                                return new OperationStatusDto(true, "Attendance export completed. Columns: studentNumber, studentName, presentCount, absentCount, excusedCount", count, base64, fileName);
                                            })
                                    )
                            );
                });
    }

    public Mono<OperationStatusDto> calculateWeightedScores(UUID classId, CalculateWeightedScoresRequestDto req) {
        return classRepository.findById(classId)
                .filter(c -> !c.deleted())
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("Class", classId)))
                .flatMap(clazz -> {
                    var itemProbe = new GradeItemEntity(null, classId, null, null, null, null, null, null, null, null, false, null);
                    var studentProbe = new StudentEntity(null, classId, null, 0, null, null, null, null, false, null);
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
                });
    }

    private GradeItemResponse toResponse(GradeItemEntity e) {
        return new GradeItemResponse(
                e.id().toString(), e.classId().toString(), e.itemName(), e.itemType(),
                e.itemDate(), e.itemDescription(), e.maxScore(), e.weight()
        );
    }
}
