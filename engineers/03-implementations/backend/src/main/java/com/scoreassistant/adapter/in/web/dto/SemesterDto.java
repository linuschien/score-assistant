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
            @NotBlank String semester_name,
            @NotNull  LocalDate start_date,
            @NotNull  LocalDate end_date
    ) implements SemesterDto {}

    record SemesterPatchRequest(
            String semester_name,
            LocalDate start_date,
            LocalDate end_date
    ) implements SemesterDto {}

    record SemesterResponse(
            String id,
            String semester_name,
            LocalDate start_date,
            LocalDate end_date
    ) implements SemesterDto {}
}
