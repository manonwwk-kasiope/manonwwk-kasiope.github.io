// G7 test 4 — multiplicateur lisible : il vit, il monte haut, un coup le divise sans l'effacer,
// le HUD dit combien de kills manquent, et chaque palier franchi sonne.
//
// QUATRE MESURES, TROIS CHEMINS DE MESURE
//  A. Campagne 'sloppy' (harnais versionné audit/sim-lib.mjs), parties de plus de 60 s :
//       - part des IMAGES DE JEU avec S.mult > 1,01 (le seuil de l'interface, src/26-ui.js:1382) ≥ 40 %
//       - multiplicateur MAX médian ≥ 4
//     Les images sont comptées en fin d'image, dans une enveloppe de __M.ui.hud : frame() appelle
//     ui.hud() en dernier, donc après toute la mise à jour du jeu.
//  B. Un coup reçu PAR LE CHEMIN DU JEU à combo 20 : un ennemi non suicidaire est amené au contact de
//     la tête, c'est collide() qui appelle hurtSnake (src/10-core.js:829). Les trois portes qui font
//     sortir hurtSnake sans rien toucher sont neutralisées : s.invuln = 0, S.up.f_shield = 0 et
//     s.shield = 0, S.up.f_multKeep = 0. Attendu : S.combo === 10 ET S.mult === 2,5 DANS LA MÊME IMAGE
//     (min(12, 1 + floor(10/3) × 0,5)). La même image est vérifiée par un journal image par image :
//     une implémentation qui n'écrirait que combo laisserait mult à 4 jusqu'au prochain kill.
//  C. HUD sur une VRAIE page (pas la simulation) : le texte lu est celui du DOM rendu.
//       - en phase 'play', après un kill et avant l'expiration de multT : /[0-9]+ kills? → ×/
//       - décompte ABSENT à combo 0 et au plafond (mult = 12)
//  D. S2030.audio.sfx('multUp') : compté en ENVELOPPANT __M.audio.sfx depuis la page — jamais par
//     audio.stats(), qui rapporte 0 dans le harnais (AudioContext supprimé, S.opt.sfx = false, et sfx
//     sort avant _audAllow, src/21-audio.js:1107 et 105). Attendu : exactement un appel par
//     franchissement ASCENDANT de palier (2, 4, 8, 12, et 16 là où le plafond est 16), retombées et
//     re-franchissements compris. La comparaison est faite IMAGE PAR IMAGE (sons émis pendant l'image
//     contre paliers franchis entre les deux fins d'image), pas seulement sur le total.
//
// CONTRÔLES SUPPLÉMENTAIRES (mesurés et rapportés, HORS code de sortie) : deux lignes du « quoi » que
// la liste de seuils du test 4 ne nomme pas — le rafraîchissement du décompte à mult constant (cache
// _uiP.mult) et le diviseur de la jauge (multT courant et non 3 200 en dur). Elles sont mesurées sur le
// DOM et rapportées dans controlesSupplementaires : les ajouter au verdict reviendrait à inventer un
// seuil, les taire reviendrait à cacher un HUD qui ment. Le diviseur n'est pas SUPPOSÉ mais MESURÉ —
// la jauge vaut multT / D et les deux sont relevés dans la même lecture, donc D = multT / barre — et il
// est comparé à la durée OBSERVÉE juste après un kill : sur le build du dernier commit la mesure rend
// D = 3 200 pour une durée de 3 200 (jauge juste) ; un multT porté à 5 000 sans toucher à la ligne
// rendrait D = 3 200 pour une durée de 5 000 (jauge collée au maximum 1 800 ms).
import { save, finish, deadline, launchDesktop, startGame, installGod } from '../lib.mjs';
import { ouvrir, partieSure, demarrer, median, pct, r1, r2, PALIERS } from './g7lib.mjs';

deadline(+(process.env.S2030_G7T4_DEADLINE || 2700), 4);

const CIBLE = +(process.env.S2030_G7T4_RUNS || 20);        // parties > 60 s visées
const ESSAIS = +(process.env.S2030_G7T4_ESSAIS || 60);     // tentatives maximales
const MAXT = +(process.env.S2030_G7T4_MAXT || 300000);
const PROFIL = process.env.S2030_G7T4_PROFIL || 'phone';
const SEED0 = +(process.env.S2030_G7T4_SEED || 7400);
const RX = /[0-9]+ kills? → ×/;
const THRESH = 'sloppy, parties > 60 s : images de jeu avec S.mult > 1,01 ≥ 40 % ; mult max médian ≥ 4 ; '
  + 'coup à combo 20 → S.combo = 10 et S.mult = 2,5 dans la même image ; HUD /[0-9]+ kills? → ×/ après un kill, '
  + 'absent au plafond et à combo 0 ; sfx multUp = un par franchissement ascendant de palier';

const m = { seuils: THRESH, A: {}, B: {}, C: {}, D: {} };
let code = 1;

try {
  /* ---------------------------------------------------------------- A et D */
  {
    const sim = await ouvrir(PROFIL);
    const runs = [];
    try {
      for (let i = 0; i < ESSAIS && runs.filter(r => r.retenue).length < CIBLE; i++) {
        const p = await partieSure(sim, { seed: SEED0 + i, pilot: 'sloppy', cards: 'first', diff: 1, maxT: MAXT });
        const retenue = p.dur > 60000;
        runs.push({ i, graine: SEED0 + i, dureeS: r1(p.dur / 1000), retenue, plafond: p.aborted,
          imagesJeu: p.G.playFrames, imagesMult: p.G.multFrames,
          partMultPct: pct(p.G.multFrames, p.G.playFrames), multMax: p.G.multMax,
          franchissements: p.G.cross, franchissementsTotal: p.G.crossTotal,
          multUp: p.G.sfx.multUp | 0, desaccords: p.G.desaccords,
          desaccordsEx: p.G.desaccordsEx.slice(0, 4), kills: p.r.kills, cartes: p.G.opens.length });
      }
      m.erreursPage = sim.errors.slice(0, 5);
      m.incidents = sim.incidents || [];
      m.errCount = await sim.errCount();
    } finally { await sim.close(); }
    const ret = runs.filter(r => r.retenue);
    const frames = ret.reduce((a, r) => a + r.imagesJeu, 0), fm = ret.reduce((a, r) => a + r.imagesMult, 0);
    m.A = {
      tentatives: runs.length, partiesRetenues: ret.length, criteres: 'durée > 60 s',
      imagesDeJeu: frames, imagesAvecMultSup1_01: fm, partImagesMultPct: pct(fm, frames),
      multMaxMedian: median(ret.map(r => r.multMax)), multMax: ret.map(r => r.multMax),
      dureesS: runs.map(r => r.dureeS), partMultParPartiePct: ret.map(r => r.partMultPct)
    };
    m.D = {
      franchissementsTotal: ret.reduce((a, r) => a + r.franchissementsTotal, 0),
      multUpTotal: ret.reduce((a, r) => a + r.multUp, 0),
      partiesAvecDesaccord: ret.filter(r => r.desaccords > 0).length,
      desaccordsTotal: ret.reduce((a, r) => a + r.desaccords, 0),
      parPalier: PALIERS.reduce((o, p) => (o['x' + p] = ret.reduce((a, r) => a + (r.franchissements[p] | 0), 0), o), {}),
      exemplesDesaccord: ret.flatMap(r => r.desaccordsEx).slice(0, 8),
      note: 'un désaccord = une image où le nombre de sons multUp émis diffère du nombre de paliers franchis entre les deux fins d\'image'
    };
    m.A.runs = runs;
  }

  /* -------------------------------------------------------------------- B */
  {
    const sim = await ouvrir(PROFIL);
    try {
      await demarrer(sim.page, { pilot: 'passive', seed: 7777, diff: 1 });
      m.B.tentatives = 0;
      for (let essai = 0; essai < 5 && !m.B.coupObserve; essai++) {
        m.B.tentatives = essai + 1;
        const vivant = await sim.page.waitForFunction(
          () => window.__S.phase === 'play' && window.__S.enemies.some(e => !e.dead && !e.suicide && !e.boss && (e.dmg | 0) >= 1),
          null, { timeout: 30000 }).then(() => true).catch(() => false);
        if (!vivant) { m.B.pourquoi = 'aucun ennemi utilisable au contact (non suicidaire, dmg ≥ 1) après 30 s de jeu'; break; }
        await sim.page.evaluate(() => { window.__simPaused = true; });
        m.B.montage = await sim.page.evaluate(() => {
          const S = window.__S, s = S.snake;
          // les trois portes de hurtSnake (invulnérabilité, bouclier, SANG-FROID) et tout ce qui
          // pourrait tuer l'ennemi ou faire bouger le combo autrement que par le coup
          S.up.f_shield = 0; S.up.f_multKeep = 0; S.up.f_capDamage = 0; S.up.f_ramDamage = 0;
          S.up.f_thorns = 0; S.up.f_iframes = 0; S.up.f_ghostOnHit = 0; S.up.frontCannon = 0;
          s.shield = 0; s.invuln = 0; s.ghost = 0; s.boosting = false;
          s.len = 40; s.hp = 40; s.maxHp = Math.max(s.maxHp || 0, 40);
          S.combo = 20; S.mult = 4; S.multT = 30000;   // multT haut : l'expiration ne doit pas se mêler du coup
          window.__G7.hudLog = true; window.__G7.hud.length = 0;
          const e = S.enemies.filter(e => !e.dead && !e.suicide && !e.boss && (e.dmg | 0) >= 1)[0];
          e.x = s.x; e.y = s.y;                        // au contact : collide() fera le reste
          return { combo: S.combo, mult: S.mult, invuln: s.invuln, shield: s.shield, len: s.len,
            type: e.type, dmg: e.dmg, r: e.r };
        });
        await sim.page.evaluate(() => { window.__simPaused = false; });
        await sim.page.waitForFunction(l => window.__S.snake.len < l || window.__S.phase !== 'play',
          m.B.montage.len, { timeout: 8000 }).catch(() => {});
        const j = await sim.page.evaluate(() => ({
          hud: window.__G7.hud.slice(0, 400), phase: window.__S.phase,
          combo: window.__S.combo, mult: window.__S.mult, len: window.__S.snake.len
        }));
        // l'image du COUP est celle où la longueur baisse (hurtSnake : s.len = max(1, len − dmg)),
        // pas la première où le combo bouge : un kill parasite ferait pointer la mauvaise image
        let idx = -1, prev = { combo: m.B.montage.combo, mult: m.B.montage.mult, len: m.B.montage.len };
        for (let k = 0; k < j.hud.length; k++) { if (j.hud[k].len < prev.len) { idx = k; break; } prev = j.hud[k]; }
        if (idx < 0) { m.B.etatFinal = { phase: j.phase, combo: j.combo, mult: j.mult, len: j.len }; continue; }
        const ap = j.hud[idx];
        const av = idx > 0 ? j.hud[idx - 1] : { combo: m.B.montage.combo, mult: m.B.montage.mult, len: m.B.montage.len };
        m.B.imageDuCoup = ap; m.B.imagePrecedente = av;
        m.B.imagesJournalisees = j.hud.length; m.B.etatFinal = { phase: j.phase, combo: j.combo, mult: j.mult, len: j.len };
        m.B.combo = ap.combo; m.B.mult = ap.mult; m.B.comboAvantLeCoup = av.combo;
        m.B.attendu = { combo: 10, mult: 2.5 };
        m.B.coupObserve = true;                        // la longueur a bien baissé : c'est un vrai coup
        m.B.ok = av.combo === 20 && ap.combo === 10 && Math.abs(ap.mult - 2.5) < 1e-9;
      }
      if (!m.B.coupObserve) m.B.ok = false;
    } finally { await sim.close(); }
  }

  /* -------------------------------------------------------------------- C */
  {
    const ctx = await launchDesktop(1440, 900);
    try {
      await startGame(ctx, { seed: 7778 });
      const page = ctx.page;
      // le serpent est rallongé dès qu'il raccourcit : la lecture du HUD ne doit pas être interrompue
      // par une mort. Les kills, le combo et le multiplicateur, eux, restent ceux du jeu.
      await installGod(page);
      const lire = () => page.evaluate(() => {
        const M = window.__M, S = window.__S;
        const hud = (M.ui && M.ui.hudEl) || document.querySelector('#ui .s2hud');
        const bar = document.querySelector('#ui .s2mult u');
        // barre et multT relevés DANS LA MÊME lecture : comparer une jauge à un multT lu ailleurs
        // fabriquerait un écart qui n'existe pas
        return { texte: hud ? hud.textContent : null, visible: !!(hud && hud.classList.contains('on')),
          phase: S.phase, combo: S.combo, mult: S.mult, multT: Math.round(S.multT),
          multTMax: S.multTMax === undefined ? null : S.multTMax,
          barre: bar ? bar.style.transform : null };
      });
      const frames = n => page.evaluate(n => new Promise(res => {
        let k = 0; const step = () => (++k >= n ? res(true) : requestAnimationFrame(step));
        requestAnimationFrame(step);
      }), n);

      // 1) après un vrai kill, avant l'expiration de multT : le décompte doit être là
      await page.waitForFunction(() => window.__S.combo >= 1 && window.__S.multT > 0, null, { timeout: 40000 });
      await frames(2);
      const apresKill = await lire();
      m.C.apresKill = { texte: (apresKill.texte || '').slice(0, 240), visible: apresKill.visible,
        combo: apresKill.combo, mult: apresKill.mult, multT: apresKill.multT,
        regex: RX.test(apresKill.texte || ''), regexSouple: /kills?\s*→\s*×/.test(apresKill.texte || '') };
      // durée courante de multT OBSERVÉE : la valeur qu'il prend juste après un kill (à deux images près)
      const dureeObservee = apresKill.multT;

      // plus aucun kill à partir d'ici : le canon est retiré et le serpent rendu invulnérable
      await page.evaluate(() => { window.__S.up.frontCannon = 0; window.__S.snake.invuln = 1e9; window.__S.snake.ghost = 1e9; });

      // 2) plafond (mult = 12) : pas de décompte
      await page.evaluate(() => { const S = window.__S; S.combo = 36; S.mult = 12; S.multT = 30000; });
      await frames(3);
      const plafond = await lire();
      m.C.plafond = { texte: (plafond.texte || '').slice(0, 240), combo: plafond.combo, mult: plafond.mult, regex: RX.test(plafond.texte || '') };

      // 3) combo 0 : pas de décompte
      await page.evaluate(() => { const S = window.__S; S.combo = 0; S.mult = 1; S.multT = 0; });
      await frames(3);
      const zero = await lire();
      m.C.comboZero = { texte: (zero.texte || '').slice(0, 240), combo: zero.combo, mult: zero.mult, regex: RX.test(zero.texte || '') };

      // 4) rafraîchissement du décompte à mult constant (contrôle supplémentaire, hors verdict) ;
      //    la première lecture sert aussi de second point de mesure du décompte, à combo 4 (mult > 1,01),
      //    pour distinguer « pas de décompte du tout » de « décompte seulement quand le multiplicateur mord »
      await page.evaluate(() => { const S = window.__S; S.combo = 4; S.mult = 1.5; S.multT = 30000; });
      await frames(3);
      const c4 = await lire();
      m.C.aCombo4 = { texte: (c4.texte || '').slice(0, 240), combo: c4.combo, mult: c4.mult, regex: RX.test(c4.texte || '') };
      await page.evaluate(() => { window.__S.combo = 5; });
      await frames(3);
      const c5 = await lire();

      // 5) diviseur de la jauge (contrôle supplémentaire, hors verdict) : on pose un multT bien inférieur
      //    à toute durée plausible pour que la jauge ne soit pas bornée à 1, puis on en déduit le diviseur
      await page.evaluate(() => { const S = window.__S; S.combo = 4; S.mult = 1.5; S.multT = 2500; });
      await frames(3);
      const jauge = await lire();
      const sx = jauge.barre && /scaleX\(([0-9.]+)\)/.exec(jauge.barre);
      // Le DIVISEUR de la jauge se mesure au lieu de se supposer : la jauge vaut multT / D, et multT est
      // relevé DANS LA MÊME lecture que la barre, donc D = multT / barre. Aucune hypothèse sur le build.
      // La durée courante, elle, est celle observée juste après un kill. La jauge est juste quand les
      // deux coïncident ; un diviseur figé à 3 200 sous une durée de 5 000 colle la jauge au maximum
      // pendant les 1 800 premières millisecondes.
      const valBarre = sx ? +sx[1] : null;
      const diviseur = valBarre ? Math.round(jauge.multT / valBarre) : null;

      m.C.controlesSupplementaires = {
        decompteRafraichi: { texte4: (c4.texte || '').slice(0, 240), texte5: (c5.texte || '').slice(0, 240),
          multIdentique: c4.mult === c5.mult, texteChange: (c4.texte || '') !== (c5.texte || ''),
          ok: c4.mult === c5.mult && (c4.texte || '') !== (c5.texte || '') && RX.test(c5.texte || '') },
        jaugeMultT: { transform: jauge.barre, valeur: valBarre, multTLu: jauge.multT,
          diviseurMesure: diviseur, dureeObserveeApresKill: dureeObservee,
          multTMaxExpose: jauge.multTMax,
          ok: !!diviseur && !!dureeObservee && Math.abs(diviseur - dureeObservee) <= 0.15 * dureeObservee }
      };
      m.C.pageErrors = ctx.pageErrors.slice(0, 3);
      m.C.ok = m.C.apresKill.regex && !m.C.plafond.regex && !m.C.comboZero.regex && m.C.apresKill.visible;
    } finally { await ctx.close(); }
  }

  /* --------------------------------------------------------------- verdict */
  const A = m.A, D = m.D;
  if (A.partiesRetenues < 8) {
    m.pourquoi = 'échantillon insuffisant : ' + A.partiesRetenues + ' parties de plus de 60 s sur '
      + A.tentatives + ' tentatives (8 exigées au minimum pour conclure)';
    code = 2;
  } else if (!m.B.coupObserve) {
    // rien mesuré n'est pas la même chose que mesuré et faux : sans baisse de longueur, aucun coup
    // n'a été porté et la propriété n'a pas été éprouvée
    m.pourquoi = 'coup à combo 20 NON OBSERVÉ après ' + (m.B.tentatives || 0) + ' tentative(s) : '
      + (m.B.pourquoi || 'aucune baisse de longueur après la mise au contact') + ' — mesure B non concluante';
    code = 2;
  } else {
    const c = m.controles = {
      partImagesMult: A.partImagesMultPct >= 40,
      multMaxMedian: A.multMaxMedian >= 4,
      coupCombo20: !!m.B.ok,
      hud: !!m.C.ok,
      multUp: D.multUpTotal === D.franchissementsTotal && D.desaccordsTotal === 0
    };
    code = Object.values(c).every(Boolean) ? 0 : 1;
  }
} catch (e) {
  m.erreur = String(e && e.stack || e).slice(0, 600);
  code = 2;
}

save('G7-t4-multiplicateur.json', m);
finish(4, { pass: code === 0, code, threshold: THRESH, measured: {
  partImagesMultPct: m.A.partImagesMultPct, multMaxMedian: m.A.multMaxMedian, partiesRetenues: m.A.partiesRetenues,
  coup: { combo: m.B.combo, mult: m.B.mult, ok: m.B.ok },
  hud: m.C.ok === undefined ? null : { ok: m.C.ok, apresKill: m.C.apresKill && m.C.apresKill.regex,
    plafond: m.C.plafond && m.C.plafond.regex, comboZero: m.C.comboZero && m.C.comboZero.regex },
  multUp: { emis: m.D.multUpTotal, franchissements: m.D.franchissementsTotal, desaccords: m.D.desaccordsTotal },
  controles: m.controles, pourquoi: m.pourquoi, erreur: m.erreur } });
