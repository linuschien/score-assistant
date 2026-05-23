package com.scoreassistant.adapter.in.web.rest;

import com.scoreassistant.adapter.in.web.dto.*;
import com.scoreassistant.adapter.in.web.dto.GradeItemDto.*;
import com.scoreassistant.application.service.GradeItemService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/semesters/{semesterId}/classes")
public class GradeItemController {

    private final GradeItemService gradeItemService;

    public GradeItemController(GradeItemService gradeItemService) {
        this.gradeItemService = gradeItemService;
    }

    // ── Grade Items ───────────────────────────────────────────────

    @PostMapping("/{classId}/grade-items")
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<GradeItemResponse> createGradeItem(
            @PathVariable UUID semesterId,
            @PathVariable UUID classId,
            @Valid @RequestBody GradeItemRequest req) {
        return gradeItemService.create(classId, req);
    }

    @GetMapping("/{classId}/grade-items/{gradeItemId}")
    public Mono<GradeItemResponse> getGradeItemById(
            @PathVariable UUID semesterId,
            @PathVariable UUID classId,
            @PathVariable UUID gradeItemId) {
        return gradeItemService.findById(gradeItemId);
    }

    @PutMapping("/{classId}/grade-items/{gradeItemId}")
    public Mono<GradeItemResponse> updateGradeItem(
            @PathVariable UUID semesterId,
            @PathVariable UUID classId,
            @PathVariable UUID gradeItemId,
            @Valid @RequestBody GradeItemRequest req) {
        return gradeItemService.update(gradeItemId, req);
    }

    @PatchMapping("/{classId}/grade-items/{gradeItemId}")
    public Mono<GradeItemResponse> patchGradeItem(
            @PathVariable UUID semesterId,
            @PathVariable UUID classId,
            @PathVariable UUID gradeItemId,
            @RequestBody GradeItemPatchRequest req) {
        return gradeItemService.patch(gradeItemId, req);
    }

    @DeleteMapping("/{classId}/grade-items/{gradeItemId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> deleteGradeItem(
            @PathVariable UUID semesterId,
            @PathVariable UUID classId,
            @PathVariable UUID gradeItemId) {
        return gradeItemService.delete(gradeItemId);
    }

    // ── Custom Actions ────────────────────────────────────────────

    @PostMapping("/{classId}:exportGrades")
    public Mono<OperationStatusDto> exportGrades(
            @PathVariable UUID semesterId,
            @PathVariable UUID classId,
            @Valid @RequestBody ExportGradesRequestDto req) {
        return gradeItemService.exportGrades(classId, req);
    }

    @PostMapping("/{classId}:exportAttendance")
    public Mono<OperationStatusDto> exportAttendance(
            @PathVariable UUID semesterId,
            @PathVariable UUID classId,
            @Valid @RequestBody ExportAttendanceRequestDto req) {
        return gradeItemService.exportAttendance(classId, req);
    }

    @PostMapping("/{classId}:calculateWeightedScores")
    public Mono<OperationStatusDto> calculateWeightedScores(
            @PathVariable UUID semesterId,
            @PathVariable UUID classId,
            @Valid @RequestBody CalculateWeightedScoresRequestDto req) {
        return gradeItemService.calculateWeightedScores(classId, req);
    }
}
