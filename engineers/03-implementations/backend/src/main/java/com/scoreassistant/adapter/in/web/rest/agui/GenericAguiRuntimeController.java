package com.scoreassistant.adapter.in.web.rest.agui;

import com.scoreassistant.adapter.in.web.dto.agui.*;
import com.scoreassistant.application.agent.AguiAgent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.*;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;

import org.springframework.beans.factory.annotation.Autowired;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Controller exposing the generic AGUI protocol runtime endpoint.
 * Dispatches agent executions dynamically by agentId and handles SSE streaming.
 */
@RestController
@RequestMapping("/api/agui")
public class GenericAguiRuntimeController {

    private static final Logger log = LoggerFactory.getLogger(GenericAguiRuntimeController.class);

    private final Map<String, AguiAgent> agentRegistry = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper;

    public GenericAguiRuntimeController(List<AguiAgent> agents, @Autowired(required = false) ObjectMapper objectMapper) {
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
        for (AguiAgent agent : agents) {
            this.agentRegistry.put(agent.getId(), agent);
        }
    }

    /**
     * Streams the agent's thoughts, text, and tool calls back to the client using
     * standard AGUI protocol Server-Sent Events (SSE).
     */
    @PostMapping(value = "/{agentId}/chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<Object>> handleAgentChat(
            @PathVariable("agentId") String agentId,
            @RequestBody AguiChatRequest request) {

        // Validate agent ID to prevent traversal or access issues
        AguiAgent agent = agentRegistry.get(agentId);
        if (agent == null) {
            log.error("Agent execution failed: Agent '{}' not found", agentId);
            return Flux.just(ServerSentEvent.builder()
                    .data(Map.of(
                        "type", "RUN_ERROR",
                        "message", "Agent not found: " + agentId
                    ))
                    .build());
        }

        log.info("Received AGUI chat request for agentId: '{}', threadId: '{}', runId: '{}'", 
                agentId, request.threadId(), request.runId());
        log.info("Received payload counts - Messages: {}, Context variables: {}, Registered tools: {}",
                request.messages() != null ? request.messages().size() : 0,
                request.context() != null ? request.context().size() : 0,
                request.tools() != null ? request.tools().size() : 0);

        try {
            // 1. Build dynamic system prompt using the agent's base instructions + readables context
            StringBuilder systemPrompt = new StringBuilder(agent.getSystemInstruction(request));
            if (request.context() != null && !request.context().isEmpty()) {
                systemPrompt.append("\n\n當前網頁狀態資料 (Current Frontend Readables Context)：\n");
                for (ReadableDto readable : request.context()) {
                    systemPrompt.append(String.format("- %s: %s\n", readable.description(), readable.value()));
                    log.debug("Bound frontend context readable: '{}' = '{}'", readable.description(), readable.value());
                }
            }

            // 2. Map conversation history from request DTOs to Spring AI Messages
            List<Message> messages = new ArrayList<>();
            messages.add(new SystemMessage(systemPrompt.toString()));
            if (request.messages() != null) {
                for (ChatMessageDto msg : request.messages()) {
                    if ("user".equalsIgnoreCase(msg.role())) {
                        messages.add(new UserMessage(msg.content()));
                        log.debug("Added User message to prompt context: '{}'", msg.content());
                    } else if ("assistant".equalsIgnoreCase(msg.role())) {
                        messages.add(new AssistantMessage(msg.content()));
                        log.debug("Added Assistant message to prompt context: '{}'", msg.content());
                    }
                }
            }

            // 3. Configure the chat client and bind registered tools (backend tools + frontend dynamic tools)
            ChatClient chatClient = agent.getChatClient();
            ChatClient.ChatClientRequestSpec requestSpec = chatClient.prompt().messages(messages);

            List<Object> toolsList = new ArrayList<>();
            if (agent.getTools() != null) {
                toolsList.addAll(agent.getTools());
            }

            if (request.tools() != null && !request.tools().isEmpty()) {
                for (ActionDto action : request.tools()) {
                    String inputSchemaJson = "{}";
                    try {
                        if (action.parameters() != null) {
                            inputSchemaJson = objectMapper.writeValueAsString(action.parameters());
                        }
                    } catch (Exception e) {
                        log.warn("Failed to serialize parameters for frontend tool '{}'", action.name(), e);
                    }
                    toolsList.add(new FrontendToolCallback(action.name(), action.description(), inputSchemaJson));
                    log.info("Registered frontend tool: '{}' (params: {})", action.name(), inputSchemaJson);
                }
            }

            if (!toolsList.isEmpty()) {
                requestSpec = requestSpec.tools(toolsList.toArray());
            }

            // Generate ids for protocol compliance
            String finalThreadId = request.threadId() != null ? request.threadId() : UUID.randomUUID().toString();
            String finalRunId = request.runId() != null ? request.runId() : UUID.randomUUID().toString();
            String messageId = "msg-" + UUID.randomUUID().toString();

            // First event: RUN_STARTED
            ServerSentEvent<Object> runStartedEvent = ServerSentEvent.builder()
                    .data(Map.of(
                        "type", "RUN_STARTED",
                        "threadId", finalThreadId,
                        "runId", finalRunId
                    ))
                    .build();

            // 4. Stream the execution flow
            Flux<ChatResponse> responseFlux = requestSpec.stream().chatResponse();

            // 5. Translate ChatResponse stream chunks into EventType events
            Flux<ServerSentEvent<Object>> eventFlux = responseFlux.flatMap(chatResponse -> {
                Generation gen = chatResponse.getResult();
                if (gen == null) {
                    return Flux.empty();
                }

                List<ServerSentEvent<Object>> events = new ArrayList<>();

                // If model executes a tool call, yield tool call start/args/end events
                AssistantMessage assistantMessage = gen.getOutput();
                if (assistantMessage != null && assistantMessage.getToolCalls() != null && !assistantMessage.getToolCalls().isEmpty()) {
                    for (var toolCall : assistantMessage.getToolCalls()) {
                        String toolCallId = toolCall.id() != null ? toolCall.id() : "call-" + UUID.randomUUID().toString();
                        log.info("LLM triggered tool call: name={}, toolCallId={}, args={}", 
                                toolCall.name(), toolCallId, toolCall.arguments());
                        events.add(ServerSentEvent.builder()
                                .data(Map.of(
                                    "type", "TOOL_CALL_START",
                                    "toolCallId", toolCallId,
                                    "toolCallName", toolCall.name()
                                ))
                                .build());
                        events.add(ServerSentEvent.builder()
                                .data(Map.of(
                                    "type", "TOOL_CALL_ARGS",
                                    "toolCallId", toolCallId,
                                    "delta", toolCall.arguments()
                                ))
                                .build());
                        events.add(ServerSentEvent.builder()
                                .data(Map.of(
                                    "type", "TOOL_CALL_END",
                                    "toolCallId", toolCallId
                                ))
                                .build());
                    }
                }

                // Yield standard text chunk event
                String content = gen.getOutput().getText();
                if (content != null && !content.isEmpty()) {
                    log.debug("LLM streamed text content chunk: '{}'", content);
                    events.add(ServerSentEvent.builder()
                            .data(Map.of(
                                "type", "TEXT_MESSAGE_CHUNK",
                                "messageId", messageId,
                                "delta", content
                            ))
                            .build());
                }

                return Flux.fromIterable(events);
            });

            // Last event: RUN_FINISHED
            ServerSentEvent<Object> runFinishedEvent = ServerSentEvent.builder()
                    .data(Map.of(
                        "type", "RUN_FINISHED",
                        "threadId", finalThreadId,
                        "runId", finalRunId,
                        "outcome", Map.of("type", "success")
                    ))
                    .build();

            return Flux.concat(
                Flux.just(runStartedEvent),
                eventFlux,
                Flux.just(runFinishedEvent)
            )
            .doOnComplete(() -> log.info("AGUI Event Stream completed successfully for runId: '{}'", finalRunId))
            .onErrorResume(throwable -> {
                log.warn("Exception caught in AGUI Event Stream for runId '{}': {}", finalRunId, throwable.getMessage());
                // Stream failed is often thrown at the end of the stream by Spring AI when parsing
                // LM Studio's usage stats chunk. Fallback gracefully to RUN_FINISHED.
                if (throwable.getMessage() != null && 
                    (throwable.getMessage().contains("Stream failed") || throwable.getMessage().contains("Connection closed"))) {
                    log.info("Handling expected LM Studio stream end exception. Gracefully completing with RUN_FINISHED.");
                    return Flux.just(ServerSentEvent.builder()
                            .data(Map.of(
                                "type", "RUN_FINISHED",
                                "threadId", finalThreadId,
                                "runId", finalRunId,
                                "outcome", Map.of("type", "success")
                            ))
                            .build());
                }
                log.error("Fatal exception in AGUI Event Stream:", throwable);
                return Flux.just(ServerSentEvent.builder()
                        .data(Map.of(
                            "type", "RUN_ERROR",
                            "message", "An error occurred during agent execution: " + throwable.getMessage()
                        ))
                        .build());
            });

        } catch (Exception e) {
            e.printStackTrace();
            return Flux.just(ServerSentEvent.builder()
                    .data(Map.of(
                        "type", "RUN_ERROR",
                        "message", "Failed to start agent session: " + e.getMessage()
                    ))
                    .build());
        }
    }
}
