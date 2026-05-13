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
   - **`hexagonal-service-manifest-schema.yaml`**：標準化的六角架構微服務清單 (Hexagonal Microservice Manifest) Schema 定義。它強制執行 Ports 與 Adapters 的嚴格驗證，確保所有的介面與外部實作均遵守架構規範。

## 🤖 Agent Workflows (.agents/workflows/)

Workflows 是 Agent 的操作指引，負責編排與轉換不同階段的設計規格：

- **/behavior-architect**：資深 SDD 架構師，專精於事件驅動架構 (EDA) 與六角架構 (Hexagonal Architecture) 的 BDD 生成。
- **/domain-modeler**：系統分析師，專注於領域建模 (Domain Modeling)。
- **/product-owner**：專業產品負責人，專精於將功能需求解構為結構化的 User Stories，並彙整統一的領域術語表 (Domain Glossary) 作為唯一真相來源 (Source of Truth)。
- **/sequence-architect**：動態流程架構師，使用嚴格定義的介面契約將 BDD 場景轉化為時序圖 (Sequence Diagrams)。
- **/spring-backend-engineer**：Spring 認證專業工程師，專精於使用 Spring Boot、WebFlux 與 Spring Data R2DBC 進行響應式後端開發 (Reactive Backend Development)。
- **/system-architect**：高階編排器，能同時將 UML 模型轉換為 OpenAPI 契約、DBML 資料庫 Schema，以及 PlantUML 介面契約 (`*_contract.puml`)。

## 🛠️ Agent Skills (.agents/skills/)

Skills 是提供給 Agent 的特定專項能力模組：

- **bdd-generator**：將需求轉換為 Gherkin 特性文件 (Features) 的邏輯引擎，並具備 EDA 架構感知能力。
- **contract-generator**：將 Entity/Repository 詮釋資料轉換為 PlantUML 介面契約 (`*_contract.puml`) 的確定性生成器。強制執行 Onion Architecture 層邊界、CQRS 命令/查詢分離，並強制生成 `RestController`（REST 異動）、`GraphQLResolver`（集合查詢）與 `Repository` 介面定義。選用的 `Service` 介面遵循相同層級契約。
- **dbml-generator**：將 API/Entity 詮釋資料轉換為 DBML 的確定性生成器。強制執行 UUID 主鍵、關聯表級聯刪除 (Cascade Deletes)，以及基礎設施欄位的自動注入。
- **diagram-parser**：針對 PlantUML 內容的高精度轉譯器。透過識別 `<<Entity>>` 資源提取 API 詮釋資料，鎖定 `<<Repository>>` 介面動詞，並將關聯映射到 URI 層級結構。
- **oas-generator**：將 API 詮釋資料轉換為 OpenAPI 3.1 YAML 的確定性生成器。強制執行回傳碼、Payload 範例、PATCH/PUT 並發控制與 GraphQL 重定向的嚴格標準。
***
