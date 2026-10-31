(function(){
 'use strict';
 const root=document.getElementById('press-prototype'),by=id=>root.querySelector('#press-'+id),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const E=window.VerticalGranular,reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const defaults={lead:.8,overlap:.3,hold:.3,allOff:1.4};
 const state={playing:!reduced.matches,auto:true,force:10,selected:6,beadCount:200,wires:true,showFlow:true,slowSignal:true,open:false,cutTop:false,detailMode:'electronics',view:'perspective',durations:{...defaults},currents:{big:1.8,small:1.6},cameras:[{yaw:-.48,elev:.29,zoom:1},{yaw:-.20,elev:.10,zoom:1}]};
 let controller,particles,signals,tapUntil=-1,initialMean,last=0,lastDraw=0,accumulator=0,autoWas=-1,palette,scenePalette,disposed=false,themeRevision=0,sceneBuilds=0;
 const canvases=[by('whole'),by('detail')],contexts=canvases.map(c=>c.getContext('2d')),sizes=[{},{}],labelBounds=[[],[]],drag=[null,null];
   function rgbToken(name) {
    const styles=getComputedStyle(root);
    const css=styles.getPropertyValue(name).trim() || styles.getPropertyValue('--foreground').trim() || styles.color;
    const probe=document.createElement('span');probe.style.color=css;root.appendChild(probe);
    const resolved=getComputedStyle(probe).color;probe.remove();
    // Parse computed CSS colors directly. Do not read canvas pixels during startup.
    function parse(s){
      s=s.trim().toLowerCase();
      let match=s.match(/^rgba?\((.*)\)$/);
      if(match){const parts=match[1].split('/')[0].replace(/,/g,' ').trim().split(/\s+/);if(parts.length>=3)return parts.slice(0,3).map(x=>x.endsWith('%')?parseFloat(x)*2.55:parseFloat(x));}
      match=s.match(/^color\(srgb\s+([^)]*)\)$/);
      if(match)return match[1].split('/')[0].trim().split(/\s+/).slice(0,3).map(x=>x.endsWith('%')?parseFloat(x)*2.55:parseFloat(x)*255);
      match=s.match(/^ok(lab|lch)\(([^)]*)\)$/);
      if(match){
        const v=match[2].split('/')[0].replace(/,/g,' ').trim().split(/\s+/);let L=parseFloat(v[0])/(v[0].endsWith('%')?100:1),a,b;
        if(match[1]==='lch'){const C=parseFloat(v[1]),h=parseFloat(v[2])*Math.PI/180;a=C*Math.cos(h);b=C*Math.sin(h);}else{a=parseFloat(v[1]);b=parseFloat(v[2]);}
        const l=(L+.3963377774*a+.2158037573*b)**3,m=(L-.1055613458*a-.0638541728*b)**3,t=(L-.0894841775*a-1.291485548*b)**3;
        const linear=[4.0767416621*l-3.3077115913*m+.2309699292*t,-1.2684380046*l+2.6097574011*m-.3413193965*t,-.0041960863*l-.7034186147*m+1.707614701*t];
        return linear.map(c=>255*clamp(c<=.0031308?12.92*c:1.055*c**(1/2.4)-.055,0,1));
      }
      return null;
    }
    const values=parse(resolved)||parse(styles.color);
    if(!values||!values.every(Number.isFinite))throw new Error('无法解析主题颜色：'+name);
    return values;
  }

 function theme(){scenePalette={bg:rgbToken('--background'),fg:rgbToken('--foreground'),muted:rgbToken('--muted-foreground'),surface:rgbToken('--muted'),edge:rgbToken('--border'),coil:rgbToken('--viz-series-1'),particle:rgbToken('--viz-series-2'),spacer:rgbToken('--viz-series-3'),small:rgbToken('--viz-series-4')};palette=Object.fromEntries(Object.entries(scenePalette).map(([k,v])=>[k,'rgb('+v.join(',')+')']));themeRevision++;}
 const limits={lead:[.2,5],overlap:[.1,3],hold:[.1,3],allOff:[.5,6]},base=()=>Object.values(state.durations).reduce((s,x)=>s+x,0);
 function validDurations(v){return v&&Object.entries(limits).every(([k,[lo,hi]])=>Number.isFinite(v[k])&&v[k]>=lo&&v[k]<=hi);}
 function setView(v){state.view=v;state.cameras=[{yaw:-.48,elev:.29,zoom:1},{yaw:-.20,elev:.10,zoom:1}];if(v==='front')state.cameras[0]={yaw:0,elev:0,zoom:1};if(v==='top')state.cameras[0]={yaw:0,elev:1.49,zoom:1};}
 function applySaved(saved){const s=saved?.privateContent,legacy=s?.kind==='capital-central-relay-v1';if(s?.kind!=='capital-arduino-signal-v1'&&!legacy)return false;
  if(Number.isFinite(s.force))state.force=clamp(s.force,0,15);if(Number.isInteger(s.selected))state.selected=clamp(s.selected,0,7);
  if(Number.isInteger(s.beadCount)&&s.beadCount>=50&&s.beadCount<=400)state.beadCount=s.beadCount;
  if(validDurations(s.durations))state.durations={...s.durations};
  if(s.currents&&['big','small'].every(k=>Number.isFinite(s.currents[k])&&s.currents[k]>=.5&&s.currents[k]<=2.5))state.currents={...s.currents};
  for(const k of ['wires','open','cutTop','showFlow','slowSignal'])if(typeof s[k]==='boolean')state[k]=s[k];if(!legacy&&['sensor','chamber','electronics'].includes(s.detailMode))state.detailMode=s.detailMode;if(['perspective','front','top'].includes(s.view))setView(s.view);return true;
 }
 try{applySaved(window.openai?.widgetState||JSON.parse(localStorage.getItem('capital-arduino-signal-v1')||localStorage.getItem('capital-central-relay-v1')||'null'));}catch(_){}
 function save(){const s={kind:'capital-arduino-signal-v1',force:state.force,selected:state.selected,beadCount:state.beadCount,durations:{...state.durations},currents:{...state.currents},wires:state.wires,open:state.open,cutTop:state.cutTop,showFlow:state.showFlow,slowSignal:state.slowSignal,detailMode:state.detailMode,view:state.view};try{window.openai?.setWidgetState({modelContent:{structure:'flat top sensor > HX711 > Arduino D3/D2 > D9 M0 and D10 buffered S1..S8',pressureIncrement_percent:state.force/15*100,beads:state.beadCount*8,timing:state.durations,signalSlowIllustration:state.slowSignal},privateContent:s})?.catch(()=>{});localStorage.setItem(s.kind,JSON.stringify({privateContent:s}));}catch(_){} }
 const proxy={scenario:'normal',get layers(){return Array(8).fill(particles.layers[0]);},drive:()=>controller.drive(),stats:()=>particles.stats(0)};
 function resetParticles(){particles=E.createWorld({layerCount:1,beadCount:state.beadCount,currents:state.currents});particles.drive=()=>controller.drive();initialMean=particles.stats(0).meanHeight;}
 function reset(){controller=LoadRelay.create(()=>state.durations);signals=SignalPath.create(v=>controller.hold(v));signals.state.slow=state.slowSignal;resetParticles();tapUntil=-1;autoWas=-1;accumulator=0;}
 reset();
 function stats(){return{...controller.stats(),meanHeight:particles.stats(0).meanHeight,rise:Math.max(0,particles.stats(0).meanHeight-initialMean)};}
 function sync(){by('force').value=Math.round(state.force/15*100);by('force-value').textContent=Math.round(state.force/15*100)+'%';by('selected').value=state.selected;by('count').value=state.beadCount;by('count-value').textContent=state.beadCount+' / 腔 · 共'+state.beadCount*8+'颗';
  for(const k of Object.keys(limits)){by(k).value=state.durations[k];by(k+'-value').textContent=Number(state.durations[k].toFixed(1))+' s';}
  for(const k of ['big','small']){by('current-'+k).value=state.currents[k];by('current-'+k+'-value').textContent=state.currents[k].toFixed(1)+'×';}
  by('wires').checked=state.wires;by('show-flow').checked=state.showFlow;by('slow-signal').checked=state.slowSignal;by('open').checked=state.open;by('open').disabled=state.detailMode!=='chamber';by('topcut').checked=state.cutTop;by('detail-mode').value=state.detailMode;by('view').value=state.view;by('auto').checked=state.auto;by('play').textContent=state.playing?'暂停动画':'播放动画';by('hold').setAttribute('aria-pressed',String(!state.auto&&signals.state.source>0&&tapUntil<0));by('period').textContent=base().toFixed(1)+' s';by('detail-caption').textContent=state.detailMode==='electronics'?'接线放大 · HX711、Arduino与两组驱动':state.detailMode==='sensor'?'顶板中央局部剖面 · 测力元件内藏':'第'+(state.selected+1)+'腔 · '+state.beadCount+'颗 · 与整机统一触发';by('detail').setAttribute('aria-label',state.detailMode==='electronics'?'底部电子仓：HX711 DT到Arduino D3、D2回送采样时钟；D9到中央驱动，D10经74HC244到8路端部驱动，另有5V和公共地线。':state.detailMode==='sensor'?'平整顶板下方依次为传力压头、内藏应变式测力元件和固定承压座；剖开仅供观察。':'所选弧底透明薄腔，端部线圈随统一信号接力吸附，全部断电后铁珠落回。');}
 function projection(i){const {w,h}=sizes[i],original=state.cameras[i],sensor=i===1&&state.detailMode==='sensor',electronics=i===1&&state.detailMode==='electronics',c={...original,elev:clamp(original.elev+(sensor?.28:electronics?.75:0),-.2,1.5)},bounds=i===0?[[-150,150],[-140,140],[0,301]]:electronics?[[-125,134],[-138,-40],[12,48]]:sensor?[[-48,48],[-34,34],[246,277]]:[[-50,62],[state.open?-16:-12,12],[0,128]],ca=Math.cos(c.yaw),sa=Math.sin(c.yaw),ce=Math.cos(c.elev),se=Math.sin(c.elev);
  function rotate(p){return{x:p[0]*ca+p[1]*sa,y:-p[0]*sa*se+p[1]*ca*se+p[2]*ce,d:p[0]*sa*ce-p[1]*ca*ce+p[2]*se};}
  const pts=[];for(const x of bounds[0])for(const y of bounds[1])for(const z of bounds[2])pts.push(rotate([x,y,z]));const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y),lx=Math.min(...xs),hx=Math.max(...xs),ly=Math.min(...ys),hy=Math.max(...ys),scale=Math.min((w-2*Math.min(w*.12,46))/(hx-lx),(h-2*Math.min(h*.13,48))/(hy-ly))*c.zoom;
  return{scale,project(p){const v=rotate(p);return{x:w/2+(v.x-(lx+hx)/2)*scale,y:h/2-6-(v.y-(ly+hy)/2)*scale,d:v.d};}};
 }
 const meshes=[[],[]];
 const sceneCaches=[null,null];
 function scene(detail){const i=detail?1:0,P=projection(i),sceneState={selected:state.selected,beadCount:state.beadCount,open:true,explode:state.open,cutTop:state.cutTop,view:state.view},drive=controller.drive();
  const mode=detail?(state.detailMode==='sensor'?2:state.detailMode==='electronics'?3:1):0;
  const key=JSON.stringify([mode,state.selected,state.beadCount,state.open,state.cutTop,state.view,state.wires,state.cameras[i],sizes[i],themeRevision,drive.big,drive.small,signals.state.source>0]);
  if(sceneCaches[i]?.key!==key){sceneCaches[i]={key,built:window.RelayReferenceScene(mode,P,sceneState,proxy,scenePalette,signals.state.source,state.wires)};sceneBuilds++;}
  const built=sceneCaches[i].built;
  for(const c of built.commands)if(c.kind==='ball'){
    const p=particles.layers[0][c.id%state.beadCount];let xyz;
    if(mode===0){const t=(c.branch+.5)*Math.PI/4;xyz=[(E.RIN+p.x)*Math.cos(t),(E.RIN+p.x)*Math.sin(t),E.BASE+p.z];}else xyz=[p.x-E.W/2,0,p.z];
    c.world=xyz;c.pts[0]=P.project(xyz);c.depth=c.pts[0].d;
  }
  built.commands.sort((a,b)=>a.depth-b.depth);return built;
 }
 function flowMarkers(detail){if(!state.wires||!state.showFlow||(detail&&state.detailMode!=='electronics'))return[];const now=controller.state.time,d=controller.drive(),s=signals.state,P=projection(detail?1:0),list=[];
  for(const n of CapitalWiring.nets){let u=null,bit=null;
   if(n.kind==='analog'){const e=[...s.events].reverse().find(e=>e.type==='sensor'&&now-e.time>=0&&now-e.time<(s.slow?.35:.2));if(e)u=(now-e.time)/(s.slow?.35:.2);else if(s.source>0)u=(now%1.1)/1.1;}
   if(n.kind==='data'){const e=[...s.events].reverse().find(e=>e.type==='hx'&&now-e.time>=0&&now-e.time<.35);if(e)u=(now-e.time)/.35;else if(s.hx>0)u=(now%1.1)/1.1;}
   if(n.kind==='clock'&&(s.hx>0||s.queue.length))u=(now%.8)/.8;
   if(['cmdBig','cmdSmall','fanout'].includes(n.kind)){const e=s.commands[n.kind==='cmdBig'?'big':'small'];if(now-e.at>=0&&now-e.at<.22){u=(now-e.at)/.22;bit=e.value;}}
   if((n.kind==='powerBig'||n.kind==='returnBig')&&d.big)u=(now%.85)/.85;
   if((n.kind==='powerSmall'||n.kind==='returnSmall')&&d.small)u=(now%.85)/.85;
   if(u!==null){const pts=detail?(n.localPoints||n.points):n.points,p=P.project(CapitalWiring.pointAt(pts,u));list.push({id:n.id,kind:n.kind,p,color:palette[n.color],bit});}
  }return list;
 }
 function labels(i){if(i===1&&state.detailMode==='sensor')return[{p:[23,12,266],text:'连续平顶面'},{p:[0,0,259],text:'传力压头'},{p:[0,-12,255],text:'内藏测力元件'},{p:[0,-17,251],text:'固定承压座'},{p:[-27,-26,249],text:'桥线 → HX711'}];
  if(i===1&&state.detailMode==='electronics')return[{p:[-100,-105,27],text:'B HX711'},{p:[-43,-107,27],text:'C Arduino Nano'},{p:[-2,-65,27],text:'F 74HC244'},{p:[14,-104,27],text:'D0 M0驱动'},{p:[57,-104,27],text:'D1 S组8路'},{p:[105,-106,27],text:'E 5V'},{p:[-75,-100,24],text:'DT → D3'},{p:[-75,-108,20],text:'D2 → SCK'},{p:[-10,-101,24],text:'D9'},{p:[-25,-82,25],text:'D10'},{p:[-109,-77,29],text:'顶部桥线'},{p:[61,-75,30],text:'至8只端部线圈'}];
  if(i===1)return[{p:[-19,-5,77],text:'弧底 R126'},{p:[E.SMALL_RADIUS-E.RIN-E.W/2,0,124],text:'端部小线圈 S'+(state.selected+1)},{p:[0,-6,12],text:'净宽96 · 净隙2.8 mm'}];
  const a=[{p:[0,0,255],text:'A 内藏测力点'},{p:[90,60,266],text:'连续平顶面'},{p:[24,0,239],text:'M0 中央大线圈'},{p:[-100,-102,26],text:'B HX711'},{p:[-43,-106,26],text:'C Arduino'},{p:[14,-100,26],text:'D0'},{p:[57,-100,26],text:'D1'},{p:[-2,-65,26],text:'F 244'},{p:[105,-106,26],text:'E 5V'}];
  for(let l=0;l<8;l++){const t=(l+.5)*Math.PI/4;a.push({p:[124*Math.cos(t),124*Math.sin(t),218],text:'S'+(l+1)});}return a;
 }
 function paint(i){const ctx=contexts[i],{w,h}=sizes[i];ctx.clearRect(0,0,w,h);const built=scene(i===1);meshes[i]=built.commands;
  for(const c of built.commands){ctx.globalAlpha=c.alpha;if(c.kind==='ball'){const p=c.pts[0],r=Math.max(i===0?.8:1.6,c.radius);ctx.fillStyle=palette.fg;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();continue;}ctx.beginPath();c.pts.forEach((p,k)=>k?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));if(c.kind==='face'){ctx.closePath();ctx.fillStyle=c.col;ctx.fill();}else{ctx.strokeStyle=c.col;ctx.lineWidth=c.width;ctx.setLineDash(c.dashed?[4,4]:[]);ctx.stroke();}}
  ctx.globalAlpha=1;ctx.setLineDash([]);
  for(const m of flowMarkers(i===1)){ctx.beginPath();ctx.arc(m.p.x,m.p.y,i===0?2.7:3.6,0,Math.PI*2);ctx.fillStyle=m.bit===0?palette.bg:m.color;ctx.fill();ctx.strokeStyle=m.color;ctx.lineWidth=1.2;ctx.stroke();}
  ctx.font='12px '+getComputedStyle(root).fontFamily;ctx.textBaseline='middle';labelBounds[i]=[];const P=projection(i);
  for(const l of labels(i)){const p=P.project(l.p),tw=ctx.measureText(l.text).width+6;let x=clamp(p.x-tw/2,2,w-tw-2),y=clamp(p.y-7,10,h-12);for(let k=0;k<25;k++){if(!labelBounds[i].some(b=>x<b.x+b.w&&x+tw>b.x&&Math.abs(y-b.y)<17))break;y=clamp(y+(k%2?-(k+2)*9:(k+2)*9),10,h-12);}
   ctx.strokeStyle=palette.muted;ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(x+tw/2,y);ctx.stroke();ctx.fillStyle=palette.bg;ctx.globalAlpha=.9;ctx.fillRect(x,y-8,tw,16);ctx.globalAlpha=1;ctx.fillStyle=palette.fg;ctx.fillText(l.text,x+3,y);labelBounds[i].push({x,y,w:tw,text:l.text});}
 }
 let previousStatus='';
 function render(){if(!palette||!sizes[0].w)return;paint(0);paint(1);const s=stats(),d=controller.drive(),p=signals.snapshot(controller.state.time,d),fmt=v=>Math.round(v/15*100)+'%';by('pressure').textContent=fmt(s.filtered);by('active').textContent=(d.small?8:0)+' / 8只小线圈';by('current').textContent='D9 '+(d.big?'HIGH':'LOW')+' · D10 '+(d.small?'HIGH':'LOW');by('rise').textContent=s.rise.toFixed(1)+' mm';
  by('signal-sensor-value').textContent='桥信号 '+fmt(p.source);by('signal-hx-value').textContent='采样值 '+fmt(p.hx);by('signal-arduino-value').textContent='收到 '+fmt(p.nano);by('signal-driver-value').textContent='M0 '+(d.big?'开':'关')+' / S×8 '+(d.small?'开':'关');
  for(const k of ['sensor','hx','arduino','driver']){const n=by('signal-'+k);if(k===p.stage)n.setAttribute('aria-current','step');else n.removeAttribute('aria-current');}
  const messages={sensor:'受压：桥式模拟信号沿线传向HX711',hx:'HX711已更新：数字数据传向Arduino D3，D2提供时钟',arduino:'Arduino收到数据：滤波、判阈值并生成两组时序',driver:'Arduino输出：D9控制M0，D10经缓冲控制8只端部线圈',idle:'持续采样待机：等待上部荷载增量'};by('signal-description').textContent=messages[p.stage];
  const text=(state.playing?'':'已暂停 · ')+(state.auto?'自动演示 · ':'手动加载 · ')+(p.pending&&!d.level?messages[p.stage]:d.phase)+(s.tails?' · 待续余波'+s.tails+'轮':'');if(text!==previousStatus){by('status').textContent=text;previousStatus=text;}}
 function resize(){canvases.forEach((c,i)=>{const r=c.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);sizes[i]={w:Math.max(100,r.width),h:Math.max(100,r.height)};c.width=Math.round(sizes[i].w*dpr);c.height=Math.round(sizes[i].h*dpr);contexts[i].setTransform(dpr,0,0,dpr,0,0);});render();}
 function sourceInput(value){tapUntil=-1;signals.input(value,controller.state.time);}
 function automatic(){if(!state.auto)return;const t=controller.state.time%24,v=t>=.7&&t<1.1?4:t>=5.5&&t<13?10:0;if(v!==autoWas){sourceInput(v);autoWas=v;}}
 function step(){automatic();const now=controller.state.time;if(tapUntil>=0&&now>=tapUntil){tapUntil=-1;signals.input(0,now);}signals.tick(now);controller.step(E.STEP);signals.outputs(controller.drive(),controller.state.time);particles.step();}
 function advance(t){if(!Number.isFinite(t)||t<0)return;for(let remaining=t;remaining>=E.STEP-1e-9;remaining-=E.STEP)step();render();}
 function manual(){state.auto=false;autoWas=-1;by('auto').checked=false;}
 by('tap').addEventListener('click',()=>{manual();signals.input(4,controller.state.time);tapUntil=controller.state.time+.35;sync();render();});by('hold').addEventListener('click',()=>{manual();if(!state.force)state.force=10;sourceInput(state.force);sync();render();});by('release').addEventListener('click',()=>{manual();sourceInput(0);sync();render();});
 by('force').addEventListener('input',()=>{manual();state.force=Number(by('force').value)*.15;sourceInput(state.force);sync();save();render();});
 by('selected').addEventListener('change',()=>{state.selected=Number(by('selected').value);state.detailMode='chamber';sync();save();render();});
 by('detail-mode').addEventListener('change',()=>{state.detailMode=by('detail-mode').value;sync();save();render();});by('topcut').addEventListener('change',()=>{state.cutTop=by('topcut').checked;save();render();});
 by('show-flow').addEventListener('change',()=>{state.showFlow=by('show-flow').checked;save();render();});by('slow-signal').addEventListener('change',()=>{state.slowSignal=by('slow-signal').checked;signals.setSlow(state.slowSignal,controller.state.time);save();render();});
 by('count').addEventListener('input',()=>{const n=Number(by('count').value);if(!Number.isInteger(n)||n<50||n>400)return;state.beadCount=n;resetParticles();sync();save();render();});
 for(const k of Object.keys(limits))by(k).addEventListener('input',()=>{const n=Number(by(k).value);if(n<limits[k][0]||n>limits[k][1])return;state.durations[k]=n;reset();sync();save();render();});
 for(const k of ['big','small'])by('current-'+k).addEventListener('input',()=>{state.currents[k]=Number(by('current-'+k).value);particles.currents={...state.currents};sync();save();render();});
 by('auto').addEventListener('change',()=>{state.auto=by('auto').checked;controller.release();autoWas=-1;sync();render();});by('play').addEventListener('click',()=>{state.playing=!state.playing;last=0;sync();render();});
 by('fit').addEventListener('click',()=>{setView(state.view);sync();save();render();});by('view').addEventListener('change',()=>{setView(by('view').value);save();render();});for(const k of ['wires','open'])by(k).addEventListener('change',()=>{state[k]=by(k).checked;save();render();});
 canvases.forEach((c,i)=>{c.addEventListener('pointerdown',e=>{if(e.button!==0&&e.button!==undefined)return;drag[i]={id:e.pointerId,x:e.clientX,y:e.clientY};try{c.setPointerCapture(e.pointerId);}catch(_){}});c.addEventListener('pointermove',e=>{const d=drag[i];if(!d||d.id!==e.pointerId)return;state.cameras[i].yaw+=(e.clientX-d.x)*.008;if(e.pointerType!=='touch')state.cameras[i].elev=clamp(state.cameras[i].elev+(e.clientY-d.y)*.005,-.2,1.5);d.x=e.clientX;d.y=e.clientY;render();});for(const ev of ['pointerup','pointercancel','lostpointercapture'])c.addEventListener(ev,()=>{drag[i]=null;});c.addEventListener('wheel',e=>{if(!e.ctrlKey&&!e.shiftKey)return;e.preventDefault();state.cameras[i].zoom=clamp(state.cameras[i].zoom*Math.exp(-e.deltaY*.001),.65,1.35);render();},{passive:false});});window.addEventListener('blur',()=>drag.fill(null));
 reduced.addEventListener?.('change',e=>{if(e.matches){state.playing=false;sync();render();}});matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',()=>{theme();render();});
 const observer=new ResizeObserver(resize);canvases.forEach(c=>observer.observe(c));const themes=new MutationObserver(()=>{theme();render();});themes.observe(document.documentElement,{attributes:true,attributeFilter:['class','style','data-theme']});window.addEventListener('pagehide',()=>{disposed=true;observer.disconnect();themes.disconnect();});
 window.addEventListener('openai:set_globals',e=>{if(applySaved(e.detail?.globals?.widgetState)){reset();sync();render();}});
 function frame(now){if(disposed)return;if(state.playing&&last){accumulator=Math.min(.16,accumulator+Math.min(.08,(now-last)/1000));const start=performance.now();let count=0;while(accumulator>=E.STEP&&count<4){step();accumulator-=E.STEP;count++;if(performance.now()-start>=8)break;}}last=now;if(now-lastDraw>=50){render();lastDraw=now;}requestAnimationFrame(frame);}
 theme();sync();resize();
 // Keep a useful static scene available while the document finishes loading.
 // Starting the simulation after load prevents animation work from competing with navigation.
 if(document.readyState==='complete')requestAnimationFrame(frame);
 else window.addEventListener('load',()=>requestAnimationFrame(frame),{once:true});
 window.__pressPrototype={state,get controller(){return controller;},get particles(){return particles;},get signals(){return signals;},get sceneBuilds(){return sceneBuilds;},stats,advance,render,scene,sizes,labelBounds,drag,flowMarkers,reset:()=>{reset();sync();render();},setView,geometry:()=>meshes,branchSignals:()=>Array.from({length:8},(_,id)=>({id,...controller.drive()}))};
})();
