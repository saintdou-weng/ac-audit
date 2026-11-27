/* 培訓記錄照片（2026-11-27）：月份記錄每一筆旁邊顯示照片縮圖（學 SEC 消防設備的做法），點一下全螢幕看、左右滑動換張。
   照片就是記錄裡的 evidence（Google Drive），人資培訓、生產培訓兩頁共用。 */
(function(){
'use strict';
var REG={};
function did(a){if(!a)return '';if(a.driveId)return a.driveId;var u=[a.fileId,a.id,a.url,a.webViewUrl,a.downloadUrl].filter(Boolean).join(' '),m=u.match(/\/d\/([-\w]{20,})|[?&]id=([-\w]{20,})/);return m?(m[1]||m[2]):(/^[-\w]{25,}$/.test(a.fileId||a.id||'')?(a.fileId||a.id):'')}
function isImg(a){return /image/i.test(a.mime||'')||/\.(jpe?g|png|webp|gif|heic)$/i.test(a.name||'')}
function src(a,w){var id=did(a);if(id)return 'https://drive.google.com/thumbnail?id='+id+'&sz=w'+(w||400);return a.url||a.dataUrl||''}
function E(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
/* 記錄列裡的縮圖條：最多 3 張＋「📷 n」 */
window.trPhotoStrip=function(r){var ev=(r&&r.evidence)||[];var ph=ev.filter(isImg),other=ev.length-ph.length;if(!ev.length)return '';var k='p'+Math.random().toString(36).slice(2,9);REG[k]={r:r,ph:ph,ev:ev};
  var h='<div class="trph" style="display:flex;gap:4px;align-items:center;margin-top:4px;flex-wrap:wrap">';
  ph.slice(0,3).forEach(function(a,i){h+='<img loading="lazy" src="'+E(src(a,200))+'" alt="" onclick="trGallery(\''+k+'\','+i+');event.stopPropagation()" style="width:44px;height:44px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0;cursor:zoom-in;background:#f1f5f9" onerror="this.style.display=\'none\'">'});
  if(ph.length)h+='<button type="button" onclick="trGallery(\''+k+'\',0);event.stopPropagation()" style="border:0;background:#eef2ff;color:#3730a3;border-radius:99px;padding:2px 8px;font-size:11px;font-weight:700;cursor:pointer">📷 '+ph.length+'</button>';
  if(other)h+='<span style="font-size:11px;color:#64748b">📎 '+other+'</span>';
  return h+'</div>'};
/* 全螢幕看照片 */
window.trGallery=function(k,i){var g=REG[k];if(!g||!g.ph.length)return;var n=g.ph.length;i=i||0;var el=document.getElementById('trGal');if(el)el.remove();
  el=document.createElement('div');el.id='trGal';el.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(2,6,23,.92);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;touch-action:pan-y';
  function draw(){var a=g.ph[i];el.innerHTML='<div style="position:absolute;top:10px;left:14px;right:60px;font-size:13px;line-height:1.4">'+E((g.r.subject||'')+' · '+(g.r.date||''))+'<br><span style="opacity:.7">'+(i+1)+' / '+n+' · '+E(a.name||'')+'</span></div><button type="button" data-x style="position:absolute;top:8px;right:10px;font-size:22px;background:none;border:0;color:#fff;cursor:pointer">✕</button>'+
    '<img src="'+E(src(a,1600))+'" style="max-width:96vw;max-height:78vh;object-fit:contain;border-radius:8px">'+
    '<div style="display:flex;gap:10px;margin-top:12px"><button type="button" data-p style="padding:8px 16px;border-radius:99px;border:0;font-size:15px;cursor:pointer">◀</button><a href="'+E(a.url||a.webViewUrl||src(a,1600))+'" target="_blank" rel="noopener" style="padding:8px 14px;border-radius:99px;background:#334155;color:#fff;text-decoration:none;font-size:13px">↗ 原圖</a><button type="button" data-n style="padding:8px 16px;border-radius:99px;border:0;font-size:15px;cursor:pointer">▶</button></div>'+
    '<div style="display:flex;gap:4px;margin-top:10px;max-width:96vw;overflow-x:auto">'+g.ph.map(function(b,j){return '<img data-j="'+j+'" src="'+E(src(b,160))+'" style="width:46px;height:46px;object-fit:cover;border-radius:5px;cursor:pointer;'+(j===i?'outline:2px solid #fbbf24':'opacity:.6')+'">'}).join('')+'</div>'}
  draw();el.onclick=function(e){var t=e.target;if(t===el||t.hasAttribute('data-x')){el.remove();return}if(t.hasAttribute('data-p')){i=(i-1+n)%n;draw()}else if(t.hasAttribute('data-n')){i=(i+1)%n;draw()}else if(t.dataset&&t.dataset.j){i=+t.dataset.j;draw()}};
  var x0=null;el.addEventListener('touchstart',function(e){x0=e.touches[0].clientX},{passive:true});el.addEventListener('touchend',function(e){if(x0==null)return;var dx=e.changedTouches[0].clientX-x0;x0=null;if(Math.abs(dx)>40){i=(i+(dx<0?1:-1)+n)%n;draw()}});
  document.addEventListener('keydown',function kd(e){if(!document.getElementById('trGal')){document.removeEventListener('keydown',kd);return}if(e.key==='Escape')el.remove();if(e.key==='ArrowLeft'){i=(i-1+n)%n;draw()}if(e.key==='ArrowRight'){i=(i+1)%n;draw()}});
  document.body.appendChild(el)};
})();
