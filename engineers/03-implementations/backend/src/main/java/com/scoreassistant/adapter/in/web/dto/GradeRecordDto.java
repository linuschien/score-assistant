package com.scoreassistant.adapter.in.web.dto;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public sealed interface GradeRecordDto permits
        GradeRecordDto.GradeRecordRequest,
        GradeRecordDto.GradeRecordPatchRequest,
        GradeRecordDto.GradeRecordResponse {

    record GradeRecordRequest(
            @NotNull UUID gradeItemId,
            @NotNull UUID studentId,
            BigDecimal score
    ) implements GradeRecordDto {}

    record GradeRecordPatchRequest(
            BigDecimal score
    ) implements GradeRecordDto {}

    record GradeRecordResponse(
            String id,
            String gradeItemId,
            String studentId,
            BigDecimal score,
            LocalDateTime lastModifiedAt,
            int version
    ) implements GradeRecordDto {}
}
