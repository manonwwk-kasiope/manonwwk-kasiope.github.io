/* G13 t5 — redimensionnement : un seul minuteur, une seule réallocation.
   Spec : 60 événements resize en 1 s → mutations de l'attribut width du canevas ≤ 2 (60 avant) ;
   setViewportSize 1920×1080 → 1000×700 → 1920×1080 : S.view cohérent et 0 pageerror.
   L'observateur de mutations compte les ÉCRITURES de l'attribut, pas les changements de valeur :
   réécrire la même largeur réalloue le tampon et efface l'image, c'est ce qu'on traque. */
import { launchDesktop, startGame, save, finish, deadline, sleep } from '../lib.mjs';
deadline(120, 'G13-t5');

const ctx = await launchDesktop(1920, 1080, {});
let r = {};
try {
  await startGame(ctx, { seed: 2030 });
  await sleep(600);
  await ctx.page.evaluate(() => {
    window.__MUT = 0;
    const cv = document.getElementById('game');
    new MutationObserver(ms => { for (const m of ms) if (m.attributeName === 'width') window.__MUT++; })
      .observe(cv, { attributes: true, attributeFilter: ['width', 'height'] });
  });
  // 60 événements resize en une seconde, sans changer la taille de la fenêtre
  await ctx.page.evaluate(async () => {
    for (let i = 0; i < 60; i++) { window.dispatchEvent(new Event('resize')); await new Promise(r => setTimeout(r, 16)); }
  });
  await sleep(1200);
  r.mut60 = await ctx.page.evaluate(() => window.__MUT);
  // aller-retour de taille de fenêtre : la vue doit rester cohérente
  const lire = () => ctx.page.evaluate(() => {
    const S = window.__S, cv = document.getElementById('game');
    return { vw: +S.view.w.toFixed(1), vh: +S.view.h.toFixed(1), cw: cv.width, ch: cv.height,
      sw: cv.style.width, sh: cv.style.height, iw: window.innerWidth, ih: window.innerHeight, px: S.pxEff };
  });
  r.a = await lire();
  await ctx.page.setViewportSize({ width: 1000, height: 700 }); await sleep(900);
  r.b = await lire();
  await ctx.page.setViewportSize({ width: 1920, height: 1080 }); await sleep(900);
  r.c = await lire();
  r.pageErrors = ctx.pageErrors.length;
  r.err = await ctx.page.evaluate(() => window.__ERR.count);
} finally { await ctx.close(); }

const coherent = o => o.sw === o.iw + 'px' && o.sh === o.ih + 'px'
  && Math.abs(o.cw - Math.round(o.iw * Math.min(1, o.px))) <= 1
  && o.vw > 900 && o.vw < 1700 && o.vh > 300;
r.coherent = { a: coherent(r.a), b: coherent(r.b), c: coherent(r.c) };
const pass = r.mut60 <= 2 && r.coherent.a && r.coherent.b && r.coherent.c && r.pageErrors === 0 && r.err === 0;
save('G13-t5-resize.json', { test: 'G13-t5', pass, measured: r });
finish('G13-t5', { pass, measured: r, threshold: '60 resize en 1 s → ≤ 2 mutations de width ; S.view cohérent après 1920×1080 → 1000×700 → 1920×1080 ; 0 pageerror' });
