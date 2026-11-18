// Mouvement ponctuel du plateau. La durée se compte à partir de la grille de noires du MP3.
(() => {
  'use strict';
  const weights={1976:.44,1985:.62,1995:.75,2185:.90,2985:1};
  const prises=new WeakMap();
  const smooth=x=>x*x*(3-2*x);
  function cue(s,e,beat){
    const strength={boss:1,flightStart:.7,novaOverload:.85,surfStart:.54}[e.type];
    if(!strength||!beat||!Number.isFinite(beat.bpm)||beat.bpm<=0)return false;
    const prev=prises.get(s),now=s.elapsed;
    if(prev&&now<prev.until+4.5)return false;
    const period=Math.max(.28,Math.min(.9,60/beat.bpm));
    const phase=Math.max(0,Math.min(1,beat.phase));
    let crest=(1-phase)*period;
    if(crest<.21)crest+=period;
    const attack=s.boss?.attack;
    // Le plateau revient à son assiette avant l'impact d'une salve annoncée.
    if(attack?.phase==='active')return false;
    const available=attack?.phase==='warning'?attack.remaining-.12:Infinity;
    const fall=Math.min(period*1.55,available-crest);
    if(fall<.22)return false;
    const sign=s.snake[0].x<s.width/2?-1:1;
    prises.set(s,{start:now,until:now+crest+fall,crest,fall,sign,power:strength*(weights[s.year]||.6)});
    return true;
  }
  function offsets(s,t,reduced){
    const a=prises.get(s);
    if(!a||reduced||t<a.start||t>=a.until)return null;
    const dt=t-a.start;
    const curve=dt<a.crest?smooth(dt/a.crest):1-smooth(Math.min(1,(dt-a.crest)/a.fall));
    const n=a.power*curve;
    return {bank:a.sign*.14*n,yaw:a.sign*.10*n,tilt:.11*n};
  }
  window.SnakeCameraMusicale={cue,offsets};
})();
