package com.scoreassistant.adapter.in.web.rest.agui;

import com.scoreassistant.adapter.in.web.dto.agui.*;
import com.scoreassistant.application.agent.AguiAgent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.ai.chat.messages.*;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
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
        log.info("Raw request body: {}", root.toString());
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
                String welcomeText = agent.getWelcomeMessage();
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
            
            Map<String, String> toolCallIdToName = new HashMap<>();

            if (request.messages() != null) {
                for (ChatMessageDto msg : request.messages()) {
                    Message mapped = null;
                    if ("user".equalsIgnoreCase(msg.getRole())) {
                        mapped = mapUserMessage(msg);
                    } else if ("assistant".equalsIgnoreCase(msg.getRole())) {
                        mapped = mapAssistantMessage(msg, toolCallIdToName);
                    } else if ("tool".equalsIgnoreCase(msg.getRole())) {
                        mapped = mapToolMessage(msg, toolCallIdToName);
                    } else {
                        log.debug("Skipping unknown role '{}' message", msg.getRole());
                    }
                    if (mapped != null) {
                        messages.add(mapped);
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

            // Build ChatOptions via agent implementation to remain LLM provider agnostic
            ChatOptions options = agent.getChatOptions(toolsList);

            Prompt prompt = new Prompt(messages, options);

            // Keep track of tool calling state for this stream to ensure starts/args/ends are emitted correctly
            Set<String> seenToolCalls = new java.util.concurrent.ConcurrentSkipListSet<>();
            Map<String, String> sentArguments = new java.util.concurrent.ConcurrentHashMap<>();
            Set<String> completedToolCalls = new java.util.concurrent.ConcurrentSkipListSet<>();
            Map<Integer, String> indexToToolCallId = new java.util.concurrent.ConcurrentHashMap<>();

            // 4. Stream the execution flow via raw ChatModel to prevent auto backend execution
            Flux<ChatResponse> responseFlux = agent.getChatModel().stream(prompt);

            // 5. Translate ChatResponse stream chunks into EventType events
            Flux<ServerSentEvent<Object>> eventFlux = responseFlux.flatMap(chatResponse -> {
                Generation gen = chatResponse.getResult();
                if (gen == null) {
                    return Flux.empty();
                }

                List<ServerSentEvent<Object>> events = new ArrayList<>();

                // If model executes a tool call, yield tool call start and incremental args events
                AssistantMessage assistantMessage = gen.getOutput();
                if (assistantMessage != null && assistantMessage.getToolCalls() != null && !assistantMessage.getToolCalls().isEmpty()) {
                    List<AssistantMessage.ToolCall> toolCalls = assistantMessage.getToolCalls();
                    for (int i = 0; i < toolCalls.size(); i++) {
                        AssistantMessage.ToolCall toolCall = toolCalls.get(i);
                        String rawId = toolCall.id();
                        String toolCallId;
                        if (rawId != null && !rawId.isEmpty()) {
                            toolCallId = rawId;
                        } else {
                            toolCallId = indexToToolCallId.computeIfAbsent(i, idx -> "call-idx-" + idx + "-" + UUID.randomUUID().toString());
                        }

                        // Emit TOOL_CALL_START if not seen before
                        if (!seenToolCalls.contains(toolCallId)) {
                            seenToolCalls.add(toolCallId);
                            sentArguments.put(toolCallId, "");
                            log.info("LLM tool call start: name={}, toolCallId={}", toolCall.name(), toolCallId);
                            events.add(ServerSentEvent.builder()
                                    .data(Map.of(
                                        "type", "TOOL_CALL_START",
                                        "toolCallId", toolCallId,
                                        "toolCallName", toolCall.name()
                                    ))
                                    .build());
                        }

                        // Emit incremental TOOL_CALL_ARGS delta
                        String fullArgs = toolCall.arguments() != null ? toolCall.arguments() : "";
                        String alreadySent = sentArguments.getOrDefault(toolCallId, "");
                        if (fullArgs.length() > alreadySent.length() && fullArgs.startsWith(alreadySent)) {
                            String delta = fullArgs.substring(alreadySent.length());
                            sentArguments.put(toolCallId, fullArgs);
                            events.add(ServerSentEvent.builder()
                                    .data(Map.of(
                                        "type", "TOOL_CALL_ARGS",
                                        "toolCallId", toolCallId,
                                        "delta", delta
                                    ))
                                    .build());
                        }
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

            // Helper to generate TOOL_CALL_END events for any uncompleted tool calls
            Mono<List<ServerSentEvent<Object>>> toolCallEndEventsMono = Mono.fromCallable(() -> {
                List<ServerSentEvent<Object>> endEvents = new ArrayList<>();
                for (String toolCallId : seenToolCalls) {
                    if (!completedToolCalls.contains(toolCallId)) {
                        completedToolCalls.add(toolCallId);
                        log.info("LLM tool call end: toolCallId={}", toolCallId);
                        endEvents.add(ServerSentEvent.builder()
                                .data(Map.of(
                                    "type", "TOOL_CALL_END",
                                    "toolCallId", toolCallId
                                ))
                                .build());
                    }
                }
                return endEvents;
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
                toolCallEndEventsMono.flatMapMany(Flux::fromIterable),
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

    private Message mapUserMessage(ChatMessageDto msg) {
        log.debug("Added User message to prompt context: '{}'", msg.getContent());
        return new UserMessage(msg.getContent());
    }

    private Message mapAssistantMessage(ChatMessageDto msg, Map<String, String> toolCallIdToName) {
        String assistantContent = msg.getContent() != null ? msg.getContent() : "";
        if (msg.getToolCalls() != null && !msg.getToolCalls().isEmpty()) {
            List<AssistantMessage.ToolCall> springToolCalls = new ArrayList<>();
            for (ChatMessageDto.ToolCallDto tc : msg.getToolCalls()) {
                String tcType = tc.getType() != null ? tc.getType() : "function";
                String tcName = tc.getFunction() != null ? tc.getFunction().getName() : "";
                String tcArgs = tc.getFunction() != null ? tc.getFunction().getArguments() : "{}";
                springToolCalls.add(new AssistantMessage.ToolCall(tc.getId(), tcType, tcName, tcArgs));
                toolCallIdToName.put(tc.getId(), tcName);
                log.debug("Parsed tool call in assistant message: id={}, name={}", tc.getId(), tcName);
            }
            
            log.debug("Added Assistant message with {} tool calls: '{}'", springToolCalls.size(), assistantContent);
            return AssistantMessage.builder()
                    .content(assistantContent)
                    .toolCalls(springToolCalls)
                    .build();
        } else {
            if (assistantContent.isBlank()) {
                log.debug("Skipping blank assistant message (no text, no tool calls)");
                return null;
            }
            log.debug("Added Assistant message to prompt context: '{}'", assistantContent);
            return new AssistantMessage(assistantContent);
        }
    }

    private Message mapToolMessage(ChatMessageDto msg, Map<String, String> toolCallIdToName) {
        String toolCallId = msg.getToolCallId();
        if (toolCallId == null) {
            log.warn("Skipping 'tool' message because tool_call_id is null: content='{}'", msg.getContent());
            return null;
        }
        String toolName = msg.getName();
        if (toolName == null || toolName.isEmpty()) {
            toolName = toolCallIdToName.getOrDefault(toolCallId, "");
        }
        String responseContent = msg.getContent() != null ? msg.getContent() : "";
        
        ToolResponseMessage.ToolResponse toolResponse = new ToolResponseMessage.ToolResponse(toolCallId, toolName, responseContent);
        log.debug("Added ToolResponseMessage: id={}, name={}, content='{}'", toolCallId, toolName, responseContent);
        return ToolResponseMessage.builder()
                .responses(List.of(toolResponse))
                .build();
    }
}
