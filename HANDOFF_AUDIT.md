# AC Audit 交接筆記（2026-11-13）

給下一個對話用。Paul 只在對話裡回話，所有檔案／平台操作由 AI 做；用繁體中文回覆。

## 現況（都已上線）
- 報告中心：`audit_dashboard_v1.html`（週報／月報、證書、稽核、缺失、培訓、法規、異動、歷史；右上 EN／中文）。
- 共用算法：`assets/ac_audit_engine.js`（網頁和 Apps Script 同一份）。英文層：`assets/ac_audit_dash_en.js`。
- Apps Script 專案 AC_AUDIT_PLATFORM（單一檔 `程式碼.gs`，目前第 27 版，/exec 網址不變）。
  檔案結構＝原程式 ＋ `gas/AC_AUDIT_v4_addon.gs` ＋ `assets/ac_audit_engine.js`。
  更新方法：改 repo → push → 在編輯器分頁用 fetch 從 github.io 抓 addon 與 engine，取代「// AC AUDIT v4 ADDON」那一行的上一行起到檔尾 → Ctrl+S → 部署 › 管理部署作業 › 編輯 › 建立新版本 › 部署。
  注意：原始檔含 bot token，絕不可寫進 repo 或貼出來。雲端工作區連不到 script.google.com，一律從 Chrome 分頁呼叫。
- 智慧匯入（`ac_audit_core.html` › 統一匯入中心）：.msg（含附件）、CAP Excel（版本／最終版／刪除）、培訓 PPT（action `pptImport`：投影片 → 培訓記錄＋照片）、PDF／照片（只看檔名分類，存成 msg 證據）。
- 法規更新：`data/law_updates.json`；每月 3 日 14:43 的排程（AC Audit 法規與驗廠標準每月更新）上網查並 push；Apps Script 每天早上讀它，有新項目就通知群組（action `lawCheck`）。

## Paul 已定的規則
- 證書只管驗廠證書：WRAP、GRS 兩張。WSE 沒有證書。其他政府證照在 HRA 平台證書類別，Audit 只放連結。
- 培訓照他給的排程檔調整；過了月份沒上的課改「取消」（code 4），不算進完成率。
- WSE 2026-09-07 的 5 項缺失已結案（WSE 審核通過，結案日記 11/13，實際通過日未知）。
- Telegram 摘要：固定四區塊、一行一件事、用｜分欄、色條；精簡但不能刪到沒資料。

## 還沒做完
1. WRAP、GRS 2026 年證書的到期日還沒補（平台顯示「到期日待補」）。
2. CAP 信件／Telegram 檔案自動進平台：要加進「Telegram 每日收檔」那個排程。那個排程綁在 Paul 的電腦上，改它的指示要在那台電腦連著的對話裡核可，所以這邊沒改。做法：收到 CAP 相關的 .msg／.xlsx（例如「AU: WSE tech audit」群組、Outlook 的 CAP 信）→ 在 Chrome 開 `ac_audit_core.html#importHub` → 用 file_upload 丟進 `#smartFile` → 讀 `#smartLog` 的結果。
3. Risk assessment：還沒開始。先找雲端硬碟／信件裡現有版本，對照 `data/law_updates.json` 與 WRAP／GRS／WSE 要求列差距；找不到就照工廠現況起草並標「草稿／參考」。
4. PDF／照片匯入後還沒有顯示在各部門分頁（HR／Production／QC），目前只是帶標籤的證據。
5. 報告中心英文版：資料原文（缺失描述、稽核名稱、備註）沒有翻譯；Telegram 報告沒有英文版切換。
6. `vrt_training_v1.html` 的註解裡有舊的 bot token（公開 repo），建議換新 token 並刪掉那段——Paul 還沒決定。
7. Apps Script 有一個失效的觸發器 `pollTelegram`（函式已不存在），可刪。
8. Bot 指令（/week /cap /done …）只在模擬環境測過，還沒在群組實測。
