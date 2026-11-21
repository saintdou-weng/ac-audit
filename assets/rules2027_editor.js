/* VRT 廠規 2027 · 編輯／匯入匯出／照片／雲端同步 v1
   頁面本體＝Paul 提供的 VRT_Factory_Rules_2027_v5.html（原樣）。這支只是加在上面的工具：
   ✏️ 編輯（三語都可改、章／條／款／表格／照片 新增・刪除・上下移）→ 💾 儲存 → 自動上雲（ac_autosync.js）
   ⬇ 匯出 JSON／HTML／Word、⬆ 匯入 JSON／HTML、📎 附件上傳 Drive、📣 Telegram 摘要、🕘 修改紀錄
   資料鍵：localStorage vrt_factory_rules_2027（雲端 AC_AUDIT_DB.tools 同一鍵） */
(function(){
'use strict';
var KEY='vrt_factory_rules_2027',PAGE='https://saintdou-weng.github.io/ac-audit/VRT_Factory_Rules_2027.html';
var $=function(s,r){return (r||document).querySelector(s)},$$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var lang=function(){return document.body.getAttribute('data-lang')||'zh'};
var T=function(zh,en,km){var l=lang();return l==='en'?en:l==='km'?(km||en):zh};
var tri=function(zh,en,km){return '<span class="l zh">'+zh+'</span><span class="l en">'+en+'</span><span class="l km">'+(km||en)+'</span>'};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
var uid=function(p){return p+Date.now().toString(36)+Math.random().toString(36).slice(2,5)};
var SEED=null,DATA=null,EDIT=false,DIRTY=false,UNDO=[];
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

/* ---------- DOM ⇄ 資料 ---------- */
function seedIds(doc){$$('#preface p',doc).forEach(function(p,i){if(!p.dataset.id)p.dataset.id='pf'+(i+1)});
  $$('section.chapter',doc).forEach(function(s,i){if(!s.id)s.id='ch'+(i+1);$$('.article',s).forEach(function(a,j){if(!a.id)a.id=s.id+'-a'+(j+1);$$('ol.clauses > li',a).forEach(function(li,k){if(!li.dataset.id)li.dataset.id=a.id+'-'+(k+1)})})})}
function orders(list){/* 依 DOM 順序給排序值；原有的值盡量不動，只有插進來或搬動的那一個取前後中間值 */
  var prev=0;list.forEach(function(el,i){var o=parseFloat(el.dataset.o);if(!(o>prev)){var nx=null;for(var j=i+1;j<list.length;j++){var v=parseFloat(list[j].dataset.o);if(v>prev){nx=v;break}}o=nx!==null?(prev+nx)/2:prev+1;el.dataset.o=o}prev=o})}
function snap(doc){doc=doc||document;seedIds(doc);
  var d={v:1,cover:[],preH:'',pre:[],ch:[],sig:'',files:(DATA&&DATA.files)||[],log:(DATA&&DATA.log)||[]};
  $$('#cover > :not(img)',doc).forEach(function(el){d.cover.push({id:el.className.split(' ')[0],h:inner(el)})});
  var pf=$('#preface',doc);if(pf){d.preH=inner($('h2',pf));var ps=$$('p',pf);orders(ps);ps.forEach(function(p){d.pre.push({id:p.dataset.id,o:+p.dataset.o,h:inner(p)})})}
  var cs=$$('section.chapter',doc);orders(cs);
  cs.forEach(function(s){var c={id:s.id,o:+s.dataset.o,h:stripCh(inner($('.chapter-head',s))),arts:[]};var as=$$('.article',s);orders(as);
    as.forEach(function(a){var A={id:a.id,o:+a.dataset.o,h:inner($('.art-title',a)),cl:[]};var ls=$$('ol.clauses > li',a);orders(ls);
      ls.forEach(function(li){A.cl.push({id:li.dataset.id,o:+li.dataset.o,k:li.classList.contains('clause-table')?'t':li.classList.contains('clause-photo')?'p':'c',h:inner(li)})});c.arts.push(A)});d.ch.push(c)});
  var sg=$('#sig',doc);if(sg)d.sig=inner(sg);return d}
function byO(a){return (a||[]).slice().sort(function(x,y){return (x.o-y.o)||String(x.id).localeCompare(String(y.id))})}
function liEl(c){var li=document.createElement('li');li.className=c.k==='t'?'clause-table':c.k==='p'?'clause clause-photo':'clause';li.dataset.id=c.id;li.dataset.o=c.o;li.innerHTML=san(c.h);return li}
function artEl(a){var d=document.createElement('div');d.className='article';d.id=a.id;d.dataset.o=a.o;
  d.innerHTML='<div class="art-head"><span class="art-num"></span> <span class="art-title">'+san(a.h)+'</span></div><ol class="clauses"></ol>';var ol=$('ol',d);byO(a.cl).forEach(function(c){ol.appendChild(liEl(c))});return d}
function chEl(c){var s=document.createElement('section');s.className='chapter';s.id=c.id;s.dataset.o=c.o;s.innerHTML='<h2 class="chapter-head">'+san(c.h)+'</h2>';byO(c.arts).forEach(function(a){s.appendChild(artEl(a))});return s}
function apply(d){if(!d||!Array.isArray(d.ch))return;
  (d.cover||[]).forEach(function(c){var el=$('#cover .'+String(c.id).replace(/[^\w-]/g,''));if(el)el.innerHTML=san(c.h)});
  var pf=$('#preface');if(pf&&Array.isArray(d.pre)&&d.pre.length){if(d.preH)$('h2',pf).innerHTML=san(d.preH);$$('p',pf).forEach(function(p){p.remove()});byO(d.pre).forEach(function(p){var e=document.createElement('p');e.dataset.id=p.id;e.dataset.o=p.o;e.innerHTML=san(p.h);pf.appendChild(e)})}
  $$('section.chapter').forEach(function(s){s.remove()});var sig=$('#sig');byO(d.ch).forEach(function(c){sig.parentNode.insertBefore(chEl(c),sig)});
  if(d.sig)sig.innerHTML=san(d.sig);
  renumber();toc();drawFiles();if(EDIT)decorate()}
var RCH={zh:/^\s*第[一二三四五六七八九十百零〇\d]+章[\s\u3000]*/,en:/^\s*Chapter\s+\d+\s*[\u2014\u2013\u2015-]*\s*/i,km:/^\s*ជំពូកទី\s*[០-៩\d]+\s*[\u2014\u2013\u2015-]*\s*/};
function stripCh(h){var t=document.createElement('template');t.innerHTML=h;['zh','en','km'].forEach(function(l){var e=t.content.querySelector('.l.'+l);if(e)e.innerHTML=e.innerHTML.replace(RCH[l],'')});return t.innerHTML}
function setPrefix(el,re,pre){if(!el)return;var h=el.innerHTML.replace(re,'');el.innerHTML=pre+h}
function renumber(){var n=0;$$('section.chapter').forEach(function(s,i){var h=$('.chapter-head',s);
    setPrefix($('.l.zh',h),RCH.zh,'第'+zhNum(i+1)+'章\u3000');setPrefix($('.l.en',h),RCH.en,'Chapter '+(i+1)+' \u2014 ');setPrefix($('.l.km',h),RCH.km,'ជំពូកទី'+kmNum(i+1)+' \u2015 ');
    $$('.article',s).forEach(function(a){n++;$('.art-num',a).innerHTML=tri('第'+n+'條','Article '+n,'មាត្រា '+kmNum(n))})})}
function toc(){var ul=$('#toc ul');if(!ul)return;var pre=$('#preface h2');
  var h='<li class="toc-ch"><a href="#preface">'+(pre?inner(pre):tri('前言','Preface','សេចក្តីផ្តើម'))+'</a></li>';
  $$('section.chapter').forEach(function(s){h+='<li class="toc-ch"><a href="#'+s.id+'">'+inner($('.chapter-head',s))+'</a><ul>'+$$('.article',s).map(function(a){
      var t=$('.art-title',a).cloneNode(true);$$('.ed-tools',t).forEach(function(x){x.remove()});$$('[contenteditable]',t).forEach(function(x){x.removeAttribute('contenteditable')});var sp=$$('.l',t).map(function(x){return x.outerHTML}).join('');
      return '<li><a href="#'+a.id+'"><span class="toc-art">'+$('.art-num',a).innerHTML+'</span> '+sp+'</a></li>'}).join('')+'</ul></li>'});
  var sg=$('#sig h2');if(sg)h+='<li class="toc-ch"><a href="#sig">'+inner(sg)+'</a></li>';ul.innerHTML=h}
function count(d){var a=0,c=0;(d.ch||[]).forEach(function(x){a+=x.arts.length;x.arts.forEach(function(y){c+=y.cl.length})});return {ch:(d.ch||[]).length,art:a,cl:c}}
function txt(h){var t=document.createElement('div');t.innerHTML=h;var z=$('.l.zh',t);return (z?z.textContent:t.textContent).replace(/\s+/g,' ').trim()}
function diff(a,b){/* a 舊 b 新 */var r={add:{ch:0,art:0,cl:0},del:{ch:0,art:0,cl:0},mod:{ch:0,art:0,cl:0},arts:[]};
  var flat=function(d){var m={ch:{},art:{},cl:{},own:{}};(d.ch||[]).forEach(function(c){m.ch[c.id]=c.h;c.arts.forEach(function(x){m.art[x.id]=x.h;x.cl.forEach(function(y){m.cl[y.id]=y.h;m.own[y.id]=x.id})})});return m};
  var A=flat(a),B=flat(b),hit={};['ch','art','cl'].forEach(function(k){Object.keys(B[k]).forEach(function(id){if(!(id in A[k])){r.add[k]++;if(k!=='ch')hit[k==='art'?id:B.own[id]]=1}else if(A[k][id]!==B[k][id]){r.mod[k]++;if(k!=='ch')hit[k==='art'?id:B.own[id]]=1}});
    Object.keys(A[k]).forEach(function(id){if(!(id in B[k])){r.del[k]++;if(k==='cl'&&A.own[id] in B.art)hit[A.own[id]]=1}})});
  var n=0;(b.ch||[]).forEach(function(c){byO(c.arts).forEach(function(x){n++;if(hit[x.id])r.arts.push('第'+n+'條 '+txt(x.h).replace(/^[（(]|[）)]$/g,''))})});
  r.total=['add','del','mod'].reduce(function(s,k){return s+r[k].ch+r[k].art+r[k].cl},0);
  if(JSON.stringify(a.cover)!==JSON.stringify(b.cover)||JSON.stringify(a.pre)!==JSON.stringify(b.pre)||a.sig!==b.sig||a.preH!==b.preH){r.other=1;r.total++}
  return r}
function diffText(r){var p=[],f=function(lab,o){var s=[];if(o.ch)s.push(o.ch+T(' 章',' ch.'));if(o.art)s.push(o.art+T(' 條',' art.'));if(o.cl)s.push(o.cl+T(' 款',' cl.'));if(s.length)p.push(lab+' '+s.join('、'))};
  f(T('新增','Added'),r.add);f(T('修改','Changed'),r.mod);f(T('刪除','Removed'),r.del);if(r.other)p.push(T('封面／前言／簽署有改','cover / preface / signature changed'));return p.join('；')||T('沒有變更','No change')}

/* ---------- 儲存／載入 ---------- */
function read(){try{var r=localStorage.getItem(KEY);return r?JSON.parse(r):null}catch(e){return null}}
function save(silent){var d=snap(),prev=DATA||SEED,r=diff(prev,d);
  if(!r.total){setDirty(false);if(!silent)toast(T('沒有變更','Nothing changed'));return true}
  d.updatedAt=Date.now();d.by=who(true);d.log=(d.log||[]).concat([{id:uid('L'),at:nowStr(),by:d.by,what:diffText(r),arts:r.arts.slice(0,12)}]).slice(-60);
  try{localStorage.setItem(KEY,JSON.stringify(d))}catch(e){alert(T('裝置儲存空間不足：請先刪掉幾張照片再存。','Device storage is full: remove some photos and save again.'));return false}
  DATA=d;setDirty(false);renumber();toc();if(window.ACAuto)ACAuto.touch();
  if(!silent)toast('💾 '+T('已儲存，會自動同步雲端：','Saved — syncing to cloud: ')+diffText(r));return true}
function load(){var d=read();if(d&&Array.isArray(d.ch)){DATA=d;apply(d)}else{DATA=null;drawFiles()}}
function setDirty(v){DIRTY=!!v;var b=$('#edSave');if(b){b.classList.toggle('hot',DIRTY);b.disabled=!DIRTY}document.title=(DIRTY?'● ':'')+document.title.replace(/^● /,'')}
function pushUndo(){UNDO.push(JSON.stringify(snap()));if(UNDO.length>20)UNDO.shift();var b=$('#edUndo');if(b)b.disabled=false}
function undo(){var s=UNDO.pop();if(!s)return toast(T('沒有可以復原的步驟','Nothing to undo'));apply(JSON.parse(s));setDirty(true);$('#edUndo').disabled=!UNDO.length}

/* ---------- 編輯模式 ---------- */
function btn(act,txt,title,cls){return '<button type="button" class="eb '+(cls||'')+'" data-act="'+act+'" title="'+esc(title||'')+'">'+txt+'</button>'}
function decorate(){$$('.ed-tools,.ed-add,.ed-tbl').forEach(function(x){x.remove()});
  $$('main.doc .l').forEach(function(el){if(el.closest('#toc,#calc,.art-num,.ed-tools,.ed-add,#edFiles'))return;el.setAttribute('contenteditable','true')});
  var mv=btn('up','↑',T('上移','Move up'))+btn('down','↓',T('下移','Move down'))+btn('del','🗑',T('刪除','Delete'),'bad');
  $$('section.chapter').forEach(function(s){var h=$('.chapter-head',s);h.insertAdjacentHTML('beforeend','<span class="ed-tools" contenteditable="false" data-k="ch">'+mv+'</span>');
    $$('.article',s).forEach(function(a){$('.art-head',a).insertAdjacentHTML('beforeend','<span class="ed-tools" contenteditable="false" data-k="art">'+mv+'</span>');
      $$('ol.clauses > li',a).forEach(function(li){li.insertAdjacentHTML('beforeend','<span class="ed-tools" contenteditable="false" data-k="cl">'+mv+'</span>');
        if(li.classList.contains('clause-table'))li.insertAdjacentHTML('afterbegin','<div class="ed-tbl" contenteditable="false">'+btn('row+','＋'+T('列','row'))+btn('col+','＋'+T('欄','col'))+btn('row-','－'+T('列','row'))+btn('col-','－'+T('欄','col'))+'</div>')});
      a.insertAdjacentHTML('beforeend','<div class="ed-add" contenteditable="false">'+btn('cl+','＋ '+T('款','Clause'))+btn('tb+','＋ '+T('表格','Table'))+btn('ph+','📷 '+T('照片','Photo'))+'</div>')});
    s.insertAdjacentHTML('beforeend','<div class="ed-add big" contenteditable="false">'+btn('art+','＋ '+T('在這一章加一條','Add article to this chapter'))+btn('ch+','＋ '+T('在後面加一章','Add chapter after'))+'</div>')});
  var pf=$('#preface');if(pf){$$('p',pf).forEach(function(p){p.insertAdjacentHTML('beforeend','<span class="ed-tools" contenteditable="false" data-k="pf">'+mv+'</span>')});pf.insertAdjacentHTML('beforeend','<div class="ed-add" contenteditable="false">'+btn('pf+','＋ '+T('前言段落','Preface paragraph'))+'</div>')}}
function undecorate(){$$('.ed-tools,.ed-add,.ed-tbl').forEach(function(x){x.remove()});$$('[contenteditable]').forEach(function(x){x.removeAttribute('contenteditable')})}
function setEdit(on){if(!on&&DIRTY){if(confirm(T('有還沒儲存的修改，要先儲存嗎？\n「確定」＝儲存　「取消」＝放棄這次修改','Save your changes?\nOK = save, Cancel = discard'))){if(!save())return}else{apply(DATA||SEED);setDirty(false)}}
  EDIT=!!on;document.body.classList.toggle('editing',EDIT);if(EDIT){who(true);decorate()}else{undecorate();UNDO=[]}
  var b=$('#edToggle');if(b){b.classList.toggle('on',EDIT);b.innerHTML=EDIT?'✅ '+tri('完成編輯','Done','រួចរាល់'):'✏️ '+tri('編輯','Edit','កែ')}$$('.ed-only').forEach(function(x){x.hidden=!EDIT});if(!EDIT)document.body.classList.remove('tri')}
function sib(el,dir,sel){var x=el;do{x=dir<0?x.previousElementSibling:x.nextElementSibling}while(x&&!x.matches(sel));return x}
function move(el,dir,sel){var o=sib(el,dir,sel);if(!o)return;pushUndo();delete el.dataset.o;if(dir<0)o.parentNode.insertBefore(el,o);else o.parentNode.insertBefore(el,o.nextSibling);after()}
function after(){renumber();toc();decorate();setDirty(true)}
function newLi(kind,html){var li=document.createElement('li');li.className=kind==='t'?'clause-table':kind==='p'?'clause clause-photo':'clause';li.dataset.id=uid('c');li.innerHTML=html;return li}
function tableHTML(r,c){var th='',tb='';for(var j=0;j<c;j++)th+='<th>'+tri('欄'+(j+1),'Col '+(j+1),'ជួរឈរ '+(j+1))+'</th>';for(var i=0;i<r;i++){tb+='<tr>';for(var k=0;k<c;k++)tb+='<td>'+tri('','','')+'</td>';tb+='</tr>'}return '<table class="doc-table"><thead><tr>'+th+'</tr></thead><tbody>'+tb+'</tbody></table>'}
function compress(file,max,cap){return new Promise(function(res,rej){var fr=new FileReader();fr.onerror=rej;fr.onload=function(){var im=new Image();im.onerror=function(){rej(new Error('image'))};im.onload=function(){var q=0.8,m=max,out='';
      for(var i=0;i<9;i++){var s=Math.min(1,m/Math.max(im.width,im.height)),w=Math.max(1,Math.round(im.width*s)),h=Math.max(1,Math.round(im.height*s)),cv=document.createElement('canvas');cv.width=w;cv.height=h;var g=cv.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,w,h);g.drawImage(im,0,0,w,h);out=cv.toDataURL('image/jpeg',q);if(out.length<=cap)break;if(q>0.55)q-=0.1;else m=Math.round(m*0.85)}res(out)};im.src=fr.result};fr.readAsDataURL(file)})}
function pick(accept,multi,cb){var i=document.createElement('input');i.type='file';i.accept=accept;if(multi)i.multiple=true;i.onchange=function(){cb(Array.prototype.slice.call(i.files||[]))};i.click()}
function onAct(e){var b=e.target.closest('[data-act]');if(!b||!EDIT)return;e.preventDefault();e.stopPropagation();var act=b.dataset.act,tools=b.closest('.ed-tools'),k=tools&&tools.dataset.k;
  var li=b.closest('ol.clauses > li'),art=b.closest('.article'),ch=b.closest('section.chapter');
  if(act==='up'||act==='down'){var d=act==='up'?-1:1;if(k==='cl')move(li,d,'li');else if(k==='art')move(art,d,'.article');else if(k==='ch')move(ch,d,'section.chapter');else if(k==='pf')move(b.closest('p'),d,'p');return}
  if(act==='del'){var el=k==='cl'?li:k==='art'?art:k==='ch'?ch:b.closest('p'),nm=k==='cl'?T('這一款','this clause'):k==='art'?T('這一條（含底下各款）','this article and its clauses'):k==='ch'?T('這一章（含底下所有條文）','this chapter and all its articles'):T('這一段','this paragraph');
    if(!confirm(T('確定刪除','Delete ')+nm+'？'))return;pushUndo();el.remove();after();return}
  if(act==='cl+'){pushUndo();var n=newLi('c',tri('新條款內容','New clause text','ខ្លឹមសារថ្មី'));$('ol.clauses',art).appendChild(n);after();focusNew(art.lastElementChild.previousElementSibling.lastElementChild);return}
  if(act==='tb+'){var sz=(prompt(T('表格大小：列x欄（例如 3x4）','Table size rows x cols (e.g. 3x4)'),'3x3')||'').match(/(\d+)\s*[x×*]\s*(\d+)/i);if(!sz)return;pushUndo();$('ol.clauses',art).appendChild(newLi('t',tableHTML(Math.min(30,+sz[1]),Math.min(10,+sz[2]))));after();return}
  if(act==='ph+'){pick('image/*',true,function(fs){if(!fs.length)return;pushUndo();Promise.all(fs.map(function(f){return compress(f,1100,170000).then(function(u){$('ol.clauses',art).appendChild(newLi('p','<figure class="doc-photo"><img src="'+u+'" alt=""><figcaption>'+tri('照片說明','Photo caption','ចំណងជើងរូបថត')+'</figcaption></figure>'))})})).then(function(){after();toast('📷 '+T('已加入照片，記得按儲存','Photo added — remember to save'))}).catch(function(){toast(T('照片讀取失敗','Could not read the photo'),1)})});return}
  if(act==='art+'){pushUndo();var a=artEl({id:uid('a'),o:'',h:'（'+tri('新條文標題','New article title','ចំណងជើងមាត្រាថ្មី')+'）',cl:[{id:uid('c'),o:1,k:'c',h:tri('新條款內容','New clause text','ខ្លឹមសារថ្មី')}]});delete a.dataset.o;var last=$$('.article',ch).pop();if(last)last.parentNode.insertBefore(a,last.nextSibling);else ch.appendChild(a);after();a.scrollIntoView({block:'center'});return}
  if(act==='ch+'){pushUndo();var s=chEl({id:uid('ch'),o:'',h:tri('新章名稱','New chapter','ជំពូកថ្មី'),arts:[{id:uid('a'),o:1,h:'（'+tri('新條文標題','New article title','ចំណងជើងមាត្រាថ្មី')+'）',cl:[{id:uid('c'),o:1,k:'c',h:tri('新條款內容','New clause text','ខ្លឹមសារថ្មី')}]}]});delete s.dataset.o;ch.parentNode.insertBefore(s,ch.nextSibling);after();s.scrollIntoView({block:'start'});return}
  if(act==='pf+'){pushUndo();var p=document.createElement('p');p.dataset.id=uid('pf');p.innerHTML=tri('新段落','New paragraph','កថាខណ្ឌថ្មី');var pf=$('#preface');pf.insertBefore(p,$('.ed-add',pf));after();return}
  var tb=li&&$('table',li);if(tb&&/^(row|col)[+-]$/.test(act)){pushUndo();var rows=$$('tr',tb),cols=rows[0]?rows[0].children.length:0;
    if(act==='row+'){var tr=document.createElement('tr'),h='';for(var i=0;i<cols;i++)h+='<td>'+tri('','','')+'</td>';tr.innerHTML=h;($('tbody',tb)||tb).appendChild(tr)}
    else if(act==='row-'){if(rows.length>2)rows[rows.length-1].remove()}
    else if(act==='col+'){rows.forEach(function(r,i){var c=document.createElement(i===0&&r.parentNode.tagName==='THEAD'?'th':'td');c.innerHTML=tri('','','');r.appendChild(c)})}
    else if(cols>1)rows.forEach(function(r){r.lastElementChild.remove()});after()}}
function focusNew(li){if(!li)return;var s=$('.l.'+lang(),li);if(s){s.focus();try{var r=document.createRange();r.selectNodeContents(s);var x=getSelection();x.removeAllRanges();x.addRange(r)}catch(e){}}}

/* ---------- 匯出／匯入 ---------- */
function dl(name,blob){var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},500)}
function stamp(){var d=new Date(),p=function(n){return ('0'+n).slice(-2)};return ''+d.getFullYear()+p(d.getMonth()+1)+p(d.getDate())}
function cur(){return EDIT?snap():(DATA||SEED)}
function expJSON(){var d=cur();dl('VRT_Factory_Rules_2027_'+stamp()+'.json',new Blob([JSON.stringify({app:'VRT_FACTORY_RULES_2027',exportedAt:nowStr(),data:d},null,1)],{type:'application/json'}));toast('⬇ JSON')}
function cleanDoc(){var c=document.documentElement.cloneNode(true);$$('.ed-tools,.ed-add,.ed-tbl,.ed-bar,#edToast,#edModal,#acAutoBadge,#edCss,#edFiles,script[src]',c).forEach(function(x){x.remove()});$$('[contenteditable]',c).forEach(function(x){x.removeAttribute('contenteditable')});$('body',c).classList.remove('editing','tri');return c}
function expHTML(){dl('VRT_Factory_Rules_2027_'+stamp()+'.html',new Blob(['<!DOCTYPE html>\n'+cleanDoc().outerHTML],{type:'text/html'}));toast('⬇ HTML')}
function expWord(){var c=cleanDoc(),l=lang(),m=$('main.doc',c);$$('.noprint,#calc',m).forEach(function(x){x.remove()});$$('.l',m).forEach(function(x){if(!x.classList.contains(l))x.remove()});
  var html='<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>VRT Factory Rules 2027</title><style>body{font-family:"PMingLiU","Khmer OS Battambang",serif;font-size:11.5pt;line-height:1.6}h1{text-align:center;font-size:30pt}h2{font-size:15pt;color:#14345c;border-bottom:1.5pt solid #222}.cover{text-align:center}.art-head{font-weight:bold}.art-num{color:#14345c}table{border-collapse:collapse;width:100%}th,td{border:1px solid #444;padding:3pt 6pt}th{background:#e9edf3}img{max-width:420pt}#toc a{color:#000;text-decoration:none}</style></head><body>'+m.innerHTML+'</body></html>';
  dl('VRT_Factory_Rules_2027_'+l+'_'+stamp()+'.doc',new Blob(['﻿'+html],{type:'application/msword'}));toast('⬇ Word')}
function impFile(){pick('.json,.html,.htm',false,function(fs){var f=fs[0];if(!f)return;var fr=new FileReader();fr.onload=function(){try{var d;
      if(/\.json$/i.test(f.name)){var j=JSON.parse(fr.result);d=j.data||j;if(!d||!Array.isArray(d.ch))throw new Error(T('不是廠規的 JSON 檔','Not a factory-rules JSON file'))}
      else{var doc=new DOMParser().parseFromString(String(fr.result),'text/html');if(!$('section.chapter',doc)||!$('.article',doc))throw new Error(T('這個 HTML 不是廠規格式（找不到章／條）','This HTML is not in the factory-rules format'));var keep=DATA;d=snap(doc);d.files=(keep&&keep.files)||[];d.log=(keep&&keep.log)||[]}
      var n=count(d);if(!confirm(T('匯入「','Import "')+f.name+T('」：','": ')+n.ch+T(' 章 ',' chapters ')+n.art+T(' 條 ',' articles ')+n.cl+T(' 款。\n會取代目前內容（可用「復原」退回）。確定？',' clauses.\nThis replaces the current content (Undo is available). Continue?')))return;
      pushUndo();apply(d);setDirty(true);if(!EDIT)setEdit(true);toast('⬆ '+T('已匯入，檢查後按儲存','Imported — review and save'))}catch(err){toast('⚠ '+(err.message||err),1)}};fr.readAsText(f)})}

/* ---------- 附件（上傳 Google Drive）---------- */
function drawFiles(){var box=$('#edFiles');if(!box)return;var fs=(DATA&&DATA.files)||[];
  box.innerHTML='<h2 class="chapter-head">'+tri('附件','Attachments','ឯកសារភ្ជាប់')+' <small style="font-weight:400;font-size:13px;color:#555">'+fs.length+'</small></h2>'+(fs.length?'<ul class="ed-fl">'+fs.map(function(f){return '<li>📎 <a href="'+esc(f.url||'#')+'" target="_blank" rel="noopener">'+esc(f.name||f.originalName||'file')+'</a> <small>'+esc(f.at||'')+' · '+esc(f.by||'')+'</small> <button type="button" class="eb bad" data-fdel="'+esc(f.id)+'">🗑</button></li>'}).join('')+'</ul>':'<p class="note">'+tri('還沒有附件。核簽掃描檔、勞動部回函、舊版廠規都可以放這裡。','No attachments yet. Scans of the visa, ministry replies or older editions can be kept here.','មិនទាន់មានឯកសារភ្ជាប់')+'</p>')+'<button type="button" class="eb" id="edUp">⬆ '+T('上傳附件','Upload attachment')+'</button> <a class="eb" style="text-decoration:none" href="VRT_Factory_Rules_v2.html" target="_blank" rel="noopener">📜 '+T('2026 年版（存檔）','2026 edition (archive)')+'</a>'}
function readURL(f){return new Promise(function(res,rej){var fr=new FileReader();fr.onload=function(){res(fr.result)};fr.onerror=rej;fr.readAsDataURL(f)})}
function upFiles(){pick('',true,function(fs){if(!fs.length)return;if(!window.ACAuto)return toast('⚠ offline',1);toast('☁ '+T('上傳到 Google Drive…','Uploading to Google Drive…'));
    var chain=Promise.resolve(),added=0;fs.forEach(function(f){chain=chain.then(function(){var sig=[f.name,f.size,f.lastModified||0].join('|');return readURL(f).then(function(u){return ACAuto.post({action:'uploadAttachment',module:'factory_rules',recordId:'rules2027',name:f.name,originalName:f.name,mime:f.type||'application/octet-stream',size:f.size,lastModified:f.lastModified||0,signature:sig,dataUrl:u})}).then(function(j){if(!j||!j.ok)throw new Error((j&&(j.msg||j.error))||'upload failed');var x=j.file||{};
          var d=DATA||snap();d.files=(d.files||[]).concat([{id:uid('F'),name:f.name,url:x.url||x.viewUrl||x.webViewLink||(x.driveId?'https://drive.google.com/file/d/'+x.driveId+'/view':''),driveId:x.driveId||'',size:f.size,at:nowStr(),by:who(true)}]);DATA=d;added++})})});
    chain.then(function(){persistFiles();toast('📎 '+T('附件已上傳 ','Uploaded ')+added)}).catch(function(e){if(added)persistFiles();toast('⚠ '+T('上傳失敗：','Upload failed: ')+(e.message||e),1)})})}
function persistFiles(){var d=read()||DATA||snap();d.files=DATA.files;d.updatedAt=Date.now();if(!d.by)d.by=who();try{localStorage.setItem(KEY,JSON.stringify(d))}catch(e){}if(!EDIT||!DIRTY)DATA=d;drawFiles();if(window.ACAuto)ACAuto.touch()}

/* ---------- 摘要／紀錄 ---------- */
function summaryText(){var d=cur(),n=count(d),last=(d.log||[]).slice(-1)[0],ph=0;(d.ch||[]).forEach(function(c){c.arts.forEach(function(a){a.cl.forEach(function(x){if(x.k==='p')ph++})})});
  var r=diff(SEED,d);
  return '📕 <b>廠規 2027 更新 Factory Rules 2027</b>\n━━━━━━━━━━━━━━━━━━━━\n📚 '+n.ch+' 章 ｜ '+n.art+' 條 ｜ '+n.cl+' 款'+(ph?' ｜ 📷 '+ph:'')+((d.files||[]).length?' ｜ 📎 '+d.files.length:'')+'\n✏️ 與 v5 原版比：'+esc(diffText(r))+'\n'+(last?'🕘 最近修改：'+esc(last.at)+' · '+esc(last.by)+'\n📝 '+esc(last.what)+'\n'+((last.arts||[]).length?last.arts.slice(0,6).map(function(x){return '　• '+esc(x)}).join('\n')+'\n':''):'🕘 尚無修改，內容＝2027 v5 原版\n')+'━━━━━━━━━━━━━━━━━━━━\n🔗 '+PAGE}
function sendSummary(){if(DIRTY&&!save())return;var msg=summaryText();modal('<h3>📣 '+T('發 Telegram 摘要','Send Telegram summary')+'</h3><pre class="ed-pre">'+esc(msg.replace(/<\/?b>/g,''))+'</pre><div class="ed-row"><button type="button" class="eb hot" id="edSend">'+T('確定發送','Send')+'</button><button type="button" class="eb" data-close>'+T('取消','Cancel')+'</button></div>');
  $('#edSend').onclick=function(){this.disabled=true;ACAuto.post({action:'tg',text:msg}).then(function(j){if(!j||(!j.ok&&j.status!=='ok'))throw new Error((j&&(j.msg||j.error))||'Telegram failed');closeModal();toast('📣 '+T('摘要已發送','Summary sent'))}).catch(function(e){toast('⚠ '+(e.message||e),1);closeModal()})}}
function showLog(){var d=cur(),lg=(d.log||[]).slice().reverse();modal('<h3>🕘 '+T('修改紀錄','Change log')+'</h3>'+(lg.length?'<div class="ed-log">'+lg.map(function(x){return '<div><b>'+esc(x.at)+'</b> · '+esc(x.by)+'<br>'+esc(x.what)+((x.arts||[]).length?'<br><small>'+x.arts.map(esc).join('、')+'</small>':'')+'</div>'}).join('')+'</div>':'<p>'+T('還沒有修改，內容就是 2027 v5 原版。','No changes yet — this is the original 2027 v5.')+'</p>')+'<div class="ed-row"><button type="button" class="eb bad" id="edReset">'+T('還原成 2027 v5 原版','Restore original 2027 v5')+'</button><button type="button" class="eb" data-close>'+T('關閉','Close')+'</button></div>');
  $('#edReset').onclick=function(){if(!confirm(T('把條文還原成 2027 v5 原版？（附件與紀錄保留，其他裝置也會跟著還原）','Restore the text to the original 2027 v5? (attachments and log are kept; other devices follow)')))return;var keep=DATA||{};var d=JSON.parse(JSON.stringify(SEED));d.files=keep.files||[];d.log=keep.log||[];closeModal();pushUndo();var was=EDIT;apply(d);EDIT=was;setDirty(true);save()}}
function modal(h){var m=$('#edModal');if(!m){m=document.createElement('div');m.id='edModal';m.className='noprint';document.body.appendChild(m);m.addEventListener('click',function(e){if(e.target===m||e.target.closest('[data-close]'))closeModal()})}m.innerHTML='<div class="ed-box">'+h+'</div>';m.classList.add('show')}
function closeModal(){var m=$('#edModal');if(m)m.classList.remove('show')}

/* ---------- 介面 ---------- */
var CSS='.ed-bar{display:flex;gap:6px;flex-wrap:wrap;align-items:center;width:100%;padding-top:6px;border-top:1px solid rgba(255,255,255,.25);margin-top:2px}.ed-bar button{font-size:13px;padding:5px 10px}.ed-bar button.hot,.eb.hot{background:#f59e0b!important;color:#1a1a1a!important;border-color:#f59e0b!important;font-weight:700}.ed-bar button:disabled{opacity:.45;cursor:default}'
+'.editing .l[contenteditable]{outline:1px dashed rgba(20,52,92,.35);outline-offset:1px;border-radius:2px;min-width:1.5em;display:inline-block;min-height:1.2em}.editing li.clause>.l[contenteditable],.editing .preface p>.l[contenteditable]{display:block}.editing .l[contenteditable]:focus{outline:2px solid #f59e0b;background:#fffbeb}.editing .l[contenteditable]:empty::before{content:"…";color:#aaa}'
+'body.tri .l.zh,body.tri .l.en,body.tri .l.km{display:block!important;margin:2px 0}body.tri span.l::before{font:700 10px system-ui;color:#fff;background:#14345c;border-radius:3px;padding:0 4px;margin-right:4px;vertical-align:2px}body.tri span.l.zh::before{content:"中"}body.tri span.l.en::before{content:"EN"}body.tri span.l.km::before{content:"ខ្មែរ"}body.tri .art-num .l{display:inline!important}body.tri .art-num .l::before{display:none}body.tri .art-num .l.en,body.tri .art-num .l.km{display:none!important}body.tri #toc .l,body.tri #calc .l,body.tri .topbar .l{display:none!important}body.tri[data-lang=zh] #toc .l.zh,body.tri[data-lang=en] #toc .l.en,body.tri[data-lang=km] #toc .l.km,body.tri[data-lang=zh] #calc .l.zh,body.tri[data-lang=en] #calc .l.en,body.tri[data-lang=km] #calc .l.km,body.tri[data-lang=zh] .topbar .l.zh,body.tri[data-lang=en] .topbar .l.en,body.tri[data-lang=km] .topbar .l.km{display:inline!important}body.tri #toc .l::before,body.tri #calc .l::before,body.tri .topbar .l::before{display:none}'
+'.ed-tools{display:inline-flex;gap:3px;margin-left:8px;vertical-align:middle;font-size:12px;font-weight:400;user-select:none}.eb{font:600 12px system-ui,-apple-system,"Noto Sans TC",sans-serif;background:#fff;color:#14345c;border:1px solid #14345c;border-radius:4px;padding:3px 8px;cursor:pointer;line-height:1.3}.eb:hover{background:#eef2f7}.eb.bad{color:#b91c1c;border-color:#b91c1c}.ed-add{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 10px 2em}.ed-add.big{margin:14px 0 4px;padding-top:10px;border-top:1px dashed #9aa7b8}.ed-tbl{display:flex;gap:4px;margin:0 0 4px}'
+'.clause-photo{list-style:none;margin-left:-2em}.doc-photo{margin:10px 0;text-align:center}.doc-photo img{max-width:100%;max-height:520px;border:1px solid #bbb}.doc-photo figcaption{font-size:13.5px;color:var(--muted);margin-top:4px}'
+'#edFiles{margin-top:24px}.ed-fl{list-style:none;padding:0;margin:0 0 10px}.ed-fl li{padding:5px 0;border-bottom:1px solid #e5e5e5;font-size:14.5px;word-break:break-all}.ed-fl small{color:#666}'
+'#edToast{position:fixed;left:50%;bottom:44px;transform:translateX(-50%) translateY(20px);background:#14345c;color:#fff;padding:9px 16px;border-radius:8px;font:600 13.5px system-ui,"Noto Sans TC",sans-serif;z-index:9995;opacity:0;pointer-events:none;transition:.25s;max-width:92vw;text-align:center}#edToast.show{opacity:1;transform:translateX(-50%)}#edToast.bad{background:#b91c1c}'
+'#edModal{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9994;display:none;align-items:center;justify-content:center;padding:14px}#edModal.show{display:flex}.ed-box{background:#fff;border-radius:10px;max-width:560px;width:100%;max-height:86vh;overflow:auto;padding:16px 18px;font-family:system-ui,-apple-system,"Noto Sans TC","Noto Sans Khmer",sans-serif;font-size:14px}.ed-box h3{margin:0 0 10px;color:#14345c}.ed-pre{white-space:pre-wrap;word-break:break-word;background:#f4f4f1;border-radius:6px;padding:10px;font:13px/1.6 system-ui,"Noto Sans TC",sans-serif;max-height:46vh;overflow:auto}.ed-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.ed-row .eb{padding:7px 14px;font-size:13.5px}.ed-log>div{padding:8px 0;border-bottom:1px solid #eee;line-height:1.55}.ed-menu{position:relative;display:inline-block}.ed-menu>div{position:absolute;top:100%;left:0;background:#fff;border-radius:6px;box-shadow:0 6px 20px rgba(0,0,0,.25);padding:4px;display:none;z-index:20;min-width:150px}.ed-menu.open>div{display:block}.ed-menu>div button{display:block;width:100%;text-align:left;background:#fff!important;color:#14345c!important;border:0!important;padding:8px 10px!important;font-size:13.5px!important}.ed-menu>div button:hover{background:#eef2f7!important}'
+'@media(max-width:700px){.ed-tools{margin-left:4px}.ed-add{margin-left:0}.topbar{padding:6px 8px}.ed-bar button{padding:5px 8px;font-size:12.5px}}@media print{.ed-tools,.ed-add,.ed-tbl,#edFiles{display:none!important}}';
function ui(){var st=document.createElement('style');st.id='edCss';st.textContent=CSS;document.head.appendChild(st);
  var bar=document.createElement('div');bar.className='ed-bar';
  bar.innerHTML='<button type="button" id="edToggle"></button>'
   +'<button type="button" id="edSave" class="ed-only" disabled>💾 '+tri('儲存','Save','រក្សាទុក')+'</button>'
   +'<button type="button" id="edUndo" class="ed-only" disabled>↩ '+tri('復原','Undo','ត្រឡប់')+'</button>'
   +'<button type="button" id="edTri" class="ed-only">🌐 '+tri('三語並排','3 languages','៣ ភាសា')+'</button>'
   +'<span class="ed-menu" id="edExp"><button type="button">⬇ '+tri('匯出','Export','នាំចេញ')+' ▾</button><div><button type="button" data-x="json">JSON（'+T('備份／再匯入','backup / re-import')+'）</button><button type="button" data-x="html">HTML（'+T('三語單檔','3-language file')+'）</button><button type="button" data-x="word">Word（'+T('目前語言','current language')+'）</button><button type="button" data-x="pdf">PDF（'+T('列印','print')+'）</button></div></span>'
   +'<button type="button" id="edImp">⬆ '+tri('匯入','Import','នាំចូល')+'</button>'
   +'<button type="button" id="edSum">📣 '+tri('摘要','Summary','សង្ខេប')+'</button>'
   +'<button type="button" id="edLog">🕘 '+tri('紀錄','Log','កំណត់ហេតុ')+'</button>';
  $('.topbar').appendChild(bar);
  var fsec=document.createElement('section');fsec.id='edFiles';fsec.className='noprint';var calc=$('#calc');calc.parentNode.insertBefore(fsec,calc);
  $('#edToggle').onclick=function(){setEdit(!EDIT)};$('#edSave').onclick=function(){save()};$('#edUndo').onclick=undo;
  $('#edTri').onclick=function(){document.body.classList.toggle('tri');this.classList.toggle('on',document.body.classList.contains('tri'))};
  $('#edExp').firstElementChild.onclick=function(e){e.stopPropagation();$('#edExp').classList.toggle('open')};document.addEventListener('click',function(){$('#edExp').classList.remove('open')});
  $('#edExp').addEventListener('click',function(e){var x=e.target.closest('[data-x]');if(!x)return;({json:expJSON,html:expHTML,word:expWord,pdf:function(){window.print()}})[x.dataset.x]()});
  $('#edImp').onclick=impFile;$('#edSum').onclick=sendSummary;$('#edLog').onclick=showLog;
  $('main.doc').addEventListener('click',onAct,true);
  $('main.doc').addEventListener('input',function(e){if(EDIT&&e.target.closest&&e.target.closest('[contenteditable]'))setDirty(true)});
  $('main.doc').addEventListener('paste',function(e){if(!EDIT)return;var t=(e.clipboardData||window.clipboardData).getData('text/plain');if(t==null)return;e.preventDefault();document.execCommand('insertText',false,t)});
  $('main.doc').addEventListener('keydown',function(e){if(EDIT&&e.key==='Enter'&&!e.shiftKey&&e.target.closest&&e.target.closest('[contenteditable]')){e.preventDefault();document.execCommand('insertLineBreak')}});
  document.addEventListener('click',function(e){var d=e.target.closest('[data-fdel]');if(d){if(!confirm(T('從清單移除這個附件？（Drive 上的原檔不會刪）','Remove this attachment from the list? (the Drive file is kept)')))return;DATA.files=(DATA.files||[]).filter(function(f){return f.id!==d.dataset.fdel});persistFiles()}else if(e.target.id==='edUp')upFiles()});
  window.addEventListener('beforeunload',function(e){if(DIRTY){e.preventDefault();e.returnValue=''}});
  document.addEventListener('keydown',function(e){if((e.ctrlKey||e.metaKey)&&e.key==='s'&&EDIT){e.preventDefault();save()}});
  setEdit(false)}
function boot(){seedIds(document);SEED=snap();SEED.files=[];SEED.log=[];ui();load();
  if(window.ACAuto)ACAuto.init({keys:[KEY],by:'rules2027',editing:function(){return EDIT&&DIRTY},onPull:function(){if(EDIT&&DIRTY)return;load();if(EDIT)decorate();toast('☁ '+T('已載入雲端最新版本','Loaded the latest version from cloud'))}});
  window.RULES27={snap:snap,apply:apply,save:save,diff:diff,seed:function(){return SEED},data:function(){return DATA},setEdit:setEdit,summaryText:summaryText,count:count}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
