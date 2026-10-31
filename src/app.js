
window.RelayTimingData={"recommended":{"id":"refine_hold09","label":"端部短停0.9秒","timing":{"bigOn":0.5,"smallOn":3,"bigOff":4.2,"smallOff":5.1000000000000005,"period":8.600000000000001},"durations":{"lead":2.5,"overlap":1.2,"hold":0.9,"allOff":4},"meanVerticalRange":88.4829334177572,"meanRadialRange":44.86879184787186,"p10VerticalRange":71.21552641445325,"returnedFraction":1,"innerFraction":0.86,"endMeanHeight":19.778412184934623},"previous":{"id":"previous","label":"上一版","timing":{"bigOn":1,"smallOn":4,"bigOff":6,"smallOff":9,"period":12},"durations":{"lead":3,"overlap":2,"hold":3,"allOff":4},"meanVerticalRange":88.21018590922999,"meanRadialRange":35.05341588307282,"p10VerticalRange":73.91829643759556,"returnedFraction":1,"innerFraction":0.88,"endMeanHeight":19.201383899930455},"gentle":{"timing":{"bigOn":0.2,"smallOn":2,"bigOff":2.6,"smallOff":3,"period":5.3}},"fast":{"timing":{"bigOn":0.2,"smallOn":1,"bigOff":1.3,"smallOff":1.6,"period":2.8}}};
(() => {
 const launch=()=>{
  const root=document.getElementById('branch-relay-v4');if(!root)return;
  try{
  const el=id=>root.querySelector('#'+id),reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const defaults=[{az:-.48,el:.29,zoom:1},{az:-.20,el:.10,zoom:1}];
  const state={playing:!reduced,speed:1,open:true,explode:false,selected:6,view:'perspective',timingPreset:'fast',beadCount:window.VerticalGranular.DEFAULT_COUNT,currents:{big:1.8,small:1.6},cameras:defaults.map(c=>({...c}))};
  let world=window.VerticalGranular.createWorld({timing:window.RelayTimingData.fast.timing,beadCount:state.beadCount,currents:state.currents});world.advance(.1);
  const E=window.VerticalGranular,{W,H,BASE,RIN}=E;
  const canvases=[el('vr-whole'),el('vr-detail')],contexts=canvases.map(c=>c.getContext('2d'));
  if(contexts.some(c=>!c))throw new Error('当前浏览器不能创建绘图上下文');
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],sub=(a,b)=>a.map((v,i)=>v-b[i]);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>{const n=Math.hypot(...a)||1;return a.map(v=>v/n);};
  let palette={},fontSize=14,last=0,lastDraw=0,clockId=0,dirty=true,accumulator=0,lastPhase='';
  const sizes=[{w:0,h:0},{w:0,h:0}],meshes=[[],[]],labelRegions=[[],[]];
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

  function updateTheme() {
    palette={bg:rgbToken('--background'),fg:rgbToken('--foreground'),muted:rgbToken('--muted-foreground'),
      surface:rgbToken('--muted'),edge:rgbToken('--border'),coil:rgbToken('--viz-series-1'),particle:rgbToken('--viz-series-2'),spacer:rgbToken('--viz-series-3'),small:rgbToken('--viz-series-4')};
    fontSize=parseFloat(getComputedStyle(root).fontSize)||14;dirty=true;
  }
  function color(c,shade=1) {return 'rgb('+c.map(v=>Math.round(clamp(v*shade,0,255))).join(',')+')';}
  function mix(a,b,t){return a.map((v,i)=>v*(1-t)+b[i]*t);}


  function sync(){for(const k of ['big','small']){el('vr-current-'+k).value=String(state.currents[k]);el('vr-current-'+k).setAttribute('aria-valuetext',state.currents[k].toFixed(1)+'倍相对电流');el('vr-current-value-'+k).textContent=state.currents[k].toFixed(1);}el('vr-count').value=String(state.beadCount);el('vr-count').setAttribute('aria-valuetext','每腔'+state.beadCount+'颗，整机'+(state.beadCount*8)+'颗');for(const scope of [root,document.getElementById('relay-notes')].filter(Boolean)){for(const n of scope.querySelectorAll('[data-bead-count]'))n.textContent=String(state.beadCount);for(const n of scope.querySelectorAll('[data-bead-total]'))n.textContent=String(state.beadCount*8);}el('vr-play').textContent=state.playing?'暂停':'播放';el('vr-mode').value=world.mode;el('vr-scenario').value=world.scenario;el('vr-preset').value=state.timingPreset;el('vr-speed').value=String(state.speed);el('vr-select').value=String(state.selected);el('vr-view').value=state.view;el('vr-open').checked=state.open;el('vr-explode').checked=state.explode;syncScheduleText();}
  const durationLimits={lead:[.2,5],overlap:[.1,3],hold:[.1,3],allOff:[.5,6]};
  function getDurations(){const t=world.timing;return{lead:t.smallOn-t.bigOn,overlap:t.bigOff-t.smallOn,hold:t.smallOff-t.bigOff,allOff:t.period-t.smallOff+t.bigOn};}
  function validDurations(d){return d&&Object.entries(durationLimits).every(([k,[min,max]])=>Number.isFinite(d[k])&&d[k]>=min-1e-8&&d[k]<=max+1e-8);}
  function timingFromDurations(d){const bigOn=.2,smallOn=bigOn+d.lead,bigOff=smallOn+d.overlap,smallOff=bigOff+d.hold;return{bigOn,smallOn,bigOff,smallOff,period:d.lead+d.overlap+d.hold+d.allOff};}
  function setDurations(d){if(!validDurations(d))return false;world.timing=timingFromDurations(d);state.timingPreset='custom';seek(.1);save();return true;}
  function syncScheduleText(){const t=world.timing,fmt=v=>String(Number(v.toFixed(1))),notes=document.getElementById('relay-notes');const fields={...t,...getDurations()};for(const scope of [root,notes].filter(Boolean))for(const n of scope.querySelectorAll('[data-time-key]'))n.textContent=fmt(fields[n.dataset.timeKey]);for(const key of Object.keys(durationLimits)){const slider=el('vr-duration-'+key);slider.value=fmt(fields[key]);slider.setAttribute('aria-valuetext',fmt(fields[key])+'秒');}const label=notes?.querySelector('#timing-preset-label');if(label)label.textContent={fast:'强驱动快速周期：2.8秒（模型）',gentle:'对照：5.3秒时序（模型）',recommended:'对照：大行程时序（模型）',previous:'对照：更早的12秒时序（模型）',custom:'自定义时序（模型）'}[state.timingPreset];}
  function save(){const p={kind:'branch-relay-v4',timingPreset:state.timingPreset,beadCount:state.beadCount,countRevision:2,driveRevision:1,currents:{...state.currents},durations:getDurations(),scenario:world.scenario,selected:state.selected,open:state.open,explode:state.explode,view:state.view,speed:state.speed,cameras:state.cameras};window.openai?.setWidgetState?.({modelContent:{kind:'branch-relay-v4',chambers:8,beads:state.beadCount*8,beadsPerChamber:state.beadCount,coils:9,placement:'outer-end',coilAxis:'Z',smallCoilRadius:118,timingPreset:state.timingPreset,timing:world.timing,currents:state.currents,driveRevision:1,sequence:'big on > small on > big off > small off',scenario:world.scenario,selectedChamber:state.selected+1,qualitativeModel:true},privateContent:p}).catch(()=>{});}
  function applySaved(saved){const p=saved?.privateContent;if(p?.kind!=='branch-relay-v4')return;if(p.driveRevision===1&&p.currents&&['big','small'].every(k=>Number.isFinite(p.currents[k])&&p.currents[k]>=.5&&p.currents[k]<=2.5)){state.currents={...p.currents};world.currents={...state.currents};}const restoredCount=p.countRevision===2?p.beadCount:p.beadCount*2;if(Number.isInteger(restoredCount)&&restoredCount>=E.MIN_COUNT&&restoredCount<=E.MAX_COUNT){state.beadCount=restoredCount;world=E.createWorld({timing:world.timing,beadCount:state.beadCount,currents:state.currents});}if(p.driveRevision===1&&['fast','gentle','recommended','previous'].includes(p.timingPreset)){state.timingPreset=p.timingPreset;world.timing={...window.RelayTimingData[state.timingPreset].timing};}else if(p.driveRevision===1&&p.timingPreset==='custom'&&validDurations(p.durations)){state.timingPreset='custom';world.timing=timingFromDurations(p.durations);}if(['normal','weak','startweak'].includes(p.scenario))world.scenario=p.scenario;for(const k of ['open','explode'])if(typeof p[k]==='boolean')state[k]=p[k];if(Number.isInteger(p.selected))state.selected=clamp(p.selected,0,7);if(['perspective','top','front'].includes(p.view))state.view=p.view;if([.5,1,2].includes(p.speed))state.speed=p.speed;if(Array.isArray(p.cameras))p.cameras.slice(0,2).forEach((c,i)=>{if(c&&[c.az,c.el,c.zoom].every(Number.isFinite))state.cameras[i]={az:c.az,el:clamp(c.el,-.15,1.5),zoom:clamp(c.zoom,.65,1.6)};});seek(.1);dirty=true;}
  function resize(){canvases.forEach((c,i)=>{const r=c.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);sizes[i]={w:Math.max(1,r.width),h:Math.max(1,r.height),dpr};c.width=Math.round(sizes[i].w*dpr);c.height=Math.round(sizes[i].h*dpr);contexts[i].setTransform(dpr,0,0,dpr,0,0);});dirty=true;}
    function camera(index,bounds) {
    const c=state.cameras[index],w=sizes[index].w,h=sizes[index].h;
    const right=[Math.cos(c.az),Math.sin(c.az),0];
    const up=[-Math.sin(c.az)*Math.sin(c.el),Math.cos(c.az)*Math.sin(c.el),Math.cos(c.el)];
    const out=[Math.sin(c.az)*Math.cos(c.el),-Math.cos(c.az)*Math.cos(c.el),Math.sin(c.el)];
    const mid=bounds.min.map((a,i)=>(a+bounds.max[i])/2);
    const corners=[];
    for(const x of [bounds.min[0],bounds.max[0]])for(const y of [bounds.min[1],bounds.max[1]])for(const z of [bounds.min[2],bounds.max[2]])corners.push([x,y,z]);
    const xx=corners.map(p=>dot(sub(p,mid),right)),yy=corners.map(p=>dot(sub(p,mid),up));
    const padX=Math.min(w*.12,46),padY=Math.min(h*.13,48);
    const scale=Math.min((w-padX*2)/(Math.max(...xx)-Math.min(...xx)),(h-padY*2)/(Math.max(...yy)-Math.min(...yy)))*c.zoom;
    const cx=w/2,cy=h/2-6;
    function project(p){const a=sub(p,mid);return {x:cx+dot(a,right)*scale,y:cy-dot(a,up)*scale,d:dot(a,out),scale};}
    return {project,out,right,up,scale,w,h};
  }

  function buildScene(index,projector){
       const commands=[];
    const addFace=(v,col,alpha=1,edge=false)=>{
      const normal=norm(cross(sub(v[1],v[0]),sub(v[2],v[0])));
      const light=norm([-0.45,-0.65,0.9]);
      const shade=0.72+0.28*Math.abs(dot(normal,light));
      const pts=v.map(projector.project);
      commands.push({kind:'face',pts,depth:pts.reduce((s,p)=>s+p.d,0)/pts.length,col:color(col,shade),alpha,edge});
    };
    const addLine=(v,col,width=1,alpha=1,dashed=false)=>{
      const pts=v.map(projector.project);
      commands.push({kind:'line',pts,depth:pts.reduce((s,p)=>s+p.d,0)/pts.length+0.015,col:color(col),alpha,width,dashed});
    };
    function ring(r,ri,z0,z1,col,origin,opts={}) {
      const cut=opts.cut??false,alpha=opts.alpha??1;
      const start=cut?(-Math.PI/2+Math.PI*0.34):0;
      const span=cut?Math.PI*1.32:Math.PI*2;
      const n=opts.segments || (cut?28:36);
      const p=(rr,a,z)=>[origin[0]+rr*Math.cos(a),origin[1]+rr*Math.sin(a),origin[2]+z];
      for(let j=0;j<n;j++){
        const a=start+span*j/n,b=start+span*(j+1)/n;
        addFace([p(r,a,z0),p(r,b,z0),p(r,b,z1),p(r,a,z1)],col,alpha);
        if(ri>0)addFace([p(ri,b,z0),p(ri,a,z0),p(ri,a,z1),p(ri,b,z1)],col,alpha);
        addFace([p(ri,a,z1),p(r,a,z1),p(r,b,z1),p(ri,b,z1)],col,alpha);
        addFace([p(ri,b,z0),p(r,b,z0),p(r,a,z0),p(ri,a,z0)],col,alpha);
      }
      if(cut)for(const a of [start,start+span])addFace([p(ri,a,z0),p(r,a,z0),p(r,a,z1),p(ri,a,z1)],mix(col,palette.fg,0.12),alpha);
      for(const z of [z0,z1]){
        const pts=[];for(let k=0;k<=n;k++)pts.push(p(r,start+span*k/n,z));
        addLine(pts,palette.muted,0.7,0.6);
      }
    }
    function box(x0,y0,z0,x1,y1,z1,col,alpha=1){
      const v=[[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]];
      for(const f of [[0,1,2,3],[4,7,6,5],[0,4,5,1],[1,5,6,2],[2,6,7,3],[3,7,4,0]])addFace(f.map(i=>v[i]),col,alpha);
    }

   const drive=world.drive(),neutral=mix(palette.surface,palette.fg,.26),glass=mix(palette.surface,palette.bg,.5),steel=mix(palette.fg,palette.bg,.48);
   function rotatedBox(x0,y0,z0,x1,y1,z1,col,alpha,transform){const v=[[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]];for(const f of [[0,1,2,3],[4,7,6,5],[0,4,5,1],[1,5,6,2],[2,6,7,3],[3,7,4,0]])addFace(f.map(i=>transform(v[i])),col,alpha);}
   function outline(x0,y,z0,x1,z1,col,alpha,width,transform){addLine([[x0,y,z0],[x1,y,z0],[x1,y,z1],[x0,y,z1],[x0,y,z0]].map(transform),col,width,alpha);}
   const theta=l=>(l+.5)*Math.PI/4;
   const radial=l=>v=>{const t=theta(l),r=v[0]+RIN;return[r*Math.cos(t)-v[1]*Math.sin(t),r*Math.sin(t)+v[1]*Math.cos(t),BASE+v[2]];};
   function branchCoil(l,detail=false){
    const a=theta(l),r=E.SMALL_RADIUS,origin=detail?[r-RIN-W/2,0,-BASE]:[r*Math.cos(a),r*Math.sin(a),0];
    const start=commands.length,c=drive.small?palette.small:mix(palette.small,palette.muted,.72);
    // All nine winding planes are horizontal; every winding axis is world +Z.
    ring(3,0,227,242,steel,origin,{segments:20});
    ring(9,4,232,240,c,origin,{segments:32,alpha:.95});
    ring(10,4,231,232,neutral,origin,{segments:32,alpha:.8});ring(10,4,240,241,neutral,origin,{segments:32,alpha:.8});
    for(let i=0;i<9;i++){const pts=[];for(let k=0;k<=40;k++){const t=k*Math.PI/20;pts.push([origin[0]+9.03*Math.cos(t),origin[1]+9.03*Math.sin(t),origin[2]+232.4+i*.83]);}addLine(pts,palette.small,.65,drive.small?.85:.25);}
    const ax=[origin[0],origin[1],origin[2]+246];addLine([[origin[0],origin[1],origin[2]+227],ax],palette.muted,.8,.65,true);addLine([[ax[0]-1.2,ax[1],ax[2]-2],ax,[ax[0]+1.2,ax[1],ax[2]-2]],palette.muted,.8,.65);
    for(let i=start;i<commands.length;i++){commands[i].coilID='S'+(l+1);commands[i].coilAxis=[0,0,1];commands[i].coilCenter=[r*Math.cos(a),r*Math.sin(a),236];}
   }
   // Each sheet stays planar. Its cut lower edge follows the hemisphere section.
   function profile(y){const p=[[0,y,H],[W,y,H]];for(let j=40;j>=0;j--){const x=W*j/40;p.push([x,y,E.floor(x)]);}return p;}
   function sheet(y0,y1,col,alpha,tr,frame,width){
    for(let j=0;j<40;j++){const x0=W*j/40,x1=W*(j+1)/40,f0=E.floor(x0),f1=E.floor(x1);for(const y of [y0,y1])addFace([[x0,y,f0],[x1,y,f1],[x1,y,H],[x0,y,H]].map(tr),col,alpha);addFace([[x0,y0,f0],[x1,y0,f1],[x1,y1,f1],[x0,y1,f0]].map(tr),col,alpha);}
    addLine([...profile(y0),profile(y0)[0]].map(tr),frame,width,.75);
    addLine([...profile(y1),profile(y1)[0]].map(tr),frame,width,.45);
   }
   function curvedRail(tr,col){for(let j=0;j<48;j++){const x0=W*j/48,x1=W*(j+1)/48,f0=E.floor(x0),f1=E.floor(x1);for(const y of [-2.9,2.9])addFace([[x0,y,f0-1.2],[x1,y,f1-1.2],[x1,y,f1],[x0,y,f0]].map(tr),col,.65);addFace([[x0,-2.9,f0-1.2],[x1,-2.9,f1-1.2],[x1,2.9,f1-1.2],[x0,2.9,f0-1.2]].map(tr),col,.65);addFace([[x0,-2.9,f0],[x1,-2.9,f1],[x1,2.9,f1],[x0,2.9,f0]].map(tr),col,.55);}}
   function chamber(l,detail=false){
    const tr=detail?v=>[v[0]-W/2,v[1],v[2]]:radial(l),chosen=state.selected===l,frame=chosen?palette.spacer:palette.muted,front=detail&&state.explode?-15:-2.9;
    sheet(1.4,2.9,glass,.035,tr,frame,chosen?1.3:.7);
    sheet(front,front+1.5,glass,.025,tr,frame,chosen?1.3:.7);
    // Thin side spacers close the 2.8 mm operating cavity; front panel opens only in the detail.
    curvedRail(tr,neutral);
    for(const b of [[-1,-2.9,H,W+1,2.9,H+1],[-1,-2.9,E.floor(0)-1,0,2.9,H],[W,-2.9,E.floor(W)-1,W+1,2.9,H]])rotatedBox(...b,neutral,.55,tr);
    for(const p of world.layers[l]){
     const xyz=tr([p.x,0,p.z]),v=projector.project(xyz);
     commands.push({kind:'ball',id:p.id,world:xyz,pts:[v],depth:v.d,col:color(steel),radius:projector.scale,alpha:1});
    }
    // Pole underside and the transparent ceiling remain fixed during operation.
    if(detail){rotatedBox(-1,-4.5,H+2,W+1,4.5,H+5,steel,.80,tr);branchCoil(l,true);}
    if(detail){
     if(drive.big>.05)for(const x of [15,36,58,80]){
      const bottom=Math.max(E.floor(x)+8,H-34);addLine([[x,0,bottom],[x,0,H-7]].map(tr),palette.coil,1,.23);
      addLine([[x-1.3,0,H-10],[x,0,H-7],[x+1.3,0,H-10]].map(tr),palette.coil,1,.35);
     }
     if(drive.small>.05)for(const x of [78,86,93]){const z0=Math.max(E.floor(x)+4,H-18);addLine([[x,0,z0],[x,0,H-6]].map(tr),palette.small,1,.32);addLine([[x-1,0,H-9],[x,0,H-6],[x+1,0,H-9]].map(tr),palette.small,1,.45);}
     const shell=[];for(let j=0;j<=48;j++){const x=W*j/48;shell.push([x,0,130-Math.sqrt(130**2-(RIN+x)**2)]);}addLine(shell.map(tr),palette.muted,.9,.6,true);
     if(state.explode)for(const x of [0,W])for(const z of [E.floor(x),H])addLine([[x,-1.4,z],[x,front+1.5,z]].map(tr),palette.muted,.7,.4,true);
    }
   }
   if(index===0){
    if(state.view!=='top'){
     box(-150,-140,0,150,140,14,neutral);ring(16,0,14,120,neutral,[0,0,0],{segments:24});
     for(const x of [-6,6])addLine([[x,0,20],[x,0,121],[x,0,239]],drive.big>.05?palette.coil:palette.muted,1,.7);
     box(38,-90,14,78,-60,24,palette.surface);box(88,-86,14,112,-62,24,palette.surface);addLine([[78,-74,20],[88,-74,20]],palette.muted,1,.7);
    }
    box(-135,-135,250,135,135,258,neutral,state.open?.045:.42);
    for(let j=0;j<16;j++){const a=j*Math.PI/8,pts=[];for(let k=0;k<=24;k++){const t=k*Math.PI/48;pts.push([130*Math.sin(t)*Math.cos(a),130*Math.sin(t)*Math.sin(a),250-130*Math.cos(t)]);}addLine(pts,palette.muted,.8,state.open?.12:.48);}
    for(const z of [168,205,250]){const r=Math.sqrt(130**2-(250-z)**2),pts=[];for(let k=0;k<=64;k++){const t=k*Math.PI/32;pts.push([r*Math.cos(t),r*Math.sin(t),z]);}addLine(pts,palette.muted,.7,state.open?.14:.34);}
    // A single central winding with shared upper pole arms: conceptual magnetic circuit.
    ring(9,0,228,248,steel,[0,0,0],{segments:24});const bigStart=commands.length;ring(24,10,232,246,drive.big>.05?palette.coil:mix(palette.coil,palette.muted,.65),[0,0,0],{segments:36,alpha:.94});for(let i=bigStart;i<commands.length;i++){commands[i].coilID='M0';commands[i].coilAxis=[0,0,1];commands[i].coilCenter=[0,0,239];}
    ring(26,9,230,232,neutral,[0,0,0],{segments:32});ring(26,9,246,248,neutral,[0,0,0],{segments:32});
    for(let j=0;j<12;j++){const pts=[];for(let k=0;k<=48;k++){const a=k*Math.PI/24;pts.push([24.02*Math.cos(a),24.02*Math.sin(a),232.5+j*1.1]);}addLine(pts,palette.coil,.65,drive.big>.05?.85:.35);}
    addLine([[0,0,228],[0,0,249]],palette.muted,.8,.65,true);addLine([[-1.2,0,247],[0,0,249],[1.2,0,247]],palette.muted,.8,.65);
    ring(124,0,248,250,steel,[0,0,0],{segments:48,alpha:state.open?.045:.3});ring(124,121,223,226,steel,[0,0,0],{segments:48,alpha:.3});
    ring(28,0,227,230,steel,[0,0,0],{segments:24,alpha:.82});
    for(let l=0;l<8;l++){
     const a=theta(l),tr=v=>[v[0]*Math.cos(a)-v[1]*Math.sin(a),v[0]*Math.sin(a)+v[1]*Math.cos(a),v[2]];
     rotatedBox(18,-4.5,227,120,4.5,230,steel,.72,tr);
     const pa=a+Math.PI/8;ring(1.5,0,226,248,steel,[122.5*Math.cos(pa),122.5*Math.sin(pa),0],{segments:6,alpha:.45});
     chamber(l);
     branchCoil(l);
    }
   }else chamber(state.selected,true);
   commands.sort((a,b)=>a.depth-b.depth);meshes[index]=commands;return{commands,drive};
  }
    function text(ctx,s,x,y,small=false,align='left',muted=false){
    ctx.globalAlpha=1;ctx.font='400 '+(small?Math.max(12,fontSize-1):fontSize)+'px "Microsoft YaHei",system-ui,sans-serif';
    ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle=color(muted?palette.muted:palette.fg);ctx.fillText(s,x,y);
  }
  function screenLine(ctx,points,col,width=1,dash=[]){
    ctx.globalAlpha=1;ctx.strokeStyle=color(col);ctx.lineWidth=width;ctx.setLineDash(dash);
    ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();ctx.setLineDash([]);
  }
  function screenArrow(ctx,a,b,col){
    screenLine(ctx,[a,b],col,1.6);const t=Math.atan2(b.y-a.y,b.x-a.x),L=7;
    screenLine(ctx,[{x:b.x-L*Math.cos(t-.45),y:b.y-L*Math.sin(t-.45)},b,{x:b.x-L*Math.cos(t+.45),y:b.y-L*Math.sin(t+.45)}],col,1.6);
  }

  function annotations(index,cam){
   const ctx=contexts[index],{w,h}=sizes[index];labelRegions[index]=[];
   const leader=(s,p,side,y)=>{const a=cam.project(p),x=side==='left'?8:w-8;ctx.font='400 '+Math.max(12,fontSize-1)+'px "Microsoft YaHei",system-ui,sans-serif';const tw=ctx.measureText(s).width,target={x:side==='left'?x+tw+5:x-tw-5,y};screenLine(ctx,[a,{x:target.x,y:a.y},target],palette.muted,.7);text(ctx,s,x,y,true,side==='left'?'left':'right');labelRegions[index].push({x:side==='left'?x:x-tw,y:y-9,w:tw,h:18,text:s});};
   if(index===0){
    const top=state.view==='top';
    if(top){text(ctx,'俯视：8腔等分45°',8,18,true,'left');}
    else{const sa=(state.selected+.5)*Math.PI/4;leader('大线圈 M0 ×1',[24,0,239],'left',38);leader(w<400?'端部小线圈 ×8':'8只端部小线圈（水平）',[E.SMALL_RADIUS*Math.cos(sa),E.SMALL_RADIUS*Math.sin(sa),236],'right',h*.17);}
    for(let l=0;l<8;l++){
     const a=(l+.5)*Math.PI/4,r=120,p=cam.project([r*Math.cos(a),r*Math.sin(a),top?216:211]);
     text(ctx,String(l+1),p.x,p.y,true,'center',l!==state.selected);
    }
    if(!top)leader('固定柱身',[16,0,75],'left',h*.74);
    text(ctx,top?'8只小线圈在外端R118 · 轴均竖直':'9只线圈均水平 · 轴向均为Z',w/2,h-15,true,'center',true);
   }else{
    text(ctx,'↑ Z 竖向',w-8,18,true,'right',true);
    leader('端部小线圈 S'+(state.selected+1),[E.SMALL_RADIUS-RIN-W/2,0,117],'left',37);
    const yf=state.explode?-15:-2.9;
    leader(state.explode?'前板拆开观察':'透明前板',[28,yf,78],'right',h*.33);
    leader('弧底随形 R126',[6,0,E.floor(54)],'right',h*.75);
    const p=cam.project([41,-5,91]),phase=world.drive();
    if(phase.big>.7)screenArrow(ctx,{x:p.x,y:p.y+16},{x:p.x,y:p.y-16},palette.coil);
    else if(phase.small>.7&&world.scenario==='normal')screenArrow(ctx,{x:p.x,y:p.y+16},{x:p.x,y:p.y-16},palette.small);
    else if(world.stats(state.selected).meanHeight>25)screenArrow(ctx,{x:p.x,y:p.y-16},{x:p.x,y:p.y+16},palette.particle);
    text(ctx,'净宽96 · 净隙2.8 · 珠径2 mm',w/2,h-15,true,'center',true);
   }
  }
  function draw(index){
   const ctx=contexts[index],{w,h}=sizes[index];ctx.clearRect(0,0,w,h);if(w<32||h<32)return;
   const bounds=index===0?(state.view==='top'?{min:[-135,-135,120],max:[135,135,258]}:{min:[-150,-140,0],max:[150,140,258]}):{min:[-50,state.explode?-16:-12,0],max:[62,12,128]};
   const cam=camera(index,bounds),scene=buildScene(index,cam);ctx.lineCap='round';ctx.lineJoin='round';
   const ballSteel=mix(palette.fg,palette.bg,.32),ballFill=color(ballSteel),ballHighlight=color(mix(ballSteel,palette.bg,.85)),ballEdge=color(mix(ballSteel,palette.fg,.4));
   for(const c of scene.commands){ctx.globalAlpha=c.alpha;
    if(c.kind==='ball'){
     const p=c.pts[0],r=Math.max(.8,c.radius);
     if(r<1.6)ctx.fillStyle=ballFill;
     else{const grad=ctx.createRadialGradient(p.x-r*.3,p.y-r*.35,r*.05,p.x,p.y,r);grad.addColorStop(0,ballHighlight);grad.addColorStop(.48,ballFill);grad.addColorStop(1,ballEdge);ctx.fillStyle=grad;}
     ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();continue;
    }
    ctx.beginPath();c.pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
    if(c.kind==='face'){ctx.closePath();ctx.fillStyle=c.col;ctx.fill();}else{ctx.strokeStyle=c.col;ctx.lineWidth=c.width;ctx.setLineDash(c.dashed?[4,4]:[]);ctx.stroke();}
   }
   ctx.globalAlpha=1;ctx.setLineDash([]);annotations(index,cam);el(index===0?'vr-poster-whole':'vr-poster-detail').hidden=true;
  }
  let timingWidth=0,timingKey='';
  function drawTiming(d){const svg=el('vr-timing'),w=Math.max(260,svg.getBoundingClientRect().width||sizes[0].w),left=76,right=w-12,t=world.timing,xx=v=>left+(right-left)*v/t.period,key=JSON.stringify(t),fmt=v=>Number(v.toFixed(1));
   if(Math.abs(w-timingWidth)>1||!svg.children.length||key!==timingKey){timingWidth=w;timingKey=key;svg.replaceChildren();svg.setAttribute('viewBox','0 0 '+w+' 112');const ns='http://www.w3.org/2000/svg';const n=(tag,a,s)=>{const e=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(a))e.setAttribute(k,String(v));if(s)e.textContent=s;svg.appendChild(e);return e;};
    n('title',{},'自动时序：大线圈'+fmt(t.bigOn)+'至'+fmt(t.bigOff)+'秒开，小线圈'+fmt(t.smallOn)+'至'+fmt(t.smallOff)+'秒开');
    for(const [label,y,a,b,fill]of [['M0大',24,t.bigOn,t.bigOff,'var(--viz-series-1)'],['小×8',60,t.smallOn,t.smallOff,'var(--viz-series-4)']]){n('text',{x:2,y:y+12,fill:'currentColor','font-size':14},label);n('rect',{x:left,y,width:right-left,height:16,fill:'var(--muted)'});n('rect',{x:xx(a),y,width:xx(b)-xx(a),height:16,fill});}
    const ticks=[];for(const v of [0,t.bigOn,t.smallOn,t.bigOff,t.smallOff,t.period]){if(v===t.period){if(ticks.length&&xx(v)-xx(ticks.at(-1))<48)ticks.pop();ticks.push(v);}else if(!ticks.length||xx(v)-xx(ticks.at(-1))>=48)ticks.push(v);}for(const v of ticks)n('text',{x:xx(v),y:101,fill:'currentColor','font-size':14,'text-anchor':v===0?'start':v===t.period?'end':'middle'},fmt(v)+'s');
    n('line',{'data-timing-marker':'1',x1:xx(0),x2:xx(0),y1:12,y2:82,stroke:'currentColor','stroke-width':1.4});
   }
   const marker=svg.querySelector('[data-timing-marker]');marker.setAttribute('x1',xx(d.progress*t.period));marker.setAttribute('x2',xx(d.progress*t.period));el('vr-timing-label').textContent=world.mode==='auto'?'自动通断时序（模型演示秒数）':'自动时序参考（当前手动输入）';
  }
  function render(){
   draw(0);draw(1);const drive=world.drive(),st=world.stats(state.selected),level=Math.round(drive.level*100);
   el('vr-phase').textContent=drive.phase;el('vr-big').textContent=drive.big?'M0大线圈：通电':'M0大线圈：断电';el('vr-small').textContent=drive.small?'S1至S8小线圈：通电':'S1至S8小线圈：断电';
   el('vr-height').textContent='平均标高 '+(BASE+st.meanHeight).toFixed(1)+' mm · 上半区 '+st.up+'/'+state.beadCount+'颗';el('vr-detail-title').textContent='第'+(state.selected+1)+'腔 · '+state.beadCount+'颗铁珠';
   el('vr-scrub').value=String(Math.round(drive.progress*1000));el('vr-time').textContent=(world.time%world.timing.period).toFixed(1)+' / '+world.timing.period.toFixed(1)+' s';drawTiming(drive);
   if(lastPhase!==drive.phase){el('vr-live').textContent=drive.phase;lastPhase=drive.phase;}
   const status='三维已启动 · '+(state.playing?'慢放示意中':'已暂停');if(el('vr-startup').textContent!==status)el('vr-startup').textContent=status;dirty=false;
  }
  const raf=window.requestAnimationFrame?.bind(window)||(cb=>window.setTimeout(()=>cb(performance.now()),33));
  function tick(now){const dt=last?clamp((now-last)/1000,0,.08):0;last=now;if(state.playing){accumulator=Math.min(.16,accumulator+dt*state.speed);const budgetStart=performance.now();let steps=0;while(accumulator>=E.STEP&&steps<4){world.step();accumulator-=E.STEP;steps++;if(performance.now()-budgetStart>=8)break;}dirty=true;}if(dirty&&now-lastDraw>=50){render();lastDraw=now;}clockId=raf(tick);}
  function setView(v){state.view=v;state.cameras[0]={...defaults[0],...(v==='top'?{az:0,el:1.49}:v==='front'?{az:0,el:0}:{})};dirty=true;}
  function seek(t){world.time=0;world.pending=0;const fresh=window.VerticalGranular.createWorld({beadCount:state.beadCount});for(let l=0;l<8;l++)world.layers[l].forEach((p,i)=>Object.assign(p,fresh.layers[l][i]));world.mode='auto';world.advance(t);accumulator=0;last=0;sync();render();}
  function setBeadCount(n){if(!Number.isInteger(n)||n<E.MIN_COUNT||n>E.MAX_COUNT)return false;state.beadCount=n;world=E.createWorld({timing:world.timing,beadCount:n,currents:state.currents});world.scenario=el('vr-scenario').value;seek(.1);save();return true;}
  function setCurrent(k,value){if(!['big','small'].includes(k)||!Number.isFinite(value)||value<.5||value>2.5)return false;state.currents[k]=value;world.currents={...state.currents};seek(.1);save();return true;}
  for(const k of ['big','small'])el('vr-current-'+k).addEventListener('input',e=>setCurrent(k,Number(e.target.value)));
  el('vr-count').addEventListener('input',e=>{setBeadCount(Number(e.target.value));});
  el('vr-play').addEventListener('click',()=>{state.playing=!state.playing;last=0;sync();dirty=true;});
  el('vr-mode').addEventListener('change',e=>{world.mode=e.target.value;state.playing=true;last=0;sync();dirty=true;});
  el('vr-scenario').addEventListener('change',e=>{world.scenario=e.target.value;seek(.1);sync();save();});
  el('vr-restart').addEventListener('click',()=>{seek(.1);state.playing=true;sync();});
  for(const [id,key]of [['vr-stage1','smallOn'],['vr-stage2','bigOff'],['vr-stage3','smallOff'],['vr-stage4','period']])el(id).addEventListener('click',()=>{state.playing=false;seek(world.timing[key]-.05);});
  el('vr-preset').addEventListener('change',e=>{const preset=e.target.value;if(!window.RelayTimingData[preset])return;state.timingPreset=preset;world.timing={...window.RelayTimingData[preset].timing};seek(.1);save();});
  for(const key of Object.keys(durationLimits))el('vr-duration-'+key).addEventListener('input',e=>{const d=getDurations();d[key]=Number(e.target.value);setDurations(d);});
  el('vr-speed').addEventListener('change',e=>{state.speed=Number(e.target.value);save();});
  el('vr-select').addEventListener('change',e=>{state.selected=Number(e.target.value);dirty=true;save();});
  el('vr-view').addEventListener('change',e=>{setView(e.target.value);save();});
  for(const k of ['open','explode'])el('vr-'+k).addEventListener('change',e=>{state[k]=e.target.checked;dirty=true;save();});
  el('vr-fit').addEventListener('click',()=>{state.cameras=defaults.map(c=>({...c}));setView(state.view);resize();render();save();});
  el('vr-scrub').addEventListener('input',e=>{state.playing=false;seek(Number(e.target.value)/1000*(world.timing.period-.001));});
  canvases.forEach((c,i)=>{let drag=null;c.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,...state.cameras[i]};c.setPointerCapture?.(e.pointerId);});c.addEventListener('pointermove',e=>{if(!drag)return;state.cameras[i].az=drag.az+(e.clientX-drag.x)*.008;state.cameras[i].el=clamp(drag.el+(e.clientY-drag.y)*.006,-.15,1.5);dirty=true;});const stop=()=>{if(drag){drag=null;save();}};c.addEventListener('pointerup',stop);c.addEventListener('pointercancel',stop);c.addEventListener('lostpointercapture',stop);window.addEventListener('blur',stop);c.addEventListener('wheel',e=>{e.preventDefault();state.cameras[i].zoom=clamp(state.cameras[i].zoom*Math.exp(-e.deltaY*.001),.65,1.6);dirty=true;save();},{passive:false});});
  window.addEventListener('resize',resize);window.addEventListener('openai:set_globals',e=>{applySaved(e.detail?.globals?.widgetState);updateTheme();});if(typeof ResizeObserver!=='undefined')new ResizeObserver(resize).observe(root);if(typeof MutationObserver!=='undefined')new MutationObserver(updateTheme).observe(document.documentElement,{attributes:true,attributeFilter:['class','style','data-theme']});
  applySaved(window.openai?.widgetState);sync();updateTheme();resize();render();clockId=raf(tick);
  window.__radialIron3D={state,get world(){return world;},render,resize,seek,setView,setDurations,getDurations,setBeadCount,setCurrent,geometry:()=>meshes,labels:()=>labelRegions,advance:t=>{world.advance(t);render();},dimensions:{chambers:8,get beadsPerChamber(){return state.beadCount;},get totalBeads(){return state.beadCount*8;},beadDiameter:2,clearGap:2.8,clearWidth:W,maxClearHeight:H-E.floor(0),minClearHeight:H-E.floor(W),floorRadius:126,shellRadius:130,sheet:1.5,radialMin:RIN,radialMax:RIN+W,floorMinZ:BASE+E.floor(0),floorMaxZ:BASE+E.floor(W),ceilingZ:225,angularPitch:45,commonCoils:1,branchCoils:8,branchCoilRadius:E.SMALL_RADIUS,coilAxesParallel:true,coilAxis:[0,0,1],branchCoilWinding:{outerDiameter:18,innerDiameter:8,height:8,z0:232,z1:240},branchCore:{diameter:6,z0:227,z1:242}},stop:()=>{state.playing=false;window.cancelAnimationFrame?.(clockId);}};
  }catch(error){const n=root.querySelector('#vr-startup');if(n){n.textContent='初始化失败：'+(error?.message||String(error));n.setAttribute('role','alert');}console.error(error);}
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',launch,{once:true});else launch();
})();
