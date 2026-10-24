/* Paramètres d'acquisition hors jeu, jamais chargés par la build. Les seuils du jeu
   restent lus dans N.R ; les autres portes viennent d'INCROYABLE.md, sans réglage.
   Relecture indépendante du 24/10/2026 (02 h 50) : séries de graines, échantillon écrit avant,
   défauts plantés, étalonnage des jurés. Rien de ce qui est ci-dessous n'est chargé par le jeu. */
export const REGARDS = Object.freeze(['joueuse iPhone', 'game design', 'rythme et musique', 'direction artistique', 'avocat du diable']);
export const FAMILLES = Object.freeze(['claude', 'codex']);
const TOUS_PROFILS = ['paysage', 'portrait', 'bureau'];
export const P = Object.freeze({
  version: 2, graines: 10, pilotes: ['maladroit', 'humain', 'bon', 'expert'],
  profils: TOUS_PROFILS, jour: 20261017,
  maxPartie: 720, maxAventure: 1800, clip: 30, avant: 10, queueFin: 20,
  /* Acquisition à 4 Hz : les neuf images demandées toutes les 0,5 s peuvent
     être choisies autour d'un drop de phase quelconque, sans élargir la tolérance. */
  pollMs: 500, capturePas: 0.25, screencastNth: 6, jpegQualite: 85,
  /* Un trou de 1,07 s dans le screencast a rendu quatre clips sur cinq « non conformes » dans le premier
     dossier réel (24/10/2026, 02 h 46, partie 1 du maladroit). Le drapeau strict (> 1 s) reste publié sous
     le nom sansTrou ; la conformité d'un clip tolère un trou de 2 s au plus. Les planches (tampon exact)
     ne sont pas concernées. Amendement décidé après la première prise partielle, dans le sens de la
     tolérance : il est donc consigné ici et dans manifeste.json. */
  maxTrouVideo: 1, maxTrouVideoTolere: 2, tolerancePlanche: 0.15, autourDrop: 2,
  performanceSec: 30, chargeSec: 60, probeSyncSec: 150,
  /* Images denses (15 Hz) autour des temps forts : fenêtre autour de chaque drop (temps du fichier musical)
     et après chaque mort, entrée de vague, phase, vol, transition du WARP. Le reste reste à 4 Hz. */
  denses: { avant: 0.6, apres: 1.2, pas: 1 / 15, apresEvenement: 1.5, tolerance: 0.07, pasPlanche: 0.125 },
  /* Portes écrites par la propriétaire, INCROYABLE.md §§3,5. */
  syncMs: 40, syncPart: 0.95, difficulte: { min: 150, max: 240, cyclopeMin: 0.2, cyclopeMax: 0.5, nMin: 100 },
  /* Sensibilité de l'instrument, écrite avant essai. Deux axes indépendants requis.
     Axe temporel : témoin positif (apparitions calées sur le temps audio) contre témoin dégradé.
     La pointe n'intervient plus dans cet axe : un jeu dont les apparitions ne sont pas calées
     (la version 0 : 4,8 % à ± 40 ms sur le premier dossier réel) ne doit pas faire échouer la validation. */
  sensibilite: { ratioAudioMax: 0.1, perteSyncMin: 0.2, evenementsMin: 30, positifPartMin: 0.5 },
  temoin: { graine: 2975, retardMax: 0.9, doublonProba: 0.6, typesDoublables: ['fleche', 'dard', 'larve'] },
  verrou: '/tmp/snake-chromium-chef.lock',
  moments: ['debut', 'premiere-vague', 'vol', 'warp', 'drop', 'break', 'cyclope', 'espace', 'fin'],
  /* Séries de graines (D6) : l'étalonnage utilise des graines hors réglage (≥ 101) ; alpha et beta sont
     tirées au hasard au premier usage, scellées dans sceaux/<série>.json (jamais écrasé), disjointes
     entre elles et des graines de réglage (1–100). La couverture « complète » est relative à la série. */
  series: {
    etalonnage: { graines: [101], profils: ['paysage', 'portrait'], aventures: [{ profil: 'paysage', qui: ['elle'] }], performance: ['paysage'] },
    alpha: { graines: { n: 3, scelle: true, min: 10000, max: 99999 }, profils: TOUS_PROFILS, aventures: TOUS_PROFILS.map(profil => ({ profil, qui: ['elle', 'lui'] })), performance: TOUS_PROFILS },
    beta: { graines: { n: 3, scelle: true, min: 10000, max: 99999 }, profils: TOUS_PROFILS, aventures: TOUS_PROFILS.map(profil => ({ profil, qui: ['elle', 'lui'] })), performance: TOUS_PROFILS }
  },
  grainesReglage: { min: 1, max: 100 },
  /* Échantillon écrit avant toute prise (autotest.md § 3.2) : le script l'applique à toutes les données,
     la cheffe ne choisit rien. Les instants uniformes sont stratifiés (un par tranche) et tirés par graine. */
  echantillon: {
    graine: 20261024, uniformes: 6, margeBord: 3,
    evenements: { drop: 3, break: 2, vague: [1, 2, 3, 4, 5], warp: ['entree', 'sortie'], cyclope: 1, vol: 1, fin: 1, mort: 'toutes' },
    piresCas: { imagesLentes: 3, mortsCourtPreavis: 3, secondeFlashs: 1 },
    fenetre: { avant: 1.5, apres: 1.5 }, mortAvant: 4, maxImagesPlanche: 17, pasPlanche: 0.25
  },
  /* Défauts plantés (autotest.md § 3.2.4) : liste écrite avant, tirage au sort (crypto) au montage du paquet,
     emplacement consigné dans la clé aveugle. Nature « integrite » : une preuve incohérente avec une autre,
     sans lien avec la qualité du jeu (le juré doit la signaler à part et ne pas la retenir dans sa note).
     Nature « jeu » : seulement dans les paquets d'étalonnage (un défaut de jeu planté ferait baisser un verdict). */
  canaris: {
    parPaquet: { etalonnage: 4, verdict: 3 }, decalageMs: 120, toleranceTemps: 1.5, partMin: 0.7,
    types: [
      { id: 'image-gelee', nature: 'integrite', passe: 1 },
      { id: 'temps-incoherent', nature: 'integrite', passe: 1 },
      { id: 'trou-couverture', nature: 'integrite', passe: 1 },
      { id: 'mesure-contradictoire', nature: 'integrite', passe: 2 },
      { id: 'decalage-rythme', nature: 'jeu', passe: 1 },
      { id: 'flash-plein-ecran', nature: 'jeu', passe: 1 }
    ]
  },
  /* Étalonnage et lecture de la porte 7 (INCROYABLE.md, amendements de 02 h 22 ; autotest.md § 3.4). */
  jury: {
    ecartTemoinMin: 1.5, temoinMax: 7, canarisMin: 0.7, preuvesIntrouvablesMax: 0.2,
    stabiliteMax: 1, ancrageMax: 0.8, platitude: { noteMin: 9, etendueMax: 1 },
    accordFamilles: 1, desaccordArbitrage: 1.5, moyenneFamille: 9.5, moyenneRegardMin: 9, ecartVersionMin: 1.5,
    defautsMin: 5, defautsAvecPreuveMin: 3, momentsFortsPourPlus9: 3, plafondSansPreuves: 8.5,
    plafondDeuxGraves: 7, regardsPass2: ['game design'],
    avocat: { penaliteGrave: 1.0, penaliteMineur: 0.25 }
  }
});
export const paris = () => new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }) + ' (Paris)';
