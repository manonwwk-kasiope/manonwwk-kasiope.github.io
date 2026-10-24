/* G12 T5 — démarrage sans intro : sur 6 rechargements, audio.playing().i n'est
   pas toujours 0, et quand i = 0 la lecture commence à t ≥ 18 s. */
import { launchDesktop, startGame, sleep, save, isMain, finish, deadline } from '../lib.mjs';
const THRESH = "sur 6 rechargements : au moins une piste ≠ 0 ; playing().t ≥ 18 s quand i = 0";
export async function run() {
  const m = { runs: [] };
  /* Six RECHARGEMENTS de la meme page : c'est ce que fait la joueuse. Six
     navigateurs neufs ne rechargent rien — ils repartent d'un stockage vide,
     et ne peuvent donc pas voir une alternance qui s'y inscrit. */
  const ctx = await launchDesktop();
  try {
    for (let k = 0; k < 6; k++) {
      if (k) { await ctx.page.reload({ waitUntil: 'load' }); await sleep(600); }
      await startGame(ctx);
      let p = null;
      for (let j = 0; j < 22 && !p; j++) { await sleep(150); p = await ctx.page.evaluate(() => { const q = window.__M.audio.playing(); return q ? { i: q.i, t: +q.t.toFixed(2) } : null; }); }
      m.runs.push(p);
    }
  } finally { await ctx.close(); }
  const vus = m.runs.filter(Boolean);
  m.pistes = vus.map(r => r.i);
  m.t0 = vus.filter(r => r.i === 0).map(r => r.t);
  const checks = {
    mesure: vus.length === 6,
    pasToujours0: vus.some(r => r.i !== 0),
    entree18s: m.t0.every(t => t >= 18)
  };
  m.checks = checks;
  save('G12-av-demarrage.json', m);
  const pass = Object.values(checks).every(Boolean);
  return { pass, measured: m, threshold: THRESH, code: pass ? 0 : 1 };
}
if (isMain(import.meta.url)) { deadline(200, 'G12-av-demarrage'); finish('G12-av-demarrage', await run()); }
