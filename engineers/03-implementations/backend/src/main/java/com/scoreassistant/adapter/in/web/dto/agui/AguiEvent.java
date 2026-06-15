package com.scoreassistant.adapter.in.web.dto.agui;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.http.codec.ServerSentEvent;

/**
 * Interface representing a strongly-typed AGUI Server-Sent Event payload.
 */
public sealed interface AguiEvent permits
        AguiEvent.RunStarted,
        AguiEvent.TextMessageChunk,
        AguiEvent.ToolCallStart,
        AguiEvent.ToolCallArgs,
        AguiEvent.ToolCallEnd,
        AguiEvent.RunFinished,
        AguiEvent.RunError {

    @JsonProperty("type")
    String type();

    record RunStarted(
            String type,
            String threadId,
            String runId
    ) implements AguiEvent {
        public static ServerSentEvent<AguiEvent> of(String threadId, String runId) {
            return ServerSentEvent.<AguiEvent>builder(new RunStarted("RUN_STARTED", threadId, runId)).build();
        }
    }

    record TextMessageChunk(
            String type,
            String messageId,
            String delta
    ) implements AguiEvent {
        public static ServerSentEvent<AguiEvent> of(String messageId, String delta) {
            return ServerSentEvent.<AguiEvent>builder(new TextMessageChunk("TEXT_MESSAGE_CHUNK", messageId, delta)).build();
        }
    }

    record ToolCallStart(
            String type,
            String toolCallId,
            String toolCallName
    ) implements AguiEvent {
        public static ServerSentEvent<AguiEvent> of(String toolCallId, String toolCallName) {
            return ServerSentEvent.<AguiEvent>builder(new ToolCallStart("TOOL_CALL_START", toolCallId, toolCallName)).build();
        }
    }

    record ToolCallArgs(
            String type,
            String toolCallId,
            String delta
    ) implements AguiEvent {
        public static ServerSentEvent<AguiEvent> of(String toolCallId, String delta) {
            return ServerSentEvent.<AguiEvent>builder(new ToolCallArgs("TOOL_CALL_ARGS", toolCallId, delta)).build();
        }
    }

    record ToolCallEnd(
            String type,
            String toolCallId
    ) implements AguiEvent {
        public static ServerSentEvent<AguiEvent> of(String toolCallId) {
            return ServerSentEvent.<AguiEvent>builder(new ToolCallEnd("TOOL_CALL_END", toolCallId)).build();
        }
    }

    record RunFinished(
            String type,
            String threadId,
            String runId,
            Outcome outcome
    ) implements AguiEvent {
        public record Outcome(String type) {}
        
        public static ServerSentEvent<AguiEvent> of(String threadId, String runId) {
            return ServerSentEvent.<AguiEvent>builder(new RunFinished("RUN_FINISHED", threadId, runId, new Outcome("success"))).build();
        }
    }

    record RunError(
            String type,
            String message
    ) implements AguiEvent {
        public static ServerSentEvent<AguiEvent> of(String message) {
            return ServerSentEvent.<AguiEvent>builder(new RunError("RUN_ERROR", message)).build();
        }
    }
}
