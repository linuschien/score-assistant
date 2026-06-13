package com.scoreassistant.adapter.in.web.dto.agui;

/**
 * DTO representing a single message turn in the conversation history.
 */
public record ChatMessageDto(
    String role,
    String content
) {}
