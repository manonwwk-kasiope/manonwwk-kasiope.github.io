/* codex-p43 : calcul pur utilisable en VM et dans le navigateur.
   Les images sont celles de gfx.present, après update ; aucun tick simulé.
   Seuils R-22/R-33 inchangés. Les valeurs nulles ne passent jamais. */
export const ecartAng = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
export function latence(evenement, images, cible, tolerance) {
  if (!evenement || !Number.isFinite(evenement.f) || !Number.isFinite(evenement.r))
    return { ok: false, raison: 'événement reçu absent', images: null, ms: null };
  const apres = images.filter(i => i.f > evenement.f && i.r >= evenement.r);
  const reponse = apres.find(i => Number.isFinite(i.vise) && ecartAng(i.vise, cible) <= tolerance);
  const tourne = apres.find(i => Number.isFinite(i.ang) && ecartAng(i.ang, cible) <= tolerance);
  // La cible déjà atteinte avant l'événement ne prouve aucune réponse.
  const avant = images.filter(i => i.f <= evenement.f && i.r <= evenement.r).at(-1);
  const contraste = !!avant && ecartAng(avant.vise, cible) > tolerance;
  return { ok: contraste && !!reponse, raison: !contraste ? 'cap déjà atteint ou image avant absente' : !reponse ? 'geste ignoré / aucune réponse observée' : null,
    images: contraste && reponse ? reponse.f - evenement.f : null,
    ms: contraste && reponse ? reponse.r - evenement.r : null,
    virageMs: contraste && tourne ? tourne.r - evenement.r : null,
    avant: avant || null, reponse: reponse || null, tourne: tourne || null };
}
export function contratEvenements(E, pouce, action) {
  const debut = (id, n) => E.find(e => e.type === 'touchstart' && e.changes.some(p => p.id === id) && e.ids.length === n);
  const fin = E.find(e => e.type === 'touchend' && e.changes.some(p => p.id === action));
  const derniere = E.filter(e => e.type === 'touchend').at(-1);
  const mouvement = E.find(e => e.type === 'touchmove' && e.changes.some(p => p.id === pouce));
  return { ok: !!debut(pouce, 1) && !!debut(action, 2) && !!mouvement &&
    !!fin && fin.ids.length === 1 && fin.ids[0] === pouce && fin.changes.length === 1 &&
    !!derniere && derniere.ids.length === 0 && derniere.changes.some(p => p.id === pouce) &&
    E.every(e => e.fiable === true), fin: fin || null, derniere: derniere || null };
}
export function horlogeReelle(I) {
  const a = I[0], b = I.at(-1);
  const avance = !!a && !!b && b.r > a.r && b.f > a.f && b.t > a.t;
  const mouvement = !!a && I.some(i => Math.hypot(i.x - a.x, i.y - a.y) > 0);
  return { ok: avance && mouvement && I.every(i => i.dtForce === false && !i.paused), avance, mouvement,
    images: I.length, ms: a && b ? b.r - a.r : null, tempsJeu: a && b ? b.t - a.t : null,
    deplacement: a && b ? Math.hypot(b.x - a.x, b.y - a.y) : null };
}
/* Appel sérialisable page.evaluate. Capture brute AVANT les handlers ; état APRÈS
   en phase de propagation window (une microtâche de capture peut précéder les handlers).
   Le tampon est haché après present, sans photographie du DOM ni faux compteur. */
export function installerTrace() {
  if (window.__TACTILE_P43) return;
  window.__TRACE_DOIGTS = [];
  const T = window.__TACTILE_P43 = { images: [], collecter: true };
  const rows = new WeakMap();
  const points = list => Array.from(list || [], p => ({ id: p.identifier, x: p.clientX, y: p.clientY }));
  for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) {
    window.addEventListener(type, e => {
      const row = { type, f: window.__FRAME, r: performance.now(), estampille: e.timeStamp,
        fiable: e.isTrusted, changes: points(e.changedTouches), ids: points(e.touches).map(p => p.id),
        actifs: e.touches.length, cible: e.target && e.target.id };
      rows.set(e, row); window.__TRACE_DOIGTS.push(row);
    }, { capture: true, passive: true });
    window.addEventListener(type, e => {
      const row = rows.get(e), I = window.__S.input, st = I.stick;
      if (row) Object.assign(row, { prevenu: e.defaultPrevented, stick: st ? { ...st } : null,
        pouvoir: !!I.pouvoir, apogee: !!I.apogee, boost: !!I.boost });
    }, { passive: true });
  }
  const N = window.__N, present = N.gfx.present;
  N.gfx.present = function () {
    const r = present.apply(this, arguments);
    if (!T.collecter) return r;
    const S = window.__S, p = S.player, b = N.gfx.buf();
    // Empreinte du vrai tampon, plus la présence de cyan (la joueuse), à chaque image.
    let hash = 2166136261, cyan = 0;
    const c = N.pal.i('cyan'), cp = N.pal.i('cyanPale');
    for (let k = 0; k < b.length; k++) { hash = Math.imul(hash ^ b[k], 16777619); if (b[k] === c || b[k] === cp) cyan++; }
    T.images.push({ f: window.__FRAME, r: performance.now(), t: N.horloge.t(),
      x: p && p.x, y: p && p.y, ang: p && p.ang, vise: p && p.angVise,
      boost: !!(p && p.boost), pouvoirPret: p && p.pouvoirPret, apogee: p && p.apogee,
      etat: N.game.etat(), paused: !!S.paused, dtForce: typeof window.__DT === 'number',
      hash: hash >>> 0, cyan, W: N.gfx.W, H: N.gfx.H });
    return r;
  };
}
