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
                List.of(),
                "t1",
                "r1"
        );

        // Act & Assert
        webTestClient.post()
                .uri("/api/agui/test-agent/chat")
                .bodyValue(request)
                .exchange()
                .expectStatus().isOk()
                .expectHeader().contentType("text/event-stream;charset=UTF-8")
                .expectBodyList(Map.class)
                .value(events -> {
                    assertThat(events).hasSize(4);
                    assertThat(events.get(0).get("type")).isEqualTo("RUN_STARTED");
                    assertThat(events.get(0).get("threadId")).isEqualTo("t1");
                    assertThat(events.get(0).get("runId")).isEqualTo("r1");

                    assertThat(events.get(1).get("type")).isEqualTo("TEXT_MESSAGE_CHUNK");
                    assertThat(events.get(1).get("delta")).isEqualTo("Hello");

                    assertThat(events.get(2).get("type")).isEqualTo("TEXT_MESSAGE_CHUNK");
                    assertThat(events.get(2).get("delta")).isEqualTo(" world");

                    assertThat(events.get(3).get("type")).isEqualTo("RUN_FINISHED");
                    assertThat(events.get(3).get("threadId")).isEqualTo("t1");
                    assertThat(events.get(3).get("runId")).isEqualTo("r1");
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
                List.of(),
                "t1",
                "r1"
        );

        // Act & Assert
        webTestClient.post()
                .uri("/api/agui/test-agent/chat")
                .bodyValue(request)
                .exchange()
                .expectStatus().isOk()
                .expectBodyList(Map.class)
                .value(events -> {
                    assertThat(events).hasSize(5);
                    assertThat(events.get(0).get("type")).isEqualTo("RUN_STARTED");
                    
                    assertThat(events.get(1).get("type")).isEqualTo("TOOL_CALL_START");
                    assertThat(events.get(1).get("toolCallName")).isEqualTo("fetchWeather");

                    assertThat(events.get(2).get("type")).isEqualTo("TOOL_CALL_ARGS");
                    assertThat(events.get(2).get("delta")).isEqualTo("{\"city\":\"Taipei\"}");

                    assertThat(events.get(3).get("type")).isEqualTo("TOOL_CALL_END");
                    assertThat(events.get(4).get("type")).isEqualTo("RUN_FINISHED");
                });
    }

    @Test
    void shouldRegisterFrontendActionsAsDynamicTools() {
        // Arrange
        ChatClient.ChatClientRequestSpec mockRequestSpec = mock(ChatClient.ChatClientRequestSpec.class);
        ChatClient.StreamResponseSpec mockResponseSpec = mock(ChatClient.StreamResponseSpec.class);

        when(mockChatClient.prompt()).thenReturn(mockRequestSpec);
        when(mockRequestSpec.messages(anyList())).thenReturn(mockRequestSpec);
        when(mockRequestSpec.tools(any(Object[].class))).thenReturn(mockRequestSpec);
        when(mockRequestSpec.stream()).thenReturn(mockResponseSpec);

        ChatResponse resp1 = mockChatResponse("Hello");
        when(mockResponseSpec.chatResponse()).thenReturn(Flux.just(resp1));

        // Create an ActionDto representing a frontend action
        ActionDto action = new ActionDto(
                "updateStudentGrade",
                "Updates a score",
                Map.of("type", "object", "properties", Map.of("score", Map.of("type", "number")))
        );

        AguiChatRequest request = new AguiChatRequest(
                List.of(new ChatMessageDto("user", "hi")),
                List.of(),
                List.of(action)
        );

        // Act
        webTestClient.post()
                .uri("/api/agui/test-agent/chat")
                .bodyValue(request)
                .exchange()
                .expectStatus().isOk();

        // Assert that requestSpec.tools was called to register the frontend action
        verify(mockRequestSpec).tools(any(Object[].class));
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
