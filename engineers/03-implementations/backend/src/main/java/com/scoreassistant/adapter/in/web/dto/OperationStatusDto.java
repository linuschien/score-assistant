package com.scoreassistant.adapter.in.web.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record OperationStatusDto(
        boolean success,
        String message,
        Integer affectedCount,
        String fileData,
        String fileName,
        @JsonProperty("success_count") Integer successCountSnake,
        @JsonProperty("failure_count") Integer failureCountSnake,
        Integer successCount,
        Integer failureCount
) {
    public OperationStatusDto(boolean success, String message, Integer affectedCount) {
        this(success, message, affectedCount, null, null, null, null, null, null);
    }

    public OperationStatusDto(boolean success, String message, Integer affectedCount, String fileData, String fileName) {
        this(success, message, affectedCount, fileData, fileName, null, null, null, null);
    }

    public OperationStatusDto(boolean success, String message, Integer affectedCount, Integer successCount, Integer failureCount) {
        this(success, message, affectedCount, null, null, successCount, failureCount, successCount, failureCount);
    }
}
