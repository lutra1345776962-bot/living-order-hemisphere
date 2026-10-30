/* Illustrative scalar wave on a fixed hemispherical neighbour graph. Not a magnetic-force model. */
var HemiWave=(()=>{
 const TAU=2*Math.PI,R=.84,Z0=-.155,LIMIT=.14;
 function create(){const nx=20,ny=20,n=nx*ny,x=new Float64Array(n),y=new Float64Array(n),z=new Float64Array(n),phi=new Float64Array(n),edges=[];
  for(let r=0;r<ny;r++)for(let c=0;c<nx;c++){const i=r*nx+c,u=(r+.5)/ny,a=TAU*c/nx,rr=R*Math.sqrt(1-u*u);phi[i]=a;x[i]=rr*Math.cos(a);y[i]=rr*Math.sin(a);z[i]=Z0-R*u}
  const edge=(i,j)=>{const d=Math.hypot(x[i]-x[j],y[i]-y[j],z[i]-z[j]),weight=Math.min(12,(.065/d)**2);edges.push({i,j,weight})};
  for(let r=0;r<ny;r++)for(let c=0;c<nx;c++){const i=r*nx+c;edge(i,r*nx+(c+1)%nx);if(r<ny-1)edge(i,(r+1)*nx+c)}
  const entrySource=(ny-1)*nx+Math.floor(nx*.75);
  return{nx,ny,n,x,y,z,phi,edges,q:new Float64Array(n),v:new Float64Array(n),a:new Float64Array(n),time:0,events:[],nextID:1,source:entrySource,entrySource};
 }
 function drop(w,strength=2.8){w.source=w.entrySource;const e={id:w.nextID++,source:w.entrySource,strength,born:w.time,hit:false,rebound:false};w.events.push(e);if(w.events.length>10)w.events.shift();return e}
 function kick(w,e,amplitude,width){const pole=Z0-R;for(let i=(w.ny-3)*w.nx;i<w.n;i++){const d2=w.x[i]**2+w.y[i]**2+(w.z[i]-pole)**2,ex=d2/(2*width*width);if(ex<10)w.v[i]+=amplitude*Math.exp(-ex)}}
 function step(w,dt,p){for(const e of w.events){const age=w.time-e.born;if(!e.hit&&age>=.95){kick(w,e,4.2*e.strength,.22);e.hit=true}if(e.hit&&!e.rebound&&age>=1.13){kick(w,e,-3.3*e.strength,.24);e.rebound=true}}
  for(let i=0;i<w.n;i++)w.a[i]=-7*w.q[i]-.7*p.damping*w.v[i];
  if(p.coupled)for(const e of w.edges){const f=34*e.weight*(w.q[e.j]-w.q[e.i]);w.a[e.i]+=f;w.a[e.j]-=f}
  for(let i=0;i<w.n;i++){w.v[i]+=w.a[i]*dt;w.q[i]+=w.v[i]*dt;if(w.q[i]>LIMIT){w.q[i]=LIMIT;w.v[i]=Math.min(0,w.v[i])*.15}else if(w.q[i]<-LIMIT){w.q[i]=-LIMIT;w.v[i]=Math.max(0,w.v[i])*.15}}
  w.time+=dt;
 }
 function stats(w){let up=0,down=0,moving=0,remote=0,energy=0;const s=w.source;for(let i=0;i<w.n;i++){up=Math.max(up,w.q[i]);down=Math.min(down,w.q[i]);if(Math.abs(w.q[i])>.004)moving++;const d=Math.hypot(w.x[i]-w.x[s],w.y[i]-w.y[s],w.z[i]-w.z[s]);if(d>.65)remote+=w.q[i]**2;energy+=w.v[i]**2+7*w.q[i]**2}return{up,down,moving,remote,energy}}
 return{create,drop,step,stats,R,Z0,LIMIT};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HemiWave;
