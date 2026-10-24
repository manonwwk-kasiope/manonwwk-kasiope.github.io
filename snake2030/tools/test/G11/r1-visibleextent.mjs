/* G11 — réserve héritée : visibleExtent() et le ROULIS (QUESTION OUVERTE D).
   visibleExtent() publiait un rectangle DROIT alors que toScreen() tient compte
   du roulis. L'erreur va dans les deux sens ; le correctif prend la boîte
   englobante du rectangle tourné, ce qui SUPPRIME le cas grave (un point visible
   à l'écran déclaré hors champ : _lvPoint y faisait tirer, les annonceurs n'y
   armaient pas, ui.offscreen l'y disait dehors) et AGGRAVE le cas bénin
   (l'inclusion excessive : on arme et on dessine un peu trop tôt).
   CHOIX ÉCRIT ET MESURÉ : on accepte l'inclusion excessive, on refuse
   l'exclusion d'un point visible. Protocole de la spec : fenêtre 1000×1000,
   roulis non nul, 2 000 points, verdicts de visibleExtent et de toScreen relevés
   DANS LA MÊME IMAGE, désaccords comptés DANS LES DEUX SENS. */
import { launchDesktop, startGame, save, finish, deadline, sleep } from '../lib.mjs';
deadline(180, 'G11-r1-visibleextent');

const ctx = await launchDesktop(1000, 1000);
await startGame(ctx, { seed: 20301 });
const page = ctx.page;

async function releve(label) {
  return page.evaluate((label) => new Promise(res => {
    requestAnimationFrame(() => {
      const P = window.__M.phases, S = window.__S;
      const st = P.state();
      const V = P.visibleExtent();
      const cx = S.cam.x, cy = S.cam.y;
      const hw = Math.max(V.x1 - cx, cx - V.x0), hh = Math.max(V.y1 - cy, cy - V.y0);
      // graine déterministe : on n'utilise ni Math.random ni l'horloge
      let seed = 1234567;
      const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
      const N = 2000;
      let nVis = 0, nDecl = 0, visDeclareHors = 0, horsDeclareVis = 0;
      const out = { x: 0, y: 0 };
      for (let i = 0; i < N; i++) {
        const x = cx + (rnd() * 2 - 1) * hw * 1.35, y = cy + (rnd() * 2 - 1) * hh * 1.35;
        const decl = x >= V.x0 && x <= V.x1 && y >= V.y0 && y <= V.y1;
        P.toScreen(x, y, out);
        const vis = out.x >= 0 && out.x <= 1 && out.y >= 0 && out.y <= 1;
        if (vis) nVis++;
        if (decl) nDecl++;
        if (vis && !decl) visDeclareHors++;
        if (!vis && decl) horsDeclareVis++;
      }
      res({ label, rot: +st.rot.toFixed(4), rotEffectif: +P.rot().toFixed(4), persp: +st.perspDeg.toFixed(1),
        tilt: +st.tilt.toFixed(3), n: N, nVis, nDecl, visibleMaisDeclareHorsChamp: visDeclareHors,
        inclusionExcessive: horsDeclareVis, pctInclusionExcessive: +(100 * horsDeclareVis / N).toFixed(2),
        extent: { x0: +V.x0.toFixed(1), x1: +V.x1.toFixed(1), y0: +V.y0.toFixed(1), y1: +V.y1.toFixed(1) } });
    });
  }), label);
}

const releves = [];
// phase « ROULIS » du script d'ouverture : cam.rot converge vers 0,20 ; on
// échantillonne pendant la convergence pour obtenir plusieurs roulis distincts.
await page.evaluate(() => window.__M.phases.forcePhase(2));
for (const w of [90, 130, 200, 600]) { await sleep(w); releves.push(await releve('roulis+')); }
// roulis négatif : une secousse dans l'axe opposé (jolt.rot est borné à ±0,19)
await page.evaluate(() => { const P = window.__M.phases; for (let i = 0; i < 6; i++) P.jolt(2, Math.PI); });
releves.push(await releve('roulis-'));
await page.evaluate(() => window.__M.phases.forcePhase(3));      // bascule 30° + roulis -0,05
await sleep(900); releves.push(await releve('bascule'));
await sleep(900); releves.push(await releve('bascule2'));
await ctx.close();

const nonNuls = releves.filter(r => Math.abs(r.rotEffectif) > 0.02);
const pires = releves.filter(r => r.visibleMaisDeclareHorsChamp > 0);
const roulisDistincts = new Set(nonNuls.map(r => r.rotEffectif.toFixed(2))).size;
const pass = pires.length === 0 && roulisDistincts >= 4;
const r = {
  test: 'G11-r1-visibleextent', pass,
  seuil: '0 point visible à l’écran déclaré hors champ, sur au moins quatre roulis non nuls distincts ; l’inclusion excessive est l’erreur ACCEPTÉE et elle est chiffrée',
  measured: { fenetre: '1000x1000', roulisNonNulsDistincts: roulisDistincts, releves },
};
save('G11-r1-visibleextent.json', r);
finish(r.test, { pass, measured: r.measured, threshold: r.seuil });
