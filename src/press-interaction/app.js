(function () {
 'use strict';
 const root = document.getElementById('press-prototype');
 const by = id => root.querySelector('#press-' + id);
 const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
 let world = PressPrototype.create(), last = 0, accumulator = 0, autoWas = -1;
 const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
 const state = { playing: !reduced.matches, auto: true, force: 10, wires: true, open: false, view: 'perspective', cameras: [{yaw:-.48,elev:.39,zoom:1},{yaw:-.22,elev:.15,zoom:1}] };
 let palette, lastStatus = '', disposed = false;
 const canvases = [by('whole'),by('detail')], contexts = canvases.map(c=>c.getContext('2d'));
 if(contexts.some(c=>!c)) { by('status').textContent='当前浏览器无法创建画布；请换用支持Canvas的浏览器。下方接线表仍可阅读。'; return; }
 const sizes = [{w:0,h:0},{w:0,h:0}], labelBounds=[[],[]];
 const probe=document.createElement('span');probe.hidden=true;root.appendChild(probe);
 function token(name){probe.style.color='var('+name+')';const value=getComputedStyle(probe).color;return value;}
 function theme(){palette={bg:token('--background'),fg:token('--foreground'),muted:token('--muted-foreground'),border:token('--border'),surface:token('--muted'),coil:token('--viz-series-1'),signal:token('--viz-series-2'),logic:token('--viz-series-3')};}
 function saved(value){const s=value?.privateContent;if(s?.kind!=='press-demo-v1')return;
   if(Number.isFinite(s.force))state.force=clamp(s.force,0,15);
   for(const k of ['wires','open'])if(typeof s[k]==='boolean')state[k]=s[k];
   if(['perspective','front','top'].includes(s.view))setView(s.view);
 }
 function persist(){const s={kind:'press-demo-v1',force:state.force,wires:state.wires,open:state.open,view:state.view};
   try{window.openai?.setWidgetState({modelContent:{prototype:'单腔16珠按压交互',pressure_N:state.force},privateContent:s})?.catch(()=>{});localStorage.setItem('press-demo-v1',JSON.stringify({privateContent:s}));}catch(_){}
 }
 function setView(view){state.view=view;state.cameras=[0,1].map(i=>view==='front'?{yaw:0,elev:0,zoom:1}:view==='top'?{yaw:0,elev:1.44,zoom:1}:{yaw:i===0?-.48:-.22,elev:i===0?.39:.15,zoom:1});}
 function sync(){by('force').value=state.force;by('force-value').textContent=state.force.toFixed(1)+' N';by('wires').checked=state.wires;by('open').checked=state.open;by('view').value=state.view;by('auto').checked=state.auto;by('play').textContent=state.playing?'暂停动画':'播放动画';by('hold').setAttribute('aria-pressed',String(!state.auto&&world.state.raw>0&&world.state.tapUntil<0));}
 try{saved(window.openai?.widgetState||JSON.parse(localStorage.getItem('press-demo-v1')||'null'));}catch(_){}
 window.addEventListener('openai:set_globals',e=>{saved(e.detail?.globals?.widgetState);sync();render();});
 const assembly=p=>[55+p[0],20+p[1],135+p[2]], identity=p=>p;
 function scene(detail){
  const cmds=[], labels=[], T=detail?identity:assembly;
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
  const iron=palette.fg;
  const left=[[-31,50],[-2.25,50],[-6.75,-10],[-19,-16],[-19,-22],[-31,-22]];
  extrude(left,-6,6,iron,.7);extrude(left.map(p=>[-p[0],p[1]]).reverse(),-6,6,iron,.7);
  box(-31,-6,-34,31,6,-22,iron,.75,T);
  // One rectangular winding on the horizontal return bar. Its axis is X.
  const energized=world.state.current>0;
  box(-17.5,-15,-42,17.5,15,-35,palette.coil,.8,T);
  box(-17.5,-15,-21,17.5,15,-14,palette.coil,.8,T);
  box(-17.5,-15,-35,17.5,-8,-21,palette.coil,.9,T);
  box(-17.5,8,-35,17.5,15,-21,palette.coil,.8,T);
  for(let x=-16;x<=16;x+=2.2)path([T([x,-15.2,-42]),T([x,-15.2,-14]),T([x,15,-14])],palette.fg,.65,.5);
  if(energized)path([T([-16,-16,-28]),T([16,-16,-28])],palette.coil,3);
  // Clear chamber including its side lining; the front sheet can be moved away.
  extrude([[-5.5,0],[5.5,0],[2.5,40],[-2.5,40]],1.3,2.3,palette.signal,.13);
  const front=state.open?-20:-2.3;
  extrude([[-5.5,0],[5.5,0],[2.5,40],[-2.5,40]],front,front+1,palette.signal,.11);
  for(const s of [-1,1])extrude([[s*6,0],[s*5.5,0],[s*2.5,40],[s*3,40]],-2.3,2.3,palette.surface,.85);
  box(-5.5,-2.3,-1,5.5,2.3,0,palette.signal,.65,T);
  // Plastic upper clips are separate; no steel bridge shorts the N/S gap.
  for(const x of [-9,9])box(x-3,-8,42,x+3,8,45,palette.surface,.8,T);
  for(const p of world.state.beads)cmds.push({type:'sphere',pts:[T([p.x,-.15,p.z])],radius:1,fill:palette.fg});
  if(detail){
   labels.push({p:[-27,-8,25],text:'左极 N'},{p:[27,-8,25],text:'右极 S'},{p:[0,-16,-32],text:'唯一线圈 · 800匝'});
   // Horizontal magnetic field arrow and upward gradient-force arrow, deliberately distinct.
   path([[-2.2,-4,35],[2.2,-4,35],[1.1,-4,35.7]],palette.signal,1.8);
   if(energized){path([[0,-5,15],[0,-5,26],[-1.1,-5,24]],palette.coil,2.5);path([[0,-5,26],[1.1,-5,24]],palette.coil,2.5);}
   path([[36,0,0],[39,0,0],[39,0,40],[36,0,40]],palette.muted,1);
   labels.push({p:[40,0,20],text:'40 mm',align:'left'},{p:[0,-3,52],text:'上口磁隙6 mm'},{p:[0,-4,-8],text:'下口磁隙12 mm'});
  }else{
   box(-135,-95,0,135,95,10,palette.surface,.72);
   box(15,-4,10,96,44,82,palette.surface,.5);
   box(15,-4,82,96,44,88,palette.fg,.25);
   for(const x of [-28,28])box(x-5,-7,-47,x+5,7,-34,palette.surface,.9,assembly);
   // Independent fixed and free ends of the load cell; the stop is under the pressure pad.
   box(-106,14,10,-91,30,19,palette.fg,.45);
   box(-104,15,19,-46,29,28,palette.fg,.65);
   const depression=clamp(world.state.filtered/15,0,1)*1.5;
   box(-56,14,28-depression,-46,30,39-depression,palette.surface,.9);
   box(-76,0,39-depression,-30,45,43-depression,palette.signal,.6);
   box(-50,10,10,-42,22,35,palette.fg,.3);
   labels.push({p:[-78,20,29],text:'A 测力桥'},{p:[-52,20,49],text:'按压面'});
   if(world.state.raw>0){path([[-54,20,72],[-54,20,49],[-58,20,54]],palette.signal,2.5);path([[-54,20,49],[-50,20,54]],palette.signal,2.5);}
   const boards=[[-115,-66,-84,-40,'B HX711',palette.signal],[-58,-76,-13,-58,'C Nano',palette.logic],[20,-80,60,-52,'D 恒流驱动',palette.coil],[78,-70,108,-50,'E 5V降压',palette.logic]];
   for(const [x0,y0,x1,y1,text,col]of boards){box(x0,y0,12,x1,y1,15,col,.4);box(x0+6,y0+5,15,x1-6,y1-5,18,palette.fg,.65);labels.push({p:[(x0+x1)/2,(y0+y1)/2,23],text});}
   box(110,40,10,160,85,35,palette.fg,.35);labels.push({p:[135,62,43],text:'F 24V电源'},{p:assembly([0,-17,-28]),text:'G 单线圈'});
   if(state.wires){
    const wire=(pts,col,width=1.7)=>path(pts,col,width);
    // Four separate bridge nets to the nearby HX711.
    for(let k=0;k<4;k++)wire([[-95+k*2,15,24],[-112+k*2,5,18],[-112+k*2,-39,18]],k<2?palette.logic:palette.signal,1.1);
    // HX711 DT/SCK to Nano D3/D2; +5V and common return shown separately.
    for(let k=0;k<2;k++)wire([[-85,-49-k*3,17],[-72,-49-k*3,18],[-58,-62-k*3,18]],palette.signal,1.35);
    wire([[-13,-65,17],[3,-65,19],[20,-65,18]],palette.signal,1.8);
    // DC supply to driver and buck, with return legs (not a floating circuit).
    wire([[117,44,16],[117,-85,16],[42,-85,16],[42,-80,17]],palette.coil,2);
    wire([[124,44,16],[124,-89,16],[49,-89,16],[49,-80,17]],palette.muted,1.7);
    wire([[117,-56,16],[108,-56,17]],palette.coil,1.6);wire([[124,-64,16],[108,-64,17]],palette.muted,1.6);
    // Buck 5V logic branch and star-referenced ground to both boards.
    wire([[78,-56,17],[70,-43,19],[-18,-43,19],[-18,-58,18]],palette.logic,1.5);
    wire([[-18,-43,19],[-89,-43,19],[-89,-40,18]],palette.logic,1.5);
    wire([[78,-64,17],[68,-38,17],[-24,-38,17],[-24,-58,17]],palette.muted,1.3);
    wire([[-24,-38,17],[-96,-38,17],[-96,-40,17]],palette.muted,1.3);
    // Paired coil wires routed up the side of the display stand.
    wire([[28,-52,17],[14,-24,20],[14,-15,105],assembly([-16,-15,-28])],palette.coil,2);
    wire([[34,-52,17],[19,-24,20],[19,-19,110],assembly([16,-15,-28])],palette.muted,1.7);
   }
  }
  return {cmds,labels};
 }
 function projection(index){
  const c=state.cameras[index],{w,h}=sizes[index],bounds=index===0?[[-142,170],[-100,100],[-2,202]]:[[-45,50],[-27,18],[-46,59]];
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
 function statusText(){const s=world.stats(),intro=state.auto?(s.time%24<5.5?'自动 · 轻按一次':s.time%24<13?'自动 · 持续按压':'自动 · 松手余波'):'手动';return (!state.playing?'已暂停 · ':'')+intro+' · '+s.phase+(s.tails?' · 待续余波'+s.tails+'轮':'')+(s.pressed?' · 轮间隔约'+s.period.toFixed(1)+' s':'');}
 function render(){if(!palette||!sizes[0].w)return;paint(0);paint(1);const s=world.stats();by('pressure').textContent=s.filtered.toFixed(1)+' N';by('current').textContent=s.current.toFixed(2)+' A';by('rise').textContent=s.rise.toFixed(1)+' mm';const text=statusText();if(text!==lastStatus){by('status').textContent=text;lastStatus=text;}}
 function automatic(){if(!state.auto)return;const t=world.state.time%24;const value=t>=.7&&t<1.1?4:t>=5.5&&t<13?10:0;if(value!==autoWas){world.hold(value);autoWas=value;}}
 function advance(seconds){let left=seconds;while(left>1e-8){const dt=Math.min(1/120,left);automatic();world.advance(dt);left-=dt;}render();}
 function manual(){state.auto=false;by('auto').checked=false;autoWas=-1;}
 by('tap').addEventListener('click',()=>{manual();world.tap();by('hold').setAttribute('aria-pressed','false');sync();render();});
 by('hold').addEventListener('click',()=>{manual();world.hold(state.force||10);if(!state.force)state.force=10;sync();render();});
 by('release').addEventListener('click',()=>{manual();world.release();sync();render();});
 by('force').addEventListener('input',()=>{manual();state.force=Number(by('force').value);world.hold(state.force);sync();persist();render();});
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
 window.__pressPrototype={state,world,advance,render,scene,sizes,labelBounds,drag,reset(){world=PressPrototype.create();this.world=world;autoWas=-1;render();},setView};
})();
