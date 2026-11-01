const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(!html.includes('/*__'));assert(html.includes('从一滴水，'));assert(html.includes('Arduino怎样把它们连起来'));
assert(html.includes('2.6秒全断')&&html.includes('最快周期4秒'));
assert(html.includes('DAT/DT → D3')&&html.includes('D9 → 220Ω')&&html.includes('D10 → SN74HC244N'));
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
for(const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
for(const m of html.matchAll(/(?:href|src)="([^"]+)"/g)){
 const link=m[1].replaceAll('&amp;','&');if(link.startsWith('#')){assert(ids.includes(link.slice(1)),link);continue;}
 if(/^(https?:|data:|mailto:)/.test(link))continue;
 assert(fs.existsSync(path.join(root,decodeURIComponent(link.split(/[?#]/)[0]))),'Missing local link: '+link);
}
const {JSDOM,VirtualConsole}=require('../../tmp/central-dom-check/node_modules/jsdom'),errors=[];
const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
const dom=new JSDOM(html,{runScripts:'dangerously',url:'http://127.0.0.1:58107/',virtualConsole:vc}),d=dom.window.document;
const big=d.getElementById('m0-coil'),small=d.getElementById('s-coil');
assert.equal(d.querySelector('#sequence-diagram').dataset.phase,'3');
for(let n=0;n<4;n++){
 d.querySelector(`[data-phase="${n}"]`).click();assert.equal(d.querySelectorAll('[data-phase][aria-pressed="true"]').length,1);
 assert.equal(big.classList.contains('big-on'),n<2);assert.equal(small.classList.contains('small-on'),n===1||n===2);
 assert.ok(d.getElementById('phase-explanation').textContent.length>15);
 const transforms=[...d.querySelectorAll('#bead-group circle')].map(b=>b.getAttribute('transform'));
 assert.equal(transforms.length,27);assert(transforms.every(t=>!t.includes('NaN')));
}
const play=d.getElementById('play-sequence');play.click();assert.equal(play.getAttribute('aria-pressed'),'true');
assert.equal(d.getElementById('sequence-diagram').dataset.phase,'0');
play.click();assert.equal(play.getAttribute('aria-pressed'),'false');
assert.deepEqual(errors,[]);dom.window.close();
console.log('PASS: project coverage, all links/anchors, unique IDs, valid scripts, 4 coil stages, vectors and playback controls.');
