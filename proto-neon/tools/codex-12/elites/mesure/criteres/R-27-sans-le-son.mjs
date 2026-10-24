/* R-27 — Jouable sans le son (G-35, § 5.8) : chaque signal sonore utile a son signe visuel :
   armements → télégraphes ; portail → chevron ; battement → bords qui battent ; sirène du TRAQUEUR →
   bannière ; klaxon de convoi → voie hachurée et phares ; grondement du TRAVELLING → chevrons sur le mur
   arrière. Mesure : dans les parties simulées des pilotes bon et expert, chaque appel de N.music.sfx de ces
   noms doit être accompagné, à 0,1 s près (1,5 s pour la sirène), de l'enregistrement de son signe
   (journal `tele`, `portail`, `arene` ; appel de N.hud.banniere). Les cas construits exigent aussi
   les vrais pixels du signe : voie, chevrons, bords pulsants et journal du battement. */
import { executer, principal } from '../commun.mjs';
import { lot, bilanLot } from '../parties.mjs';
import { construire, verdictCas } from '../../codex-p22/cas.mjs';

export const meta = { id: 'R-27', titre: 'Jouable sans le son', seuil: 'chaque signal sonore utile a son signe visuel', bloquant: true };
const PAIRES = [
  { son: 'arme', signe: 'télégraphe (journal tele ou armement)', ok: (r, t) => r.j.some(x => (x.type === 'tele' || x.type === 'armement') && Math.abs(x.t - t) <= 0.1) },
  { son: 'portail', signe: 'chevron (journal portail, dessiné par 78-hud)', ok: (r, t) => r.j.some(x => x.type === 'portail' && Math.abs(x.t - t) <= 0.1) },
  { son: 'traqueur', signe: 'bannière', ok: (r, t) => (r.a['N.hud.banniere'] || []).some(x => Math.abs(x.t - t) <= 1.5) },
  { son: 'convoi', signe: 'voie hachurée (journal arene convoiAnnonce)', ok: (r, t) => r.j.some(x => x.type === 'arene' && (x.d || x).evt === 'convoiAnnonce' && Math.abs(x.t - t) <= 0.1) },
  { son: 'travelling', signe: 'chevrons du mur arrière ou vue de VOL (journal annonce/départ)', ok: (r, t) => r.j.some(x => ((x.type === 'arene' && ['travellingAnnonce', 'travelling'].includes((x.d || x).evt)) || (x.type === 'vol' && (x.d || x).evt === 'debut')) && Math.abs(x.t - t) <= 0.1) }
];

export async function mesurer(banc, res) {
  const parts = [];
  for (const p of ['bon', 'expert']) { const b = bilanLot(await lot(banc, p, banc.graines(10, 3))); if (b.ok) parts.push(...b.parties); else if (!parts.length && p === 'expert') return res.nonMesurable('parties', b.raison); }
  if (!parts.length) return res.nonMesurable('parties', 'aucune partie');
  if (!parts.some(p => p.appels && p.appels['N.music.sfx'])) return res.absent('sons', 'N.music.sfx');
  for (const P of PAIRES) {
    let n = 0, ok = 0;
    for (const p of parts) {
      const r = { j: p.journal, a: p.appels || {} };
      for (const c of ((p.appels || {})['N.music.sfx'] || []).filter(x => x.a === P.son)) { n++; if (P.ok(r, c.t)) ok++; }
    }
    if (!n && P.son === 'convoi') res.note('Convoi absent des parties : cas construit mesuré ci-dessous.');
    else if (!n) res.nonMesurable(`${P.son} → ${P.signe}`, `aucun son « ${P.son} » demandé dans ${parts.length} parties`);
    else res.verifie(`${P.son} → ${P.signe}`, ok / n, 1, ok === n, { sons: n });
  }
  // L'absence d'une rencontre aléatoire ne vaut pas réussite : vraies mécaniques construites et pixels.
  for (const profil of banc.profils(['paysage', 'portrait', 'bureau'])) {
    const s = await banc.ouvrir(profil, { dt: 1 / 60 });
    for (const nom of ['convoi', 'travelling', 'battement']) {
      const r = await s.eval(construire, { nom });
      const evt = nom === 'convoi' ? 'convoiAnnonce' : nom === 'travelling' ? 'travellingAnnonce' : 'battement';
      const traces = r.journal.filter(x => x.type === 'arene' && x.d.evt === evt);
      if (!traces.length) res.nonMesurable(`${profil} ${nom} journal`, 'aucun événement arene ' + evt);
      else {
        const ok = verdictCas(r);
        res.verifie(`${profil} ${nom} signe et journal`, Number(ok), 1, ok,
          { pixels: r.pixelsVisuels, minimum: r.min, maximum: r.max, traces: traces.length });
      }
      res.verifie(`${profil} ${nom} erreurs`, r.err.count, 0, r.err.count === 0);
    }
    await s.fermer();
  }
}
if (principal(import.meta.url)) executer({ meta, mesurer });
