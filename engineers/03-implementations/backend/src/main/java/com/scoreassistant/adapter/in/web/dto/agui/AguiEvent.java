package com.scoreassistant.adapter.in.web.dto.agui;

/**
 * Standard AGUI Server-Sent Event wrapper payload.
 */
public record AguiEvent(
    String event,
    Object data
) {}
