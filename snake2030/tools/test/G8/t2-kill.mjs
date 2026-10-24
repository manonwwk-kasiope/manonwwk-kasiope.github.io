/* G8 — test 2 : le kill se voit, s'entend et se sent.
 *
 * Spécification : « Bot 60 s avec crochet mettant hp = 1 aux traqueurs : appels fx.text === nombre de
 * kills ; audio.lastSfx() : sur 5 kills en 3 s, f0(5)/f0(1) ≥ 1,25 et strictement croissant ;
 * S.shake ≥ 4,0 l'image suivant un kill ordinaire ; luminance locale (fenêtre 120 px écran autour de
 * l'ennemi tué) ≥ +12 points à zoom 0,78 comme à 1,35 ; hitstopLeft() > 0 sur 2 images après chaque
 * kill ; déplacement de S.cam ≥ 2,5 u opposé au tir dans les 2 images. »
 *
 * QUATRE SECTIONS, chacune mesurée là où elle est mesurable :
 *   A — partie pilotée de 60 s de TEMPS DE JEU (pilote déterministe de tools/test/lib.mjs, pas de
 *       temps imposé 1/60), traqueurs ramenés à hp = 1 : compte des textes de score contre le nombre
 *       de kills, et hitstopLeft() > 0 sur les deux images qui suivent chaque kill.
 *   B — laboratoire : 5 kills en moins de 3 s de jeu, hauteur du son lue par audio.lastSfx() dans
 *       l'image même du kill (crochet sur audio.setIntensity, après collide).
 *   C — laboratoire, PIXELS : luminance moyenne d'une fenêtre de 120 × 120 px d'écran centrée sur
 *       l'ennemi, lue sur le canvas du jeu en FIN d'image (le canvas contient alors l'image rendue),
 *       à deux zooms de caméra réellement atteints (≈ 0,78 et ≈ 1,35, vérifiés par phases.zoom()).
 *   D — laboratoire, caméra libre : recul de S.cam opposé au vecteur du tir, et amplitude de secousse.
 *
 * DEUX PRÉCISIONS DE MESURE, consignées parce qu'elles changent le chiffre :
 *  - « appels fx.text === nombre de kills » se mesure sur les textes de SCORE (chaîne commençant par
 *    « + ») ; les autres textes du jeu (nom de carte, « IL FUIT ! », « ENCERCLÉ »…) sont comptés à
 *    part et rapportés, jamais confondus.
 *  - « S.shake ≥ 4,0 » se lit au PIC, c'est-à-dire dans l'image du kill au moment où la caméra s'en
 *    sert (crochet posé après updateCam et avant fx.update, donc avant l'amortissement de l'image).
 *    La valeur de fin d'image, plus faible d'un amortissement (× 0,879 − 0,02 à 60 im/s), est
 *    rapportée à côté : les deux chiffres sont dans le JSON.
 *
 * Sortie : out/G8-t2-kill.json.
 */
import { launchDesktop, startGame, finish, save, deadline, installProbe, installAutoPilot,
         installGod, playDet } from '../lib.mjs';
import { installArena, installLab, installFrameProbe, installSpies, readProbe, readSpies, clearProbeBufs,
         arm, waitFired, waitFrames, reqRect, waitPx, toScreenCss, canvasInfo,
         r2, r3, SEED } from './g8lib.mjs';

const BOT_SECS = +(process.env.S2030_G8T2_SECS || 60);
const WIN_PX = 120;                       // fenêtre de luminance locale, pixels d'écran
const ZOOMS = [0.78, 1.35];

/* Kill du n-ième ennemi de laboratoire encore vivant, par un projectile joueur déposé sur lui.
   Le vecteur du tir est +x : le recul de caméra attendu est donc vers −x. */
const ACT_KILL = `
  const list = S.enemies.filter(x => x.id >= 900000 && !x.dead);
  if (!list.length) throw new Error('aucun ennemi de laboratoire');
  const e = list[0];
  window.__lab.bullet(e.x, e.y, 300, 0, { dmg: 9999, r: 5 });
  return { ex: e.x, ey: e.y, elite: !!e.elite, combo: S.combo, kills: S.kills, ang: 0 };
`;

/* ------------------------------------------------------------------ A ----- */
async function sectionA(out) {
  // pas de temps imposé dès le chargement + tout posé AVANT le clic sur JOUER : sans cela la partie
  // avance d'un nombre variable d'images avant que le pilote ne prenne la main, et deux exécutions du
  // même build divergent
  const ctx = await launchDesktop(1440, 900, { init: ['window.__DT = 1/60;'] });
  try {
    const { page } = ctx;
    await installProbe(page);                          // requis par installAutoPilot
    await installFrameProbe(page, { cap: 20000 });
    await installSpies(page, { cap: 40000, skip: ['burst', 'ring', 'flash'] });
    await installAutoPilot(page, { mode: 'key', seed: SEED, ult: false, special: false });
    await installGod(page);
    // crochet de la spécification : les traqueurs tombent au premier coup
    await page.evaluate(() => {
      window.__hp1 = 0;
      (function g() {
        requestAnimationFrame(g);
        const S = window.__S;
        for (const e of S.enemies) if (e.type === 'chaser' && !e.dead && e.hp > 1) { e.hp = 1; window.__hp1++; }
      })();
    });
    await startGame(ctx, { seed: SEED });
    const k0 = await page.evaluate(() => window.__S.kills);
    const played = await playDet(ctx, BOT_SECS);
    const p = await readProbe(page, true);
    const sp = await readSpies(page, true);
    const k1 = await page.evaluate(() => window.__S.kills);

    const kills = k1 - k0;
    const scoreTexts = sp.text.filter(t => /^\+/.test(t.s));
    const otherTexts = sp.text.filter(t => !/^\+/.test(t.s));

    /* Images de kill : celles où S.kills augmente, en phase de jeu.
       LECTURE DU COMPTEUR. hitstopLeft() est relevé en FIN d'image ; frame() lit ce compteur en
       DÉBUT d'image puis le décrémente (src/90-boot.js). Le compteur relevé à la fin de l'image K
       est donc exactement le nombre d'images encore gelées APRÈS K. « hitstopLeft() > 0 sur 2 images
       après le kill » se vérifie donc à la fin de l'image du kill et à la fin de la suivante ; on le
       corrobore par la grandeur qui décide vraiment, S.dt < 0,006 sur ces deux images-là. */
    const rec = p.rec;
    const killFrames = [];
    for (let i = 1; i < rec.length; i++) if (rec[i].kills > rec[i - 1].kills && rec[i].ph === 'play') killFrames.push(i);
    let checked = 0, ok = 0; const bad = [];
    for (const i of killFrames) {
      const k0 = rec[i], k1 = rec[i + 1], a = rec[i + 1], b = rec[i + 2];
      if (!k1 || !a || !b || a.ph !== 'play' || b.ph !== 'play') continue;
      checked++;
      const counterOk = k0.hs > 0 && k1.hs > 0;
      const frozenOk = a.dt < 0.006 && b.dt < 0.006;
      if (counterOk && frozenOk) ok++;
      else if (bad.length < 8) bad.push({ fi: k0.fi, hsFinImage: [r2(k0.hs), r2(k1.hs)], dtSuivantes: [r3(a.dt), r3(b.dt)] });
    }
    out.A = {
      playedGameSecs: played.played, frames: rec.length, kills,
      fxTextTotal: sp.n.text, fxTextScore: scoreTexts.length, fxTextAutres: otherTexts.length,
      exemplesScore: scoreTexts.slice(0, 5).map(t => t.s), exemplesAutres: otherTexts.slice(0, 6).map(t => t.s),
      textEqualsKills: scoreTexts.length === kills,
      killFramesChecked: checked, hitstop2ok: ok, hitstop2pct: checked ? r2(100 * ok / checked) : null,
      hitstopFails: bad,
      pilotErr: played.pilot && played.pilot.err, probeErr: p.err,
      pageErrors: ctx.pageErrors.slice(0, 5), errCount: await page.evaluate(() => window.__ERR ? window.__ERR.count : null)
    };
    out.A.pass = kills > 0 && out.A.textEqualsKills && checked > 0 && ok === checked && ctx.pageErrors.length === 0;
  } finally { await ctx.close(); }
}

/* ------------------------------------------------------------ labo -------- */
async function labCtx(opts = {}) {
  const ctx = await launchDesktop(1440, 900, { init: ['window.__DT = 1/60;'] });   // pas de temps imposé dès le chargement
  const { page } = ctx;
  await startGame(ctx, { seed: SEED });
  await installArena(page, { onlyLab: true, noFire: true, keepEB: true, dt: 1 / 60 });
  await installLab(page);
  await installFrameProbe(page, { cap: 6000, lastSfx: true });
  await installSpies(page, { cap: 20000 });
  await page.evaluate(() => {
    try { window.__M.phases.forcePhase(0); } catch (e) {}     // ortho : ni roulis, ni bascule, ni perspective
    window.__G8freeze = true;                                  // les ennemis de laboratoire ne bougent plus
    const K = window.__K;
    window.__G8pin = { x: K.ARENA_W / 2, y: K.ARENA_H / 2, ang: 0, speed: 0, len: 30, invuln: 1e9, ghost: 1e9 };
  });
  await waitFrames(page, 40);
  return ctx;
}

/* ------------------------------------------------------------------ B ----- */
async function sectionB(out) {
  const ctx = await labCtx();
  try {
    const { page } = ctx;
    const has = await page.evaluate(() => typeof window.__M.audio.lastSfx === 'function');
    if (!has) { out.B = { pass: false, why: 'audio.lastSfx() absent de S2030.audio' }; return; }
    await page.evaluate(() => {
      const S = window.__S;
      window.__lab.clear();
      S.combo = 0; S.mult = 1; S.multT = 0; S.ult = 0;
      for (let i = 0; i < 5; i++) { const a = i * 1.2; window.__lab.spawn('chaser', Math.cos(a) * 260, Math.sin(a) * 260, null); }
    });
    await waitFrames(page, 10);
    await clearProbeBufs(page);
    const shots = [];
    const t0 = await page.evaluate(() => window.__S.t);
    for (let i = 0; i < 5; i++) {
      await arm(page, ACT_KILL);
      const f = await waitFired(page);
      await waitFrames(page, 20);                       // ≈ 333 ms de jeu entre deux kills
      const p = await readProbe(page, false);
      const smp = p.inf.find(s => s.fi === f.fi);
      shots.push({ i: i + 1, fi: f.fi, combo: f.info && f.info.combo, ls: smp ? smp.ls : null, t: f.t });
      await clearProbeBufs(page);
    }
    const t1 = await page.evaluate(() => window.__S.t);
    const f0 = shots.map(s => s.ls ? s.ls.f0 : null);
    const names = shots.map(s => s.ls ? s.ls.name : null);
    const allKill = names.every(n => n === 'kill' || n === 'bigkill');
    const inc = f0.every((v, i) => i === 0 || (v != null && f0[i - 1] != null && v > f0[i - 1]));
    const ratio = (f0[0] && f0[4]) ? f0[4] / f0[0] : null;
    out.B = { spanGameMs: r2(t1 - t0), f0, names, sons: shots.map(s => s.ls), strictementCroissant: inc,
      ratio: r3(ratio), seuilRatio: 1.25, tousDesSonsDeKill: allKill,
      pass: !!(allKill && inc && ratio != null && ratio >= 1.25 && (t1 - t0) <= 3000) };
    if ((t1 - t0) > 3000) out.B.why = 'les 5 kills ont pris plus de 3 s de jeu';
  } finally { await ctx.close(); }
}

/* ------------------------------------------------------------------ C ----- */
async function setZoom(page, Z) {
  // camUpdate : want = base / (1 + (speed/BASE_SPEED − 1) × 0,22). On choisit le mode de zoom et la
  // vitesse imposée au serpent pour viser Z, puis on attend la convergence de cam.zoom.
  const info = await page.evaluate((Z) => {
    const S = window.__S, M = window.__M, K = window.__K;
    const ZB = S.desktop ? 1.05 : 1.30;
    const cands = [{ m: 0, b: ZB }, { m: 1, b: 1.54 * ZB }, { m: 2, b: 0.77 * ZB }];
    let best = null;
    for (const c of cands) {
      const sp = 1 + (c.b / Z - 1) / 0.22;
      if (sp < 0 || sp > 6) continue;
      const d = Math.abs(sp - 1);
      if (!best || d < best.d) best = { ...c, sp, d };
    }
    if (!best) return null;
    M.phases.forceZoom(best.m);
    window.__G8pin.speed = best.sp * K.BASE_SPEED;
    return { mode: best.m, base: best.b, speed: best.sp * K.BASE_SPEED, zoomBase: ZB };
  }, Z);
  if (!info) return null;
  for (let i = 0; i < 60; i++) {
    await waitFrames(page, 12);
    const z = await page.evaluate(() => window.__M.phases.zoom());
    if (Math.abs(z - Z) < 0.004) return { ...info, zoom: z, converged: true };
  }
  const z = await page.evaluate(() => window.__M.phases.zoom());
  return { ...info, zoom: z, converged: false };
}

async function sectionC(out) {
  const ctx = await labCtx();
  try {
    const { page } = ctx;
    out.C = { fenetrePx: WIN_PX, canvas: await canvasInfo(page), zooms: [] };
    for (const Z of ZOOMS) {
      await page.evaluate(() => { const S = window.__S; window.__lab.clear(); S.combo = 0; S.mult = 1; S.multT = 0; S.ult = 0; });
      const z = await setZoom(page, Z);
      if (!z) { out.C.zooms.push({ target: Z, error: 'zoom inatteignable' }); continue; }
      await page.evaluate(() => window.__lab.spawn('chaser', 260, 0, null));
      await waitFrames(page, 24);
      // la caméra est figée pendant la mesure : deux images ne diffèrent que par ce qui est dessiné en plus
      await page.evaluate(() => { window.__G8pinCam = { x: window.__S.cam.x, y: window.__S.cam.y }; });
      await waitFrames(page, 8);
      const e = await page.evaluate(() => { const e = window.__S.enemies.find(x => x.id >= 900000); return e ? { x: e.x, y: e.y, r: e.r } : null; });
      if (!e) { out.C.zooms.push({ target: Z, error: 'ennemi absent' }); continue; }
      const s = await toScreenCss(page, e.x, e.y);
      const box = { x: s.x - WIN_PX / 2, y: s.y - WIN_PX / 2, w: WIN_PX, h: WIN_PX };
      const rect = await reqRect(page, box, 26);
      await waitFrames(page, 4);
      await clearProbeBufs(page);
      await arm(page, ACT_KILL);
      const f = await waitFired(page);
      const series = await waitPx(page, 'rect');
      const p = await readProbe(page, true);
      await page.evaluate(() => { window.__G8pinCam = null; });

      const before = series.filter(o => o.fi < f.fi).map(o => o.l);
      const after = series.filter(o => o.fi >= f.fi && o.fi <= f.fi + 10).map(o => o.l);
      const base = before.length ? before.reduce((a, b) => a + b, 0) / before.length : null;
      const peak = after.length ? Math.max(...after) : null;
      out.C.zooms.push({ target: Z, zoomAtteint: r3(z.zoom), converged: z.converged, mode: z.mode,
        speedImposee: r2(z.speed), ecran: { x: s.x, y: s.y }, boxCanvas: rect,
        imagesAvant: before.length, base: r3(base), pic: r3(peak),
        hausse: (base != null && peak != null) ? r2(peak - base) : null, seuil: 12,
        serie: series.map(o => ({ d: o.fi - f.fi, l: o.l })),
        killOk: p.rec.some(r => r.fi >= f.fi && r.kills > (f.info ? f.info.kills : -1)),
        pass: base != null && peak != null && (peak - base) >= 12 && Math.abs(z.zoom - Z) < 0.02 });
    }
    out.C.pass = out.C.zooms.length === ZOOMS.length && out.C.zooms.every(z => z.pass);
  } finally { await ctx.close(); }
}

/* ------------------------------------------------------------------ D ----- */
async function sectionD(out) {
  const ctx = await labCtx();
  try {
    const { page } = ctx;
    const res = [];
    for (const elite of [false, true]) {
      for (let rep = 0; rep < 3; rep++) {
        await page.evaluate(() => { const S = window.__S; window.__lab.clear(); S.combo = 0; S.mult = 1; S.multT = 0; S.ult = 0; window.__G8pinCam = null; });
        await page.evaluate((el) => window.__lab.spawn('chaser', 260, 0, el ? { elite: true } : null), elite);
        await waitFrames(page, 50);                     // la caméra se pose sur le serpent épinglé
        await clearProbeBufs(page);
        await waitFrames(page, 8);
        await arm(page, ACT_KILL);
        const f = await waitFired(page);
        await waitFrames(page, 12);
        const p = await readProbe(page, true);
        const inf = p.inf;
        const i0 = inf.findIndex(s => s.fi === f.fi);
        if (i0 < 1) { res.push({ elite, error: 'échantillons manquants' }); continue; }
        const ref = inf[i0 - 1];
        const shakePre = ref.shake, shakePk = Math.max(...inf.slice(i0, i0 + 3).map(s => s.shake));
        const recEnd = p.rec.filter(r => r.fi >= f.fi && r.fi <= f.fi + 2).map(r => r2(r.shake));
        // recul : projection du déplacement de la caméra sur l'opposé du vecteur du tir (+x)
        const proj = [];
        for (let k = 0; k <= 2; k++) {
          const s = inf[i0 + k];
          if (!s) break;
          proj.push({ k, back: r3(-(s.cx - ref.cx)), lat: r3(s.cy - ref.cy) });
        }
        res.push({ elite, fi: f.fi, shakeAvant: r3(shakePre), shakePic: r3(shakePk), shakeFinImage: recEnd,
          recul: proj, reculMax: proj.length ? r3(Math.max(...proj.map(o => o.back))) : null,
          camRef: { x: r2(ref.cx), y: r2(ref.cy) } });
      }
    }
    const ord = res.filter(o => !o.elite && !o.error), eli = res.filter(o => o.elite && !o.error);
    const shakeOrd = ord.map(o => o.shakePic), recOrd = ord.map(o => o.reculMax);
    out.D = { mesures: res,
      shakeOrdinairePic: shakeOrd, seuilShake: 4.0, shakeOrdMin: shakeOrd.length ? r3(Math.min(...shakeOrd)) : null,
      shakeElitePic: eli.map(o => o.shakePic),
      reculOrdinaire: recOrd, seuilRecul: 2.5, reculMin: recOrd.length ? r3(Math.min(...recOrd)) : null,
      pass: shakeOrd.length >= 3 && shakeOrd.every(v => v >= 4.0) && recOrd.length >= 3 && recOrd.every(v => v != null && v >= 2.5) };
  } finally { await ctx.close(); }
}

/* ------------------------------------------------------------------------- */
(async () => {
  deadline(900, 'G8-t2-kill');
  const r = { test: 'G8-t2-kill', seed: SEED, botSecs: BOT_SECS };
  try {
    await sectionA(r);
    await sectionB(r);
    await sectionC(r);
    await sectionD(r);
    r.pass = !!(r.A && r.A.pass && r.B && r.B.pass && r.C && r.C.pass && r.D && r.D.pass);
    r.measured = {
      A_textesScore: r.A ? (r.A.fxTextScore + ' pour ' + r.A.kills + ' kills') : null,
      A_hitstop2imagesApresKill: r.A ? (r.A.hitstop2ok + '/' + r.A.killFramesChecked) : null,
      B_f0: r.B ? r.B.f0 : null, B_ratio: r.B ? r.B.ratio : null, B_croissant: r.B ? r.B.strictementCroissant : null,
      C_hausseLuminance: r.C ? r.C.zooms.map(z => ({ zoom: z.zoomAtteint, hausse: z.hausse })) : null,
      D_shakePic: r.D ? r.D.shakeOrdinairePic : null, D_recul: r.D ? r.D.reculOrdinaire : null,
      sections: { A: r.A && r.A.pass, B: r.B && r.B.pass, C: r.C && r.C.pass, D: r.D && r.D.pass }
    };
    r.threshold = 'textes de score = kills ; hitstopLeft() > 0 sur les 2 images suivant chaque kill ; f0(5)/f0(1) ≥ 1,25 et strictement croissant ; luminance locale (120 px) ≥ +12 points aux deux zooms ; S.shake ≥ 4,0 (pic) ; recul de S.cam ≥ 2,5 u opposé au tir en ≤ 2 images';
    save('G8-t2-kill.json', r);
    finish('G8-t2-kill', r);
  } catch (e) {
    r.pass = false; r.code = 2; r.error = String(e && e.stack || e);
    r.measured = { erreur: String(e && e.message || e) };
    r.threshold = 'mesure impossible';
    save('G8-t2-kill.json', r);
    finish('G8-t2-kill', r);
  }
})();
