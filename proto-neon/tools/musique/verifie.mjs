/* tools/musique/verifie.mjs — verifie les blocs de musique/ a la mesure (lot 7a).
   node tools/musique/verifie.mjs      -> tools/musique/verification.json, code de sortie 1 si un critere tombe
   Pour chaque bloc, decode par ffmpeg (qui applique l'en-tete LAME, comme Chromium et Firefox) :
   1. calage : decalage du coeur du bloc par rapport a la source, par correlation (cible < 1 ms) ;
   2. jointure naturelle A -> A+1 : decalage mesure comme le fera le jeu (correlation sur la mesure
      partagee : la mesure d'apres de A contre la premiere mesure de B), puis raccord par un fondu de
      10 ms centre sur la barre, compare a la source continue : l'erreur dans les 8 ms de la jointure
      ne doit pas depasser de plus de 3 dB celle du plus fidele des deux blocs lu d'un seul tenant sur la
      meme fenetre (A dans son recouvrement, B dans son avant) ;
   3. tous les enchainements de piste.json (suivants et boucles) : pic de derivee et bouffee d'aigus
      dans les 8 ms de la jointure, compares a la piste d'origine sur ses vraies barres de mesure.
   Seuil de clic (le plan, lot 7a) : pic de derivee < le plus fort pic de derivee releve sur une barre
   de mesure de la piste d'origine. On exige en plus que la jointure ne depasse pas de plus de 1 dB le
   plus fort des deux contextes naturels (la barre que A aurait jouee, la barre ou B commence). */
import fs from 'node:fs';
import path from 'node:path';
import { ICI, SOURCE, SORTIE, SR, decode, decalage, dB, arr, quantile } from './lib.mjs';

const P = JSON.parse(fs.readFileSync(path.join(SORTIE, 'piste.json'), 'utf8'));
const src = decode(SOURCE);
const blocs = new Map();
for (const b of P.blocs) blocs.set(b.id, { ...b, pcm: decode(path.join(SORTIE, b.fichier)) });
const FONDU = Math.round(0.010 * SR), DEMI = FONDU >> 1, FEN = Math.round(0.008 * SR);
const echMes = m => Math.round(P.mesures[m - 1].t * SR);              /* debut de la mesure m dans la source */
const echBarre = m => m <= P.nMesures ? Math.max(0, echMes(m)) : Math.round((P.mesures[P.nMesures - 1].t + P.mesureS) * SR);

/* ---- mesures de clic sur un signal stereo autour de l'echantillon j ---- */
function pics(L, R, j) {
  let d = 0, hf = 0, ref = [];
  for (let i = Math.max(2, j - FEN); i < Math.min(L.length, j + FEN); i++) {
    d = Math.max(d, Math.abs(L[i] - L[i - 1]), Math.abs(R[i] - R[i - 1]));
  }
  /* bouffee d'aigus : energie de la derivee seconde par tranches de 2 ms dans la jointure, rapportee a
     sa mediane sur 100 ms avant ou 100 ms apres */
  const W = Math.round(0.002 * SR), seg = [];
  for (let c = j - Math.round(0.1 * SR); c < j + Math.round(0.1 * SR); c += W) {
    let s = 0;
    for (let i = c; i < c + W; i++) { if (i < 2 || i >= L.length) continue; const a = L[i] - 2 * L[i - 1] + L[i - 2], b = R[i] - 2 * R[i - 1] + R[i - 2]; s += a * a + b * b; }
    seg.push({ c, s });
  }
  /* rapportee au plus fort des deux voisinages (avant, apres) : un changement de texture n'est pas un clic */
  const av = seg.filter(v => v.c + W < j - FEN).map(v => v.s), ap = seg.filter(v => v.c > j + FEN).map(v => v.s);
  const med = Math.max(av.length ? quantile(av, 0.5) : 0, ap.length ? quantile(ap, 0.5) : 0) + 1e-12;
  for (const v of seg) if (Math.abs(v.c + W / 2 - j) <= FEN) hf = Math.max(hf, v.s / med);
  return { derivee: d, aigusDb: 10 * Math.log10(hf + 1e-12) };
}

/* reference : les vraies barres de la piste d'origine */
const refBarres = [];
for (let m = 2; m <= P.nMesures; m++) refBarres.push(pics(src.L, src.R, echMes(m)));
const seuilDerivee = Math.max(...refBarres.map(r => r.derivee));
const seuilAigus = Math.max(...refBarres.map(r => r.aigusDb));
console.log('reference (130 barres d origine) : derivee max', arr(seuilDerivee, 4), 'p50', arr(quantile(refBarres.map(r => r.derivee), 0.5), 4),
  '; aigus max', arr(seuilAigus, 1), 'dB p50', arr(quantile(refBarres.map(r => r.aigusDb), 0.5), 1), 'dB');

/* ---- 1. calage de chaque bloc sur la source ---- */
const calages = [];
for (const b of blocs.values()) {
  const c = b.echantillons.coeurDebut, s = Math.round(b.source.debut * SR);
  const long = Math.round(0.5 * SR);
  const r = decalage(src.L, Math.max(0, s), b.pcm.L, c, long, 3000);
  const ecartLong = b.pcm.n - b.echantillons.fichier;
  /* erreur du codec sur le coeur (une fois cale), en dB sous le signal */
  let se = 0, ss = 0;
  for (let i = c; i < b.echantillons.coeurFin; i++) { const k = s + (i - c); if (k < 0 || k >= src.n) continue; const e = b.pcm.L[i + r.entier] - src.L[k]; se += e * e; ss += src.L[k] ** 2; }
  calages.push({ id: b.id, decalageEch: arr(r.d, 2), decalageMs: arr(r.d / SR * 1000, 3), corr: arr(r.corr, 5), ecartLongueur: ecartLong, rapportCodecDb: arr(10 * Math.log10(ss / (se + 1e-20)), 1) });
}
console.log('calage :', calages.map(c => c.id + ' ' + c.decalageMs + ' ms (long ' + c.ecartLongueur + ', codec ' + c.rapportCodecDb + ' dB)').join(' | '));

/* ---- raccord de deux blocs, a la facon du jeu ----
   A joue jusqu'a sa barre de fin, B part de sa barre de debut ; fondu de 10 ms centre sur la barre ;
   dB est le decalage de B mesure par correlation (en echantillons, entier). Rend 200 ms de chaque cote. */
const MARGE = Math.round(0.2 * SR);
function raccord(a, b, decA = 0, decB = 0) {
  const fa = a.echantillons.coeurFin + decA, db = b.echantillons.coeurDebut + decB;
  const L = new Float32Array(2 * MARGE), R = new Float32Array(2 * MARGE);
  for (let i = 0; i < 2 * MARGE; i++) {
    const k = i - MARGE;                                     /* position par rapport a la barre */
    const ia = fa + k, ib = db + k;
    const va = [ia >= 0 && ia < a.pcm.n ? a.pcm.L[ia] : 0, ia >= 0 && ia < a.pcm.n ? a.pcm.R[ia] : 0];
    const vb = [ib >= 0 && ib < b.pcm.n ? b.pcm.L[ib] : 0, ib >= 0 && ib < b.pcm.n ? b.pcm.R[ib] : 0];
    /* fondu centre sur la barre ; si B n'a rien avant sa barre (nv-01 : le morceau commence plein
       pot a t = 0), le fondu commence sur la barre, sinon B entrerait d'un coup a mi-gain */
    const d0 = b.echantillons.coeurDebut + decB < DEMI ? 0 : -DEMI;
    let g; if (k < d0) g = 0; else if (k >= d0 + FONDU) g = 1; else g = Math.sin(0.5 * Math.PI * (k - d0) / FONDU) ** 2;
    L[i] = va[0] * (1 - g) + vb[0] * g; R[i] = va[1] * (1 - g) + vb[1] * g;
  }
  return { L, R, j: MARGE };
}

/* ---- 2. jointures naturelles ---- */
const ordre = [...blocs.values()];
const naturelles = [];
for (let k = 0; k + 1 < ordre.length; k++) {
  const a = ordre[k], b = ordre[k + 1];
  /* la methode du jeu : la mesure d'apres de A (son recouvrement) contre la 1re mesure de B */
  const longM = Math.round(P.mesureS * SR * 0.9);
  const r = decalage(a.pcm.L, a.echantillons.coeurFin, b.pcm.L, b.echantillons.coeurDebut, longM, 2000);
  const rc = raccord(a, b, 0, Math.round(r.d));
  /* comparaison a la source continue autour de la barre */
  const s0 = echBarre(b.mesures[0]) - MARGE;
  let se = 0, ss = 0, emax = 0;
  let eJ = 0, nJ = 0, eH = 0, nH = 0;               /* erreur du codec dans la jointure (+-8 ms) et hors d'elle */
  for (let i = 0; i < 2 * MARGE; i++) {
    const k = s0 + i; if (k < 0) continue; const e = rc.L[i] - src.L[k];
    se += e * e; ss += src.L[k] ** 2; emax = Math.max(emax, Math.abs(e));
    if (Math.abs(i - rc.j) <= FEN) { eJ += e * e; nJ++; } else { eH += e * e; nH++; }
  }
  /* reference juste : la meme fenetre, mais lue d'un seul tenant dans A (son recouvrement) et dans B
     (son avant) ; la jointure ne doit pas etre plus fausse que le plus fidele des deux */
  const errSeul = (blk, centre) => { let e = 0, c = 0; for (let i = -FEN; i <= FEN; i++) { const k = echBarre(b.mesures[0]) + i, x = centre + i; if (k < 0 || x < 0 || x >= blk.pcm.n) continue; e += (blk.pcm.L[x] - src.L[k]) ** 2; c++; } return e / Math.max(1, c); };
  const eA = errSeul(a, a.echantillons.coeurFin), eB = errSeul(b, b.echantillons.coeurDebut + Math.round(r.d));
  const excesDb = 10 * Math.log10((eJ / Math.max(1, nJ) + 1e-20) / (Math.min(eA, eB) + 1e-20));
  const excesBruitDb = 10 * Math.log10((eJ / Math.max(1, nJ) + 1e-20) / (eH / Math.max(1, nH) + 1e-20));
  const pj = pics(rc.L, rc.R, rc.j), po = pics(src.L, src.R, echBarre(b.mesures[0]));
  naturelles.push({ de: a.id, vers: b.id, mesure: b.mesures[0], decalageMs: arr(r.d / SR * 1000, 3), corr: arr(r.corr, 4),
    rapportDb: arr(10 * Math.log10(ss / (se + 1e-20)), 1), excesJointureDb: arr(excesDb, 1), excesSurBruitDb: arr(excesBruitDb, 1), erreurMax: arr(emax, 4), derivee: arr(pj.derivee, 4), deriveeOrigine: arr(po.derivee, 4),
    aigusDb: arr(pj.aigusDb, 1), aigusOrigineDb: arr(po.aigusDb, 1) });
}
console.log('jointures naturelles :'); for (const j of naturelles) console.log(' ', j.de, '->', j.vers, 'm.' + j.mesure, 'decalage', j.decalageMs, 'ms, corr', j.corr, ', raccord / source', j.rapportDb, 'dB, exces d erreur a la jointure', j.excesJointureDb, 'dB, derivee', j.derivee, '(origine', j.deriveeOrigine + ')');

/* ---- 3. tous les enchainements declares ---- */
const enchainements = [];
const paires = [];
for (const a of P.blocs) for (const s of a.suivants) paires.push([a.id, s.id, s.type, s.score]);
for (const bo of P.boucles || []) paires.push([bo.bloc, bo.bloc, 'boucle-' + bo.nom, bo.score, bo]);
for (const [ia, ib, type, score, bo] of paires) {
  const a = blocs.get(ia), b = blocs.get(ib);
  let rc, mFin, mDeb;
  if (bo) {                                                  /* boucle interne : de la barre de fin (a+1) a la barre de debut (de) */
    const fa = Math.round((bo.finS) * SR), db = Math.round(bo.debutS * SR);
    rc = raccord({ ...a, echantillons: { ...a.echantillons, coeurFin: fa } }, { ...b, echantillons: { ...b.echantillons, coeurDebut: db } });
    mFin = bo.a; mDeb = bo.de;
  } else { rc = raccord(a, b); mFin = a.mesures[1]; mDeb = b.mesures[0]; }
  const pj = pics(rc.L, rc.R, rc.j);
  /* contextes naturels : la barre que A aurait jouee, la barre ou B commence ; la mesure 1 n'a pas
     de barre avant elle (le morceau y commence), on la juge alors sur les seuils globaux seuls */
  const ctxA = mFin + 1 <= P.nMesures ? pics(src.L, src.R, echBarre(mFin + 1)) : { derivee: 0, aigusDb: -99 };
  const ctxB = mDeb > 1 ? pics(src.L, src.R, echBarre(mDeb)) : { derivee: seuilDerivee, aigusDb: seuilAigus };
  const ctxD = Math.max(ctxA.derivee, ctxB.derivee), ctxH = Math.max(ctxA.aigusDb, ctxB.aigusDb);
  /* saut de niveau : fin de A contre debut de B, 150 ms de chaque cote */
  const T = Math.round(0.15 * SR);                           /* 150 ms de chaque cote de la barre */
  let ea = 0, eb = 0; for (let i = rc.j - T; i < rc.j; i++) ea += rc.L[i] ** 2 + rc.R[i] ** 2; for (let i = rc.j; i < rc.j + T && i < rc.L.length; i++) eb += rc.L[i] ** 2 + rc.R[i] ** 2;
  const ok = pj.derivee < seuilDerivee && dB(pj.derivee) <= dB(ctxD) + 1 && pj.aigusDb <= Math.max(ctxH, seuilAigus) + 1;
  enchainements.push({ de: ia, vers: ib, type, score, derivee: arr(pj.derivee, 4), deriveeContexte: arr(ctxD, 4), aigusDb: arr(pj.aigusDb, 1), aigusContexteDb: arr(ctxH, 1),
    sautNiveauDb: arr(10 * Math.log10((eb + 1e-12) / (ea + 1e-12)), 1), ok });
}
const ko = enchainements.filter(e => !e.ok);
console.log('enchainements verifies :', enchainements.length, '; hors seuil :', ko.length);
for (const e of ko) console.log('  CLIC ?', e.de, '->', e.vers, e.type, 'derivee', e.derivee, 'contexte', e.deriveeContexte, 'aigus', e.aigusDb, 'contexte', e.aigusContexteDb);
const pire = [...enchainements].sort((x, y) => y.derivee / y.deriveeContexte - x.derivee / x.deriveeContexte).slice(0, 5);
console.log('les 5 jointures les plus vives (derivee / contexte) :', pire.map(e => `${e.de}->${e.vers} ${arr(e.derivee / e.deriveeContexte, 2)}`).join(', '));

/* ---- bilan ---- */
const critCalage = calages.every(c => Math.abs(c.decalageMs) < 1);
const critNat = naturelles.every(j => Math.abs(j.decalageMs) < 1 && j.excesJointureDb < 3 && j.derivee < seuilDerivee && dB(j.derivee) <= dB(j.deriveeOrigine) + 1);
const critEnch = ko.length === 0;
const bilan = {
  date: new Date().toISOString().slice(0, 10),
  criteres: {
    calage: { ok: critCalage, cible: '|decalage| < 1 ms', max: Math.max(...calages.map(c => Math.abs(c.decalageMs))) },
    jointuresNaturelles: { ok: critNat, cible: 'decalage < 1 ms par correlation ; erreur dans la jointure < celle du meilleur bloc lu d un tenant + 3 dB ; pic de derivee < seuil et <= origine + 1 dB',
      excesMaxDb: Math.max(...naturelles.map(j => j.excesJointureDb)),
      decalageMaxMs: Math.max(...naturelles.map(j => Math.abs(j.decalageMs))), rapportMinDb: Math.min(...naturelles.map(j => j.rapportDb)) },
    enchainements: { ok: critEnch, nombre: enchainements.length, horsSeuil: ko.length },
  },
  seuils: { derivee: arr(seuilDerivee, 4), aigusDb: arr(seuilAigus, 1), fonduMs: 10, fenetreMs: 8 },
  calages, naturelles, enchainements,
};
fs.writeFileSync(path.join(ICI, 'verification.json'), JSON.stringify(bilan, null, 1));
console.log('BILAN calage', critCalage ? 'OK' : 'ECHEC', '| jointures naturelles', critNat ? 'OK' : 'ECHEC', '| enchainements', critEnch ? 'OK' : 'ECHEC');
process.exit(critCalage && critNat && critEnch ? 0 : 1);
