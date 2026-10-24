/* mesure-tempo.mjs — le tempo mis en scène, relevé dans le temps, EN AVENTURE, dans le vrai jeu (index.html de la copie).
   Voyage ELLE jusqu'au néon (1976, 1982 et films sautés), god, puis : vague 1 (piste en blocs) pic → INVERSION → fin →
   nettoyée ; RALENTI ; vague 3 (morceau long electro-calme) pic → INVERSION → fin ; CYCLOPE (dbg.boss : vraie arrivée).
   Relevé toutes les 100 ms : horloge audio, N.music.tempo(), tempoJeu(144,6), tempo mis en scène (n, k), morceau, vitesse des
   items de la piste et des emplacements. Usage : node mesure-tempo.mjs PORT SORTIE.json */
import fs from 'node:fs';
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const PORT = process.argv[2] || '8147', SORTIE = process.argv[3] || 'tempo.json';
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await (await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 844, height: 390 } })).newPage();
const logs = []; page.on('pageerror', e => logs.push(e.message)); page.on('console', m => { if (m.type() === 'error') logs.push(m.text()); });
await page.addInitScript(() => { localStorage.removeItem('snake2975.pilotes'); });
await page.goto(`http://127.0.0.1:${PORT}/proto-neon/index.html`);
await page.waitForFunction(() => window.__N && window.__N.game && window.__N.aventure);
const st = () => page.evaluate(() => ({ jeu: window.__N.game.etat(), etape: window.__N.aventure.etape ? window.__N.aventure.etape() : null }));
for (let i = 0; i < 160; i++) { const s = await st(); if (s.jeu === 'aventure') break;
  await page.evaluate(() => { const N = window.__N; if (N.intro && N.intro.skip) N.intro.skip(); });
  await page.touchscreen.tap(600, 200); await page.waitForTimeout(250); }
for (let i = 0; i < 400; i++) { const s = await st(); if (s.jeu !== 'aventure') break;
  if (s.etape === 'choix') { await page.waitForTimeout(500); await page.touchscreen.tap(200, 200); await page.waitForTimeout(300); continue; }
  await page.evaluate(() => { const N = window.__N, et = N.aventure.etape();
    if (et === '1976' && N.terminal.actif()) N.terminal.skip(); else if (et === '1982' && N.arcade && N.arcade.actif()) N.arcade.skip(); else if (N.film && N.film.actif && N.film.actif()) N.film.sauter(); });
  await page.waitForTimeout(200); }
for (let i = 0; i < 100; i++) { const s = await st(); if (s.jeu === 'jeu') break; await page.waitForTimeout(200); }
console.log('néon :', JSON.stringify(await st()), 'aventure', await page.evaluate(() => window.__N.aventure.enCours()));
await page.evaluate(() => {
  const N = window.__N; N.game.dbg.god(true);
  window.__REL = []; const t0 = performance.now();
  window.__MARQ = []; window.__marque = m => window.__MARQ.push({ t: +((performance.now() - t0) / 1000).toFixed(2), ctx: +N.music.context().currentTime.toFixed(3), m });
  setInterval(() => {
    const ts = N.music.tempoScene(), mz = N.music.morceau(), E = N.music.moteur(), tr = E ? E.trackState() : null, mo = N.music.morceaux();
    const now = N.music.context().currentTime;
    const it = tr ? tr.items.filter(x => x.tJoin <= now && now < x.tEnd)[0] : null;
    const sl = mo.emplacements.filter(x => x.occupe === 'cur' || x.occupe === 'entrant')[0];
    window.__REL.push({ t: +((performance.now() - t0) / 1000).toFixed(2), ctx: +now.toFixed(3), bpm: +N.music.tempo().toFixed(2), grille: +N.music.tempoJeu(144.6).toFixed(2),
      n: ts.n, k: +ts.k.toFixed(4), voulu: ts.voulu, enCours: ts.enCours, frein: ts.frein, morceau: mz ? mz.id : null,
      itemK: it ? it.k : null, slotK: sl ? sl.k : null, slotVitesse: sl ? sl.vitesse : null, vague: N.dir.vague(), etat: N.game.etat(), aventure: N.aventure.enCours() });
  }, 100);
});
const marque = m => page.evaluate(m => window.__marque(m), m);
const emit = (nom, c) => page.evaluate(([nom, c]) => window.__N.ev.emit(nom, c), [nom, c]);
const W = ms => page.waitForTimeout(ms);
const vagueEv = (n, evt) => ({ n, etape: 'vague', evt, nom: 'VAGUE ' + n, quartier: 'docks' });
const n0 = await page.evaluate(() => window.__N.dir.vague());
await W(5000);
await marque('pic vague ' + n0); await emit('vague', vagueEv(n0, 'pic')); await W(8000);
await marque('INVERSION début'); await emit('inversion', { evt: 'debut', dur: 5 }); await W(5000);
await marque('INVERSION fin'); await emit('inversion', { evt: 'fin', dur: 0 }); await W(7000);
await marque('vague nettoyée'); await emit('vague', vagueEv(n0, 'nettoyee')); await W(6000);
await marque('RALENTI début'); await emit('pouvoir', { id: 'ralenti', evt: 'debut' }); await W(3500);
await marque('RALENTI fin'); await emit('pouvoir', { id: 'ralenti', evt: 'fin' }); await W(7000);
await marque('vague 3 (dbg)'); await page.evaluate(() => window.__N.game.dbg.vague(3));
for (let i = 0; i < 300; i++) { const e = await page.evaluate(() => window.__N.game.etat()); if (e === 'jeu' && i > 4) break;
  if (e === 'aventure') await page.evaluate(() => window.__N.aventure.sauter()); await W(250); }
await marque('retour au jeu (vague 3)'); await page.evaluate(() => window.__N.game.dbg.god(true));
for (let i = 0; i < 80; i++) { const id = await page.evaluate(() => { const m = window.__N.music.morceau(); return m && m.id; }); if (id) break; await W(250); }
await W(4000);
await marque('pic vague 3'); await emit('vague', vagueEv(3, 'pic')); await W(8000);
await marque('INVERSION début (morceau)'); await emit('inversion', { evt: 'debut', dur: 5 }); await W(5000);
await marque('INVERSION fin (morceau)'); await emit('inversion', { evt: 'fin', dur: 0 }); await W(8000);
await marque('CYCLOPE (dbg.boss)'); await page.evaluate(() => window.__N.game.dbg.boss());
for (let i = 0; i < 64; i++) { const e = await page.evaluate(() => window.__N.game.etat()); if (e === 'aventure') await page.evaluate(() => window.__N.aventure.sauter()); await W(250); }
const r = await page.evaluate(() => ({ rel: window.__REL, marq: window.__MARQ, journal: window.__N.music.tempoScene().journal, acc: window.__N.music.moteur().accLog().filter(a => /^tempo|stinger|vague/.test(a.nom)),
  morceaux: window.__N.music.morceaux().historique, err: window.__ERR ? window.__ERR.count : -1 }));
r.logs = logs;
fs.writeFileSync(SORTIE, JSON.stringify(r, null, 1));
/* résumé : chaque changement de tempo relevé */
let prev = null; const lignes = [];
for (const x of r.rel) { const cle = `${x.bpm}|${x.n}|${x.morceau}|${x.frein}`; if (prev === null || Math.abs(x.bpm - prev.bpm) > 0.6 || x.n !== prev.n || x.morceau !== prev.morceau || x.frein !== prev.frein) lignes.push(x); prev = x; }
for (const m of r.marq) console.log(`MARQUE t=${m.t}s ctx=${m.ctx} ${m.m}`);
for (const x of lignes) console.log(`t=${x.t}s ctx=${x.ctx} bpm=${x.bpm} grille=${x.grille} n=${x.n} k=${x.k} voulu=${x.voulu} frein=${x.frein} morceau=${x.morceau} itemK=${x.itemK} slotK=${x.slotK} vitesse=${x.slotVitesse} vague=${x.vague} etat=${x.etat}`);
console.log('journal des changements :', JSON.stringify(r.journal));
console.log('accents :', JSON.stringify(r.acc));
console.log('erreurs :', r.err, logs.length, logs.slice(0, 5).join(' | '));
await browser.close();
