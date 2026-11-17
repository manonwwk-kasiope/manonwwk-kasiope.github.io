(function(root){
  'use strict';
  const clamp=(v)=>Math.max(0,Math.min(1,v));
  const force={nova:.8,knotClosed:.95,bossVolley:.85,bossDefeated:1,flightStart:.45,flightEnd:.35,planeShift:.34,bossHit:.22,kill:.14};
  function event(s,e) {
    const weight=force[e.type];
    if(!weight)return;
    const old=s.impact;
    const current=old?old.power*Math.exp(-8*Math.max(0,s.elapsed-old.start)):0;
    s.impact={start:s.elapsed,power:Math.min(1,weight+current*.35)};
  }
  function sample(s,t,reduce) {
    if(reduce)return {x:0,y:0,roll:0,beat:0,tear:0};
    const pressure=clamp(s.boss?1:s.nearBoss||0);
    const kick=s.impact?s.impact.power*Math.exp(-8*Math.max(0,t-s.impact.start)):0;
    const beat=clamp(s.musicPulse||0),stress=pressure*beat;
    // Déplacement logique indépendant du DPR ; le HUD garde sa position.
    return {x:Math.sin(t*70)*2.35*kick,y:Math.cos(t*63)*1.55*kick,
      roll:.0036*kick*Math.sin(t*53)+.0018*stress,
      beat,tear:kick>.4?clamp((kick-.4)*1.7):.28*stress};
  }
  function skyline(c,m,t,year) {
    if(m.tear<.18)return;
    const y=53+Math.floor((Math.sin(Math.floor(t*10)*32)+1)*16),direction=Math.sin(t*78)>=0?1:-1;
    // Deux bandes du ciel seulement : aucun projectile, tête ou texte n'est déplacé.
    c.save();c.globalAlpha=m.tear*.34;c.fillStyle=year<2000?'#b1edc6':'#f1a6b2';
    c.fillRect(66+direction*4,y,81,1.6);c.fillRect(705-direction*7,y+5,132,1.2);c.restore();
  }
  root.SnakeImpact={event,sample,skyline};
})(typeof window!=='undefined'?window:globalThis);
