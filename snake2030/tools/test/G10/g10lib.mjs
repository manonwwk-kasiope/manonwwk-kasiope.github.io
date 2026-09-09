// Outils communs des tests d'acceptation G10.
//
// Deux précautions valent d'être dites une fois pour toutes :
//   - Les gabarits sont relus au moins 300 ms après un redimensionnement :
//     _uiLayout est rappelé 70 ms après un resize et 220 ms après un
//     orientationchange (src/26-ui.js). Lire avant, c'est lire l'ancien --uis.
//   - Les boîtes de l'interface sont relevées par offsetWidth/offsetHeight et
//     non par getBoundingClientRect(), qui inclut le transform : le curseur
//     clavier de G4 (#ui.kb .kf) applique scale(1,04) au bouton focalisé, ce
//     qui gonfle JOUER de 320×78 à 332,8×81,1. La mesure de gabarit est la
//     boîte de mise en page, pas son rendu agrandi. Les rects ne servent qu'aux
//     positions relatives (logo / JOUER), où le facteur commun s'annule.
export const SCREENS = ['menu', 'settings', 'unlocks', 'cards', 'pause', 'over'];

/** Descriptions les plus longues du jeu (mesurées sur index.html), pour l'écran des cartes. */
export const LONGEST = [
  { id: 'x1', name: 'CONDUCTEUR TOTAL', icon: '✳', rarity: 'ultra', max: 3,
    desc: 'Tout le corps devient conducteur : la foudre part de n’importe quel segment.' },
  { id: 'x2', name: 'TRAVERSÉE PERMANENTE', icon: '◇', rarity: 'epic', max: 3,
    desc: 'Traversée permanente, au prix d’un segment toutes les quinze secondes.' },
  { id: 'x3', name: 'IONISATION PROLONGÉE', icon: '⌁', rarity: 'rare', max: 3,
    desc: 'Les cibles foudroyées restent ionisées et encaissent tout plus mal.' }
];

/** Sélecteur court et lisible d'un nœud, pour journaliser le minimum. */
export const SELECTOR_FN = `(el) => {
  let s = el.tagName.toLowerCase();
  if (el.id) s += '#' + el.id;
  if (el.className && typeof el.className === 'string') s += '.' + el.className.trim().split(/\\s+/).join('.');
  const p = el.parentElement;
  if (p && p.id !== 'ui') {
    let ps = p.tagName.toLowerCase();
    if (p.id) ps += '#' + p.id;
    if (p.className && typeof p.className === 'string') ps += '.' + p.className.trim().split(/\\s+/).join('.');
    s = ps + ' > ' + s;
  }
  return s;
}`;

/** Tous les nœuds de #ui portant un nœud texte non vide et une aire > 0, avec leur font-size. */
export const SCAN_FN = `(() => {
  const sel = ${SELECTOR_FN};
  const out = [];
  for (const el of document.querySelectorAll('#ui, #ui *')) {
    let txt = '';
    for (const n of el.childNodes) if (n.nodeType === 3) txt += n.nodeValue;
    if (!txt.trim()) continue;
    const r = el.getBoundingClientRect();
    if (r.width * r.height <= 0) continue;
    out.push({ sel: sel(el), text: txt.trim().slice(0, 40), fs: +parseFloat(getComputedStyle(el).fontSize).toFixed(2) });
  }
  return out;
})()`;

/** Pose un profil non vierge dans localStorage AVANT le chargement (parties jouées, phases vues). */
export function profileScript(extra = {}) {
  const st = { best: 4200, coins: 900, runs: 7, unlocks: {}, phSeen: { ortho: 1, space: 1, roll: 1, dive: 1 }, ...extra };
  return `try { localStorage.setItem('snake2030.v1', JSON.stringify({ v: 1, stats: ${JSON.stringify(st)} })); } catch (e) {}`;
}

/** Redimensionne et attend que _uiLayout ait repris la main (> 300 ms). */
export async function resize(page, w, h) {
  await page.setViewportSize({ width: w, height: h });
  await new Promise(r => setTimeout(r, 420));
}
