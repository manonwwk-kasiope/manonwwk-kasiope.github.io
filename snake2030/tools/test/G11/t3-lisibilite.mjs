/* G11 — test 3 : LISIBILITÉ DES SILHOUETTES, DE LA TÊTE, DES TAILLES, DES TRAITS.
   Seuils (spec) :
     - sonde de contraste DÉCOUPLÉE DU HALO (anneau à 3,6 r + 6 px) : ratio WCAG
       coeur/anneau médian >= 4,5 pour chaque type d'ennemi, et <= 15 % de relevés
       < 3 ; référence d'avant modification relevée avec la MÊME sonde ;
     - tête : cr p50 >= 4,5 et < 10 % de relevés < 3 ;
     - tache blanche, sur 300 images : (a) la composante blanche (R,G,B > 235) la
       plus proche de la tête a une aire >= 20 px² et son centroïde à moins de
       0,6 K.HEAD_R de la tête, sur >= 95 % des images ; (b) aucune composante
       > 20 px² à plus de 2 K.HEAD_R de la tête ET à moins de 1,5 x S.headR d'un
       segment ; (c) images écartées : ennemi à hitT > 0 dans 3 K.HEAD_R, tir
       joueur de moins de 40 ms. L'ATTRIBUTION passe avant le seuil : une
       composante qui tombe sur un ennemi lui est attribuée et n'est pas une
       tache du corps ;
     - traqueur sur iPhone : >= 9 px CSS D'ÉCRAN (tampon x facteur CSS relu sur
       getComputedStyle(canvas).transform) ;
     - aucun trait d'entité ni de télégraphe sous 2 px CSS d'écran, mesuré en
       instrumentant stroke() (le setter de lineWidth ne donne que des unités
       monde) et rapporté comme min(|a|,|d|) x lineWidth x facteur CSS ;
       levels.drawBack, levels.drawFore, phases.drawFloor et phases.gridDraw
       sont exclus NOMMÉMENT.
   Partie increvable, 3 min en 1440x900 et 60 s sur iPhone 13 paysage. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { launchDesktop, launchPhone, startGame, installGod, installProbe, installAutoPilot,
         playDet, sleep, save, finish, deadline, OUT } from '../lib.mjs';
import { SONDE_SRC } from './sonde.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..', '..');
const REF_FILE = path.join(REPO, 'snake2030', 'index-ref.html');
const SEED = 20301;
const DESK_S = +(process.env.G11_DESK_S || 180), PHONE_S = +(process.env.G11_PHONE_S || 60);
deadline(2400, 'G11-t3-lisibilite');

const q = a => { const s = a.slice().sort((x, y) => x - y); return p => s.length ? +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(2) : null; };

async function campagne(url, profil) {
  const ctx = profil === 'iphone' ? await launchPhone({ url }) : await launchDesktop(1440, 900, { url });
  const page = ctx.page;
  await installProbe(page);
  await installGod(page);
  await installAutoPilot(page, { mode: profil === 'iphone' ? 'touch' : 'key', seed: 2030 });
  await startGame(ctx, { seed: SEED });
  await page.evaluate(SONDE_SRC);
  // qualité épinglée : sans elle la dégradation automatique change le rendu jugé
  await page.evaluate(() => { (function t() { requestAnimationFrame(t); const S = window.__S; S.opt.px = (S.opt.px === 1.5 ? 1.4999 : 1.5); })(); });
  const secs = profil === 'iphone' ? PHONE_S : DESK_S;
  const blancs = [];
  await playDet(ctx, secs, {
    period: 120,
    onTick: async () => {
      await page.evaluate(() => window.__g11Contraste());
      // deux relevés par seconde de jeu : la spec en demande 300
      for (let k = 0; k < 2 && blancs.length < 320; k++) {
        const b = await page.evaluate(() => window.__g11Blanc()); if (b) blancs.push(b);
      }
    },
  });
  // épaisseurs : instrumentation coûteuse (pile d'appels par stroke), 25 images
  await page.evaluate(() => window.__g11Traits(true));
  await sleep(700);
  await page.evaluate(() => window.__g11Traits(false));
  const G = await page.evaluate(() => window.__G11);
  const err = await page.evaluate(() => window.__ERR.count);
  await ctx.close();
  return { profil, secs, cr: G.cr, tete: G.tete, taille: G.taille, traits: G.traits, blancs, ignorees: G.ignorees, err,
    pageErrors: ctx.pageErrors.slice(0, 3) };
}

async function campagnes(url, tag) {
  const d = await campagne(url, 'desk');
  const i = await campagne(url, 'iphone');
  return { tag, desk: d, iphone: i };
}

/* ------------------------------------------------------- build de référence */
const html = execFileSync('git', ['-C', REPO, 'show', 'HEAD:snake2030/index.html'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
fs.writeFileSync(REF_FILE, html);
const commit = execFileSync('git', ['-C', REPO, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
const CUR_URL = process.env.S2030_URL || 'http://127.0.0.1:8112/snake2030/index.html';
const REF_URL = CUR_URL.replace(/index\.html(\?.*)?$/, 'index-ref.html');

const cur = await campagnes(CUR_URL, 'cur');
/* G11_NO_REF=1 saute la campagne de référence pendant la mise au point. Par
   défaut elle tourne : le rapport livré porte toujours l'avant/après. */
const ref = process.env.G11_NO_REF ? { tag: 'ref', desk: { cr: [], tete: [], taille: [], traits: [], blancs: [] }, iphone: { cr: [], tete: [], taille: [], traits: [], blancs: [] } } : await campagnes(REF_URL, 'ref');
try { fs.unlinkSync(REF_FILE); } catch (e) {}

/* ------------------------------------------------------------- dépouillement */
function parType(rows) {
  const m = {}, m2 = {};
  for (const r of rows) { (m[r.type] = m[r.type] || []).push(r.cr); (m2[r.type] = m2[r.type] || []).push(r); }
  const out = {};
  for (const k of Object.keys(m)) {
    const v = m[k], Q = q(v);
    // diagnostic (aucun seuil touché) : les deux luminances qui font le rapport
    const co = q(m2[k].map(r => r.coeur)), fo = q(m2[k].map(r => r.fond));
    out[k] = { n: v.length, p50: Q(0.5), p10: Q(0.1), min: Q(0), pctSous3: +(100 * v.filter(x => x < 3).length / v.length).toFixed(1),
               coeurP50: co(0.5), fondP50: fo(0.5), fondP90: fo(0.9) };
  }
  return out;
}
function resume(c) {
  const rows = c.desk.cr.concat(c.iphone.cr);
  const tete = c.desk.tete.concat(c.iphone.tete).map(x => x.cr);
  const Qt = q(tete);
  return {
    parType: parType(rows),
    global: { n: rows.length, pctSous3: +(100 * rows.filter(x => x.cr < 3).length / Math.max(1, rows.length)).toFixed(1) },
    tete: { n: tete.length, p50: Qt(0.5), pctSous3: +(100 * tete.filter(x => x < 3).length / Math.max(1, tete.length)).toFixed(1) },
  };
}
const rc = resume(cur), rr = resume(ref);

const types = Object.keys(rc.parType);
const crKO = types.filter(t => rc.parType[t].p50 < 4.5);
const sous3KO = types.filter(t => rc.parType[t].pctSous3 > 15);
const teteOk = rc.tete.p50 >= 4.5 && rc.tete.pctSous3 < 10;

const blancs = cur.desk.blancs;
const nA = blancs.filter(b => b.a_ok).length;
const pctA = blancs.length ? +(100 * nA / blancs.length).toFixed(1) : 0;
const parasites = blancs.reduce((s, b) => s + b.parasites.length, 0);
const attribues = blancs.reduce((s, b) => s + b.attribuesEnnemi, 0);
const blancA = blancs.length >= 100 && pctA >= 95;
const blancB = parasites === 0;

const tail = cur.iphone.taille.map(x => x.rEcran);
const Qta = q(tail);
const traqueurP50 = Qta(0.5);
const plat = cur.iphone.taille.filter(x => x.persp < 0.01).map(x => x.rEcran);
const basc = cur.iphone.taille.filter(x => x.persp >= 0.01).map(x => x.rEcran);
const traqueurOk = tail.length >= 20 && traqueurP50 >= 9;

const traits = cur.desk.traits.concat(cur.iphone.traits);
const fins = traits.filter(t => t.px < 2);
const traitsOk = traits.length >= 50 && fins.length === 0;

const pass = crKO.length === 0 && sous3KO.length === 0 && teteOk && blancA && blancB && traqueurOk && traitsOk;
const r = {
  test: 'G11-t3-lisibilite', pass,
  seuilsOk: { crParType: crKO.length === 0, pctSous3: sous3KO.length === 0, tete: teteOk, blancA, blancB, traqueur: traqueurOk, traits: traitsOk },
  seuils: 'cr médian ≥ 4,5 par type ; ≤ 15 % de relevés < 3 ; tête p50 ≥ 4,5 et < 10 % < 3 ; tache blanche (a) ≥ 95 % (b) 0 parasite non attribué ; traqueur ≥ 9 px CSS d’écran sur iPhone ; 0 trait d’entité/télégraphe < 2 px CSS',
  sonde: 'anneau DÉCOUPLÉ du halo à 3,6 r + 6 px (QUESTION OUVERTE B) ; positions et pixels lus dans la même image ; épaisseurs instrumentées sur stroke(), min(|a|,|d|) × lineWidth × facteur CSS, décor exclu nommément (levels.drawBack, levels.drawFore, phases.drawFloor, phases.gridDraw)',
  referenceCommit: commit,
  measured: {
    duree: { bureau: DESK_S, iphone: PHONE_S },
    contraste: rc, contrasteReference: rr,
    typesEchecMediane: crKO.map(t => ({ type: t, ...rc.parType[t] })),
    typesEchecPctSous3: sous3KO.map(t => ({ type: t, ...rc.parType[t] })),
    tacheBlanche: { images: blancs.length, pctCritereA: pctA, parasitesNonAttribues: parasites, composantesAttribueesEnnemi: attribues,
      ignorees: cur.desk.ignorees, exemplesParasites: blancs.flatMap(b => b.parasites).slice(0, 8),
      // diagnostic : images où le critère (a) tombe, avec ce que la sonde a vu
      exemplesA: blancs.filter(b => !b.a_ok).slice(0, 6).map(b => ({ dProche: b.dProche, aireProche: b.aireProche, rgbProche: b.rgbProche, rgbTete: b.rgbTete, nComp: b.nComp, blancTotal: b.blancTotal, blancC: b.blancC, teteXY: b.teteXY, invuln: b.invuln, ghost: b.ghost })) },
    traqueurIphone: { n: tail.length, p50PxEcran: traqueurP50, p10: Qta(0.1), min: Qta(0),
      p50Plat: plat.length ? q(plat)(0.5) : null, nPlat: plat.length,
      p50Bascule: basc.length ? q(basc)(0.5) : null, nBascule: basc.length,
      exemple: cur.iphone.taille[Math.floor(cur.iphone.taille.length / 2)] || null,
      note: 'QUESTION OUVERTE A : si la médiane atteint déjà 9 px d’écran, le ×1,35 n’est PAS appliqué' },
    traits: { n: traits.length, minPx: traits.length ? +Math.min(...traits.map(t => t.px)).toFixed(2) : null,
      sous2: fins.length, exemples: fins.slice(0, 10) },
    erreurs: { curDesk: cur.desk.err, curPhone: cur.iphone.err, pageErrors: cur.desk.pageErrors.concat(cur.iphone.pageErrors) },
  },
};
save('G11-t3-lisibilite.json', r);
finish(r.test, { pass, measured: { seuilsOk: r.seuilsOk, contraste: rc.parType, tete: rc.tete, tache: r.measured.tacheBlanche, traqueur: r.measured.traqueurIphone, traits: r.measured.traits }, threshold: r.seuils });
