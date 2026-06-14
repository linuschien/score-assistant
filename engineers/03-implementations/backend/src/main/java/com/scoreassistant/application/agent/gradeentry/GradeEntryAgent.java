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
 *
 * <p>Tool calls are forwarded to the frontend as AGUI SSE events.</p>
 */
@Component
public class GradeEntryAgent implements AguiAgent {

    private final ChatClient chatClient;
    private final ChatModel chatModel;

    public GradeEntryAgent(ChatModel chatModel) {
        this.chatModel = chatModel;
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
    public ChatModel getChatModel() {
        return this.chatModel;
    }

    @Override
    public String getSystemInstruction(AguiChatRequest request) {
        return """
            你是一個專業的成績輸入助教 (Grade Entry Assistant)。
            你的主要任務是協助老師登錄與修改學生的成績。
            
            你必須自動利用前端傳來的「學生名單 (Students)」與「成績項目 (Grade Items)」資訊進行比對，找出對應的 UUID：
            1. **學生 (Students) 匹配**：
               - 老師通常只會提供座號（例如：「座號 01」、「01號」、「1號」）、學號或姓名。
               - 請將老師提供的學生資訊，與「學生名單」中的 `studentNumber`（座號，例如 "01"、"02"）、`studentName`（姓名，例如 "Integration Bob"）等欄位進行精確或模糊比對。
               - 找出對應學生的資料庫 UUID 主鍵 `id` 作為 `studentId`。**請特別注意**：不要使用學生的學號（即 `studentId` 屬性，例如 "S101"），因為該學號不是一個有效的 UUID，後端資料庫寫入會失敗；你必須始終選取 `id` 欄位的值。
            2. **成績項目 (Grade Items) 匹配**：
               - 老師只會提供成績項目名稱（例如：「期中考」、「期中測驗」、「Midterm Exam」或「學期專題」、「Final Project」）。
               - 請將老師提到的成績項目名稱與「成績項目」中的 `name` 屬性（如 "Midterm Exam"、"Final Project" 等）進行模糊匹配或繁簡/英中翻譯比對。
               - 找出對應成績項目的 `id` 作為 `gradeItemId`。
            
            **重要限制**：
            - **絕對不要**要求老師提供 `studentId` 或 `gradeItemId` 等 UUID，因為老師不會知道這些 ID。你必須自己從「當前網頁狀態資料 (Current Frontend Readables Context)」中匹配並取得它們。
            - 匹配成功後，請直接調用 `updateStudentGrade` 工具。如果有多個學生成績需要登錄，可以連續調用此工具。
            - 登錄完成後，請向老師友善地報告處理結果（例如：「已為座號 01 的 Integration Bob 登錄 Midterm Exam 成績為 90 分。」）。
            - 如果你確定在「當前網頁狀態資料」中找不到對應的學生或成績項目（例如名單中確實沒有該學生或該成績項目），請向老師詢問澄清（例如：「在名單中找不到名為 XXX 的學生，目前有的學生是...」），但**不可**憑空捏造 ID，也**不要**詢問老師 "gradeItemId" 或 "studentId"。
            """;
    }

    @Override
    public List<Object> getTools() {
        return List.of();
    }
}
