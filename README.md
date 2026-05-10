# Score Assistant

## 📁 SDD 核心設計目錄結構 (docs/)

### 01-requirements/ (源頭：模糊意圖)
**職責**：存放原始、非結構化的需求。這裡是所有開發動作的起點。
- **PRD/**：存放 Word、PDF 或原始 Markdown 格式的需求說明書。
- **user-stories/**：存放細分的 User Stories 或訪談紀錄。
- **external-specs/**：原始第三方/廠商規格 (如 Modbus, API)。
- **glossary.md**：領域專家詞彙表（確保 AI 在接下來的階段不會產生術語幻覺）。

### 02-design-specs/ (契約：技術硬化)
**職責**：將 01 的意圖轉化為「可驗證」的規格。這是 Agent 的主戰場。

1. **behavior-specs/ (行為契約)**
   - **內容**：BDD 格式的 `.feature` 檔案。
   - **意義**：定義系統的動態邏輯（Given/When/Then），作為測試階段的基準。

2. **uml/ (結構契約)**
   - **內容**：PlantUML (`.puml`) 檔案。
   - **意義**：定義系統骨架，包含類別圖 (Class) 與時序圖 (Sequence)。嚴格遵守 SOLID 原則。

3. **api-contracts/ (外交契約)**
   - **內容**：`openapi.yaml` (Swagger)。
   - **意義**：定義對外窗口。所有 Endpoint、Payload 欄位均鎖死，禁止 AI 自行通靈。

4. **db-schemas/ (持久化契約)**
   - **內容**：`schema.dbml` 或 SQL DDL 腳本。
   - **意義**：定義資料庫表結構、索引與外鍵關係。

5. **ui-schemas/ (介面契約)**
   - **內容**：SDUI 的 JSON Schema 與 Layout 定義。
   - **意義**：定義前端組件的規格，確保 UI 表現的一致性與可預測性。

6. **external-integrations/ (外部系統整合)**
   - **內容**：外部系統的映射與 Mock 規格。
   - **意義**：作為**防腐層 (Anticorruption Layer)**，將廠商雜亂的暫存器 (如 Modbus `0x4001`) 轉換為系統內部的清潔模型 (如 `Grid_Voltage`)。
