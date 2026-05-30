let trigBoxBoard=null;
const graphBoards={};
let sectionsData=[];
let problemsData=[];
const LAST_SECTION_KEY='math-note:last-section';

function hasSection(id){
  return sectionsData.some(section=>section.id===id);
}

function saveLastSection(id){
  try{
    localStorage.setItem(LAST_SECTION_KEY,id);
  }catch(error){
    console.warn('Failed to save last section:',error);
  }
}

function getStoredSection(){
  try{
    return localStorage.getItem(LAST_SECTION_KEY);
  }catch(error){
    return null;
  }
}

function setSectionHash(id){
  const nextHash=`#${encodeURIComponent(id)}`;
  if(window.location.hash===nextHash) return;
  history.replaceState(null,'',nextHash);
}

function getHashSection(){
  const raw=window.location.hash.replace(/^#/,'');
  if(!raw) return null;
  const route=decodeURIComponent(raw).split(/[?&]/)[0];
  if(route.startsWith('problem/')) return null;
  return route.split('/')[0];
}

function getHashProblemId(){
  const raw=window.location.hash.replace(/^#/,'');
  if(!raw) return null;
  const route=decodeURIComponent(raw).split(/[?&]/)[0];
  return route.startsWith('problem/') ? route.slice('problem/'.length) : null;
}

function show(id,options={}){
  if(!hasSection(id)) id='ov';
  const {scrollTop=true,persist=true,updateHash=true}=options;
  document.querySelectorAll('.sec').forEach(s=>s.classList.remove('on'));
  document.querySelector('[data-problem-view]')?.classList.remove('on');
  document.querySelectorAll('.nb').forEach(b=>b.classList.remove('on'));
  document.getElementById(id)?.classList.add('on');
  document.querySelector(`.nb[data-section="${id}"]`)?.classList.add('on');
  if(persist) saveLastSection(id);
  if(updateHash) setSectionHash(id);
  if(id==='trig') initTrigBoxGraph();
  if(id==='dif') initDifferentialGraphs();
  if(id==='int') initIntegralGraphs();
  if(scrollTop) window.scrollTo({top:0,behavior:'smooth'});
}

function normalizeTitle(value){
  return (value || '')
    .replace(/\$/g,'')
    .replace(/\\[a-zA-Z]+/g,'')
    .replace(/[^\p{L}\p{N}가-힣]+/gu,'')
    .toLowerCase();
}

function escapeHtml(value){
  return String(value ?? '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}

function problemHref(id){
  return `#problem/${encodeURIComponent(id)}`;
}

function targetSectionFromOverviewTitle(title){
  if(title.includes('지수') || title.includes('로그')) return 'exp';
  if(title.includes('삼각')) return 'trig';
  if(title.includes('수열')) return 'seq';
  if(title.includes('극한') || title.includes('연속')) return 'lim';
  if(title.includes('미분')) return 'dif';
  if(title.includes('적분')) return 'int';
  return 'ov';
}

function findCardForOverviewItem(itemTitle,sectionId){
  const itemKey=normalizeTitle(itemTitle);
  if(!itemKey) return null;
  const cards=[...document.querySelectorAll(`#${sectionId} .card`)];
  return cards.find(card=>{
    const cardKey=normalizeTitle(card.querySelector('.ct')?.textContent || '');
    return cardKey && (cardKey.includes(itemKey) || itemKey.includes(cardKey));
  }) || null;
}

function enhanceOverviewLinks(){
  document.querySelectorAll('#ov .ovc').forEach(group=>{
    const sectionId=targetSectionFromOverviewTitle(group.querySelector('.ovc-t')?.textContent || '');
    group.querySelectorAll('.ovi').forEach(item=>{
      const label=item.querySelector('span:first-child')?.textContent || '';
      const targetCard=findCardForOverviewItem(label,sectionId);
      item.dataset.sectionTarget=sectionId;
      item.tabIndex=0;
      item.setAttribute('role','button');
      item.setAttribute('title',targetCard ? `${label}로 이동` : `${sectionId} 단원으로 이동`);

      const go=()=>{
        show(sectionId,{scrollTop:!targetCard});
        if(targetCard){
          requestAnimationFrame(()=>{
            targetCard.scrollIntoView({behavior:'smooth',block:'start'});
          });
        }
      };
      item.addEventListener('click',go);
      item.addEventListener('keydown',event=>{
        if(event.key==='Enter' || event.key===' '){
          event.preventDefault();
          go();
        }
      });
    });
  });
}

function getCardConcept(card){
  const sectionId=card.closest('.sec')?.id || '';
  const title=card.querySelector('.ct')?.textContent?.trim() || '';
  const conceptId=`${sectionId}-${normalizeTitle(title)}`;
  card.dataset.conceptId=conceptId;
  return {sectionId,title,conceptId};
}

function problemMatchesConcept(problem,concept){
  if(problem.sectionId && problem.sectionId!==concept.sectionId) return false;
  if(problem.conceptId && problem.conceptId===concept.conceptId) return true;
  if(problem.conceptTitle){
    const problemTitle=normalizeTitle(problem.conceptTitle);
    const cardTitle=normalizeTitle(concept.title);
    return Boolean(problemTitle && cardTitle && (problemTitle.includes(cardTitle) || cardTitle.includes(problemTitle)));
  }
  return false;
}

function getProblemsForConcept(concept){
  return problemsData.filter(problem=>problemMatchesConcept(problem,concept));
}

function injectProblemLinks(){
  document.querySelectorAll('.sec:not(#ov) .card').forEach(card=>{
    card.querySelector('.examples')?.remove();
    const concept=getCardConcept(card);
    const problems=getProblemsForConcept(concept);
    if(!problems.length) return;

    const details=document.createElement('details');
    details.className='examples';
    details.innerHTML=[
      '<summary>예시문제</summary>',
      '<ol class="example-list">',
      ...problems.map(problem=>(
        `<li><a href="${problemHref(problem.id)}">${escapeHtml(problem.title)}</a></li>`
      )),
      '</ol>'
    ].join('');
    card.appendChild(details);
  });
}

function problemImageMarkup(src,alt){
  if(!src) return '';
  return `<img class="problem-img" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy">`;
}

function renderProblem(problemId){
  const problem=problemsData.find(item=>item.id===problemId);
  const problemView=document.querySelector('[data-problem-view]');
  if(!problemView) return;

  document.querySelectorAll('.sec').forEach(section=>section.classList.remove('on'));
  document.querySelectorAll('.nb').forEach(button=>button.classList.remove('on'));
  problemView.classList.add('on');

  if(!problem){
    problemView.innerHTML=[
      '<div class="problem-topbar">',
      '<button class="mini-btn" type="button" data-home>홈</button>',
      '</div>',
      '<div class="card">',
      '<div class="ct">문제를 찾을 수 없습니다.</div>',
      '<div class="cb2">data/problems.json의 id를 확인해 주세요.</div>',
      '</div>'
    ].join('');
    problemView.querySelector('[data-home]')?.addEventListener('click',()=>show(getStoredSection() || 'ov'));
    window.scrollTo({top:0,behavior:'smooth'});
    return;
  }

  const sameConcept=problemsData.filter(item=>(
    item.id!==problem.id &&
    item.sectionId===problem.sectionId &&
    ((problem.conceptId && item.conceptId===problem.conceptId) ||
      (problem.conceptTitle && normalizeTitle(item.conceptTitle)===normalizeTitle(problem.conceptTitle)))
  ));
  const backSection=problem.sectionId || getStoredSection() || 'ov';
  const solutionBody=problem.solutionHtml || problemImageMarkup(problem.solutionImage,`${problem.title} 해설`);

  problemView.innerHTML=[
    '<div class="problem-topbar">',
    '<button class="mini-btn" type="button" data-home>홈</button>',
    `<button class="mini-btn" type="button" data-back-section>${escapeHtml((sectionsData.find(section=>section.id===backSection)?.nav || '단원'))}로 돌아가기</button>`,
    '</div>',
    '<article class="problem-page">',
    `<div class="problem-meta">${escapeHtml(problem.conceptTitle || '')}</div>`,
    `<h2>${escapeHtml(problem.title)}</h2>`,
    problemImageMarkup(problem.problemImage,`${problem.title} 문제`),
    solutionBody ? `<details class="solution-box"><summary>풀이 보기</summary><div class="solution-body">${solutionBody}</div></details>` : '',
    sameConcept.length ? [
      '<div class="related-problems">',
      '<div class="related-title">같은 개념의 다른 예시문제</div>',
      '<ol class="example-list">',
      ...sameConcept.map(item=>`<li><a href="${problemHref(item.id)}">${escapeHtml(item.title)}</a></li>`),
      '</ol>',
      '</div>'
    ].join('') : '',
    '</article>'
  ].join('');

  problemView.querySelector('[data-home]')?.addEventListener('click',()=>show('ov'));
  problemView.querySelector('[data-back-section]')?.addEventListener('click',()=>show(backSection));
  renderMath();
  window.scrollTo({top:0,behavior:'smooth'});
}

function routeFromHash(){
  const problemId=getHashProblemId();
  if(problemId){
    renderProblem(problemId);
    return;
  }
  show(getHashSection() || getStoredSection() || sectionsData[0]?.id || 'ov',{scrollTop:false});
}

function renderMath(){
  if(typeof renderMathInElement!=='function') return;
  renderMathInElement(document.body,{
    delimiters:[
      {left:'$$',right:'$$',display:true},
      {left:'$',right:'$',display:false}
    ],
    throwOnError:false
  });
}

function renderSite(data){
  sectionsData=data.sections || [];
  const nav=document.querySelector('[data-nav]');
  const main=document.querySelector('[data-main]');
  if(!nav || !main) return;

  nav.innerHTML=sectionsData.map((section,index)=>(
    `<button class="nb${index===0?' on':''}" data-section="${section.id}" type="button">${section.nav}</button>`
  )).join('');

  main.innerHTML=[
    ...sectionsData.map((section,index)=>(
      index===0 ? section.html.replace('class="sec"', 'class="sec on"') : section.html
    )),
    '<section class="problem-view" data-problem-view></section>'
  ].join('\n');

  nav.querySelectorAll('.nb').forEach(button=>{
    button.addEventListener('click',()=>show(button.dataset.section));
  });

  renderMath();
  injectProblemLinks();
  enhanceOverviewLinks();
  routeFromHash();
}

async function loadSite(){
  const main=document.querySelector('[data-main]');
  try{
    const [siteResponse,problemsResponse]=await Promise.all([
      fetch('data/site.json'),
      fetch('data/problems.json')
    ]);
    if(!siteResponse.ok) throw new Error(`site.json HTTP ${siteResponse.status}`);
    if(!problemsResponse.ok) throw new Error(`problems.json HTTP ${problemsResponse.status}`);
    const [siteData,problemData]=await Promise.all([
      siteResponse.json(),
      problemsResponse.json()
    ]);
    problemsData=problemData.problems || [];
    renderSite(siteData);
  }catch(error){
    if(main){
      main.innerHTML='<div class="card"><div class="ct">콘텐츠를 불러오지 못했습니다.</div><div class="cb2">로컬에서 파일을 직접 열었다면 간단한 웹 서버로 실행해 주세요.</div></div>';
    }
    console.error('Failed to load site data:',error);
  }
}

function initTrigBoxGraph(){
  if(trigBoxBoard || typeof JXG==='undefined') return;

  const pi=Math.PI;
  const board=JXG.JSXGraph.initBoard('trig-box-board',{
    boundingbox:[-0.35,1.35,6.65,-1.5],
    axis:false,
    showNavigation:false,
    showCopyright:false,
    keepaspectratio:false,
    pan:{enabled:false},
    zoom:{enabled:false},
    resize:{enabled:true}
  });
  trigBoxBoard=board;

  const fixed={fixed:true,highlight:false};
  const line={...fixed,strokeColor:'#888899',strokeWidth:1,dash:2};
  const axis={...fixed,strokeColor:'#3a3a50',strokeWidth:1.2};
  const label={...fixed,strokeColor:'#888899',fontSize:11,anchorX:'middle',anchorY:'middle'};
  const gold={...fixed,strokeColor:'#f7c26a',fontSize:12,anchorX:'middle',anchorY:'middle'};

  function segment(a,b,attrs){board.create('segment',[a,b],attrs);}
  function box(x1,x2,y1,y2){
    const pts=[[x1,y1],[x2,y1],[x2,y2],[x1,y2]].map(p=>board.create('point',p,{visible:false,fixed:true}));
    board.create('polygon',pts,{
      ...fixed,
      fillColor:'#7c6af7',
      fillOpacity:0.08,
      borders:{strokeColor:'rgba(124,106,247,.45)',strokeWidth:1,highlight:false}
    });
  }

  box(0,pi/2,0,1);
  box(pi/2,pi,0,1);
  box(pi,3*pi/2,-1,0);
  box(3*pi/2,2*pi,-1,0);

  segment([-0.15,0],[2*pi+0.15,0],axis);
  segment([-0.15,1],[2*pi+0.15,1],line);
  segment([-0.15,-1],[2*pi+0.15,-1],line);
  [0,pi/2,pi,3*pi/2,2*pi].forEach(x=>segment([x,-1.15],[x,1.15],line));

  board.create('functiongraph',[x=>Math.sin(x),0,2*pi],{
    ...fixed,
    strokeColor:'#7c6af7',
    strokeWidth:2.4,
    doAdvancedPlot:true,
    numberPointsHigh:900
  });

  segment([-0.12,1],[pi+0.12,1],{...fixed,strokeColor:'#6af7c2',strokeWidth:1,dash:2});

  [
    [0,1.22,'0'],[pi/2,1.22,'π/2'],[pi,1.22,'π'],[3*pi/2,1.22,'3π/2'],[2*pi,1.22,'2π'],
    [pi/4,-1.28,'①'],[3*pi/4,-1.28,'②'],[5*pi/4,-1.28,'③'],[7*pi/4,-1.28,'④']
  ].forEach(([x,y,t])=>board.create('text',[x,y,t],label));

  [[pi/4,0.62],[3*pi/4,0.62],[5*pi/4,-0.62],[7*pi/4,-0.62]]
    .forEach(([x,y])=>board.create('text',[x,y,'합동'],gold));

  board.update();
}

function initGraphBoard(id,boundingbox){
  if(graphBoards[id] || typeof JXG==='undefined') return null;
  const board=JXG.JSXGraph.initBoard(id,{
    boundingbox,
    axis:false,
    showNavigation:false,
    showCopyright:false,
    keepaspectratio:false,
    pan:{enabled:false},
    zoom:{enabled:false},
    resize:{enabled:true}
  });
  graphBoards[id]=board;
  return board;
}

function drawCalcGraph(board,fn,x1,x2,color){
  return board.create('functiongraph',[fn,x1,x2],{
    fixed:true,
    highlight:false,
    strokeColor:color,
    strokeWidth:2.5,
    doAdvancedPlot:true,
    numberPointsHigh:900
  });
}

function seg(board,a,b,attrs={}){
  return board.create('segment',[a,b],{fixed:true,highlight:false,...attrs});
}

function calcText(board,x,y,t,attrs={}){
  return board.create('text',[x,y,t],{
    fixed:true,
    highlight:false,
    strokeColor:'#888899',
    fontSize:11,
    anchorX:'middle',
    anchorY:'middle',
    ...attrs
  });
}

function calcPoint(board,x,y,color,label,labelDx=0,labelDy=0){
  const p=board.create('point',[x,y],{
    fixed:true,
    highlight:false,
    name:'',
    size:4,
    strokeColor:color,
    fillColor:color
  });
  if(label) calcText(board,x+labelDx,y+labelDy,label,{strokeColor:color,fontSize:11});
  return p;
}

function dashedV(board,x,y1,y2){
  seg(board,[x,y1],[x,y2],{strokeColor:'#888899',strokeWidth:1,dash:2});
}

function filledArea(board,fn,a,b,base,color,opacity=0.13,steps=44){
  const pts=[];
  pts.push(board.create('point',[a,base],{visible:false,fixed:true}));
  for(let i=0;i<=steps;i++){
    const x=a+(b-a)*i/steps;
    pts.push(board.create('point',[x,fn(x)],{visible:false,fixed:true}));
  }
  pts.push(board.create('point',[b,base],{visible:false,fixed:true}));
  board.create('polygon',pts,{
    fixed:true,
    highlight:false,
    fillColor:color,
    fillOpacity:opacity,
    borders:{visible:false,highlight:false}
  });
}

function initDifferentialGraphs(){
  initCubicStandardGraph();
  initCubicRatioGraph();
  initCubicRoot3Graph();
  initParameterCountGraph();
  initQuartic31Graph();
  initQuarticWGraph();
}

function initIntegralGraphs(){
  initIntegralSixthGraph();
  initIntegralTwelfthGraph();
  initIntegralFunctionGraph();
}

function initCubicStandardGraph(){
  const board=initGraphBoard('cubic-standard-board',[-2.35,2.9,2.35,-2.9]);
  if(!board) return;
  const f=x=>x*x*x-3*x;
  const r=Math.sqrt(3);
  seg(board,[-2.15,0],[2.15,0],{strokeColor:'#3a3a50',strokeWidth:1.2});
  seg(board,[0,-2.55],[0,2.55],{strokeColor:'#888899',strokeWidth:1,dash:2});
  seg(board,[-2.15,2],[2.15,2],{strokeColor:'#f7c26a',strokeWidth:1,dash:2});
  seg(board,[-2.15,-2],[2.15,-2],{strokeColor:'#f76a9a',strokeWidth:1,dash:2});
  [-r,-1,1,r].forEach(x=>dashedV(board,x,-2.55,2.55));
  drawCalcGraph(board,f,-2.05,2.05,'#7c6af7');
  calcPoint(board,-1,2,'#f7c26a','극대',-.18,.35);
  calcPoint(board,1,-2,'#f7c26a','극소',.2,-.35);
  calcPoint(board,0,0,'#7c6af7','변곡점',.35,.35);
  calcPoint(board,-r,0,'#6af7c2','교점',-.18,.35);
  calcPoint(board,r,0,'#6af7c2','교점',.18,.35);
  seg(board,[-1,-2.55],[0,-2.55],{strokeColor:'#f7c26a',strokeWidth:1.4});
  seg(board,[0,-2.55],[1,-2.55],{strokeColor:'#f7c26a',strokeWidth:1.4});
  calcText(board,-.5,-2.72,'d',{strokeColor:'#f7c26a'});
  calcText(board,.5,-2.72,'d',{strokeColor:'#f7c26a'});
  seg(board,[-r,2.55],[0,2.55],{strokeColor:'#6af7c2',strokeWidth:1.4});
  seg(board,[0,2.55],[r,2.55],{strokeColor:'#6af7c2',strokeWidth:1.4});
  calcText(board,-.86,2.72,'√3d',{strokeColor:'#6af7c2'});
  calcText(board,.86,2.72,'√3d',{strokeColor:'#6af7c2'});
}

function initCubicRatioGraph(){
  const board=initGraphBoard('cubic-ratio-board',[-.7,1.25,3.8,-4.9]);
  if(!board) return;
  const f=x=>x*x*(x-3);
  seg(board,[-.55,0],[3.6,0],{strokeColor:'#3a3a50',strokeWidth:1.2});
  [0,2,3].forEach(x=>dashedV(board,x,-4.55,.9));
  drawCalcGraph(board,f,-.45,3.55,'#7c6af7');
  calcPoint(board,0,0,'#6af7c2','α(접점)',-.18,-.45);
  calcPoint(board,2,-4,'#f7c26a','극점',.05,-.42);
  calcPoint(board,3,0,'#6af7c2','β(교점)',.2,-.45);
  seg(board,[0,.82],[2,.82],{strokeColor:'#f7c26a',strokeWidth:1.4});
  seg(board,[2,.82],[3,.82],{strokeColor:'#6af7c2',strokeWidth:1.4});
  calcText(board,1,1.02,'← 2d →',{strokeColor:'#f7c26a'});
  calcText(board,2.5,1.02,'← d →',{strokeColor:'#6af7c2'});
  calcText(board,1.1,-4.45,'극점 x = (2β + α) / 3',{strokeColor:'#a9a0f0',fontSize:12});
}

function initCubicRoot3Graph(){
  const board=initGraphBoard('cubic-root3-board',[-2.25,2.75,2.25,-2.75]);
  if(!board) return;
  const f=x=>x*x*x-3*x;
  const r=Math.sqrt(3);
  seg(board,[-2.05,0],[2.05,0],{strokeColor:'#3a3a50',strokeWidth:1.2});
  seg(board,[0,-2.45],[0,2.45],{strokeColor:'#888899',strokeWidth:1,dash:2});
  seg(board,[-2.05,2],[2.05,2],{strokeColor:'#f7c26a',strokeWidth:1,dash:2});
  seg(board,[-2.05,-2],[2.05,-2],{strokeColor:'#f76a9a',strokeWidth:1,dash:2});
  drawCalcGraph(board,f,-2,2,'#6af7c2');
  calcPoint(board,-1,2,'#f7c26a','극대',-.18,.34);
  calcPoint(board,1,-2,'#f7c26a','극소',.2,-.34);
  calcPoint(board,0,0,'#7c6af7','변곡',.28,-.28);
  calcPoint(board,-r,0,'#6af7c2','교점',-.16,.33);
  calcPoint(board,r,0,'#6af7c2','교점',.16,.33);
  seg(board,[-1,-.65],[0,-.65],{strokeColor:'#f7c26a',strokeWidth:1.4});
  seg(board,[0,-.65],[1,-.65],{strokeColor:'#f7c26a',strokeWidth:1.4});
  calcText(board,-.5,-.86,'1',{strokeColor:'#f7c26a'});
  calcText(board,.5,-.86,'1',{strokeColor:'#f7c26a'});
  seg(board,[-r,.68],[0,.68],{strokeColor:'#6af7c2',strokeWidth:1.4});
  seg(board,[0,.68],[r,.68],{strokeColor:'#6af7c2',strokeWidth:1.4});
  calcText(board,-.86,.9,'√3',{strokeColor:'#6af7c2'});
  calcText(board,.86,.9,'√3',{strokeColor:'#6af7c2'});
}

function initParameterCountGraph(){
  const board=initGraphBoard('parameter-count-board',[-2.55,2.65,3.2,-3.45]);
  if(!board) return;
  const f=x=>x*x*x-3*x;
  seg(board,[-2.25,0],[2.25,0],{strokeColor:'#3a3a50',strokeWidth:1});
  seg(board,[-2.25,-3],[2.25,-3],{strokeColor:'#3a3a50',strokeWidth:1});
  seg(board,[-2.25,2],[2.25,2],{strokeColor:'#f76a9a',strokeWidth:1,dash:2,opacity:.65});
  seg(board,[-2.25,0],[2.25,0],{strokeColor:'#f76a9a',strokeWidth:1.6,dash:2});
  seg(board,[-2.25,-2],[2.25,-2],{strokeColor:'#f76a9a',strokeWidth:1,dash:2,opacity:.65});
  drawCalcGraph(board,f,-2.15,2.15,'#f7c26a');
  calcPoint(board,-1,2,'#f7c26a','');
  calcPoint(board,1,-2,'#f7c26a','');
  [-Math.sqrt(3),0,Math.sqrt(3)].forEach(x=>calcPoint(board,x,0,'#f76a9a',''));
  calcText(board,2.35,2,'k=극댓값',{anchorX:'left'});
  calcText(board,2.35,0,'k=중간값',{strokeColor:'#f76a9a',anchorX:'left'});
  calcText(board,2.35,-2,'k=극솟값',{anchorX:'left'});
  calcText(board,-1.85,-3.2,'y=f(x)',{anchorX:'left'});
  calcText(board,-2.25,2.9,'y',{strokeColor:'#6af7c2'});
}

function initQuartic31Graph(){
  const board=initGraphBoard('quartic-31-board',[-.9,2.0,4.75,-6.45]);
  if(!board) return;
  const f=x=>.08*x*x*x*(x-4);
  seg(board,[-.65,0],[4.5,0],{strokeColor:'#3a3a50',strokeWidth:1.2});
  [0,3,4].forEach(x=>dashedV(board,x,-5.8,1.25));
  drawCalcGraph(board,f,-.75,4.55,'#7c6af7');
  calcPoint(board,0,0,'#6af7c2','α(3중근)',-.1,-.55);
  calcPoint(board,3,f(3),'#f7c26a','극소',.08,-.55);
  calcPoint(board,4,0,'#6af7c2','β',.15,-.45);
  seg(board,[0,1.25],[3,1.25],{strokeColor:'#f7c26a',strokeWidth:1.4});
  seg(board,[3,1.25],[4,1.25],{strokeColor:'#6af7c2',strokeWidth:1.4});
  calcText(board,1.5,1.52,'← 3d →',{strokeColor:'#f7c26a'});
  calcText(board,3.5,1.52,'← d →',{strokeColor:'#6af7c2'});
  calcText(board,1.7,-6.05,'극소 x = (3β+α)/4 = α + 3(β-α)/4',{strokeColor:'#a9a0f0',fontSize:12});
}

function initQuarticWGraph(){
  const board=initGraphBoard('quartic-w-board',[-1.8,.42,1.8,-1.45]);
  if(!board) return;
  const f=x=>x*x*x*x-2*x*x;
  const r=Math.sqrt(2);
  seg(board,[-1.65,0],[1.65,0],{strokeColor:'#3a3a50',strokeWidth:1.2});
  seg(board,[-1.65,-1],[1.65,-1],{strokeColor:'#3a3a50',strokeWidth:1});
  [ -r,-1,0,1,r ].forEach(x=>dashedV(board,x,-1.25,.25));
  drawCalcGraph(board,f,-1.65,1.65,'#6af7c2');
  calcPoint(board,0,0,'#7c6af7','극대',0,.22);
  calcPoint(board,-1,-1,'#f7c26a','극소',-.08,-.24);
  calcPoint(board,1,-1,'#f7c26a','극소',.08,-.24);
  calcPoint(board,-r,0,'#6af7c2','교점',-.12,-.23);
  calcPoint(board,r,0,'#6af7c2','교점',.12,-.23);
  seg(board,[-1,.24],[0,.24],{strokeColor:'#f7c26a',strokeWidth:1.4});
  seg(board,[0,.24],[1,.24],{strokeColor:'#f7c26a',strokeWidth:1.4});
  seg(board,[-r,.34],[0,.34],{strokeColor:'#f76a9a',strokeWidth:1.4});
  seg(board,[0,.34],[r,.34],{strokeColor:'#f76a9a',strokeWidth:1.4});
  calcText(board,-.5,.12,'1',{strokeColor:'#f7c26a'});
  calcText(board,.5,.12,'1',{strokeColor:'#f7c26a'});
  calcText(board,-.7,.48,'√2',{strokeColor:'#f76a9a'});
  calcText(board,.7,.48,'√2',{strokeColor:'#f76a9a'});
}

function initIntegralSixthGraph(){
  const board=initGraphBoard('integral-sixth-board',[-.55,2.45,3.55,-.55]);
  if(!board) return;
  const f=x=>x*(3-x);
  filledArea(board,f,0,3,0,'#7c6af7',.16);
  seg(board,[-.35,0],[3.35,0],{strokeColor:'#3a3a50',strokeWidth:1.2});
  drawCalcGraph(board,f,-.25,3.25,'#7c6af7');
  calcPoint(board,0,0,'#6af7c2','α',-.1,-.25);
  calcPoint(board,3,0,'#6af7c2','β',.1,-.25);
  seg(board,[0,-.32],[3,-.32],{strokeColor:'#6af7c2',strokeWidth:1.4});
  calcText(board,1.5,-.45,'← l = β - α →',{strokeColor:'#6af7c2'});
  calcText(board,.55,2.12,'S = |a|/6 · l³',{strokeColor:'#f7c26a',fontSize:12});
}

function initIntegralTwelfthGraph(){
  const board=initGraphBoard('integral-twelfth-board',[-.55,1.2,3.7,-4.55]);
  if(!board) return;
  const f=x=>x*x*(x-3);
  filledArea(board,f,0,3,0,'#6af7c2',.15);
  seg(board,[-.35,0],[3.45,0],{strokeColor:'#3a3a50',strokeWidth:1.2});
  drawCalcGraph(board,f,-.25,3.45,'#6af7c2');
  calcPoint(board,0,0,'#f7c26a','α (접)',-.08,-.42);
  calcPoint(board,3,0,'#6af7c2','β (교)',.12,-.42);
  seg(board,[0,.68],[3,.68],{strokeColor:'#f7c26a',strokeWidth:1.4});
  calcText(board,1.5,.9,'← l →',{strokeColor:'#f7c26a'});
  calcText(board,.78,1.04,'S = |a|/12 · l⁴',{strokeColor:'#6af7c2',fontSize:12});
}

function initIntegralFunctionGraph(){
  const board=initGraphBoard('integral-function-board',[-3.35,1.7,2.35,-1.15]);
  if(!board) return;
  const f=x=>.23*(x+2)*(x-1)*(x-1);
  filledArea(board,f,-3,-2,0,'#f76a9a',.13,24);
  filledArea(board,f,-2,1,0,'#6af7c2',.14,44);
  filledArea(board,f,1,2.1,0,'#6af7c2',.1,22);
  seg(board,[-3.1,0],[2.15,0],{strokeColor:'#3a3a50',strokeWidth:1.2});
  seg(board,[-3,-1],[ -3,1.55],{strokeColor:'#3a3a50',strokeWidth:1});
  drawCalcGraph(board,f,-3.1,2.1,'#6af7c2');
  dashedV(board,-2,-1,1.45);
  dashedV(board,1,-1,1.45);
  calcPoint(board,-2,0,'#f7c26a','f=0',-.2,.22);
  calcPoint(board,1,0,'#f7c26a','f=0',.16,.22);
  calcText(board,-2.75,1.4,'y=f(x)',{anchorX:'left'});
  calcText(board,-2.65,-.72,'f(x)<0 → F 감소',{strokeColor:'#f76a9a',anchorX:'left'});
  calcText(board,-.65,.55,'f(x)>0 → F 증가',{strokeColor:'#6af7c2'});
  calcText(board,1.55,.38,'F 다시 증가',{strokeColor:'#6af7c2'});
  calcText(board,-2,-.95,'F 극소 후보',{strokeColor:'#888899'});
  calcText(board,1,-.95,'극값 아님: 부호 확인',{strokeColor:'#888899'});
}

window.addEventListener('hashchange',()=>{
  const problemId=getHashProblemId();
  if(problemId){
    renderProblem(problemId);
    return;
  }
  const sectionId=getHashSection();
  if(sectionId) show(sectionId,{scrollTop:true,updateHash:false});
});

document.addEventListener('DOMContentLoaded',loadSite);
