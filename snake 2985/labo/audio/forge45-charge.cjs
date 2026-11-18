'use strict';
const assert=require('node:assert/strict');
const {performance}=require('node:perf_hooks');
const {Context,run,sequence,bed}=require('./test-priorites.cjs');
const mix=require('./priorites.js'),rows=require('./pouls.json');
const percentile=(a,p)=>a.slice().sort((x,y)=>x-y)[Math.round((a.length-1)*p)];
const db=a=>20*Math.log10(a);
const results=[];
for(const row of rows){
  const year=row.year,music=bed(row.track.replace('.mp3',''),36,row.rate),deltas=[];
  let admitted=0,peak=0,voices=0;
  for(const seed of [72631,78782,84933,91084]){
    const events=sequence(seed);
    const previous=events.map(e=>e.type==='forgeShot'?{...e,mod:undefined}:e);
    const old=run(previous,'priority',music,{year,fxGain:.32*.72});
    const fresh=run(events,'priority',music,{year,fxGain:.32*.72});
    for(const cue of ['boss','plane']){
      assert.equal(fresh.score[cue].length,fresh.sent[cue]);assert.equal(old.score[cue].length,fresh.sent[cue]);
      fresh.score[cue].forEach((score,i)=>deltas.push(score-old.score[cue][i]));
      admitted+=fresh.sent[cue];
    }
    assert.equal(fresh.voices,old.voices);assert.equal(fresh.clip,0);
    peak=Math.max(peak,fresh.peak);voices=Math.max(voices,fresh.voices);
  }
  const costs={};
  for(const group of ['historical','recipe']){
    const cold=[],warm=[];let maxBytes=0;
    for(let repeat=0;repeat<6;repeat++){
      const c=new Context();c.sampleRate=48000;
      const m=mix.create(c,{}, {year}), first=new Set();
      for(let pass=0;pass<2;pass++) for(const core of ['orbit','prism','well'])
        for(const mod of ['echo','chain','blast']){
          const e={type:'forgeShot',core};if(group==='recipe')e.mod=mod;
          c.currentTime+=1;
          const begin=performance.now();assert(m.play(e));const cost=performance.now()-begin;
          const buffer=c.sources.at(-1).buffer;
          if(repeat>0)(first.has(buffer)?warm:cold).push(cost);
          first.add(buffer);
        }
      maxBytes=Math.max(maxBytes,[...first].reduce((n,b)=>n+b.getChannelData(0).byteLength*2,0));
    }
    costs[group]={coldMedianMs:+percentile(cold,.5).toFixed(3),coldP95Ms:+percentile(cold,.95).toFixed(3),
      cachedP95Ms:+percentile(warm,.95).toFixed(3),bufferBytes:maxBytes};
  }
  results.push({year,alerts:admitted,voices,peakDb:+db(peak).toFixed(2),
    medianAlertDeltaDb:+percentile(deltas,.5).toFixed(3),worstAlertDeltaDb:+Math.min(...deltas).toFixed(3),costs});
}
console.log(JSON.stringify(results,null,2));
