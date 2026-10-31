(function(){
 'use strict';
 const root=document.getElementById('press-prototype'),by=id=>root.querySelector('#press-'+id),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const E=window.VerticalGranular,reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const defaults={lead:.8,overlap:.3,hold:.3,allOff:1.4};
 const state={playing:!reduced.matches,auto:true,force:10,selected:6,beadCount:200,wires:true,open:false,cutTop:false,detailMode:'sensor',view:'perspective',durations:{...defaults},currents:{big:1.8,small:1.6},cameras:[{yaw:-.48,elev:.29,zoom:1},{yaw:-.20,elev:.10,zoom:1}]};
 let controller,particles,initialMean,last=0,lastDraw=0,accumulator=0,autoWas=-1,palette,scenePalette,disposed=false;
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

 function theme(){scenePalette={bg:rgbToken('--background'),fg:rgbToken('--foreground'),muted:rgbToken('--muted-foreground'),surface:rgbToken('--muted'),edge:rgbToken('--border'),coil:rgbToken('--viz-series-1'),particle:rgbToken('--viz-series-2'),spacer:rgbToken('--viz-series-3'),small:rgbToken('--viz-series-4')};palette=Object.fromEntries(Object.entries(scenePalette).map(([k,v])=>[k,'rgb('+v.join(',')+')']));}
 const limits={lead:[.2,5],overlap:[.1,3],hold:[.1,3],allOff:[.5,6]},base=()=>Object.values(state.durations).reduce((s,x)=>s+x,0);
 function validDurations(v){return v&&Object.entries(limits).every(([k,[lo,hi]])=>Number.isFinite(v[k])&&v[k]>=lo&&v[k]<=hi);}
 function setView(v){state.view=v;state.cameras=[{yaw:-.48,elev:.29,zoom:1},{yaw:-.20,elev:.10,zoom:1}];if(v==='front')state.cameras[0]={yaw:0,elev:0,zoom:1};if(v==='top')state.cameras[0]={yaw:0,elev:1.49,zoom:1};}
 function applySaved(saved){const s=saved?.privateContent;if(s?.kind!=='capital-central-relay-v1')return;
  if(Number.isFinite(s.force))state.force=clamp(s.force,0,15);if(Number.isInteger(s.selected))state.selected=clamp(s.selected,0,7);
  if(Number.isInteger(s.beadCount)&&s.beadCount>=50&&s.beadCount<=400)state.beadCount=s.beadCount;
  if(validDurations(s.durations))state.durations={...s.durations};
  if(s.currents&&['big','small'].every(k=>Number.isFinite(s.currents[k])&&s.currents[k]>=.5&&s.currents[k]<=2.5))state.currents={...s.currents};
  for(const k of ['wires','open','cutTop'])if(typeof s[k]==='boolean')state[k]=s[k];if(['sensor','chamber'].includes(s.detailMode))state.detailMode=s.detailMode;if(['perspective','front','top'].includes(s.view))setView(s.view);
 }
 try{applySaved(window.openai?.widgetState||JSON.parse(localStorage.getItem('capital-central-relay-v1')||'null'));}catch(_){}
 function save(){const s={kind:'capital-central-relay-v1',force:state.force,selected:state.selected,beadCount:state.beadCount,durations:{...state.durations},currents:{...state.currents},wires:state.wires,open:state.open,cutTop:state.cutTop,detailMode:state.detailMode,view:state.view};try{window.openai?.setWidgetState({modelContent:{structure:'flat top with concealed sensor; central + 8 end coils, all axes Z',pressureIncrement_percent:state.force/15*100,beads:state.beadCount*8,timing:state.durations},privateContent:s})?.catch(()=>{});localStorage.setItem(s.kind,JSON.stringify({privateContent:s}));}catch(_){} }
 const proxy={scenario:'normal',get layers(){return Array(8).fill(particles.layers[0]);},drive:()=>controller.drive(),stats:()=>particles.stats(0)};
 function resetParticles(){particles=E.createWorld({layerCount:1,beadCount:state.beadCount,currents:state.currents});particles.drive=()=>controller.drive();initialMean=particles.stats(0).meanHeight;}
 function reset(){controller=LoadRelay.create(()=>state.durations);resetParticles();autoWas=-1;accumulator=0;}
 reset();
 function stats(){return{...controller.stats(),meanHeight:particles.stats(0).meanHeight,rise:Math.max(0,particles.stats(0).meanHeight-initialMean)};}
 function sync(){by('force').value=Math.round(state.force/15*100);by('force-value').textContent=Math.round(state.force/15*100)+'%';by('selected').value=state.selected;by('count').value=state.beadCount;by('count-value').textContent=state.beadCount+' / 腔 · 共'+state.beadCount*8+'颗';
  for(const k of Object.keys(limits)){by(k).value=state.durations[k];by(k+'-value').textContent=Number(state.durations[k].toFixed(1))+' s';}
  for(const k of ['big','small']){by('current-'+k).value=state.currents[k];by('current-'+k+'-value').textContent=state.currents[k].toFixed(1)+'×';}
  by('wires').checked=state.wires;by('open').checked=state.open;by('open').disabled=state.detailMode==='sensor';by('topcut').checked=state.cutTop;by('detail-mode').value=state.detailMode;by('view').value=state.view;by('auto').checked=state.auto;by('play').textContent=state.playing?'暂停动画':'播放动画';by('hold').setAttribute('aria-pressed',String(!state.auto&&controller.state.raw>0&&controller.state.tapUntil<0));by('period').textContent=base().toFixed(1)+' s';by('detail-caption').textContent=state.detailMode==='sensor'?'顶板中央局部剖面 · 测力元件内藏':'第'+(state.selected+1)+'腔 · '+state.beadCount+'颗 · 与整机统一触发';by('detail').setAttribute('aria-label',state.detailMode==='sensor'?'平整顶板下方依次为传力压头、内藏应变式测力元件和固定承压座；剖开仅供观察。':'所选弧底透明薄腔，端部线圈随统一信号接力吸附，全部断电后铁珠落回。');}
 function projection(i){const {w,h}=sizes[i],original=state.cameras[i],sensor=i===1&&state.detailMode==='sensor',c=sensor?{...original,elev:.38}:original,bounds=i===0?[[-150,150],[-140,140],[0,301]]:sensor?[[-48,48],[-34,34],[246,277]]:[[-50,62],[state.open?-16:-12,12],[0,128]],ca=Math.cos(c.yaw),sa=Math.sin(c.yaw),ce=Math.cos(c.elev),se=Math.sin(c.elev);
  function rotate(p){return{x:p[0]*ca+p[1]*sa,y:-p[0]*sa*se+p[1]*ca*se+p[2]*ce,d:p[0]*sa*ce-p[1]*ca*ce+p[2]*se};}
  const pts=[];for(const x of bounds[0])for(const y of bounds[1])for(const z of bounds[2])pts.push(rotate([x,y,z]));const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y),lx=Math.min(...xs),hx=Math.max(...xs),ly=Math.min(...ys),hy=Math.max(...ys),scale=Math.min((w-2*Math.min(w*.12,46))/(hx-lx),(h-2*Math.min(h*.13,48))/(hy-ly))*c.zoom;
  return{scale,project(p){const v=rotate(p);return{x:w/2+(v.x-(lx+hx)/2)*scale,y:h/2-6-(v.y-(ly+hy)/2)*scale,d:v.d};}};
 }
 const meshes=[[],[]];
 function scene(detail){const i=detail?1:0,P=projection(i),sceneState={selected:state.selected,beadCount:state.beadCount,open:true,explode:state.open,cutTop:state.cutTop,view:state.view};return window.RelayReferenceScene(detail&&state.detailMode==='sensor'?2:i,P,sceneState,proxy,scenePalette,controller.state.raw,state.wires);}
 function labels(i){if(i===1&&state.detailMode==='sensor')return[{p:[23,12,266],text:'连续平顶面'},{p:[0,0,259],text:'传力压头'},{p:[0,-12,255],text:'内藏测力元件'},{p:[0,-17,251],text:'固定承压座'},{p:[-27,-26,249],text:'桥线 → HX711'}];
  if(i===1)return[{p:[-19,-5,77],text:'弧底 R126'},{p:[E.SMALL_RADIUS-E.RIN-E.W/2,0,124],text:'端部小线圈 S'+(state.selected+1)},{p:[0,-6,12],text:'净宽96 · 净隙2.8 mm'}];
  const a=[{p:[0,0,255],text:'A 内藏测力点'},{p:[90,60,266],text:'连续平顶面'},{p:[24,0,239],text:'M0 中央大线圈'},{p:[-100,-102,26],text:'B HX711'},{p:[-43,-106,26],text:'C 控制器'},{p:[32,-100,26],text:'D 两组驱动'},{p:[100,-106,26],text:'E 5V降压'}];
  for(let l=0;l<8;l++){const t=(l+.5)*Math.PI/4;a.push({p:[124*Math.cos(t),124*Math.sin(t),218],text:'S'+(l+1)});}return a;
 }
 function paint(i){const ctx=contexts[i],{w,h}=sizes[i];ctx.clearRect(0,0,w,h);const built=scene(i===1);meshes[i]=built.commands;
  for(const c of built.commands){ctx.globalAlpha=c.alpha;if(c.kind==='ball'){const p=c.pts[0],r=Math.max(i===0?.8:1.6,c.radius);ctx.fillStyle=palette.fg;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();continue;}ctx.beginPath();c.pts.forEach((p,k)=>k?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));if(c.kind==='face'){ctx.closePath();ctx.fillStyle=c.col;ctx.fill();}else{ctx.strokeStyle=c.col;ctx.lineWidth=c.width;ctx.setLineDash(c.dashed?[4,4]:[]);ctx.stroke();}}
  ctx.globalAlpha=1;ctx.setLineDash([]);ctx.font='12px '+getComputedStyle(root).fontFamily;ctx.textBaseline='middle';labelBounds[i]=[];const P=projection(i);
  for(const l of labels(i)){const p=P.project(l.p),tw=ctx.measureText(l.text).width+6;let x=clamp(p.x-tw/2,2,w-tw-2),y=clamp(p.y-7,10,h-12);for(let k=0;k<25;k++){if(!labelBounds[i].some(b=>x<b.x+b.w&&x+tw>b.x&&Math.abs(y-b.y)<17))break;y=clamp(y+(k%2?-(k+2)*9:(k+2)*9),10,h-12);}
   ctx.strokeStyle=palette.muted;ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(x+tw/2,y);ctx.stroke();ctx.fillStyle=palette.bg;ctx.globalAlpha=.9;ctx.fillRect(x,y-8,tw,16);ctx.globalAlpha=1;ctx.fillStyle=palette.fg;ctx.fillText(l.text,x+3,y);labelBounds[i].push({x,y,w:tw,text:l.text});}
 }
 let previousStatus='';
 function render(){if(!palette||!sizes[0].w)return;paint(0);paint(1);const s=stats(),d=controller.drive();by('pressure').textContent=Math.round(s.filtered/15*100)+'%';by('active').textContent=(d.small?8:0)+' / 8只小线圈';by('current').textContent='M0 '+(d.big?'开':'关')+' · S组 '+(d.small?'开':'关');by('rise').textContent=s.rise.toFixed(1)+' mm';const text=(state.playing?'':'已暂停 · ')+(state.auto?'自动演示 · ':'手动加载 · ')+d.phase+(s.tails?' · 待续余波'+s.tails+'轮':'');if(text!==previousStatus){by('status').textContent=text;previousStatus=text;}}
 function resize(){canvases.forEach((c,i)=>{const r=c.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);sizes[i]={w:Math.max(100,r.width),h:Math.max(100,r.height)};c.width=Math.round(sizes[i].w*dpr);c.height=Math.round(sizes[i].h*dpr);contexts[i].setTransform(dpr,0,0,dpr,0,0);});render();}
 function automatic(){if(!state.auto)return;const t=controller.state.time%24,v=t>=.7&&t<1.1?4:t>=5.5&&t<13?10:0;if(v!==autoWas){controller.hold(v);autoWas=v;}}
 function step(){automatic();controller.step(E.STEP);particles.step();}
 function advance(t){if(!Number.isFinite(t)||t<0)return;for(let remaining=t;remaining>=E.STEP-1e-9;remaining-=E.STEP)step();render();}
 function manual(){state.auto=false;autoWas=-1;by('auto').checked=false;}
 by('tap').addEventListener('click',()=>{manual();controller.tap();sync();render();});by('hold').addEventListener('click',()=>{manual();if(!state.force)state.force=10;controller.hold(state.force);sync();render();});by('release').addEventListener('click',()=>{manual();controller.release();sync();render();});
 by('force').addEventListener('input',()=>{manual();state.force=Number(by('force').value)*.15;controller.hold(state.force);sync();save();render();});
 by('selected').addEventListener('change',()=>{state.selected=Number(by('selected').value);state.detailMode='chamber';sync();save();render();});
 by('detail-mode').addEventListener('change',()=>{state.detailMode=by('detail-mode').value;sync();save();render();});by('topcut').addEventListener('change',()=>{state.cutTop=by('topcut').checked;save();render();});
 by('count').addEventListener('input',()=>{const n=Number(by('count').value);if(!Number.isInteger(n)||n<50||n>400)return;state.beadCount=n;resetParticles();sync();save();render();});
 for(const k of Object.keys(limits))by(k).addEventListener('input',()=>{const n=Number(by(k).value);if(n<limits[k][0]||n>limits[k][1])return;state.durations[k]=n;reset();sync();save();render();});
 for(const k of ['big','small'])by('current-'+k).addEventListener('input',()=>{state.currents[k]=Number(by('current-'+k).value);particles.currents={...state.currents};sync();save();render();});
 by('auto').addEventListener('change',()=>{state.auto=by('auto').checked;controller.release();autoWas=-1;sync();render();});by('play').addEventListener('click',()=>{state.playing=!state.playing;last=0;sync();render();});
 by('fit').addEventListener('click',()=>{setView(state.view);sync();save();render();});by('view').addEventListener('change',()=>{setView(by('view').value);save();render();});for(const k of ['wires','open'])by(k).addEventListener('change',()=>{state[k]=by(k).checked;save();render();});
 canvases.forEach((c,i)=>{c.addEventListener('pointerdown',e=>{if(e.button!==0&&e.button!==undefined)return;drag[i]={id:e.pointerId,x:e.clientX,y:e.clientY};try{c.setPointerCapture(e.pointerId);}catch(_){}});c.addEventListener('pointermove',e=>{const d=drag[i];if(!d||d.id!==e.pointerId)return;state.cameras[i].yaw+=(e.clientX-d.x)*.008;if(e.pointerType!=='touch')state.cameras[i].elev=clamp(state.cameras[i].elev+(e.clientY-d.y)*.005,-.2,1.5);d.x=e.clientX;d.y=e.clientY;render();});for(const ev of ['pointerup','pointercancel','lostpointercapture'])c.addEventListener(ev,()=>{drag[i]=null;});c.addEventListener('wheel',e=>{if(!e.ctrlKey&&!e.shiftKey)return;e.preventDefault();state.cameras[i].zoom=clamp(state.cameras[i].zoom*Math.exp(-e.deltaY*.001),.65,1.35);render();},{passive:false});});window.addEventListener('blur',()=>drag.fill(null));
 reduced.addEventListener?.('change',e=>{if(e.matches){state.playing=false;sync();render();}});matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',()=>{theme();render();});
 const observer=new ResizeObserver(resize);canvases.forEach(c=>observer.observe(c));const themes=new MutationObserver(()=>{theme();render();});themes.observe(document.documentElement,{attributes:true,attributeFilter:['class','style','data-theme']});window.addEventListener('pagehide',()=>{disposed=true;observer.disconnect();themes.disconnect();});
 window.addEventListener('openai:set_globals',e=>{applySaved(e.detail?.globals?.widgetState);reset();sync();render();});
 function frame(now){if(disposed)return;if(state.playing&&last){accumulator=Math.min(.16,accumulator+Math.min(.08,(now-last)/1000));const start=performance.now();let count=0;while(accumulator>=E.STEP&&count<4){step();accumulator-=E.STEP;count++;if(performance.now()-start>=8)break;}}last=now;if(now-lastDraw>=50){render();lastDraw=now;}requestAnimationFrame(frame);}
 theme();sync();resize();
 // Keep a useful static scene available while the document finishes loading.
 // Starting the simulation after load prevents animation work from competing with navigation.
 if(document.readyState==='complete')requestAnimationFrame(frame);
 else window.addEventListener('load',()=>requestAnimationFrame(frame),{once:true});
 window.__pressPrototype={state,get controller(){return controller;},get particles(){return particles;},stats,advance,render,scene,sizes,labelBounds,drag,reset:()=>{reset();sync();render();},setView,geometry:()=>meshes,branchSignals:()=>Array.from({length:8},(_,id)=>({id,...controller.drive()}))};
})();
