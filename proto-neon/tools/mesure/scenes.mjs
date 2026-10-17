/* tools/mesure/scenes.mjs — atteindre une image à mesurer : une scène de référence du § 7.12
   (`__N.game.dbg.scene(nom)`), ou l'un des moments qui n'en sont pas (titre, attraction, mort).
   atteindre(session, nom) -> {ok, raison, etat}
     nom ∈ N.ids.scenes  : dbg.scene(nom), puis 3 images
     'titre'             : touchers simulés (dbg.input) depuis `demarrage` jusqu'à l'état `titre`
     'attraction'        : 'titre', puis attente sans toucher jusqu'à l'état `attraction` (15 s, § 5.6)
     'mort'              : scène `mortTir`, puis attente de l'état `mort` (au plus 4 s de jeu) */
export const ECRANS_PLEINS = ['ouverture', 'briefing', 'panneau', 'fin', 'initiales'];

export async function allerTitre(session, maxSec = 20) {
  const abs = await session.absents(['N.game.etat', 'N.game.dbg.input']);
  if (abs.length) return { ok: false, raison: (abs.length > 1 ? 'interfaces ' : 'interface ') + abs.join(', ') + (abs.length > 1 ? ' absentes' : ' absente') };
  if (!['demarrage', 'ouverture', 'titre', 'attraction', 'briefing'].includes(await session.etat())) await session.recharger();
  /* d'abord le crochet dbg.etat(nom) du squelette (79-jeu), s'il accepte un état à atteindre */
  const direct = await session.eval(() => { try { const d = window.__MESURE.dbg(); if (d.etat.length >= 1) d.etat('titre'); } catch (e) { } return window.__MESURE.etat(); });
  if (direct === 'titre') return { ok: true, etat: 'titre', par: 'dbg.etat' };
  const t0 = Date.now();
  while (Date.now() - t0 < maxSec * 1000) {
    const e = await session.etat();
    if (e === 'titre') return { ok: true, etat: e };
    if (!['demarrage', 'ouverture', 'attraction'].includes(e)) { await session.recharger(); continue; }
    await session.eval(() => window.__MESURE.dbg().input({ any: true }));
    await session.page.waitForTimeout(400);
  }
  return { ok: false, raison: 'état titre jamais atteint (dernier : ' + await session.etat() + ')' };
}

export async function atteindre(session, nom, o = {}) {
  if (nom === 'titre') return allerTitre(session);
  if (nom === 'attraction') {
    const r = await allerTitre(session);
    if (!r.ok) return r;
    const ok = await session.attendre(() => window.__MESURE.etat() === 'attraction', null, (o.attente || 20) * 1000);
    if (!ok) return { ok: false, raison: 'état attraction jamais atteint en ' + (o.attente || 20) + ' s sans toucher' };
    await session.page.waitForTimeout(o.apres || 3000);
    return { ok: true, etat: 'attraction' };
  }
  if (nom === 'mort') {
    const r = await session.scene('mortTir');
    if (!r.ok) return r;
    const ok = await session.attendre(() => window.__MESURE.etat() === 'mort', null, 8000);
    if (!ok) return { ok: false, raison: 'la scène mortTir n’a pas mené à l’état mort en 8 s' };
    await session.images(o.images || 12);
    return { ok: true, etat: 'mort' };
  }
  const r = await session.scene(nom, { images: o.images || 3 });
  if (r.ok) r.etat = await session.etat();
  return r;
}

/* coupe le tube (préréglage « coupe ») pour lire l'écran avant tube ; rend false si impossible */
export async function couperTube(session) {
  return session.eval(() => {
    const N = window.__N;
    try { if (N.crt && N.crt.auto) N.crt.auto(false); } catch (e) { }
    try { if (window.__S && window.__S.reglages) window.__S.reglages.ecran = 'pur'; } catch (e) { }
    try { if (N.crt && N.crt.preset) { N.crt.preset('coupe'); return true; } } catch (e) { }
    return false;
  });
}
