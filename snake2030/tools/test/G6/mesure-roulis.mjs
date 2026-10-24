/* L'étendue visible ignore le roulis ; la projection écran, non. Si une apparition tombe hors de
   l'étendue mais DANS le cadre 0..1 de toScreen, elle est visible alors que la sonde la dit hors champ.
   Ce script compte ces cas sur des parties réelles, par image de première apparition. */
import { launchSim, runOne, PROFILES } from '../simlib.mjs';

/* Fenêtres ajoutées : la règle d'apparition impose un rayon >= max(largeur, hauteur)/2 + 150 u, alors que
   le point le plus éloigné réellement visible est le COIN, à sqrt(demi-largeur^2 + demi-hauteur^2). Le
   rayon ne domine le coin que si la fenêtre est assez allongée. Les trois profils testés le sont tous.
   On ajoute donc une demi-fenêtre haute et une fenêtre carrée, que G2 a rendues jouables. */
PROFILES.demiHaute = { viewport: { width: 960, height: 1040 }, deviceScaleFactor: 1, hasTouch: false, isMobile: false };
PROFILES.carre     = { viewport: { width: 1000, height: 1000 }, deviceScaleFactor: 1, hasTouch: false, isMobile: false };

const RUNS = +(process.env.RUNS || 6);
const URL = 'http://127.0.0.1:8112/snake2030/index.html';

const PROBE = `(function(){
  if (window.__RL) return;
  const S = window.__S, M = window.__M;
  const RL = window.__RL = { n:0, horsEtendue:0, dansCadre:0, cas:[], parKind:{} };
  RL.reset = function(){ RL.n=0; RL.horsEtendue=0; RL.dansCadre=0; RL.cas=[]; RL.parKind={}; RL.seen=new Set(); };
  RL.reset();
  function extentIn(x,y,m){ const V=M.phases.visibleExtent(); m=m||0;
    return x>V.x0-m && x<V.x1+m && y>V.y0-m && y<V.y1+m; }
  function screenIn(x,y,m){ const p=M.phases.toScreen(x,y,{});
    if(!p||!isFinite(p.x)||!isFinite(p.y)) return null;
    const mx = m/Math.max(1,S.view.w), my = m/Math.max(1,S.view.h);
    return p.x>-mx && p.x<1+mx && p.y>-my && p.y<1+my; }
  (function tick(){ requestAnimationFrame(tick);
    if (S.phase!=='play') return;
    for (const e of S.enemies){
      if (RL.seen.has(e.id)) continue; RL.seen.add(e.id);
      RL.n++;
      const kind = (M.phases.kind ? M.phases.kind() : '?');
      RL.parKind[kind] = (RL.parKind[kind]||0)+1;
      const ext = extentIn(e.x,e.y,40), scr = screenIn(e.x,e.y,0);
      if (!ext) { RL.horsEtendue++; if (scr === true) { RL.dansCadre++;
        if (RL.cas.length<12) RL.cas.push({type:e.type, kind, x:Math.round(e.x), y:Math.round(e.y),
          cam:[Math.round(S.cam.x),Math.round(S.cam.y)], t:Math.round(S.t)}); } }
    }
  })();
})();`;

const PROFILS = (process.env.PROFILS || 'desk1440,demiHaute,carre').split(',');
const total = {};
for (const prof of PROFILS) {
const ctx = await launchSim(prof, { url: URL });
const acc = { n:0, horsEtendue:0, dansCadre:0, cas:[], parKind:{} };
try {
  await ctx.page.evaluate(PROBE);
  for (let i=0;i<RUNS;i++){
    await ctx.page.evaluate(() => window.__RL.reset());
    await runOne(ctx.page, { seed: 6000+i, maxT: 180000, diff: 1 });
    const a = await ctx.page.evaluate(() => { const R=window.__RL;
      return { n:R.n, horsEtendue:R.horsEtendue, dansCadre:R.dansCadre, cas:R.cas, parKind:R.parKind }; });
    acc.n+=a.n; acc.horsEtendue+=a.horsEtendue; acc.dansCadre+=a.dansCadre;
    acc.cas = acc.cas.concat(a.cas).slice(0,12);
    for(const k in a.parKind) acc.parKind[k]=(acc.parKind[k]||0)+a.parKind[k];
  }
} finally { await ctx.close(); }
total[prof] = { parties:RUNS, apparitions:acc.n, horsEtendue:acc.horsEtendue,
  visiblesMalgreTout:acc.dansCadre,
  pct:+(acc.dansCadre/Math.max(1,acc.n)*100).toFixed(3), parEtape:acc.parKind, exemples:acc.cas };
console.log(prof, JSON.stringify(total[prof]).slice(0,300));
}
console.log(JSON.stringify(total, null, 1));
