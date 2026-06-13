package com.scoreassistant.adapter.in.web.dto.agui;

import java.util.Map;

/**
 * Data payload for tool execution lifecycle events.
 */
public record ToolCallData(
    String toolName,
    String status,
    Map<String, Object> arguments
) {}
