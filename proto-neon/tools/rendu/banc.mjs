/* tools/rendu/banc.mjs — les trois preuves du directeur du rendu, mesurées sur les PIXELS RENDUS.
   Usage : cd proto-neon && /opt/node22/bin/node tools/rendu/banc.mjs

   (a) blocs de px x px strictement uniformes, et zéro valeur intermédiaire sur un bord de sprite
   (b) sur dix captures, part des pixels appartenant à la table des seize — dans les trois régimes
   (c) coût d'une image à vide sur iPhone 13 paysage, et coût du seul post-traitement

   Tout est lu dans le canvas de SORTIE par getImageData : jamais l'état interne, jamais une intention.

   PROLOGUE. Le bundle livré avorte au chargement : src/05-art.js fait « N.art = … » au premier niveau,
   alors que « var N » est déclaré dans 90-boot.js, placé en DERNIER par build.mjs. N vaut donc
   undefined à cet instant, l'affectation jette, et plus rien ne s'exécute après — ni 10-gfx.js, ni
   20-crt.js, ni boot(). Ce banc reconstruit donc le même bundle en lui ajoutant une seule ligne au
   tout début, qui crée N avant tout le monde. Aucun fichier de src/ n'est modifié : c'est la mesure
   qui s'adapte, pas le code des autres. Lancer avec --tel-quel pour voir l'avortement d'origine. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const SRC = path.join(ROOT, 'src');
const TELQUEL = process.argv.includes('--tel-quel');

const PROLOGUE = `/* ===== prologue du banc (hors src/) ===== */\nvar N = (typeof window !== 'undefined') ? (window.__N || (window.__N = {})) : {};\n`;

const files = fs.readdirSync(SRC).filter(f => f.endsWith('.js')).sort();
const parts = files.map(f => `/* ===== ${f} ===== */\n` + fs.readFileSync(path.join(SRC, f), 'utf8'));
const body = (TELQUEL ? '' : PROLOGUE) + parts.join('\n');
const script = '"use strict";\n(function(){' + body + '\nboot();})();';
new vm.Script(script, { filename: 'banc.bundle.js' });

const tpl = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const head = tpl.slice(0, tpl.indexOf('<script>') + '<script>'.length);
const tail = tpl.slice(tpl.indexOf('</script>'));
fs.writeFileSync(path.join(HERE, 'essai.html'), head + script + tail);
const URL = 'http://127.0.0.1:8112/proto-neon/tools/rendu/essai.html';

const MIRE = fs.readFileSync(path.join(HERE, 'mire.js'), 'utf8');
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });

async function open(ctxOpts, { mire = true } = {}) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto(URL, { waitUntil: 'load' });
  if (mire) {
    await page.addScriptTag({ content: MIRE });
    await page.evaluate(() => { window.__MIRE.install(); });
  }
  await page.waitForTimeout(250);
  return { ctx, page, errs };
}

/* ---------- sondes exécutées DANS la page ---------- */

/* (a) uniformité des blocs + inventaire des couleurs d'un bord courbe */
const PROBE_BLOCS = () => {
  const g = window.__N.gfx, c = g.canvas(), PX = g.PX;
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  const CW = c.width, CH = c.height;
  const bw = Math.floor(CW / PX), bh = Math.floor(CH / PX);
  let bad = 0, tot = 0, firstBad = null;
  for (let by = 0; by < bh; by++) {
    for (let bx = 0; bx < bw; bx++) {
      const o0 = ((by * PX) * CW + bx * PX) * 4;
      const r = d[o0], gg = d[o0 + 1], b = d[o0 + 2];
      let uni = true;
      for (let yy = 0; yy < PX && uni; yy++) {
        const row = ((by * PX + yy) * CW + bx * PX) * 4;
        for (let xx = 0; xx < PX; xx++) {
          const o = row + xx * 4;
          if (d[o] !== r || d[o + 1] !== gg || d[o + 2] !== b) { uni = false; break; }
        }
      }
      tot++;
      if (!uni) { bad++; if (!firstBad) firstBad = { bx, by }; }
    }
  }
  return { PX, CW, CH, blocs: tot, nonUniformes: bad, premier: firstBad };
};

/* inventaire exhaustif des couleurs d'une fenêtre : le bord courbe du sprite BORD */
const PROBE_BORD = () => {
  const g = window.__N.gfx, c = g.canvas(), PX = g.PX;
  const x0 = (g.W - 20) * PX, y0 = 58 * PX;
  const ww = Math.min(22 * PX, c.width - x0), hh = Math.min(22 * PX, c.height - y0);
  const d = c.getContext('2d').getImageData(x0, y0, ww, hh).data;
  const seen = new Map();
  for (let i = 0; i < d.length; i += 4) {
    const v = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
    seen.set(v, (seen.get(v) || 0) + 1);
  }
  const C = window.__N.pal.C.map(h => parseInt(h.slice(1), 16));
  const out = [];
  for (const [v, n] of seen) out.push({ hex: '#' + v.toString(16).padStart(6, '0'), n, dansTable: C.includes(v) });
  out.sort((a, b) => b.n - a.n);
  return { x0, y0, ww, hh, couleurs: out };
};

/* (b) part des pixels hors de la table des seize sur l'image entière */
const PROBE_PALETTE = () => {
  const g = window.__N.gfx, c = g.canvas();
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  const C = window.__N.pal.C.map(h => parseInt(h.slice(1), 16));
  const ok = new Set(C);
  let hors = 0;
  const n = d.length / 4;
  const ex = new Map();
  for (let i = 0; i < d.length; i += 4) {
    const v = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
    if (!ok.has(v)) { hors++; if (ex.size < 6) ex.set(v, (ex.get(v) || 0) + 1); }
  }
  return {
    pixels: n, hors,
    pct: +(100 * hors / n).toFixed(4),
    exemples: [...ex.keys()].map(v => '#' + v.toString(16).padStart(6, '0'))
  };
};

/* (c) coût d'une image à vide. Les opérations de canvas sont différées : on force la fin du travail
   par une relecture d'un pixel, et on mesure séparément le coût de cette relecture pour le retirer. */
const PROBE_COUT = (cfg) => {
  const N = window.__N, g = N.gfx, c = g.canvas(), cx = c.getContext('2d');
  const n = cfg.n, dt = 1 / 60;
  const flush = () => cx.getImageData(0, 0, 1, 1);
  const med = a => { a = a.slice().sort((x, y) => x - y); return a[a.length >> 1]; };
  const p95 = a => { a = a.slice().sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(a.length * 0.95))]; };

  function run(fn) {
    const s = [];
    for (let i = 0; i < 12; i++) { fn(); flush(); }           /* chauffe */
    for (let i = 0; i < n; i++) {
      const t0 = performance.now();
      fn(); flush();
      s.push(performance.now() - t0);
    }
    return { med: +med(s).toFixed(3), p95: +p95(s).toFixed(3) };
  }

  const relecture = run(() => { });
  N.crt.off = true;
  const sansTube = run(() => { g.clear(0); g.present(); N.crt.apply(dt); });
  N.crt.off = false; N.crt.pure = true;
  const pur = run(() => { g.clear(0); g.present(); N.crt.apply(dt); });
  N.crt.pure = false; N.crt.preset('riche');
  const riche = run(() => { g.clear(0); g.present(); N.crt.apply(dt); });
  const richeSecousse = run(() => { g.clear(0); g.present(); N.S.shake = 8; N.crt.apply(dt); });
  N.S.shake = 0;
  N.crt.preset('sobre');
  const sobre = run(() => { g.clear(0); g.present(); N.crt.apply(dt); });
  N.crt.preset('riche'); N.crt.bloom = 0;
  const richeSansHalo = run(() => { g.clear(0); g.present(); N.crt.apply(dt); });
  N.crt.preset('riche'); N.crt.ab = 0;
  const richeSansAb = run(() => { g.clear(0); g.present(); N.crt.apply(dt); });
  N.crt.preset('riche');
  const presentSeul = run(() => { g.clear(0); g.present(); });

  const net = o => ({ med: +(o.med - relecture.med).toFixed(3), p95: +(o.p95 - relecture.p95).toFixed(3) });
  return {
    PX: g.PX, buf: g.W + 'x' + g.H, sortie: c.width + 'x' + c.height,
    relectureBrute: relecture,
    presentSeul: net(presentSeul),
    tubeCoupe: net(sansTube),
    tubePur: net(pur),
    tubeSobre: net(sobre),
    tubeRiche: net(riche),
    tubeRicheSecousse: net(richeSecousse),
    tubeRicheSansHalo: net(richeSansHalo),
    tubeRicheSansAb: net(richeSansAb),
    coutTubeRiche: +(net(riche).med - net(presentSeul).med).toFixed(3),
    coutTubePur: +(net(pur).med - net(presentSeul).med).toFixed(3),
    opsRiche: N.crt.stats.ops
  };
};

function titre(s) { console.log('\n' + '='.repeat(72) + '\n' + s + '\n' + '='.repeat(72)); }

/* ============================ (a) et (b) sur bureau ============================ */
titre('(a) PIXELS CARRES  —  bureau 1440x900, DPR 1');
{
  const { ctx, page, errs } = await open({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await page.evaluate(() => { window.__MIRE.temps(0.30); window.__MIRE.gel(true); });
  await page.waitForTimeout(300);

  for (const rg of ['coupe', 'pur', 'riche']) {
    await page.evaluate(r => window.__MIRE.regime(r), rg);
    await page.waitForTimeout(160);
    const b = await page.evaluate(PROBE_BLOCS);
    console.log(`tube=${rg.padEnd(6)} sortie=${b.CW}x${b.CH} px=${b.PX} blocs=${b.blocs} ` +
      `non-uniformes=${b.nonUniformes} (${(100 * b.nonUniformes / b.blocs).toFixed(3)} %)` +
      (b.premier ? `  premier=(${b.premier.bx},${b.premier.by})` : ''));
  }

  await page.evaluate(() => window.__MIRE.regime('coupe'));
  await page.waitForTimeout(160);
  const bd = await page.evaluate(PROBE_BORD);
  console.log(`\nbord courbe du sprite BORD, fenetre ${bd.ww}x${bd.hh} en (${bd.x0},${bd.y0}), tube coupe :`);
  for (const c of bd.couleurs) console.log(`   ${c.hex}  ${String(c.n).padStart(6)} px  dans la table : ${c.dansTable ? 'OUI' : 'NON'}`);
  console.log(`   -> valeurs intermediaires : ${bd.couleurs.filter(c => !c.dansTable).length}`);

  titre('(b) PALETTE FERMEE  —  dix captures, bureau 1440x900');
  for (const rg of ['coupe', 'pur', 'sobre', 'riche']) {
    await page.evaluate(r => window.__MIRE.regime(r), rg);
    let pireHors = 0, pirePct = 0, totalHors = 0, totalPx = 0, ex = [];
    for (let i = 0; i < 10; i++) {
      await page.evaluate(t => { window.__MIRE.gel(false); window.__MIRE.temps(t); window.__MIRE.gel(true); }, 0.05 + i * 0.09);
      await page.waitForTimeout(120);
      const r = await page.evaluate(PROBE_PALETTE);
      totalHors += r.hors; totalPx += r.pixels;
      if (r.hors > pireHors) { pireHors = r.hors; pirePct = r.pct; ex = r.exemples; }
    }
    const pct = 100 * totalHors / totalPx;
    console.log(`tube=${rg.padEnd(6)} dans la table = ${(100 - pct).toFixed(4)} %  ` +
      `(hors table ${totalHors}/${totalPx} px, pire image ${pirePct} %)` +
      (ex.length ? `  ex. ${ex.slice(0, 4).join(' ')}` : ''));
  }
  const err = await page.evaluate(() => ({ n: window.__ERR.count, s: Object.keys(window.__ERR.sigs) }));
  console.log(`\nerreurs bureau : __ERR.count=${err.n} ${err.s.length ? JSON.stringify(err.s) : ''}`);
  if (errs.length) console.log('journal :', errs.slice(0, 8));
  await ctx.close();
}

/* ============================ (b) et (c) sur iPhone ============================ */
titre('(b) PALETTE FERMEE + (c) COUT D\'UNE IMAGE A VIDE  —  iPhone 13 paysage 844x390');
{
  const { ctx, page, errs } = await open({ ...devices['iPhone 13'], viewport: { width: 844, height: 390 } });
  await page.evaluate(() => { window.__MIRE.temps(0.30); window.__MIRE.gel(true); });
  await page.waitForTimeout(300);

  for (const rg of ['coupe', 'pur', 'riche']) {
    await page.evaluate(r => window.__MIRE.regime(r), rg);
    let totalHors = 0, totalPx = 0;
    for (let i = 0; i < 10; i++) {
      await page.evaluate(t => { window.__MIRE.gel(false); window.__MIRE.temps(t); window.__MIRE.gel(true); }, 0.05 + i * 0.09);
      await page.waitForTimeout(110);
      const r = await page.evaluate(PROBE_PALETTE);
      totalHors += r.hors; totalPx += r.pixels;
    }
    const pct = 100 * totalHors / totalPx;
    console.log(`tube=${rg.padEnd(6)} dans la table = ${(100 - pct).toFixed(4)} % (hors ${totalHors}/${totalPx})`);
  }
  const b = await page.evaluate(PROBE_BLOCS);
  console.log(`blocs non uniformes, tube coupe non force ici : sortie ${b.CW}x${b.CH} px=${b.PX}`);

  console.log('\ncout d\'une image a vide (clear + present + crt.apply), millisecondes :');
  const c = await page.evaluate(PROBE_COUT, { n: 200 });
  console.log(`  tampon ${c.buf} -> sortie ${c.sortie}, px=${c.PX}`);
  console.log(`  relecture seule (soustraite) med=${c.relectureBrute.med} p95=${c.relectureBrute.p95}`);
  const show = (k, o) => console.log(`  ${k.padEnd(22)} med=${String(o.med).padStart(7)}  p95=${String(o.p95).padStart(7)}`);
  show('present seul', c.presentSeul);
  show('tube coupe', c.tubeCoupe);
  show('tube pur', c.tubePur);
  show('tube sobre', c.tubeSobre);
  show('tube riche', c.tubeRiche);
  show('tube riche + secousse', c.tubeRicheSecousse);
  show('riche sans halo', c.tubeRicheSansHalo);
  show('riche sans aberration', c.tubeRicheSansAb);
  console.log(`  -> cout du seul post-traitement : riche=${c.coutTubeRiche} ms  pur=${c.coutTubePur} ms  (budget 2 ms)`);
  console.log(`  -> operations de composition par image en riche : ${c.opsRiche}`);

  const err = await page.evaluate(() => ({ n: window.__ERR.count, s: Object.keys(window.__ERR.sigs) }));
  console.log(`\nerreurs iPhone : __ERR.count=${err.n} ${err.s.length ? JSON.stringify(err.s) : ''}`);
  if (errs.length) console.log('journal :', errs.slice(0, 8));
  await ctx.close();
}

await browser.close();
