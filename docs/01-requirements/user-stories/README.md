# User Stories 索引 (Index)

> 系統：Score Assistant — 學生成績登記系統  
> 建立日期：2026-05-10  
> 版本：v1.0.0

---

## 總覽

| 編號 | 模組 | 描述 | 檔案 |
|------|------|------|------|
| US-01 | 學期管理 | 建立、查看、編輯、刪除學期 | [US-01-semester-management.md](./US-01-semester-management.md) |
| US-02 | 班級管理 | 在學期內建立、管理班級 | [US-02-class-management.md](./US-02-class-management.md) |
| US-03 | 學生管理 | 匯入、新增、管理班級學生名單 | [US-03-student-management.md](./US-03-student-management.md) |
| US-04 | 成績項目管理 | 建立出席、作業、報告等成績項目 | [US-04-grade-item-management.md](./US-04-grade-item-management.md) |
| US-05 | 成績登記 | 為學生登記各項目分數與查看成績 | [US-05-grade-recording.md](./US-05-grade-recording.md) |
| US-06 | 附件管理 | 為作業/報告項目上傳與管理附件 | [US-06-grade-attachment-management.md](./US-06-grade-attachment-management.md) |
| US-07 | 成績權重管理 | 設定與調整各成績項目的權重 | [US-07-grade-weight-management.md](./US-07-grade-weight-management.md) |
| US-08 | 加權總分與匯出 | 計算加權總分、統計摘要、匯出報表 | [US-08-weighted-score-and-export.md](./US-08-weighted-score-and-export.md) |

---

## 系統角色 (Actors)

| 角色 | 描述 |
|------|------|
| **教師 (Teacher)** | 系統的主要使用者，負責管理學期、班級、學生與所有成績相關操作 |

---

## 成績項目類型定義

| 類型代碼 | 顯示名稱 | 說明 |
|----------|----------|------|
| `ATTENDANCE` | 出缺席 | 記錄學生到課狀態（出席/缺席/請假） |
| `CLASSROOM_PERFORMANCE` | 課堂表現 | 課堂參與度、發言、態度等質性評分 |
| `ASSIGNMENT` | 作業 | 每次指定作業的繳交與評分 |
| `REPORT` | 報告 | 期中/期末報告或專題成果 |
| `OTHER` | 其他 | 不屬於上述類型的其他評量項目 |

---

## 核心業務流程

```
建立學期 → 建立班級 → 匯入學生名單
                    ↓
              建立成績項目（含類型與日期）
                    ↓
              設定各項目權重
                    ↓
              登記學生成績 / 上傳附件
                    ↓
         計算加權總分 → 查看統計摘要 → 匯出報表
```
