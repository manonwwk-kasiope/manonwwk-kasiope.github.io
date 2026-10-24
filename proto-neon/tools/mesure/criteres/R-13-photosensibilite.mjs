/* R-13 — Photosensibilité (G-29, V-19, WCAG 2.3.1) : au plus 3 flashs par seconde au-delà du seuil d'aire
   (6,6 % de l'écran), sur la minute la plus chargée. Mesure image par image sur le tampon : un flash est une
   paire de variations opposées de luminance relative d'au moins 0,1 (la plus sombre sous 0,8), ou d'entrée et
   de sortie du rouge saturé (magenta, brasier, sang), sur plus de 6,6 % de l'écran. Scène `charge`,
   invulnérable, avec une rafale de destructions (30 en 2 s) ; le journal `flash` est relu en contrôle. */
import { executer, principal, seuils, exiger } from '../commun.mjs';

export const meta = { id: 'R-13', titre: 'Photosensibilité', seuil: '≤ 3 flashs par seconde au-delà de 6,6 % de l’écran', bloquant: true };
import { flashs, transitions } from '../../codex-di5/r13.mjs';
export { flashs } from '../../codex-di5/r13.mjs';
const IMAGE = `
  var b = N.gfx.buf(), r = N.R.lisibiliteP10.mesure;
  var dim=N.gfx.W+':'+N.gfx.H;if(M.__dim13!==dim){M.__prec13=null;M.__dim13=dim;}
  var mesure = (${transitions.toString()})(M.__prec13, b, M.L, r.luminanceDelta, r.luminanceSombre);
  M.__prec13 = new Uint8Array(b);
  return { f: window.__FRAME, w: performance.now()/1000, W:N.gfx.W, H:N.gfx.H, ...mesure };`;

export async function mesurer(banc, res) {
  const s = await banc.ouvrir('paysage', { dt: 1 / 60 });
  const { s: S } = await seuils(s, 'R13');
  if (!await exiger(s, res, 'tampon', ['N.gfx.buf', 'N.gfx.present'])) return;
  const sc = await s.scene('charge');
  if (!sc.ok) return res.nonMesurable('scène de charge', sc.raison);
  await s.eval(() => { const d = window.__MESURE.dbg(); if (d && d.god) d.god(true); try { window.__N.journal.dump({ vider: true }); } catch (e) { } });
  await s.eval(() => { window.__MESURE.__prec13=null; window.__MESURE.__dim13=null; });
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
  if (!r.qualifiable) return res.nonMesurable('R-13 spatial', r.statut);
  res.note('Paires sur les mêmes pixels, rendus distincts, fenêtre en temps réel w.');
  res.verifie('flashs par seconde (pire seconde, analyse du tampon)', r.maxParSeconde, '≤ ' + S.flashsParSeconde, r.maxParSeconde <= S.flashsParSeconde, { images: I.length, flashs: r.flashs, image: r.a, transitions: I });
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
