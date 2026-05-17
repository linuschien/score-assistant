package com.scoreassistant.adapter.in.web.dto;

public record OperationStatusDto(
        boolean success,
        String message,
        Integer affectedCount
) {}
