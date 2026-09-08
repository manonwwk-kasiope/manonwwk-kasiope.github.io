// Analyse statique de la palette : ΔE (CIE76 en Lab) entre catégories sémantiques, contraste WCAG sur les fonds de niveau.
const C = {
  'serpent corps': ['#00e5ff', 'joueur'], 'serpent tête': ['#9df5ff', 'joueur'], 'serpent fantôme': ['#b388ff', 'joueur'], 'écailles': ['#78ffff', 'joueur'],
  'tir joueur bolt': ['#fff3b0', 'tir joueur'], 'tir joueur gold': ['#ffd166', 'tir joueur'], 'tir joueur amber': ['#ffb347', 'tir joueur'], 'tir joueur chrome': ['#dfe9f5', 'tir joueur'], 'tir joueur core': ['#ffffff', 'tir joueur'],
  'tir ennemi': ['#ff6a00', 'tir ennemi'],
  'TRAQUEUR': ['#ff2e63', 'ennemi'], 'INTERCEPTEUR': ['#b388ff', 'ennemi'], 'MINE': ['#ff8a3d', 'ennemi'], 'ARTILLEUR': ['#ff6a00', 'ennemi'], 'TRANCHEUR': ['#ff4fd8', 'ennemi'], 'PONDEUSE': ['#8a4dff', 'ennemi'], 'LARVE': ['#c08cff', 'ennemi'], 'PARASITE': ['#e04fff', 'ennemi'], 'BROUILLEUR': ['#6c5cff', 'ennemi'], 'VOLEUR': ['#ffb43c', 'ennemi'], 'MIROIR': ['#cfe9ff', 'ennemi'],
  'mod BLINDÉ': ['#9fb6d0', 'mod'], 'mod RAPIDE': ['#ffe45e', 'mod'], 'mod SAUTEUR': ['#b388ff', 'mod'], 'mod INSTABLE': ['#ff8a3d', 'mod'], 'mod RÉGÉNÈRE': ['#7cffb2', 'mod'], 'mod GARDE': ['#00e5ff', 'mod'],
  'butin énergie': ['#00e5ff', 'butin'], 'butin core': ['#ffd166', 'butin'], 'butin soin': ['#7cffb2', 'butin'],
  'bouclier joueur': ['#7cffb2', 'joueur fx'], 'pouvoir traversée': ['#b388ff', 'joueur fx'], 'pouvoir ralenti': ['#5ef1ff', 'joueur fx'], 'boost traînée': ['#ffd666', 'joueur fx'],
  'L1 accent': ['#00e5ff', 'décor'], 'L1 gridHot': ['#2f7fff', 'décor'], 'L2 accent': ['#ff2e9a', 'décor'], 'L2 gridHot': ['#b388ff', 'décor'], 'L3 accent': ['#00e5ff', 'décor'], 'L4a accent': ['#ff4fd8', 'décor'], 'L4c accent': ['#ffb43c', 'décor'],
  'dégât flash': ['#ff2e63', 'fx'], 'explosion': ['#ffb14a', 'fx'], 'arc': ['#7bdcff', 'fx'], 'alerte danger': ['#ff2b2b', 'fx']
};
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
function lab(h) { const [r, g, b] = hex(h).map(lin); let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047, y = r * 0.2126 + g * 0.7152 + b * 0.0722, z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883; const f = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116; return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))]; }
const dE = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const relL = h => { const [r, g, b] = hex(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const cr = (a, b) => (Math.max(relL(a), relL(b)) + 0.05) / (Math.min(relL(a), relL(b)) + 0.05);
const hue = h => { const [L, a, b] = lab(h); return ((Math.atan2(b, a) * 180 / Math.PI) + 360) % 360; };
const keys = Object.keys(C);
const pairs = [];
for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) { const a = C[keys[i]], b = C[keys[j]]; if (a[1] === b[1]) continue; const d = dE(lab(a[0]), lab(b[0])); pairs.push({ a: keys[i], b: keys[j], ca: a[1], cb: b[1], hexA: a[0], hexB: b[0], dE: +d.toFixed(1), dHue: +Math.min(Math.abs(hue(a[0]) - hue(b[0])), 360 - Math.abs(hue(a[0]) - hue(b[0]))).toFixed(0) }); }
pairs.sort((x, y) => x.dE - y.dE);
console.log('=== Paires inter-catégories les plus proches (ΔE76 < 20 ; < 2.3 = indiscernable, < 10 = même famille) ===');
for (const p of pairs.filter(p => p.dE < 20)) console.log(`${p.dE.toString().padStart(5)}  hue Δ${String(p.dHue).padStart(3)}°  ${p.a} ${p.hexA} [${p.ca}]  ~  ${p.b} ${p.hexB} [${p.cb}]`);
console.log('\n=== Répartition des teintes Lab (hue°) par catégorie ===');
const byCat = {}; for (const k of keys) { (byCat[C[k][1]] = byCat[C[k][1]] || []).push(k + ' ' + Math.round(hue(C[k][0])) + '°'); }
for (const c in byCat) console.log(c.padEnd(12), byCat[c].join(' | '));
console.log('\n=== Contraste WCAG entité / fond de niveau (bg) ===');
const bgs = { L1: '#03060f', L2: '#0a0316', L3: '#020a0e', L4a: '#12030f' };
for (const k of ['serpent corps', 'tir ennemi', 'TRAQUEUR', 'PONDEUSE', 'BROUILLEUR', 'INTERCEPTEUR', 'ARTILLEUR', 'MIROIR', 'butin énergie', 'butin core']) console.log(k.padEnd(16), Object.entries(bgs).map(([n, b]) => n + ':' + cr(C[k][0], b).toFixed(1)).join('  '));
console.log('\n=== Ennemis : Luminance relative (les sombres se perdent dans le décor) ===');
for (const k of keys.filter(k => C[k][1] === 'ennemi')) console.log(k.padEnd(14), C[k][0], 'L*=' + lab(C[k][0])[0].toFixed(0), 'Y=' + relL(C[k][0]).toFixed(3));
