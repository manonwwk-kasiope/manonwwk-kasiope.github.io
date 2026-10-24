// G10 test 2 — plancher typographique et absence de troncature.
//
// iPhone 13 paysage, sept écrans (menu, HUD en jeu, cards, pause, over, settings, unlocks),
// .s2hud.kc forcé pour rendre les capuchons de touches opaques : on parcourt #ui et tous ses
// descendants, on retient les nœuds portant un nœud texte non vide dont le rect a une aire > 0, et on
// journalise le SÉLECTEUR du minimum — sans quoi un échec est illisible.
//   minimum des font-size ≥ 11 px à 100 % et ≥ 16 px à 150 % (S.opt.uiScale)
//   bureau 1440×900 : ≥ 12 px, #fsb compris (il est visible sur menu et over)
// Troncature : .s2tile>b et .s2tile.wide>b (nowrap + overflow:hidden) scrollWidth ≤ clientWidth sur
// les deux formats ; pour les cartes, scrollHeight ≤ clientHeight + 1 ET card.bottom ≤ cardrow.bottom
// + 1, avec les trois descriptions les plus longues du jeu.
// Le critère scrollHeight ≤ clientHeight sur .s2card .nm et .s2card .ds n'est PAS repris : ces deux
// éléments n'ont ni hauteur imposée ni overflow:hidden et leur texte se replie, leur scrollHeight
// égale leur clientHeight quoi qu'il arrive.
import { launchDesktop, launchPhone, startGame, sleep, save, finish, deadline } from '../lib.mjs';
import { SCAN_FN, LONGEST, profileScript } from './g10lib.mjs';

deadline(240, 'G10-t2');
const THRESH = 'iPhone : min font-size ≥ 11 px à 100 % et ≥ 16 px à 150 % sur 7 écrans ; bureau 1440×900 : ≥ 12 px ; '
  + '.s2tile>b et .s2tile.wide>b scrollWidth ≤ clientWidth ; .s2card scrollHeight ≤ clientHeight + 1 et bottom ≤ cardrow.bottom + 1';

const scanFn = new Function('return ' + SCAN_FN);

async function scan(page, ecran) {
  const list = await page.evaluate(SCAN_FN);
  let min = null;
  for (const n of list) if (!min || n.fs < min.fs) min = n;
  return { ecran, n: list.length, min, sous11: list.filter(x => x.fs < 11).map(x => x.sel + ' @' + x.fs), tous: list.length };
}

const TRUNC = `(() => {
  const out = { tiles: [], cards: [] };
  for (const b of document.querySelectorAll('.s2tile>b')) {
    if (b.offsetParent === null) continue;
    out.tiles.push({ sel: b.parentElement.className, txt: (b.textContent || '').slice(0, 30),
      sw: b.scrollWidth, cw: b.clientWidth, over: b.scrollWidth - b.clientWidth });
  }
  const row = document.querySelector('.s2cardrow');
  const ui = document.getElementById('ui');
  const cardEls = Array.from(document.querySelectorAll('.s2card')).filter(c => c.offsetParent !== null);
  /* Le curseur clavier de G4 (#ui.kb .kf) applique scale(1,04) à la carte focalisée :
     getBoundingClientRect() la voit alors dépasser sa rangée de la moitié des 4 %
     (6,25 px sur une carte de 309 px) alors que la MISE EN PAGE ne déborde pas.
     On relève donc les deux, dans la même évaluation : le rect tel quel (spec) et le
     même rect avec la classe .kb momentanément retirée — ce qui n'annule QUE le
     grossissement du curseur, aucune boîte ne bouge. C'est le second qui porte le
     verdict, le premier est rapporté à côté. */
  const rect = () => {
    const rr = row ? row.getBoundingClientRect() : null;
    return cardEls.map(c => rr ? +(c.getBoundingClientRect().bottom - rr.bottom).toFixed(2) : null);
  };
  const avecKf = rect();
  const hadKb = ui.classList.contains('kb');
  if (hadKb) ui.classList.remove('kb');
  const sansKf = rect();
  if (hadKb) ui.classList.add('kb');
  for (let i = 0; i < cardEls.length; i++) {
    const c = cardEls[i];
    out.cards.push({ nm: (c.querySelector('.nm') || {}).textContent, sh: c.scrollHeight, ch: c.clientHeight,
      overH: c.scrollHeight - c.clientHeight, kf: c.classList.contains('kf'),
      overBottomRect: avecKf[i], overBottom: sansKf[i] });
  }
  return out;
})()`;

/** Passe en revue les sept écrans, en forçant .s2hud.kc (capuchons opaques). */
async function tourner(ctx, opts = {}) {
  const { page } = ctx;
  const out = [];
  await page.evaluate(c => { window.__M.ui.showScreen('menu'); }, null);
  await sleep(450);
  out.push(await scan(page, 'menu'));
  /* #fsb est relevé ICI, au menu, avec S.phase === 'menu' : sa classe .on
     dépend de l'écran ET de la phase (src/90-boot.js), un showScreen('over')
     forcé pendant une partie le laisse éteint à juste titre. */
  const fsb = await page.evaluate(() => {
    const e = document.getElementById('fsb');
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return { fs: +parseFloat(getComputedStyle(e).fontSize).toFixed(2), aire: +(r.width * r.height).toFixed(0),
      txt: (e.textContent || '').trim(), on: e.classList.contains('on'), phase: window.__S.phase };
  });
  for (const s of ['settings', 'unlocks']) {
    await page.evaluate(n => window.__M.ui.showScreen(n), s);
    await sleep(350);
    out.push(await scan(page, s));
  }
  await page.evaluate(c => { window.__M.ui.showCards(c, () => {}); }, LONGEST);
  await sleep(600);
  out.push(await scan(page, 'cards'));
  const truncCards = await page.evaluate(TRUNC);
  // HUD en jeu : vraie partie, capuchons forcés
  await page.evaluate(() => window.__M.ui.showScreen('menu'));
  await sleep(300);
  await startGame(ctx, { seed: 2030 });
  await sleep(1600);
  await page.evaluate(() => { document.querySelector('.s2hud').classList.add('kc'); });
  await sleep(300);
  out.push(await scan(page, 'hud'));
  await page.evaluate(() => window.__M.ui.showScreen('pause'));
  await sleep(350);
  out.push(await scan(page, 'pause'));
  await page.evaluate(() => window.__M.ui.showScreen('over'));
  await sleep(500);
  out.push(await scan(page, 'over'));
  const truncTiles = await page.evaluate(TRUNC);
  return { ecrans: out, fsb, trunc: { cards: truncCards.cards, tiles: truncTiles.tiles } };
}

const m = {}, fails = [];
const dit = (ok, quoi) => { if (!ok) fails.push(quoi); return ok; };

{ // iPhone à 100 %
  const ctx = await launchPhone({ init: [profileScript()] });
  try {
    await sleep(500);
    m.iphone100 = await tourner(ctx);
    let worst = null;
    for (const e of m.iphone100.ecrans) if (e.min && (!worst || e.min.fs < worst.min.fs)) worst = e;
    m.iphone100.pire = worst;
    dit(worst && worst.min.fs >= 11, `iPhone 100 % : min ${worst && worst.min.fs} px sur « ${worst && worst.ecran} » — ${worst && worst.min.sel} (${worst && worst.min.text})`);
    for (const t of m.iphone100.trunc.tiles) dit(t.over <= 0, `iPhone : tuile ${t.sel} tronquée de ${t.over} px (« ${t.txt} »)`);
    for (const c of m.iphone100.trunc.cards) {
      dit(c.overH <= 1, `iPhone : carte « ${c.nm} » déborde de ${c.overH} px en hauteur`);
      dit(c.overBottom === null || c.overBottom <= 1, `iPhone : carte « ${c.nm} » dépasse la rangée de ${c.overBottom} px`);
    }
    dit(ctx.pageErrors.length === 0, `iPhone 100 % : ${ctx.pageErrors.length} erreur(s) de page (${ctx.pageErrors[0] || ''})`);
  } finally { await ctx.close(); }
}
{ // iPhone à 150 %
  const ctx = await launchPhone({ init: [profileScript(), "window.__S150 = 1;"] });
  try {
    await sleep(500);
    await ctx.page.evaluate(() => { window.__S.opt.uiScale = 1.5; window.__M.ui.relayout(); });
    await sleep(450);
    m.uis150 = await ctx.page.evaluate(() => +getComputedStyle(document.getElementById('ui')).getPropertyValue('--uis').trim());
    m.iphone150 = await tourner(ctx);
    let worst = null;
    for (const e of m.iphone150.ecrans) if (e.min && (!worst || e.min.fs < worst.min.fs)) worst = e;
    m.iphone150.pire = worst;
    dit(worst && worst.min.fs >= 16, `iPhone 150 % : min ${worst && worst.min.fs} px sur « ${worst && worst.ecran} » — ${worst && worst.min.sel} (${worst && worst.min.text})`);
    dit(ctx.pageErrors.length === 0, `iPhone 150 % : ${ctx.pageErrors.length} erreur(s) de page (${ctx.pageErrors[0] || ''})`);
  } finally { await ctx.close(); }
}
{ // bureau 1440×900
  const ctx = await launchDesktop(1440, 900, { init: [profileScript()] });
  try {
    await sleep(500);
    m.bureau = await tourner(ctx);
    let worst = null;
    for (const e of m.bureau.ecrans) if (e.min && (!worst || e.min.fs < worst.min.fs)) worst = e;
    m.bureau.pire = worst;
    dit(worst && worst.min.fs >= 12, `bureau : min ${worst && worst.min.fs} px sur « ${worst && worst.ecran} » — ${worst && worst.min.sel} (${worst && worst.min.text})`);
    dit(m.bureau.fsb && m.bureau.fsb.fs >= 12, `bureau : #fsb ${m.bureau.fsb && m.bureau.fsb.fs} px < 12`);
    dit(m.bureau.fsb && m.bureau.fsb.aire > 0, `bureau : #fsb sans boîte rendue (aire ${m.bureau.fsb && m.bureau.fsb.aire})`);
    for (const t of m.bureau.trunc.tiles) dit(t.over <= 0, `bureau : tuile ${t.sel} tronquée de ${t.over} px (« ${t.txt} »)`);
    for (const c of m.bureau.trunc.cards) {
      dit(c.overH <= 1, `bureau : carte « ${c.nm} » déborde de ${c.overH} px en hauteur`);
      dit(c.overBottom === null || c.overBottom <= 1, `bureau : carte « ${c.nm} » dépasse la rangée de ${c.overBottom} px`);
    }
    dit(ctx.pageErrors.length === 0, `bureau : ${ctx.pageErrors.length} erreur(s) de page (${ctx.pageErrors[0] || ''})`);
  } finally { await ctx.close(); }
}

m.fails = fails;
save('G10-t2-plancher.json', { pass: fails.length === 0, measured: m, threshold: THRESH });
for (const f of fails) console.log('[G10-t2] ÉCHEC :', f);
finish('G10-t2-plancher', { pass: fails.length === 0, measured: m, threshold: THRESH });
