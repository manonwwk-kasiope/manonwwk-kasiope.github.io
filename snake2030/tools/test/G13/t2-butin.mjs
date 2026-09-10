/* G13 t2 — butin fusionné : moins de pièces, même valeur.
   Spec : max(S.pickups.length) ≤ 120 (299 avant) avec Σ XP ramassé ≥ 95 % de la valeur actuelle sur la
   même graine. La « valeur actuelle » est mesurée sur le build de référence (HEAD, servi à côté) DANS LA
   MÊME FENÊTRE et avec la même graine, le même pilote et la même durée : comparer à un chiffre noté hier
   comparerait deux machines. L'XP total est reconstruit depuis le niveau et la courbe xpNext, qui n'a pas
   changé entre les deux builds. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { launchDesktop, startGame, save, finish, deadline, sleep, installGod, playFor, HERE, URL as CUR } from '../lib.mjs';
deadline(420, 'G13-t2');

const REPO = path.resolve(HERE, '..', '..', '..');
const REF_FILE = path.join(REPO, 'snake2030', 'index-g13ref.html');
fs.writeFileSync(REF_FILE, execFileSync('git', ['-C', REPO, 'show', 'HEAD:snake2030/index.html'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
const REF = CUR.replace(/index\.html(\?.*)?$/, 'index-g13ref.html');

async function une(url, secs) {
  const ctx = await launchDesktop(1440, 900, { url });
  try {
    await startGame(ctx, { seed: 4242 });
    await ctx.page.evaluate(() => {
      window.__PK = { max: 0, som: 0, n: 0 };
      (function t() { requestAnimationFrame(t); const S = window.__S;
        if (S.phase !== 'play') return;
        if (S.pickups.length > window.__PK.max) window.__PK.max = S.pickups.length;
        window.__PK.som += S.pickups.length; window.__PK.n++; })();
    });
    await installGod(ctx.page);
    await playFor(ctx, secs, { god: true });
    // return await : sans l'await, le finally ferme le navigateur AVANT que la promesse ne soit tenue
    return await ctx.page.evaluate(() => {
      const S = window.__S, P = window.__PK;
      // XP total = seuils franchis + reste courant ; la courbe xpNext(0)=?? est identique des deux côtés
      let xp = S.xp, n = 12;                       // xpNext initial du build (resetRun)
      for (let l = 1; l < S.level; l++) { xp += n; n = Math.round(n * 1.12 + 6); }
      return { maxPickups: P.max, moyPickups: +(P.som / Math.max(1, P.n)).toFixed(1), niveau: S.level,
        xpTotal: Math.round(xp), score: S.score, kills: S.kills, tJeu: Math.round(S.t / 1000), err: window.__ERR.count };
    });
  } finally { await ctx.close(); }
}

/* Averse de butin : 200 pièces d'énergie lâchées au même endroit, ramassées par l'aimant. C'est le cas
   que la fusion doit traiter, et l'invariant qu'elle doit tenir — la valeur voyage, rien ne se perd. Le
   pilote automatique, lui, ne produit jamais assez de butin en une minute pour prouver quoi que ce soit
   (8 butins vivants au maximum mesurés) : cette section-ci est la preuve, l'autre est le contrôle. */
async function averse(url, n) {
  const ctx = await launchDesktop(1440, 900, { url });
  try {
    await startGame(ctx, { seed: 4242 });
    await sleep(1200);
    const o = await ctx.page.evaluate(async n => {
      const S = window.__S;
      S.snake.invuln = 1e9; S.snake.ghost = 1e9;
      const xp0 = S.xp, lv0 = S.level, x = S.snake.x + 60, y = S.snake.y;
      S.pickups.length = 0;
      for (let i = 0; i < n; i++) S.pickups.push({ kind: 'energy', x: x + (i % 7) * 3, y: y + ((i / 7) | 0) % 7 * 3, vx: 0, vy: 0, t: 0, r: 7, val: 1 });
      let max = 0;
      for (let k = 0; k < 240; k++) {
        await new Promise(r => requestAnimationFrame(r));
        if (S.pickups.length > max) max = S.pickups.length;
        S.snake.invuln = 1e9; S.snake.ghost = 1e9;
        if (!S.pickups.length) break;
      }
      let xp = S.xp - xp0, nn = 12;
      for (let l = 1; l < lv0; l++) nn = Math.round(nn * 1.12 + 6);
      for (let l = lv0; l < S.level; l++) { xp += nn; nn = Math.round(nn * 1.12 + 6); }
      return { max, restant: S.pickups.length, xpGagne: Math.round(xp), err: window.__ERR.count };
    }, n);
    return o;
  } finally { await ctx.close(); }
}

const SECS = +(process.env.G13_T2_SECS || 60);
const r = { ref: await une(REF, SECS), cur: await une(CUR, SECS) };
r.averseRef = await averse(REF, 200);
r.averseCur = await averse(CUR, 200);
r.averseRatio = +(r.averseCur.xpGagne / Math.max(1, r.averseRef.xpGagne)).toFixed(3);
try { fs.unlinkSync(REF_FILE); } catch (e) {}
r.ratioXp = +(r.cur.xpTotal / Math.max(1, r.ref.xpTotal)).toFixed(3);
/* Le rapport BRUT de la partie pilotée ne compare pas deux butins, il compare deux parties : le pilote ne
   joue pas le même match d'un build à l'autre (93 kills contre 48, score ×4,2 mesurés à graine égale), et
   toute modification du jeu déplace la suite de tirages. C'est le défaut que le banc documente déjà pour
   la performance. On publie donc le brut, et on juge sur ce qui est comparable : l'XP PAR KILL, et
   surtout l'averse, où la scène est identique des deux côtés. */
r.xpParKill = { ref: +(r.ref.xpTotal / Math.max(1, r.ref.kills)).toFixed(3), cur: +(r.cur.xpTotal / Math.max(1, r.cur.kills)).toFixed(3) };
r.ratioXpParKill = +(r.xpParKill.cur / Math.max(1e-9, r.xpParKill.ref)).toFixed(3);
const pass = r.cur.maxPickups <= 120 && r.ratioXpParKill >= 0.95 && r.cur.err === 0
  && r.averseCur.max <= 120 && r.averseRatio >= 0.95 && r.averseCur.err === 0;
save('G13-t2-butin.json', { test: 'G13-t2', pass, measured: r });
finish('G13-t2', { pass, measured: r, threshold: 'partie pilotée ET averse de 200 butins : max(S.pickups.length) ≤ 120 et Σ XP ≥ 95 % de la référence (HEAD) dans les mêmes conditions (XP de la partie pilotée normalisée par kill : le pilote ne joue pas le même match des deux côtés)' });
