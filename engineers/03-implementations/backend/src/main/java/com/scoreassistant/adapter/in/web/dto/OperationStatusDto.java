package com.scoreassistant.adapter.in.web.dto;

import java.util.List;

public record OperationStatusDto(
        boolean success,
        String message,
        Integer affectedCount,
        String fileData,
        String fileName,
        Integer successCount,
        Integer failureCount,
        List<String> errors
) {
    public OperationStatusDto(boolean success, String message, Integer affectedCount) {
        this(success, message, affectedCount, null, null, null, null, null);
    }

    public OperationStatusDto(boolean success, String message, Integer affectedCount, String fileData, String fileName) {
        this(success, message, affectedCount, fileData, fileName, null, null, null);
    }

    public OperationStatusDto(boolean success, String message, Integer affectedCount, Integer successCount, Integer failureCount) {
        this(success, message, affectedCount, null, null, successCount, failureCount, null);
    }

    public OperationStatusDto(boolean success, String message, Integer affectedCount, Integer successCount, Integer failureCount, List<String> errors) {
        this(success, message, affectedCount, null, null, successCount, failureCount, errors);
    }
}
