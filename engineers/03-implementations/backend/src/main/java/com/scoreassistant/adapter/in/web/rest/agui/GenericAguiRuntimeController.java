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
            return errorResponse(444, "Agent not found: " + agentId);
        }

        AguiChatRequest request;
        try {
            request = parseChatRequest(root);
        } catch (Exception e) {
            log.error("Failed to map request body to DTO: {}", e.getMessage());
            return errorResponse(400, "Failed to deserialize request: " + e.getMessage());
        }

        log.info("Received AGUI chat request for agentId: '{}', threadId: '{}', runId: '{}'", 
                agentId, request.threadId(), request.runId());
        log.info("Raw request body: {}", root.toString());
        log.info("Received payload counts - Messages: {}, Context variables: {}, Registered tools: {}",
                request.messages() != null ? request.messages().size() : 0,
                request.context() != null ? request.context().size() : 0,
                request.tools() != null ? request.tools().size() : 0);

        if (isWelcomeRequest(request)) {
            return welcomeResponse(agent, request);
        }

        try {
            Prompt prompt = buildPrompt(agent, request);
            Flux<ServerSentEvent<AguiEvent>> sseStream = executeAgentStream(agent, request, prompt);
            return ResponseEntity.ok()
                    .contentType(MediaType.TEXT_EVENT_STREAM)
                    .body(sseStream);
        } catch (Exception e) {
            log.error("Fatal exception during agent chat setup: ", e);
            return errorResponse(500, "Failed to start agent session: " + e.getMessage());
        }
    }

    private AguiChatRequest parseChatRequest(JsonNode root) throws Exception {
        if (root.has("body") && (root.has("method") || root.has("params"))) {
            return objectMapper.treeToValue(root.get("body"), AguiChatRequest.class);
        } else {
            return objectMapper.treeToValue(root, AguiChatRequest.class);
        }
    }

    private boolean isWelcomeRequest(AguiChatRequest request) {
        return request.messages() == null || request.messages().isEmpty();
    }

    private ResponseEntity<Object> welcomeResponse(AguiAgent agent, AguiChatRequest request) {
        String finalThreadId = request.threadId() != null ? request.threadId() : UUID.randomUUID().toString();
        String finalRunId = request.runId() != null ? request.runId() : UUID.randomUUID().toString();
        String messageId = "msg-" + UUID.randomUUID().toString();

        log.info("Empty messages payload. Returning instant welcome response for agentId: '{}'", agent.getId());
        Flux<ServerSentEvent<AguiEvent>> welcomeFlux = Flux.just(
            AguiEvent.RunStarted.of(finalThreadId, finalRunId),
            AguiEvent.TextMessageStart.of(messageId, "assistant"),
            AguiEvent.TextMessageContent.of(messageId, agent.getWelcomeMessage()),
            AguiEvent.TextMessageEnd.of(messageId),
            AguiEvent.RunFinished.of(finalThreadId, finalRunId)
        );
        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_EVENT_STREAM)
                .body(welcomeFlux);
    }

    private ResponseEntity<Object> errorResponse(int status, String message) {
        return ResponseEntity.status(status).body(Map.of(
            "type", "RUN_ERROR",
            "message", message
        ));
    }

    private Prompt buildPrompt(AguiAgent agent, AguiChatRequest request) {
        // 1. Build dynamic system prompt using the agent's base instructions + readables context
        StringBuilder systemPrompt = new StringBuilder(agent.getSystemInstruction(request));
        if (request.context() != null && !request.context().isEmpty()) {
            systemPrompt.append("\n\n當前網頁狀態資料 (Current Frontend Readables Context):\n");
            for (ContextDto readable : request.context()) {
                systemPrompt.append(String.format("- %s: %s\n", readable.description(), readable.value()));
                log.debug("Bound frontend context readable: '{}' = '{}'", readable.description(), readable.value());
            }
        }

        // 2. Map conversation history from request DTOs to Spring AI Messages
        List<Message> messages = new ArrayList<>();
        messages.add(new SystemMessage(systemPrompt.toString()));
        
        Map<String, String> toolCallIdToName = new HashMap<>();

        if (request.messages() != null) {
            int lastIndex = request.messages().size() - 1;
            for (int i = 0; i < request.messages().size(); i++) {
                ChatMessageDto msg = request.messages().get(i);
                Message mapped = null;
                boolean isLast = (i == lastIndex);
                
                if ("user".equals(msg.getRole())) {
                    mapped = mapUserMessage(msg, isLast);
                } else if ("assistant".equals(msg.getRole())) {
                    mapped = mapAssistantMessage(msg, toolCallIdToName);
                } else if ("tool".equals(msg.getRole())) {
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
            for (FrontendToolDto action : request.tools()) {
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

        return new Prompt(messages, options);
    }

    private Flux<ServerSentEvent<AguiEvent>> executeAgentStream(AguiAgent agent, AguiChatRequest request, Prompt prompt) {
        String finalThreadId = request.threadId() != null ? request.threadId() : UUID.randomUUID().toString();
        String finalRunId = request.runId() != null ? request.runId() : UUID.randomUUID().toString();
        String baseMessageId = "msg-" + UUID.randomUUID().toString();
        String reasoningMessageId = baseMessageId + "-reasoning";
        String textMessageId = baseMessageId + "-text";
        // Keep track of tool calling state for this stream to ensure starts/args/ends are emitted correctly
        Set<String> seenToolCalls = new HashSet<>();
        Set<String> completedToolCalls = new HashSet<>();
        Map<String, String> sentArguments = new HashMap<>();
        Map<Integer, String> indexToToolCallId = new HashMap<>();
        boolean[] hasStartedReasoning = {false};
        boolean[] hasStartedText = {false};

        // Stream the execution flow via raw ChatModel to prevent auto backend execution
        Flux<ChatResponse> responseFlux = agent.getChatModel().stream(prompt);

        // Translate ChatResponse stream chunks into EventType events
        Flux<ServerSentEvent<AguiEvent>> eventFlux = responseFlux.concatMap(chatResponse -> {
            Generation gen = chatResponse.getResult();
            if (gen == null) {
                return Flux.empty();
            }

            List<ServerSentEvent<AguiEvent>> events = new ArrayList<>();

            // If model executes a tool call, yield tool call start and incremental args events
            AssistantMessage assistantMessage = gen.getOutput();
            if (assistantMessage != null && assistantMessage.getToolCalls() != null && !assistantMessage.getToolCalls().isEmpty()) {
                List<AssistantMessage.ToolCall> toolCalls = assistantMessage.getToolCalls();
                for (int i = 0; i < toolCalls.size(); i++) {
                    AssistantMessage.ToolCall toolCall = toolCalls.get(i);
                    String rawId = toolCall.id();
                    String toolCallId = (rawId != null && !rawId.isEmpty()) ? rawId :
                            indexToToolCallId.computeIfAbsent(i, idx -> "call-idx-" + idx + "-" + UUID.randomUUID().toString());

                    // Emit TOOL_CALL_START if not seen before
                    if (!seenToolCalls.contains(toolCallId)) {
                        seenToolCalls.add(toolCallId);
                        sentArguments.put(toolCallId, "");
                        log.info("LLM tool call start: name={}, toolCallId={}", toolCall.name(), toolCallId);
                        events.add(AguiEvent.ToolCallStart.of(toolCallId, toolCall.name()));
                    }

                    // Emit incremental TOOL_CALL_ARGS delta
                    String fullArgs = toolCall.arguments() != null ? toolCall.arguments() : "";
                    String alreadySent = sentArguments.getOrDefault(toolCallId, "");
                    if (fullArgs.length() > alreadySent.length() && fullArgs.startsWith(alreadySent)) {
                        String delta = fullArgs.substring(alreadySent.length());
                        sentArguments.put(toolCallId, fullArgs);
                        log.info("[DEBUG-TOOL-ARGS] toolCall='{}' toolCallId='{}' accumulatedArgs='{}'",
                                toolCall.name(), toolCallId, fullArgs);
                        events.add(AguiEvent.ToolCallArgs.of(toolCallId, delta));
                    }
                }
            }

            // Yield reasoning text chunk event (if present)
            if (gen.getOutput() != null && gen.getOutput().getMetadata() != null) {
                log.trace("Generation metadata keys: {}", gen.getOutput().getMetadata().keySet());
                Object reasoningObj = gen.getOutput().getMetadata().get("reasoningContent");
                if (reasoningObj == null) {
                    reasoningObj = gen.getOutput().getMetadata().get("reasoning_content");
                }
                if (reasoningObj instanceof String reasoningText && !reasoningText.isEmpty()) {
                    if (!hasStartedReasoning[0]) {
                        hasStartedReasoning[0] = true;
                        log.info("LLM reasoning start: messageId={}", reasoningMessageId);
                        events.add(AguiEvent.ReasoningStart.of(reasoningMessageId));
                        events.add(AguiEvent.ReasoningMessageStart.of(reasoningMessageId));
                    }
                    log.debug("LLM streamed reasoning content chunk: '{}'", reasoningText);
                    events.add(AguiEvent.ReasoningMessageContent.of(reasoningMessageId, reasoningText));
                }
            }

            // Yield standard text chunk event
            String content = gen.getOutput().getText();
            if (content != null && !content.isEmpty()) {
                if (content.contains("<think>") || content.contains("<|channel>thought")) {
                    content = content.replace("<think>", "").replace("<|channel>thought", "");
                    hasStartedReasoning[0] = true;
                    log.info("LLM reasoning start: messageId={}", reasoningMessageId);
                    events.add(AguiEvent.ReasoningStart.of(reasoningMessageId));
                    events.add(AguiEvent.ReasoningMessageStart.of(reasoningMessageId));
                }
                if (content.contains("</think>") || content.contains("<channel|>")) {
                    content = content.replace("</think>", "").replace("<channel|>", "");
                    hasStartedReasoning[0] = false;
                    log.info("LLM reasoning end: messageId={}", reasoningMessageId);
                    events.add(AguiEvent.ReasoningMessageEnd.of(reasoningMessageId));
                    events.add(AguiEvent.ReasoningEnd.of(reasoningMessageId));
                }

                if (hasStartedReasoning[0]) {
                    if (!content.isEmpty()) {
                        events.add(AguiEvent.ReasoningMessageContent.of(reasoningMessageId, content));
                    }
                } else {
                    if (!hasStartedText[0]) {
                        hasStartedText[0] = true;
                        log.info("LLM text start: messageId={}", textMessageId);
                        events.add(AguiEvent.TextMessageStart.of(textMessageId, "assistant"));
                    }
                    if (!content.isEmpty()) {
                        events.add(AguiEvent.TextMessageContent.of(textMessageId, content));
                    }
                }
            }

            return Flux.fromIterable(events);
        });

        // Helper to generate END events for any uncompleted tool calls and reasoning
        Mono<List<ServerSentEvent<AguiEvent>>> finalEventsMono = Mono.fromCallable(() -> {
            List<ServerSentEvent<AguiEvent>> endEvents = new ArrayList<>();
            for (String toolCallId : seenToolCalls) {
                if (!completedToolCalls.contains(toolCallId)) {
                    completedToolCalls.add(toolCallId);
                    log.info("LLM tool call end: toolCallId={}", toolCallId);
                    endEvents.add(AguiEvent.ToolCallEnd.of(toolCallId));
                }
            }
            if (hasStartedReasoning[0]) {
                hasStartedReasoning[0] = false;
                log.info("LLM reasoning end: messageId={}", reasoningMessageId);
                endEvents.add(AguiEvent.ReasoningMessageEnd.of(reasoningMessageId));
                endEvents.add(AguiEvent.ReasoningEnd.of(reasoningMessageId));
            }
            if (hasStartedText[0]) {
                hasStartedText[0] = false;
                log.info("LLM text end: messageId={}", textMessageId);
                endEvents.add(AguiEvent.TextMessageEnd.of(textMessageId));
            }
            return endEvents;
        });

        return Flux.concat(
            Flux.just(AguiEvent.RunStarted.of(finalThreadId, finalRunId)),
            eventFlux,
            finalEventsMono.flatMapMany(Flux::fromIterable),
            Flux.just(AguiEvent.RunFinished.of(finalThreadId, finalRunId))
        )
        .doOnComplete(() -> log.info("AGUI Event Stream completed successfully for runId: '{}'", finalRunId))
        .doOnCancel(() -> log.info("AGUI Event Stream was cancelled (client disconnected) for runId: '{}'", finalRunId))
        .onErrorResume(throwable -> {
            log.warn("Exception caught in AGUI Event Stream for runId '{}': {}", finalRunId, throwable.getMessage());
            // Stream failed is often thrown at the end of the stream by Spring AI when parsing
            // LM Studio's usage stats chunk. Fallback gracefully to RUN_FINISHED.
            if (throwable.getMessage() != null && 
                (throwable.getMessage().contains("Stream failed") || throwable.getMessage().contains("Connection closed"))) {
                log.info("Handling expected LM Studio stream end exception. Gracefully completing with RUN_FINISHED.");
                return Flux.just(AguiEvent.RunFinished.of(finalThreadId, finalRunId));
            }
            log.error("Fatal exception in AGUI Event Stream:", throwable);
            return Flux.just(AguiEvent.RunError.of("An error occurred during agent execution: " + throwable.getMessage()));
        });
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

    private Message mapUserMessage(ChatMessageDto msg, boolean isLast) {
        String content = msg.getContent();
        if (isLast) {
            content = "<|think|>\n" + content;
            log.debug("Injected <|think|> token into the LAST user message: '{}'", content);
        } else {
            log.debug("Added User message to prompt context: '{}'", content);
        }
        return new UserMessage(content);
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
        
        String toolName = "";
        if (msg.getName() != null) {
            toolName = msg.getName();
            toolCallIdToName.put(toolCallId, toolName);
        } else {
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
