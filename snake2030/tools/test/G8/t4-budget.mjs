/* G8 — test 4 : budget de flashs et de secousses sur une partie increvable de 5 minutes.
 *
 * Spécification : « Partie increvable de 5 min à 1440×900 (av-desk.mjs 1 god) : flashs plein écran
 * ≤ 30 (120) ; images avec shake > 0,5 ≤ 12 % (30 %) ; luminance moyenne d'écran max ≤ 140/255
 * (209) ; ui.banner jamais appelé avec 'SURCHARGE' par useUlt. »
 *
 * PROTOCOLE. Bureau 1440×900, pilote déterministe de tools/test/lib.mjs (pas de temps imposé 1/60 :
 * les 5 minutes sont 5 minutes de TEMPS DE JEU, 18 000 images, identiques d'une exécution à l'autre),
 * mode increvable par régénération (installGod), ultime et pouvoir autorisés — sans quoi le critère
 * sur 'SURCHARGE' ne dirait rien.
 *
 * COMMENT SE COMPTE UN « FLASH PLEIN ÉCRAN ». Il se compte SUR LES PIXELS, pas sur les appels. À
 * chaque image, l'écran rendu est réduit (1440×900 → 120×75 → 24×15) et découpé en neuf cellules.
 * Une nappe additive plein écran monte les NEUF cellules d'un coup ; une vignette ne monte que les
 * bords ; un effet local une cellule ou deux. Un événement est donc un FRONT MONTANT du plus petit
 * accroissement des neuf cellules au-dessus de 8 points de luminance. Le nombre d'APPELS à fx.flash,
 * par mode, est rapporté à côté : il dit ce que le jeu demande, la mesure de pixels dit ce que la
 * joueuse voit. Les deux figurent dans le JSON, aucun n'est caché.
 *
 * Sortie : out/G8-t4-budget.json.
 */
import { launchDesktop, startGame, finish, save, deadline, installProbe, installAutoPilot,
         installGod, playDet, pilotState } from '../lib.mjs';
import { installFrameProbe, installSpies, readAcc, readSpies, readProbe, r2, r3, SEED } from './g8lib.mjs';

const SECS = +(process.env.S2030_G8T4_SECS || 300);

(async () => {
  deadline(1500, 'G8-t4-budget');
  /* Pas de temps imposé AVANT le chargement : sans cela, les quelques images qui séparent le clic sur
     JOUER de la pose du pilote tournent au temps réel, et deux exécutions divergent (mesuré : 2 flashs
     contre 1, 2,8 % contre 1,84 % d'images secouées, sur le même build). */
  const ctx = await launchDesktop(1440, 900, { init: ['window.__DT = 1/60;'] });
  const r = { test: 'G8-t4-budget', seed: SEED, gameSecs: SECS };
  try {
    const { page } = ctx;
    /* TOUT EST POSÉ AVANT LE CLIC SUR JOUER. Poser le pilote après le départ laisserait la partie
       avancer d'un nombre variable d'images avant qu'il ne prenne la main, et deux exécutions du même
       build divergeraient (mesuré : 0 contre 2 ultimes sur 60 s). */
    await installProbe(page);                                    // requis par installAutoPilot
    await installFrameProbe(page, { cap: 1200, screen: true });   // échantillonnage d'écran à chaque image
    await installSpies(page, { cap: 30000, skip: ['burst', 'ring', 'text'] });
    await installAutoPilot(page, { mode: 'key', seed: SEED, ult: true, special: true });
    await installGod(page);
    await startGame(ctx, { seed: SEED });

    const t0 = Date.now();
    const played = await playDet(ctx, SECS, { wallCap: 1200 });
    const wall = (Date.now() - t0) / 1000;

    const acc = await readAcc(page);
    const sp = await readSpies(page, false);
    const st = await pilotState(page);
    const tail = await readProbe(page, true);

    const flashCalls = sp.flash || [];
    const parMode = {};
    for (const f of flashCalls) { const k = f.mode || 'plein'; parMode[k] = (parMode[k] || 0) + 1; }
    const banners = (sp.banner || []).map(b => b.s);
    /* CORRECTION DU MÉDIATEUR (G8, tentative 2). La spec écrit « ui.banner jamais appelé avec
       'SURCHARGE' PAR useUlt ». La version précédente rejetait TOUT texte valant exactement
       'SURCHARGE', quel qu'en soit l'appelant — or le boss du niveau 4+ porte ce nom exact
       (25-levels.js:183) et son annonce légitime passe par _lvSay (:609) puis ui.banner (:295).
       Une partie qui l'atteindrait aurait fait échouer ce test sans qu'aucune règle de la spec
       soit enfreinte. On attribue donc l'appel par la pile (voir g8lib installSpies) : seul un
       'SURCHARGE' venu de useUlt est une faute. Le compte brut reste rapporté à côté. */
    const surchargeTexte = (sp.banner || []).filter(b => String(b.s).trim().toUpperCase() === 'SURCHARGE');
    const surcharge = surchargeTexte.filter(b => b.ult);
    const ultimes = Math.max(sp.n.ult || 0, acc.ultFires || 0);

    const shakePct = acc.play ? 100 * acc.shakeGt05 / acc.play : null;
    const meanMax = acc.meanMax;
    const flashEv = acc.flashEv;

    r.partie = { jouee: played.played, images: played.frames, murS: r2(wall), imagesDeJeu: acc.play,
      mort: played.deadAt, cartes: st && st.cards, decisions: st && st.decisions, pilotErr: st && st.err };
    /* Contrôle de l'instrument : chaque événement détecté SUR LES PIXELS est-il adossé à un appel
       fx.flash en mode plein écran, à trois images près ? Un événement sans appel serait un faux
       positif du détecteur (une autre nappe lumineuse) ; le rapport le dit au lieu de le taire. */
    const pleins = flashCalls.filter(f => (f.mode || '') !== 'edge');
    const evs = (acc.flashAt || []).map(e => {
      const near = pleins.filter(c => Math.abs(c.fi - e.fi) <= 3);
      return { ...e, appel: near.length ? { fi: near[0].fi, a: r3(near[0].a), c: near[0].c } : null };
    });
    const appuyes = evs.filter(e => e.appel).length;
    const ecarts = [];
    for (let i = 1; i < (acc.flashAt || []).length; i++) ecarts.push(r2((acc.flashAt[i].t - acc.flashAt[i - 1].t) / 1000));

    r.flashsPleinEcran = { rendus: flashEv, seuil: 30, imagesConcernees: acc.flashFr,
      evenements: evs, ecartsEntreFlashsS: ecarts,
      evenementsAdossesAUnAppel: appuyes + '/' + evs.length,
      appelsFxFlashParMode: parMode, appelsTotal: sp.n.flash,
      appelsPleinEcran: pleins.slice(0, 80).map(c => ({ fi: c.fi, t: r2(c.t), a: r3(c.a), c: c.c })) };
    r.secousse = { imagesShakeSup05: acc.shakeGt05, surImagesDeJeu: acc.play, pct: r2(shakePct), seuil: 12 };
    r.luminance = { moyenneMax: r2(meanMax), aImage: acc.meanMaxAt, moyenneGlobale: acc.meanN ? r2(acc.meanSum / acc.meanN) : null, seuil: 140 };
    r.banniere = { appels: banners.slice(0, 40), surchargeExacte: surcharge.length,
      surchargeTexteToutesOrigines: surchargeTexte.length,
      surchargeDetail: surchargeTexte.slice(0, 6).map(b => ({ t: b.t, ult: !!b.ult, pile: b.pile })),
      ultimesDeclenches: ultimes, parAudioUltimate: sp.n.ult || 0, parJaugeQuiRetombe: acc.ultFires || 0 };
    r.pageErrors = ctx.pageErrors.slice(0, 5);
    r.consoleErrors = ctx.consoleErrors.slice(0, 5);
    r.errCount = await page.evaluate(() => window.__ERR ? window.__ERR.count : null);
    r.probeErr = tail.err;

    /* Le critère sur 'SURCHARGE' n'a de sens que si l'ultime a bien été déclenché au moins une fois.
       Sinon la mesure n'est pas concluante et le script sort en code 2 plutôt que de dire « vert ». */
    const ultUsed = ultimes > 0;
    const ok = flashEv <= 30 && shakePct != null && shakePct <= 12 && meanMax <= 140 && surcharge.length === 0
      && ctx.pageErrors.length === 0 && played.played >= SECS * 0.95;
    r.pass = ok && ultUsed;
    if (!ultUsed) { r.code = 2; r.nonConcluant = 'aucun ultime déclenché en ' + SECS + ' s : le critère « ui.banner(SURCHARGE) non appelé » n\'est pas éprouvé'; }
    r.measured = {
      flashsPleinEcranRendus: flashEv, appelsFxFlash: parMode,
      detecteurAdosseAUnAppel: r.flashsPleinEcran.evenementsAdossesAUnAppel,
      imagesSecouees: r2(shakePct) + ' % (' + acc.shakeGt05 + '/' + acc.play + ')',
      luminanceMoyenneMax: r2(meanMax) + '/255',
      bannieresSURCHARGE: surcharge.length, ultimesDeclenches: ultimes,
      partieJoueeS: played.played, pageErrors: ctx.pageErrors.length
    };
    r.threshold = 'flashs plein écran rendus ≤ 30 ; images à S.shake > 0,5 ≤ 12 % ; luminance moyenne d\'écran max ≤ 140/255 ; aucun ui.banner(\'SURCHARGE\') PAR useUlt (attribution par la pile)';
    save('G8-t4-budget.json', r);
    await ctx.close();
    finish('G8-t4-budget', r);
  } catch (e) {
    r.pass = false; r.code = 2; r.error = String(e && e.stack || e);
    r.measured = { erreur: String(e && e.message || e) };
    r.threshold = 'mesure impossible';
    save('G8-t4-budget.json', r);
    await ctx.close();
    finish('G8-t4-budget', r);
  }
})();
