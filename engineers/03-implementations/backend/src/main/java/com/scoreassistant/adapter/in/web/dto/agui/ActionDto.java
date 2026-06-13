package com.scoreassistant.adapter.in.web.dto.agui;

/**
 * DTO representing frontend-executable actions/tools registered in the client.
 */
public record ActionDto(
    String name,
    String description,
    Object parameters
) {}
