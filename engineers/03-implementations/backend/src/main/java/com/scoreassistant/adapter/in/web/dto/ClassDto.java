package com.scoreassistant.adapter.in.web.dto;

import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;

public sealed interface ClassDto permits
        ClassDto.ClassRequest,
        ClassDto.ClassPatchRequest,
        ClassDto.ClassResponse {

    record ClassRequest(
            @NotBlank String class_name,
            BigDecimal passing_threshold
    ) implements ClassDto {}

    record ClassPatchRequest(
            String class_name,
            BigDecimal passing_threshold
    ) implements ClassDto {}

    record ClassResponse(
            String id,
            String class_name,
            BigDecimal passing_threshold
    ) implements ClassDto {}
}
