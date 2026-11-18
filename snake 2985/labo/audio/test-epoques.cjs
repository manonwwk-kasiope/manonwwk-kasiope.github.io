'use strict';
const fs=require('node:fs'),path=require('node:path'), assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {create:clock}=require('./horloge.js'),mix=require('./priorites.js');
const {bed,run,sequence,Context,percentile}=require('./test-priorites.cjs');
const rows=require('./pouls.json');
const summary=[], preview=[],dry=[];
for(const row of rows) {
  const c=clock(rows,row.year), media=row.bars[2]+row.attackOffset-c.visualLead*row.rate;
  const first=c.sample({now:13,mediaTime:media});
  assert(first.phase<1e-6 && first.pulse>.999);
  const silent=c.sample({now:13.1,audible:false});
  assert.equal(silent.source,'clock');
  assert(Math.abs(silent.mediaTime-first.mediaTime-.1*row.rate)<1e-6);
  const freeze=c.sample({now:14,playing:false,audible:false});
  assert.equal(silent.mediaTime,freeze.mediaTime);
  assert.equal(c.sample({now:140,playing:true,audible:false}).mediaTime,freeze.mediaTime);
  const resumed=c.sample({now:140.1,mediaTime:media});
  assert.equal(resumed.source,'media');
  const looped=c.sample({now:140.2,mediaTime:row.loopEnd+.04});
  assert(Math.abs(looped.mediaTime-row.loopStart-.04)<1e-6);
  const ctx=new Context(), audio=mix.create(ctx,{}, {year:row.year});
  audio.play({type:'bossAttack'}); const b=ctx.sources[0].buffer;
  const waveform=b.getChannelData(0);
  dry.push({year:row.year,waveform});
  for(const year of mix.years) audio.setYear(year);
  assert.throws(()=>audio.setYear(2010));audio.dispose();

  const windows=[0,.27,.54,.8].map(f=>row.loopStart+f*(row.loopEnd-row.loopStart-6*row.rate));
  const beds=windows.map(start=>bed(row.track.replace('.mp3',''),start,row.rate));
  const scores={}, gain=.32*.72; // Gain réellement réglé par mixer() sur sortieFX.
  for(const mode of ['raw','priority']) {
    const boss=[],plane=[];let peak=0,clip=0,voices=0;
    for(let i=0;i<16;i++) {
      const seed=72631+6151*i;
      const events=sequence(seed);
      for(let at=.15,n=0;at<5.7;at+=.42,n++) events.push(n%5===4?{time:at,type:'nova'}:
        {time:at,type:'shot',kind:n%2?'arc':'rail'});
      events.sort((a,b)=>a.time-b.time);
      const r=run(events,mode,beds[i%4],{year:row.year,fxGain:gain,pcm:i===0});
      boss.push(...r.score.boss);plane.push(...r.score.plane);
      peak=Math.max(peak,r.peak);clip+=r.clip;voices=Math.max(voices,r.voices);
      if(i===0 && mode==='priority') {
        // Même scénario monté pour chaque époque : silences et fondus aux limites.
        const clip=r.audio.slice(0,36000);
        for(let j=0;j<clip.length;j++) clip[j]*=.55*Math.min(1,j/360,(clip.length-1-j)/360);
        preview.push(Buffer.from(clip.buffer));
      }
    }
    scores[mode]={bossPlayed:boss.length,planePlayed:plane.length,bossMedianDb:percentile(boss,.5),
      planeMedianDb:percentile(plane,.5),peakDbfs:20*Math.log10(peak),clipped:clip,maxVoices:voices};
  }
  assert.equal(scores.priority.bossPlayed,128);assert.equal(scores.priority.planePlayed,64);
  assert.equal(scores.priority.clipped,0);
  for(const key of ['bossMedianDb','planeMedianDb']) assert(scores.priority[key]>scores.raw[key]);
  summary.push({year:row.year,windows,scores});
}
const differences=[];
for(let i=0;i<dry.length;i++) for(let j=i+1;j<dry.length;j++) {
  let aa=0,bb=0,ab=0;
  for(let k=0;k<dry[i].waveform.length;k++) {
    const a=dry[i].waveform[k],b=dry[j].waveform[k];
    aa+=a*a;bb+=b*b;ab+=a*b;
  }
  const cosine=ab/Math.sqrt(aa*bb);
  differences.push({years:[dry[i].year,dry[j].year],cosine});
  assert(cosine<.999);
}
fs.writeFileSync(path.join(__dirname,'mesures-epoques.json'),JSON.stringify({rate:12000,seeds:Array.from({length:16},(_,i)=>72631+i*6151),summary,differences},null,2)+'\n');
execFileSync('ffmpeg',['-v','error','-nostdin','-y','-f','f32le','-ar','12000','-ac','1','-i','pipe:0',
  '-c:a','pcm_s16le',path.join(__dirname,'cinq-epoques-en-rafale.wav')],{input:Buffer.concat(preview)});
console.log(summary.map(x=>[x.year,x.scores.priority]));
