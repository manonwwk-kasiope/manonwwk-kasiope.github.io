/* R-29 — Pause : en arrière-plan pendant 10 s en plein chaos, le même état (empreinte de S), aucun dégât, et
   le son revenu en moins de 1 s après le retour (AudioContext en marche, niveau de sortie non nul).
   L'arrière-plan est simulé par visibilitychange (document caché) et blur, comme sur iPhone. */
import { executer, principal, seuils, exiger } from '../commun.mjs';

export const meta = { id: 'R-29', titre: 'Pause', seuil: '10 s en arrière-plan : même état, aucun dégât ; son revenu < 1 s', bloquant: true, exclusif: true };
const EMPREINTE = () => { const S = window.__S, N = window.__N; const e = (S.enemies || []).map(x => [x.id, Math.round(x.x * 10), Math.round(x.y * 10), x.pv]).join(';');
  return { t: N.horloge ? N.horloge.t() : S.t, x: S.player && S.player.x, y: S.player && S.player.y, len: S.player && S.player.len, vies: N.score ? N.score.vies : null, ennemis: e, paused: !!S.paused, etat: window.__MESURE.etat() }; };
const cacher = c => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => c ? 'hidden' : 'visible' }); Object.defineProperty(document, 'hidden', { configurable: true, get: () => c }); document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event(c ? 'blur' : 'focus')); };

export async function mesurer(banc, res) {
  const s = await banc.ouvrir('paysage', {});
  const { s: S } = await seuils(s, 'R29');
  if (!await exiger(s, res, 'pause', ['N.game.dbg.scene', 'S.player'])) return;
  const v = s.page.viewportSize();
  await s.page.touchscreen.tap(v.width / 2, v.height / 2);
  const sc = await s.scene('chaos');
  if (!sc.ok) return res.nonMesurable('scène chaos', sc.raison);
  await s.page.waitForTimeout(1500);
  await s.eval(cacher, true);
  await s.page.waitForTimeout(300);
  const a = await s.eval(EMPREINTE);
  await s.page.waitForTimeout((banc.o.rapide ? 3 : S.arrierePlan) * 1000);
  const b = await s.eval(EMPREINTE);
  res.verifie('S.paused en arrière-plan', b.paused, true, b.paused === true);
  const meme = a.t === b.t && a.x === b.x && a.y === b.y && a.len === b.len && a.ennemis === b.ennemis;
  res.verifie('même état après l’arrière-plan (horloge, joueuse, ennemis)', meme, true, meme, { avant: { t: a.t, len: a.len }, apres: { t: b.t, len: b.len } });
  res.verifie('aucun dégât en arrière-plan (vies, longueur)', { vies: [a.vies, b.vies], len: [a.len, b.len] }, 'inchangées', a.vies === b.vies && a.len === b.len);
  await s.eval(cacher, false);
  await s.page.touchscreen.tap(v.width / 2, v.height / 2);
  const t0 = Date.now(); let revenu = null;
  while (Date.now() - t0 < 3000) {
    const o = await s.eval(() => { const m = window.__N.music; let st = null, rms = null; try { const c = m.context && m.context(); st = c ? c.state : null; } catch (e) { } try { rms = m.rmsOut ? m.rmsOut() : null; } catch (e) { } return { st, rms }; });
    if ((o.st === null || o.st === 'running') && (o.rms === null || o.rms > 1e-4) && (o.st !== null || o.rms !== null)) { revenu = (Date.now() - t0) / 1000; break; }
    await s.page.waitForTimeout(50);
  }
  if (revenu === null && (await s.absents(['N.music.context', 'N.music.rmsOut'])).length === 2) res.absent('son revenu', ['N.music.context', 'N.music.rmsOut']);
  else res.verifie('son revenu après le retour (s)', revenu, '< ' + S.sonRevenu, revenu !== null && revenu < S.sonRevenu);
}
if (principal(import.meta.url)) executer({ meta, mesurer });
