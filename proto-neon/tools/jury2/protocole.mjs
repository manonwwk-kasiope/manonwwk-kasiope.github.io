/* Paramètres d'acquisition hors jeu, jamais chargés par la build. Les seuils du jeu
   restent lus dans N.R ; les autres portes viennent d'INCROYABLE.md, sans réglage. */
export const P = Object.freeze({
  version: 1, graines: 10, pilotes: ['maladroit', 'humain', 'bon', 'expert'],
  profils: ['paysage', 'portrait', 'bureau'], jour: 20261017,
  maxPartie: 720, maxAventure: 1800, clip: 30, avant: 10, queueFin: 20,
  /* Acquisition à 4 Hz : les neuf images demandées toutes les 0,5 s peuvent
     être choisies autour d'un drop de phase quelconque, sans élargir la tolérance. */
  pollMs: 500, capturePas: 0.25, screencastNth: 6, jpegQualite: 85,
  maxTrouVideo: 1, tolerancePlanche: 0.15, autourDrop: 2,
  performanceSec: 30, chargeSec: 60,
  /* Portes écrites par la propriétaire, INCROYABLE.md §§3,5. */
  syncMs: 40, syncPart: 0.95, difficulte: { min: 150, max: 240, cyclopeMin: 0.2, cyclopeMax: 0.5 },
  /* Sensibilité de l'instrument, écrite avant essai. Deux axes indépendants requis. */
  sensibilite: { ratioAudioMax: 0.1, perteSyncMin: 0.2, evenementsMin: 30 },
  temoin: { graine: 2975, retardMax: 0.9 },
  verrou: '/tmp/snake-chromium-chef.lock',
  moments: ['debut', 'premiere-vague', 'vol', 'warp', 'drop', 'break', 'cyclope', 'espace', 'fin']
});
export const paris = () => new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }) + ' (Paris)';
