package com.scoreassistant.adapter.in.web.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record CalculateWeightedScoresRequestDto(
        @NotNull UUID classId
) {}
