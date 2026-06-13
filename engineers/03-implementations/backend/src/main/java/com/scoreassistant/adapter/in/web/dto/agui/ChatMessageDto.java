package com.scoreassistant.adapter.in.web.dto.agui;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * DTO representing a single message turn in the conversation history.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record ChatMessageDto(
    String role,
    String content
) {}
