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
