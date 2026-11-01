/* SNAKE 2975 — LA BANQUE DE SONS (definitions)
   =============================================
   Chaque son du § 5.8 de REFONTE.md, ecrit comme une RECETTE Web Audio : des couches d'oscillateurs
   et de bruit, chacune avec son enveloppe, son filtre, sa hauteur et son glissando. Aucune dependance,
   aucune URL, aucun fichier audio : ce fichier ne contient que des donnees. Le lecteur de reference
   (`sons/jouer.js`) les transforme en noeuds ; le lot 7b peut le reprendre tel quel dans 30-music.js,
   ou relire ces donnees avec son propre code.

   LA TONALITE. Celle de la piste de la proprietaire, « Neon Velocity » : centre RE, mineur (eolien)
   dans PLATEAU et RETOUR, dorien dans RESPIRATION et OUTRO (musique/piste.json, lot 7a ; REFONTE.md
   § 5.7). Toutes les notes de la banque sont prises dans la PENTATONIQUE de re mineur (re fa sol la
   do), commune aux deux modes, ou dans l'HEXATONIQUE (on ajoute mi), commune elle aussi. Une seule
   exception, ecrite et mesuree : la cadence de `colosseMort` passe par si bemol (eolien), jouee quand la
   piste quitte le RETOUR (eolien) pour l'OUTRO.

   LES UNITES.
   - Temps en secondes. `ecart` et `temps` acceptent aussi '1/4', '1/8', '1/16' : une fraction de
     ronde au tempo de la piste (114,995 BPM : une noire vaut 0,522 s).
   - Hauteurs en noms anglais avec octave : 'D5' = re 5 = 587,3 Hz ; 'A4' = 440 Hz. Bemol : 'Bb4'.
   - `niveau` : la CRETE visee, en dBFS, du son seul en sortie du lecteur (avant le bus d'effets du jeu,
     qui doit rester a l'unite : voir LISEZMOI.md). Le banc (tools/sons/mesure.mjs --calibrer) calcule
     le facteur `CALIBRAGE[nom]` qui amene la crete mesuree sur la cible, a ± 0,5 dB.
   - `c` d'une enveloppe : le poids relatif de la couche dans le son, avant calibrage.

   LE SCHEMA D'UN SON.
     classe     'joueuse' | 'impacts' | 'ennemis' | 'ressources' | 'danger' | 'recompenses' | 'interface'
     quand      l'evenement qui le declenche ; appel : 'scene' (79-scene.js) ou 'module' (son module)
     niveau     crete visee (dBFS)            duree   duree attendue (s), le banc la verifie
     frequent   vrai pour les sons repetes plusieurs fois par seconde (plafond d'aigus plus strict)
     hauteur    ce que fait opts.pitch : 'penta' (monte d'un degre de la pentatonique par unite),
                'hexa' (d'un degre de l'hexatonique), 'nombre' (nombre de notes jouees), 'aucune'
     pitchMax   borne de opts.pitch ;  cycle : opts.pitch est pris modulo cycle (rotation du `tir`)
     pente      dB ajoutes par unite de opts.pitch (negatif : les notes hautes, plus percues, sont adoucies)
     alea       desaccord aleatoire, en cents, tire a chaque lecture (variete des sons frequents)
     garde      { fusion: s, plafond: voix, usure: k } — les gardes FUSION, PLAFOND et USURE de 30-music.js
     reserve    n : le son est joue sur une reserve de n voix creees une fois (aucun noeud par lecture)
     esquive    ce que le son retire a la musique (0,30 = la musique plonge de 30 %), relache en 120 ms
     etirable   vrai : opts.total (duree du telegraphe) etire le son entre × 0,6 et × 2
     couches    la recette (voir plus bas)
     variantes  { type: { couches, niveau?, duree?, quand? } } choisies par opts.type
     alias      { valeur de opts.type: nom de variante } (les identifiants d'ennemis et d'armes figes)
     pile       la note breve qui s'EMPILE sur un kill rapproche (aucun kill muet, § 5.8) :
                { fenetre, ecartMin, max, dbParPas, couches }
     escalier   { fenetre, max } : la serie de ramassages monte (le `butin`)

   LE SCHEMA D'UNE COUCHE.
     src        'osc' | 'bruit'
     onde       'sine' | 'triangle' | 'square' | 'sawtooth' | 'pulse25' | 'pulse12' (impulsions a 25 % et
                12,5 %, facon puce PSG) | 'doux25' | 'doux12' (les memes limitees a 6 harmoniques : rondes,
                sans aigus, sans filtre donc sans noeud de plus) | 'verre' (clochette : harmoniques 1, 3, 4)
     bruit      'blanc' | 'medium' (blanc filtre 500 Hz - 3 kHz a la creation du tampon) | 'grave'
                (sous 700 Hz) | 'metal' (bruit periodique de 93 pas, comme le mode court de la NES)
     vitesse    vitesse de lecture du tampon de bruit (hauteur du bruit 'metal')
     note       hauteur ; notes : une suite de hauteurs (arpege, accord, jingle)
     temps      instants des notes (s ou fraction) ; sinon ecart × rang ; ecart 0 : un accord
     legato     vrai : une seule voix pour toute la suite (moins de noeuds ; chaque note coupe la precedente)
     vers       hauteur d'arrivee du glissando ; glisse : glissando en demi-tons ; gduree : sa duree
     desaccord  cents fixes ;  vibrato : { f: Hz, c: cents, retard: s }
     mod        modulation de frequence : { ratio, indice, fin, duree } — l'indice va de `indice` a `fin`
     filtre     { type, f, q, vers, duree } (Hz) ;  sature : 1 a 8, une saturation douce (tanh)
     env        { a: attaque, h: tenue, d: chute exponentielle, c: poids }
     retard     decalage de la couche (s) ;  suit : false, la couche ne suit pas opts.pitch
*/
(function (racine) {
  'use strict';

  var TONALITE = {
    centre: 'D',               /* re */
    classeCentre: 2,           /* classe de hauteur MIDI de re */
    mode: 'mineur (eolien) ; dorien dans RESPIRATION et OUTRO',
    bpm: 114.995,              /* musique/piste.json, mesure le 17 octobre 2026 */
    gammes: {
      penta: [0, 3, 5, 7, 10],      /* re fa sol la do : la gamme des sons */
      hexa: [0, 2, 3, 5, 7, 10],    /* + mi : commune a l'eolien et au dorien */
      eolien: [0, 2, 3, 5, 7, 8, 10]
    },
    /* les classes de hauteur admises par le banc ; si bemol n'est admis que dans les sons qui le declarent */
    admises: [2, 4, 5, 7, 9, 0],
    eolienSeulement: [10]
  };

  /* les sept panoramiques (I-05) : calcules depuis la position a l'ecran, reduits de moitie en portrait */
  var PANS = [-0.85, -0.57, -0.28, 0, 0.28, 0.57, 0.85];

  /* les classes de timbre (I-03, accordees a la palette) */
  var CLASSES = {
    joueuse: { titre: 'Joueuse : timbres clairs', encre: 'cyan', grammaire: 'impulsions douces et triangles, aigus ronds, au-dessus de 500 Hz' },
    impacts: { titre: 'Impacts', encre: 'os', grammaire: 'attaque de bruit dans les mediums, corps tonal bref, sous-grave court' },
    ennemis: { titre: 'Ennemis et arene : mediums reches', encre: 'magenta', grammaire: 'dents de scie et impulsions etroites filtrees, resonance, 300 Hz a 1,8 kHz' },
    ressources: { titre: 'Ressources : cloches', encre: 'ambre', grammaire: 'sinus et triangles a partiels, attaque nette, queue cristalline' },
    danger: { titre: 'Danger : graves satures, avec medium', encre: 'sang', grammaire: 'dents de scie saturees et carrees qui tombent, toujours doublees dans les mediums' },
    recompenses: { titre: 'Recompenses', encre: 'jaune', grammaire: 'accords et arpeges majeurs (fa majeur, relatif de re mineur), impulsions 25 %' },
    interface: { titre: 'Interface', encre: 'acier', grammaire: 'impulsions 12,5 %, tres breves, discretes' }
  };

  var S = {};

  /* ===================================================================================== */
  /* JOUEUSE : timbres clairs                                                               */
  /* ===================================================================================== */

  S.tir = {
    classe: 'joueuse', appel: 'module', quand: 'tir du CANON (paliers I et II) ; une note de la pentatonique par tir, en rotation',
    niveau: -12, duree: 0.06, frequent: true, hauteur: 'penta', cycle: 5, alea: 8, reserve: 3,
    garde: { fusion: 0.035, plafond: 3, usure: 0.30 }, esquive: 0,
    couches: [
      /* un « piou » rond : impulsion douce qui tombe d'une quarte en 45 ms ; 2 noeuds, rien au-dessus de 4 kHz */
      { src: 'osc', onde: 'doux25', note: 'D5', glisse: -5, gduree: 0.045, env: { a: 0.001, h: 0, d: 0.05, c: 1 } }
    ],
    alias: { canon: '', tourelles: '', drones: '', lance: 'lance', rayon: 'rayon', arc: 'arc', missiles: 'missile', minesQ: 'mine' },
    variantes: {
      lance: {
        quand: 'CANON III : deux lances perforantes', niveau: -11, duree: 0.08,
        couches: [
          /* plus long, plus tranchant (impulsion pleine a 25 %), qui tombe d'une quinte */
          { src: 'osc', onde: 'pulse25', note: 'A4', glisse: -7, gduree: 0.06, env: { a: 0.001, h: 0.008, d: 0.07, c: 1 } }
        ]
      },
      rayon: {
        quand: 'ULTIME RAYON : un grain de bourdon toutes les tics (au plus 8 par seconde, ils se recouvrent en continu)',
        niveau: -19, duree: 0.14,
        couches: [
          /* des grains de bourdon qui se chevauchent : « brrr » continu, sans un noeud cree par tic */
          { src: 'osc', onde: 'doux12', note: 'A4', glisse: -1, gduree: 0.12, env: { a: 0.015, h: 0.05, d: 0.07, c: 1 } }
        ]
      },
      arc: {
        quand: "ARC : chaque saut monte d'un degre (opts.pitch = rang du saut)", niveau: -13, duree: 0.07,
        couches: [
          { src: 'osc', onde: 'pulse25', note: 'F5', glisse: -12, gduree: 0.05, filtre: { type: 'lowpass', f: 2800, q: 1 }, env: { a: 0.001, h: 0, d: 0.06, c: 1 } },
          { src: 'bruit', bruit: 'medium', filtre: { type: 'bandpass', f: 2400, q: 2 }, env: { a: 0.001, h: 0, d: 0.03, c: 0.7 } }
        ]
      },
      missile: {
        quand: 'MISSILES : depart de la salve de missiles', niveau: -17, duree: 0.2,
        couches: [
          { src: 'bruit', bruit: 'blanc', filtre: { type: 'bandpass', f: 700, q: 1.6, vers: 2600, duree: 0.16 }, env: { a: 0.01, h: 0.03, d: 0.15, c: 1 } },
          { src: 'osc', onde: 'triangle', note: 'D5', vers: 'A5', gduree: 0.14, env: { a: 0.005, h: 0.02, d: 0.12, c: 0.55 } }
        ]
      },
      mine: {
        quand: 'MINES DE QUEUE : une mine posee', niveau: -16, duree: 0.09,
        couches: [
          { src: 'osc', onde: 'sine', note: 'A5', vers: 'D5', gduree: 0.03, env: { a: 0.001, h: 0, d: 0.08, c: 1 } },
          { src: 'osc', onde: 'triangle', note: 'D4', env: { a: 0.001, h: 0, d: 0.04, c: 0.5 } }
        ]
      }
    }
  };

  S.salve = {
    classe: 'joueuse', appel: 'module', quand: "tirs des TOURELLES et des DRONES d'une meme image, fusionnes ; au plus 8 par seconde",
    niveau: -17, duree: 0.06, frequent: true, hauteur: 'aucune', alea: 10, reserve: 2,
    garde: { fusion: 0.125, plafond: 2, usure: 0.35 }, esquive: 0,
    couches: [
      /* « ti-tik » : deux impulsions etroites et rondes sur une seule voix (2 noeuds) */
      { src: 'osc', onde: 'doux25', notes: ['D5', 'A5'], temps: [0, 0.02], legato: true, env: { a: 0.001, h: 0.004, d: 0.035, c: 1 } }
    ]
  };

  S.boostOn = {
    classe: 'joueuse', appel: 'module', quand: "l'acceleration s'enclenche", niveau: -13, duree: 0.34, hauteur: 'aucune',
    garde: { fusion: 0.15, plafond: 1, usure: 0.2 }, esquive: 0,
    couches: [
      { src: 'bruit', bruit: 'blanc', filtre: { type: 'bandpass', f: 600, q: 1.4, vers: 3200, duree: 0.26 }, env: { a: 0.04, h: 0.12, d: 0.17, c: 1 } },
      { src: 'osc', onde: 'sawtooth', note: 'D4', vers: 'A4', gduree: 0.22, filtre: { type: 'lowpass', f: 900, q: 1, vers: 2200, duree: 0.22 }, env: { a: 0.02, h: 0.1, d: 0.18, c: 0.5 } },
      { src: 'osc', onde: 'doux25', note: 'A5', retard: 0.16, env: { a: 0.005, h: 0, d: 0.15, c: 0.35 } }
    ]
  };

  S.boostOff = {
    classe: 'joueuse', appel: 'module', quand: "l'acceleration se relache (la joueuse lache le geste)", niveau: -18, duree: 0.26, hauteur: 'aucune',
    garde: { fusion: 0.15, plafond: 1, usure: 0.2 }, esquive: 0,
    couches: [
      { src: 'bruit', bruit: 'blanc', filtre: { type: 'bandpass', f: 2600, q: 1.4, vers: 500, duree: 0.22 }, env: { a: 0.005, h: 0.04, d: 0.2, c: 1 } },
      { src: 'osc', onde: 'triangle', note: 'A4', vers: 'D4', gduree: 0.2, env: { a: 0.005, h: 0.02, d: 0.18, c: 0.5 } }
    ]
  };

  S.boostPanne = {
    classe: 'joueuse', appel: 'module', quand: 'panne franche de la reserve : un seul clic grave', niveau: -15, duree: 0.09, hauteur: 'aucune',
    garde: { fusion: 0.4, plafond: 1, usure: 0 }, esquive: 0,
    couches: [
      { src: 'osc', onde: 'square', note: 'D3', vers: 'A2', gduree: 0.04, filtre: { type: 'bandpass', f: 750, q: 1.2 }, env: { a: 0.001, h: 0.012, d: 0.07, c: 1 } },
      { src: 'bruit', bruit: 'medium', filtre: { type: 'bandpass', f: 900, q: 2 }, env: { a: 0.001, h: 0, d: 0.02, c: 0.6 } }
    ]
  };

  S.traversee = {
    classe: 'joueuse', appel: 'scene', quand: 'pouvoir TRAVERSEE : le serpent devient fantome 1,4 s', niveau: -12, duree: 0.75, hauteur: 'aucune',
    garde: { fusion: 0.5, plafond: 1, usure: 0 }, esquive: 0.15,
    couches: [
      /* un chatoiement qui monte et flotte : deux triangles desaccordes, vibrato lent, souffle aerien */
      { src: 'osc', onde: 'triangle', note: 'A5', vers: 'D6', gduree: 0.18, desaccord: -12, vibrato: { f: 6.5, c: 22 }, env: { a: 0.03, h: 0.25, d: 0.42, c: 1 } },
      { src: 'osc', onde: 'triangle', note: 'F6', desaccord: 12, vibrato: { f: 7.3, c: 18 }, env: { a: 0.06, h: 0.2, d: 0.4, c: 0.55 } },
      { src: 'bruit', bruit: 'blanc', filtre: { type: 'bandpass', f: 1800, q: 1.2, vers: 3000, duree: 0.5 }, env: { a: 0.08, h: 0.1, d: 0.4, c: 0.3 } }
    ]
  };

  S.ralenti = {
    classe: 'joueuse', appel: 'scene', quand: 'pouvoir RALENTI : le monde passe a 0,35', niveau: -12, duree: 0.7, hauteur: 'aucune',
    garde: { fusion: 0.5, plafond: 1, usure: 0 }, esquive: 0.2,
    couches: [
      /* la bande qui ralentit : tout glisse d'une octave vers le bas, le filtre se referme */
      { src: 'osc', onde: 'sawtooth', note: 'D5', vers: 'D4', gduree: 0.55, filtre: { type: 'lowpass', f: 2400, q: 2, vers: 600, duree: 0.6 }, env: { a: 0.01, h: 0.2, d: 0.45, c: 1 } },
      { src: 'osc', onde: 'doux25', note: 'A5', vers: 'A4', gduree: 0.55, env: { a: 0.01, h: 0.15, d: 0.4, c: 0.5 } }
    ]
  };

  S.repli = {
    classe: 'joueuse', appel: 'scene', quand: "pouvoir REPLI : le corps se replie et s'epaissit d'un coup", niveau: -11, duree: 0.42, hauteur: 'aucune',
    garde: { fusion: 0.5, plafond: 1, usure: 0 }, esquive: 0.2,
    couches: [
      /* deux verrous metalliques, puis un accord de puissance re-la qui se pose */
      { src: 'bruit', bruit: 'metal', vitesse: 2.2, notes: ['D5', 'D5'], temps: [0, 0.07], suit: false, filtre: { type: 'bandpass', f: 2200, q: 2.5 }, env: { a: 0.001, h: 0, d: 0.04, c: 0.8 } },
      { src: 'osc', onde: 'sawtooth', notes: ['D4', 'A4'], ecart: 0, retard: 0.12, filtre: { type: 'lowpass', f: 1800, q: 1, vers: 700, duree: 0.3 }, env: { a: 0.004, h: 0.05, d: 0.25, c: 0.7 } },
      { src: 'osc', onde: 'doux25', note: 'D5', retard: 0.12, env: { a: 0.004, h: 0.03, d: 0.22, c: 0.45 } }
    ]
  };

  S.pouvoirPret = {
    classe: 'joueuse', appel: 'module', quand: 'le pouvoir est recharge : bip discret', niveau: -18, duree: 0.13, hauteur: 'aucune',
    garde: { fusion: 0.5, plafond: 1, usure: 0 }, esquive: 0,
    couches: [
      { src: 'osc', onde: 'doux25', notes: ['D6', 'D6'], temps: [0, 0.075], legato: true, env: { a: 0.002, h: 0.012, d: 0.045, c: 1 } }
    ]
  };

  S.ultimePret = {
    classe: 'joueuse', appel: 'scene', quand: "l'APOGEE est pleine (la premiere fois avec son geste)", niveau: -10, duree: 0.9, hauteur: 'aucune',
    garde: { fusion: 1, plafond: 1, usure: 0 }, esquive: 0.22,
    couches: [
      { src: 'osc', onde: 'pulse25', notes: ['D5', 'A5', 'D6'], ecart: 0.06, filtre: { type: 'lowpass', f: 3000, q: 0.8 }, env: { a: 0.003, h: 0.02, d: 0.16, c: 0.6 } },
      { src: 'osc', onde: 'triangle', notes: ['D5', 'A5', 'F6'], ecart: 0, retard: 0.18, vibrato: { f: 5.5, c: 15, retard: 0.2 }, env: { a: 0.08, h: 0.3, d: 0.35, c: 0.7 } },
      { src: 'bruit', bruit: 'blanc', filtre: { type: 'bandpass', f: 900, q: 1.3, vers: 3500, duree: 0.5 }, env: { a: 0.3, h: 0, d: 0.3, c: 0.3 } }
    ]
  };

  S.ultime = {
    classe: 'joueuse', appel: 'scene', quand: "l'APOGEE part : six anneaux, le monde ralentit (la musique plonge, accent a part)", niveau: -3, duree: 1.1, hauteur: 'aucune',
    garde: { fusion: 1, plafond: 1, usure: 0 }, esquive: 0.6,
    couches: [
      /* le souffle qui balaie du haut vers le bas, l'accord de puissance sature, la gerbe d'arpege qui retombe */
      { src: 'bruit', bruit: 'blanc', filtre: { type: 'lowpass', f: 6000, q: 0.8, vers: 600, duree: 0.8 }, env: { a: 0.003, h: 0.05, d: 0.9, c: 1 } },
      { src: 'osc', onde: 'sawtooth', notes: ['A3', 'D4', 'A4'], ecart: 0, glisse: -2, gduree: 0.8, sature: 3, filtre: { type: 'lowpass', f: 2200, q: 1.2, vers: 500, duree: 0.8 }, env: { a: 0.004, h: 0.1, d: 0.8, c: 0.7 } },
      { src: 'osc', onde: 'pulse25', notes: ['D6', 'A5', 'F5', 'D5', 'A4'], ecart: 0.045, filtre: { type: 'lowpass', f: 3200, q: 0.8 }, env: { a: 0.002, h: 0, d: 0.12, c: 0.45 } },
      { src: 'osc', onde: 'sine', note: 'D2', vers: 'A1', gduree: 0.6, env: { a: 0.003, h: 0.05, d: 0.6, c: 0.25 } }
    ]
  };

  S.lasso = {
    classe: 'joueuse', appel: 'scene', quand: 'LASSO referme : un accord de n notes, n = ennemis enfermes (opts.pitch, 2 a 8)', niveau: -8, duree: 0.6,
    hauteur: 'nombre', pitchMin: 2, pitchMax: 8,
    garde: { fusion: 0.3, plafond: 1, usure: 0 }, esquive: 0.3,
    couches: [
      /* l'accord egrene de bas en haut, plus il y a de proies, plus il monte et s'etoffe */
      { src: 'osc', onde: 'triangle', notes: ['D5', 'F5', 'G5', 'A5', 'C6', 'D6', 'F6', 'G6'], ecart: 0.028, env: { a: 0.003, h: 0.04, d: 0.4, c: 0.55 } },
      { src: 'osc', onde: 'doux12', notes: ['D5', 'F5', 'G5', 'A5', 'C6', 'D6', 'F6', 'G6'], ecart: 0.028, env: { a: 0.002, h: 0, d: 0.12, c: 0.35 } },
      { src: 'bruit', bruit: 'blanc', filtre: { type: 'bandpass', f: 1200, q: 1, vers: 2800, duree: 0.2 }, env: { a: 0.02, h: 0, d: 0.2, c: 0.35 } }
    ]
  };

  S.fermable = {
    classe: 'joueuse', appel: 'module', quand: 'la tete arrive a 14 px d\'un point refermable : petit tic', niveau: -18, duree: 0.03, frequent: true, hauteur: 'aucune',
    garde: { fusion: 0.25, plafond: 1, usure: 0.3 }, esquive: 0,
    couches: [
      { src: 'osc', onde: 'triangle', note: 'D6', env: { a: 0.001, h: 0.004, d: 0.022, c: 1 } }
    ]
  };

  S.vie = {
    classe: 'joueuse', appel: 'scene', quand: 'VIE + 1 : la pastille de vie nait', niveau: -10, duree: 0.6, hauteur: 'aucune',
    garde: { fusion: 1, plafond: 1, usure: 0 }, esquive: 0.25,
    couches: [
      /* la petite ritournelle de la vie gagnee : fa la do fa, puis la (fa majeur, dans re mineur) */
      { src: 'osc', onde: 'pulse25', notes: ['F5', 'A5', 'C6', 'F6', 'A6'], temps: [0, 0.07, 0.14, 0.21, 0.3], filtre: { type: 'lowpass', f: 3400, q: 0.7 }, env: { a: 0.002, h: 0.03, d: 0.12, c: 0.55 } },
      { src: 'osc', onde: 'triangle', notes: ['F5', 'A5', 'C6', 'F6', 'A6'], temps: [0, 0.07, 0.14, 0.21, 0.3], env: { a: 0.002, h: 0.03, d: 0.26, c: 0.6 } }
    ]
  };

  S.porte = {
    classe: 'joueuse', appel: 'module', quand: "LE VOL : une porte traversee ; monte d'un degre par porte (opts.pitch)", niveau: -12, duree: 0.22,
    hauteur: 'penta', pitchMax: 12,
    garde: { fusion: 0.1, plafond: 2, usure: 0 }, esquive: 0.1,
    couches: [
      { src: 'osc', onde: 'triangle', note: 'D5', glisse: 2, gduree: 0.05, env: { a: 0.002, h: 0.02, d: 0.18, c: 1 } },
      { src: 'osc', onde: 'doux25', note: 'A5', env: { a: 0.002, h: 0, d: 0.08, c: 0.4 } },
      { src: 'bruit', bruit: 'blanc', filtre: { type: 'bandpass', f: 1500, q: 1.5, vers: 3000, duree: 0.12 }, env: { a: 0.01, h: 0, d: 0.12, c: 0.3 } }
    ]
  };

  S.devore = {
    classe: 'joueuse', appel: 'scene', quand: "INVERSION : une proie devoree ; monte d'un degre par proie (opts.pitch)", niveau: -9, duree: 0.2,
    hauteur: 'penta', pitchMax: 12,
    garde: { fusion: 0.05, plafond: 3, usure: 0 }, esquive: 0.2,
    couches: [
      /* le « gloup » qui remonte d'une octave en 0,12 s (hommage aux fantomes manges de Pac-Man) */
      { src: 'osc', onde: 'pulse25', note: 'D4', glisse: 12, gduree: 0.12, filtre: { type: 'lowpass', f: 3500, q: 2 }, env: { a: 0.002, h: 0.06, d: 0.1, c: 1 } },
      { src: 'osc', onde: 'triangle', note: 'D5', glisse: 12, gduree: 0.12, env: { a: 0.002, h: 0.06, d: 0.1, c: 0.6 } }
    ]
  };

  /* ===================================================================================== */
  /* IMPACTS                                                                                 */
  /* ===================================================================================== */

  S.impact = {
    classe: 'impacts', appel: 'module', quand: 'un tir de la joueuse touche un ennemi sans le tuer', niveau: -14, duree: 0.05, frequent: true, hauteur: 'aucune', alea: 30, reserve: 3,
    garde: { fusion: 0.04, plafond: 3, usure: 0.4 }, esquive: 0,
    couches: [
      /* un « tk » sec dans les mediums : bruit pre-filtre + une pointe tonale */
      { src: 'bruit', bruit: 'medium', vitesse: 0.75, env: { a: 0.001, h: 0.01, d: 0.035, c: 1 } }
    ]
  };

  S.impactBoss = {
    classe: 'impacts', appel: 'module', quand: "un tir touche l'oeil ou une main du CYCLOPE (metallique)", niveau: -13, duree: 0.2, frequent: true, hauteur: 'aucune', alea: 20,
    garde: { fusion: 0.06, plafond: 2, usure: 0.4 }, esquive: 0,
    couches: [
      /* une cloche de fer : modulation de frequence inharmonique qui s'eteint vite */
      { src: 'osc', onde: 'sine', note: 'G5', mod: { ratio: 1.414, indice: 3, fin: 0.2, duree: 0.15 }, env: { a: 0.001, h: 0, d: 0.18, c: 1 } },
      { src: 'bruit', bruit: 'metal', vitesse: 3, filtre: { type: 'bandpass', f: 2600, q: 3 }, env: { a: 0.001, h: 0, d: 0.03, c: 0.6 } }
    ]
  };

  S.ricochet = {
    classe: 'impacts', appel: 'module', quand: 'un tir ricoche sur le blindage frontal de la TOURELLE', niveau: -16, duree: 0.16, frequent: true, hauteur: 'aucune', alea: 40,
    garde: { fusion: 0.08, plafond: 2, usure: 0.4 }, esquive: 0,
    couches: [
      /* le « ptiou » de la balle qui part en sifflant */
      { src: 'osc', onde: 'triangle', note: 'F6', vers: 'C6', gduree: 0.13, env: { a: 0.001, h: 0.01, d: 0.13, c: 1 } },
      { src: 'bruit', bruit: 'metal', vitesse: 4, filtre: { type: 'highpass', f: 1500, q: 0.7 }, env: { a: 0.001, h: 0, d: 0.015, c: 0.5 } }
    ]
  };

  S.kill = {
    classe: 'impacts', appel: 'scene', quand: "un ennemi detruit ; monte d'un degre de la pentatonique par palier de chaine (opts.pitch 0 a 9)", niveau: -2.2, duree: 0.24,
    hauteur: 'penta', pitchMax: 9, pente: -0.3, alea: 6,
    garde: { fusion: 0, plafond: 0, usure: 0 }, esquive: 0.3,
    couches: [
      /* « pok-crrr » : l'eclat tonal qui saute a l'octave (re 4 -> re 5 ; do 6 -> do 7 au palier 9), le
         grain sature qui tient 60 ms dans les mediums, l'eclat de bruit, le coup sourd */
      { src: 'osc', onde: 'doux25', note: 'D4', glisse: 12, gduree: 0.025, env: { a: 0.001, h: 0.09, d: 0.11, c: 1 } },
      { src: 'osc', onde: 'sawtooth', note: 'D4', glisse: 12, gduree: 0.025, suit: false, sature: 4, filtre: { type: 'lowpass', f: 2200, q: 1, vers: 900, duree: 0.15 }, env: { a: 0.001, h: 0.07, d: 0.08, c: 0.5 } },
      { src: 'bruit', bruit: 'medium', suit: false, env: { a: 0.001, h: 0.01, d: 0.06, c: 0.4 } },
      { src: 'osc', onde: 'triangle', note: 'D4', vers: 'D3', gduree: 0.09, suit: false, env: { a: 0.001, h: 0.03, d: 0.1, c: 0.45 } }
    ],
    /* aucun kill muet : un kill dans les 40 ms du precedent ne rejoue pas le corps, il AJOUTE cette note,
       un degre plus haut et 1 dB plus forte par kill empile (6 dB au plus), au moins 12 ms apres la
       precedente ; la hauteur cumulee (palier + rang) plafonne a 9 degres */
    pile: {
      fenetre: 0.04, ecartMin: 0.012, max: 12, dbParPas: 1, dbMax: 6, plafond: 9, niveau: -10,
      couches: [
        { src: 'osc', onde: 'doux25', note: 'A4', env: { a: 0.001, h: 0.008, d: 0.035, c: 1 } },
        { src: 'osc', onde: 'triangle', note: 'A4', glisse: 12, gduree: 0.015, env: { a: 0.001, h: 0.005, d: 0.03, c: 0.6 } }
      ]
    }
  };

  S.bigkill = {
    classe: 'impacts', appel: 'scene', quand: 'une elite detruite', niveau: -3, duree: 0.85, hauteur: 'aucune',
    garde: { fusion: 0.12, plafond: 2, usure: 0.5 }, esquive: 0.45,
    couches: [
      { src: 'bruit', bruit: 'blanc', filtre: { type: 'lowpass', f: 3200, q: 0.9, vers: 160, duree: 0.7 }, env: { a: 0.002, h: 0.03, d: 0.75, c: 1 } },
      { src: 'osc', onde: 'sawtooth', note: 'D4', vers: 'D2', gduree: 0.45, sature: 2.5, filtre: { type: 'lowpass', f: 1600, q: 1.2 }, env: { a: 0.002, h: 0.04, d: 0.5, c: 0.75 } },
      { src: 'osc', onde: 'pulse25', notes: ['A5', 'D5'], ecart: 0, filtre: { type: 'lowpass', f: 2500, q: 0.8 }, env: { a: 0.001, h: 0.02, d: 0.2, c: 0.5 } },
      { src: 'bruit', bruit: 'medium', retard: 0.1, env: { a: 0.002, h: 0, d: 0.25, c: 0.45 } }
    ]
  };

  S.crash = {
    classe: 'impacts', appel: 'scene', quand: "le RIVAL s'ecrase (CRASH !)", niveau: -3, duree: 0.7, hauteur: 'aucune',
    garde: { fusion: 0.3, plafond: 1, usure: 0 }, esquive: 0.45,
    couches: [
      /* tole froissee + moteur qui tombe : le crash de moto de Tron */
      { src: 'bruit', bruit: 'metal', vitesse: 1.6, filtre: { type: 'bandpass', f: 1800, q: 1.2, vers: 600, duree: 0.4 }, env: { a: 0.001, h: 0.05, d: 0.35, c: 1 } },
      { src: 'osc', onde: 'sawtooth', note: 'A4', vers: 'D3', gduree: 0.5, sature: 3, filtre: { type: 'lowpass', f: 1800, q: 2 }, env: { a: 0.002, h: 0.05, d: 0.55, c: 0.8 } },
      { src: 'bruit', bruit: 'blanc', filtre: { type: 'lowpass', f: 2500, q: 0.7, vers: 200, duree: 0.5 }, env: { a: 0.002, h: 0, d: 0.5, c: 0.6 } }
    ]
  };

  S.explosion = {
    classe: 'impacts', appel: 'scene', quand: 'une mine ou une charge explose (reactions en chaine, mines de queue)', niveau: -6, duree: 0.48, hauteur: 'aucune', alea: 60,
    garde: { fusion: 0.05, plafond: 2, usure: 0.5 }, esquive: 0.3,
    couches: [
      { src: 'bruit', bruit: 'blanc', filtre: { type: 'lowpass', f: 2600, q: 1, vers: 220, duree: 0.38 }, env: { a: 0.001, h: 0.02, d: 0.42, c: 1 } },
      { src: 'bruit', bruit: 'medium', env: { a: 0.001, h: 0, d: 0.12, c: 0.7 } },
      { src: 'osc', onde: 'triangle', note: 'D4', vers: 'D3', gduree: 0.2, env: { a: 0.001, h: 0.02, d: 0.22, c: 0.7 } }
    ]
  };

  S.colosseMort = {
    classe: 'impacts', appel: 'scene', quand: 'le CYCLOPE meurt : explosion, puis cadence majeure si bemol - do - re', niveau: -2, duree: 2.4, hauteur: 'aucune',
    eolien: true,
    garde: { fusion: 2, plafond: 1, usure: 0 }, esquive: 0.6,
    couches: [
      { src: 'bruit', bruit: 'blanc', filtre: { type: 'lowpass', f: 4000, q: 0.8, vers: 150, duree: 1.2 }, env: { a: 0.002, h: 0.1, d: 1.2, c: 1 } },
      { src: 'osc', onde: 'sawtooth', note: 'D3', vers: 'D1', gduree: 0.9, sature: 3, filtre: { type: 'lowpass', f: 1400, q: 1 }, env: { a: 0.002, h: 0.1, d: 0.8, c: 0.6 } },
      /* la cadence, en cuivres de puce : sib majeur (1/8), do majeur (1/8), puis re a vide, tenu */
      { src: 'osc', onde: 'pulse25', notes: ['Bb4', 'D5', 'F5'], ecart: 0, retard: 0.55, filtre: { type: 'lowpass', f: 2800, q: 0.8 }, env: { a: 0.004, h: 0.18, d: 0.08, c: 0.42 } },
      { src: 'osc', onde: 'pulse25', notes: ['C5', 'E5', 'G5'], ecart: 0, retard: 0.811, filtre: { type: 'lowpass', f: 2800, q: 0.8 }, env: { a: 0.004, h: 0.18, d: 0.08, c: 0.42 } },
      { src: 'osc', onde: 'pulse25', notes: ['D5', 'A5', 'D6'], ecart: 0, retard: 1.072, vibrato: { f: 5.5, c: 14, retard: 0.3 }, filtre: { type: 'lowpass', f: 3000, q: 0.8 }, env: { a: 0.004, h: 0.5, d: 0.75, c: 0.48 } },
      { src: 'osc', onde: 'triangle', notes: ['D4', 'A4'], ecart: 0, retard: 1.072, env: { a: 0.004, h: 0.5, d: 0.8, c: 0.5 } }
    ]
  };

  /* ===================================================================================== */
  /* ENNEMIS ET ARENE : mediums reches                                                      */
  /* ===================================================================================== */

  S.tirEnnemi = {
    classe: 'ennemis', appel: 'module', quand: 'un ennemi tire (balle de tourelle, salve radiale du CYCLOPE)', niveau: -15, duree: 0.13, frequent: true, hauteur: 'aucune', alea: 25, reserve: 3,
    garde: { fusion: 0.05, plafond: 3, usure: 0.4 }, esquive: 0,
    couches: [
      /* « bzouw » : dent de scie resonante qui tombe, rien de commun avec le « piou » rond de la joueuse */
      { src: 'osc', onde: 'sawtooth', note: 'A4', vers: 'F4', gduree: 0.1, filtre: { type: 'lowpass', f: 1500, q: 5, vers: 700, duree: 0.11 }, env: { a: 0.004, h: 0.025, d: 0.1, c: 1 } }
    ]
  };

  S.arme = {
    classe: 'ennemis', appel: 'scene', quand: "debut d'un telegraphe : une signature d'armement par type (opts.type)", niveau: -17, duree: 0.6, hauteur: 'aucune', etirable: true,
    garde: { fusion: 0.06, plafond: 3, usure: 0.35 }, esquive: 0,
    /* par defaut (un type inconnu) : la signature « bond » */
    couches: null,
    alias: {
      fleche: 'bond', larve: 'bond', dard: 'verrouillage', tourelle: 'visee', sentinelle: 'laser', lame: 'recul',
      mine: 'meche', ruche: 'meche', rival: 'coupeRoute', cyclope: 'laser', convoi: 'recul', planeur: 'bond', traqueur: 'bond'
    },
    variantes: {
      bond: {
        quand: 'FLECHE (et LARVE) : se fige 0,6 s, puis bondit', niveau: -18, duree: 0.6,
        couches: [
          /* la corde qui se tend : une impulsion etroite qui monte, puis le declic du depart */
          { src: 'osc', onde: 'pulse12', note: 'G4', vers: 'D5', gduree: 0.52, filtre: { type: 'lowpass', f: 1600, q: 3 }, env: { a: 0.08, h: 0.38, d: 0.08, c: 0.8 } },
          { src: 'bruit', bruit: 'medium', retard: 0.54, env: { a: 0.001, h: 0, d: 0.03, c: 1 } }
        ]
      },
      verrouillage: {
        quand: 'DARD : verrouille 0,6 s, cible gelee', niveau: -17, duree: 0.66,
        couches: [
          /* bip-bip-bip qui se presse, puis la note de verrouillage, une quarte au-dessus */
          { src: 'osc', onde: 'pulse25', notes: ['A5', 'A5', 'A5', 'D6'], temps: [0, 0.22, 0.38, 0.5], legato: true, filtre: { type: 'lowpass', f: 2400, q: 1.5 }, env: { a: 0.002, h: 0.04, d: 0.03, c: 1 } }
        ]
      },
      visee: {
        quand: 'TOURELLE : vise 0,75 s (servo qui pivote)', niveau: -19, duree: 0.75,
        couches: [
          { src: 'osc', onde: 'sawtooth', note: 'D5', vibrato: { f: 11, c: 40 }, filtre: { type: 'bandpass', f: 900, q: 4, vers: 1500, duree: 0.7 }, env: { a: 0.1, h: 0.5, d: 0.12, c: 1 } }
        ]
      },
      laser: {
        quand: 'SENTINELLE (et RAYON du CYCLOPE) : le laser charge 0,85 s', niveau: -15, duree: 0.85,
        couches: [
          { src: 'osc', onde: 'sawtooth', note: 'A3', vers: 'A5', gduree: 0.8, filtre: { type: 'lowpass', f: 600, q: 4, vers: 3200, duree: 0.8 }, env: { a: 0.3, h: 0.48, d: 0.05, c: 1 } },
          { src: 'osc', onde: 'pulse12', note: 'A4', vers: 'A6', gduree: 0.8, filtre: { type: 'lowpass', f: 2600, q: 0.7 }, env: { a: 0.4, h: 0.38, d: 0.05, c: 0.35 } }
        ]
      },
      recul: {
        quand: 'LAME : recule 0,6 s pendant que son laser s\'allonge (lame qu\'on aiguise)', niveau: -16, duree: 0.62,
        couches: [
          { src: 'bruit', bruit: 'metal', vitesse: 2.5, filtre: { type: 'bandpass', f: 3000, q: 3, vers: 1100, duree: 0.55 }, env: { a: 0.05, h: 0.35, d: 0.2, c: 1 } },
          { src: 'osc', onde: 'sawtooth', note: 'F4', vers: 'D4', gduree: 0.55, filtre: { type: 'lowpass', f: 1300, q: 3 }, env: { a: 0.05, h: 0.35, d: 0.2, c: 0.55 } }
        ]
      },
      meche: {
        quand: "MINE (et RUCHE) : la meche de 0,8 s, dont le tic accelere", niveau: -16, duree: 0.82,
        couches: [
          { src: 'osc', onde: 'pulse12', notes: ['F5', 'F5', 'F5', 'F5', 'F5', 'F5', 'F5', 'A5'], temps: [0, 0.22, 0.4, 0.53, 0.63, 0.7, 0.75, 0.79], legato: true, filtre: { type: 'lowpass', f: 2200, q: 1 }, env: { a: 0.001, h: 0.01, d: 0.035, c: 1 } }
        ]
      },
      coupeRoute: {
        quand: 'RIVAL : le coupe-route, 0,5 s (le moteur rugit)', niveau: -14, duree: 0.52,
        couches: [
          { src: 'osc', onde: 'sawtooth', notes: ['D4', 'A4'], ecart: 0, glisse: 3, gduree: 0.45, mod: { ratio: 0.5, indice: 0.6, fin: 0.3, duree: 0.45 }, sature: 2.5, filtre: { type: 'lowpass', f: 1000, q: 2, vers: 1900, duree: 0.45 }, env: { a: 0.03, h: 0.3, d: 0.17, c: 1 } }
        ]
      }
    }
  };

  S.portail = {
    classe: 'ennemis', appel: 'scene', quand: "un portail s'ouvre : tic panoramise du cote de l'arrivee", niveau: -15, duree: 0.08, frequent: true, hauteur: 'aucune',
    garde: { fusion: 0.06, plafond: 2, usure: 0.4 }, esquive: 0,
    couches: [
      { src: 'osc', onde: 'pulse12', notes: ['A5', 'D6'], temps: [0, 0.04], legato: true, filtre: { type: 'lowpass', f: 2600, q: 1.2 }, env: { a: 0.001, h: 0.005, d: 0.03, c: 1 } }
    ]
  };

  S.traqueur = {
    classe: 'ennemis', appel: 'scene', quand: 'le TRAQUEUR arrive : sirene sur deux notes (la - re)', niveau: -9, duree: 0.92, hauteur: 'aucune',
    garde: { fusion: 2, plafond: 1, usure: 0 }, esquive: 0.25,
    couches: [
      { src: 'osc', onde: 'pulse25', notes: ['A5', 'D5', 'A5', 'D5'], temps: [0, 0.22, 0.44, 0.66], legato: true, vibrato: { f: 7, c: 25 }, filtre: { type: 'lowpass', f: 2600, q: 1 }, env: { a: 0.01, h: 0.15, d: 0.05, c: 1 } },
      { src: 'osc', onde: 'sawtooth', notes: ['A4', 'D4', 'A4', 'D4'], temps: [0, 0.22, 0.44, 0.66], legato: true, filtre: { type: 'lowpass', f: 1400, q: 2 }, env: { a: 0.01, h: 0.15, d: 0.05, c: 0.45 } }
    ]
  };

  S.convoi = {
    classe: 'ennemis', appel: 'scene', quand: 'un CONVOI est annonce : klaxon panoramise (deux coups)', niveau: -8, duree: 0.68, hauteur: 'aucune',
    garde: { fusion: 0.5, plafond: 2, usure: 0.2 }, esquive: 0.2,
    couches: [
      /* le klaxon de camion : trois dents de scie en accord serre, deux coups, le second qui tombe un peu */
      { src: 'osc', onde: 'sawtooth', notes: ['C4', 'F4', 'A4'], ecart: 0, filtre: { type: 'lowpass', f: 1700, q: 2 }, env: { a: 0.01, h: 0.13, d: 0.04, c: 0.7 } },
      { src: 'osc', onde: 'sawtooth', notes: ['C4', 'F4', 'A4'], ecart: 0, retard: 0.26, glisse: -1, gduree: 0.4, filtre: { type: 'lowpass', f: 1700, q: 2, vers: 1100, duree: 0.4 }, env: { a: 0.01, h: 0.28, d: 0.12, c: 0.7 } }
    ]
  };

  S.travelling = {
    classe: 'ennemis', appel: 'scene', quand: 'depart du TRAVELLING : le plateau avance (grondement)', niveau: -8, duree: 1.45, hauteur: 'aucune',
    garde: { fusion: 2, plafond: 1, usure: 0 }, esquive: 0.15,
    couches: [
      /* la machinerie qui s'ebranle : un grave sature qui monte ET un grincement medium, sinon un
         telephone n'entend rien */
      { src: 'osc', onde: 'sawtooth', note: 'D3', vers: 'A3', gduree: 1.0, sature: 3, filtre: { type: 'bandpass', f: 700, q: 0.8, vers: 1300, duree: 1 }, env: { a: 0.3, h: 0.6, d: 0.5, c: 1 } },
      { src: 'osc', onde: 'sawtooth', note: 'D2', vers: 'A2', gduree: 1.0, filtre: { type: 'lowpass', f: 500, q: 0.7 }, env: { a: 0.3, h: 0.6, d: 0.5, c: 0.3 } },
      { src: 'bruit', bruit: 'blanc', filtre: { type: 'bandpass', f: 650, q: 2.5, vers: 1000, duree: 1 }, env: { a: 0.35, h: 0.55, d: 0.5, c: 0.8 } },
      { src: 'bruit', bruit: 'metal', vitesse: 0.9, filtre: { type: 'bandpass', f: 1100, q: 4 }, env: { a: 0.4, h: 0.4, d: 0.5, c: 0.5 } }
    ]
  };

  S.warning = {
    classe: 'ennemis', appel: 'scene', quand: 'WARNING : le CYCLOPE arrive (corne entre 1,3 et 1,8 kHz, deux appels)', niveau: -3, duree: 1.4, hauteur: 'aucune',
    garde: { fusion: 3, plafond: 1, usure: 0 }, esquive: 0,
    couches: [
      /* la corne : la 6 (1760 Hz) qui tombe sur fa 6 (1397 Hz), deux fois, doublee a l'octave basse */
      { src: 'osc', onde: 'sawtooth', note: 'A6', vers: 'F6', gduree: 0.5, filtre: { type: 'lowpass', f: 3000, q: 1.5 }, env: { a: 0.02, h: 0.4, d: 0.15, c: 0.6 } },
      { src: 'osc', onde: 'sawtooth', note: 'A6', vers: 'F6', gduree: 0.5, retard: 0.68, filtre: { type: 'lowpass', f: 3000, q: 1.5 }, env: { a: 0.02, h: 0.45, d: 0.25, c: 0.6 } },
      { src: 'osc', onde: 'pulse25', note: 'A5', vers: 'F5', gduree: 0.5, filtre: { type: 'lowpass', f: 2000, q: 1 }, env: { a: 0.02, h: 0.4, d: 0.15, c: 0.5 } },
      { src: 'osc', onde: 'pulse25', note: 'A5', vers: 'F5', gduree: 0.5, retard: 0.68, filtre: { type: 'lowpass', f: 2000, q: 1 }, env: { a: 0.02, h: 0.45, d: 0.25, c: 0.5 } },
      { src: 'osc', onde: 'sawtooth', note: 'D3', sature: 2, filtre: { type: 'lowpass', f: 900, q: 1 }, env: { a: 0.05, h: 1.0, d: 0.3, c: 0.45 } }
    ]
  };

  /* ===================================================================================== */
  /* RESSOURCES : cloches                                                                    */
  /* ===================================================================================== */

  S.butin = {
    classe: 'ressources', appel: 'module', quand: "une cellule ramassee ; la serie monte d'une marche de l'hexatonique par ramassage dans les 1,2 s, jusqu'a l'octave (+12 demi-tons, N.R.son.butin), puis y tient",
    niveau: -15, duree: 0.16, frequent: true, hauteur: 'hexa', pitchMax: 6, reserve: 3,
    escalier: { fenetre: 1.2, max: 12 },
    garde: { fusion: 0.03, plafond: 3, usure: 0.25 }, esquive: 0,
    couches: [
      /* une clochette sur une seule voix (onde 'verre' : la douzieme fait le cristal), donc en reserve */
      { src: 'osc', onde: 'verre', note: 'D5', env: { a: 0.001, h: 0.012, d: 0.14, c: 1 } }
    ]
  };

  S.noyau = {
    classe: 'ressources', appel: 'scene', quand: 'un noyau ramasse : arpege de cloches', niveau: -11, duree: 0.48, hauteur: 'aucune',
    garde: { fusion: 0.1, plafond: 2, usure: 0.2 }, esquive: 0.15,
    couches: [
      { src: 'osc', onde: 'triangle', notes: ['D5', 'A5', 'D6', 'F6'], ecart: 0.06, env: { a: 0.001, h: 0.01, d: 0.25, c: 0.8 } },
      { src: 'osc', onde: 'sine', notes: ['A6', 'E6', 'A6', 'C7'], ecart: 0.06, env: { a: 0.001, h: 0, d: 0.1, c: 0.25 } }
    ]
  };

  S.pastille = {
    classe: 'ressources', appel: 'scene', quand: "la PASTILLE avalee : l'INVERSION commence (accord ouvert)", niveau: -9, duree: 0.85, hauteur: 'aucune',
    garde: { fusion: 1, plafond: 1, usure: 0 }, esquive: 0.3,
    couches: [
      /* re - la - mi : un accord de quintes, ouvert, ni triste ni majeur : la chasse change de camp */
      { src: 'osc', onde: 'triangle', notes: ['D5', 'A5', 'E6'], ecart: 0.02, vibrato: { f: 6, c: 12, retard: 0.15 }, env: { a: 0.002, h: 0.12, d: 0.6, c: 0.7 } },
      { src: 'osc', onde: 'sine', notes: ['D6', 'A6'], ecart: 0.02, env: { a: 0.002, h: 0.02, d: 0.25, c: 0.3 } },
      { src: 'osc', onde: 'doux25', notes: ['D4', 'A4'], ecart: 0, env: { a: 0.002, h: 0.05, d: 0.35, c: 0.45 } }
    ]
  };

  /* ===================================================================================== */
  /* DANGER : graves satures, avec composante medium                                        */
  /* ===================================================================================== */

  S.coupe = {
    classe: 'danger', appel: 'scene', quand: 'le corps est coupe (tir, lame, mine, larve, mur arriere)', niveau: -2, duree: 0.38, hauteur: 'aucune',
    garde: { fusion: 0.1, plafond: 2, usure: 0.3 }, esquive: 0.32,
    couches: [
      /* « tchak-rrr » : la lame (bruit sec), puis la chair (dent de scie saturee qui tombe d'une octave,
         tenue 60 ms pour peser), doublee d'une carree dans les mediums */
      { src: 'bruit', bruit: 'blanc', filtre: { type: 'bandpass', f: 1600, q: 1.4, vers: 900, duree: 0.07 }, env: { a: 0.001, h: 0.015, d: 0.06, c: 0.55 } },
      { src: 'osc', onde: 'sawtooth', note: 'A3', vers: 'A2', gduree: 0.25, sature: 5, filtre: { type: 'bandpass', f: 1100, q: 0.7, vers: 500, duree: 0.3 }, env: { a: 0.002, h: 0.12, d: 0.24, c: 1.1 } },
      { src: 'osc', onde: 'square', note: 'A4', vers: 'D4', gduree: 0.14, filtre: { type: 'lowpass', f: 1800, q: 1 }, env: { a: 0.001, h: 0.1, d: 0.12, c: 0.7 } },
      { src: 'osc', onde: 'sine', note: 'D3', vers: 'D2', gduree: 0.2, env: { a: 0.002, h: 0.02, d: 0.2, c: 0.25 } }
    ]
  };

  S.mort = {
    classe: 'danger', appel: 'scene', quand: "la mort : apres la coupure net de la musique, glissando carre descendant d'une octave et demie en 0,9 s", niveau: -2, duree: 1.15, hauteur: 'aucune',
    garde: { fusion: 1, plafond: 1, usure: 0 }, esquive: 0,
    couches: [
      /* le glissando de Pac-Man, en wah-wah : la 5 vers re 4 (19 demi-tons), vibrato qui s'elargit */
      { src: 'osc', onde: 'square', note: 'A5', vers: 'D4', gduree: 0.9, vibrato: { f: 9, c: 60 }, filtre: { type: 'lowpass', f: 2600, q: 1.5, vers: 900, duree: 0.9 }, env: { a: 0.003, h: 0.6, d: 0.45, c: 0.75 } },
      { src: 'osc', onde: 'sawtooth', note: 'A4', vers: 'D3', gduree: 0.9, sature: 3, filtre: { type: 'lowpass', f: 1200, q: 2 }, env: { a: 0.003, h: 0.5, d: 0.5, c: 0.6 } },
      { src: 'bruit', bruit: 'blanc', filtre: { type: 'bandpass', f: 1200, q: 1, vers: 400, duree: 0.25 }, env: { a: 0.001, h: 0.01, d: 0.25, c: 0.8 } },
      { src: 'osc', onde: 'sine', note: 'D3', vers: 'D2', gduree: 0.3, env: { a: 0.002, h: 0.02, d: 0.3, c: 0.6 } }
    ]
  };

  S.gameover = {
    classe: 'danger', appel: 'scene', quand: 'GAME OVER : jingle de quatre notes sur le temps (croches au tempo de la piste)', niveau: -6, duree: 1.75, hauteur: 'aucune',
    garde: { fusion: 3, plafond: 1, usure: 0 }, esquive: 0,
    couches: [
      /* la - sol - fa - re, la derniere tenue : la cadence descendante qui ferme la partie */
      { src: 'osc', onde: 'pulse25', notes: ['A4', 'G4', 'F4'], ecart: '1/8', filtre: { type: 'lowpass', f: 2200, q: 1 }, env: { a: 0.004, h: 0.12, d: 0.12, c: 0.8 } },
      { src: 'osc', onde: 'sawtooth', notes: ['A3', 'G3', 'F3'], ecart: '1/8', sature: 2, filtre: { type: 'lowpass', f: 1300, q: 1.5 }, env: { a: 0.004, h: 0.12, d: 0.12, c: 0.55 } },
      { src: 'osc', onde: 'pulse25', note: 'D4', retard: '3/8', vibrato: { f: 5, c: 20, retard: 0.3 }, filtre: { type: 'lowpass', f: 2000, q: 1, vers: 700, duree: 0.9 }, env: { a: 0.004, h: 0.4, d: 0.55, c: 0.85 } },
      { src: 'osc', onde: 'sawtooth', notes: ['D3', 'A3'], ecart: 0, retard: '3/8', sature: 2, filtre: { type: 'lowpass', f: 1100, q: 1.5 }, env: { a: 0.004, h: 0.4, d: 0.55, c: 0.55 } }
    ]
  };

  S.battement = {
    classe: 'danger', appel: 'module', quand: 'danger proche : un lub-dub (joue a 1 Hz, deux fois plus vite au plus pres)', niveau: -10, duree: 0.3, hauteur: 'aucune',
    garde: { fusion: 0.2, plafond: 1, usure: 0 }, esquive: 0,
    couches: [
      /* lub (re), dub (do, un ton dessous, plus doux) : le coeur porte dans les mediums par la saturation */
      { src: 'osc', onde: 'sawtooth', notes: ['D4', 'C4'], temps: [0, 0.16], vers: 'A3', gduree: 0.05, sature: 4, filtre: { type: 'bandpass', f: 800, q: 0.9 }, env: { a: 0.002, h: 0.015, d: 0.07, c: 1 } },
      { src: 'osc', onde: 'triangle', notes: ['D3', 'C3'], temps: [0, 0.16], vers: 'A2', gduree: 0.06, env: { a: 0.002, h: 0.01, d: 0.08, c: 0.4 } },
      { src: 'bruit', bruit: 'medium', notes: ['D4', 'D4'], temps: [0, 0.16], suit: false, env: { a: 0.002, h: 0, d: 0.03, c: 0.4 } }
    ]
  };

  /* ===================================================================================== */
  /* RECOMPENSES                                                                             */
  /* ===================================================================================== */

  S.palier = {
    classe: 'recompenses', appel: 'scene', quand: "palier de multiplicateur atteint (×2 a ×8) : accord majeur qui monte d'un degre par palier (opts.pitch 0 a 6)",
    niveau: -10, duree: 0.34, hauteur: 'penta', pitchMax: 6,
    garde: { fusion: 0.15, plafond: 1, usure: 0 }, esquive: 0.15,
    couches: [
      { src: 'osc', onde: 'pulse25', notes: ['F5', 'A5', 'C6'], ecart: 0.025, filtre: { type: 'lowpass', f: 3200, q: 0.8 }, env: { a: 0.002, h: 0.04, d: 0.18, c: 0.55 } },
      { src: 'osc', onde: 'triangle', notes: ['F5', 'A5', 'C6'], ecart: 0.025, env: { a: 0.002, h: 0.06, d: 0.25, c: 0.5 } }
    ]
  };

  S.levelup = {
    classe: 'recompenses', appel: 'scene', quand: "montee de niveau : arpege majeur (fa la do fa la)", niveau: -9, duree: 0.75, hauteur: 'aucune',
    garde: { fusion: 0.5, plafond: 1, usure: 0 }, esquive: 0.25,
    couches: [
      { src: 'osc', onde: 'pulse25', notes: ['F4', 'A4', 'C5', 'F5', 'A5'], ecart: '1/32', filtre: { type: 'lowpass', f: 3000, q: 0.8 }, env: { a: 0.002, h: 0.02, d: 0.1, c: 0.5 } },
      { src: 'osc', onde: 'triangle', notes: ['F5', 'A5', 'C6', 'F6'], ecart: 0, retard: '5/32', vibrato: { f: 6, c: 12, retard: 0.15 }, env: { a: 0.005, h: 0.2, d: 0.35, c: 0.45 } }
    ]
  };

  S.carte = {
    classe: 'recompenses', appel: 'scene', quand: "l'ecran des cartes s'ouvre (quinte aerienne qui s'allume)", niveau: -14, duree: 0.65, hauteur: 'aucune',
    garde: { fusion: 0.5, plafond: 1, usure: 0 }, esquive: 0,
    couches: [
      { src: 'osc', onde: 'triangle', notes: ['D5', 'A5', 'D6'], ecart: 0.05, vibrato: { f: 5, c: 10 }, env: { a: 0.03, h: 0.15, d: 0.4, c: 0.6 } },
      { src: 'bruit', bruit: 'blanc', filtre: { type: 'bandpass', f: 1500, q: 2, vers: 3500, duree: 0.4 }, env: { a: 0.15, h: 0, d: 0.3, c: 0.25 } }
    ]
  };

  S.choix = {
    classe: 'recompenses', appel: 'scene', quand: 'une carte choisie (validation)', niveau: -12, duree: 0.3, hauteur: 'aucune',
    garde: { fusion: 0.2, plafond: 1, usure: 0 }, esquive: 0.1,
    couches: [
      { src: 'osc', onde: 'doux25', notes: ['D6', 'A6'], ecart: 0.05, env: { a: 0.002, h: 0.02, d: 0.06, c: 0.6 } },
      { src: 'osc', onde: 'triangle', notes: ['A5', 'D6'], ecart: 0, retard: 0.05, env: { a: 0.002, h: 0.03, d: 0.18, c: 0.55 } }
    ]
  };

  S.vague = {
    classe: 'recompenses', appel: 'scene', quand: 'VAGUE NETTOYEE : « ta-daa » de cuivres de puce (le stinger musical suit sur la barre)', niveau: -8, duree: 0.85, hauteur: 'aucune',
    garde: { fusion: 1, plafond: 1, usure: 0 }, esquive: 0.25,
    couches: [
      /* do majeur bref, puis re a vide qui sonne : le bVII - i des hymnes d'arcade */
      { src: 'osc', onde: 'sawtooth', notes: ['C5', 'E5', 'G5'], ecart: 0, filtre: { type: 'lowpass', f: 2400, q: 1 }, env: { a: 0.006, h: 0.08, d: 0.05, c: 0.4 } },
      { src: 'osc', onde: 'sawtooth', notes: ['D5', 'A5', 'D6'], ecart: 0, retard: '1/16', vibrato: { f: 5.5, c: 12, retard: 0.2 }, filtre: { type: 'lowpass', f: 2600, q: 1, vers: 1400, duree: 0.6 }, env: { a: 0.006, h: 0.25, d: 0.45, c: 0.42 } },
      { src: 'osc', onde: 'triangle', notes: ['D4', 'A4'], ecart: 0, retard: '1/16', env: { a: 0.006, h: 0.25, d: 0.45, c: 0.5 } }
    ]
  };

  S.defi = {
    classe: 'recompenses', appel: 'scene', quand: 'un defi reussi (et DEFILE PARFAIT, VOL PARFAIT)', niveau: -10, duree: 0.55, hauteur: 'aucune',
    garde: { fusion: 0.3, plafond: 1, usure: 0 }, esquive: 0.2,
    couches: [
      /* la piece qui tinte : quarte puis quinte, la derniere qui sonne */
      { src: 'osc', onde: 'pulse25', notes: ['A5', 'D6', 'A6'], temps: [0, 0.06, 0.12], legato: true, filtre: { type: 'lowpass', f: 3500, q: 0.8 }, env: { a: 0.002, h: 0.03, d: 0.03, c: 0.5 } },
      { src: 'osc', onde: 'triangle', notes: ['A5', 'D6', 'A6'], temps: [0, 0.06, 0.12], env: { a: 0.002, h: 0.04, d: 0.35, c: 0.6 } }
    ]
  };

  S.defiRate = {
    classe: 'recompenses', appel: 'scene', quand: 'un defi rate : deux notes qui descendent, sans moquerie', niveau: -14, duree: 0.45, hauteur: 'aucune',
    garde: { fusion: 0.3, plafond: 1, usure: 0 }, esquive: 0.1,
    couches: [
      { src: 'osc', onde: 'triangle', notes: ['F5', 'D5'], temps: [0, 0.14], env: { a: 0.004, h: 0.06, d: 0.25, c: 0.8 } },
      { src: 'osc', onde: 'doux12', notes: ['F4', 'D4'], temps: [0, 0.14], env: { a: 0.004, h: 0.06, d: 0.2, c: 0.5 } }
    ]
  };

  S.record = {
    classe: 'recompenses', appel: 'scene', quand: 'NOUVEAU RECORD : fanfare (re re re la, puis accord de fa majeur tenu)', niveau: -7, duree: 1.4, hauteur: 'aucune',
    garde: { fusion: 2, plafond: 1, usure: 0 }, esquive: 0.3,
    couches: [
      { src: 'osc', onde: 'pulse25', notes: ['D5', 'D5', 'D5', 'A5'], temps: [0, '1/16', '1/8', '3/16'], legato: true, filtre: { type: 'lowpass', f: 3000, q: 0.8 }, env: { a: 0.003, h: 0.05, d: 0.04, c: 0.6 } },
      { src: 'osc', onde: 'sawtooth', notes: ['F5', 'A5', 'C6', 'F6'], ecart: 0, retard: '1/4', vibrato: { f: 5.5, c: 14, retard: 0.25 }, filtre: { type: 'lowpass', f: 2800, q: 1, vers: 1500, duree: 1 }, env: { a: 0.006, h: 0.5, d: 0.55, c: 0.32 } },
      { src: 'osc', onde: 'triangle', notes: ['F4', 'C5'], ecart: 0, retard: '1/4', env: { a: 0.006, h: 0.5, d: 0.6, c: 0.5 } }
    ]
  };

  /* ===================================================================================== */
  /* INTERFACE                                                                               */
  /* ===================================================================================== */

  S.bip = {
    classe: 'interface', appel: 'module', quand: 'une lettre qui s\'ecrit, une ligne de bonus comptee (carre a 12,5 %, 30 ms)', niveau: -18, duree: 0.03, frequent: true,
    hauteur: 'penta', cycle: 5,
    garde: { fusion: 0.03, plafond: 2, usure: 0.3 }, esquive: 0,
    couches: [
      { src: 'osc', onde: 'pulse12', note: 'A5', filtre: { type: 'lowpass', f: 3000, q: 0.7 }, env: { a: 0.001, h: 0.018, d: 0.01, c: 1 } }
    ]
  };

  S.clic = {
    classe: 'interface', appel: 'module', quand: 'un bouton touche, un choix de menu', niveau: -15, duree: 0.03, frequent: true, hauteur: 'aucune',
    garde: { fusion: 0.04, plafond: 1, usure: 0.2 }, esquive: 0,
    couches: [
      { src: 'osc', onde: 'doux25', note: 'A5', vers: 'D5', gduree: 0.012, env: { a: 0.001, h: 0.008, d: 0.02, c: 1 } },
      { src: 'bruit', bruit: 'medium', env: { a: 0.001, h: 0, d: 0.006, c: 0.4 } }
    ]
  };

  /* la signature par defaut d'`arme` : celle du bond */
  S.arme.couches = S.arme.variantes.bond.couches;

  /* ===================================================================================== */
  /* CALIBRAGE — ecrit par tools/sons/mesure.mjs --calibrer ; ne pas retoucher a la main     */
  /* (facteur de gain qui amene la crete mesuree du son sur son `niveau`)                    */
  /* ===================================================================================== */
  /* CALIBRAGE-DEBUT */
  var CALIBRAGE = {
    "tir": 0.2867,
    "tir.lance": 0.2838,
    "tir.rayon": 0.1122,
    "tir.arc": 0.2057,
    "tir.missile": 0.1941,
    "tir.mine": 0.13,
    "salve": 0.1413,
    "boostOn": 0.2881,
    "boostOff": 0.1528,
    "boostPanne": 0.1932,
    "traversee": 0.1533,
    "ralenti": 0.193,
    "repli": 0.1799,
    "pouvoirPret": 0.1259,
    "ultimePret": 0.1542,
    "ultime": 0.2156,
    "lasso": 0.3412,
    "fermable": 0.1291,
    "vie": 0.2958,
    "porte": 0.1881,
    "devore": 0.1986,
    "impact": 0.2388,
    "impactBoss": 0.2296,
    "ricochet": 0.1291,
    "kill": 0.4847,
    "kill.pile": 0.2066,
    "bigkill": 0.4232,
    "crash": 0.4903,
    "explosion": 0.43,
    "colosseMort": 0.4477,
    "tirEnnemi": 0.1356,
    "arme": 0.1484,
    "arme.bond": 0.1323,
    "arme.verrouillage": 0.121,
    "arme.visee": 0.2729,
    "arme.laser": 0.1366,
    "arme.recul": 0.1903,
    "arme.meche": 0.1594,
    "arme.coupeRoute": 0.07186,
    "portail": 0.1843,
    "traqueur": 0.2366,
    "convoi": 0.169,
    "travelling": 0.2506,
    "warning": 0.5064,
    "butin": 0.1779,
    "noyau": 0.267,
    "pastille": 0.1677,
    "coupe": 0.43,
    "mort": 0.3724,
    "gameover": 0.2748,
    "battement": 0.2421,
    "palier": 0.1736,
    "levelup": 0.2099,
    "carte": 0.1122,
    "choix": 0.183,
    "vague": 0.263,
    "defi": 0.3631,
    "defiRate": 0.2138,
    "record": 0.2624,
    "bip": 0.1244,
    "clic": 0.1778
  };
  /* CALIBRAGE-FIN */

  var ORDRE = ['tir', 'salve', 'boostOn', 'boostOff', 'boostPanne', 'traversee', 'ralenti', 'repli', 'pouvoirPret', 'ultimePret',
    'ultime', 'lasso', 'fermable', 'vie', 'porte', 'devore',
    'impact', 'impactBoss', 'ricochet', 'kill', 'bigkill', 'crash', 'explosion', 'colosseMort',
    'tirEnnemi', 'arme', 'portail', 'traqueur', 'convoi', 'travelling', 'warning',
    'butin', 'noyau', 'pastille',
    'coupe', 'mort', 'gameover', 'battement',
    'palier', 'levelup', 'carte', 'choix', 'vague', 'defi', 'defiRate', 'record',
    'bip', 'clic'];

  var BANQUE = {
    version: 1,
    tonalite: TONALITE,
    pans: PANS,
    classes: CLASSES,
    sons: S,
    ordre: ORDRE,
    calibrage: CALIBRAGE,
    /* la position de panoramique (une des sept) d'une source a l'abscisse x de l'ecran, de 0 a largeur */
    pan: function (x, largeur, portrait) {
      var u = largeur > 0 ? (x / largeur) * 2 - 1 : 0;
      if (u < -1) u = -1; else if (u > 1) u = 1;
      var i = Math.round((u + 1) * 3);
      var p = PANS[i < 0 ? 0 : i > 6 ? 6 : i];
      return portrait ? p * 0.5 : p;
    }
  };

  if (typeof module === 'object' && module && module.exports) module.exports = BANQUE;
  if (racine) racine.SONS_2975 = BANQUE;
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
