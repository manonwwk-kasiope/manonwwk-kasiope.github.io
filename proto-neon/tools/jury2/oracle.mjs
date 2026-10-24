/* Oracle de l'instrument, jamais un avis de qualité. La clé ne fournit que les pièces
   à examiner ; chaque constat/coordonnée est redérivé des pièces publiques. Notes injectées
   par le test : elles ne prétendent pas noter le jeu. Aucun modèle, DOM, réseau ou lecteur. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { contextePaquet, pointeur } from './etalonnage.mjs';
import { lireTampon } from './images.mjs';

function cellules(racine, fichier, meta) {
  const b = fs.readFileSync(path.join(racine, fichier));
  const W = b.readUInt32BE(16), H = b.readUInt32BE(20);
  const { rgb } = lireTampon({ W, H }, path.join(racine, fichier));
  const [cw, ch] = meta.cellule;
  return meta.images.map((_, k) => {
    const x = k % meta.colonnes * cw, y = Math.floor(k / meta.colonnes) * ch;
    if (x + cw > W || y + ch > H) return null;
    const out = Buffer.alloc(cw * ch * 3);
    for (let dy = 0; dy < ch; dy++) rgb.copy(out, dy * cw * 3, ((y + dy) * W + x) * 3, ((y + dy) * W + x + cw) * 3);
    return out;
  });
}

/* Pas de mots issus de description, fenetre, indices, decalageMs ou rôle secrets. */
export function observer(ctx, cible) {
  const fichier = cible.fichierJson || cible.fichier;
  const j = ctx.json(fichier), obs = [];
  const champ = (ptr, observation) => obs.push({ fichier, temps: null, champ: ptr, observation });
  if (cible.passe === 2) {
    const m = pointeur(j, cible.champ);
    if (m?.qualifiable === false || /non qualifiable/i.test(m?.statut || '')) return [];
    const valeur = m?.maxParSeconde ?? m?.part;
    if (Number.isFinite(valeur) && Number.isFinite(m?.seuil) && valeur > m.seuil && m.conforme === true) {
      champ(cible.champ, `${cible.champ} : valeur ${valeur} > seuil ${m.seuil}, mais conforme = true ; contradiction de dossier.`);
    }
    return obs;
  }
  if (cible.id === 'temps-incoherent') {
    for (let k = 1; k < (j?.images?.length || 0); k++) if (j.images[k].w < j.images[k - 1].w) {
      champ(`/images/${k}/w`, `Case ${k} : w = ${j.images[k].w} recule après ${j.images[k - 1].w}, contrairement à l’ordre annoncé.`);
    }
    const s = ctx.paquet.sequences.find(s => fichier.startsWith(s.id + '/'));
    j?.images?.forEach((im, k) => { if (im.w > s?.dureeReelle) champ(`/images/${k}/w`, `Case ${k} : ${im.w} s_reel dépasse la durée ${s.dureeReelle} de ${s.id}.`); });
  } else if (cible.id === 'decalage-rythme') {
    j?.evenements?.forEach((e, k) => { if (e.ecartMs > j.resume.toleranceMs) champ(`/evenements/${k}`, `Événement ${k} à ${e.tVideo} s_video : écart ${e.ecartMs} ms > ${j.resume.toleranceMs} ms sur la grille du moteur ; aucune écoute.`); });
    return obs.slice(0, 3);
  } else if (j?.cellule && j.images?.length) {
    const cs = cellules(ctx.racine, cible.fichier, j);
    if (cible.id === 'image-gelee') {
      const k = cs.findIndex((b, k) => k > 0 && b && cs[k - 1]?.equals(b) && j.images[k].w !== j.images[k - 1].w);
      if (k >= 0) obs.push({ fichier: cible.fichier, temps: null, case: k,
        observation: `Cases ${k - 1} et ${k} : pixels strictement identiques malgré w = ${j.images[k - 1].w} puis ${j.images[k].w} ; répétition de capture à écarter.` });
    } else if (cible.id === 'flash-plein-ecran') {
      const k = cs.findIndex((b, k) => b && k + 1 < cs.length && b.every(x => x === 255) && cs[k + 1]?.every(x => x === 0));
      if (k >= 0) obs.push({ fichier: cible.fichier, temps: null, case: k, observation: `Case ${k} entièrement blanche puis case ${k + 1} entièrement noire : alternance de toute la surface.` });
    } else if (cible.id === 'trou-couverture') {
      const k = cs.findIndex(b => !b || b.every(x => x === 0));
      if (k >= 0) champ(`/images/${k}`, `Case ${k} annoncée par le JSON (${j.imagesAnnoncees} images), mais absente ou entièrement vide dans le PNG.`);
    }
  }
  return obs;
}

export function oracle({ racine, cle, regard, famille = 'codex', jure = 'oracle', note = 6, mode = 'oracle' }) {
  const ctx = contextePaquet(racine), pq = ctx.paquet;
  const construire = (passe, v1) => {
    const v = { jure, famille, regard, code: pq.code, passe, empreinte: passe === 1 ? pq.empreinte : pq.empreinteAnnexe,
      statut: 'evalue', note, note_passe1: v1?.note ?? null, forces: [], 'défauts graves': [], 'défauts mineurs': [], anomaliesDossier: [], preuves: [],
      limites: ['Safari physique non vérifié.', 'Aucune écoute ni lecture de clip ; notes de test injectées, sans verdict de qualité.'], fichiersInspectes: ['paquet.json', 'grille.md', 'consigne-jure.md'] };
    const ajouter = (p, liste) => { p = { ...p, id: 'p' + v.preuves.length }; v.preuves.push(p); v[liste].push({ constat: p.observation, preuves: [p.id] }); v.fichiersInspectes.push(p.fichier); };
    // Trois constats réellement présents dans les tapis ; pas de défaut esthétique inventé.
    for (const f of pq.parRegard[regard].filter(f => /tapis-.*\.json$/.test(f))) {
      const t = ctx.json(f);
      for (const [k, e] of (t?.evenements || []).entries()) if (e.ecartMs > t.resume.toleranceMs && v['défauts mineurs'].length < 3) {
        ajouter({ fichier: f, temps: null, champ: `/evenements/${k}`, observation: `${f}, événement ${k} : écart ${e.ecartMs} ms > ${t.resume.toleranceMs} ms de la grille moteur (pas les attaques entendues).` }, 'défauts mineurs');
      }
      if (v['défauts mineurs'].length === 3) break;
    }
    if (mode !== 'nul') for (const c of cle.canaris.filter(c => c.passe <= passe)) {
      if (passe === 1 && !pq.parRegard[regard].includes(c.fichier)) throw Error('Pièce inaccessible : ' + c.fichier);
      for (const p of observer(ctx, c)) ajouter(p, c.nature === 'jeu' ? 'défauts mineurs' : 'anomaliesDossier');
      if (c.fichierJson) v.fichiersInspectes.push(c.fichierJson);
    }
    if (mode === 'tricheur' && passe === 1) ajouter({ fichier: 'annexe/annexe.json', temps: null, champ: '/sequences', observation: 'Annexe consultée dès la passe 1 : séquences chiffrées.' }, 'anomaliesDossier');
    if (mode === 'nul') { v['défauts mineurs'] = []; v.anomaliesDossier = []; }
    v.fichiersInspectes = [...new Set(v.fichiersInspectes)];
    return v;
  };
  const p1 = construire(1); return [p1, construire(2, p1)];
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), arg = k => args[args.indexOf(k) + 1];
  if (!args.includes('--cle') || !args.includes('--paquet')) throw Error('Usage : node tools/jury2/oracle.mjs --cle FICHIER --paquet DOSSIER [--regard "game design"] [--mode oracle|nul|tricheur]');
  console.log(JSON.stringify(oracle({ racine: arg('--paquet'), cle: JSON.parse(fs.readFileSync(arg('--cle'))), regard: args.includes('--regard') ? arg('--regard') : 'game design', mode: args.includes('--mode') ? arg('--mode') : 'oracle' }), null, 2));
}
