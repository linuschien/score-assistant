package com.scoreassistant.adapter.in.web.dto;

import jakarta.validation.constraints.NotBlank;

public record ExportGradesRequestDto(
        @NotBlank String format
) {}
