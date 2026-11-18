(() => {
  'use strict';
  const gain=.06,settle=4,windowMs=80,last=new WeakMap(),markers=new WeakMap();
  function nearest(year,beat){
    if(!beat?.playing||!Number.isFinite(beat.mediaTime))return null;
    const row=globalThis.SnakeNovaAccents?.find(r=>r.year===year);
    if(!row||!row.accents.length)return null;
    const period=row.hi-row.lo,position=row.lo+((beat.mediaTime-row.lo)%period+period)%period;
    let best=null;
    for(let i=0;i<row.accents.length;i++){
      let gap=row.accents[i]-position;
      if(gap>period/2)gap-=period;else if(gap< -period/2)gap+=period;
      const ms=gap/row.rate*1000;
      if(!best||Math.abs(ms)<Math.abs(best.ms))best={index:i,ms};
    }
    return best;
  }
  function cue(s,beat){
    if(!s||s.status!=='playing'||s.novaCharge<1)return 'off';
    const n=nearest(s.year,beat),previous=last.get(s);
    if(!n||previous&&s.elapsed-previous.at<settle)return 'off';
    if(Math.abs(n.ms)<=windowMs+1e-6)return 'hit';
    return n.ms>0&&n.ms<=320?'approach':'off';
  }
  function fire(s,beat,native){
    const qualifies=cue(s,beat)==='hit';
    if(!native(s))return false;
    if(qualifies&&s.status==='playing'&&Number.isFinite(s.elapsed)&&s.novaCharge>=0&&s.novaCharge<1){
      const refund=Math.min(gain,1-s.novaCharge);
      s.novaCharge+=refund;last.set(s,{at:s.elapsed});
      if(s.events.length>=96)s.events.shift();
      s.events.push({type:'novaSync',year:s.year,refund});
    }
    return true;
  }
  function paint(button,s,beat,reduced=false){
    let mark=markers.get(button);
    if(!mark){
      mark=button.ownerDocument.createElement('span');mark.className='nova-sync-cue';mark.setAttribute('aria-hidden','true');
      mark.textContent='♪';button.insertBefore(mark,button.lastElementChild);markers.set(button,mark);
    }
    const value=cue(s,beat),status=reduced&&value==='approach'?'off':value;
    if(mark.dataset.cue!==status)mark.dataset.cue=status;
    return status;
  }
  const api=Object.freeze({nearest,cue,fire,paint,gain,windowMs});
  if(typeof window!=='undefined')window.SnakeSynchroNova=api;
  if(typeof module!=='undefined')module.exports=api;
})();
