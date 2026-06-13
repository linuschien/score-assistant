package com.scoreassistant.adapter.in.web.rest.agui;

import com.scoreassistant.adapter.in.web.dto.agui.*;
import com.scoreassistant.application.agent.AguiAgent;
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
    public Flux<ServerSentEvent<AguiEvent>> handleAgentChat(
            @PathVariable("agentId") String agentId,
            @RequestBody AguiChatRequest request) {

        // Validate agent ID to prevent traversal or access issues
        AguiAgent agent = agentRegistry.get(agentId);
        if (agent == null) {
            return Flux.just(ServerSentEvent.<AguiEvent>builder()
                    .data(new AguiEvent("error", "Agent not found: " + agentId))
                    .build());
        }

        try {
            // 1. Build dynamic system prompt using the agent's base instructions + readables context
            StringBuilder systemPrompt = new StringBuilder(agent.getSystemInstruction(request));
            if (request.frontendReadables() != null && !request.frontendReadables().isEmpty()) {
                systemPrompt.append("\n\n當前網頁狀態資料 (Current Frontend Readables Context)：\n");
                for (ReadableDto readable : request.frontendReadables()) {
                    systemPrompt.append(String.format("- %s: %s\n", readable.name(), readable.value()));
                }
            }

            // 2. Map conversation history from request DTOs to Spring AI Messages
            List<Message> messages = new ArrayList<>();
            messages.add(new SystemMessage(systemPrompt.toString()));
            if (request.messages() != null) {
                for (ChatMessageDto msg : request.messages()) {
                    if ("user".equalsIgnoreCase(msg.role())) {
                        messages.add(new UserMessage(msg.content()));
                    } else if ("assistant".equalsIgnoreCase(msg.role())) {
                        messages.add(new AssistantMessage(msg.content()));
                    }
                }
            }

            // 3. Configure the chat client and bind registered tools
            ChatClient chatClient = agent.getChatClient();
            ChatClient.ChatClientRequestSpec requestSpec = chatClient.prompt().messages(messages);

            if (agent.getTools() != null && !agent.getTools().isEmpty()) {
                requestSpec = requestSpec.tools(agent.getTools().toArray());
            }

            // 4. Stream the execution flow
            Flux<ChatResponse> responseFlux = requestSpec.stream().chatResponse();

            // 5. Translate ChatResponse stream chunks into AGUI events
            return responseFlux.flatMap(chatResponse -> {
                Generation gen = chatResponse.getResult();
                if (gen == null) {
                    return Flux.empty();
                }

                List<ServerSentEvent<AguiEvent>> events = new ArrayList<>();

                // If model executes a tool call, yield tool_call event
                AssistantMessage assistantMessage = gen.getOutput();
                if (assistantMessage != null && assistantMessage.getToolCalls() != null && !assistantMessage.getToolCalls().isEmpty()) {
                    for (var toolCall : assistantMessage.getToolCalls()) {
                        Map<String, Object> arguments = null;
                        try {
                            arguments = objectMapper.readValue(toolCall.arguments(), new TypeReference<Map<String, Object>>() {});
                        } catch (Exception e) {
                            arguments = Map.of("rawArguments", toolCall.arguments());
                        }
                        ToolCallData toolCallData = new ToolCallData(
                            toolCall.name(),
                            "executing",
                            arguments
                        );
                        events.add(ServerSentEvent.<AguiEvent>builder()
                                .data(new AguiEvent("tool_call", toolCallData))
                                .build());
                    }
                }

                // Yield standard text chunk event
                String content = gen.getOutput().getText();
                if (content != null && !content.isEmpty()) {
                    events.add(ServerSentEvent.<AguiEvent>builder()
                            .data(new AguiEvent("text", content))
                            .build());
                }

                return Flux.fromIterable(events);
            })
            // Stream completed signal
            .concatWith(Flux.just(
                ServerSentEvent.<AguiEvent>builder()
                        .data(new AguiEvent("completed", "Run finished successfully"))
                        .build()
            ))
            .onErrorResume(throwable -> {
                // TODO(security): Log detailed diagnostic securely. Do not leak credentials or sensitive info.
                return Flux.just(ServerSentEvent.<AguiEvent>builder()
                        .data(new AguiEvent("error", "An error occurred during agent execution: " + throwable.getMessage()))
                        .build());
            });

        } catch (Exception e) {
            // TODO(security): Log detailed diagnostic securely
            return Flux.just(ServerSentEvent.<AguiEvent>builder()
                    .data(new AguiEvent("error", "Failed to start agent session: " + e.getMessage()))
                    .build());
        }
    }
}
