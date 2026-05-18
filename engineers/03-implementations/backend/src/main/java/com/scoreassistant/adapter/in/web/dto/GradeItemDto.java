package com.scoreassistant.adapter.in.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public sealed interface GradeItemDto permits
        GradeItemDto.GradeItemRequest,
        GradeItemDto.GradeItemPatchRequest,
        GradeItemDto.GradeItemResponse {

    record GradeItemRequest(
            @NotBlank String item_name,
            @NotBlank String item_type,
            LocalDate item_date,
            String item_description,
            @NotNull BigDecimal max_score,
            @NotNull BigDecimal weight
    ) implements GradeItemDto {}

    record GradeItemPatchRequest(
            String item_name,
            String item_type,
            LocalDate item_date,
            String item_description,
            BigDecimal max_score,
            BigDecimal weight
    ) implements GradeItemDto {}

    record GradeItemResponse(
            String id,
            String class_id,
            String item_name,
            String item_type,
            LocalDate item_date,
            String item_description,
            BigDecimal max_score,
            BigDecimal weight
    ) implements GradeItemDto {}
}
