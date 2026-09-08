// Audit ACCUEIL / MENUS / PREMIÈRE MINUTE — aides partagées.
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
export const URL = 'http://127.0.0.1:8112/snake2030/index.html';
export const OUT = '/tmp/claude-0/-home-user-manonwwk-kasiope-github-io/7b0d9e92-8e26-5f74-a679-fd3a5e906236/scratchpad';
export const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function launch(kind, extra = {}) {
  const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader'] });
  const ctxOpts = kind === 'iphone'
    ? { ...devices['iPhone 13 landscape'], hasTouch: true, isMobile: true, ...extra }
    : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, hasTouch: false, isMobile: false, ...extra };
  const context = await browser.newContext(ctxOpts);
  const page = await context.newPage();
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
  const cdp = await context.newCDPSession(page);
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__S && window.__M && window.__M.ui);
  return { browser, context, page, cdp };
}

export function touch(cdp) {
  const mk = pts => pts.map(p => ({ x: p.x, y: p.y, id: p.id || 0, radiusX: 8, radiusY: 8, force: 1 }));
  return {
    start: pts => cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: mk(pts) }),
    move: pts => cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: mk(pts) }),
    end: () => cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }),
    tap: async (x, y) => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: mk([{ x, y }]) }); await sleep(50); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(80); },
  };
}

/** Journal des événements d'interface et des premières fois. */
export async function installProbe(page) {
  await page.evaluate(() => {
    const S = window.__S, M = window.__M;
    const ev = window.__ev = [], rec = window.__rec = [], first = window.__first = {};
    const wrap = (obj, name, fn) => { const o = obj[name]; obj[name] = function () { try { fn.apply(null, arguments); } catch (e) {} return o.apply(this, arguments); }; };
    wrap(M.ui, 'banner', t => ev.push({ t: Math.round(S.t), k: 'banner', s: String(t) }));
    wrap(M.ui, 'toast', (a, b) => ev.push({ t: Math.round(S.t), k: 'toast', s: a + ' | ' + b }));
    wrap(M.ui, 'showScreen', n => ev.push({ t: Math.round(S.t), k: 'screen', s: String(n) }));
    wrap(M.ui, 'showCards', (cards) => ev.push({ t: Math.round(S.t), k: 'cards', s: (cards || []).map(c => c.id + ':' + c.rarity + ':' + c.name + ' — ' + c.desc).join(' || ') }));
    wrap(M.audio, 'sfx', n => { if (n === 'hurt' || n === 'kill' || n === 'pickup' || n === 'levelup' || n === 'dead' || n === 'bossIn' || n === 'ultReady' || n === 'core') { if (!first['sfx:' + n]) first['sfx:' + n] = Math.round(S.t); if (n === 'hurt' || n === 'dead' || n === 'bossIn' || n === 'levelup') ev.push({ t: Math.round(S.t), k: 'sfx', s: n }); } });
    let fi = 0;
    function sample() {
      requestAnimationFrame(sample); fi++;
      const s = S.snake; if (!s) return;
      const o = { fi, now: Math.round(performance.now()), t: Math.round(S.t), phase: S.phase, paused: S.paused, scr: M.ui.screen(), ne: S.enemies.length, nb: S.bullets.length, neb: S.ebullets.length, np: S.pickups.length, len: s.len, kills: S.kills, score: S.score, level: S.level, xp: S.xp, xpNext: S.xpNext, ult: Math.round(S.ult), combo: S.combo, mult: S.mult, coins: S.coins, jactive: S.input.jactive, boost: S.input.boost };
      if (!first.enemy && o.ne > 0 && S.phase === 'play') first.enemy = o.t;
      if (!first.bullet && o.nb > 0) first.bullet = o.t;
      if (!first.ebullet && o.neb > 0) first.ebullet = o.t;
      if (!first.pickup && o.np > 0) first.pickup = o.t;
      if (!first.kill && o.kills > 0) first.kill = o.t;
      if (!first.cards && S.phase === 'cards') first.cards = o.t;
      if (!first.dead && S.phase === 'dead') first.dead = o.t;
      if (!first.boss && S.boss && !S.boss.dead) first.boss = o.t;
      if (!first.ultReady && S.ult >= S.ultMax) first.ultReady = o.t;
      if (!first.level2 && S.level >= 2) first.level2 = o.t;
      rec.push(o);
      if (rec.length > 40000) rec.splice(0, 5000);
    }
    requestAnimationFrame(sample);
  });
}

export async function dump(page) { return page.evaluate(() => ({ ev: window.__ev, first: window.__first, rec: window.__rec })); }

export async function st(page) {
  return page.evaluate(() => { const S = window.__S; return { phase: S.phase, paused: S.paused, scr: window.__M.ui.screen(), t: Math.round(S.t), score: S.score, kills: S.kills, len: S.snake.len, level: S.level, ne: S.enemies.length, lvlUps: S.lvlUps, ult: S.ult, ultMax: S.ultMax, xp: S.xp, xpNext: S.xpNext }; });
}

/** Cap conseillé : vise l'ennemi le plus proche s'il est loin, fuit s'il est près, revient au centre si près du bord. */
export async function aim(page) {
  return page.evaluate(() => {
    const S = window.__S, K = window.__K, s = S.snake;
    let b = null, bd = 1e12;
    for (const e of S.enemies) { if (e.dead) continue; const d = (e.x - s.x) ** 2 + (e.y - s.y) ** 2; if (d < bd) { bd = d; b = e; } }
    const m = 260;
    if (s.x < m) return 0; if (s.x > K.ARENA_W - m) return Math.PI; if (s.y < m) return Math.PI / 2; if (s.y > K.ARENA_H - m) return -Math.PI / 2;
    if (!b) return s.ang;
    const d = Math.sqrt(bd);
    return d < 220 ? Math.atan2(s.y - b.y, s.x - b.x) : Math.atan2(b.y - s.y, b.x - s.x);
  });
}

/** Boîtes et tailles de police des éléments visibles d'un écran. */
export async function inventory(page, sel) {
  return page.evaluate((sel) => {
    const root = document.querySelector(sel); if (!root) return null;
    const out = [];
    const walk = el => {
      for (const c of el.children) {
        const cs = getComputedStyle(c); const r = c.getBoundingClientRect();
        const own = Array.from(c.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim();
        if (r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && (own || c.tagName === 'BUTTON'))
          out.push({ tag: c.tagName.toLowerCase(), cls: c.className && typeof c.className === 'string' ? c.className : '', txt: (own || c.textContent.trim()).slice(0, 60), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), fs: cs.fontSize, color: cs.color, op: cs.opacity });
        walk(c);
      }
    };
    walk(root);
    return out;
  }, sel);
}
