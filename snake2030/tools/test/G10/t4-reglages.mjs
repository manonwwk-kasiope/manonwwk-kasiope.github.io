// G10 test 4 — réglages nommés, adaptés, et « réduire les mouvements » qui coupe à la source.
//
//  A. Profil VIERGE : la valeur affichée du réglage Difficulté est 'NORMAL' et S.opt.diff === 1,55 ;
//     aucun libellé de la table DIFFS du moteur ne contient 'SOUTENU' ni 'STANDARD'.
//  B. Contexte reducedMotion 'reduce' : S.opt.reduceMotion === true, puis __M.fx.shake(30) appelé
//     DEPUIS UN CROCHET POSÉ DANS UNE IMAGE (requestAnimationFrame — jamais entre deux images, où le
//     dépôt ne suivrait pas le chemin du jeu) → __M.fx.shakeAmount() === 0 dès l'image suivante et
//     encore à 100 ms, S.shakeX et S.shakeY relevés DANS LA MÊME IMAGE que shakeAmount().
//  C. Chaque .s2opt visible porte un élément de description non vide, de font-size ≥ 11 px.
//  D. iPhone : chaque onglet a scrollHeight ≤ 1,6 × clientHeight.
import { launchDesktop, launchPhone, sleep, save, finish, deadline } from '../lib.mjs';

deadline(150, 'G10-t4');
const THRESH = "profil vierge : Difficulté affiche 'NORMAL' et S.opt.diff === 1,55, aucun libellé DIFFS ∋ SOUTENU/STANDARD ; "
  + "reducedMotion reduce : S.opt.reduceMotion === true, shake(30) posé dans une image → shakeAmount() === 0 à l'image suivante "
  + "et à 100 ms, S.shakeX === S.shakeY === 0 dans la même image ; chaque .s2opt a une description ≥ 11 px ; "
  + "iPhone : scrollHeight ≤ 1,6 × clientHeight par onglet";

const m = {}, fails = [];
const dit = (ok, quoi) => { if (!ok) fails.push(quoi); return ok; };

/* Parcourt les trois onglets. Les commandes de l'interface écoutent pointerdown (_uiTap) et se
   verrouillent 220 ms après chaque activation : on frappe donc par pointerdown, avec 300 ms entre
   deux gestes — un .click() ne déclencherait rien du tout, et deux gestes rapprochés seraient avalés
   par le verrou. */
const TAP = (sel, i) => `(() => {
  const e = document.querySelectorAll(${JSON.stringify(sel)})[${i}];
  if (!e) return false;
  e.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
  return true;
})()`;

const LIRE_ONGLET = `(() => {
  const tabs = Array.from(document.querySelectorAll('.s2tabs>button'));
  const boxes = Array.from(document.querySelectorAll('.s2set>.s2scroll'));
  const i = boxes.findIndex(b => !b.hidden);
  if (i < 0) return null;
  const bx = boxes[i];
  const rows = Array.from(bx.querySelectorAll('.s2opt')).filter(e => e.offsetParent !== null);
  return {
    nom: tabs[i] ? tabs[i].textContent.trim() : '?', index: i,
    sh: bx.scrollHeight, ch: bx.clientHeight, ratio: +(bx.scrollHeight / Math.max(1, bx.clientHeight)).toFixed(3),
    lignes: rows.map(r => {
      const s = r.querySelector('s'), d = r.querySelector('.s2optd'), v = r.querySelector('.s2stp>span');
      return { label: s ? s.textContent.trim() : null,
        desc: d ? d.textContent.trim() : null,
        descFs: d ? +parseFloat(getComputedStyle(d).fontSize).toFixed(2) : null,
        valeur: v ? v.textContent.trim() : null };
    })
  };
})()`;

async function onglets(page) {
  const out = [];
  const n = await page.evaluate(() => document.querySelectorAll('.s2tabs>button').length);
  for (let i = 0; i < n; i++) {
    await page.evaluate(TAP('.s2tabs>button', i));
    await sleep(320);
    out.push(await page.evaluate(LIRE_ONGLET));
  }
  return out;
}

/** Fait défiler les crans de Difficulté et relève le libellé RENDU de chacun. */
async function cransDifficulte(page) {
  await page.evaluate(TAP('.s2tabs>button', 0));
  await sleep(320);
  const idx = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.s2opt'));
    return rows.findIndex(r => /Difficult/.test((r.querySelector('s') || {}).textContent || ''));
  });
  if (idx < 0) return [];
  const moins = `(() => { const r = document.querySelectorAll('.s2opt')[${idx}];
    r.querySelectorAll('.s2stp>button')[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true })); })()`;
  const plus = `(() => { const r = document.querySelectorAll('.s2opt')[${idx}];
    r.querySelectorAll('.s2stp>button')[1].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true })); })()`;
  const lire = `(() => { const r = document.querySelectorAll('.s2opt')[${idx}];
    return { nom: r.querySelector('.s2stp>span').textContent.trim(), m: window.__S.opt.diff }; })()`;
  for (let i = 0; i < 6; i++) { await page.evaluate(moins); await sleep(300); }   // jusqu'au cran le plus bas
  const vus = [];
  for (let i = 0; i < 6; i++) {
    vus.push(await page.evaluate(lire));
    await page.evaluate(plus); await sleep(300);
  }
  return vus;
}

/* --- A + C : bureau, profil vierge --- */
{
  const ctx = await launchDesktop(1440, 900);
  const { page } = ctx;
  try {
    await sleep(500);
    /* Profil vierge : contexte neuf. Le jeu écrit ses propres défauts dans localStorage dès le
       premier _uiApplyOpt — ce n'est pas un profil « déjà joué », on vérifie donc runs === 0. */
    m.vierge = await page.evaluate(() => {
      let st = null;
      try { st = JSON.parse(localStorage.getItem('snake2030.v1') || 'null'); } catch (e) {}
      return { diff: window.__S.opt.diff, runs: st && st.stats ? (st.stats.runs | 0) : 0,
        best: st && st.stats ? (st.stats.best | 0) : 0 };
    });
    await page.evaluate(() => window.__M.ui.showScreen('settings'));
    await sleep(500);
    m.onglets = await onglets(page);
    m.difficulte = ((m.onglets[0] || { lignes: [] }).lignes.find(l => /Difficult/.test(l.label || '')) || {}).valeur;
    m.libelles = await cransDifficulte(page);
    dit(m.difficulte === 'NORMAL', `Difficulté affiche « ${m.difficulte} » au lieu de NORMAL`);
    dit(m.vierge.diff === 1.55, `S.opt.diff = ${m.vierge.diff} au lieu de 1,55`);
    dit(m.vierge.runs === 0 && m.vierge.best === 0, `le profil n'était pas vierge (runs ${m.vierge.runs}, best ${m.vierge.best})`);
    dit(m.libelles.length >= 5, `seulement ${m.libelles.length} crans de difficulté parcourus`);
    for (const l of m.libelles) {
      dit(!/SOUTENU|STANDARD/.test(l.nom), `un cran de difficulté s'appelle encore « ${l.nom} »`);
    }
    for (const o of m.onglets) for (const l of o.lignes) {
      dit(!!l.desc, `onglet ${o.nom} : la ligne « ${l.label} » n'a pas de description`);
      dit(l.descFs !== null && l.descFs >= 11, `onglet ${o.nom} : description de « ${l.label} » à ${l.descFs} px < 11`);
    }
    dit(ctx.pageErrors.length === 0, `bureau : ${ctx.pageErrors.length} erreur(s) de page (${ctx.pageErrors[0] || ''})`);
  } finally { await ctx.close(); }
}

/* --- B : reducedMotion 'reduce' --- */
{
  const ctx = await launchDesktop(1440, 900, { ctx: { reducedMotion: 'reduce' } });
  const { page } = ctx;
  try {
    await sleep(600);
    m.reduce = await page.evaluate(() => ({
      reduceMotion: window.__S.opt.reduceMotion,
      reduceShake: window.__S.opt.reduceShake,
      media: window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }));
    dit(m.reduce.reduceMotion === true, `S.opt.reduceMotion = ${m.reduce.reduceMotion} sous prefers-reduced-motion`);
    // le dépôt se fait DANS une image, par requestAnimationFrame ; les relevés suivent, image par image
    m.shake = await page.evaluate(() => new Promise(res => {
      const S = window.__S, fx = window.__M.fx;
      const rows = [];
      let t0 = 0, n = 0;
      requestAnimationFrame(function pose(t) {
        t0 = t;
        fx.shake(30);                          // DANS l'image, comme le fait un kill
        rows.push({ ms: 0, tag: 'pose', amt: fx.shakeAmount(), sx: S.shakeX, sy: S.shakeY });
        requestAnimationFrame(function suite(t2) {
          const ms = t2 - t0;
          // amount et S.shakeX/S.shakeY relevés dans la MÊME image
          rows.push({ ms: +ms.toFixed(1), tag: 'suite', amt: fx.shakeAmount(), sx: S.shakeX, sy: S.shakeY });
          if (ms < 180 && n++ < 30) requestAnimationFrame(suite);
          else res(rows);
        });
      });
    }));
    const apres = m.shake.filter(r => r.tag === 'suite');
    const premiere = apres[0];
    const a100 = apres.filter(r => r.ms >= 100)[0] || apres[apres.length - 1];
    dit(premiere && premiere.amt === 0, `shakeAmount() = ${premiere && premiere.amt} à l'image suivante`);
    dit(a100 && a100.amt === 0, `shakeAmount() = ${a100 && a100.amt} à ${a100 && a100.ms} ms`);
    dit(apres.every(r => r.sx === 0 && r.sy === 0), `S.shakeX/S.shakeY non nuls : ${JSON.stringify(apres.filter(r => r.sx !== 0 || r.sy !== 0).slice(0, 3))}`);
    dit(ctx.pageErrors.length === 0, `reduce : ${ctx.pageErrors.length} erreur(s) de page (${ctx.pageErrors[0] || ''})`);
  } finally { await ctx.close(); }
}

/* --- D : iPhone, hauteur des onglets --- */
{
  const ctx = await launchPhone();
  const { page } = ctx;
  try {
    await sleep(500);
    await page.evaluate(() => window.__M.ui.showScreen('settings'));
    await sleep(500);
    m.iphone = await onglets(page);
    for (const o of m.iphone) {
      dit(o.ratio <= 1.6, `iPhone : onglet ${o.nom} scrollHeight/clientHeight = ${o.ratio} > 1,6 (${o.sh}/${o.ch})`);
      for (const l of o.lignes) dit(l.descFs !== null && l.descFs >= 11, `iPhone : description de « ${l.label} » à ${l.descFs} px`);
    }
    dit(ctx.pageErrors.length === 0, `iPhone : ${ctx.pageErrors.length} erreur(s) de page (${ctx.pageErrors[0] || ''})`);
  } finally { await ctx.close(); }
}

m.fails = fails;
save('G10-t4-reglages.json', { pass: fails.length === 0, measured: m, threshold: THRESH });
for (const f of fails) console.log('[G10-t4] ÉCHEC :', f);
finish('G10-t4-reglages', { pass: fails.length === 0, measured: m, threshold: THRESH });
