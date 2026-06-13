package com.scoreassistant.adapter.in.web.rest.agui;

import com.scoreassistant.adapter.in.web.dto.agui.*;
import com.scoreassistant.application.agent.AguiAgent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.chat.messages.*;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
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
        this.objectMapper = objectMapper != null ? objectMapper.copy() : new ObjectMapper();
        this.objectMapper.configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        for (AguiAgent agent : agents) {
            this.agentRegistry.put(agent.getId(), agent);
        }
    }

    /**
     * Handles the handshake 'info' request to retrieve agent metadata.
     * Accessible via both GET and POST requests.
     */
    @RequestMapping(value = "/{agentId}/chat/info", method = {RequestMethod.GET, RequestMethod.POST})
    public ResponseEntity<Object> handleHandshakeInfo(
            @PathVariable("agentId") String agentId) {
        AguiAgent agent = agentRegistry.get(agentId);
        if (agent == null) {
            log.error("Handshake failed: Agent '{}' not found", agentId);
            return ResponseEntity.status(444).body(Map.of(
                "type", "RUN_ERROR",
                "message", "Agent not found: " + agentId
            ));
        }

        log.info("Received AGUI handshake 'info' request for agentId: '{}'", agentId);
        Map<String, Object> infoResponse = Map.of(
            "version", "1.0",
            "mode", "sse",
            "agents", Map.of(
                "default", Map.of(
                    "description", agent.getId() + " assistant",
                    "capabilities", Map.of()
                ),
                agentId, Map.of(
                    "description", agent.getId() + " assistant",
                    "capabilities", Map.of()
                )
            )
        );
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .body(infoResponse);
    }

    /**
     * Streams the agent's thoughts, text, and tool calls back to the client using
     * standard AGUI protocol Server-Sent Events (SSE).
     */
    @PostMapping(value = "/{agentId}/chat")
    public ResponseEntity<Object> handleAgentChat(
            @PathVariable("agentId") String agentId,
            @RequestBody String requestBodyJson) {

        // Parse JSON node
        JsonNode root;
        try {
            root = objectMapper.readTree(requestBodyJson);
        } catch (Exception e) {
            log.error("Failed to parse request JSON payload: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                "type", "RUN_ERROR",
                "message", "Failed to parse request payload: " + e.getMessage()
            ));
        }

        // Check if handshake request
        if (root.has("method") && "info".equals(root.get("method").asText())) {
            return handleHandshakeInfo(agentId);
        } else {
            return handleAgentChatExecution(agentId, root);
        }
    }

    private ResponseEntity<Object> handleAgentChatExecution(String agentId, JsonNode root) {
        AguiAgent agent = agentRegistry.get(agentId);
        if (agent == null) {
            log.error("Agent execution failed: Agent '{}' not found", agentId);
            return ResponseEntity.status(444).body(Map.of(
                "type", "RUN_ERROR",
                "message", "Agent not found: " + agentId
            ));
        }

        // Deserialize request body
        AguiChatRequest request;
        try {
            if (root.has("body") && (root.has("method") || root.has("params"))) {
                request = objectMapper.treeToValue(root.get("body"), AguiChatRequest.class);
            } else {
                request = objectMapper.treeToValue(root, AguiChatRequest.class);
            }
        } catch (Exception e) {
            log.error("Failed to map request body to DTO: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                "type", "RUN_ERROR",
                "message", "Failed to deserialize request: " + e.getMessage()
            ));
        }

        log.info("Received AGUI chat request for agentId: '{}', threadId: '{}', runId: '{}'", 
                agentId, request.threadId(), request.runId());
        log.info("Received payload counts - Messages: {}, Context variables: {}, Registered tools: {}",
                request.messages() != null ? request.messages().size() : 0,
                request.context() != null ? request.context().size() : 0,
                request.tools() != null ? request.tools().size() : 0);

        try {
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

            // If messages is empty, return a quick welcome message immediately without calling the LLM
            if (request.messages() == null || request.messages().isEmpty()) {
                String welcomeText = "您好！我是您的成績輸入助教。請選擇班級與學期，並告訴我您想登錄的學生成績（例如：「座號 01 期中考 90分」），我會為您自動比對並登錄。";
                ServerSentEvent<Object> welcomeEvent = ServerSentEvent.builder()
                        .data(Map.of(
                            "type", "TEXT_MESSAGE_CHUNK",
                            "messageId", messageId,
                            "delta", welcomeText
                        ))
                        .build();
                ServerSentEvent<Object> runFinishedEvent = ServerSentEvent.builder()
                        .data(Map.of(
                            "type", "RUN_FINISHED",
                            "threadId", finalThreadId,
                            "runId", finalRunId,
                            "outcome", Map.of("type", "success")
                        ))
                        .build();
                log.info("Empty messages payload. Returning instant welcome response for agentId: '{}'", agentId);
                return ResponseEntity.ok()
                        .contentType(MediaType.TEXT_EVENT_STREAM)
                        .body(Flux.just(runStartedEvent, welcomeEvent, runFinishedEvent));
            }

            // 1. Build dynamic system prompt using the agent's base instructions + readables context
            StringBuilder systemPrompt = new StringBuilder(agent.getSystemInstruction(request));
            if (request.context() != null && !request.context().isEmpty()) {
                systemPrompt.append("\n\n當前網頁狀態資料 (Current Frontend Readables Context):\n");
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

            // 3. Configure the chat options and bind registered tools (backend tools + frontend dynamic tools)
            List<org.springframework.ai.tool.ToolCallback> toolsList = new ArrayList<>();
            if (agent.getTools() != null) {
                for (Object tool : agent.getTools()) {
                    if (tool instanceof org.springframework.ai.tool.ToolCallback) {
                        toolsList.add((org.springframework.ai.tool.ToolCallback) tool);
                    }
                }
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

            OpenAiChatOptions options = OpenAiChatOptions.builder()
                    .toolCallbacks(toolsList)
                    .build();

            Prompt prompt = new Prompt(messages, options);

            // 4. Stream the execution flow via raw ChatModel to prevent auto backend execution
            Flux<ChatResponse> responseFlux = agent.getChatModel().stream(prompt);

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

            Flux<ServerSentEvent<Object>> resultFlux = Flux.concat(
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

            return ResponseEntity.ok()
                    .contentType(MediaType.TEXT_EVENT_STREAM)
                    .body(resultFlux);

        } catch (Exception e) {
            log.error("Fatal exception during agent chat setup: ", e);
            return ResponseEntity.status(500).body(Map.of(
                "type", "RUN_ERROR",
                "message", "Failed to start agent session: " + e.getMessage()
            ));
        }
    }

    @GetMapping(value = "/{agentId}/chat/threads")
    public ResponseEntity<Object> handleGetThreads(
            @PathVariable("agentId") String agentId,
            @RequestParam(value = "agentId", required = false) String queryAgentId) {
        log.info("Received GET threads request for agentId: '{}', queryAgentId: '{}'", agentId, queryAgentId);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("threads", List.of()));
    }

    @PostMapping(value = "/{agentId}/chat/threads")
    public ResponseEntity<Object> handleCreateThread(
            @PathVariable("agentId") String agentId) {
        String threadId = UUID.randomUUID().toString();
        log.info("Received POST create thread request for agentId: '{}'. Generated threadId: '{}'", agentId, threadId);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("threadId", threadId));
    }

    @RequestMapping(value = "/{agentId}/chat/threads/{threadId}/**", method = {RequestMethod.POST, RequestMethod.PATCH, RequestMethod.DELETE})
    public ResponseEntity<Object> handleThreadMutations(
            @PathVariable("agentId") String agentId,
            @PathVariable("threadId") String threadId) {
        log.info("Received thread mutation request for agentId: '{}', threadId: '{}'", agentId, threadId);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("ok", true));
    }
}
