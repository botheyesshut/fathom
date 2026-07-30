// CAN CARGO BE BANKED AT ALL? — an instrument.  node tests/banking.js
//
// Written because the hours 2-10 audit reported `crates banked: median 0, MAX 0`
// across 24 runs of 2,500 turns, which looked like a P0 and was not: banking works,
// and the bot simply never surfaces beside the dock holding anything. Kept because
// "the ledger is unreachable" is the single worst thing that could quietly be true
// in this game, and it took ten minutes to rule out.

// WHERE IS THE DOCK, AND DOES BANKING STILL FIND IT?
// `surface()` banks cargo when the boat is within 4 hexes of the HARDCODED (1,1).
// The home island became radial and the generator places the harbour now. If those
// two ever came apart, cargo can never be banked — which is exactly what the
// hours 2-10 audit measured: median 0, MAX 0, over 24 runs of 2,500 turns.
const fs=require('fs'),vm=require('vm');
function mk(){const fn=function(){return s};const s=new Proxy(fn,{get(t,p){if(p===Symbol.toPrimitive)return()=>0;if(p===Symbol.iterator)return function*(){};if(p==='length')return 0;if(['firstChild','lastChild','nextSibling','parentNode'].includes(p))return null;return s},apply(){return s},set(){return true},has(){return true}});return s}
const script=fs.readFileSync('C:/Users/bothe/Documents/GitHub/personal/Fathom/fathom-chart.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const doc=new Proxy({},{get(t,p){if(['createElementNS','createElement','getElementById','querySelector','querySelectorAll'].includes(p))return()=>mk();if(p==='addEventListener')return()=>{};return mk()}});
const sb={console,Math,JSON,Date,Array,Object,Map,Set,String,Number,Boolean,Symbol,parseInt,parseFloat,isNaN,isFinite,setTimeout:()=>0,clearTimeout:()=>{},setInterval:()=>0,clearInterval:()=>{},requestAnimationFrame:()=>0,performance:{now:()=>Date.now()},document:doc,navigator:{userAgent:'node'},localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},addEventListener:()=>{},location:{href:'',reload:()=>{}},matchMedia:()=>({matches:false,addEventListener:()=>{},addListener:()=>{}}),alert:()=>{}};
sb.window=sb;sb.globalThis=sb;sb.self=sb;vm.createContext(sb);
vm.runInContext(script+`
;var __L=[]; log=function(t,c,e){__L.push({t:String(t),c:c||'',e:e||''})};
gameStarted = true;
var __X={ seedTo(v){worldSeed=v;interiorSalt=':'+v;resetWorldCaches();interiorCache.clear();spawnedChunks.clear();state.enclaves=[];state.creatures=[]},
  get logs(){return __L}, world,cells,cellKey,tileAt,getTile,hexDistance,hexKey,state,surface,changeDepth,volumeContaining,ports,homeIsle };
`,sb,{timeout:120000});
const X=sb.__X;
console.log('WHERE IS THE DOCK, AND CAN CARGO BE BANKED?');
console.log('seed      dock tile at    dist to (1,1)   surfaced there banks?');
for (const seed of [90210, 4242, 7, 12345, 777]) {
  X.seedTo(seed);
  for (let q=-24;q<=24;q++) for (let r=-24;r<=24;r++) X.tileAt(q,r);
  // find the home dock: the dock tile nearest the origin
  let dock=null, bd=999;
  for (const t of X.world.values()) {
    if (t.type !== 'dock') continue;
    const d = X.hexDistance({q:t.q,r:t.r},{q:0,r:0});
    if (d < bd) { bd = d; dock = t; }
  }
  if (!dock) { console.log(String(seed).padEnd(10)+'NO DOCK FOUND'); continue }
  const distTo11 = X.hexDistance({q:dock.q,r:dock.r},{q:1,r:1});
  // put the boat in the water beside the dock, with cargo, and surface
  let spot=null;
  for (const [dq,dr] of [[1,0],[-1,0],[0,1],[0,-1],[1,-1],[-1,1],[2,0],[0,2],[-2,0],[0,-2]]) {
    const t=X.getTile(dock.q+dq,dock.r+dr);
    if (t && !t.wall && X.volumeContaining(t,0)) { spot={q:dock.q+dq,r:dock.r+dr}; break }
  }
  if (!spot) { console.log(String(seed).padEnd(10)+'dock at '+dock.q+','+dock.r+' — no water beside it'); continue }
  // RISE INTO IT, do not call surface() by hand. The point of this check is that the
  // ledger is REACHABLE, and calling the function directly cannot tell you that — it
  // passed happily on a build where nothing called `surface()` at all.
  X.state.q=spot.q; X.state.r=spot.r; X.state.currentDepth=120; X.state.alive=true;
  X.state.foot=null; X.state.cargo=7; X.state.cargoBanked=0; X.state.relics=0;
  X.state.crew=[]; X.state.stores=100; X.state.air=350; X.logs.length=0;
  for (let i=0;i<4 && X.state.currentDepth>0;i++) X.changeDepth(-60);
  const banked = X.state.cargoBanked;
  console.log(String(seed).padEnd(10)+String(dock.q+','+dock.r).padEnd(16)+String(distTo11).padEnd(16)
    + (banked>0 ? 'YES — '+banked+' crates' : 'NO  — cargo still ' + X.state.cargo + ' aboard'));
}
