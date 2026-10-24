/* tools/C/fumee.mjs — test de fumée du lot C : zéro erreur (__ERR.count = 0, console vide) sur iPhone 13 paysage,
   portrait et bureau, sur index.html ET sur la page d'essai ; la piste démarre, change de section, se coupe à la
   mort, et le jeu survit sans fichier de piste (repli).
   Usage : node proto-neon/tools/C/fumee.mjs [port=8123]
   Prérequis : `python3 -m http.server <port> --bind 127.0.0.1` lancé depuis la racine de la copie, et les deux
   pages construites (`node proto-neon/build.mjs` et `node proto-neon/build.mjs proto-neon/tools/C/index.html`).
   Chromium sans interface, son coupé (--mute-audio) : rien ne sort sur les haut-parleurs. */
import { chromium, devices } from 'playwright';

const port = process.argv[2] || '8123';
const PROFILS = {
  paysage: { ...devices['iPhone 13'], viewport: { width: 844, height: 390 } },
  portrait: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } },
  bureau: { viewport: { width: 1440, height: 900 } }
};
const PAGES = { jeu: '/proto-neon/index.html', essai: '/proto-neon/tools/C/index.html' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
let echecs = 0;
const dit = (ok, msg) => { if (!ok) echecs++; console.log((ok ? '  ok  ' : '  ECHEC ') + msg); };

for (const [pn, prof] of Object.entries(PROFILS)) {
  for (const [qn, url] of Object.entries(PAGES)) {
    const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
    const ctx = await b.newContext(prof);
    const p = await ctx.newPage();
    const errs = [];
    p.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errs.push(m.text()); });
    p.on('pageerror', e => errs.push('pageerror: ' + e.message));
    await p.goto('http://127.0.0.1:' + port + url, { waitUntil: 'load' });
    await p.waitForFunction(() => window.__N && window.__N.music && window.__ERR !== undefined, null, { timeout: 8000 }).catch(() => {});
    await sleep(1200);
    const e0 = await p.evaluate(() => window.__ERR ? window.__ERR.count : -1);
    dit(e0 === 0, pn + ' / ' + qn + ' : __ERR.count = ' + e0 + ' au chargement');
    /* le premier geste : démarre le contexte audio et la partition */
    await p.evaluate(() => { const m = window.__N.music; m.init(); m.start(); });
    await sleep(500);
    const st = await p.evaluate(() => ({ ctx: window.__N.music.info() && window.__N.music.info().state, piste: window.__N.music.piste() }));
    dit(st.ctx === 'running', pn + ' / ' + qn + ' : contexte audio ' + st.ctx);
    if (qn === 'essai' && pn === 'bureau') {                         // le scénario complet, une fois
      const suite = [['jeu', 3000], ['repit', 2500], ['alerte', 2500], ['boss', 2500], ['victoire', 2000], ['titre', 1500]];
      for (const [s, ms] of suite) {
        await p.evaluate(s => window.__N.music.section(s), s);
        await sleep(ms);
        const r = await p.evaluate(() => window.__N.music.piste());
        console.log('     section ' + s.padEnd(9) + JSON.stringify(r));
      }
      await p.evaluate(() => { const m = window.__N.music; m.section('jeu'); });
      await sleep(2500);
      await p.evaluate(() => window.__N.music.cue('mort'));
      await sleep(300);
      const apresMort = await p.evaluate(() => ({ rms: window.__N.music.rms(), piste: window.__N.music.piste() }));
      dit(apresMort.rms < 0.01, pn + ' / ' + qn + ' : musique coupée à la mort (rms ' + apresMort.rms.toFixed(4) + ')');
      await p.evaluate(() => window.__N.music.section('jeu'));
      await sleep(3500);
      console.log('     après la mort : ' + JSON.stringify(await p.evaluate(() => window.__N.music.piste())));
      const tousLesSons = await p.evaluate(() => {
        const noms = window.__N.ids.sons.concat(window.__N.ids.sonsAnciens, ['inconnu', 'zzz']);
        let erreurs = 0;
        for (const n of noms) { try { window.__N.music.sfx(n, { pan: 0.4, pitch: 3, type: 'laser' }); } catch (e) { erreurs++; } }
        return { noms: noms.length, erreurs };
      });
      dit(tousLesSons.erreurs === 0, pn + ' / ' + qn + ' : ' + tousLesSons.noms + ' sons demandés (dont inconnus), ' + tousLesSons.erreurs + ' erreur');
      await sleep(800);
    } else await sleep(2500);
    const e1 = await p.evaluate(() => window.__ERR ? window.__ERR.count : -1);
    dit(e1 === 0 && errs.length === 0, pn + ' / ' + qn + ' : __ERR.count = ' + e1 + ', console ' + (errs.length ? JSON.stringify(errs.slice(0, 3)) : 'vide'));
    await b.close();
  }
}

/* ------------------------------------------------------------------ volet 2 : fichier autonome, repli, suspend/resume, mémoire */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'snake-embed-'));
const AUTONOME = path.join(tmp, 'index.html');
execFileSync('node', [path.join(RACINE, 'proto-neon/build.mjs'), '--embed', AUTONOME], { stdio: 'inherit' });
{
  /* 1. le fichier autonome (--embed) joue sans réseau : toute requête http(s) est refusée */
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errs = [], reseau = [];
  await p.route(/^https?:/, r => { reseau.push(r.request().url()); r.abort(); });
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await p.goto('file://' + AUTONOME, { waitUntil: 'load' });
  await p.waitForFunction(() => window.__N && window.__N.music, null, { timeout: 8000 }).catch(() => {});
  await p.evaluate(() => { const m = window.__N.music; m.init(); m.start(); m.section('jeu'); });
  await sleep(3500);
  const r = await p.evaluate(() => ({ piste: window.__N.music.piste(), rms: window.__N.music.rms(), err: window.__ERR ? window.__ERR.count : -1 }));
  dit(r.piste.repli === false && r.piste.pret, 'autonome / hors ligne : la piste joue (bloc ' + r.piste.bloc + ', ' + (fs.statSync(AUTONOME).size / 1e6).toFixed(1) + ' Mo)');
  dit(reseau.length === 0 && r.err === 0 && errs.length === 0, 'autonome / hors ligne : ' + reseau.length + ' requête réseau, __ERR.count = ' + r.err + ', console ' + (errs.length ? JSON.stringify(errs.slice(0, 3)) : 'vide'));
  await b.close();
}
{
  /* 2. sans les fichiers de la musique (404) : le jeu tourne, le repli joue, aucune erreur du jeu */
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errs = [];
  await p.route(/\/musique\//, r => r.fulfill({ status: 404, body: 'absent' }));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|404/.test(m.text())) errs.push(m.text()); });
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await p.goto('http://127.0.0.1:' + port + '/proto-neon/index.html', { waitUntil: 'load' });
  await p.waitForFunction(() => window.__N && window.__N.music, null, { timeout: 8000 }).catch(() => {});
  await p.evaluate(() => { const m = window.__N.music; m.init(); m.start(); m.section('jeu'); m.tension(0.6); });
  await sleep(4500);
  const r = await p.evaluate(() => ({ piste: window.__N.music.piste(), rms: window.__N.music.rms(), err: window.__ERR ? window.__ERR.count : -1 }));
  dit(r.piste.repli === true, 'musique/ en 404 : repli actif (état ' + r.piste.etat + ')');
  dit(r.rms > 0.002, 'musique/ en 404 : le repli sonne (rms ' + r.rms.toFixed(4) + ')');
  dit(r.err === 0 && errs.length === 0, 'musique/ en 404 : __ERR.count = ' + r.err + ', console ' + (errs.length ? JSON.stringify(errs.slice(0, 3)) : 'vide hors les 404 attendus'));
  await b.close();
}
{
  /* 3. suspend / resume en moins d'une seconde, 4. mémoire décodée <= 25 Mo après avoir parcouru toutes les sections */
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errs.push(m.text()); });
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await p.goto('http://127.0.0.1:' + port + '/proto-neon/tools/C/index.html', { waitUntil: 'load' });
  await p.waitForFunction(() => window.__N && window.__N.music, null, { timeout: 8000 }).catch(() => {});
  await p.evaluate(() => { const m = window.__N.music; m.init(); m.start(); m.section('jeu'); });
  await sleep(2500);
  const t = await p.evaluate(async () => {
    const m = window.__N.music, c = m.context(), t0 = performance.now();
    m.suspend();
    while (c.state === 'running' && performance.now() - t0 < 3000) await new Promise(r => setTimeout(r, 10));
    const tS = performance.now() - t0, etatS = c.state, t1 = performance.now();
    m.resume();
    while (c.state !== 'running' && performance.now() - t1 < 3000) await new Promise(r => setTimeout(r, 10));
    return { tS, etatS, tR: performance.now() - t1, etatR: c.state };
  });
  dit(t.etatS === 'suspended' && t.tS < 1000, 'suspend : contexte ' + t.etatS + ' en ' + Math.round(t.tS) + ' ms');
  dit(t.etatR === 'running' && t.tR < 1000, 'resume : contexte ' + t.etatR + ' en ' + Math.round(t.tR) + ' ms');
  let max = 0;
  for (const s of ['titre', 'attraction', 'briefing', 'jeu', 'repit', 'alerte', 'boss', 'victoire', 'defaite', 'initiales', 'jeu', 'boss', 'repit']) {
    await p.evaluate(s => window.__N.music.section(s), s);
    await sleep(900);
    const o = await p.evaluate(() => window.__N.music.chargeur());
    max = Math.max(max, o.octets);
  }
  const fin = await p.evaluate(() => window.__N.music.chargeur());
  dit(max <= 25e6, 'mémoire décodée : maximum ' + (max / 1e6).toFixed(1) + ' Mo (<= 25), ' + fin.decodes.length + ' blocs en mémoire à la fin');
  dit(errs.length === 0 && (await p.evaluate(() => window.__ERR ? window.__ERR.count : -1)) === 0, 'suspend / sections : zéro erreur');
  await b.close();
}
fs.rmSync(tmp, { recursive: true, force: true });

console.log(echecs ? '\n' + echecs + ' ECHEC(S)' : '\ntout est vert');
process.exit(echecs ? 1 : 0);
