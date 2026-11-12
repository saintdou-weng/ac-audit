/* AC Audit · 報告引擎 ac_audit_engine.js v1 (2026-11)
   同一份程式碼給網頁和 Apps Script 用：數字只在這裡算一次，網頁、Telegram、週報月報都拿同一組事實。
   寫法照 VRT 自動報告標準：先判斷情境 → 燈號＋一句結論 → 數字區 → 要處理（最多 4 條）→ 資料日期。
   ACR.build(db, training, {period:'week'|'month', anchor:'YYYY-MM-DD', today:'YYYY-MM-DD'}) → facts
   ACR.toTelegram(facts) → HTML 文字 */
var ACR = (function () {
  var DAY = 86400000;
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(s) {
    if (!s) return null;
    var m = String(s).slice(0, 10).match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3]);
  }
  function diffDays(a, b) { return Math.round((a - b) / DAY); }
  function arr(x) { return Array.isArray(x) ? x : []; }
  function low(s) { return String(s == null ? '' : s).toLowerCase(); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function mondayOf(d) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); var wd = (x.getDay() + 6) % 7; x.setDate(x.getDate() - wd); return x; }
  function isoWeek(d) {
    var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
    var y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return { year: t.getUTCFullYear(), week: Math.ceil(((t - y0) / DAY + 1) / 7) };
  }
  var WD = ['日', '一', '二', '三', '四', '五', '六'];
  function md(s) { var d = parse(s); return d ? (d.getMonth() + 1) + '/' + d.getDate() : ''; }
  function mdw(s) { var d = parse(s); return d ? (d.getMonth() + 1) + '/' + d.getDate() + '（' + WD[d.getDay()] + '）' : ''; }

  /* ── 期間 ── */
  function periodOf(kind, anchor) {
    var a = parse(anchor), from, to, key, label, labelEn;
    if (kind === 'month') {
      from = new Date(a.getFullYear(), a.getMonth(), 1); to = new Date(a.getFullYear(), a.getMonth() + 1, 0);
      key = a.getFullYear() + '-' + pad(a.getMonth() + 1);
      label = a.getFullYear() + ' 年 ' + (a.getMonth() + 1) + ' 月'; labelEn = key;
    } else if (kind === 'year') {
      from = new Date(a.getFullYear(), 0, 1); to = new Date(a.getFullYear(), 11, 31);
      key = String(a.getFullYear()); label = key + ' 年'; labelEn = key;
    } else {
      from = mondayOf(a); to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 6);
      var w = isoWeek(from); key = w.year + '-W' + pad(w.week);
      label = (from.getMonth() + 1) + '/' + from.getDate() + '–' + (to.getMonth() + 1) + '/' + to.getDate() + '（第 ' + w.week + ' 週）';
      labelEn = 'W' + w.week + ' ' + ymd(from) + '~' + ymd(to);
    }
    return { kind: kind, from: ymd(from), to: ymd(to), key: key, label: label, labelEn: labelEn };
  }
  function inRange(s, from, to) { var x = String(s || '').slice(0, 10); return !!x && x >= from && x <= to; }

  /* ── 證書 ── */
  function certList(db, today) {
    var out = [], seen = {};
    function add(r, src) {
      if (!r) return;
      var exp = r.expiryDate || r.expiry || r.validUntil || r.validTo || '';
      var name = r.name || r.title || r.standard || r.certNo || '';
      var k = low(r.standard) + '|' + low(r.certNo || name);
      if (seen[k]) return; seen[k] = 1;
      var d = parse(exp), days = d ? diffDays(d, today) : null, light = 'gray', st = 'nodate';
      if (low(r.status) === 'expired' || low(r.status) === 'withdrawn') { light = 'red'; st = 'expired'; }
      if (days != null) {
        if (days < 0) { light = 'red'; st = 'expired'; }
        else if (days <= 30) { light = 'red'; st = 'soon30'; }
        else if (days <= 90) { light = 'yellow'; st = 'soon90'; }
        else { light = 'green'; st = 'valid'; }
      }
      /* 待確認：最後查到的資料已經舊了（或沒有到期日），不當成「過期」報，只列為要補資料 */
      if (r.verify && (days == null || days < 0)) { light = 'gray'; st = 'verify'; }
      out.push({ id: r.id || k, standard: r.standard || '', name: name, certNo: r.certNo || '', issuer: r.issuer || r.body || '', grade: r.grade || r.level || '', issueDate: String(r.issueDate || r.issue || '').slice(0, 10), expiryDate: String(exp).slice(0, 10), days: days, light: light, state: st, scope: r.scope || '', verify: r.verify || '', kind: r.kind || '', src: src, raw: r });
    }
    arr(db.certs).forEach(function (r) { add(r, 'certs'); });
    arr(db.grs_certs).forEach(function (r) { add(r, 'grs_certs'); });
    var RK = { expired: 0, soon30: 1, soon90: 2, valid: 3, verify: 4, nodate: 5 };
    out.sort(function (a, b) { var x = RK[a.state] + (a.state === 'verify' && a.kind !== 'cert' ? 0.5 : 0), y = RK[b.state] + (b.state === 'verify' && b.kind !== 'cert' ? 0.5 : 0); if (x !== y) return x - y; if (a.state === 'verify') return a.expiryDate < b.expiryDate ? 1 : -1; return (a.days == null ? 99999 : a.days) - (b.days == null ? 99999 : b.days); });
    return out;
  }

  /* ── 稽核事件 ── */
  function auditList(db) {
    var out = [];
    function add(r, key) {
      if (!r) return;
      var std = r.auditType || r.assessmentType || r.standard || (key === 'wse_assessment' ? 'WSE' : '');
      out.push({ id: r.id || '', key: key, standard: std, title: r.title || r.auditName || std, date: String(r.date || '').slice(0, 10), endDate: String(r.endDate || '').slice(0, 10), status: low(r.status), result: r.result || r.grade || '', score: r.score == null ? '' : r.score, firm: r.firm || r.auditFirm || '', ncCount: r.ncCount == null ? null : +r.ncCount, nextDue: String(r.nextDue || r.nextAuditDate || '').slice(0, 10), notes: r.notes || r.description || '', planned: low(r.status) === 'planned' || low(r.status) === 'scheduled', raw: r });
    }
    arr(db.audits).forEach(function (r) { add(r, 'audits'); });
    arr(db.wse_assessment).forEach(function (r) { add(r, 'wse_assessment'); });
    arr(db.assessments).forEach(function (r) { add(r, 'assessments'); });
    out.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    return out;
  }
  function resultLight(r) {
    var s = low(r.result) + ' ' + low(r.raw && r.raw.rating);
    if (/red|fail|critical|zero|不合格|不通過/.test(s)) return 'red';
    if (/amber|orange|yellow|improvement|conditional|minor|需改善|silver/.test(s)) return 'yellow';
    if (/green|pass|gold|platinum|certified|合格|通過|compliant|satisf/.test(s)) return 'green';
    return 'gray';
  }

  /* ── 缺失 CAP ── */
  function capList(db, today) {
    return arr(db.caps).map(function (r) {
      var st = low(r.status), closed = /closed|done|complete|verified|archived|waived|結案|完成/.test(st);
      var due = String(r.dueDate || r.due || '').slice(0, 10), d = parse(due), days = d ? diffDays(d, today) : null;
      var light = closed ? 'green' : (days != null && days < 0 ? 'red' : (days != null && days <= 14 ? 'yellow' : 'blue'));
      return { id: r.id || '', standard: r.standard || r.auditType || '', category: r.category || '', desc: r.description || r.title || '', severity: r.severity || '', owner: r.owner || '', due: due, days: days, closed: closed, closedAt: String(r.closedDate || r.closedAt || '').slice(0, 10), created: String(r.date || r.foundDate || '').slice(0, 10), light: light, repeat: !!r.repeat, clause: r.clause || '', verify: r.verify || '', auditId: r.auditId || '', raw: r };
    });
  }

  /* ── 文件 ── */
  function docStats(db, today) {
    var all = arr(db.dcc_control).concat(arr(db.documents)).concat(arr(db.policies));
    var due = [], exp = [];
    all.forEach(function (r) {
      var d = parse(r.expiryDate || r.reviewDate || '');
      if (!d) return; var days = diffDays(d, today);
      var it = { title: r.title || r.docNo || '', docNo: r.docNo || '', date: ymd(d), days: days };
      if (days < 0) exp.push(it); else if (days <= 60) due.push(it);
    });
    return { total: all.length, expired: exp, reviewDue: due };
  }

  /* ── 培訓 ── */
  function hoursOf(v) {
    var s = low(v).replace(/\s+/g, ''); if (!s) return 0;
    var m = s.match(/^(\d+(?:\.\d+)?)h(?:(\d+)m\w*)?$/); if (m) return +m[1] + (m[2] ? +m[2] / 60 : 0);
    m = s.match(/^(\d+(?:\.\d+)?)(mn|min|mins|m)$/); if (m) return +m[1] / 60;
    m = s.match(/^(\d+(?:\.\d+)?)$/); if (m) return +m[1];
    return 0;
  }
  function courses(tr) { return arr(tr && tr.trainings).filter(function (t) { return t && (t.nameZH || t.nameEN) && t.months; }); }
  function cname(t) { return t.nameZH || t.nameEN || ''; }
  function trainingFacts(tr, P, today) {
    var cs = courses(tr), recs = (tr && tr.records) || {}, year = +P.from.slice(0, 4), tm = today.getFullYear() === year ? today.getMonth() + 1 : (today.getFullYear() > year ? 12 : 0);
    var byMonth = [], m, i;
    for (m = 1; m <= 12; m++) {
      var o = { m: m, plan: 0, done: 0, post: 0, cancel: 0, wait: 0, sessions: 0, attendees: 0, hours: 0 };
      cs.forEach(function (t) { var c = +(t.months[m] || t.months[String(m)] || 0); if (!c) return; o.plan++; if (c === 2) o.done++; else if (c === 3) o.post++; else if (c === 4) o.cancel++; else o.wait++; });
      arr(recs[year + '-' + pad(m)]).forEach(function (r) { o.sessions++; o.attendees += +r.attendees || 0; o.hours += hoursOf(r.duration); });
      o.pct = o.plan - o.cancel > 0 ? Math.round(o.done / (o.plan - o.cancel) * 100) : null;
      byMonth.push(o);
    }
    /* 逾期：過去月份還掛「計劃」沒做；或「延後」之後一直沒有補做 */
    var overdue = [];
    cs.forEach(function (t) {
      for (var k = 1; k < tm; k++) {
        var c = +(t.months[k] || t.months[String(k)] || 0);
        if (c === 1) overdue.push({ id: t.id, name: cname(t), en: t.nameEN || '', month: k, why: 'notdone', cat: t.category || '' });
        if (c === 3) {
          var made = false; for (var j = k + 1; j <= 12; j++) { if (+(t.months[j] || t.months[String(j)] || 0) === 2) { made = true; break; } }
          var later = false; for (j = Math.max(k + 1, tm); j <= 12; j++) { if (+(t.months[j] || t.months[String(j)] || 0) === 1) { later = true; break; } }
          if (!made && !later) overdue.push({ id: t.id, name: cname(t), en: t.nameEN || '', month: k, why: 'postponed', cat: t.category || '' });
        }
      }
    });
    /* 同一門課只留最早那一次 */
    var seen = {}, od = []; overdue.sort(function (a, b) { return a.month - b.month; }).forEach(function (x) { if (seen[x.id]) { seen[x.id].months.push(x.month); return; } x.months = [x.month]; seen[x.id] = x; od.push(x); });
    var ytd = { plan: 0, done: 0, post: 0, cancel: 0, wait: 0, sessions: 0, attendees: 0, hours: 0 };
    for (i = 0; i < Math.max(tm, 0); i++) { ['plan', 'done', 'post', 'cancel', 'wait', 'sessions', 'attendees', 'hours'].forEach(function (k) { ytd[k] += byMonth[i][k]; }); }
    if (tm >= 1 && today.getFullYear() === year) { ytd.plan -= byMonth[tm - 1].wait; ytd.wait -= byMonth[tm - 1].wait; ytd.through = tm; }
    ytd.pct = ytd.plan - ytd.cancel > 0 ? Math.round(ytd.done / (ytd.plan - ytd.cancel) * 100) : null;
    /* 期間內的場次 */
    var list = [];
    Object.keys(recs).forEach(function (k) { arr(recs[k]).forEach(function (r) { if (inRange(r.date, P.from, P.to)) list.push({ date: String(r.date).slice(0, 10), subject: r.subject || '', trainer: r.trainer || '', dept: r.dept || '', time: r.time || '', hours: hoursOf(r.duration), participant: r.participant || '', attendees: +r.attendees || 0, absences: +r.absences || 0, external: /external|外訓/i.test(String(r.remarks || '')) }); }); });
    list.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var per = { sessions: list.length, attendees: 0, hours: 0, list: list };
    list.forEach(function (r) { per.attendees += r.attendees; per.hours += r.hours; });
    per.hours = Math.round(per.hours * 10) / 10; ytd.hours = Math.round(ytd.hours * 10) / 10;
    /* 報告期間所在月份的計劃進度 */
    var pm = +P.to.slice(5, 7), mo = byMonth[pm - 1], names = { wait: [], done: [], post: [], cancel: [] };
    cs.forEach(function (t) { var c = +(t.months[pm] || t.months[String(pm)] || 0); if (c === 1) names.wait.push(cname(t)); else if (c === 2) names.done.push(cname(t)); else if (c === 3) names.post.push(cname(t)); else if (c === 4) names.cancel.push(cname(t)); });
    var nm = pm < 12 ? pm + 1 : null, next = [];
    if (nm) cs.forEach(function (t) { if (+(t.months[nm] || t.months[String(nm)] || 0) === 1) next.push(cname(t)); });
    var cat = {}; cs.forEach(function (t) { var c = t.category || 'Other'; cat[c] = cat[c] || { cat: c, plan: 0, done: 0 }; for (var k = 1; k <= Math.max(tm, 0); k++) { var v = +(t.months[k] || t.months[String(k)] || 0); if (v === 1 && k === tm && today.getFullYear() === year) continue; if (v && v !== 4) { cat[c].plan++; if (v === 2) cat[c].done++; } } });
    var lastRec = ''; Object.keys(recs).forEach(function (k) { arr(recs[k]).forEach(function (r) { var d = String(r.date || '').slice(0, 10); if (d > lastRec) lastRec = d; }); });
    return { courses: cs.length, year: year, month: pm, mo: mo, names: names, nextMonth: nm, next: next, byMonth: byMonth, ytd: ytd, period: per, overdue: od, byCat: Object.keys(cat).map(function (k) { return cat[k]; }), lastRecord: lastRec, thisMonth: tm };
  }

  /* ── 主程式 ── */
  function build(db, tr, opt) {
    db = db || {}; opt = opt || {};
    var today = parse(opt.today) || new Date(); today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    var P = periodOf(opt.period || 'week', opt.anchor || ymd(today));
    var certs = certList(db, today), audits = auditList(db), caps = capList(db, today), docs = docStats(db, today), T = trainingFacts(tr, P, today);
    var F = { v: 1, period: P, today: ymd(today), generatedAt: opt.now || '' };

    F.certs = { total: certs.length, valid: 0, soon: 0, expired: 0, nodate: 0, verify: 0, list: certs.map(function (c) { var o = {}; for (var k in c) if (k !== 'raw') o[k] = c[k]; return o; }) };
    certs.forEach(function (c) { if (c.state === 'expired') F.certs.expired++; else if (c.state === 'soon30' || c.state === 'soon90') F.certs.soon++; else if (c.state === 'valid') F.certs.valid++; else if (c.state === 'verify') F.certs.verify++; else F.certs.nodate++; });

    var done = audits.filter(function (a) { return !a.planned && a.date && a.date <= F.today; });
    var lastBy = {}, order = [];
    done.forEach(function (a) { var s = a.standard || 'Other'; if (!lastBy[s]) { lastBy[s] = a; order.push(s); } });
    var upcoming = [];
    audits.forEach(function (a) { if ((a.planned || a.date > F.today) && a.date) upcoming.push({ what: (a.standard ? a.standard + ' ' : '') + (a.title && a.title !== a.standard ? a.title : '稽核'), date: a.date, days: diffDays(parse(a.date), today), kind: 'audit' }); });
    Object.keys(lastBy).forEach(function (s) { var a = lastBy[s]; if (a.nextDue && a.nextDue >= F.today) upcoming.push({ what: s + ' 下次稽核', date: a.nextDue, days: diffDays(parse(a.nextDue), today), kind: 'audit' }); });
    certs.forEach(function (c) { if (c.days != null && c.days >= 0 && c.days <= 120) upcoming.push({ what: (c.standard || c.name) + ' 證書到期', date: c.expiryDate, days: c.days, kind: 'cert' }); });
    caps.forEach(function (c) { if (!c.closed && c.days != null && c.days >= 0 && c.days <= 30) upcoming.push({ what: '缺失改善到期：' + String(c.desc).slice(0, 24), date: c.due, days: c.days, kind: 'cap' }); });
    arr(db.calendar).forEach(function (e) { if (e && e.date && e.date >= F.today) upcoming.push({ what: e.title || e.what || '', date: String(e.date).slice(0, 10), days: diffDays(parse(e.date), today), kind: e.kind || 'event' }); });
    upcoming.sort(function (a, b) { return a.days - b.days; });
    F.audits = {
      total: done.length,
      inPeriod: done.filter(function (a) { return inRange(a.date, P.from, P.to); }).map(slim),
      last: order.map(function (s) { var a = lastBy[s], o = slim(a); o.light = resultLight(a); return o; }),
      upcoming: upcoming
    };
    function slim(a) { return { id: a.id, key: a.key, standard: a.standard, title: a.title, date: a.date, result: a.result, score: a.score, firm: a.firm, ncCount: a.ncCount, nextDue: a.nextDue }; }

    var open = caps.filter(function (c) { return !c.closed; });
    F.caps = {
      total: caps.length, open: open.length,
      overdue: open.filter(function (c) { return c.days != null && c.days < 0; }).length,
      dueSoon: open.filter(function (c) { return c.days != null && c.days >= 0 && c.days <= 14; }).length,
      closed: caps.length - open.length, repeat: open.filter(function (c) { return c.repeat; }).length,
      closedInPeriod: caps.filter(function (c) { return c.closed && inRange(c.closedAt, P.from, P.to); }).length,
      newInPeriod: caps.filter(function (c) { return inRange(c.created, P.from, P.to); }).length,
      list: open.sort(function (a, b) { return (a.days == null ? 9999 : a.days) - (b.days == null ? 9999 : b.days); }).map(function (c) { var o = {}; for (var k in c) if (k !== 'raw') o[k] = c[k]; return o; })
    };
    F.docs = { total: docs.total, expired: docs.expired.length, reviewDue: docs.reviewDue.length, list: docs.expired.concat(docs.reviewDue).slice(0, 10) };
    F.training = T;

    var ups = arr(db.updates).concat(arr(db.meta && db.meta.updates)).filter(function (u) { return u && inRange(u.at, P.from, P.to); });
    F.updates = { count: ups.length, list: ups.slice(0, 12) };
    F.updatesAll = arr(db.updates).slice(0, 60);
    F.notes = arr(db.notes).concat(arr(db.meta && db.meta.notes)).filter(function (n) { return n && (!n.period || n.period === P.key) && !n.done; }).map(function (n) { return n.text; });

    scenarios(F, today);
    F.dataDates = { audit: db.meta && db.meta.updatedAt ? ymd(new Date(+db.meta.updatedAt)) : '', training: T.lastRecord };
    return F;
  }

  /* ── 情境 → 結論 ── */
  function scenarios(F, today) {
    var S = [], A = [], T = F.training, P = F.period, c = F.certs, i;
    function sc(code, w, light, text) { S.push({ code: code, w: w, light: light, text: text }); }
    var exp = c.list.filter(function (x) { return x.state === 'expired'; }), s30 = c.list.filter(function (x) { return x.state === 'soon30'; }), s90 = c.list.filter(function (x) { return x.state === 'soon90'; });
    if (exp.length) { sc('certExpired', 100, 'red', nm(exp[0]) + ' 證書已過期 ' + Math.abs(exp[0].days) + ' 天' + (exp.length > 1 ? '，另有 ' + (exp.length - 1) + ' 張也過期' : '')); A.push({ issue: nm(exp[0]) + ' 證書 ' + exp[0].expiryDate + ' 到期，已過 ' + Math.abs(exp[0].days) + ' 天', who: 'Compliance', what: '確認換證進度，把新證書補進平台' }); }
    if (s30.length) { sc('certSoon30', 88, 'red', nm(s30[0]) + ' 證書剩 ' + s30[0].days + ' 天到期（' + md(s30[0].expiryDate) + '）'); A.push({ issue: nm(s30[0]) + ' 證書 ' + s30[0].expiryDate + ' 到期，剩 ' + s30[0].days + ' 天', who: 'Compliance', what: '這週確認換證稽核日期' }); }
    if (F.caps.overdue) { var o = F.caps.list[0]; sc('capOverdue', 90, 'red', (o.standard ? o.standard + ' ' : '') + '缺失 ' + F.caps.overdue + ' 項已過改善期限，平台上還沒有結案記錄'); A.push({ issue: '過期未結的缺失 ' + F.caps.overdue + ' 項，最久過 ' + Math.abs(o.days) + ' 天' + (F.caps.repeat ? '；其中 ' + F.caps.repeat + ' 項是之前驗廠也被開過的重複缺失' : ''), who: o.owner || 'Compliance', what: '已改善的補上證據按結案；還沒好的寫新的完成日' }); }
    var vf = c.list.filter(function (x) { return x.state === 'verify' || x.state === 'nodate'; });
    vf.sort(function (x, y) { return (x.kind === 'cert' ? 0 : 1) - (y.kind === 'cert' ? 0 : 1); });
    if (vf.length) { sc('certVerify', 74, 'yellow', '證書／許可有 ' + vf.length + ' 張到期日待確認'); A.push({ issue: '到期日待確認 ' + vf.length + ' 張：' + vf.slice(0, 3).map(function (x) { return x.standard || x.name; }).join('、') + (vf.length > 3 ? '…' : ''), who: 'Compliance', what: '點開每張證書補上新的到期日（附掃描檔）' }); }
    var ua = F.audits.upcoming.filter(function (u) { return u.kind === 'audit' && u.days <= 30; });
    if (ua.length) { sc('auditSoon', 80, 'yellow', ua[0].what + ' 還有 ' + ua[0].days + ' 天（' + md(ua[0].date) + '）'); A.push({ issue: ua[0].what + ' ' + ua[0].date + '，剩 ' + ua[0].days + ' 天', who: 'Compliance', what: '照檢查表把文件、現場、訪談先走一遍' }); }
    if (F.audits.inPeriod.length) { var a = F.audits.inPeriod[0]; sc('auditDone', 75, 'blue', md(a.date) + ' ' + a.standard + ' 稽核' + (a.result ? '，結果 ' + a.result : '') + (a.ncCount ? '，缺失 ' + a.ncCount + ' 項' : '')); }
    if (s90.length && !s30.length) sc('certSoon90', 60, 'yellow', nm(s90[0]) + ' 證書 ' + s90[0].days + ' 天後到期（' + s90[0].expiryDate + '）');
    if (F.caps.dueSoon && !F.caps.overdue) sc('capDueSoon', 62, 'yellow', '缺失改善 14 天內到期 ' + F.caps.dueSoon + ' 項');
    /* 培訓 */
    if (T.courses) {
      var mo = T.mo, endOfMonth = P.to.slice(8, 10) >= '24' || P.kind === 'month';
      if (T.overdue.length) {
        sc('trainOverdue', T.overdue.length >= 5 ? 72 : 64, 'yellow', '培訓有 ' + T.overdue.length + ' 門課排了沒上、也還沒補');
        A.push({ issue: '沒上也沒補的課 ' + T.overdue.length + ' 門：' + T.overdue.slice(0, 3).map(function (x) { return x.name + '（' + x.month + '月）'; }).join('、') + (T.overdue.length > 3 ? '…' : ''), who: 'HR', what: '排進 ' + (T.nextMonth && P.kind === 'month' ? T.nextMonth : T.month) + ' 月，或在計劃表改成取消並寫原因' });
      }
      if (mo && mo.plan && P.kind === 'month') {
        if (mo.pct != null && mo.pct >= 90) sc('trainMonthGood', 45, 'green', T.month + ' 月培訓計劃 ' + mo.plan + ' 門做完 ' + mo.done + ' 門（' + mo.pct + '%）');
        else if (mo.pct != null) sc('trainMonthLow', mo.pct < 60 ? 70 : 55, mo.pct < 60 ? 'red' : 'yellow', T.month + ' 月培訓計劃 ' + mo.plan + ' 門只做完 ' + mo.done + ' 門（' + mo.pct + '%）');
      } else if (mo && mo.wait && endOfMonth && P.kind === 'week') {
        sc('trainMonthEnd', 58, 'yellow', T.month + ' 月快結束，還有 ' + mo.wait + ' 門課沒上');
      }
      if (!T.period.sessions) { if (P.kind === 'week' && P.to <= F.today) sc('trainNone', 35, 'blue', '這週沒有培訓記錄'); if (P.kind === 'month') sc('trainNone', 66, 'yellow', T.month + ' 月沒有任何培訓記錄'); }
      else sc('trainHeld', 30, 'green', '培訓 ' + T.period.sessions + ' 場、' + T.period.attendees + ' 人次');
      if (T.lastRecord && diffDays(today, parse(T.lastRecord)) > 21 && P.to >= T.lastRecord) { sc('trainStale', 68, 'yellow', '培訓記錄只到 ' + md(T.lastRecord) + '，之後 ' + diffDays(today, parse(T.lastRecord)) + ' 天沒有新資料'); A.push({ issue: '培訓記錄停在 ' + T.lastRecord, who: 'HR', what: '把 ' + (today.getMonth() + 1) + ' 月已上的課補進平台（匯入月報 Excel 即可）' }); }
    } else sc('trainNoData', 40, 'blue', '培訓計劃還沒有資料');
    if (F.docs.expired) { sc('docsExpired', 57, 'yellow', '管制文件過期 ' + F.docs.expired + ' 份'); A.push({ issue: '過期文件 ' + F.docs.expired + ' 份', who: 'DCC', what: '改版或延長有效期' }); }
    if (!c.total && !F.audits.total) { sc('noAuditData', 50, 'blue', '證書和稽核記錄還沒建檔，這份報告只看得到培訓'); A.push({ issue: '平台還沒有證書、稽核結果、缺失的資料', who: 'Compliance', what: '把 WRAP／GRS／WSE 的證書與最近一次稽核報告建檔' }); }
    if (!S.length || S.every(function (x) { return x.light === 'green'; })) sc('steady', 10, 'green', '沒有到期或逾期的項目');
    S.sort(function (a, b) { return b.w - a.w; });
    F.scen = S;
    var rank = { red: 3, yellow: 2, blue: 1, green: 0, gray: 0 }, top = S[0];
    F.light = S.reduce(function (m, x) { return rank[x.light] > rank[m] ? x.light : m; }, 'green');
    if (F.light === 'blue') F.light = S.some(function (x) { return x.light === 'green'; }) ? 'green' : 'blue';
    F.headline = top.text;
    F.second = S[1] && S[1].w >= 60 ? S[1].text : '';
    F.tags = S.slice(F.second ? 2 : 1, 6).map(function (x) { return x.text; });
    F.actions = A.slice(0, 4);
    function nm(x) { return x.standard || x.name; }
  }

  /* ── Telegram 文字 ── */
  var ICON = { red: '🔴', yellow: '🟡', green: '🟢', blue: '🔵', gray: '⚪' };
  function bar(pct) { if (pct == null) return '⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜'; var n = Math.max(0, Math.min(10, Math.round(pct / 10))), c = pct >= 90 ? '🟩' : pct >= 60 ? '🟨' : '🟥', s = ''; for (var i = 0; i < 10; i++) s += i < n ? c : '⬜'; return s; }
  function toTelegram(F) {
    var P = F.period, T = F.training, L = [], kind = P.kind === 'month' ? '月報 Monthly' : '週報 Weekly';
    L.push('📂 <b>AC Audit ' + kind + '｜' + esc(P.label) + '</b>');
    (F.notes || []).slice(0, 2).forEach(function (n) { L.push('📌 ' + esc(n)); });
    L.push(ICON[F.light] + ' <b>' + esc(F.headline) + '</b>');
    if (F.second) L.push('　 ' + esc(F.second));
    if (F.tags && F.tags.length) L.push('🏷 ' + F.tags.slice(0, 3).map(esc).join('｜'));
    L.push('');
    /* 證書 */
    if (F.certs.total) {
      L.push('🏅 <b>證書 Certificates</b>　有效 ' + F.certs.valid + '｜快到期 ' + F.certs.soon + '｜過期 ' + F.certs.expired + (F.certs.verify + F.certs.nodate ? '｜待確認 ' + (F.certs.verify + F.certs.nodate) : ''));
      F.certs.list.filter(function (c) { return c.state !== 'verify' && c.state !== 'nodate' && (P.kind === 'month' || c.light !== 'green'); }).slice(0, 5).forEach(function (c) { L.push('　' + ICON[c.light] + ' ' + esc(c.standard || c.name) + (c.grade ? ' ' + esc(c.grade) : '') + '　' + esc(c.expiryDate) + (c.days < 0 ? '（過期 ' + (-c.days) + ' 天）' : '（剩 ' + c.days + ' 天）')); });
    } else L.push('🏅 <b>證書 Certificates</b>　還沒建檔');
    /* 稽核 */
    if (F.audits.last.length) {
      L.push('📋 <b>稽核 Audits</b>　最近結果');
      F.audits.last.slice(0, P.kind === 'month' ? 5 : 3).forEach(function (a) { L.push('　' + ICON[a.light] + ' ' + esc(a.standard) + '　' + esc(a.date) + (a.result ? '　' + esc(a.result) : '') + (a.ncCount != null ? '　缺失 ' + a.ncCount : '')); });
    }
    if (F.caps.total) { L.push('🛠 <b>缺失 CAP</b>　未結 ' + F.caps.open + '｜逾期 ' + F.caps.overdue + '｜14 天內到期 ' + F.caps.dueSoon + '｜已結 ' + F.caps.closed); var nc = P.kind === 'month' ? 5 : 3; F.caps.list.slice(0, nc).forEach(function (c) { L.push('　' + ICON[c.light] + ' ' + (c.clause ? esc(c.clause) + ' ' : '') + esc(String(c.desc).slice(0, 22)) + (c.due ? '　' + md(c.due) + (c.days < 0 ? ' 過 ' + (-c.days) + ' 天' : '') : '') + (c.repeat ? ' 🔁重複' : '')); }); if (F.caps.list.length > nc) L.push('　… 另 ' + (F.caps.list.length - nc) + ' 項'); }
    /* 培訓 */
    if (T.courses) {
      var mo = T.mo;
      L.push('🎓 <b>培訓 Training</b>　' + T.month + ' 月計劃 ' + (mo.plan - mo.cancel) + ' 門：完成 ' + mo.done + '｜未上 ' + mo.wait + '｜延後 ' + mo.post);
      L.push('　' + bar(mo.pct) + ' ' + (mo.pct == null ? '—' : mo.pct + '%'));
      L.push('　' + (P.kind === 'month' ? '本月' : '本週') + ' ' + T.period.sessions + ' 場｜' + T.period.attendees + ' 人次｜' + T.period.hours + ' 小時');
      T.period.list.slice(0, P.kind === 'month' ? 6 : 5).forEach(function (r) { L.push('　• ' + md(r.date) + ' ' + esc(String(r.subject).slice(0, 34)) + '　' + r.attendees + ' 人'); });
      if (T.period.list.length > (P.kind === 'month' ? 6 : 5)) L.push('　… 另 ' + (T.period.list.length - (P.kind === 'month' ? 6 : 5)) + ' 場');
      L.push('　年度累計 YTD：應上 ' + (T.ytd.plan - T.ytd.cancel) + ' 門次、已上 ' + T.ytd.done + '（' + (T.ytd.pct == null ? '—' : T.ytd.pct + '%') + '）｜' + T.ytd.sessions + ' 場｜' + T.ytd.attendees + ' 人次');
      if (mo.wait && T.names.wait.length) L.push('　⏳ 本月還沒上：' + T.names.wait.slice(0, 4).map(esc).join('、') + (T.names.wait.length > 4 ? ' 等 ' + T.names.wait.length + ' 門' : ''));
    }
    if (F.docs.total) L.push('🗄 <b>文件 DCC</b>　' + F.docs.total + ' 份｜過期 ' + F.docs.expired + '｜60 天內要審 ' + F.docs.reviewDue);
    /* 接下來 */
    var up = F.audits.upcoming.filter(function (u) { return u.days <= 60; }).slice(0, 4);
    if (up.length) { L.push('📅 <b>接下來 Next</b>'); up.forEach(function (u) { L.push('　• ' + md(u.date) + '（' + u.days + ' 天）' + esc(u.what)); }); }
    if (F.updates.count) L.push('🔔 資料異動 Updates：' + F.updates.count + ' 筆');
    if (F.actions.length) {
      L.push(''); L.push('⚠️ <b>要處理 To do</b>');
      F.actions.forEach(function (a, i) { L.push((i + 1) + '. ' + esc(a.issue)); L.push('　→ ' + esc(a.who) + '：' + esc(a.what)); });
    }
    L.push(''); L.push('🗓 資料日期：培訓記錄到 ' + (F.dataDates.training || '—') + (F.dataDates.audit ? '｜稽核資料 ' + F.dataDates.audit : '') + '　✅ 數字由系統計算核對');
    return L.join('\n');
  }

  /* ── bot 簡答 ── */
  function answer(db, tr, q, todayStr) {
    var s = low(q), F = build(db, tr, { period: 'week', today: todayStr }), FM = build(db, tr, { period: 'month', today: todayStr }), T = FM.training, L = [];
    if (/cert|證書|到期|expire|expiry/.test(s)) {
      if (!F.certs.total) return '🏅 證書還沒建檔。';
      L.push('🏅 <b>證書狀況 Certificates</b>'); F.certs.list.forEach(function (c) { L.push(ICON[c.light] + ' <code>' + esc(c.id) + '</code> ' + esc(c.standard || c.name) + (c.certNo ? ' <code>' + esc(c.certNo) + '</code>' : '') + '　' + (c.state === 'verify' || c.state === 'nodate' ? '到期日待確認' : esc(c.expiryDate) + (c.days < 0 ? '（過期 ' + (-c.days) + ' 天）' : '（剩 ' + c.days + ' 天）'))); });
      L.push('補到期日：<code>/expiry 編號 2027-03-14</code>');
      return L.join('\n');
    }
    if (/cap|缺失|改善|finding|nc\b/.test(s)) {
      if (!F.caps.total) return '🛠 目前沒有缺失記錄。';
      L.push('🛠 <b>缺失 CAP</b>　未結 ' + F.caps.open + '｜逾期 ' + F.caps.overdue + '｜已結 ' + F.caps.closed);
      F.caps.list.slice(0, 10).forEach(function (c, i) { L.push(ICON[c.light] + ' <code>' + esc(c.id) + '</code> ' + (c.clause ? esc(c.clause) + ' ' : '') + esc(String(c.desc).slice(0, 48)) + (c.due ? '　' + esc(c.due) : '') + (c.owner ? '　' + esc(c.owner) : '')); });
      L.push('結案：<code>/done 編號</code>　改期限：<code>/due 編號 2026-12-01</code>');
      return L.join('\n');
    }
    if (/train|培訓|訓練|課/.test(s)) {
      var mo = T.mo; L.push('🎓 <b>培訓 Training｜' + T.month + ' 月</b>');
      L.push(bar(mo.pct) + ' ' + (mo.pct == null ? '—' : mo.pct + '%') + '　計劃 ' + (mo.plan - mo.cancel) + '｜完成 ' + mo.done + '｜未上 ' + mo.wait + '｜延後 ' + mo.post);
      if (T.names.wait.length) L.push('⏳ 還沒上：' + T.names.wait.map(esc).join('、'));
      L.push('📝 本月 ' + T.period.sessions + ' 場｜' + T.period.attendees + ' 人次');
      if (T.overdue.length) L.push('⚠️ 排了沒上也沒補：' + T.overdue.slice(0, 8).map(function (x) { return esc(x.name) + '（' + x.month + '月）'; }).join('、'));
      L.push('📈 年度累計：應上 ' + (T.ytd.plan - T.ytd.cancel) + ' 門次、已上 ' + T.ytd.done + '（' + (T.ytd.pct == null ? '—' : T.ytd.pct + '%') + '）｜' + T.ytd.sessions + ' 場｜' + T.ytd.attendees + ' 人次');
      return L.join('\n');
    }
    if (/next|upcoming|接下來|下次|行程|什麼時候|何時|when/.test(s)) {
      var up = F.audits.upcoming.slice(0, 8); if (!up.length) return '📅 接下來 120 天沒有已登記的稽核或到期日。';
      L.push('📅 <b>接下來 Next</b>'); up.forEach(function (u) { L.push('• ' + esc(u.date) + '（' + u.days + ' 天）' + esc(u.what)); }); return L.join('\n');
    }
    if (/audit|稽核|驗廠|結果|result/.test(s)) {
      if (!F.audits.last.length) return '📋 稽核記錄還沒建檔。';
      L.push('📋 <b>最近稽核結果 Latest audits</b>'); F.audits.last.forEach(function (a) { L.push(ICON[a.light] + ' ' + esc(a.standard) + '　' + esc(a.date) + (a.result ? '　' + esc(a.result) : '') + (a.ncCount != null ? '　缺失 ' + a.ncCount : '') + (a.nextDue ? '　下次 ' + esc(a.nextDue) : '')); });
      return L.join('\n');
    }
    return '';
  }

  function find(db, tr, q) {
    var k = low(q).trim(), L = [], n = 0; if (!k) return '';
    function hit(o) { return low(JSON.stringify(o)).indexOf(k) >= 0; }
    arr(db.certs).forEach(function (r) { if (n < 12 && hit(r)) { n++; L.push('🏅 <code>' + esc(r.id) + '</code> ' + esc(r.standard) + ' ' + esc(r.name || '') + (r.expiryDate ? '　到期 ' + esc(r.expiryDate) : '')); } });
    arr(db.audits).concat(arr(db.wse_assessment)).concat(arr(db.assessments)).forEach(function (r) { if (n < 12 && hit(r)) { n++; L.push('📋 ' + esc(String(r.date || '').slice(0, 10)) + ' ' + esc(r.auditType || r.assessmentType || '') + ' ' + esc(String(r.title || r.auditName || '').slice(0, 40)) + (r.result ? '　' + esc(r.result) : '')); } });
    arr(db.caps).forEach(function (r) { if (n < 12 && hit(r)) { n++; L.push('🛠 <code>' + esc(r.id) + '</code> ' + esc(String(r.description || '').slice(0, 44)) + '　' + esc(r.status || '')); } });
    var recs = (tr && tr.records) || {}; Object.keys(recs).sort().reverse().forEach(function (m) { arr(recs[m]).forEach(function (r) { if (n < 12 && hit(r)) { n++; L.push('🎓 ' + esc(String(r.date).slice(0, 10)) + ' ' + esc(String(r.subject).slice(0, 40)) + '　' + (+r.attendees || 0) + ' 人'); } }); });
    return L.length ? '🔎 <b>「' + esc(q) + '」找到 ' + n + ' 筆</b>\n' + L.join('\n') : '🔎 找不到「' + esc(q) + '」';
  }
  return { find: find, build: build, toTelegram: toTelegram, answer: answer, periodOf: periodOf, hoursOf: hoursOf, bar: bar, ymd: ymd, parse: parse, ICON: ICON, md: md, mdw: mdw, esc: esc };
})();
if (typeof module !== 'undefined') module.exports = ACR;
