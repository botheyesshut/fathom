// THE HOLD, A/B TESTED — does carrying a thing change anything?
//
// Counting readers is not proof. The flooded lung's `airMult: 1.6` had a
// field, a comment describing it, a tier-2 wound built around it — and nothing
// read it, so air cost was identical with three of them. Five other shipped
// features in this project turned out to have no call site at all.
//
// So this file does the only thing that settles it: hold the item, do the
// thing the property claims to affect, and diff against not holding it.
//
//   node tests/hold.js
//
// NOT wired into run-all.js — it is slow and it is an investigation, not an
// invariant. Run it after touching ITEMS, stressHold, holdTick or hauntTick.
//
// TWO WARNINGS FROM WRITING IT, both of which cost a false "dead property":
//   * `move()` returns immediately while `ashore()` is true, so a probe that
//     moves from spawn measures a move that never happened.
//   * moving to (q+1, r) is usually stone. Filter to real open neighbours.
// Both produced a confident 0-vs-0 for `heavy`, which is in fact live.
//
// Result at the time of writing: 8 of 8 properties measurably real.
const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync((process.env.FATHOM_HTML || __dirname + '/../fathom-chart.html'),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
// A CLOCK THAT DOES NOT MOVE.
//
// `resumeGame` reseeds the gameplay dice with `worldSeed ^ Date.now()` — on
// purpose, so reloading a save does not replay the same coin flips. The cost is
// that every suite exercising save/reload became unreproducible from that line
// on: combat rolls, item detonations and curse bleeds all differed run to run,
// inside checks written tolerantly enough not to notice. A regression could sit
// in that wobble indefinitely.
//
// Only `now` is pinned. `new Date()` still works, because the transcript export
// formats real dates and has no business being frozen.
// MONOTONIC, NOT FROZEN. A clock pinned to one instant is reproducible and also
// wrong: `restart()` derives a fresh world seed from `Date.now()`, so a stopped
// clock made every restart regenerate the SAME ocean — and save.test caught it,
// which is the check doing exactly its job. This advances a fixed step per read,
// so the Nth call is always the same number across runs while still moving
// forward within one.
let _tick = 1754265600000;   // 2025-08-04T00:00:00Z, arbitrary
const FrozenDate = new Proxy(Date, { get(t, p) { return p === 'now' ? () => (_tick += 1000) : t[p]; } });
function makeStub(){const fn=function(){return stub;};const stub=new Proxy(fn,{get(t,p){if(p===Symbol.toPrimitive)return()=>0;if(p===Symbol.iterator)return function*(){};if(p==='length')return 0;if(['firstChild','lastChild','nextSibling','parentNode'].includes(p))return null;if(p==='childNodes')return[];if(p==='classList')return{add(){},remove(){},contains(){return false},toggle(){return false}};if(p==='style')return{};return stub;},apply(){return stub},set(){return true},has(){return true},construct(){return stub}});return stub;}
function boot(seed){
  const stub=makeStub();const pingEl={value:'2',max:'5',addEventListener:()=>{},disabled:false,textContent:''};
  const documentStub=new Proxy({},{get(t,p){if(['createElementNS','createElement','querySelector','querySelectorAll'].includes(p))return()=>makeStub();if(p==='getElementById')return id=>id==='ping-power'?pingEl:makeStub();if(p==='addEventListener')return()=>{};return stub;}});
  const mem={};
  const sb={console:{log(){},warn(){},error(){}},Math,JSON,Date: FrozenDate,Array,Object,Map,Set,String,Number,Boolean,Symbol,parseInt,parseFloat,isNaN,isFinite,setTimeout:()=>0,clearTimeout:()=>{},setInterval:()=>0,clearInterval:()=>{},requestAnimationFrame:()=>0,cancelAnimationFrame:()=>{},performance:{now:()=>0},document:documentStub,navigator:{userAgent:'node'},localStorage:{getItem:k=>(k in mem?mem[k]:null),setItem:(k,v)=>{mem[k]=String(v)},removeItem:k=>{delete mem[k]}},addEventListener:()=>{},removeEventListener:()=>{},location:{href:'',reload:()=>{}},matchMedia:()=>({matches:false,addEventListener:()=>{},addListener:()=>{}}),alert:()=>{}};
  sb.window=sb;sb.globalThis=sb;sb.self=sb;vm.createContext(sb);
  const probe='\nfunction __state(){return state}\nfunction __I(){return ITEMS}'
   +'\nfunction __seed(s){worldSeed=s;interiorSalt=":"+s;interiorCache.clear();rng=mulberry32(s);resetWorldCaches();spawnedChunks.clear();state.creatures=[];state.enclaves=[]}'
   +'\nfunction __has(p){return countHeldWith(p)}\nfunction __lum(){return luminousBonus()}\nfunction __gills(){return canBreatheWater()}'
   +'\nfunction __noise(q,r,l){noiseMade(q,r,l)}\nfunction __stress(t,i){stressHold(t,i)}'
   +'\nfunction __give(k,n){giveItem(k,n)}\nfunction __count(k){return itemCount(k)}'
   +'\nfunction __hold(){holdTick()}\nfunction __haunt(){hauntTick()}\nfunction __tile(q,r){return tileAt(q,r)}'
   +'\nfunction __nbrs(q,r){return hexNeighbors(q,r)}\nfunction __accepts(t,d){return hexAcceptsDepth(t,d)}'
   +'\nfunction __start(){gameStarted=true}';
  try{vm.runInContext(script+probe,sb,{timeout:20000})}catch(e){if(typeof sb.state==='undefined')throw e}
  sb.restart();sb.__start();sb.__seed(seed);
  return sb;
}
const s=boot(777); const I=s.__I(); const st=s.__state();
// Which item carries which property?
const carrier={};
for(const k of Object.keys(I)) for(const p of (I[k].props||[])) if(!carrier[p]) carrier[p]=k;

function withItem(prop, fn, n){
  const st=s.__state();
  st.items={}; st.crew=[]; st.fits={}; st.hull=100; st.air=350; st.creatures=[];
  const base=fn();
  st.items={}; st.crew=[]; st.fits={}; st.hull=100; st.air=350; st.creatures=[];
  s.__give(carrier[prop], n||1);
  const held=fn();
  st.items={};
  return {base, held, changed: JSON.stringify(base)!==JSON.stringify(held)};
}
const out=[];
// luminous — a lamp bonus
out.push(['luminous', carrier.luminous, withItem('luminous', ()=>s.__lum())]);
// gills — can the party cross drowned water?
out.push(['gills', carrier.gills, withItem('gills', ()=>s.__gills())]);
// ward — hunters stoke slower. Measure interest gained from one identical shout.
out.push(['ward', carrier.ward, withItem('ward', ()=>{
  const st=s.__state();
  st.creatures=[{type:'lurker',q:st.q,r:st.r,depth:st.currentDepth,interest:0,gone:false,tenacity:.5,aggression:.5,tq:0,tr:0,hp:10}];
  s.__noise(st.q,st.r,3);
  return Math.round(st.creatures[0].interest);
})]);
// heavy — air cost per move
// `s.move(st.q+1, st.r)` was moving into stone, so nothing was spent either
// way and the probe read 0 vs 0 — my instrument, not the game. Take a legal
// neighbour, and if there is none, read the cost function directly.
out.push(['heavy', carrier.heavy, withItem('heavy', ()=>{
  // OFF THE DOCK FIRST. `move()` returns immediately while `ashore()` is true,
  // so the previous two versions of this measured a move that never happened
  // and read 0 vs 0 — which I nearly filed as a dead property.
  const st=s.__state();
  st.currentDepth=60;
  const ns=s.__nbrs(st.q,st.r).map(n=>s.__tile(n.q,n.r)).filter(t=>t&&!t.wall&&!t.land&&s.__accepts(t,st.currentDepth));
  if(!ns.length) return 'no legal move';
  const a0=st.air;
  s.move(ns[0].q,ns[0].r);
  const spent=a0-st.air; st.air=350; return spent;
})]);
// volatile / fragile — do they actually go off under stress?
for(const p of ['volatile','fragile']){
  const st2=s.__state();
  let lost=0;
  for(let t=0;t<400;t++){ st2.items={}; s.__give(carrier[p],1); s.__stress('pressure',1); if(s.__count(carrier[p])===0) lost++; }
  st2.items={};
  out.push([p, carrier[p], {base:'—', held:lost+'/400 destroyed by stressHold', changed: lost>0}]);
}
// living — does it grow?
{
  const st2=s.__state(); st2.items={}; s.__give(carrier.living,1);
  let grew=0; for(let t=0;t<600;t++){ const b=s.__count(carrier.living); s.__hold(); if(s.__count(carrier.living)>b) grew++; }
  const end=s.__count(carrier.living); st2.items={};
  out.push(['living', carrier.living, {base:1, held:end+' after 600 turns ('+grew+' growth events)', changed: grew>0}]);
}
// cursed — does carrying one fray the crew?
{
  const st2=s.__state();
  const mk=()=>({name:'A',role:'diver',xp:0,nerve:100,conditions:[],scars:[],wounded:false,dying:false});
  st2.items={}; st2.crew=[mk()];
  for(let t=0;t<400;t++) s.__haunt();
  const clean=Math.round(st2.crew[0].nerve);
  st2.items={}; st2.crew=[mk()]; s.__give(carrier.cursed,1);
  for(let t=0;t<400;t++) s.__haunt();
  const hexed=Math.round(st2.crew[0] ? st2.crew[0].nerve : -1);
  st2.items={}; st2.crew=[];
  out.push(['cursed', carrier.cursed, {base:'nerve '+clean, held:'nerve '+hexed, changed: clean!==hexed}]);
}
console.log('\n=== ITEM PROPERTIES, A/B TESTED IN A LIVE GAME ===\n');
for(const [p,item,r] of out){
  const tag = r.changed ? 'REAL  ' : 'NO EFFECT MEASURED';
  console.log('  '+(p+'          ').slice(0,11)+(item+'                ').slice(0,16)+tag);
  console.log('      without: '+JSON.stringify(r.base)+'    with: '+JSON.stringify(r.held));
}
const dead=out.filter(o=>!o[2].changed);
console.log('\n  '+dead.length+' of '+out.length+' tested properties produced no measurable change'+(dead.length?': '+dead.map(d=>d[0]).join(', '):'.')+'\n');
