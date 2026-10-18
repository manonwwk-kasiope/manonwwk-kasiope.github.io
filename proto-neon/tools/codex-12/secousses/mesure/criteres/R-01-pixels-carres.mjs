/* R-01 — Pixels carrés : blocs de px × px identiques, zéro valeur intermédiaire sur un bord de sprite
   (avant tube). Mesure : capture de l'écran réel (pixels de l'appareil), tube coupé, sur les trois profils ;
   chaque pixel du tampon doit couvrir un bloc uniforme de px × dpr pixels de l'appareil, d'une couleur de la
   palette des seize ; la toile mesure exactement tampon × px en CSS. */
import { executer, principal, exiger } from '../commun.mjs';
import { decode } from '../png.mjs';
import { atteindre, couperTube } from '../scenes.mjs';

export const meta = { id: 'R-01', titre: 'Pixels carrés', seuil: 'blocs px × px identiques ; 0 valeur hors palette (avant tube)', bloquant: true };

export async function mesurer(banc, res) {
  for (const profil of banc.profils()) {
    const s = await banc.ouvrir(profil, { dt: 1 / 60 });
    if (!await exiger(s, res, `${profil} : tampon`, ['N.gfx.buf', 'N.gfx.PX', 'N.gfx.W', 'N.pal.C'])) { await s.fermer(); continue; }
    let r = await atteindre(s, 'calme');
    if (!r.ok) { const raison = r.raison; const d = await s.demarrer({ graine: 1 }); if (d.ok) { await s.avancer(2); r = { ok: true }; res.note(`${profil} : scène calme indisponible (${raison}), mesure en partie normale`); } }
    if (!r.ok) { res.nonMesurable(`${profil} : image de jeu`, r.raison); await s.fermer(); continue; }
    const tube = await couperTube(s);
    if (!tube) { res.absent(`${profil} : écran avant tube`, 'N.crt.preset'); await s.fermer(); continue; }
    await s.images(3);
    const crt = await s.eval(() => ({ off: window.__N.crt.off, niveau: window.__N.crt.niveau(), auto: window.__N.crt.auto(), stats: { ...window.__N.crt.stats } }));
    res.note(`${profil} : état du tube avant capture : ${JSON.stringify(crt)}`);
    if (!crt.off || crt.niveau !== 'coupe') { res.nonMesurable(`${profil} : écran avant tube`, 'le jeu a réactivé le tube après la coupure : ' + JSON.stringify(crt)); await s.fermer(); continue; }
    /* la toile affichée : la plus grande du document */
    const g = await s.eval(() => {
      const cs = [...document.querySelectorAll('canvas')].map(c => ({ c, r: c.getBoundingClientRect() })).filter(o => o.r.width > 0).sort((a, b) => b.r.width * b.r.height - a.r.width * a.r.height);
      if (!cs.length) return null;
      const r = cs[0].r, N = window.__N;
      return { x: r.left, y: r.top, w: r.width, h: r.height, dpr: window.devicePixelRatio, W: N.gfx.W, H: N.gfx.H, PX: N.gfx.PX, pal: N.pal.C,
        vue: { w: innerWidth, h: innerHeight }, rendu: getComputedStyle(cs[0].c).imageRendering };
    });
    if (!g) { res.nonMesurable(`${profil} : toile`, 'aucune toile visible'); await s.fermer(); continue; }
    res.verifie(`${profil} : toile = tampon × px en CSS`, { toile: [g.w, g.h], attendu: [g.W * g.PX, g.H * g.PX] }, 'égalité exacte', Math.abs(g.w - g.W * g.PX) < 0.01 && Math.abs(g.h - g.H * g.PX) < 0.01);
    const f = await s.capture('R-01');
    res.capture(f);
    const img = decode(f), B = g.PX * g.dpr, ox = Math.round(g.x * g.dpr), oy = Math.round(g.y * g.dpr);
    const pal = new Set(g.pal.map(h => parseInt(h.slice(1), 16)));
    let blocs = 0, nonUniformes = 0, horsPalette = 0, pixels = 0;
    const bx1 = Math.floor(Math.min(img.w - ox, g.w * g.dpr) / B), by1 = Math.floor(Math.min(img.h - oy, g.h * g.dpr) / B);
    for (let by = 0; by < by1; by++) for (let bx = 0; bx < bx1; bx++) {
      let ref = -1, uni = true;
      for (let y = 0; y < B; y++) for (let x = 0; x < B; x++) {
        const px = ox + bx * B + x, py = oy + by * B + y; if (px < 0 || py < 0) continue;
        const o = (py * img.w + px) * 4, c = (img.rgba[o] << 16) | (img.rgba[o + 1] << 8) | img.rgba[o + 2];
        pixels++; if (!pal.has(c)) horsPalette++;
        if (ref < 0) ref = c; else if (c !== ref) uni = false;
      }
      blocs++; if (!uni) nonUniformes++;
    }
    res.verifie(`${profil} : blocs non uniformes (px ${g.PX} × dpr ${g.dpr})`, nonUniformes, 0, nonUniformes === 0, { blocs, alignement: [g.x * g.dpr, g.y * g.dpr] });
    res.verifie(`${profil} : pixels d'écran hors des seize couleurs`, horsPalette, 0, horsPalette === 0, { pixels });
    await s.fermer();
  }
}
if (principal(import.meta.url)) executer({ meta, mesurer });
