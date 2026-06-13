package com.scoreassistant.adapter.in.web.dto.agui;

import java.util.List;

/**
 * Request payload sent by the AGUI client.
 */
public record AguiChatRequest(
    List<ChatMessageDto> messages,
    List<ReadableDto> frontendReadables,
    List<ActionDto> frontendActions,
    String threadId,
    String runId
) {
    public AguiChatRequest(List<ChatMessageDto> messages, List<ReadableDto> frontendReadables, List<ActionDto> frontendActions) {
        this(messages, frontendReadables, frontendActions, null, null);
    }
}
