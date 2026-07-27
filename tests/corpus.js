// THE CORPUS — an instrument for the prose.
//
// Fathom is mostly text, so the text is the game. An audit harvested 92,560
// generated lines and found that half of everything a player reads comes from
// 44 sentences, that the ambient engine is 24 sentences carrying a third of
// the output and exhausted by turn 27, and that the boat contradicts itself
// in the same paragraph 82.5% of the time it says a column cannot be sounded.
//
// It also caught a fix of mine that did not work. I had damped the two most
// repeated lines and measured the result with tests/firsthour.js — 25 taps
// from a cold boot — which said the worst offender had gone from 18.4% to
// 5.8%. Over 500-turn sessions it was still 11.2%, because I had keyed the
// damper on the EXACT METRES under the keel, a continuous quantity that
// changes on nearly every move, and because 25 taps never leaves the shelf.
//
// So: measure the corpus over LONG sessions, or do not claim anything about
// repetition.
//
//   node tests/corpus.js [runs] [turns]
//
// NOT wired into run-all.js. The battery answers "is it broken"; this answers
// "is it worth reading", which has no pass line.
//
// CAVEAT, STATED LOUDLY: the novelty percentages depend on the BOT'S
// behaviour profile, not only the game's. This bot changes depth on ~28% of
// turns, so vertical-column lines are over-represented compared with a human.
// Compare a number here only against another run of THIS file.
const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(__dirname+'/../fathom-chart.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
function makeStub(){const fn=function(){return stub;};const stub=new Proxy(fn,{get(t,p){if(p===Symbol.toPrimitive)return()=>0;if(p===Symbol.iterator)return function*(){};if(p==='length')return 0;if(['firstChild','lastChild','nextSibling','parentNode'].includes(p))return null;if(p==='classList')return{add(){},remove(){},contains(){return false},toggle(){return false}};if(p==='style')return{};return stub;},apply(){return stub},set(){return true},has(){return true},construct(){return stub}});return stub;}
function boot(seed){
  const stub=makeStub();const pingEl={value:'2',max:'5',addEventListener:()=>{},disabled:false,textContent:''};
  const documentStub=new Proxy({},{get(t,p){if(['createElementNS','createElement','querySelector','querySelectorAll'].includes(p))return()=>makeStub();if(p==='getElementById')return id=>id==='ping-power'?pingEl:makeStub();if(p==='addEventListener')return()=>{};return stub;}});
  const mem={};let clock=0;
  const sb={console:{log(){},warn(){},error(){}},Math,JSON,Date,Array,Object,Map,Set,String,Number,Boolean,Symbol,parseInt,parseFloat,isNaN,isFinite,setTimeout:()=>0,clearTimeout:()=>{},setInterval:()=>0,clearInterval:()=>{},requestAnimationFrame:()=>0,cancelAnimationFrame:()=>{},performance:{now:()=>(clock+=3000)},document:documentStub,navigator:{userAgent:'node'},localStorage:{getItem:k=>(k in mem?mem[k]:null),setItem:(k,v)=>{mem[k]=String(v)},removeItem:k=>{delete mem[k]}},addEventListener:()=>{},removeEventListener:()=>{},location:{href:'',reload:()=>{}},matchMedia:()=>({matches:false,addEventListener:()=>{},addListener:()=>{}}),alert:()=>{}};
  sb.window=sb;sb.globalThis=sb;sb.self=sb;vm.createContext(sb);
  const probe='\nvar __L=[];(function(){var _l=log;log=function(t,c,g){__L.push({t:String(t),tag:g||""});return _l.apply(null,arguments)}})();'
   +'\nfunction __L_(){return __L}function __clr(){__L.length=0}\nfunction __state(){return state}'
   +'\nfunction __seed(s){worldSeed=s;rng=mulberry32(s);resetWorldCaches();spawnedChunks.clear();state.creatures=[];state.enclaves=[]}'
   +'\nfunction __tile(q,r){return tileAt(q,r)}\nfunction __accepts(t,d){return hexAcceptsDepth(t,d)}\nfunction __nbrs(q,r){return hexNeighbors(q,r)}'
   +'\nfunction __snd(){return soundingBelow()}\nfunction __start(){gameStarted=true}';
  try{vm.runInContext(script+probe,sb,{timeout:20000})}catch(e){if(typeof sb.state==='undefined')throw e}
  sb.restart();sb.__start();sb.__seed(seed);sb.__tile(0,0);sb.__clr();
  return sb;
}
const lines=[];
const RUNS=parseInt(process.argv[2]||'20',10), TURNS=parseInt(process.argv[3]||'400',10);
for(let i=0;i<RUNS;i++){
  const s=boot(7000+i); const st=s.__state();
  for(let t=0;t<TURNS && st.alive;t++){
    const r=Math.random();
    if(r<0.08) s.ping();
    else if(r<0.14) s.lookAround();
    else if(r<0.42){ const snd=s.__snd(); if(snd&&snd.under>0) s.changeDepth(s.activeSub().diveStep); else s.changeDepth(-s.activeSub().diveStep); }
    else {
      const ns=s.__nbrs(st.q,st.r).map(n=>s.__tile(n.q,n.r)).filter(tl=>tl&&!tl.wall&&!tl.land&&s.__accepts(tl,st.currentDepth));
      if(ns.length){const n=ns[Math.floor(Math.random()*ns.length)];s.move(n.q,n.r);} else s.wait();
    }
  }
  lines.push(...s.__L_());
}
const N=lines.length;
const freq={};
for(const l of lines) freq[l.t]=(freq[l.t]||0)+1;
const ranked=Object.entries(freq).sort((a,b)=>b[1]-a[1]);
const has=sub=>lines.filter(l=>l.t.includes(sub)).length;
const pc=n=>(100*n/N).toFixed(1)+'%';
console.log(`\n=== THE CORPUS — ${RUNS} runs x ${TURNS} turns, ${N} lines, ${ranked.length} distinct ===\n`);
console.log('--- THE TWO LINES THAT WERE 22% OF EVERYTHING ---');
const bottom=has('sounder has nothing more to say')+has('keel is in silt')+has('return comes back soft')+has('reads its own mud')+has('silt under the silt');
console.log(`  "you are on the bottom", any wording   BEFORE 11.2%   NOW ${pc(bottom)}`);
console.log(`  the exact old sentence alone           BEFORE 11.2%   NOW ${pc(has('sounder has nothing more to say'))}`);
console.log(`  "The sounder reads N m under the keel" BEFORE 11.0%   NOW ${pc(has('m under the keel'))}`);
console.log('\n--- THE AMBIENT ENGINE (was 24 sentences, 34% of the game) ---');
console.log(`  "The ping returns only stone."         BEFORE  6.2%   NOW ${pc(has('ping returns only stone'))}`);
console.log(`  "The water here is slack."             BEFORE  6.9%   NOW ${pc(has('water here is slack'))}`);
console.log(`  "more hole than rock"                  BEFORE  5.9%   NOW ${pc(has('more hole than rock'))}`);
console.log('\n--- CONTRADICTIONS ---');
const unsound=lines.filter(l=>l.t.includes('nothing you can sound')).length;
const noWall=lines.filter(l=>l.t.includes('in any direction worth mentioning')).length;
console.log(`  "nothing you can sound" then sounds it  BEFORE 82.5%  NOW ${unsound} occurrences of the clause at all`);
console.log(`  "no wall in any direction" then 6 exits BEFORE  100%  NOW ${noWall} occurrences of the clause at all`);
console.log('\n--- VOICE RULES ---');
console.log(`  semicolons in prose                     BEFORE 2.0% of output   NOW ${pc(lines.filter(l=>/[a-z]; [a-z]/.test(l.t)).length)}`);
console.log(`  exclamation marks                       BEFORE 2 lines          NOW ${lines.filter(l=>l.t.includes('!')).length} firings`);
console.log('\n--- NOVELTY ---');
console.log(`  distinct / total                        BEFORE 57%    NOW ${(100*ranked.length/N).toFixed(0)}%`);
console.log(`  top 20 lines are                        BEFORE 40.3%  NOW ${pc(ranked.slice(0,20).reduce((s,x)=>s+x[1],0))} of all output`);
console.log('\n  most repeated now:');
ranked.slice(0,6).forEach(([t,n])=>console.log(`    ${pc(n).padStart(6)}  ${t.slice(0,88)}`));
console.log('');
