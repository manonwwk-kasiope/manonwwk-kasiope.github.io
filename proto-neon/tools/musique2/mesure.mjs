/* tools/musique2/mesure.mjs — le mixage, mesure sur la sortie rendue par le MEME moteur que le jeu.
   1. la partie reelle : le flux d'appels enregistre par flux.mjs (tension image par image, chaque son a
      son instant) est rejoue hors ligne a 48 kHz ; par tranches de 20 s : RMS, sonie BS.1770, part
      d'energie au-dessus de 4 kHz et dans 2-5 kHz, centroide ; musique seule puis melange complet.
   2. chaque son isole : crete, RMS, part aigue ; et le flux de tirs a la cadence reelle contre la musique.
   Usage : node tools/musique2/mesure.mjs [etiquette]  ->  tools/musique2/mesure-<etiquette>.json */
import fs from 'node:fs';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const label = process.argv[2] || 'actuel';
const HERE = new URL('.', import.meta.url).pathname;
const F = JSON.parse(fs.readFileSync(HERE + 'flux.json', 'utf8'));

const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
p.on('pageerror', e => errs.push('pageerror: ' + e.message));
await p.addInitScript({ path: HERE + 'analyse.js' });
await p.goto('http://127.0.0.1:8112/proto-neon/tools/musique2/index.html', { waitUntil: 'load' });
await p.waitForFunction(() => window.__N && window.__N.music && window.__N.reseed);
await p.evaluate(() => window.__N.reseed(2084));

/* la ligne de temps de la partie : depuis le toucher qui la lance jusqu'a la fin enregistree */
const f0 = F.gameF0, dur = Math.floor((F.frame - f0) / 60);
const ten = F.log.tension.filter(x => x.f >= f0).map(x => [(x.f - f0) / 60, x.v]);
const ev = F.log.sfx.filter(x => x.f >= f0).map(x => ({ t: (x.f - f0) / 60 + 0.05, name: x.name, opts: x.opts || {} }));

const partie = await p.evaluate(async ([dur, ten, ev]) => {
  const tf = t => { let v = ten.length ? ten[0][1] : 0; for (const [a, x] of ten) { if (a > t) break; v = x; } return v; };
  const out = {};
  for (const [nom, mute] of [['musique', 'sfx'], ['melange', null]]) {
    window.__N.reseed(2084);
    const buf = await window.__N.music.renderOffline(dur, tf, ev, 48000, mute);
    const tr = [];
    for (let a = 0; a + 20 <= dur; a += 20) tr.push(Object.assign({ tranche: a + '-' + (a + 20) + ' s', tension: +tf(a + 10).toFixed(2) }, window.__AN.tout(buf, a, a + 20)));
    out[nom] = { tranches: tr, global: window.__AN.tout(buf, 0, dur) };
  }
  return out;
}, [dur, ten, ev]);

/* chaque son isole, musique coupee ; fenetre de mesure = duree du son */
const SONS = [['tir', { pitch: 2 }, 0.12], ['kill', { pitch: 0 }, 0.35], ['kill', { pitch: 9 }, 0.35], ['butin', { pitch: 7 }, 0.30],
  ['degat', {}, 0.5], ['bigkill', {}, 1.5], ['defi', {}, 0.8], ['intro', {}, 3.4], ['inconnu', {}, 0.3]];
const isoles = await p.evaluate(async (SONS) => {
  const r = [];
  for (const [n, o, d] of SONS) {
    window.__N.reseed(2084);
    const buf = await window.__N.music.renderOffline(Math.max(1.5, d + 1), () => 0.06, [{ t: 0.5, name: n, opts: o }], 48000, 'music');
    const x = window.__AN.tout(buf, 0.5, 0.5 + d);
    r.push(Object.assign({ son: n + (o.pitch !== undefined ? '(' + o.pitch + ')' : '') }, x));
  }
  return r;
}, SONS);

/* le flux de tirs a la cadence reelle mesuree en jeu, contre la musique au calme puis au chaos */
const cad = F.log.sfx.filter(x => x.f >= f0 && x.name === 'tir').length / ((F.frame - f0) / 60);
const flux = await p.evaluate(async (cad) => {
  const evs = []; let k = 0;
  for (let t = 1; t < 11; t += 1 / cad) evs.push({ t, name: 'tir', opts: { pitch: (k++) % 5 } });
  const r = {};
  window.__N.reseed(2084);
  const tirs = await window.__N.music.renderOffline(12, () => 0.06, evs, 48000, 'music');
  r.tirs = window.__AN.tout(tirs, 1, 11);
  for (const [nom, v] of [['calme', 0.06], ['chaos', 1]]) {
    window.__N.reseed(2084);
    const m = await window.__N.music.renderOffline(12, () => v, null, 48000, 'sfx');
    r['musique_' + nom] = window.__AN.tout(m, 1, 11);
  }
  return r;
}, cad);

const R = { label, flux: { profil: F.profil, graine: F.graine, duree: dur, evenements: ev.length }, partie, isoles, tirs: { cadence: +cad.toFixed(2), ...flux }, erreurs: errs };
fs.writeFileSync(HERE + 'mesure-' + label + '.json', JSON.stringify(R, null, 1));

const row = (x) => 'RMS ' + x.rmsDB.toFixed(1).padStart(6) + ' dBFS  sonie ' + String(x.lufs).padStart(6) + ' LUFS  crete ' + x.creteDB.toFixed(1).padStart(5) +
  '  >4k ' + x.hf4k.toFixed(2).padStart(5) + ' %  2-5k ' + x.b2a5k.toFixed(2).padStart(5) + ' %  centroide ' + String(x.centroide).padStart(5) + ' Hz';
console.log('== ' + label + ' — partie reelle rejouee (' + F.profil + ', graine ' + F.graine + ', ' + dur + ' s, ' + ev.length + ' sons)');
for (const k of ['musique', 'melange']) {
  console.log(' ' + k);
  for (const t of partie[k].tranches) console.log('   ' + t.tranche.padEnd(10) + ' tension ' + t.tension.toFixed(2) + '  ' + row(t));
  console.log('   global                   ' + row(partie[k].global));
}
console.log(' sons isoles');
for (const s of isoles) console.log('   ' + s.son.padEnd(10) + row(s));
console.log(' flux de tirs a ' + cad.toFixed(2) + ' /s, seul : ' + row(flux.tirs));
console.log('   musique au calme      : ' + row(flux.musique_calme));
console.log('   musique au chaos      : ' + row(flux.musique_chaos));
console.log('   ecart tirs - musique au calme : ' + (flux.tirs.rmsDB - flux.musique_calme.rmsDB).toFixed(1) + ' dB, au chaos : ' + (flux.tirs.rmsDB - flux.musique_chaos.rmsDB).toFixed(1) + ' dB');
console.log(' erreurs de console : ' + (errs.length ? JSON.stringify(errs.slice(0, 4)) : '0'));
await b.close();
