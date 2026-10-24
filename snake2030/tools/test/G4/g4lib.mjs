// Aides communes aux tests G4 (navigation clavier, focus, légende des touches, capuchons).
// Tout passe par la page réelle : clavier Playwright (CDP Input.dispatchKeyEvent), état S, DOM rendu (getComputedStyle,
// getBoundingClientRect). Aucun repli : si une API du contrat manque, l'appelant sort en code 2.
import { sleep } from '../lib.mjs';

export const SEED = 2030;

/** Attend que `src` (expression JS évaluée dans la page) soit vraie ; rend { ok, ms } sans jamais lever. */
export async function waitFor(page, src, ms = 3000, poll = 10) {
  const t0 = Date.now();
  try {
    await page.waitForFunction(new Function('return (' + src + ')'), null, { timeout: ms, polling: poll });
    return { ok: true, ms: Date.now() - t0 };
  } catch (e) { return { ok: false, ms: Date.now() - t0 }; }
}

/** Écran affiché (ui.screen()), phase et pause en une lecture. */
export async function shot(page) {
  return page.evaluate(() => ({ screen: window.__M.ui.screen(), phase: window.__S.phase, paused: window.__S.paused, t: window.__S.t }));
}

/** Espion sur ui.showCards(cards, cb) (API du contrat) : window.__G4cards = identifiants des cartes dans l'ordre affiché.
 *  Rend false si l'API est absente. */
export async function spyCards(page) {
  return page.evaluate(() => {
    const ui = window.__M && window.__M.ui;
    if (!ui || typeof ui.showCards !== 'function') return false;
    if (ui.__g4spy) return true;
    const orig = ui.showCards;
    ui.showCards = function (cards, cb) { window.__G4cards = (cards || []).map(c => c.id); window.__G4cardsN++; return orig.call(this, cards, cb); };
    ui.__g4spy = true; window.__G4cards = null; window.__G4cardsN = 0;
    return true;
  });
}
export async function lastCards(page) { return page.evaluate(() => window.__G4cards || null); }

/** Cartes affichées : les .s2card réellement rendues (display ≠ none, boîte non vide), dans l'ordre du DOM. */
export async function cardsInfo(page) {
  return page.evaluate(() => Array.from(document.querySelectorAll('.s2card')).map((el, i) => {
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    // échelle rendue : composante a de la matrice de transformation (1 si aucune)
    let scale = 1; const mm = /matrix\(([^,]+),/.exec(cs.transform || ''); if (mm) scale = +(+mm[1]).toFixed(3);
    return { i, tag: el.tagName, shown: cs.display !== 'none' && r.width > 0 && r.height > 0, kf: el.classList.contains('kf'),
      borderWidth: cs.borderWidth, borderTop: cs.borderTopWidth, borderColor: cs.borderTopColor, scale, transform: cs.transform,
      name: (el.querySelector('.nm') || {}).textContent || '', focused: document.activeElement === el };
  }));
}

/** Couleur calculée de var(--cy) telle qu'un élément de #ui la voit (la variable est posée sur #ui, pas sur :root). */
export async function cyColor(page) {
  return page.evaluate(() => { const host = document.getElementById('ui') || document.body; const e = document.createElement('i'); e.style.color = 'var(--cy)'; host.appendChild(e); const c = getComputedStyle(e).color; e.remove(); return c; });
}

/** Mort forcée par une collision réelle : serpent réduit à un segment, sans bouclier ni invulnérabilité, et un projectile
 *  ennemi posé sur la tête à chaque image jusqu'à S.phase === 'dead' (collide → hurtSnake → die, comme en jeu).
 *  Rend { ok, frames }. */
export async function forceDeath(page, maxFrames = 90) {
  for (let k = 0; k < maxFrames; k++) {
    const ph = await page.evaluate(() => {
      const S = window.__S, s = S.snake;
      if (S.phase !== 'play' || !s) return S.phase;
      s.len = 1; s.hp = 1; s.shield = 0; s.invuln = 0; s.ghost = 0;
      S.ebullets.push({ x: s.x, y: s.y, vx: 0, vy: 0, life: 1, r: 14, dmg: 3 });
      return S.phase;
    });
    if (ph === 'dead') return { ok: true, frames: k };
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  }
  return { ok: false, frames: maxFrames };
}

/** Appuie sur `key` et mesure DANS LA PAGE le délai entre le keydown (écouteur en capture sur window) et la première image
 *  (rAF) où `predSrc` est vrai. Rend { ok, ms, nodeMs } ; ok false si le prédicat n'est pas vrai sous maxMs. */
export async function pressTimed(page, key, predSrc, maxMs = 1500) {
  await page.evaluate(pred => {
    const f = new Function('return (' + pred + ')');
    const L = window.__G4L = { t0: null, t1: null, done: false };
    L.h = function () { if (L.t0 == null) L.t0 = performance.now(); };
    addEventListener('keydown', L.h, true);
    (function poll() { if (L.done) return; if (L.t0 != null && L.t1 == null) { let v = false; try { v = !!f(); } catch (e) {} if (v) L.t1 = performance.now(); } if (L.t1 == null) requestAnimationFrame(poll); })();
  }, predSrc);
  const n0 = Date.now();
  await page.keyboard.press(key);
  const w = await waitFor(page, 'window.__G4L && window.__G4L.t1 != null', maxMs, 5);
  const nodeMs = Date.now() - n0;
  const L = await page.evaluate(() => { const L = window.__G4L; L.done = true; removeEventListener('keydown', L.h, true); window.__G4L = null; return { t0: L.t0, t1: L.t1 }; });
  return { ok: w.ok && L.t1 != null, ms: L.t1 != null && L.t0 != null ? +(L.t1 - L.t0).toFixed(1) : null, nodeMs, keydownSeen: L.t0 != null };
}

/** Élément focalisé : où est-il ? (écran .s2scr sans .on, bouton pause, texte) */
export async function activeInfo(page) {
  return page.evaluate(() => {
    const a = document.activeElement, scr = a && a.closest ? a.closest('.s2scr') : null;
    return { tag: a ? a.tagName : null, cls: a ? String(a.className).slice(0, 60) : null, text: a ? (a.textContent || '').trim().slice(0, 24) : null,
      inOffScreen: !!(scr && !scr.classList.contains('on')), isPause: !!(a && a.classList && a.classList.contains('s2pause')),
      inUi: !!(a && a.closest && a.closest('#ui')), screen: window.__M.ui.screen(), phase: window.__S.phase };
  });
}

/** Rendu réel des éléments `sel` : visible = affiché, opaque, dans le viewport, boîte non vide (chaîne d'ancêtres comprise). */
export async function visInfo(page, sel) {
  return page.evaluate(sel => Array.from(document.querySelectorAll(sel)).map(el => {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    let op = 1, vis = true, disp = true;
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const c = getComputedStyle(e); op *= parseFloat(c.opacity); if (c.visibility === 'hidden') vis = false; if (c.display === 'none') disp = false; }
    const inView = r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight;
    return { text: (el.textContent || '').trim().slice(0, 200), opacity: +op.toFixed(3), ownOpacity: +parseFloat(cs.opacity).toFixed(3), fontSize: cs.fontSize, disp,
      visible: disp && vis && op > 0.05 && inView && r.width > 0 && r.height > 0, rect: { x: +r.x.toFixed(0), y: +r.y.toFixed(0), w: +r.width.toFixed(0), h: +r.height.toFixed(0) } };
  }), sel);
}

/** Va de la pause au menu par le bouton ABANDONNER (souris sur bureau). */
export async function quitToMenu(ctx) {
  const { page } = ctx;
  const b = page.locator('#ui button:visible', { hasText: /^ABANDONNER$/ }).first();
  await b.waitFor({ state: 'visible', timeout: 5000 });
  const box = await b.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await waitFor(page, "window.__M.ui.screen() === 'menu'", 3000);
  await sleep(300);
}
