package com.scoreassistant.adapter.in.web.rest.agui;

import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.ai.chat.model.ChatModel;

import java.io.IOException;
import java.net.Socket;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class LmStudioIntegrationTest {

    @Autowired(required = false)
    private ChatModel chatModel;

    @Test
    void testLmStudioConnection() {
        // Only run this test if LM Studio is actually running locally on port 1234
        Assumptions.assumeTrue(isLmStudioRunning(), "LM Studio is not running on localhost:1234. Skipping test.");
        
        assertThat(chatModel).isNotNull();
        
        String response = chatModel.call("Hello! Please respond with exactly the word 'Success'.");
        System.out.println("LM Studio Response: " + response);
        assertThat(response).isNotNull().containsIgnoringCase("Success");
    }

    private boolean isLmStudioRunning() {
        try (Socket socket = new Socket("localhost", 1234)) {
            return true;
        } catch (IOException e) {
            return false;
        }
    }
}
