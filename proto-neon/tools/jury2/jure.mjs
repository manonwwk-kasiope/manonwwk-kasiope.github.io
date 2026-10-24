/* Montage du paquet remis aux jurés, à partir d'un dossier BRUT produit par banc.mjs.
   Hors bac comme tout le reste, mais sans serveur ni navigateur : il ne lit que des fichiers.
     node tools/jury2/jure.mjs paquet --dossier dossiers/<serie>-<id> --role etalonnage-v0|etalonnage-pointe|etalonnage-temoin|verdict-A|verdict-B [--validation dossiers/<…>/validation-instrument.json]
     node tools/jury2/jure.mjs doublon --code J-xxxxxxxx           (même paquet, noms mélangés : test de stabilité)
   Ce que le paquet garantit : noms neutres (code tiré au sort, séquences S01… dans un ordre tiré au sort, aucune
   empreinte de build, aucun nom de dossier brut) ; échantillon appliqué par script à toutes les données ;
   passe 1 = images, vidéos muettes, tapis rythmiques ; passe 2 = annexe de chiffres, remise seulement après la
   note de la passe 1 ; défauts plantés tirés au hasard et consignés dans la clé aveugle (cles/, jamais dans le paquet). */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { P, REGARDS, paris } from './protocole.mjs';
import { carteAlignee } from './analyse.mjs';
import { planEchantillon, imagesAutour, prng, hashTexte } from './echantillon.mjs';
import { tapisRythmique, rendreTapis } from './tapis.mjs';
import { tirerTypes, imageGelee, bandeauMasquant, flashPleinEcran, retirerCases, incoherenceTemps, decalerTapis, contredireMesure } from './canaris.mjs';
import { lireTampon, planche } from './images.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const gunzipJSON = f => JSON.parse(zlib.gunzipSync(fs.readFileSync(f)).toString('utf8'));
const lireJSON = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const DOSSIER_PAQUETS = path.join(HERE, 'paquets'), DOSSIER_CLES = path.join(HERE, 'cles');
export const ROLES = ['etalonnage-v0', 'etalonnage-pointe', 'etalonnage-temoin', 'verdict-A', 'verdict-B'];
const roleBase = r => r.startsWith('verdict') ? 'verdict' : 'etalonnage';

/* Ce que chaque regard reçoit (autotest.md § 3.1) : catégories de planches, profils, tapis. Pas de choix à la main. */
export const AFFECTATION = {
  'joueuse iPhone': { profils: ['paysage', 'portrait'], categories: ['uniforme', 'mort', 'vague', 'vol', 'warp-entree', 'pire-mort-court-preavis'], tapis: false },
  'game design': { profils: ['paysage'], categories: ['vague', 'cyclope', 'warp-entree', 'warp-sortie', 'mort', 'fin', 'vol', 'espace'], tapis: false },
  'rythme et musique': { profils: ['paysage'], categories: ['drop', 'drop-dense', 'break', 'warp-entree', 'warp-sortie', 'vague'], tapis: true },
  'direction artistique': { profils: ['bureau', 'paysage'], categories: ['uniforme', 'vague', 'warp-entree', 'cyclope', 'fin', 'vol', 'espace'], tapis: false },
  'avocat du diable': { profils: ['paysage', 'portrait', 'bureau'], categories: ['uniforme', 'pire-image-lente', 'pire-mort-court-preavis', 'pire-seconde-flashs', 'mort'], tapis: false }
};
const melanger = (a, rng) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const propre = mesures => {
  const m = JSON.parse(JSON.stringify(mesures));
  m.audio = { rmsMusique: m.audio?.rmsMusique ?? null, rmsSortie: m.audio?.rmsSortie ?? null, captureRms: m.audio?.captureRms ?? null,
    note: 'rmsMusique et rmsSortie : niveaux publics du moteur ; captureRms : niveau du fichier audio réellement capté. Personne n’écoute ce fichier.' };
  m.adapte = { existe: m.adapte?.existe ?? null, valeurs: m.adapte?.serie?.length ?? 0 };
  return m;
};
const cleSequence = c => [c.profil, c.pilote, c.graine, c.genre, c.qui || ''].join('|');
const estPartieJouee = c => ['partie', 'aventure'].includes(c.genre);

/* Phase A : plan de chaque séquence (aucune image chargée). */
function inventaire(dossier, manifest) {
  const carte = fs.existsSync(path.join(dossier, 'structure-r1.json')) ? lireJSON(path.join(dossier, 'structure-r1.json')) : null;
  const cas = manifest.cas.filter(c => c.medias && estPartieJouee(c) && fs.existsSync(path.join(dossier, c.dossier, 'brut.json.gz')));
  return cas.map(c => {
    const dir = path.join(dossier, c.dossier), data = gunzipJSON(path.join(dir, 'brut.json.gz'));
    const croisements = carteAlignee(data.frames, carte), plan = planEchantillon(data, { cle: cleSequence(c), croisements, aire: data.regles?.R13?.aire, duree: data.duree });
    const clips = (c.medias.clips || []).map(m => ({ moment: m.moment, debut: m.debut, fin: m.fin }));
    return { c, dir, plan: plan.plan, regle: plan.regle, clips, duree: data.duree };
  });
}
const nomPlanche = it => `planche-${it.categorie}-${it.rang ?? it.n ?? 1}`;

/* Éléments candidats aux canaris, choisis AVANT toute écriture pour ne charger qu'une séquence à la fois. */
function choisirCanaris(types, seqs, rng) {
  const catalogue = {
    planche: seqs.flatMap((s, i) => s.plan.map((it, k) => ({ seq: i, k, cle: `${i}/${k}` }))),
    tapis: seqs.flatMap((s, i) => s.clips.map((m, k) => ({ seq: i, k, moment: m.moment, cle: `${i}/t${k}` }))),
    annexe: seqs.flatMap((s, i) => s.c.genre === 'partie' ? [{ seq: i, cle: `${i}/a` }] : [])
  };
  const pris = new Set(), choix = [], manques = [];
  const tirer = pool => { const p = pool.filter(x => !pris.has(x.cle)); if (!p.length) return null; const x = p[Math.floor(rng() * p.length)]; pris.add(x.cle); return x; };
  for (const t of types) {
    const pool = t.id === 'decalage-rythme' ? catalogue.tapis : t.id === 'mesure-contradictoire' ? catalogue.annexe : catalogue.planche;
    const x = tirer(pool);
    if (!x) manques.push(t.id); else choix.push({ type: t, ...x });
  }
  return { choix, manques };
}

/* Sortie d'un paquet : écrit, empreinte et catégorise chaque fichier. */
function sortie(racine) {
  const fichiers = [];
  const ecrire = (rel, contenu, categorie, extra = {}) => {
    const f = path.join(racine, rel); fs.mkdirSync(path.dirname(f), { recursive: true });
    const buf = Buffer.isBuffer(contenu) ? contenu : Buffer.from(typeof contenu === 'string' ? contenu : JSON.stringify(contenu, null, 2) + '\n');
    fs.writeFileSync(f, buf); fichiers.push({ chemin: rel, sha256: sha(buf), octets: buf.length, categorie, ...extra }); return rel;
  };
  const copier = (src, rel, categorie, extra = {}) => ecrire(rel, fs.readFileSync(src), categorie, extra);
  return { fichiers, ecrire, copier };
}

export async function construirePaquet(o) {
  const dossier = path.resolve(o.dossier), role = o.role;
  if (!ROLES.includes(role)) throw Error('Rôle inconnu : ' + role + ' (' + ROLES.join(', ') + ')');
  const manifest = lireJSON(path.join(dossier, 'manifeste.json'));
  if (!manifest.collecteTerminee) throw Error('Dossier brut inachevé (collecteTerminee absent) : ' + dossier);
  let validation = null;
  if (roleBase(role) === 'verdict') {
    const attendue = role === 'verdict-A' ? 'alpha' : 'beta';
    if (manifest.serie !== attendue) throw Error(`Le rôle ${role} exige la série ${attendue}, ce dossier est de la série ${manifest.serie}.`);
    if (!o.validation) throw Error('Un paquet de verdict exige --validation (validation-instrument.json valide, même protocole).');
    validation = lireJSON(path.resolve(o.validation));
    if (!validation.valide) throw Error('Instrument non validé : aucun paquet de verdict.');
    if (validation.protocoleSha256 !== manifest.protocoleSha256) throw Error('Le protocole du banc a changé depuis la validation de l’instrument : revalider.');
    if (!manifest.complet) throw Error('Dossier brut incomplet pour sa série : aucun paquet de verdict.');
  }
  const carte = fs.existsSync(path.join(dossier, 'structure-r1.json')) ? lireJSON(path.join(dossier, 'structure-r1.json')) : null;
  const code = o.code || 'J-' + crypto.randomBytes(4).toString('hex'), graineTirage = o.graineTirage || crypto.randomBytes(16).toString('hex');
  const rng = prng(hashTexte(graineTirage)), racine = path.join(o.sortie || DOSSIER_PAQUETS, code), cleFichier = path.join(o.cles || DOSSIER_CLES, code + '.json');
  if (fs.existsSync(racine) || fs.existsSync(cleFichier)) throw Error('Paquet ou clé déjà présents, refus d’écraser : ' + code);
  fs.mkdirSync(racine, { recursive: true });
  const S = sortie(racine);

  const seqs = melanger(inventaire(dossier, manifest), rng).map((s, i) => ({ ...s, id: 'S' + String(i + 1).padStart(2, '0') }));
  if (!seqs.length) throw Error('Aucune séquence filmée exploitable dans ' + dossier);
  const types = o.sansCanaris ? [] : tirerTypes(roleBase(role), rng);
  const { choix, manques: canarisManques } = choisirCanaris(types, seqs, rng);
  const plantes = [];

  const sequencesJSON = [], limites = [], annexeSeq = {};
  for (let i = 0; i < seqs.length; i++) {
    const s = seqs[i], { c, dir } = s, data = gunzipJSON(path.join(dir, 'brut.json.gz')), index = lireJSON(path.join(dir, 'tampons', 'index.json'));
    const croisements = carteAlignee(data.frames, carte);
    const mesuresRaw = lireJSON(path.join(dir, 'mesures.json')), fich = [];
    const canarisIci = choix.filter(x => x.seq === i), echantillonAnnexe = []; let denseAbsente = false;
    /* planches de l'échantillon */
    for (let k = 0; k < s.plan.length; k++) {
      const it = s.plan[k], base = nomPlanche(it), drop = it.categorie === 'drop';
      const params = drop ? { avant: P.autourDrop, apres: P.autourDrop, pas: 0.5, tolerance: P.tolerancePlanche, max: 9 }
        : { avant: it.avant, apres: it.apres, pas: P.echantillon.pasPlanche, max: P.echantillon.maxImagesPlanche };
      const variantes = [{ cat: it.categorie, base, params }];
      if (drop) variantes.push({ cat: 'drop-dense', base: `planche-drop-dense-${it.rang}`, params: { avant: 0.5, apres: 1.0, pas: P.denses.pasPlanche, tolerance: P.denses.tolerance, max: 14 } });
      for (const v of variantes) {
        const sel = imagesAutour(index, it.w, v.params);
        if (v.cat === 'drop-dense' && sel.images.length < 6) { if (!denseAbsente) { limites.push(`${s.id} : images denses (15 Hz) absentes autour des drops : dossier brut à 4 Hz`); denseAbsente = true; } continue; }
        if (!sel.images.length) { limites.push(`${s.id} : aucune image pour ${v.base} (cible ${it.w} s_reel)`); continue; }
        let imgs = sel.images.map(x => lireTampon(x, path.join(dir, x.fichier))), meta = { categorie: v.cat, famille: it.famille, rang: it.rang ?? null, cible: { valeur: it.w, unite: 's_reel' }, detail: detailPublic(it) };
        let annonce = imgs.length, jsonImgs = sel.images.map((x, n) => ({ case: n, w: x.w, t: x.t, etat: x.etat }));
        const ck = canarisIci.find(x => x.k === k && x.type.id !== 'decalage-rythme' && x.type.id !== 'mesure-contradictoire' && v.cat === it.categorie);
        let canariDesc = null;
        if (ck && imgs.length < 5) canarisManques.push(ck.type.id + ' (planche de moins de 5 images : ' + s.id + ')');
        if (ck && imgs.length >= 5) {
          const id = ck.type.id, kk = Math.max(0, Math.floor((imgs.length - 4) / 2)), ts = jsonImgs.map(x => x.w);
          if (id === 'image-gelee') { const r = imageGelee(imgs, kk); imgs = r.images; canariDesc = { indices: r.indices }; }
          else if (id === 'flash-plein-ecran') { const r = flashPleinEcran(imgs, kk); imgs = r.images; canariDesc = { indices: r.indices }; }
          else if (id === 'trou-couverture') { const r = retirerCases(imgs); imgs = r.images; canariDesc = { annonce: r.annonce, retirees: r.retirees, indices: [] }; }
          else if (id === 'temps-incoherent') { const r = incoherenceTemps({ images: jsonImgs }); jsonImgs = r.json.images; canariDesc = { indices: r.indices }; }
          if (!canariDesc) canarisManques.push(id + ' (cible sans planche exploitable : ' + s.id + ')');
          if (canariDesc) { const ws = (canariDesc.indices.length ? canariDesc.indices.map(n => ts[n]) : ts); canariDesc = { ...ck.type, passe: ck.type.passe, fichier: `${s.id}/${v.base}.png`, fichierJson: `${s.id}/${v.base}.json`, fenetre: [Math.min(...ws), Math.max(...ws)], ...canariDesc, description: id }; plantes.push(canariDesc); }
        }
        const pl = planche(imgs.map((im, n) => ({ ...im, fichier: String(n) })), path.join(racine, '.tmp-planche.png'));
        const png = fs.readFileSync(path.join(racine, '.tmp-planche.png')); fs.rmSync(path.join(racine, '.tmp-planche.png'));
        S.ecrire(`${s.id}/${v.base}.png`, png, 'planche', { regardCat: v.cat, profil: c.profil, genre: c.genre });
        S.ecrire(`${s.id}/${v.base}.json`, { ...meta, colonnes: pl.colonnes, cellule: pl.cellule, images: jsonImgs, imagesAnnoncees: annonce, manquantes: sel.manquantes,
          complet: sel.manquantes.length === 0, ordre: 'cases de gauche à droite puis de haut en bas ; w = s_reel, t = s_jeu', note: 'Pixels exacts du tampon, sans mise à l’échelle.' }, 'planche-meta', { regardCat: v.cat, profil: c.profil, genre: c.genre });
        if (sel.manquantes.length) limites.push(`${s.id} : ${sel.manquantes.length} image(s) manquante(s) dans ${v.base}`);
        fich.push(`${s.id}/${v.base}.png`);
        echantillonAnnexe.push({ fichier: `${s.id}/${v.base}.png`, ...detailAnnexe(it), categorieAffichee: v.cat });
      }
    }
    /* clips muets et tapis rythmiques */
    const clipsMeta = [];
    for (let k = 0; k < c.medias.clips.length; k++) {
      const m = c.medias.clips[k], src = path.join(dir, m.video);
      if (!fs.existsSync(src)) { limites.push(`${s.id} : vidéo ${m.moment} absente`); continue; }
      const sansTrou = m.sansTrou ?? !(m.trousAvecMouvement || []).length;
      S.copier(src, `${s.id}/clip-${m.moment}.mp4`, 'clip', { profil: c.profil, genre: c.genre });
      S.ecrire(`${s.id}/clip-${m.moment}.json`, { moment: m.moment, debut: m.debut, fin: m.fin, dureeEncodee: m.dureeEncodee, instantMomentDansVideo: m.instantMomentDansVideo, conforme: m.conforme, sansTrou,
        trousAvecMouvement: m.trousAvecMouvement, carte: m.carte, tempsAudio: m.tempsAudio, note: m.note, horloges: 'tVideo = s_video depuis le début du clip ; w = s_reel ; tFichier = s_fichier_audio' }, 'clip-meta', { profil: c.profil, genre: c.genre });
      if (!sansTrou) limites.push(`${s.id} : vidéo ${m.moment} avec ${(m.trousAvecMouvement || []).length} trou(s) de capture alors que le jeu bougeait (voir clip-${m.moment}.json)`);
      if (!m.conforme) limites.push(`${s.id} : vidéo ${m.moment} non conforme (durée ou trou de plus de ${P.maxTrouVideoTolere} s)`);
      let tapis = tapisRythmique({ frames: data.frames, evenements: data.evenements, croisements, debut: m.debut, fin: m.fin, moment: m.moment });
      const ct = canarisIci.find(x => x.type.id === 'decalage-rythme' && x.moment === m.moment);
      if (ct && tapis.evenements.length >= 3) {
        tapis = decalerTapis(tapis); plantes.push({ ...ct.type, fichier: `${s.id}/tapis-${m.moment}.png`, fichierJson: `${s.id}/tapis-${m.moment}.json`, fenetre: [m.debut, m.fin], decalageMs: P.canaris.decalageMs, description: 'decalage-rythme' });
      } else if (ct) canarisManques.push('decalage-rythme (tapis sans événements : ' + s.id + ')');
      S.ecrire(`${s.id}/tapis-${m.moment}.json`, tapis, 'tapis-meta', { profil: c.profil, genre: c.genre });
      S.ecrire(`${s.id}/tapis-${m.moment}.png`, rendreTapis(tapis).fichier, 'tapis', { profil: c.profil, genre: c.genre });
      clipsMeta.push({ moment: m.moment, conforme: m.conforme, sansTrou });
    }
    S.ecrire(`${s.id}/fiche.md`, ficheNeutre(s, c, data, mesuresRaw), 'fiche', { profil: c.profil, genre: c.genre });
    sequencesJSON.push({ id: s.id, genre: c.genre, profil: c.profil, pilote: c.pilote, dureeReelle: +data.duree.toFixed(3), tempsJeu: data.final?.tempsJeu ?? null, arret: data.raison, etatFinal: data.final?.etat ?? null,
      moments: (c.moments || []).map(m => ({ nom: m.nom, w: +m.w.toFixed(3), t: m.t, etat: m.etat })), clips: clipsMeta, aventureComplete: c.aventureComplete });
    annexeSeq[s.id] = { echantillon: echantillonAnnexe, regleEchantillon: s.regle, genre: c.genre, profil: c.profil, pilote: c.pilote, issue: mesuresRaw.mesures.issue, mesures: propre(mesuresRaw.mesures), morts: mesuresRaw.mesures.morts, manques: mesuresRaw.manques,
      adapte: fs.existsSync(path.join(dir, 'adapte.json')) ? lireJSON(path.join(dir, 'adapte.json')) : null };
    const ca = choix.find(x => x.seq === i && x.type.id === 'mesure-contradictoire');
    if (ca) { annexeSeq[s.id].mesures = contredireMesure(annexeSeq[s.id].mesures); plantes.push({ ...ca.type, fichier: 'annexe/annexe.json', champ: `/sequences/${s.id}/mesures/R13`, description: 'mesure-contradictoire' }); }
  }
  /* annexe (passe 2) : chiffres, portes et courbes, remise seulement après la note de la passe 1 */
  const parties = Object.values(annexeSeq).filter(a => a.genre === 'partie');
  const sync = { total: 0, mesurables: 0, dans40ms: 0 };
  for (const a of parties) for (const v of Object.values(a.mesures.synchronisation || {})) { sync.total += v.total; sync.mesurables += v.mesurables; sync.dans40ms += v.dans40ms; }
  const perf = manifest.performance.concat(manifest.cas.filter(c => c.genre === 'charge')).map(p => ({ genre: p.genre, profil: p.profil, scene: p.scene ?? null, p50Ms: p.mesures.coutImage?.p50Ms ?? null, p95Ms: p.mesures.coutImage?.p95Ms ?? null, n: p.mesures.coutImage?.n ?? 0,
    conformeP95: p.mesures.coutImage?.conforme ?? null, R13: p.mesures.R13 ? { maxParSeconde: p.mesures.R13.maxParSeconde ?? null, seuil: p.mesures.R13.seuil ?? null, conforme: p.mesures.R13.conforme } : null, zeroErreur: p.mesures.zeroErreur }));
  const annexe = { code, passe: 2, dateParis: paris(), avertissement: 'Annexe de chiffres : remise après la note de la passe 1. Aucune de ces valeurs n’est un jugement.',
    sequences: annexeSeq, difficulte: (manifest.difficulte || []).filter(d => d.n > 0), synchronisationAgregee: { ...sync, part: sync.mesurables ? sync.dans40ms / sync.mesurables : null, seuilMs: P.syncMs, seuilPart: P.syncPart },
    performance: perf, seuilsDuJeu: lireRegles(dossier, manifest),
    limites: ['Difficulté : n inférieur à 100 parties par pilote et par profil = indicatif, jamais conclusif.', 'Émulation Chrome tactile ; Safari et iPhone physique non vérifiés.'] };
  S.ecrire('annexe/annexe.json', annexe, 'annexe');
  /* règles de lecture et repères */
  for (const f of ['grille.md', 'consigne-jure.md']) S.copier(path.join(HERE, f), f, 'regle');
  const parRegard = {};
  const plancheMeta = S.fichiers.filter(f => f.categorie === 'planche');
  /* Socle commun indépendant du tirage : toutes les pièces candidates aux défauts de passe 1,
     PNG ET JSON, tous profils. Ajouter seulement les pièces plantées les désignerait aux jurés.
     L'intersection des affectations spécialisées est vide (catégories/profils/tapis différents).
     Les clips et fiches restent affectés par spécialité ; l'annexe reste réservée à la passe 2.
     Ce socle vaut aussi sans canaris et ne change ni le tirage crypto ni les noms neutres. */
  const commun = S.fichiers.filter(f => ['planche', 'planche-meta', 'tapis', 'tapis-meta'].includes(f.categorie));
  for (const r of REGARDS) {
    const a = AFFECTATION[r], profilsDispo = new Set(plancheMeta.map(f => f.profil)), profils = a.profils.filter(p => profilsDispo.has(p)), pp = profils.length ? profils : [...profilsDispo];
    const sel = S.fichiers.filter(f => pp.includes(f.profil) && ((f.categorie === 'planche' && a.categories.includes(f.regardCat)) || (a.tapis && ['tapis', 'tapis-meta'].includes(f.categorie)) || f.categorie === 'planche-meta' && a.categories.includes(f.regardCat) || ['clip', 'clip-meta', 'fiche'].includes(f.categorie)));
    parRegard[r] = [...new Set([...sel, ...commun].map(f => f.chemin))].sort();
  }
  for (const c of plantes.filter(c => c.passe === 1)) for (const r of REGARDS) {
    if (![c.fichier, c.fichierJson].every(f => f && parRegard[r].includes(f))) {
      throw Error('Défaut de passe 1 inaccessible à un regard : ' + r + ' / ' + c.id);
    }
  }
  const passe1 = S.fichiers.filter(f => !['annexe'].includes(f.categorie)), empreinte = sha(passe1.map(f => f.chemin + '\t' + f.sha256).sort().join('\n')), empreinteAnnexe = sha(S.fichiers.find(f => f.categorie === 'annexe').sha256);
  limites.push('Audio : personne ne l’écoute. Les vidéos sont muettes ; le tapis rythmique donne la grille du moteur, pas les attaques du signal rendu.');
  limites.push('Cadence : les captures du tampon sont à 4 Hz (15 Hz près des temps forts) ; aucune fluidité ne se prouve par ces images ni par les vidéos.');
  if (manifest.reduit) limites.push('Dossier réduit (série plus petite que sa spécification) : jamais une qualification complète.');
  if (!manifest.complet) limites.push('Dossier incomplet pour sa série : voir les limites ci-dessus.');
  if (manifest.manques?.length) limites.push('Moments absents de tout le dossier : ' + manifest.manques.join(', ') + '.');
  const paquet = { code, version: 1, dateParis: paris(), regards: REGARDS, sequences: sequencesJSON, parRegard, limites, empreinte, empreinteAnnexe,
    horloges: { s_video: 'secondes depuis le début d’un clip', s_reel: 'secondes réelles depuis le début de la séquence', s_jeu: 'temps de jeu (le ralenti compte)', s_fichier_audio: 'curseur du fichier musical' },
    lire: 'Passe 1 : les fichiers de ton regard dans parRegard (tu peux en ouvrir d’autres : déclare-les). Passe 2 : annexe/annexe.json, remise après ta note 1.',
    fichiers: passe1.map(({ chemin, sha256, octets, categorie }) => ({ chemin, sha256, octets, categorie })) };
  fs.writeFileSync(path.join(racine, 'paquet.json'), JSON.stringify(paquet, null, 2) + '\n');
  const cle = { code, role, dateParis: paris(), dossierBrut: path.basename(dossier), dossierBrutChemin: dossier, build: manifest.build, bundleSha256: manifest.bundleSha256, serie: manifest.serie ?? null, graineListe: manifest.graineListe ?? null, sceauSha256: manifest.sceauSha256 ?? null,
    protocoleSha256: manifest.protocoleSha256, reduit: !!manifest.reduit, complet: !!manifest.complet, pretPourJury: !!manifest.pretPourJury, validation: validation ? { valide: validation.valide, protocoleSha256: validation.protocoleSha256 } : null,
    ordre: Object.fromEntries(seqs.map(s => [s.id, s.c.dossier])), graineTirage, canaris: plantes, canarisManques, empreinte, empreinteAnnexe, doublonDe: null,
    note: 'CLÉ AVEUGLE : à ne jamais remettre à un juré ni placer dans le dossier du paquet.' };
  fs.mkdirSync(path.dirname(cleFichier), { recursive: true }); fs.writeFileSync(cleFichier, JSON.stringify(cle, null, 2) + '\n', { flag: 'wx' });
  return { code, racine, cleFichier, sequences: seqs.length, fichiers: S.fichiers.length, canaris: plantes.length, canarisManques, empreinte };
}
function lireRegles(dossier, manifest) {
  const c = manifest.cas.find(x => x.dossier);
  try { return gunzipJSON(path.join(dossier, c.dossier, 'brut.json.gz')).regles ?? null; } catch { return null; }
}
/* Passe 1 : seulement ce qui désigne l'instant (numéro de vague, repère de la carte). Causes de mort, préavis,
   coûts d'image et flashs sont des chiffres : ils vont dans l'annexe, remise après la note 1. */
function detailPublic(it) {
  const garde = {}; for (const k of ['n', 'tFichier', 'morceau']) if (it[k] !== undefined) garde[k] = it[k];
  return garde;
}
function detailAnnexe(it) {
  const { famille, categorie, rang, w, avant, apres, ...reste } = it;
  return { categorie, rang: rang ?? null, w, ...reste };
}
function ficheNeutre(s, c, data, mesures) {
  const lignes = (c.moments || []).map(m => `| ${m.nom} | ${m.w.toFixed(3)} | ${m.t} | ${m.etat} |`).join('\n');
  return `# Séquence ${s.id}\n\nProfil ${c.profil} ; pilote ${c.pilote} ; genre ${c.genre}${c.qui ? ' (visite d’aventure au pilote dieu, invulnérabilité principale, sans saut)' : ''}.\n\nDurée réelle ${data.duree.toFixed(3)} s_reel ; temps de jeu ${data.final?.tempsJeu ?? '?'} s_jeu ; arrêt : ${data.raison} ; état final : ${data.final?.etat ?? '?'}.\n\n| Moment observé | s_reel | s_jeu | État |\n|---|---:|---:|---|\n${lignes}\n\nAbsents de cette séquence : ${(mesures.manques || []).join(', ') || 'aucun'}.\n\nLes vidéos sont muettes. Les planches contiennent les pixels exacts du tampon ; l’ordre et les temps de leurs cases sont dans le JSON homonyme. Aucune note n’est attribuée ici.\n`;
}

/* Même paquet, noms mélangés : séquences renumérotées dans un autre ordre, nouveau code. Sert à mesurer la stabilité d'un juré. */
export function doublon({ code, sortie: dirSortie, cles, nouveauCode, graineTirage }) {
  const dirP = dirSortie || DOSSIER_PAQUETS, dirC = cles || DOSSIER_CLES, src = path.join(dirP, code), cleSrc = lireJSON(path.join(dirC, code + '.json'));
  const nc = nouveauCode || 'J-' + crypto.randomBytes(4).toString('hex'), dst = path.join(dirP, nc), rng = prng(hashTexte(graineTirage || crypto.randomBytes(16).toString('hex')));
  if (fs.existsSync(dst)) throw Error('Paquet déjà présent : ' + nc);
  const ids = Object.keys(cleSrc.ordre), perm = melanger(ids, rng), map = Object.fromEntries(ids.map((id, i) => [id, perm[i]]));
  const renomme = t => t.replace(/\bS(\d\d)\b/g, (m) => map[m] ?? m);
  const fichiers = []; let racines = [];
  const parcours = d => { for (const n of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, n.name); if (n.isDirectory()) parcours(p); else racines.push(path.relative(src, p)); } };
  parcours(src);
  for (const rel of racines) {
    const nouv = renomme(rel), buf = fs.readFileSync(path.join(src, rel)), ext = path.extname(rel);
    const out = ['.json', '.md'].includes(ext) ? Buffer.from(renomme(buf.toString('utf8')).replaceAll(code, nc)) : buf;
    fs.mkdirSync(path.dirname(path.join(dst, nouv)), { recursive: true }); fs.writeFileSync(path.join(dst, nouv), out);
    if (nouv !== 'paquet.json') fichiers.push({ chemin: nouv, sha256: sha(out), octets: out.length });
  }
  const pq = lireJSON(path.join(dst, 'paquet.json')), cats = Object.fromEntries(pq.fichiers.map(f => [renomme(f.chemin), f.categorie]));
  pq.fichiers = fichiers.filter(f => f.chemin !== 'annexe/annexe.json').map(f => ({ ...f, categorie: cats[f.chemin] ?? 'regle' }));
  pq.empreinte = sha(pq.fichiers.filter(f => f.categorie !== 'annexe').map(f => f.chemin + '\t' + f.sha256).sort().join('\n'));
  pq.empreinteAnnexe = sha(fichiers.find(f => f.chemin === 'annexe/annexe.json').sha256); pq.code = nc; pq.sequences.sort((a, b) => a.id.localeCompare(b.id));
  fs.writeFileSync(path.join(dst, 'paquet.json'), JSON.stringify(pq, null, 2) + '\n');
  const cle = { ...cleSrc, code: nc, doublonDe: code, ordre: Object.fromEntries(Object.entries(cleSrc.ordre).map(([id, d]) => [map[id], d])), dateParis: paris(), empreinte: pq.empreinte, empreinteAnnexe: pq.empreinteAnnexe,
    canaris: cleSrc.canaris.map(x => ({ ...x, fichier: x.fichier && renomme(x.fichier), fichierJson: x.fichierJson && renomme(x.fichierJson), champ: x.champ && renomme(x.champ) })) };
  fs.writeFileSync(path.join(dirC, nc + '.json'), JSON.stringify(cle, null, 2) + '\n', { flag: 'wx' });
  return { code: nc, doublonDe: code, correspondance: map };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), cmd = a[0], arg = (k, d = null) => { const i = a.indexOf(k); return i < 0 ? d : a[i + 1]; };
  if (cmd === 'paquet') console.log(JSON.stringify(await construirePaquet({ dossier: arg('--dossier'), role: arg('--role'), validation: arg('--validation') }), null, 2));
  else if (cmd === 'doublon') console.log(JSON.stringify(doublon({ code: arg('--code') }), null, 2));
  else console.log('node tools/jury2/jure.mjs paquet --dossier dossiers/<serie>-<id> --role ' + ROLES.join('|') + ' [--validation fichier]\nnode tools/jury2/jure.mjs doublon --code J-xxxxxxxx');
}
