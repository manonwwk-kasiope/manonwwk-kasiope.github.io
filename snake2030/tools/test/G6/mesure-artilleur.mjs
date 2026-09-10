/* L'artilleur a-t-il encore une substance ? Le seuil « coups de balle ≤ 25 % » peut être atteint de deux
   façons : en rendant les balles évitables, ou en supprimant l'artilleur du jeu. Ce script mesure la
   différence — artilleurs apparus, salves tirées, balles arrivées sur le serpent, temps passé en vue —
   sur le build courant et sur le build de référence tiré de git, dans la même fenêtre de temps. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { launchSim, runOne } from '../simlib.mjs';

const REPO = '/home/user/manonwwk-kasiope.github.io';
const RUNS = +(process.env.RUNS || 8);
const CUR = 'http://127.0.0.1:8112/snake2030/index.html';
const REF_FILE = path.join(REPO, 'snake2030', 'index-art.html');
fs.writeFileSync(REF_FILE, execFileSync('git', ['-C', REPO, 'show', 'HEAD:snake2030/index.html'],
  { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
const REF = CUR.replace('index.html', 'index-art.html');

const PROBE = `(function(){
  if (window.__AR) return;
  const S = window.__S, M = window.__M;
  const AR = window.__AR = { shots:0, hits:0, spawns:{}, viewFrames:0, shooterFrames:0, frames:0 };
  AR.reset = function(){ AR.shots=0; AR.hits=0; AR.spawns={}; AR.viewFrames=0; AR.shooterFrames=0; AR.frames=0; AR.seen=new Set(); };
  AR.reset();
  const push = S.ebullets.push.bind(S.ebullets);
  S.ebullets.push = function(o){ if (S.phase==='play') AR.shots++; return push(o); };
  const burst = M.fx.burst;
  /* G8 a changé la gerbe de blessure de (22 particules) à (12, puissance 210) :
     la signature n === 22 ne correspondait plus à rien et le compteur de coups
     rendait 0 sur LES DEUX builds — défaut de l'instrument, pas du jeu. */
  M.fx.burst = function(x,y,color,n){ if (color==='#ff2e63' && (n===12 || n===22) && S.phase==='play'){
      for (const b of S.ebullets) if (Math.abs(b.x-x)<2 && Math.abs(b.y-y)<2){ AR.hits++; break; } }
    return burst.apply(M.fx, arguments); };
  function inView(x,y){ const P=M.phases, V=(P&&P.visibleExtent)?P.visibleExtent():null;
    if (V) return x>V.x0 && x<V.x1 && y>V.y0 && y<V.y1;
    return Math.abs(x-S.cam.x)<S.view.w*0.5 && Math.abs(y-S.cam.y)<S.view.h*0.5; }
  (function tick(){ requestAnimationFrame(tick);
    if (S.phase!=='play') return; AR.frames++;
    let nsh=0, nv=0;
    for (const e of S.enemies){
      if (!AR.seen.has(e.id)){ AR.seen.add(e.id); AR.spawns[e.type]=(AR.spawns[e.type]||0)+1; }
      if (e.type==='shooter'){ nsh++; if (inView(e.x,e.y)) nv++; }
    }
    AR.shooterFrames+=nsh; AR.viewFrames+=nv;
  })();
})();`;

async function mesure(url) {
  const ctx = await launchSim('desk1440', { url });
  const acc = { shots:0, hits:0, spawns:{}, shooterFrames:0, viewFrames:0, frames:0, secs:0, kills:0, level:0 };
  try {
    await ctx.page.evaluate(PROBE);
    for (let i = 0; i < RUNS; i++) {
      await ctx.page.evaluate(() => window.__AR.reset());
      const r = await runOne(ctx.page, { seed: 6000 + i, maxT: 240000, diff: 1 });
      const a = await ctx.page.evaluate(() => {
        const A = window.__AR; return { shots:A.shots, hits:A.hits, spawns:A.spawns,
          shooterFrames:A.shooterFrames, viewFrames:A.viewFrames, frames:A.frames };
      });
      acc.shots += a.shots; acc.hits += a.hits; acc.frames += a.frames;
      acc.shooterFrames += a.shooterFrames; acc.viewFrames += a.viewFrames;
      for (const k in a.spawns) acc.spawns[k] = (acc.spawns[k]||0) + a.spawns[k];
      acc.secs += r.t/1000; acc.kills += r.kills; acc.level = Math.max(acc.level, r.level);
    }
  } finally { await ctx.close(); }
  const g = RUNS;
  return { parties:g, secondes:+(acc.secs).toFixed(0), artilleursParPartie:+((acc.spawns.shooter||0)/g).toFixed(2),
    ennemisParPartie:+(Object.values(acc.spawns).reduce((a,b)=>a+b,0)/g).toFixed(1),
    sallesParPartie:+(acc.shots/g).toFixed(1), toucheesParPartie:+(acc.hits/g).toFixed(2),
    tauxTouche:+(acc.hits/Math.max(1,acc.shots)*100).toFixed(2),
    artilleurImagesParPartie:+(acc.shooterFrames/g).toFixed(0),
    partEnVuePct:+(acc.viewFrames/Math.max(1,acc.shooterFrames)*100).toFixed(1),
    killsParPartie:+(acc.kills/g).toFixed(1), niveauMax:acc.level };
}

const out = { courant: await mesure(CUR), reference: await mesure(REF) };
fs.unlinkSync(REF_FILE);
console.log(JSON.stringify(out, null, 1));
