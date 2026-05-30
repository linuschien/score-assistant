package com.scoreassistant.application.service;

import com.scoreassistant.adapter.in.web.dto.OperationStatusDto;
import com.scoreassistant.adapter.in.web.dto.StudentDto.*;
import com.scoreassistant.adapter.out.persistence.ClassRepository;
import com.scoreassistant.adapter.out.persistence.StudentRepository;
import com.scoreassistant.domain.exception.ResourceNotFoundException;
import com.scoreassistant.domain.exception.ValidationException;
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
import com.scoreassistant.application.service.parser.TableParser;
import com.scoreassistant.application.service.parser.CsvTableParser;
import com.scoreassistant.application.service.parser.ExcelTableParser;

@Service
public class StudentService {

    private static final StudentEntity NONE = new StudentEntity(
            UUID.fromString("00000000-0000-0000-0000-000000000000"),
            UUID.fromString("00000000-0000-0000-0000-000000000000"),
            "", 0, "", "", null, null, false, null
    );

    private final StudentRepository studentRepository;
    private final ClassRepository classRepository;
    private final GradeRecordService gradeRecordService;

    public StudentService(StudentRepository studentRepository, ClassRepository classRepository, GradeRecordService gradeRecordService) {
        this.studentRepository = studentRepository;
        this.classRepository = classRepository;
        this.gradeRecordService = gradeRecordService;
    }

    @Transactional
    public Mono<StudentResponse> create(UUID classId, StudentRequest req) {
        var classProbe = new ClassEntity(classId, null, null, null, null, null, null, false, null);
        return classRepository.exists(Example.of(classProbe))
                .filter(exists -> exists)
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("Class", classId)))
                .flatMap(exists -> {
                    var numProbe = new StudentEntity(null, classId, null, req.studentNumber(), null, null, null, null, false, null);
                    var numMatcher = ExampleMatcher.matching().withIgnoreNullValues();

                    var idProbe = new StudentEntity(null, null, req.studentId(), 0, null, null, null, null, false, null);
                    var idMatcher = ExampleMatcher.matching().withIgnorePaths("studentNumber").withIgnoreNullValues();

                    var emailProbe = new StudentEntity(null, null, null, 0, null, req.email(), null, null, false, null);
                    var emailMatcher = ExampleMatcher.matching().withIgnorePaths("studentNumber").withIgnoreNullValues();

                    return studentRepository.exists(Example.of(numProbe, numMatcher))
                            .flatMap(existsNum -> {
                                if (existsNum) return Mono.error(new ValidationException("Student number already exists in this class"));
                                return studentRepository.exists(Example.of(idProbe, idMatcher));
                            })
                            .flatMap(existsId -> {
                                if (existsId) return Mono.error(new ValidationException("Student ID already exists"));
                                return studentRepository.exists(Example.of(emailProbe, emailMatcher));
                            })
                            .flatMap(existsEmail -> {
                                if (existsEmail) return Mono.error(new ValidationException("Email already exists"));
                                var now = LocalDateTime.now();
                                var entity = new StudentEntity(
                                        null, classId,
                                        req.studentId(), req.studentNumber(), req.studentName(), req.email(),
                                        now, now, false, null
                                );
                                return studentRepository.save(entity);
                            });
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
                .flatMap(e -> {
                    var numProbe = new StudentEntity(null, e.classId(), null, req.studentNumber(), null, null, null, null, false, null);
                    var numMatcher = ExampleMatcher.matching().withIgnoreNullValues();

                    var idProbe = new StudentEntity(null, null, req.studentId(), 0, null, null, null, null, false, null);
                    var idMatcher = ExampleMatcher.matching().withIgnorePaths("studentNumber").withIgnoreNullValues();

                    var emailProbe = new StudentEntity(null, null, null, 0, null, req.email(), null, null, false, null);
                    var emailMatcher = ExampleMatcher.matching().withIgnorePaths("studentNumber").withIgnoreNullValues();

                    return studentRepository.findOne(Example.of(numProbe, numMatcher))
                            .filter(conflict -> !conflict.id().equals(id))
                            .flatMap(conflict -> Mono.error(new ValidationException("Student number already exists in this class")))
                            .then(studentRepository.findOne(Example.of(idProbe, idMatcher)))
                            .filter(conflict -> !conflict.id().equals(id))
                            .flatMap(conflict -> Mono.error(new ValidationException("Student ID already exists")))
                            .then(studentRepository.findOne(Example.of(emailProbe, emailMatcher)))
                            .filter(conflict -> !conflict.id().equals(id))
                            .flatMap(conflict -> Mono.error(new ValidationException("Email already exists")))
                            .then(Mono.defer(() -> studentRepository.save(new StudentEntity(
                                    e.id(), e.classId(), req.studentId(), req.studentNumber(), req.studentName(), req.email(),
                                    e.createdAt(), LocalDateTime.now(), false, null
                            ))));
                })
                .map(this::toResponse);
    }

    @Transactional
    public Mono<StudentResponse> patch(UUID id, StudentPatchRequest req) {
        return studentRepository.findById(id)
                .filter(e -> !e.deleted())
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("Student", id)))
                .flatMap(e -> {
                    int studentNumber = req.studentNumber() != null ? req.studentNumber() : e.studentNumber();
                    String studentId = req.studentId() != null ? req.studentId() : e.studentId();
                    String studentName = req.studentName() != null ? req.studentName() : e.studentName();
                    String email = req.email() != null ? req.email() : e.email();

                    var numProbe = new StudentEntity(null, e.classId(), null, studentNumber, null, null, null, null, false, null);
                    var numMatcher = ExampleMatcher.matching().withIgnoreNullValues();

                    var idProbe = new StudentEntity(null, null, studentId, 0, null, null, null, null, false, null);
                    var idMatcher = ExampleMatcher.matching().withIgnorePaths("studentNumber").withIgnoreNullValues();

                    var emailProbe = new StudentEntity(null, null, null, 0, null, email, null, null, false, null);
                    var emailMatcher = ExampleMatcher.matching().withIgnorePaths("studentNumber").withIgnoreNullValues();

                    return studentRepository.findOne(Example.of(numProbe, numMatcher))
                            .filter(conflict -> !conflict.id().equals(id))
                            .flatMap(conflict -> Mono.error(new ValidationException("Student number already exists in this class")))
                            .then(studentRepository.findOne(Example.of(idProbe, idMatcher)))
                            .filter(conflict -> !conflict.id().equals(id))
                            .flatMap(conflict -> Mono.error(new ValidationException("Student ID already exists")))
                            .then(studentRepository.findOne(Example.of(emailProbe, emailMatcher)))
                            .filter(conflict -> !conflict.id().equals(id))
                            .flatMap(conflict -> Mono.error(new ValidationException("Email already exists")))
                            .then(Mono.defer(() -> studentRepository.save(new StudentEntity(
                                    e.id(), e.classId(), studentId, studentNumber, studentName, email,
                                    e.createdAt(), LocalDateTime.now(), false, null
                            ))));
                })
                .map(this::toResponse);
    }

    @Transactional
    public Mono<Void> delete(UUID id) {
        return studentRepository.findById(id)
                .filter(e -> !e.deleted())
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("Student", id)))
                .flatMap(e -> studentRepository.save(new StudentEntity(
                        e.id(), e.classId(), e.studentId(), e.studentNumber(), e.studentName(), e.email(),
                        e.createdAt(), LocalDateTime.now(), true, LocalDateTime.now())))
                .flatMap(saved -> gradeRecordService.deleteByStudentId(saved.id()))
                .then();
    }

    @Transactional
    public Mono<Void> deleteByClassId(UUID classId) {
        var probe = new StudentEntity(null, classId, null, 0, null, null, null, null, false, null);
        var matcher = ExampleMatcher.matching().withIgnorePaths("studentNumber").withIgnoreNullValues();
        return studentRepository.findAll(Example.of(probe, matcher))
                .flatMap(s -> delete(s.id()))
                .then();
    }

    public Flux<StudentResponse> listAll(UUID classId) {
        var probe = new StudentEntity(
                null,
                classId,
                null, 0, null, null, null, null, false, null
        );
        var matcher = ExampleMatcher.matching()
                .withIgnorePaths("studentNumber")
                .withIgnoreNullValues();
        return studentRepository.findAll(Example.of(probe, matcher), Sort.by("studentNumber")).map(this::toResponse);
    }

    @Transactional
    public Mono<OperationStatusDto> importStudents(UUID classId, byte[] csvBytes) {
        return importStudents(classId, csvBytes, null, "SKIP");
    }

    @Transactional
    public Mono<OperationStatusDto> importStudents(UUID classId, byte[] csvBytes, String strategy) {
        return importStudents(classId, csvBytes, null, strategy);
    }

    @Transactional
    public Mono<OperationStatusDto> importStudents(UUID classId, byte[] fileBytes, String filename, String strategy) {
        var classProbe = new ClassEntity(classId, null, null, null, null, null, null, false, null);
        return classRepository.exists(Example.of(classProbe))
                .filter(exists -> exists)
                .switchIfEmpty(Mono.error(ResourceNotFoundException.of("Class", classId)))
                .flatMap(exists -> {
                    TableParser parser = (filename != null && filename.toLowerCase().endsWith(".xlsx"))
                            ? new ExcelTableParser()
                            : new CsvTableParser();
                    java.util.List<String[]> rows;
                    try {
                        rows = parser.parse(fileBytes);
                    } catch (Exception e) {
                        return Mono.error(new ValidationException("Failed to parse import file: " + e.getMessage()));
                    }

                    if (rows.isEmpty()) {
                        return Mono.error(new ValidationException("Import file is empty"));
                    }

                    String[] headers = rows.get(0);
                    int studentIdIndex = -1;
                    int studentNumberIndex = -1;
                    int studentNameIndex = -1;
                    int emailIndex = -1;

                    for (int i = 0; i < headers.length; i++) {
                        String h = headers[i].trim();
                        if ("學號".equals(h)) {
                            studentIdIndex = i;
                        } else if ("座號".equals(h)) {
                            studentNumberIndex = i;
                        } else if ("姓名".equals(h)) {
                            studentNameIndex = i;
                        } else if ("信箱".equals(h)) {
                            emailIndex = i;
                        }
                    }

                    java.util.List<String> missing = new java.util.ArrayList<>();
                    if (studentIdIndex == -1) missing.add("學號");
                    if (studentNumberIndex == -1) missing.add("座號");
                    if (studentNameIndex == -1) missing.add("姓名");
                    if (emailIndex == -1) missing.add("信箱");

                    if (!missing.isEmpty()) {
                        return Mono.error(new ValidationException("Missing required columns: " + String.join(", ", missing)));
                    }

                    final int idIdx = studentIdIndex;
                    final int numIdx = studentNumberIndex;
                    final int nameIdx = studentNameIndex;
                    final int emailIdx = emailIndex;
                    final int maxIdx = Math.max(Math.max(idIdx, numIdx), Math.max(nameIdx, emailIdx));

                    var dataRows = rows.subList(1, rows.size());
                    java.util.List<IndexedRow> indexedRows = new java.util.ArrayList<>();
                    for (int i = 0; i < dataRows.size(); i++) {
                        indexedRows.add(new IndexedRow(i + 2, dataRows.get(i)));
                    }

                    return Flux.fromIterable(indexedRows)
                            .flatMap(indexedRow -> {
                                int line = indexedRow.lineNumber();
                                String[] parts = indexedRow.parts();
                                if (parts.length <= maxIdx) {
                                    return Mono.just(new ImportResult(false, false, "第 " + line + " 行：資料欄位不足"));
                                }
                                String studentId = parts[idIdx].trim();
                                if (studentId.isEmpty()) {
                                    return Mono.just(new ImportResult(false, false, "第 " + line + " 行：學號不得為空"));
                                }
                                int studentNumber;
                                try {
                                    studentNumber = Integer.parseInt(parts[numIdx].trim());
                                } catch (NumberFormatException e) {
                                    return Mono.just(new ImportResult(false, false, "第 " + line + " 行：座號必須為有效數字"));
                                }
                                String studentName = parts[nameIdx].trim();
                                if (studentName.isEmpty()) {
                                    return Mono.just(new ImportResult(false, false, "第 " + line + " 行：姓名不得為空"));
                                }
                                String email = parts[emailIdx].trim();
                                if (email.isEmpty()) {
                                    return Mono.just(new ImportResult(false, false, "第 " + line + " 行：電子信箱不得為空"));
                                }
                                if (!email.matches("\\S+@\\S+\\.\\S+")) {
                                    return Mono.just(new ImportResult(false, false, "第 " + line + " 行：電子信箱格式不正確"));
                                }

                                return processCsvRow(classId, studentId, studentNumber, studentName, email, strategy, line);
                            })
                            .collectList()
                            .map(results -> {
                                int success = 0;
                                int failure = 0;
                                java.util.List<String> errorsList = new java.util.ArrayList<>();
                                for (var res : results) {
                                    if (res.success()) {
                                        success++;
                                    } else {
                                        failure++;
                                        if (res.errorMessage() != null) {
                                            errorsList.add(res.errorMessage());
                                        }
                                    }
                                }
                                return new OperationStatusDto(true, "Import completed", success, success, failure, errorsList);
                            });
                });
    }

    private Mono<ImportResult> processCsvRow(UUID classId, String studentId, int studentNumber, String studentName, String email, String strategy, int line) {
        var idProbe = new StudentEntity(null, null, studentId, 0, null, null, null, null, false, null);
        var idMatcher = ExampleMatcher.matching().withIgnorePaths("studentNumber").withIgnoreNullValues();

        var emailProbe = new StudentEntity(null, null, null, 0, null, email, null, null, false, null);
        var emailMatcher = ExampleMatcher.matching().withIgnorePaths("studentNumber").withIgnoreNullValues();

        var numProbe = new StudentEntity(null, classId, null, studentNumber, null, null, null, null, false, null);
        var numMatcher = ExampleMatcher.matching().withIgnoreNullValues();

        return Mono.zip(
                studentRepository.findOne(Example.of(idProbe, idMatcher)).defaultIfEmpty(NONE),
                studentRepository.findOne(Example.of(emailProbe, emailMatcher)).defaultIfEmpty(NONE),
                studentRepository.findOne(Example.of(numProbe, numMatcher)).defaultIfEmpty(NONE)
        ).flatMap(tuple -> {
            var byId = tuple.getT1();
            var byEmail = tuple.getT2();
            var byNum = tuple.getT3();

            boolean hasIdConflict = byId != NONE && !byId.classId().equals(classId);
            boolean hasEmailConflict = byEmail != NONE && !byEmail.classId().equals(classId);

            if (hasIdConflict || hasEmailConflict) {
                String cause = hasIdConflict ? "學號已被其他班級佔用" : "信箱已被其他班級佔用";
                return Mono.just(new ImportResult(false, false, "第 " + line + " 行：" + cause));
            }

            if (byId != NONE && byId.studentNumber() != studentNumber) {
                return Mono.just(new ImportResult(false, false, "第 " + line + " 行：學號已存在且與輸入之座號不相符"));
            }
            if (byEmail != NONE && byEmail.studentNumber() != studentNumber) {
                return Mono.just(new ImportResult(false, false, "第 " + line + " 行：信箱已存在且與輸入之座號不相符"));
            }

            if (byNum != NONE) {
                if ("SKIP".equalsIgnoreCase(strategy)) {
                    return Mono.just(new ImportResult(false, false, "第 " + line + " 行：座號已存在 (略過)"));
                } else if ("OVERWRITE".equalsIgnoreCase(strategy)) {
                    var now = LocalDateTime.now();
                    var updated = new StudentEntity(
                            byNum.id(), classId, studentId, studentNumber, studentName, email,
                            byNum.createdAt(), now, false, null
                    );
                    return studentRepository.save(updated).map(saved -> new ImportResult(true, true));
                } else {
                    return Mono.just(new ImportResult(false, false, "第 " + line + " 行：座號已存在 (略過)"));
                }
            }

            var now = LocalDateTime.now();
            var newStudent = new StudentEntity(
                    null, classId, studentId, studentNumber, studentName, email,
                    now, now, false, null
            );
            return studentRepository.save(newStudent).map(saved -> new ImportResult(true, false));
        });
    }

    private StudentResponse toResponse(StudentEntity e) {
        return new StudentResponse(e.id().toString(), e.classId().toString(), e.studentId(), e.studentNumber(), e.studentName(), e.email());
    }

    private record IndexedRow(int lineNumber, String[] parts) {}

    private record ImportResult(boolean success, boolean isUpdate, String errorMessage) {
        public ImportResult(boolean success, boolean isUpdate) {
            this(success, isUpdate, null);
        }
    }
}
