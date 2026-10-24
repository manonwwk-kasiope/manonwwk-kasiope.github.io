// G14 test 1 — l'écran de fin explique la partie qu'il résume.
//
//  A. Mort par un TRAQUEUR obtenue par le chemin du jeu (on attend le contact, on lève
//     l'invulnérabilité, le jeu tue) : S.run.killedBy === 'chaser', la ligne .s2kill dit
//     « Détruit par TRAQUEUR », les libellés PROGRESSION / COMBO MAX / PROCHAIN DÉBLOCAGE
//     portent un chiffre, « dans N ◆ » vaut coût du moins cher non acquis − crédits,
//     la largeur de .s2next>u vaut min(1, crédits/coût) à 1 % près, et l'apogée chargée
//     mais jamais tirée donne un conseil qui parle d'ultime.
//  B. Aucune tuile tronquée (scrollWidth ≤ clientWidth de chaque .s2tile>b), sur 1440×900
//     ET sur iPhone 13 paysage.
//  C. Libellé de build au format « AXE — ARME N » sur 20 parties simulées.
//  D. Une partie au niveau ≥ 3 fait apparaître le bouton REJOUER AU CRAN SUPÉRIEUR.
import { launchDesktop, launchPhone, startGame, sleep, save, finish, deadline } from '../lib.mjs';
import { launchSim, runOne } from '../simlib.mjs';
import { fresh, mortPar, LIRE_OVER, LIRE_CTX } from './g14lib.mjs';

deadline(900, 'G14-t1');
const THRESH = "mort par chaser : run.killedBy === 'chaser', .s2kill ∋ /Détruit par TRAQUEUR/, "
  + "PROGRESSION / COMBO MAX / PROCHAIN DÉBLOCAGE présents avec un chiffre, « dans N ◆ » === coût − crédits, "
  + "largeur .s2next>u === min(1, crédits/coût) ± 1 %, .s2tip ∋ /ultime/i ; "
  + "scrollWidth ≤ clientWidth pour chaque .s2tile>b sur 1440×900 et iPhone ; "
  + "SUR IPHONE 844×390 : .s2next rendue ≥ 24 px, rien de rogné par overflow:hidden, "
  + "texte + jauge tiennent dedans, barre dans le cadre et centre cliquable après défilement, "
  + "largeur de jauge === min(1, crédits/coût) ± 1 % ; "
  + "libellé de build /— [A-ZÉ ]+ \\d/ dans 20/20 parties sim ; niveau ≥ 3 → bouton /CRAN SUPÉRIEUR/ visible";

const m = {}, fails = [];
const dit = (ok, quoi) => { if (!ok) fails.push(quoi); return ok; };

/* ---- A + B(bureau) ---- */
async function partie(ctx, seed) {
  await fresh(ctx);
  await startGame(ctx, { seed });
  await sleep(2600);
  // apogée pleine et jamais tirée : readyTick pose S.run.ultReadyAt par le chemin du jeu
  await ctx.page.evaluate(() => { window.__S.ult = window.__S.ultMax; });
  await sleep(120);
  const fin = await mortPar(ctx, 'chaser', { tmax: 45000 });
  const ctxv = await ctx.page.evaluate(LIRE_CTX);
  const over = await ctx.page.evaluate(LIRE_OVER);
  return { fin, ctxv, over };
}

{
  const c = await launchDesktop(1440, 900);
  let r = null;
  for (const seed of [2030, 777, 4242]) {
    r = await partie(c, seed);
    m.graine = seed;
    if (r.fin.run && r.fin.run.killedBy === 'chaser') break;
  }
  const { fin, ctxv, over } = r;
  m.run = fin.run; m.lastHit = fin.lastHit; m.screen = fin.screen;
  m.kill = over && over.kill; m.tip = over && over.tip; m.build = over && over.build;
  m.nextTxt = over && over.nextTxt; m.nextFrac = over && over.nextFrac;
  m.barreDesk = over && { hauteur: over.nextH, rogne: over.nextClip, hauteurTexte: over.nextLabelH,
                          hauteurJauge: over.nextUH, visibleSansDefiler: over.nextVisible };
  m.coins = ctxv.coins; m.next = ctxv.next;

  dit(fin.run && fin.run.killedBy === 'chaser', 'killedBy=' + (fin.run && fin.run.killedBy));
  dit(!!over && /Détruit par TRAQUEUR/.test(over.kill || ''), 'ligne kill=' + (over && over.kill));
  for (const lab of ['PROGRESSION', 'COMBO MAX']) {
    const t = over.tuiles.find(x => x.label === lab);
    dit(!!t && /\d/.test(t.valeur), 'tuile ' + lab + '=' + (t && t.valeur));
  }
  dit(/PROCHAIN DÉBLOCAGE/.test(over.nextTxt || '') && /\d/.test(over.nextTxt || ''),
      'barre déblocage=' + over.nextTxt);
  const attenduN = Math.max(0, ctxv.next[1] - ctxv.coins);
  const luN = (over.nextTxt.match(/dans (\d+) ◆/) || [])[1];
  m.dansN = { lu: luN == null ? null : +luN, attendu: attenduN, cout: ctxv.next[1], credits: ctxv.coins };
  dit(luN != null && +luN === attenduN, 'dans N ◆ : lu ' + luN + ' attendu ' + attenduN);
  const fracAtt = Math.min(1, ctxv.coins / ctxv.next[1]);
  m.fracBarre = { lu: over.nextFrac, attendu: +fracAtt.toFixed(4) };
  dit(over.nextFrac != null && Math.abs(over.nextFrac - fracAtt) <= 0.01,
      'largeur barre : ' + over.nextFrac + ' vs ' + fracAtt.toFixed(4));
  dit((fin.run.ultReadyAt | 0) > 0 && !fin.run.usedUlt, 'ultReadyAt=' + fin.run.ultReadyAt + ' usedUlt=' + fin.run.usedUlt);
  dit(/ultime/i.test(over.tip || ''), 'conseil=' + over.tip);
  m.tuilesDesk = over.tuiles.map(t => ({ l: t.label, sw: t.sw, cw: t.cw }));
  const tronqDesk = over.tuiles.filter(t => t.sw > t.cw);
  dit(tronqDesk.length === 0, 'tuiles tronquées bureau : ' + JSON.stringify(tronqDesk));
  m.debordeDesk = { y: over.debordeY, x: over.debordeX };
  await c.close();
}

/* ---- B(iPhone) : tuiles ET barre du prochain déblocage RÉELLEMENT rendue ----
   La barre est une pièce centrale du « quoi » : elle doit exister au pixel sur la
   plateforme de référence, pas seulement répondre juste à getBoundingClientRect sur
   le profil bureau. On relève donc ici sa hauteur rendue, ce que overflow:hidden
   rogne, et la fraction de sa jauge. */
{
  const c = await launchPhone();
  const r = await partie(c, 2030);
  const over = r.over, ctxv = r.ctxv;
  m.tuilesPhone = over.tuiles.map(t => ({ l: t.label, sw: t.sw, cw: t.cw }));
  const tronq = over.tuiles.filter(t => t.sw > t.cw);
  dit(tronq.length === 0, 'tuiles tronquées iPhone : ' + JSON.stringify(tronq));
  m.debordePhone = { y: over.debordeY, x: over.debordeX };
  dit(over.debordeX <= 1, 'débordement horizontal iPhone : ' + over.debordeX);

  m.barrePhone = { hauteur: over.nextH, rogne: over.nextClip, hauteurTexte: over.nextLabelH,
                   hauteurJauge: over.nextUH, texte: over.nextTxt, frac: over.nextFrac,
                   visibleSansDefiler: over.nextVisible };
  dit(/PROCHAIN DÉBLOCAGE/.test(over.nextTxt || '') && /\d/.test(over.nextTxt || ''),
      'barre déblocage iPhone=' + over.nextTxt);
  // 24 px est la plus petite cible tactile utilisable ; le défaut mesuré valait 2,00 px.
  dit(over.nextH != null && over.nextH >= 24, 'hauteur .s2next iPhone = ' + over.nextH + ' px');
  dit(over.nextClip != null && over.nextClip <= 1, 'contenu rogné par overflow:hidden = ' + over.nextClip + ' px');
  dit(over.nextH != null && over.nextLabelH != null && over.nextH >= over.nextLabelH + over.nextUH - 1,
      'texte + jauge ne tiennent pas dans la barre : ' + over.nextH + ' < ' + over.nextLabelH + '+' + over.nextUH);
  const fracAttP = Math.min(1, ctxv.coins / ctxv.next[1]);
  m.fracBarrePhone = { lu: over.nextFrac, attendu: +fracAttP.toFixed(4), credits: ctxv.coins, cout: ctxv.next[1] };
  dit(over.nextFrac != null && Math.abs(over.nextFrac - fracAttP) <= 0.01,
      'largeur barre iPhone : ' + over.nextFrac + ' vs ' + fracAttP.toFixed(4));
  /* Atteignable au doigt : l'écran de fin défile (c'est assumé dans le code), donc on
     fait ce que la joueuse fait — on amène la barre dans le cadre — puis on demande au
     navigateur qui se trouve au centre du rectangle. « visibleSansDefiler » reste relevé
     à part : c'est un confort, pas le seuil. */
  await c.page.evaluate(() => { document.querySelector('.s2scr.on .s2next').scrollIntoView({ block: 'center' }); });
  await sleep(200);
  const cible = await c.page.evaluate(`(() => {
    const n = document.querySelector('.s2scr.on .s2next');
    if (!n) return null;
    const r = n.getBoundingClientRect();
    const el = document.elementFromPoint(Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2));
    return { dansLaBarre: !!(el && n.contains(el)), tag: el ? (el.className || el.tagName) : null,
             y: +r.y.toFixed(1), bas: +(r.y + r.height).toFixed(1), vh: innerHeight,
             dansLeCadre: r.y >= 0 && r.y + r.height <= innerHeight };
  })()`);
  m.ciblePhone = cible;
  dit(!!cible && cible.dansLeCadre, 'barre hors du cadre même après défilement : ' + JSON.stringify(cible));
  dit(!!cible && cible.dansLaBarre, 'centre de la barre non cliquable : ' + JSON.stringify(cible));
  await c.close();
}

/* ---- C : 20 parties simulées, format du libellé de build ---- */
{
  const RX = /— [A-ZÉ ]+ \d/;
  const sim = await launchSim('desk1440');
  const labels = [];
  for (let i = 0; i < 20; i++) {
    await runOne(sim.page, { diff: 1, seed: 3000 + i * 37, maxT: 45000 });
    const l = await sim.page.evaluate(() => {
      const b = document.querySelector('.s2build');
      return b ? b.textContent : null;
    });
    labels.push(l);
    await sim.page.evaluate(() => { window.__M.ui.showScreen('menu'); });
  }
  m.builds = labels;
  const ok = labels.filter(l => l && RX.test(l)).length;
  m.buildsOk = ok + '/20';
  dit(ok === 20, 'libellés de build au format : ' + ok + '/20 — ' + JSON.stringify(labels.filter(l => !l || !RX.test(l))));
  await sim.browser.close();
}

/* ---- D : niveau ≥ 3 → bouton CRAN SUPÉRIEUR ---- */
{
  const sim = await launchSim('desk1440');
  const r = await runOne(sim.page, { diff: 1, seed: 5150, maxT: 620000, god: true });
  const v = await sim.page.evaluate(() => {
    const sc = document.querySelector('.s2scr.on');
    const up = sc ? Array.from(sc.querySelectorAll('button')).find(b => /CRAN SUPÉRIEUR/.test(b.textContent)) : null;
    return { level: window.__S.level, screen: window.__M.ui.screen(),
             visible: !!(up && up.offsetParent !== null) };
  });
  m.cranSup = { niveau: v.level, visible: v.visible, ecran: v.screen, partie: r };
  dit(v.level >= 3, 'niveau atteint en mode invincible : ' + v.level);
  dit(v.visible, 'bouton CRAN SUPÉRIEUR visible au niveau ' + v.level);
  await sim.browser.close();
}

m.fails = fails;
const res = { pass: fails.length === 0, measured: m, threshold: THRESH };
save('G14-t1-fin.json', res);
finish('G14-t1-fin', res);
