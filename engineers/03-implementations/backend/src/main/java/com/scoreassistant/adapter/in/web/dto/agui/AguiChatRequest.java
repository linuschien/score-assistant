package com.scoreassistant.adapter.in.web.dto.agui;

import java.util.List;

/**
 * Request payload sent by the AGUI client.
 */
public record AguiChatRequest(
    List<ChatMessageDto> messages,
    List<ReadableDto> context,
    List<ActionDto> tools,
    String threadId,
    String runId
) {
    public AguiChatRequest(List<ChatMessageDto> messages, List<ReadableDto> context, List<ActionDto> tools) {
        this(messages, context, tools, null, null);
    }
}
