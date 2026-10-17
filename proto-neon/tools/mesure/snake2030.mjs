/* tools/mesure/snake2030.mjs — ouvrir SNAKE 2030 (lecture seule) dans la même fenêtre, pour les comparaisons
   de R-11 (part lumineuse à t = 30 s) et R-20 (coût d'image). La partie se lance par startRun() s'il est
   global, sinon par des touchers au centre. */
import { decode } from './png.mjs';

export async function ouvrirSnake2030(banc, profil = 'paysage', opts = {}) {
  const s = await banc.ouvrir(profil, { ...opts, url: banc.urlSnake2030(), journal: false });
  try { await s.page.waitForFunction(() => window.__S, null, { timeout: 15000 }); } catch (e) { return { ok: false, raison: 'SNAKE 2030 injoignable (' + banc.urlSnake2030() + ')', s }; }
  let lance = await s.eval(() => { try { if (typeof startRun === 'function') { startRun(); return true; } } catch (e) { } return false; });
  if (!lance) {
    const v = PROFILS_TAILLE(s);
    for (let i = 0; i < 3 && !lance; i++) { await s.page.mouse.click(v.w / 2, v.h / 2); await s.page.waitForTimeout(800); lance = await s.eval(() => window.__S && window.__S.phase === 'play'); }
  }
  const phase = await s.eval(() => window.__S && window.__S.phase);
  return { ok: phase === 'play', raison: phase === 'play' ? null : 'partie de SNAKE 2030 non lancée (phase ' + phase + ')', s };
}
function PROFILS_TAILLE(s) { const v = s.page.viewportSize(); return { w: v.width, h: v.height }; }

/* part des pixels d'une capture d'écran de luminance relative (WCAG) > seuil */
export function partLumineuseCapture(fichier, seuil = 0.10) {
  const img = decode(fichier); let n = 0;
  const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const T = new Float64Array(256); for (let i = 0; i < 256; i++) T[i] = lin(i);
  for (let i = 0; i < img.w * img.h; i++) { const o = i * 4; if (0.2126 * T[img.rgba[o]] + 0.7152 * T[img.rgba[o + 1]] + 0.0722 * T[img.rgba[o + 2]] > seuil) n++; }
  return n / (img.w * img.h);
}
