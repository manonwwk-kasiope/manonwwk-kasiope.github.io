/* R-21 — Zéro erreur : __ERR.count = 0 et console vide sur 3 profils × 8 pilotes × 5 graines (mode simulé),
   plus 50 graines en paysage (pilote bon), plus une partie dessinée par profil, les rotations, la pause, la
   coupure du son et la suspension. */
import { executer, principal, seuils, TOUS_PROFILS } from '../commun.mjs';
import { lot, PILOTES } from '../parties.mjs';

export const meta = { id: 'R-21', titre: 'Zéro erreur', seuil: '__ERR.count = 0 et console vide partout', bloquant: true };

export async function mesurer(banc, res) {
  const { s: S } = await seuils(null, 'R21');
  /* 1. simulé : 3 profils × 8 pilotes × 5 graines */
  const g5 = banc.graines(S.graines || 5, 2);
  for (const profil of banc.profils()) {
    let n = 0, ko = 0; const ex = []; let absent = null;
    for (const pilote of PILOTES) {
      const l = await lot(banc, pilote, g5, { profil, ...(pilote === 'dieu' ? { god: true } : pilote === 'humain' ? { actions: 'auto' } : {}) });
      for (const p of l) { if (!p.ok) { absent = absent || p.raison; continue; } n++; if (!p.erreurs.zero) { ko++; if (ex.length < 4) ex.push({ pilote, graine: p.params.graine, err: p.erreurs.err, sigs: p.erreurs.sigs, console: p.erreurs.console.slice(0, 2) }); } }
    }
    if (!n) res.nonMesurable(`${profil} : 8 pilotes × ${g5.length} graines (simulé)`, absent || 'aucune partie');
    else res.verifie(`${profil} : 8 pilotes × ${g5.length} graines (simulé), parties sans erreur`, (n - ko) / n, 1, ko === 0, { parties: n, exemples: ex });
  }
  /* 2. cinquante graines en paysage */
  const l50 = await lot(banc, 'bon', banc.graines(S.grainesPaysage || 50, 5));
  const ok50 = l50.filter(p => p.ok);
  if (!ok50.length) res.nonMesurable('paysage : 50 graines (pilote bon)', l50[0] && l50[0].raison);
  else { const ko = ok50.filter(p => !p.erreurs.zero).length; res.verifie(`paysage : ${ok50.length} graines (pilote bon), parties sans erreur`, (ok50.length - ko) / ok50.length, 1, ko === 0); }
  /* 3. une partie dessinée par profil, puis les épreuves du cycle de vie en paysage */
  const sec = banc.o.rapide ? 8 : 30;
  for (const profil of banc.profils()) {
    const s = await banc.ouvrir(profil, {});
    const d = await s.demarrer({ graine: 9, pilote: 'bon' });
    if (!d.ok) { res.nonMesurable(`${profil} : partie dessinée`, d.raison); await s.fermer(); continue; }
    await s.page.waitForTimeout(sec * 1000);
    const e = await s.bilanErreurs();
    res.verifie(`${profil} : ${sec} s de partie dessinée`, e.err, '0, console vide', e.zero, { sigs: e.sigs, console: e.console.slice(0, 3), pageErreurs: e.pageErreurs.slice(0, 3) });
    if (profil === 'paysage') {
      for (let i = 0; i < 5; i++) { await s.page.setViewportSize(i % 2 ? { width: 844, height: 390 } : { width: 390, height: 844 }); await s.page.waitForTimeout(700); }
      await s.page.setViewportSize({ width: 844, height: 390 });
      let e2 = await s.bilanErreurs(); res.verifie('paysage : cinq rotations', e2.err, '0, console vide', e2.zero, { sigs: e2.sigs, console: e2.console.slice(0, 3) });
      await s.eval(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('blur')); });
      await s.page.waitForTimeout(1500);
      await s.eval(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('focus')); });
      await s.page.waitForTimeout(800);
      e2 = await s.bilanErreurs(); res.verifie('paysage : pause en arrière-plan et retour', e2.err, '0, console vide', e2.zero, { sigs: e2.sigs });
      await s.eval(() => { const m = window.__N.music; try { m.mute('musique', true); m.mute('effets', true); m.mute('musique', false); m.mute('effets', false); m.mute(true); m.mute(false); } catch (e) { window.__R21mute = String(e); } });
      await s.page.waitForTimeout(500);
      e2 = await s.bilanErreurs(); res.verifie('paysage : coupure et retour du son', e2.err, '0, console vide', e2.zero, { sigs: e2.sigs });
      const cdp = await s.cdpSession();
      try { await cdp.send('Page.setWebLifecycleState', { state: 'frozen' }); await s.page.waitForTimeout(1500); await cdp.send('Page.setWebLifecycleState', { state: 'active' }); await s.page.waitForTimeout(1000); e2 = await s.bilanErreurs(); res.verifie('paysage : suspension (page gelée 1,5 s)', e2.err, '0, console vide', e2.zero, { sigs: e2.sigs }); }
      catch (x) { res.nonMesurable('paysage : suspension', 'Page.setWebLifecycleState refusé : ' + x.message); }
    }
    await s.fermer();
  }
}
if (principal(import.meta.url)) executer({ meta, mesurer });
