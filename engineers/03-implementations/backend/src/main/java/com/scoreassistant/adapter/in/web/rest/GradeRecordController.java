package com.scoreassistant.adapter.in.web.rest;

import com.scoreassistant.adapter.in.web.dto.GradeRecordDto.*;
import com.scoreassistant.application.service.GradeRecordService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/grade-records")
public class GradeRecordController {

    private final GradeRecordService gradeRecordService;

    public GradeRecordController(GradeRecordService gradeRecordService) {
        this.gradeRecordService = gradeRecordService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<GradeRecordResponse> createGradeRecord(@Valid @RequestBody GradeRecordRequest req) {
        return gradeRecordService.create(req);
    }

    @GetMapping("/{gradeRecordId}")
    public Mono<GradeRecordResponse> getGradeRecordById(@PathVariable UUID gradeRecordId) {
        return gradeRecordService.findById(gradeRecordId);
    }

    @PutMapping("/{gradeRecordId}")
    public Mono<GradeRecordResponse> updateGradeRecord(
            @PathVariable UUID gradeRecordId,
            @Valid @RequestBody GradeRecordRequest req) {
        return gradeRecordService.update(gradeRecordId, req);
    }

    @PatchMapping("/{gradeRecordId}")
    public Mono<GradeRecordResponse> patchGradeRecord(
            @PathVariable UUID gradeRecordId,
            @RequestBody GradeRecordPatchRequest req) {
        return gradeRecordService.patch(gradeRecordId, req);
    }

    @DeleteMapping("/{gradeRecordId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> deleteGradeRecord(@PathVariable UUID gradeRecordId) {
        return gradeRecordService.delete(gradeRecordId);
    }
}
