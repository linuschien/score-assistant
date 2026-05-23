package com.scoreassistant.adapter.in.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

// ── Semester ─────────────────────────────────────────────────

public sealed interface SemesterDto permits
        SemesterDto.SemesterRequest,
        SemesterDto.SemesterPatchRequest,
        SemesterDto.SemesterResponse {

    record SemesterRequest(
            @NotBlank String semesterName,
            @NotNull  LocalDate startDate,
            @NotNull  LocalDate endDate
    ) implements SemesterDto {}

    record SemesterPatchRequest(
            String semesterName,
            LocalDate startDate,
            LocalDate endDate
    ) implements SemesterDto {}

    record SemesterResponse(
            String id,
            String semesterName,
            LocalDate startDate,
            LocalDate endDate
    ) implements SemesterDto {}
}
