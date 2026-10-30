const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const Model=require('../src/engine.js');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(js);
assert(html.includes('setInterval'),'Animation clock is missing');
assert(!html.includes('127.0.0.1'),'Local preview URL must not ship');
for(const file of [path.join(root,'index.html'),...fs.readdirSync(path.join(root,'archive')).map(n=>path.join(root,'archive',n))]){
  const content=fs.readFileSync(file,'utf8');
  const ids=[...content.split('<script>')[0].matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length,new Set(ids).size,'Duplicate IDs: '+file);
  const source=content.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  if(source)new vm.Script(source);
  for(const match of content.matchAll(/href="([^"]+)"/g)){
    const href=match[1];if(/^(https?:|#|mailto:)/.test(href))continue;
    assert(fs.existsSync(path.resolve(path.dirname(file),decodeURIComponent(href.split('#')[0]))),'Missing link: '+href);
  }
}
function run(coupled){
  const world=Model.create();assert.equal(world.nx,20);assert.equal(world.ny,20);assert.equal(world.n,400);
  const xy=JSON.stringify([Array.from(world.x),Array.from(world.y)]);
  Model.drop(world,2.8);assert.equal(Math.floor(world.events[0].source/20),19);
  let firstUp=false,rebound=false;
  for(let i=0;i<1440;i++){
    Model.step(world,1/180,{coupled,damping:1});
    if(i===89)assert(world.q.every(q=>q===0));
    if(i===185)firstUp=world.q.slice(340).some(q=>q>.1);
    if(i>220&&i<360)rebound ||= world.q.slice(340).some(q=>q<-.04);
    if(i%90===0)for(const q of world.q){assert(Number.isFinite(q));assert(Math.abs(q)<=Model.LIMIT+1e-12);}
  }
  assert(firstUp);assert(rebound);assert.equal(JSON.stringify([Array.from(world.x),Array.from(world.y)]),xy);
  if(coupled)assert(world.q.slice(0,200).some(q=>Math.abs(q)>.001));
  else assert(world.q.slice(0,340).every(q=>q===0));
}
run(true);run(false);
console.log('PASS: 20×20 grid, fixed x/y, bottom-up input, rebound, neighbour propagation, animation source, JavaScript syntax and internal links.');
