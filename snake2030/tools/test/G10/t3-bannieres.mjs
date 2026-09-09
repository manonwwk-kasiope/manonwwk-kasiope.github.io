// G10 test 3 — bannières disciplinées, une annonce à la fois, et le nom de l'ultime.
//
// A. LARGEUR. Sur 1440×900, 1280×720, 1920×1080 et iPhone 13 paysage, les onze chaînes de bannière du
//    jeu sont posées PAR LE CHEMIN DU JEU (__M.ui.banner) et relevées dans la MÊME évaluation que la
//    pose — _uiBanFit s'exécute de façon synchrone à l'intérieur de banner(), il n'y a donc rien à
//    attendre. Attendu : banT.scrollWidth − ban.clientWidth ≤ 0 px.
// B. EXCLUSION MUTUELLE. Les classes .s2ban.on et .s2ann.on sont lues DANS LE MÊME
//    requestAnimationFrame pendant 3 min, avec horodatage des transitions — pas de sondage à 20 Hz,
//    dont la période laisserait passer un recouvrement une fois sur deux. Des demandes croisées sont
//    en outre provoquées (toast pendant bannière ET bannière pendant toast) pour que l'exclusion soit
//    éprouvée dans les deux sens et non seulement constatée par chance.
// C. SOURCES. 30 s de jeu, profil non vierge, AUCUN pouvoir déclenché : __M.ui.banner est ENVELOPPÉ
//    (l'argument est relevé avant l'appel réel) ; il est appelé au plus une fois, l'argument n'est
//    ÉGAL (===, après toUpperCase) à aucune de GRILLE / ESPACE / ROULIS / PERSPECTIVE, le premier
//    appel a lieu à S.levelT < 1 s (horloge de NIVEAU, pas S.t qui est celle de la page) et son
//    argument correspond à /^NIVEAU 1 /.
// D. NOM DE L'ULTIME, par référence DOM et jamais par grep de fichier : étiquette de jauge, toast de
//    disponibilité (déclenché par le jeu en remplissant S.ult), légende des touches et description de
//    déblocage qui mentionne l'ultime. Aucun ne contient 'SURCHARGE', tous portent 'APOGÉE'. Et le nom
//    retenu n'est le nom d'aucun autre objet visible : absent de 24-upgrades.js, 25-levels.js,
//    27-phases.js (là, c'est bien le fichier source qu'on lit — c'est une question de collision de
//    noms dans le catalogue, pas de rendu).
import fs from 'node:fs';
import path from 'node:path';
import { launchDesktop, launchPhone, startGame, handleCards, sleep, save, finish, deadline, HERE } from '../lib.mjs';
import { profileScript, resize } from './g10lib.mjs';

deadline(420, 'G10-t3');
const THRESH = "bannière : scrollWidth − clientWidth ≤ 0 px sur 11 chaînes × 4 fenêtres ; jamais .s2ban.on et .s2ann.on "
  + "dans la même image (3 min) ; 30 s de jeu : ui.banner ≤ 1 appel, argument ∉ {GRILLE, ESPACE, ROULIS, PERSPECTIVE} (===), "
  + "premier appel à S.levelT < 1 s et /^NIVEAU 1 / ; nom de l'ultime : 'APOGÉE' partout, jamais 'SURCHARGE'";

const STR = ['NIVEAU 1 — LA GRILLE', 'NIVEAU 2 — AUTOROUTE NÉON', 'NIVEAU 3 — ZONE MAGNÉTIQUE', 'NIVEAU 4 — SURCHARGE',
  'SURCHARGE DU SECTEUR', 'SECTEUR NETTOYÉ', 'PROTOTYPE ZÉRO', 'DOUBLE LAME', 'NOYAU MAGNÉTIQUE', 'RALENTI', 'REPLI'];
const PHASES = ['GRILLE', 'ESPACE', 'ROULIS', 'PERSPECTIVE'];
const OBS_S = +(process.env.S2030_G10_OBS || 180);

const m = {}, fails = [];
const dit = (ok, quoi) => { if (!ok) fails.push(quoi); return ok; };

/* Ramène la partie en phase 'play' : une montée de niveau ouvre l'écran des cartes et readyTick
   (90-boot.js) n'y tourne plus — le toast de disponibilité de l'ultime ne partirait jamais. */
async function auJeu(ctx) {
  for (let i = 0; i < 14; i++) {
    if (await ctx.page.evaluate(() => window.__S.phase === 'play')) return true;
    await handleCards(ctx);
    await sleep(400);
  }
  return false;
}

/* ---------- A. largeur des onze chaînes sur quatre fenêtres ---------- */
async function largeurs(page, etiquette) {
  const out = [];
  for (const s of STR) {
    const r = await page.evaluate(str => {
      window.__M.ui.banner(str, 40);        // pose + ajustement, synchrones
      const ban = document.querySelector('.s2ban'), b = document.querySelector('.s2ban>b');
      return { s: str, on: ban.classList.contains('on'), sw: b.scrollWidth, cw: ban.clientWidth,
        fs: +parseFloat(getComputedStyle(b).fontSize).toFixed(2), n: ban.style.getPropertyValue('--n') };
    }, s);
    r.over = r.sw - r.cw;
    out.push(r);
    await sleep(90);                        // la file se vide (durée 40 ms)
  }
  const pire = out.reduce((a, b) => (b.over > a.over ? b : a), out[0]);
  return { fenetre: etiquette, chaines: out, pire };
}

m.largeurs = [];
for (const [w, h, nom] of [[1440, 900, '1440x900'], [1280, 720, '1280x720'], [1920, 1080, '1920x1080']]) {
  const ctx = await launchDesktop(w, h, { init: [profileScript()] });
  try {
    await sleep(500);
    const r = await largeurs(ctx.page, nom);
    m.largeurs.push(r);
    dit(r.pire.over <= 0, `${nom} : « ${r.pire.s} » déborde de ${r.pire.over} px (police ${r.pire.fs} px)`);
    dit(r.chaines.every(c => c.on), `${nom} : une bannière au moins n'était pas affichée à la mesure`);
  } finally { await ctx.close(); }
}
{
  const ctx = await launchPhone({ init: [profileScript()] });
  try {
    await sleep(500);
    const r = await largeurs(ctx.page, 'iphone');
    m.largeurs.push(r);
    dit(r.pire.over <= 0, `iPhone : « ${r.pire.s} » déborde de ${r.pire.over} px (police ${r.pire.fs} px)`);
  } finally { await ctx.close(); }
}

/* ---------- B + C + D : une seule partie, bureau 1440×900 ---------- */
{
  const ctx = await launchDesktop(1440, 900, { init: [profileScript()] });
  const { page } = ctx;
  try {
    await sleep(400);
    // enveloppe de ui.banner posée AVANT le clic sur JOUER : la bannière du niveau 1 part de resetRun
    await page.evaluate(() => {
      window.__BAN = [];
      const ui = window.__M.ui, f = ui.banner;
      ui.banner = function (t, d) {
        window.__BAN.push({ s: '' + t, levelT: window.__S.levelT, st: window.__S.t, ms: +performance.now().toFixed(1) });
        return f.call(ui, t, d);
      };
      // observateur : les DEUX classes lues dans la MÊME image
      window.__OV = { frames: 0, both: 0, trans: [], b: 0, a: 0, bothAt: [], annTxt: [] };
      (function loop() {
        const ban = document.querySelector('.s2ban'), ann = document.querySelector('.s2ann');
        if (ban && ann) {
          const O = window.__OV, t = +performance.now().toFixed(1);
          const b = ban.classList.contains('on') ? 1 : 0, a = ann.classList.contains('on') ? 1 : 0;
          O.frames++;
          if (b && a) { O.both++; if (O.bothAt.length < 20) O.bothAt.push(t); }
          if (b !== O.b) { O.b = b; if (O.trans.length < 400) O.trans.push({ t, e: 'ban', v: b }); }
          if (a !== O.a) { O.a = a; if (O.trans.length < 400) O.trans.push({ t, e: 'ann', v: a }); }
          /* texte du toast RENDU, relevé image par image tant qu'il est visible :
             c'est le nœud DOM qui fait foi, pas l'argument passé à ui.toast */
          if (a) {
            const txt = ((document.querySelector('.s2ann>b') || {}).textContent || '').trim()
              + ' ' + ((document.querySelector('.s2ann>s') || {}).textContent || '').trim();
            if (O.annTxt.indexOf(txt) < 0 && O.annTxt.length < 40) O.annTxt.push(txt);
          }
        }
        requestAnimationFrame(loop);
      })();
    });
    await startGame(ctx, { seed: 2030 });
    // invulnérabilité : la partie doit durer les trois minutes de l'observation
    await page.evaluate(() => { const s = window.__S.snake; s.ghost = 1e9; s.invuln = 1e9; });
    await sleep(30000);
    m.sources = await page.evaluate(() => ({ appels: window.__BAN.slice(), levelT: window.__S.levelT, st: window.__S.t }));

    // demandes croisées, dans les deux sens, pour éprouver l'exclusion
    await page.evaluate(() => {
      const ui = window.__M.ui;
      ui.banner('DOUBLE LAME');            // bannière d'abord
      ui.toast('TOAST PENDANT', 'bannière'); // toast demandé pendant : doit attendre
    });
    await sleep(4200);
    await page.evaluate(() => {
      const ui = window.__M.ui;
      ui.toast('TOAST D’ABORD', 'puis bannière');
      ui.banner('NOYAU MAGNÉTIQUE');       // bannière demandée pendant un toast : doit attendre
    });
    await sleep(4200);
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        const ui = window.__M.ui;
        ui.banner('SURCHARGE DU SECTEUR'); ui.toast('SIMULTANÉ', '◆'); ui.banner('SECTEUR NETTOYÉ');
      });
      await sleep(5000);
    }
    const reste = Math.max(0, OBS_S * 1000 - 30000 - 8400 - 15000);
    await sleep(reste);
    m.observation = await page.evaluate(() => {
      const O = window.__OV;
      return { frames: O.frames, both: O.both, bothAt: O.bothAt, transitions: O.trans.length,
        trans: O.trans.slice(0, 60), annTxt: O.annTxt.slice() };
    });

    /* --- D. nom de l'ultime, relevé sur le DOM ---
       Le toast de disponibilité est déclenché PAR LE JEU : readyTick (90-boot.js) ne l'émet qu'au
       franchissement, on remet donc la jauge à zéro avant de la remplir. */
    m.auJeu = await auJeu(ctx);
    dit(m.auJeu, `impossible de revenir en phase 'play' pour le toast de disponibilité`);
    await page.evaluate(() => { window.__S.ult = 0; });
    await sleep(400);
    await page.evaluate(() => { window.__S.ult = window.__S.ultMax || 100; });
    await sleep(900);
    m.nom = await page.evaluate(() => {
      const T = el => (el && el.textContent || '').trim();
      const ui = document.getElementById('ui');
      return {
        jauge: T(document.querySelector('.s2gu>s')),
        toast: T(document.querySelector('.s2ann>b')) + ' ' + T(document.querySelector('.s2ann>s')),
        toastOn: document.querySelector('.s2ann').classList.contains('on'),
        toastsVus: window.__OV.annTxt.slice(),
        legende: T(document.querySelector('.s2menu .s2keys')) || T(document.querySelector('.s2keys')),
        bouton: (document.querySelector('.s2b-ult') || {}).getAttribute
          ? document.querySelector('.s2b-ult').getAttribute('aria-label') : null
      };
    });
    // légende : elle vit au menu et à l'écran de pause
    await page.evaluate(() => window.__M.ui.showScreen('pause'));
    await sleep(300);
    m.nom.legendePause = await page.evaluate(() => (document.querySelector('.s2scr.on .s2keys') || {}).textContent || '');
    await page.evaluate(() => window.__M.ui.showScreen('unlocks'));
    await sleep(300);
    m.nom.deblocages = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.s2u')).map(e => (e.textContent || '').trim()).filter(t => /APOG|ULTIM|SURCHARG/i.test(t)));

    m.erreurs = { page: ctx.pageErrors.length, console: ctx.consoleErrors.length, err: await page.evaluate(() => window.__ERR.count) };

    /* --- verdicts --- */
    const B = m.sources.appels;
    dit(B.length <= 1, `30 s de jeu : ui.banner appelé ${B.length} fois (${B.map(x => x.s).join(' | ')})`);
    for (const a of B) {
      const up = a.s.toUpperCase();
      dit(!PHASES.some(p => up === p), `argument de bannière égal à un nom de phase caméra : « ${a.s} »`);
    }
    dit(B.length === 1, `la bannière du niveau 1 n'a pas été émise (${B.length} appel(s))`);
    if (B.length >= 1) {
      dit(/^NIVEAU 1 /.test(B[0].s.toUpperCase()), `premier appel « ${B[0].s} » ne correspond pas à /^NIVEAU 1 /`);
      dit(B[0].levelT < 1000, `premier appel à S.levelT = ${B[0].levelT} ms ≥ 1 000`);
    }
    dit(m.observation.both === 0, `.s2ban.on et .s2ann.on ensemble sur ${m.observation.both} image(s) (${JSON.stringify(m.observation.bothAt)})`);
    dit(m.observation.frames > OBS_S * 30, `observation trop courte : ${m.observation.frames} images`);
    dit(m.observation.transitions >= 8, `observation sans matière : ${m.observation.transitions} transitions`);
    dit(/APOGÉE/.test(m.nom.jauge), `étiquette de jauge d'ultime = « ${m.nom.jauge} »`);
    dit(!/SURCHARGE/.test(m.nom.jauge), `étiquette de jauge contient SURCHARGE`);
    const dispo = (m.nom.toastsVus || []).filter(t => /PRÊT/i.test(t));
    m.nom.toastsDispo = dispo;
    dit(/APOGÉE/i.test(m.nom.toast) && m.nom.toastOn,
      `toast de disponibilité rendu = « ${m.nom.toast} » (visible ${m.nom.toastOn})`);
    dit(!/SURCHARGE/.test(m.nom.toast), `toast de disponibilité contient SURCHARGE`);
    dit(dispo.length > 0 && dispo.some(t => /APOGÉE/i.test(t)) && !dispo.some(t => /SURCHARGE|ULTIME/i.test(t)),
      `toasts « prêt » rendus pendant la partie : ${JSON.stringify(dispo)}`);
    dit(/APOGÉE/i.test(m.nom.legendePause), `légende des touches = « ${m.nom.legendePause} »`);
    dit(!/SURCHARGE/.test(m.nom.legendePause), `légende des touches contient SURCHARGE`);
    dit(m.nom.deblocages.length > 0 && m.nom.deblocages.every(t => /APOGÉE/i.test(t) && !/SURCHARGE/.test(t)),
      `déblocage mentionnant l'ultime : ${JSON.stringify(m.nom.deblocages)}`);
    dit(ctx.pageErrors.length === 0, `${ctx.pageErrors.length} erreur(s) de page (${ctx.pageErrors[0] || ''})`);
  } finally { await ctx.close(); }
}

/* ---------- D bis : aucune collision de nom recréée ---------- */
{
  const SRC = path.resolve(HERE, '..', '..', 'src');
  m.collision = {};
  for (const f of ['24-upgrades.js', '25-levels.js', '27-phases.js']) {
    const t = fs.readFileSync(path.join(SRC, f), 'utf8');
    m.collision[f] = (t.match(/APOGÉE/g) || []).length;
  }
  const tot = Object.values(m.collision).reduce((a, b) => a + b, 0);
  dit(tot === 0, `« APOGÉE » apparaît ${tot} fois dans le catalogue (${JSON.stringify(m.collision)})`);
}

m.fails = fails;
save('G10-t3-bannieres.json', { pass: fails.length === 0, measured: m, threshold: THRESH });
for (const f of fails) console.log('[G10-t3] ÉCHEC :', f);
finish('G10-t3-bannieres', { pass: fails.length === 0, measured: m, threshold: THRESH });
