(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.VerticalGranular=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const M=Math,Vec=Float64Array;
 const COUNT=50,CHAMBERS=8,W=96,H=105,R=1,STEP=1/120,SLOW=.16,PERIOD=12;
 const MIN_COUNT=50,MAX_COUNT=400,DEFAULT_COUNT=200;
 const BASE=120,RIN=22,ARC=126,CZ=130;
 const SMALL_RADIUS=118,SMALL_POLE_Z=227,COIL_AXIS=[0,0,1];
 const BASE_TIMING={bigOn:1,smallOn:4,bigOff:6,smallOff:9,period:12};
 function floor(x,y=0){return CZ-M.sqrt(ARC*ARC-(RIN+x)**2-y*y);}
 function centerFloor(x){return CZ-M.sqrt((ARC-R)**2-(RIN+x)**2);}
 const clamp=(v,a,b)=>M.max(a,M.min(b,v));
 function input(t,timing=BASE_TIMING){const {bigOn,smallOn,bigOff,smallOff,period}=timing,q=((t%period)+period)%period,big=q>=bigOn&&q<bigOff?1:0,small=q>=smallOn&&q<smallOff?1:0,stage=q<bigOn?0:q<smallOn?1:q<bigOff?2:q<smallOff?3:4;
  const names=['初始 · 全部断电','① 大开 · 全域起动条件','② 大＋小开 · 局部增强','③ 大关／小开 · 接力观察','④ 小关 · 重力落回'];
  return{big,small,level:Math.max(big,small),stage,phase:names[stage],progress:q/period};
 }
 function createWorld({layerCount=CHAMBERS,timing=BASE_TIMING,beadCount=COUNT,currents={big:1,small:1}}={}){
  const count=Number.isInteger(beadCount)&&beadCount>=1&&beadCount<=MAX_COUNT?beadCount:COUNT;
  const layers=Array.from({length:layerCount},(_,l)=>Array.from({length:count},(_,i)=>{const x=4+(i%13)*2.04+((M.floor(i/13)%2)*1.02)+.025*M.sin(i*3+l);return{id:l*count+i,x,z:centerFloor(x)+M.floor(i/13)*2.3,vx:0,vz:0};}));
  const currentValue=k=>Number.isFinite(currents?.[k])&&currents[k]>=0&&currents[k]<=2.5?currents[k]:1;
  const world={layers,beadCount:count,time:0,mode:'auto',scenario:'normal',pending:0,timing:{...timing},currents:{big:currentValue('big'),small:currentValue('small')},
   drive(){const d=input(this.time,this.timing);if(this.mode==='auto')return d;const big=['big','both'].includes(this.mode)?1:0,small=['small','both'].includes(this.mode)?1:0;return{...d,big,small,level:Math.max(big,small),phase:{big:'手动 · 仅大线圈',both:'手动 · 大小同时',small:'手动 · 仅小线圈',off:'手动 · 全部断电'}[this.mode]||d.phase};},
   step(){
    this.time+=STEP;const dt=STEP*SLOW,drive=this.drive(),big=drive.big*this.currents.big*(this.scenario==='startweak'?.35:1),small=drive.small*this.currents.small*(this.scenario==='weak'?.12:.8),mag=drive.level;
    for(let l=0;l<layers.length;l++){
     const a=layers[l],ax=new Vec(count),az=new Vec(count);
     for(let i=0;i<count;i++){
      const p=a[i];ax[i]=-p.vx*12;az[i]=-9810-p.vz*13;
      // Qualitative scalar field proxy, not a Maxwell/iron-core solution.
      // Forces derive from the gradient of the SQUARED combined proxy, not Fbig+Fsmall.
      // Vertical local axis at the OUTER END, shared by geometry and field proxy.
      const dx=p.x-(SMALL_RADIUS-RIN),dz=SMALL_POLE_Z-BASE-p.z,local=M.exp(-dx*dx/(2*25**2)-dz*dz/(2*12**2));
      const b=big*(.7+.8*p.z/H)+small*local;
      const gx=-small*local*dx/(25**2),gz=big*.8/H+small*local*dz/(12**2);
      ax[i]+=clamp(9810*250*b*gx,-9810*2,9810*2);
      az[i]+=clamp(9810*250*b*gz,0,9810*4);
     }
     if(mag>.001)for(let i=0;i<count;i++)for(let j=0;j<i;j++){
      const x=a[i].x-a[j].x,z=a[i].z-a[j].z,rr=x*x+z*z;if(rr>100)continue;
      const r2=M.max(3.92,rr),r=M.sqrt(r2),k=3*18000*mag/(r2*r2*r2*r);
      // Parallel induced vertical dipoles: side-by-side repulsion, end-to-end attraction.
      const fx=clamp(k*x*(x*x-4*z*z),-16000,16000),fz=clamp(k*z*(3*x*x-2*z*z),-16000,16000);
      ax[i]+=fx;ax[j]-=fx;az[i]+=fz;az[j]-=fz;
     }
     for(let i=0;i<count;i++){const p=a[i];p.vx+=ax[i]*dt;p.vz+=az[i]*dt;p.x+=p.vx*dt;p.z+=p.vz*dt;}
     const contacts=[];for(let i=0;i<count;i++)for(let j=0;j<i;j++)if(M.abs(a[i].x-a[j].x)<4.2&&M.abs(a[i].z-a[j].z)<4.2)contacts.push([i,j]);
     for(let pass=0;pass<220;pass++){
      let maxPen=0;
      for(let k=0;k<contacts.length;k++){
       const pair=contacts[pass%2?k:contacts.length-1-k],p=a[pair[0]],q=a[pair[1]],dx=p.x-q.x,dz=p.z-q.z;if(M.abs(dx)>=2||M.abs(dz)>=2)continue;const d2=dx*dx+dz*dz;if(d2>=4)continue;const d=M.sqrt(d2);
       if(d>=2)continue;const nx=d>1e-8?dx/d:1,nz=d>1e-8?dz/d:0,over=(2-d)*.5;
       maxPen=M.max(maxPen,2-d);
       p.x+=nx*over;p.z+=nz*over;q.x-=nx*over;q.z-=nz*over;
       const rel=(p.vx-q.vx)*nx+(p.vz-q.vz)*nz;if(rel<0){const impulse=-rel*.52;p.vx+=nx*impulse;p.vz+=nz*impulse;q.vx-=nx*impulse;q.vz-=nz*impulse;}
      }
      for(const p of a){
       if(p.x<R){maxPen=M.max(maxPen,R-p.x);p.x=R;if(p.vx<0)p.vx*=-.08;}if(p.x>W-R){maxPen=M.max(maxPen,p.x-W+R);p.x=W-R;if(p.vx>0)p.vx*=-.08;}
       // Keep the entire bead inside the R126 arc: center lies inside R125.
       const rr=RIN+p.x,zz=p.z-CZ,len=M.sqrt(rr*rr+zz*zz),allowed=ARC-R;
       if(len>allowed){const nx=-rr/len,nz=-zz/len,penetration=len-allowed;maxPen=M.max(maxPen,penetration);p.x+=nx*penetration;p.z+=nz*penetration;const vn=p.vx*nx+p.vz*nz;if(vn<0){p.vx-=1.04*vn*nx;p.vz-=1.04*vn*nz;}}
       if(p.x<R){p.x=R;if(p.vx<0)p.vx*=-.08;}
       if(p.z>H-R){maxPen=M.max(maxPen,p.z-H+R);p.z=H-R;if(p.vz>0)p.vz*=-.04;}
      }
      if(pass>=5&&maxPen<.006)break;
     }
    }
   },
   advance(t){this.pending+=t;while(this.pending>=STEP-1e-10){this.step();this.pending-=STEP;}},
   stats(l=0){const a=layers[l];return{meanHeight:a.reduce((s,p)=>s+p.z,0)/a.length,minHeight:M.min(...a.map(p=>p.z)),maxHeight:M.max(...a.map(p=>p.z)),up:a.filter(p=>p.z>H/2).length};}
  };return world;
 }
 return{createWorld,input,COUNT,MIN_COUNT,MAX_COUNT,DEFAULT_COUNT,CHAMBERS,W,H,R,STEP,SLOW,PERIOD,BASE,RIN,ARC,CZ,floor,centerFloor,SMALL_RADIUS,SMALL_POLE_Z,COIL_AXIS,BASE_TIMING};
});

(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LoadRelay=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),STEP=1/120;
 function create(getTiming){
  const s={time:0,raw:0,filtered:0,pressed:false,high:0,low:0,pressStart:0,started:-Infinity,next:Infinity,tails:0,tapUntil:-1,records:[]};
  const base=()=>Object.values(getTiming()).reduce((a,b)=>a+b,0);
  const period=()=>base()+2.7*(1-clamp((s.filtered-1.2)/13.8,0,1));
  function start(source){s.started=s.time;s.next=Infinity;s.records.push({time:s.time,source});if(s.records.length>100)s.records.shift();}
  function hold(v=10){if(!Number.isFinite(v))return false;s.tapUntil=-1;s.raw=clamp(v,0,15);return true;}
  function release(){s.raw=0;s.tapUntil=-1;}
  function tap(){hold(4);s.tapUntil=s.time+.35;}
  function drive(){const t=getTiming(),age=s.time-s.started,big=age>=0&&age<t.lead+t.overlap?1:0,small=age>=t.lead&&age<t.lead+t.overlap+t.hold?1:0;
   const phase=big?(small?'大＋小开 · 8分支共同增强':'大开 · 全域起动'):small?'大关／小开 · 8端部共同保持':age<base()?'小关 · 全部分支落回':s.pressed?'共同等待下一轮':s.tails?'卸载余波间歇':'待机';
   return{big,small,level:Math.max(big,small),phase,progress:Number.isFinite(age)?clamp(age/base(),0,1):0,age};
  }
  function step(dt=STEP){s.time+=dt;if(s.tapUntil>=0&&s.time>=s.tapUntil)release();s.filtered+=(s.raw-s.filtered)*(1-Math.exp(-dt/.08));s.high=s.filtered>1.2?s.high+dt:0;s.low=s.filtered<.5?s.low+dt:0;
   if(!s.pressed&&s.high>=.1){s.pressed=true;s.pressStart=s.time;s.tails=0;if(s.time-s.started>=base())start('加载');else s.next=Math.max(s.time,s.started+base());}
   if(s.pressed&&s.low>=.15){const sustained=s.time-s.pressStart>=1.2;s.pressed=false;s.tails=sustained?2:0;s.next=sustained?Math.max(s.time+.9,s.started+base()+1.2):Infinity;}
   if(s.pressed&&s.time-s.started>=period())start('持续受压');
   if(s.pressed&&s.time>=s.next&&s.time-s.started>=base())start('加载');
   if(!s.pressed&&s.tails&&s.time>=s.next&&s.time-s.started>=base()){start('卸载余波');s.tails--;s.next=s.tails?s.time+base()+2.7:Infinity;}
  }
  function advance(seconds){if(!Number.isFinite(seconds)||seconds<0)return;for(let left=seconds;left>1e-9;){const dt=Math.min(STEP,left);step(dt);left-=dt;}}
  function stats(){return{...drive(),time:s.time,filtered:s.filtered,pressed:s.pressed,tails:s.tails,period:period(),cycles:s.records.length};}
  return{state:s,hold,setInput:hold,tap,release,step,advance,stats,drive};
 }
 return{create,STEP};
});

(function(){
 const E=window.VerticalGranular,{W,H,BASE,RIN}=E;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),sub=(a,b)=>a.map((v,i)=>v-b[i]);
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>{const n=Math.hypot(...a)||1;return a.map(v=>v/n);};
 function color(c,shade=1){return 'rgb('+c.map(v=>Math.round(clamp(v*shade,0,255))).join(',')+')';}
 function mix(a,b,t){return a.map((v,i)=>v*(1-t)+b[i]*t);}
 window.RelayReferenceScene=function(index,projector,state,world,palette,load,wires){
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
     commands.push({kind:'ball',branch:l,id:l*state.beadCount+p.id,world:xyz,pts:[v],depth:v.d,col:color(steel),radius:projector.scale,alpha:1});
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

   function flatTop(cut,local){
    const tag=(start,name,z0,z1)=>{for(let j=start;j<commands.length;j++){commands[j].mechanical=name;commands[j].zRange=[z0,z1];}};
    let start=commands.length;
    if(local){box(-34,-22,248,34,22,250,neutral,.65);tag(start,'bearing-support',248,250);start=commands.length;}
    ring(18,0,250,252,neutral,[0,0,0],{segments:24,alpha:.85});tag(start,'bearing-seat',250,252);start=commands.length;
    // Functional envelope only, not a selected commercial sensor or rated bearing node.
    ring(13,0,252,258,palette.particle,[0,0,0],{segments:28,alpha:.85});tag(start,'embedded-force-sensor',252,258);start=commands.length;
    ring(5,0,258,260,neutral,[0,0,0],{segments:20,alpha:.95});tag(start,'load-button',258,260);start=commands.length;
    const r=local?42:135,front=local?-28:-135,back=local?28:135;
    if(cut){
      box(-r,0,260,r,back,266,neutral,.54);
      box(-r,front,260,-16,0,266,neutral,.54);box(16,front,260,r,0,266,neutral,.54);
    }else box(-r,front,260,r,back,266,neutral,.66);
    tag(start,'flat-cover',260,266);
    if(!local){start=commands.length;
      box(-135,-135,250,135,-132,259.8,neutral,.35);box(-135,132,250,135,135,259.8,neutral,.35);
      box(-135,-132,250,-132,132,259.8,neutral,.35);box(132,-132,250,135,132,259.8,neutral,.35);
      tag(start,'cover-frame',250,259.8);
    }
    if(local){
      addLine([[-7,-14,255],[-30,-27,249]],palette.particle,1.1,.9);
      for(const x of [-22,0,22]){addLine([[x,8,275],[x,8,267],[x-1.5,8,269]],palette.particle,1.7,.8);addLine([[x,8,267],[x+1.5,8,269]],palette.particle,1.7,.8);}
    }
   }
   if(index===2){flatTop(true,true);commands.sort((a,b)=>a.depth-b.depth);return{commands,drive};}
   if(index===0){
    if(state.view!=='top'){
     box(-150,-140,0,150,140,14,neutral);ring(16,0,14,120,neutral,[0,0,0],{segments:24});
     for(const x of [-6,6])addLine([[x,0,20],[x,0,121],[x,0,239]],drive.big>.05?palette.coil:palette.muted,1,.7);

    }
    flatTop(state.cutTop,false);
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

    // The force sensor is enclosed below the continuous plane z=266.
    if(load>0)for(const x of [-65,0,65]){addLine([[x,0,293],[x,0,269],[x-3,0,274]],palette.particle,2,.9);addLine([[x,0,269],[x+3,0,274]],palette.particle,2,.9);}
    const boards=[[-115,-116,-84,-90],[-65,-116,-20,-98],[0,-116,65,-86],[83,-116,113,-96]];
    for(const b of boards){box(b[0],b[1],14,b[2],b[3],19,palette.surface);box(b[0]+5,b[1]+4,19,b[2]-5,b[3]-4,21,steel,.65);}
    if(wires){
      for(let k=0;k<4;k++)addLine([[-7+k*3,-14,255],[-7+k*3,-16,25],[-110+k*3,-90,21]],palette.particle,.9,.8);
      addLine([[-84,-103,21],[-65,-103,21]],palette.particle,1.5,.9);
      addLine([[-20,-104,21],[0,-104,21]],palette.particle,1.5,.9);
      addLine([[65,-105,21],[83,-105,21]],palette.spacer,1.4,.85);
      addLine([[83,-111,21],[-93,-123,21],[-93,-116,21]],palette.spacer,1.2,.8);
      addLine([[83,-108,21],[-55,-120,21],[-55,-116,21]],palette.muted,1.2,.8);
      addLine([[65,-112,21],[70,-126,21],[-100,-126,21],[-100,-116,21]],palette.muted,1.2,.8);
      addLine([[83,-114,21],[70,-128,21],[57,-128,21],[57,-116,21]],palette.coil,1.5,.9);
      for(const x of [3,8])addLine([[20+(x===3?0:4),-86,21],[x,0,30],[x,0,239]],x===3?palette.coil:palette.muted,1.4,.85);
      for(let l=0;l<8;l++){const a=(l+.5)*Math.PI/4;for(const offset of [0,2])addLine([[30+l*3,-86,21],[10+offset,0,35],[10+offset,0,226],[118*Math.cos(a),118*Math.sin(a),232+offset]],offset?palette.muted:palette.small,1,.6);}
    }
   }else chamber(state.selected,true);
   commands.sort((a,b)=>a.depth-b.depth);return{commands,drive};
  }

return buildScene(index,projector);
};
})();
