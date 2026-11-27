# Training handoff (2026-11-24 22:4x)
Done today:
- vrt_prod_training_v1.html (production/audit training, keys vrtp_*), card + nav tab on ac_audit_platform_v1.html
- Both training pages: year select on 月份記錄 (VY()), new 📈 年度比對 tab (multi-year, month range, KPIs, 4 SVG charts). Archive keys vrt3_archive_/vrtp_archive_.
Paul's next asks (22:29):
1. PPT/PDF/photos as evidence → already supported (📎); PPT pages not rendered (could convert to images).
2. Continuous swipe through records in keynote (whole year).
3. Add 受訓員工 (employee IDs) per record; link to PSJHR employee card; PSJHR card gets 培訓 tab (HR + production separate); stats page (times per person, courses, who missed required).
Sources found (computer NOT linked; use Gmail saintdou@gmail.com):
- Production monthly reports 2025 Mar–Dec: subject "Monthly VRT Production-Quality Training Report for <Month>-2025" (Hao SreyNeang / Malen). Dec thread 19b7c6f746f1f9f6 has full-year xlsx "VRT Production-Quality Training Report 2025.xlsx" + "Training Record for December-2025.rar" (6 PDFs: cover, photo page, handwritten sign-in sheet with 工號/姓名/部門). Extracted to /home/claude/ptr2/.
- HR: "HR training Report for Dec-2025" (19b9cacacbddedc0), "VRT Monthly Training on Feb/Mar-2025" (Phary), "Training Report" 19897694a140da6a, "FW: Training Reportfor July 2025".
Plan: import 2025 Aug–Dec production rows from full-year xlsx; attach PDFs as evidence; read handwritten IDs from sign-in sheets, validate against PSJHR roster (ID+name), mark uncertain; then build 受訓員工 field + PSJHR training tab.

## 22:5x update
- Computer linked (Windows "pw", user psjwe). Granted: C:\Users\psjwe\Downloads. Other drive (ALL / VRT folders) NOT granted: D:\ request refused (letter unknown) → ask Paul to add that folder via desktop app "Add folder".
- Downloads has training files under 08_EMAIL_郵件附件/admin_行政人事郵件/compliance/training audit/ (prod 2025/2026 xlsx, Training Record Dec-2025/Jan-2026/Feb-2026 .rar = PDFs with photos + handwritten sign-in sheets, HR Training Jan-2026 rar/pdf, Security, First Aid) and 01_Production_生產類/03_ProductionReports_生產計畫與報告/VRT HR TRAINING SCHEDULE 2026.xlsx (HR monthly Jan–Oct 2026), 02_ADMIN.../10. VRT HR Training October-2026.pptx.
- Imported: production 2025-08..2026-02 (+37, now 83) via ACAuto; HR 2026-03..10 (+84, now 105) via syncToGAS + ACAuto. Converter /home/claude/tools/trconv.py.
- Fixed: domain localStorage FULL (5.24M chars) → prod page now stores vrtp_* in IndexedDB 'vrtp_store' via Storage.prototype shim; save() blocked until VRTP_READY; ACAuto init after READY. VY() moved into main script (init renderPills was throwing).
- HR page still on localStorage (vrt3_*) + GAS sheet; works because it reloads from GAS. Consider same shim.
- Next: attach PDFs as evidence, read sign-in sheets → 受訓員工, PSJHR 培訓 tab, keynote continuous scroll.

## 23:3x update
- Granted folders now: C:\Users\psjwe\Downloads, C:\all, C:\VRT.
  - C:\all\close drop\HR\Others\<year>\ : HR training schedules 2020–2025 ("VRT TRAINING SCHEDULE BY PAUL <year>.xlsx") + monthly training PDFs (photos/sign-in).
  - C:\all\close drop\Production\Others\2025\ : production training PDFs (per course) + report xlsx versions.
  - C:\all\VRT26\2603\HR03\ (2026 monthly folders), C:\all\vrt new 2026\, C:\all\view by AI\ : HR TRAINING SCHEDULE 2026 copies.
  - C:\VRT\outlook 2026\*.pst : Outlook archives (2026 mail; production training Mar–Nov 2026 likely here). Not parsed yet (need pst reader, e.g. pip libpff/readpst).
- Imported HR history 2022-05..2025-03 (+132; HR now 30 months). HR 2025 Apr–Dec not found yet (not in Gmail as xlsx).
- Cambodia law page: version/update history (lawVersionBox), Khmer mode (ខ្មែរ button; textKH/summaryKH/nameKH fields), IndexedDB store 'law_store', API lawUpsert/lawAddUpdate/lawMarkChecked. Seeded: labor updates (2026 MW $210 Prakas 214/25; Apr-2026 +$2.50 allowance; 2027 MW $212 Prakas 226/26), Investment Law 1994 as superseded history.
- Scheduled task trig_01AXoWtri1waZRNjxvowWJie "柬埔寨法律月度自動更新（每月 3 日）" 13:17 Phnom Penh, bound to laptop, auto approval, push notify.
- Still TODO: per-law/per-item incremental sync (ACAuto uploads whole key when changed); sign-in sheet → 受訓員工; PSJHR 培訓 tab; keynote continuous scroll; attach PDFs as evidence; HR page IDB shim (vrt3_*).

## 2026-11-27 09:xx：人資培訓資料遺失→已找回
- 現象：Paul 看到只剩 2026 1–2 月。雲端（GAS getAll）也只剩 2026-01:13、02:8；ACAuto kv 的 backup:training（11/21）也只有這兩月。
- 原因：網域 localStorage 滿（5,242,455 字元）→ vrt3_* 存不進去，重新整理後回到舊資料，TRAuto 自動同步把短的那份推回雲端。
- 修正：vrt_training_v1.html 加 IndexedDB 墊片（vrt3_store，vrt3_cfg／vrt3_year 留 localStorage）、save/load/TRAuto 都等 VRT3_READY（commit 9ab4d85）。
- 找回：/home/claude/ptr2/up_hr_hist.json（2022-05..2025-03，132 筆）＋ up_hr.json（2026-03..10，84 筆）重新匯入並 syncToGAS；雲端現 30 個月。生產培訓頁沒受影響（2025-01..2026-02 都在）。
- 仍缺（PC 與 Gmail 都沒有排程表 xlsx，只有月報 PDF）：HR 2024-07..12、2025-04..12、2023-07..12、2022-10/12。要補得從 PDF（簽到表）人工整理。
