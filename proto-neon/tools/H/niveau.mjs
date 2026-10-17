/* tools/H/niveau.mjs — le niveau perçu des morceaux longs comparé à celui de la piste en blocs, à tension égale.
   Aucun son : Chromium sans interface (--mute-audio), tout est rendu HORS LIGNE par N.music.renderOffline, c'est-à-dire par
   le MÊME moteur et la MÊME chaîne que le jeu (passe-haut, compresseur, étagère, passe-bas de tension, niveau, genou doux).
     référence : la piste en blocs, section « jeu » (PLATEAU, soixante mesures), sans les couches du moteur, à tension fixe ;
     morceau   : le morceau décodé, injecté dans la même chaîne avec gainDb + gainJeuDb, couches du moteur coupées.
   Mesure : sonie intégrée BS.1770-4 (pondération K, blocs de 400 ms recouverts à 75 %, portes −70 LUFS et −10 LU), en JS dans la page ;
   un rendu est vérifié une fois contre `ffmpeg ebur128` (option --verifier-ffmpeg).
   Pas de réglage manuel : pour chaque morceau, gainJeuDb est cherché pour que la sonie rendue égale celle de la référence à la tension de
   réglage (0,45 par défaut) ; le compresseur de la chaîne (4:1) rend le réglage moins sensible que le gain d'entrée, d'où une recherche
   par sécante. Les deux autres tensions sont ensuite MESURÉES (jamais réglées) et l'écart est publié.
   Usage : node proto-neon/tools/H/niveau.mjs [--url URL] [--reglage 0.45] [--tensions 0.15,0.45,0.75] [--ecrire] [--ids a,b] [--verifier-ffmpeg]
   --ecrire : inscrit gainJeuDb dans musique/morceaux/morceaux.json. */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const FICHE = path.resolve(ICI, '../../musique/morceaux/morceaux.json');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const URL_JEU = arg('--url', 'http://127.0.0.1:8141/proto-neon/index.html');
const REGLAGE = +arg('--reglage', '0.45');
const TENSIONS = arg('--tensions', '0.15,0.45,0.75').split(',').map(Number);
const ECRIRE = process.argv.includes('--ecrire');
const IDS = arg('--ids', '').split(',').filter(Boolean);
const VERIF = process.argv.includes('--verifier-ffmpeg');
const BASE = URL_JEU.replace(/index\.html$/, '') + 'musique/';

const fiche = JSON.parse(fs.readFileSync(FICHE, 'utf8'));
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
const page = await (await browser.newContext({ viewport: { width: 800, height: 450 } })).newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
await page.goto(URL_JEU, { waitUntil: 'load' });
await page.waitForFunction(() => window.__N && window.__N.music && window.__N.music.renderOffline, null, { timeout: 15000 });

/* ---- dans la page : sonie, chargement, rendus ---- */
await page.evaluate(() => {
  function biquad(b, a, x) {                       // forme directe I, a[0] = 1
    const y = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < x.length; i++) { const v = b[0] * x[i] + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; }
    return y;
  }
  function kfilt(x, fs) {
    const G = 3.999843853973347, f0 = 1681.974450955533, Q = 0.7071752369554196, A = Math.pow(10, G / 40), w = 2 * Math.PI * f0 / fs, al = Math.sin(w) / (2 * Q), c = Math.cos(w), sa = 2 * Math.sqrt(A) * al;
    let a0 = (A + 1) - (A - 1) * c + sa;
    const b1 = [A * ((A + 1) + (A - 1) * c + sa) / a0, -2 * A * ((A - 1) + (A + 1) * c) / a0, A * ((A + 1) + (A - 1) * c - sa) / a0], a1 = [1, 2 * ((A - 1) - (A + 1) * c) / a0, ((A + 1) - (A - 1) * c - sa) / a0];
    const fh = 38.13547087602444, Qh = 0.5003270373238773, wh = 2 * Math.PI * fh / fs, alh = Math.sin(wh) / (2 * Qh), ch = Math.cos(wh);
    a0 = 1 + alh;
    const b2 = [(1 + ch) / 2 / a0, -(1 + ch) / a0, (1 + ch) / 2 / a0], a2 = [1, -2 * ch / a0, (1 - alh) / a0];
    return biquad(b2, a2, biquad(b1, a1, x));
  }
  window.__lufs = function (buf, nmax) {          // sonie intégrée d'un AudioBuffer (stéréo ou mono), sur les nmax premiers échantillons si donné
    const fs = buf.sampleRate, ch = []; for (let c = 0; c < buf.numberOfChannels; c++) ch.push(kfilt(nmax ? buf.getChannelData(c).subarray(0, nmax) : buf.getChannelData(c), fs));
    const bl = Math.round(0.4 * fs), hop = Math.round(0.1 * fs), z = [];
    for (let s = 0; s + bl <= ch[0].length; s += hop) { let e = 0; for (const x of ch) { let q = 0; for (let i = s; i < s + bl; i++) q += x[i] * x[i]; e += q / bl; } z.push(e); }
    const lk = e => -0.691 + 10 * Math.log10(e + 1e-20);
    const g1 = z.filter(e => lk(e) > -70);
    if (!g1.length) return -99;
    const rel = lk(g1.reduce((a, b) => a + b, 0) / g1.length) - 10, g2 = g1.filter(e => lk(e) > rel);
    return +lk(g2.reduce((a, b) => a + b, 0) / g2.length).toFixed(3);
  };
  window.__crete = function (buf) { let m = 0; for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) { const v = d[i] < 0 ? -d[i] : d[i]; if (v > m) m = v; } } return +(20 * Math.log10(m + 1e-12)).toFixed(2); };
  window.__dec = async function (url) {
    const ab = await (await fetch(url)).arrayBuffer(), oc = new OfflineAudioContext(2, 1, 44100);
    return await oc.decodeAudioData(ab);
  };
});

/* la piste : piste.json et les 21 blocs, décodés une fois */
const prep = await page.evaluate(async (base) => {
  const piste = await (await fetch(base + 'piste.json')).json(), bufs = {};
  for (let i = 0; i < piste.blocs.length; i++) bufs[i] = await window.__dec(base + piste.blocs[i].fichier);
  window.__piste = piste; window.__bufs = bufs;
  return { blocs: piste.blocs.length, bpm: piste.bpm };
}, BASE);
console.log('piste : ' + prep.blocs + ' blocs décodés, ' + prep.bpm + ' BPM');

async function sonieReference(t) {
  return await page.evaluate(async (t) => {
    const buf = await window.__N.music.renderOffline(100, () => t, [], 44100, null, { piste: window.__piste, buffers: window.__bufs, sections: [{ t: 0, nom: 'jeu' }], sansCouches: true });
    const r = { lufs: window.__lufs(buf), crete: window.__crete(buf) };
    if (window.__garde === undefined) window.__garde = null;
    return r;
  }, t);
}
async function sonieMorceau(id, gainDb, t, gardeWav) {
  return await page.evaluate(async ({ url, gainDb, t, bars, garde }) => {
    const buf = await window.__dec(url);
    const dur = Math.min(buf.duration, 215);
    const out = await window.__N.music.renderOffline(dur, () => t, [], 44100, null, { morceau: { buffer: buf, gainDb, bars } });
    const r = { lufs: window.__lufs(out), crete: window.__crete(out) };
    if (garde) r.lufs60 = window.__lufs(out, 44100 * 60);
    if (garde) { const L = out.getChannelData(0), R = out.getChannelData(1), n = Math.min(out.length, 44100 * 60), b = new Int16Array(n * 2); for (let i = 0; i < n; i++) { b[2 * i] = Math.max(-32768, Math.min(32767, L[i] * 32767)); b[2 * i + 1] = Math.max(-32768, Math.min(32767, R[i] * 32767)); } let s = ''; const u = new Uint8Array(b.buffer); for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode.apply(null, u.subarray(i, i + 8192)); r.pcm = btoa(s); }
    return r;
  }, { url: BASE + 'morceaux/' + fiche.morceaux.find(m => m.id === id).fichier, gainDb, t, bars: fiche.morceaux.find(m => m.id === id).barres, garde: !!gardeWav });
}

const ref = {};
for (const t of TENSIONS) { ref[t] = await sonieReference(t); console.log('référence piste en blocs, tension ' + t + ' : ' + ref[t].lufs + ' LUFS, crête ' + ref[t].crete + ' dBFS'); }

const lignes = [];
for (const m of fiche.morceaux) {
  if (IDS.length && IDS.indexOf(m.id) < 0) continue;
  const base = m.gainDb;
  /* recherche par sécante du gainJeuDb qui égale la référence à la tension de réglage */
  let g = 0, r0 = await sonieMorceau(m.id, base + g, REGLAGE), e0 = ref[REGLAGE].lufs - r0.lufs;
  const essais = [{ g, e: e0, lufs: r0.lufs }];
  for (let k = 0; k < 4 && Math.abs(essais[essais.length - 1].e) > 0.1; k++) {
    const last = essais[essais.length - 1], prev = essais.length > 1 ? essais[essais.length - 2] : null;
    let pente = prev && Math.abs(last.g - prev.g) > 1e-6 ? (last.lufs - prev.lufs) / (last.g - prev.g) : 0.45;     // dB rendus par dB d'entrée (le compresseur 4:1 en rend moins)
    if (!(pente > 0.1 && pente < 1.2)) pente = 0.45;
    g = last.g + last.e / pente;
    const r = await sonieMorceau(m.id, base + g, REGLAGE);
    essais.push({ g, e: ref[REGLAGE].lufs - r.lufs, lufs: r.lufs });
  }
  const best = essais.reduce((a, b) => Math.abs(b.e) < Math.abs(a.e) ? b : a);
  const mesures = {};
  for (const t of TENSIONS) { const r = t === REGLAGE ? { lufs: best.lufs, crete: null } : await sonieMorceau(m.id, base + best.g, t); mesures[t] = { lufs: r.lufs, ecart: +(r.lufs - ref[t].lufs).toFixed(2), crete: r.crete }; }
  const ligne = { id: m.id, gainDb: base, gainJeuDb: +best.g.toFixed(2), essais: essais.length, reglage: { tension: REGLAGE, lufs: best.lufs, ref: ref[REGLAGE].lufs, ecart: +(best.lufs - ref[REGLAGE].lufs).toFixed(2) }, mesures };
  lignes.push(ligne);
  console.log(JSON.stringify(ligne));
}
if (VERIF) {
  const r = await sonieMorceau(fiche.morceaux[0].id, fiche.morceaux[0].gainDb, REGLAGE, true);
  const wav = path.join(ICI, 'verif-ffmpeg.pcm');
  fs.writeFileSync(wav, Buffer.from(r.pcm, 'base64'));
  const o = spawnSync('ffmpeg', ['-hide_banner', '-f', 's16le', '-ar', '44100', '-ac', '2', '-i', wav, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' });
  const m = /I:\s+(-?[\d.]+) LUFS/g, all = [...(o.stderr || '').matchAll(m)];
  console.log('vérification ffmpeg (60 premières secondes de ' + fiche.morceaux[0].id + ') : ffmpeg ' + (all.length ? all[all.length - 1][1] : '?') + ' LUFS, ce script ' + r.lufs60 + ' LUFS');
  fs.unlinkSync(wav);
}
if (ECRIRE) {
  for (const l of lignes) { const m = fiche.morceaux.find(q => q.id === l.id); m.gainJeuDb = l.gainJeuDb; }
  fiche.reglageNiveau = { mesure: 'sonie BS.1770-4 intégrée, rendu hors ligne par la chaîne du jeu', reference: 'piste en blocs, section jeu (PLATEAU), sans les couches du moteur', tensionReglage: REGLAGE, ref: ref, resultat: lignes.map(l => ({ id: l.id, gainJeuDb: l.gainJeuDb, ecarts: Object.fromEntries(Object.entries(l.mesures).map(([t, v]) => [t, v.ecart])) })) };
  fs.writeFileSync(FICHE, JSON.stringify(fiche, null, 2) + '\n');
  console.log('morceaux.json mis à jour (gainJeuDb)');
}
console.log(errs.length ? 'console : ' + JSON.stringify(errs.slice(0, 3)) : 'console vide');
await browser.close();
