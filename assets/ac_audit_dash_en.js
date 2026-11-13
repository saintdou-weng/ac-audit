/* AC Audit 報告中心 · English layer
   畫面先用中文算好，再把看得到的文字換成英文：先套整句規則（RULES），剩下的用詞彙表（DICT，長的先換）。
   資料本身（缺失描述、備註、課名）照原文顯示，不翻譯。 */
var ACR_EN = (function () {
  var N = '(\\d[\\d,]*)';
  var R = [
    [N + ' 月培訓計劃 ' + N + ' 門只做完 ' + N + ' 門（' + N + '%）', 'Month $1 training: only $3 of $2 planned courses done ($4%)'],
    [N + ' 月培訓計劃 ' + N + ' 門做完 ' + N + ' 門（' + N + '%）', 'Month $1 training: $3 of $2 planned courses done ($4%)'],
    [N + ' 月快結束，還有 ' + N + ' 門課沒上', 'Month $1 is ending and $2 courses are still not held'],
    [N + ' 月沒有任何培訓記錄', 'No training records in month $1'],
    ['(\\S+) ?缺失 ' + N + ' 項 CAP 已送出，等稽核方審核', '$1: CAP for $2 findings submitted, waiting for auditor review'],
    ['(\\S+) ?缺失 ' + N + ' 項已過改善期限，平台上還沒有結案記錄', '$1: $2 findings are past the due date with no closure recorded'],
    ['CAP 已送出 ' + N + ' 項（([^）]*)），還沒收到審核結果', 'CAP submitted for $1 findings ($2), no review result yet'],
    ['CAP 已送出 ' + N + ' 項，還沒收到審核結果', 'CAP submitted for $1 findings, no review result yet'],
    ['過期未結的缺失 ' + N + ' 項，最久過 ' + N + ' 天', '$1 findings overdue and open, oldest $2 days late'],
    ['其中 ' + N + ' 項是之前驗廠也被開過的重複缺失', '$1 of them are repeat findings from earlier audits'],
    ['驗廠證書有 ' + N + ' 張到期日待確認', '$1 audit certificates need their expiry date confirmed'],
    ['到期日待確認 ' + N + ' 張', '$1 certificates need an expiry date'],
    ['(\\S+) 證書已過期 ' + N + ' 天', '$1 certificate expired $2 days ago'],
    ['另有 ' + N + ' 張也過期', '$1 more also expired'],
    ['(\\S+) 證書剩 ' + N + ' 天到期', '$1 certificate expires in $2 days'],
    ['(\\S+) 證書 ' + N + ' 天後到期', '$1 certificate expires in $2 days'],
    ['(\\S+) 證書 (\\d{4}-\\d\\d-\\d\\d) 到期，已過 ' + N + ' 天', '$1 certificate expired $2, $3 days ago'],
    ['(\\S+) 證書 (\\d{4}-\\d\\d-\\d\\d) 到期，剩 ' + N + ' 天', '$1 certificate expires $2, $3 days left'],
    ['缺失改善 14 天內到期 ' + N + ' 項', '$1 findings due within 14 days'],
    ['培訓有 ' + N + ' 門課排了沒上、也還沒補', '$1 planned courses were not held and not made up'],
    ['沒上也沒補的課 ' + N + ' 門', '$1 courses not held and not made up'],
    ['培訓 ' + N + ' 場、' + N + ' 人次', 'Training: $1 sessions, $2 attendees'],
    ['培訓記錄只到 (\\S+)，之後 ' + N + ' 天沒有新資料', 'Training records stop at $1; no new data for $2 days'],
    ['培訓記錄停在 (\\S+)', 'Training records stop at $1'],
    ['把 ' + N + ' 月已上的課補進平台（匯入月報 Excel 即可）', 'Add the courses held in month $1 (import the monthly report Excel)'],
    ['管制文件過期 ' + N + ' 份', '$1 controlled documents expired'],
    ['過期文件 ' + N + ' 份', '$1 expired documents'],
    ['排進 ' + N + ' 月，或在計劃表改成取消並寫原因', 'Reschedule to month $1, or mark it cancelled in the plan with a reason'],
    [N + ' 年・' + N + ' 門課・記錄到', '$1 · $2 courses · records to'],
    [N + ' 天內到期 ' + N, 'due in $1 days: $2'],
    ['（第 ' + N + ' 週）', ' (week $1)'],
    [N + ' 年 ' + N + ' 月', '$1-$2'],
    ['過期 ' + N + ' 項・重複 ' + N, '$1 overdue · $2 repeat'],
    ['計劃 ' + N + ' 門・完成 ' + N + '・未上 ' + N, 'Planned $1 · done $2 · not held $3'],
    ['應上 ' + N + ' 門次・已上 ' + N, 'Due $1 · held $2'],
    [N + ' 人次・' + N + ' 小時', '$1 attendees · $2 h'],
    ['到期日待確認 ' + N + ' 張', '$1 to confirm'],
    ['已結 ' + N + ' 項', '$1 closed'],
    ['有效 ' + N + '・90 天內到期 ' + N + '・過期 ' + N + '・待確認 ' + N, 'Valid $1 · due in 90 days $2 · expired $3 · to confirm $4'],
    ['最多列 ' + N + ' 件，照嚴重度排', 'Top $1, by severity'],
    ['過 ' + N + ' 天', '$1 days late'], ['剩 ' + N + ' 天', '$1 days left'], ['過期 ' + N + ' 天', 'expired $1 days'],
    ['培訓照片（' + N + ' 張，點照片看該場次）', 'Training photos ($1, click a photo to open the session)'],
    ['照片（' + N + '）', 'Photos ($1)'], ['CAP 版本記錄（' + N + '）', 'CAP versions ($1)'],
    ['的場次（' + N + ' 場・' + N + ' 人次）', ' sessions ($1 sessions · $2 attendees)'],
    ['第 ' + N + ' 版', 'rev $1'], [N + ' 人$', '$1 people'], [N + ' 門', '$1 courses'], [N + ' 場', '$1 sessions'], [N + ' 項', '$1 items'], [N + ' 張', '$1'], [N + ' 天', '$1 days'], [N + ' 小時', '$1 h'],
    ['（一）', ' (Mon)'], ['（二）', ' (Tue)'], ['（三）', ' (Wed)'], ['（四）', ' (Thu)'], ['（五）', ' (Fri)'], ['（六）', ' (Sat)'], ['（日）', ' (Sun)']
  ].map(function (x) { return [new RegExp(x[0], 'g'), x[1]]; });

  var D = {
    '還沒有發過報告。按右上「發到群組」就會留下第一份；之後每週一、每月第一個上班日早上': 'No report sent yet. Press "Send to group" to keep the first one; after that every Monday and the first working day of each month at',
    '每次發到群組的週報、月報都留一份，可以回頭核對當時的數字': 'Every weekly and monthly report sent to the group is kept, so you can check the numbers at that time',
    '或照片拖進「統一匯入中心」就會自動掛到對應的場次。': 'or photos into the Import Center and they attach to the matching session.',
    '資料一更新就記在這裡，群組每小時最多通知一次': 'Every data change is logged here; the group is notified at most once an hour',
    '這段期間的場次還沒有照片。把培訓': 'No photos for these sessions yet. Drop the training',
    '政府證照／許可（消防、營運、環保檢測、簽證': 'Government licences / permits (fire, operation, environmental tests, visas',
    '管理，這裡只放驗廠證書': '— only audit certificates are kept here',
    '平台・證書類別': 'platform · Certificates', '…）在': '…) are managed in the', '已核發': 'issued', '沒上': 'Not held', '門課': 'courses', '項': 'items', '場': 'sessions', '計': 'P', '延': 'D', '月': '',
    '追稽核方的審核結果；通過就按結案，被退回就上傳新版': 'Chase the auditor for the result; close when accepted, upload a new version if rejected',
    '已改善的補上證據按結案；還沒好的寫新的完成日': 'Add evidence and close what is fixed; set a new date for the rest',
    '證書和稽核記錄還沒建檔，這份報告只看得到培訓': 'Certificates and audits are not set up yet; this report only shows training',
    '點開每張證書補上新的到期日（附掃描檔）': 'Open each certificate and enter the new expiry date (attach the scan)',
    '平台還沒有證書、稽核結果、缺失的資料': 'No certificate, audit or finding data on the platform yet',
    '照檢查表把文件、現場、訪談先走一遍': 'Run through documents, floor and interviews with the checklist',
    '確認換證進度，把新證書補進平台': 'Check renewal progress and add the new certificate',
    '這週確認換證稽核日期': 'Confirm the renewal audit date this week',
    '改版或延長有效期': 'Revise or extend validity', '沒有到期或逾期的項目': 'Nothing due or overdue', '培訓計劃還沒有資料': 'No training plan data yet',
    '加一句備註到這期報告': 'Add a note to this report', '加一句備註': 'Add a note', '這句話會放在這期報告最上面（網頁和': 'This line goes on top of this report (web and',
    '都會帶），例如突發狀況、客人來廠、稽核改期。': '), e.g. incidents, customer visits, audit rescheduled.',
    '發出後會留在「歷史報告」。同一期重發會標第': 'Kept in History after sending. A resend of the same period is marked rev',
    '存檔後「待確認」會消掉，到期前': 'After saving, "to confirm" clears; before expiry the group is reminded at',
    '天群組會自動提醒。': ' days.', '天。點一列看歷史、補到期日。': ' days. Click a row for history or to enter the expiry date.',
    '距離到期還有多久（滿格': 'Time left to expiry (full bar =', '年），白線是': 'year); the white line is', '色條': 'Bar',
    '追蹤稽核，等客人通知確定日期': 'Follow-up audit; waiting for the customer to confirm the date',
    '今年還沒有這門課的上課記錄': 'No session of this course recorded this year', '再按一次「刪除這版」才會刪': 'Press "Delete this version" again to delete',
    '點課名看這門課歷次上課記錄': 'Click a course to see its sessions', '已存到雲端，報告已重算': 'Saved to cloud, report recalculated',
    '排了沒上、也還沒補的課': 'Planned but not held, not made up', '每月培訓計劃與完成門數': 'Monthly plan vs completed courses',
    '年度培訓已上（門次）': 'Courses held this year', '資料日期：培訓記錄到': 'Data date: training records to', '這段期間沒有培訓記錄': 'No training records in this period',
    '改善內容（最新版）': 'Corrective action (latest)', '數字由系統計算，和': 'Numbers are computed by the system, same as the', '報告同一套算法': 'report',
    '當時發到群組的內容': 'What was sent to the group', '缺失改期限／負責人': 'Finding due date / owner changed', '離線，顯示上次資料': 'Offline, showing last data',
    '只存期限／負責人': 'Save due date / owner only', '各類別年度完成率': 'Completion by category (year)', '已是雲端最新資料': 'Up to date with cloud',
    '年度計劃表（紅框': 'Annual plan (red box', '過了月份還沒上）': 'month passed, not held)', '稽核方要求的改善': 'Required by auditor',
    '說明（做了什麼）': 'Note (what was done)', '備註／部門人數': 'Remarks / by department', '各標準最近一次': 'Latest per standard',
    '同類缺失的歷史': 'History of the same finding', '工廠已做的改善': 'Action taken by factory', '已送出，等審核': 'submitted, waiting for review',
    '年至今的時間軸': 'timeline to date', '沒有未結的缺失': 'No open findings', '發證／稽核單位': 'Issuer / audit firm', '請填標準／名稱': 'Enter standard / name',
    '讀取雲端資料中': 'Loading cloud data', '這場還沒有照片': 'No photos for this session', '還沒有培訓計劃': 'No training plan yet', '還沒有異動記錄': 'No changes yet',
    '還沒有稽核記錄': 'No audits yet', '還沒有證書資料': 'No certificates yet', '重新開啟／修改': 'Reopen / edit', '點照片開原圖。': 'Click a photo for the original.',
    '到期日待確認': 'Expiry to confirm', '到期日待補': 'expiry missing', '完成（門數）': 'Done (courses)', '年度培訓人次': 'Attendees this year', '年度培訓累計': 'Training YTD',
    '新增驗廠證書': 'Add audit certificate', '每月參訓人次': 'Attendees per month', '每月培訓人次': 'Attendees per month', '沒有歷史記錄': 'No history', '沒有缺失記錄': 'No findings',
    '結案或改期限': 'Close or change due date', '缺失重新開啟': 'Finding reopened', '補／改到期日': 'Enter / change expiry', '證書資料更新': 'Certificate updated', '這次開的缺失': 'Findings from this audit',
    '門課・記錄到': 'courses · records to', '點圓點看內容': 'Click a dot for details', '已發到群組': 'Sent to group', '已送出待審': 'Submitted, in review', '新的到期日': 'New expiry date',
    '最終版設為': 'Final version set to', '標準／名稱': 'Standard / name', '沒有到期日': 'No expiry date', '當月完成率': 'Month completion', '稽核時間軸': 'Audit timeline',
    '設為最終版': 'Set as final', '請輸入內容': 'Enter text', '證書待確認': 'Certificate to confirm', '通過／綠燈': 'Pass / green', '連不上雲端': 'Cannot reach cloud',
    '過期未上）': 'overdue, not held)', '還沒有記錄': 'No records yet', '開培訓管理': 'Open Training', '點自動發。': 'sent automatically.', '上課記錄': 'Sessions', '你的名字': 'Your name',
    '全部有效': 'All valid', '其他附件': 'Other files', '刪除這版': 'Delete this version', '原始報告': 'Original report', '同步雲端': 'Sync cloud', '培訓照片': 'Training photos',
    '報告中心': 'Report Center', '場次資料': 'Session', '天內到期': 'days to expiry', '完成門數': 'Courses done', '客人豁免': 'Waived by customer', '改善期限': 'Due date', '新的期限': 'New due date',
    '最新異動': 'Latest changes', '最近稽核': 'Latest audit', '未定期限': 'No due date', '未結缺失': 'Open findings', '柱子上的': 'on the bars', '歷史報告': 'History', '歷次稽核': 'Past audits',
    '每月計劃': 'Monthly plan', '沒有資料': 'No data', '版本記錄': 'Versions', '發到群組': 'Send to group', '發證單位': 'Issuer', '相關稽核': 'Related audit', '確定發出': 'Send now',
    '稽核公司': 'Audit firm', '稽核日期': 'Audit date', '稽核結果': 'Result', '稽核資料': 'Audit', '結果待補': 'result missing', '缺失修改': 'Finding edited', '缺失內容': 'Finding',
    '缺失改善': 'Corrective action', '缺失結案': 'Finding closed', '處理記錄': 'Log', '計劃門數': 'Courses planned', '資料來源': 'Source', '過期缺失': 'Overdue findings',
    '重新讀取': 'Reload', '重新開啟': 'Reopen', '重複缺失': 'Repeat findings', '驗廠證書': 'Audit certificates', '上一期': 'Previous', '下一期': 'Next', '不合格': 'Fail', '儲存中': 'Saving',
    '到期日': 'Expiry', '嚴重度': 'Severity', '報告號': 'Report no.', '已加入': 'Added', '已新增': 'Added', '已更新': 'Updated', '已結案': 'Closed', '已過期': 'Expired', '年計劃': 'plan',
    '待確認': 'to confirm', '快到期': 'Due soon', '接下來': 'Upcoming', '最終版': 'Final', '月培訓': ' training', '未指定': 'Unassigned', '未通過': 'Not passed', '核發日': 'Issue date',
    '發送中': 'Sending', '的場次': ' sessions', '稽核員': 'Auditor', '結案日': 'Closed on', '缺失數': 'Findings', '要處理': 'To do', '證書號': 'Cert no.', '讀取中': 'Loading', '負責人': 'Owner',
    '需改善': 'Needs improvement', '項缺失': 'findings', '人數': 'Attendees', '人次': 'attendees', '今天': 'Today', '來源': 'Source', '來自': 'From', '備註': 'Remarks', '儲存': 'Save',
    '全部': 'All', '列印': 'Print', '刪除': 'Delete', '加入': 'Add', '取消': 'Cancelled', '培訓': 'Training', '場次': 'Sessions', '外訓': 'External', '完成': 'Done', '對象': 'Trainees',
    '小時': 'h', '已上': 'Held', '已結': 'Closed', '延後': 'Postponed', '建檔': 'set up', '待審': 'in review', '待補': 'missing', '應上': 'Due', '手動': 'manual', '打開': 'Open', '新增': 'Add',
    '日期': 'Date', '時數': 'Hours', '時間': 'Time', '月報': 'Monthly', '有效': 'Valid', '未上': 'Not held', '未填': 'Blank', '未定': 'TBD', '未結': 'Open', '本月': 'This month', '本期': 'Now',
    '本週': 'This week', '核發': 'Issued', '檔案': 'File', '正常': 'OK', '歷史': 'History', '注意': 'Watch', '照片': 'Photos', '版本': 'Version', '狀態': 'Status', '現在': 'Now', '現況': 'Current',
    '異動': 'Changes', '當時': 'Then', '發出': 'sent', '稽核': 'Audits', '等級': 'Grade', '範圍': 'Scope', '結果': 'Result', '結案': 'Close', '總覽': 'Overview', '缺失': 'Findings', '缺席': 'Absent',
    '群組': 'group', '自動': 'auto', '計劃': 'Plan', '說明': 'Note', '課程': 'Course', '講師': 'Trainer', '證書': 'Certificates', '變化': 'Change', '豁免': 'Waived', '負責': 'Owner', '送出': 'Submit',
    '通過': 'Passed', '週報': 'Weekly', '過期': 'Overdue', '重複': 'Repeat', '項目': 'Item', '預覽': 'Preview', '頻率': 'Frequency', '類別': 'Category', '初版': 'First version',
    '已更新 ': 'Updated ', '上午': 'AM ', '下午': 'PM ', '例：': 'e.g. ', '缺': 'missing'
  };
  var keys = Object.keys(D).sort(function (a, b) { return b.length - a.length; });
  var CJK = /[一-鿿]/, MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function tr(s) {
    if (!s || !CJK.test(s)) return s;
    var lead = s.match(/^\s*/)[0], tail = s.match(/\s*$/)[0], t = s.trim();
    if (D[t]) return lead + D[t] + tail;
    var cnt = function (x) { return (x.match(/[一-鿿]/g) || []).length; }, c0 = cnt(t), orig = t;
    t = t.replace(/(^|[^\d,、 ])(1[0-2]|[1-9]) ?月(?!培訓|快|沒有|已上)/g, function (m, a, b) { return a + MONTHS[b - 1]; });
    t = t.replace(/(^|\s)(1[0-2]|[1-9]) 月培訓$/, function (m, p, a) { return p + MONTHS[a - 1] + ' training'; });
    for (var i = 0; i < R.length; i++) { t = t.replace(R[i][0], R[i][1]); }
    var ruled = t !== orig;
    if (CJK.test(t)) for (var k = 0; k < keys.length && CJK.test(t); k++) { if (t.indexOf(keys[k]) >= 0) t = t.split(keys[k]).join(' ' + D[keys[k]] + ' '); }
    /* 幾乎沒翻到的就是資料原文（缺失描述、備註…），整句保留原文，不要半中半英 */
    if (!ruled && c0 >= 4 && cnt(t) / c0 >= 0.4) return s;
    t = t.replace(/，/g, ', ').replace(/、/g, ', ').replace(/；/g, '; ').replace(/：/g, ': ').replace(/（/g, ' (').replace(/）/g, ') ').replace(/。/g, '. ').replace(/・/g, ' · ').replace(/｜/g, ' | ').replace(/／/g, ' / ').replace(/「/g, '"').replace(/」/g, '"');
    t = t.replace(/\s{2,}/g, ' ').replace(/\s+([,.;:)])/g, '$1').replace(/\(\s+/g, '(').trim();
    return lead + t + tail;
  }
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, PRE: 1 };
  function apply(root) {
    if (!root) return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), n, list = [];
    while ((n = w.nextNode())) { var p = n.parentNode; if (!p || SKIP[p.nodeName]) continue; if (p.closest && p.closest('[data-raw]')) continue; if (CJK.test(n.nodeValue)) list.push(n); }
    list.forEach(function (x) { x.nodeValue = tr(x.nodeValue); });
    [].forEach.call(root.querySelectorAll ? root.querySelectorAll('[placeholder],[title]') : [], function (el) { ['placeholder', 'title'].forEach(function (a) { var v = el.getAttribute(a); if (v && CJK.test(v)) el.setAttribute(a, tr(v)); }); });
  }
  return { tr: tr, apply: apply };
})();
