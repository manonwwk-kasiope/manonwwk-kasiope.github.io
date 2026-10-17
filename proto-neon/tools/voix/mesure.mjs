/* tools/voix/mesure.mjs — le banc de la voix : chaque mot de sons/voix.js rendu hors ligne
   (OfflineAudioContext, Chromium via Playwright), puis mesuré par tools/voix/analyse.js.
   Usage :
     node proto-neon/tools/voix/mesure.mjs                 -> tools/voix/mesure.json (+ résumé à l'écran)
     node proto-neon/tools/voix/mesure.mjs --wav <dossier>  -> écrit aussi un WAV 16 bits par mot (hors dépôt)
     node proto-neon/tools/voix/mesure.mjs --calibre        -> réécrit le bloc CAL de sons/voix.js
     node proto-neon/tools/voix/mesure.mjs --planche        -> tools/voix/planche.png (spectrogrammes)
     node proto-neon/tools/voix/mesure.mjs --reglages '{"metal":0}' --mots READY,GO
   Le chemin mesuré est `construire()` (le graphe direct, calibré) ; `rendre()` en est la version
   normalisée, identique à un gain près. */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const VOIX = path.join(HERE, '../../sons/voix.js');
const args = process.argv.slice(2);
const opt = n => { const i = args.indexOf(n); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : null; };
const wavDir = opt('--wav');
const reglages = opt('--reglages') ? JSON.parse(opt('--reglages')) : {};
const SR = 48000;

const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
const errs = [];
p.on('pageerror', e => errs.push(e.message));
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('file://' + path.join(HERE, 'index.html') + '?banc=1');
await p.waitForFunction(() => window.VOIX_2975 && window.VOIX_AN);
const mots = opt('--mots') ? String(opt('--mots')).split(',') : await p.evaluate(() => VOIX_2975.mots);

const res = await p.evaluate(async ([mots, reglages, SR, veutWav]) => {
  const out = [];
  for (const mot of mots) {
    const R = VOIX_2975.pistes(mot, reglages);
    const n = Math.ceil((R.fin + R.queue + 0.1) * SR);
    const oc = new OfflineAudioContext(1, n, SR);
    const g = VOIX_2975.construire(oc, oc.destination, mot, 0, reglages);
    const buf = await oc.startRendering();
    const x = buf.getChannelData(0);
    let crete = 0; for (const v of x) crete = Math.max(crete, Math.abs(v));
    const m = VOIX_AN.tout(x, SR, R);
    /* le mot sec (sans écho) pour la durée propre */
    const oc2 = new OfflineAudioContext(1, n, SR);
    VOIX_2975.construire(oc2, oc2.destination, mot, 0, Object.assign({}, reglages, { echo: 0 }));
    const sec = (await oc2.startRendering()).getChannelData(0);
    const ns = VOIX_AN.niveaux(sec, SR);
    let wav = null;
    if (veutWav) { const i16 = new Int16Array(x.length); for (let i = 0; i < x.length; i++) i16[i] = Math.max(-32767, Math.min(32767, Math.round(x[i] * 32767))); let s = ''; const u8 = new Uint8Array(i16.buffer); for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); wav = btoa(s); }
    out.push({
      mot, texte: VOIX_2975.texte(mot), contrat: !!VOIX_2975.MOTS[mot].contrat, niveauVise: VOIX_2975.MOTS[mot].niveau,
      noeuds: g.noeuds, appui: +R.appui.toFixed(3), dureeSeche: ns.duree, dureeAvecEcho: m.niveaux.duree, creteBrute: crete,
      ...m, wav
    });
  }
  return out;
}, [mots, reglages, SR, !!wavDir]);

if (wavDir) {
  fs.mkdirSync(wavDir, { recursive: true });
  for (const r of res) {
    const pcm = Buffer.from(r.wav, 'base64'), h = Buffer.alloc(44);
    h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16);
    h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
    h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
    fs.writeFileSync(path.join(wavDir, r.mot + '.wav'), Buffer.concat([h, pcm]));
  }
}
for (const r of res) delete r.wav;

if (opt('--calibre')) {
  /* le gain qui amène la crête du chemin direct au niveau visé, compte tenu du CAL déjà en place */
  const src = fs.readFileSync(VOIX, 'utf8');
  const ancien = await p.evaluate(() => VOIX_2975.CAL);
  const cal = {};
  for (const r of res) cal[r.mot] = +(((ancien[r.mot] || 1) * Math.pow(10, r.niveauVise / 20) / r.creteBrute)).toFixed(4);
  const bloc = '/*CAL*/\n  var CAL = ' + JSON.stringify(cal).replace(/,/g, ', ').replace(/:/g, ': ') + ';\n  /*FIN CAL*/';
  fs.writeFileSync(VOIX, src.replace(/\/\*CAL\*\/[\s\S]*?\/\*FIN CAL\*\//, bloc));
  console.log('calibrage écrit :', cal);
}

if (opt('--planche')) {
  await p.evaluate(async (mots) => { await window.planche(mots); }, mots);
  const el = await p.$('#planche');
  await el.screenshot({ path: path.join(HERE, 'planche.png') });
  console.log('planche -> tools/voix/planche.png');
}

const sortie = { quand: new Date().toISOString(), reglages, sr: SR, erreurs: errs, mots: res };
if (!opt('--mots') && !Object.keys(reglages).length) fs.writeFileSync(path.join(HERE, 'mesure.json'), JSON.stringify(sortie, null, 1));
else fs.writeFileSync(path.join(HERE, 'out-essai.json'), JSON.stringify(sortie, null, 1));

const pad = (s, n) => String(s).padEnd(n);
console.log(pad('mot', 11) + pad('crête', 8) + pad('RMS', 8) + pad('tél.', 8) + pad('sec', 7) + pad('écho', 7) + pad('>4k', 7) + pad('>400', 7) + pad('2-5k', 7) + pad('centr', 7) + pad('f0', 12) + pad('indice', 7) + 'voyelles F1/F2 mesuré (cible)');
for (const r of res) {
  const v = r.voyelles.map(v => v.ph + ' ' + (v.F[0].mesure || '?') + '/' + (v.F[1].mesure || '?') + ' (' + v.F[0].cible + '/' + v.F[1].cible + ')').join(' ; ');
  console.log(pad(r.mot, 11) + pad(r.niveaux.creteDb, 8) + pad(r.niveaux.rmsDb, 8) + pad(r.niveaux.rmsTelDb, 8) + pad(r.dureeSeche, 7) + pad(r.dureeAvecEcho, 7)
    + pad((r.spectre.au4k * 100).toFixed(1) + '%', 7) + pad((r.spectre.au400 * 100).toFixed(0) + '%', 7) + pad((r.spectre.bande2a5k * 100).toFixed(0) + '%', 7) + pad(r.spectre.centroide, 7)
    + pad(r.f0 ? r.f0.min + '-' + r.f0.max : '-', 12) + pad(r.indice, 7) + v);
}
if (errs.length) console.log('ERREURS :', errs);
await b.close();
