package com.scoreassistant.adapter.in.web.rest;

import com.scoreassistant.adapter.in.web.dto.SemesterDto.*;
import com.scoreassistant.application.service.SemesterService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/semesters")
public class SemesterController {

    private final SemesterService semesterService;

    public SemesterController(SemesterService semesterService) {
        this.semesterService = semesterService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<SemesterResponse> createSemester(@Valid @RequestBody SemesterRequest req) {
        return semesterService.create(req);
    }

    @GetMapping("/{semesterId}")
    public Mono<SemesterResponse> getSemesterById(@PathVariable UUID semesterId) {
        return semesterService.findById(semesterId);
    }

    @PutMapping("/{semesterId}")
    public Mono<SemesterResponse> updateSemester(
            @PathVariable UUID semesterId,
            @Valid @RequestBody SemesterRequest req) {
        return semesterService.update(semesterId, req);
    }

    @PatchMapping("/{semesterId}")
    public Mono<SemesterResponse> patchSemester(
            @PathVariable UUID semesterId,
            @RequestBody SemesterPatchRequest req) {
        return semesterService.patch(semesterId, req);
    }

    @DeleteMapping("/{semesterId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> deleteSemester(@PathVariable UUID semesterId) {
        return semesterService.delete(semesterId);
    }
}
