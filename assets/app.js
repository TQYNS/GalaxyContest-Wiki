/* 介绍页主程序：每个页面是独立 HTML，app.js 按 body[data-page] 渲染
 * data-page = home | cat | search ; data-cat = 分区id（cat 页用）
 * 贴图经 MFRebuild 自动验签解密重建，访客零输入。
 */
(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function mdInline(s){
  let h=esc(s);
  h=h.replace(/`([^`]+)`/g,'<code>$1</code>');
  h=h.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
  h=h.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,(m,t,u)=>`<a href="${u}" target="_blank" rel="noopener noreferrer">${t}</a>`);
  return h;
}
function mdToHtml(src){
  const lines=String(src??'').replace(/\r\n?/g,'\n').split('\n');
  const out=[]; let para=[], list=null;
  const flush=()=>{ if(para.length){ out.push('<p>'+para.map(mdInline).join('<br>')+'</p>'); para=[]; } };
  const closeList=()=>{ if(list){ out.push('</'+list+'>'); list=null; } };
  for(const raw of lines){
    const line=raw.trim();
    if(!line){ flush(); closeList(); continue; }
    let m=line.match(/^(#{1,3})\s+(.+)$/);
    if(m){ flush(); closeList(); const n=m[1].length+2; out.push(`<h${n}>${mdInline(m[2])}</h${n}>`); continue; }
    if(/^---+$/.test(line)){ flush(); closeList(); out.push('<hr>'); continue; }
    m=line.match(/^[-*]\s+(.+)$/);
    if(m){ flush(); if(list!=='ul'){ closeList(); list='ul'; out.push('<ul>'); } out.push(`<li>${mdInline(m[1])}</li>`); continue; }
    m=line.match(/^\d+\.\s+(.+)$/);
    if(m){ flush(); if(list!=='ol'){ closeList(); list='ol'; out.push('<ol>'); } out.push(`<li>${mdInline(m[1])}</li>`); continue; }
    closeList();
    para.push(line);
  }
  flush(); closeList();
  return out.join('');
}
const C=window.MF_CONTENT||{groups:[],items:[],logs:[]};
const RB=window.MFRebuild;
const STATIONS=C.stations||[], TRADE=C.tradeMeta||{};
const smap=Object.create(null);
STATIONS.forEach(s=>smap[s.id]=s);

const PAGE=document.body.dataset.page||'home';
const CAT=document.body.dataset.cat||'';
// 全部用站点根相对路径，由每个页面 <head> 的 <base> 统一解析（主页 ./，分类页 ../）。
const homeUrl=()=>'index.html';
const pageUrl=id=>'pages/'+id+'.html';
const searchUrl=()=>'pages/search.html';
const groups=C.groups||[], items=C.items||[];
// 分组按 kind 分流：gallery=内容分区（大卡片），wiki=玩法与机制（文字索引栏）
const galleryGroups=groups.filter(g=>(g.kind||'gallery')!=='wiki');
const wikiGroups=groups.filter(g=>g.kind==='wiki');
const WIKI=C.wiki||[];
const ACH=C.achievements||[];
const CE=C.contentEntries||[];
let UPDATES=[];
const UPDATE_URL='update/updates.json';
function normalizeUpdates(raw){
  const arr=Array.isArray(raw)?raw:(raw&&Array.isArray(raw.items)?raw.items:[]);
  return arr.map((u,i)=>({
    id:String(u.id||('update-'+(i+1))),
    name:String(u.name||u.title||'未命名更新'),
    summary:String(u.summary||u.desc||''),
    detail:Array.isArray(u.detail)?u.detail.join('\n'):String(u.detail||u.content||u.summary||u.desc||''),
    date:String(u.date||''),
    tag:String(u.tag||'更新')
  })).filter(u=>u.name);
}
async function loadUpdates(){
  try{
    const r=await fetch(UPDATE_URL+'?t='+Date.now(),{cache:'no-store'});
    if(!r.ok) throw new Error('HTTP '+r.status);
    UPDATES=normalizeUpdates(await r.json());
  }catch(e){
    UPDATES=[];
  }
}
const gmap=Object.create(null), imap=Object.create(null), datmap=RB.map();
groups.forEach(g=>gmap[g.id]=g);
items.forEach(i=>imap[i.id]=i);
function itemsOf(gid){return items.filter(i=>i.cat===gid);}
function countOf(gid){
  if(gid==='trade') return STATIONS.length;                       // 交易按站点数计
  if(gid==='event') return items.filter(i=>i.cat==='event'&&i.polarity).length;
  if(gid==='achievement') return (C.achievements||[]).length;
  if(gid==='content') return CE.length;
  if(gid==='update') return UPDATES.length;
  return itemsOf(gid).length;
}

/* ---------- 主题 ---------- */
const THEMES=[
  {id:'nebula',name:'科幻炫彩蓝',icon:'🌌'},
  {id:'parchment',name:'复古羊皮',icon:'📜'},
  {id:'mint',name:'薄荷清爽',icon:'🌿'},
  {id:'candy',name:'糖果怀旧',icon:'🍬'},
];
const THEME_KEY='mf_theme';
function applyTheme(id){
  document.documentElement.setAttribute('data-theme',id);
  try{localStorage.setItem(THEME_KEY,id);}catch(e){}
}
function initTheme(){
  let id='nebula';
  try{id=localStorage.getItem(THEME_KEY)||'nebula';}catch(e){}
  if(!THEMES.some(t=>t.id===id)) id='nebula';
  applyTheme(id);
  const wrap=$('#themeMenu'); if(!wrap) return;
  wrap.innerHTML='';
  THEMES.forEach(t=>{
    const b=document.createElement('button');
    b.className='theme-opt'+(t.id===id?' active':'');
    b.innerHTML=`<span class="theme-ico">${t.icon}</span><span>${t.name}</span>`;
    b.addEventListener('click',()=>{
      applyTheme(t.id);
      $$('.theme-opt',wrap).forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      wrap.classList.remove('open');
    });
    wrap.appendChild(b);
  });
}

/* ---------- 侧栏（真实链接） ---------- */
function renderSidebar(){
  const ul=$('#navList'); if(!ul) return;
  ul.innerHTML='';
  const home=document.createElement('li');
  home.innerHTML=`<a class="nav-item${PAGE==='home'?' active':''}" href="${homeUrl()}"><span class="nav-ico">🏠</span><span class="nav-name">主页</span></a>`;
  ul.appendChild(home);
  // 顺序与主页一致：玩法与机制（文字索引）在上，内容分区（图鉴）在下
  const headW=document.createElement('li');
  headW.className='nav-head'; headW.textContent='玩法与机制';
  ul.appendChild(headW);
  wikiGroups.forEach(g=>{
    const li=document.createElement('li');
    const active=(PAGE==='cat'&&CAT===g.id)?' active':'';
    li.innerHTML=`<a class="nav-item${active}" href="${pageUrl(g.id)}"><span class="nav-ico">${esc(g.icon)}</span><span class="nav-name">${esc(g.name)}</span><span class="num">${countOf(g.id)}</span></a>`;
    ul.appendChild(li);
  });
  const head=document.createElement('li');
  head.className='nav-head'; head.textContent='内容分区';
  ul.appendChild(head);
  galleryGroups.forEach(g=>{
    const li=document.createElement('li');
    const active=(PAGE==='cat'&&CAT===g.id)?' active':'';
    li.innerHTML=`<a class="nav-item${active}" href="${pageUrl(g.id)}"><span class="nav-ico">${esc(g.icon)}</span><span class="nav-name">${esc(g.name)}</span><span class="num">${countOf(g.id)}</span></a>`;
    ul.appendChild(li);
  });
}

/* ---------- 画布槽位 ---------- */
function slotFor(item,cls){
  const slot=document.createElement('div');
  slot.className='img-slot '+(cls||'');
  // Buff 条目本身无贴图：用来源物品（srcItem）的贴图做缩略图索引
  const renderItem=(item.isBuff&&item.srcItem&&imap[item.srcItem])?imap[item.srcItem]:item;
  if(renderItem.text){ slot.innerHTML=`<span class="ph-big">${esc(renderItem.icon||'✨')}</span>`; return slot; }
  const ph=document.createElement('span'); ph.className='ph'; ph.textContent='🖼️';
  slot.appendChild(ph);
  const entry=datmap[renderItem.id];
  if(entry){
    RB.decode(entry).then(cv=>{cv.className='item-canvas';slot.innerHTML='';slot.appendChild(cv);})
      .catch(e=>{ph.textContent='⚠️';ph.title=e.message;});
  }else{ ph.textContent='·'; ph.title='无贴图'; }
  return slot;
}

/* ---------- Buff / 物品跳转 ---------- */
// 跳到物品所在分类页并自动打开其详情（用 ?item= 参数）
function gotoItem(id){
  const it=imap[id]; if(!it) return;
  const base=pageUrl(it.cat);
  window.location.href=base+'?item='+encodeURIComponent(id);
}

/* ---------- Hero 统计 ---------- */
function renderHeroStats(){
  const el=$('#heroStats'); if(!el) return;
  const stats=(C.meta&&C.meta.stats)||[];
  el.innerHTML=stats.map(s=>`<div class="stat"><b>${esc(s.v)}</b><span>${esc(s.k)}</span></div>`).join('');
}

/* ---------- 主页 ---------- */
function drawHome(){
  const stage=$('#stage');
  stage.innerHTML=`
    <section class="hero">
      <div class="hero-inner">
        <div class="hero-badge">${esc((C.meta&&C.meta.version)||'v5.0')} · 缺氧 MOD 图鉴</div>
        <h1>${esc(C.title||'')}</h1>
        <p class="hero-sub">${esc(C.subtitle||'')}</p>
        <div id="heroStats" class="stats"></div>
      </div>
    </section>
    <section class="section">
      <div class="section-head"><h2>🧭 玩法与机制</h2><span class="section-tip">条目索引 · 点击直达词条</span></div>
      <div id="wikiGrid" class="wiki"></div>
    </section>
    <section class="section">
      <div class="section-head"><h2>📚 内容分区</h2><span class="section-tip">点击卡片进入对应图鉴</span></div>
      <div id="portalGrid" class="portal-grid"></div>
    </section>`;
  renderHeroStats();
  const wg=$('#wikiGrid');
  WIKI.forEach(col=>{
    const box=document.createElement('div');
    box.className='wiki-col';
    const gp=gmap[col.page]||{};
    const rawLinks=col.dynamic==='updates'
      ? UPDATES.map(u=>({label:u.name,note:u.date||u.tag,href:'pages/update.html?update='+encodeURIComponent(u.id)}))
      : (col.links||[]);
    const links=rawLinks.slice(0,5).map(l=>`<li><a href="${esc(l.href||'#')}">
        <span class="wl-name">${esc(l.label)}</span>${l.note?`<small>${esc(l.note)}</small>`:''}</a></li>`).join('')
      || `<li class="wl-empty">${col.dynamic==='updates'?'暂无更新':'暂无条目'}</li>`;
    box.innerHTML=`
      <h3><span class="wi">${esc(col.icon||'')}</span>
        <a href="${pageUrl(col.page)}">${esc(col.name)}</a>
        <span class="wiki-more">全部 →</span></h3>
      <p class="wiki-sub">${esc(col.desc||gp.desc||'')}</p>
      <ul>${links}</ul>`;
    wg.appendChild(box);
  });
  const grid=$('#portalGrid');
  galleryGroups.forEach(g=>{
    const card=document.createElement('a');
    card.className='portal-card';
    card.href=pageUrl(g.id);
    card.style.setProperty('--tint',g.tint||'#5b8def');
    card.innerHTML=`
      <div class="portal-top">
        <div class="portal-icon">${esc(g.icon)}</div>
        <span class="portal-count">${countOf(g.id)} 项</span>
      </div>
      <h3>${esc(g.name)}</h3>
      <p class="portal-desc">${esc(g.desc||'')}</p>
      <div class="portal-foot"><span>进入图鉴</span><span class="arrow">→</span></div>`;
    grid.appendChild(card);
  });
}

/* ---------- 分类页 ---------- */
function matchItem(i,q){
  if(!q) return true;
  const hay=[i.name,i.desc,i.effectText,i.gain,i.special,i.side,i.duration,i.buff&&i.buff.name,
    ...(i.tags||[]),...(i.opts||[]).map(o=>o.label)].join(' ').toLowerCase();
  if(hay.includes(q)) return true;
  if((i.id||'').toLowerCase().includes(q)) return true;
  return false;
}
const RANK_ORDER={'S':0,'A':1,'B':2,'C':3,'D':4,'E':5,'F':6};
let monsterRank='ALL';
function rankChips(){
  const ranks=['ALL','S','A','B','C','D','E','F'];
  return `<div class="rank-filter" id="rankFilter">${ranks.map(r=>{
    const label=r==='ALL'?'全部':r+' 级';
    const n=r==='ALL'?countOf('monster'):itemsOf('monster').filter(i=>i.rank===r).length;
    return `<button class="rank-chip${monsterRank===r?' active':''}" data-rank="${r}">${label}<span class="chip-num">${n}</span></button>`;
  }).join('')}</div>`;
}
// 分类标签过滤（美食 / 饮品），标签从该分类实际数据动态收集
// TAG_PRIORITY 同时决定默认聚集顺序
// 美食 料理>罐头>食材>调味料；饮品 酒水>咖啡>汽水；战斗 导弹>模块；道具 卷轴>情报>燃料>凭证
const TAG_PRIORITY={
  food:['料理','罐头','食材','调味料'],
  drink:['酒水','咖啡','汽水','乳饮'],
  combat:['导弹','模块'],
  item:['配方卷轴','任务卷轴','情报','燃料','艺术品','凭证'],
};
// 战斗装备：分级配色顺序（legendary红>master紫>common蓝）+ 系列聚集顺序
const GRADE_ORDER=['legendary','master','common'];
const SERIES_ORDER=['发射器','穿甲','雷达','维修','推进','导弹'];
let catTag='ALL';
function tagChips(gid){
  const present=new Set();
  itemsOf(gid).forEach(i=>(i.tags||[]).forEach(t=>present.add(t)));
  const pri=TAG_PRIORITY[gid]||[];
  const tags=pri.filter(t=>present.has(t))
    .concat([...present].filter(t=>!pri.includes(t)).sort());
  return `<div class="rank-filter tag-filter" id="tagFilter"><span class="rank-label">标签</span>${['ALL',...tags].map(t=>{
    const label=t==='ALL'?'全部':t;
    const n=t==='ALL'?countOf(gid):itemsOf(gid).filter(i=>(i.tags||[]).includes(t)).length;
    return `<button class="rank-chip${catTag===t?' active':''}" data-tag="${esc(t)}">${esc(label)}<span class="chip-num">${n}</span></button>`;
  }).join('')}</div>`;
}
// 默认聚集比较器：DST 项排到最末尾（各组内部仍按分类聚集），其余按 TAG_PRIORITY 分组
function byCatOrder(gid){
  const pri=TAG_PRIORITY[gid]||[];
  return (a,b)=>{
    const da=a.dst?1:0, db=b.dst?1:0;
    if(da!==db) return da-db;                       // 非DST在前，DST沉底
    const ta=(a.tags||[])[0], tb=(b.tags||[])[0];
    const ia=pri.indexOf(ta), ib=pri.indexOf(tb);
    const ra=ia<0?pri.length:ia, rb=ib<0?pri.length:ib;
    if(ra!==rb) return ra-rb;                       // 分类聚集
    // 战斗装备：同系列聚一组，组内按分级 红>紫>蓝
    if(gid==='combat'){
      const sa=SERIES_ORDER.indexOf(a.series), sb=SERIES_ORDER.indexOf(b.series);
      if(sa!==sb) return (sa<0?99:sa)-(sb<0?99:sb);
      const ga=GRADE_ORDER.indexOf(a.grade), gb=GRADE_ORDER.indexOf(b.grade);
      if(ga!==gb) return (ga<0?99:ga)-(gb<0?99:gb);
    }
    return a.name.localeCompare(b.name,'zh');      // 组内按名称
  };
}
function drawCat(gid){
  const g=gmap[gid];
  const stage=$('#stage');
  if(!g){ stage.innerHTML=`<div class="empty">未找到该分类，<a href="${homeUrl()}">返回主页</a></div>`; return; }
  document.title=g.name+' - '+(C.title||'逐鹿星河');
  if(gid==='trade'){ drawTradePage(g); return; }
  if(gid==='narrator'){ drawNarratorPage(g); return; }
  if(gid==='achievement'){ drawAchievementPage(g); return; }
  if(gid==='content'){ drawContentPage(g); return; }
  if(gid==='update'){ drawUpdatePage(g); return; }
  const isMonster=gid==='monster';
  const isBuff=gid==='buff';
  const isEvent=gid==='event';
  const hasTags=!!TAG_PRIORITY[gid];
  if(catTag!=='ALL'&&!hasTags) catTag='ALL';
  const tip=isBuff?'速查表：属性 / 特殊效果 / 副作用分列，点整行直达来源物品'
    :isEvent?'速查表：事件名 / 重复间隔 / 描述 / 额外效果，点整行看详情'
    :'点击卡片看详情';
  stage.innerHTML=`
    <div class="crumb"><a href="${homeUrl()}">主页</a><span>/</span><b>${esc(g.icon)} ${esc(g.name)}</b></div>
    <section class="section">
      <div class="section-head">
        <h2>${esc(g.icon)} ${esc(g.name)}</h2>
        <span class="section-tip">共 ${countOf(gid)} 项 · ${tip}</span>
      </div>
      <p class="cat-desc">${esc(g.desc||'')}</p>
      <div class="cat-toolbar">
        <input id="catFilter" class="filter-input" type="search" placeholder="在本分类中搜索…">
        <a href="${searchUrl()}" class="btn-ghost">全局搜索</a>
      </div>
      ${isMonster?`<div class="rank-toolbar"><span class="rank-label">怪物等级</span>${rankChips()}</div>`:''}
      ${isEvent?polChips():''}
      ${hasTags?tagChips(gid):''}
      <div id="itemGrid" class="${isBuff?'buff-table-wrap':isEvent?'xt-table-wrap':'item-grid'}"></div>
    </section>`;
  const inp=$('#catFilter');
  inp.addEventListener('input',()=>{
    if(isBuff) drawBuffTable(inp.value);
    else if(isEvent) drawEventTable(inp.value);
    else drawCatItems(gid,inp.value);
  });
  if(isMonster){
    $$('#rankFilter .rank-chip').forEach(b=>b.addEventListener('click',()=>{
      monsterRank=b.dataset.rank;
      $$('#rankFilter .rank-chip').forEach(x=>x.classList.toggle('active',x===b));
      drawCatItems(gid,inp.value);
    }));
  }
  if(isEvent){
    $$('#polFilter .rank-chip').forEach(b=>b.addEventListener('click',()=>{
      evPol=b.dataset.pol;
      $$('#polFilter .rank-chip').forEach(x=>x.classList.toggle('active',x===b));
      drawEventTable(inp.value);
    }));
  }
  if(hasTags){
    $$('#tagFilter .rank-chip').forEach(b=>b.addEventListener('click',()=>{
      catTag=b.dataset.tag;
      $$('#tagFilter .rank-chip').forEach(x=>x.classList.toggle('active',x===b));
      drawCatItems(gid,inp.value);
    }));
  }
  if(isBuff) drawBuffTable('');
  else if(isEvent) drawEventTable('');
  else drawCatItems(gid,'');
}
/* ---------- 事件速查表：事件名 / 重复间隔 / 事件描述 / 额外效果 ---------- */
let evPol='ALL';
function polChips(){
  const evs=itemsOf('event').filter(i=>i.polarity);
  const rows=[['ALL','全部',evs.length],['positive','正向',evs.filter(i=>i.polarity==='positive').length],
              ['neutral','中性',evs.filter(i=>i.polarity==='neutral').length],
              ['negative','负向',evs.filter(i=>i.polarity==='negative').length]];
  return `<div class="rank-toolbar" id="polFilter"><span class="rank-label">事件极性</span>${rows.map(([v,l,n])=>
    `<button class="rank-chip${evPol===v?' active':''}" data-pol="${v}">${l} <em class="chip-n">${n}</em></button>`).join('')}</div>`;
}
function evInterval(i){
  if(i.oneShot) return '<span class="bt-dur-pill">仅一次</span>';
  if(i.minInt==null&&i.maxInt==null) return '<em class="bt-none">—</em>';
  const a=i.minInt!=null?Math.round(i.minInt/600):null, b=i.maxInt!=null?Math.round(i.maxInt/600):null;
  const txt=(a!=null&&b!=null)?(a===b?`${a} 周期`:`${a}~${b} 周期`):`${a??b} 周期`;
  return `<span class="bt-dur-pill">${txt}</span>`;
}
function drawEventTable(filter){
  const grid=$('#itemGrid'); if(!grid) return;
  const q=(filter||'').trim().toLowerCase();
  let list=itemsOf('event').filter(i=>i.polarity);
  if(evPol!=='ALL') list=list.filter(i=>i.polarity===evPol);
  if(q) list=list.filter(i=>matchItem(i,q));
  const order={positive:0,neutral:1,negative:2};
  list.sort((a,b)=>(order[a.polarity]??3)-(order[b.polarity]??3));
  if(!list.length){grid.innerHTML='<div class="empty">没有匹配的事件</div>';return;}
  grid.innerHTML=`
    <div class="xt-table" role="table">
      <div class="xt-head" role="row">
        <span role="columnheader">事件名</span>
        <span role="columnheader">重复间隔</span>
        <span role="columnheader">事件描述</span>
        <span role="columnheader">额外效果说明</span>
      </div>
      <div class="xt-body" id="xtBody"></div>
    </div>`;
  const body=$('#xtBody');
  const POL_CN={positive:'正向',neutral:'中性',negative:'负向'};
  list.forEach(i=>{
    const row=document.createElement('div');
    row.className='xt-row';
    row.setAttribute('role','row');
    const pol=i.polarity;
    row.innerHTML=`
      <span class="xt-name" role="cell"><b><i class="ev-dot pol-${esc(pol)}" title="${POL_CN[pol]||'中性'}事件"></i>${esc(i.name)}</b></span>
      <span role="cell">${evInterval(i)}</span>
      <span class="xt-desc" role="cell">${esc(i.desc||'—')}</span>
      <span class="xt-eff" role="cell">${i.effect?esc(i.effect):'<em class="bt-none">—</em>'}</span>`;
    row.addEventListener('click',()=>openDetail(i));
    body.appendChild(row);
  });
}

/* ---------- Buff 速查表：属性增益 / 特殊效果 / 副作用 分列 ---------- */
function drawBuffTable(filter){
  const grid=$('#itemGrid'); if(!grid) return;
  const q=(filter||'').trim().toLowerCase();
  let list=itemsOf('buff').filter(i=>!q||matchItem(i,q));
  grid.innerHTML=`
    <div class="buff-table" role="table">
      <div class="bt-head" role="row">
        <span class="bt-ico" role="columnheader"></span>
        <span class="bt-name" role="columnheader">Buff</span>
        <span class="bt-dur" role="columnheader">时长</span>
        <span class="bt-gain" role="columnheader">属性增益</span>
        <span class="bt-special" role="columnheader">特殊效果</span>
        <span class="bt-side" role="columnheader">副作用</span>
        <span class="bt-src" role="columnheader">来源</span>
      </div>
      <div class="bt-body" id="btBody"></div>
    </div>`;
  const body=$('#btBody');
  if(!list.length){grid.innerHTML='<div class="empty">没有匹配的条目</div>';return;}
  list.forEach(i=>{
    const srcItem=i.srcItem?imap[i.srcItem]:null;
    const row=document.createElement('div');
    row.className='bt-row';
    row.setAttribute('role','row');
    // 来源物品名做成真正的超链接（<a href>）；只有点链接才跳转，卡片其余部分为纯展示。
    // href 与 gotoItem() 构造的地址一致，并交由各页 <base> 统一解析。
    const srcHref=srcItem?`pages/${encodeURIComponent(srcItem.cat)}.html?item=${encodeURIComponent(i.srcItem)}`:'';
    row.innerHTML=`
      <span class="bt-ico" role="cell"></span>
      <span class="bt-name" role="cell"><b>${esc(i.name)}</b><small>${esc((i.tags||[])[0]||'')}</small></span>
      <span class="bt-dur" role="cell"><span class="bt-dur-pill">${esc(i.duration||'—')}</span></span>
      <span class="bt-gain" role="cell">${esc(i.gain||'—')}</span>
      <span class="bt-special" role="cell">${i.special?esc(i.special):'<em class="bt-none">—</em>'}</span>
      <span class="bt-side" role="cell">${i.side?esc(i.side):'<em class="bt-none">—</em>'}</span>
      <span class="bt-src" role="cell">${srcItem?`<a class="bt-link" href="${srcHref}" title="查看来源物品：${esc(srcItem.name)}">${esc(srcItem.name)}<span class="bt-go">↗</span></a>`:'—'}</span>`;
    $('.bt-ico',row).appendChild(slotFor(i,'buff-mini'));
    body.appendChild(row);
  });
}
// 标签区：显示全部普通标签（分类标签带专属配色）+ 可选 DST 来源徽章（无交互功能）
const TAG_CLS={'食材':'tag-ingredient','料理':'tag-dish','调味料':'tag-seasoning','罐头':'tag-canned',
               '咖啡':'tag-coffee','酒水':'tag-wine','汽水':'tag-soda','乳饮':'tag-milk',
               '导弹':'tag-missile','模块':'tag-module',
               '配方卷轴':'tag-recipe','任务卷轴':'tag-quest','情报':'tag-intel','燃料':'tag-fuel',
               '艺术品':'tag-art','凭证':'tag-voucher',
               '正向':'pol-pos','中性':'pol-neu','负向':'pol-neg',
               '渐进':'narr-prog','间歇':'narr-calm','完全随机':'narr-rand','奖励':'tag-reward'};
const GRADE_LABEL={legendary:'传奇',master:'大师',common:'普通'};
function renderTags(item){
  // 怪物：彩色等级标签统一放到底部标签区（取代原卡片上方的独立徽章与"星图怪物"标签）
  const rank=(item.cat==='monster'&&item.rank)
    ?`<span class="tag rank-tag rank-${esc(item.rank)}">${esc(item.rank)} 级</span>`:'';
  const tags=(item.tags||[]).map(t=>`<span class="tag ${TAG_CLS[t]||''}">${esc(t)}</span>`).join('');
  // 战斗装备：按 yaml rarity 显示红/紫/蓝分级徽章（legendary/master/common）
  const grade=(item.cat==='combat'&&item.grade)
    ?`<span class="tag grade-tag grade-${esc(item.grade)}">${esc(GRADE_LABEL[item.grade]||item.grade)}</span>`:'';
  const dst=item.dst?'<span class="tag tag-dst" title="饥荒(DST)移植来源">DST</span>':'';
  return rank+tags+grade+dst;
}
function cardEl(i,g){
  const card=document.createElement('article');
  card.className='item-card'+(i.text?' text-card':'')+(i.isBuff?' buff-card':'')+(i.cat==='narrator'?' narr-card':'');
  card.style.setProperty('--tint',(g&&g.tint)||'#5b8def');
  const tags=renderTags(i);
  // 怪物等级徽章已并入底部标签区（renderTags），标题处不再重复显示
  let rankBadge='';
  if(i.isBuff) rankBadge=`<span class="buff-dur">⏱ ${esc(i.duration||'—')}</span>`;
  // Buff 卡片：来源物品名 + 可点击的小图标索引
  const srcItem=i.isBuff&&i.srcItem?imap[i.srcItem]:null;
  const srcName=srcItem?srcItem.name:'';
  card.innerHTML=`
    <div class="item-media${srcItem?' media-link':''}"${srcItem?` data-goto="${esc(i.srcItem)}" title="点击查看来源物品：${esc(srcName)}"`:''}></div>
    <div class="item-body">
      <h4>${esc(i.name)}${rankBadge}</h4>
      <p>${esc(i.desc||'')}</p>
      ${srcItem?`<div class="buff-src">来自：<b>${esc(srcName)}</b> <span class="src-go">↗ 跳转</span></div>`:''}
      <div class="tags">${tags}</div>
    </div>`;
  const media=$('.item-media',card);
  media.appendChild(slotFor(i));
  // 小图标点击：跳转到来源物品（阻止冒泡，不与卡片详情冲突）
  if(srcItem){
    media.addEventListener('click',e=>{e.stopPropagation();gotoItem(i.srcItem);});
  }
  card.addEventListener('click',()=>openDetail(i));
  return card;
}
function drawCatItems(gid,filter){
  const grid=$('#itemGrid'); if(!grid) return;
  grid.innerHTML='';
  const q=(filter||'').trim().toLowerCase();
  let list=itemsOf(gid).filter(i=>!q||matchItem(i,q));
  // 怪物：等级过滤 + 按 S→F 排序（同级按血量高到低）
  if(gid==='monster'){
    if(monsterRank!=='ALL') list=list.filter(i=>i.rank===monsterRank);
    list.sort((a,b)=>(RANK_ORDER[a.rank]??9)-(RANK_ORDER[b.rank]??9) || (b.hp||0)-(a.hp||0));
  }
  // 美食/饮品：标签过滤 + 默认分类聚集排序（DST 沉底）
  if(TAG_PRIORITY[gid]){
    if(catTag!=='ALL') list=list.filter(i=>(i.tags||[]).includes(catTag));
    list.sort(byCatOrder(gid));
  }
  if(!list.length){grid.innerHTML='<div class="empty">没有匹配的条目</div>';return;}
  const g=gmap[gid];
  list.forEach(i=>grid.appendChild(cardEl(i,g)));
}

/* ---------- 交易页：贸易商类型 + 定价规则 + 声望 ---------- */
function stationCard(s){
  const card=document.createElement('article');
  card.className='station-card';
  card.style.setProperty('--tint',s.kind==='sub'?'#8a6fd0':(s.kind==='blackmarket'?'#c25063':'#3fa37a'));
  const kindLabel=s.kind==='sub'?'子图':(s.kind==='blackmarket'?'黑市':'主图');
  const tags=(s.sellTagCn||[]).slice(0,4).map(t=>`<span class="chip">${esc(t)}</span>`).join('')
    +(s.sellTagCn.length>4?`<span class="chip chip-more">+${s.sellTagCn.length-4}</span>`:'');
  card.innerHTML=`
    <div class="st-top"><h4>${esc(s.name)}</h4>
      <span class="st-kind ${esc(s.kind)}">${kindLabel}</span></div>
    <div class="st-meta">
      <span>星币 ${s.currency[0]} ~ ${s.currency[1]}</span>
      <span>上架 ${s.entries[0]} ~ ${s.entries[1]} 条 · ${s.refresh} 天刷新</span>
    </div>
    <div class="st-tags">${tags||'<span class="chip chip-more">全部商品</span>'}</div>
    <div class="st-foot"><span>货架与收购</span><span class="arrow">→</span></div>`;
  card.addEventListener('click',()=>openStation(s));
  return card;
}
function drawTradePage(g){
  document.title=g.name+' - '+(C.title||'逐鹿星河');
  const mainSt=STATIONS.filter(s=>s.kind!=='sub');
  const subSt=STATIONS.filter(s=>s.kind==='sub');
  const tm=TRADE||{};
  const stage=$('#stage');
  stage.innerHTML=`
    <div class="crumb"><a href="${homeUrl()}">主页</a><span>/</span><b>💰 交易</b></div>
    <section class="section">
      <div class="section-head"><h2>💰 交易</h2>
        <span class="section-tip">共 ${STATIONS.length} 座贸易站点 · 点击站点看货架</span></div>
      <p class="cat-desc">${esc(g.desc||'')}。所有价格、库存、稀有度都由配置驱动：物品先按估值 M 落档，
        买价再叠加站点税收 k、卖价叠加声望 TPI；站点每 ${(tm.config&&tm.config.refresh_days)||'若干'} 天刷新一次货架与星币。回收不设上限，星币是唯一闸门。</p>
      <div class="trade-stats">
        <div class="ts-box"><b>${STATIONS.length}</b><span>贸易站点</span></div>
        <div class="ts-box"><b>${mainSt.length}</b><span>主图站点</span></div>
        <div class="ts-box"><b>${subSt.length}</b><span>子图站点</span></div>
        <div class="ts-box"><b>${(tm.rarity||[]).length}</b><span>稀有度分档</span></div>
      </div>
    </section>
    <section class="section">
      <div class="section-head"><h2>💱 定价与结算</h2></div>
      <div class="rule-grid">
        ${(tm.pricing||[]).map(r=>`<div class="rule-card"><h4>${esc(r.title)}</h4>
          <code class="rule-formula">${esc(r.formula)}</code><p class="rule-note">${esc(r.note)}</p></div>`).join('')}
      </div>
      <div class="sub-head">稀有度分档<span>物品按估值落档后按权重抽取，默认概率合计 100%</span></div>
      <div class="rarity-row">
        ${(tm.rarity||[]).map(r=>`<span class="rarity-chip"><i style="background:${r.color}"></i>
          <b>${esc(r.name)}</b><em>${r.prob}%</em></span>`).join('')}
      </div>
    </section>
    <section class="section">
      <div class="section-head"><h2>🏅 声望</h2><span class="section-tip">捐赠换声望 · 声望提升卖出价</span></div>
      <div class="rep-layout">
        <div class="sub-head">等级与卖价加成 TPI<span>只作用于卖侧，所有站点的出售价都吃加成</span></div>
        <div class="rep-main">
          <div class="rep-wrap">
            <div class="rep-head"><span>等级</span><span>声望阈值</span><span>卖价加成</span></div>
            ${(tm.rep||[]).map(r=>`<div class="rep-row"><span><b>${esc(r.rank)}</b></span>
              <span>${r.thr}</span><span>+${Math.round(r.tpi*100)}%</span></div>`).join('')}
          </div>
        </div>
        <aside class="rep-side">
          <h4>声望捐赠</h4>
          <p>只有美食猎人协会设有捐赠入口，捐出的资源折算成荣誉点，也就是协会声望。</p>
          <ul class="rep-ch">
            <li><b>星币</b><span>200 星币 = 1 点 · 封顶 200 点</span></li>
            <li><b>传奇食材</b><span>每份 +10 点（士气 ≥ 6）· 封顶 100 点</span></li>
            <li><b>普通食材</b><span>每份 +5 点（士气 0~5）· 封顶 30 点</span></li>
          </ul>
        </aside>
      </div>
    </section>
    <section class="section">
      <div class="section-head"><h2>🏪 贸易商类型</h2><span class="section-tip">主图 ${mainSt.length} 座 · 子图 ${subSt.length} 座</span></div>
      <div class="sub-head">主图站点<span>开局所在的星球轨道</span></div>
      <div class="station-grid" id="stMain"></div>
      <div class="sub-head">子图站点<span>跃迁后的小行星带</span></div>
      <div class="station-grid" id="stSub"></div>
    </section>`;
  const m=$('#stMain'), sb=$('#stSub');
  mainSt.forEach(s=>m.appendChild(stationCard(s)));
  subSt.forEach(s=>sb.appendChild(stationCard(s)));
}
/* ---------- 叙事者页：概述 + 三位档案 + 参数对照 ---------- */
function drawNarratorPage(g){
  document.title=g.name+' - '+(C.title||'逐鹿星河');
  const list=itemsOf('narrator');
  const stage=$('#stage');
  stage.innerHTML=`
    <div class="crumb"><a href="${homeUrl()}">主页</a><span>/</span><b>🗣️ 叙事者</b></div>
    <section class="section">
      <div class="section-head"><h2>🗣️ 叙事者</h2>
        <span class="section-tip">共 ${list.length} 位 · 点击卡片看完整档案</span></div>
      <p class="cat-desc">叙事者决定事件什么时候来、来的是好事还是麻烦。三位共用同一套事件池，
        差别只在节奏与配比——不改变事件本身的效果，也不额外加减难度。</p>
      <div class="narr-intro">
        <div class="ni-box"><b>间隔</b><span>每个人有一个开局平均间隔，实际间隔围绕它上下浮动，浮动幅度就是「起伏」。</span></div>
        <div class="ni-box"><b>活跃 / 喘息</b><span>活跃期集中出事件，其余时间进入喘息，间隔按倍率拉长；菲比的间歇最规律。</span></div>
        <div class="ni-box"><b>事件率</b><span>每周期平均抽到的事件次数，越高说明殖民地被打断得越频繁。</span></div>
        <div class="ni-box"><b>负面目标</b><span>事件池里要求负向事件占的比重，越高越容易抽到添麻烦的那一类。</span></div>
      </div>
    </section>
    <section class="section">
      <div class="section-head"><h2>三位叙事者</h2><span class="section-tip">同池 · 不同节奏</span></div>
      <div class="item-grid" id="narrGrid"></div>
    </section>
    <section class="section">
      <div class="section-head"><h2>📊 参数对照</h2><span class="section-tip">开局与长期节奏的量化差异</span></div>
      <div class="nt-wrap">
        <div class="nt-head"><span>叙事者</span><span>节奏</span><span>活跃占比</span><span>事件率</span><span>负面目标</span><span>平均间隔</span></div>
        ${list.map(n=>`<div class="nt-row">
          <span class="nt-name"><b>${esc(n.icon||'')} ${esc(n.name)}</b><small>${esc(n.alias||'')}</small></span>
          <span>${esc(n.style||'')}</span>
          <span>${esc(n.activity||'')}</span>
          <span>${esc(n.rate||'')}</span>
          <span>${esc(n.neg||'')}</span>
          <span>${esc(n.mean||'')}</span>
        </div>`).join('')}
      </div>
      <p class="rule-foot">三位共用同一套事件与同一个事件池；叙事者只改变抽取节奏、负面配比与收尾强度。</p>
    </section>`;
  const box=$('#narrGrid');
  list.forEach(n=>{
    const card=document.createElement('article');
    card.className='item-card narr-card';
    card.style.setProperty('--tint',g.tint||'#d98c3f');
    card.innerHTML=`
      <div class="item-media"><span class="ph-big">${esc(n.icon||'✨')}</span></div>
      <div class="item-body">
        <h4>${esc(n.name)}</h4>
        <p>${esc(n.desc||'')}</p>
        <div class="narr-note"><b>推荐</b>${esc(n.best||'')}</div>
        <div class="narr-note warn"><b>注意</b>${esc(n.warn||'')}</div>
        <div class="tags">${renderTags(n)}</div>
      </div>`;
    card.addEventListener('click',()=>openDetail(n));
    box.appendChild(card);
  });
}
function chipRow(list,cls){
  if(!list||!list.length) return '<em class="bt-none">—</em>';
  return `<div class="chip-row">${list.map(t=>`<span class="chip ${cls||''}">${esc(t)}</span>`).join('')}</div>`;
}
function openStation(s){
  const bd=$('#modalBackdrop'); if(!bd) return;
  $('#modalTitle').textContent=s.name;
  const isSub=s.kind==='sub';
  const kindLabel=isSub?'子图':(s.kind==='blackmarket'?'黑市·主图危险区':'主图');
  const rows=[];
  rows.push(specRow('归属',kindLabel));
  rows.push(specRow('税收 k',`<b>${s.k}</b>（只加到买价）`));
  rows.push(specRow('星币库存',`${s.currency[0]} ~ ${s.currency[1]}`));
  rows.push(specRow('上架条目',`${s.entries[0]} ~ ${s.entries[1]} 条`));
  rows.push(specRow('刷新周期',`${s.refresh} 天（${s.refresh*600} 秒）`));
  if(s.fuel) rows.push(specRow('燃料加注','支持按剩余舱容加注'));
  rows.push(specRow('声望加成','卖价随声望等级 +0~12%'));
  if(s.extra&&Object.keys(s.extra).length){
    const map={master:'大师',legendary:'传奇'};
    rows.push(specRow('必抽条目',Object.entries(s.extra).map(([k,v])=>`${map[k]||k} ×${v}`).join(' · ')));
  }
  if(s.pirate) rows.push(specRow('海盗站特性',
    `有 ${Math.round((s.closeChance||0)*100)}% 概率临时关店 ${s.closeSeconds} 秒`));
  const desc=isSub
    ? `子图站点，只在跃迁到小行星带后遇到。税收 k=${s.k}：买进加价 ${Math.round(s.k*100)}%；卖价另按声望加成 +0~12%，不再扣税。回收不设上限，只受星币约束。越危险的地方，货越好、买价越贵。`
    : `主图站点，挂在开局星球的轨道格上。税收 k=${s.k}：买进加价 ${Math.round(s.k*100)}%；卖价另按声望加成 +0~12%，不再扣税。回收不设上限。`;
  const sellIds=(s.sellItems||[]).map(x=>x.name);
  const accept = (s.acceptTagCn&&s.acceptTagCn.length) ? chipRow(s.acceptTagCn) : '<div class="chip-row"><span class="chip">全部商品</span></div>';
  $('#modalBody').innerHTML=`
    <div class="detail-cat">💰 交易 · ${kindLabel}</div>
    <p class="detail-desc">${esc(desc)}</p>
    <div class="dspec">${rows.join('')}</div>
    <div class="dspec-sec">售卖范围</div>
    ${chipRow(s.sellTagCn)}
    ${sellIds.length?`<div class="st-id-list">指定上架：${sellIds.map(n=>`<span class="chip chip-id">${esc(n)}</span>`).join('')}</div>`:''}
    <div class="dspec-sec">收购范围</div>
    ${accept}
    ${(s.acceptBanTagCn&&s.acceptBanTagCn.length)?`<div class="st-id-list">不收：${s.acceptBanTagCn.map(n=>`<span class="chip chip-ban">${esc(n)}</span>`).join('')}</div>`:''}
    ${copyIdRow({id:s.id})}`;
  bd.hidden=false;
  requestAnimationFrame(()=>bd.classList.add('show'));
  bindCopy($('#modalBody'));
}

/* ---------- 成就页：完整表格 + 无 ID 详情 ---------- */
function drawAchievementPage(g){
  document.title=g.name+' - '+(C.title||'逐鹿星河');
  const stage=$('#stage');
  stage.innerHTML=`
    <div class="crumb"><a href="${homeUrl()}">主页</a><span>/</span><b>🏆 成就</b></div>
    <section class="section">
      <div class="section-head"><h2>🏆 成就</h2>
        <span class="section-tip">共 ${ACH.length} 项 · 点击行看完整说明</span></div>
      <p class="cat-desc">五项成就都注册在游戏原版成就库，达成时弹出「成就达成」通知；除特别标注外不发实物奖励。</p>
      <div class="ach-wrap ach-page">
        <div class="ach-table" role="table">
          <div class="ach-head" role="row">
            <span role="columnheader">成就</span>
            <span role="columnheader">触发方式</span>
            <span role="columnheader">额外奖励</span>
          </div>
          <div class="ach-body">
            ${ACH.map(a=>`<div class="ach-row" role="row" data-ach="${esc(a.id)}">
              <span class="ach-name" role="cell"><b>${esc(a.icon||'🏆')} ${esc(a.name)}</b><small>${esc(a.desc||'')}</small></span>
              <span role="cell">${esc(a.trigger||'')}</span>
              <span class="ach-reward" role="cell">${esc(a.reward||'—')}</span>
            </div>`).join('')}
          </div>
        </div>
      </div>
    </section>`;
  $$('.ach-row',stage).forEach(r=>r.addEventListener('click',()=>openAchDetail(ACH.find(a=>a.id===r.dataset.ach))));
}
function openAchDetail(a){
  if(!a) return;
  const bd=$('#modalBackdrop'), b=$('#modalBody');
  $('#modalTitle').textContent=a.name;
  b.innerHTML=`
    <div class="detail-cat">🏆 成就 · 殖民地成就库</div>
    <p class="detail-desc">${esc(a.desc||'')}</p>
    <div class="dspec">
      ${specRow('触发方式', esc(a.trigger||'—'))}
      ${specRow('额外奖励', esc(a.reward||'—'))}
    </div>
    <p class="detail-note">达成后写入殖民地成就摘要，退役结算时可查。</p>`;
  bd.hidden=false;
  requestAnimationFrame(()=>bd.classList.add('show'));
}

/* ---------- 内容词条页：对原版调整的三列表格 ---------- */
function drawContentPage(g){
  document.title=g.name+' - '+(C.title||'逐鹿星河');
  const stage=$('#stage');
  stage.innerHTML=`
    <div class="crumb"><a href="${homeUrl()}">主页</a><span>/</span><b>📜 内容词条</b></div>
    <section class="section">
      <div class="section-head"><h2>📜 内容词条</h2>
        <span class="section-tip">共 ${CE.length} 项 · 名称 / 变化 / 备注</span></div>
      <p class="cat-desc">逐条列出对原版玩法与内容的调整；没有额外备注的条目以“—”表示。</p>
      <div class="ach-wrap content-page">
        <div class="ach-table" role="table">
          <div class="ach-head" role="row">
            <span role="columnheader">名称</span>
            <span role="columnheader">变化</span>
            <span role="columnheader">备注</span>
          </div>
          <div class="ach-body">
            ${CE.map(e=>`<div class="ach-row" role="row" id="ce-${esc(e.id)}">
              <span class="ach-name" role="cell"><b>${esc(e.name)}</b></span>
              <span role="cell">${esc(e.change||'—')}</span>
              <span class="ach-reward" role="cell">${esc(e.note||'—')}</span>
            </div>`).join('')}
          </div>
        </div>
      </div>
    </section>`;
  const wanted=new URLSearchParams(location.search).get('entry');
  if(wanted){
    const row=document.getElementById('ce-'+wanted);
    if(row){ row.classList.add('ce-focus'); row.scrollIntoView({block:'center'}); }
  }
}

/* ---------- 内容更新页：卡片列表 + 点开详情 ---------- */
let updatePage=1, updatePending=null, updateQueryDone=false;
const UPDATE_PAGE_SIZE=4;
function drawUpdatePage(g){
  document.title=g.name+' - '+(C.title||'逐鹿星河');
  const stage=$('#stage');
  if(!updateQueryDone){
    updateQueryDone=true;
    const qu=new URLSearchParams(location.search).get('update');
    if(qu) updatePending=qu;
  }
  if(updatePending){
    const idx=UPDATES.findIndex(u=>u.id===updatePending);
    if(idx>=0) updatePage=Math.floor(idx/UPDATE_PAGE_SIZE)+1;
  }
  const pages=Math.max(1,Math.ceil(UPDATES.length/UPDATE_PAGE_SIZE));
  updatePage=Math.min(Math.max(1,updatePage),pages);
  const start=(updatePage-1)*UPDATE_PAGE_SIZE;
  const pageItems=UPDATES.slice(start,start+UPDATE_PAGE_SIZE);
  const cards=pageItems.map(u=>`<article class="update-card" data-update="${esc(u.id)}" tabindex="0" role="button">
      <div class="update-side">
        ${u.tag?`<span class="update-tag">${esc(u.tag)}</span>`:''}
        ${u.date?`<time datetime="${esc(u.date)}">${esc(u.date)}</time>`:''}
      </div>
      <div class="update-main">
        <h3>${esc(u.name)}</h3>
        <p class="update-summary">${esc(u.summary||'—')}</p>
      </div>
      <span class="update-more">查看详情 →</span>
    </article>`).join('');
  const pager=UPDATES.length?`<div class="update-pager">
      <button data-page="${updatePage-1}" ${updatePage<=1?'disabled':''}>← 上一页</button>
      <span>第 ${updatePage} / ${pages} 页</span>
      <button data-page="${updatePage+1}" ${updatePage>=pages?'disabled':''}>下一页 →</button>
    </div>`:'';
  stage.innerHTML=`
    <div class="crumb"><a href="${homeUrl()}">主页</a><span>/</span><b>🗞️ 内容更新</b></div>
    <section class="section">
      <div class="section-head"><h2>🗞️ 内容更新</h2>
        <span class="section-tip">共 ${UPDATES.length} 条 · 每页 ${UPDATE_PAGE_SIZE} 条</span></div>
      <p class="cat-desc">版本更新与调整记录。卡片只显示提要，点开后可查看完整说明。</p>
      ${UPDATES.length?`<div class="update-feed">${cards}</div>${pager}`:'<div class="empty">暂无更新记录，请编辑 update/updates.json。</div>'}
    </section>`;
  $$('.update-card',stage).forEach(c=>{
    const open=()=>openUpdateDetail(UPDATES.find(u=>u.id===c.dataset.update));
    c.addEventListener('click',open);
    c.addEventListener('keydown',e=>{
      if(e.key==='Enter'||e.key===' '){ e.preventDefault(); open(); }
    });
  });
  $$('.update-pager button',stage).forEach(btn=>{
    btn.addEventListener('click',()=>{
      const p=Number(btn.dataset.page);
      if(!Number.isFinite(p)||p===updatePage) return;
      updatePage=p;
      drawUpdatePage(g);
      window.scrollTo({top:0,behavior:'smooth'});
    });
  });
  if(updatePending){
    const id=updatePending; updatePending=null;
    setTimeout(()=>openUpdateDetail(UPDATES.find(u=>u.id===id)),120);
  }
}
function openUpdateDetail(u){
  if(!u) return;
  const bd=$('#modalBackdrop'), b=$('#modalBody');
  const m=bd.querySelector('.modal');
  if(m) m.classList.add('update-modal');
  $('#modalTitle').textContent=u.name;
  b.innerHTML=`
    <div class="detail-cat">🗞️ 内容更新${u.tag?` · ${esc(u.tag)}`:''}</div>
    <p class="detail-desc">${esc(u.summary||'')}</p>
    <div class="update-detail">${mdToHtml(u.detail||'—')}</div>
    ${u.date?`<p class="detail-note">更新日期：${esc(u.date)}</p>`:''}`;
  bd.hidden=false;
  requestAnimationFrame(()=>bd.classList.add('show'));
}

/* ---------- 搜索页 ---------- */
let searchScope='all', searchTimer=null;
function drawSearchPage(){
  document.title='🔍 搜索 - '+(C.title||'逐鹿星河');
  const stage=$('#stage');
  stage.innerHTML=`
    <div class="crumb"><a href="${homeUrl()}">主页</a><span>/</span><b>🔍 搜索</b></div>
    <section class="section">
      <div class="section-head"><h2>🔍 搜索图鉴</h2></div>
      <div class="search-bar">
        <input id="searchInput" type="search" placeholder="输入名称、标签或关键词…">
        <div class="scope-switch">
          <button class="scope-btn active" data-scope="all">全部</button>
          ${groups.filter(g=>!['achievement','content','update'].includes(g.id)).map(g=>`<button class="scope-btn" data-scope="${g.id}">${esc(g.name)}</button>`).join('')}
        </div>
      </div>
      <p class="search-meta" id="searchMeta"></p>
      <div id="searchGrid" class="item-grid"></div>
    </section>`;
  $$('.scope-btn',stage).forEach(b=>b.addEventListener('click',()=>{
    searchScope=b.dataset.scope;
    $$('.scope-btn',stage).forEach(x=>x.classList.toggle('active',x===b));
    drawSearchResults($('#searchInput').value);
  }));
  const inp=$('#searchInput');
  inp.addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>drawSearchResults(inp.value),80);});
  drawSearchResults('');
}
function drawSearchResults(q){
  const grid=$('#searchGrid'), meta=$('#searchMeta'); if(!grid) return;
  const query=(q||'').trim().toLowerCase();
  const pool=searchScope==='all'?items:items.filter(i=>i.cat===searchScope);
  const list=query?pool.filter(i=>matchItem(i,query)):pool;
  const scopeName=searchScope==='all'?'全部分类':(gmap[searchScope]||{}).name;
  meta.textContent=query?`在「${scopeName}」中找到 ${list.length} 项匹配「${q}」`:`浏览「${scopeName}」共 ${list.length} 项`;
  grid.innerHTML='';
  if(!list.length){grid.innerHTML='<div class="empty">没有匹配的条目，换个词试试</div>';return;}
  list.forEach(i=>{
    const g=gmap[i.cat]||{};
    const card=document.createElement('article');
    card.className='item-card'+(i.text?' text-card':'');
    card.style.setProperty('--tint',g.tint||'#5b8def');
    card.innerHTML=`
      <div class="item-media"></div>
      <div class="item-body"><div class="item-cat">${esc(g.icon||'')} ${esc(g.name||'')}</div><h4>${esc(i.name)}</h4><p>${esc(i.desc||'')}</p></div>`;
    $('.item-media',card).appendChild(slotFor(i));
    card.addEventListener('click',()=>openDetail(i));
    grid.appendChild(card);
  });
}

/* ---------- 详情弹窗：真实属性（权威源码数值） ---------- */
// 品质 1~6 配色（缺氧原生品质梯度：从普通到极佳）
const QUALITY_CLS={1:'q1',2:'q2',3:'q3',4:'q4',5:'q5',6:'q6'};
const QUALITY_NAME={1:'普通',2:'良好',3:'优质',4:'极佳',5:'卓越',6:'传说'};
const CAL_LABEL={small:'小型',medium:'中型',large:'大型'};
const DRINK_CAT={wine:'酒水',coffee:'咖啡',soda:'汽水',other:'其他饮品'};
const STAT_LABEL={armor_pen_add:'穿甲',armor_damage_mul:'装甲伤害倍率',speed_mul:'火箭速度倍率',
  scouting_bonus:'子图视野',range_bonus:'射程',hp_regen_pct_per_tick:'生命再生/刻',
  shield_regen_pct_per_tick:'护盾再生/刻',fire_rate_mul:'射速倍率',damage_mul:'伤害倍率'};
// 模块插槽分类（可安装位置）：slot_type -> 中文槽位名
const SLOT_LABEL={weapon:'武器槽',defense:'防御槽',utility:'辅助槽',sensor:'感知槽'};
function specRow(k,v,cls){return `<div class="dspec-row"><span class="dspec-k">${esc(k)}</span><span class="dspec-v${cls?' '+cls:''}">${v}</span></div>`;}
// 返回 {html, copyId}：copyId 供点击复制
function detailSpecs(item){
  let rows='';
  if(item.cat==='food'){
    if(item.quality!=null){
      rows+=specRow('品质',`<span class="quality-pill ${QUALITY_CLS[item.quality]||''}">${QUALITY_NAME[item.quality]||('品质 '+item.quality)} · ${item.quality} 级</span>`);
    }
    if(item.kcal!=null) rows+=specRow('卡路里',`<b>${item.kcal}</b> 千卡`);
    if(item.hydration!=null) rows+=specRow('饮水值',`<b>${item.hydration}</b> /kg（按实际食用质量结算）`);
    if(item.buff&&item.buff.name){
      const href=`pages/buff.html?item=${encodeURIComponent('buff_'+item.buff.id)}`;
      rows+=specRow('Buff',`<a class="dspec-link" href="${href}">${esc(item.buff.name)} ↗</a>`);
    }
  }else if(item.cat==='drink'){
    if(item.drinkCat) rows+=specRow('类别',esc(DRINK_CAT[item.drinkCat]||item.drinkCat));
    if(item.hydration!=null) rows+=specRow('饮水值',`<b>${item.hydration}</b>`);
    if(item.buff&&item.buff.name){
      // buff 名做成超链接：跳到 Buff 图鉴对应条目并打开详情
      const href=`pages/buff.html?item=${encodeURIComponent('buff_'+item.buff.id)}`;
      rows+=specRow('Buff',`<a class="dspec-link" href="${href}">${esc(item.buff.name)} ↗</a>`);
    }
    if(item.durationSec!=null){
      const cyc=(item.durationSec/600).toFixed(1).replace(/\.0$/,'');
      rows+=specRow('持续时间',`${item.durationSec} 秒（约 ${cyc} 周期）`);
    }
    if(item.effectText) rows+=specRow('饮用效果',esc(item.effectText));
  }else if(item.cat==='monster'){
    const m=[['等级',item.rank?item.rank+' 级':''],['血量',item.hp],['攻击',item.attack],
      ['护甲',item.armor],['防御',item.defense],['穿甲',item.ap],
      ['攻击间隔',item.interval!=null?item.interval+' 秒/次':''],
      ['攻击范围',item.range],['移动速度',item.speed]];
    m.forEach(([k,v],idx)=>{ if(v!=null&&v!=='') rows+=specRow(k,`<b>${esc(v)}</b>`,idx===0?'dspec-rank':''); });
  }else if(item.cat==='combat'){
    if(item.slotType) rows+=specRow('可安装位置',`<span class="slot-pill slot-${esc(item.slotType)}">${esc(SLOT_LABEL[item.slotType]||item.slotType)}</span>`);
    if(item.caliber) rows+=specRow('口径',esc(CAL_LABEL[item.caliber]||item.caliber));
    if(item.damage!=null) rows+=specRow('伤害',`<b>${item.damage}</b>`);
    if(item.ap!=null) rows+=specRow('穿甲',`<b>${item.ap}</b>`);
    if(item.interval!=null) rows+=specRow('攻击间隔',`${item.interval} 秒/次`);
    if(item.rangeBonus!=null) rows+=specRow('射程加成',`+${item.rangeBonus}`);
    if(item.pellets!=null&&item.pellets>1) rows+=specRow('弹丸数',`${item.pellets} 颗`);
    if(item.tier) rows+=specRow('分级',`<span class="tier-pill tier-${esc(item.tier)}">${esc(item.tier)} 级</span>`);
    if(item.rarity) rows+=specRow('稀有度',esc(GRADE_LABEL[item.rarity]||item.rarity));
    if(item.slots!=null) rows+=specRow('占用槽位',`${item.slots} 槽`);
    if(item.stats){
      Object.entries(item.stats).forEach(([k,v])=>{ rows+=specRow(STAT_LABEL[k]||k,`<b>${v}</b>`); });
    }
  }else if(item.cat==='event'){
    const POL_CN={positive:'正向',neutral:'中性',negative:'负向'};
    if(item.polarity) rows+=specRow('极性',`<span class="pol-pill pol-${esc(item.polarity)}">${POL_CN[item.polarity]||item.polarity}</span>`);
    if(item.oneShot) rows+=specRow('重复','仅触发一次');
    else if(item.minInt!=null){
      const a=Math.round(item.minInt/600), b=Math.round((item.maxInt!=null?item.maxInt:item.minInt)/600);
      rows+=specRow('重复间隔', a===b?`${a} 周期`:`${a} ~ ${b} 周期`);
    }
    rows+=specRow('首次触发', item.start?`第 ${Math.round(item.start/600)} 周期`:'开局即可');
    rows+=specRow('触发方式','按重复间隔自动抽取');
    if(item.durMin!=null){
      const a=Math.round(item.durMin/600), b=Math.round((item.durMax!=null?item.durMax:item.durMin)/600);
      rows+=specRow('持续时长',`${item.durMin}${item.durMax&&item.durMax!==item.durMin?' ~ '+item.durMax:''} 秒（约 ${a===b?a:a+'~'+b} 周期）`);
    }
    if(item.opts&&item.opts.length){
      rows+=`<div class="dspec-sec">抉择</div>`;
      item.opts.forEach(o=>rows+=specRow(o.label, o.default?'<span class="opt-pill">默认</span>':''));
    }
    if(item.effect) rows+=`<div class="dspec-sec">触发效果</div><p class="detail-effect">${esc(item.effect)}</p>`;
  }else if(item.cat==='narrator'){
    if(item.style) rows+=specRow('风格',`<b>${esc(item.style)}</b>`);
    if(item.i0!=null) rows+=specRow('开局平均间隔',`${item.i0} 秒（${(item.i0/600).toFixed(1)} 周期）`);
    if(item.w!=null) rows+=specRow('起伏半宽',`±${Math.round(item.w*100)}%`);
    if(item.r!=null) rows+=specRow('喘息倍数',`${item.r} 倍`);
    if(item.mean) rows+=specRow('平均间隔',esc(item.mean));
    if(item.rate) rows+=specRow('事件率',esc(item.rate));
    if(item.neg) rows+=specRow('负面目标',esc(item.neg));
    if(item.activity) rows+=specRow('活跃状态',esc(item.activity));
  }else if(item.cat==='item'){
    if(item.sources && item.sources.length){
      // 荣誉点等道具：每种来源一行（渠道 / 兑换比例 / 累计上限）
      rows+=`<div class="dspec-sec">获取来源</div>`;
      item.sources.forEach(s=>{
        const cap=(s.cap!=null)?` <span class="src-cap">上限 ${s.cap}</span>`:'';
        rows+=specRow(s.name,`<b>${esc(s.rate)}</b>${cap}`);
      });
    }
  }
  return rows?`<div class="dspec">${rows}</div>`:'';
}
function copyIdRow(item){
  const id=item.gameId||item.id;
  if(!id) return '';
  return `<div class="copy-id"><span class="copy-id-label">物品 ID</span><code class="copy-id-val">${esc(id)}</code><button class="copy-id-btn" data-id="${esc(id)}" title="点击复制 ID">📋 复制</button></div>`;
}
function fallbackCopy(text,done){
  const ta=document.createElement('textarea');
  ta.value=text; ta.style.position='fixed'; ta.style.opacity='0';
  document.body.appendChild(ta); ta.select();
  try{document.execCommand('copy');done();}catch(e){}
  document.body.removeChild(ta);
}
function bindCopy(root){
  const cbtn=$('.copy-id-btn',root||document);
  if(!cbtn) return;
  cbtn.addEventListener('click',()=>{
    const id=cbtn.dataset.id;
    const done=()=>{const old=cbtn.textContent;cbtn.textContent='✅ 已复制';cbtn.classList.add('copied');
      setTimeout(()=>{cbtn.textContent=old;cbtn.classList.remove('copied');},1500);};
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(id).then(done).catch(()=>fallbackCopy(id,done));}
    else fallbackCopy(id,done);
  });
}
/* ---------- 详情弹窗 ---------- */
function openDetail(item){
  const bd=$('#modalBackdrop');
  const g=gmap[item.cat]||{};
  const tags=renderTags(item);
  $('#modalTitle').textContent=item.name;
  const srcItem=item.isBuff&&item.srcItem?imap[item.srcItem]:null;
  // Buff 详情用来源物品贴图；纯说明卡无图；其余用自身贴图
  const canImg=!item.text;
  const imgHtml=canImg?`<div id="modalImg" class="modal-img"><span class="ph">🖼️</span></div>`:'';
  let extra='';
  if(item.isBuff){
    const line=(label,val,cls)=>val?`<div class="bt-detail-row"><span class="bt-detail-k ${cls}">${label}</span><span class="bt-detail-v">${esc(val)}</span></div>`:'';
    extra+=`<div class="bt-detail">
      <p class="detail-note">⏱ 持续时间：<b>${esc(item.duration||'—')}</b></p>
      ${line('属性增益',item.gain,'k-gain')}
      ${line('特殊效果',item.special,'k-special')}
      ${line('副作用',item.side,'k-side')}
    </div>`;
    if(srcItem) extra+=`<button class="btn-jump" id="detailJump">↗ 查看来源物品「${esc(srcItem.name)}」</button>`;
  }
  // 真实属性规格表（食物品质/卡路里、饮品饮水值/Buff链接、怪物血量/攻击、装备数值）
  const specs=detailSpecs(item);
  $('#modalBody').innerHTML=`${imgHtml}
    <div class="detail-cat">${esc(g.icon||'')} ${esc(g.name||'')}</div>
    ${item.isBuff?'':`<p class="detail-desc">${esc(item.desc||'')}</p>`}
    <div class="tags">${tags}</div>
    ${item.text?'<p class="detail-note">✨ 本条目为玩法说明，无独立贴图</p>':''}
    ${specs}
    ${copyIdRow(item)}
    ${extra}`;
  bd.hidden=false;
  requestAnimationFrame(()=>bd.classList.add('show'));
  const jump=$('#detailJump');
  if(jump&&srcItem) jump.addEventListener('click',()=>{closeModal();setTimeout(()=>gotoItem(item.srcItem),200);});
  bindCopy($('#modalBody'));
  if(canImg){
    const renderItem=srcItem||item;
    const entry=datmap[renderItem.id];
    if(entry) RB.decode(entry).then(cv=>{const box=$('#modalImg');if(box){box.innerHTML='';cv.className='detail-canvas';box.appendChild(cv);}}).catch(()=>{});
  }
}
function gidRank(item){
  if(item.cat!=='monster'||!item.rank) return '';
  return `等级 ${item.rank} 级`;
}
function closeModal(){
  const bd=$('#modalBackdrop');
  const m=bd.querySelector('.modal');
  if(m) m.classList.remove('update-modal');
  bd.classList.remove('show');
  setTimeout(()=>{bd.hidden=true;},180);
}

/* ---------- 顶栏事件 ---------- */
const DONATE_URL='https://afdian.com/a/TQYNS?utm_source=copylink&utm_medium=link';
const WORKSHOP_URL='https://steamcommunity.com/sharedfiles/filedetails/?id=3794321811';
async function copyText(text){
  try{ await navigator.clipboard.writeText(text); return true; }catch(e){}
  const ta=document.createElement('textarea');
  ta.value=text; ta.style.position='fixed'; ta.style.opacity='0';
  document.body.appendChild(ta); ta.select();
  let ok=false;
  try{ ok=document.execCommand('copy'); }catch(e){}
  ta.remove();
  return ok;
}
function openDonate(){
  const bd=$('#modalBackdrop'), b=$('#modalBody');
  $('#modalTitle').textContent='💖 捐助支持';
  b.innerHTML=`
    <div class="donate-box">
      <p class="donate-thanks">感谢您支持作者持续开发。你的每一份捐助都会用于后续内容制作、测试与维护。</p>
      <a class="donate-link" href="${DONATE_URL}" target="_blank" rel="noopener noreferrer">${esc(DONATE_URL)}</a>
      <div class="donate-actions">
        <button class="btn-primary" id="donateCopy">复制</button>
        <a class="btn-primary" href="${DONATE_URL}" target="_blank" rel="noopener noreferrer">跳转</a>
      </div>
      <p class="donate-note">如果按钮无法打开，可复制链接后在浏览器中访问。</p>
    </div>`;
  bd.hidden=false;
  requestAnimationFrame(()=>bd.classList.add('show'));
  const btn=$('#donateCopy');
  if(btn) btn.addEventListener('click',async()=>{
    const ok=await copyText(DONATE_URL);
    btn.textContent=ok?'已复制':'复制失败';
    setTimeout(()=>{btn.textContent='复制';},1600);
  });
}
function openWorkshop(){
  const bd=$('#modalBackdrop'), b=$('#modalBody');
  $('#modalTitle').textContent='🛠️ 工坊 / 反馈';
  b.innerHTML=`
    <div class="donate-box">
      <p class="donate-thanks">如果喜欢我的Mod，欢迎在创意工坊点赞、收藏、订阅，让更多玩家看到这个模组。</p>
      <p class="donate-thanks">反馈与交流群：<b>1107723160</b>（QQ 群）</p>
      <a class="donate-link" href="${WORKSHOP_URL}" target="_blank" rel="noopener noreferrer">${esc(WORKSHOP_URL)}</a>
      <div class="donate-actions">
        <button class="btn-primary" id="workshopCopy">复制</button>
        <a class="btn-primary" href="${WORKSHOP_URL}" target="_blank" rel="noopener noreferrer">跳转</a>
      </div>
      <p class="donate-note">感谢每一位订阅、点赞和反馈的玩家。</p>
    </div>`;
  bd.hidden=false;
  requestAnimationFrame(()=>bd.classList.add('show'));
  const btn=$('#workshopCopy');
  if(btn) btn.addEventListener('click',async()=>{
    const ok=await copyText(WORKSHOP_URL);
    btn.textContent=ok?'已复制':'复制失败';
    setTimeout(()=>{btn.textContent='复制';},1600);
  });
}
function bindTop(){
  const dbtn=$('#donateBtn');
  if(dbtn) dbtn.addEventListener('click',e=>{e.stopPropagation();openDonate();});
  const wbtn=$('#workshopBtn');
  if(wbtn) wbtn.addEventListener('click',e=>{e.stopPropagation();openWorkshop();});
  const tbtn=$('#themeBtn');
  if(tbtn) tbtn.addEventListener('click',e=>{e.stopPropagation();$('#themeMenu').classList.toggle('open');});
  document.addEventListener('click',()=>{const m=$('#themeMenu');if(m)m.classList.remove('open');});
  const menu=$('#themeMenu'); if(menu) menu.addEventListener('click',e=>e.stopPropagation());
  const bd=$('#modalBackdrop');
  if(bd){
    bd.addEventListener('click',e=>{if(e.target===bd)closeModal();});
    const mc=$('#modalClose'); if(mc) mc.addEventListener('click',closeModal);
  }
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&bd&&!bd.hidden)closeModal();});
}

/* ---------- 启动 ---------- */
async function boot(){
  initTheme();
  const qp=new URLSearchParams(location.search);
  const tp=qp.get('theme');
  if(tp&&THEMES.some(t=>t.id===tp)) applyTheme(tp);
  await loadUpdates();
  renderSidebar();
  bindTop();
  // 事件页极性直达：event.html?pol=positive|neutral|negative
  if(PAGE==='cat'&&CAT==='event'){
    const p=qp.get('pol');
    if(p&&['positive','neutral','negative'].includes(p)) evPol=p;
  }
  // 加密重建提示按用户要求不展示（验签重建仍在后台自动进行）
  // const note=$('#secureNote');
  // if(note) note.textContent=`🔒 ${RB.items().length} 张贴图已加密存储，页面打开时自动验签并重建 · 无需任何输入`;
  if(PAGE==='cat') drawCat(CAT);
  else if(PAGE==='search') drawSearchPage();
  else drawHome();
  // 成就页直达：achievement.html?item=<成就 id>
  if(PAGE==='cat'&&CAT==='achievement'){
    const qa=ACH.find(a=>a.id===qp.get('item'));
    if(qa) setTimeout(()=>openAchDetail(qa),140);
  }
  // 跨页物品索引：?item=<id> 落地后自动打开对应物品详情
  const qi=qp.get('item');
  if(qi&&imap[qi]) setTimeout(()=>openDetail(imap[qi]),120);
  // 贸易站点直达：trade.html?station=<id>
  const qs=qp.get('station');
  if(qs&&smap[qs]) setTimeout(()=>openStation(smap[qs]),150);
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
else boot();
})();
