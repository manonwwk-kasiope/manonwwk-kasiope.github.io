// G14 réserve 2 — la barre PROCHAIN DÉBLOCAGE existe EN PIXELS sur iPhone 13 paysage.
//
// Le test 1 mesure la géométrie DOM (hauteur rendue, rognage, fraction de jauge, cible
// cliquable). C'est nécessaire mais pas suffisant : un élément peut avoir un rectangle
// correct et ne peindre aucun pixel (couleur transparente, opacité nulle, recouvrement).
// Ici on relève la SORTIE RÉELLE : on capture l'écran de fin rendu sur le profil de
// référence (844×390, dpr 3), on redécode la capture DANS la page (createImageBitmap +
// getImageData) et on compte l'encre effectivement peinte, séparément pour la ligne de
// texte et pour la piste de la jauge. La largeur remplie de la jauge est relue au pixel
// et comparée à min(1, crédits/coût).
import { launchPhone, startGame, sleep, save, finish, deadline, OUT } from '../lib.mjs';
import { fresh, mortPar, LIRE_OVER, LIRE_CTX } from './g14lib.mjs';
import fs from 'node:fs';
import path from 'node:path';

deadline(420, 'G14-r2');
const THRESH = "iPhone 13 paysage 844×390 : la barre .s2next est peinte — ≥ 200 pixels d'encre "
  + "de texte dans sa ligne de libellé ; remplissage de jauge peint et distinct de la piste "
  + "(écart de luminance ≥ 40) ; bord droit du remplissage au pixel === bord gauche + "
  + "min(1, crédits/coût) × piste × dpr ± 3 px, largeur peinte dans [attendu−4 ; attendu+2] px "
  + "(le coin arrondi de la barre rogne le bas-gauche) ; barre entièrement dans le cadre du viewport";

const m = {}, fails = [];
const dit = (ok, quoi) => { if (!ok) fails.push(quoi); return ok; };

const c = await launchPhone();
try {
  await fresh(c);
  await startGame(c, { seed: 2030 });
  await sleep(2600);
  await mortPar(c, 'chaser', { tmax: 45000 });
  const ctxv = await c.page.evaluate(LIRE_CTX);
  const over = await c.page.evaluate(LIRE_OVER);
  m.ecran = { nextTxt: over.nextTxt, hauteur: over.nextH, frac: over.nextFrac };
  dit(/PROCHAIN DÉBLOCAGE/.test(over.nextTxt || ''), 'libellé absent : ' + over.nextTxt);

  // La joueuse amène la barre dans le cadre ; on capture ce qu'elle voit alors.
  await c.page.evaluate(() => { document.querySelector('.s2scr.on .s2next').scrollIntoView({ block: 'center' }); });
  await sleep(250);
  const geo = await c.page.evaluate(`(() => {
    const n = document.querySelector('.s2scr.on .s2next');
    const s = n.querySelector('s'), u = n.querySelector('u');
    const R = e => { const r = e.getBoundingClientRect();
      return { x: +r.x.toFixed(2), y: +r.y.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2) }; };
    return { dpr: devicePixelRatio, vw: innerWidth, vh: innerHeight,
             next: R(n), s: R(s), u: R(u), pisteInner: n.clientWidth };
  })()`);
  m.geo = geo;
  dit(geo.next.y >= 0 && geo.next.y + geo.next.h <= geo.vh,
      'barre hors du cadre : ' + JSON.stringify(geo.next));

  const png = await c.page.screenshot({ clip: { x: geo.next.x, y: geo.next.y, width: geo.next.w, height: geo.next.h } });
  const f = path.join(OUT, 'G14-r2-barre-iphone.png');
  fs.writeFileSync(f, png);
  m.capture = f;

  // Redécodage dans la page : le navigateur est le seul décodeur PNG disponible ici.
  const px = await c.page.evaluate(async (b64) => {
    const bin = atob(b64), a = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    const bmp = await createImageBitmap(new Blob([a], { type: 'image/png' }));
    const cv = document.createElement('canvas'); cv.width = bmp.width; cv.height = bmp.height;
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.drawImage(bmp, 0, 0);
    const d = g.getImageData(0, 0, bmp.width, bmp.height).data;
    const W = bmp.width, H = bmp.height;
    // Fond de référence : la médiane des luminances de l'image (la barre est très majoritairement fond).
    const lum = i => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    const all = []; for (let i = 0; i < d.length; i += 4) all.push(lum(i));
    const tri = all.slice().sort((p, q) => p - q); const med = tri[tri.length >> 1];
    // Encre = pixel dont la luminance s'écarte de plus de 24 du fond médian.
    const ligne = []; // encre par ligne de pixels
    for (let y = 0; y < H; y++) { let n = 0;
      for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; if (Math.abs(lum(i) - med) > 24) n++; }
      ligne.push(n); }
    return { W, H, med: +med.toFixed(1), ligne, total: ligne.reduce((s, v) => s + v, 0) };
  }, png.toString('base64'));

  const dpr = geo.dpr;
  const yTexte0 = 0, yTexte1 = Math.round((geo.s.y + geo.s.h - geo.next.y) * dpr);
  const yJauge0 = Math.round((geo.u.y - geo.next.y) * dpr), yJauge1 = Math.round((geo.u.y + geo.u.h - geo.next.y) * dpr);
  const somme = (a, b) => px.ligne.slice(Math.max(0, a), Math.min(px.ligne.length, b)).reduce((s, v) => s + v, 0);
  m.pixels = { largeur: px.W, hauteur: px.H, fondMedian: px.med, encreTotale: px.total,
               encreTexte: somme(yTexte0, yTexte1), encreJauge: somme(yJauge0, yJauge1),
               bandeTexte: [yTexte0, yTexte1], bandeJauge: [yJauge0, yJauge1] };
  dit(m.pixels.encreTexte >= 200, "encre de texte insuffisante : " + m.pixels.encreTexte + ' px');
  dit(m.pixels.encreJauge > 0, 'jauge non peinte : 0 px');

  /* Largeur remplie au pixel.
     Deux pièges corrigés ici, mesure à l'appui :
       1. le fond de référence est la PISTE de la jauge (rgba(255,255,255,.1) sur le panneau,
          luminance ≈ 39), pas le coin arrondi de la barre : une première version prenait le
          pixel le plus à droite comme fond, tombait sur ce coin, et concluait à tort à une
          jauge pleine à 99,8 % ;
       2. .s2next porte border-radius:9px + overflow:hidden, donc l'arc du coin bas-gauche
          rogne le remplissage DE PLUS EN PLUS bas dans la bande (0,5 px CSS en haut de la
          bande, 9 px CSS tout en bas). Une seule ligne de pixels sous-estime donc la largeur
          (25 px au milieu de la bande contre 29 réels). On prend la couverture MAXIMALE par
          colonne sur toute la bande de la jauge, ce qui annule ce rognage.
     Le bord droit, lui, n'est pas rogné : c'est lui qui porte le signal de largeur. */
  const remplie = await c.page.evaluate(async ({ b64, y0, y1 }) => {
    const bin = atob(b64), a = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    const bmp = await createImageBitmap(new Blob([a], { type: 'image/png' }));
    const cv = document.createElement('canvas'); cv.width = bmp.width; cv.height = bmp.height;
    const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(bmp, 0, 0);
    y1 = Math.min(y1, bmp.height);
    const W = bmp.width, H = y1 - y0;
    const d = g.getImageData(0, y0, W, H).data;
    const L = []; for (let i = 0; i < d.length; i += 4) L.push(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]);
    const tri = L.slice().sort((p, q) => p - q);
    const piste = tri[tri.length >> 1];   // la piste occupe la majorité de la bande
    const haut = tri[tri.length - 1];     // le remplissage ambre en est le plus clair
    const cov = [];
    for (let x = 0; x < W; x++) { let mx = 0;
      for (let y = 0; y < H; y++) { const c = (L[y * W + x] - piste) / (haut - piste); if (c > mx) mx = c; }
      cov.push(mx); }
    let x0 = -1, x1b = -1, n = 0;
    for (let x = 0; x < W; x++) if (cov[x] >= 0.5) { if (x0 < 0) x0 = x; x1b = x; n++; }
    return { x0, x1: x1b, largeur: n, largeurCapture: W, bandeH: H,
             lumPiste: +piste.toFixed(1), lumRemplissage: +haut.toFixed(1),
             profil: cov.slice(0, 44).map(v => +v.toFixed(2)) };
  }, { b64: png.toString('base64'), y0: yJauge0, y1: yJauge1 });

  const fracAtt = Math.min(1, ctxv.coins / ctxv.next[1]);
  const pisteCss = geo.pisteInner;                       // clientWidth de .s2next : la piste utile
  const gauchePx = (geo.u.x - geo.next.x) * dpr;         // bord gauche théorique du remplissage
  const attLargeur = fracAtt * pisteCss * dpr;           // largeur attendue, en pixels d'écran
  const attDroite = gauchePx + attLargeur;               // bord droit attendu, en pixels d'écran
  const droiteMes = remplie.x1 + 1;
  m.jauge = { credits: ctxv.coins, cout: ctxv.next[1], fracAttendue: +fracAtt.toFixed(4),
              pisteCss: pisteCss, dpr: dpr,
              largeurAttenduePx: +attLargeur.toFixed(1), largeurMesureePx: remplie.largeur,
              bordDroitAttenduPx: +attDroite.toFixed(1), bordDroitMesurePx: droiteMes,
              premierX: remplie.x0, lumPiste: remplie.lumPiste, lumRemplissage: remplie.lumRemplissage,
              profilGauche: remplie.profil,
              fracPixels: +(remplie.largeur / (pisteCss * dpr)).toFixed(4) };
  dit(remplie.largeur > 0, 'aucun pixel de remplissage peint dans la bande de la jauge');
  dit(Math.abs(droiteMes - attDroite) <= 3,
      'bord droit du remplissage ' + droiteMes + ' px vs attendu ' + attDroite.toFixed(1) + ' px');
  dit(remplie.largeur >= attLargeur - 4 && remplie.largeur <= attLargeur + 2,
      'largeur peinte ' + remplie.largeur + ' px hors de [' + (attLargeur - 4).toFixed(1)
      + ' ; ' + (attLargeur + 2).toFixed(1) + '] px');
  dit(remplie.lumRemplissage - remplie.lumPiste >= 40,
      'remplissage indistinct de la piste : ' + remplie.lumRemplissage + ' vs ' + remplie.lumPiste);
  m.err = await c.page.evaluate(() => window.__ERR);
} finally { await c.close(); }

m.fails = fails;
const r = { pass: fails.length === 0, measured: m, threshold: THRESH };
save('G14-r2-barre-pixels.json', r);
finish('G14-r2-barre-pixels', r);
