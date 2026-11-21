/* AC Audit · 自動雲端同步 ac_autosync.js v1
   同一份資料、同一個雲端（Unified GAS 的 AC_AUDIT_DB.tools）：
   Audit、Admin OS、PSJHR、HRA Portal 開的都是這一頁，所以任何一邊改了，其他地方打開就是新的。
   • 開頁先抓雲端合併（三方比對，不覆蓋別台裝置的修改）
   • 本機一有變動，幾秒後自動上傳；每 90 秒與回到頁面時再對一次
   • 同一台裝置別的分頁改了，這一頁也會跟著更新
   不改 GAS。用法：ACAuto.init({keys:['vrt_dcc_v2'],by:'dcc',onPull:fn}) */
(function(g){
  if(g.ACAuto)return;
  var DEF='https://script.google.com/macros/s/AKfycbxOXfNmyfqZI6f9Uc__hxcmuiQt-QowkULw23GggAKM6nZ1mQ8DcOx5rwxa7d0obpIf/exec';
  var st={keys:[],by:'tool',busy:false,sig:'',t:null,opts:{},last:0,pend:false,state:'idle',err:'',act:0,mem:{},mtx:{}};
  function gas(){try{var c=JSON.parse(localStorage.getItem('ac_audit_config')||'{}');return String(c.gasUrl||DEF).trim()}catch(e){return DEF}}
  function post(b){return fetch(gas(),{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(b)}).then(function(r){return r.json()})}
  function hash(s){var h=5381;for(var i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return h}
  function sig(){return st.keys.map(function(k){var v=localStorage.getItem(k)||'';return v.length+':'+hash(v)}).join('|')}
  function lang(){return document.documentElement.lang&&/^en/i.test(document.documentElement.lang)?'en':(document.body&&document.body.getAttribute('data-lang'))||localStorage.getItem('vrt_lang')||'zh'}
  function L(zh,en,km){var l=lang();return l==='en'?en:l==='km'?(km||en):zh}
  function editing(){if(st.opts.editing&&st.opts.editing())return true;var a=document.activeElement;return !!(a&&a!==document.body&&(/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)||a.isContentEditable))}
  function hhmm(t){var d=new Date(t);return ('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2)}
  function badge(){
    if(st.opts.badge===false)return;
    var el=document.getElementById('acAutoBadge');
    if(!el){if(!document.body)return;el=document.createElement('button');el.id='acAutoBadge';el.type='button';el.className='noprint';
      el.style.cssText='position:fixed;left:8px;bottom:8px;z-index:9990;border:1px solid rgba(0,0,0,.14);border-radius:999px;padding:4px 10px;font:600 11px/1.3 system-ui,-apple-system,"Noto Sans TC",sans-serif;background:#fff;color:#334155;box-shadow:0 2px 8px rgba(0,0,0,.14);cursor:pointer;opacity:.94;max-width:70vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
      el.onclick=function(){if(st.pend)settle();else run('manual')};document.body.appendChild(el)}
    var m={idle:['☁️',L('雲端同步','Cloud sync','សមកាលកម្ម')],wait:['🔄',L('同步中…','Syncing…','កំពុងធ្វើសមកាលកម្ម…')],ok:['✅',L('已同步 ','Synced ','បានធ្វើសមកាលកម្ម ')+(st.last?hhmm(st.last):'')],off:['📴',L('離線，連上後自動同步','Offline — will sync when online','គ្មានអ៊ីនធឺណិត')],err:['⚠️',L('同步失敗，點我重試','Sync failed — tap to retry','បរាជ័យ ចុចម្ដងទៀត')],pend:['⬇️',L('有新資料，點我更新','New data — tap to refresh','មានទិន្នន័យថ្មី')]}[st.pend?'pend':st.state]||['☁️',''];
    el.textContent=m[0]+' '+m[1];el.title=st.err||'';el.style.borderColor=st.state==='err'?'#dc2626':st.pend?'#d97706':'rgba(0,0,0,.14)';
  }
  function set(s,e){st.state=s;st.err=e||'';badge();if(st.opts.onState)try{st.opts.onState(s,e)}catch(_){}}
  function formOpen(){/* 有浮在上面的視窗（新增／編輯表單）開著：先不要重新載入 */
    var els=document.querySelectorAll('input:not([type=hidden]):not([type=file]):not([type=checkbox]):not([type=radio]),textarea');
    for(var i=0;i<els.length&&i<400;i++){var e=els[i];if(!e.offsetParent&&getComputedStyle(e).position!=='fixed')continue;for(var p=e.parentElement;p&&p!==document.body;p=p.parentElement){if(getComputedStyle(p).position==='fixed'&&p.offsetHeight>120&&p.id!=='acAutoBadge')return true}}return false}
  function calm(){return !editing()&&Date.now()-st.act>(st.opts.idle||9000)&&!formOpen()}
  function applyPull(){st.pend=false;st.mem={};st.mtx={};st.sig=sig();if(st.opts.onPull){try{st.opts.onPull()}catch(e){console.warn('ACAuto onPull',e)}}else location.reload();badge()}
  /* 本機資料被（雲端或別的分頁）換新了，但這一頁記憶體裡還是舊的：
     mem＝這頁手上那份、mtx＝現在本機該有的那份。這頁之後若用舊資料存檔，tick() 會把它的修改疊回新資料上，不會把別人的更新蓋掉 */
  function pulled(before){st.keys.forEach(function(k){var now=localStorage.getItem(k);if(before&&before[k]!==now&&!(k in st.mem)){try{st.mem[k]=before[k]==null?undefined:JSON.parse(before[k])}catch(e){st.mem[k]=undefined}}st.mtx[k]=now});
    if(st.opts.onPull&&!editing())applyPull();else if(!st.opts.onPull&&calm())applyPull();else{st.pend=true;badge()}}
  function rebase(){/* 這頁用舊記憶體存了檔 → 三方合併：舊記憶體 / 這頁剛存的 / 新資料 */
    st.keys.forEach(function(k){if(!(k in st.mtx))return;var cur=localStorage.getItem(k);if(cur===st.mtx[k]||cur==null)return;try{var L=JSON.parse(cur),M=st.mtx[k]==null?undefined:JSON.parse(st.mtx[k]);var F=M===undefined?L:g.ACTS.merge3(st.mem[k],L,M);var tx=JSON.stringify(F);st.mem[k]=L;st.mtx[k]=tx;if(tx!==cur)localStorage.setItem(k,tx)}catch(e){console.warn('ACAuto rebase',e)}})}
  function run(why){
    if(!g.ACTS||!st.keys.length)return Promise.resolve(false);
    if(st.busy){st.again=true;return Promise.resolve(false)}
    if(navigator.onLine===false){set('off');return Promise.resolve(false)}
    st.busy=true;set('wait');
    return post({action:'download'}).then(function(dl){
      if(!dl||!dl.ok)throw new Error((dl&&(dl.error||dl.msg))||'download failed');
      var cloud=dl.data||{};var before={};st.keys.forEach(function(k){before[k]=localStorage.getItem(k)});if(st.pend)rebase();
      /* 這台裝置從沒同步過、但本機已有資料：以雲端為準合併（本機獨有的仍保留），避免舊裝置把雲端的修改蓋回去 */
      st.keys.forEach(function(k){try{if(localStorage.getItem('ac_sync_base_'+k)===null&&cloud.tools&&cloud.tools[k]&&before[k]!==null){var C0=cloud.tools[k].data,M0=g.ACTS.merge3(undefined,C0,JSON.parse(before[k]));localStorage.setItem(k,JSON.stringify(M0));localStorage.setItem('ac_sync_base_'+k,JSON.stringify(C0))}}catch(e){}});
      var res=g.ACTS.sync(st.keys,cloud,'both',st.by);
      var after=function(){st.last=Date.now();st.sig=sig();st.dirty=false;set('ok');if(res.localChanged.length)pulled(before);return true};
      if(!res.cloudChanged)return after();
      cloud.meta=cloud.meta||{};cloud.meta.updatedAt=Math.max(Number(cloud.meta.updatedAt||0),Date.now());
      return post({action:'upload',data:cloud,updatedAt:cloud.meta.updatedAt,reason:'AUTOSYNC_'+st.by}).then(function(u){if(!u||!u.ok)throw new Error((u&&(u.error||u.msg))||'upload failed');return after()});
    }).catch(function(e){set(navigator.onLine===false?'off':'err',String(e&&e.message||e));return false})
      .then(function(r){st.busy=false;if(st.again){st.again=false;setTimeout(function(){run('again')},800)}return r});
  }
  function settle(){rebase();var ch=sig()!==st.sig;applyPull();if(ch){st.dirty=true;clearTimeout(st.t);st.t=setTimeout(function(){run('local')},1200)}}
  function tick(){if(st.pend){rebase();if(st.opts.onPull?!editing():calm()){settle();return}}var s=sig();if(s!==st.sig){st.sig=s;st.dirty=true;clearTimeout(st.t);st.t=setTimeout(function(){run('local')},st.opts.delay||4000)}}
  function init(o){
    o=o||{};st.opts=o;st.keys=(o.keys||[]).slice();st.by=o.by||'tool';st.sig=sig();
    var go=function(){badge();setTimeout(function(){run('open')},o.first||900);setInterval(tick,2500);
      setInterval(function(){if(document.visibilityState!=='hidden'&&!st.busy)run('poll')},o.poll||90000);
      document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible'&&Date.now()-st.last>20000)run('back')});
      window.addEventListener('online',function(){run('online')});
      window.addEventListener('storage',function(ev){if(ev.key&&st.keys.indexOf(ev.key)>=0&&ev.newValue!==ev.oldValue){var b={};st.keys.forEach(function(k){b[k]=k===ev.key?ev.oldValue:localStorage.getItem(k)});pulled(b);st.sig=sig()}});
      ['keydown','input','pointerdown','touchstart'].forEach(function(n){document.addEventListener(n,function(){st.act=Date.now()},true)});
      window.addEventListener('pagehide',function(){if(st.dirty||sig()!==st.sig)run('leave')})};
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',go);else go();
  }
  g.ACAuto={init:init,run:run,post:post,gas:gas,state:function(){return {state:st.state,last:st.last,err:st.err,pend:st.pend}},touch:tick};
})(window);
