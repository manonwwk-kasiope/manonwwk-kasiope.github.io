/* Invariants de la joueuse — le garde-fou automatique.
 *
 * Pourquoi ce script existe. La personne qui joue est sur iPhone en Safari, en paysage. Une liste
 * d'invariants la protège : plein écran impossible sur iOS donc bouton et notice conservés, manche
 * tactile, zoom de base 1,30, musique en flux, réglages persistés, difficulté 1,55. Jusqu'ici cette
 * liste était vérifiée à la main par le médiateur de chaque objectif, en la relisant. Une vérification
 * qui dépend d'un humain qui pense à la faire n'est pas une vérification : c'est un rappel. Ce script
 * la rend automatique et l'ajoute à la batterie de non-régression, donc à chaque objectif.
 *
 * Ce qu'il ne fait pas : juger du bon goût. Il constate des faits mesurables sur le build servi.
 *
 *   NODE_PATH=… node tools/test/invariants.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { launchPhone, launchDesktop, startGame, sleep, save, finish, deadline, HERE, URL as CUR } from './lib.mjs';

deadline(180, 'invariants');
const m = {};
const fails = [];
const dit = (ok, quoi) => { if (!ok) fails.push(quoi); return ok; };

/* ---- 1. le bundle contient bien le bouton et la notice, sans dépendre du rendu ---- */
{
  const f = path.resolve(HERE, '..', '..', 'index.html');
  const h = fs.readFileSync(f, 'utf8');
  m.bundle = {
    octets: Buffer.byteLength(h),
    boutonPleinEcran: h.includes("textContent = 'Plein écran'") || h.includes('Plein écran'),
    /* L apostrophe peut être droite, typographique, ou ÉCHAPPÉE par un antislash quand la chaîne vit
       dans un littéral JS : « Sur l\'écran d\'accueil ». Chercher une seule de ces formes fait échouer le
       garde-fou sur un bundle parfaitement sain — c est arrivé. */
    noticeEcranAccueil: /écran\s*d\\?['\u2019]accueil/.test(h),
    musiqueFlux: h.includes('neonvelocity-2.mp3') && h.includes('neonvelocity.mp3'),
    pasDeDecodeSurMusique: !/decodeAudioData[^;]{0,200}neonvelocity/.test(h),
    cleReglages: h.includes('snake2030.v1'),
  };
  dit(m.bundle.boutonPleinEcran, 'le bouton « Plein écran » a disparu du bundle');
  dit(m.bundle.noticeEcranAccueil, 'la notice « Sur l’écran d’accueil » a disparu du bundle');
  dit(m.bundle.musiqueFlux, 'une des deux pistes de musique a disparu du bundle');
  dit(m.bundle.pasDeDecodeSurMusique, 'la musique semble décodée en mémoire au lieu d’être lue en flux');
  dit(m.bundle.cleReglages, 'la clé de réglages « snake2030.v1 » a disparu');
}

/* ---- 2. iPhone 13 paysage : ce que la joueuse voit et touche ---- */
{
  const ctx = await launchPhone();
  const { page } = ctx;
  try {
    await startGame(ctx);
    await sleep(1200);
    const r = await page.evaluate(() => {
      const S = window.__S, K = window.__K;
      const el = document.querySelector('.s2ctl');
      const cs = el ? getComputedStyle(el) : null;
      const fsb = document.getElementById('fsb');
      const au = document.querySelector('audio');
      return {
        desktop: !!S.desktop,
        mancheVisible: !!(el && el.classList.contains('on') && cs && cs.display !== 'none' && +cs.opacity > 0.05),
        boutonPleinEcran: !!fsb && /plein écran/i.test(fsb.textContent || ''),
        zoom: window.__M.phases && window.__M.phases.state ? +window.__M.phases.state().zoom.toFixed(3) : null,
        difficulte: S.opt ? S.opt.diff : null,
        audioElement: !!au,
        audioSrc: au ? (au.currentSrc || au.src || '').split('/').pop() : null,
        reglagesEnregistres: !!localStorage.getItem('snake2030.v1'),
        viewW: Math.round(S.view.w),
        headR: K ? K.HEAD_R : null,
      };
    });
    m.iphone = r;
    dit(r.desktop === false, 'S.desktop est vrai sur iPhone : le mode bureau déborde sur le téléphone');
    dit(r.mancheVisible, 'le manche tactile n’est pas visible en jeu sur iPhone');
    dit(r.boutonPleinEcran, 'le bouton « Plein écran » n’est pas rendu sur iPhone');
    dit(r.audioElement, 'aucun élément <audio> : la musique n’est plus lue en flux');
    dit(r.difficulte === 1.55, `la difficulté par défaut vaut ${r.difficulte} au lieu de 1,55`);
    dit(r.zoom !== null && r.zoom > 1.2 && r.zoom < 1.45, `le zoom tactile au repos vaut ${r.zoom}, hors de [1,20 ; 1,45]`);
    m.iphone.erreurs = { page: ctx.pageErrors.length, console: ctx.consoleErrors.length };
    dit(ctx.pageErrors.length === 0, `${ctx.pageErrors.length} erreur(s) de page sur iPhone`);
  } finally { await ctx.close(); }
}

/* ---- 3. iPhone portrait : le message de rotation ---- */
{
  /* Le viewport se passe SOUS ctx, sinon launchWith l ignore et la page reste en paysage : le message de
     rotation est alors masqué à juste titre et le garde-fou crie au loup. C est arrivé. */
  const ctx = await launchPhone({ ctx: { viewport: { width: 390, height: 844 } }, profile: 'iphone-portrait' });
  try {
    await sleep(900);
    const r = await ctx.page.evaluate(() => {
      const el = document.getElementById('rotate');
      return { present: !!el, display: el ? getComputedStyle(el).display : null };
    });
    m.portrait = r;
    dit(r.present && r.display !== 'none', 'le message « Tourne ton téléphone » ne s’affiche plus en portrait');
  } finally { await ctx.close(); }
}

/* ---- 4. bureau : rien de tactile, pas de plein écran imposé ---- */
{
  const ctx = await launchDesktop(1440, 900);
  try {
    await startGame(ctx);
    await sleep(900);
    const r = await ctx.page.evaluate(() => {
      const el = document.querySelector('.s2ctl');
      const cs = el ? getComputedStyle(el) : null;
      return {
        desktop: !!window.__S.desktop,
        mancheCache: !el || !cs || cs.display === 'none',
        pleinEcranImpose: !!document.fullscreenElement,
        zoom: window.__M.phases && window.__M.phases.state ? +window.__M.phases.state().zoom.toFixed(3) : null,
      };
    });
    m.bureau = r;
    dit(r.desktop === true, 'le mode bureau n’est pas détecté sur une fenêtre sans tactile');
    dit(r.mancheCache, 'le manche tactile est encore affiché sur bureau');
    dit(!r.pleinEcranImpose, 'le plein écran est imposé sur bureau');
    m.bureau.erreurs = { page: ctx.pageErrors.length, console: ctx.consoleErrors.length };
    dit(ctx.pageErrors.length === 0, `${ctx.pageErrors.length} erreur(s) de page sur bureau`);
  } finally { await ctx.close(); }
}

m.fails = fails;
save('invariants.json', { test: 'invariants', pass: fails.length === 0, measured: m });
finish('invariants', {
  pass: fails.length === 0, measured: m,
  threshold: 'iPhone : manche visible, bouton plein écran rendu, zoom au repos dans [1,20 ; 1,45], musique en flux, difficulté 1,55, portrait avec message de rotation ; bureau : mode bureau détecté, manche caché, plein écran non imposé ; bundle : bouton, notice d’écran d’accueil, deux pistes, clé de réglages ; 0 erreur de page',
  code: fails.length === 0 ? 0 : 1,
});
