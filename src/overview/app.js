(()=>{'use strict';
const explanations=[
 '中央M0先通电，目标是把铁珠从弧底吸向中央工作区。端部S暂时关闭。',
 'M0继续开，8只端部S同时开启，形成短暂重叠，尝试把吸引区域交接到端部。',
 'M0关闭，只有端部S继续开，目标是让珠群向外端迁移、短暂停留。',
 '全部断电，铁珠依靠重力落回弧底，准备下一轮。'];
const centers=[[238,183],[340,175],[494,183],[346,283]],buttons=[...document.querySelectorAll('[data-phase]')],beads=[...document.querySelectorAll('#bead-group circle')];
const play=document.getElementById('play-sequence'),note=document.getElementById('phase-explanation');
let timer=null,phase=3,playing=false;
function stop(){if(timer!==null)clearTimeout(timer);timer=null;playing=false;play.textContent='放慢演示一轮';play.setAttribute('aria-pressed','false');}
function show(n){phase=n;buttons.forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.phase)===n)));
 document.getElementById('m0-coil').classList.toggle('big-on',n<2);document.getElementById('s-coil').classList.toggle('small-on',n===1||n===2);
 const [cx,cy]=centers[n];beads.forEach((b,i)=>{const col=i%9,row=Math.floor(i/9),x=cx+(col-4)*10,y=cy+row*10;b.setAttribute('transform',`translate(${x} ${y})`);});
 note.textContent=explanations[n];document.getElementById('sequence-diagram').dataset.phase=String(n);}
buttons.forEach(b=>b.addEventListener('click',()=>{stop();show(Number(b.dataset.phase));}));
play.addEventListener('click',()=>{if(playing){stop();return;}playing=true;play.textContent='暂停演示';play.setAttribute('aria-pressed','true');show(0);
 const advance=()=>{if(!playing)return;if(phase<3){show(phase+1);timer=setTimeout(advance,1200);}else stop();};timer=setTimeout(advance,1200);});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
show(3);play.setAttribute('aria-pressed','false');
})();
