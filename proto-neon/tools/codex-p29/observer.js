/* Sonde de diagnostic : enveloppes d'interfaces publiques, lectures seules, aucun champ privé. */
window.__P29observer = function (N, S, traces) {
  const ennemis = new Map(), silhouettes = new Map(), tirs = new Map(), zones = new Map(), voies = new Map(), evenements = [];
  const copie = x => JSON.parse(JSON.stringify(x));
  const now = () => N.horloge.t();
  function visible(z) {
    const V = N.outils.VUE, r = z.r || 0;
    if (z.forme === 'rect') return Math.max(z.x0, z.x1) >= V.x && Math.min(z.x0, z.x1) <= V.x + V.w && Math.max(z.y0, z.y1) >= V.y && Math.min(z.y0, z.y1) <= V.y + V.h;
    // Intersection disque/cadre ; pour une ligne, découpage paramétrique au cadre élargi.
    if (z.forme === 'disque') return Math.hypot(z.x0 - Math.max(V.x, Math.min(V.x + V.w, z.x0)), z.y0 - Math.max(V.y, Math.min(V.y + V.h, z.y0))) <= r;
    let lo = 0, hi = 1;
    const dx = z.x1 - z.x0, dy = z.y1 - z.y0;
    for (const [p, q] of [[-dx, z.x0 - V.x + r], [dx, V.x + V.w + r - z.x0], [-dy, z.y0 - V.y + r], [dy, V.y + V.h + r - z.y0]]) {
      if (!p) { if (q < 0) return false; continue; }
      if (p < 0) lo = Math.max(lo, q / p); else hi = Math.min(hi, q / p);
      if (lo > hi) return false;
    }
    return true;
  }
  function point(map, id, shown, data) {
    const t = now(), prev = map.get(id), dt = N.R.temps.h;
    const continu = shown && prev && prev.shown && t - prev.t <= dt * 2 + 1e-8;
    const a = { first: prev?.first ?? t, depuis: continu ? prev.depuis : t, shown, t,
      maxVu: Math.max(prev?.maxVu || 0, shown && continu ? t - prev.depuis : 0), data };
    map.set(id, a); return a;
  }
  function scan() {
    for (const e of N.ennemis.list) {
      const data = { id: e.id, type: e.type, x: e.x, y: e.y, r: e.r, etat: e.etat, vuDepuis: e.vuDepuis };
      point(ennemis, e.id, N.cam.shown(e.x, e.y, 0), data);
      const r = Math.max(e.r, (N.R.ennemis[e.type]?.sprite || 0) / 2);
      point(silhouettes, e.id, N.cam.shown(e.x, e.y, -r), data);
    }
    for (const b of N.ennemis.tirs) point(tirs, b.id, N.cam.shown(b.x, b.y, 0), { id: b.id, x: b.x, y: b.y, r: b.r, src: copie(b.src) });
    for (const z of S.tele || []) {
      const key = [z.id, z.forme, z.par?.id, z.par?.type].join('|');
      point(zones, key, visible(z), copie(z));
    }
    for (const voie of S.voies || []) {
      const z = { forme: 'rect', x0: N.outils.A.x0, x1: N.outils.A.x1, y0: voie.y0, y1: voie.y1 };
      point(voies, 'annonce', visible(z), copie(voie));
      if (voie.etat === 'passage') {
        const cfg = N.R.arene.convois, longueur = cfg.wagons * cfg.wagon[0] + (cfg.wagons - 1) * 2;
        z.x0 = voie.x; z.x1 = voie.x - voie.sens * longueur;
        point(voies, 'wagons', visible(z), copie(voie));
      }
    }
  }
  const update = N.cam.update;
  N.cam.update = function (...a) { const r = update.apply(this, a); scan(); return r; };
  const emit = N.ev.emit;
  N.ev.emit = function (type, d) {
    if (['arene', 'arme', 'phase', 'apparition', 'kill'].includes(type)) evenements.push({ t: now(), type, d: copie(d) });
    if (type === 'mort') {
      const id = d.auteurId;
      traces.push({ t: now(), mort: copie(d), source: copie(N.ennemis.list.find(e => e.id === id) ? (() => { const e = N.ennemis.list.find(e => e.id === id); return { id: e.id, type: e.type, x: e.x, y: e.y, etat: e.etat, vuDepuis: e.vuDepuis }; })() : null),
        historiqueSource: copie(ennemis.get(id) || null), silhouette: copie(silhouettes.get(id) || null),
        tirs: copie([...tirs.values()].filter(b => b.data.src?.id === id && now() - b.t < N.R.temps.h * 2)),
        impactsTirs: copie(N.ennemis.tirs.filter(b => b.src?.id === id && Math.hypot(b.x - d.x, b.y - d.y) < b.r + N.R.mort.rayonTete).map(b => ({ id: b.id, x: b.x, y: b.y, r: b.r, historique: tirs.get(b.id) || null }))),
        zones: copie([...zones.values()].filter(z => (z.data.par?.id === id || z.data.par?.type === d.auteur || d.cause === 'souffle' && z.data.par?.type === 'instable') && now() - z.t < N.R.temps.h * 2)),
        tele: copie(S.tele || []), vue: copie(N.outils.VUE), arene: copie(N.arene.etat()),
        voies: copie([...voies.entries()]),
        recent: copie(evenements.slice(-30)), annoncesConvoi: copie(evenements.filter(e => e.type === 'arene' && e.d.evt === 'convoiAnnonce').slice(-1)),
        historiqueAuteur: copie(evenements.filter(e => e.d.id === id)),
        annoncesInstable: copie(evenements.filter(e => e.type === 'kill' && e.d.mods?.includes('instable')).slice(-5)) });
    }
    return emit.apply(this, arguments);
  };
  scan();
};
