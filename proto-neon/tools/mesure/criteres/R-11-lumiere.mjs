/* R-11 — Lumière, et décor qui se tait par la forme (§ 5.2, N.R.decor.lumiere) : sur le tampon complet,
   pixels lumineux (luminance > 0,10) ≥ 25 % en calme dès t = 1 s, ≥ 28 % en montee, ≥ 32 % en chaos,
   ≥ 25 % en colosse ; luminance moyenne ≥ 0,075 / 0,085 / 0,095 / 0,075 ; décor seul (code 8) lumineux entre
   18 et 28 % ; vide < 30 % ; 0 cyan dans le décor ; magenta et rose pâle du décor < 0,5 % ; gaine des
   menaces sur 100 % de leurs pixels de bord ; part lumineuse à t = 30 s au moins égale à celle de SNAKE 2030
   (captures d'écran, même profil) ; et la médiane de 10 captures par état d'une partie du pilote bon. */
import { executer, principal, seuils, exiger, stats, pct } from '../commun.mjs';
import { atteindre } from '../scenes.mjs';
import { ouvrirSnake2030, partLumineuseCapture } from '../snake2030.mjs';

export const meta = { id: 'R-11', titre: 'Lumière, et décor qui se tait par la forme', seuil: '≥ 25/28/32/25 % lumineux ; moyenne ≥ 0,075/0,085/0,095/0,075 ; décor 18-28 % ; vide < 30 % ; gaine 100 %', bloquant: true };
const ETATS = ['calme', 'montee', 'chaos', 'colosse'];
const LUM_PLAN = { seuil: 0.1, calme: { part: 0.25, moyenne: 0.075 }, montee: { part: 0.28, moyenne: 0.085 }, chaos: { part: 0.32, moyenne: 0.095 }, colosse: { part: 0.25, moyenne: 0.075 }, decorSeul: [0.18, 0.28], videMax: 0.3 };

function juger(res, nom, a, C, etat) {
  const c = C[etat] || C.calme;
  res.verifie(`${nom} : pixels lumineux`, a.lumineux, '≥ ' + c.part, a.lumineux >= c.part);
  res.verifie(`${nom} : luminance moyenne`, a.moyenneL, '≥ ' + c.moyenne, a.moyenneL >= c.moyenne);
  res.verifie(`${nom} : vide`, a.vide, '< ' + C.videMax, a.vide < C.videMax);
  if (!a.masque) { res.nonMesurable(`${nom} : décor seul, cyan et magenta du décor, gaine`, a.raisonMasque || 'masque de propriété indisponible'); return; }
  res.verifie(`${nom} : décor seul lumineux (code 8)`, a.decorLumineux, C.decorSeul, a.decorLumineux >= C.decorSeul[0] && a.decorLumineux <= C.decorSeul[1]);
  res.verifie(`${nom} : cyan dans le décor (pixels)`, a.decorCyan, 0, a.decorCyan === 0);
  res.verifie(`${nom} : magenta et rose pâle du décor`, a.decorMagenta, '< 0.005', a.decorMagenta < 0.005);
  if (a.gaine && a.gaine.bord) res.verifie(`${nom} : gaine des menaces (pixels de bord en nuit profonde)`, a.gaine.part, 1, a.gaine.gaine === a.gaine.bord, { bord: a.gaine.bord });
  else res.nonMesurable(`${nom} : gaine des menaces`, 'aucun pixel d’ennemi (code 5) dans l’image');
}

export async function mesurer(banc, res) {
  const s = await banc.ouvrir('paysage', { dt: 1 / 60 });
  const { R } = await seuils(s, 'R11');
  const C = (R.decor && R.decor.lumiere) || LUM_PLAN;
  if (!await exiger(s, res, 'tampon', ['N.gfx.buf'])) return;
  /* 1. calme dès t = 1 s d'une partie */
  const d = await s.demarrer({ graine: 1, pilote: 'bon', god: true });
  if (d.ok) {
    await s.attendre(() => ['jeu'].includes(window.__MESURE.etat()), null, 10000);
    await s.avancer(C.desT || 1);
    juger(res, 'partie à t = 1 s (calme)', await s.analyse({ gaine: true }), C, 'calme');
  } else res.nonMesurable('partie à t = 1 s', d.raison);
  /* 2. les scènes calme, montee, chaos, colosse */
  for (const e of ETATS) {
    const r = await atteindre(s, e);
    if (!r.ok) { res.nonMesurable(`scène ${e}`, r.raison); continue; }
    const a = await s.analyse({ gaine: true });
    res.capture(await s.captureTampon('R-11-' + e));
    juger(res, `scène ${e}`, a, C, e);
  }
  /* 3. t = 30 s, comparé à SNAKE 2030 au même instant et au même profil (captures d'écran) */
  const d2 = await s.demarrer({ graine: 2, pilote: 'bon', god: true });
  let nous = null;
  if (d2.ok) { await s.avancer(30, 90); const f = await s.capture('R-11-t30'); res.capture(f); nous = partLumineuseCapture(f); }
  const z = await ouvrirSnake2030(banc, 'paysage', { dt: 1 / 60 });
  if (!z.ok) res.nonMesurable('part lumineuse à t = 30 s ≥ SNAKE 2030', z.raison);
  else if (nous === null) res.nonMesurable('part lumineuse à t = 30 s ≥ SNAKE 2030', 'partie de SNAKE 2975 non lancée');
  else {
    await z.s.page.waitForTimeout(30000);
    const f = await z.s.capture('R-11-snake2030-t30'); res.capture(f);
    const eux = partLumineuseCapture(f);
    res.verifie('part lumineuse à t = 30 s (capture), SNAKE 2975 / SNAKE 2030', { snake2975: nous, snake2030: eux }, 'snake2975 ≥ snake2030', nous >= eux);
  }
  if (z.s) await z.s.fermer();
  /* 4. 10 captures par état du décor sur une partie du pilote bon (médiane) */
  if (!banc.o.rapide) {
    const p = await s.demarrer({ graine: 3, pilote: 'bon', god: true });
    if (!p.ok) res.nonMesurable('captures par état d’une partie du pilote bon', p.raison);
    else if ((await s.absents(['N.decor.etat'])).length) res.absent('captures par état d’une partie du pilote bon', 'N.decor.etat');
    else {
      const parEtat = {}; const t0 = Date.now(), max = (banc.o.long ? 420 : 200) * 1000;
      while (Date.now() - t0 < max) {
        await s.page.waitForTimeout(2000);
        const a = await s.analyse(); const e = await s.eval(() => { try { const v = window.__N.decor.etat(); return typeof v === 'string' ? v : null; } catch (x) { return null; } });
        if (!e || !['jeu', 'nettoyage', 'boss', 'alerte', 'defile', 'reapparition'].includes(a.etat)) { if (a.etat === 'fin') break; continue; }
        (parEtat[e] = parEtat[e] || []).push(a); if (ETATS.every(k => (parEtat[k] || []).length >= 10)) break;
      }
      for (const e of ETATS) {
        const l = (parEtat[e] || []).slice(0, 10);
        if (!l.length) { res.nonMesurable(`partie du pilote bon, état ${e}`, 'état jamais atteint pendant la partie'); continue; }
        const c = C[e];
        const pm = stats.mediane(l.map(a => a.lumineux)), mm = stats.mediane(l.map(a => a.moyenneL));
        res.verifie(`partie du pilote bon, état ${e} : pixels lumineux (médiane de ${l.length})`, pm, '≥ ' + c.part, pm >= c.part);
        res.verifie(`partie du pilote bon, état ${e} : luminance moyenne (médiane)`, mm, '≥ ' + c.moyenne, mm >= c.moyenne);
      }
    }
  } else res.note('--rapide : les 10 captures par état d’une partie du pilote bon ne sont pas prises');
}
if (principal(import.meta.url)) executer({ meta, mesurer });
