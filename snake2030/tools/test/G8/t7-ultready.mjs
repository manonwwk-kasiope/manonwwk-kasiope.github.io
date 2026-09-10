/* G8 — test 7 : « ULTIME PRÊT » se dit et s'affiche, et l'ultime ne crie plus SURCHARGE.
 *
 * Spécification : « S.ult forcé à ultMax → au.sfx('ultReady') en ≤ 100 ms et .s2ann.on avec texte
 * /ULTIME/ ; ui.banner('SURCHARGE') non appelé. »
 *
 * PROTOCOLE. Laboratoire bureau 1440×900, arène vide, serpent épinglé et invulnérable, interface
 * bien vivante (le toast est du DOM, pas du canvas). La jauge est portée à son maximum DANS l'image,
 * depuis le crochet sur weapons.update. Le délai est mesuré en TEMPS DE JEU (S.t, comme l'exige le
 * contrat des modules) et rapporté aussi en temps réel. L'affichage est vérifié dans le DOM :
 * l'élément .s2ann porte-t-il la classe « on » et son texte contient-il « ULTIME » ?
 * Puis l'ultime est réellement déclenché à la touche R, et l'espion posé sur ui.banner doit ne
 * jamais avoir reçu le texte exact « SURCHARGE » (le niveau annonce de son côté « SURCHARGE DU
 * SECTEUR », qui est une bannière légitime et n'est pas visée).
 *
 * VARIANTE DE CONTRÔLE, non bloquante : la jauge est aussi remplie par de VRAIS kills d'élites, pour
 * vérifier que l'annonce ne tient pas au seul chemin « forcé ».
 *
 * Sortie : out/G8-t7-ultready.json.
 */
import { launchDesktop, startGame, finish, save, deadline, sleep } from '../lib.mjs';
import { installArena, installLab, installFrameProbe, installSpies, readProbe, readSpies, clearProbeBufs,
         arm, waitFired, waitFrames, r2, r3, SEED } from './g8lib.mjs';

const ACT_FORCE = `
  S.ult = S.ultMax;
  return { ult: S.ult, ultMax: S.ultMax, t: S.t };
`;
const ACT_KILL = `
  const list = S.enemies.filter(x => x.id >= 900000 && !x.dead);
  if (!list.length) throw new Error('aucun ennemi de laboratoire');
  const e = list[0];
  window.__lab.bullet(e.x, e.y, 300, 0, { dmg: 9999, r: 5 });
  return { ult: S.ult, ultMax: S.ultMax, t: S.t, kills: S.kills };
`;

async function annState(page) {
  return page.evaluate(() => {
    const el = document.querySelector('.s2ann');
    if (!el) return { present: false };
    return { present: true, on: el.classList.contains('on'), texte: (el.textContent || '').trim(),
      visible: !!el.offsetParent || getComputedStyle(el).opacity !== '0' };
  });
}

(async () => {
  deadline(600, 'G8-t7-ultready');
  const ctx = await launchDesktop(1440, 900, { init: ['window.__DT = 1/60;'] });   // pas de temps imposé dès le chargement
  const r = { test: 'G8-t7-ultready', seed: SEED };
  try {
    const { page } = ctx;
    await startGame(ctx, { seed: SEED });
    await installArena(page, { onlyLab: true, noFire: true, keepEB: true, dt: 1 / 60 });
    await installLab(page);
    await installFrameProbe(page, { cap: 6000 });
    await installSpies(page, { cap: 20000 });
    await page.evaluate(() => {
      const K = window.__K;
      try { window.__M.phases.forcePhase(0); } catch (e) {}
      window.__G8freeze = true;
      window.__G8pin = { x: K.ARENA_W / 2, y: K.ARENA_H / 2, ang: 0, speed: 0, len: 30, invuln: 1e9, ghost: 1e9 };
    });
    await waitFrames(page, 40);
    r.api = await page.evaluate(() => ({
      sfxUltReady: !!(window.__M.audio && window.__M.audio.sfx),
      ultMax: window.__S.ultMax, ult: window.__S.ult
    }));

    /* --- volet 1 : jauge forcée --- */
    await page.evaluate(() => { window.__S.ult = 0; });
    await waitFrames(page, 10);
    await clearProbeBufs(page);
    await readSpies(page, true);
    const tBefore = Date.now();
    await arm(page, ACT_FORCE);
    const f = await waitFired(page);
    await waitFrames(page, 10);                       // ≈ 167 ms de jeu
    const ann = await annState(page);
    const wallMs = Date.now() - tBefore;
    const sp1 = await readSpies(page, true);
    const p1 = await readProbe(page, true);
    const ready = (sp1.sfx || []).filter(s => s.name === 'ultReady');
    const first = ready.length ? ready[0] : null;
    const delayGame = first ? first.t - f.t : null;
    const delayFrames = first ? first.fi - f.fi : null;

    r.force = {
      ultMax: f.info && f.info.ultMax, tArm: f.info && r2(f.info.t),
      appelsUltReady: ready.length, premier: first ? { fi: first.fi, t: r2(first.t) } : null,
      delaiJeuMs: delayGame != null ? r2(delayGame) : null, delaiImages: delayFrames,
      delaiReelMsBorneSup: wallMs, seuilMs: 100,
      toast: ann, toastTextes: (sp1.toast || []).map(t => t.s + (t.sub ? ' / ' + t.sub : '')),
      pass: !!(first && delayGame != null && delayGame <= 100 && ann.present && ann.on && /ULTIME/i.test(ann.texte))
    };

    /* --- volet 2 : l'ultime est réellement déclenché, la bannière ne doit pas dire SURCHARGE --- */
    await readSpies(page, true);
    await page.keyboard.press('r');
    await waitFrames(page, 30);
    await sleep(200);
    const sp2 = await readSpies(page, true);
    const p2 = await readProbe(page, true);
    const banners = (sp2.banner || []).map(b => b.s);
    /* Même correction qu'au test 4 : la spec vise l'appel VENU DE useUlt, pas le texte seul (le
       boss du niveau 4+ s'appelle 'SURCHARGE'). Attribution par la pile, voir g8lib. */
    const surchargeTexte = (sp2.banner || []).filter(b => String(b.s).trim().toUpperCase() === 'SURCHARGE');
    const surcharge = surchargeTexte.filter(b => b.ult);
    const ultFired = (sp2.n.ult || 0) > 0 || p2.rec.some((x, i) => i > 0 && p2.rec[i - 1].ult - x.ult > 10);
    const flashes = (sp2.flash || []).map(o => ({ d: o.fi, a: r3(o.a), mode: o.mode, c: o.c }));
    r.tir = { ultimeDeclenche: ultFired, appelsAudioUltimate: sp2.n.ult || 0,
      bannieres: banners, surchargeExacte: surcharge.length, surchargeTexteToutesOrigines: surchargeTexte.length, flashs: flashes.slice(0, 6),
      pass: ultFired && surcharge.length === 0 };

    /* --- variante de contrôle (non bloquante) : jauge remplie par de vrais kills d'élites --- */
    const ctrl = { kills: 0, ultReady: 0, toast: null };
    try {
      await page.evaluate(() => { const S = window.__S; S.ult = 0; window.__lab.clear(); });
      await waitFrames(page, 20);
      await readSpies(page, true);
      for (let i = 0; i < 8; i++) {
        const done = await page.evaluate(() => window.__S.ult >= window.__S.ultMax);
        if (done) break;
        await page.evaluate(() => window.__lab.spawn('chaser', 260, 0, { elite: true }));
        await waitFrames(page, 8);
        await arm(page, ACT_KILL);
        await waitFired(page);
        await waitFrames(page, 10);
        ctrl.kills++;
      }
      await waitFrames(page, 12);
      const sp3 = await readSpies(page, true);
      ctrl.ultReady = (sp3.sfx || []).filter(s => s.name === 'ultReady').length;
      ctrl.ult = await page.evaluate(() => ({ ult: window.__S.ult, ultMax: window.__S.ultMax }));
      ctrl.toast = await annState(page);
    } catch (e) { ctrl.error = String(e && e.message || e); }
    r.controleParKills = ctrl;

    r.pageErrors = ctx.pageErrors.slice(0, 5);
    r.errCount = await page.evaluate(() => window.__ERR ? window.__ERR.count : null);
    r.pass = !!(r.force.pass && r.tir.pass && ctx.pageErrors.length === 0);
    r.measured = {
      delaiUltReadyMsJeu: r.force.delaiJeuMs, appelsUltReady: r.force.appelsUltReady,
      toast: r.force.toast, bannieresSURCHARGE: r.tir.surchargeExacte, ultimeDeclenche: r.tir.ultimeDeclenche,
      controleParKills: { kills: ctrl.kills, ultReady: ctrl.ultReady }
    };
    r.threshold = 'au.sfx(\'ultReady\') en ≤ 100 ms de jeu après S.ult = ultMax ; .s2ann porte « on » et un texte contenant ULTIME ; aucun ui.banner(\'SURCHARGE\') au tir de l\'ultime';
    save('G8-t7-ultready.json', r);
    await ctx.close();
    finish('G8-t7-ultready', r);
  } catch (e) {
    r.pass = false; r.code = 2; r.error = String(e && e.stack || e);
    r.measured = { erreur: String(e && e.message || e) };
    r.threshold = 'mesure impossible';
    save('G8-t7-ultready.json', r);
    await ctx.close();
    finish('G8-t7-ultready', r);
  }
})();
