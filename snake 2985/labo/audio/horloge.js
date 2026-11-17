/* Grille de noires interpolée entre les repères de mesure du fichier décodé. */
(() => {
  'use strict';
  function create(rows,year) {
    const info=rows.find(row=>row.year===year);
    if (!info) throw new RangeError('Époque inconnue');
    const {loopStart:start,loopEnd:end,rate,attackOffset,bars}=info;
    const wrap=x=>start+((x-start)%(end-start)+(end-start))%(end-start);
    let position=start,lastWall=null,wasPlaying=true;
    function sample({now,mediaTime,playing=true,audible=true,playbackRate=rate}) {
      if (!Number.isFinite(now)) throw new TypeError('Temps monotone en secondes requis');
      const elapsed=lastWall===null?0:Math.max(0,now-lastWall);
      lastWall=now;
      const source=audible && Number.isFinite(mediaTime)?'media':'clock';
      if (source==='media') position=wrap(mediaTime);
      else if (playing && wasPlaying) position=wrap(position+elapsed*playbackRate);
      wasPlaying=playing;
      const time=wrap(position-attackOffset);
      let b=bars.findIndex(x=>x>time+1e-8)-1;
      if (b<0) b=bars.length-2;
      const span=bars[b+1]-bars[b];
      const q=4*(time-bars[b])/span;
      const quarter=Math.abs(q-Math.round(q))<1e-7?Math.round(q):q;
      const phase=quarter-Math.floor(quarter);
      return {source,mediaTime:position,bar:b,beat:Math.floor(quarter),phase,
        pulse:Math.exp(-phase*7),playing,bpm:240*playbackRate/span};
    }
    return {sample,track:info.track,loopStart:start,loopEnd:end,rate};
  }
  const api={create};
  if(typeof module==='object' && module.exports) module.exports=api;
  else globalThis.SnakePulse=api;
})();
