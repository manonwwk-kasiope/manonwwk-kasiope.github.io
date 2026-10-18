/* ===== 02-regles.js — N.R, la source unique des chiffres du jeu =====

   Contrat 1.0 (CONTRAT.md). TOUS les chiffres de REFONTE.md (§ 2 à 5, plus le temps, la performance,
   les cibles des pilotes et les seuils des critères R) vivent ici, et nulle part ailleurs. N.R est
   gelé en profondeur : un module le LIT, il ne l'écrit jamais. Un chiffre qui manque s'ajoute dans un
   objet local marqué « // → N.R » et se demande au gardien (refonte/lots/demandes.md).

   Conventions (REFONTE.md, « Unités et conventions ») :
     - distances en px de jeu (pixels du tampon) ; « pt » = point CSS ;
     - durées en SECONDES DE TEMPS DE JEU ; un gel « en images » est en images de référence de 1/60 s
       (champ suffixé « Images ») ;
     - angles en degrés quand le champ finit par « Deg », sinon en radians ;
     - les segments sont numérotés à partir de 0 (la tête est le segment 0) ;
     - une proportion est entre 0 et 1 ;
     - « valeur du gardien » : un chiffre que le plan ne donne pas, fixé ici pour que personne n'ait à
       l'inventer ; le lot 9 le règle comme les autres.
   Propriétaire : le gardien du contrat pendant les phases 1 et 2, puis le lot 9 au réglage. */
(function () {
  'use strict';
  var N = (typeof window !== 'undefined') ? (window.__N || (window.__N = {}))
    : (typeof globalThis !== 'undefined' ? (globalThis.__N || (globalThis.__N = {})) : {});

  var BPM = 144.6;

  var R = {
    version: '1.0',

    /* ---------------------------------------------------------------- § 7.2 le temps */
    temps: {
      h: 1 / 120,                 // pas fixe de simulation
      pasMax: 4,                  // au plus 4 pas par image ; le reste passe à l'image suivante
      imageRef: 1 / 60,           // une « image » de gel = 1/60 s de temps réel
      bpm: BPM,                   // grille musicale de jeu
      tempsParMesure: 4,
      dureeTemps: 60 / BPM,       // 0,4149 s
      dureeMesure: 240 / BPM      // 1,6598 s
    },

    /* ---------------------------------------------------------------- § 3.1, § 3.2 le monde */
    monde: {
      W: 1024, H: 512,
      ecransEnviron: { paysage: [2.4, 2.6] },              // le monde fait environ 2,4 × 2,6 écrans en paysage
      vues: { paysage: [422, 195], portrait: [195, 422], bureau: [360, 225] },
      aireVue: 82000,                                      // px², la même aire dans les trois cas
      plateau: { pasPoints: 16, lignesTrame: 0.25 },       // intersections indigo tous les 16 px, lignes violet tramé 25 %
      mur: { epaisseur: 3, alerte: 24 },                   // bande hachurée de 3 px ; alerte de proximité à 24 px
      mobile: { glissementMin: 2, annonceVoyage: 2 },      // les murs glissent en 2 s au moins ; voyage annoncé 2 s avant
      arenaCyclope: { w: 448, h: 256, duree: 3.0, marge: 80, resserre: 0.15, resserreDuree: 2 },
      travelling: { largeur: 576, hauteur: 512 }
    },

    /* ---------------------------------------------------------------- § 2.1 le mouvement */
    joueuse: {
      dz: 0.12,                   // zone morte du manche, part de la course
      courseCSS: 44,              // course du manche en px CSS (zone morte : 5 px CSS)
      dzCSS: 5,
      rayonVirage: 11,            // taux de virage max = V / 11 rad/s
      deflexion: { min: 0.12, pleine: 0.70 },   // taux proportionnel entre 0,12 et 0,70 de course, plein au-delà
      reference: { vitesse: 68, tauxVirage: 6.2, quartDeTour: 0.253 },   // repères : 6,2 rad/s à 68 px/s, quart de tour en 253 ms
      latenceImages: 1,
      deriveMaxDeg: 2,            // doigt levé : cap et vitesse conservés, dérive < 2°
      chevron: { ecartDeg: 20, taille: 7 },
      souris: { seuil: 24, masqueApres: 1.5 },
      gaine: 1,
      rayonTete: 3,               // rayon qui tue
      spriteTete: 13,
      partLargeurTete: 0.46,      // 3 px sur 13 : 46 % de la largeur (G-15)
      vitesse: { v1: 68, v2: 72, v3: 76, defile: 76, v4: 80, v5: 84, cyclope: 86, cyclopeEnrage: 90 }
    },

    /* ---------------------------------------------------------------- § 2.2 l'accélération */
    boost: {
      seuilCourse: 0.85,          // au pouce : manche au-delà de 0,85 de sa course…
      ecartDeg: 15,               // …et cap visé à moins de 15° du cap réel…
      maintien: 0.12,             // …pendant 120 ms
      doigtTenu: 0.18,            // second doigt tenu plus de 180 ms
      coupureDeg: 30,             // suspendue au-delà de 30° d'écart…
      retourImages: 4,            // …retour à la croisière en 4 images
      repriseDeg: 15,             // reprend seule sous 15° si le geste est tenu
      facteur: 1.6,
      reserve: 100,
      conso: 35,                  // par seconde (2,9 s d'accélération)
      autonomie: 2.9,
      recharge: 22,               // par seconde…
      delaiRecharge: 0.4,         // …après 0,4 s sans accélérer
      panne: 2,                   // sous 2 points : panne franche, un seul son
      reprise: 25,                // reprend seule à 25 points…
      reappui: 10,                // …ou sur un nouvel appui à partir de 10
      basculesMax: 2,             // un appui tenu : au plus 2 bascules marche/arrêt
      monteeImages: 7, monteePart: 0.95,   // 95 % de la vitesse en 7 images
      jauge: { arcDeg: 270, epaisseur: 1, alerte: 0.20 },   // ambre, brasier sous 20 % ; visible si non pleine
      sillage: { distance: 40, facteur: 1.4 }               // derrière le dernier wagon : gratuit, × 1,4
    },

    /* ---------------------------------------------------------------- § 2.3 la mort */
    mort: {
      rayonTete: 3,
      mur: { grace: 0.06, cosInterieur: 0.2, alerte: 24 },
      morsure: { segMin: 6, derniersFermant: 3, rayonSegment: 3.5, rayon: 5.5, longueurSure: 9,   // 3 + 3,5 − 1 = 5,5
        effet: 'coupe', recharge: 0.4 },   // la règle du snake (retour de la propriétaire) : se mordre COUPE le serpent au segment mordu, sans tuer ; 0,4 s sans nouvelle morsure
      ennemi: { facteurRayon: 0.8, apparition: 0.6 },      // rayon 3 + r × 0,8 ; 600 ms d'apparition sans contact
      teleMin: 0.5, teleCyclope: 0.8, annonceConvoi: 1.5,
      traineAgeMin: 0.15,
      coupe: {
        rayonSegment: 3.5,
        longueurMin: 3,           // la longueur devient max(3, k)
        segmentsParCellule: 2,    // une cellule pour deux segments détachés
        expireCellules: 3,
        chaineDiviseur: 2,
        gelImages: 3, jolt: 3     // + bande tramée en sang du côté du coup, son « coupe »
      },
      causes: 8
    },

    /* ---------------------------------------------------------------- § 2.4 les vies */
    vies: {
      depart: 3, reserveAffichee: 2,
      bonus: 1, seuilBonus: 80000, max: 4,
      reapparition: {
        candidats: 16, margeMurs: 40,
        longueurMin: 8, longueurPart: 0.5,     // max(8, ⌈L / 2⌉)
        perteNiveaux: 1, etiquette: 1.0,       // « CANON III → II » pendant 1 s
        effaceTirs: 40,                        // tirs ennemis effacés à moins de 40 px
        figeRayon: 48, figeDuree: 0.4,         // ennemis à moins de 48 px figés 0,4 s
        invul: 1.0, clignoteHz: 4,             // contre ennemis et tirs seulement
        ready: 0.6
      },
      continuer: { parPartie: 1, vies: 3, score: 0 }
    },

    /* ---------------------------------------------------------------- § 2.5 la longueur */
    longueur: {
      depart: 8, espacement: 5, perle: 9,
      max: 40, parCroissance: 5, croissancePrises: 2,
      refletHz: 1
    },

    /* ---------------------------------------------------------------- § 2.6 le butin et l'expérience */
    butin: {
      cellule: { w: 9, h: 11, segments: 1, xp: 1, energie: 1, points: 10, expire: 9 },     // points × multiplicateur
      noyau: { w: 11, h: 11, segments: 2, xp: 5, energie: 5, apogee: 20, points: 200, expire: 9 },
      pastille: { w: 11, h: 11, battementHz: 2, expire: 12, aimantee: false },
      prise: 8,
      aimant: [28, 48, 68],       // sans AIMANT, puis 1 et 2 prises
      vitesseAimant: 220,
      clignoteAvant: 2,           // les 2 dernières secondes
      fusion: { nombre: 3, distance: 10 },
      largages: {
        ordinaire: 0.45, larve: 0.20,
        ruche: { cellules: 6, noyaux: 1 }, elite: { cellules: 6, noyaux: 1 },
        lasso: { parEnnemi: 1, noyauDes: 4 },
        finVague: { base: 3, parVague: 1 },
        vol: 24, cyclopeParPhase: 8
      }
    },
    xp: { seuils: [6, 16, 28, 42, 58, 76, 96, 118, 142, 168] },

    /* ---------------------------------------------------------------- § 2.7 les cartes */
    cartes: {
      nettoyage: 2.5,
      parVague: 1, choixMax: 3,                 // « CHOISIS 2 » ou « CHOISIS 3 » au plus
      tailleMain: { base: 3, max: 5 },          // valeur du gardien : 3 cartes + 1 par choix en plus, 5 au plus
      cible: { partieGagnee: 10, tolerance: 2, mortV3: 4, premiere: 24 },   // 10 ± 2 ; ≥ 4 ; première vers 0:24
      ceremonie: { ralenti: 0.15, duree: 0.35 },
      main: { armesMax: 4, pouvoirsMax: 1 },
      poids: {
        ecole: 1.7, ecoleCartes: 2,             // × 1,7 pour une famille où la joueuse a déjà 2 cartes
        vierge: 0.6, viergeApres: 6,            // × 0,6 pour une famille vierge après la 6ᵉ carte
        rarete: { commune: 1, rare: 0.5, epique: 0.2, ultime: 0.6 }   // valeurs du gardien
      },
      pitie: { rare: 3, epique: 7 },            // une rare au moins tous les 3 écrans, une épique tous les 7
      premiereMain: { arme: 1, pouvoir: 1, survie: ['croissance', 'bouclier', 'reparation'] },
      trophee: { communes: 0, ultimeAUnPalier: true },
      defileParfaitRare: 1,
      crans: { commune: 1, rare: 2, epique: 3, ultime: 4 },
      encres: { commune: 'acier', rare: 'os', epique: 'ambre', ultime: 'jaune' },
      refletMaxParSeconde: 3,
      cibleMinPt: 44, garde: 0.4, touches: [1, 2, 3, 4],
      /* rareté et prises de chaque carte (§ 2.9 pour les passifs ; armes et pouvoirs : valeurs du gardien) */
      liste: {
        canon: { famille: 'canon', rarete: 'commune', prises: 3 },        // l'arme de départ : 3 montées jusqu'à l'ULTIME
        tourelles: { famille: 'tourelles', rarete: 'commune', prises: 4 },
        arc: { famille: 'arc', rarete: 'commune', prises: 4 },
        missiles: { famille: 'missiles', rarete: 'commune', prises: 4 },
        drones: { famille: 'drones', rarete: 'commune', prises: 4 },
        minesQ: { famille: 'minesQ', rarete: 'commune', prises: 4 },
        puissance: { famille: 'puissance', rarete: 'commune', prises: 3 },
        cadence: { famille: 'puissance', rarete: 'commune', prises: 3 },
        aimant: { famille: 'survie', rarete: 'commune', prises: 2 },
        croissance: { famille: 'survie', rarete: 'commune', prises: 2 },
        reparation: { famille: 'survie', rarete: 'rare', prises: 2 },
        bouclier: { famille: 'survie', rarete: 'epique', prises: 1 },
        eperon: { famille: 'puissance', rarete: 'epique', prises: 1 },
        grappe: { famille: 'puissance', rarete: 'epique', prises: 2 },
        sangFroid: { famille: 'survie', rarete: 'epique', prises: 1 },
        braise: { famille: 'puissance', rarete: 'rare', prises: 2 },
        traversee: { famille: 'pouvoir', rarete: 'rare', prises: 1 },
        ralenti: { famille: 'pouvoir', rarete: 'rare', prises: 1 },
        repli: { famille: 'pouvoir', rarete: 'rare', prises: 1 }
      },
      /* la rareté d'une carte d'arme dépend du palier qu'elle donne (valeur du gardien) */
      rareteArme: ['commune', 'commune', 'rare', 'ultime'],   // palier I, II, III, ULTIME
      texte: { nomMax: 14, ligneMax: 19, lignes: 2 }
    },

    /* ---------------------------------------------------------------- § 2.8 les armes
       paliers[0..3] = I, II, III, ULTIME. Dégâts en points (PV des ennemis × 10 par rapport à la démo). */
    armes: {
      ultimeSurCyclope: 1.5,      // l'ULTIME vaut au moins × 1,5 le palier III sur le CYCLOPE
      paliers: 4,
      lisibilite: {
        tirLong: [3, 5], tirLarge: 1,          // tirs fins de 1 × 3 à 1 × 5
        aplatMax: 3,                           // jamais un aplat de plus de 3 × 3 (sauf mine de queue et drone)
        silenceTete: 3,                        // aucun dessin de l'arsenal à moins de 3 px du contour de la tête
        naissance: 7,                          // les tirs naissent à 7 px devant la tête
        segmentsDessus: 2,                     // la tête et ses 2 premiers segments sont dessinés en dernier
        plafondCyan: 0.08                      // ≤ 8 % de cyan et cyan pâle hors tête et corps (R-37)
      },
      retours: { forceMax: 0.3, rayonMax: 19 },
      salveParSeconde: 8,
      tirsMax: 160,
      canon: {
        nom: 'CANON', place: 'devant',
        paliers: [
          { nom: 'I', tirs: 1, cadence: 6.5, degats: 10, portee: 130, vitesse: 210, dessin: [1, 3] },
          { nom: 'II', tirs: 2, bouches: 2, ecartBouches: 2, alterne: true, cadence: 9, degats: 10, portee: 130, vitesse: 210, dessin: [1, 3] },
          { nom: 'III', tirs: 2, perce: 2, ecartAngle: 0.06, cadence: 8, degats: 12, portee: 150, vitesse: 210, dessin: [1, 5] },
          { nom: 'RAYON', continu: true, efface: true, tics: 15, degats: 14, portee: 140, largeur: 3, depart: 7 }
        ]
      },
      tourelles: {
        nom: 'TOURELLES', place: 'flancs',
        vitesseTir: 180,                       // valeur du gardien
        paliers: [
          { nom: 'I', parSegments: 8, max: 4, viseeDeg: 25, cadence: 2, portee: 100, degats: 10, module: 3, canon: 2, directions: 8 },
          { nom: 'II', parSegments: 6, max: 6, viseeDeg: 25, cadence: 2.5, portee: 100, degats: 10, module: 3, canon: 2, directions: 8 },
          { nom: 'III', parSegments: 4, max: 8, viseeDeg: 25, cadence: 2.5, rafale: 2, ecartRafale: 0.08, portee: 100, degats: 10, double: true },
          { nom: 'BORDÉE', parSegments: 2, max: 16, viseeDeg: 25, cadence: 3, portee: 100, degats: 10, eclats: 3, degatsEclat: 4, salveParTourelle: 0.03 }
        ]
      },
      arc: {
        nom: 'ARC', place: 'distance',
        paliers: [
          { nom: 'I', arcs: 1, sauts: 3, periode: 1.0, degats: 14, portee: 60 },
          { nom: 'II', arcs: 1, sauts: 4, periode: 0.85, degats: 14, portee: 70 },
          { nom: 'III', arcs: 2, sauts: 5, periode: 0.85, degats: 14, portee: 70, paralyse: 0.3 },
          { nom: 'ORAGE', arcs: 4, sauts: 8, periode: 0.4, degats: 14, portee: 100, departs: ['tete', 'queue'] }
        ],
        noeud: 3                                 // nœud d'os de 3 × 3 à chaque impact ; le son monte d'un degré par saut
      },
      missiles: {
        nom: 'MISSILES', place: 'priorite',
        priorite: ['elite', 'ruche', 'rival', 'oeil'],
        vitesse: 140, virage: 4,                 // valeurs du gardien (px/s, rad/s)
        dessin: [3, 5],
        paliers: [
          { nom: 'I', missiles: 2, periode: 2.4, degats: 30, souffle: 14, souffleDegats: 0.6 },
          { nom: 'II', missiles: 3, periode: 2.1, degats: 30, souffle: 14, souffleDegats: 0.6 },
          { nom: 'III', missiles: 3, periode: 2.1, degats: 30, souffle: 14, souffleDegats: 0.6, sousMunitions: 4, degatsSous: 8 },
          { nom: 'NUÉE', missiles: 6, periode: 1.5, degats: 30, souffle: 14, souffleDegats: 0.6, verrouillage: 6 }
        ]
      },
      drones: {
        nom: 'DRONES', place: 'autour',
        orbite: 16, cadence: 1.6, degats: 10, portee: 90, dessin: [5, 5],
        paliers: [
          { nom: 'I', drones: 1 },
          { nom: 'II', drones: 2, interception: true, penalite: 0.6 },
          { nom: 'III', drones: 3, interception: true, penalite: 0.6, filin: 30 },
          { nom: 'ANNEAU', drones: 6, interception: true, penalite: 0, anneau: 24, contact: 60 }
        ]
      },
      minesQ: {
        nom: 'MINES DE QUEUE', place: 'derriere',
        armement: 0.4, declenche: 8, vie: 8, max: 12, dessin: [5, 5], coeurHz: 2,
        paliers: [
          { nom: 'I', periode: 2.2, souffle: 18, degats: 40 },
          { nom: 'II', periode: 1.6, souffle: 22, degats: 40 },
          { nom: 'III', periode: 1.6, souffle: 22, degats: 40, sousCharges: 3, souffleSous: 12, degatsSous: 16 },
          { nom: 'SINGULARITÉ', periode: 1.6, aspiration: 0.45, rayonAspiration: 30, souffle: 30, degats: 80 }
        ]
      }
    },

    /* ---------------------------------------------------------------- § 2.9 les passifs (N.cartes.mods) */
    passifs: {
      puissance: { parPrise: 0.25, prises: 3 },               // mods.degats = 1 + 0,25 × prises
      cadence: { parPrise: 0.20, prises: 3 },                 // mods.cadence = 1 + 0,20 × prises
      aimant: { rayons: [28, 48, 68], prises: 2 },            // mods.aimant
      croissance: { segments: 4, lenMax: 5, prises: 2 },      // +4 segments tout de suite, +5 au maximum
      reparation: { periodes: [6, 4], prises: 2 },            // un segment PERDU (coupe, mort) repousse toutes les 6 s (4 s à la 2ᵉ prise)
      bouclier: { charges: 1, recharge: 20, prises: 1 },
      eperon: { pvMax: 30, cout: 15, prises: 1 },             // en accélération ; coût en points de réserve
      grappe: { prises: 2, generations: 2, niveaux: [{ rayon: 16, degats: 15 }, { rayon: 22, degats: 25 }] },
      sangFroid: { prises: 1 },
      braise: { prises: 2, dps: 20, traine2: 0.4, lasso2: 1.5 },
      /* codex-06 : budgets de traitement et de rendu ; les dégâts/paliers ci-dessus restent inchangés. */
      effets: {
        grappe: { fileMax: 64, explosionsParPas: 2, touchesParPas: 24, ondeDepart: 2, ondeDuree: 0.28, ondeEpaisseur: 1 },
        braise: { pointsMax: 192, pas: 2, largeur: 1, sautMax: 32, intensite: 0.5 },
        repit: { duree: 0.9 } // répit commun après une coupe ; nécessite le raccord demandé à 70-joueuse
      },
      /* valeurs initiales de N.cartes.mods (§ 7.5) */
      mods: { degats: 1, cadence: 1, aimant: 28, lenMax: 40, reparation: 0, bouclier: 0, eperon: false, grappe: 0, sangFroid: false, braise: 0 }
    },

    /* ---------------------------------------------------------------- § 2.10 les pouvoirs */
    pouvoirs: {
      equipes: 1,
      premierePartie: ['traversee'],
      traversee: { duree: 1.4, recharge: 12 },
      ralenti: { duree: 3.5, recharge: 16, monde: 0.35, passeBas: 1200 },
      repli: { duree: 7, recharge: 15, longueur: 0.35, longueurMin: 6, perle: 13, degats: 1.8, vitesse: 0.12 }
    },

    /* ---------------------------------------------------------------- § 2.11 l'APOGÉE */
    apogee: {
      max: 100,
      charge: { ordinaire: 2, elite: 12, noyau: 20, lasso: 3, devore: 2, boost: 0 },
      anneauPoints: 8, battementHz: 2,
      glisse: { distancePt: 24, duree: 0.22 },
      ralenti: 0.25, ralentiDuree: 0.42, gelImages: 6,
      anneaux: { nombre: 6, intervalle: 0.09, rayons: [30, 70, 110, 150, 200, 260], degats: 12 },
      cyclopeMaxPhase: 0.06,
      flashs: 1,
      cible: { parPartieGagnee: 3, tolerance: 1 }
    },

    /* ---------------------------------------------------------------- § 2.12 le LASSO */
    lasso: {
      traine: { base: 1.2, parSegment: 0.02, braise2: 0.4, largeur: 1 },    // T = 1,2 + 0,02 × L
      fermetureTraine: 7, ageMin: 0.15,
      fermetureQueue: 5.5, derniers: 3,
      aireMin: 300, intervalle: 0.8,
      annonce: 14,
      degats: { base: 40, parSegment: 4, braise2: 1.5 },                    // 40 + 4 × L
      cyclopePhase: 0.10,                                                   // une fois par phase
      excellent: 4,                                                         // noyau et EXCELLENT à partir de 4
      remplissageImages: 3,
      exemple: { segments: 40, vitesse: 84, cible: 168 },                   // la fenêtre à 40 segments
      cibles: { reussiteCourt: 0.5, longCourt: 20, reussiteLong: 0.4, longDe: 30, longA: 40, rapportParMinute: 0.8 },
      pilote: { reaction: 0.12, erreurDeg: 10 }
    },

    /* ---------------------------------------------------------------- § 2.13 la chaîne et le score */
    score: {
      chaine: { fenetre: 2.5, coupeDiviseur: 2 },
      mult: { pas: 5, max: 8 },                         // 1 + ⌊chaîne / 5⌋, plafonné à × 8
      paliersOnde: [3, 5, 8], paliersImages: 2, grandDuree: 0.4,
      base: {
        larve: 20, mine: 40, fleche: 50, dard: 80, lame: 120, planeur: 100, tourelle: 150, sentinelle: 200,
        rival: 300, ruche: 400, traqueur: 5000, cyclope: 0
      },
      elite: 5,                                         // élite : 5 fois la base
      primes: {
        boutPortant: { distance: 24, facteur: 2 },
        frole: { distance: 5, points: 50 },             // × multiplicateur
        crash: 2,
        broye: { facteur: 1, sillage: 2 },
        devore: [200, 400, 800, 1600],                  // puis 1 600 pour chaque suivant
        cellule: 10,                                    // × multiplicateur
        vague: { parVague: 1000, parfait: 2 },
        vol: { porte: 500, parfait: 5000 },
        defile: { parfait: 10000, planeur: 100 },
        cyclope: { main: 3000, phase: 5000, mort: 25000, tempsRef: 120, parSeconde: 200 }
      },
      affiche: { chiffres: 7, roule: 0.2, seuilRoule: 1000 },
      gains: { echelle2Chaine: 6, decalage: 8 }
    },

    /* ---------------------------------------------------------------- § 2.14 les défis */
    defis: {
      annonceMax: 1,                                    // réussite ou échec annoncé en moins de 1 s
      parPartie: 3, duJour: 2,
      finir: { prime: 20000, energie: 50 },
      energieReserve: 20,
      cibles: { expertMin: 0.30, bonMin: 0.10, bonMax: 0.70 },
      reserve: {
        premierJet: { nom: 'PREMIER JET', prime: 5000, destructions: 25, avant: 60, jamaisAvant: 30 },
        lasso6: { nom: 'LASSO ×6', prime: 10000, enfermes: 6 },
        sansCoupe: { nom: 'SANS COUPE', prime: 8000, vagues: [1, 2] },
        chaine5: { nom: 'CHAÎNE ×5', prime: 6000, mult: 5 },
        gloutonne: { nom: 'GLOUTONNE', prime: 8000, devores: 6 },
        crash: { nom: 'CRASH', prime: 10000 },
        broyeuse: { nom: 'BROYEUSE', prime: 8000, broyes: 4 },
        parfait: { nom: 'PARFAIT', prime: 10000, planeurs: 40 },
        rasante: { nom: 'RASANTE', prime: 6000, froles: 10 },
        eclair: { nom: 'ÉCLAIR', prime: 8000, delai: 8 },
        volParfait: { nom: 'VOL PARFAIT', prime: 6000 },
        sansFilet: { nom: 'SANS FILET', prime: 12000 }
      },
      /* le défi de vague : un parmi trois, tiré par la graine de la partie (exemples du plan, complétés
         par le gardien) ; réussi : 1 000 × numéro de vague et 10 énergie */
      vague: {
        prime: 1000, energie: 10,
        liste: {
          1: [{ id: 'v1Lasso', texte: '2 LASSO', lassos: 2 }, { id: 'v1Mines', texte: 'ABATS LES 2 MINES', mines: 2 },
            { id: 'v1Rafle', texte: 'RAMASSE 15 CELLULES', cellules: 15 }],
          2: [{ id: 'v2Devore', texte: 'DÉVORE 4', devores: 4 }, { id: 'v2Lasso', texte: 'LASSO ×3', enfermes: 3 },
            { id: 'v2Meute', texte: 'ABATS UNE MEUTE ENTIÈRE', meute: 6 }],
          3: [{ id: 'v3Cote', texte: 'ABATS 3 TOURELLES DE CÔTÉ', tourelles: 3, angleDeg: 45 },
            { id: 'v3Eclair', texte: 'FLÈCHE BLINDÉE EN 10 S', delai: 10 }, { id: 'v3Chaine', texte: '×4 EN VAGUE 3', mult: 4 }],
          4: [{ id: 'v4Broie', texte: 'BROIE 3 ENNEMIS', broyes: 3 }, { id: 'v4Sillage', texte: '5 S DANS LE SILLAGE', duree: 5 },
            { id: 'v4Rival', texte: 'LE RIVAL AU LASSO' }],
          5: [{ id: 'v5Mult', texte: '×5 AVANT LA PURGE', mult: 5 }, { id: 'v5Ruche', texte: 'RUCHE INSTABLE AU LASSO' },
            { id: 'v5Devore', texte: 'DÉVORE 5', devores: 5 }]
        }
      }
    },

    /* ---------------------------------------------------------------- § 2.15 les contrôles */
    controles: {
      clavier: {
        gauche: ['ArrowLeft', 'KeyA', 'KeyQ'], droite: ['ArrowRight', 'KeyD'],
        haut: ['ArrowUp', 'KeyW', 'KeyZ'], bas: ['ArrowDown', 'KeyS'],
        boost: ['Space'], pouvoir: ['KeyE'], apogee: ['KeyR'], pause: ['KeyP', 'Escape'],
        valider: ['Enter'], retour: ['Escape', 'Backspace'], chiffres: ['Digit1', 'Digit2', 'Digit3', 'Digit4']
      },
      souris: { boost: 0, pouvoir: 2, apogee: 1 },                 // MouseEvent.button : gauche, droit, milieu
      manette: { boost: [0, 7], pouvoir: [2], apogee: [3], pause: [9], valider: [0], retour: [1] },   // A, gâchette droite, X, Y, Start, A, B
      capuchons: { parties: 3, duree: 6 }                          // P3
    },

    /* ---------------------------------------------------------------- § 2.16 les doigts (90-boot.js) */
    gestes: {
      delaiAction: 0.15,          // un doigt d'action se pose alors que le manche est tenu depuis 150 ms
      toucher: { duree: 0.18, deplacementPt: 10 },     // pouvoir, au relâcher
      glisse: { distancePt: 24, duree: 0.22 },         // APOGÉE, dès le seuil franchi
      tenu: { duree: 0.18, deplacementPt: 24 },        // accélération tant que posé
      boutonPt: 44,
      bordPt: 20,                 // l'origine du manche ne naît jamais à moins de 20 pt des bords
      auto: { traversee: 0.25, ralentiTele: 3, repliEnnemis: 5, repliRayon: 60, apogeeEnnemis: 8 }
    },

    /* ---------------------------------------------------------------- § 2.17 l'INVERSION */
    inversion: {
      vagues: [2, 3, 4, 5],
      distanceTete: 160,
      apparition: { 2: 20, 3: 14, 4: 18, 5: 22 },       // instant après l'entrée de la vague
      expire: 12,
      duree: { 2: 6, 3: 5, 4: 4, 5: 4 },
      fuite: 0.8,                                       // × la vitesse de la tête
      devore: { points: [200, 400, 800, 1600], segments: 1, apogee: 2, traqueur: 5000 },
      clignoteFin: { duree: 1, hz: 4 },
      finInoffensives: { rayon: 32, duree: 0.5 },
      jamais: ['defile', 'vol', 'boss']
    },

    /* ---------------------------------------------------------------- § 3.3 la caméra */
    camera: {
      avanceX: 0.30, avanceY: 0.42, avanceBoost: 1.4,
      amorti: 0.22,
      cadre: { min: 0.15, max: 0.85, portraitMaxY: 0.72 },
      devant: { croisiere: 1.2, boost: 0.8, margeMur: 16 },
      repere: { paysageDevant: 131, demandeV5Boost: 107, demandeEnrage: 115, portraitDevant: 127 },
      debord: 16,
      retardMax: 2.4,
      cyclope: { tete: 0.7, oeil: 0.3 },
      jolt: { min: 2, max: 6, amorti: 0.15 }
    },

    /* ---------------------------------------------------------------- § 3.4 à 3.6, § 5.2 le décor */
    decor: {
      plans: {
        P0: { fx: 0, fy: 0.02, bandeHorizon: 16, trameBas: [0.25, 0.5] },
        P1: { fx: 0.03, fy: 0.05, etoiles: 60, phases: 2 },
        P2: { fx: 0.08, fy: 'fh', soleil: 80, soleilPortrait: 64, largeurSource: 512 },
        P3: { fx: 0.20, fy: 'fh', enseignes: [0.05, 0.08], prolonge: 600 },
        P4: { fx: 0.35, fy: 0.40, derive: 4, trame: 0.25, reflets: 0.12 },
        P5: { fx: 0.60, fy: 0.60, tuile: [32, 64], faisceaux: 0.12 },
        sol: { fxHorizon: 'fh', fxBas: 1.0 },
        plateau: { fx: 1, fy: 1 },
        P6: { fx: 1.4, fy: 1.4, bande: 0.12, trame: 0.5 }
      },
      horizon: { paysage: [0.80, 0.42], portrait: [0.62, 0.20] },   // y_h = ⌊h × (a − b × c)⌋
      ecartPlans: 1.7,
      decorDangerMax: 0.005,       // magenta et rose pâle du décor (hors murs) < 0,5 %
      vivesTrameMax: 0.5,          // couleurs vives tramées à 50 % au plus hors du soleil
      blocVif: { taille: 3, vitesseMax: 1 },
      sol: {
        K: 900, Z0: 64,                                       // Z0 : valeur du gardien
        pasLongitudinal: 32, pasTransversal: 24,
        avance: { calme: 1, chaos: 2, vol: 6 },               // cases par temps ; plus vite en accélération
        avanceBoost: 1.6,                                     // valeur du gardien : × le facteur d'accélération
        reflet: { min: 24, max: 44, amplitude: 2, ky: 0.7, kt: 3 },
        coutMs: 0.5, tests: 34000
      },
      quartiers: {
        docks: { nom: 'LES DOCKS', vague: 1 }, artere: { nom: "L'ARTÈRE", vague: 2 }, centrale: { nom: 'LA CENTRALE', vague: 3 },
        ciel: { nom: 'LE CIEL', vague: 'defile' }, tours: { nom: 'LES TOURS', vague: 4 }, coeur: { nom: 'LE CŒUR', vague: 5 },
        eclipse: { nom: "L'ÉCLIPSE", vague: 'cyclope' }
      },
      transition: 0.5,
      precalculMs: 4,
      lumiere: {
        seuil: 0.10,
        calme: { part: 0.25, moyenne: 0.075 },
        montee: { part: 0.28, moyenne: 0.085 },
        chaos: { part: 0.32, moyenne: 0.095 },
        colosse: { part: 0.25, moyenne: 0.075 },
        decorSeul: [0.18, 0.28],
        decorMoyenneMin: 0.06,
        desT: 1,
        reperes: { ouverture: 0.089, affiche: 0.116, demoT1: 0.0155, demoSombre: 0.97 },
        sources: { soleil: 0.06, horizon: 0.03, fenetres: [0.05, 0.08], reflet: 0.02, lignes: [0.02, 0.03], decor: [0.18, 0.22] },
        videMax: 0.30,
        changes: { croisiere: 0.15, croisiereDuree: 0.5, immobile: 0.03, immobileDuree: 1 },
        reduit: 0.005
      },
      vie: {
        soleilBandesMesures: 2,      // les bandes glissent d'une rangée toutes les 2 mesures
        projecteurs: { nombre: 2, trame: 0.12, hz: 0.2 },
        intersectionsImages: 2,      // indigo → violet pendant 2 images sur la grosse caisse
        ondule: { elite: 48 }
      }
    },

    /* ---------------------------------------------------------------- § 3.7 le radar et les marqueurs */
    radar: {
      w: 48, h: 24, tete: [2, 1], gros: [2, 3], clignoteHz: 2, pastille: 2,
      portail: { avance: 0.6, chevron: 7, mini: 5, eliteMultiple: 2, cyclopeMultiple: 3, cyclopeAvance: 1.4 },
      marqueurs: { pres: 7, loin: 3, clignoteMaxHz: 6, mineHz: 2 }
    },

    /* ---------------------------------------------------------------- § 3.8 des apparitions justes */
    apparitions: {
      anticipee: 1.15, marge: 24, distanceTete: 48, interieurMurs: 16,
      reverifImages: 4,
      portail: 0.6, sansContact: 0.6,
      shownMarge: 6, rallonge: 0.3,
      teleMin: 0.5, teleCyclope: 0.8, teleConvoi: 1.5,
      portraitBas: 0.5
    },

    /* ---------------------------------------------------------------- § 3.9 LE VOL */
    vol: {
      parPartie: 5, duree: 4,
      depuis: ['v1', 'v2', 'v3', 'defile', 'v4'],
      balayage: 0.4,
      horizon: 0.38, sol: 0.62, grille: 6,
      tete: { sprite: 13, echelle: 2 }, anneaux: [5, 4, 3, 2, 1],
      cadre: { x: [0.15, 0.85], y: [0.55, 0.90] }, vitesse: 140,
      cellules: { nombre: 24, xp: 1, energie: 1, points: 10 },
      portes: { nombre: 6, rayonMax: 24, points: 500, xp: 5 },
      mines: { nombre: 4, versCoeur: 8, ombreAvant: 1.2, coupe: 0.25, longueurMin: 8, chaineDiviseur: 2 },
      parfait: 5000,
      coutMs: 2, primitives: 40,
      Z0: 64                                  // valeur du gardien : rayon = ⌊r0 × Z0 / z⌋
    },

    /* ---------------------------------------------------------------- § 4.1 et § 4.2 le secteur */
    secteurs: [{
      id: 'grille', nom: 'LA GRILLE', numero: 1,
      consigne: ['ENCERCLE-LES.', 'ÉVITE LE MUR.', 'ÉVITE TA QUEUE.'],
      duree: { min: 320, max: 390 },                 // 5 min 20 à 6 min 30 pour le pilote bon qui gagne
      structure: {
        ouverture: 12, plongee: 1.4, nettoyage: 2.5, vol: 4,
        warning: 3, panneau: 1.6, arrivee: 2.2, victoire: 6,
        cyclope: { min: 55, max: 90, repits: 2, repit: 7 }
      },
      ordre: ['v1', 'vol', 'v2', 'vol', 'v3', 'vol', 'defile', 'vol', 'v4', 'vol', 'v5', 'cyclope'],
      finVague: { vivantsMax: 2 },
      soupape: 12,                                   // durée nominale + 12 s
      entree: 6,                                     // entrée calme : seule la première formation
      respiration: { part: 0.40, duree: 8 },         // sous 40 % du pic pendant au moins 8 s (G-17)
      grilleTemps: 60 / BPM,                         // apparitions au plus tard au temps suivant (0,41 s)
      premierEnnemi: { apresVirageDeg: 45, delai: 3, auPlusTard: 6, rienAvant: 5, partiesSuivantes: 1 },
      premiereMenaceAvant: 20,
      traqueur: { vagues: [2, 3, 4, 5], inaction: 7, annonce: 1.5, second: 6 },
      elroy: { reste: 0.20, acceleration: 0.30 },
      vitessesFleches: [40, 44, 48, 52, 56],
      plafondDur: { ennemis: 40, tirs: 80 },
      vagues: [
        {
          n: 1, id: 'eveil', nom: 'ÉVEIL', quartier: 'docks', etat: 'calme', vitesse: 68,
          quota: 24, duree: 22, plafond: 12, chargesFleches: 1, tirsEnnemis: false,
          formations: [{ t: 0, f: 'file' }, { t: 5, f: 'file' }, { t: 10, f: 'nuee' }, { t: 14, f: 'duoMines' }, { t: 17, f: 'pince' }],
          remplissage: 'file', travelling: null, convois: null, pastille: null, pic: null
        },
        {
          n: 2, id: 'meute', nom: 'MEUTE', quartier: 'artere', etat: 'montee', vitesse: 72,
          quota: 48, duree: 42, plafond: 16, chargesFleches: 1, tirsEnnemis: true,
          formations: [{ t: 2, f: 'meute' }, { t: 14, f: 'meute' }, { t: 28, f: 'meute' }, { t: 8, f: 'champMines' }, { t: 30, f: 'champMines' },
            { t: 18, f: 'pince' }, { t: 26, f: 'pince' }, { t: 36, f: 'pince' }, { t: 10, f: 'nuee' }, { t: 22, f: 'nuee' }],
          remplissage: null, travelling: { t: 12, vx: 8 }, convois: null, pastille: 20, pic: null
        },
        {
          n: 3, id: 'batterie', nom: 'BATTERIE', quartier: 'centrale', etat: 'montee', vitesse: 76,
          quota: 54, duree: 44, plafond: 20, chargesFleches: 3, tirsEnnemis: true,
          formations: [{ t: 4, f: 'batterie' }, { t: 24, f: 'batterie' }, { t: 10, f: 'meute' }, { t: 16, f: 'pince' }, { t: 34, f: 'pince' }],
          remplissage: 'file', travelling: { t: 4, vx: 12 }, convois: null, pastille: 14,
          pic: { t: 30, elite: 'flecheBlindee', avec: 'meute', banniere: true }
        },
        {
          n: 4, id: 'essaim', nom: 'ESSAIM', quartier: 'tours', etat: 'chaos', vitesse: 80,
          quota: 60, duree: 48, plafond: 24, chargesFleches: 3, tirsEnnemis: true,
          formations: [{ t: 3, f: 'essaim' }, { t: 28, f: 'essaim' }, { t: 10, f: 'duel' }, { t: 34, f: 'duel' }, { t: 20, f: 'garde' },
            { t: 40, f: 'champMines' }, { t: 6, f: 'meute' }, { t: 24, f: 'meute' }],
          remplissage: null, travelling: null, convois: { t: 8, periode: 9, alea: 2 }, pastille: 18,
          pic: { t: 30, elite: 'rival', avec: null, banniere: true }
        },
        {
          n: 5, id: 'deferlante', nom: 'DÉFERLANTE', quartier: 'coeur', etat: 'chaos', vitesse: 84,
          quota: 80, duree: 50, plafond: 32, chargesFleches: 4, tirsEnnemis: true,
          formations: [], melange: { toutes: true, parSalve: 2, intervalle: 5 },   // intervalle : valeur du gardien
          rapide: 0.10,
          remplissage: null, travelling: { t: 6, vx: 14 }, convois: { t: 12, periode: 14, alea: 0 }, pastille: 22,
          pic: { t: 32, elite: 'rucheInstable', avec: null, banniere: true }
        }
      ],
      defile: { id: 'defile', nom: 'LE DÉFILÉ', quartier: 'ciel', etat: 'calme', vitesse: 76, duree: 24,
        escadrilles: 5, parEscadrille: 8, intervalle: 4.5, planeurs: 40 },
      cyclope: { quartier: 'eclipse', etat: 'colosse' }
    }],

    /* ---------------------------------------------------------------- § 4.3 les formations */
    formations: {
      annonce: 1,                  // nommées et annoncées 1 s avant
      etiquette: 1,                // après la première rencontre : étiquette d'1 s
      file: { nom: 'FILE', fleches: 3 },
      meute: { nom: 'MEUTE', fleches: 6, forme: 'V' },
      nuee: { nom: 'NUÉE', larves: [6, 8], forme: 'spirale' },
      duoMines: { nom: 'DUO DE MINES', mines: 2, distanceMin: 90, marqueurs: 1.5 },
      champMines: { nom: 'CHAMP DE MINES', mines: 9, grille: 3, distanceMin: 100, marqueurs: 1.5 },
      pince: { nom: 'PINCE', dards: 2 },
      batterie: { nom: 'BATTERIE', tourelles: 3, ecartTirs: 0.4 },
      essaim: { nom: 'ESSAIM', ruches: 1, larves: 6 },
      duel: { nom: 'DUEL', lames: 2 },
      garde: { nom: 'GARDE', sentinelles: 1, fleches: 4 },
      escadrille: { nom: 'ESCADRILLE', planeurs: 8, duree: 8 }
    },

    /* ---------------------------------------------------------------- § 4.4 le bestiaire */
    ennemis: {
      tele: { finRosePale: 0.3, gaine: 1 },
      tir: { taille: 5, rayon: 2, correlationMax: 0.5 },
      codex: { duree: 2, echelle: 2 },
      fleche: {
        nom: 'FLÈCHE', pv: 20, r: 5, sprite: 15, approche: [40, 56], fige: 0.6, distance: [40, 110],
        bond: { vitesse: 160, duree: 0.42, longueur: 67 }, recharge: 1.6,
        esquive: { duree: 0.25, vitesse: 70, angleDeg: 12, distance: 60, recharge: 1.2 },
        codex: 'SE FIGE, PUIS FONCE'
      },
      dard: {
        nom: 'DARD', pv: 30, r: 5, sprite: 15, croisiere: 60, avance: 165, verrou: 0.6,
        fuseau: { vitesse: 165, duree: 0.5, longueur: 82 }, recharge: 2.0, losange: [9, 5],
        codex: 'VISE OÙ TU VAS'
      },
      larve: {
        nom: 'LARVE', pv: 10, r: 3.5, sprite: 9, zigzag: 55, orbite: 30, mordDerniers: 3, coupe: 1, annonce: 0.5,
        codex: 'MORD TA QUEUE'
      },
      mine: {
        nom: 'MINE', pv: 20, r: 5.5, sprite: 13, derive: 4, cercle: 34, meche: 0.8, souffle: 30,
        codex: "S'ARME QUAND TU ENTRES"
      },
      tourelle: {
        nom: 'TOURELLE', pv: 60, r: 6.5, sprite: 15, bande: 120, bandeAlea: 25, vitesse: 35, vise: 0.75,
        balle: 95, portee: 160, tirs: 3, blindageDeg: 45, crochet: 5,
        codex: 'BLINDÉE DE FACE'
      },
      lame: {
        nom: 'LAME', pv: 50, r: 6, sprite: 15, spriteDeploye: 21, approche: 45, declenche: 150, recul: 0.6,
        traverse: { vitesse: 230, duree: 0.82, longueur: 190 }, recup: 0.8, degatsRecup: 2,
        codex: 'RECULE PUIS TRAVERSE TOUT'
      },
      ruche: {
        nom: 'RUCHE', pv: 240, r: 11, sprite: 23, vitesse: 25, garde: 90, petales: 0.7, couvee: 0.6, larves: 3,
        periode: 3.5, larvesMax: 12, arcPv: 1,
        codex: 'PONDEUSE DE LARVES'
      },
      sentinelle: {
        nom: 'SENTINELLE', pv: 60, r: 6.5, sprite: 15, orbite: 80, vise: 0.85, laser: 0.35, longueur: 300,
        recharge: 3, lasersMax: 2,
        codex: "LASER QUI TRAVERSE L'ÉCRAN"
      },
      rival: {
        nom: 'RIVAL', pvTete: 180, r: 5.5, rSegment: 3.5, segments: 10, espacement: 5, vitesse: 0.9, rayonVirage: 14,
        visee: 40, evitementMurs: 24, traine: 1.5, traineLargeur: 1, traineAgeMin: 0.15,
        coupeRoute: { distance: 60, annonce: 0.5 }, spriteTete: 11, perle: 7,
        codex: 'VEUT TE COUPER LA ROUTE'
      },
      planeur: { nom: 'PLANEUR', pv: 10, r: 4, sprite: 9, sortie: 8, codex: 'NE TIRE PAS : ABATS-LES TOUS' },
      traqueur: { nom: 'TRAQUEUR', pv: 1, invulnerable: true,          // pv symbolique : hit() ne retire rien
        r: 6, sprite: 15, vitesse: 0.95, portail: 1.5,
        radarHz: 2, points: 5000, codex: 'SEUL UN LASSO LE TUE' },
      convoi: { codex: 'BALAIE SA VOIE' }
    },

    /* codex-p4 : géométrie publiée, reprise des constantes EXISTANTES de 72/73.
       Aucun temps d'annonce, collision, dégât ou dessin nouveau. */
    publicationTele: {
      tirVie: 9,                  // CFG.vieTir de 72 : portée maximale des salves du CYCLOPE
      rucheDecalage: 3, ruchePortail: 0.4, // emplacement et délai de contact de la couvée existante
      cyclopeTirDepart: 12, cyclopeRayonDepart: 9, cyclopeSpiraleDecalage: 0.5
    },

    /* ---------------------------------------------------------------- § 4.5 les élites et les modificateurs */
    elites: {
      pv: 3, sprite: [19, 21], gelImages: 5, force: 0.8, cellules: 6, noyaux: 1, apogee: 12,
      pic: [0.55, 0.75],
      flecheBlindee: { type: 'fleche', mods: ['blinde'], nom: 'FLÈCHE BLINDÉE', vague: 3 },
      rival: { type: 'rival', mods: [], nom: 'LE RIVAL', vague: 4, pvPropres: true },
      rucheInstable: { type: 'ruche', mods: ['instable'], nom: 'RUCHE INSTABLE', vague: 5 }
    },
    modificateurs: {
      blinde: { pv: 2, eclatent: 0.5, allure: 1.4, debris: 3, pattes: 2 },
      rapide: { allure: 1.5, recharges: 0.7 },
      instable: { meche: 0.8, souffle: 34 }
    },

    /* ---------------------------------------------------------------- § 4.6 les événements d'arène */
    arene: {
      travelling: {
        largeur: 576, hauteur: 512, miseEnPlace: 3, marge: 80, annonce: 2,
        vitesses: { 2: 8, 3: 12, 5: 14 }, alerte: 24, retour: 2, cibleMouvement: 0.25
      },
      convois: {
        voies: [64, 160, 256, 352, 448], hauteurVoie: 20, annonce: 1.5, hachure: 0.25,
        silenceApresElite: 3, wagons: 6, wagon: [18, 14], vitesse: 240, museauHzMax: 3,
        sillage: { distance: 40, facteur: 1.4, broyes: 2 },
        v4: { debut: 8, periode: 9, alea: 2 }, v5: { debut: 12, periode: 14 },
        joltPassage: 2
      }
    },

    /* ---------------------------------------------------------------- § 4.7 LE DÉFILÉ */
    defile: {
      duree: 24, escadrilles: 5, parEscadrille: 8, intervalle: 4.5, sortie: 8,
      points: 100, parfait: 10000, planeurs: 40
    },

    /* ---------------------------------------------------------------- § 4.8 LE CYCLOPE */
    colosse: {
      corps: [96, 128], tete: [40, 32], main: [24, 24], plaques: 6, plaque: [12, 12],
      silhouettes: { loin: 48, mi: 80 },
      pvPhase: 1200, pvTotal: 3600, pvMain: 300,
      entree: { total: 6.8, gelees: 1.6, warning: 3.0, bandes: 10, coupure: 0.25, panneau: 1.6, garde: 0.3,
        arrivee: 2.2, ralenti: 0.3, jauge: 0.9 },
      seuils: [1, 0.66, 0.33, 0],
      teleMin: 0.8,
      phase1: {
        rayon: { vise: 0.9, largeur: 5, balayageDeg: 100, duree: 1.2 },
        salve: { charge: 0.8, balles: 14, vitesse: 70, salves: 2, ecart: 0.5 },
        appel: { cycles: 3, formation: 'file' },
        oeil: 1.4
      },
      phase2: { annonceCiseaux: 0.8, oeilMain: 3, oeilSalve: 1.4, entree: 'meute' },
      phase3: { ombre: 40, annonceBond: 1.0, mines: 6, armementMines: 0.6, salveDouble: 2, balles: 14, resserre: 0.15, oeil: 1.4 },
      // codex-p4b : protection de pose avant contact ; la mèche phase3.armementMines suit cette annonce.
      minesPosees: { armement: 0.8, contour: 1, densiteAnneau: 1 },
      repit: { duree: 7, cellules: 8 },
      enrage: { apres: 100, allure: 1.3, intervalle: 0.75 },
      mort: { arretImages: 24, explosions: 5, cascade: 0.66, brasier: 0.08, brasierImages: 4, camera: 6, carcasse: 3, purge: 0.045 },
      cibles: { combat: [55, 90], kamikazeMin: 30, partCoups: 0.35, teleTous: 0.8 }
    },

    /* ---------------------------------------------------------------- § 4.10 la difficulté chiffrée */
    pilotes: {
      banc: { profil: 'iPhone 13 paysage', dt: 1 / 60, graines: 50, grainesAutres: 5, coutPartie: 10, passe: 3600 },
      inerte: { perdAvant: 35, partPerd: 1.0, premiereMortAvant: 8 },
      tourneur: { perdAvant: 90, partPerd: 1.0, scoreMax: 0.10 },
      maladroit: { decision: 0.7, erreurDeg: 35, medianeGameOver: [45, 150], cyclope: 0, premierCoupAvant: 30, partPremierCoup: 0.80 },
      kamikaze: { accelereAuDela: 40, perdAvantCyclope: 0.90, gagneMax: 2 },
      humain: { reaction: 0.12, erreurDeg: 10, medianeGameOver: [120, 210], cyclope: [0.10, 0.35], bat: [0.02, 0.12], coupV1: 0.50,
        lasso: { court: 0.5, long: 0.4 } },
      bon: { reaction: 0.08, cyclope: [0.30, 0.60], bat: [0.10, 0.30], mortAvantCyclope: 0.70, coupV1: 0.40, longueurMaxAvant: 120,
        lassoGroupe: 4, lassoRayon: 60, traversee: 0.2, apogeeEnnemis: 8, attraction: 60, repulsionMurs: 24 },
      expert: { reaction: 0.05, cyclope: 0.80, bat: [0.40, 0.70], perdVie: 0.80, lassos: 10, apogees: 2 },
      dieu: { duree: [320, 390], combat: [55, 90] },
      rythme: { ecartBonKamikaze: 1.3 },
      unPouce: { diriger: 0.15, auto: 0.35 }                       // R-23
    },

    /* ---------------------------------------------------------------- § 5.3 les temps forts (79-scene.js) */
    scene: {
      kill: { force: 0.32, forceTireur: 0.45, parEnchaine: 0.03, forceMax: 0.58, recul: 1, gelImages: 2, gelIntervalle: 0.12 },
      palier: { grand: 0.4 },
      lasso: { gelImages: 4, gelDes: 4 },
      coupe: { gelImages: 3 },
      elite: { force: 0.8, gelImages: 5, ondule: 48 },
      rival: { gelImages: 6 },
      convoi: { jolt: 2 },
      vague: { duree: 2.5 },
      niveau: { ralenti: 0.15, duree: 0.35 },
      apogee: { gelImages: 6, ralenti: 0.25, duree: 0.42 },
      danger: { bordsHz: 1.2 },
      cyclope: { ralenti: 0.3, duree: 2.2, phase: 7, mortImages: 24, force: 1.0 },
      etiquettePouvoir: 1,
      budgets: { flashsParSeconde: 3, imagesSecouees: 0.12, banniereIntervalle: 10, bannieresSimultanees: 1 }
    },

    /* ---------------------------------------------------------------- § 5.4 la mort mise en scène */
    mortScene: {
      gelImages: 10, anneau: 1, anneauHz: 3,
      coupure: 0.015, son: { duree: 0.9, octaves: 1.5 },
      desintegre: { debut: 0.17, fin: 0.9, ralenti: 0.25, imagesParSegment: 2 },
      suite: { debut: 0.9, fin: 1.3 }, ready: 0.6,
      glitch: 0.3, extinction: 0.4,
      duree: 1.3, sautDes: 0.5, mainAvant: 2.0, finAvant: 1.5
    },

    /* ---------------------------------------------------------------- § 5.5 le HUD */
    hud: {
      police: [5, 7], pxMin: 2, ptMin: 14, partMax: 0.10,
      score: { chiffres: 7 }, vie: [5, 5], radar: [48, 24],
      cyclope: { jauge: [120, 3] },
      bouton: { px: 22, pt: 44 },
      banniere: { echellePaysage: 4, echellePortrait: 3, entreeImages: 2, fantomes: 2, sortie: 0.25 },
      // codex-07 : paramètres de composition, en pixels du tampon et secondes de jeu.
      tempsForts: {
        banniere: { echelleMin: 2, duree: 2, fileMax: 3, attenteMax: 10, marge: 6, hautReserve: 56,
          interligne: 3, padding: 6, fantomePx: 2, fantomeImages: 6, balayage: 0.20, clignoteHz: 1.5 },
        palier: { duree: 0.65, coup: 0.14, echelle: 2, echelleCoup: 3, marge: 4, accent: 0.35 },
        derniereVie: { vies: 1, hz: 1.2, bord: 4, trameMin: 0.25, trameAmplitude: 0.50, seuilCoeur: 0.68 },
        protection: { segments: 2, rayonTete: 9, rayonCorps: 6 },
        texte: { ptMin: 11, ligne: 11 }
      },
      toast: { echelle: 1 }
    },

    /* ---------------------------------------------------------------- § 5.6 les écrans */
    ecrans: {
      demarrage: { clignoteHz: 1 },
      ouverture: { duree: 12, garde: 0.3 },
      touchersMax: 2,
      titre: { fondu: [12, 16], partChangeMax: 0.60, classes: [0.05, 0.10] },
      attraction: { attente: 15, boucle: 35, demo: 20, galerie: 6, records: 5, invitation: 4, graine: 2975, couches: 2, gainDb: -6 },
      briefing: { duree: 2, lignes: 3 },
      plongee: { duree: 0.8 },
      cartes: {
        plaques: [3, 5], paysage: [120, 80], paysageSerre: [96, 80], portrait: [180, 48],
        icone: 16, entree: 0.055, rebond: 1, etouffoir: 900
      },
      pause: { etouffoir: 420 },
      reglages: { lignes: 8 },
      fin: {
        titreEchelle: 3, garde: 0.45, continuer: { de: 9, a: 0 }, boutonPt: 44,
        actions: { marge: 5, ecart: 4, largeurMax: 150, texteH: 7, msParSeconde: 1000 }, // fin : cibles sûres et conversion des dates des touchers
        notes: { S: 'FINIR, les 2 autres défis et aucune vie perdue', A: 'FINIR et au moins un autre défi', B: 'FINIR', C: 'CYCLOPE atteint', D: 'sinon' },
        lassoBuild: 0.30
      },
      records: { nombre: 10, lettres: 3 },
      conseils: [
        ['murMobile', 'LE MUR ARRIÈRE AVANCE : RESTE DEVANT'],
        ['mur', 'LE MUR TUE. IL S\'ALLUME QUAND TU APPROCHES'],
        ['morsure', 'TOURNE PLUS LARGE QUE TON CORPS'],
        ['convoi', 'LA VOIE CLIGNOTE AVANT LE CONVOI'],
        ['traine', 'FAIS-LE S\'ÉCRASER SUR TON CORPS'],
        ['fleche', 'LA FLÈCHE SE FIGE AVANT DE FONCER'],
        ['dard', 'LE DARD VISE OÙ TU VAS : CHANGE DE CAP'],
        ['tourelle', 'PRENDS LA TOURELLE DE CÔTÉ'],
        ['lame', 'LA LAME RECULE PUIS TRAVERSE TOUT'],
        ['mine', 'LA MINE S\'ARME DANS SON CERCLE'],
        ['sentinelle', 'QUITTE LA LIGNE PÂLE DU LASER'],
        ['traqueur', 'SEUL UN LASSO TUE LE TRAQUEUR'],
        ['apogeeInutilisee', 'TON APOGÉE ÉTAIT PRÊTE À m:ss : GLISSE UN 2ᵉ DOIGT'],
        ['pastilleIgnoree', "L'ÉTOILE JAUNE DU RADAR RETOURNE LA CHASSE"],
        ['aucunLasso', 'BOUCLE AUTOUR D\'EUX : TOUT ÉCLATE']
      ]
    },
    deblocages: [
      { id: 'ralenti', seuil: 300 }, { id: 'repli', seuil: 800 }, { id: 'styles', seuil: 1500 },
      { id: 'galerie', seuil: 2500 }, { id: 'departV3', seuil: 4000, cartes: 2 }
    ],
    deblocagesCible: { premierParties: [1, 2], dernierParties: [12, 25] },
    surcharge: { vitesse: 1.12, densite: 1.3, score: 1.5 },     // § 9, ouverte par la victoire

    /* ---------------------------------------------------------------- § 5.7 la musique */
    musique: {
      piste: { duree: 275, frequence: 48000, debit: 196, bpm: BPM, mesure: 1.6598, tonique: 'ré', mode: 'dorien' },
      sections: {
        INTRO: { mesures: [1, 10], temps: [0, 16.6], db: -24, boucle: [3, 10] },
        PLATEAU: { mesures: [11, 70], temps: [16.6, 116], db: [-13, -11], decollage: 11 },
        PONT: { mesures: [71, 71], db: -15 },
        RESPIRATION: { mesures: [72, 103], temps: [119, 171], db: [-28, -18] },
        RETOUR: { mesures: [104, 153], temps: [171, 254], db: [-13, -11], boucle: [136, 151] },
        OUTRO: { mesures: [154, 165], temps: [254, 274], db: [-23, -19] }
      },
      blocs: { mesures: 8, duree: 13.3, recouvrement: 1, debit: 112, frequence: 44100, deriveMax: 0.005,
        decodesMax: 4, memoire: 20, memoireMax: 25, fondu: 0.010, precharges: 2, jointureMs: 1, sansRepetition: 3 },
      alerte: { coupure: 0.25, mesure: 70, passeBas: 300 },
      defaite: { passeBas: 1200 },
      tension: { filtre: [2500, 18000], tension: [0.15, 0.6], gainDb: [-3, 0] },
      etouffoirs: { pause: 420, cartes: 900, ralenti: 1200, danger: 2000 },
      couches: { percu: 0.6, etincelles: 0.8, etincellesRapport: 0.25, etincellesOctaves: ['ré5', 'ré6'] },
      accents: { stingerMesures: 1, drop: 0.25, plongee: { niveau: 0.10, duree: 0.09, retour: 1.28 } },
      repli: { refrain: { notes: 8, mesures: 2 }, centroide: [900, 1500], couches: 4 },
      calage: { barreMs: 10 },
      demarrage: { mesures: 1, releve: 3 },
      reprise: 1                                  // coupure, suspension et reprise sous 1 s (J-19)
    },

    /* ---------------------------------------------------------------- § 5.7 le mixage, § 5.8 les sons */
    son: {
      mix: {
        calmeDbfs: -20, passeHautTel: 350, chaosDbfs: -14, ecartDb: 6, correlation: 0.5,
        sonsAuDessus: [3, 6], tirSousKill: 6, esquive: 0.30, esquiveRelache: 0.12, creteDbfs: -1
      },
      energieAigus: 0.25, seuilAigus: 400,
      pans: 7,
      sitesParNom: 3,
      salveParSeconde: 8, noeudsParSeconde: 60,
      butin: { fenetre: 1.2, demiTons: 12 },
      bip: { rapport: 0.125, duree: 0.03 },
      battement: { hz: 1 },
      warning: [1300, 1800],
      repetition: { fenetre: 4, tolerance: 0.01, duree: 180, mesuresIdentiquesMax: 2 },
      voix: { source: [90, 110], formants: 3, intervalle: 4 }
    },

    /* ---------------------------------------------------------------- § 7.10 les réglages par défaut */
    reglages: { musique: true, effets: true, secousse: 1, flashs: true, ecran: 'riche', texte: 1, manche: 1, actions: 'doigts' },
    reglagesValeurs: {
      secousse: [1, 0.5, 0], ecran: ['riche', 'sobre', 'pur'], texte: [1, 2], manche: [0.8, 1, 1.25], actions: ['doigts', 'auto']
    },
    persistance: { cle: 'snake2975.v1', version: 1 },

    /* ---------------------------------------------------------------- § 7.4, § 7.9 le socle */
    socle: { evParPas: 64, journal: 65536, vueImages: 6 },

    /* ---------------------------------------------------------------- § 7.11 le budget de performance (ms, p95) */
    perf: {
      budget: { crt: 5.8, decor: 1.5, ennemis: 1.0, joueuse: 1.0, effets: 0.7, hud: 0.4, systemes: 0.3, musique: 0.2, boucle: 0.1, total: 11.0 },
      crtAuditMs: 7.7,
      skipScaleGain: 0.5,
      adaptatif: { sobre: 12, coupe: 15, retour: 9, hysteresis: 45, descenteMax: 1 },
      bureauLargeurMax: 1280,
      cibles: { x1: 11, x4: 25, iphone: 16.7, redimensionnementMax: 50, redimensionnements: 10 },
      nonRegressionMs: 0.5,
      simule: { partie: 360, dureeMax: 15 }
    },

    /* ---------------------------------------------------------------- § 8.5 les seuils des critères R */
    criteres: {
      R02: { palette: 1.0 },
      R03: { cyanHorsMasque: 0.005 },
      R05: { causes: 8 },
      R06: { apparitionsVue: 0, armementsHorsVue: 0 },
      R07: { tele: 0.5, cyclope: 0.8, convoi: 1.5 },
      R08: { visible: 0.6, part: 0.95 },
      R09: { cadre: [0.15, 0.85], segments: 2 },
      R10: { vitesses: 5, changes: 0.15, duree: 0.5 },
      R12: { brasier: 0.08, images: 4, camera: 6 },
      R13: { flashsParSeconde: 3, aire: 0.066 },
      R14: { secouees: 0.12, banniere: 10 },
      R16: { cartes: 10, tolerance: 2, mortV3: 4 },
      R17: { duree: 1.3, fin: 1.5, relance: 2 },
      R19: { attente: 15 },
      R20: { x1: 11, x4: 25, iphone: 16.7 },
      R21: { profils: 3, pilotes: 8, graines: 5, grainesPaysage: 50 },
      R22: { latenceImages: 1 },
      R23: { diriger: 0.15, auto: 0.35 },
      R24: { teteHorsQuartBas: 0.95 },
      R26: { aigus: 0.25 },
      R29: { arrierePlan: 10, sonRevenu: 1 },
      R31: { mouvement: 0.25, vols: 5, convoisV4: 4 },
      R32: { quartiers: 7, iou: 0.5, premiereFois: 60 },
      R34: { court: 0.5, long: 0.4, rapport: 0.8 },
      R35: { relance: 2, v1Max: 24 },
      R37: { cyan: 0.08, silence: 3 },
      direction: { flashsAire: 0.066, brasier: 0.08, brasierImages: 4, camera: 6, musiqueFenetre: 4, musiqueTolerance: 0.01, musiqueDuree: 180, p95: 16.7 },
      lots: {
        accelerationSlalom: 60, rayonVirageTolerance: 1, recentrages: 120, recentrageCourt: 0.30, recentrageAutreDoigt: 0.10,
        gestes: 20, balayages: 50, bordPx: 10, appuiTenu: 0.5, accelerationAppui: 0.32,
        rotations: 5, monotonieImages: 600, pasFixeEcart: 0.01, travellingEcart: 0.01,
        lassoBruite: { graines: 50, reussite: 0.8, longueurs: [8, 20, 40] }, reapparitions: 200,
        mortsMenace: 48, journalMinutes: 10, dpsTolerance: 0.10, paliersPixels: 0.10, passifTolerance: 0.02,
        silhouettesIou: 0.6, quartiersIou: 0.5, flashsChaine: { explosions: 30, duree: 2 }, ralentiGelMax: 0.5,
        teleImages: 1, scene: { evenements: 50, explosions: 24, teles: 30 }, apparitionsGraines: 20, portails: 0.99,
        jointureMs: 1, calageMs: 10, memoireMo: 25, nonRegressionMinutes: 10
      }
    }
  };

  /* codex-p6 — fixtures de test, REFONTE § 7.12 ; jamais lues en partie normale. */
  R.tests = {
    scenes: {
      charge: { ennemis: 30, tirs: 60 },
      boss: { phase: 3, preparationMax: 120 },
      lasso6: { cibles: 6, longueur: 20, colonnes: 3, ecart: 12 },
      inversion: { proies: 12, vague: 2 },
      convoi: { cibles: 6, voie: 2, sens: 1, avance: 0.25 },
      travelling: { vague: 3, queueMur: 40, depuis: 128, sens: 1 },
      groupe: { colonnes: 8, marge: 24, ecart: 20, devant: 64 }
    },
    masque: { radar: { retraitBouton: 4, bord: 1 } }, // géométrie du marqueur de tête de 78-hud
    mesureVM: { chauffe: 5, images: 30 } // coût du dessin instrumenté, hors qualification navigateur
  };

  /* ---- les formules : une seule écriture pour tous les lots ---- */
  R.f = {
    /* taux de virage maximal (rad/s) à la vitesse v */
    virage: function (v) { return v / R.joueuse.rayonVirage; },
    /* part du taux de virage pour une course m du manche (0..1) */
    deflexion: function (m) {
      var a = R.joueuse.deflexion.min, b = R.joueuse.deflexion.pleine;
      return m <= a ? 0 : (m >= b ? 1 : (m - a) / (b - a));
    },
    /* durée de la traînée du lasso */
    traine: function (L, braise) { return R.lasso.traine.base + R.lasso.traine.parSegment * L + ((braise | 0) >= 2 ? R.lasso.traine.braise2 : 0); },
    degatsLasso: function (L, braise) { return (R.lasso.degats.base + R.lasso.degats.parSegment * L) * ((braise | 0) >= 2 ? R.lasso.degats.braise2 : 1); },
    mult: function (chaine) { return Math.min(R.score.mult.max, 1 + Math.floor(chaine / R.score.mult.pas)); },
    /* destructions qui manquent pour le palier suivant (« ×3 DANS 4 ») ; 0 au plafond */
    objectif: function (chaine) { var m = R.f.mult(chaine); return m >= R.score.mult.max ? 0 : m * R.score.mult.pas - chaine; },
    longueurReapparition: function (L) { return Math.max(R.vies.reapparition.longueurMin, Math.ceil(L * R.vies.reapparition.longueurPart)); },
    longueurCoupe: function (k) { return Math.max(R.mort.coupe.longueurMin, k); },
    cellulesCoupe: function (L, k) { return Math.floor((L - R.f.longueurCoupe(k)) / R.mort.coupe.segmentsParCellule); },
    horizon: function (h, c, portrait) { var p = portrait ? R.decor.horizon.portrait : R.decor.horizon.paysage; return Math.floor(h * (p[0] - p[1] * c)); },
    bonusCyclope: function (duree) { var p = R.score.primes.cyclope; return Math.max(0, p.tempsRef - duree) * p.parSeconde; },
    devore: function (rang) { var p = R.score.primes.devore; return p[Math.min(rang, p.length - 1)]; },
    pvElite: function (pv) { return pv * R.elites.pv; },
    /* la vitesse de croisière du moment : 'v1'..'v5', 'defile', 'cyclope', 'cyclopeEnrage' */
    vitesse: function (moment) { return R.joueuse.vitesse[moment]; },
    /* niveau d'XP atteint pour un total d'XP */
    niveau: function (xp) { var s = R.xp.seuils, n = 0; while (n < s.length && xp >= s[n]) n++; return n; },
    tailleMain: function (choix) { return Math.min(R.cartes.tailleMain.max, R.cartes.tailleMain.base + Math.max(0, choix - 1)); }
  };

  /* codex-p1b : contrôle spatial et constructions. Ajouts seulement, avant le gel. */
  R.armes.onde = {
    nom: 'ONDE DE CHOC', place: 'autour', depart: 1.2, telegraphe: 0.4,
    mesures: 2, degatsBord: 0.45, pousseeBord: 0.4, conversion: 0.35,
    dessin: { depart: 3, duree: 0.28, epaisseur: 1, intensite: 0.5 },
    paliers: [
      { nom: 'I', rayon: 28, degats: 7, poussee: 28 },
      { nom: 'II', rayon: 36, degats: 9, poussee: 32, efface: true },
      { nom: 'III', rayon: 44, degats: 11, poussee: 36, efface: true, ralenti: 0.6, dureeRalenti: 0.6 },
      { nom: 'DÉFERLANTE', rayon: 56, degats: 20, poussee: 42, efface: true, ralenti: 0.6, dureeRalenti: 0.8,
        auraRayon: 16, auraDps: 25 }
    ]
  };
  R.armes.sillage = {
    nom: 'SILLAGE', place: 'derriere', pointsMax: 192, pas: 2, sautMax: 32, intensite: 0.5,
    paliers: [
      { nom: 'I', duree: 0.9, rayon: 1, dps: 18.75 },
      { nom: 'II', duree: 1.5, rayon: 2, dps: 28.57 },
      { nom: 'III', duree: 1.9, rayon: 2, dps: 41.67, ralenti: 0.78, dureeRalenti: 0.2 },
      { nom: 'MUR', duree: 2.4, rayon: 3, dps: 63.64, ralenti: 0.72, dureeRalenti: 0.2, efface: true }
    ]
  };
  R.passifs.perforation = { prises: 3, parPrise: 1 };
  R.passifs.surtension = { prises: 3, sautsParPrise: 1, porteeParPrise: 0.15 };
  R.passifs.epines = { prises: 3, dps: [18, 30, 42], dessinPas: 3, dessinLongueur: 2 };
  R.passifs.mods.perforation = 0;
  R.passifs.mods.surtension = 0;
  R.passifs.mods.epines = 0;
  R.armes.controle = { sautMax: 32, margeMur: 1, dureeVisuelleEpines: 0.2 };
  R.cartes.liste.onde = { famille: 'survie', rarete: 'rare', prises: 4 };
  R.cartes.liste.sillage = { famille: 'puissance', rarete: 'commune', prises: 4 };
  R.cartes.liste.perforation = { famille: 'canon', rarete: 'rare', prises: 3,
    prerequis: [{ id: 'canon', min: 2 }, { id: 'tourelles', min: 2 }] }; // OU
  R.cartes.liste.surtension = { famille: 'arc', rarete: 'commune', prises: 3, prerequis: [{ id: 'arc', min: 1 }] };
  R.cartes.liste.epines = { famille: 'survie', rarete: 'rare', prises: 3 };
  R.cartes.appels = { canon: 'perforation', tourelles: 'perforation', arc: 'surtension', sillage: 'braise', onde: 'epines' };
  R.cartes.poids.appel = 1.5;

  /* gel profond : N.R se lit, il ne s'écrit pas */
  (function geler(o) {
    if (o && typeof o === 'object' && !Object.isFrozen(o)) {
      Object.freeze(o);
      for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) geler(o[k]);
    }
  })(R);
  N.R = R;
})();
