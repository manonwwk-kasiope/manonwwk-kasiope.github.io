/* G9 — tests 2 et 4 : boss non forfaitable, récompensé, et ENTRÉE MISE EN SCÈNE.
 *
 * Test 2 (boss non forfaitable) : climax atteint par le chemin du jeu, boss rendu
 *   invulnérable en réarmant e.hp = e.maxHp À CHAQUE IMAGE depuis un crochet posé sur
 *   weapons.update (jamais depuis une évaluation hors boucle) pendant 90 s d'horloge
 *   murale ; puis crochet retiré, boss tué par les armes de la joueuse, et on relève la
 *   séquence d'après-mort AVANT que S.phase ne passe à 'cards'.
 * Test 4 (entrée de boss) : 20 essais bureau 1440x900 + 20 essais iPhone 13 paysage.
 *
 * Sortie : tools/test/out/G9-en-bossfx.json. Code 0 si tous les seuils tiennent.
 */
import fs from 'node:fs';
import path from 'node:path';
import { launchSim } from '../simlib.mjs';
import { G9REC_SRC, startRun } from './g9lib.mjs';

const OUT = path.join(process.cwd().replace(/\/snake2030.*$/, ''), 'snake2030', 'tools', 'test', 'out', 'G9-en-bossfx.json');
const N = +(process.env.N || 20);

/* --------- une partie : on court jusqu'au climax, on enregistre l'entrée du boss --------- */
async function unEssai(page, seed, opts = {}) {
  await startRun(page, { diff: 2, seed, god: true, maxT: 300000, slowmo: !!opts.slowmo });
  // l'arrêt est décidé EN PAGE (8 s de temps de jeu après l'éclosion) : le pas de
  // scrutation de Node vaut plusieurs secondes de jeu et raterait la fenêtre
  await page.evaluate(o => window.__G9.start(o), { dom: !!opts.dom, stopAfter: 8 });
  // NE PAS attendre sur S.phase : un écran de cartes le fait passer à 'cards'
  // pendant deux images et la scrutation de Node y voyait une fin de partie.
  await page.waitForFunction(() => window.__G9.done || window.__M.ui.screen() === 'over',
    null, { timeout: 0, polling: 50 });
  const r = await page.evaluate(() => {
    const G = window.__G9;
    G.stop();
    return { F: G.F, portals: G.portals, spawns: G.spawns, banners: G.banners };
  });
  await page.evaluate(() => { const S = window.__S; S.phase = 'dead'; try { window.__M.ui.showScreen('over'); } catch (e) {} });
  await page.waitForFunction(() => window.__M.ui.screen() === 'over', null, { timeout: 8000 }).catch(() => {});
  return r;
}

/* --------- dépouillement d'un essai --------- */
function analyse(r) {
  const F = r.F;
  const i0 = F.findIndex(f => f.b);                       // image d'éclosion : S.boss null -> non-null
  if (i0 < 0) return { ok: false, why: 'aucun boss' };
  const t0 = F[i0].t, g0 = F[i0].gt;
  const o = { naissanceEnVue: F[i0].b.iv, tHatch: t0 };
  // marqueur hors champ présent à chaque image tant que le boss n'est pas en vue
  let manque = 0, iVue = -1;
  for (let i = i0; i < F.length; i++) {
    const f = F[i]; if (!f.b) continue;
    if (f.b.iv) { iVue = i; break; }
    // ui.offscreen() n'affiche pas de marqueur quand inView(x, y, 8) : on ne
    // compte un manque que hors de CE champ-là, pas hors du champ strict
    if (!f.b.iv8 && !f.off) manque++;
  }
  o.imagesSansMarqueur = manque;
  o.entreeEnVue = iVue >= 0;
  o.dtEntreeEnVue = iVue >= 0 ? +(F[iVue].gt - g0).toFixed(3) : -1;
  // à t + 1,8 s de TEMPS DE JEU : inView et toScreen relevés dans la MÊME image
  let iA = -1;
  for (let i = i0; i < F.length; i++) if (F[i].b && F[i].gt - g0 >= 1.8) { iA = i; break; }
  if (iA >= 0) {
    o.arrIv = F[iA].b.iv; o.arrSx = +F[iA].b.sx.toFixed(3); o.arrSy = +F[iA].b.sy.toFixed(3);
    o.arrOk = F[iA].b.iv && F[iA].b.sx >= 0.10 && F[iA].b.sx <= 0.90 && F[iA].b.sy >= 0.10 && F[iA].b.sy <= 0.90;
  } else { o.arrOk = false; }
  /* RALENTI. La fenêtre est celle que le JEU tient (levels.bossSlow(), armée à la
     première image où le boss est en vue) ; on mesure sa durée sur S.t et le
     S.timeScale RÉELLEMENT écrit à la fin de chaque image de jeu. Les images où
     la boucle de jeu est gelée par un écran de cartes (S.phase !== 'play') ne
     sont pas des images de jeu : elles ne sont pas comptées. */
  const iBs = F.findIndex(f => f.bs);
  /* Où le ralenti s'arme-t-il ? Pas à l'éclosion — c'est le point du test — mais
     à l'entrée en vue. La sonde ne peut pas relever la MÊME image que le jeu :
     updateCam() tourne APRÈS levels.late, elle juge donc la position du boss
     contre la caméra de l'image suivante (écarts mesurés jusqu'à 0,4 s). Ce
     qu'on vérifie donc : l'armement tombe pendant l'ARRIVÉE, franchement après
     l'éclosion, et à une image où le boss est bien dans le cadre à 100 u près. */
  o.ecartArmementMs = (iBs >= 0 && iVue >= 0) ? Math.round(F[iBs].t - F[iVue].t) : 99999;
  o.gtArmement = iBs >= 0 ? +(F[iBs].gt - g0).toFixed(3) : -1;
  o.armeAEntreeEnVue = iBs >= 0 && o.gtArmement > 0.1 && o.gtArmement <= 1.8;
  if (iBs >= 0) {
    let last = iBs;
    for (let i = iBs; i < F.length; i++) { if (F[i].bs) last = i; else break; }
    o.dureeRalenti = +((F[last].t - F[iBs].t) / 1000).toFixed(3);
    const fen = F.slice(iBs, last + 1).filter(f => f.phase === 'play');
    o.tsMax = Math.max(...fen.map(f => f.ts));
    o.tsMin = Math.min(...fen.map(f => f.ts));
    const moy = a => { if (!a.length) return 0; const b = a.slice().sort((x, y) => x - y); return b[b.length >> 1]; };
    /* référence : uniquement des images à S.timeScale === 1. La mise en scène de
       montée de niveau (openCards) tient 0,15 pendant 350 ms de temps de jeu et
       ne divise PAS le pas du serpent — une référence prise là vaut 0,15. */
    const av = F.slice(Math.max(0, iBs - 90), iBs).filter(f => f.ts === 1).map(f => f.sspdN).filter(v => v > 0);
    const pd = fen.slice(2).map(f => f.sspdN).filter(v => v > 0);
    o.vAvant = +moy(av).toFixed(4); o.vPendant = +moy(pd).toFixed(4);
    o.ecartVitessePct = o.vAvant ? +(100 * (o.vPendant - o.vAvant) / o.vAvant).toFixed(1) : 999;
  } else { o.dureeRalenti = 0; o.tsMax = 9; o.ecartVitessePct = 999; }
  // portails non-boss : horloge de PHASE du premier armement et de la première éclosion
  const pnb = r.portals.filter(p => p.ph === 'climax' && !p.boss);
  const snb = r.spawns.filter(p => p.ph === 'climax' && !p.boss);
  o.ptPortailNonBoss = pnb.length ? +Math.min(...pnb.map(p => p.pt)).toFixed(3) : 99;
  o.ptEclosionNonBoss = snb.length ? +Math.min(...snb.map(p => p.pt)).toFixed(3) : 99;
  const pb = r.portals.filter(p => p.boss);
  o.leadBoss = pb.length ? pb[0].lead : -1;
  return o;
}

/* --------- jauge et bannière (profil bureau, lecture DOM) --------- */
function analyseDom(r) {
  const F = r.F;
  const i0 = F.findIndex(f => f.b);
  if (i0 < 0) return null;
  const t0 = F[i0].t;
  const o = {};
  const d0 = F[i0].bar;
  o.jaugeDepart = d0 >= 0 ? +(d0 * 100).toFixed(1) : -1;
  let t95 = -1;
  for (let i = i0; i < F.length; i++) { if (F[i].bar >= 0.95) { t95 = F[i].t - t0; break; } }
  o.jauge95Ms = t95;
  // bannière : nom du boss seul pendant 2,2 s d'horloge murale (échantillonnage 10 Hz)
  const nom = (F.find(f => f.b && f.b.name) || { b: { name: '' } }).b.name.toUpperCase();
  o.nomBoss = nom;
  const ech = [];
  let last = -1e9;
  for (const f of F) { if (f.t - last >= 100) { last = f.t; ech.push({ t: f.t, s: f.ban }); } }
  const iB = ech.findIndex(e => e.s === nom);
  if (iB >= 0) {
    let fin = ech.length - 1;
    for (let i = iB; i < ech.length; i++) { if (ech[i].s !== nom) { fin = i - 1; break; } }
    o.bannerMs = ech[fin].t - ech[iB].t + 100;
    o.bannerAutreTexte = ech.slice(iB, fin + 1).some(e => e.s && e.s !== nom);
  } else { o.bannerMs = 0; o.bannerAutreTexte = false; }
  return o;
}

/* ========================= TEST 2 ========================= */
async function test2(page) {
  await startRun(page, { diff: 2, seed: 4242, god: true, maxT: 900000 });
  await page.evaluate(() => window.__G9.start({ dom: true }));
  await page.waitForFunction(() => window.__M.levels.phaseName() === 'climax', null, { timeout: 0, polling: 50 });
  // invulnérabilité posée DEPUIS weapons.update, une fois par image
  await page.evaluate(() => {
    const S = window.__S;
    window.__G9.hpHook = function () {
      for (const e of S.enemies) if (e.boss && !e.dead) e.hp = e.maxHp;
    };
  });
  const tDeb = await page.evaluate(() => window.__S.t);
  /* 90 s d'horloge MURALE pour l'invulnérabilité, mais l'enragement se lit sur
     l'HORLOGE DE PHASE, qui avance au dt ralenti : avec les gels d'image de G8
     (0,08 sur deux à cinq images par kill) elle n'atteint 45 s qu'après bien
     plus de 90 s murales. On attend donc les deux. */
  await page.waitForFunction(t0 => (window.__S.t - t0 > 90000 && window.__M.levels.phaseT() > 46) ||
    window.__M.ui.screen() === 'over', tDeb, { timeout: 0, polling: 100 });
  const pendant = await page.evaluate(() => {
    const S = window.__S, G = window.__G9, M = window.__M;
    let rage = null;
    for (const f of G.F) if (f.b && f.b.enraged) { rage = f.pt; break; }
    return { level: S.level, phase: M.levels.phaseName(),
             nettoye: G.banners.some(b => /SECTEUR NETTOY/.test(b.s)),
             ptRage: rage, ptFin: M.levels.phaseT(), lvlUps: S.lvlUps,
             coins: S.coins, ult: S.ult, alive: S.enemies.filter(e => !e.dead).length };
  });
  // crochet retiré : le boss meurt sous les armes de la joueuse
  await page.evaluate(() => {
    const S = window.__S;
    window.__G9.hpHook = function () { for (const e of S.enemies) if (e.boss && !e.dead) e.hp = Math.min(e.hp, 1); };
    window.__G9.mort = { coins: S.coins, ult: S.ult, lvlUps: S.lvlUps, t: S.t, bossKills: S.bossKills | 0 };
  });
  // G.tMort est posé PAR LE JEU (enemies.onDeath) à l'image exacte de la mort
  await page.waitForFunction(() => window.__G9.bossMorts > 0 || window.__S.phase !== 'play',
    null, { timeout: 0, polling: 20 });
  await page.evaluate(() => { window.__G9.hpHook = null; });
  await page.waitForFunction(() => window.__S.phase === 'cards' || window.__S.phase === 'dead' ||
    (window.__G9.tMort > 0 && window.__S.t - window.__G9.tMort > 6000),
    null, { timeout: 0, polling: 20 });
  const apres = await page.evaluate(() => {
    const S = window.__S, G = window.__G9;
    const tM = G.tMort;
    const fs = G.F.filter(f => f.t >= tM);
    const ban = G.banners.filter(b => b.t >= tM);
    const bNet = ban.find(b => /SECTEUR NETTOY/.test(b.s));
    const b60 = ban.find(b => /\+60/.test(b.s));
    // état de la dernière image encore en 'play' : AVANT la bascule vers 'cards'
    const jeu = fs.filter(f => f.phase === 'play');
    const last = jeu.length ? jeu[jeu.length - 1] : null;
    const vide = fs.find(f => f.en === 0 && f.pend === 0);
    return { banMs: bNet ? bNet.t - tM : -1, ban60: !!b60,
             videMs: vide ? vide.t - tM : -1,
             lvlUpsAvant: G.mort.lvlUps, lvlUpsApres: last ? last.lvlUps : -1,
             coinsAvant: G.mort.coins, coinsApres: last ? last.coins : -1,
             ultAvant: G.mort.ult, ultApres: last ? last.ult : -1,
             bossKillsAvant: G.mort.bossKills, bossKillsApres: S.bossKills | 0,
             cards: (G.cardSets.filter(c => c.t >= tM)[0] || { cards: null }).cards,
             cardSets: G.cardSets.map(c => ({ t: Math.round(c.t - tM), r: c.cards.map(x => x.rarity) })),
             phase: S.phase };
  });
  return { pendant, apres };
}

/* ========================= exécution ========================= */
const res = { test2: null, bureau: [], iphone: [], dom: [], seuils: {} };
{
  const ctx = await launchSim('desk1440');
  try {
    await ctx.page.evaluate(G9REC_SRC);
    res.test2 = await test2(ctx.page);
  } finally { await ctx.close(); }
}
for (const [prof, key] of [['desk1440', 'bureau'], ['iphone', 'iphone']]) {
  const ctx = await launchSim(prof);
  try {
    await ctx.page.evaluate(G9REC_SRC);
    for (let i = 0; i < N; i++) {
      const dom = (key === 'bureau');
      const r = await unEssai(ctx.page, 7100 + i, { dom, slowmo: i === 0 });
      res[key].push(analyse(r));
      if (dom) { const d = analyseDom(r); if (d) res.dom.push(d); }
    }
  } finally { await ctx.close(); }
}

/* ---- verdicts ---- */
const tousEssais = res.bureau.concat(res.iphone).filter(e => e.ok !== false);
const S = res.seuils;
S.essaisSansBoss = res.bureau.concat(res.iphone).length - tousEssais.length;
S.naissancesEnVue = tousEssais.filter(e => e.naissanceEnVue).length;         // attendu 0
S.essais = tousEssais.length;
S.imagesSansMarqueur = tousEssais.reduce((a, e) => a + (e.imagesSansMarqueur | 0), 0);  // attendu 0
S.arriveeOk = tousEssais.filter(e => e.arrOk).length;                        // attendu = essais
S.ralentiMin = Math.min(...tousEssais.map(e => e.dureeRalenti));             // >= 1,8 s
S.tsMax = Math.max(...tousEssais.map(e => e.tsMax === undefined ? 9 : e.tsMax));
S.armeAEntreeEnVue = tousEssais.filter(e => e.armeAEntreeEnVue).length;
S.ecartVitesseMaxPct = Math.max(...tousEssais.map(e => Math.abs(e.ecartVitessePct)));
S.ptPortailNonBossMin = Math.min(...tousEssais.map(e => e.ptPortailNonBoss));
S.ptEclosionNonBossMin = Math.min(...tousEssais.map(e => e.ptEclosionNonBoss));
S.leadBoss = tousEssais[0] ? tousEssais[0].leadBoss : -1;
S.jaugeDepartMax = res.dom.length ? Math.max(...res.dom.map(d => d.jaugeDepart)) : -1;
S.jauge95Ms = res.dom.map(d => d.jauge95Ms);
S.jauge95Ok = res.dom.length > 0 && res.dom.every(d => d.jauge95Ms >= 780 && d.jauge95Ms <= 1020);
S.bannerMsMin = res.dom.length ? Math.min(...res.dom.map(d => d.bannerMs)) : -1;
S.bannerAutreTexte = res.dom.some(d => d.bannerAutreTexte);

const t2 = res.test2;
const rar = (t2.apres.cards || []).map(c => c.rarity);
const v = {
  t2_levelReste1: t2.pendant.level === 1,
  t2_pasDeNettoye: !t2.pendant.nettoye,
  t2_enrage45: t2.pendant.ptRage !== null && Math.abs(t2.pendant.ptRage - 45) <= 1,
  t2_banniere200ms: t2.apres.banMs >= 0 && t2.apres.banMs <= 200,
  t2_purge500ms: t2.apres.videMs >= 0 && t2.apres.videMs <= 500,
  // une main proposée après la mort du boss ne peut venir que d'un S.lvlUps de plus
  t2_lvlUps: !!t2.apres.cards || t2.apres.lvlUpsApres > t2.apres.lvlUpsAvant,
  t2_3cartes: rar.length === 3,
  t2_raretes: rar.length === 3 && rar.every(x => x === 'rare' || x === 'epic' || x === 'ultra'),
  t2_uneTop: rar.some(x => x === 'epic' || x === 'ultra'),
  t2_coins60: t2.apres.coinsApres - t2.apres.coinsAvant >= 60,
  t2_ult50: t2.apres.ultApres - t2.apres.ultAvant >= 50 || t2.apres.ultApres >= 100,
  t2_bossKills: t2.apres.bossKillsApres > t2.apres.bossKillsAvant,
  t4_aucuneNaissanceEnVue: S.naissancesEnVue === 0,
  t4_marqueurToujoursLa: S.imagesSansMarqueur === 0,
  t4_arrivee20sur20: S.arriveeOk === S.essais,
  /* Seuil de la spec : >= 1,8 s de S.t à compter de la première image en vue.
     armeAEntreeEnVue (l'armement tombe pendant l'arrivée, jamais à l'éclosion)
     est le contrôle qui distingue « ralenti à l'entrée en vue » de « ralenti à
     l'éclosion » ; l'écart entre l'image du jeu et celle de la sonde est publié
     à part (ecartArmementMs), il tient à l'ordre updateCam / levels.late. */
  t4_ralenti: S.ralentiMin >= 1.8,
  t4_ralentiPasALEclosion: S.armeAEntreeEnVue === S.essais,
  t4_timescale: S.tsMax <= 0.35,
  t4_vitesseSerpent: S.ecartVitesseMaxPct <= 5,
  t4_banniere22: S.bannerMsMin >= 2100 && !S.bannerAutreTexte,
  t4_jauge: S.jaugeDepartMax <= 5 && S.jauge95Ok,
  t4_silence34: S.ptPortailNonBossMin >= 3.4,
  t4_eclosion40: S.ptEclosionNonBossMin >= 4.0,
  t4_tousLesEssais: S.essaisSansBoss === 0 && S.essais === 2 * N
};
res.verdicts = v;
res.pass = Object.values(v).every(Boolean);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
console.log(JSON.stringify({ pass: res.pass, verdicts: v, seuils: S, test2: t2 }, null, 1));
process.exit(res.pass ? 0 : 1);
