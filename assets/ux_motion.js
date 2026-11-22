/* ux_motion.js v2（2026-11-22）· 介面動效（純外掛，不改原頁任何函式；拿掉這支 script 就完全恢復原樣）
   1 懸停回饋：按鈕上移 2px、陰影加深、變暗 8%、150ms ease-out（只在有滑鼠的裝置；已有 transform 的按鈕不碰）
   2 游標聚光燈：深色卡片網格上跟著滑鼠的 240px／15% 光圈，照亮範圍內卡片邊框（座標寫在 CSS 變數 --ux-x/--ux-y）
   3 3D 傾斜：重點卡片最大 8°、perspective 1000px、放大 1.02，離開 300ms 復位（卡片不套規則 1，避免 transform 打架）
   4 導覽列：捲超過 80px 後加半透明＋12px 毛玻璃＋細陰影（200ms）；只有原本單列約 80px 高的導覽列才收合到 64px
   5 回到頂部：捲超過一屏淡入 48px 圓鈕，500ms 捲回頂部；右下角已有別的浮動鈕時自動往上讓位
   滑鼠與捲動都用 requestAnimationFrame 節流。設定寫在 <script> 的 data- 屬性：
   data-cards 重點卡片、data-grid 聚光燈網格、data-dark="1" 強制當深色、data-nav 導覽列、data-scroll 捲動容器、data-skip 不套懸停的區域 */
(function(){
'use strict';
if(window.__uxMotion)return;window.__uxMotion=1;
var sc=document.currentScript||{},ds=sc.dataset||{};
/* 同一頁如果已經有另一支動效（HRA Portal 的 shared/ui-fx.js，記號 __acUiFx）就整支讓位，不重複套；關閉方式也和它一致：網址加 ?fx=off 或 localStorage.ac_ui_fx='off' */
function other(){try{if(/[?&]fx=off/.test(location.search)||localStorage.getItem('ac_ui_fx')==='off')return true}catch(e){}return !!(window.__acUiFx||document.querySelector('script[src*="ui-fx"]'))}
function main(){if(other())return;
var BTN=ds.btn||'button,.btn,[role="button"],input[type="button"],input[type="submit"]',CARDS=ds.cards||'',GRID=ds.grid||'',NAV=ds.nav||'',SKIP=ds.skip||'';
var fine=window.matchMedia&&matchMedia('(hover:hover) and (pointer:fine)').matches,calm=window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches;
var $=function(s,r){try{return (r||document).querySelector(s)}catch(e){return null}},closest=function(el,s){try{return s&&el&&el.closest?el.closest(s):null}catch(e){return null}};
function rgb(c){var m=/rgba?\(([^)]+)\)/.exec(c||'');if(!m)return null;var p=m[1].split(',').map(parseFloat);return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1}}
function bgOf(el){for(;el&&el.nodeType===1;el=el.parentElement){var c=rgb(getComputedStyle(el).backgroundColor);if(c&&c.a>0.5)return c}return {r:255,g:255,b:255,a:1}}
function dark(el){if(ds.dark==='1')return true;var c=bgOf(el);return (0.2126*c.r+0.7152*c.g+0.0722*c.b)/255<0.42}
var css='.ux-h{transition:transform .15s ease-out,box-shadow .15s ease-out,filter .15s ease-out,background-color .15s ease-out,border-color .15s ease-out,color .15s ease-out!important;cursor:pointer}'
 +'.ux-h:hover{transform:translateY(-2px);box-shadow:0 6px 16px rgba(0,0,0,.2);filter:brightness(.92)}.ux-h:active{transform:translateY(0);filter:brightness(.88)}'
 +'.ux-spot{position:absolute;inset:0;pointer-events:none;border-radius:inherit;opacity:0;transition:opacity .25s ease;z-index:0;background:radial-gradient(240px circle at var(--ux-x,-999px) var(--ux-y,-999px),rgba(255,255,255,.15),rgba(255,255,255,0) 100%)}.ux-on>.ux-spot{opacity:1}'
 +'.ux-nav{transition:height .2s ease,min-height .2s ease,padding .2s ease,background-color .2s ease,box-shadow .2s ease,backdrop-filter .2s ease!important}'
 +'.ux-nav.ux-stuck{background-color:var(--ux-navbg)!important;-webkit-backdrop-filter:blur(12px)!important;backdrop-filter:blur(12px)!important;box-shadow:0 1px 0 rgba(0,0,0,.06),0 4px 14px rgba(0,0,0,.10)!important}'
 +'.ux-nav.ux-shrink.ux-stuck{height:64px!important;min-height:64px!important}'
 +'#uxTop{position:fixed;right:24px;bottom:24px;width:48px;height:48px;border-radius:50%;border:1px solid rgba(255,255,255,.25);background:rgba(23,36,60,.86);color:#fff;font:700 20px/1 system-ui,sans-serif;display:grid;place-items:center;cursor:pointer;z-index:30;opacity:0;visibility:hidden;transform:translateY(8px);transition:opacity .25s ease,transform .2s ease,visibility 0s linear .25s;box-shadow:0 6px 18px rgba(0,0,0,.25);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);padding:0}'
 +'#uxTop.on{opacity:.94;visibility:visible;transform:none;transition:opacity .25s ease,transform .2s ease,visibility 0s}#uxTop.on:hover{transform:translateY(-3px);opacity:1}@media print{#uxTop{display:none!important}}';
var st=document.createElement('style');st.id='uxMotionCss';st.textContent=css;document.head.appendChild(st);

/* ---- 1 懸停回饋：滑鼠第一次移到按鈕上才掛（頁面一直重畫也不怕），已有 transform／被停用／是卡片的不掛 ---- */
if(fine&&!calm)document.addEventListener('mouseover',function(e){var b=closest(e.target,BTN);if(!b||b.classList.contains('ux-h')||b.__uxNo)return;
  if(b.disabled||b.id==='uxTop'||closest(b,CARDS)||closest(b,SKIP)){b.__uxNo=1;return}var cs=getComputedStyle(b);
  if(cs.transform!=='none'||cs.display==='inline'||cs.position==='fixed'){b.__uxNo=1;return}b.classList.add('ux-h')},true);

/* ---- 2＋3 聚光燈與 3D 傾斜：同一個 pointermove，rAF 節流 ---- */
var mv=null,raf=0,curCard=null,curGrid=null,lit=[];
function unlit(){lit.forEach(function(c){c.style.borderColor=''});lit=[]}
function leaveCard(){if(!curCard)return;var c=curCard;curCard=null;c.style.transition='transform .3s ease';c.style.transform='';setTimeout(function(){if(c!==curCard){c.style.transition='';c.style.willChange=''}},320)}
function leaveGrid(){if(!curGrid)return;curGrid.classList.remove('ux-on');curGrid=null;unlit()}
function frame(){raf=0;var e=mv;if(!e)return;var t=e.target,card=closest(t,CARDS),grid=closest(t,GRID);
  if(card!==curCard){leaveCard();if(card&&getComputedStyle(card).display!=='inline'){curCard=card;card.style.willChange='transform'}}
  if(curCard){var r=curCard.getBoundingClientRect(),px=(e.clientX-r.left)/r.width-.5,py=(e.clientY-r.top)/r.height-.5,dn=e.buttons&1;
    curCard.style.transition='transform .08s linear';curCard.style.transform='perspective(1000px) rotateX('+(-py*16).toFixed(2)+'deg) rotateY('+(px*16).toFixed(2)+'deg) scale('+(dn?.99:1.02)+')'}
  if(grid!==curGrid){leaveGrid();if(grid&&dark(grid)){curGrid=grid;if(getComputedStyle(grid).position==='static')grid.style.position='relative';
      if(!grid.querySelector(':scope > .ux-spot')){var s=document.createElement('i');s.className='ux-spot';s.setAttribute('aria-hidden','true');grid.appendChild(s)}grid.classList.add('ux-on')}}
  if(curGrid){var g=curGrid.getBoundingClientRect(),x=e.clientX-g.left+curGrid.scrollLeft,y=e.clientY-g.top+curGrid.scrollTop;curGrid.style.setProperty('--ux-x',x+'px');curGrid.style.setProperty('--ux-y',y+'px');
    unlit();var cs;try{cs=curGrid.querySelectorAll(CARDS||':scope > *')}catch(_){cs=[]}
    for(var i=0;i<cs.length&&i<200;i++){var b=cs[i].getBoundingClientRect(),dx=Math.max(b.left-e.clientX,0,e.clientX-b.right),dy=Math.max(b.top-e.clientY,0,e.clientY-b.bottom),d=Math.sqrt(dx*dx+dy*dy);
      if(d<240){cs[i].style.borderColor='rgba(255,255,255,'+(0.22+0.5*(1-d/240)).toFixed(2)+')';lit.push(cs[i])}}}}
if(fine&&!calm&&(CARDS||GRID)){document.addEventListener('pointermove',function(e){if(e.pointerType&&e.pointerType!=='mouse')return;mv=e;if(!raf)raf=requestAnimationFrame(frame)},{passive:true});
  document.addEventListener('pointerleave',function(){mv=null;leaveCard();leaveGrid()});document.addEventListener('mouseout',function(e){if(!e.relatedTarget){mv=null;leaveCard();leaveGrid()}});
  window.addEventListener('blur',function(){mv=null;leaveCard();leaveGrid()})}

/* ---- 4＋5 捲動：導覽列狀態、回到頂部（rAF 節流）---- */
var box=ds.scroll?$(ds.scroll):null,nav=null,btn=null,sraf=0;
/* 有的頁面是 body 自己在捲（html 固定高）：三個地方取最大的那個 */
function top(){return Math.max(box?box.scrollTop:0,window.pageYOffset||0,document.documentElement.scrollTop||0,document.body?document.body.scrollTop:0)}
function viewH(){return box?box.clientHeight:window.innerHeight}
function place(){/* 右下角已經有別的固定浮動鈕 → 往上讓位 */var bottom=24;for(var k=0;k<4;k++){var y=window.innerHeight-bottom-24,x=window.innerWidth-48,hit=null,els=document.elementsFromPoint?document.elementsFromPoint(x,y):[];
    for(var i=0;i<els.length;i++){var el=els[i];if(el===btn)continue;var p=el;while(p&&p!==document.body&&getComputedStyle(p).position!=='fixed')p=p.parentElement;if(p&&p!==document.body&&p!==btn&&p.offsetWidth<200&&p.offsetHeight<200){hit=p;break}}
    if(!hit)break;bottom+=Math.max(56,hit.offsetHeight+12)}btn.style.bottom=bottom+'px'}
function onScroll(){sraf=0;var y=top();
  if(nav){var on=y>80;if(on!==nav.classList.contains('ux-stuck'))nav.classList.toggle('ux-stuck',on)}
  if(btn){var show=y>viewH();if(show&&!btn.classList.contains('on')){place();btn.classList.add('on')}else if(!show&&btn.classList.contains('on'))btn.classList.remove('on')}}
function ask(){if(!sraf)sraf=requestAnimationFrame(onScroll)}
function toTop(){var y0=top(),t0=performance.now(),D=calm?1:500;function step(t){var k=Math.min(1,(t-t0)/D),e=1-Math.pow(1-k,3),y=Math.round(y0*(1-e));if(box&&box.scrollTop)box.scrollTop=y;if(document.body.scrollTop)document.body.scrollTop=y;if(window.pageYOffset||document.documentElement.scrollTop)window.scrollTo(0,y);if(y===0){if(box)box.scrollTop=0;document.body.scrollTop=0;window.scrollTo(0,0)}if(k<1)requestAnimationFrame(step)}requestAnimationFrame(step)}
function boot(){box=ds.scroll?$(ds.scroll):null;
  if(NAV){nav=$(NAV);if(nav){var cs=getComputedStyle(nav);if(cs.position!=='sticky'&&cs.position!=='fixed')nav=null;else{var c=bgOf(nav);nav.style.setProperty('--ux-navbg','rgba('+c.r+','+c.g+','+c.b+',.82)');nav.classList.add('ux-nav');/* 只有單列、約 80px 高的導覽列才收合；兩列（標題＋分頁）的收了會把分頁蓋掉 */if(nav.offsetHeight>=76&&nav.offsetHeight<=88)nav.classList.add('ux-shrink')}}}
  if(ds.top!=='0'&&window.top===window.self||ds.top==='1'){btn=document.createElement('button');btn.id='uxTop';btn.type='button';btn.className='noprint';btn.setAttribute('aria-label','Back to top');btn.title='回到頂部 Back to top';btn.textContent='↑';btn.onclick=toTop;document.body.appendChild(btn)}
  document.addEventListener('scroll',function(e){var t=e.target;if(t===document||t===document.body||t===document.documentElement||t===box)ask()},{passive:true,capture:true});window.addEventListener('resize',ask,{passive:true});ask()}
boot()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',main);else main();
})();
