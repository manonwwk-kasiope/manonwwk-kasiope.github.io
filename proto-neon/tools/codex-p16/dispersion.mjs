// Fonction autonome, utilisée aussi dans le contexte de la page.
export function distribution(a) {
  if (!a.length) return { n: 0, min: null, p50: null, p95: null, p99: null, max: null, moyenne: null, ecartType: null, total: 0 };
  const v = [...a].sort((a, b) => a - b), total = a.reduce((s, x) => s + x, 0), moyenne = total / a.length;
  const q = t => { const k = (v.length - 1) * t, i = Math.floor(k); return v[i] + (v[Math.ceil(k)] - v[i]) * (k - i); };
  return { n: v.length, min: v[0], p50: q(.5), p95: q(.95), p99: q(.99), max: v.at(-1), moyenne,
    ecartType: Math.sqrt(a.reduce((s, x) => s + (x - moyenne) ** 2, 0) / a.length), total };
}

export function apparier(a, b) {
  if (a.length !== b.length) throw Error('Séries de coûts de tailles différentes');
  return { avant: distribution(a), apres: distribution(b), deltaApresMoinsAvant: distribution(a.map((x, i) => b[i] - x)),
    // La première version exécutée change à chaque image, les deux strates sont publiées.
    ordreAvantApres: { avant: distribution(a.filter((_, i) => i % 2 === 0)), apres: distribution(b.filter((_, i) => i % 2 === 0)) },
    ordreApresAvant: { avant: distribution(a.filter((_, i) => i % 2 !== 0)), apres: distribution(b.filter((_, i) => i % 2 !== 0)) },
    bruts: { avant: a, apres: b } };
}
