
// ═══════════════════════════════════════════════════════════════════
// AC AUDIT v4 ADDON — 週報／月報、資料更新通知、bot 問答與調整、報告歷史
// 這一段接在原本的 AC_Audit_Platform_GAS.gs 後面（同一個檔案）。
// 報告數字全部由 ACR（assets/ac_audit_engine.js，同一份程式碼貼在本檔最後）計算，網頁與 Telegram 一致。
// ═══════════════════════════════════════════════════════════════════
var V4_TZ = 'Asia/Phnom_Penh';
var V4_REPORT_URL = 'https://saintdou-weng.github.io/ac-audit/audit_dashboard_v1.html';
function v4Fmt_(d, f) { return Utilities.formatDate(d || new Date(), V4_TZ, f); }
function v4Today_() { return v4Fmt_(new Date(), 'yyyy-MM-dd'); }
function v4AddDays_(ymd, n) { var p = String(ymd).split('-'); var d = new Date(+p[0], +p[1] - 1, +p[2] + n, 12); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
function v4LoadDb_() { try { var raw = getAuditDbFile_().getBlob().getDataAsString() || ''; return raw ? JSON.parse(raw) : {}; } catch (e) { return {}; } }
function v4SaveDb_(db) {
  db.meta = db.meta || {}; db.meta.updatedAt = Date.now(); db.meta.cloudSavedAt = new Date().toISOString();
  getAuditDbFile_().setContent(JSON.stringify(db));
  var props = PropertiesService.getScriptProperties();
  props.setProperty('AC_AUDIT_UPDATED_AT', String(db.meta.updatedAt));
  props.setProperty('AC_AUDIT_LAST_UPLOAD', v4Fmt_(new Date(), 'yyyy-MM-dd HH:mm:ss'));
}
function v4Training_() { try { return getTrainingData_(); } catch (e) { return { trainings: [], records: {} }; } }
function v4WithLock_(fn) { var lock = LockService.getScriptLock(); try { lock.waitLock(20000); } catch (e) {} try { return fn(); } finally { try { lock.releaseLock(); } catch (e2) {} } }

// ── 資料異動 feed ＋ 待通知 ──
function v4FeedEntries_(db, entries, silent) {
  if (!entries || !entries.length) return;
  var now = Date.now(), day = v4Today_(), hm = v4Fmt_(new Date(), 'HH:mm');
  entries.forEach(function (e) { e.at = day; e.time = hm; e.ts = now; });
  db.updates = entries.concat(db.updates || []).slice(0, 200);
  if (silent) return;
  var props = PropertiesService.getScriptProperties(), pend = [];
  try { pend = JSON.parse(props.getProperty('V4_PENDING') || '[]'); } catch (e) { pend = []; }
  pend = pend.concat(entries.map(function (e) { return { icon: e.icon, text: e.text, by: e.by || '' }; })).slice(-40);
  props.setProperty('V4_PENDING', JSON.stringify(pend));
}
var V4_MOD_ICON = { certs: '🏅', audits: '📋', caps: '🛠', assessments: '🧾', wse_assessment: '📋', grs_certs: '🏅', grs_tc: '🏅', grs_suppliers: '🏅', grs_trace: '🏅', documents: '🗄', dcc_control: '🗄', incoming_control: '🗄', policies: '📌', factory_rules: '📕', cambodia_law: '⚖️', incidents: '⚠️', damage_report: '⚠️', msg: '📧', calendar: '📅' };
function v4ModName_(k) { return k === 'certs' ? '驗廠證書' : k === 'calendar' ? '行事曆' : modLabel_(k); }
function v4Strip_(r) { var o = {}; for (var k in r) { if (k.charAt(0) !== '_' && k !== 'photos') o[k] = r[k]; } return JSON.stringify(o); }
/* upload_ 合併後呼叫：比對雲端原本與合併結果，寫入異動 feed */
function v4AfterMerge_(cloud, merged, reason, payload) {
  merged.updates = (cloud && cloud.updates) || merged.updates || [];
  merged.notes = (cloud && cloud.notes) || merged.notes || [];
  /* 嵌入工具資料 (tools)：每個工具留較新的那份，不再被合併丟掉 */
  var tools = {}, ct = (cloud && cloud.tools) || {}, pt = (payload && payload.tools) || {};
  Object.keys(ct).forEach(function (k) { tools[k] = ct[k]; });
  Object.keys(pt).forEach(function (k) { if (!tools[k] || Number(pt[k] && pt[k].updatedAt || 0) >= Number(tools[k].updatedAt || 0)) tools[k] = pt[k]; });
  if (Object.keys(tools).length) merged.tools = tools;
  var entries = [];
  AUDIT_MODULE_KEYS.forEach(function (k) {
    var before = {}, added = [], changed = [];
    ((cloud && cloud[k]) || []).forEach(function (r) { before[recSig_(k, r)] = r; });
    (merged[k] || []).forEach(function (r) { var s = recSig_(k, r); if (!before[s]) added.push(r); else if (v4Strip_(before[s]) !== v4Strip_(r)) changed.push(r); });
    var removed = ((cloud && cloud[k]) || []).length + added.length - (merged[k] || []).length;
    function nm(r) { return String(r.title || r.auditName || r.name || r.description || r.subject || r.standard || r.docNo || r.id || '').slice(0, 28); }
    if (added.length) entries.push({ mod: k, icon: V4_MOD_ICON[k] || '📄', text: v4ModName_(k) + ' 新增 ' + added.length + ' 筆' + (added.length <= 3 ? '：' + added.map(nm).join('、') : '（' + nm(added[0]) + ' 等）'), by: reason || '' });
    if (changed.length) entries.push({ mod: k, icon: V4_MOD_ICON[k] || '📄', text: v4ModName_(k) + ' 修改 ' + changed.length + ' 筆' + (changed.length <= 3 ? '：' + changed.map(nm).join('、') : ''), by: reason || '' });
    if (removed > 0) entries.push({ mod: k, icon: '🗑', text: v4ModName_(k) + ' 刪除 ' + removed + ' 筆', by: reason || '' });
  });
  if (entries.length) v4FeedEntries_(merged, entries);
}
/* saveTrainingData_ 存檔後呼叫 */
function v4TrainingDiff_(old, data) {
  if (!old) return;
  var entries = [], oldRec = old.records || {}, newRec = data.records || {};
  var months = {}; Object.keys(oldRec).forEach(function (m) { months[m] = 1; }); Object.keys(newRec).forEach(function (m) { months[m] = 1; });
  function sig(r) { return [r.date, String(r.subject || '').toLowerCase().trim(), r.time].join('|'); }
  Object.keys(months).sort().forEach(function (m) {
    var o = {}, added = [], n = (newRec[m] || []); (oldRec[m] || []).forEach(function (r) { o[sig(r)] = 1; });
    n.forEach(function (r) { if (!o[sig(r)]) added.push(r); });
    var removed = (oldRec[m] || []).length + added.length - n.length;
    if (added.length) entries.push({ mod: 'training', icon: '🎓', text: '培訓記錄 ' + m + ' 新增 ' + added.length + ' 場' + (added.length <= 3 ? '：' + added.map(function (r) { return String(r.date).slice(5) + ' ' + String(r.subject).slice(0, 24) + '（' + (r.attendees || 0) + ' 人）'; }).join('、') : '') });
    if (removed > 0) entries.push({ mod: 'training', icon: '🎓', text: '培訓記錄 ' + m + ' 移除 ' + removed + ' 場（重複或更正）' });
  });
  var oldT = {}, cells = 0, names = {}; (old.trainings || []).forEach(function (t) { oldT[t.id] = t; });
  (data.trainings || []).forEach(function (t) { var b = oldT[t.id]; if (!b) return; for (var i = 1; i <= 12; i++) { var x = +((b.months || {})[i] || 0), y = +((t.months || {})[i] || 0); if (x !== y) { cells++; names[t.nameZH || t.nameEN] = 1; } } });
  if (cells) entries.push({ mod: 'training', icon: '🎓', text: '培訓計劃表更新 ' + cells + ' 格（' + Object.keys(names).length + ' 門課的狀態）' });
  var added = (data.trainings || []).length - (old.trainings || []).length;
  if (added > 0) entries.push({ mod: 'training', icon: '🎓', text: '培訓計劃新增 ' + added + ' 門課' });
  if (!entries.length) return;
  v4WithLock_(function () { var db = v4LoadDb_(); v4FeedEntries_(db, entries); v4SaveDb_(db); });
}

// ── 報告 ──
function v4Build_(kind, anchor) {
  var db = v4LoadDb_(), tr = v4Training_();
  var F = ACR.build(db, tr, { period: kind || 'week', anchor: anchor || v4Today_(), today: v4Today_(), now: v4Fmt_(new Date(), 'yyyy-MM-dd HH:mm') });
  return { F: F, text: ACR.toTelegram(F) };
}
function v4Keyboard_() {
  return [
    [{ text: '📊 報告中心 Reports', url: V4_REPORT_URL }, { text: '🎓 培訓 Training', url: moduleUrl_('vrt_training_v1.html') }],
    [{ text: '🏅 證書', callback_data: 'v4:cert' }, { text: '🛠 缺失', callback_data: 'v4:cap' }, { text: '🎓 培訓', callback_data: 'v4:train' }, { text: '📅 接下來', callback_data: 'v4:next' }],
    [{ text: '📂 AC Audit Portal', url: moduleUrl_('ac_audit_platform_v1.html') }]
  ];
}
function v4ReportsFile_() {
  var props = PropertiesService.getScriptProperties(), id = props.getProperty('V4_REPORTS_FILE_ID');
  if (id) { try { return DriveApp.getFileById(id); } catch (e) { props.deleteProperty('V4_REPORTS_FILE_ID'); } }
  var f = DriveApp.createFile('AC_AUDIT_REPORTS_JSON.txt', JSON.stringify({ list: [] }), MimeType.PLAIN_TEXT);
  props.setProperty('V4_REPORTS_FILE_ID', f.getId()); return f;
}
function v4ReportsLoad_() { try { var o = JSON.parse(v4ReportsFile_().getBlob().getDataAsString() || '{}'); if (!o.list) o.list = []; return o; } catch (e) { return { list: [] }; } }
function v4Archive_(F, text, auto, by) {
  var store = v4ReportsLoad_(), id = F.period.kind + ':' + F.period.key, prev = null;
  store.list = store.list.filter(function (r) { if (r.id === id) { prev = r; return false; } return true; });
  store.list.unshift({ id: id, kind: F.period.kind, key: F.period.key, label: F.period.label, from: F.period.from, to: F.period.to, sentAt: v4Fmt_(new Date(), 'yyyy-MM-dd HH:mm'), auto: !!auto, by: by || '', rev: prev ? (prev.rev || 1) + 1 : 1, light: F.light, headline: F.headline, text: text, facts: F });
  store.list = store.list.slice(0, 120);
  v4ReportsFile_().setContent(JSON.stringify(store));
}
function v4TrainingChart_(F) {
  var T = F.training, dt = Charts.newDataTable().addColumn(Charts.ColumnType.STRING, 'Month').addColumn(Charts.ColumnType.NUMBER, 'Planned').addColumn(Charts.ColumnType.NUMBER, 'Done');
  var M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  T.byMonth.forEach(function (m) { dt.addRow([M[m.m - 1], m.plan - m.cancel, m.done]); });
  return Charts.newColumnChart().setDataTable(dt.build()).setColors(['#b7d3f6', '#0ca30c']).setTitle('VRT Training ' + T.year + ' - planned vs done (courses per month)').setDimensions(960, 440).setLegendPosition(Charts.Position.BOTTOM).build().getAs('image/png').setName('training.png');
}
function v4SendPhoto_(chatId, blob, caption) {
  try { return JSON.parse(UrlFetchApp.fetch('https://api.telegram.org/bot' + CFG('BOT_TOKEN') + '/sendPhoto', { method: 'post', payload: { chat_id: String(chatId), caption: caption || '', photo: blob }, muteHttpExceptions: true }).getContentText()); } catch (e) { return null; }
}
function v4SendReport_(kind, anchor, chatId, auto, by) {
  var r = v4Build_(kind, anchor), chat = chatId || CFG('GROUP_CHAT_ID');
  var res = sendMessage_(chat, r.text, v4Keyboard_());
  if (!res || res.ok !== true) { appendLog_('V4_REPORT_ERROR', kind + ' ' + telegramErrorMessage_(res)); return { ok: false, error: telegramErrorMessage_(res) }; }
  if (kind === 'month' && r.F.training.courses) { try { v4SendPhoto_(chat, v4TrainingChart_(r.F), '🎓 ' + r.F.training.year + ' 培訓：每月計劃 vs 完成（門數）'); } catch (e) { appendLog_('V4_CHART_ERROR', e.message); } }
  try { v4Archive_(r.F, r.text, auto, by); } catch (e2) { appendLog_('V4_ARCHIVE_ERROR', e2.message); }
  /* 這期的 📌 備註用過就收掉 */
  try { v4WithLock_(function () { var db = v4LoadDb_(), ch = false; (db.notes || []).forEach(function (n) { if (!n.done && (!n.period || n.period === r.F.period.key)) { n.done = true; n.usedIn = r.F.period.key; ch = true; } }); if (ch) v4SaveDb_(db); }); } catch (e3) {}
  appendLog_('V4_REPORT', kind + ' ' + r.F.period.key + (auto ? ' auto' : ' manual'));
  return { ok: true, key: r.F.period.key, light: r.F.light, headline: r.F.headline };
}

// ── 每小時排程（掛在原本的 onAuditReminder 上）──
function v4Hourly_() {
  var props = PropertiesService.getScriptProperties(), now = new Date();
  var H = Number(v4Fmt_(now, 'H')), dow = Number(v4Fmt_(now, 'u')), dom = Number(v4Fmt_(now, 'd')), today = v4Today_();
  if (dow === 7) return;
  /* 1) 週報：週一早上 8 點發上一週；當天漏了，週二、三補發 */
  if (H >= 8 && dow <= 3) {
    var lastWeek = ACR.periodOf('week', v4AddDays_(today, -7));
    if (props.getProperty('V4_WEEKLY_SENT') !== lastWeek.key) { var w = v4SendReport_('week', lastWeek.from, null, true, 'auto'); if (w.ok) props.setProperty('V4_WEEKLY_SENT', lastWeek.key); }
  }
  /* 2) 月報：每月第一個上班日早上 8 點發上個月 */
  if (H >= 8 && dom <= 5) {
    var pm = ACR.periodOf('month', v4AddDays_(today.slice(0, 8) + '01', -1));
    if (props.getProperty('V4_MONTHLY_SENT') !== pm.key) { var m = v4SendReport_('month', pm.from, null, true, 'auto'); if (m.ok) props.setProperty('V4_MONTHLY_SENT', pm.key); }
  }
  /* 3) 到期提醒：只在碰到節點那天發一次 */
  if (H >= 8 && props.getProperty('V4_DAILY_SENT') !== today) {
    props.setProperty('V4_DAILY_SENT', today);
    var F = v4Build_('week', today).F, L = [];
    F.certs.list.forEach(function (c) { if (c.days != null && [90, 60, 30, 14, 7, 3, 1, 0].indexOf(c.days) >= 0) L.push((c.days <= 30 ? '🔴' : '🟡') + ' ' + ACR.esc(c.standard || c.name) + ' 證書 ' + c.expiryDate + ' 到期' + (c.days ? '，剩 ' + c.days + ' 天' : '，就是今天')); });
    F.caps.list.forEach(function (c) { if (c.days != null && [7, 3, 1, 0].indexOf(c.days) >= 0) L.push('🟡 缺失 <code>' + ACR.esc(c.id) + '</code> ' + ACR.esc(String(c.desc).slice(0, 26)) + ' ' + c.due + ' 到期' + (c.days ? '，剩 ' + c.days + ' 天' : '，就是今天')); });
    F.audits.upcoming.forEach(function (u) { if (u.kind === 'audit' && [30, 14, 7, 3, 1].indexOf(u.days) >= 0) L.push('📋 ' + ACR.esc(u.what) + ' ' + u.date + '，剩 ' + u.days + ' 天'); });
    if (L.length) sendMessage_(CFG('GROUP_CHAT_ID'), '⏰ <b>AC Audit 今日提醒 Reminder｜' + today + '</b>\n' + L.join('\n'), v4Keyboard_());
  }
  /* 4) 資料更新通知：有新異動才發，一小時最多一則 */
  if (H >= 7 && H <= 18) v4FlushPending_();
}
function v4FlushPending_() {
  var props = PropertiesService.getScriptProperties(), pend = [];
  try { pend = JSON.parse(props.getProperty('V4_PENDING') || '[]'); } catch (e) { pend = []; }
  if (!pend.length) return false;
  var lines = pend.slice(-10).map(function (e) { return (e.icon || '•') + ' ' + ACR.esc(e.text); });
  var msg = '🔔 <b>AC Audit 資料更新 Data updated</b>\n' + lines.join('\n') + (pend.length > 10 ? '\n… 另 ' + (pend.length - 10) + ' 筆' : '') + '\n🕐 ' + v4Fmt_(new Date(), 'MM-dd HH:mm') + '　報告已照新資料重算';
  var r = sendMessage_(CFG('GROUP_CHAT_ID'), msg, v4Keyboard_());
  if (r && r.ok) { props.setProperty('V4_PENDING', '[]'); return true; }
  return false;
}

// ── 調整資料（網頁與 bot 共用）──
function v4FindRec_(db, id) {
  var keys = AUDIT_MODULE_KEYS, i, j;
  for (i = 0; i < keys.length; i++) { var a = db[keys[i]] || []; for (j = 0; j < a.length; j++) { if (String(a[j].id).toLowerCase() === String(id).toLowerCase()) return { key: keys[i], rec: a[j] }; } }
  return null;
}
function v4Patch_(id, set, by, why, silent) {
  return v4WithLock_(function () {
    var db = v4LoadDb_(), hit = v4FindRec_(db, id);
    if (!hit) return { ok: false, error: '找不到編號 ' + id };
    var k = hit.key, r = hit.rec, oldSig = delKey_(k, r), changes = [], today = v4Today_();
    Object.keys(set || {}).forEach(function (f) { if (f === 'id' || f.charAt(0) === '_') return; var a = r[f] == null ? '' : r[f], b = set[f]; if (JSON.stringify(a) !== JSON.stringify(b)) { changes.push({ f: f, from: a, to: b }); r[f] = b; } });
    if (!changes.length) return { ok: true, unchanged: true, rec: r };
    r._updated = Date.now(); r._summarySentAt = r._summarySentAt || Date.now();
    if (k === 'certs') { r.history = r.history || []; changes.forEach(function (c) { if (c.f === 'expiryDate') r.history.push({ date: today, event: '到期日更新', note: (c.from || '未填') + ' → ' + c.to + (by ? '（' + by + '）' : '') }); else if (c.f !== 'verify' && c.f !== 'history') r.history.push({ date: today, event: '資料更新', note: c.f + '：' + String(c.to).slice(0, 60) + (by ? '（' + by + '）' : '') }); }); }
    else { r.log = r.log || []; r.log.push({ date: today, by: by || '', note: why || changes.map(function (c) { return c.f + '：' + String(c.from).slice(0, 30) + ' → ' + String(c.to).slice(0, 30); }).join('；') }); }
    db.meta = db.meta || {}; db.meta.deleted = db.meta.deleted || {};
    var newSig = delKey_(k, r);
    if (newSig !== oldSig) db.meta.deleted[oldSig] = Date.now();
    delete db.meta.deleted[newSig];
    var label = String(r.standard || r.title || r.name || r.description || '').slice(0, 24);
    v4FeedEntries_(db, [{ mod: k, icon: V4_MOD_ICON[k] || '📄', text: (why || (v4ModName_(k) + ' 修改')) + '：' + r.id + ' ' + label + '（' + changes.map(function (c) { return c.f === 'status' ? '狀態 ' + c.to : c.f === 'expiryDate' ? '到期日 ' + c.to : c.f === 'dueDate' ? '期限 ' + c.to : c.f; }).join('、') + '）', by: by || '' }], silent);
    v4SaveDb_(db);
    return { ok: true, rec: r, key: k, changes: changes };
  });
}
function v4AddRecord_(key, rec, by) {
  if (AUDIT_MODULE_KEYS.indexOf(key) < 0) return { ok: false, error: 'bad key' };
  return v4WithLock_(function () {
    var db = v4LoadDb_(); db[key] = db[key] || [];
    var pre = key === 'certs' ? 'CERT' : key === 'caps' ? 'CAP' : key === 'audits' ? 'AUD' : key === 'calendar' ? 'CAL' : key.toUpperCase();
    if (!rec.id) { var n = db[key].length + 1; do { rec.id = pre + '-' + ('00' + n).slice(-3); n++; } while (db[key].some(function (x) { return x.id === rec.id; })); }
    rec._created = Date.now(); rec._updated = Date.now(); rec._summarySentAt = Date.now();
    db[key].push(rec);
    v4FeedEntries_(db, [{ mod: key, icon: V4_MOD_ICON[key] || '📄', text: v4ModName_(key) + ' 新增：' + rec.id + ' ' + String(rec.standard || rec.title || rec.name || rec.description || '').slice(0, 30), by: by || '' }]);
    v4SaveDb_(db); return { ok: true, rec: rec };
  });
}
function v4Note_(text, period, by) {
  return v4WithLock_(function () { var db = v4LoadDb_(); db.notes = db.notes || []; var n = { id: 'N' + Date.now(), text: String(text).slice(0, 200), period: period || '', at: v4Today_(), by: by || '' }; db.notes.unshift(n); db.notes = db.notes.slice(0, 50); v4SaveDb_(db); return { ok: true, note: n }; });
}

// ── 網頁 API ──

/* ══ 培訓 PPT 匯入：把每張投影片的「課程／日期／人數／照片」寫回培訓記錄 ══ */
function v4Unesc_(t) { return String(t).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'"); }
function v4PptImport_(driveId, by) {
  if (!driveId) return { ok: false, error: 'no driveId' };
  var file = DriveApp.getFileById(driveId), fname = file.getName().replace(/^.*__\d{8}_\d{6}__/, '');
  var parts = Utilities.unzip(file.getBlob().setContentType('application/zip')), map = {};
  parts.forEach(function (b) { map[b.getName()] = b; });
  var nums = Object.keys(map).map(function (n) { var m = n.match(/^ppt\/slides\/slide(\d+)\.xml$/); return m ? +m[1] : 0; }).filter(function (x) { return x; }).sort(function (a, b) { return a - b; });
  var MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  var use = {}, sl = [];
  nums.forEach(function (n) {
    var rel = map['ppt/slides/_rels/slide' + n + '.xml.rels'], imgs = [];
    if (rel) (rel.getDataAsString('UTF-8').match(/Target="[^"]*media\/[^"]+"/g) || []).forEach(function (t) { var nm = 'ppt/media/' + t.replace(/^.*media\//, '').replace(/"$/, ''); if (/\.(jpe?g|png)$/i.test(nm) && map[nm] && imgs.indexOf(nm) < 0) { imgs.push(nm); use[nm] = (use[nm] || 0) + 1; } });
    var xml = map['ppt/slides/slide' + n + '.xml'].getDataAsString('UTF-8');
    var paras = (xml.match(/<a:p(?: [^>]*)?>[\s\S]*?<\/a:p>/g) || []).map(function (p) { return v4Unesc_((p.match(/<a:t[^>]*>[^<]*<\/a:t>/g) || []).map(function (t) { return t.replace(/<[^>]+>/g, ''); }).join('')).replace(/\s+/g, ' ').replace(/^ | $/g, ''); });
    sl.push({ n: n, paras: paras, imgs: imgs });
  });
  var sessions = [];
  sl.forEach(function (S) {
    var text = S.paras.join('\n');
    var mt = text.match(/Training\s*[:：]\s*(.+)/i), md = text.match(/Date\s*[:：]\s*(\d{1,2})\s*[-\/ ]\s*([A-Za-z]{3,9})\s*[-\/ ,]\s*(\d{4})/i);
    if (!mt || !md) return;
    var mo = MON[md[2].slice(0, 3).toLowerCase()]; if (!mo) return;
    var tm = text.match(/Time\s*[:：]?\s*(\d{1,2}[:.]\d{2})\s*[-–~]\s*(\d{1,2}[:.]\d{2})/i), tt = text.match(/Total\s*PPL\s*Attend\s*[:：]?\s*(\d+)/i);
    var dept = [], labs = ['Sew.', 'Cut.', 'W/H', 'QC', 'Pack', 'Other'];
    S.paras.forEach(function (p, i) { if (labs.indexOf(p) >= 0 && /^\d+$/.test(S.paras[i + 1] || '') && +S.paras[i + 1] > 0) dept.push(p.replace(/\.$/, '') + ' ' + S.paras[i + 1]); });
    var imgs = S.imgs.filter(function (nm) { return use[nm] < 3 && map[nm].getBytes().length >= 30000; }).sort(function (a, b) { return map[b].getBytes().length - map[a].getBytes().length; }).slice(0, 4);
    sessions.push({ slide: S.n, subject: mt[1].replace(/\s+/g, ' ').replace(/^ | $/g, ''), date: md[3] + '-' + ('0' + mo).slice(-2) + '-' + ('0' + md[1]).slice(-2), time: tm ? tm[1].replace('.', ':') + '-' + tm[2].replace('.', ':') : '', total: tt ? +tt[1] : 0, dept: dept.join('・'), imgs: imgs });
  });
  if (!sessions.length) return { ok: true, file: fname, sessions: [], note: '沒有找到「Training : … / Date : …」格式的投影片' };
  var folder = getAttachmentFolder_(), idx = loadAttachmentIndex_(), saved = 0;
  var data = getTrainingData_(); data.records = data.records || {};
  var norm = function (x) { return String(x || '').toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z]/g, ''); };
  var out = [];
  sessions.forEach(function (s, si) {
    var files = s.imgs.map(function (nm, k) {
      var sig = 'ppt|' + driveId + '|' + nm; if (idx.files[sig]) return idx.files[sig];
      var ext = nm.replace(/^.*\./, '.').toLowerCase(), b = map[nm], mime = /png/.test(ext) ? 'image/png' : 'image/jpeg';
      var name = safeFileName_(['training', s.date, s.subject.slice(0, 40), (k + 1) + ext].join('__'));
      var f = folder.createFile(Utilities.newBlob(b.getBytes(), mime, name));
      try { f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
      var id = f.getId(), info = { driveId: id, name: s.date + ' ' + s.subject.slice(0, 40) + ' #' + (k + 1) + ext, storedName: name, mime: mime, size: b.getBytes().length, module: 'training', recordId: '', signature: sig, url: f.getUrl(), webViewUrl: f.getUrl(), downloadUrl: 'https://drive.google.com/uc?export=download&id=' + id, uploadedAt: new Date().toISOString(), storage: 'google_drive', source: fname };
      idx.files[sig] = info; saved++; return info;
    });
    var mk = s.date.slice(0, 7), list = data.records[mk] = data.records[mk] || [];
    var cand = list.filter(function (r) { var a = norm(r.subject), b = norm(s.subject); return String(r.date).slice(0, 10) === s.date && a && b && (a.indexOf(b.slice(0, 10)) === 0 || b.indexOf(a.slice(0, 10)) === 0); });
    var rec = cand.filter(function (r) { return String(r.time).replace(/\s/g, '') === s.time; })[0] || cand[0], made = false;
    if (!rec) { rec = { id: 'ppt' + Date.now() + si, seq: list.length + 1, subject: s.subject, dept: '', trainer: '', date: s.date, time: s.time, duration: '', participant: '', attendees: s.total, absences: 0, remarks: '', evidence: [] }; list.push(rec); made = true; }
    rec.evidence = Array.isArray(rec.evidence) ? rec.evidence : [];
    files.forEach(function (f) { if (!rec.evidence.some(function (e) { return e && e.driveId === f.driveId; })) rec.evidence.push(f); });
    if (s.dept && String(rec.remarks || '').indexOf(s.dept) < 0) rec.remarks = (rec.remarks ? rec.remarks + '｜' : '') + s.dept;
    if (!(+rec.attendees) && s.total) rec.attendees = s.total;
    out.push({ date: s.date, subject: s.subject, time: s.time, pptTotal: s.total, recTotal: +rec.attendees || 0, photos: files.length, created: made, dept: s.dept });
  });
  if (saved) saveAttachmentIndex_(idx);
  saveTrainingData_(data);
  try { var db = v4LoadDb_(); v4FeedEntries_(db, [{ mod: 'training', icon: '📷', text: '培訓 PPT 匯入：' + fname + '（' + out.length + ' 場、照片 ' + out.reduce(function (a, x) { return a + x.photos; }, 0) + ' 張）', by: by || 'web' }], false); v4SaveDb_(db, 'PPT import'); } catch (e2) {}
  return { ok: true, file: fname, sessions: out, photosSaved: saved };
}

function v4Api_(action, d) {
  d = d || {};
  if (action === 'report') { var r = v4Build_(d.kind || d.period || 'week', d.anchor || ''); return jsonOut({ ok: true, facts: r.F, text: r.text }); }
  if (action === 'reportSend') return jsonOut(v4SendReport_(d.kind || 'week', d.anchor || '', null, false, d.by || 'web'));
  if (action === 'reportHistory') { var s = v4ReportsLoad_(); return jsonOut({ ok: true, list: s.list.map(function (x) { return { id: x.id, kind: x.kind, key: x.key, label: x.label, from: x.from, to: x.to, sentAt: x.sentAt, auto: x.auto, by: x.by, rev: x.rev, light: x.light, headline: x.headline }; }) }); }
  if (action === 'reportGet') { var s2 = v4ReportsLoad_(), hit = null; s2.list.forEach(function (x) { if (x.id === d.id) hit = x; }); return jsonOut(hit ? { ok: true, report: hit } : { ok: false, error: 'not found' }); }
  if (action === 'pptImport') { try { return jsonOut(v4PptImport_(d.driveId, d.by || 'web')); } catch (pe) { return jsonOut({ ok: false, error: String(pe && pe.message || pe) }); } }
  if (action === 'patch') return jsonOut(v4Patch_(d.id, d.set || {}, d.by || 'web', d.why || ''));
  if (action === 'addRecord') return jsonOut(v4AddRecord_(d.key, d.rec || {}, d.by || 'web'));
  if (action === 'note') return jsonOut(v4Note_(d.text || '', d.period || '', d.by || 'web'));
  if (action === 'noteDone') return jsonOut(v4WithLock_(function () { var db = v4LoadDb_(); (db.notes || []).forEach(function (n) { if (n.id === d.id) n.done = true; }); v4SaveDb_(db); return { ok: true }; }));
  if (action === 'flushUpdates') return jsonOut({ ok: true, sent: v4FlushPending_() });
  if (action === 'v4install') return jsonOut(v4Install_());
  if (action === 'v4status') { var p = PropertiesService.getScriptProperties(); return jsonOut({ ok: true, version: APP_VERSION, weekly: p.getProperty('V4_WEEKLY_SENT') || '', monthly: p.getProperty('V4_MONTHLY_SENT') || '', daily: p.getProperty('V4_DAILY_SENT') || '', pending: (function () { try { return JSON.parse(p.getProperty('V4_PENDING') || '[]').length; } catch (e) { return 0; } })(), triggers: ScriptApp.getProjectTriggers().map(function (t) { return t.getHandlerFunction(); }), lastIn: p.getProperty('AC_AUDIT_TG_LAST_IN') || '', lastError: p.getProperty('AC_AUDIT_TG_LAST_ERROR') || '' }); }
  return null;
}
function v4Install_() {
  var has = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'onAuditReminder'; });
  if (!has) setupAuditReminderTrigger_();
  var cmd = callTelegram_('setMyCommands', { commands: [
    { command: 'audit', description: '平台選單 Open AC Audit' },
    { command: 'week', description: '週報 Weekly report' },
    { command: 'month', description: '月報 Monthly report' },
    { command: 'cert', description: '證書到期 Certificates' },
    { command: 'cap', description: '缺失改善 Open findings' },
    { command: 'train', description: '培訓進度 Training' },
    { command: 'next', description: '接下來的稽核與到期 Upcoming' },
    { command: 'find', description: '搜尋 /find 關鍵字' },
    { command: 'note', description: '加一句備註到下一份報告' },
    { command: 'audithelp', description: '指令說明 Help' }
  ] });
  /* 第一次安裝：上一週、上個月視為已處理，避免一裝好就補發舊報告 */
  var props = PropertiesService.getScriptProperties(), today = v4Today_();
  if (!props.getProperty('V4_WEEKLY_SENT')) props.setProperty('V4_WEEKLY_SENT', ACR.periodOf('week', v4AddDays_(today, -7)).key);
  if (!props.getProperty('V4_MONTHLY_SENT')) props.setProperty('V4_MONTHLY_SENT', ACR.periodOf('month', v4AddDays_(today.slice(0, 8) + '01', -1)).key);
  if (!props.getProperty('V4_DAILY_SENT')) props.setProperty('V4_DAILY_SENT', today);
  appendLog_('V4_INSTALL', 'trigger=' + (has ? 'kept' : 'created') + ' commands=' + (cmd && cmd.ok));
  return { ok: true, trigger: has ? 'kept' : 'created', commands: !!(cmd && cmd.ok), version: APP_VERSION };
}

// ── bot：指令、按鈕、問答、調整 ──
function v4Help_() {
  return '📂 <b>AC Audit bot</b>\n' +
    '/week 週報　/month 月報（<code>/month 10</code> 看 10 月，<code>/week last</code> 上週）\n' +
    '/cert 證書到期　/cap 缺失　/train 培訓　/next 接下來\n' +
    '/find 關鍵字 — 搜尋證書、稽核、缺失、培訓記錄\n' +
    '<b>調整</b>\n' +
    '/done CAP-001 說明 — 缺失結案\n' +
    '/due CAP-001 2026-12-01 — 改缺失期限\n' +
    '/expiry CERT-001 2027-03-14 — 補／改證書到期日\n' +
    '/note 文字 — 下一份報告最上面加一句 📌\n' +
    '也可以直接回覆 bot 或 @bot 問：「WRAP 證書什麼時候到期」「這個月培訓還差哪些」';
}
function v4Who_(msg) { var f = (msg && msg.from) || {}; return String(f.first_name || f.username || f.id || '').slice(0, 30); }
function v4Reply_(chatId, html) { return sendMessage_(chatId, html, v4Keyboard_()); }
function v4HandleUpdate_(update) {
  var props = PropertiesService.getScriptProperties();
  if (update.callback_query) {
    var cq = update.callback_query, data = String(cq.data || '');
    if (data.indexOf('v4:') !== 0) return false;
    try { callTelegram_('answerCallbackQuery', { callback_query_id: cq.id }); } catch (e) {}
    var chat = String(cq.message && cq.message.chat && cq.message.chat.id || CFG('GROUP_CHAT_ID')), q = { 'v4:cert': '證書', 'v4:cap': '缺失', 'v4:train': '培訓', 'v4:next': '接下來' }[data];
    if (data === 'v4:week') { v4SendReport_('week', '', chat, false, v4Who_(cq)); return true; }
    if (data === 'v4:month') { v4SendReport_('month', '', chat, false, v4Who_(cq)); return true; }
    if (q) v4Reply_(chat, ACR.answer(v4LoadDb_(), v4Training_(), q, v4Today_()) || '沒有資料');
    return true;
  }
  var msg = update.message || update.edited_message; if (!msg) return false;
  var text = String(msg.text || msg.caption || '').trim(); if (!text) return false;
  var chatId = String(msg.chat.id), isGroup = chatId === String(CFG('GROUP_CHAT_ID')), who = v4Who_(msg), today = v4Today_();
  var botName = String(props.getProperty('AC_AUDIT_BOT_USERNAME') || 'acauditbot').toLowerCase();
  if (text.charAt(0) === '/') {
    var parts = text.split(/[\s　]+/), cmd = parts[0].split('@')[0].toLowerCase(), arg = parts.slice(1), rest = text.slice(parts[0].length).trim();
    props.setProperty('AC_AUDIT_TG_LAST_IN', v4Fmt_(new Date(), 'yyyy-MM-dd HH:mm:ss') + ' ' + cmd + ' chat=' + chatId);
    if (cmd === '/week' || cmd === '/weekly' || cmd === '/report') { v4SendReport_('week', /last|上週|上周/.test(rest) ? v4AddDays_(today, -7) : '', chatId, false, who); return true; }
    if (cmd === '/month' || cmd === '/monthly') {
      var anchor = '', mm = rest.match(/^(\d{1,2})$/), ym = rest.match(/^(\d{4})-(\d{1,2})$/);
      if (mm && +mm[1] >= 1 && +mm[1] <= 12) anchor = today.slice(0, 5) + ('0' + mm[1]).slice(-2) + '-15'; else if (ym) anchor = ym[1] + '-' + ('0' + ym[2]).slice(-2) + '-15'; else if (/last|上月|上個月/.test(rest)) anchor = v4AddDays_(today.slice(0, 8) + '01', -1);
      v4SendReport_('month', anchor, chatId, false, who); return true;
    }
    if (cmd === '/cert' || cmd === '/certs') { v4Reply_(chatId, ACR.answer(v4LoadDb_(), v4Training_(), '證書', today)); return true; }
    if (cmd === '/cap' || cmd === '/caps' || cmd === '/nc') { v4Reply_(chatId, ACR.answer(v4LoadDb_(), v4Training_(), '缺失', today)); return true; }
    if (cmd === '/train' || cmd === '/training') { v4Reply_(chatId, ACR.answer(v4LoadDb_(), v4Training_(), '培訓', today)); return true; }
    if (cmd === '/next' || cmd === '/upcoming') { v4Reply_(chatId, ACR.answer(v4LoadDb_(), v4Training_(), '接下來', today)); return true; }
    if (cmd === '/result' || cmd === '/audits') { v4Reply_(chatId, ACR.answer(v4LoadDb_(), v4Training_(), '稽核結果', today)); return true; }
    if (cmd === '/find' || cmd === '/search') { v4Reply_(chatId, rest ? ACR.find(v4LoadDb_(), v4Training_(), rest) : '用法：<code>/find 關鍵字</code>'); return true; }
    if (cmd === '/updates') { var db0 = v4LoadDb_(), u = (db0.updates || []).slice(0, 12); v4Reply_(chatId, u.length ? '🔔 <b>最近異動 Latest updates</b>\n' + u.map(function (e) { return e.at.slice(5) + ' ' + (e.icon || '•') + ' ' + ACR.esc(e.text); }).join('\n') : '還沒有異動記錄'); return true; }
    if (cmd === '/audithelp' || cmd === '/help') { v4Reply_(chatId, v4Help_()); return true; }
    if (cmd === '/note' || cmd === '/done' || cmd === '/due' || cmd === '/expiry') {
      if (!isGroup) { sendMessage_(chatId, '調整資料請在 AC Audit 群組裡下指令。'); return true; }
      if (cmd === '/note') { if (!rest) { v4Reply_(chatId, '用法：<code>/note 這週客人來廠，稽核順延</code>'); return true; } v4Note_(rest, '', who); v4Reply_(chatId, '📌 已記下，下一份報告最上面會帶這句：\n' + ACR.esc(rest)); return true; }
      var id = arg[0] || '';
      if (!id) { v4Reply_(chatId, '要帶編號，例如 <code>' + cmd + ' CAP-001</code>。用 /cap 或 /cert 看編號。'); return true; }
      var res;
      if (cmd === '/done') res = v4Patch_(id, { status: 'closed', closedDate: today, verify: '' }, who, '缺失結案' + (arg.slice(1).join(' ') ? '（' + arg.slice(1).join(' ') + '）' : ''), true);
      else {
        var dt = arg[1] || '';
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dt)) { v4Reply_(chatId, '日期要寫成 2026-12-01 這種格式。'); return true; }
        res = cmd === '/due' ? v4Patch_(id, { dueDate: dt }, who, '缺失改期限', true) : v4Patch_(id, { expiryDate: dt, verify: '' }, who, '證書到期日更新', true);
      }
      if (!res.ok) { v4Reply_(chatId, '⚠️ ' + ACR.esc(res.error)); return true; }
      var r = res.rec;
      v4Reply_(chatId, (res.unchanged ? 'ℹ️ 資料本來就是這樣，沒有變動：' : '✅ 已更新（' + ACR.esc(who) + '）：') + '<code>' + ACR.esc(r.id) + '</code> ' + ACR.esc(String(r.standard || '') + ' ' + String(r.description || r.name || r.title || '').slice(0, 40)) + (res.changes ? '\n' + res.changes.filter(function (c) { return c.f !== 'verify'; }).map(function (c) { return '• ' + c.f + '：' + ACR.esc(String(c.from || '未填')) + ' → <b>' + ACR.esc(String(c.to)) + '</b>'; }).join('\n') : '') + '\n報告已照新資料重算。');
      return true;
    }
    return false; /* 其他指令（/audit /ping /id…）交回原本的處理 */
  }
  /* 一般文字：只有回覆 bot 或 @bot 才回答，不打擾群組聊天 */
  var toBot = (msg.reply_to_message && msg.reply_to_message.from && msg.reply_to_message.from.is_bot) || text.toLowerCase().indexOf('@' + botName) >= 0 || msg.chat.type === 'private';
  if (!toBot) return false;
  var q2 = text.replace(new RegExp('@' + botName, 'ig'), '').trim(), db = v4LoadDb_(), tr = v4Training_();
  if (/週報|周報|weekly/i.test(q2)) { v4SendReport_('week', /上週|上周|last/i.test(q2) ? v4AddDays_(today, -7) : '', chatId, false, who); return true; }
  if (/月報|monthly/i.test(q2)) { v4SendReport_('month', /上月|上個月|last/i.test(q2) ? v4AddDays_(today.slice(0, 8) + '01', -1) : '', chatId, false, who); return true; }
  var ans = ACR.answer(db, tr, q2, today);
  if (!ans) { var kw = q2.replace(/[？?！!。，,、的是什麼時候幾號呢嗎請問一下]/g, ' ').trim().split(/\s+/).filter(function (x) { return x.length >= 2; })[0]; if (kw) ans = ACR.find(db, tr, kw); }
  v4Reply_(chatId, ans || ('我能回答證書、稽核結果、缺失、培訓、接下來的行程。\n' + v4Help_()));
  return true;
}
