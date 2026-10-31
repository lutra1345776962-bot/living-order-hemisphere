(function () {
 'use strict';
 const root = document.getElementById('press-prototype');
 const by = id => root.querySelector('#press-' + id);
 const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
 let world = PressPrototype.create(), last = 0, accumulator = 0, autoWas = -1;
 const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
 const state = { playing: !reduced.matches, auto: true, force: 10, selected: 0, wires: true, open: false, view: 'perspective', cameras: [{yaw:-.48,elev:.26,zoom:1},{yaw:-.22,elev:.15,zoom:1}] };
 let palette, lastStatus = '', disposed = false;
 const canvases = [by('whole'),by('detail')], contexts = canvases.map(c=>c.getContext('2d'));
 if(contexts.some(c=>!c)) { by('status').textContent='当前浏览器无法创建画布；请换用支持Canvas的浏览器。下方接线表仍可阅读。'; return; }
 const sizes = [{w:0,h:0},{w:0,h:0}], labelBounds=[[],[]];
 const probe=document.createElement('span');probe.hidden=true;root.appendChild(probe);
 function token(name){probe.style.color='var('+name+')';const value=getComputedStyle(probe).color;return value;}
 function theme(){palette={bg:token('--background'),fg:token('--foreground'),muted:token('--muted-foreground'),border:token('--border'),surface:token('--muted'),coil:token('--viz-series-1'),signal:token('--viz-series-2'),logic:token('--viz-series-3')};}
 function saved(value){const s=value?.privateContent;if(s?.kind!=='capital-global-pressure-v1')return;
   if(Number.isFinite(s.force))state.force=clamp(s.force,0,15);
   for(const k of ['wires','open'])if(typeof s[k]==='boolean')state[k]=s[k];
   if(['perspective','front','top'].includes(s.view))setView(s.view);
   if(Number.isInteger(s.selected))state.selected=clamp(s.selected,0,7);
 }
 function persist(){const s={kind:'capital-global-pressure-v1',force:state.force,selected:state.selected,wires:state.wires,open:state.open,view:state.view};
   try{window.openai?.setWidgetState({modelContent:{prototype:'上部受压统一触发8个分支',pressureIncrement_percent:state.force/15*100,branches:8,beads:128},privateContent:s})?.catch(()=>{});localStorage.setItem('capital-global-pressure-v1',JSON.stringify({privateContent:s}));}catch(_){}
 }
 function setView(view){state.view=view;state.cameras=[0,1].map(i=>view==='front'?{yaw:0,elev:0,zoom:1}:view==='top'?{yaw:0,elev:1.44,zoom:1}:{yaw:i===0?-.48:-.22,elev:i===0?.26:.15,zoom:1});}
 function sync(){by('force').value=Math.round(state.force/15*100);by('force-value').textContent=(state.force/15*100).toFixed(0)+'%';by('selected').value=state.selected;by('wires').checked=state.wires;by('open').checked=state.open;by('view').value=state.view;by('auto').checked=state.auto;by('play').textContent=state.playing?'暂停动画':'播放动画';by('hold').setAttribute('aria-pressed',String(!state.auto&&world.state.raw>0&&world.state.tapUntil<0));by('detail-caption').textContent='第'+(state.selected+1)+'分支放大 · 与其余7路同一时钟';}
 try{saved(window.openai?.widgetState||JSON.parse(localStorage.getItem('capital-global-pressure-v1')||'null'));}catch(_){}
 window.addEventListener('openai:set_globals',e=>{saved(e.detail?.globals?.widgetState);sync();render();});
 const branchTransform=i=>p=>{const angle=(i+.5)*Math.PI/4,r=72+p[0];return [r*Math.cos(angle)-p[1]*Math.sin(angle),r*Math.sin(angle)+p[1]*Math.cos(angle),210+p[2]];},identity=p=>p;
 function scene(detail){
  const cmds=[], labels=[];let T=identity;
  function polygon(pts,fill,alpha=1,stroke=true){cmds.push({type:'poly',pts,fill,alpha,stroke});}
  function path(pts,color,width=1.3,alpha=1){cmds.push({type:'line',pts,color,width,alpha});}
  function box(x0,y0,z0,x1,y1,z1,color,alpha=1,transform=identity){
   const v=[[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]].map(transform);
   for(const f of [[0,1,2,3],[0,4,5,1],[1,5,6,2],[2,6,7,3],[3,7,4,0],[4,7,6,5]])polygon(f.map(i=>v[i]),color,alpha);
  }
  function extrude(points,y0,y1,color,alpha=1){
   polygon(points.map(p=>T([p[0],y0,p[1]])),color,alpha);polygon(points.map(p=>T([p[0],y1,p[1]])),color,alpha);
   for(let i=0;i<points.length;i++){const p=points[i],q=points[(i+1)%points.length];polygon([T([p[0],y0,p[1]]),T([q[0],y0,q[1]]),T([q[0],y1,q[1]]),T([p[0],y1,p[1]])],color,alpha);}
  }
  const energized=world.state.current>0;
  function magneticModule(branch){
  T=detail?identity:branchTransform(branch);
  const first=cmds.length,iron=palette.fg;
  const left=[[-31,50],[-2.25,50],[-6.75,-10],[-19,-16],[-19,-22],[-31,-22]];
  extrude(left,-6,6,iron,.7);extrude(left.map(p=>[-p[0],p[1]]).reverse(),-6,6,iron,.7);
  box(-31,-6,-34,31,6,-22,iron,.75,T);
  // One rectangular winding on the horizontal return bar. Its axis is X.
  box(-17.5,-15,-42,17.5,15,-35,palette.coil,.8,T);
  box(-17.5,-15,-21,17.5,15,-14,palette.coil,.8,T);
  box(-17.5,-15,-35,17.5,-8,-21,palette.coil,.9,T);
  box(-17.5,8,-35,17.5,15,-21,palette.coil,.8,T);
  for(let x=-16;x<=16;x+=2.2)path([T([x,-15.2,-42]),T([x,-15.2,-14]),T([x,15,-14])],palette.fg,.65,.5);
  if(energized)path([T([-16,-16,-28]),T([16,-16,-28])],palette.coil,3);
  // Clear chamber including its side lining; the front sheet can be moved away.
  extrude([[-5.5,0],[5.5,0],[2.5,40],[-2.5,40]],1.3,2.3,palette.signal,.13);
  const front=state.open&&detail?-20:-2.3;
  extrude([[-5.5,0],[5.5,0],[2.5,40],[-2.5,40]],front,front+1,palette.signal,.11);
  for(const s of [-1,1])extrude([[s*6,0],[s*5.5,0],[s*2.5,40],[s*3,40]],-2.3,2.3,palette.surface,.85);
  box(-5.5,-2.3,-1,5.5,2.3,0,palette.signal,.65,T);
  // Plastic upper clips are separate; no steel bridge shorts the N/S gap.
  for(const x of [-9,9])box(x-3,-8,42,x+3,8,45,palette.surface,.8,T);
  for(const p of world.state.beads)cmds.push({type:'sphere',pts:[T([p.x,-.15,p.z])],radius:1,fill:palette.fg});
  for(let i=first;i<cmds.length;i++){cmds[i].branch=branch;cmds[i].current=world.state.current;}
  if(!detail){
   const frame=[];for(let i=0;i<=30;i++){const a=i*Math.PI/60;frame.push([145*Math.sin(a)*Math.cos((branch+.5)*Math.PI/4),145*Math.sin(a)*Math.sin((branch+.5)*Math.PI/4),270-145*Math.cos(a)]);}path(frame,palette.muted,.8,.28);
   for(const x of [-28,28])box(x-2,-3,50,x+2,3,60,palette.surface,.8,T);
   labels.push({p:T([0,-8,18]),text:'S'+(branch+1)});
  }
  }
  if(detail){
   magneticModule(state.selected);
   labels.push({p:[-27,-8,25],text:'左极 N'},{p:[27,-8,25],text:'右极 S'},{p:[0,-16,-32],text:'S'+(state.selected+1)+' · 800匝'});
   // Horizontal magnetic field arrow and upward gradient-force arrow, deliberately distinct.
   path([[-2.2,-4,35],[2.2,-4,35],[1.1,-4,35.7]],palette.signal,1.8);
   if(energized){path([[0,-5,15],[0,-5,26],[-1.1,-5,24]],palette.coil,2.5);path([[0,-5,26],[1.1,-5,24]],palette.coil,2.5);}
   path([[36,0,0],[39,0,0],[39,0,40],[36,0,40]],palette.muted,1);
   labels.push({p:[40,0,20],text:'40 mm',align:'left'},{p:[0,-3,52],text:'上口磁隙6 mm'},{p:[0,-4,-8],text:'下口磁隙12 mm'});
  }else{
   box(-165,-160,0,165,160,10,palette.surface,.72);
   box(-17,-17,10,17,17,278,palette.fg,.38);
   box(-148,-148,270,148,148,278,palette.surface,.16);
   // The pressure signal is collected ABOVE the capital, not from a separate hand pad.
   const depression=clamp(world.state.filtered/15,0,1)*.9;
   box(-42,-42,278,42,42,284,palette.fg,.5);
   box(-16,-16,284,16,16,318-depression,palette.signal,.7);
   box(-98,-98,318-depression,98,98,326-depression,palette.surface,.3);
   labels.push({p:[0,-20,302],text:'A 上部测力点'},{p:[0,0,336],text:'上部荷载'},{p:[-17,0,110],text:'承力柱身'});
   if(world.state.raw>0)for(const x of [-54,0,54]){path([[x,0,361],[x,0,332],[x-4,0,338]],palette.signal,2.5);path([[x,0,332],[x+4,0,338]],palette.signal,2.5);}
   for(let i=0;i<8;i++)magneticModule(i);
   const boards=[[-125,-150,-94,-124,'B HX711',palette.signal],[-78,-150,-33,-132,'C Nano',palette.logic],[-10,-150,60,-122,'D 8路驱动',palette.coil],[82,-150,112,-130,'E 5V降压',palette.logic]];
   for(const [x0,y0,x1,y1,text,col]of boards){box(x0,y0,12,x1,y1,15,col,.4);box(x0+6,y0+5,15,x1-6,y1-5,18,palette.fg,.65);labels.push({p:[(x0+x1)/2,(y0+y1)/2,23],text});}
   box(113,-85,10,159,-35,35,palette.fg,.35);labels.push({p:[135,-60,43],text:'F 动力电源'});
   if(state.wires){
    const wire=(pts,col,width=1.7)=>path(pts,col,width);
    // Four bridge wires run down a separate sensor conduit, away from winding leads.
    for(let k=0;k<4;k++)wire([[-14+k*2,-17,301],[-25+k*2,-31,290],[-25+k*2,-31,22],[-121+k*2,-124,18]],k<2?palette.logic:palette.signal,1.1);
    // HX711 DT/SCK to Nano D3/D2; +5V and common return shown separately.
    for(let k=0;k<2;k++)wire([[-94,-135-k*3,17],[-87,-135-k*3,18],[-78,-138-k*3,18]],palette.signal,1.35);
    wire([[-33,-139,17],[-20,-139,19],[-10,-139,18]],palette.signal,1.8);
    // DC supply to driver and buck, with return legs (not a floating circuit).
    wire([[119,-85,16],[119,-157,16],[42,-157,16],[42,-150,17]],palette.coil,2);
    wire([[126,-85,16],[126,-159,16],[49,-159,16],[49,-150,17]],palette.muted,1.7);
    wire([[119,-137,16],[112,-137,17]],palette.coil,1.6);wire([[126,-144,16],[112,-144,17]],palette.muted,1.6);
    // Buck 5V logic branch and star-referenced ground to both boards.
    wire([[82,-137,17],[70,-116,19],[-42,-116,19],[-42,-132,18]],palette.logic,1.5);
    wire([[-42,-116,19],[-101,-116,19],[-101,-124,18]],palette.logic,1.5);
    wire([[82,-144,17],[68,-112,17],[-49,-112,17],[-49,-132,17]],palette.muted,1.3);
    wire([[-49,-112,17],[-108,-112,17],[-108,-124,17]],palette.muted,1.3);
    // One common command, eight independent current-regulated outputs (not one GPIO powering coils).
    for(let i=0;i<8;i++){const tr=branchTransform(i);wire([[-5+i*8,-122,17],[21+i*.8,-24,28],[21+i*.8,-24,151],tr([-16,-15,-28])],palette.coil,1.25);wire([[-2+i*8,-122,17],[29+i*.8,-24,28],[29+i*.8,-24,148],tr([16,-15,-28])],palette.muted,1);}
   }
  }
  return {cmds,labels};
 }
 function projection(index){
  const c=state.cameras[index],{w,h}=sizes[index],bounds=index===0?[[-170,170],[-165,165],[-2,367]]:[[-45,50],[-27,18],[-46,59]];
  const cy=Math.cos(c.yaw),sy=Math.sin(c.yaw),ce=Math.cos(c.elev),se=Math.sin(c.elev);
  function rotate(p){const u=p[0]*cy-p[1]*sy,r=p[0]*sy+p[1]*cy;return {x:u,y:p[2]*ce+r*se,d:-r*ce+p[2]*se};}
  const corners=[];for(const x of bounds[0])for(const y of bounds[1])for(const z of bounds[2])corners.push(rotate([x,y,z]));
  const xs=corners.map(p=>p.x),ys=corners.map(p=>p.y),loX=Math.min(...xs),hiX=Math.max(...xs),loY=Math.min(...ys),hiY=Math.max(...ys);
  const scale=Math.min((w-30)/(hiX-loX),(h-58)/(hiY-loY))*c.zoom;
  const ox=w/2-(loX+hiX)/2*scale,oy=h/2+(loY+hiY)/2*scale;
  return {scale,project(p){const v=rotate(p);return {x:ox+v.x*scale,y:oy-v.y*scale,d:v.d};}};
 }
 function paint(index){
  const ctx=contexts[index],{w,h}=sizes[index];ctx.clearRect(0,0,w,h);const {cmds,labels}=scene(index===1),P=projection(index);
  for(const c of cmds){c.screen=c.pts.map(P.project);c.depth=c.screen.reduce((s,p)=>s+p.d,0)/c.screen.length;}
  cmds.sort((a,b)=>a.depth-b.depth);
  for(const c of cmds){const pts=c.screen;ctx.globalAlpha=c.alpha===undefined?1:c.alpha;
   if(c.type==='sphere'){
    const p=pts[0],r=Math.max(index===0?1.4:2.7,c.radius*P.scale);ctx.fillStyle=palette.fg;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();ctx.fillStyle=palette.bg;ctx.globalAlpha=.5;ctx.beginPath();ctx.arc(p.x-r*.28,p.y-r*.32,r*.28,0,Math.PI*2);ctx.fill();
   }else{ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
    if(c.type==='poly'){ctx.closePath();ctx.fillStyle=c.fill;ctx.fill();if(c.stroke){ctx.strokeStyle=palette.border;ctx.lineWidth=.6;ctx.stroke();}}
    else{ctx.strokeStyle=c.color;ctx.lineWidth=c.width;ctx.stroke();}
   }
  }
  ctx.globalAlpha=1;ctx.font='12px '+getComputedStyle(root).fontFamily;ctx.textBaseline='middle';labelBounds[index]=[];
  // Short component names stay attached to the actual parts; repel labels in screen space.
  for(const l of labels){const p=P.project(l.p),tw=ctx.measureText(l.text).width+8;let x=clamp(p.x-tw/2,3,w-tw-3),y=clamp(p.y-10,10,h-12);
   for(let k=0;k<20;k++){if(!labelBounds[index].some(b=>x<b.x+b.w&&x+tw>b.x&&Math.abs(y-b.y)<17))break;y=clamp(y+(k%2?-(k+2)*9:(k+2)*9),10,h-12);}
   ctx.strokeStyle=palette.border;ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(x+tw/2,y);ctx.stroke();
   ctx.fillStyle=palette.bg;ctx.globalAlpha=.92;ctx.fillRect(x,y-8,tw,16);ctx.globalAlpha=1;ctx.fillStyle=palette.fg;ctx.textAlign='left';ctx.fillText(l.text,x+4,y);labelBounds[index].push({x,y,w:tw,text:l.text});
  }
 }
 function resize(){canvases.forEach((c,i)=>{const r=c.getBoundingClientRect(),w=Math.max(100,r.width),h=Math.max(100,r.height),dpr=Math.min(window.devicePixelRatio||1,2);sizes[i]={w,h};c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);contexts[i].setTransform(dpr,0,0,dpr,0,0);});render();}
 function statusText(){const s=world.stats(),intro=state.auto?(s.time%24<5.5?'自动 · 短时加载':s.time%24<13?'自动 · 持续受压':'自动 · 卸载收尾'):'手动加载';return (!state.playing?'已暂停 · ':'')+intro+' · 8路统一：'+s.phase+(s.tails?' · 待续余波'+s.tails+'轮':'')+(s.pressed?' · 轮间隔约'+s.period.toFixed(1)+' s':'');}
 function branchSignals(){return Array.from({length:8},(_,id)=>({id,current:world.state.current,phase:world.state.phase}));}
 function render(){if(!palette||!sizes[0].w)return;paint(0);paint(1);const s=world.stats();by('pressure').textContent=(s.filtered/15*100).toFixed(0)+'%';by('current').textContent=s.current.toFixed(2)+' A / 路';by('active').textContent=(s.current>0?'8':'0')+' / 8 路';by('rise').textContent=s.rise.toFixed(1)+' mm';const text=statusText();if(text!==lastStatus){by('status').textContent=text;lastStatus=text;}}
 function automatic(){if(!state.auto)return;const t=world.state.time%24;const value=t>=.7&&t<1.1?4:t>=5.5&&t<13?10:0;if(value!==autoWas){world.hold(value);autoWas=value;}}
 function advance(seconds){let left=seconds;while(left>1e-8){const dt=Math.min(1/120,left);automatic();world.advance(dt);left-=dt;}render();}
 function manual(){state.auto=false;by('auto').checked=false;autoWas=-1;}
 by('tap').addEventListener('click',()=>{manual();world.tap();by('hold').setAttribute('aria-pressed','false');sync();render();});
 by('hold').addEventListener('click',()=>{manual();world.hold(state.force||10);if(!state.force)state.force=10;sync();render();});
 by('release').addEventListener('click',()=>{manual();world.release();sync();render();});
 by('force').addEventListener('input',()=>{manual();state.force=Number(by('force').value)/100*15;world.hold(state.force);sync();persist();render();});
 by('selected').addEventListener('change',()=>{state.selected=Number(by('selected').value);sync();persist();render();});
 by('auto').addEventListener('change',()=>{state.auto=by('auto').checked;world.release();autoWas=-1;sync();render();});
 by('play').addEventListener('click',()=>{state.playing=!state.playing;last=0;sync();render();});
 by('fit').addEventListener('click',()=>{setView(state.view);sync();persist();render();});
 by('view').addEventListener('change',()=>{setView(by('view').value);persist();render();});
 for(const key of ['wires','open'])by(key).addEventListener('change',()=>{state[key]=by(key).checked;persist();render();});
 const drag=[null,null];
 canvases.forEach((c,i)=>{
  c.addEventListener('pointerdown',e=>{if(e.button!==0&&e.button!==undefined)return;drag[i]={id:e.pointerId,x:e.clientX,y:e.clientY};try{c.setPointerCapture(e.pointerId);}catch(_){} });
  c.addEventListener('pointermove',e=>{const d=drag[i];if(!d||d.id!==e.pointerId)return;state.cameras[i].yaw+=(e.clientX-d.x)*.008;if(e.pointerType!=='touch')state.cameras[i].elev=clamp(state.cameras[i].elev+(e.clientY-d.y)*.005,-.2,1.5);d.x=e.clientX;d.y=e.clientY;render();});
  const clear=()=>{drag[i]=null;};for(const ev of ['pointerup','pointercancel','lostpointercapture'])c.addEventListener(ev,clear);
  c.addEventListener('wheel',e=>{if(!e.ctrlKey&&!e.shiftKey)return;e.preventDefault();state.cameras[i].zoom=clamp(state.cameras[i].zoom*Math.exp(-e.deltaY*.001),.65,1.35);render();},{passive:false});
 });
 window.addEventListener('blur',()=>drag.fill(null));
 function onReduced(e){if(e.matches){state.playing=false;sync();render();}}reduced.addEventListener?.('change',onReduced);
 const observer=new ResizeObserver(resize);canvases.forEach(c=>observer.observe(c));
 const themes=new MutationObserver(()=>{theme();render();});themes.observe(document.documentElement,{attributes:true,attributeFilter:['class','style','data-theme']});
 window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',()=>{theme();render();});
 window.addEventListener('pagehide',()=>{disposed=true;observer.disconnect();themes.disconnect();});
 function frame(t){if(disposed)return;if(state.playing&&last){accumulator+=Math.min(.08,(t-last)/1000);while(accumulator>=1/60){advance(1/60);accumulator-=1/60;}}last=t;requestAnimationFrame(frame);}
 theme();sync();resize();requestAnimationFrame(frame);
 window.__pressPrototype={state,world,advance,render,scene,sizes,labelBounds,drag,branchSignals,branchTransform,reset(){world=PressPrototype.create();this.world=world;autoWas=-1;render();},setView};
})();
