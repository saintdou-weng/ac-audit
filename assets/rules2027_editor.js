/* VRT 廠規 2027 · 編輯／匯入匯出／照片／雲端同步 v2
   頁面本體＝Paul 提供的 VRT_Factory_Rules_2027_v5.html（原樣）。這支只是加在上面的工具：
   ✏️ 編輯（點任何一段 → 跳出中／EN／ខ្មែរ 三格一起改；章／條／款／表格／照片 新增・刪除・上下移）→ 💾 儲存 → 自動上雲（ac_autosync.js）
   ⬇ 匯出 JSON／HTML／Word、⬆ 匯入 JSON／HTML、📎 附件上傳 Drive、📣 Telegram 摘要、🕘 修改紀錄
   資料鍵：localStorage vrt_factory_rules_2027（雲端 AC_AUDIT_DB.tools 同一鍵）

   v2 重點：存檔一律以「資料」為準，不從畫面上的字抄回來。
   有些瀏覽器擴充功能（繁簡／用語轉換、翻譯）會偷改畫面上的字（例：文件→檔案、身分→身份）；
   v1 從畫面抄字存檔，會把那些轉換一起存進廠規。現在原文取自頁面原始檔，編輯用文字框（擴充功能不會動文字框裡的字），畫面只是顯示。 */
(function(){
'use strict';
var KEY='vrt_factory_rules_2027',PAGE='https://saintdou-weng.github.io/ac-audit/VRT_Factory_Rules_2027.html';
var $=function(s,r){return (r||document).querySelector(s)},$$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var lang=function(){return document.body.getAttribute('data-lang')||'zh'};
var T=function(zh,en,km){var l=lang();return l==='en'?en:l==='km'?(km||en):zh};
var tri=function(zh,en,km){return '<span class="l zh">'+zh+'</span><span class="l en">'+en+'</span><span class="l km">'+(km||en)+'</span>'};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
var uid=function(p){return p+Date.now().toString(36)+Math.random().toString(36).slice(2,5)};
var clone=function(o){return JSON.parse(JSON.stringify(o))};
var SEED=null,DATA=null,M=null,EDIT=false,DIRTY=false,UNDO=[],SRC='';
var ZH='零一二三四五六七八九';
function zhNum(n){if(n<=10)return n===10?'十':ZH[n];if(n<20)return '十'+ZH[n-10];var t=Math.floor(n/10),u=n%10;return ZH[t]+'十'+(u?ZH[u]:'')}
function kmNum(n){return String(n).replace(/\d/g,function(d){return '០១២៣៤៥៦៧៨៩'[d]})}
function nowStr(){var d=new Date(),p=function(n){return ('0'+n).slice(-2)};return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+' '+p(d.getHours())+':'+p(d.getMinutes())}
function who(ask){var w=localStorage.getItem('ac_audit_checker')||'';if(!w&&ask){w=(prompt(T('請輸入修改人姓名（之後會記住）','Your name (remembered next time)','ឈ្មោះអ្នកកែ'),'')||'').trim();if(w)localStorage.setItem('ac_audit_checker',w)}return w||'—'}
function toast(m,bad){var el=$('#edToast');if(!el){el=document.createElement('div');el.id='edToast';el.className='noprint';document.body.appendChild(el)}el.textContent=m;el.className='noprint show'+(bad?' bad':'');clearTimeout(toast.t);toast.t=setTimeout(function(){el.className='noprint'},3200)}

/* ---------- 安全：雲端／匯入來的內容先清掉 script 與事件屬性 ---------- */
function san(html){var t=document.createElement('template');t.innerHTML=String(html==null?'':html);
  $$('script,iframe,object,embed,link,style,meta,base,form',t.content).forEach(function(x){x.remove()});
  $$('*',t.content).forEach(function(el){Array.prototype.slice.call(el.attributes).forEach(function(a){var n=a.name.toLowerCase(),v=String(a.value||'');
    if(n.indexOf('on')===0||n==='contenteditable'||n==='srcdoc')el.removeAttribute(a.name);
    else if((n==='href'||n==='src'||n==='xlink:href')&&/^\s*(javascript|vbscript|data:text\/html)/i.test(v))el.removeAttribute(a.name)})});
  return t.innerHTML}
function inner(el){if(!el)return '';var c=el.cloneNode(true);$$('.ed-tools,.ed-add,.ed-tbl',c).forEach(function(x){x.remove()});$$('[contenteditable]',c).forEach(function(x){x.removeAttribute('contenteditable')});return c.innerHTML.replace(/\s+$/,'').replace(/^\s+/,'')}

/* ---------- 原始檔／匯入檔 → 資料（只用在「沒被動過的文件」上，不讀使用者眼前那個畫面）---------- */
var RCH={zh:/^\s*第[一二三四五六七八九十百零〇\d]+章[\s　]*/,en:/^\s*Chapter\s+\d+\s*[—–―-]*\s*/i,km:/^\s*ជំពូកទី\s*[០-៩\d]+\s*[—–―-]*\s*/};
function stripCh(h){var t=document.createElement('template');t.innerHTML=h;['zh','en','km'].forEach(function(l){var e=t.content.querySelector('.l.'+l);if(e)e.innerHTML=e.innerHTML.replace(RCH[l],'')});return t.innerHTML}
function snap(doc){var d={v:1,cover:[],preH:'',pre:[],ch:[],sig:'',files:[],log:[]};
  $$('#cover > :not(img)',doc).forEach(function(el){d.cover.push({id:el.className.split(' ')[0],h:inner(el)})});
  var pf=$('#preface',doc);if(pf){d.preH=inner($('h2',pf));$$('p',pf).forEach(function(p,i){d.pre.push({id:p.getAttribute('data-id')||('pf'+(i+1)),o:i+1,h:inner(p)})})}
  $$('section.chapter',doc).forEach(function(s,i){var c={id:s.id||('ch'+(i+1)),o:i+1,h:stripCh(inner($('.chapter-head',s))),arts:[]};
    $$('.article',s).forEach(function(a,j){var A={id:a.id||(c.id+'-a'+(j+1)),o:j+1,h:inner($('.art-title',a)),cl:[]};
      $$('ol.clauses > li',a).forEach(function(li,k){A.cl.push({id:li.getAttribute('data-id')||(A.id+'-'+(k+1)),o:k+1,k:li.classList.contains('clause-table')?'t':li.classList.contains('clause-photo')?'p':'c',h:inner(li)})});c.arts.push(A)});d.ch.push(c)});
  var sg=$('#sig',doc);if(sg)d.sig=inner(sg);return d}
function byO(a){return (a||[]).slice().sort(function(x,y){return (x.o-y.o)||String(x.id).localeCompare(String(y.id))})}
function sortAll(d){d.pre=byO(d.pre);d.ch=byO(d.ch);d.ch.forEach(function(c){c.arts=byO(c.arts);c.arts.forEach(function(a){a.cl=byO(a.cl)})});return d}

/* ---------- 資料 → 畫面（doc 可以是眼前這頁，也可以是匯出用的另一份）---------- */
function liHTML(c){return '<li class="'+(c.k==='t'?'clause-table':c.k==='p'?'clause clause-photo':'clause')+'" data-id="'+esc(c.id)+'" data-u="cl:'+esc(c.id)+'">'+san(c.h)+'</li>'}
function artHTML(a){return '<div class="article" id="'+esc(a.id)+'"><div class="art-head"><span class="art-num"></span> <span class="art-title" data-u="art:'+esc(a.id)+'">'+san(a.h)+'</span></div><ol class="clauses">'+byO(a.cl).map(liHTML).join('')+'</ol></div>'}
function chHTML(c){return '<section class="chapter" id="'+esc(c.id)+'"><h2 class="chapter-head" data-u="ch:'+esc(c.id)+'">'+san(c.h)+'</h2>'+byO(c.arts).map(artHTML).join('')+'</section>'}
function apply(d,doc){doc=doc||document;if(!d||!Array.isArray(d.ch))return;
  (d.cover||[]).forEach(function(c){var el=$('#cover .'+String(c.id).replace(/[^\w-]/g,''),doc);if(el){el.innerHTML=san(c.h);el.setAttribute('data-u','cover:'+c.id)}});
  var pf=$('#preface',doc);if(pf&&Array.isArray(d.pre)){var h2=$('h2',pf);if(d.preH)h2.innerHTML=san(d.preH);h2.setAttribute('data-u','preH');$$('p,.ed-add',pf).forEach(function(p){p.remove()});pf.insertAdjacentHTML('beforeend',byO(d.pre).map(function(p){return '<p data-id="'+esc(p.id)+'" data-u="pre:'+esc(p.id)+'">'+san(p.h)+'</p>'}).join(''))}
  $$('section.chapter',doc).forEach(function(s){s.remove()});var sig=$('#sig',doc);sig.insertAdjacentHTML('beforebegin',byO(d.ch).map(chHTML).join(''));
  if(d.sig)sig.innerHTML=san(d.sig);sig.setAttribute('data-u','sig');
  renumber(doc);toc(doc);if(doc===document){drawFiles();if(EDIT)decorate()}}
function setPrefix(el,pre){if(el)el.innerHTML=pre+el.innerHTML}
function renumber(doc){var n=0;$$('section.chapter',doc).forEach(function(s,i){var h=$('.chapter-head',s);
    setPrefix($('.l.zh',h),'第'+zhNum(i+1)+'章　');setPrefix($('.l.en',h),'Chapter '+(i+1)+' — ');setPrefix($('.l.km',h),'ជំពូកទី'+kmNum(i+1)+' ― ');
    $$('.article',s).forEach(function(a){n++;$('.art-num',a).innerHTML=tri('第'+n+'條','Article '+n,'មាត្រា '+kmNum(n))})})}
function toc(doc){var ul=$('#toc ul',doc);if(!ul)return;var pre=$('#preface h2',doc);
  var h='<li class="toc-ch"><a href="#preface">'+(pre?inner(pre):tri('前言','Preface','សេចក្តីផ្តើម'))+'</a></li>';
  $$('section.chapter',doc).forEach(function(s){h+='<li class="toc-ch"><a href="#'+s.id+'">'+inner($('.chapter-head',s))+'</a><ul>'+$$('.article',s).map(function(a){
      var t=$('.art-title',a).cloneNode(true);$$('.ed-tools',t).forEach(function(x){x.remove()});var sp=$$('.l',t).map(function(x){return x.outerHTML}).join('');
      return '<li><a href="#'+a.id+'"><span class="toc-art">'+$('.art-num',a).innerHTML+'</span> '+sp+'</a></li>'}).join('')+'</ul></li>'});
  var sg=$('#sig h2',doc);if(sg)h+='<li class="toc-ch"><a href="#sig">'+inner(sg)+'</a></li>';ul.innerHTML=h}
function count(d){var a=0,c=0;(d.ch||[]).forEach(function(x){a+=x.arts.length;x.arts.forEach(function(y){c+=y.cl.length})});return {ch:(d.ch||[]).length,art:a,cl:c}}
function txt(h){var t=document.createElement('template');t.innerHTML=h;var z=t.content.querySelector('.l.zh');return (z?z.textContent:t.content.textContent).replace(/\s+/g,' ').trim()}
function diff(a,b){/* a 舊 b 新 */var r={add:{ch:0,art:0,cl:0},del:{ch:0,art:0,cl:0},mod:{ch:0,art:0,cl:0},arts:[]};
  var flat=function(d){var m={ch:{},art:{},cl:{},own:{}};(d.ch||[]).forEach(function(c){m.ch[c.id]=c.h;c.arts.forEach(function(x){m.art[x.id]=x.h;x.cl.forEach(function(y){m.cl[y.id]=y.h;m.own[y.id]=x.id})})});return m};
  var A=flat(a),B=flat(b),hit={};['ch','art','cl'].forEach(function(k){Object.keys(B[k]).forEach(function(id){if(!(id in A[k])){r.add[k]++;if(k!=='ch')hit[k==='art'?id:B.own[id]]=1}else if(A[k][id]!==B[k][id]){r.mod[k]++;if(k!=='ch')hit[k==='art'?id:B.own[id]]=1}});
    Object.keys(A[k]).forEach(function(id){if(!(id in B[k])){r.del[k]++;if(k==='cl'&&A.own[id] in B.art)hit[A.own[id]]=1}})});
  var n=0;byO(b.ch).forEach(function(c){byO(c.arts).forEach(function(x){n++;if(hit[x.id])r.arts.push('第'+n+'條 '+txt(x.h).replace(/^[（(]|[）)]$/g,''))})});
  r.total=['add','del','mod'].reduce(function(s,k){return s+r[k].ch+r[k].art+r[k].cl},0);
  var ord=function(d){return byO(d.ch).map(function(c){return c.id+'['+byO(c.arts).map(function(x){return x.id+'('+byO(x.cl).map(function(y){return y.id}).join(',')+')'}).join(';')+']'}).join('|')};
  if(ord(a)!==ord(b)&&!r.total){r.moved=1;r.total++}
  if(JSON.stringify(a.cover)!==JSON.stringify(b.cover)||JSON.stringify(byO(a.pre))!==JSON.stringify(byO(b.pre))||a.sig!==b.sig||a.preH!==b.preH){r.other=1;r.total++}
  return r}
function diffText(r){var p=[],f=function(lab,o){var s=[];if(o.ch)s.push(o.ch+T(' 章',' ch.'));if(o.art)s.push(o.art+T(' 條',' art.'));if(o.cl)s.push(o.cl+T(' 款',' cl.'));if(s.length)p.push(lab+' '+s.join('、'))};
  f(T('新增','Added'),r.add);f(T('修改','Changed'),r.mod);f(T('刪除','Removed'),r.del);if(r.moved)p.push(T('調整順序','reordered'));if(r.other)p.push(T('封面／前言／簽署有改','cover / preface / signature changed'));return p.join('；')||T('沒有變更','No change')}

/* ---------- 儲存／載入 ---------- */
/* 資料放 IndexedDB（ACAuto.get/set）：這個網域的 localStorage 只有 5MB 而且常常是滿的 */
function read(){return window.ACAuto?ACAuto.get(KEY).catch(function(){return null}):Promise.resolve(null)}
function store(d){if(!window.ACAuto)return;ACAuto.set(KEY,d).catch(function(){alert(T('這台裝置存不進去（瀏覽器儲存空間不足或被停用）。請先匯出 JSON 備份。','Could not store on this device (browser storage full or disabled). Export a JSON backup first.'))})}
function cur(){return EDIT&&M?M:(DATA||SEED)}
function save(silent){if(!M){if(!silent)toast(T('沒有變更','Nothing changed'));return true}var prev=DATA||SEED,r=diff(prev,M);
  if(!r.total){setDirty(false);if(!silent)toast(T('沒有變更','Nothing changed'));return true}
  var d=clone(M);d.files=(DATA&&DATA.files)||d.files||[];d.updatedAt=Date.now();d.by=who(true);d.log=((DATA&&DATA.log)||[]).concat([{id:uid('L'),at:nowStr(),by:d.by,what:diffText(r),arts:r.arts.slice(0,12)}]).slice(-60);
  DATA=d;M=clone(d);UNDO=[];setDirty(false);store(d);
  if(!silent)toast('💾 '+T('已儲存，會自動同步雲端：','Saved — syncing to cloud: ')+diffText(r));return true}
function load(){return read().then(function(d){DATA=d&&Array.isArray(d.ch)?d:null;if(EDIT){M=clone(DATA||SEED);UNDO=[]}apply(DATA||SEED)})}
function setDirty(v){DIRTY=!!v;var b=$('#edSave');if(b){b.classList.toggle('hot',DIRTY);b.disabled=!DIRTY}document.title=(DIRTY?'● ':'')+document.title.replace(/^● /,'');var u=$('#edUndo');if(u)u.disabled=!UNDO.length}
function pushUndo(){UNDO.push(JSON.stringify(M));if(UNDO.length>25)UNDO.shift()}
function undo(){var s=UNDO.pop();if(!s)return toast(T('沒有可以復原的步驟','Nothing to undo'));M=JSON.parse(s);apply(M);setDirty(diff(DATA||SEED,M).total>0)}
function changed(){apply(M);setDirty(true)}

/* ---------- 在資料裡找東西 ---------- */
function ref(o){return {get:function(){return o.h},set:function(v){o.h=v}}}
function unit(m,key){var i=key.indexOf(':'),t=i<0?key:key.slice(0,i),id=i<0?'':key.slice(i+1),r=null;
  if(t==='preH')return {get:function(){return m.preH},set:function(v){m.preH=v}};
  if(t==='sig')return {get:function(){return m.sig},set:function(v){m.sig=v}};
  if(t==='cover'){var c=(m.cover||[]).filter(function(x){return x.id===id})[0];return c?ref(c):null}
  if(t==='pre'){var q=(m.pre||[]).filter(function(x){return x.id===id})[0];return q?ref(q):null}
  m.ch.some(function(c){if(t==='ch'&&c.id===id){r=ref(c);return true}return c.arts.some(function(a){if(t==='art'&&a.id===id){r=ref(a);return true}if(t==='cl'){var x=a.cl.filter(function(y){return y.id===id})[0];if(x){r=ref(x);return true}}return false})});return r}
function findCh(id){for(var i=0;i<M.ch.length;i++)if(M.ch[i].id===id)return {list:M.ch,i:i,it:M.ch[i]};return null}
function findArt(id){for(var i=0;i<M.ch.length;i++){var as=M.ch[i].arts;for(var j=0;j<as.length;j++)if(as[j].id===id)return {list:as,i:j,it:as[j],ch:M.ch[i]}}return null}
function findCl(id){for(var i=0;i<M.ch.length;i++){var as=M.ch[i].arts;for(var j=0;j<as.length;j++){var cs=as[j].cl;for(var k=0;k<cs.length;k++)if(cs[k].id===id)return {list:cs,i:k,it:cs[k],art:as[j]}}}return null}
function findPre(id){for(var i=0;i<M.pre.length;i++)if(M.pre[i].id===id)return {list:M.pre,i:i,it:M.pre[i]};return null}
function lastO(list){return list.reduce(function(m,x){return Math.max(m,+x.o||0)},0)}
/* 搬動：資料陣列先照目前順序排好，再和鄰居互換排序值 */
function moveIn(f,dir){var sorted=byO(f.list),i=sorted.indexOf(f.it),j=i+dir;if(i<0||j<0||j>=sorted.length)return false;pushUndo();var a=f.list[f.list.indexOf(sorted[i])],b=f.list[f.list.indexOf(sorted[j])];
  /* pushUndo 之後 f.list 仍是同一份；直接互換排序值 */var t=a.o;a.o=b.o;b.o=t;if(a.o===b.o)a.o+=dir*0.5;return true}

/* ---------- 編輯模式 ---------- */
function btn(act,tx,title,cls){return '<button type="button" class="eb '+(cls||'')+'" data-act="'+act+'" title="'+esc(title||'')+'">'+tx+'</button>'}
function decorate(){$$('.ed-tools,.ed-add,.ed-tbl').forEach(function(x){x.remove()});
  var mv=btn('up','↑',T('上移','Move up'))+btn('down','↓',T('下移','Move down'))+btn('del','🗑',T('刪除','Delete'),'bad');
  $$('section.chapter').forEach(function(s){$('.chapter-head',s).insertAdjacentHTML('beforeend','<span class="ed-tools" data-k="ch" data-id="'+esc(s.id)+'">'+mv+'</span>');
    $$('.article',s).forEach(function(a){$('.art-head',a).insertAdjacentHTML('beforeend','<span class="ed-tools" data-k="art" data-id="'+esc(a.id)+'">'+mv+'</span>');
      $$('ol.clauses > li',a).forEach(function(li){var id=li.getAttribute('data-id');li.insertAdjacentHTML('beforeend','<span class="ed-tools" data-k="cl" data-id="'+esc(id)+'">'+mv+'</span>');
        if(li.classList.contains('clause-table'))li.insertAdjacentHTML('afterbegin','<div class="ed-tbl" data-id="'+esc(id)+'">'+btn('row+','＋'+T('列','row'))+btn('col+','＋'+T('欄','col'))+btn('row-','－'+T('列','row'))+btn('col-','－'+T('欄','col'))+'</div>')});
      a.insertAdjacentHTML('beforeend','<div class="ed-add" data-id="'+esc(a.id)+'">'+btn('cl+','＋ '+T('款','Clause'))+btn('tb+','＋ '+T('表格','Table'))+btn('ph+','📷 '+T('照片','Photo'))+'</div>')});
    s.insertAdjacentHTML('beforeend','<div class="ed-add big" data-id="'+esc(s.id)+'">'+btn('art+','＋ '+T('在這一章加一條','Add article to this chapter'))+btn('ch+','＋ '+T('在後面加一章','Add chapter after'))+'</div>')});
  var pf=$('#preface');if(pf){$$('p',pf).forEach(function(p){p.insertAdjacentHTML('beforeend','<span class="ed-tools" data-k="pf" data-id="'+esc(p.getAttribute('data-id'))+'">'+mv+'</span>')});pf.insertAdjacentHTML('beforeend','<div class="ed-add">'+btn('pf+','＋ '+T('前言段落','Preface paragraph'))+'</div>')}}
function undecorate(){$$('.ed-tools,.ed-add,.ed-tbl').forEach(function(x){x.remove()})}
function setEdit(on){if(!on&&DIRTY){if(confirm(T('有還沒儲存的修改，要先儲存嗎？\n「確定」＝儲存　「取消」＝放棄這次修改','Save your changes?\nOK = save, Cancel = discard'))){if(!save())return}else setDirty(false)}
  EDIT=!!on;document.body.classList.toggle('editing',EDIT);if(EDIT){who(true);M=clone(DATA||SEED);UNDO=[];apply(M)}else{M=null;UNDO=[];undecorate();apply(DATA||SEED)}
  var b=$('#edToggle');if(b){b.classList.toggle('on',EDIT);b.innerHTML=EDIT?'✅ '+tri('完成編輯','Done','រួចរាល់'):'✏️ '+tri('編輯','Edit','កែ')}$$('.ed-only').forEach(function(x){x.hidden=!EDIT});setDirty(false)}
/* 一個單位（款、條名、章名…）裡的第 idx 組「中／EN／ខ្មែរ」 */
function triple(html,idx){var t=document.createElement('template');t.innerHTML=html;var z=$$('.l.zh',t.content)[idx];if(!z)return null;var p=z.parentNode,pick=function(c){for(var i=0;i<p.children.length;i++)if(p.children[i].classList.contains('l')&&p.children[i].classList.contains(c))return p.children[i];return null};return {t:t,zh:z,en:pick('en'),km:pick('km')}}
function toText(h){if(/<(?!br\s*\/?>)\/?[a-z]/i.test(h))return {raw:true,v:h};var d=document.createElement('div');d.innerHTML=h.replace(/<br\s*\/?>/gi,'\n');return {raw:false,v:d.textContent}}
function toHTML(v,raw){return raw?san(v):esc(v).replace(/\r?\n/g,'<br>')}
function editText(key,idx,isNew){var u=unit(M,key);if(!u)return;var tr=triple(u.get(),idx);if(!tr){toast(T('這一段不是三語格式，無法在這裡編輯','This part is not in the 3-language format'),1);return}
  var L=[['zh','中文'],['en','English'],['km','ខ្មែរ']],vals={};L.forEach(function(x){vals[x[0]]=tr[x[0]]?toText(tr[x[0]].innerHTML):null});
  modal('<h3>✏️ '+T('編輯文字（三語）','Edit text (3 languages)')+'</h3>'+L.map(function(x){var v=vals[x[0]];return v?'<label class="ed-lab">'+x[1]+(v.raw?' <small>HTML</small>':'')+'<textarea class="ed-ta" data-l="'+x[0]+'" rows="'+(x[0]==='zh'?4:5)+'"'+(x[0]==='km'?' lang="km"':'')+'>'+esc(v.v)+'</textarea></label>':''}).join('')
    +'<div class="ed-row"><button type="button" class="eb hot" id="edOk">'+T('確定','OK')+'</button><button type="button" class="eb" data-close>'+T('取消','Cancel')+'</button></div><p class="ed-hint">'+T('三種語言請一起更新。按「確定」後還要按上方的「💾 儲存」才會存檔並同步。','Please update all three languages. After OK, press "💾 Save" at the top to store and sync.')+'</p>',false);
  var ta=$('#edModal .ed-ta[data-l="'+lang()+'"]')||$('#edModal .ed-ta');if(ta){ta.focus();if(isNew)ta.select()}
  $('#edOk').onclick=function(){var ch=false;$$('#edModal .ed-ta').forEach(function(a){var l=a.getAttribute('data-l'),nv=toHTML(a.value,vals[l].raw);if(nv!==tr[l].innerHTML){tr[l].innerHTML=nv;ch=true}});closeModal();if(!ch)return;pushUndo();u.set(tr.t.innerHTML);changed()}}
function onDocClick(e){if(!EDIT)return;var b=e.target.closest('[data-act]');if(b){e.preventDefault();e.stopPropagation();return act(b)}
  var l=e.target.closest('.l');if(!l||l.closest('#toc,#calc,.art-num,.ed-tools,.ed-add,.ed-tbl,#edFiles'))return;var ue=l.closest('[data-u]');if(!ue)return;
  var p=l.parentNode,z=null;for(var i=0;i<p.children.length;i++)if(p.children[i].classList.contains('l')&&p.children[i].classList.contains('zh')){z=p.children[i];break}if(!z)return;
  var all=$$('.l.zh',ue).filter(function(x){return !x.closest('.ed-tools,.ed-add,.ed-tbl')}),idx=all.indexOf(z);if(idx<0)return;e.preventDefault();editText(ue.getAttribute('data-u'),idx)}
function tableHTML(r,c){var th='',tb='';for(var j=0;j<c;j++)th+='<th>'+tri('欄'+(j+1),'Col '+(j+1),'ជួរឈរ '+(j+1))+'</th>';for(var i=0;i<r;i++){tb+='<tr>';for(var k=0;k<c;k++)tb+='<td>'+tri('—','—','—')+'</td>';tb+='</tr>'}return '<table class="doc-table"><thead><tr>'+th+'</tr></thead><tbody>'+tb+'</tbody></table>'}
function compress(file,max,cap){return new Promise(function(res,rej){var fr=new FileReader();fr.onerror=rej;fr.onload=function(){var im=new Image();im.onerror=function(){rej(new Error('image'))};im.onload=function(){var q=0.8,m=max,out='';
      for(var i=0;i<9;i++){var s=Math.min(1,m/Math.max(im.width,im.height)),w=Math.max(1,Math.round(im.width*s)),h=Math.max(1,Math.round(im.height*s)),cv=document.createElement('canvas');cv.width=w;cv.height=h;var g=cv.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,w,h);g.drawImage(im,0,0,w,h);out=cv.toDataURL('image/jpeg',q);if(out.length<=cap)break;if(q>0.55)q-=0.1;else m=Math.round(m*0.85)}res(out)};im.src=fr.result};fr.readAsDataURL(file)})}
function pick(accept,multi,cb){var i=document.createElement('input');i.type='file';i.accept=accept;if(multi)i.multiple=true;i.onchange=function(){cb(Array.prototype.slice.call(i.files||[]))};i.click()}
function newArt(){return {id:uid('a'),o:1,h:'（'+tri('新條文標題','New article title','ចំណងជើងមាត្រាថ្មី')+'）',cl:[{id:uid('c'),o:1,k:'c',h:tri('新條款內容','New clause text','ខ្លឹមសារថ្មី')}]}}
function act(b){var a=b.getAttribute('data-act'),box=b.closest('[data-id]'),id=box?box.getAttribute('data-id'):'',k=box?box.getAttribute('data-k'):'';
  if(a==='up'||a==='down'){var f=k==='cl'?findCl(id):k==='art'?findArt(id):k==='ch'?findCh(id):findPre(id);if(f&&moveIn(f,a==='up'?-1:1))changed();return}
  if(a==='del'){var g=k==='cl'?findCl(id):k==='art'?findArt(id):k==='ch'?findCh(id):findPre(id);if(!g)return;var nm=k==='cl'?T('這一款','this clause'):k==='art'?T('這一條（含底下各款）','this article and its clauses'):k==='ch'?T('這一章（含底下所有條文）','this chapter and all its articles'):T('這一段','this paragraph');
    if(!confirm(T('確定刪除','Delete ')+nm+'？'))return;pushUndo();g=k==='cl'?findCl(id):k==='art'?findArt(id):k==='ch'?findCh(id):findPre(id);g.list.splice(g.i,1);changed();return}
  if(a==='cl+'||a==='tb+'||a==='ph+'){if(!findArt(id))return;var add=function(kind,h){var fa=findArt(id),c={id:uid('c'),o:lastO(fa.it.cl)+1,k:kind,h:h};fa.it.cl.push(c);return c};
    if(a==='cl+'){pushUndo();var c=add('c',tri('新條款內容','New clause text','ខ្លឹមសារថ្មី'));changed();editText('cl:'+c.id,0,true);return}
    if(a==='tb+'){var sz=(prompt(T('表格大小：列x欄（例如 3x4）','Table size rows x cols (e.g. 3x4)'),'3x3')||'').match(/(\d+)\s*[x×*]\s*(\d+)/i);if(!sz)return;pushUndo();add('t',tableHTML(Math.max(1,Math.min(30,+sz[1])),Math.max(1,Math.min(10,+sz[2]))));changed();toast(T('表格已加入，點格子就能改字','Table added — tap a cell to edit'));return}
    pick('image/*',true,function(fs){if(!fs.length)return;Promise.all(fs.map(function(f){return compress(f,1100,170000)})).then(function(us){pushUndo();us.forEach(function(u){add('p','<figure class="doc-photo"><img src="'+u+'" alt=""><figcaption>'+tri('照片說明','Photo caption','ចំណងជើងរូបថត')+'</figcaption></figure>')});changed();toast('📷 '+T('已加入照片，點說明可改字，記得按儲存','Photo added — tap the caption to edit, remember to save'))}).catch(function(){toast(T('照片讀取失敗','Could not read the photo'),1)})});return}
  if(a==='art+'){if(!findCh(id))return;pushUndo();var fc=findCh(id),na=newArt();na.o=lastO(fc.it.arts)+1;fc.it.arts.push(na);changed();var el=document.getElementById(na.id);if(el)el.scrollIntoView({block:'center'});editText('art:'+na.id,0,true);return}
  if(a==='ch+'){if(!findCh(id))return;pushUndo();var fh=findCh(id),nx=byO(M.ch).filter(function(c){return c.o>fh.it.o})[0],nc={id:uid('ch'),o:nx?(fh.it.o+nx.o)/2:fh.it.o+1,h:tri('新章名稱','New chapter','ជំពូកថ្មី'),arts:[newArt()]};M.ch.push(nc);changed();var s=document.getElementById(nc.id);if(s)s.scrollIntoView({block:'start'});editText('ch:'+nc.id,0,true);return}
  if(a==='pf+'){pushUndo();var np={id:uid('pf'),o:lastO(M.pre)+1,h:tri('新段落','New paragraph','កថាខណ្ឌថ្មី')};M.pre.push(np);changed();editText('pre:'+np.id,0,true);return}
  if(/^(row|col)[+-]$/.test(a)){if(!findCl(id))return;pushUndo();var ft=findCl(id),t=document.createElement('template');t.innerHTML=ft.it.h;var tb=$('table',t.content);if(!tb)return;var rows=$$('tr',tb),cols=rows[0]?rows[0].children.length:0;
    if(a==='row+'){var tr=document.createElement('tr'),h='';for(var i=0;i<cols;i++)h+='<td>'+tri('—','—','—')+'</td>';tr.innerHTML=h;($('tbody',tb)||tb).appendChild(tr)}
    else if(a==='row-'){if(rows.length>2)rows[rows.length-1].remove()}
    else if(a==='col+'){rows.forEach(function(r){var c=document.createElement(r.parentNode.tagName==='THEAD'?'th':'td');c.innerHTML=tri('—','—','—');r.appendChild(c)})}
    else if(cols>1)rows.forEach(function(r){r.lastElementChild.remove()});ft.it.h=t.innerHTML;changed()}}

/* ---------- 匯出／匯入（都從資料產生，不抄畫面）---------- */
function dl(name,blob){var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},500)}
function stamp(){var d=new Date(),p=function(n){return ('0'+n).slice(-2)};return ''+d.getFullYear()+p(d.getMonth()+1)+p(d.getDate())}
function expJSON(){dl('VRT_Factory_Rules_2027_'+stamp()+'.json',new Blob([JSON.stringify({app:'VRT_FACTORY_RULES_2027',exportedAt:nowStr(),data:cur()},null,1)],{type:'application/json'}));toast('⬇ JSON')}
function cleanDoc(){var doc;if(SRC){doc=new DOMParser().parseFromString(SRC,'text/html');apply(cur(),doc);doc.body.setAttribute('data-lang',lang())}else{doc=document.implementation.createHTMLDocument('');doc.documentElement.innerHTML=document.documentElement.innerHTML}
  $$('.ed-tools,.ed-add,.ed-tbl,.ed-bar,#edToast,#edModal,#acAutoBadge,#edCss,#edFiles,script[src]',doc).forEach(function(x){x.remove()});$$('[data-u]',doc).forEach(function(x){x.removeAttribute('data-u')});doc.body.classList.remove('editing');
  var st=doc.createElement('style');st.textContent='.clause-photo{list-style:none;margin-left:-2em}.doc-photo{margin:10px 0;text-align:center}.doc-photo img{max-width:100%;max-height:520px;border:1px solid #bbb}.doc-photo figcaption{font-size:13.5px;color:#555;margin-top:4px}';doc.head.appendChild(st);return doc}
function expHTML(){dl('VRT_Factory_Rules_2027_'+stamp()+'.html',new Blob(['<!DOCTYPE html>\n'+cleanDoc().documentElement.outerHTML],{type:'text/html'}));toast('⬇ HTML')}
function expWord(){var doc=cleanDoc(),l=lang(),m=$('main.doc',doc);$$('.noprint,#calc',m).forEach(function(x){x.remove()});$$('.l',m).forEach(function(x){if(!x.classList.contains(l))x.remove()});
  var html='<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>VRT Factory Rules 2027</title><style>body{font-family:"PMingLiU","Khmer OS Battambang",serif;font-size:11.5pt;line-height:1.6}h1{text-align:center;font-size:30pt}h2{font-size:15pt;color:#14345c;border-bottom:1.5pt solid #222}.cover{text-align:center}.art-head{font-weight:bold}.art-num{color:#14345c}table{border-collapse:collapse;width:100%}th,td{border:1px solid #444;padding:3pt 6pt}th{background:#e9edf3}img{max-width:420pt}#toc a{color:#000;text-decoration:none}</style></head><body>'+m.innerHTML+'</body></html>';
  dl('VRT_Factory_Rules_2027_'+l+'_'+stamp()+'.doc',new Blob(['﻿'+html],{type:'application/msword'}));toast('⬇ Word')}
function impFile(){pick('.json,.html,.htm',false,function(fs){var f=fs[0];if(!f)return;var fr=new FileReader();fr.onload=function(){try{var d;
      if(/\.json$/i.test(f.name)){var j=JSON.parse(fr.result);d=j.data||j;if(!d||!Array.isArray(d.ch))throw new Error(T('不是廠規的 JSON 檔','Not a factory-rules JSON file'))}
      else{var doc=new DOMParser().parseFromString(String(fr.result),'text/html');if(!$('section.chapter',doc)||!$('.article',doc))throw new Error(T('這個 HTML 不是廠規格式（找不到章／條）','This HTML is not in the factory-rules format'));d=snap(doc)}
      d=sortAll(clone(d));d.files=(DATA&&DATA.files)||[];d.log=(DATA&&DATA.log)||[];var n=count(d);
      if(!confirm(T('匯入「','Import "')+f.name+T('」：','": ')+n.ch+T(' 章 ',' chapters ')+n.art+T(' 條 ',' articles ')+n.cl+T(' 款。\n會取代目前內容（可用「復原」退回）。確定？',' clauses.\nThis replaces the current content (Undo is available). Continue?')))return;
      if(!EDIT)setEdit(true);pushUndo();M=d;changed();toast('⬆ '+T('已匯入，檢查後按儲存','Imported — review and save'))}catch(err){toast('⚠ '+(err.message||err),1)}};fr.readAsText(f)})}

/* ---------- 附件（上傳 Google Drive）---------- */
function drawFiles(){var box=$('#edFiles');if(!box)return;var fs=(DATA&&DATA.files)||[];
  box.innerHTML='<h2 class="chapter-head">'+tri('附件','Attachments','ឯកសារភ្ជាប់')+' <small style="font-weight:400;font-size:13px;color:#555">'+fs.length+'</small></h2>'+(fs.length?'<ul class="ed-fl">'+fs.map(function(f){return '<li>📎 <a href="'+esc(f.url||'#')+'" target="_blank" rel="noopener">'+esc(f.name||f.originalName||'file')+'</a> <small>'+esc(f.at||'')+' · '+esc(f.by||'')+'</small> <button type="button" class="eb bad" data-fdel="'+esc(f.id)+'">🗑</button></li>'}).join('')+'</ul>':'<p class="note">'+tri('還沒有附件。核簽掃描檔、勞動部回函、舊版廠規都可以放這裡。','No attachments yet. Scans of the visa, ministry replies or older editions can be kept here.','មិនទាន់មានឯកសារភ្ជាប់')+'</p>')+'<button type="button" class="eb" id="edUp">⬆ '+T('上傳附件','Upload attachment')+'</button> <a class="eb" style="text-decoration:none" href="VRT_Factory_Rules_v2.html" target="_blank" rel="noopener">📜 '+T('2026 年版（存檔）','2026 edition (archive)')+'</a>'}
function readURL(f){return new Promise(function(res,rej){var fr=new FileReader();fr.onload=function(){res(fr.result)};fr.onerror=rej;fr.readAsDataURL(f)})}
function upFiles(){pick('',true,function(fs){if(!fs.length)return;if(!window.ACAuto)return toast('⚠ offline',1);toast('☁ '+T('上傳到 Google Drive…','Uploading to Google Drive…'));
    var chain=Promise.resolve(),got=[];fs.forEach(function(f){chain=chain.then(function(){var sig=[f.name,f.size,f.lastModified||0].join('|');return readURL(f).then(function(u){return ACAuto.post({action:'uploadAttachment',module:'factory_rules',recordId:'rules2027',name:f.name,originalName:f.name,mime:f.type||'application/octet-stream',size:f.size,lastModified:f.lastModified||0,signature:sig,dataUrl:u})}).then(function(j){if(!j||!j.ok)throw new Error((j&&(j.msg||j.error))||'upload failed');var x=j.file||{};
          got.push({id:uid('F'),name:f.name,url:x.url||x.webViewUrl||x.viewUrl||x.webViewLink||(x.driveId?'https://drive.google.com/file/d/'+x.driveId+'/view':''),driveId:x.driveId||'',size:f.size,at:nowStr(),by:who(true)})})})});
    chain.then(function(){setFiles(((DATA&&DATA.files)||[]).concat(got));toast('📎 '+T('附件已上傳 ','Uploaded ')+got.length)}).catch(function(e){if(got.length)setFiles(((DATA&&DATA.files)||[]).concat(got));toast('⚠ '+T('上傳失敗：','Upload failed: ')+(e.message||e),1)})})}
/* 附件清單直接存（不必進編輯模式）：以目前已存的版本為底，只換附件清單 */
function setFiles(list){var d=clone(DATA||SEED);d.files=list;d.log=(DATA&&DATA.log)||[];d.updatedAt=Date.now();if(!d.by)d.by=who();DATA=d;drawFiles();store(d)}

/* ---------- 摘要／紀錄 ---------- */
function summaryText(){var d=DATA||SEED,n=count(d),last=(d.log||[]).slice(-1)[0],ph=0;(d.ch||[]).forEach(function(c){c.arts.forEach(function(a){a.cl.forEach(function(x){if(x.k==='p')ph++})})});
  var r=diff(SEED,d);
  return '📕 <b>廠規 2027 更新 Factory Rules 2027</b>\n━━━━━━━━━━━━━━━━━━━━\n📚 '+n.ch+' 章 ｜ '+n.art+' 條 ｜ '+n.cl+' 款'+(ph?' ｜ 📷 '+ph:'')+((d.files||[]).length?' ｜ 📎 '+d.files.length:'')+'\n✏️ 與 v5 原版比：'+esc(diffText(r))+'\n'+(last?'🕘 最近修改：'+esc(last.at)+' · '+esc(last.by)+'\n📝 '+esc(last.what)+'\n'+((last.arts||[]).length?last.arts.slice(0,6).map(function(x){return '　• '+esc(x)}).join('\n')+'\n':''):'🕘 尚無修改，內容＝2027 v5 原版\n')+'━━━━━━━━━━━━━━━━━━━━\n🔗 '+PAGE}
function sendSummary(){if(DIRTY&&!save())return;var msg=summaryText();modal('<h3>📣 '+T('發 Telegram 摘要','Send Telegram summary')+'</h3><pre class="ed-pre">'+esc(msg.replace(/<\/?b>/g,''))+'</pre><div class="ed-row"><button type="button" class="eb hot" id="edSend">'+T('確定發送','Send')+'</button><button type="button" class="eb" data-close>'+T('取消','Cancel')+'</button></div>');
  $('#edSend').onclick=function(){this.disabled=true;ACAuto.post({action:'tg',text:msg}).then(function(j){if(!j||(!j.ok&&j.status!=='ok'))throw new Error((j&&(j.msg||j.error))||'Telegram failed');closeModal();toast('📣 '+T('摘要已發送','Summary sent'))}).catch(function(e){toast('⚠ '+(e.message||e),1);closeModal()})}}
function showLog(){var d=DATA||SEED,lg=(d.log||[]).slice().reverse();modal('<h3>🕘 '+T('修改紀錄','Change log')+'</h3>'+(lg.length?'<div class="ed-log">'+lg.map(function(x){return '<div><b>'+esc(x.at)+'</b> · '+esc(x.by)+'<br>'+esc(x.what)+((x.arts||[]).length?'<br><small>'+x.arts.map(esc).join('、')+'</small>':'')+'</div>'}).join('')+'</div>':'<p>'+T('還沒有修改，內容就是 2027 v5 原版。','No changes yet — this is the original 2027 v5.')+'</p>')+'<div class="ed-row"><button type="button" class="eb bad" id="edReset">'+T('還原成 2027 v5 原版','Restore original 2027 v5')+'</button><button type="button" class="eb" data-close>'+T('關閉','Close')+'</button></div>');
  $('#edReset').onclick=function(){if(!confirm(T('把條文還原成 2027 v5 原版？（附件與紀錄保留，其他裝置也會跟著還原）','Restore the text to the original 2027 v5? (attachments and log are kept; other devices follow)')))return;closeModal();if(!EDIT)setEdit(true);pushUndo();M=clone(SEED);changed();save();setEdit(false)}}
function modal(h,closable){var m=$('#edModal');if(!m){m=document.createElement('div');m.id='edModal';m.className='noprint';document.body.appendChild(m);m.addEventListener('click',function(e){if((e.target===m&&m.dataset.c!=='0')||e.target.closest('[data-close]'))closeModal()})}m.dataset.c=closable===false?'0':'1';m.innerHTML='<div class="ed-box">'+h+'</div>';m.classList.add('show')}
function closeModal(){var m=$('#edModal');if(m)m.classList.remove('show')}

/* ---------- 介面 ---------- */
var CSS='.ed-bar{display:flex;gap:6px;flex-wrap:wrap;align-items:center;width:100%;padding-top:6px;border-top:1px solid rgba(255,255,255,.25);margin-top:2px}.ed-bar button{font-size:13px;padding:5px 10px}.ed-bar button.hot,.eb.hot{background:#f59e0b!important;color:#1a1a1a!important;border-color:#f59e0b!important;font-weight:700}.ed-bar button:disabled{opacity:.45;cursor:default}'
+'.editing main.doc [data-u] .l{cursor:pointer;outline:1px dashed rgba(20,52,92,.35);outline-offset:2px;border-radius:2px}.editing main.doc [data-u] .l:hover{outline:2px solid #f59e0b;background:#fffbeb}.editing main.doc .art-num .l,.editing main.doc .ed-tools .l{outline:0;cursor:default;background:none}'
+'.ed-tools{display:inline-flex;gap:3px;margin-left:8px;vertical-align:middle;font-size:12px;font-weight:400;user-select:none}.eb{font:600 12px system-ui,-apple-system,"Noto Sans TC",sans-serif;background:#fff;color:#14345c;border:1px solid #14345c;border-radius:4px;padding:3px 8px;cursor:pointer;line-height:1.3}.eb:hover{background:#eef2f7}.eb.bad{color:#b91c1c;border-color:#b91c1c}.ed-add{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 10px 2em}.ed-add.big{margin:14px 0 4px;padding-top:10px;border-top:1px dashed #9aa7b8}.ed-tbl{display:flex;gap:4px;margin:0 0 4px}'
+'.clause-photo{list-style:none;margin-left:-2em}.doc-photo{margin:10px 0;text-align:center}.doc-photo img{max-width:100%;max-height:520px;border:1px solid #bbb}.doc-photo figcaption{font-size:13.5px;color:var(--muted);margin-top:4px}'
+'#edFiles{margin-top:24px}.ed-fl{list-style:none;padding:0;margin:0 0 10px}.ed-fl li{padding:5px 0;border-bottom:1px solid #e5e5e5;font-size:14.5px;word-break:break-all}.ed-fl small{color:#666}'
+'#edToast{position:fixed;left:50%;bottom:44px;transform:translateX(-50%) translateY(20px);background:#14345c;color:#fff;padding:9px 16px;border-radius:8px;font:600 13.5px system-ui,"Noto Sans TC",sans-serif;z-index:9995;opacity:0;pointer-events:none;transition:.25s;max-width:92vw;text-align:center}#edToast.show{opacity:1;transform:translateX(-50%)}#edToast.bad{background:#b91c1c}'
+'#edModal{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9994;display:none;align-items:center;justify-content:center;padding:14px}#edModal.show{display:flex}.ed-box{background:#fff;border-radius:10px;max-width:620px;width:100%;max-height:90vh;overflow:auto;padding:16px 18px;font-family:system-ui,-apple-system,"Noto Sans TC","Noto Sans Khmer",sans-serif;font-size:14px}.ed-box h3{margin:0 0 10px;color:#14345c}.ed-pre{white-space:pre-wrap;word-break:break-word;background:#f4f4f1;border-radius:6px;padding:10px;font:13px/1.6 system-ui,"Noto Sans TC",sans-serif;max-height:46vh;overflow:auto}.ed-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.ed-row .eb{padding:7px 14px;font-size:13.5px}.ed-log>div{padding:8px 0;border-bottom:1px solid #eee;line-height:1.55}'
+'.ed-lab{display:block;font-weight:700;font-size:12.5px;color:#14345c;margin-top:8px}.ed-lab small{font-weight:400;color:#b45309}.ed-ta{display:block;width:100%;margin-top:3px;padding:8px 10px;border:1px solid #9aa7b8;border-radius:6px;font:15px/1.6 "Noto Serif TC","Noto Serif Khmer","Noto Sans Khmer",Georgia,serif;resize:vertical;box-sizing:border-box}.ed-ta:focus{outline:2px solid #f59e0b;border-color:#f59e0b}.ed-hint{font-size:12px;color:#666;margin:10px 0 0}'
+'.ed-menu{position:relative;display:inline-block}.ed-menu>div{position:absolute;top:100%;left:0;background:#fff;border-radius:6px;box-shadow:0 6px 20px rgba(0,0,0,.25);padding:4px;display:none;z-index:20;min-width:150px}.ed-menu.open>div{display:block}.ed-menu>div button{display:block;width:100%;text-align:left;background:#fff!important;color:#14345c!important;border:0!important;padding:8px 10px!important;font-size:13.5px!important}.ed-menu>div button:hover{background:#eef2f7!important}'
+'@media(max-width:700px){.ed-tools{margin-left:4px}.ed-add{margin-left:0}.topbar{padding:6px 8px}.ed-bar button{padding:5px 8px;font-size:12.5px}}@media print{.ed-tools,.ed-add,.ed-tbl,#edFiles{display:none!important}}';
function ui(){var st=document.createElement('style');st.id='edCss';st.textContent=CSS;document.head.appendChild(st);
  var bar=document.createElement('div');bar.className='ed-bar';
  bar.innerHTML='<button type="button" id="edToggle"></button>'
   +'<button type="button" id="edSave" class="ed-only" disabled>💾 '+tri('儲存','Save','រក្សាទុក')+'</button>'
   +'<button type="button" id="edUndo" class="ed-only" disabled>↩ '+tri('復原','Undo','ត្រឡប់')+'</button>'
   +'<span class="ed-menu" id="edExp"><button type="button">⬇ '+tri('匯出','Export','នាំចេញ')+' ▾</button><div><button type="button" data-x="json">JSON（'+T('備份／再匯入','backup / re-import')+'）</button><button type="button" data-x="html">HTML（'+T('三語單檔','3-language file')+'）</button><button type="button" data-x="word">Word（'+T('目前語言','current language')+'）</button><button type="button" data-x="pdf">PDF（'+T('列印','print')+'）</button></div></span>'
   +'<button type="button" id="edImp">⬆ '+tri('匯入','Import','នាំចូល')+'</button>'
   +'<button type="button" id="edSum">📣 '+tri('摘要','Summary','សង្ខេប')+'</button>'
   +'<button type="button" id="edLog">🕘 '+tri('紀錄','Log','កំណត់ហេតុ')+'</button>';
  $('.topbar').appendChild(bar);
  var fsec=document.createElement('section');fsec.id='edFiles';fsec.className='noprint';var calc=$('#calc');calc.parentNode.insertBefore(fsec,calc);
  $('#edToggle').onclick=function(){setEdit(!EDIT)};$('#edSave').onclick=function(){save()};$('#edUndo').onclick=undo;
  $('#edExp').firstElementChild.onclick=function(e){e.stopPropagation();$('#edExp').classList.toggle('open')};document.addEventListener('click',function(){$('#edExp').classList.remove('open')});
  $('#edExp').addEventListener('click',function(e){var x=e.target.closest('[data-x]');if(!x)return;({json:expJSON,html:expHTML,word:expWord,pdf:function(){window.print()}})[x.dataset.x]()});
  $('#edImp').onclick=impFile;$('#edSum').onclick=sendSummary;$('#edLog').onclick=showLog;
  $('main.doc').addEventListener('click',onDocClick,true);
  document.addEventListener('click',function(e){var d=e.target.closest('[data-fdel]');if(d){if(!confirm(T('從清單移除這個附件？（Drive 上的原檔不會刪）','Remove this attachment from the list? (the Drive file is kept)')))return;setFiles(((DATA&&DATA.files)||[]).filter(function(f){return f.id!==d.dataset.fdel}))}else if(e.target.id==='edUp')upFiles()});
  window.addEventListener('beforeunload',function(e){if(DIRTY){e.preventDefault();e.returnValue=''}});
  document.addEventListener('keydown',function(e){if((e.ctrlKey||e.metaKey)&&e.key==='s'&&EDIT){e.preventDefault();save()}else if(e.key==='Escape')closeModal()});
  setEdit(false)}
function start(){ui();apply(SEED);
  /* v1（只上線一個多小時）把資料放在 localStorage：清掉，資料以雲端／IndexedDB 為準 */
  try{[KEY,'ac_sync_base_'+KEY,'ac_auto_backup_'+KEY].forEach(function(k){localStorage.removeItem(k)})}catch(e){}
  load();
  if(window.ACAuto)ACAuto.init({keys:[KEY],by:'rules2027',store:'idb',editing:function(){var m=$('#edModal');return EDIT&&(DIRTY||!!(m&&m.classList.contains('show')))},onPull:function(){if(EDIT&&DIRTY)return;load();toast('☁ '+T('已載入雲端最新版本','Loaded the latest version from cloud'))}});
  window.RULES27={apply:apply,save:save,diff:diff,seed:function(){return SEED},data:function(){return DATA},model:function(){return M},setEdit:setEdit,summaryText:summaryText,count:count,editText:editText,act:act,src:function(){return !!SRC},snap:snap}}
/* 原文一律取自頁面原始檔（擴充功能改不到）；抓不到才退而用眼前的畫面 */
function boot(){var fin=function(doc){SEED=sortAll(snap(doc));start()};
  try{fetch(location.href.split('#')[0].split('?')[0],{cache:'force-cache'}).then(function(r){if(!r.ok)throw new Error(r.status);return r.text()}).then(function(tx){var doc=new DOMParser().parseFromString(tx,'text/html');if(!$('section.chapter',doc))throw new Error('no chapters');SRC=tx;fin(doc)}).catch(function(){fin(document)})}catch(e){fin(document)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
