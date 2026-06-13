package com.scoreassistant.adapter.in.web.rest.agui;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.scoreassistant.adapter.in.web.dto.agui.*;
import com.scoreassistant.application.agent.AguiAgent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.test.web.reactive.server.WebTestClient;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

class GenericAguiRuntimeControllerTest {

    private WebTestClient webTestClient;
    private AguiAgent mockAgent;
    private ChatClient mockChatClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockAgent = mock(AguiAgent.class);
        mockChatClient = mock(ChatClient.class);
        
        when(mockAgent.getId()).thenReturn("test-agent");
        when(mockAgent.getChatClient()).thenReturn(mockChatClient);
        when(mockAgent.getSystemInstruction(any())).thenReturn("Test system instruction");
        when(mockAgent.getTools()).thenReturn(List.of());

        GenericAguiRuntimeController controller = new GenericAguiRuntimeController(
                List.of(mockAgent),
                objectMapper
        );

        webTestClient = WebTestClient.bindToController(controller).build();
    }

    @Test
    void shouldStreamAguiEvents() {
        // Arrange
        ChatClient.ChatClientRequestSpec mockRequestSpec = mock(ChatClient.ChatClientRequestSpec.class);
        ChatClient.StreamResponseSpec mockResponseSpec = mock(ChatClient.StreamResponseSpec.class);

        when(mockChatClient.prompt()).thenReturn(mockRequestSpec);
        when(mockRequestSpec.messages(anyList())).thenReturn(mockRequestSpec);
        when(mockRequestSpec.stream()).thenReturn(mockResponseSpec);

        ChatResponse resp1 = mockChatResponse("Hello");
        ChatResponse resp2 = mockChatResponse(" world");
        when(mockResponseSpec.chatResponse()).thenReturn(Flux.just(resp1, resp2));

        AguiChatRequest request = new AguiChatRequest(
                List.of(new ChatMessageDto("user", "hi")),
                List.of(),
                List.of()
        );

        // Act & Assert
        webTestClient.post()
                .uri("/api/agui/test-agent/chat")
                .bodyValue(request)
                .exchange()
                .expectStatus().isOk()
                .expectHeader().contentType("text/event-stream;charset=UTF-8")
                .expectBodyList(AguiEvent.class)
                .value(events -> {
                    assertThat(events).hasSize(3);
                    assertThat(events.get(0).event()).isEqualTo("text");
                    assertThat(events.get(0).data()).isEqualTo("Hello");
                    
                    assertThat(events.get(1).event()).isEqualTo("text");
                    assertThat(events.get(1).data()).isEqualTo(" world");
                    
                    assertThat(events.get(2).event()).isEqualTo("completed");
                });
    }

    @Test
    @SuppressWarnings("unchecked")
    void shouldStreamToolCallEvents() {
        // Arrange
        ChatClient.ChatClientRequestSpec mockRequestSpec = mock(ChatClient.ChatClientRequestSpec.class);
        ChatClient.StreamResponseSpec mockResponseSpec = mock(ChatClient.StreamResponseSpec.class);

        when(mockChatClient.prompt()).thenReturn(mockRequestSpec);
        when(mockRequestSpec.messages(anyList())).thenReturn(mockRequestSpec);
        when(mockRequestSpec.stream()).thenReturn(mockResponseSpec);

        ChatResponse resp1 = mockToolCallResponse("fetchWeather", "{\"city\":\"Taipei\"}");
        when(mockResponseSpec.chatResponse()).thenReturn(Flux.just(resp1));

        AguiChatRequest request = new AguiChatRequest(
                List.of(new ChatMessageDto("user", "check weather")),
                List.of(),
                List.of()
        );

        // Act & Assert
        webTestClient.post()
                .uri("/api/agui/test-agent/chat")
                .bodyValue(request)
                .exchange()
                .expectStatus().isOk()
                .expectBodyList(AguiEvent.class)
                .value(events -> {
                    assertThat(events).hasSize(2);
                    assertThat(events.get(0).event()).isEqualTo("tool_call");
                    
                    Map<String, Object> dataMap = objectMapper.convertValue(events.get(0).data(), Map.class);
                    assertThat(dataMap.get("toolName")).isEqualTo("fetchWeather");
                    assertThat(dataMap.get("status")).isEqualTo("executing");
                    
                    Map<String, Object> argsMap = (Map<String, Object>) dataMap.get("arguments");
                    assertThat(argsMap.get("city")).isEqualTo("Taipei");

                    assertThat(events.get(1).event()).isEqualTo("completed");
                });
    }

    private ChatResponse mockChatResponse(String text) {
        ChatResponse response = mock(ChatResponse.class);
        Generation gen = mock(Generation.class);
        AssistantMessage output = mock(AssistantMessage.class);
        
        when(response.getResult()).thenReturn(gen);
        when(gen.getOutput()).thenReturn(output);
        when(output.getText()).thenReturn(text);
        return response;
    }

    private ChatResponse mockToolCallResponse(String toolName, String jsonArguments) {
        ChatResponse response = mock(ChatResponse.class);
        Generation gen = mock(Generation.class);
        AssistantMessage output = mock(AssistantMessage.class);
        AssistantMessage.ToolCall toolCall = new AssistantMessage.ToolCall("call_1", "function", toolName, jsonArguments);
        
        when(response.getResult()).thenReturn(gen);
        when(gen.getOutput()).thenReturn(output);
        when(output.getToolCalls()).thenReturn(List.of(toolCall));
        when(output.getText()).thenReturn("");
        return response;
    }
}
