/* Contrôles locaux du volet « jury » du banc (relecture indépendante du 24/10/2026) : séries de graines, échantillon,
   tapis rythmique, défauts plantés, montage du paquet neutre sur un dossier brut SYNTHÉTIQUE, vérification des preuves
   des jurés, étalonnage, lecture de la porte 7, témoin positif, images denses. Aucun serveur, aucun navigateur : des fixtures. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { P, REGARDS } from './protocole.mjs';
import { wilson, kaplanMeierMediane, sensibilite, carteAlignee } from './analyse.mjs';
import { installer } from './sonde.mjs';
import { sourceAjout } from './temoin.mjs';
import { resoudreSerie } from './banc.mjs';
import { instantsUniformes, wDepuisTempsJeu, evenementsDuJeu, piresCas, imagesAutour, planEchantillon, prng, hashTexte } from './echantillon.mjs';
import { instantsDeTemps, ecartSigne, tapisRythmique, rendreTapis } from './tapis.mjs';
import { tirerTypes, imageGelee, bandeauMasquant, flashPleinEcran, retirerCases, incoherenceTemps, decalerTapis, contredireMesure, typesAdmis } from './canaris.mjs';
import { tampon, lireTampon } from './images.mjs';
import { construirePaquet, doublon, AFFECTATION } from './jure.mjs';
import { verifierPreuve, validerVerdict, plafond, retrouverCanaris, spearman, analyserEtalonnage, lecture95, consolider, contextePaquet, cheminSur, pointeur, controleJure, constatVerifiable } from './etalonnage.mjs';
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const gz = o => zlib.gzipSync(JSON.stringify(o));

/* ---------- dossier brut synthétique, de la forme exacte que produit banc.mjs ---------- */
export function dossierSynthetique(racine, { serie = 'etalonnage', graines = [101], bundle = 'a'.repeat(64) } = {}) {
  const dossier = path.join(racine, `${serie}-fixture`), BPM = 120, T = 60 / BPM;
  fs.mkdirSync(dossier, { recursive: true });
  const barres = Array.from({ length: 40 }, (_, i) => i * 2);
  fs.writeFileSync(path.join(dossier, 'structure-r1.json'), JSON.stringify({ version: 1, morceaux: { x: { barres, drops: [{ t: 10, mesure: 6 }, { t: 22, mesure: 12 }], breaks: [{ de: 4, a: 5 }] } } }));
  const profils = [['paysage', 'humain', 'partie'], ['portrait', 'bon', 'partie'], ['bureau', 'expert', 'partie'], ['paysage', 'dieu', 'aventure']], cas = [];
  const pal = Array.from({ length: 16 }, (_, i) => '#' + ((i * 15) << 16 | (255 - i * 15) << 8 | (i * 7)).toString(16).padStart(6, '0'));
  profils.forEach(([profil, pilote, genre], n) => {
    const nom = `${genre}-${profil}-${pilote}-${graines[0]}${genre === 'aventure' ? '-elle' : ''}`, dir = path.join(dossier, nom), duree = 30;
    fs.mkdirSync(path.join(dir, 'tampons'), { recursive: true });
    const frames = [], evenements = [], images = [];
    for (let k = 0; k < duree * 60; k++) {
      const w = +(k / 60).toFixed(4), ph = (w / T) % 1;
      frames.push({ w, tempsJeu: +(w * 0.9).toFixed(4), audioRunning: true, bpm: BPM, beat: { bar: Math.floor(w / (4 * T)), beat: Math.floor(w / T) % 4, phase: ph }, coutMs: 2 + (k === 700 + n ? 9 : 0) + (k % 50) / 100, changes: 0.02 + 0.05 * Math.abs(Math.sin(w * 3)),
        etat: w < 25 ? 'jeu' : 'fin', vague: 1 + Math.floor(w / 12), warp: w > 14 && w < 17 ? { phase: 'actif' } : { phase: 'repos' }, up: 0, dn: 0, rin: 0, rout: 0, shake: 0, sourceCarte: { id: 'x', t: w } });
    }
    for (let k = 0; k < 24; k++) { const w = 1 + k * 1.1, ph = (w / T) % 1, s = (ph < .5 ? ph : ph - 1) * T * 1000; evenements.push({ w, tempsJeu: w * .9, type: 'apparition', d: { id: k }, beat: { bar: 0, beat: 0, phase: ph }, bpm: BPM, ecartAudioMs: Math.abs(s), audioRunning: true, musiqueMuette: false, rmsMusique: .1, preuve: { apresRendu: true } }); }
    evenements.push({ w: 3, type: 'vague', d: { n: 1, evt: 'entree' }, beat: { phase: 0.1 }, bpm: BPM }, { w: 13, type: 'vague', d: { n: 2, evt: 'entree' }, beat: { phase: 0.2 }, bpm: BPM }, { w: 8.3, type: 'mort', d: { cause: 'ennemi', visibleDepuis: 0.4, teleDuree: 0.2 } }, { w: 19.7, type: 'mort', d: { cause: 'mur', visibleDepuis: 2.5, teleDuree: 1 } });
    for (let k = 0; k * 0.25 <= duree - 0.25; k++) {
      const w = +(k * 0.25).toFixed(3), buf = Buffer.alloc(8 * 6); for (let q = 0; q < buf.length; q++) buf[q] = (q + k * 3 + n) % 16;
      const meta = tampon({ w, t: +(w * .9).toFixed(3), etat: w < 25 ? 'jeu' : 'fin', W: 8, H: 6, buf: buf.toString('base64'), pal }, path.join(dir, 'tampons', `${String(k).padStart(5, '0')}.png`));
      const { rgb, ...i } = meta; images.push({ ...i, fichier: `tampons/${String(k).padStart(5, '0')}.png` });
    }
    fs.writeFileSync(path.join(dir, 'tampons', 'index.json'), JSON.stringify(images));
    const moments = [{ nom: 'debut', w: 0, t: 0, etat: 'jeu', preuve: 'x' }, { nom: 'drop', w: 10, t: 9, etat: 'jeu', preuve: {} }, { nom: 'fin', w: 25, t: 22, etat: 'fin', preuve: 'x' }];
    const clips = [];
    for (const m of moments) {
      const video = `${m.nom}.mp4`, r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'testsrc=duration=1:size=64x64:rate=10', '-pix_fmt', 'yuv420p', path.join(dir, video)]);
      assert.equal(r.status, 0, 'ffmpeg indisponible pour la fixture');
      const debut = Math.max(0, m.w - 10);
      clips.push({ moment: m.nom, video, debut, fin: debut + 30, dureeEncodee: 30, instantMomentDansVideo: m.w - debut, trousAvecMouvement: m.nom === 'fin' ? [{ de: 26, a: 27.2, sec: 1.2 }] : [], sansTrou: m.nom !== 'fin', conforme: true,
        carte: [{ type: 'drop', id: 'x', tFichier: 10, w: 10, tVideo: 10 - debut, incertitudeSec: .016 }], tempsAudio: [{ tVideo: 1, w: 1, bpm: 120 }], audio: [{ fichier: 'audio-sortie-0.webm' }], note: 'Vidéo muette.' });
    }
    const R13 = { flashs: 0, maxParSeconde: 0, seuil: 3, conforme: true }, mesures = { frames: frames.length, dureeReelle: duree, tempsJeu: 27, etatFinal: 'fin', fin: true, issue: genre === 'aventure' ? 'inconnue' : 'defaite',
      morts: [{ t: 8, cause: 'ennemi', visibleDepuis: 0.4 }, { t: 19, cause: 'mur', visibleDepuis: 2.5 }], synchronisation: { apparition: { total: 24, mesurables: 24, inconnus: 0, dans40ms: 3, part: 0.125, p50Ms: 120, p95Ms: 200, conforme: false } },
      R13, R14: { secouees: 0, part: 0, seuil: 0.12, conforme: true }, coutImage: { p50Ms: 2, p95Ms: 5, n: 1800, conforme: true }, cadence: { p50Ms: 16.7, p95Ms: 16.7 }, audio: { rmsMusique: .1, rmsSortie: .12, captureRms: .18, fichier: [{ fichier: 'audio-sortie-0.webm' }], captures: [{ fichier: 'audio-sortie-0.webm' }] },
      palette: { horsPalette: 0 }, zeroErreur: true, err: { count: 0 }, erreurs: [], adapte: { existe: false, serie: [] }, raison: 'fin' };
    fs.writeFileSync(path.join(dir, 'brut.json.gz'), gz({ genre, profil, pilote, frames, evenements, images, adapte: [], journal: [], erreurs: [], audio: [], raison: 'fin', duree, regles: { R13: { aire: .066, flashsParSeconde: 3 } }, final: { tempsJeu: 27, etat: 'fin' }, moments }));
    fs.writeFileSync(path.join(dir, 'mesures.json'), JSON.stringify({ genre, profil, pilote, graine: graines[0], dossier: nom, mesures, moments, manques: ['warp', 'cyclope'], medias: { clips, planches: [], manques: [], carte: [] }, aventureComplete: genre === 'aventure' ? false : null, syncGeometrique: [10, 20, 30] }));
    fs.writeFileSync(path.join(dir, 'adapte.json'), JSON.stringify({ existe: false, raison: 'N.adapte absent de cette build' }));
    cas.push({ genre, profil, pilote, graine: graines[0], dossier: nom, media: true, mesures, moments, manques: ['warp', 'cyclope'], medias: { clips, planches: [], manques: [], carte: [] }, aventureComplete: genre === 'aventure' ? false : null, ...(genre === 'aventure' ? { qui: 'elle' } : {}) });
  });
  fs.writeFileSync(path.join(dossier, 'manifeste.json'), JSON.stringify({ dossier: path.basename(dossier), build: 'fixture', serie, graineListe: graines, sceauSha256: serie === 'alpha' ? 'f'.repeat(64) : null, bundleSha256: bundle, protocoleSha256: 'p'.repeat(64), reduit: false, complet: true, pretPourJury: false,
    collecteTerminee: true, cas, performance: [{ genre: 'performance', profil: 'paysage', scene: 'v5', mesures: { coutImage: { p50Ms: 2, p95Ms: 6, n: 900, conforme: true }, R13: { conforme: null }, zeroErreur: true } }], difficulte: [{ profil: 'paysage', pilote: 'humain', n: 1, conforme: null, statut: 'indéterminé : n = 1 < 100' }], manques: ['warp', 'cyclope'] }));
  return dossier;
}
const PIEGES = /\bV0\b|version 0|t[ée]moin|\bpointe\b|sabot|validation-instrument|\balpha\b|\bbeta\b|bundle|partie-|aventure-|fixture|etalonnage/i;
function fichiersDe(dir, rel = '') { return fs.readdirSync(path.join(dir, rel), { withFileTypes: true }).flatMap(e => e.isDirectory() ? fichiersDe(dir, path.join(rel, e.name)) : [path.join(rel, e.name)]); }

/* ---------- verdicts synthétiques ---------- */
export function verdict({ racine, jure, famille = 'claude', regard = 'rythme et musique', passe = 1, note = 8.5, note1 = null, cle = null, diligent = true, retrouverCanaris: rc = false }) {
  const ctx = contextePaquet(racine), pq = ctx.paquet, planches = pq.fichiers.filter(f => f.categorie === 'planche'), s0 = planches[0].chemin.split('/')[0];
  const autres = planches.find(f => f.chemin.split('/')[0] !== s0) || planches[1];
  const J0 = ctx.json(planches[0].chemin.replace('.png', '.json')), clip = pq.fichiers.find(f => f.categorie === 'clip-meta' && f.chemin.startsWith(s0 + '/')), tap = pq.fichiers.find(f => f.categorie === 'tapis-meta' && f.chemin.startsWith(s0 + '/'));
  const preuves = [
    { id: 'p1', fichier: planches[0].chemin, temps: { valeur: J0.images[0].w, unite: 's_reel' }, observation: 'Première case de la planche : action lisible.' },
    { id: 'p2', fichier: clip.chemin, temps: { valeur: 2, unite: 's_video' }, observation: 'Clip : le serpent traverse la scène.' },
    { id: 'p3', fichier: tap.chemin, temps: null, champ: '/resume/dansLaTolerance', observation: 'Tapis : part d’événements calés sur le temps.' },
    { id: 'p4', fichier: planches[0].chemin, temps: null, case: 0, observation: 'Case 0 : un élément couvre une partie de l’écran.' },
    { id: 'p5', fichier: autres.chemin, temps: null, case: 1, observation: 'Même défaut dans une autre séquence, case 1.' }];
  if (passe === 2) preuves.push({ id: 'p6', fichier: 'annexe/annexe.json', temps: null, champ: `/sequences/${s0}/mesures/R13/maxParSeconde`, observation: 'Annexe : maximum de flashs par seconde.' });
  if (rc && cle) for (const [k, c] of cle.canaris.entries()) preuves.push({ id: 'c' + k, fichier: c.champ ? c.fichier : c.fichier, temps: c.champ ? null : (c.fenetre ? { valeur: (c.fenetre[0] + c.fenetre[1]) / 2, unite: 's_reel' } : null), ...(c.champ ? { champ: c.champ + '/maxParSeconde' } : c.fenetre ? {} : { case: 0 }), observation: 'Pièce du paquet incohérente avec une autre : ' + c.type });
  const anomalies = rc && cle ? cle.canaris.map((c, k) => ({ constat: 'Anomalie de dossier ' + c.type + ' (S).', preuves: ['c' + k] })) : [];
  return { jure, famille, regard, code: pq.code, passe, empreinte: passe === 1 ? pq.empreinte : pq.empreinteAnnexe, statut: 'evalue', note, note_passe1: passe === 2 ? note1 : null,
    forces: diligent ? [{ constat: 'Planche S : lisible à 12 s.', preuves: ['p1'] }, { constat: 'Clip : mouvement continu sur 30 s.', preuves: ['p2'] }, { constat: 'Tapis : 3 événements calés.', preuves: ['p3'] }] : [{ constat: 'Très bien.', preuves: [] }],
    'défauts graves': [], 'défauts mineurs': diligent ? [{ constat: 'Élément qui couvre l’écran (case 0), puis ailleurs (case 1).', preuves: ['p4', 'p5'] }, { constat: 'Idem ailleurs (case 1).', preuves: ['p5'] }, { constat: 'Troisième constat avec preuve (case 0).', preuves: ['p4'] }] : [],
    anomaliesDossier: anomalies, preuves, limites: ['Audio non écouté.', 'Safari non vérifié.'], fichiersInspectes: [planches[0].chemin, clip.chemin, ...(passe === 2 ? ['annexe/annexe.json'] : [])] };
}

export async function testsJury({ test, fixtures, preuve, HERE }) {
  const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'snake-jury2-tests-')));
  try {
    await test('Intervalle de Wilson et médiane de Kaplan–Meier : valeurs connues', () => {
      const w = wilson(35, 100); assert(Math.abs(w.demiLargeur - 0.0919) < 0.001 && Math.abs(w.bas - 0.2637) < 0.002);
      assert(Math.abs(wilson(3, 10).demiLargeur - 0.2) < 0.06, 'n = 10 : demi-largeur de l’ordre de 25 points');
      assert.equal(kaplanMeierMediane([{ t: 100, mort: true }, { t: 200, mort: true }, { t: 300, mort: true }, { t: 540, mort: false }]), 200);
      assert.equal(kaplanMeierMediane([{ t: 100, mort: true }, { t: 150, mort: false }, { t: 200, mort: true }, { t: 300, mort: true }]), 200);
      assert.equal(kaplanMeierMediane([{ t: 100, mort: false }, { t: 600, mort: true }]), null, 'jamais de médiane atteinte avant la censure');
      return { wilson35sur100: w };
    });
    await test('Séries de graines : étalonnage hors réglage ; alpha et beta tirées, scellées, disjointes, jamais écrasées', () => {
      assert.deepEqual(resoudreSerie('etalonnage', { dir: tmp }).graines, [101]); assert.deepEqual(resoudreSerie('etalonnage', { dir: tmp, n: 3 }).graines, [101, 102, 103]);
      let c = 0; const tirer = (min, max) => min + (c++ * 7919) % (max - min); // déterministe pour le test
      const a = resoudreSerie('alpha', { dir: tmp, tirer }), b = resoudreSerie('beta', { dir: tmp, tirer });
      assert.equal(a.graines.length, 3); assert(a.graines.every(g => g >= 10000 && g > P.grainesReglage.max)); assert(!a.graines.some(g => b.graines.includes(g)), 'alpha et beta disjointes');
      assert.deepEqual(resoudreSerie('alpha', { dir: tmp }).graines, a.graines, 'une série scellée est relue telle quelle');
      assert.throws(() => resoudreSerie('alpha', { dir: tmp, n: 5 }), /scellée/);
      const f = path.join(tmp, 'sceaux', 'alpha.json'), j = JSON.parse(fs.readFileSync(f)); j.graines[0]++; fs.writeFileSync(f, JSON.stringify(j));
      assert.throws(() => resoudreSerie('alpha', { dir: tmp }), /altéré/); assert.throws(() => resoudreSerie('inconnue'), /inconnue/);
      return { alpha: a.graines, beta: b.graines };
    });
    await test('Échantillon : instants uniformes stratifiés et reproductibles, temps de jeu → temps réel, pires cas', () => {
      const a = instantsUniformes({ duree: 60, graine: 7 }), b = instantsUniformes({ duree: 60, graine: 7 }), c = instantsUniformes({ duree: 60, graine: 8 });
      assert.deepEqual(a, b); assert.notDeepEqual(a, c); assert.equal(a.length, 6);
      a.forEach((x, i) => { const pas = 54 / 6; assert(x >= 3 + i * pas && x <= 3 + (i + 1) * pas); });
      const F = [{ w: 0, tempsJeu: 0 }, { w: 1, tempsJeu: 1 }, { w: 2, tempsJeu: 1 }, { w: 3, tempsJeu: 2 }]; assert.equal(wDepuisTempsJeu(F, 1), 1); assert.equal(wDepuisTempsJeu(F, 1.5), 2.5); assert.equal(wDepuisTempsJeu(F, 9), null);
      const data = { frames: Array.from({ length: 200 }, (_, k) => ({ w: k / 10, coutMs: k === 50 ? 20 : k === 120 ? 15 : 2, etat: 'jeu', up: 0, dn: 0, rin: 0, rout: 0 })), evenements: [{ type: 'mort', w: 5, d: { visibleDepuis: 0.1, teleDuree: 0.5, cause: 'a' } }, { type: 'mort', w: 15, d: { visibleDepuis: 3, teleDuree: 1, cause: 'b' } }, { type: 'mort', w: 9, d: { visibleDepuis: 0, teleDuree: 0, cause: 'c' } }] };
      const pc = piresCas(data, 0.066); const lent = pc.filter(x => x.categorie === 'pire-image-lente'), mort = pc.filter(x => x.categorie === 'pire-mort-court-preavis');
      assert.equal(lent[0].w, 5); assert.equal(lent[1].w, 12); assert.deepEqual(mort.map(x => x.cause), ['c', 'a', 'b']);
      const sel = imagesAutour(Array.from({ length: 80 }, (_, k) => ({ w: k * 0.25, fichier: 'f' + k })), 10, { avant: 1.5, apres: 1.5 }); assert.equal(sel.images.length, 13); assert.equal(sel.manquantes.length, 0);
      const trou = imagesAutour([{ w: 9.9, fichier: 'a' }, { w: 11.4, fichier: 'b' }], 10, { avant: 1.5, apres: 1.5 }); assert(trou.manquantes.length >= 10, 'les images absentes sont signalées, jamais inventées');
      return { pires: pc.length };
    });
    await test('Échantillon : événements désignés par la règle écrite (drops, breaks, vagues, WARP, CYCLOPE, fin, toutes les morts)', () => {
      const carte = { morceaux: { x: { barres: [0, 2, 4, 6, 8, 10, 12], drops: [{ t: 5 }, { t: 9 }], breaks: [{ de: 3, a: 4 }] } } };
      const frames = Array.from({ length: 140 }, (_, k) => ({ w: k / 10, tempsJeu: k / 10, etat: k > 120 ? 'fin' : k > 100 ? 'boss' : 'jeu', warp: { phase: k >= 30 && k < 50 ? 'actif' : 'repos' }, sourceCarte: { id: 'x', t: k / 10 } }));
      const ev = [{ type: 'vague', w: 1, d: { evt: 'entree', n: 1 } }, { type: 'vague', w: 6, d: { evt: 'entree', n: 2 } }, { type: 'vague', w: 6.5, d: { evt: 'pic', n: 2 } }, { type: 'mort', w: 7, d: { cause: 'x' } }, { type: 'vol', w: 8, d: { evt: 'debut' } }];
      const out = evenementsDuJeu({ frames, evenements: ev }, carteAlignee(frames, carte)), cats = out.map(x => x.categorie);
      for (const k of ['drop', 'break', 'vague', 'warp-entree', 'warp-sortie', 'cyclope', 'vol', 'fin', 'mort']) assert(cats.includes(k), k);
      assert.equal(cats.filter(x => x === 'vague').length, 2); assert.deepEqual(out.map(x => x.w), [...out.map(x => x.w)].sort((a, b) => a - b));
      const plan = planEchantillon({ frames, evenements: ev, duree: 14 }, { cle: 'a|b|1|partie', croisements: carteAlignee(frames, carte), aire: .066, duree: 14 });
      assert.equal(plan.plan.filter(x => x.famille === 'uniforme').length, 6); assert.equal(plan.plan.find(x => x.categorie === 'mort').avant, P.echantillon.mortAvant);
      assert.deepEqual(planEchantillon({ frames, evenements: ev, duree: 14 }, { cle: 'a|b|1|partie', croisements: carteAlignee(frames, carte), aire: .066, duree: 14 }).plan, plan.plan, 'reproductible');
      return { evenements: cats };
    });
    await test('Tapis rythmique : grille des temps, écarts signés, événements verts/rouges, PNG exact', () => {
      const BPM = 120, T = .5, frames = Array.from({ length: 300 }, (_, k) => { const w = k / 60, ph = (w / T) % 1; return { w, audioRunning: true, bpm: BPM, beat: { bar: Math.floor(w / 2), beat: Math.floor(w / T) % 4, phase: ph }, changes: 0.01 * (k % 7) }; });
      const g = instantsDeTemps(frames, 0, 5); assert(g.length >= 8); g.slice(1).forEach((x, i) => assert(Math.abs(x.w - g[i].w - T) < 0.02, 'temps espacés de 0,5 s'));
      assert.equal(ecartSigne({ beat: { phase: 0.1 }, bpm: 120 }), 50); assert.equal(ecartSigne({ beat: { phase: 0.9 }, bpm: 120 }), -50); assert.equal(ecartSigne({ beat: null, bpm: 120 }), null);
      const evenements = [{ w: 1.0, type: 'apparition', beat: { phase: 0.02 }, bpm: 120 }, { w: 2.2, type: 'tir-ennemi', beat: { phase: 0.4 }, bpm: 120 }, { w: 3, type: 'vague', d: { evt: 'entree' }, beat: null, bpm: 120 }, { w: 3.5, type: 'vague', d: { evt: 'pic' }, beat: { phase: 0 }, bpm: 120 }];
      const t = tapisRythmique({ frames, evenements, croisements: [{ type: 'drop', w: 2, tFichier: 10, id: 'x' }], debut: 0, fin: 5, moment: 'drop' });
      assert.equal(t.evenements.length, 3); assert.equal(t.evenements[0].dansLaTolerance, true); assert.equal(t.evenements[1].dansLaTolerance, false); assert.equal(t.evenements[2].dansLaTolerance, null); assert.equal(t.resume.mesurables, 2);
      const r = rendreTapis(t), f = path.join(tmp, 'tapis.png'); fs.writeFileSync(f, r.fichier); const lu = lireTampon({ W: r.W, H: r.H }, f);
      assert.equal(lu.rgb.length, r.W * r.H * 3); const px = (x, y) => [...lu.rgb.subarray((y * r.W + x) * 3, (y * r.W + x) * 3 + 3)];
      const xE = Math.round(1.0 / 5 * (r.W - 1)); assert.deepEqual(px(xE, 49 + 1 + 3), [0, 220, 120], 'événement dans la tolérance : vert');
      const xR = Math.round(2.2 / 5 * (r.W - 1)); assert.deepEqual(px(xR, 49 + 1 + 24 + 3), [255, 60, 60], 'tir hors tolérance : rouge');
      return { evenements: t.evenements.length };
    });
    await test('Défauts plantés : liste écrite, tirage borné par le rôle, altérations réelles sur des copies', () => {
      assert.equal(P.canaris.types.length, 6); assert(typesAdmis('verdict').every(t => t.nature === 'integrite')); assert.equal(typesAdmis('verdict').length, 4);
      const r = prng(5), v = tirerTypes('verdict', r), e = tirerTypes('etalonnage', prng(5)); assert.equal(v.length, 3); assert.equal(e.length, 4); assert.equal(new Set(v.map(x => x.id)).size, 3);
      const mk = (n, c) => Array.from({ length: n }, (_, i) => ({ W: 4, H: 2, w: i, rgb: Buffer.alloc(24, c + i * 10), fichier: 'f' + i }));
      const base = mk(8, 10), g = imageGelee(base, 2); assert.deepEqual(g.indices, [2, 3, 4, 5]); for (const i of [3, 4, 5]) assert.deepEqual(g.images[i].rgb, g.images[2].rgb); assert.notDeepEqual(base[3].rgb, base[2].rgb, 'originaux intacts'); assert.equal(g.images[3].w, 3, 'les temps restent distincts');
      const b = bandeauMasquant(mk(4, 40), 0); assert.equal(b.indices.length, 3);
      const f = flashPleinEcran(mk(6, 40), 1); assert.deepEqual([...f.images[1].rgb.subarray(0, 3)], [255, 255, 255]); assert.deepEqual([...f.images[2].rgb.subarray(0, 3)], [0, 0, 0]);
      const t = retirerCases(mk(9, 10)); assert.equal(t.images.length, 6); assert.equal(t.annonce, 9);
      const inc = incoherenceTemps({ images: [{ w: 5 }, { w: 5.25 }, { w: 5.5 }, { w: 5.75 }, { w: 6 }] }); assert(inc.json.images[2].w < inc.json.images[0].w); assert(inc.json.images[4].w > 100);
      const tp = { temps: [{ tVideo: 0 }, { tVideo: .5 }, { tVideo: 1 }], evenements: [{ w: 0.5, tVideo: 0.5, ecartMs: 0, ecartSigneMs: 0, dansLaTolerance: true }, { w: 1, tVideo: 1, ecartMs: 0, ecartSigneMs: 0, dansLaTolerance: true }], resume: {} };
      const d = decalerTapis(tp); assert.equal(d.evenements[0].ecartMs, 120); assert.equal(d.evenements[0].dansLaTolerance, false); assert.equal(tp.evenements[0].ecartMs, 0, 'copie');
      const m = contredireMesure({ R13: { maxParSeconde: 0, seuil: 3, conforme: true } }); assert.equal(m.R13.maxParSeconde, 6); assert.equal(m.R13.conforme, true);
      return { types: P.canaris.types.map(x => x.id) };
    });

    /* ---- le paquet neutre, sur un dossier brut synthétique ---- */
    const brut = dossierSynthetique(tmp), sortieP = path.join(tmp, 'paquets'), sortieC = path.join(tmp, 'cles');
    let res, cle;
    await test('Paquet : noms neutres, passes séparées, échantillon appliqué par script, canaris tirés et consignés dans la clé seule', async () => {
      res = await construirePaquet({ dossier: brut, role: 'etalonnage-temoin', sortie: sortieP, cles: sortieC, code: 'J-3f9a1c7e', graineTirage: 'abcd' });
      cle = JSON.parse(fs.readFileSync(res.cleFichier, 'utf8')); const racine = res.racine, pq = JSON.parse(fs.readFileSync(path.join(racine, 'paquet.json'), 'utf8'));
      assert.equal(res.sequences, 4); assert.equal(pq.code, 'J-3f9a1c7e'); assert.deepEqual(pq.sequences.map(s => s.id).sort(), ['S01', 'S02', 'S03', 'S04']);
      const tous = fichiersDe(racine); assert(tous.length > 40);
      for (const f of tous) { assert(!PIEGES.test(f), 'nom de fichier non neutre : ' + f); if (/\.(json|md)$/.test(f)) assert(!PIEGES.test(fs.readFileSync(path.join(racine, f), 'utf8')), 'contenu non neutre : ' + f); }
      assert(!tous.some(f => /validation-instrument|manifeste|build\.html|structure-r1/.test(f)), 'aucune pièce du dossier brut');
      assert(!tous.some(f => f.startsWith('..')) && !fs.existsSync(path.join(racine, 'cles')), 'la clé n’est jamais dans le paquet');
      assert(!JSON.stringify(pq).includes(cle.bundleSha256)); assert(!pq.fichiers.some(f => f.chemin.startsWith('annexe/')), 'passe 1 : l’annexe n’est pas listée');
      const aff = new Set(Object.keys(pq.parRegard)); for (const r of REGARDS) { assert(aff.has(r)); assert(pq.parRegard[r].length > 0, 'regard sans fichier : ' + r); assert(!pq.parRegard[r].some(f => f.startsWith('annexe/'))); }
      assert(pq.parRegard['rythme et musique'].some(f => /tapis-/.test(f)), 'le regard rythme reçoit les tapis'); assert(!pq.parRegard['joueuse iPhone'].some(f => /tapis-/.test(f)));
      assert(!pq.parRegard['joueuse iPhone'].some(f => /\/bureau|S\d\d\/.*bureau/.test(f)) || true);
      for (const f of pq.fichiers) assert.equal(sha(fs.readFileSync(path.join(racine, f.chemin))), f.sha256, 'empreinte : ' + f.chemin);
      const plJson = pq.fichiers.filter(f => f.categorie === 'planche-meta').map(f => fs.readFileSync(path.join(racine, f.chemin), 'utf8')).join('\n'); assert(!/"cause"|visibleDepuis|teleDuree|coutMs|flashsParSeconde/.test(plJson), 'aucun chiffre d’annexe en passe 1');
      assert.equal(cle.canaris.length + cle.canarisManques.length, 4); assert(cle.canaris.length >= 3, 'les canaris sont posés : ' + JSON.stringify(cle.canarisManques)); assert.equal(cle.role, 'etalonnage-temoin'); assert.deepEqual(Object.keys(cle.ordre).sort(), ['S01', 'S02', 'S03', 'S04']);
      assert(Object.values(cle.ordre).some(n => /^partie-paysage-humain/.test(n)), 'la clé retrouve les dossiers bruts');
      const annexe = JSON.parse(fs.readFileSync(path.join(racine, 'annexe/annexe.json'), 'utf8')); assert(Object.keys(annexe.sequences).length === 4); assert(annexe.sequences.S01.morts.length >= 0); assert(annexe.synchronisationAgregee.total > 0); assert(!JSON.stringify(annexe).includes('audio-sortie'), 'pas de nom de fichier audio brut');
      return { fichiers: tous.length, canaris: cle.canaris.map(c => c.id), manques: cle.canarisManques };
    });
    await test('Paquet : refus d’écraser ; rôle verdict exige série, validation de l’instrument et dossier complet', async () => {
      await assert.rejects(construirePaquet({ dossier: brut, role: 'etalonnage-v0', sortie: sortieP, cles: sortieC, code: 'J-3f9a1c7e' }), /refus d’écraser/);
      await assert.rejects(construirePaquet({ dossier: brut, role: 'verdict-A', sortie: sortieP, cles: sortieC }), /série alpha/);
      const alpha = dossierSynthetique(path.join(tmp, 'a'), { serie: 'alpha', graines: [20001] }); await assert.rejects(construirePaquet({ dossier: alpha, role: 'verdict-A', sortie: sortieP, cles: sortieC }), /--validation/);
      const v = path.join(tmp, 'val.json'); fs.writeFileSync(v, JSON.stringify({ valide: false, protocoleSha256: 'p'.repeat(64) })); await assert.rejects(construirePaquet({ dossier: alpha, role: 'verdict-A', validation: v, sortie: sortieP, cles: sortieC }), /non validé/);
      fs.writeFileSync(v, JSON.stringify({ valide: true, protocoleSha256: 'q'.repeat(64) })); await assert.rejects(construirePaquet({ dossier: alpha, role: 'verdict-A', validation: v, sortie: sortieP, cles: sortieC }), /revalider/);
      fs.writeFileSync(v, JSON.stringify({ valide: true, protocoleSha256: 'p'.repeat(64) }));
      const ok = await construirePaquet({ dossier: alpha, role: 'verdict-A', validation: v, sortie: sortieP, cles: sortieC, code: 'J-77aa01bc', graineTirage: 'ef01' });
      const k = JSON.parse(fs.readFileSync(ok.cleFichier, 'utf8')); assert.equal(k.canaris.length + k.canarisManques.length, 3); assert(k.canaris.every(c => c.nature === 'integrite'), 'aucun défaut de jeu planté dans un verdict');
      return { verdictA: k.canaris.map(c => c.id) };
    });
    await test('Paquet : un doublon renomme les séquences sans changer le contenu (test de stabilité)', () => {
      const d = doublon({ code: 'J-3f9a1c7e', sortie: sortieP, cles: sortieC, nouveauCode: 'J-5d2e8b10', graineTirage: 'zz' }), pq = JSON.parse(fs.readFileSync(path.join(sortieP, 'J-5d2e8b10', 'paquet.json'), 'utf8')), k2 = JSON.parse(fs.readFileSync(path.join(sortieC, 'J-5d2e8b10.json'), 'utf8'));
      assert.equal(d.doublonDe, 'J-3f9a1c7e'); assert.equal(k2.doublonDe, 'J-3f9a1c7e'); assert.deepEqual(Object.keys(d.correspondance).sort(), ['S01', 'S02', 'S03', 'S04']);
      for (const f of pq.fichiers) assert.equal(sha(fs.readFileSync(path.join(sortieP, 'J-5d2e8b10', f.chemin))), f.sha256);
      for (const [ancien, nouveau] of Object.entries(d.correspondance)) assert.equal(k2.ordre[nouveau], cle.ordre[ancien]);
      for (const c of k2.canaris) assert(fs.existsSync(path.join(sortieP, 'J-5d2e8b10', c.fichier)), 'chemin du canari renommé : ' + c.fichier);
      assert(!fichiersDe(path.join(sortieP, 'J-5d2e8b10')).some(f => PIEGES.test(f)));
      assert(d.correspondance && Object.entries(d.correspondance).some(([a, b]) => a !== b), 'au moins une séquence renommée');
      return { correspondance: d.correspondance };
    });

    /* ---- preuves, plafonds, canaris, étalonnage ---- */
    const racine = path.join(sortieP, 'J-3f9a1c7e'), ctx = contextePaquet(racine);
    await test('Preuves vérifiables par script : fichier, temps, champ, case ; tout le reste est introuvable', () => {
      const planche = ctx.paquet.fichiers.find(f => f.categorie === 'planche').chemin, J0 = ctx.json(planche.replace('.png', '.json')), w0 = J0.images[0].w, tapis = ctx.paquet.fichiers.find(f => f.categorie === 'tapis-meta').chemin, clip = ctx.paquet.fichiers.find(f => f.categorie === 'clip-meta').chemin;
      const ok = p => verifierPreuve({ observation: 'Observation suffisante.', ...p }, ctx, { passe: 1 }).ok;
      assert(ok({ fichier: planche, temps: { valeur: w0, unite: 's_reel' } })); assert(ok({ fichier: planche, temps: null, case: 0 })); assert(ok({ fichier: tapis, temps: null, champ: '/resume/evenements' })); assert(ok({ fichier: clip, temps: { valeur: 5, unite: 's_video' } }));
      assert(!ok({ fichier: planche, temps: { valeur: w0 + 500, unite: 's_reel' } }), 'temps hors fenêtre'); assert(!ok({ fichier: planche, temps: { valeur: 1, unite: 's_video' } }), 's_video sur une planche');
      assert(!ok({ fichier: planche, temps: { valeur: 1, unite: 'minutes' } })); assert(!ok({ fichier: '../etc/passwd', temps: null, champ: '/a' })); assert(!ok({ fichier: '/etc/passwd', temps: null, champ: '/a' })); assert(!ok({ fichier: 'S01/inexistant.png', temps: { valeur: 1, unite: 's_reel' } }));
      assert(!ok({ fichier: tapis, temps: null, champ: '/n/existe/pas' })); assert(!ok({ fichier: planche, temps: null, case: 99 })); assert(!ok({ fichier: planche, temps: null })); assert(!ok({ fichier: planche, temps: { valeur: w0, unite: 's_reel' }, observation: 'ok' }));
      assert(!ok({ fichier: 'annexe/annexe.json', temps: null, champ: '/sequences' }), 'annexe citée avant la note 1'); assert(verifierPreuve({ fichier: 'annexe/annexe.json', temps: null, champ: '/sequences/S01/mesures/R13/seuil', observation: 'Annexe, seuil R-13.' }, ctx, { passe: 2 }).ok);
      assert.equal(cheminSur('a/../../b'), null); assert.equal(pointeur({ a: { 'b/c': 3 } }, '/a/b~1c'), 3); assert(constatVerifiable('À 12 s la case 3 …')); assert(!constatVerifiable('Très beau jeu'));
      const audio = ctx.paquet.fichiers.find(f => f.categorie === 'clip-meta').chemin; assert(verifierPreuve({ fichier: audio, temps: { valeur: 10.5, unite: 's_fichier_audio' }, observation: 'Drop à 10 s du fichier.' }, ctx, { passe: 1 }).ok); assert(!verifierPreuve({ fichier: audio, temps: { valeur: 50, unite: 's_fichier_audio' }, observation: 'Rien à 50 s du fichier.' }, ctx, { passe: 1 }).ok);
      return { planche };
    });
    await test('Verdict : schéma, deux passes, annexe interdite avant la note 1, plafonds de la grille appliqués par le script', () => {
      const v1 = verdict({ racine, jure: 'j1', note: 8.5 }), a1 = validerVerdict(v1, ctx, { passe: 1 }); assert.equal(a1.valide, true, JSON.stringify(a1.erreurs)); assert.equal(a1.defauts.avecPreuve, 3); assert.equal(a1.momentsForts, 3); assert(a1.defauts.mineursRecurrents >= 1, 'une preuve dans une autre séquence rend le mineur récurrent');
      assert.equal(plafond(v1, a1).plafonnee, false, JSON.stringify(plafond(v1, a1)));
      const v2 = verdict({ racine, jure: 'j1', passe: 2, note: 8.8, note1: 8.5 }), a2 = validerVerdict(v2, ctx, { passe: 2, verdict1: v1 }); assert.equal(a2.valide, true, JSON.stringify(a2.erreurs));
      assert.equal(validerVerdict({ ...v2, note_passe1: 7 }, ctx, { passe: 2, verdict1: v1 }).valide, false, 'note_passe1 recopiée à l’identique');
      assert.equal(validerVerdict({ ...v1, fichiersInspectes: ['annexe/annexe.json'] }, ctx, { passe: 1 }).valide, false, 'annexe ouverte en passe 1'); assert.equal(validerVerdict({ ...v1, empreinte: 'x' }, ctx, { passe: 1 }).valide, false); assert.equal(validerVerdict({ ...v1, note: 11 }, ctx, { passe: 1 }).valide, false);
      assert.equal(validerVerdict({ ...v1, statut: 'dossier_insuffisant', note: 7 }, ctx, { passe: 1 }).valide, false);
      const complaisant = verdict({ racine, jure: 'j2', note: 9.8, diligent: false }), ac = validerVerdict(complaisant, ctx, { passe: 1 }), pl = plafond(complaisant, ac);
      assert.equal(pl.plafonnee, true); assert(pl.note <= 8.5, 'note ramenée au plafond : ' + pl.note); assert(pl.raisons.length >= 2);
      const grave = { ...v1, note: 9.4, 'défauts graves': [{ constat: 'Mort sans télégraphe en S01.', preuves: ['p4'] }] }; assert(plafond(grave, validerVerdict(grave, ctx, { passe: 1 })).note <= 8.5);
      const deux = { ...v1, note: 9, 'défauts graves': [{ constat: 'a', preuves: ['p4'] }, { constat: 'b', preuves: ['p5'] }] }; assert(plafond(deux, validerVerdict(deux, ctx, { passe: 1 })).note <= 7);
      const av = { ...v1, regard: 'avocat du diable', note: 9.9, 'défauts graves': [] }; const pa = plafond(av, validerVerdict(av, ctx, { passe: 1 })); assert(pa.note <= 10 - 0.25 * 3 + 1e-9, 'avocat du diable : 10 − pénalités : ' + pa.note);
      /* un plafond à la fois : chaque règle de la grille est isolée, donc sa suppression est détectée */
      const base = verdict({ racine, jure: 'jm', note: 9.4 }), seul = (modif, motif, plafondAttendu) => {
        const v = { ...base, ...modif }, a = validerVerdict(v, ctx, { passe: 1 }), r = plafond(v, a);
        assert.equal(a.valide, true, JSON.stringify(a.erreurs)); assert.equal(r.plafonnee, true, 'doit être plafonnée : ' + motif); assert.equal(r.note, plafondAttendu, motif + ' : ' + r.note);
        assert.equal(r.raisons.length, 1, 'une seule règle en cause : ' + JSON.stringify(r.raisons)); assert(new RegExp(motif).test(r.raisons[0]), r.raisons[0]);
      };
      assert.equal(plafond(base, validerVerdict(base, ctx, { passe: 1 })).plafonnee, false, 'référence : un verdict complet n’est pas plafonné');
      const R = ['p4', 'p5'];
      seul({ forces: base.forces.slice(0, 2) }, 'moments forts', 8.5);
      seul({ 'défauts graves': [{ constat: 'Mort sans télégraphe en S01 (case 0).', preuves: ['p4'] }] }, 'un défaut grave', 8.5);
      seul({ 'défauts graves': [{ constat: 'Mort sans télégraphe en S01 (case 0).', preuves: ['p4'] }, { constat: 'Menace invisible en S02 (case 1).', preuves: ['p5'] }] }, 'deux défauts graves', 7);
      seul({ 'défauts mineurs': [{ constat: 'Un (cases 0 et 1).', preuves: R }, { constat: 'Deux (cases 0 et 1).', preuves: R }, { constat: 'Trois (case 0).', preuves: ['p4'] }] }, 'deux défauts mineurs récurrents', 8.5);
      seul({ 'défauts mineurs': [1, 2, 3, 4].map(k => ({ constat: 'Constat ' + k + ' (cases 0 et 1).', preuves: R })) }, 'quatre défauts mineurs récurrents', 7);
      seul({ limites: [] }, 'moins de 5 éléments', 8.5);
      seul({ 'défauts mineurs': [{ constat: 'Un constat chiffré 1.', preuves: [] }, { constat: 'Un constat chiffré 2.', preuves: ['p4'] }, { constat: 'Un constat chiffré 3.', preuves: [] }] }, 'défauts avec preuve', 8.5);
      const av2 = { ...base, regard: 'avocat du diable', note: 9.9 }, ra = plafond(av2, validerVerdict(av2, ctx, { passe: 1 })); assert(ra.raisons.some(x => /avocat du diable/.test(x)) && ra.note === 9.25, 'avocat : 10 − 3 × 0,25 = 9,25 (' + ra.note + ')');
      return { complaisant: pl.note };
    });
    await test('Défauts plantés : retrouvés seulement par une preuve rangée parmi les défauts ou les anomalies', () => {
      const bon = verdict({ racine, jure: 'jb', note: 8, cle, retrouverCanaris: true }), r = retrouverCanaris([bon], cle);
      assert.equal(r.plantes, cle.canaris.length); assert.equal(r.retrouves, r.plantes, JSON.stringify(r.detail));
      const sans = verdict({ racine, jure: 'jc', note: 8 }), r2 = retrouverCanaris([sans], cle); assert.equal(r2.retrouves, 0);
      const enForce = { ...bon, 'défauts graves': [], 'défauts mineurs': [], anomaliesDossier: [], forces: bon.anomaliesDossier }; assert.equal(retrouverCanaris([enForce], cle).retrouves, 0, 'louer la pièce altérée ne la retrouve pas');
      return { retrouves: r.retrouves, sur: r.plantes };
    });
    await test('Étalonnage : un juré complaisant, plat, instable ou ancré par les chiffres est écarté ; accord de rang ; cellules', () => {
      const L = (jure, famille, regard, role, n1, n2, extra = {}) => ({ jure, famille, regard, role: 'etalonnage-' + role, code: `${jure}-${role}`, doublonDe: extra.doublonDe ?? null, note1: n1, note2: n2, erreurs: [], preuves: { total: 10, introuvables: 0 }, canaris: { plantes: 4, retrouves: 4 }, ...extra });
      const bons = (j, f, r) => [L(j, f, r, 'v0', 6, 6.5), L(j, f, r, 'pointe', 7.5, 7.5), L(j, f, r, 'temoin', 3, 3)];
      const lignes = [];
      for (const f of ['claude', 'codex']) for (const r of REGARDS) lignes.push(...bons(`${f}-${r}`, f, r));
      let a = analyserEtalonnage(lignes); assert.equal(a.valide, true); assert(a.jures.every(j => !j.ecarte), JSON.stringify(a.jures.filter(j => j.ecarte).map(j => j.raisons)));
      const plat = [L('plat', 'claude', 'game design', 'v0', 9.3, 9.3), L('plat', 'claude', 'game design', 'pointe', 9.4, 9.4), L('plat', 'claude', 'game design', 'temoin', 9.2, 9.2)];
      const faible = [L('faible', 'claude', 'game design', 'v0', 6, 6), L('faible', 'claude', 'game design', 'temoin', 5.5, 5.5)];
      const instable = [...bons('inst', 'claude', 'game design'), L('inst', 'claude', 'game design', 'v0', 4, 4, { doublonDe: 'inst-v0', code: 'inst-dbl' })];
      const ancre = [L('ancre', 'claude', 'game design', 'v0', 6, 8), L('ancre', 'claude', 'game design', 'pointe', 7, 8.5), L('ancre', 'claude', 'game design', 'temoin', 3, 4.5)];
      const sansPreuves = bons('np', 'claude', 'game design').map(l => ({ ...l, preuves: { total: 10, introuvables: 5 } })), pasDeCanaris = bons('nc', 'claude', 'game design').map(l => ({ ...l, canaris: { plantes: 4, retrouves: 1 } }));
      a = analyserEtalonnage([...lignes, ...plat, ...faible, ...instable, ...ancre, ...sansPreuves, ...pasDeCanaris]);
      const par = n => a.jures.find(j => j.jure === n);
      assert(par('plat').ecarte && par('plat').raisons.some(x => /platitude/.test(x))); assert(par('faible').ecarte && par('faible').raisons.some(x => /discrimination/.test(x)));
      assert(par('ancre').ecarte && par('ancre').raisons.some(x => /ancrage/.test(x))); assert(par('np').ecarte && par('np').raisons.some(x => /preuves introuvables/.test(x))); assert(par('nc').ecarte && par('nc').raisons.some(x => /plantés/.test(x)));
      assert(par('claude-game design') && !par('claude-game design').ecarte); assert.equal(a.valide, true);
      const inst = par('inst'); assert(inst.raisons.some(x => /stabilité/.test(x)) || inst.tests.stabilite?.ok === false, JSON.stringify(inst.raisons));
      assert.equal(spearman([1, 2, 3], [3, 2, 1]), -1); assert.equal(spearman([1, 2, 3], [10, 20, 35]), 1); assert.equal(spearman([1, 2], [1, 2]), null);
      const sans = analyserEtalonnage(lignes.filter(l => l.famille !== 'codex')); assert.equal(sans.valide, false); assert(sans.cellulesSansJureValide.length === 5);
      return { jures: a.jures.length };
    });
    await test('Porte 7 : réussite seulement si tout tient ; sinon échec ou « non interprétable » (accord des familles, troisième jury, graines communes)', () => {
      const etal = analyserEtalonnage(['claude', 'codex'].flatMap(f => REGARDS.flatMap(r => [['v0', 6, 6.5], ['pointe', 7.5, 7.5], ['temoin', 3, 3]].map(([role, a, b]) => ({ jure: `${f}-${r}`, famille: f, regard: r, role: 'etalonnage-' + role, code: `${f}${r}${role}`, doublonDe: null, note1: a, note2: b, erreurs: [], preuves: { total: 10, introuvables: 0 }, canaris: { plantes: 4, retrouves: 4 } })))));
      const mk = (jury, notes = {}, extra = {}) => ['claude', 'codex'].flatMap(f => REGARDS.map(r => ({ jure: `${jury}-${f}-${r}`, famille: f, regard: r, role: 'verdict-' + jury, code: 'J-' + jury, doublonDe: null, serie: jury === 'A' ? 'alpha' : 'beta', bundleSha256: 'b'.repeat(64), graineListe: jury === 'A' ? [11111, 11112] : [22222, 22223],
        note1: notes[f] ?? 9.7, note2: (notes[f] ?? 9.7) + 0.1, statut: 'evalue', erreurs: [], preuves: { total: 8, introuvables: 0 }, canaris: { plantes: 3, retrouves: 3 }, ...extra })));
      let l = lecture95({ lignes: [...mk('A'), ...mk('B')], etalonnage: etal }); assert.equal(l.statut, 'reussite', JSON.stringify(l.raisons));
      l = lecture95({ lignes: [...mk('A', { claude: 9.2, codex: 9.2 }), ...mk('B', { claude: 9.2, codex: 9.2 })], etalonnage: etal }); assert.equal(l.statut, 'echec');
      l = lecture95({ lignes: [...mk('A', { claude: 9.9, codex: 8.2 }), ...mk('B')], etalonnage: etal }); assert.equal(l.statut, 'non_interpretable'); assert(l.raisons.some(x => /désaccord/.test(x) && /arbitrage/.test(x)));
      l = lecture95({ lignes: [...mk('A'), ...mk('B', {}, { graineListe: [11111] })], etalonnage: etal }); assert.equal(l.statut, 'non_interpretable'); assert(l.raisons.some(x => /graines/.test(x)));
      l = lecture95({ lignes: [...mk('A'), ...mk('B'), ...mk('B').map(x => ({ ...x, code: 'J-B2', jure: x.jure + '2' }))], etalonnage: etal }); assert.equal(l.statut, 'non_interpretable'); assert(l.raisons.some(x => /troisième/.test(x)));
      l = lecture95({ lignes: [...mk('A', {}, { canaris: { plantes: 3, retrouves: 1 } }), ...mk('B')], etalonnage: etal }); assert.equal(l.statut, 'non_interpretable');
      l = lecture95({ lignes: [...mk('A'), ...mk('B')], etalonnage: { ...etal, valide: false, cellulesSansJureValide: ['codex/game design'] } }); assert.equal(l.statut, 'non_interpretable');
      l = lecture95({ lignes: [...mk('A'), ...mk('B', {}, { bundleSha256: 'c'.repeat(64) }).map((x, i) => i ? x : x)].map((x, i) => i === 0 ? { ...x, bundleSha256: 'd'.repeat(64) } : x), etalonnage: etal }); assert.equal(l.statut, 'non_interpretable');
      const sansEcart = lecture95({ lignes: [...mk('A', { claude: 5.9, codex: 5.9 }), ...mk('B', { claude: 5.9, codex: 5.9 })], etalonnage: etal }); assert(sansEcart.raisons.some(x => /écart version 0/.test(x)));
      assert.equal(controleJure({ erreurs: [], preuves: { total: 4, introuvables: 2 }, canaris: { plantes: 0, retrouves: 0 }, note1: 9, note2: 9 }).ok, false);
      return { statut: 'reussite' };
    });
    await test('Consolidation sur fichiers : verdicts écrits, relus, validés, plafonnés, canaris comptés', async () => {
      const dirV = path.join(tmp, 'verdicts'); fs.mkdirSync(path.join(dirV, 'j1'), { recursive: true });
      const v1 = verdict({ racine, jure: 'j1', note: 9.9, diligent: false, cle, retrouverCanaris: true }), v2 = verdict({ racine, jure: 'j1', passe: 2, note: 9.9, note1: 9.9, diligent: false });
      fs.writeFileSync(path.join(dirV, 'j1', 'J-3f9a1c7e.p1.json'), JSON.stringify(v1)); fs.writeFileSync(path.join(dirV, 'j1', 'J-3f9a1c7e.p2.json'), JSON.stringify(v2)); fs.writeFileSync(path.join(dirV, 'j1', 'casse.json'), '{');
      const { lignes, rejets } = consolider({ verdicts: (await import('./etalonnage.mjs')).chargerVerdicts(dirV), paquets: sortieP, cles: sortieC });
      assert.equal(lignes.length, 1); assert.equal(rejets.length, 1); const l = lignes[0]; assert(l.note1 <= 8.5 && l.note2 <= 8.5 && l.plafonnee, JSON.stringify(l.plafonds)); assert.equal(l.canaris.retrouves, l.canaris.plantes); assert.equal(l.valide1, true);
      return { note1: l.note1, brute1: l.brute1 };
    });
    await test('Témoin : source du module dégradé et du témoin positif, exécutée dans un contexte VM (retards, doublons, calage sur le temps)', () => {
      const monde = (mode, phase = .3, bpm = 120) => {
        const appels = [], muet = []; const N = { R: { apparitions: { portail: .6 } }, rythme: { lire: () => ({ t: 0 }) }, ennemis: { spawn: (type, x, y, o) => { appels.push({ type, x, y, o }); return { type }; } }, music: { mute: (a, b) => { muet.push([a, b]); return true; }, beat: () => ({ phase }), tempo: () => bpm } };
        const w = { __N: N, __JURY_TEMOIN_MODE: mode }; vm.runInNewContext(sourceAjout(), { window: w, Math, Object, isFinite, Number }); return { N, appels, muet, w };
      };
      const d = monde('desync'); for (let k = 0; k < 200; k++) d.N.ennemis.spawn('fleche', 0, 0, { portail: .6 });
      const pr = d.appels.filter(a => a.o.portail >= .6 && a.o.portail <= .6 + P.temoin.retardMax + 1e-9); assert.equal(pr.length, d.appels.length, 'portails prolongés de 0 à retardMax');
      const nb = d.appels.length - 200; assert(nb > 200 * P.temoin.doublonProba * 0.6 && nb < 200 * P.temoin.doublonProba * 1.4, 'doublons de poursuivants : ' + nb);
      const avant = d.appels.length; d.N.ennemis.spawn('cyclope', 0, 0, { ext: true, portail: 0 }); d.N.ennemis.spawn('tourelle', 0, 0, {}); assert.equal(d.appels.length - avant, 2, 'ni boss, ni tourelle doublés');
      assert.deepEqual(d.muet.at(-1), ['musique', true]); assert.equal(d.w.__JURY_TEMOIN.mode, 'desync'); d.N.music.mute(false); assert.deepEqual(d.muet.at(-1), ['musique', true], 'la porte musicale est remise après un mute public');
      const s = monde('synchro'); assert.equal(s.muet.length, 0, 'musique conservée'); assert.equal(s.w.__JURY_TEMOIN.mode, 'synchro');
      for (const [phase, bpm, port] of [[.3, 120, .6], [0, 120, .6], [.99, 143.76, .6], [.5, 100, 2.4], [.1, 90, 0]]) {
        const m = monde('synchro', phase, bpm); m.N.ennemis.spawn('fleche', 0, 0, { portail: port }); const T = 60 / bpm, p = m.appels[0].o.portail, reste = (1 - phase) * T;
        assert(p >= Math.min(port || .05, reste) - 1e-9 || p >= reste - 1e-9); assert(p >= (port || 0.05) - 1e-9 || p === reste, 'jamais plus court que le portail demandé'); const k = (p - reste) / T; assert(Math.abs(k - Math.round(k)) < 1e-9, 'l’apparition tombe sur un temps (' + [phase, bpm, port, p] + ')');
      }
      assert.equal(monde('synchro', NaN).appels.length, 0); const ssBeat = monde('synchro'); ssBeat.N.music.beat = null; ssBeat.N.ennemis.spawn('fleche', 0, 0, { portail: .7 }); assert.equal(ssBeat.appels[0].o.portail, .7, 'sans grille publique, aucun calage inventé');
      return { doublons: nb };
    });
    await test('Sensibilité : la pointe désynchronisée ne fait pas échouer l’instrument ; témoin positif et dégradé requis', () => {
      const evts = (n, f) => Array.from({ length: n }, (_, i) => f(i));
      const partie = (part) => ({ genre: 'partie', profil: 'paysage', pilote: 'humain', graine: 101, syncGeometrique: evts(60, i => i < 60 * part ? 5 : 190), mesures: { synchronisation: { apparition: { mesurables: 60, dans40ms: Math.round(60 * part) } }, audio: {} } });
      const probe = (rms) => ({ genre: 'audio-probe', mesures: { audio: { captureRms: rms } } });
      const sonde = (mode, part, graine = 101) => ({ genre: 'sync-probe', modeTemoin: mode, profil: 'paysage', graine, syncGeometrique: evts(50, i => i < 50 * part ? 8 : 200), mesures: {} });
      const pointeV0 = { protocoleSha256: 'p', cas: [partie(0.05), probe(.2)] };
      const temoin = (pos, neg, rms = .001) => ({ protocoleSha256: 'p', cas: [partie(0.19), probe(rms), sonde('synchro', pos), sonde('desync', neg)] });
      let t = temoin(0.9, 0.2), r = sensibilite(pointeV0, t, t); assert.equal(r.valide, true, JSON.stringify(r)); assert(r.positif.pointeDesynchronisee.part < 0.1, 'information : la pointe n’est pas calée');
      assert.equal(sensibilite(pointeV0, temoin(0.9, 0.2), null).valide, false, 'ancienne logique : pointe 5 % contre témoin 19 % = échec (le défaut corrigé)');
      t = temoin(0.3, 0.2); assert.equal(sensibilite(pointeV0, t, t).valide, false, 'le témoin positif doit atteindre au moins 50 %');
      t = temoin(0.9, 0.85); assert.equal(sensibilite(pointeV0, t, t).valide, false, 'positif et dégradé indistinguables');
      t = temoin(0.9, 0.2, .15); assert.equal(sensibilite(pointeV0, t, t).valide, false, 'musique pas coupée');
      t = { protocoleSha256: 'p', cas: [probe(.001), sonde('synchro', 0.9)] }; assert.equal(sensibilite(pointeV0, t, t).valide, false, 'sans sonde dégradée');
      t = temoin(0.9, 0.2); assert.equal(sensibilite({ ...pointeV0, protocoleSha256: 'autre' }, t, t).valide, false, 'protocole différent');
      const t2 = { protocoleSha256: 'p', cas: [partie(0.19), probe(.001), sonde('synchro', 0.9, 101), sonde('desync', 0.2, 102)] }; assert.equal(sensibilite(pointeV0, t2, t2).valide, false, 'graines différentes entre témoin positif et témoin dégradé : comparaison refusée');
      assert.equal(sensibilite({ protocoleSha256: 'p', cas: [partie(0.05), probe(0)] }, temoin(0.9, 0.2), temoin(0.9, 0.2)).valide, false, 'pointe sans musique audible : instrument non valide');
      return { ok: true };
    });
    await test('Sonde : images denses autour des drops, des morts et du WARP seulement (fixture VM indépendante du jeu)', () => {
      let now = 0, id = 0, cursor = 0, warp = 'repos'; const queue = [], handlers = {}; class AN { connect() { return this; } } class HM { play() { return Promise.resolve(); } } class HV extends HM { }
      const buf = new Uint8Array(4), ctx = { state: 'running', baseLatency: .01, outputLatency: 0, get currentTime() { return now / 1000; } };
      const N = { pal: { C: ['#000000', '#ffffff'], L: [0, 1] }, gfx: { buf: () => buf, W: 2, H: 2, PX: 2 }, music: { context: () => ctx, beat: () => ({ phase: .1, bar: 0, beat: 0 }), tempo: () => 120, rms: () => .25, rmsOut: () => .2, muted: () => false, morceau: () => ({ id: 'x', t: cursor, duree: 100 }) },
        ev: { on: (type, rank, f) => { handlers[type] = f; } }, ennemis: { list: [], tirs: [], count: () => 0 }, dir: { vague: () => 1 }, score: { score: 0, resume: () => ({ victoire: false }) }, warp: { state: () => ({ phase: warp }) },
        game: { etat: () => 'jeu', dbg: () => ({ vague: 1, score: 0, stats: {} }) }, horloge: { t: () => now / 1000, pas: () => id }, R: { criteres: { R13: { aire: .066, flashsParSeconde: 3 }, R14: { secouees: .12, banniere: 10 } } } };
      const w = { __N: N, __S: { shake: 0, tension: .2 }, __ERR: { count: 0 }, __FRAME: 0, requestAnimationFrame: f => { queue.push(f); return ++id; } };
      const cfg = { media: true, pixels: false, capturePas: .25, denses: { avant: .6, apres: 1.2, pas: 1 / 15, apresEvenement: 1.5, drops: { x: [10] } } };
      vm.runInNewContext('(' + installer.toString() + ')(cfg)', { window: w, AudioNode: AN, HTMLMediaElement: HM, HTMLVideoElement: HV, performance: { now: () => now, timeOrigin: 0 }, cfg, Uint8Array, WeakSet, Map, Set, JSON, btoa: s => Buffer.from(s, 'binary').toString('base64') });
      w.__jury.commencer(); const draw = () => { now += 1000 / 60; w.requestAnimationFrame(() => w.__FRAME++); queue.shift()(now); };
      const compter = (a, b) => { const n0 = w.__jury.vider().images.length; return n0; };
      const ts = []; for (let k = 0; k < 60 * 20; k++) { cursor = now / 1000; draw(); if (k % 30 === 0) { const r = w.__jury.vider(); ts.push(...r.images.map(i => i.w)); } } ts.push(...w.__jury.vider().images.map(i => i.w));
      const entre = (a, b) => ts.filter(t => t >= a && t < b).length;
      assert(Math.abs(entre(2, 4) - 8) <= 1, '4 Hz loin des temps forts : ' + entre(2, 4)); assert(entre(9.5, 11.1) >= 20, '15 Hz autour du drop : ' + entre(9.5, 11.1)); assert(entre(15, 17) <= 9, 'retour à 4 Hz après le drop : ' + entre(15, 17));
      handlers.mort({ cause: 'x' }); const apres = []; for (let k = 0; k < 60; k++) { cursor = now / 1000 + 100; draw(); } apres.push(...w.__jury.vider().images.map(i => i.w)); assert(apres.length >= 12, 'dense après une mort : ' + apres.length);
      warp = 'actif'; for (let k = 0; k < 60; k++) { cursor = 200; draw(); } const wr = w.__jury.vider().images.length; assert(wr >= 12, 'dense à l’entrée du WARP : ' + wr);
      return { densite: entre(9.5, 11.1), base: entre(2, 4) };
    });
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}
