/* tools/L1/perf.mjs — les critères [U] de performance du lot 1 (REFONTE.md § 7.11, § 8.3) :
     charge       p95 du coût d'image ≤ 11 ms, iPhone 13 paysage ×1, tube « riche », qualité adaptative coupée, sur les
                  scènes `charge`, `v5` et `vol` (replis des autres lots) ; le même relevé en portrait et au bureau
     skipScale    present({skipScale}) fait gagner au moins 0,5 ms par image
     redim        10 redimensionnements (rotations) : aucune image au-delà de 50 ms
     x4           processeur ×4, qualité adaptative : le préréglage descend en moins de 1 s, p95 ≤ 25 ms, aucune perte
                  de temps de jeu (temps de jeu / temps réel ≥ 0,99)
   Le coût d'une image est la durée du rappel requestAnimationFrame du jeu (mise à jour, dessin, tube), mesurée par
   une enveloppe posée avant le chargement. Usage : node tools/L1/perf.mjs [--url URL] [--seulement a,b] [--rapide] */
import { ouvrir, fermerTout, Rapport, SEULEMENT, RAPIDE, q } from './commun.mjs';

const R = new Rapport('perf');
const fait = n => !SEULEMENT.length || SEULEMENT.includes(n);
const DUREE = RAPIDE ? 4000 : 10000;

/* l'enveloppe du rappel d'image : le coût de chaque image et l'instant de son début */
const ENVELOPPE = () => {
  const raf = window.requestAnimationFrame.bind(window), C = window.__L1c = { cout: [], t: [] };
  window.requestAnimationFrame = function (cb) { return raf(function (ts) { const t0 = performance.now(); try { cb(ts); } finally { if (C.cout.length < 100000) { C.cout.push(performance.now() - t0); C.t.push(t0); } } }); };
};
async function couts(s, ms) {
  const n0 = await s.eval(() => __L1c.cout.length);
  await s.page.waitForTimeout(ms);
  return s.eval(n => ({ c: __L1c.cout.slice(n), t: __L1c.t.slice(n) }), n0);
}
async function scene(s, nom) {
  await s.eval(n => { const N = __N; N.game.dbg.scene(n); N.game.dbg.god(true); if (N.dir) N.dir.update = function () { }; if (__S.reglages) __S.reglages.ecran = 'riche'; N.crt.preset('riche'); N.crt.auto(false); }, nom);
  await s.page.waitForTimeout(1500);
}

async function charge() {
  for (const prof of ['paysage', 'portrait', 'bureau']) {
    const s = await ouvrir(prof, { dt: 1 / 60, init: ENVELOPPE });
    for (const sc of prof === 'paysage' ? ['charge', 'v5', 'vol'] : ['charge']) {
      await scene(s, sc);
      const { c } = await couts(s, DUREE);
      const p95 = q(c, 0.95), etat = await s.eval(() => [__N.game.etat(), __N.ennemis ? __N.ennemis.list.length : 0, __N.ennemis ? __N.ennemis.tirs.length : 0, __N.crt.niveau()]);
      R.verifie(`coût d'image, ${prof}, scène ${sc}, ×1, tube riche, sans qualité adaptative : p95 (ms)`, +p95.toFixed(2), '≤ 11', p95 <= 11, { images: c.length, p50: +q(c, 0.5).toFixed(2), p99: +q(c, 0.99).toFixed(2), max: +Math.max(...c).toFixed(1), etat });
      if (sc === 'charge') { const f = await s.capture('charge'); R.capture(f); }
    }
    const e = await s.err(); R.verifie(`performance ${prof} : zéro erreur`, e, '0', e.zero);
    await s.fermer();
  }
}

async function skipScale() { for (const cpu of [1, 4]) await skipScaleA(cpu); }
async function skipScaleA(cpu) {
  const s = await ouvrir('paysage', { dt: 1 / 60, init: ENVELOPPE, cpu });
  await scene(s, 'charge');
  await s.eval(() => {
    const G = __N.gfx, p = G.present; window.__L1p = { mode: 'skip', ms: { skip: [], plein: [] } };
    G.present = function (o) { const t0 = performance.now(); if (__L1p.mode === 'plein') p(); else p(o); __L1p.ms[__L1p.mode].push(performance.now() - t0); };
  });
  const a = await couts(s, DUREE / 2);
  await s.eval(() => { __L1p.mode = 'plein'; });
  const b = await couts(s, DUREE / 2);
  const m = await s.eval(() => __L1p.ms);
  const avg = x => x.reduce((u, v) => u + v, 0) / Math.max(1, x.length);
  const gainPresent = avg(m.plein) - avg(m.skip), gainImage = q(b.c, 0.5) - q(a.c, 0.5);
  R.verifie(`skipScale, processeur ×${cpu} : gain de present() par image, tube actif (ms)`, +gainPresent.toFixed(3), '≥ 0,5', gainPresent >= 0.5, { presentSkip: +avg(m.skip).toFixed(4), presentPlein: +avg(m.plein).toFixed(3), gainMedianImage: +gainImage.toFixed(2) });
  await s.fermer();
}

async function redim() {
  const s = await ouvrir('paysage', { dt: 1 / 60, init: ENVELOPPE });
  await scene(s, 'v5');
  const n0 = await s.eval(() => __L1c.cout.length);
  const tailles = [[390, 844], [844, 390], [390, 844], [844, 390], [1024, 600], [844, 390], [390, 844], [600, 1024], [844, 390], [390, 844]];
  for (const [w, h] of tailles) { await s.page.setViewportSize({ width: w, height: h }); await s.page.waitForTimeout(250); }
  const r = await s.eval(n => ({ c: __L1c.cout.slice(n), t: __L1c.t.slice(n) }), n0);
  const max = Math.max(...r.c), gaps = []; for (let i = 1; i < r.t.length; i++) gaps.push(r.t[i] - r.t[i - 1]);
  R.verifie('10 redimensionnements : coût de la pire image (ms)', +max.toFixed(1), '≤ 50', max <= 50, { images: r.c.length, p95: +q(r.c, 0.95).toFixed(2), pireIntervalle: +Math.max(...gaps).toFixed(1) });
  R.note('l’intervalle entre deux images comprend la mise en page que le navigateur refait à chaque setViewportSize (hors du jeu) : il est rapporté, le critère porte sur le coût des images du jeu');
  const e = await s.err(); R.verifie('redimensionnements : zéro erreur', e, '0', e.zero);
  await s.fermer();
}

async function x4() {
  const s = await ouvrir('paysage', { cpu: 4, init: ENVELOPPE });
  await s.eval(() => { const N = __N; N.game.dbg.scene('charge'); N.game.dbg.god(true); if (N.dir) N.dir.update = function () { }; if (__S.reglages) __S.reglages.ecran = 'riche'; N.crt.preset('riche'); N.crt.auto(true); window.__L1niv = []; const f = () => { __L1niv.push([performance.now(), __N.crt.niveau()]); requestAnimationFrame(f); }; f(); });
  const t0 = await s.eval(() => performance.now());
  await s.page.waitForTimeout(3000);
  const niv = await s.eval(() => __L1niv);
  const premier = niv.find(x => x[1] !== 'riche'), descente = premier ? (premier[0] - t0) / 1000 : null;
  R.verifie('processeur ×4 : le préréglage du tube descend (s après le début de la scène charge)', { descente: descente && +descente.toFixed(3), vers: premier && premier[1], niveaux: [...new Set(niv.map(x => x[1]))] }, '< 1 s', descente !== null && descente < 1);
  /* le temps de jeu qui s'écoule : les pas faits (N.horloge.reel), car t() s'arrête pendant les gels et ralentit
     pendant les ralentis de la scène, par construction */
  const a = await s.eval(() => ({ t: __N.horloge.reel(), r: performance.now() }));
  const { c } = await couts(s, DUREE);
  const b = await s.eval(() => ({ t: __N.horloge.reel(), r: performance.now(), niveau: __N.crt.niveau() }));
  const p95 = q(c, 0.95), ratio = (b.t - a.t) / ((b.r - a.r) / 1000);
  /* le temps que perd le plafond de 4 pas par image : chaque intervalle entre deux images au-delà de 4/120 s */
  const iv = await s.eval(n => { const T = __L1c.t.slice(-n), o = []; for (let i = 1; i < T.length; i++) o.push(T[i] - T[i - 1]); return o; }, c.length);
  const perdu = iv.reduce((u, v) => u + Math.max(0, v - 1000 * 4 / 120), 0) / iv.reduce((u, v) => u + v, 0);
  R.note(`×4 : ${iv.filter(v => v > 33.4).length} intervalles entre images au-delà de 4 pas (33,3 ms) sur ${iv.length}, pire ${Math.max(...iv).toFixed(1)} ms ; part de temps perdue par ces intervalles ${(100 * perdu).toFixed(2)} % — le coût des images du jeu reste à p95 ${p95.toFixed(1)} ms : les intervalles longs viennent de l'ordonnancement du navigateur sur la machine du banc (charge ${(await import('node:os')).loadavg()[0].toFixed(1)} sur ${(await import('node:os')).cpus().length} cœurs)`);
  R.verifie('processeur ×4, qualité adaptative : p95 (ms)', +p95.toFixed(2), '≤ 25', p95 <= 25, { images: c.length, p50: +q(c, 0.5).toFixed(2), niveau: b.niveau });
  R.verifie('processeur ×4 : pas de simulation faits / temps réel (N.horloge.reel)', +ratio.toFixed(4), '≥ 0,99', ratio >= 0.99);
  const e = await s.err(); R.verifie('×4 : zéro erreur', e, '0', e.zero);
  await s.fermer();
}


/* le tas : stable sur 60 s de jeu (pilote, invulnérable), mesuré après ramasse-miettes forcé */
async function tas() {
  const s = await ouvrir('paysage', { dt: 1 / 60, cdp: true });
  const cdp = await s.cdpSession();
  await s.eval(() => { const N = __N; N.game.dbg.vague(2); N.game.dbg.god(true); N.pilote.niveau('bon'); N.pilote.activer(true); });
  const mesure = async () => { await cdp.send('HeapProfiler.collectGarbage'); const u = await cdp.send('Runtime.getHeapUsage'); return u.usedSize / 1048576; };
  await s.page.waitForTimeout(5000);
  const a = await mesure();
  await s.page.waitForTimeout(RAPIDE ? 15000 : 60000);
  const b = await mesure();
  R.verifie(`tas après ramasse-miettes, ${RAPIDE ? 15 : 60} s de jeu (Mo)`, { debut: +a.toFixed(2), fin: +b.toFixed(2), ecart: +(b - a).toFixed(2) }, 'écart < 1 Mo', b - a < 1);
  const e = await s.err(); R.verifie('tas : zéro erreur', e, '0', e.zero);
  await s.fermer();
}

const T = { charge, skipScale, redim, x4, tas };
try {
  for (const [n, f] of Object.entries(T)) if (fait(n)) { console.log('== ' + n); try { await f(); } catch (e) { R.verifie(n + ' : exception', String(e && e.stack || e).slice(0, 500), 'aucune', false); } }
} finally { await fermerTout(); }
console.log('→ ' + R.ecrire());
process.exit(R.lignes.every(l => l.ok) ? 0 : 1);
