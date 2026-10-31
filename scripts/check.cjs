const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),Model=require('../src/engine.js');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(!html.includes('/*__')&&!html.includes('127.0.0.1')&&!html.includes('<iframe'));
assert(html.includes('requestAnimationFrame')&&html.includes('id="vr-count"'));
assert(html.includes('min="25" max="200" step="5" value="100"'));
for(const file of [path.join(root,'index.html'),path.join(root,'v6-bottom-up.html'),...fs.readdirSync(path.join(root,'archive')).map(n=>path.join(root,'archive',n))]){
 const content=fs.readFileSync(file,'utf8');
 const ids=[...content.split('<script>')[0].matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(ids.length,new Set(ids).size,'Duplicate IDs: '+file);
 for(const m of content.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
 for(const match of content.matchAll(/href="([^"]+)"/g)){
  const href=match[1];if(/^(https?:|#|mailto:)/.test(href))continue;
  assert(fs.existsSync(path.resolve(path.dirname(file),decodeURIComponent(href.split('#')[0]))),'Missing link: '+href);
 }
}
for(const n of [25,50,100,200]){
 const world=Model.createWorld({beadCount:n});
 assert.equal(world.layers.length,8);assert(world.layers.every(a=>a.length===n));
 assert.equal(new Set(world.layers.flat().map(p=>p.id)).size,n*8);
 world.advance(.1);
 for(const a of world.layers)for(const p of a)assert(Number.isFinite(p.x+p.z)&&p.x>=.99&&p.x<=95.01&&p.z<=104.01);
 for(let l=0;l<8;l++)assert.equal(world.stats(l).meanHeight,world.layers[l].reduce((s,p)=>s+p.z,0)/n);
}
const t={bigOn:.2,smallOn:2,bigOff:2.6,smallOff:3,period:5.3};
for(const [time,big,small]of [[.1,0,0],[1,1,0],[2.3,1,1],[2.8,0,1],[4,0,0]]){
 const d=Model.input(time,t);assert.equal(d.big,big);assert.equal(d.small,small);
}
console.log('PASS: 200..1600 beads, finite motion, statistics, switching sequence, self-contained scripts and all current/history links.');
