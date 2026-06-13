package com.scoreassistant.application.agent;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import com.scoreassistant.adapter.in.web.dto.agui.AguiChatRequest;
import java.util.List;

/**
 * Interface representing a task-specific AI Agent compatible with the AGUI runtime.
 */
public interface AguiAgent {

    /**
     * Unique identifier for the Agent (e.g. "attendance-agent").
     */
    String getId();

    /**
     * Gets the configured ChatClient for this Agent.
     */
    ChatClient getChatClient();

    /**
     * Gets the raw ChatModel for this Agent to handle custom tool execution loops.
     */
    ChatModel getChatModel();

    /**
     * Computes the system instruction block for the agent run, dynamically injecting
     * context from the front-end readables.
     */
    String getSystemInstruction(AguiChatRequest request);

    /**
     * Gets the list of backend tools (Beans with @Tool methods) available to this Agent.
     */
    List<Object> getTools();
}
