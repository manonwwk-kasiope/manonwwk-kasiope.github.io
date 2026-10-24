/* R-12 — Explosion. Caméra : amplitude publique S.shake en pixels de jeu,
   au même instant de chaque image rendue, appariée au témoin sans coup fatal.
   Aucun mouvement de suivi n'est compté, aucun seuil du jeu n'est changé. */
import { executer, principal, seuils, exiger } from '../commun.mjs';
export const meta = { id: 'R-12', titre: 'Explosion', seuil: 'brasier > 8 % pendant ≥ 4 images ; caméra ≥ 6 px', bloquant: true };

// Réducteur partagé avec les contre-épreuves VM. Pas de zip tronqué/décalé.
export function cameraAppariee(impact, temoin) {
  const a = impact.trace.filter(x => x.f > impact.imageCoup).slice(0, 30);
  const b = temoin.trace.filter(x => x.f > temoin.imageCoup).slice(0, 30);
  if (impact.imageCoup === null || temoin.imageCoup === null || a.length !== 30 || b.length !== 30)
    return { ok: false, raison: 'trente images après le coup nécessaires dans les deux branches' };
  const paires = [];
  for (let i = 0; i < a.length; i++) {
    const x = a[i], y = b[i], relatif = i + 1;
    if (x.f - impact.imageCoup !== relatif || y.f - temoin.imageCoup !== relatif ||
        !Number.isFinite(x.sh) || !Number.isFinite(y.sh) || x.sh < 0 || y.sh < 0 || x.erreurSonde || y.erreurSonde)
      return { ok: false, raison: 'image absente, dupliquée, désappariée ou secousse invalide', relatif, impact: x, temoin: y };
    paires.push({ relatif, imageImpact: x.f, imageTemoin: y.f, impact: x.sh, temoin: y.sh, difference: x.sh - y.sh });
  }
  return { ok: true, camera: Math.max(0, ...paires.map(x => x.difference)), paires,
    source: 'S.shake avant N.gfx.present ; différence positive image par image, pixels de jeu' };
}
export function ancienCalcul(r) {
  const base = r.trace.filter(x => x.f <= r.imageCoup).slice(-30);
  const apres = r.trace.filter(x => x.f > r.imageCoup).slice(0, 30);
  const ecart = (l, c) => c ? Math.max(0, ...l.map(x => Math.max(Math.hypot(x.cx - x.px - (c.cx - c.px), x.cy - x.py - (c.cy - c.py)), x.sh))) : null;
  const temoin = ecart(base.slice(1), base[0]), brut = ecart(apres, base.at(-1));
  return { camera: brut === null || temoin === null ? null : Math.max(0, brut - temoin), brut, temoin };
}

// AVANT le bundle : livrer les vrais rappels RAF un par image, sans course avec
// page.evaluate. frame() de 90-boot reste intact : entrées, horloge, dessin, CRT.
export function installerImagesCamera() {
  let prochain = 0, temps = 0;
  const rappels = new Map();
  window.requestAnimationFrame = fn => { const id = ++prochain; rappels.set(id, fn); return id; };
  window.cancelAnimationFrame = id => rappels.delete(id);
  window.__R12Avancer = () => {
    const avant = window.__FRAME || 0, a = [...rappels.values()]; rappels.clear();
    temps += window.__DT * 1000;
    for (const fn of a) fn(temps);
    if (window.__FRAME !== avant + 1) throw Error('R-12 : une seule vraie image attendue, ' + avant + ' → ' + window.__FRAME);
  };
}

// Fonction sérialisable Playwright/VM. 3/30/60 images et placement 70 px : fixture
// reçue. Toutes les morts précédentes sont rejouées dans CHAQUE branche : même
// budget de flash et mêmes cascades, pas de remise à zéro entre les cibles.
export function scenarioCamera({ index, sansCoup = false, plan = null }) {
  const N = window.__N, S = window.__S, M = window.__MESURE;
  const cibles = [{ boss: true, nom: 'CYCLOPE' }, { elite: 'flecheBlindee', type: 'fleche' },
    { elite: 'rival', type: 'rival' }, { elite: 'rucheInstable', type: 'ruche' }];
  const resultats = [], image = () => window.__R12Avancer();
  S.jour = 20261017; N.journal.actif(true);
  for (let j = 0; j <= index; j++) {
    const cible = cibles[j];
    if (N.intro.state && N.intro.state().mode === 'ouverture') N.intro.skip();
    if (N.game.dbg.scene(cible.boss ? 'boss3' : 'v5') === false) throw Error('scène R-12 refusée');
    for (let k = 0; k < 3; k++) image();
    N.game.dbg.god(true);
    M.parImage('r12-camera', `var b=N.gfx.buf(), n=0, h=2166136261;
      for(var i=0;i<b.length;i++){if(b[i]===N.pal.i('brasier'))n++;h=Math.imul(h^b[i],16777619)>>>0;}
      var p=S.player||{x:0,y:0};return {f:window.__FRAME,br:n/b.length,cx:N.cam.x,cy:N.cam.y,
        px:p.x,py:p.y,sh:S.shake,e:M.etat(),tampon:h};`);
    let r;
    try {
      for (let k = 0; k < 30; k++) image();
      if (!cible.boss) {
        const p = S.player, mods = {};
        for (const nom of N.R.elites[cible.elite].mods) mods[nom] = true;
        const e = N.ennemis.spawn(cible.type, p.x + Math.cos(p.ang) * 70, p.y + Math.sin(p.ang) * 70, { elite: cible.elite, mods });
        cible.id = e ? e.id : null;
      }
      let tue = { coups: 0, tues: 0, reste: 0 }, imageCoup = null, tentative = null, avantCoup = null;
      const borne = cible.boss ? N.R.tests.scenes.boss.preparationMax / N.R.temps.imageRef : 1;
      for (let k = 0; k < borne; k++) {
        const l = N.ennemis.list.filter(e => e.etat !== 'mort' && (cible.boss ? e.boss && e.partie === 'oeil' : e.id === cible.id));
        const avant = { frame: window.__FRAME, etat: N.game.etat(), shake: S.shake, seed: S.seed,
          rng: S.rngState, horloge: N.horloge.etat(), cibles: l.map(e => ({ id: e.id, pv: e.pv, pvMax: e.pvMax })), journal: N.journal.dump() };
        // Seul le coup fatal est omis, à l'image constatée dans la branche impact.
        if (sansCoup && j === index && k === plan[j].tentative) {
          tentative = k; imageCoup = window.__FRAME; avantCoup = avant; tue.reste = l.length; break;
        }
        let tues = 0;
        for (const e of l) if (N.ennemis.hit(e, Math.max(1, e.pvMax || e.pv || 1) * 4, { genre: 'arme', type: 'canon', id: 0 })) tues++;
        tue.coups += l.length; tue.tues += tues; tue.reste = l.length - tues;
        if (tues) { tentative = k; imageCoup = window.__FRAME; avantCoup = avant; break; }
        if (!l.length) break;
        image();
      }
      for (let k = 0; k < 60; k++) image();
      r = { cible, tue, imageCoup, tentative, avantCoup, journal: N.journal.dump(), erreurs: M.erreurs() };
    } finally { const trace = M.arreter('r12-camera'); if (r) r.trace = trace; }
    resultats.push(r);
  }
  return resultats;
}
export function comparerCamera(impact, temoin) {
  if (JSON.stringify(impact.avantCoup) !== JSON.stringify(temoin.avantCoup) ||
      JSON.stringify(impact.trace.filter(x => x.f <= impact.imageCoup)) !== JSON.stringify(temoin.trace.filter(x => x.f <= temoin.imageCoup)))
    return { ok: false, raison: 'branches différentes avant le coup (état, horloge, journal ou tampon) ; imputation refusée' };
  return cameraAppariee(impact, temoin);
}
export async function mesurer(banc, res, { profil = 'paysage' } = {}) {
  const s = await banc.ouvrir(profil, { dt: 1 / 60, query: { auto: 0 } });
  const { s: S } = await seuils(s, 'R12');
  if (!await exiger(s, res, 'destruction', ['N.ennemis.hit', 'N.ennemis.list', 'N.ennemis.spawn', 'N.cam.x', 'N.gfx.present', 'N.game.dbg.god', 'N.horloge.etat'])) return;
  await s.page.addInitScript(installerImagesCamera);
  const rejouer = async o => {
    await s.recharger();
    await s.page.waitForFunction(() => window.__N.art.ready(), null, { polling: 100 });
    return s.eval(scenarioCamera, o);
  };
  res.note('Caméra : max des différences de S.shake appariées sur les trente images après coup ; suivi exclu. Amplitude publique, pas déplacement CRT certifié. Ancien calcul conservé.');
  for (let index = 0; index < 4; index++) {
    const avec = await rejouer({ index }), r = avec[index];
    const nom = r.cible.boss ? 'mort du CYCLOPE' : 'mort de l’élite ' + r.cible.elite;
    if (!r.tue.tues) { res.nonMesurable(nom, 'cible non détruite par N.ennemis.hit (' + JSON.stringify(r.tue) + ')', { impact: r }); continue; }
    if (!index) res.capture(await s.capture('R-12-cyclope'));
    const sans = await rejouer({ index, sansCoup: true, plan: avec }), temoin = sans[index];
    const camera = comparerCamera(r, temoin), ancien = ancienCalcul(r);
    const apres = r.trace.filter(x => x.f > r.imageCoup);
    let run = 0, best = 0; for (const x of apres) { run = x.br > S.brasier ? run + 1 : 0; best = Math.max(best, run); }
    res.verifie(`${nom} : images à plus de ${S.brasier * 100} % de brasier (suite la plus longue)`, best, '≥ ' + S.images, best >= S.images,
      { brasierMax: Math.max(0, ...apres.map(x => x.br)), imageCoup: r.imageCoup, trace: r.trace });
    const extra = { ...camera, ancien, impact: r, temoin };
    if (!camera.ok) res.nonMesurable(`${nom} : mouvement de caméra imputable au coup (px)`, camera.raison, extra);
    else res.verifie(`${nom} : mouvement de caméra imputable au coup (px)`, camera.camera, '≥ ' + S.camera, camera.camera >= S.camera, extra);
    const erreurs = await s.bilanErreurs();
    res.verifie(`${nom} : zéro erreur des deux branches`, r.erreurs.count + temoin.erreurs.count, '= 0', !r.erreurs.count && !temoin.erreurs.count && erreurs.zero, { erreurs });
  }
}
if (principal(import.meta.url)) executer({ meta, mesurer });
