/* tools/musique/verifie-navigateur.mjs — les blocs, decodes et enchaines par Chromium (Web Audio).
   node tools/musique/verifie-navigateur.mjs   -> tools/musique/verification-navigateur.json
   1. chaque bloc est decode par decodeAudioData (44,1 et 48 kHz) : longueur, retard de l'encodeur
      applique ou non, decalage du coeur contre le decodage de ffmpeg (correlation, cible < 1 ms) ;
   2. le decalage entre deux blocs voisins est mesure DANS la page, comme le fera le jeu : correlation
      de la mesure d'apres du bloc A contre la premiere mesure du bloc B ;
   3. deux chaines sont rendues par un OfflineAudioContext a 44,1 kHz, avec un AudioBufferSourceNode
      par bloc, demarre a l'echantillon pres, et un fondu de 10 ms centre sur chaque barre :
      la chaine naturelle (nv-01 a nv-17) et une chaine de sauts (boucles, retours, changements de
      section) ; on rend les 200 ms autour de chaque jointure, puis Node les compare a la source et a
      la piste d'origine (pic de derivee, bouffee d'aigus), avec les seuils de verifie.mjs. */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { ICI, PROTO, SOURCE, SORTIE, SR, decode, decalage, dB, arr, quantile } from './lib.mjs';

const P = JSON.parse(fs.readFileSync(path.join(SORTIE, 'piste.json'), 'utf8'));
const serveur = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/' || u === '/vide') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end('<!doctype html><meta charset="utf-8"><title>essai</title>'); }
  const f = path.join(PROTO, path.normalize(u).replace(/^\/+/, ''));
  if (!f.startsWith(SORTIE) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': f.endsWith('.json') ? 'application/json' : 'audio/mpeg' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(ok => serveur.listen(0, '127.0.0.1', ok));
const port = serveur.address().port;
const nav = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await nav.newPage();
const erreurs = []; page.on('pageerror', e => erreurs.push(String(e))); page.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()); });
await page.goto(`http://127.0.0.1:${port}/vide`);

const SAUTS = ['nv-01', 'nv-02', 'nv-05', 'nv-03', 'nv-03', 'nv-08', 'nv-09', 'nv-09', 'nv-11', 'nv-12', 'nv-16', 'nv-15', 'nv-16', 'nv-07', 'nv-17', 'nv-01'];
const res = await page.evaluate(async ({ SAUTS }) => {
  const SRp = 44100, W = 2000;
  const piste = await (await fetch('musique/piste.json')).json();
  const octets = {};
  for (const b of piste.blocs) octets[b.id] = await (await fetch('musique/' + b.fichier)).arrayBuffer();
  async function dec(id, sr) { const c = new OfflineAudioContext(2, 1, sr); return c.decodeAudioData(octets[id].slice(0)); }
  const buf = {}, info = [];
  let memoire44 = 0, memoire48 = 0;
  for (const b of piste.blocs) {
    const t0 = performance.now();
    const a = await dec(b.id, 44100); const tDec = performance.now() - t0;
    const a48 = await dec(b.id, 48000);
    buf[b.id] = a;
    memoire44 += a.length * 8; memoire48 += a48.length * 8;
    const L = a.getChannelData(0), c = b.echantillons.coeurDebut, f = b.echantillons.coeurFin;
    info.push({ id: b.id, longueur: a.length, attendu: b.echantillons.fichier, longueur48: a48.length, decodeMs: Math.round(tDec),
      autourDebut: Array.from(L.subarray(Math.max(0, c - W), c + W)), debutFen: Math.max(0, c - W),
      autourFin: Array.from(L.subarray(f - W, Math.min(L.length, f + W))), finFen: f - W });
  }
  /* decalage relatif de B par rapport a A, par correlation sur la mesure partagee (methode du jeu) */
  function correle(A, B) {
    const x = buf[A.id].getChannelData(0), y = buf[B.id].getChannelData(0);
    const xa = A.echantillons.coeurFin, ya = B.echantillons.coeurDebut, n = Math.round(piste.mesureS * SRp * 0.5), M = 1500;
    let best = -2, bd = 0;
    for (let d = -M; d <= M; d++) { let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i += 2) { const p = x[xa + i], q = y[ya + i + d] || 0; sxy += p * q; sxx += p * p; syy += q * q; } const r = sxy / Math.sqrt(sxx * syy + 1e-20); if (r > best) { best = r; bd = d; } }
    return { d: bd, r: best };
  }
  const blocs = Object.fromEntries(piste.blocs.map(b => [b.id, b]));
  /* rendu d'une chaine ; chaque bloc demarre a l'echantillon entier, fondu sin2/cos2 de 10 ms sur la barre */
  async function rendre(ids, recale) {
    const F = Math.round(0.010 * SRp), H = F >> 1, PRE = Math.round(0.3 * SRp);
    const decs = [0];
    for (let k = 1; k < ids.length; k++) decs.push(recale ? decs[k - 1] + correle(blocs[ids[k - 1]], blocs[ids[k]]).d : 0);
    let T = PRE; const jonctions = [], plan = [];
    for (let k = 0; k < ids.length; k++) { const b = blocs[ids[k]]; plan.push({ b, T, dec: decs[k] }); T += b.echantillons.coeurFin - b.echantillons.coeurDebut; if (k < ids.length - 1) jonctions.push(T); }
    const total = T + PRE;
    const ctx = new OfflineAudioContext(2, total, SRp);
    const montee = new Float32Array(64), descente = new Float32Array(64);
    for (let i = 0; i < 64; i++) { const g = Math.sin(0.5 * Math.PI * i / 63) ** 2; montee[i] = g; descente[i] = 1 - g; }
    plan.forEach((p, k) => {
      const s = ctx.createBufferSource(); s.buffer = buf[p.b.id];
      const g = ctx.createGain(); s.connect(g).connect(ctx.destination);
      /* fondu centre sur la barre, sauf si le bloc entrant n'a rien avant (nv-01) : il commence alors
         sur la barre, et le bloc sortant le suit (ce que fera le jeu) */
      const sansAvant = q => q.b.echantillons.coeurDebut + q.dec < H;
      const dIn = k > 0 && sansAvant(p) ? 0 : H;
      let debut = k === 0 ? p.T : p.T - dIn;                     /* echantillon de sortie */
      const dOut = k < plan.length - 1 && sansAvant(plan[k + 1]) ? 0 : H;
      const tf = p.T + (p.b.echantillons.coeurFin - p.b.echantillons.coeurDebut);
      const fin = k === plan.length - 1 ? tf : tf - dOut + F;
      const off = (p.b.echantillons.coeurDebut + p.dec - (p.T - debut)) / SRp;
      g.gain.setValueAtTime(k === 0 ? 1 : 0, 0);
      if (k > 0) g.gain.setValueCurveAtTime(montee, (p.T - dIn) / SRp, F / SRp);
      if (k < plan.length - 1) g.gain.setValueCurveAtTime(descente, (tf - dOut) / SRp, F / SRp);
      s.start(debut / SRp, off, (fin - debut) / SRp);
    });
    const out = await ctx.startRendering();
    const L = out.getChannelData(0), R = out.getChannelData(1), M = Math.round(0.1 * SRp);
    return { decalages: decs, jonctions: jonctions.map((j, k) => ({ de: ids[k], vers: ids[k + 1], L: Array.from(L.subarray(j - M, j + M)), R: Array.from(R.subarray(j - M, j + M)) })), duree: total / SRp };
  }
  const naturelle = await rendre(piste.blocs.map(b => b.id), true);
  const sauts = await rendre(SAUTS, false);
  return { agent: navigator.userAgent, info, memoire44, memoire48, naturelle, sauts };
}, { SAUTS });
await nav.close(); serveur.close();

/* ---------- analyse dans Node ---------- */
const src = decode(SOURCE);
const ff = new Map(P.blocs.map(b => [b.id, decode(path.join(SORTIE, b.fichier))]));
const blocs = new Map(P.blocs.map(b => [b.id, b]));
const blocsInfo = res.info.map(i => {
  const b = blocs.get(i.id), y = ff.get(i.id).L;
  const x = Float32Array.from(i.autourDebut);
  const r = decalage(x, 500, y, i.debutFen + 500, x.length - 1000, 400);
  return { id: i.id, longueur: i.longueur, attendu: i.attendu, ecart: i.longueur - i.attendu, longueur48: i.longueur48, decodeMs: i.decodeMs,
    decalageFfmpegEch: arr(r.d, 2), decalageFfmpegMs: arr(r.d / SR * 1000, 3), corr: arr(r.corr, 6) };
});
console.log(res.agent);
console.log('decodage Chromium :', blocsInfo.map(b => `${b.id} ${b.decalageFfmpegMs} ms (long ${b.ecart >= 0 ? '+' : ''}${b.ecart}, corr ${b.corr}, ${b.decodeMs} ms)`).join(' | '));

/* seuils sur la piste d'origine, comme verifie.mjs */
const FEN = Math.round(0.008 * SR);
function pics(L, R, j) {
  let d = 0, hf = 0;
  for (let i = Math.max(2, j - FEN); i < Math.min(L.length, j + FEN); i++) d = Math.max(d, Math.abs(L[i] - L[i - 1]), Math.abs(R[i] - R[i - 1]));
  const W = Math.round(0.002 * SR), seg = [];
  for (let c = Math.max(2, j - Math.round(0.098 * SR)); c + W < Math.min(L.length, j + Math.round(0.098 * SR)); c += W) {
    let s = 0; for (let i = c; i < c + W; i++) { const a = L[i] - 2 * L[i - 1] + L[i - 2], b = R[i] - 2 * R[i - 1] + R[i - 2]; s += a * a + b * b; }
    seg.push({ c, s });
  }
  /* rapportee au plus fort des deux voisinages (avant, apres) : un changement de texture n'est pas un clic */
  const av = seg.filter(v => v.c + W < j - FEN).map(v => v.s), ap = seg.filter(v => v.c > j + FEN).map(v => v.s);
  const med = Math.max(av.length ? quantile(av, 0.5) : 0, ap.length ? quantile(ap, 0.5) : 0) + 1e-12;
  for (const v of seg) if (Math.abs(v.c + W / 2 - j) <= FEN) hf = Math.max(hf, v.s / med);
  return { derivee: d, aigusDb: 10 * Math.log10(hf + 1e-12) };
}
const echBarre = m => m <= P.nMesures ? Math.max(0, Math.round(P.mesures[m - 1].t * SR)) : Math.round((P.mesures[P.nMesures - 1].t + P.mesureS) * SR);
const ref = []; for (let m = 2; m <= P.nMesures; m++) ref.push(pics(src.L, src.R, echBarre(m)));
const seuilD = Math.max(...ref.map(r => r.derivee)), seuilH = Math.max(...ref.map(r => r.aigusDb));
const M = Math.round(0.1 * SR);
function juge(j, naturel) {
  const L = Float32Array.from(j.L), R = Float32Array.from(j.R), a = blocs.get(j.de), b = blocs.get(j.vers);
  const p = pics(L, R, M);
  const cA = a.mesures[1] + 1 <= P.nMesures ? pics(src.L, src.R, echBarre(a.mesures[1] + 1)) : { derivee: 0, aigusDb: -99 };
  const cB = b.mesures[0] > 1 ? pics(src.L, src.R, echBarre(b.mesures[0])) : { derivee: seuilD, aigusDb: seuilH };
  const ctxD = Math.max(cA.derivee, cB.derivee), ctxH = Math.max(cA.aigusDb, cB.aigusDb);
  const o = { de: j.de, vers: j.vers, derivee: arr(p.derivee, 4), deriveeContexte: arr(ctxD, 4), aigusDb: arr(p.aigusDb, 1), aigusContexteDb: arr(ctxH, 1) };
  o.ok = p.derivee < seuilD && dB(p.derivee) <= dB(ctxD) + 1 && p.aigusDb <= Math.max(ctxH, seuilH) + 1;
  if (naturel) {                                  /* la chaine naturelle doit redonner la source, cale a l'echantillon */
    const s0 = echBarre(b.mesures[0]) - M;
    const r = decalage(src.L, s0 + 400, L, 400, L.length - 800, 200);
    let eJ = 0, nJ = 0, eH = 0, nH = 0;
    for (let i = 0; i < L.length; i++) { const k = s0 + i; if (k < 0) continue; const e = (L[i] - src.L[k]) ** 2; if (Math.abs(i - M) <= FEN) { eJ += e; nJ++; } else { eH += e; nH++; } }
    o.decalageMs = arr(r.d / SR * 1000, 3); o.corr = arr(r.corr, 4);
    o.rapportDb = arr(10 * Math.log10(src.L.subarray(Math.max(0, s0), s0 + L.length).reduce((s, v) => s + v * v, 0) / (eJ + eH + 1e-20)), 1);
    o.excesSurBruitDb = arr(10 * Math.log10((eJ / nJ + 1e-20) / (eH / nH + 1e-20)), 1);
    /* reference juste : la meme fenetre lue d'un tenant dans A (recouvrement) puis dans B (avant) */
    const seul = (id, c) => { const y = ff.get(id).L; let e = 0, n = 0; for (let i = -FEN; i <= FEN; i++) { const k = echBarre(b.mesures[0]) + i; if (k < 0 || c + i < 0 || c + i >= y.length) continue; e += (y[c + i] - src.L[k]) ** 2; n++; } return e / Math.max(1, n); };
    const eRef = Math.min(seul(a.id, a.echantillons.coeurFin), seul(b.id, b.echantillons.coeurDebut));
    o.excesJointureDb = arr(10 * Math.log10((eJ / nJ + 1e-20) / (eRef + 1e-20)), 1);
    o.ok = o.ok && o.excesJointureDb < 3;
    o.ok = o.ok && Math.abs(o.decalageMs) < 1;
  }
  return o;
}
const nat = res.naturelle.jonctions.map(j => juge(j, true));
const sau = res.sauts.jonctions.map(j => juge(j, false));
console.log('decalages mesures dans la page (chaine naturelle, cumules) :', res.naturelle.decalages.join(' '));
console.log('chaine naturelle :'); for (const j of nat) console.log(' ', j.de, '->', j.vers, 'cale', j.decalageMs, 'ms, corr', j.corr, ', erreur a la jointure / meilleur bloc d un tenant', j.excesJointureDb, 'dB, derivee', j.derivee, '/', j.deriveeContexte, j.ok ? 'OK' : 'ECHEC');
console.log('chaine de sauts :'); for (const j of sau) console.log(' ', j.de, '->', j.vers, 'derivee', j.derivee, '/', j.deriveeContexte, 'aigus', j.aigusDb, '/', j.aigusContexteDb, 'dB', j.ok ? 'OK' : 'ECHEC');
const okDec = blocsInfo.every(b => Math.abs(b.decalageFfmpegMs) < 1);
const ok = okDec && nat.every(j => j.ok) && sau.every(j => j.ok) && erreurs.length === 0;
const bilan = { date: new Date().toISOString().slice(0, 10), navigateur: res.agent, ok, erreurs,
  memoireDecodee: { totale44kOctets: res.memoire44, totale48kOctets: res.memoire48, blocMax44kOctets: Math.max(...res.info.map(i => i.longueur * 8)), blocMax48kOctets: Math.max(...res.info.map(i => i.longueur48 * 8)) },
  seuils: { derivee: arr(seuilD, 4), aigusDb: arr(seuilH, 1) },
  blocs: blocsInfo, decalagesPage: res.naturelle.decalages, chaineNaturelle: nat, chaineSauts: { blocs: SAUTS, jonctions: sau } };
fs.writeFileSync(path.join(ICI, 'verification-navigateur.json'), JSON.stringify(bilan, null, 1));
console.log('memoire decodee : bloc max', arr(bilan.memoireDecodee.blocMax44kOctets / 1048576, 2), 'Mio a 44,1 kHz,', arr(bilan.memoireDecodee.blocMax48kOctets / 1048576, 2), 'Mio a 48 kHz');
console.log('erreurs de page :', erreurs.length, '| BILAN', ok ? 'OK' : 'ECHEC');
process.exit(ok ? 0 : 1);
