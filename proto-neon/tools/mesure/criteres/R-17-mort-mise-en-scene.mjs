/* R-17 — Mort mise en scène (§ 5.4) : séquence de 1,3 s (gel, cause entourée, désintégration, coupure de la
   musique) ; écran de fin au plus 1,5 s après l'impact ; serpent de nouveau en main moins de 2 s après
   l'impact ; saut possible dès 0,5 s. Mesure en temps réel du jeu : images × __DT (1/60), scène `mortTir`. */
import { executer, principal, seuils, exiger } from '../commun.mjs';

export const meta = { id: 'R-17', titre: 'Mort mise en scène', seuil: 'séquence 1,3 s ; fin ≤ 1,5 s ; serpent en main < 2 s ; saut dès 0,5 s', bloquant: true };
const DT = 1 / 60;
const IMAGE = `var b = N.gfx.buf(), na = 0, mg = 0; for (var i = 0; i < b.length; i++) { var c = b[i]; if (c === 1 || c === 2) na++; else if (c === 5) mg++; }
  return { f: window.__FRAME, e: M.etat(), j: N.joueuse && N.joueuse.etat, g: N.fx && N.fx.frozen ? !!N.fx.frozen() : null, horlogeGelee: N.horloge && N.horloge.gele ? !!N.horloge.gele() : null, x: N.joueuse.tete.x, y: N.joueuse.tete.y, ang: N.joueuse.tete.ang, b: N.fx && N.fx.frozen && N.fx.frozen() ? M.b64(b) : null, na: na / b.length, mg: mg / b.length };`;

async function sequence(s, { derniere = false, sauterA }) {
  // Une page fraîche évite de mesurer une tête encore invulnérable après l'essai précédent.
  await s.recharger();
  if (derniere) {
    // Atteindre réellement une vie par des impacts naturels ; API.vies est un instantané, pas un setter.
    let precedente = Infinity;
    while (true) {
      const v = await s.eval(() => window.__N.score.vies);
      if (v === 1) break;
      if (v < 1 || v >= precedente) return { ok: false, raison: 'préparation dernière vie sans diminution réelle : ' + v };
      precedente = v;
      const r = await s.scene('mortTir', { images: 1 });
      if (!r.ok) return r;
      if (!await s.attendre(() => window.__MESURE.etat() === 'mort', null, 8000)) return { ok: false, raison: 'impact naturel de préparation non obtenu' };
      if (!await s.attendre(() => window.__N.joueuse.etat === 'vivant' && window.__MESURE.etat() !== 'mort', null, 8000)) return { ok: false, raison: 'réapparition de préparation non obtenue' };
    }
  }
  const sc = await s.scene('mortTir', { images: 1 });
  if (!sc.ok) return { ok: false, raison: sc.raison };
  const viesAvant = await s.eval(() => window.__N.score.vies);
  await s.eval(() => { window.__MESURE.appels('r17cue', 'N.music.cue'); window.__MESURE.appels('r17ext', 'N.crt.extinction'); });
  await s.eval(c => window.__MESURE.parImage('r17', c), IMAGE);
  const vu = await s.attendre(() => window.__MESURE.etat() === 'mort', null, 8000);
  if (!vu) { await s.eval(() => window.__MESURE.arreter('r17')); return { ok: false, raison: 'la tourelle de la scène mortTir n’a pas tué la tête en 8 s' }; }
  if (sauterA !== undefined) { await s.images(Math.round(sauterA / DT)); await s.eval(() => window.__MESURE.dbg().input({ any: true, valider: true })); }
  // Tester une commande pendant la réapparition : une protection ne retire pas le contrôle.
  const retour = await s.attendre(() => ['reapparition', 'jeu', 'fin', 'initiales'].includes(window.__MESURE.etat()), null, 8000);
  let commande = null;
  if (retour && !derniere) commande = await s.eval(() => {
    const J = window.__N.joueuse, a = J.tete.ang + Math.PI / 2;
    window.__MESURE.dbg().input({ x: Math.cos(a), y: Math.sin(a), mag: 1 });
    return { f: window.__FRAME, x: J.tete.x, y: J.tete.y, ang: J.tete.ang, cible: a };
  });
  await s.images(200, 20);
  const I = await s.eval(() => window.__MESURE.arreter('r17'));
  const cue = (await s.eval(() => window.__MESURE.arreter('r17cue'))) || [];
  const ext = (await s.eval(() => window.__MESURE.arreter('r17ext'))) || [];
  const k0 = I.findIndex(x => x.e === 'mort'); if (k0 < 0) return { ok: false, raison: 'état mort non vu image par image' };
  const apres = I.slice(k0);
  const kFinMort = apres.findIndex(x => x.e !== 'mort');
  const kMain = commande ? apres.findIndex(x => x.f > commande.f && ['jeu', 'reapparition', 'nettoyage'].includes(x.e) && ['vivant', 'reapparition'].includes(x.j) && (x.x !== commande.x || x.y !== commande.y) && x.ang !== commande.ang) : -1;
  const kFin = apres.findIndex(x => x.e === 'fin' || x.e === 'initiales');
  const debutGel = apres.findIndex(x => x.g === true);
  const finGel = debutGel < 0 ? -1 : apres.findIndex((x, i) => i > debutGel && x.g === false);
  const gel = finGel < 0 ? -1 : finGel - debutGel;
  const gelees = apres.filter(x => x.b);
  let pixelsChangesGel = null;
  for (let k = 1; k < gelees.length; k++) {
    const a = Buffer.from(gelees[k - 1].b, 'base64'), b = Buffer.from(gelees[k].b, 'base64');
    let n = 0; for (let j = 0; j < a.length; j++) if (a[j] !== b[j]) n++;
    pixelsChangesGel = Math.max(pixelsChangesGel || 0, n / a.length);
  }
  const cueMort = cue.find(c => c.args[0] === 'mort');
  const bascules = apres.slice(0, kFinMort < 0 ? apres.length : kFinMort).reduce((n, x, i, l) => n + (i && (x.mg > 0.0005) !== (l[i - 1].mg > 0.0005) ? 1 : 0), 0);
  return { ok: true, images: I.length, impact: I[k0].f, viesAvant, pixelsChangesGel, viesApres: await s.eval(() => window.__N.score.vies), commande, reponse: kMain < 0 ? null : apres[kMain], horlogeToujoursGelee: apres.every(x => x.horlogeGelee), duree: kFinMort < 0 ? null : kFinMort * DT, main: kMain < 0 ? null : kMain * DT, fin: kFin < 0 ? null : kFin * DT,
    gel: gel < 0 ? null : gel * DT, cueMort: cueMort ? (cueMort.image - I[k0].f) : null, extinction: ext.length > 0,
    remap: { avant: I[Math.max(0, k0 - 1)].na, pendant: apres[Math.min(apres.length - 1, 8)].na }, bascules };
}

export async function mesurer(banc, res) {
  const s = await banc.ouvrir('paysage', { dt: DT });
  const { R, s: S } = await seuils(s, 'R17');
  const MS = R.mortScene || { duree: 1.3, sautDes: 0.5, gelImages: 10 };
  if (!await exiger(s, res, 'séquence de mort', ['N.game.dbg.scene', 'N.game.etat', 'N.gfx.present'])) return;
  const a = await sequence(s, {});
  if (!a.ok) res.nonMesurable('séquence avec des vies restantes', a.raison);
  else {
    res.note('Trace mort / contrôle : ' + JSON.stringify(a));
    res.verifie('durée de la séquence de mort (s)', a.duree, S.duree + ' ± 2 images', a.duree !== null && Math.abs(a.duree - S.duree) <= 2 * DT + 1e-9);
    res.verifie('serpent de nouveau en main après l’impact (s)', a.main, '< ' + S.relance, a.main !== null && a.main < S.relance);
    if (a.gel === null) res.nonMesurable('gel à l’impact', 'aucune sortie de gel observée ; consulter la trace');
    else res.verifie('gel à l’impact (s)', a.gel, '≈ ' + (MS.gelImages / 60).toFixed(3) + ' ± 1 image', a.gel !== null && Math.abs(a.gel - MS.gelImages / 60) <= DT + 1e-9);
    if (a.cueMort === null) res.nonMesurable('coupure de la musique', 'N.music.cue(\'mort\') jamais appelé');
    else res.verifie('coupure de la musique : N.music.cue(\'mort\') à l’impact (images)', a.cueMort, '≤ 1', a.cueMort <= 1);
    res.indicatif('monde remappé en nuit et ardoise (part du tampon, avant → pendant)', a.remap, 'pendant ≫ avant', a.remap.pendant > a.remap.avant + 0.2);
    res.indicatif('cause entourée qui clignote (bascules du magenta pendant la séquence)', a.bascules, '≥ 2 (3 Hz)', a.bascules >= 2);
  }
  const b = await sequence(s, { derniere: true });
  if (!b.ok) res.nonMesurable('séquence de la dernière vie', b.raison);
  else {
    res.note('Trace dernière vie : ' + JSON.stringify(b));
    if (b.fin === null) res.nonMesurable('écran de fin après l’impact', 'aucun écran de fin observé après une vraie dernière vie');
    else res.verifie('écran de fin après l’impact de la dernière vie (s)', b.fin, '≤ ' + S.fin, b.fin !== null && b.fin <= S.fin + 1e-9);
    res.indicatif('extinction du tube (N.crt.extinction appelé)', b.extinction, true, b.extinction);
  }
  const c = await sequence(s, { sauterA: MS.sautDes + 0.02 });
  if (!c.ok) res.nonMesurable('saut de la séquence dès 0,5 s', c.raison);
  else { res.note('Trace saut : ' + JSON.stringify(c)); res.verifie('saut à 0,52 s : fin de la séquence (s)', c.duree, '< ' + (MS.sautDes + 0.1), c.duree !== null && c.duree < MS.sautDes + 0.1); }
}
if (principal(import.meta.url)) executer({ meta, mesurer });
