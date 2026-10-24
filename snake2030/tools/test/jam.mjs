// G1 test 1 — brouilleur (jammer) et traqueur (chaser) collés à la tête pendant 5 s,
// avec S.up.tailLaser = 0 puis 2, sur bureau 1440×900 et iPhone 13 paysage.
// Mesures : pageerror, fillRect/s, part d'images brouillées, segments perdus (collisions),
// 5 captures du canevas espacées de 400 ms (md5 distincts).
import { launchDesktop, launchPhone, startGame, installGod, playFor, sleep, md5, OUT, isMain, finish, deadline } from './lib.mjs';

const THRESH = 'par profil et par tailLaser : pageErrors == 0, fillRect ≥ 55/s, jammed ≥ 90 % des images, lenLost ≥ 1, 5 captures (400 ms) toutes différentes';

async function measureProfile(kind) {
  const ctx = kind === 'iphone' ? await launchPhone() : await launchDesktop(1440, 900);
  const { page } = ctx;
  const out = { profile: kind, loadMs: ctx.loadMs };
  try {
    await installGod(page);
    await startGame(ctx);
    await playFor(ctx, 3, { god: true });
    const api = await page.evaluate(() => {
      const M = window.__M;
      return { isJammed: !!(M.enemies && typeof M.enemies.isJammed === 'function'),
        defs: !!(M.enemies && M.enemies.defs && M.enemies.defs.jammer && M.enemies.defs.chaser),
        levels: !!(M.levels && Array.isArray(M.levels.defs)) };
    });
    if (!api.isJammed || !api.defs || !api.levels) { out.missing = api; return out; }
    const canvas = await page.locator('#game').boundingBox();
    for (const tail of [0, 2]) {
      const errs0 = ctx.pageErrors.length, cerr0 = ctx.consoleErrors.length;
      const measuring = page.evaluate(async (tail) => {
        const S = window.__S, M = window.__M, s = S.snake;
        const raf = () => new Promise(r => requestAnimationFrame(r));
        if (!window.__fr) { window.__fr = { n: 0 }; const proto = CanvasRenderingContext2D.prototype; const o = proto.fillRect; proto.fillRect = function () { window.__fr.n++; return o.apply(this, arguments); }; }
        for (const d of M.levels.defs) if (d && d.spawns) d.spawns.length = 0;
        S.enemies.length = 0; S.ebullets.length = 0;
        S.up.tailLaser = tail;
        const spawn = (type, dx, dy, extra) => {
          const d = M.enemies.defs[type];
          const e = { id: 900000 + Math.floor(Math.random() * 1e5), type, x: s.x + dx, y: s.y + dy, vx: 0, vy: 0, ang: 0, t: 0, r: d.r || 14, hp: 99999, maxHp: 99999, dmg: 1, speed: 0, score: 1, xp: 1, color: d.color || '#f0f', elite: false, mod: null, dead: false, hitT: 0 };
          for (const k in d) if (!(k in e)) e[k] = d[k];
          if (d.init) d.init(e);
          Object.assign(e, extra || {});
          S.enemies.push(e); return e;
        };
        const j = spawn('jammer', 0, 0, { speed: 0 });
        const ch = spawn('chaser', 20, 0, { speed: 0 });
        await raf(); await raf();
        const jammedAtStart = M.enemies.isJammed();
        window.__fr.n = 0;
        const t0 = S.t, x0 = s.x, y0 = s.y, err0 = window.__ERR ? window.__ERR.count : null;
        let n = 0, jammed = 0, lenLost = 0, prevLen = s.len, hits = 0;
        // 5 s au minimum, puis jusqu'au signal de fin des captures (plafond 9 s)
        window.__jamStop = false;
        const tStart = performance.now(), tEnd = tStart + 5000, tCap = tStart + 9000;
        while (performance.now() < tEnd || (!window.__jamStop && performance.now() < tCap)) {
          await raf(); n++;
          if (M.enemies.isJammed()) jammed++;
          if (s.len < prevLen) { lenLost += prevLen - s.len; hits++; }
          prevLen = s.len;
          j.x = s.x; j.y = s.y; j.dead = false; j.hp = 99999;
          ch.x = s.x + 20; ch.y = s.y; ch.dead = false; ch.hp = 99999;
          if (S.enemies.indexOf(j) < 0) S.enemies.push(j);
          if (S.enemies.indexOf(ch) < 0) S.enemies.push(ch);
        }
        const secs = (performance.now() - tStart) / 1000;
        const r = { tailLaser: tail, frames: n, secs: +secs.toFixed(2), jammedAtStart, jammedFrames: jammed, jammedPct: +(100 * jammed / n).toFixed(1),
          fillRectPerS: +(window.__fr.n / secs).toFixed(1), lenLost, hits, tAdvancedMs: +(S.t - t0).toFixed(0),
          snakeMoved: +Math.hypot(s.x - x0, s.y - y0).toFixed(0), invuln: +(s.invuln || 0).toFixed(0),
          errCount: window.__ERR ? window.__ERR.count : null, errDelta: (window.__ERR && err0 != null) ? window.__ERR.count - err0 : null };
        j.dead = true; ch.dead = true; S.enemies.length = 0;
        return r;
      }, tail);
      await sleep(700);
      // md5 des pixels du canevas (toDataURL) : le HUD DOM clignote en CSS et fausserait une capture composite ;
      // la capture d'écran est conservée comme pièce à conviction dans out/.
      const hashes = [];
      for (let k = 0; k < 5; k++) {
        const dataUrl = await page.evaluate(() => document.getElementById('game').toDataURL('image/png'));
        hashes.push(md5(dataUrl));
        await page.screenshot({ path: `${OUT}/jam-${kind}-tail${tail}-${k}.png`, clip: canvas });
        await sleep(400);
      }
      await page.evaluate(() => { window.__jamStop = true; });
      const r = await measuring;
      r.pageErrors = ctx.pageErrors.length - errs0;
      r.consoleErrors = ctx.consoleErrors.length - cerr0;
      r.firstError = ctx.pageErrors[errs0] || null;
      r.shotsDistinct = new Set(hashes).size;
      r.shotHashes = hashes.map(h => h.slice(0, 8));
      r.ok = r.pageErrors === 0 && r.fillRectPerS >= 55 && r.jammedPct >= 90 && r.lenLost >= 1 && r.shotsDistinct === 5;
      out['tail' + tail] = r;
      await sleep(800);
    }
  } finally { await ctx.close(); }
  return out;
}

export async function run() {
  const measured = {};
  let missing = false, allOk = true;
  for (const kind of ['desk1440', 'iphone']) {
    const r = await measureProfile(kind);
    measured[kind] = r;
    if (r.missing) { missing = true; allOk = false; continue; }
    if (!r.tail0.ok || !r.tail2.ok) allOk = false;
  }
  return { pass: allOk, measured, threshold: THRESH, code: allOk ? 0 : (missing ? 2 : 1) };
}

if (isMain(import.meta.url)) {
  deadline(400, 'jam');
  const r = await run();
  finish('jam', r);
}
