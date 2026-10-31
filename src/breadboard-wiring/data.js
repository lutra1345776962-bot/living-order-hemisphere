(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.BreadboardPlan=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const nodes={},edges=[],parts=[],pins={},steps=[
  {id:'power',title:'1 · 5V与公共地',body:'面包板四条电源轨只分配5V与GND。四条轨道的上下段、左右同极性轨道分别用跳线接通；接电脑USB前先拔JP1。'},
  {id:'sensor',title:'2 · 传感器接HX711',body:'红E+、黑E−、绿S+、白S−分别经左半区第24至27排接HX711 E+、E−、A+、A−。E+是HX711的桥路激励，不接5V电源轨。'},
  {id:'adc',title:'3 · HX711接Nano',body:'HX711 DAT接Nano D3；Nano D2回送CLK。这是专用同步接口，不是I²C。'},
  {id:'central',title:'4 · D9控制M0',body:'D9经220Ω串联电阻到中央DRV8874的IN1；IN1端10kΩ下拉，复位时默认关闭。12V与线圈回路不经过面包板。'},
  {id:'branches',title:'5 · D10分配8路',body:'D10经第30至32排的连接总线送到74HC244八个A输入。八个Y各经220Ω到对应S驱动IN1，每路10kΩ下拉。Y输出彼此不并联。'},
  {id:'feedback',title:'6 · 故障与温控反馈',body:'9个开漏FAULT在外部F端子汇接，再到Nano D4；D5连接绕组常闭温控串联链。两路各4.7kΩ上拉。故障LOW或温控链断开HIGH时程序关闭输出。'},
  {id:'actuator',title:'7 · 驱动与线圈动力',body:'12V经总保险、急停和各路保险进入驱动VIN。每只线圈接自己驱动的OUT1/OUT2；各驱动GND独立回到0V端子。模式、限流及VM吸收网络按右下方表配置。'},
  {id:'all',title:'全部连接',body:'完整图包含所有支路。选中一根跳线可单独追踪；面包板上相交的导线不自动相连，只有孔、金属条和明确端子形成连接。'}
 ];
 const cols={a:500,b:514,c:528,d:542,e:556,f:598,g:612,h:626,i:640,j:654};
 const rowY=n=>172+(n-1)*12;
 const hole=(c,r)=>c+r;
 for(let r=1;r<=63;r++)for(const [c,x]of Object.entries(cols))nodes[hole(c,r)]={id:hole(c,r),x,y:rowY(r),type:'hole',group:(c<='e'?'L':'R')+r,label:c+r};
 for(const [rail,x]of [['L+',458],['L-',476],['R+',680],['R-',698]])for(let n=1;n<=50;n++){
  const k=(n-1)%25,slot=(n<=25?1:35)+Math.floor(k/5)*6+k%5,id=rail+String(n).padStart(2,'0');
  nodes[id]={id,x,y:rowY(slot),type:'rail',group:rail+(n<=25?'U':'D'),label:id};
 }
 function node(id,x,y,label){nodes[id]={id,x,y,type:'port',group:id,label:label||id};return id;}
 function edge(id,stage,a,b,label,net,kind='wire',value=''){if(!nodes[a]||!nodes[b])throw Error('Unknown endpoint '+id);edges.push({id,stage,a,b,label,net,kind,value});return id;}
 function part(id,title,subtitle,x,y,w,h){parts.push({id,title,subtitle,x,y,w,h});}
 const occupied=new Set();
 const left=['D13','3V3','AREF','A0','A1','A2','A3','A4','A5','A6','A7','5V','RESET-L','GND-L','VIN'];
 const right=['D12','D11','D10','D9','D8','D7','D6','D5','D4','D3','D2','GND-R','RESET-R','RX0','TX1'];
 left.forEach((name,k)=>{pins['Nano.'+name]=hole('c',k+5);occupied.add(hole('c',k+5));});
 right.forEach((name,k)=>{pins['Nano.'+name]=hole('g',k+5);occupied.add(hole('g',k+5));});
 for(let p=1;p<=20;p++){const addr=p<=10?hole('e',34+p):hole('f',55-p);pins['U244.'+p]=addr;occupied.add(addr);}
 part('sensor','A · LLB130 / FSH04855','10lb · 顶板夹层内',35,170,310,175);
 for(const [k,y]of [['E+',218],['E-',252],['S+',286],['S-',320]])node('sensor.'+k,345,y,k);
 part('hx','B · SEN-13879 / HX711','模块端子按名称接线',35,405,310,295);
 for(const [k,y]of [['E+',450],['E-',484],['A+',518],['A-',552],['DAT',594],['CLK',628],['VCC',662],['VDD',687]])node('hx.'+k,345,y,k);
 node('hx.GND',35,662,'GND');
 part('buck','E · D24V10F5','12V → 5V；JP1后接面包板',35,745,310,110);
 node('buck.VIN',35,780,'VIN');node('buck.GND',35,824,'GND');node('buck.VOUT',345,790,'VOUT');node('JP1.in',375,790,'JP1');node('JP1.out',405,790,'JP1后5V');
 part('supply','P · GST60A12-P1J','外置12V / 5A适配器',35,935,310,130);
 node('P.+12',345,970,'+12V');node('P.0V',345,1030,'0V');
 part('m0','D0 · DRV8874 #4035','中央线圈驱动',1070,155,350,160);
 node('M0.IN1',1070,212,'IN1');node('M0.FAULT',1070,252,'FAULT');node('M0.VIN',1420,195,'VIN');node('M0.GND',1420,272,'GND');
 node('M0.OUT1',1225,315,'OUT1');node('M0.OUT2',1355,315,'OUT2');
 node('M0.coil1',1225,370,'绕组1');node('M0.coil2',1355,370,'绕组2');
 for(let i=1;i<=8;i++){
  const x=i<=4?1050:1240,y=430+((i-1)%4)*104,id='S'+i;
  part(id,id+' · DRV8874','独立调流',x,y,170,74);
  node(id+'.IN1',i<=4?x:x+170,y+28,'IN1');node(id+'.FAULT',x+65,y+74,'FAULT');node(id+'.VIN',x+170,y+14,'VIN');node(id+'.GND',x+170,y+58,'GND');
  node(id+'.OUT1',x+35,y+74,'OUT1');node(id+'.OUT2',x+140,y+74,'OUT2');node(id+'.coil1',x+35,y+94,'绕组1');node(id+'.coil2',x+140,y+94,'绕组2');
 }
 part('terminal','外部端子排 · 12V与0V','动力回流不经过面包板',1045,935,375,145);
 node('T.+12',1050,970,'急停后+12V');node('T.0V',1050,1030,'公共0V');node('F.bus',940,850,'F 故障汇接');
 node('thermal.in',865,915,'NC温控串联链');node('thermal.out',1000,915,'NC链回0V');
 const reserved={'L+':[46],'L-':[19,20,40,41,42,43],'R+':[46],'R-':[40,41,42,43]};
 const free={};for(const r of ['L+','L-','R+','R-'])free[r]=Array.from({length:50},(_,i)=>i+1).filter(i=>![1,2,25,26,...reserved[r]].includes(i));
 function railHole(rail){const n=free[rail].shift();if(!n)throw Error('Rail exhausted');return rail+String(n).padStart(2,'0');}
 const to5=(id,a,stage='power')=>edge(id,stage,a,railHole('L+'),'接逻辑5V','5V');
 const toG=(id,a,stage='power')=>edge(id,stage,a,railHole('L-'),'接逻辑GND','GND');
 edge('buck-in','actuator','P.+12','buck.VIN','12V经逻辑支路T0.5A到降压VIN','12V', 'wire','T0.5A');
 edge('buck-gnd','actuator','buck.GND','T.0V','降压输入地回星形0V','GND');
 edge('p12','actuator','P.+12','T.+12','12V经T5A、NC急停后到动力分配','12V','wire','T5A / NC急停');
 edge('p0','actuator','P.0V','T.0V','适配器0V到公共回线端子','GND');
 edge('buck-jp','power','buck.VOUT','JP1.in','降压5V到JP1输入','5V');
 edge('jp','power','JP1.in','JP1.out','独立运行接通JP1；连接电脑USB前拔掉','5V','jumper','JP1');
 edge('feed5','power','JP1.out','L+01','JP1后5V送入面包板L+上段','5V');
 edge('feed0','power','T.0V','L-01','0V参考接面包板L−上段，非线圈回流','GND');
 for(const r of ['L+','L-','R+','R-'])edge('bridge-'+r,'power',r+'25',r+'26','跨接'+r+'电源轨上下段',r.includes('+')?'5V':'GND');
 edge('cross5','power','L+02','R+01','连接左右5V电源轨','5V');edge('cross0','power','L-02','R-01','连接左右GND电源轨','GND');
 to5('nano5','a16');toG('nano0','a18');
 to5('hx-vcc','hx.VCC');to5('hx-vdd','hx.VDD');toG('hx-gnd','hx.GND');
 to5('244-vcc','j35');toG('244-gnd','a44');toG('244-oe1','a35');toG('244-oe2','j36');
 edge('c244','power','h35','h34','244电源旁100nF去耦','5V','capacitor','100nF');toG('c244-gnd','j34');
 ['E+','E-','S+','S-'].forEach((p,i)=>{
  const row=24+i,q=['E+','E-','A+','A-'][i];
  edge('sensor-'+p,'sensor','sensor.'+p,'a'+row,'传感器'+p+'到左半区第'+row+'排',q);
  edge('bridge-hx-'+q,'sensor','d'+row,'hx.'+q,'同排金属条转接至HX711 '+q,q);
 });
 edge('dat','adc','hx.DAT','j14','HX711 DAT → Nano D3（g14所在右半排）','DAT');
 edge('clk','adc','j15','hx.CLK','Nano D2（g15）→ HX711 CLK','CLK');
 edge('d9','central','j8','a22','Nano D9 → 第22排串阻前','D9');
 edge('r-m0','central','b22','b23','串联220Ω，隔开两排','M0_IN1','resistor','220Ω');
 edge('m0-command','central','c23','M0.IN1','串阻后 → M0 IN1','M0_IN1');
 edge('pd-m0','central','d23','L-19','M0 IN1端10kΩ下拉','GND','resistor','10kΩ');
 edge('d10','branches','j7','a30','Nano D10到逻辑分配总线','D10');
 edge('pd-d10','branches','b30','L-20','D10总线10kΩ下拉','GND','resistor','10kΩ');
 edge('hub1','branches','c30','a31','第30排与31排总线跨接','D10');edge('hub2','branches','d31','a32','第31排与32排总线跨接','D10');
 const fanoutSources=['d30','e30','b31','c31','e31','b32','c32','d32'];
 const inputHoles=['a36','b38','c40','d42','j44','i42','h40','g38'];
 const outHoles=['j37','j39','j41','j43','a43','a41','a39','a37'];
 const bufferMap=[[2,18],[4,16],[6,14],[8,12],[11,9],[13,7],[15,5],[17,3]];
 for(let k=0;k<8;k++){
  const id='S'+(k+1),row=49+(k%4)*2,leftHalf=k<4,pre=(leftHalf?'a':'j')+row,r0=(leftHalf?'b':'i')+row,r1=(leftHalf?'b':'i')+(row+1),out=(leftHalf?'c':'h')+(row+1),pd=(leftHalf?'d':'g')+(row+1);
  edge('in-'+id,'branches',fanoutSources[k],inputHoles[k],'D10总线 → 244 A脚'+bufferMap[k][0],'D10');
  edge('buf-'+id,'branches',outHoles[k],pre,'244 Y脚'+bufferMap[k][1]+' → '+id+'串阻前',id+'_BUF');
  edge('r-'+id,'branches',r0,r1,id+'串联220Ω',id+'_IN1','resistor','220Ω');
  edge('cmd-'+id,'branches',out,id+'.IN1','串阻后 → '+id+'驱动IN1',id+'_IN1');
  edge('pd-'+id,'branches',pd,(leftHalf?'L-':'R-')+(40+k%4),id+' IN1端10kΩ下拉','GND','resistor','10kΩ');
 }
 edge('f-to-board','feedback','F.bus','a58','外部开漏FAULT汇接端 → 左半区58排','FAULT');
 edge('f-nano','feedback','b58','j13','FAULT → Nano D4（g13）','FAULT');
 edge('f-pull','feedback','c58','L+46','FAULT 4.7kΩ上拉','5V','resistor','4.7kΩ');
 edge('t-nano','feedback','j12','j59','Nano D5（g12）→ 右半区59排','THERMAL');
 edge('t-loop','feedback','i59','thermal.in','D5 → 常闭温控串联链','THERMAL');
 edge('t-pull','feedback','h59','R+46','温控输入4.7kΩ上拉','5V','resistor','4.7kΩ');
 edge('t-return','feedback','thermal.out','T.0V','温控链另一端 → 0V','GND');
 const drivers=['M0',...Array.from({length:8},(_,i)=>'S'+(i+1))];
 for(const id of drivers){
  edge('fault-'+id,'feedback',id+'.FAULT','F.bus',id+'开漏FAULT并入F端子','FAULT');
  edge('vin-'+id,'actuator','T.+12',id+'.VIN',id+' VIN独立保险支路','12V','wire',id==='M0'?'T2A':'T1A');
  edge('ground-'+id,'actuator',id+'.GND','T.0V',id+'独立动力回线到0V端子','GND');
  edge('out1-'+id,'actuator',id+'.OUT1',id+'.coil1',id+' OUT1 → 本路线圈1','COIL');
  edge('out2-'+id,'actuator',id+'.coil2',id+'.OUT2',id+'本路线圈2 → OUT2','COIL');
  edge('coil-'+id,'actuator',id+'.coil1',id+'.coil2',id+'本路线圈绕组','COIL','inductor','定制试绕');
 }
 const driverConfig={model:'Pololu #4035 / DRV8874',pins:{PMODE:'5V',SLEEP:'5V','PH/IN2':'GND',IMODE:'GND'},startShunt:'560Ω',mainShunt:'5.11kΩ',branchShunt:'1.58kΩ',bufferMap};
 return{nodes,edges,parts,pins,occupied:[...occupied],steps,cols,rowY,bufferMap,drivers,driverConfig};
});
