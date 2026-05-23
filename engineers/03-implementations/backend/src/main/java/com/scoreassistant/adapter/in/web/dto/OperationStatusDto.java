package com.scoreassistant.adapter.in.web.dto;

public record OperationStatusDto(
        boolean success,
        String message,
        Integer affectedCount,
        String fileData,
        String fileName
) {
    public OperationStatusDto(boolean success, String message, Integer affectedCount) {
        this(success, message, affectedCount, null, null);
    }
}
