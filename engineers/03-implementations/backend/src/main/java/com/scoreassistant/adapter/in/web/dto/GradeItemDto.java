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
            @NotBlank String itemName,
            @NotBlank String itemType,
            LocalDate itemDate,
            String itemDescription,
            @NotNull BigDecimal maxScore,
            @NotNull BigDecimal weight
    ) implements GradeItemDto {}

    record GradeItemPatchRequest(
            String itemName,
            String itemType,
            LocalDate itemDate,
            String itemDescription,
            BigDecimal maxScore,
            BigDecimal weight
    ) implements GradeItemDto {}

    record GradeItemResponse(
            String id,
            String classId,
            String itemName,
            String itemType,
            LocalDate itemDate,
            String itemDescription,
            BigDecimal maxScore,
            BigDecimal weight
    ) implements GradeItemDto {}
}
