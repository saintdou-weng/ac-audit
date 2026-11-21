/* VRT 培訓 · 自動雲端同步 training_autosync.js v1
   Audit、HRA Portal、Admin OS、PSJHR 開的都是 vrt_training_v1.html 這一頁、同一個雲端（Unified GAS saveAll / getAll）。
   原本要手動按「上傳／下載」，而且上傳是整份覆蓋；這支改成自動、而且先合併再上傳：
   • 開頁、每 2 分鐘、回到頁面時：抓雲端 → 逐筆三方比對（上次同步 / 本機 / 雲端）→ 兩邊新增都保留、只有一邊改就用那一邊、
     一邊刪除就刪除、兩邊都改以本機為準 → 有差才上傳
   • 本機一存檔，幾秒後自動上傳（上傳前一樣先抓雲端合併，不會蓋掉別台裝置剛加的記錄）
   • 沒同步過的新裝置：直接用雲端資料，不會拿預設值去蓋雲端
   不改 GAS、不改原頁面的任何函式；手動的上傳／下載鈕照舊可用。 */
(function(){
'use strict';
if(window.TRAuto)return;
var BASE='vrt3_base',KEYS=['vrt3_tr','vrt3_rc','vrt3_lb'],st={busy:false,sig:'',t:null,last:0,again:false,act:0};
var J=JSON.stringify;
function hash(s){var h=5381;for(var i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return String(h)}
function sig(){return KEYS.map(function(k){var v=localStorage.getItem(k)||'';return v.length+':'+hash(v)}).join('|')}
function stored(){return KEYS.some(function(k){return localStorage.getItem(k)!==null})}
function rid(r){return r.id!==undefined&&r.id!==null&&r.id!==''?String(r.id):[r.date||'',r.subject||'',r.trainer||''].join('|')}
function nm(x){return [x.nameZH||'',x.nameEN||'',x.name||'',x.title||'',x.category||''].join('|')}
/* 雲端（Google Sheet）存這些欄位，比對只看這些（記錄的附件 evidence 雲端也有存，用檔案代號比）；雲端沒有的欄位（高棉文對象、下拉選項）走 vrt3_extra 另外同步 */
var S_=function(v){return v===undefined||v===null?'':String(v)},N_=function(v){return Number(v)||0};
function cT(t){var m={};for(var i=1;i<=12;i++)m[i]=N_((t.months||{})[i]);return {id:N_(t.id),category:S_(t.category),nameZH:S_(t.nameZH),nameEN:S_(t.nameEN),nameKH:S_(t.nameKH),trainer:S_(t.trainer),hours:Number(t.hours)||1,traineeZH:S_(t.traineeZH),traineeEN:S_(t.traineeEN),frequency:S_(t.frequency),months:m,remarks:S_(t.remarks),type:S_(t.type)||'internal',organizer:S_(t.organizer),outlineZH:S_(t.outlineZH),outlineEN:S_(t.outlineEN)}}
function cR(r){return {id:S_(r.id),subject:S_(r.subject),dept:S_(r.dept),trainer:S_(r.trainer),date:S_(r.date).slice(0,10),time:S_(r.time),duration:S_(r.duration),participant:S_(r.participant),attendees:N_(r.attendees),absences:N_(r.absences),remarks:S_(r.remarks),ev:(Array.isArray(r.evidence)?r.evidence:[]).map(function(e){return e?S_(e.driveId||e.signature||e.url||e.name):''}).join(',')}}
function cL(x){return {id:N_(x.id),category:S_(x.category),nameZH:S_(x.nameZH),nameEN:S_(x.nameEN),nameKH:S_(x.nameKH),type:S_(x.type)||'internal',organizer:S_(x.organizer),trainer:S_(x.trainer),traineeZH:S_(x.traineeZH),traineeEN:S_(x.traineeEN),outlineZH:S_(x.outlineZH),outlineEN:S_(x.outlineEN)}}
function readBase(){try{return JSON.parse(localStorage.getItem(BASE)||'null')}catch(e){return null}}
/* 一個集合（陣列）逐筆合併。idOf 取鍵；numeric=true 時處理「兩台各自新增、流水號撞號」 */
function mergeList(L,R,B,idOf,canon,numeric){
  L=Array.isArray(L)?L:[];R=Array.isArray(R)?R:[];var hasB=!!B;B=B||{};
  var h=function(x){return hash(J(canon(x)))},rm={},lm={},out=[],extra=[];R.forEach(function(x){rm[idOf(x)]=x});L.forEach(function(x){lm[idOf(x)]=x});
  L.forEach(function(x){var id=idOf(x),r=rm[id],hx=h(x);
    if(r===undefined){ if(id in B&&B[id]===hx)return; /* 雲端刪了、本機沒動 → 跟著刪 */ out.push(x);return }
    if(hx===h(r)){out.push(x);return}
    if(id in B){ out.push(B[id]===hx?Object.assign({},x,r):x); /* 只有雲端改→用雲端（本機多的欄位留著）；本機改或兩邊都改→本機 */ return }
    if(numeric&&nm(x)!==nm(r)){out.push(r);extra.push(x);return} /* 撞號：雲端那筆保留原號，本機那筆換新號 */
    out.push(hasB?x:Object.assign({},x,r))}); /* 整台沒同步過 → 雲端為準 */
  R.forEach(function(x){var id=idOf(x);if(id in lm)return;if(id in B&&B[id]===h(x))return; /* 本機刪了、雲端沒動 → 刪 */ out.push(x)});
  if(extra.length){var mx=0;out.forEach(function(x){var n=Number(x.id);if(n>mx)mx=n});extra.forEach(function(x){var c=JSON.parse(J(x));c.id=++mx;out.push(c)})}
  return {out:out,base:mk(out,idOf,canon)}}
function mk(a,idOf,canon){var b={};a.forEach(function(x){b[idOf(x)]=hash(J(canon(x)))});return b}
function mergeAll(Lc,Rm,B){B=B||null;var sid=function(x){return String(x.id)};
  var t=mergeList(Lc.trainings,Rm.trainings,B&&(B.t||{}),sid,cT,true),l=mergeList(Lc.library,Rm.library,B&&(B.l||{}),sid,cL,true);
  var rec={},rb={},lr=Lc.records||{},rr=Rm.records||{},ks={};Object.keys(lr).concat(Object.keys(rr)).forEach(function(k){ks[k]=1});
  Object.keys(ks).sort().forEach(function(k){var m=mergeList(lr[k],rr[k],B?((B.r||{})[k]||{}):null,rid,cR,false);
    /* 同課程＋日期＋講師視為同一筆（原頁面本來就擋重複） */
    var inR={};(rr[k]||[]).forEach(function(x){inR[rid(x)]=1});var seen={},o=[];m.out.forEach(function(x){var q=[x.subject||'',x.date||'',x.trainer||''].join('|');if(x.date&&q in seen){if(inR[rid(x)]&&!inR[rid(o[seen[q]])])o[seen[q]]=x;return}seen[q]=o.length;o.push(x)});
    rec[k]=o;rb[k]=mk(o,rid,cR)});
  return {trainings:t.out,library:l.out,records:rec,base:{t:t.base,l:l.base,r:rb}}}
/* 用雲端看得到的欄位比較兩份資料是否一樣（順序不論） */
function finger(d){var o={t:mk(d.trainings||[],function(x){return String(x.id)},cT),l:mk(d.library||[],function(x){return String(x.id)},cL),r:{}};Object.keys(d.records||{}).sort().forEach(function(k){if((d.records[k]||[]).length)o.r[k]=mk(d.records[k],rid,cR)});
  var srt=function(m){var q={};Object.keys(m).sort().forEach(function(k){q[k]=m[k]});return q};o.t=srt(o.t);o.l=srt(o.l);Object.keys(o.r).forEach(function(k){o.r[k]=srt(o.r[k])});return J(o)}
/* 這台裝置從沒自動同步過：本機那些「原封不動的預設資料」如果雲端已經沒有（被刪了），就不要再帶回雲端 */
function dropDefaults(Lc,R){var dt={},dl={},dr={};try{DEF_TR.forEach(function(x){dt[x.id]=nm(x)});DEF_LIB.forEach(function(x){dl[x.id]=nm(x)});Object.keys(DEF_REC).forEach(function(k){DEF_REC[k].forEach(function(x){dr[k+'|'+x.id]=[x.subject,x.date].join('|')})})}catch(e){}
  var rt={},rl={};R.trainings.forEach(function(x){rt[x.id]=1});R.library.forEach(function(x){rl[x.id]=1});
  var o={trainings:R.trainings.length?(Lc.trainings||[]).filter(function(x){return (x.id in rt)||dt[x.id]!==nm(x)}):Lc.trainings,
         library:R.library.length?(Lc.library||[]).filter(function(x){return (x.id in rl)||dl[x.id]!==nm(x)}):Lc.library,records:{}};
  var anyR=Object.keys(R.records).length>0;Object.keys(Lc.records||{}).forEach(function(k){var rs={};(R.records[k]||[]).forEach(function(x){rs[rid(x)]=1});
    o.records[k]=anyR?(Lc.records[k]||[]).filter(function(x){return rs[rid(x)]||dr[k+'|'+x.id]!==[x.subject,x.date].join('|')}):Lc.records[k]});return o}
/* 保險：雲端回來的筆數比上次同步少一大半（多半是 GAS 讀取出錯），這次就不動，免得把本機當成「雲端刪了」而清掉 */
function suspicious(R,B){var n=function(o){return o?Object.keys(o).length:0};var bt=n(B.t),br=0,rr=0;Object.keys(B.r||{}).forEach(function(k){br+=n(B.r[k])});Object.keys(R.records).forEach(function(k){rr+=(R.records[k]||[]).length});
  return (bt>=4&&R.trainings.length<bt*0.5)||(br>=6&&rr<br*0.5)}
function editing(){try{if(S.editT||S.editR||S.editL)return true}catch(e){}
  var a=document.activeElement;if(a&&a!==document.body&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))return true;
  var ms=document.querySelectorAll('.modal');for(var i=0;i<ms.length;i++)if(ms[i].offsetParent!==null)return true;return false}
function gasUrl(){try{return (getCfg().gasUrl||'').trim()}catch(e){return ''}}
function local(){return {trainings:S.trainings,records:S.records,library:S.library}}
function setLocal(m){S.trainings=m.trainings;S.records=m.records;S.library=m.library;
  localStorage.setItem('vrt3_tr',J(S.trainings));localStorage.setItem('vrt3_rc',J(S.records));localStorage.setItem('vrt3_lb',J(S.library));
  try{if(typeof rebuildDataLists==='function')rebuildDataLists();if(typeof renderActive==='function')renderActive();if(typeof renderPills==='function')renderPills()}catch(e){console.warn('TRAuto render',e)}}
function mark(ok,msg){try{if(ok){var ts=new Date().toLocaleString('zh-TW',{hour12:false}).slice(0,16);setCfg({lastSync:ts,needsSync:false})}updSyncBadge();var t=document.getElementById('sync-text');if(t&&msg)t.textContent=msg}catch(e){}}
function run(why){
  var url=gasUrl();if(!url||typeof S==='undefined')return Promise.resolve(false);
  if(st.busy){st.again=true;return Promise.resolve(false)}
  if(navigator.onLine===false)return Promise.resolve(false);
  if(editing()&&why!=='manual'){clearTimeout(st.t);st.t=setTimeout(function(){run('retry')},8000);return Promise.resolve(false)}
  st.busy=true;
  return fetch(url+'?action=getAll').then(function(r){return r.json()}).then(function(d){
    if(!d||d.error)throw new Error((d&&d.error)||'getAll failed');
    var R={trainings:Array.isArray(d.trainings)?d.trainings:[],records:(d.records&&typeof d.records==='object')?d.records:{},library:Array.isArray(d.library)?d.library:[]};
    var cloudEmpty=!R.trainings.length&&!Object.keys(R.records).length&&!R.library.length;
    /* 雲端是空的＝還沒初始化或讀取出錯：自動同步不動任何一邊（要把本機資料放上空的雲端，請按原本的「上傳」鈕） */
    if(cloudEmpty){st.last=Date.now();return false}
    var B=readBase(),fresh=false,Lc=local();
    if(B&&suspicious(R,B))throw new Error('cloud data looks incomplete — skipped, nothing changed');
    if(!B){ /* 這台第一次自動同步：以雲端為準合併。先把本機原本那份留一個備份（只留一份），萬一本機有還沒上傳的修改可以救回來 */
      try{if(stored()&&finger(Lc)!==finger(R)&&!localStorage.getItem('vrt3_backup_first_autosync'))localStorage.setItem('vrt3_backup_first_autosync',J({at:new Date().toISOString(),trainings:Lc.trainings,records:Lc.records,library:Lc.library}))}catch(e){}
      Lc=dropDefaults(Lc,R)}
    var m=mergeAll(Lc,R,B);
    var fm=finger(m),needUp=fm!==finger(R)&&!(cloudEmpty&&fresh),needDown=fm!==finger(local());
    var fin=function(){if(needDown){if(!st.xhold)writeExtra();setLocal(m);if(!st.xhold&&applyExtra(true))writeExtra()}try{localStorage.setItem(BASE,J(m.base))}catch(e){}st.sig=sig();st.last=Date.now();
      mark(true);if(needDown&&why!=='open'&&typeof toast==='function')toast((typeof LANG!=='undefined'&&LANG==='en')?'☁ Training data updated from cloud':'☁ 已載入雲端最新培訓資料','ok');return true};
    if(!needUp)return fin();
    return fetch(url,{method:'POST',headers:{'Content-Type':'text/plain'},body:J({action:'saveAll',trainings:m.trainings,records:m.records,library:m.library,by:'autosync'})}).then(function(r){return r.json()}).then(function(u){
      if(!(u&&(u.status==='ok'||u.ok===true)))throw new Error((u&&(u.msg||u.error))||'saveAll failed');return fin()});
  }).catch(function(e){console.warn('TRAuto',e);mark(false);return false})
    .then(function(r){st.busy=false;if(st.again){st.again=false;setTimeout(function(){run('again')},1000)}return r});
}
/* ---- 雲端 Sheet 沒有的欄位：高棉文對象、下拉選項 → 走 AC_AUDIT_DB.tools 的 vrt3_extra，同樣自動合併 ---- */
var XK='vrt3_extra';
function srt(o){var q={};Object.keys(o||{}).sort().forEach(function(k){q[k]=o[k]});return q}
function buildExtra(){var x={kh:{},opts:srt(S.opts||{})};(S.trainings||[]).forEach(function(t){if(t.traineeKH)x.kh[t.id]=t.traineeKH});return x}
/* 本機沒有那門課（還沒下載到）不等於「被清掉了」：那些鍵原樣留著 */
function writeExtra(){try{var x=buildExtra(),prev=null;try{prev=JSON.parse(localStorage.getItem(XK)||'null')}catch(e){}
    if(prev){var ht={};(S.trainings||[]).forEach(function(t){ht[t.id]=1});Object.keys(prev.kh||{}).forEach(function(k){if(!(k in x.kh)&&!ht[k])x.kh[k]=prev.kh[k]})}
    x.kh=srt(x.kh);var tx=J(x);if(localStorage.getItem(XK)!==tx)localStorage.setItem(XK,tx)}catch(e){}}
function applyExtra(first){var x;try{x=JSON.parse(localStorage.getItem(XK)||'null')}catch(e){x=null}if(!x||editing())return false;var ch=false;
  (S.trainings||[]).forEach(function(t){var v=(x.kh||{})[t.id]||'';if(first&&!v)return;if((t.traineeKH||'')!==v){t.traineeKH=v;ch=true}});
  if(!first&&x.opts&&J(srt(x.opts))!==J(srt(S.opts||{}))&&Object.keys(x.opts).length){S.opts=x.opts;try{localStorage.setItem('vrt3_opts',J(S.opts))}catch(e){}ch=true}
  if(ch){localStorage.setItem('vrt3_tr',J(S.trainings));st.sig=sig();try{if(typeof rebuildDataLists==='function')rebuildDataLists();renderActive()}catch(e){}}return ch}
function tick(){var s=sig();if(s!==st.sig||J(S.opts||{})!==st.o){st.o=J(S.opts||{});if(!st.xhold)writeExtra();}if(s!==st.sig){st.sig=s;clearTimeout(st.t);st.t=setTimeout(function(){run('local')},5000)}}
/* 從 HRA Portal 進來的：左下的返回鈕改成回 HRA Portal */
function backBtn(){try{var from=/[?&]from=hra\b/.test(location.search)||/\/ac-hra-portal\//.test(document.referrer||'');if(!from)return;var b=document.querySelector('.ac-audit-back-btn');if(b){b.href='../ac-hra-portal/hra_portal_v2.html';b.textContent='← HRA Portal'}}catch(e){}}
function boot(){backBtn();st.sig=sig();st.o=J(S.opts||{});
  /* 先看雲端有沒有別台傳上來的附件，再把本機的寫出去（第一次開不要拿空的去蓋） */
  if(window.ACAuto&&window.ACTS){st.xhold=localStorage.getItem(XK)===null;ACAuto.init({keys:[XK],by:'training',badge:false,first:600,editing:editing,onPull:function(){applyExtra(st.xhold);st.xhold=false;writeExtra()},onState:function(s){if(s==='ok'&&st.xhold){applyExtra(true);st.xhold=false;writeExtra()}}})}
  setTimeout(function(){run('open')},1200);setInterval(tick,3000);
  setInterval(function(){if(document.visibilityState!=='hidden')run('poll')},120000);
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible'&&Date.now()-st.last>30000)run('back')});
  window.addEventListener('online',function(){run('online')});
  /* 同一台裝置別的分頁（例如另一個平台的同一頁）改了資料 → 這一頁也換成新的 */
  window.addEventListener('storage',function(ev){if(KEYS.indexOf(ev.key)<0||ev.newValue===ev.oldValue)return;clearTimeout(boot.s);boot.s=setTimeout(function re(){if(editing()){boot.s=setTimeout(re,5000);return}try{load();if(typeof rebuildDataLists==='function')rebuildDataLists();renderActive();st.sig=sig()}catch(e){}},600)})}
window.TRAuto={run:run,mergeAll:mergeAll,backup:function(){try{return JSON.parse(localStorage.getItem('vrt3_backup_first_autosync')||'null')}catch(e){return null}},state:function(){return {last:st.last,busy:st.busy}}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
