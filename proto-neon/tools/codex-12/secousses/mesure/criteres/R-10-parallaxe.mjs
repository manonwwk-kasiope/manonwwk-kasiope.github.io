/* R-10 — Monde et parallaxe : monde plus grand que l'écran ; au moins 5 vitesses de plan mesurées ; au moins
   15 % de pixels changés en 0,5 s en croisière. Mesure sur captures appariées du tampon (pilote bon, partie
   dessinée) : chaque bande de 3 lignes du décor est recalée horizontalement entre deux images ; les décalages
   distincts, rapportés au déplacement de la caméra, sont les vitesses de plan. */
import { executer, principal, seuils, exiger } from '../commun.mjs';

export const meta = { id: 'R-10', titre: 'Monde et parallaxe', seuil: 'monde > écran ; ≥ 5 vitesses de plan ; ≥ 15 % de pixels changés en 0,5 s', bloquant: true };

function decalage(A, B, W, y0, y1, max) {
  let best = 0, bestErr = Infinity, err0 = 0, n0 = 0;
  for (let s = -max; s <= max; s++) {
    let err = 0, n = 0;
    for (let y = y0; y < y1; y++) for (let x = Math.max(0, -s); x < Math.min(W, W - s); x += 1) { n++; if (A[y * W + x] !== B[y * W + x + s]) err++; }
    const e = err / Math.max(1, n); if (s === 0) { err0 = e; n0 = n; }
    if (e < bestErr) { bestErr = e; best = s; }
  }
  /* bande uniforme (ciel plein) : rien à recaler */
  const vals = new Set(); for (let y = y0; y < y1; y++) for (let x = 0; x < W; x += 3) vals.add(A[y * W + x]);
  return { s: best, err: bestErr, err0, utile: vals.size > 2 && bestErr < 0.35 };
}

export async function mesurer(banc, res) {
  const s = await banc.ouvrir('paysage', { dt: 1 / 60 });
  const { s: S } = await seuils(s, 'R10');
  if (!await exiger(s, res, 'monde', ['N.world.W', 'N.world.H', 'N.cam.w', 'N.cam.h'])) return;
  const g = await s.eval(() => ({ W: window.__N.world.W, H: window.__N.world.H, w: window.__N.cam.w, h: window.__N.cam.h }));
  res.verifie('monde plus grand que la vue', g, 'W > w et H > h', g.W > g.w && g.H > g.h);
  const d = await s.demarrer({ graine: 5, pilote: 'bon', god: true });
  if (!d.ok) return res.nonMesurable('parallaxe', d.raison);
  await s.avancer(4);
  /* trente images : le tampon et la caméra à chaque image */
  await s.eval(() => window.__MESURE.parImage('r10', 'return { b: M.b64(N.gfx.buf()), cx: N.cam.x, cy: N.cam.y, e: M.etat() };', 31));
  await s.images(34);
  const L = (await s.eval(() => window.__MESURE.arreter('r10'))).map(x => ({ ...x, b: Buffer.from(x.b, 'base64') }));
  const W = await s.eval(() => window.__N.gfx.W), H = await s.eval(() => window.__N.gfx.H);
  if (L.length < 31) return res.nonMesurable('captures appariées', 'moins de 31 images lues');
  const A = L[0], B = L[30];
  const ch = (() => { let n = 0; for (let i = 0; i < A.b.length; i++) if (A.b[i] !== B.b[i]) n++; return n / A.b.length; })();
  res.verifie('pixels changés en 0,5 s (30 images), en croisière', ch, '≥ ' + S.changes, ch >= S.changes);
  const dcx = B.cx - A.cx;
  if (Math.abs(dcx) < 4) { res.nonMesurable('vitesses de plan', 'la caméra a bougé de moins de 4 px à l’horizontale en 0,5 s (' + dcx.toFixed(1) + ')'); return; }
  const bandes = [];
  for (let y = 0; y + 3 <= H; y += 3) { const r = decalage(A.b, B.b, W, y, y + 3, Math.min(90, Math.ceil(Math.abs(dcx)) + 8)); if (r.utile) bandes.push({ y, ...r, k: -r.s / dcx }); }
  /* vitesses distinctes : décalages entiers différents, chacun porté par au moins 2 bandes */
  const comptes = {}; for (const b of bandes) comptes[b.s] = (comptes[b.s] || 0) + 1;
  const vitesses = Object.entries(comptes).filter(([, n]) => n >= 2).map(([v]) => +v).sort((a, b) => a - b);
  res.verifie('vitesses de plan distinctes', vitesses.length, '≥ ' + S.vitesses, vitesses.length >= S.vitesses, { decalages: vitesses, facteurs: vitesses.map(v => +(-v / dcx).toFixed(3)), cameraDx: +dcx.toFixed(2), bandes: bandes.length });
  res.capture(await s.captureTampon('R-10-a', 2, { W, H, buf: A.b }));
  res.capture(await s.captureTampon('R-10-b', 2, { W, H, buf: B.b }));
}
if (principal(import.meta.url)) executer({ meta, mesurer });
