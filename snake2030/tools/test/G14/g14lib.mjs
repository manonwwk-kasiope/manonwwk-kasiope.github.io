// Outils communs des tests d'acceptation G14.
//
// Deux précautions valent d'être dites une fois :
//   - La mort par un TYPE choisi ne se force pas en écrivant S.run : on attend qu'un
//     ennemi de ce type soit AU CONTACT, et on laisse alors tomber l'invulnérabilité.
//     Le coup part du jeu (collide → hurtSnake → die), pas de la sonde.
//   - _uiFillOver n'est appelé que par ui.showScreen('over'), lui-même appelé 900 ms
//     après die() : on attend l'écran, jamais on ne l'appelle à la place du jeu.
import { sleep, handleCards } from '../lib.mjs';

/** Profil vierge : vide localStorage puis recharge, et attend que le jeu soit prêt. */
export async function fresh(ctx) {
  await ctx.page.evaluate(() => { try { localStorage.removeItem('snake2030.v1'); } catch (e) {} });
  await ctx.page.reload({ waitUntil: 'load' });
  await ctx.page.waitForFunction(() => window.__S && window.__M && window.__M.ui, null, { timeout: 30000 });
}

/** Attend qu'un ennemi du type demandé soit à moins de `dmax` de la tête, puis rend
 *  le serpent mortel (len 2, sans invulnérabilité ni bouclier) et laisse le jeu tuer.
 *  Rend l'état du journal de partie une fois l'écran de fin affiché. */
export async function mortPar(ctx, type, opts = {}) {
  const page = ctx.page, tmax = opts.tmax || 40000, dmax = opts.dmax || 55;
  const t0 = Date.now();
  let arme = false;
  while (Date.now() - t0 < tmax) {
    const st = await page.evaluate(({ type, dmax, arme }) => {
      const S = window.__S, s = S.snake;
      if (!s || S.phase === 'dead') return { phase: S.phase };
      let best = null, bd = 1e9;
      for (const e of S.enemies) {
        if (e.dead || e.type !== type) continue;
        const d = Math.hypot(e.x - s.x, e.y - s.y);
        if (d < bd) { bd = d; best = e; }
      }
      if (best && bd < dmax) {
        s.len = 2; s.hp = 2; s.invuln = 0; s.shield = 0; s.ghost = 0;
        return { phase: S.phase, pret: true, d: bd };
      }
      return { phase: S.phase, pret: false, d: best ? bd : null };
    }, { type, dmax, arme });
    if (st.phase === 'dead') break;
    /* Une carte proposée met le jeu en attente : personne ne meurt tant qu'elle
       n'est pas choisie. On la choisit, comme la joueuse le ferait. */
    if (st.phase === 'cards') { await handleCards(ctx); continue; }
    if (st.pret) arme = true;
    await sleep(40);
  }
  await page.waitForFunction(() => window.__S.phase === 'dead', null, { timeout: 8000 }).catch(() => {});
  await page.waitForFunction(() => window.__M.ui.screen() === 'over', null, { timeout: 6000 }).catch(() => {});
  await sleep(250);
  return page.evaluate(() => ({
    phase: window.__S.phase, screen: window.__M.ui.screen(),
    run: window.__S.run, lastHit: window.__S.lastHit,
    stats: JSON.parse(JSON.stringify(window.__S.stats))
  }));
}

/** Lecture de l'écran de fin affiché : textes, largeurs, troncature des tuiles. */
export const LIRE_OVER = `(() => {
  const sc = document.querySelector('.s2scr.on');
  if (!sc) return null;
  const q = s => sc.querySelector(s);
  const nx = q('.s2next'), nu = q('.s2next>u');
  const tuiles = Array.from(sc.querySelectorAll('.s2tile')).map(t => ({
    label: t.querySelector('s') ? t.querySelector('s').textContent.trim() : '',
    valeur: t.querySelector('b') ? t.querySelector('b').textContent.trim() : '',
    sw: t.querySelector('b') ? t.querySelector('b').scrollWidth : 0,
    cw: t.querySelector('b') ? t.querySelector('b').clientWidth : 0
  }));
  const up = Array.from(sc.querySelectorAll('button')).find(b => /CRAN SUPÉRIEUR/.test(b.textContent));
  return {
    txt: sc.textContent,
    kill: q('.s2kill') ? q('.s2kill').textContent : null,
    tip: q('.s2tip') ? q('.s2tip').textContent : null,
    build: q('.s2build') ? q('.s2build').textContent : null,
    delta: q('.s2delta') ? q('.s2delta').textContent : null,
    recOn: q('.s2rec') ? q('.s2rec').classList.contains('on') : null,
    nextTxt: q('.s2next>s') ? q('.s2next>s').textContent : null,
    nextHidden: nx ? !!nx.hidden : null,
    nextFrac: (nx && nu) ? +(nu.getBoundingClientRect().width / nx.clientWidth).toFixed(4) : null,
    nextH: nx ? +nx.getBoundingClientRect().height.toFixed(2) : null,
    nextClip: nx ? nx.scrollHeight - Math.round(nx.getBoundingClientRect().height) : null,
    nextLabelH: q('.s2next>s') ? +q('.s2next>s').getBoundingClientRect().height.toFixed(2) : null,
    nextUH: nu ? +nu.getBoundingClientRect().height.toFixed(2) : null,
    nextVisible: nx ? (() => { const r = nx.getBoundingClientRect();
      return r.height > 0 && r.y >= 0 && r.y + r.height <= innerHeight; })() : null,
    upVisible: !!(up && up.offsetParent !== null),
    tuiles: tuiles,
    debordeY: sc.scrollHeight - sc.clientHeight,
    debordeX: sc.scrollWidth - sc.clientWidth
  };
})()`;

/** Cran courant et table des coûts, lus dans la page (jamais recopiés à la main). */
export const LIRE_CTX = `(() => {
  const S = window.__S;
  const dif = [1.25, 1.55, 1.90, 2.30, 2.75];
  let di = 1, bd = 1e9;
  for (let i = 0; i < 5; i++) { const d = Math.abs(dif[i] - S.opt.diff); if (d < bd) { bd = d; di = i; } }
  const own = (S.stats.unlocks || {});
  const couts = [['u_len',120],['u_boost',180],['u_start',240],['u_ult',320],['u_shield',400],['u_luck',520]];
  let next = null;
  for (const [id, c] of couts) { if (own[id]) continue; if (!next || c < next[1]) next = [id, c]; }
  return { di, diff: S.opt.diff, coins: S.stats.coins || 0, next: next, level: S.level,
           score: S.score, kills: S.kills, bestByDiff: S.stats.bestByDiff, runs: S.stats.runs };
})()`;

/** Même mise en forme des nombres que _uiNum (espace tous les trois chiffres). */
export function uiNum(n) {
  n = Math.round(n) || 0;
  if (n < 1000) return '' + n;
  const s = '' + n; let out = '', c = 0;
  for (let i = s.length - 1; i >= 0; i--) { out = s.charAt(i) + out; if (++c % 3 === 0 && i > 0) out = ' ' + out; }
  return out;
}
