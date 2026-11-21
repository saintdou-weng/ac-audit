/* AC Audit · 自動雲端同步 ac_autosync.js v3
   同一份資料、同一個雲端（Unified GAS 的 AC_AUDIT_DB.tools）：
   Audit、Admin OS、PSJHR、HRA Portal 開的都是這一頁，所以任何一邊改了，其他地方打開就是新的。
   • 開頁先抓雲端合併（三方比對，不覆蓋別台裝置的修改）；本機一有變動幾秒後自動上傳；每 90 秒與回到頁面時再對一次
   • 「上次同步的版本」（比對基準）存在 IndexedDB，不佔 localStorage——這個網域的 localStorage 只有 5MB、常常是滿的，
     基準存不進去就會變成「每次都以雲端為準」，本機的修改會被蓋回去（2026-11-21 實機測到）
   • store:'idb' 的頁面（廠規）連資料本身都放 IndexedDB：用 ACAuto.get(key)／ACAuto.set(key,值)
   • 保險：雲端回來的整份資料不像樣就不上傳；上傳前再抓一次；頁面用舊記憶體存檔不會蓋掉別台更新
   不改 GAS。用法：ACAuto.init({keys:['vrt_dcc_v2'],by:'dcc',onPull:fn,store:'ls'|'idb'}) */
(function(g){
  if(g.ACAuto)return;
  var DEF='https://script.google.com/macros/s/AKfycbxOXfNmyfqZI6f9Uc__hxcmuiQt-QowkULw23GggAKM6nZ1mQ8DcOx5rwxa7d0obpIf/exec';
  var st={keys:[],by:'tool',busy:false,sig:'',t:null,opts:{},last:0,pend:false,state:'idle',err:'',act:0,mem:{},mtx:{},rev:0,idb:false};
  var J=JSON.stringify;
  function gas(){try{var c=JSON.parse(localStorage.getItem('ac_audit_config')||'{}');return String(c.gasUrl||DEF).trim()}catch(e){return DEF}}
  function post(b){return fetch(gas(),{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:J(b)}).then(function(r){return r.json()})}
  function hash(s){var h=5381;for(var i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return h}
  /* ---- IndexedDB 小倉庫（開不了就退回 localStorage）---- */
  var dbp=null;
  function db(){if(dbp)return dbp;dbp=new Promise(function(res){try{var rq=indexedDB.open('ac_auto',1);rq.onupgradeneeded=function(){rq.result.createObjectStore('kv')};rq.onsuccess=function(){res(rq.result)};rq.onerror=function(){res(null)};rq.onblocked=function(){res(null)}}catch(e){res(null)}});return dbp}
  function kget(k){return db().then(function(d){if(!d){var r=localStorage.getItem('ac_auto_kv_'+k);return r===null?undefined:r}return new Promise(function(res){try{var q=d.transaction('kv').objectStore('kv').get(k);q.onsuccess=function(){res(q.result===undefined?undefined:q.result)};q.onerror=function(){res(undefined)}}catch(e){res(undefined)}})})}
  function kset(k,v){return db().then(function(d){if(!d){try{localStorage.setItem('ac_auto_kv_'+k,v)}catch(e){}return}return new Promise(function(res,rej){try{var tx=d.transaction('kv','readwrite');tx.objectStore('kv').put(v,k);tx.oncomplete=function(){res()};tx.onerror=function(){rej(tx.error)};tx.onabort=function(){rej(tx.error)}}catch(e){rej(e)}})})}
  function kdel(k){return db().then(function(d){if(!d){localStorage.removeItem('ac_auto_kv_'+k);return}return new Promise(function(res){try{var tx=d.transaction('kv','readwrite');tx.objectStore('kv').delete(k);tx.oncomplete=function(){res()};tx.onerror=function(){res()}}catch(e){res()}})})}
  /* ---- 資料本身：ls＝localStorage（原頁面自己讀寫）；idb＝IndexedDB（頁面透過 ACAuto.get/set）---- */
  function sget(k){return st.idb?kget('data:'+k).then(function(v){return v===undefined?null:v}):Promise.resolve(localStorage.getItem(k))}
  function sset(k,tx){if(st.idb)return kset('data:'+k,tx);try{localStorage.setItem(k,tx)}catch(e){return Promise.reject(e)}return Promise.resolve()}
  function bget(k){return kget('base:'+k).then(function(v){if(v!==undefined)return v;var r=localStorage.getItem('ac_sync_base_'+k);return r===null?undefined:r})}
  function bset(k,tx){return kset('base:'+k,tx).then(function(){/* 小資料順便留一份給 Audit 外殼的手動同步用；存不下就算了 */if(!st.idb&&tx.length<60000){try{localStorage.setItem('ac_sync_base_'+k,tx)}catch(e){try{localStorage.removeItem('ac_sync_base_'+k)}catch(_){}}}})}
  function sig(){return st.idb?'r'+st.rev:st.keys.map(function(k){var v=localStorage.getItem(k)||'';return v.length+':'+hash(v)}).join('|')}
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
     mem＝這頁手上那份、mtx＝現在本機該有的那份。這頁之後若用舊資料存檔，rebase() 會把它的修改疊回新資料上，不會把別人的更新蓋掉 */
  function pulled(before,now){st.keys.forEach(function(k){if(before&&before[k]!==now[k]&&!(k in st.mem)){try{st.mem[k]=before[k]==null?undefined:JSON.parse(before[k])}catch(e){st.mem[k]=undefined}}st.mtx[k]=now[k]});
    if(st.opts.onPull&&!editing())applyPull();else if(!st.opts.onPull&&calm())applyPull();else{st.pend=true;badge()}}
  function rebase(){/* 這頁用舊記憶體存了檔 → 三方合併：舊記憶體 / 這頁剛存的 / 新資料 */
    return Promise.all(st.keys.map(function(k){if(!(k in st.mtx))return null;return sget(k).then(function(cur){if(cur===st.mtx[k]||cur==null)return;try{var Lc=JSON.parse(cur),M=st.mtx[k]==null?undefined:JSON.parse(st.mtx[k]);var F=M===undefined?Lc:g.ACTS.merge3(st.mem[k],Lc,M);var tx=J(F);st.mem[k]=Lc;st.mtx[k]=tx;if(tx!==cur)return sset(k,tx)}catch(e){console.warn('ACAuto rebase',e)}})}))}
  var SZ='ac_auto_docsize';
  /* 保險：雲端回來的整份資料不像樣（空的、或比上次看到的小一大半）就不上傳，免得把整個 AC_AUDIT_DB 蓋掉 */
  function sane(dl){if(!dl||!dl.ok)throw new Error((dl&&(dl.error||dl.msg))||'download failed');var d=dl.data;if(!d||typeof d!=='object'||Array.isArray(d))throw new Error('cloud data unreadable — nothing uploaded');
    var n=J(d).length,last=Number(localStorage.getItem(SZ)||0);if(n<200||(last>4000&&n<last*0.5))throw new Error('cloud data looks incomplete ('+n+' / '+last+') — nothing uploaded');return {doc:d,n:n}}
  /* 一把鑰匙的三方合併；回傳 {local:是否改了本機, cloud:是否要上傳} */
  function mergeKey(k,cloud,io){return Promise.all([sget(k),bget(k)]).then(function(a){var Ltx=a[0],Btx=a[1],eq=function(x,y){return J(x)===J(y)};
      if(!(k in io.before))io.before[k]=Ltx;
      var Lc=Ltx==null?undefined:JSON.parse(Ltx),B;try{B=Btx===undefined?undefined:JSON.parse(Btx)}catch(e){B=undefined}
      cloud.tools=cloud.tools&&typeof cloud.tools==='object'&&!Array.isArray(cloud.tools)?cloud.tools:{};var ent=cloud.tools[k],C=ent?ent.data:undefined,M,pre=Promise.resolve();
      if(Lc===undefined&&C===undefined)return;
      if(Lc===undefined)M=C;else if(C===undefined)M=Lc;
      else if(B===undefined){/* 這台沒同步過、但本機已有資料：以雲端為準合併（本機獨有的保留），本機原本那份留一個備份 */M=g.ACTS.merge3(undefined,C,Lc);if(!eq(C,Lc))pre=kget('backup:'+k).then(function(v){if(v===undefined)return kset('backup:'+k,Ltx)}).catch(function(){})}
      else M=g.ACTS.merge3(B,Lc,C);
      var tx=J(M);io.now[k]=tx;
      return pre.then(function(){if(Lc===undefined||!eq(M,Lc)){io.local=true;return sset(k,tx)}}).then(function(){if(C===undefined||!eq(M,C)){cloud.tools[k]={data:M,updatedAt:Date.now(),by:st.by};io.cloud=true}io.base[k]=tx})})}
  function mergeAll(cloud,io){io.cloud=false;var p=st.pend?rebase():Promise.resolve();st.keys.forEach(function(k){p=p.then(function(){return mergeKey(k,cloud,io)})});return p}
  function run(why){
    if(!g.ACTS||!st.keys.length)return Promise.resolve(false);
    if(st.busy){st.again=true;return Promise.resolve(false)}
    if(navigator.onLine===false){set('off');return Promise.resolve(false)}
    st.busy=true;set('wait');var io={before:{},now:{},base:{},local:false,cloud:false},rev0=st.rev;
    var fin=function(n){/* 基準只在雲端確定是這個版本之後才寫 */return Promise.all(Object.keys(io.base).map(function(k){return bset(k,io.base[k]).catch(function(e){console.warn('ACAuto base',e)})})).then(function(){
        try{localStorage.setItem(SZ,String(n))}catch(e){}st.last=Date.now();if(st.rev===rev0||!st.idb){st.sig=sig();st.dirty=false}set('ok');if(io.local)pulled(io.before,io.now);return true})};
    return post({action:'download'}).then(function(dl){var s1=sane(dl),cloud=s1.doc;
      return mergeAll(cloud,io).then(function(){if(!io.cloud)return fin(s1.n);
        /* 上傳前再抓一次：這一兩秒內若別人剛存過，就拿最新那份重新合併，不把他的修改蓋掉 */
        return post({action:'download'}).then(function(dl2){var s2=sane(dl2),c2=s2.doc,again=Number((c2.meta||{}).updatedAt||0)!==Number((cloud.meta||{}).updatedAt||0)||s2.n!==s1.n;
          return (again?mergeAll(c2,io).then(function(){cloud=c2}):Promise.resolve()).then(function(){if(!io.cloud)return fin(s2.n);
            cloud.meta=cloud.meta||{};cloud.meta.updatedAt=Math.max(Number(cloud.meta.updatedAt||0),Date.now());
            return post({action:'upload',data:cloud,updatedAt:cloud.meta.updatedAt,reason:'AUTOSYNC_'+st.by}).then(function(u){if(!u||!u.ok)throw new Error((u&&(u.error||u.msg))||'upload failed');return fin(J(cloud).length)})})})})
    }).catch(function(e){console.warn('ACAuto',e);set(navigator.onLine===false?'off':'err',String(e&&e.message||e));return false})
      .then(function(r){st.busy=false;if(st.again||(st.idb&&st.rev!==rev0)){st.again=false;setTimeout(function(){run('again')},800)}return r});
  }
  function settle(){var s0=st.sig;return rebase().then(function(){var ch=sig()!==s0||st.dirty;applyPull();if(ch){st.dirty=true;clearTimeout(st.t);st.t=setTimeout(function(){run('local')},1200)}})}
  function tick(){if(st.pend){rebase().then(function(){if(st.pend&&(st.opts.onPull?!editing():calm()))settle()});return}var s=sig();if(s!==st.sig){st.sig=s;st.dirty=true;clearTimeout(st.t);st.t=setTimeout(function(){run('local')},st.opts.delay||4000)}}
  var bc=null;
  function init(o){
    o=o||{};st.opts=o;st.keys=(o.keys||[]).slice();st.by=o.by||'tool';st.idb=o.store==='idb';st.sig=sig();
    try{if(g.BroadcastChannel){bc=new BroadcastChannel('ac_auto');bc.onmessage=function(ev){var d=ev.data||{};if(st.idb&&st.keys.indexOf(d.key)>=0){var b={},n={};b[d.key]=d.old;n[d.key]=d.val;pulled(b,n)}}}}catch(e){}
    var go=function(){badge();setTimeout(function(){run('open')},o.first||900);setInterval(tick,2500);
      setInterval(function(){if(document.visibilityState!=='hidden'&&!st.busy)run('poll')},o.poll||90000);
      document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible'&&Date.now()-st.last>20000)run('back')});
      window.addEventListener('online',function(){run('online')});
      window.addEventListener('storage',function(ev){if(!st.idb&&ev.key&&st.keys.indexOf(ev.key)>=0&&ev.newValue!==ev.oldValue){var b={},n={};st.keys.forEach(function(k){b[k]=k===ev.key?ev.oldValue:localStorage.getItem(k);n[k]=localStorage.getItem(k)});pulled(b,n);st.sig=sig()}});
      ['keydown','input','pointerdown','touchstart'].forEach(function(n){document.addEventListener(n,function(){st.act=Date.now()},true)});
      window.addEventListener('pagehide',function(){if(st.dirty||sig()!==st.sig)run('leave')})};
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',go);else go();
  }
  /* 給 store:'idb' 的頁面用：讀／寫自己的資料（值是物件） */
  function get(k){return kget('data:'+k).then(function(v){if(v===undefined||v===null)return null;try{return JSON.parse(v)}catch(e){return null}})}
  function setv(k,val){var tx=J(val);return kget('data:'+k).then(function(old){return kset('data:'+k,tx).then(function(){st.rev++;try{if(bc)bc.postMessage({key:k,old:old===undefined?null:old,val:tx})}catch(e){}tick()})})}
  g.ACAuto={init:init,run:run,post:post,gas:gas,get:get,set:setv,kv:{get:kget,set:kset,del:kdel},state:function(){return {state:st.state,last:st.last,err:st.err,pend:st.pend}},touch:tick};
})(window);
