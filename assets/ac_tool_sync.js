/* AC Audit · 工具雲端同步 ac_tool_sync.js v1
   把原本只存在本機的嵌入工具（WSE 舊版評估、BIG W/WSE Tracker、DCC 工具、柬埔寨法律、MSG 處理器）
   存進同一個 Unified GAS 雲端檔（AC_AUDIT_DB）的 tools 欄位，不需修改 GAS。
   合併採三方比對（上次同步版本 / 本機 / 雲端）：兩邊新增都保留、一邊刪除就刪除、同一筆兩邊都改以本機為準、流水號取最大。 */
(function(g){
  var TOOLS=[
    {id:'wse_legacy',key:'VRT_WSE_AUDIT_STATE',icon:'📝',zh:'WSE 舊版 NC 評估',en:'WSE NC Assessment',unit:'項',count:function(d){return d&&typeof d==='object'?Object.keys(d).length:0}},
    {id:'bigw',key:'vrt_bigw_wse_tracker_v1',icon:'✅',zh:'BIG W / WSE Tracker',en:'BIG W / WSE Tracker',unit:'題',count:function(d){return d&&d.responses?Object.keys(d.responses).length:0}},
    {id:'dcc_tool',key:'vrt_dcc_v2',icon:'🗂',zh:'DCC 文件工具',en:'DCC Tool',unit:'筆',count:function(d){var S=d&&d.S||{};return ['docs','certs','mtgs','ext'].reduce(function(a,k){return a+(Array.isArray(S[k])?S[k].length:0)},0)}},
    {id:'law_tool',key:'cambodia_laws_v1',icon:'📜',zh:'柬埔寨法律條文',en:'Cambodia Law Articles',unit:'部',count:function(d){return Array.isArray(d)?d.length:0}},
    {id:'rules_tool',key:'vrt_factory_rules_v2',icon:'📕',zh:'廠規手冊',en:'Factory Rules',unit:'條',count:function(d){return d&&d.html?(d.html.match(/class="art-num"/g)||[]).length:0}},
    {id:'msg_tool',key:'msgProcessor_data',icon:'📧',zh:'MSG 郵件處理',en:'MSG Processor',unit:'封',count:function(d){return d&&Array.isArray(d.results)?d.results.length:0}}
  ];
  var BASE='ac_sync_base_',IDK=['id','fn','docNo','code','key','no'];
  function J(x){return JSON.stringify(x)}
  function eq(a,b){return J(a)===J(b)}
  function isObj(x){return !!x&&typeof x==='object'&&!Array.isArray(x)}
  function kOf(x){if(isObj(x))for(var i=0;i<IDK.length;i++){var v=x[IDK[i]];if(v!==undefined&&v!==null&&v!=='')return IDK[i]+':'+v}return 'v:'+J(x)}
  function idArr(a){return Array.isArray(a)&&a.every(function(x){return isObj(x)&&IDK.some(function(k){return x[k]!==undefined&&x[k]!==null&&x[k]!==''})})}
  function merge3(B,L,C,name){
    if(eq(L,C))return L;
    if(B!==undefined&&eq(L,B))return C;
    if(B!==undefined&&eq(C,B))return L;
    if(typeof L==='number'&&typeof C==='number'&&/seq/i.test(name||''))return Math.max(L,C);
    if(isObj(L)&&isObj(C)){
      var b=isObj(B)?B:{},o={},ks=Object.keys(L).concat(Object.keys(C).filter(function(k){return !(k in L)}));
      ks.forEach(function(k){var inL=k in L,inC=k in C,inB=k in b;
        if(inL&&inC)o[k]=merge3(b[k],L[k],C[k],k);
        else if(inL){if(!(inB&&eq(L[k],b[k])))o[k]=L[k]}
        else{if(!(inB&&eq(C[k],b[k])))o[k]=C[k]}});
      return o}
    if(idArr(L)&&idArr(C)){
      var bm={},lm={},cm={},out=[];
      if(Array.isArray(B))B.forEach(function(x){bm[kOf(x)]=x});
      L.forEach(function(x){lm[kOf(x)]=x});C.forEach(function(x){cm[kOf(x)]=x});
      L.forEach(function(x){var k=kOf(x);if(k in cm)out.push(merge3(bm[k],x,cm[k]));else if(!((k in bm)&&eq(x,bm[k])))out.push(x)});
      C.forEach(function(x){var k=kOf(x);if(k in lm)return;if(!((k in bm)&&eq(x,bm[k])))out.push(x)});
      return out}
    return L;
  }
  function readLocal(key){var r=localStorage.getItem(key);if(r===null)return undefined;try{return JSON.parse(r)}catch(e){return undefined}}
  function readBase(key){try{var r=localStorage.getItem(BASE+key);return r===null?undefined:JSON.parse(r)}catch(e){return undefined}}
  function writeBase(key,v){try{localStorage.setItem(BASE+key,J(v))}catch(e){try{localStorage.removeItem(BASE+key)}catch(_){}}}
  function find(k){for(var i=0;i<TOOLS.length;i++)if(TOOLS[i].key===k||TOOLS[i].id===k)return TOOLS[i];return null}
  /* 狀態：none / ok / up / down / both / unk */
  function status(t,cloud){
    var L=readLocal(t.key),B=readBase(t.key),hasC=!!(cloud&&cloud.tools&&cloud.tools[t.key]),C=hasC?cloud.tools[t.key].data:undefined;
    var lc=L===undefined?'—':t.count(L);
    if(!cloud)return{local:lc,cloud:'—',st:L===undefined?'none':'unk'};
    var cc=hasC?t.count(C):'—';
    if(L===undefined&&!hasC)return{local:lc,cloud:cc,st:'none'};
    if(L===undefined)return{local:lc,cloud:cc,st:'down'};
    if(!hasC)return{local:lc,cloud:cc,st:'up'};
    if(eq(L,C))return{local:lc,cloud:cc,st:'ok'};
    var lch=B===undefined||!eq(L,B),cch=B===undefined||!eq(C,B);
    return{local:lc,cloud:cc,st:lch&&cch?'both':lch?'up':'down'};
  }
  /* 把 keys 的本機資料與 cloudDoc.tools 合併。mode='both' 會寫入 cloudDoc；'down' 只改本機。
     回傳 {cloudChanged, localChanged:[keys], log:[文字]} */
  function sync(keys,cloudDoc,mode,by){
    var res={cloudChanged:false,localChanged:[],log:[]};
    cloudDoc.tools=isObj(cloudDoc.tools)?cloudDoc.tools:{};
    (keys||[]).forEach(function(k){var t=find(k);if(!t)return;
      var L=readLocal(t.key),B=readBase(t.key),ent=cloudDoc.tools[t.key],C=ent?ent.data:undefined,M;
      if(L===undefined&&C===undefined)return;
      if(L===undefined)M=C;else if(C===undefined)M=L;else M=merge3(B,L,C);
      if(L===undefined||!eq(M,L)){try{localStorage.setItem(t.key,J(M));res.localChanged.push(t.key)}catch(e){res.log.push(t.zh+' 本機空間不足')}}
      if(mode!=='down'&&(C===undefined||!eq(M,C))){cloudDoc.tools[t.key]={data:M,updatedAt:Date.now(),by:by||'portal'};res.cloudChanged=true}
      writeBase(t.key,mode==='down'?(C===undefined?L:C):M);
      res.log.push(t.zh+' '+t.count(M)+t.unit);
    });
    return res;
  }
  function dirty(keys){return (keys||[]).some(function(k){var t=find(k);if(!t)return false;var L=readLocal(t.key);return L!==undefined&&!eq(L,readBase(t.key))})}
  g.ACTS={TOOLS:TOOLS,merge3:merge3,status:status,sync:sync,dirty:dirty,find:find};
})(window);
