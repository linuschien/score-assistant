package com.scoreassistant.adapter.in.web.dto;

import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;

public sealed interface ClassDto permits
        ClassDto.ClassRequest,
        ClassDto.ClassPatchRequest,
        ClassDto.ClassResponse {

    record ClassRequest(
            @NotBlank String className,
            String classGroup,
            BigDecimal passingThreshold
    ) implements ClassDto {}

    record ClassPatchRequest(
            String className,
            String classGroup,
            BigDecimal passingThreshold
    ) implements ClassDto {}

    record ClassResponse(
            String id,
            String semesterId,
            String className,
            String classGroup,
            BigDecimal passingThreshold
    ) implements ClassDto {}
}
