'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const dir=__dirname,smoke=process.argv.includes('--smoke'),folder=path.join(dir,smoke?'smoke':'releves');
const read=name=>JSON.parse(fs.readFileSync(path.join(folder,name),'utf8'));
const lines=name=>fs.readFileSync(path.join(folder,name),'utf8').trim().split('\n').map(JSON.parse);
const env=read('session.json'),blocks=lines('blocs.jsonl'),gc=lines('gc.jsonl');
const hist=(rows,field)=>{const map={};for(const r of rows)for(const [k,n] of Object.entries(r[field]))map[k]=(map[k]||0)+n;return map;};
function quantile(h,f){
 const keys=Object.keys(h).map(Number).sort((a,b)=>a-b),sum=Object.values(h).reduce((a,b)=>a+b,0);
 let s=0;for(const key of keys){s+=h[key];if(s>Math.floor(sum*f))return key/10;}return keys.at(-1)/10;
}
const sum=(arr,fn)=>arr.reduce((a,v)=>a+fn(v),0);
function combine(rows){
 const j=hist(rows,'histJS'),r=hist(rows,'histRAF');
 const frames=sum(rows,v=>v.frames),rafSecs=sum(Object.entries(r),([ms,n])=>Number(ms)*n)*.0001;
 const counts={};for(const row of rows)for(const [key,n] of Object.entries(row.counts))counts[key]=(counts[key]||0)+n;
 const qt=h=>({p50:quantile(h,.5),p95:quantile(h,.95),p99:quantile(h,.99),max:Math.max(...Object.keys(h).map(Number))/10});
 return {frames,rafHz:sum(Object.values(r),v=>v)/rafSecs,js:{...qt(j),over25:sum(rows,v=>v.js.over25),over50:sum(rows,v=>v.js.over50)},rAF:{...qt(r),over25:sum(rows,v=>v.rAF.over25),over50:sum(rows,v=>v.rAF.over50)},readBytesPerFrame:counts.bytesRead/frames,copiesPerFrame:counts.imageCopies/frames,copySourcePixelsPerFrame:counts.copySourcePixels/frames,counts};
}
const years=[1976,1985,1995,2185,2985],modes=['dpr2','logique'];
const rows=blocks.flatMap(b=>b.rows.map(r=>({...r,year:b.year,mode:b.mode,pass:b.pass,width:b.size.width})));
const byYear=[],byPhase=[],byViewport=[],paired=[],first=[];
for(const year of years){
 for(const mode of modes){
  const rr=rows.filter(r=>r.year===year&&r.mode===mode),bb=blocks.filter(b=>b.year===year&&b.mode===mode);
  byYear.push({year,mode,...combine(rr)});
  const warm=bb.find(b=>b.pass===2);
  first.push({year,mode,firstVisit:bb[0].first,afterTenChanges:warm?.first||null});
  for(const phase of ['sol','plan','vol','boss'])for(const reduced of [false,true]){
    byPhase.push({year,mode,phase,reduced,...combine(rr.filter(v=>v.phase===phase&&v.reduced===reduced))});
  }
  for(const width of [...new Set(rr.map(v=>v.width))])byViewport.push({year,mode,width,...combine(rr.filter(v=>v.width===width))});
 }
 for(const pass of [...new Set(blocks.map(v=>v.pass))]){
  const d=combine(rows.filter(r=>r.year===year&&r.mode==='dpr2'&&r.pass===pass)),l=combine(rows.filter(r=>r.year===year&&r.mode==='logique'&&r.pass===pass));
  paired.push({pass,year,medianDelta:d.js.p50-l.js.p50,p95Delta:d.js.p95-l.js.p95,logicalToBaseline:l.js.p50/d.js.p50,missesDelta:d.rAF.over25-l.rAF.over25});
 }
}
const metadata={elapsedSeconds:(Date.parse(env.end)-Date.parse(env.start))/1000,renderedSeconds:sum(blocks,v=>v.elapsedMs)/1000,frames:sum(blocks,v=>v.totalFrames),blocks:blocks.length,errors:env.errors,audioAttempts:sum(blocks,v=>v.audioAttempts),gc,peakHeap:Math.max(...blocks.map(v=>v.heap.usedSize)),peakBacking:Math.max(...blocks.map(v=>v.heap.backingStorageSize)),peakDocuments:Math.max(...blocks.map(v=>v.mem.documents)),peakNodes:Math.max(...blocks.map(v=>v.mem.nodes)),peakListeners:Math.max(...blocks.map(v=>v.mem.jsEventListeners))};
const encounters={};for(const r of rows)for(const [k,n] of Object.entries(r.encounter))encounters[k]=(encounters[k]||0)+n;
const overall=Object.fromEntries(modes.map(m=>[m,combine(rows.filter(r=>r.mode===m))]));
assert.equal(blocks.length,smoke?10:40);assert(metadata.frames>0&&metadata.audioAttempts===0&&!env.errors.length);
assert(encounters.bossFrames&&encounters.flightFrames&&encounters.shiftFrames&&encounters.warningFrames);
if(!smoke)assert(metadata.renderedSeconds>=960&&gc.length===4);
const summary={metadata,encounters,overall,byYear,byPhase,byViewport,paired,first};
fs.writeFileSync(path.join(folder,'synthese.json'),JSON.stringify(summary,null,2));
console.log(metadata,encounters,byYear.map(v=>({year:v.year,mode:v.mode,p50:v.js.p50,p95:v.js.p95,p99:v.js.p99,Hz:v.rafHz})));
