/* tools/musique/decoupe.mjs — decoupe « Neon Velocity » en blocs de mesures et ecrit musique/piste.json.
   node tools/musique/decoupe.mjs            (lit tools/musique/analyse.json, produit par analyse.mjs)
   - blocs de 8 mesures alignes sur les phrases (cycle harmonique de 8 mesures qui commence sur la m.),
     INTRO, PONT et OUTRO entiers ;
   - chaque fichier garde une mesure de plus de chaque cote (recouvrement), sauf avant la mesure 1
     (rien n'existe avant) et apres l'OUTRO (on garde toute la queue du morceau) ;
   - coupe a l'echantillon pres sur la grille mesuree (tempo constant, voir analyse.json), depuis un
     seul decodage de la source reechantillonnee en 44,1 kHz (soxr) ;
   - MP3 CBR 112 kb/s, stereo, 44,1 kHz, libmp3lame, en-tete Xing/LAME (retard et bourrage de
     l'encodeur, pour la lecture sans blanc), sans pochette ni etiquette ID3 ;
   - enchainements : score de compatibilite entre la mesure qui suit naturellement la fin d'un bloc
     et la premiere mesure du bloc candidat (niveau, bandes, attaques, chroma, accord). */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { ICI, DEPOT, SOURCE, SORTIE, SR, decode, ecrisWav, rmsStereo, dB, arr, lameTag } from './lib.mjs';

const A = JSON.parse(fs.readFileSync(path.join(ICI, 'analyse.json'), 'utf8'));
const MES = A.mesures, NM = A.nMesures, BAR = A.barres;              /* BAR[m-1] = debut de la mesure m */
const DEBIT = 112;

/* ---------- la structure, decidee sur analyse.json (voir LISEZMOI.md) ---------- */
const SECTIONS = [
  { nom: 'INTRO', de: 1, a: 8, usage: 'titre, attraction, briefing' },
  { nom: 'PLATEAU', de: 9, a: 56, usage: 'jeu : les vagues et LE VOL ; decollage a la mesure 9' },
  { nom: 'PONT', de: 57, a: 58, usage: 'cassure de 2 mesures : levee vers la RESPIRATION' },
  { nom: 'RESPIRATION', de: 59, a: 82, usage: 'repit : LE DEFILE, repits du CYCLOPE ; 75 a 82 remonte vers le RETOUR' },
  { nom: 'RETOUR', de: 83, a: 122, usage: 'boss : LE CYCLOPE' },
  { nom: 'OUTRO', de: 123, a: 131, usage: 'victoire, defaite, initiales, records' },
];
/* garde-fous : la structure doit coller a l'analyse, sinon on s'arrete */
if (NM !== 131) throw new Error('analyse : ' + NM + ' mesures, 131 attendues ; revoir SECTIONS');
for (const s of SECTIONS.slice(1)) {
  const saut = Math.abs(MES[s.de - 1].niveau - MES[s.de - 2].niveau);
  if (s.nom !== 'RESPIRATION' && saut < 5) throw new Error('pas de rupture de niveau a la mesure ' + s.de + ' (' + saut + ' dB)');
}
const blocsDef = [];
for (const s of SECTIONS) {
  if (s.nom === 'INTRO' || s.nom === 'PONT' || s.nom === 'OUTRO') { blocsDef.push({ section: s.nom, de: s.de, a: s.a }); continue; }
  for (let m = s.de; m <= s.a; m += 8) blocsDef.push({ section: s.nom, de: m, a: Math.min(s.a, m + 7) });
}
const sousPartie = b => b.section === 'RESPIRATION' && b.de === 75 ? 'montee' : b.section === 'PLATEAU' && b.de === 33 ? 'creux' : null;

/* ---------- la source ---------- */
const t0 = Date.now();
const { L, R, n } = decode(SOURCE);
const sha = crypto.createHash('sha256').update(fs.readFileSync(SOURCE)).digest('hex');
const ech = t => Math.max(0, Math.min(n, Math.round(t * SR)));
const barre = m => m <= NM + 1 ? BAR[m - 1] : null;                  /* debut de la mesure m (m = NM+1 : fin) */
console.log('source decodee', n, 'echantillons', Date.now() - t0, 'ms');

/* ---------- compatibilite des enchainements ---------- */
function vec(me) { return [me.niveau / 4, me.debutDb / 6, me.bandes[0] * 4, me.bandes[1] * 4, me.bandes[2] * 10, me.attaques / 15, me.aigus / 15, ...me.chroma.map(v => v * 8)]; }
const V = MES.map(vec);
const dist = (a, b) => Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));
/* echelle : distance mediane entre deux mesures voisines du morceau (ce qu'on entend normalement) */
const voisines = []; for (let m = 1; m < NM; m++) voisines.push(dist(V[m - 1], V[m]));
voisines.sort((a, b) => a - b);
const D0 = voisines[voisines.length >> 1];
/* trois lectures, on garde la meilleure :
   s1 : la premiere mesure du suivant ressemble a celle qui suit naturellement la fin ;
   s2 : la derniere mesure jouee ressemble a celle qui precede naturellement le suivant ;
   s3 : la fin et le debut se ressemblent eux-memes (meme texture : boucle dans une section calme). */
const sim = (a, b) => Math.exp(-dist(V[a - 1], V[b - 1]) / (2 * D0));
function compat(fin, debut) {               /* fin : derniere mesure jouee ; debut : premiere mesure du suivant */
  if (debut === fin + 1) return 1;
  const s1 = fin + 1 <= NM ? sim(fin + 1, debut) : 0;
  const s2 = debut > 1 ? sim(fin, debut - 1) : 0;
  const s3 = 0.9 * sim(fin, debut);
  return arr(Math.max(s1, s2, s3), 2);
}

/* ---------- decoupe et encodage ---------- */
fs.mkdirSync(SORTIE, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nv-'));
function encode(wav, mp3) {
  return new Promise((ok, ko) => {
    const p = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', wav, '-map', '0:a', '-map_metadata', '-1',
      '-c:a', 'libmp3lame', '-b:a', DEBIT + 'k', '-ar', String(SR), '-ac', '2', '-write_xing', '1',
      '-id3v2_version', '0', '-write_id3v1', '0', mp3]);
    let err = ''; p.stderr.on('data', d => err += d);
    p.on('close', c => c === 0 ? ok() : ko(new Error(err)));
  });
}
const blocs = [];
const travaux = [];
blocsDef.forEach((b, k) => {
  const id = 'nv-' + String(k + 1).padStart(2, '0');
  const cD = ech(barre(b.de)), cF = ech(barre(b.a + 1));
  const avantM = b.de > 1 ? 1 : 0, apresM = b.a < NM ? 1 : 0;
  const f0 = avantM ? ech(barre(b.de - 1)) : 0;
  const f1 = apresM ? ech(barre(b.a + 2) ?? n / SR) : n;             /* OUTRO : toute la queue */
  const Ls = L.subarray(f0, f1), Rs = R.subarray(f0, f1);
  const wav = path.join(tmp, id + '.wav'), mp3 = path.join(SORTIE, id + '.mp3');
  ecrisWav(wav, Ls, Rs);
  travaux.push({ wav, mp3 });
  const niv = dB(rmsStereo(L, R, cD, cF));
  let crete = 0; for (let i = cD; i < cF; i++) crete = Math.max(crete, Math.abs(L[i]), Math.abs(R[i]));
  const att = MES.slice(b.de - 1, b.a).reduce((s, me) => s + me.attaques, 0) / (b.a - b.de + 1);
  const barres = []; for (let m = b.de; m <= b.a + 1; m++) barres.push(arr((ech(barre(m) ?? n / SR) - f0) / SR, 6));
  blocs.push({
    id, fichier: id + '.mp3', section: b.section, partie: sousPartie(b),
    mesures: [b.de, b.a], nMesures: b.a - b.de + 1,
    source: { debut: arr(cD / SR, 6), fin: arr(cF / SR, 6), fichierDebut: arr(f0 / SR, 6), fichierFin: arr(f1 / SR, 6) },
    echantillons: { fichier: f1 - f0, coeurDebut: cD - f0, coeurFin: cF - f0 },
    avant: arr((cD - f0) / SR, 6), apres: arr((f1 - cF) / SR, 6),
    avantMesures: avantM, apresMesures: apresM ? 1 : arr((f1 - cF) / SR / A.tempo.periodeMesure, 3),
    mesureS: A.tempo.periodeMesure, barres,
    niveau: arr(niv, 2), creteDb: arr(dB(crete), 2),
    intensite: arr(Math.min(1, Math.max(0, 0.75 * (niv + 28) / 14 + 0.25 * Math.min(1, att / 70))), 2),
    accords: MES.slice(b.de - 1, b.a).map(me => me.accord),
  });
});

/* encodage en parallele (un ffmpeg par coeur) */
const nCoeurs = Math.max(1, os.cpus().length);
let idx = 0;
await Promise.all(Array.from({ length: nCoeurs }, async () => { while (idx < travaux.length) { const t = travaux[idx++]; await encode(t.wav, t.mp3); } }));
fs.rmSync(tmp, { recursive: true, force: true });
for (const b of blocs) {
  const buf = fs.readFileSync(path.join(SORTIE, b.fichier));
  b.octets = buf.length;
  b.lame = lameTag(buf);
}
console.log('encodage', blocs.length, 'blocs', Date.now() - t0, 'ms');

/* ---------- enchainements ---------- */
const parSection = s => blocs.filter(b => b.section === s);
for (const a of blocs) {
  const fin = a.mesures[1], cands = [];
  for (const b of blocs) {
    const sc = compat(fin, b.mesures[0]);
    let type;
    if (b.mesures[0] === fin + 1) type = 'naturel';
    else if (b.section === a.section) type = b.id === a.id || b.mesures[0] < a.mesures[0] ? 'boucle' : 'saut';
    else type = 'changement';
    cands.push({ id: b.id, type, score: sc });
  }
  /* on garde le naturel, puis tout ce qui sonne (score >= 0,5) ; et toujours au moins un bloc par
     section, le meilleur, pour que le sequenceur puisse changer de section a la fin de n'importe quel bloc */
  const garde = new Map();
  for (const c of cands) if (c.type === 'naturel' || c.score >= 0.5) garde.set(c.id, c);
  for (const s of SECTIONS) {
    /* l'INTRO est le debut brut du morceau (plein signal a t = 0) : on n'y entre que depuis un bloc
       calme ; depuis un bloc fort, le jeu passe par l'OUTRO ou coupe en fondu (voir LISEZMOI.md) */
    if (s.nom === 'INTRO' && a.intensite >= 0.65) continue;
    const best = cands.filter(c => blocs.find(b => b.id === c.id).section === s.nom).sort((x, y) => y.score - x.score)[0];
    if (best && !garde.has(best.id)) garde.set(best.id, best);
  }
  if (a.mesures[1] === 122) { const c = cands.find(c => blocs.find(b => b.id === c.id).mesures[0] === 107); garde.set(c.id, { ...c, type: 'boucle' }); }
  a.suivants = [...garde.values()].sort((x, y) => (y.type === 'naturel') - (x.type === 'naturel') || y.score - x.score);
}

/* ---------- boucles internes a un bloc (de la barre de fin a la barre de debut) ---------- */
const blocDe = m => blocs.find(b => m >= b.mesures[0] && m <= b.mesures[1]);
function boucle(nom, de, a) {
  const b = blocDe(de); if (blocDe(a) !== b) throw new Error('boucle a cheval : ' + nom);
  return { nom, bloc: b.id, de, a, debutS: b.barres[de - b.mesures[0]], finS: b.barres[a + 1 - b.mesures[0]], score: compat(a, de) };
}
const boucles = [boucle('intro', 1, 8), boucle('intro-courte', 3, 8), boucle('outro', 123, 130), boucle('outro-entiere', 123, 131),
  boucle('respiration', 59, 66), boucle('remontee', 75, 82)];
console.log('boucles', boucles.map(b => b.nom + ' ' + b.de + '-' + b.a + ' : ' + b.score).join(', '));

/* ---------- tonalite par section : sixte (si / sib) et seconde (mi / mib) de re ---------- */
const NOMS = A.tonalite.noms;
function chromaDe(de, a) {
  const c = new Array(12).fill(0);
  for (let m = de; m <= a; m++) { const w = 10 ** (MES[m - 1].niveau / 20); MES[m - 1].chroma.forEach((v, k) => c[k] += v * w); }
  const s = c.reduce((x, y) => x + y); return c.map(v => v / s);
}
const tonaliteSections = {};
for (const s of SECTIONS) {
  const c = chromaDe(s.de, s.a), si = c[11], sib = c[10];
  tonaliteSections[s.nom] = { mode: si > sib ? 'dorien' : 'eolien', si: arr(si, 3), sib: arr(sib, 3), do: arr(c[0], 3), 'do#': arr(c[1], 3) };
}

/* ---------- piste.json ---------- */
const bloc = m => blocs.find(b => m >= b.mesures[0] && m <= b.mesures[1]).id;
const t = m => arr(BAR[m - 1], 4);
const piste = {
  version: 1,
  titre: 'Neon Velocity', auteur: 'manonwwk (Suno)',
  source: { fichier: path.relative(DEPOT, SOURCE), sha256: sha, duree: A.source.duree, frequence: 48000 },
  bpm: A.tempo.bpm, mesureS: A.tempo.periodeMesure, tempsS: A.tempo.periodeTemps, tempsParMesure: 4,
  premiereMesure: A.premiereMesure, nMesures: NM,
  tempo: {
    decision: 'tempo constant : 114,995 BPM mesures (Suno : 115), et non 144,6 ; blocs coupes sur la grille calculee',
    constant: A.tempo.constant, deriveMaxPct: A.tempo.deriveMaxPct, ecartPhaseMaxMs: A.tempo.ecartPhaseMaxMs,
    residuMs: A.tempo.residuMs, tempsFiables: A.tempo.tempsFiables, tempsTotal: A.tempo.tempsTotal,
  },
  tonalite: {
    centre: 're', mode: 'mineur', detail: 're mineur (eolien : sib, mi, do) dans PLATEAU et RETOUR ; re dorien (si naturel, accord de sol majeur) dans RESPIRATION et OUTRO ; do# de passage (la majeur, dominante) dans l INTRO',
    krumhansl: A.tonalite.candidats.slice(0, 3), parSection: tonaliteSections,
    cycle: 'harmonie en cycles de 8 mesures qui commencent sur la mineur (v) : la m | la m | sol m (sol) | sol m (sol) | re m | re m | fa | sol m (sol)',
  },
  frequence: SR,
  encodage: { codec: 'mp3', encodeur: 'libmp3lame (ffmpeg)', debitKbps: DEBIT, mode: 'CBR', canaux: 2, frequence: SR, entete: 'Xing + LAME (retard, bourrage)', pochette: false },
  sections: SECTIONS.map(s => ({ nom: s.nom, mesures: [s.de, s.a], debut: t(s.de), fin: arr(BAR[s.a] ?? A.source.duree, 4),
    niveau: arr(dB(rmsStereo(L, R, ech(BAR[s.de - 1]), ech(BAR[s.a] ?? n / SR))), 1), blocs: parSection(s.nom).map(b => b.id), usage: s.usage })),
  sectionsJeu: {
    titre: { section: 'INTRO', boucle: { bloc: bloc(1), de: 1, a: 8 } },
    attraction: { section: 'INTRO', boucle: { bloc: bloc(1), de: 1, a: 8 } },
    briefing: { section: 'INTRO', boucle: { bloc: bloc(1), de: 1, a: 8 } },
    jeu: { section: 'PLATEAU', entree: { bloc: bloc(9), mesure: 9 }, tirage: 'a la fin de la section, un bloc de PLATEAU qui n a pas joue depuis trois blocs' },
    repit: { section: 'RESPIRATION', levee: bloc(57), entree: { bloc: bloc(59), mesure: 59 }, remontee: bloc(75) },
    alerte: { section: 'PLATEAU', mesure: 56, bloc: bloc(56), note: 'coupure de 250 ms sur la barre, puis la mesure 56 sous passe-bas a 300 Hz (equivalent de l ancienne mesure 70)' },
    boss: { section: 'RETOUR', entree: { bloc: bloc(83), mesure: 83 }, boucle: { de: 107, a: 122, blocs: [bloc(107), bloc(115)] } },
    victoire: { section: 'OUTRO', bloc: bloc(123) },
    defaite: { section: 'OUTRO', bloc: bloc(123), filtre: 'passe-bas 1,2 kHz' },
    initiales: { section: 'OUTRO', bloc: bloc(123) },
  },
  reperes: {
    decollage: { mesure: 9, t: t(9), bloc: bloc(9) },
    cassure: { mesure: 57, t: t(57), bloc: bloc(57) },
    remontee: { mesure: 75, t: t(75), bloc: bloc(75) },
    retour: { mesure: 83, t: t(83), bloc: bloc(83) },
    outro: { mesure: 123, t: t(123), bloc: bloc(123) },
  },
  correspondance144: 'le plan comptait des mesures de 1,6598 s : sa mesure 11 (16,6 s) est notre 9, sa 70 (116 s) notre 56, sa 72 notre 57, sa 104 (171 s) notre 83, ses 136-151 (224-251 s) nos 107-122, sa 154 (254 s) notre 123',
  memoire: {
    note: 'un bloc decode = echantillons.fichier x 2 canaux x 4 octets, a la frequence du contexte audio ; ne garder que coeur +- 1 temps apres la mesure du decalage',
    blocMoyenOctets44k: Math.round(blocs.reduce((s, b) => s + b.echantillons.fichier, 0) / blocs.length * 8),
    coeurOctets44k: Math.round(8 * A.tempo.periodeMesure * 8 * SR),
  },
  boucles,
  blocs,
  mesures: MES.map(me => ({ m: me.m, t: me.t, niveau: me.niveau, accord: me.accord })),
};
fs.writeFileSync(path.join(SORTIE, 'piste.json'), JSON.stringify(piste, null, 1));
const tot = blocs.reduce((s, b) => s + b.octets, 0);
console.log('piste.json ecrit :', blocs.length, 'blocs,', arr(tot / 1e6, 2), 'Mo en tout ; D0', arr(D0, 3));
for (const b of blocs) console.log(b.id, b.section.padEnd(11), b.mesures.join('-').padEnd(7), 'niv', b.niveau, 'int', b.intensite, Math.round(b.octets / 1024) + ' Kio', 'lame', JSON.stringify(b.lame), '->', b.suivants.map(s => s.id + (s.type === 'naturel' ? '*' : '') + ':' + s.score).join(' '));
