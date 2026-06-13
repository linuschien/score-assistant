package com.scoreassistant.application.agent.gradeentry;

import com.scoreassistant.application.agent.AguiAgent;
import com.scoreassistant.adapter.in.web.dto.agui.AguiChatRequest;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * AI agent dedicated to assisting teachers with student grade registration and updates.
 * Registered as a Spring bean and routed automatically by GenericAguiRuntimeController.
 */
@Component
public class GradeEntryAgent implements AguiAgent {

    private final ChatClient chatClient;

    public GradeEntryAgent(ChatModel chatModel) {
        this.chatClient = ChatClient.create(chatModel);
    }

    @Override
    public String getId() {
        return "grade-entry-agent";
    }

    @Override
    public ChatClient getChatClient() {
        return this.chatClient;
    }

    @Override
    public String getSystemInstruction(AguiChatRequest request) {
        return """
            你是一個專業的成績輸入助教 (Grade Entry Assistant)。
            你的主要任務是協助老師登錄與修改學生的成績。
            
            你可以使用 `updateStudentGrade` 工具來為特定學生登錄成績：
            - 請利用前端傳來的「學生名單 (Students)」與「成績項目 (Grade Items)」資訊進行比對。
            - 老師可能會提供座號、學號或姓名。請儘可能精確地進行模糊匹配或學號匹配，以找出對應的 `studentId`。
            - 老師提到的成績項目，請與提供的 `gradeItemId` 進行匹配。
            - 匹配成功後，請調用 `updateStudentGrade` 工具。如果有多個學生成績需要登錄，可以連續調用此工具。
            - 登錄完成後，請向老師友善地報告處理結果（例如：「已為座號 01 的 Integration Bob 登錄 Final Project 成績為 85 分。」）。
            
            如果資訊不足（例如找不到對應的學生或成績項目），請詢問老師進行澄清，不要憑空捏造 ID。
            """;
    }

    @Override
    public List<Object> getTools() {
        return List.of();
    }
}
