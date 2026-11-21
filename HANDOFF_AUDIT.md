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

---
## 2026-11-21 追加：廠規 2027、文件／培訓三方自動同步

Paul 的要求：廠規換成 2027 v5 並可新增刪除編輯儲存、匯入匯出、加照片；DCC 文件群（DCC、外來文件、柬埔寨法律、廠規）在 PSJHR／Audit／Admin OS 任一邊改，其他兩邊同步；培訓加進 HRA Portal，一樣三方同步。

作法＝「一頁、一個雲端、自動同步」：每個頁面只有一份（在 ac-audit），各平台只是開它；頁面自己會自動和雲端合併。沒有改 GAS。

- `VRT_Factory_Rules_2027.html`：Paul 給的 v5 原檔，尾端多掛三支 script。編輯器在 `assets/rules2027_editor.js`。
  - 資料鍵 `vrt_factory_rules_2027`（localStorage＝雲端 AC_AUDIT_DB.tools 同鍵）；沒人改過時不存任何東西，畫面就是 v5 原樣。
  - 結構：`{cover[],preH,pre[],ch[{id,o,h,arts[{id,o,h,cl[{id,o,k:c|t|p,h}]}]}],sig,files[],log[]}`；`o` 是排序值（插入取前後中間值，其他項不動，合併才不會亂）；章名存「不含第幾章」的字，章號條號畫面自動編。
  - **存檔以資料為準，不從畫面抄字**（editor v2）：Paul 的 Chrome 有繁簡／用語轉換類擴充功能，會改畫面上的字（實測 文件→檔案、身分→身份、公布→公佈、雇主→僱主）。v1 從畫面抄字，第一次實測就把 10 款的用字改掉了。現在原文用 fetch 取頁面原始檔（`SRC`），編輯用三語文字框（點任何一段跳出），匯出也從資料產生。
  - 照片壓成 JPEG 內嵌（單張 ≤170KB）；附件走 `uploadAttachment`（module `factory_rules`）。摘要走 `tg`。
  - 舊的 2026 版 `VRT_Factory_Rules_v2.html` 留著當存檔（附件區有連結），WRAP 分頁與 core 的連結都改指 2027。
- `assets/ac_autosync.js`（ACAuto）：開頁 download → `ACTS.sync` → 有差才 upload；本機一變動 4 秒後上傳；90 秒輪詢；回到頁面、連上網時再對一次。
  - 沒同步過但本機有資料的裝置：以雲端為準合併（本機獨有的保留）。
  - 「舊記憶體存檔」保護：雲端新資料進來但頁面還沒重載時，頁面若用舊資料存檔，會用三方合併把它的修改疊回新資料（`rebase()`），不會蓋掉別台的更新。
  - 掛在：`VRT_DCC_v2.html`（`vrt_dcc_v2`）、`MSG_Processor.html`（`msgProcessor_data`）、`cambodia_law_v1.html`（`cambodia_laws_v1`）、廠規 2027、培訓（只用來同步 `vrt3_extra`）。
- `assets/training_autosync.js`（TRAuto）：培訓的 `saveAll` 是整份覆蓋，所以改成「getAll → 逐筆三方合併 → 有差才 saveAll」。
  - 比對只看雲端 Sheet 真的有存的欄位（`cT/cR/cL`）；上次同步的指紋存在 `vrt3_base`。
  - 線上的 GAS getAll 會回記錄的 `evidence`（附件陣列），所以附件跟著主通道走（比對用 driveId）。Sheet 沒有的欄位（traineeKH、下拉選項）另外走 tools 的 `vrt3_extra` 同步。
  - 保險：雲端回來的筆數比上次少一大半就整次不動；沒同步過的裝置不會把「原封不動的預設資料」帶回雲端。
- 各平台入口：PSJHR 選單「文件與培訓」（x-aud-rules／dcc／ext／law／train）；Admin OS `config.js` 廠規改 2027；HRA Portal 首頁多一格「培訓計劃」（`?from=hra` 時返回鈕回 HRA Portal）。
- 薪資架構不在這個 repo：搬到 PSJHR 原生頁 `#salstruct`（見 psjhr README v0.6.0）。

測試：只在模擬雲端（Playwright 攔截 GAS）測過兩台裝置互相新增／修改／刪除、舊裝置不覆蓋、雲端回空不清資料。**還沒在真的 GAS 上實測**（雲端工作區連不到 script.google.com；要等 Paul 的電腦連上 Chrome 才能做）。實測重點：廠規改一款 → 另一台看到；培訓加一筆含附件的記錄 → 另一台看到且 Sheet 沒多出重複列。

### 2026-11-21 實機（Paul 的 Chrome）測到、已修的兩件事
1. 擴充功能會改畫面上的字 → 廠規編輯器 v2 以資料為準（見上）。
2. **這個網域的 localStorage 已滿**（實測 5.19M 字元／365 個鍵；最大的是 `VRT_LAW_OS_OFFLINE_V2` 648K、`vrt_emps` 367K、`pptg_item_*` 332K、`ehs_backup_20261120` 330K）。同步的比對基準存不進去 → 每次都變成「以雲端為準」→ 本機修改被蓋回去。
   - `ac_autosync.js` v3：基準一律存 IndexedDB（DB `ac_auto`，store `kv`，鍵 `base:<key>`）；`store:'idb'` 的頁面（廠規）連資料都在 IndexedDB（`data:<key>`，用 `ACAuto.get/set`）；首次同步的本機備份在 `backup:<key>`。
   - `training_autosync.js`：指紋基準在 `trbase`、首次備份在 `backup:training`（同一個 kv）。
   - 廠規 2027 不再是 ACTS 的 localStorage 工具（已從 `TOOLS` 與各外殼的 `TOOL_KEYS` 拿掉）。
   - localStorage 滿這件事會影響同網域所有平台（存檔可能靜靜失敗），還沒處理，要另外和 Paul 談清理。
