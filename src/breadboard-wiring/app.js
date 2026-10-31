(function(){
 'use strict';
 const D=window.BreadboardPlan,$=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
 const state={step:'power',view:'logic',selected:'feed5',branch:1,playing:false};let timer=null;
 const query=new URLSearchParams(location.search);
 if(D.steps.some(s=>s.id===query.get('step')))state.step=query.get('step');
 if(['logic','board','driver'].includes(query.get('view')))state.view=query.get('view');
 if(query.has('branch')&&/^[0-8]$/.test(query.get('branch')))state.branch=Number(query.get('branch'));
 if(query.has('wire'))state.selected=D.edges.some(e=>e.id===query.get('wire'))?query.get('wire'):'';
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function text(x,y,s,cls='',anchor='start'){return `<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${esc(s)}</text>`;}
 function box(x,y,w,h,title,sub,cls='module'){return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" class="${cls}"/>`+text(x+16,y+30,title,'title')+(sub?text(x+16,y+57,sub,'subtitle'):'');}
 function netClass(e){if(e.net==='5V')return'net5V';if(e.net==='GND')return'netGND';if(e.net==='12V')return'net12V';if(e.net==='COIL')return'netCOIL';if(['E+','E-','A+','A-'].includes(e.net))return'netAnalog';if(['DAT','CLK'].includes(e.net))return'netData';if(['FAULT','THERMAL'].includes(e.net))return'netFeedback';return'netCommand';}
 function active(e){return state.step==='all'||e.stage===state.step;}
 function titleOf(id){const n=D.nodes[id];return n.type==='hole'?`面包板 ${id}`:n.type==='rail'?`电源轨 ${id}`:n.label+'（'+id+'）';}
 function strip(id){const n=D.nodes[id];if(n.type==='hole'){const group=n.group;const k=Number(group.slice(1));return(group[0]==='L'?'a至e':'f至j')+k+'同排相通';}if(n.type==='rail')return n.group+'段内相通；上下段需跳线连接';return'外部器件或端子，按名称连接';}
 function route(a,b,index=0){
  const p=D.nodes[a],q=D.nodes[b];
  const sid=[a,b].find(id=>/^S[1-8]\.(VIN|GND)$/.test(id));
  if(sid){const n=D.nodes[sid],source=D.nodes[sid===a?b:a],left=Number(sid[1])<=4,x=left?1230:1444,y=left?850:1100;return`M${source.x} ${source.y} L1025 ${source.y} L1025 ${y} L${x} ${y} L${x} ${n.y} L${n.x} ${n.y}`;}
  if(/^S[5-8]\.IN1$/.test(b)){const y=355+(index%6)*6;return`M${p.x} ${p.y} L${820+(index%6)*7} ${p.y} L${820+(index%6)*7} ${y} L1432 ${y} L1432 ${q.y} L${q.x} ${q.y}`;}
  if(p.type!=='port'&&q.type!=='port'){
   if(Math.abs(p.x-q.x)<25)return `M${p.x} ${p.y} L${q.x} ${q.y}`;
   const dx=Math.abs(p.x-q.x),bend=Math.min(45,dx*.25);
   return `M${p.x} ${p.y} C${p.x+bend} ${p.y-18},${q.x-bend} ${q.y-18},${q.x} ${q.y}`;
  }
  const lane=(index%7)*8;
  if(p.x<420&&q.type!=='port')return`M${p.x} ${p.y} L${400-lane} ${p.y} L${400-lane} ${q.y} L${q.x} ${q.y}`;
  if(q.x<420&&p.type!=='port')return`M${p.x} ${p.y} L${405-lane} ${p.y} L${405-lane} ${q.y} L${q.x} ${q.y}`;
  if(q.x>800&&p.type!=='port')return`M${p.x} ${p.y} L${830+lane} ${p.y} L${830+lane} ${q.y} L${q.x} ${q.y}`;
  if(p.x>800&&q.type!=='port')return`M${p.x} ${p.y} L${840+lane} ${p.y} L${840+lane} ${q.y} L${q.x} ${q.y}`;
  if(p.x>900&&q.x>900)return`M${p.x} ${p.y} L${1440+lane*.25} ${p.y} L${1440+lane*.25} ${q.y} L${q.x} ${q.y}`;
  const y=Math.min(1100,Math.max(p.y,q.y)+30+lane);
  return`M${p.x} ${p.y} L${p.x} ${y} L${q.x} ${y} L${q.x} ${q.y}`;
 }
 function path(d,e,selected=false){selected=selected||e.id===state.selected;const c=netClass(e),pulse=selected&&state.playing?' flow':'',known=D.edges.some(n=>n.id===e.id);return`<g ${known?'data-edge="'+esc(e.id)+'"':''} class="${selected?'chosen':state.selected?'other':''}"><path d="${d}" class="wire-shadow"/><path d="${d}" class="wire-glow ${c}"/><path d="${d}" class="wire ${c}${pulse}"/>${known?'<path d="'+d+'" class="wire-hit"/>':''}<title>${esc(e.label)}</title></g>`;}
 function boardPath(e,i,selected=false){const p=D.nodes[e.a],q=D.nodes[e.b],component=['resistor','capacitor','inductor'].includes(e.kind),d=component?`M${p.x} ${p.y} L${q.x} ${q.y}`:route(e.a,e.b,i);let s=path(d,e,selected);if(component){const x=(p.x+q.x)/2,y=(p.y+q.y)/2,angle=Math.atan2(q.y-p.y,q.x-p.x)*180/Math.PI;s+=`<g transform="translate(${x} ${y}) rotate(${angle})" class="${!selected&&state.selected?'other':''}">`+(e.kind==='resistor'?'<rect x="-4" y="-3" width="8" height="6" class="component-value"/>':e.kind==='capacitor'?'<path d="M-2 -5 L-2 5 M2 -5 L2 5" class="wire netGND"/>':'<rect x="-18" y="-6" width="36" height="12" class="component-value"/>')+'</g>';if(selected)s+=`<rect x="${x+10}" y="${y-20}" width="92" height="24" class="component-value"/>`+text(x+15,y-3,e.value,'small');}return s;}
 function board(){let s=box(430,80,290,901,'面包板','63排 · 电源轨各50孔','board');
  for(const [c,x]of Object.entries(D.cols))s+=text(x,159,c,'small','middle');
  for(let r=1;r<=63;r++){
   const y=D.rowY(r);s+=`<line x1="500" x2="556" y1="${y}" y2="${y}" class="metal"/><line x1="598" x2="654" y1="${y}" y2="${y}" class="metal"/>`;
   s+=text(734,y+4,r,'tiny');
  }
  for(const [rail,x]of [['L+',458],['L-',476],['R+',680],['R-',698]]){
   s+=text(x,160,rail[1],rail[1]==='+'?'small':'small','middle');
   for(const half of ['U','D']){
    const arr=Object.values(D.nodes).filter(n=>n.type==='rail'&&n.group===rail+half);
    s+=`<line x1="${x}" x2="${x}" y1="${arr[0].y}" y2="${arr.at(-1).y}" class="wire ${rail[1]==='+'?'net5V':'netGND'}"/>`;
   }
  }
  for(const n of Object.values(D.nodes))if(n.type!=='port')s+=`<circle cx="${n.x}" cy="${n.y}" r="2.8" class="hole"/>`;
  s+=box(520,214,101,202,'','','chip');s+=`<rect x="550" y="210" width="42" height="20" class="module"/>`+text(571,225,'USB','tiny','middle');
  s+=`<text x="574" y="318" transform="rotate(-90 574 318)" text-anchor="middle">Nano A000005</text>`;
  for(const name of ['5V','GND-L']){const n=D.nodes[D.pins['Nano.'+name]];s+=text(424,n.y+5,name.replace('-L',''),'small','end');}
  for(const name of ['D2','D3','D4','D5','D9','D10']){const id=D.pins['Nano.'+name],n=D.nodes[id];s+=text(758,n.y+4,name+' '+id,'small');}
  s+=`<rect x="560" y="571" width="34" height="126" rx="5" class="chip"/><path d="M567 571 Q577 585 587 571" class="wire netGND"/>`;
  s+=`<text x="582" y="636" transform="rotate(-90 582 636)" text-anchor="middle" class="small">SN74HC244N</text>`;
  s+=text(551,569,'1','tiny','end')+text(602,569,'20','tiny')+text(551,713,'10','tiny','end')+text(602,713,'11','tiny');
  for(const id of D.occupied){const n=D.nodes[id];s+=`<circle cx="${n.x}" cy="${n.y}" r="3.8" class="contact"/>`;}
  s+=text(758,540,'30至32排：D10分配总线','small');s+=text(758,775,'49至56排：8路串阻与下拉','small');
  s+=text(758,885,'左58排：D4 / 右59排：D5','small');
  for(const p of D.parts)s+=box(p.x,p.y,p.w,p.h,p.title,p.subtitle);
  const shownPorts=new Set();
  for(const e of D.edges)if(active(e))for(const id of [e.a,e.b])if(D.nodes[id].type==='port')shownPorts.add(id);
  for(const id of shownPorts){const n=D.nodes[id];s+=`<circle cx="${n.x}" cy="${n.y}" r="4.2" class="contact"/>`;
   if(id.startsWith('hx.')&&id!=='hx.GND'||id.startsWith('sensor.'))s+=text(n.x-10,n.y+5,n.label,'small','end');
   if(id==='hx.GND')s+=text(n.x+10,n.y+5,'GND','small');
   if(id.endsWith('.IN1'))s+=text(n.x+(n.x>=1400?10:-10),n.y-7,'IN1','small',n.x>=1400?'start':'end');
   if(id.startsWith('M0.')&&['VIN','GND'].includes(n.label))s+=text(n.x+8,n.y+4,n.label,'small');
  }
  s+=text(870,901,'9个NC50℃串联','small')+text(880,835,'9路开漏FAULT汇接','small');
  for(const [i,e]of D.edges.entries())if(active(e)&&e.id!==state.selected){s+=boardPath(e,i);}
  const e=D.edges.find(e=>e.id===state.selected&&active(e));
  if(e){s+=boardPath(e,D.edges.indexOf(e),true);for(const id of [e.a,e.b]){const n=D.nodes[id];s+=`<circle cx="${n.x}" cy="${n.y}" r="8" class="focus-strip"/>`;if(n.type==='hole'){const x=n.group[0]==='L'?495:593;s+=`<rect x="${x}" y="${n.y-6}" width="66" height="12" rx="5" class="focus-strip"/>`;}}}
  s+=text(440,1010,'中央沟槽隔开左右金属条；线交叉不自动相接。','small');s+=text(440,1040,'红色轨仅逻辑5V，12V和线圈走右侧端子。','small');
  return s;
 }
 function logic(){let s='';
  s+=box(35,185,265,170,'A 内藏测力传感器','LLB130 / FSH04855');
  s+=box(390,185,265,170,'B 放大与采样','SEN-13879 / HX711');
  s+=box(745,165,265,220,'C Arduino Nano','A000005 · 经典5V');
  s+=box(745,535,265,180,'F 逻辑分配','SN74HC244N · 8个缓冲');
  s+=box(1110,165,315,155,'D0 中央驱动','DRV8874 #4035 ×1');
  s+=box(1110,405,315,95,'M0 中央线圈','独立动力回路');
  s+=box(1110,550,315,250,'D1 端部驱动','DRV8874 #4035 ×8');
  for(let i=1;i<=8;i++)s+=text(1130,626+(i-1)*21,`S${i} · 独立IN1 / 独立限流`,'small');
  s+=box(1110,885,315,100,'8只端部线圈','分别接各自OUT1 / OUT2');
  s+=box(35,790,265,160,'P 外置电源','GST60A12-P1J · 12V/5A');
  s+=box(390,790,265,160,'E 逻辑降压','D24V10F5 · 5V/1A');
  s+=box(745,870,265,130,'面包板分配5V/GND','JP1后供逻辑；动力回流分路');
  const lines=[];
  const add=(id,d,label,x,y)=>{const e=D.edges.find(e=>e.id===id);if(e&&(active(e)||state.step==='all'))lines.push(path(d,e,state.selected===id)+text(x,y,label,'small'));};
  ['E+','E-','S+','S-'].forEach((q,k)=>add('sensor-'+q,`M300 ${246+k*28} L390 ${246+k*28}`,['E+ → E+','E− → E−','S+ → A+','S− → A−'][k],306,238+k*28));
  add('dat','M655 250 L745 250','DAT → D3',663,238);add('clk','M745 320 L655 320','D2 → CLK',663,308);
  add('m0-command','M1010 245 L1110 245','D9 / 220Ω',1018,230);
  add('d10','M875 385 L875 535','D10送8个A',892,468);
  for(let k=0;k<8;k++)add('cmd-S'+(k+1),`M1010 ${590+k*13} L1055 ${590+k*13} L1055 ${620+k*21} L1110 ${620+k*21}`,k===0?'各Y → 220Ω → IN1':'',1018,575);
  add('p12','M300 900 L350 900 L350 1060 L1450 1060 L1450 300 L1425 300','12V经保险/急停直达驱动VIN',650,1092);
  add('buck-in','M300 835 L390 835','12V支路',306,822);
  add('feed5','M655 850 L710 850 L710 925 L745 925','5V / JP1',659,832);
  add('cross5','M875 870 L875 825 L700 825 L700 90 L520 90 L520 185','5V与GND经面包板分配',746,74);
  add('nano5','M700 90 L875 90 L875 165','逻辑5V',883,119);
  add('244-vcc','M700 825 L700 485 L790 485 L790 535','逻辑供电',708,509);
  add('feed0','M805 1000 L805 1020 L338 1020 L338 936 L300 936','公共0V参考',448,1007);
  add('nano0','M945 870 L945 845 L725 845 L725 128 L985 128 L985 165','GND',992,150);
  add('hx-gnd','M725 128 L625 128 L625 185','GND',634,155);
  add('244-gnd','M725 750 L1035 750 L1035 697 L1010 697','GND',1040,738);
  add('out1-M0','M1200 320 L1200 405','OUT1/2',1212,372);
  add('out2-M0','M1330 405 L1330 320','',0,0);
  add('out1-S'+state.branch,'M1265 800 L1265 885','各自OUT1/2',1280,848);
  add('out2-S'+state.branch,'M1370 885 L1370 800','',0,0);
  add('vin-S1','M1450 650 L1425 650','12V',1455,633);
  add('ground-M0','M1425 285 L1470 285 L1470 1100 L325 1100 L325 936 L300 936','动力0V回线',445,1088);
  add('ground-S1','M1425 780 L1470 780','0V',1435,765);
  add('f-nano','M1425 590 L1460 590 L1460 115 L955 115 L955 165','开漏FAULT → D4',1060,104);
  add('t-loop','M1010 355 L1065 355 L1065 445 L980 445 L980 385','NC温控链 → D5',1080,438);
  s+=lines.join('');s+=text(38,1020,'信号经过面包板；线圈功率绕过面包板。','subtitle');
  s+=text(38,1052,'逻辑图合并同功能连接，精确孔号切换到“面包板孔位”。','small');
  return s;
 }
 function driver(){let s='',id=state.branch===0?'M0':'S'+state.branch;
  s+=box(570,205,370,430,id+' · Pololu #4035','DRV8874 / IN-IN模式');
  s+=box(35,185,350,210,'面包板发出的逻辑','M0取D9；S取244独立Y');
  s+=text(55,280,'220Ω串联后到IN1；端口10k下拉');
  s+=box(1100,230,330,190,id+'本路线圈','OUT1 / OUT2分别接两端');
  s+=box(35,675,350,185,'端子排来的动力','12V经过本路'+(id==='M0'?'T2A':'T1A')+'到VIN');
  const labels=['EN/IN1','PH/IN2 = GND','PMODE = 5V','IMODE = GND','SLEEP = 5V','VREF → Rd → GND','CS保留原板2.49k','FAULT → F端子 → D4'];
  labels.forEach((q,k)=>s+=text(590,295+k*39,q));
  const fake=(key,net)=>({id:key,label:key,net});
  s+=path('M385 285 L570 285',fake(id==='M0'?'m0-command':'cmd-'+id,'S_CMD'))+text(402,267,'IN1', 'small');
  s+=path('M940 300 L1100 300',fake('out1-'+id,'COIL'))+text(978,284,'OUT1','small');
  s+=path('M1100 365 L940 365',fake('out2-'+id,'COIL'))+text(978,351,'OUT2','small');
  s+=path('M385 740 L465 740 L465 595 L570 595',fake('vin-'+id,'12V'));
  s+=text(438,720,'VIN', 'small');
  s+=box(1030,510,400,130,'每块独立设置VREF','先用560Ω；'+id+'计划逐级至'+(id==='M0'?'5.11kΩ':'1.58kΩ'));
  s+=box(570,780,860,210,'VM侧本地储能与钳位','470µF/35V +100nF/50V +SMCJ18A');
  s+=text(592,890,'TVS阴极到VM、阳极到本地GND；按实测电感和重复能量复核。');
  s+=text(592,933,'驱动GND独立回0V端子，不能让线圈电流流经面包板。');
  s+=path('M755 635 L755 780',fake('vm','12V'))+text(770,719,'VM（反接保护后）','small');
  s+=text(40,1035,'这是所有9块驱动共用的端子设置；外部模块未按PCB针脚物理顺序绘制。');
  return s;
 }
 function render(){
  const step=D.steps.find(s=>s.id===state.step);$('step-title').textContent=step.title;$('step-body').textContent=step.body;
  document.querySelectorAll('[data-step]').forEach(b=>{if(b.dataset.step===state.step)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
  document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===state.view)));
  $('branch').value=state.branch;
  const list=D.edges.filter(active),sel=list.find(e=>e.id===state.selected);
  $('wire-select').innerHTML='<option value="">查看本步骤全部线路</option>'+list.map(e=>`<option value="${esc(e.id)}">${esc(e.label)} · ${esc(e.a)} → ${esc(e.b)}</option>`).join('');$('wire-select').value=sel?.id||'';
  $('wire-detail').textContent=sel?sel.label+'：'+titleOf(sel.a)+' → '+titleOf(sel.b)+(sel.value?'；'+sel.value:''):'选中一根线路，查看端点和对应孔号。';
  $('strip-detail').textContent=sel?'起点：'+strip(sel.a)+'；终点：'+strip(sel.b)+'。'+(sel.kind==='resistor'?'这是电阻，不是裸跳线；两端不能短接。':''):step.body;
  $('wire-table').querySelector('tbody').innerHTML=list.map(e=>`<tr${e.id===sel?.id?' aria-current="true"':''}><td><button type="button" data-wire="${esc(e.id)}">${esc(e.label)}${e.value?' · '+esc(e.value):''}</button></td><td>${esc(titleOf(e.a))}</td><td>${esc(titleOf(e.b))}</td></tr>`).join('');
  $('diagram').innerHTML='<title id="svg-title">'+esc(state.view==='board'?'面包板孔位接线图':state.view==='driver'?'单路DRV8874接线详图':'受压信号与动力接线逻辑')+'</title><desc id="svg-desc">图下的线路选择器和表格提供同样的连接信息。</desc><rect width="1480" height="1120" class="paper"/>'+(state.view==='board'?board():state.view==='driver'?driver():logic());
  $('diagram-caption').textContent=state.view==='board'?'孔位图 · Nano USB朝上，244缺口朝上；孔号与下表一致。':state.view==='driver'?'单路驱动详图 · 当前展开'+(state.branch===0?'M0':'S'+state.branch)+'，相同模式适用于其他驱动。':'逻辑图 · 数据与控制经面包板，12V与线圈功率经端子排。';
  $('play').textContent=state.playing?'暂停接线顺序':'播放接线顺序';$('play').setAttribute('aria-pressed',String(state.playing));
 }
 function stop(){state.playing=false;if(timer){clearInterval(timer);timer=null;}}
 function focusDiagram(){if(state.view!=='board')return;const frame=$('diagram-scroll'),scale=$('diagram').getBoundingClientRect().width/1480;if(!scale||!frame.clientWidth)return;const edge=D.edges.find(e=>e.id===state.selected&&active(e));let x=575,y=310;if(edge){const a=D.nodes[edge.a],b=D.nodes[edge.b];x=(a.x+b.x)/2;y=(a.y+b.y)/2;if(Math.abs(a.x-b.x)*scale>frame.clientWidth-40)x=a.type==='hole'?a.x:b.type==='hole'?b.x:575;}frame.scrollLeft=Math.max(0,x*scale-frame.clientWidth/2+12);frame.scrollTop=Math.max(0,y*scale-frame.clientHeight/2+12);}
 function selectWire(id){const e=D.edges.find(e=>e.id===id);if(!e)return;const restore=document.activeElement?.dataset?.wire===id;if(state.step!=='all'&&state.step!==e.stage)state.step=e.stage;state.selected=id;render();if(restore)document.querySelector('[data-wire="'+id+'"]')?.focus({preventScroll:true});window.requestAnimationFrame?.(focusDiagram);}
 document.addEventListener('click',ev=>{const b=ev.target.closest('[data-step],[data-view],[data-wire],[data-edge]');if(!b)return;if(b.dataset.step){stop();state.step=b.dataset.step;state.selected='';if(state.view==='driver'&&state.step!=='actuator')state.view='board';}else if(b.dataset.view){state.view=b.dataset.view;if(state.view==='driver'){state.step='actuator';state.selected='vin-'+(state.branch===0?'M0':'S'+state.branch);}}else{selectWire(b.dataset.wire||b.dataset.edge);return;}render();window.requestAnimationFrame?.(focusDiagram);});
 $('wire-select').addEventListener('change',e=>{state.selected=e.target.value;render();});$('clear-wire').addEventListener('click',()=>{state.selected='';render();});
 $('branch').addEventListener('change',e=>{state.branch=Math.max(0,Math.min(8,Number(e.target.value)));if(state.step==='branches')state.selected=state.branch===0?'m0-command':'cmd-S'+state.branch;if(state.view==='driver'){state.step='actuator';state.selected='vin-'+(state.branch===0?'M0':'S'+state.branch);}render();});
 $('play').addEventListener('click',()=>{if(state.playing)stop();else{state.playing=true;timer=setInterval(()=>{const i=D.steps.findIndex(s=>s.id===state.step);state.step=D.steps[(i+1)%7].id;state.selected=D.edges.find(e=>e.stage===state.step)?.id||'';render();},2600);}render();});
 window.addEventListener('pagehide',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();render();}});
 window.__breadboard={state,render,selectWire,stop,data:D};render();window.requestAnimationFrame?.(focusDiagram);
})();
