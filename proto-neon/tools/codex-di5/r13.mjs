/* Instrument unique R-13. Les constantes du codec sont un format, pas des réglages de jeu.
   Par pixel et famille : une transition est consommée au premier signe opposé ultérieur.
   Les pixels terminant L et/ou R au même rendu sont unis AVANT le seuil d'aire.
   Aucun appariement entre rendus de dimensions différentes. w est en secondes de présentation. */
export const NON_QUALIFIABLE = 'non qualifiable (fractions sans recouvrement spatial)';

/* Fonction autonome sérialisable dans les acquisitions navigateur. RLE sans perte des quatre
   masques signés : valeur 4 bits, longueur varint ; base64 pour le transport JSON. */
export function transitions(a, b, L, delta, sombre) {
  const bytes = [], n = b.length;
  let value = -1, run = 0, up = 0, dn = 0, rin = 0, rout = 0;
  function flush() { if (!run) return; bytes.push(value); let k = run; while (k >= 128) { bytes.push((k % 128) | 128); k = Math.floor(k / 128); } bytes.push(k); }
  for (let i = 0; i < n; i++) {
    let v = 0;
    if (a && a.length === n) {
      const x = a[i], y = b[i], d = L[y] - L[x];
      if (Math.min(L[x], L[y]) < sombre) { if (d >= delta) { v |= 1; up++; } else if (d <= -delta) { v |= 2; dn++; } }
      const r = x === 5 || x === 11 || x === 14, s = y === 5 || y === 11 || y === 14;
      if (s && !r) { v |= 4; rin++; } else if (r && !s) { v |= 8; rout++; }
    }
    if (v !== value) { flush(); value = v; run = 0; } run++;
  }
  flush(); let binary = ''; for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.slice(i, i + 8192));
  return { up: up / n, dn: dn / n, rin: rin / n, rout: rout / n,
    r13: { codec: 'r13-rle-v1', n, data: btoa(binary) } };
}

/* Seulement pour publier la valeur historique, jamais pour attribuer un dépassement. */
export function borneHistorique(images) {
  const last = {}, instants = [];
  for (const x of images) for (const [key, opp] of [['up', 'dn'], ['dn', 'up'], ['rin', 'rout'], ['rout', 'rin']]) {
    if (!(x[key] > images.aire)) continue;
    if (last[opp] !== undefined) { if (instants.at(-1) !== x.w) instants.push(x.w); delete last[opp]; } else last[key] = x.w;
  }
  return fenetre(instants);
}
function fenetre(instants, indices = null, hz = null) {
  let maxParSeconde = 0, a = null;
  // L'acquisition réelle utilise w. Pour un générateur explicitement à pas fixe,
  // comparer les indices évite que 19/12 - 7/12 = 0.9999999999999999 ajoute un 13e rendu.
  for (let i = 0, j = 0; i < instants.length; i++) { while (indices ? indices[i] - indices[j] >= hz : instants[i] - instants[j] >= 1) j++; if (i - j + 1 > maxParSeconde) { maxParSeconde = i - j + 1; a = instants[i]; } }
  return { flashs: instants.length, maxParSeconde, a, instants };
}
export function nonQualifiable(ancienne = null, raison = NON_QUALIFIABLE) {
  return { qualifiable: false, statut: raison, flashs: null, maxParSeconde: null, a: null, conforme: null,
    borneSuperieureNonProbante: ancienne ? { libelle: 'Borne supérieure historique non probante ; aucun dépassement établi',
      flashs: ancienne.flashs ?? null, maxParSeconde: ancienne.maxParSeconde ?? null } : null };
}

export function compteur(aire, { hzFixe = null } = {}) {
  if (!Number.isFinite(aire) || aire < 0 || aire >= 1) throw Error('Seuil d’aire R-13 absent/invalide');
  let L, R, dimension, lastW = -Infinity, nFrames = 0;
  const evenements = [];
  return {
    ajouter(x) {
      const m = x.r13;
      if (!m || m.codec !== 'r13-rle-v1' || !Number.isInteger(m.n) || m.n <= 0 || !Number.isFinite(x.w) || x.w <= lastW) throw Error('Masques ou temps R-13 absents/invalides');
      lastW = x.w; nFrames++;
      if (hzFixe !== null && (!(hzFixe > 0) || x.w !== (nFrames - 1) / hzFixe)) throw Error('Acquisition déclarée fixe mais horodatages divergents');
      const dim = [x.W, x.H, m.n].join(':');
      if (dimension !== dim) { L = new Int8Array(m.n); R = new Int8Array(m.n); dimension = dim; }
      const bytes = Buffer.from(m.data, 'base64'); let p = 0, commun = 0;
      for (let k = 0; k < bytes.length;) {
        const v = bytes[k++]; let run = 0, power = 1, z;
        do { if (k >= bytes.length || power > m.n * 128) throw Error('RLE tronqué'); z = bytes[k++]; run += (z & 127) * power; power *= 128; } while (z & 128);
        if (v > 15 || (v & 3) === 3 || (v & 12) === 12 || run <= 0 || p + run > m.n) throw Error('RLE invalide');
        if (v) for (let end = p + run; p < end; p++) {
          const sl = v & 1 ? 1 : v & 2 ? -1 : 0, sr = v & 4 ? 1 : v & 8 ? -1 : 0;
          let fini = false;
          if (sl) { if (L[p] === -sl) { fini = true; L[p] = 0; } else L[p] = sl; }
          if (sr) { if (R[p] === -sr) { fini = true; R[p] = 0; } else R[p] = sr; }
          if (fini) commun++;
        } else p += run;
      }
      if (p !== m.n) throw Error('Surface RLE incomplète');
      if (commun / m.n > aire) evenements.push({ w: x.w, image: nFrames - 1, surface: commun / m.n, pixels: commun, total: m.n });
    },
    resultat() { const r = fenetre(evenements.map(x => x.w), hzFixe ? evenements.map(x => x.image) : null, hzFixe); return { qualifiable: nFrames > 0, statut: nFrames ? 'mesuré spatialement' : 'non qualifiable (aucun rendu)',
      ...r, evenements, surface: evenements.find(x => x.w === r.a)?.surface ?? null,
      surfaceMax: evenements.length ? Math.max(...evenements.map(x => x.surface)) : 0,
      limite: 'Paires spatiales du tampon palette ; pas une certification WCAG ni une mesure de Safari physique.' }; }
  };
}
export function flashs(images, aire, dt, options) {
  try { const c = compteur(aire, options); images.forEach((x, i) => c.ajouter({ ...x, w: Number.isFinite(x.w) ? x.w : dt > 0 ? i * dt : NaN })); return c.resultat(); }
  catch (e) {
    const a = images.map((x, i) => ({ ...x, w: Number.isFinite(x.w) ? x.w : dt > 0 ? i * dt : NaN })); a.aire = aire;
    return nonQualifiable(borneHistorique(a), images.every(x => x.r13) ? 'non qualifiable (' + e.message + ')' : NON_QUALIFIABLE);
  }
}
