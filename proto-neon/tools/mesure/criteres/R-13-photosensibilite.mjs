/* R-13 — Photosensibilité (G-29, V-19, WCAG 2.3.1) : au plus 3 flashs par seconde au-delà du seuil d'aire
   (6,6 % de l'écran), sur la minute la plus chargée. Mesure image par image sur le tampon : un flash est une
   paire de variations opposées de luminance relative d'au moins 0,1 (la plus sombre sous 0,8), ou d'entrée et
   de sortie du rouge saturé (magenta, brasier, sang), sur plus de 6,6 % de l'écran. Scène `charge`,
   invulnérable, avec une rafale de destructions (30 en 2 s) ; le journal `flash` est relu en contrôle. */
import { executer, principal, seuils, exiger } from '../commun.mjs';

export const meta = { id: 'R-13', titre: 'Photosensibilité', seuil: '≤ 3 flashs par seconde au-delà de 6,6 % de l’écran', bloquant: true };
const IMAGE = `
  var b = N.gfx.buf(), L = M.L, n = b.length, p = M.__prec13; if (!p || p.length !== n) { M.__prec13 = new Uint8Array(b); return { f: window.__FRAME, up: 0, dn: 0, rin: 0, rout: 0 }; }
  var up = 0, dn = 0, rin = 0, rout = 0;
  for (var i = 0; i < n; i++) { var a = p[i], c = b[i]; if (a === c) continue;
    var la = L[a], lc = L[c], lo = la < lc ? la : lc;
    if (lc - la >= 0.1 && lo < 0.8) up++; else if (la - lc >= 0.1 && lo < 0.8) dn++;
    var ra = a === 5 || a === 11 || a === 14, rc = c === 5 || c === 11 || c === 14; if (rc && !ra) rin++; else if (ra && !rc) rout++; }
  p.set(b); return { f: window.__FRAME, up: up / n, dn: dn / n, rin: rin / n, rout: rout / n };`;

/* compte les flashs : une transition franchit l'aire ; deux transitions opposées font un flash */
export function flashs(images, aire, dt) {
  const ev = [];
  for (let k = 0; k < images.length; k++) {
    const x = images[k];
    if (x.up > aire) ev.push({ k, s: 'L+' }); if (x.dn > aire) ev.push({ k, s: 'L-' });
    if (x.rin > aire) ev.push({ k, s: 'R+' }); if (x.rout > aire) ev.push({ k, s: 'R-' });
  }
  const fl = []; const dernier = {};
  for (const e of ev) { const fam = e.s[0], opp = fam + (e.s[1] === '+' ? '-' : '+'); if (dernier[opp] !== undefined) { fl.push(e.k); delete dernier[opp]; } else dernier[e.s] = e.k; }
  const parSec = Math.round(1 / dt); let max = 0, at = 0;
  for (let i = 0, j = 0; i < fl.length; i++) { while (fl[i] - fl[j] >= parSec) j++; if (i - j + 1 > max) { max = i - j + 1; at = fl[i]; } }
  return { flashs: fl.length, maxParSeconde: max, a: at };
}

export async function mesurer(banc, res) {
  const s = await banc.ouvrir('paysage', { dt: 1 / 60 });
  const { s: S } = await seuils(s, 'R13');
  if (!await exiger(s, res, 'tampon', ['N.gfx.buf', 'N.gfx.present'])) return;
  const sc = await s.scene('charge');
  if (!sc.ok) return res.nonMesurable('scène de charge', sc.raison);
  await s.eval(() => { const d = window.__MESURE.dbg(); if (d && d.god) d.god(true); try { window.__N.journal.dump({ vider: true }); } catch (e) { } });
  await s.eval(c => window.__MESURE.parImage('r13', c), IMAGE);
  /* la rafale : 30 destructions en 2 s */
  await s.eval(() => {
    const N = window.__N; let k = 0;
    const t = setInterval(() => { const l = (N.ennemis && N.ennemis.list || []).filter(e => e.etat !== 'mort' && !e.boss); if (!l.length || k++ >= 30) return clearInterval(t); try { N.ennemis.hit(l[0], 1e6, { genre: 'arme', type: 'canon', id: 0 }); } catch (e) { } }, 66);
  });
  const duree = banc.o.rapide ? 10 : 60;
  await s.images(duree * 60, duree * 3);
  const I = await s.eval(() => window.__MESURE.arreter('r13'));
  const r = flashs(I, S.aire, 1 / 60);
  res.verifie('flashs par seconde (pire seconde, analyse du tampon)', r.maxParSeconde, '≤ ' + S.flashsParSeconde, r.maxParSeconde <= S.flashsParSeconde, { images: I.length, flashs: r.flashs, image: r.a });
  const J = await s.journal();
  const F = J ? J.filter(x => x.type === 'flash').map(x => ({ t: x.t, ...(x.d || x) })) : [];
  if (!F.length) res.nonMesurable('limiteur de flashs (journal `flash`)', 'journal `flash` vide (N.fx.flashGate absent ou jamais sollicité)');
  else {
    const acc = F.filter(f => f.accepte).map(f => f.t); let max = 0;
    for (let i = 0, j = 0; i < acc.length; i++) { while (acc[i] - acc[j] >= 1) j++; max = Math.max(max, i - j + 1); }
    res.verifie('flashs acceptés par N.fx.flashGate (pire seconde de jeu)', max, '≤ ' + S.flashsParSeconde, max <= S.flashsParSeconde, { demandes: F.length, acceptes: acc.length });
  }
  if (!banc.o.rapide) res.note('fenêtre analysée : 60 s de la scène de charge, rafale de 30 destructions comprise');
}
if (principal(import.meta.url)) executer({ meta, mesurer });
