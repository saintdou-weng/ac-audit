/* 培訓記錄「智慧匯入」（2026-11-27）
   Paul：以後生產或人資培訓只要把 PPT／PDF／Word／照片匯進去，平台自己分類、對到月份和課程、放照片，不用每次來要求。
   · 上課紀錄 PDF（封面有 Topic、Date）→ 讀課程名稱與日期，第 2 頁以後（活動照、簽到表）轉成照片，附到同月份同課程那一筆；沒有這筆就新增一筆（人數待補）。
   · 照片 → 依檔名日期／課程對到記錄（可在預覽改）。
   · PPT／Word／其他 PDF（教材）→ 整個檔附到那筆記錄。
   · ZIP → 自動解開逐一處理。
   · Excel／CSV（月報、排程表）→ 交給原本的「匯入」：會帶進講師、時數、人數。
   全部先預覽、確認後才寫入；照片和檔案存 Google Drive（跟「📷 證據」同一個地方）。人資、生產兩頁共用。 */
(function(){
'use strict';
var MOD=/prod_training/.test(location.pathname)?'prod_training':'training';
var PDFJS='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',PDFW='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',JSZ='https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
var MON={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
var STOP=/^(training|traning|trainig|course|procedure|content|record|records|instruction|the|of|and|on|for|to|in|by|vrt|pdf|jpg|png|docx|pptx|report|2\d{3}|\d{1,2})$/i;
var ITEMS=[];
function E(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function load(src){return new Promise(function(res,rej){if(document.querySelector('script[src="'+src+'"]'))return res();var s=document.createElement('script');s.src=src;s.onload=res;s.onerror=function(){rej(new Error('載入失敗 '+src))};document.head.appendChild(s)})}
async function pdfjs(){if(!window.pdfjsLib){await load(PDFJS)}window.pdfjsLib.GlobalWorkerOptions.workerSrc=PDFW;return window.pdfjsLib}
async function jszip(){if(!window.JSZip)await load(JSZ);return window.JSZip}
function norm(t){return String(t||'').replace(/\s+/g,' ').replace(/(\d) (?=\d)/g,'$1').trim()}
function pad(n){return String(n).padStart(2,'0')}
function curMonth(){var y=(typeof VY==='function'?VY():new Date().getFullYear());return y+'-'+pad((window.S&&S.month)||new Date().getMonth()+1)}
function findDate(t){t=norm(t);var m=t.match(/(\d{1,2})(?:st|nd|rd|th)?[\s\-\/.]*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\-\/.,]*(20\d\d)/i);if(m)return m[3]+'-'+pad(MON[m[2].slice(0,3).toLowerCase()])+'-'+pad(m[1]);
  m=t.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\-\/.]*(\d{1,2})[\s,]+(20\d\d)/i);if(m)return m[3]+'-'+pad(MON[m[1].slice(0,3).toLowerCase()])+'-'+pad(m[2]);
  m=t.match(/(20\d\d)[\-\/._]?(\d{2})[\-\/._]?(\d{2})/);if(m&&+m[2]>=1&&+m[2]<=12)return m[1]+'-'+m[2]+'-'+m[3];
  m=t.match(/(\d{1,2})\/(\d{1,2})\/(20\d\d)/);if(m)return m[3]+'-'+pad(m[2])+'-'+pad(m[1]);
  m=t.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\-_]*(20\d\d)/i);if(m)return m[2]+'-'+pad(MON[m[1].slice(0,3).toLowerCase()])+'-';
  return ''}
function cleanName(n){return String(n||'').replace(/\.[a-z0-9]+$/i,'').replace(/^\d{8}_\d{6}_/,'').replace(/[_]+/g,' ').replace(/\s+/g,' ').trim()}
/* 同一堂課在月報、排程表常寫法不同：Material Training＝廠規（Factory internal regulations）、TB＝傳染病… */
var SYN={material:'regulation',regulations:'regulation',tuberculosis:'infectious',tb:'infectious',pregnant:'pregnancy',pregnancy:'pregnancy',salary:'salary',benefit:'salary',payroll:'salary',detector:'detector',metal:'detector',mechanic:'mechanic',machanic:'mechanic',machine:'mechanic',snap:'snap',button:'snap',inline:'roving',defect:'roving'};
function toks(s){var a=String(s||'').toLowerCase().replace(/[^a-z0-9一-鿿]+/g,' ').split(' ').filter(function(w){return w&&w.length>1&&!STOP.test(w)});var o=[];a.forEach(function(w){if(SYN[w])o.push(SYN[w]);if(w.length>2)o.push(w.replace(/(ing|s)$/,''))});return o}
function tokEq(x,w){return x===w||x.slice(0,5)===w.slice(0,5)&&Math.min(x.length,w.length)>=5||x.indexOf(w)===0||w.indexOf(x)===0}
function shift(ym,d){var y=+ym.slice(0,4),m=+ym.slice(5,7)+d;while(m<1){m+=12;y--}while(m>12){m-=12;y++}return y+'-'+pad(m)}
function match(topic,date){var ym=(date&&date.length>=7)?date.slice(0,7):curMonth(),tt=toks(topic),best=null,bs=0;
  [0,-1,1].forEach(function(d,di){var k=shift(ym,d);((S.records||{})[k]||[]).forEach(function(r){var rt=toks(r.subject),sc=0;tt.forEach(function(w){if(rt.some(function(x){return tokEq(x,w)}))sc+=10});if(!sc)return;if(date&&r.date===date)sc+=6;sc-=di*3;if(sc>bs){bs=sc;best={m:k,id:r.id}}})});
  if(bs<10&&/^\d{4}-\d{2}-\d{2}$/.test(date||'')){var same=((S.records||{})[date.slice(0,7)]||[]).filter(function(r){return r.date===date});if(same.length===1)return {m:date.slice(0,7),id:same[0].id}}
  return bs>=10?best:null}
function pageTopic(lines){var t=lines.join('\n'),m=t.match(/(?:Training(?:\s*content)?|Topic|Subject|Course)\s*:\s*([^\n]{4,})/i);if(m&&!/^\s*\d/.test(m[1]))return m[1].replace(/\s+(Date|Time)\s*:.*$/i,'').trim();
  for(var i=0;i<lines.length;i++){var l=lines[i].trim();if(/^:/.test(l)&&!/\d/.test(l)&&l.length>4)return l.slice(1).trim()}return ''}
async function pageLines(doc,p){var pg=await doc.getPage(p),tc=await pg.getTextContent(),lines=[],cur='',lastY=null,lastX=null;
  tc.items.forEach(function(it){var y=Math.round(it.transform[5]),x=it.transform[4],fs=Math.abs(it.transform[0])||8;if(lastY!==null&&Math.abs(y-lastY)>3){lines.push(norm(cur));cur='';lastX=null}if(lastX!==null&&x-lastX>fs*0.28&&!/\s$/.test(cur))cur+=' ';cur+=it.str;lastX=x+(it.width||0);lastY=y});lines.push(norm(cur));return lines.filter(Boolean)}
/* 照片的拍攝日期（EXIF）：手機、相機原檔都有；Telegram／LINE 轉傳過的會被拿掉，就改看檔名 */
async function exifDate(file){try{var b=new DataView(await file.slice(0,262144).arrayBuffer());if(b.getUint16(0)!==0xFFD8)return '';var o=2;
  while(o<b.byteLength-4){var mk=b.getUint16(o),ln=b.getUint16(o+2);if(mk===0xFFE1&&b.getUint32(o+4)===0x45786966){var t=o+10,le=b.getUint16(t)===0x4949;var g16=function(x){return b.getUint16(x,le)},g32=function(x){return b.getUint32(x,le)};
    var rd=function(ifd,tag){var n=g16(t+ifd);for(var i=0;i<n;i++){var e=t+ifd+2+i*12;if(g16(e)===tag)return e}return 0};var str=function(e){var off=t+g32(e+8),s='';for(var i=0;i<19;i++)s+=String.fromCharCode(b.getUint8(off+i));return s};
    var i0=g32(t+4),ex=rd(i0,0x8769),d='';if(ex){var e2=rd(g32(ex+8),0x9003);if(e2)d=str(e2)}if(!d){var e3=rd(i0,0x0132);if(e3)d=str(e3)}
    var m=d.match(/^(\d{4}):(\d{2}):(\d{2})/);return m&&m[1]>'2000'?m[1]+'-'+m[2]+'-'+m[3]:''}if((mk&0xFF00)!==0xFF00)break;o+=2+ln}}catch(e){}return ''}
/* 一份 PDF 裡有好幾堂課（每頁一堂、各有日期，例如人資月報）→ 一頁一筆；沒有字的頁（掃描簽到表）跟著前一堂 */
async function pdfMulti(file,doc,n){var out=[],last=null;for(var p=1;p<=n;p++){var L=await pageLines(doc,p),t=L.join('\n'),d=findDate(t),tp=pageTopic(L);
    if(d&&d.length===10){last={file:file,kind:'record',topic:tp||cleanName(file.name),date:d,images:[],note:'第 '+p+' 頁'};out.push(last)}
    if(last)last.images.push(await pageJpeg(doc,p,file.name,p))}return out}
/* PPT：一張投影片一堂課（有日期的那張開始），投影片裡的照片附到那堂；沒日期的投影片照片跟著前一堂 */
async function pptxItems(file){var Z=await jszip(),z=await Z.loadAsync(await file.arrayBuffer()),out=[],last=null;
  var names=Object.keys(z.files).filter(function(k){return /^ppt\/slides\/slide\d+\.xml$/.test(k)}).sort(function(a,b){return (+a.match(/(\d+)\.xml/)[1])-(+b.match(/(\d+)\.xml/)[1])});
  for(var i=0;i<names.length;i++){var x=await z.file(names[i]).async('string');var paras=x.split(/<\/a:p>/).map(function(pp){return (pp.match(/<a:t>([^<]*)<\/a:t>/g)||[]).map(function(q){return q.replace(/<\/?a:t>/g,'')}).join('')}).map(norm).filter(Boolean);
    var t=paras.join('\n'),d=findDate(t),tp=pageTopic(paras);
    if(d&&d.length===10){last={file:file,kind:'record',topic:tp||paras[0]||cleanName(file.name),date:d,images:[],note:'第 '+(i+1)+' 張投影片'};out.push(last)}
    var rel=z.file(names[i].replace('slides/','slides/_rels/')+'.rels');if(!rel)continue;var rx=await rel.async('string'),re=/Target="\.\.\/media\/([^"]+\.(?:jpe?g|png))"/gi,mm,seen={};
    while((mm=re.exec(rx))){var mf=z.file('ppt/media/'+mm[1]);if(!mf||seen[mm[1]])continue;seen[mm[1]]=1;var bl=await mf.async('blob');if(bl.size<40000)continue;
      if(!last){last={file:file,kind:'record',topic:cleanName(file.name),date:findDate(file.name),images:[],note:'PPT'};out.push(last)}
      last.images.push(new File([bl],cleanName(file.name)+'_s'+(i+1)+'_'+mm[1],{type:/png$/i.test(mm[1])?'image/png':'image/jpeg',lastModified:Date.now()}))}}
  if(!out.length)out.push({file:file,kind:'doc',topic:(await officeTitle(file))||cleanName(file.name),date:findDate(file.name),images:[]});return out}
async function pdfItem(file){var lib=await pdfjs(),buf=await file.arrayBuffer(),doc=await lib.getDocument({data:buf}).promise,n=doc.numPages;
  var p1=await doc.getPage(1),tc=await p1.getTextContent(),lines=[],cur='',lastY=null;
  var lastX=null;tc.items.forEach(function(it){var y=Math.round(it.transform[5]),x=it.transform[4],fs=Math.abs(it.transform[0])||8;if(lastY!==null&&Math.abs(y-lastY)>3){lines.push(norm(cur));cur='';lastX=null}if(lastX!==null&&x-lastX>fs*0.28&&!/\s$/.test(cur))cur+=' ';cur+=it.str;lastX=x+(it.width||0);lastY=y});lines.push(norm(cur));lines=lines.filter(Boolean);
  var text=lines.join('\n'),isRecord=/training\s*record/i.test(text)||(n<=4&&!text.replace(/\s/g,'').length);
  var date=findDate(text)||findDate(file.name),topic='';
  var ti=lines.findIndex(function(l){return /^topic/i.test(l)});var eng=lines.slice(ti>=0?ti+1:0).filter(function(l){return /[A-Za-z]{4,}/.test(l)&&!/^(date|vantage|vrt training|topic)/i.test(l)&&!/[ក-៿]/.test(l)}).map(function(l){return l.replace(/^\d+[.)]\s*/,'').trim()}).filter(Boolean);
  topic=eng.slice(0,2).join(' / ')||cleanName(file.name);
  if(!isRecord&&n>1){var multi=await pdfMulti(file,doc,n);var ds={};multi.forEach(function(m){ds[m.date+m.topic]=1});if(Object.keys(ds).length>=2)return multi}
  var it={file:file,kind:isRecord?'record':'doc',topic:topic,date:date,images:[],pages:n};
  if(isRecord){for(var p=2;p<=Math.min(n,6);p++){it.images.push(await pageJpeg(doc,p,file.name,p))}}
  return it}
async function pageJpeg(doc,p,name,idx){var pg=await doc.getPage(p),v=pg.getViewport({scale:1}),sc=Math.min(2,1400/Math.max(v.width,v.height)),vp=pg.getViewport({scale:sc});
  var c=document.createElement('canvas');c.width=vp.width;c.height=vp.height;await pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;
  var b=await new Promise(function(r){c.toBlob(r,'image/jpeg',0.78)});return new File([b],cleanName(name)+'_p'+idx+'.jpg',{type:'image/jpeg',lastModified:Date.now()})}
async function officeTitle(file){try{var Z=await jszip(),z=await Z.loadAsync(await file.arrayBuffer());var core=z.file('docProps/core.xml');var t='';if(core){var x=await core.async('string');var m=x.match(/<dc:title>([^<]+)<\/dc:title>/);if(m)t=m[1]}
  if(!t){var s=z.file('ppt/slides/slide1.xml')||z.file('word/document.xml');if(s){var y=await s.async('string');t=(y.match(/<a:t>([^<]+)<\/a:t>|<w:t[^>]*>([^<]+)<\/w:t>/)||[])[1]||''}}return t}catch(e){return ''}}
async function analyse(files){var out=[],xl=[];
  for(var i=0;i<files.length;i++){var f=files[i],n=f.name.toLowerCase();
    try{if(/\.zip$/.test(n)){var Z=await jszip(),z=await Z.loadAsync(await f.arrayBuffer());var inner=[];for(var k in z.files){var e=z.files[k];if(e.dir||/__MACOSX|\/\./.test(k))continue;var b=await e.async('blob');inner.push(new File([b],k.split('/').pop(),{type:b.type,lastModified:f.lastModified}))}var sub=await analyse(inner);out=out.concat(sub.items);xl=xl.concat(sub.xl);continue}
      if(/\.(xlsx|xls|csv)$/.test(n)){xl.push(f);continue}
      if(/\.rar$/.test(n)){out.push({file:f,kind:'skip',topic:cleanName(f.name),date:'',images:[],note:'RAR 瀏覽器打不開，請先解壓或改成 ZIP'});continue}
      if(/\.pdf$/.test(n)){out=out.concat(await pdfItem(f));continue}
      if(/\.(jpe?g|png|webp|heic)$/.test(n)){var ed=findDate(f.name)||await exifDate(f);out.push({file:f,kind:'photo',topic:cleanName(f.name),date:ed,images:[f],note:ed?'':'照片沒有日期，請填'});continue}
      if(/\.pptx$/.test(n)){out=out.concat(await pptxItems(f));continue}
      if(/\.(pptx|docx|ppt|doc)$/.test(n)){var t=/\.(pptx|docx)$/.test(n)?await officeTitle(f):'';out.push({file:f,kind:'doc',topic:t||cleanName(f.name),date:findDate(f.name)||findDate(t)||'',images:[]});continue}
      out.push({file:f,kind:'doc',topic:cleanName(f.name),date:findDate(f.name)||'',images:[]})}
    catch(e){out.push({file:f,kind:'skip',topic:cleanName(f.name),date:'',images:[],note:'讀不到：'+(e.message||e)})}}
  return {items:out,xl:xl}}
function recOpts(it){var ym=(it.date&&it.date.length>=7)?it.date.slice(0,7):curMonth(),o='<option value="new">＋ 新增一筆（'+E(ym)+'）</option>';
  [-1,0,1].forEach(function(d){var k=shift(ym,d);((S.records||{})[k]||[]).forEach(function(r){var v=k+'|'+r.id;o+='<option value="'+E(v)+'"'+(it.target===v?' selected':'')+'>'+E(k+' · '+(r.date||'')+' · '+r.subject)+'</option>'})});
  return o+'<option value="skip">✕ 不匯入</option>'}
function modal(html){var el=document.getElementById('trSI');if(!el){el=document.createElement('div');el.id='trSI';el.style.cssText='position:fixed;inset:0;z-index:99990;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:10px';document.body.appendChild(el);el.addEventListener('click',function(e){if(e.target===el&&!el.dataset.busy)el.remove()})}
  el.innerHTML='<div style="background:#fff;color:#1e293b;width:100%;max-width:880px;max-height:92vh;overflow:auto;border-radius:16px;padding:16px;font-size:14px;line-height:1.5">'+html+'</div>';return el}
var KIND={record:'📋 上課紀錄／投影片',photo:'📷 照片',doc:'📎 教材／文件',skip:'⚠️ 略過'};
function drawPreview(){var rows=ITEMS.map(function(it,i){return '<tr style="border-top:1px solid #e2e8f0"><td style="padding:6px 4px">'+KIND[it.kind]+'<br><small style="color:#64748b">'+E(it.file.name)+'</small>'+(it.note?'<br><small style="color:#b45309">'+E(it.note)+'</small>':'')+'</td>'+
  '<td style="padding:6px 4px"><input data-t="'+i+'" value="'+E(it.topic)+'" style="width:100%;border:1px solid #cbd5e1;border-radius:6px;padding:4px"><input data-d="'+i+'" value="'+E(it.date)+'" placeholder="YYYY-MM-DD" style="width:120px;margin-top:4px;border:1px solid #cbd5e1;border-radius:6px;padding:4px"></td>'+
  '<td style="padding:6px 4px;text-align:center">'+(it.images.length?'📷 '+it.images.length:'')+(it.kind==='doc'?'📎 1':'')+'</td>'+
  '<td style="padding:6px 4px">'+(it.kind==='skip'?'—':'<select data-g="'+i+'" style="width:100%;border:1px solid #cbd5e1;border-radius:6px;padding:4px">'+recOpts(it)+'</select>')+'</td></tr>'}).join('');
  var el=modal('<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><b style="font-size:17px">🧠 智慧匯入預覽</b><button id="siX" style="border:0;background:none;font-size:20px;cursor:pointer">✕</button></div>'+
   '<p style="color:#64748b;font-size:13px;margin:6px 0 10px">系統已自己讀出課程與日期、對到記錄；不對的直接改，或選「新增一筆」。人數要從 Excel 月報匯入（上課紀錄 PDF 裡的簽到表是手寫，會當照片附上）。</p>'+
   '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px"><tr style="color:#64748b;text-align:left"><th>檔案</th><th>課程／日期</th><th>照片</th><th>放到哪一筆</th></tr>'+rows+'</table></div>'+
   '<div id="siMsg" style="margin:10px 0;font-weight:700"></div><div style="display:flex;gap:8px"><button id="siCancel" class="btn">取消</button><button id="siGo" class="btn btn-p" style="flex:1">✅ 確認匯入（上傳照片與檔案）</button></div>');
  el.querySelector('#siX').onclick=el.querySelector('#siCancel').onclick=function(){el.remove()};
  el.querySelectorAll('[data-t]').forEach(function(x){x.oninput=function(){ITEMS[+x.dataset.t].topic=x.value}});
  el.querySelectorAll('[data-d]').forEach(function(x){x.onchange=function(){var it=ITEMS[+x.dataset.d];it.date=x.value.trim();var m=match(it.topic,it.date);it.target=m?m.m+'|'+m.id:'new';drawPreview()}});
  el.querySelectorAll('[data-g]').forEach(function(x){x.onchange=function(){ITEMS[+x.dataset.g].target=x.value}});
  el.querySelector('#siGo').onclick=commit}
async function upload(file,rec){var url=(getCfg().gasUrl||'').trim();if(!url)throw new Error('請先在設定填 GAS 網址');var sig=['si',file.name,file.size].join('|');rec.evidence=rec.evidence||[];if(rec.evidence.some(function(x){return x.signature===sig}))return 'dup';
  var dataUrl=await new Promise(function(res,rej){var r=new FileReader();r.onload=function(){res(r.result)};r.onerror=rej;r.readAsDataURL(file)});
  var res=await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'uploadAttachment',module:MOD,recordId:rec.id,name:file.name,originalName:file.name,mime:file.type||'application/octet-stream',size:file.size,lastModified:file.lastModified,signature:sig,dataUrl:dataUrl})});
  var j=await res.json();if(!j.ok)throw new Error(j.msg||j.error||'上傳失敗');var info=j.file||{};if(!info.signature)info.signature=sig;rec.evidence.push(info);return 'ok'}
async function commit(){var el=document.getElementById('trSI');el.dataset.busy='1';var go=el.querySelector('#siGo');go.disabled=true;var msg=el.querySelector('#siMsg'),ok=0,made=0,fail=[],tasks=[];
  ITEMS.forEach(function(it,i){if(it.kind==='skip'||it.target==='skip')return;var rec,key;
    if(!it.target||it.target==='new'){key=(it.date&&it.date.length>=7)?it.date.slice(0,7):curMonth();S.records[key]=S.records[key]||[];
      rec=S.records[key].find(function(r){return r.subject===it.topic&&(r.date||'')===(it.date||'')});
      if(!rec){rec={id:'r'+Date.now()+i,seq:S.records[key].length+1,subject:it.topic,dept:'',trainer:'',date:/\d{4}-\d{2}-\d{2}/.test(it.date)?it.date:'',time:'',duration:'',participant:'',attendees:0,absences:0,remarks:'智慧匯入（人數待補）',evidence:[]};S.records[key].push(rec);made++}}
    else{var p=it.target.split('|');key=p[0];rec=(S.records[key]||[]).find(function(r){return r.id===p[1]})}
    if(!rec)return;(it.images.length?it.images:[it.file]).forEach(function(f){tasks.push({f:f,rec:rec})})});
  var idx=0;async function worker(){while(idx<tasks.length){var t=tasks[idx++];try{var r=await upload(t.f,t.rec);if(r==='ok')ok++}catch(e){fail.push(t.f.name+'：'+e.message)}msg.textContent='上傳中 '+(ok+fail.length)+' / '+tasks.length+'…'}}
  await Promise.all([worker(),worker(),worker()]);
  try{save()}catch(e){}try{renderRecords();renderPills()}catch(e){}
  setTimeout(function(){try{if(window.TRAuto&&TRAuto.run)TRAuto.run('manual');else if(window.ACAuto){if(ACAuto.touch)ACAuto.touch();if(ACAuto.run)ACAuto.run()}}catch(e){}},800);
  delete el.dataset.busy;msg.innerHTML='<span style="color:#16a34a">✅ 完成：上傳 '+ok+' 個檔，新增 '+made+' 筆記錄</span>'+(fail.length?'<br><span style="color:#dc2626">失敗 '+fail.length+'：'+E(fail.slice(0,3).join('；'))+'</span>':'')+(made?'<br><span style="color:#b45309">新增的記錄人數是 0，請匯入 Excel 月報或手動補。</span>':'');
  go.textContent='關閉';go.disabled=false;go.onclick=function(){el.remove()}}
window.trSmartImport=function(){var el=modal('<div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:17px">🧠 智慧匯入</b><button id="siX" style="border:0;background:none;font-size:20px;cursor:pointer">✕</button></div>'+
  '<p style="color:#475569;font-size:13px">把上課紀錄 PDF、照片、PPT、Word、ZIP 一次丟進來：PDF／PPT 每頁讀出課程和日期（一頁一堂也行），照片看拍攝日期，簽到表跟著同一堂；系統對到那天那一筆，把照片附上去。Excel 月報會帶進講師、時數和人數。</p>'+
  '<label id="siDz" style="display:block;border:2px dashed #94a3b8;border-radius:14px;padding:26px;text-align:center;cursor:pointer;background:#f8fafc">📂 點這裡選檔，或把檔案拖進來<br><small style="color:#64748b">PDF・JPG/PNG・PPTX・DOCX・ZIP・XLSX/CSV（可以多選）</small><input id="siIn" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.pptx,.ppt,.docx,.doc,.zip,.rar,.xlsx,.xls,.csv" style="display:none"></label><div id="siMsg" style="margin-top:10px"></div>');
  el.querySelector('#siX').onclick=function(){el.remove()};var dz=el.querySelector('#siDz');
  dz.addEventListener('dragover',function(e){e.preventDefault();dz.style.background='#eef2ff'});dz.addEventListener('dragleave',function(){dz.style.background='#f8fafc'});
  dz.addEventListener('drop',function(e){e.preventDefault();run(e.dataTransfer.files)});el.querySelector('#siIn').onchange=function(e){run(e.target.files)};
  async function run(fl){var files=[].slice.call(fl||[]);if(!files.length)return;el.dataset.busy='1';el.querySelector('#siMsg').textContent='讀取中…（PDF 會轉成照片，檔案多會慢一點）';
    var r;try{r=await analyse(files)}catch(e){el.querySelector('#siMsg').textContent='讀取失敗：'+e.message;delete el.dataset.busy;return}delete el.dataset.busy;
    ITEMS=r.items;ITEMS.forEach(function(it){if(it.kind==='skip')return;var m=match(it.topic,it.date);it.target=m?m.m+'|'+m.id:'new'});
    ITEMS.forEach(function(it,i){if(it.kind!=='photo'||it.target!=='new')return;var ok=function(x){return x.kind!=='photo'&&x.kind!=='skip'&&x.date},ref=null;
      if(it.date)ref=ITEMS.find(function(x){return ok(x)&&x.date===it.date});else{for(var j=i-1;j>=0&&!ref;j--)if(ok(ITEMS[j]))ref=ITEMS[j];if(!ref)ref=ITEMS.find(ok)}
      if(ref){it.date=ref.date;it.topic=ref.topic;it.target=ref.target;it.note=''}else if(it.date){it.topic='培訓照片 '+it.date+'（請改課程名稱）'}});
    if(r.xl.length){if(!ITEMS.length){el.remove();openImport('monthly');handleImpFile({files:[r.xl[0]]});return}window._trSIxl=r.xl[0]}
    if(ITEMS.length)drawPreview();
    if(r.xl.length&&ITEMS.length){var m=document.getElementById('siMsg');if(m)m.innerHTML='📊 另有 Excel：'+E(r.xl[0].name)+' — 照片匯完後按 <button class="btn btn-sm" onclick="document.getElementById(\'trSI\').remove();openImport(\'monthly\');handleImpFile({files:[window._trSIxl]})">匯入 Excel</button>'}}};
})();
