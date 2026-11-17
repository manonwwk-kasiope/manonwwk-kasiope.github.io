/* Musiques originales, référencées aussi depuis une ouverture locale file://.
   Repères issus de musique/piste.json et musique/morceaux/morceaux.json. */
(() => {
  "use strict";

  const base = new URL(".", document.currentScript.src);
  const musique = "./audio/";
  const morceaux = [
    {
      fichier: musique + "neonvelocity-2.mp3", vitesse: 1,
      // Première mesure du PLATEAU puis 32 mesures de la prise originale.
      mesures: Array.from({ length: 33 }, (_, i) => 0.00978 + (10 + i) * 1.66947),
    },
    {
      fichier: musique + "electro-tension-t106.mp3", vitesse: 1.18,
      mesures: [46.573264, 48.510113, 50.446736, 52.381358, 54.322038,
        56.261830, 58.206396, 60.143906, 62.086472, 64.021264, 65.961943,
        67.895566, 69.841245, 71.778981, 73.719491, 75.654113, 77.595849,
        79.531528, 81.471264, 83.411943, 85.347849, 87.284528, 89.229208,
        91.159887, 93.102453],
    },
    {
      fichier: musique + "electro-titan-t112.mp3", vitesse: 1.055,
      mesures: [20.856536, 22.545036, 24.229750, 25.918357, 27.601964,
        29.294464, 30.975286, 32.662000, 34.348607, 36.036321, 37.713143,
        39.404964, 41.091679, 42.776500, 44.459107, 46.145821, 47.827536,
        49.515036, 51.199964, 52.882786, 54.569929, 56.247286, 57.929964,
        59.602643, 61.280214],
    },
    {
      fichier: musique + "neonvelocity-2.mp3", vitesse: 1,
      mesures: Array.from({ length: 11 }, (_, i) => 0.00978 + i * 1.66947),
    },
    {
      fichier: musique + "voix-machine-t106.mp3", vitesse: 1.09,
      mesures: [29.398906, 31.208, 33.021491, 34.827811, 36.648019,
        38.457226, 40.272377, 42.080698, 43.895906, 45.707170, 47.517491,
        49.332698, 51.144132, 52.956396, 54.761717, 56.577094, 58.395189,
        60.203623, 62.018660, 63.824208, 65.631698, 67.446019, 69.245906,
        71.051509, 72.861226],
    },
    {
      fichier: musique + "voix-plus-vite-t108.mp3", vitesse: 1.08,
      mesures: [30.411815, 32.176392, 33.942043, 35.710769, 37.467643,
        39.226517, 40.989391, 42.746265, 44.515213, 46.272012, 48.037035,
        49.794983, 51.558005, 53.312175, 55.069420, 56.827665, 58.584984,
        60.339228, 62.093695, 63.854014, 65.609333, 67.366800, 69.120268,
        70.877809, 72.629350],
    },
  ];

  const epoques = [
    { piste: 3, onde: "square", hauteur: .75, volume: .42 }, // 1976, terminal
    { piste: 0, onde: "triangle", hauteur: 1, volume: 1 }, // 1985, Neon Velocity
    { piste: 1, onde: "triangle", hauteur: .84, volume: 1 }, // 2185, Tension
    { piste: 5, onde: "sine", hauteur: 1.5, volume: 1 }, // 2985, Plus vite
  ];
  // Motifs BETE et NEON de la composition d'origine (src/68-terminal.js).
  const terminal = [[72, 0, 67, 0, 72, 0, 67, 67], [74, 0, 77, 0, 81, 0, 79, 77]];
  const indiceEpoque = (index) => Math.min(epoques.length - 1, Math.max(0, Math.trunc(index) || 0));
  let epoque = 0, sceneActive = false, pression = 0, duel = null, prochainBoss = "mid";
  let niveau = 1, relache = 0, dernierAccent = -1;
  let sortieFin, sortieMusique, sortieMotif, compresseur, limiteur, bruit, finJusqua = 0, serieCellules = 0;
  const voixActives = new Map();
  const maxVoix = 24;
  const borne = (x) => Math.max(0, Math.min(1, x));
  let musicLevel = .82, fxLevel = .72;
  try {
    const levels = JSON.parse(localStorage.getItem("snake2985.volumes"));
    if (Number.isFinite(levels?.music)) musicLevel = borne(levels.music);
    if (Number.isFinite(levels?.fx)) fxLevel = borne(levels.fx);
  } catch {}

  const preference = "snake2985.muet";
  let muet = true;
  try { muet = localStorage.getItem(preference) !== "0"; } catch {}
  let enPartie = false, enPause = false;
  let piste = 0, cible = 0, changement = Infinity;
  let origine = morceaux[0].mesures[0], horodatage = 0;
  let lecteur, chargee, audioFX, sortieFX, image = 0, demande = 0, fxRecents = {};

  const horloge = () => performance.now() / 1000;
  const enMarche = () => enPartie && !enPause;
  function mixer() {
    const musiqueGain = (piste === 3 ? .39 : .79) * musicLevel;
    if (lecteur) {
      lecteur.volume = sortieMusique ? 1 : musiqueGain;
      lecteur.muted = muet || !musicLevel || !enMarche();
    }
    if (sortieMusique) sortieMusique.gain.value = musiqueGain;
    if (sortieMotif) sortieMotif.gain.value = muet || !enMarche() ? 0 : .22 * musicLevel;
    if (sortieFX) sortieFX.gain.value = muet || !enMarche() ? 0 : .32 * fxLevel;
    if (sortieFin) sortieFin.gain.value = !muet && (enMarche() || audioFX.currentTime < finJusqua) ? .32 * fxLevel : 0;
  }
  function setVolumes({music, fx} = {}) {
    if (Number.isFinite(music)) musicLevel = borne(music);
    if (Number.isFinite(fx)) fxLevel = borne(fx);
    try { localStorage.setItem("snake2985.volumes", JSON.stringify({music: musicLevel, fx: fxLevel})); } catch {}
    mixer();
  }
  function ancrer(position) {
    origine = position;
    horodatage = horloge();
  }

  function position() {
    if (enMarche() && !muet && lecteur && chargee === piste &&
        !lecteur.paused && !lecteur.seeking && lecteur.readyState >= 2 &&
        lecteur.currentTime >= morceaux[piste].mesures[0]) return lecteur.currentTime;
    return origine + (enMarche() ? (horloge() - horodatage) * morceaux[piste].vitesse : 0);
  }

  function mesure(positionPiste) {
    const barres = morceaux[piste].mesures;
    const suivante = barres.findIndex((t) => t > positionPiste);
    return suivante < 0 ? barres.length - 2 : Math.max(0, suivante - 1);
  }

  function beat() {
    const t = position(), barres = morceaux[piste].mesures, i = mesure(t);
    const temps = Math.max(0, 4 * (t - barres[i]) / (barres[i + 1] - barres[i]));
    return temps - Math.floor(temps);
  }

  function jouerFichier() {
    if (muet || !enMarche()) return;
    if (!lecteur) {
      lecteur = new Audio();
      lecteur.preload = "auto";
      lecteur.playsInline = true;
      lecteur.volume = 0.65;
    }
    const fichier = morceaux[piste], t = position(), numero = ++demande;
    if (chargee !== piste) {
      chargee = piste;
      const adresse = new URL(fichier.fichier, base).href;
      if (lecteur.src !== adresse) lecteur.src = adresse;
    }
    lecteur.preservesPitch = true;
    lecteur.playbackRate = fichier.vitesse;
    mixer();
    // Safari peut différer un seek tant que le MP3 n'a pas livré sa durée.
    lecteur.onloadedmetadata = () => {
      if (numero === demande && enMarche() && !muet && lecteur.currentTime < fichier.mesures[0])
        lecteur.currentTime = t;
    };
    try { lecteur.currentTime = t; } catch { /* onloadedmetadata applique le repère. */ }
    const essai = lecteur.play();
    if (essai) essai.catch(() => {
      // Un refus du navigateur conserve la grille visuelle et permet un nouvel essai au toucher.
      if (numero === demande && enMarche()) ancrer(position());
    });
  }

  function basculer() {
    lecteur?.pause();
    piste = cible;
    changement = Infinity;
    dernierAccent = -1;
    ancrer(morceaux[piste].mesures[0]);
    jouerFichier();
  }

  function avancer() {
    image = 0;
    if (!enMarche()) return;
    const t = position(), barres = morceaux[piste].mesures;
    if (t >= changement) basculer();
    else if (t >= barres[barres.length - 1]) {
      const debut = barres[0];
      const reprise = debut + (t - debut) % (barres[barres.length - 1] - debut);
      ancrer(reprise);
      if (lecteur && !muet) lecteur.currentTime = reprise;
      dernierAccent = -1;
    }
    jouerPression();
    image = requestAnimationFrame(avancer);
  }

  function demanderPiste(nouvelle) {
    if (cible === nouvelle || !enPartie) return;
    cible = nouvelle;
    changement = cible === piste ? Infinity : morceaux[piste].mesures[mesure(position()) + 1];
  }
  function sector(n) {
    if (!sceneActive) demanderPiste(n >= 5 ? 2 : n >= 3 ? 1 : 0);
  }

  function scene(eraIndex, difficulty, nearBoss, bossKind, nextBossKind) {
    if (!enPartie) return;
    sceneActive = true;
    epoque = indiceEpoque(eraIndex);
    niveau = Math.min(10, Math.max(1, Number(difficulty) || 1));
    pression = Math.min(1, Math.max(0, Number(nearBoss) || 0));
    duel = bossKind === "mid" || bossKind === "final" ? bossKind : null;
    if (nextBossKind === "mid" || nextBossKind === "final") prochainBoss = nextBossKind;
    else if (duel || niveau > 5) prochainBoss = duel || "final";
    const cibleScene = duel === "final" ? 2 : duel === "mid" ? 4 : epoques[epoque].piste;
    demanderPiste(cibleScene);
  }

  // Le regard en avance d'une fraction de temps compense le cadencement d'affichage.
  // Les sous-divisions sont recalculées sur les vrais débuts de mesures du MP3.
  function jouerPression() {
    if (muet || !sceneActive || audioFX?.state !== "running" || !sortieFX || horloge() < relache) return;
    const puce = musicLevel > 0 && piste === 3 && epoque === 0 && !duel;
    if (!puce && !duel && pression < .16) return;
    const t = position(), barres = morceaux[piste].mesures, i = mesure(t);
    const subdivision = (barres[i + 1] - barres[i]) / 8;
    const pas = Math.max(0, Math.ceil((t - barres[i]) / subdivision - .035));
    const repere = i * 8 + pas;
    const delai = (barres[i] + pas * subdivision - t) / morceaux[piste].vitesse;
    if (repere === dernierAccent || delai > .09 || t + delai * morceaux[piste].vitesse >= changement) return;
    dernierAccent = repere;
    const quand = audioFX.currentTime + Math.max(0, delai);
    if (puce) {
      const phrase = Math.floor(repere / 8) % 4;
      const note = terminal[Number(phrase === 1 || (phrase === 3 && niveau > 2))][repere % 8];
      if (note && (phrase !== 2 || pas % 4 === 0)) {
        const hz = 440 * Math.pow(2, (note - 69) / 12);
        noteFX(quand, hz, hz, subdivision * .53, "square", .14, sortieMotif);
      }
    }
    if (!fxLevel || (!duel && pression < .16)) return;
    const force = duel ? .92 : pression;
    const final = (duel || prochainBoss) === "final";
    const division = force < .4 ? 8 : force < .7 ? 4 : 2;
    const surTemps = repere % division === 0;
    const relance = final && force > .66 && repere % 8 === 7;
    if (!surTemps && !relance) return;
    const racine = final ? 55 : 73.42;
    const note = relance || (duel && repere % 32 === 24) ? racine * 1.5 : racine;
    const volume = (.10 + .39 * force) * (relance ? .63 : 1);
    noteFX(quand, note * 1.7, note, final ? .22 : .14,
      final ? "triangle" : "sine", volume, sortieFX);
    if (repere % 8 === 0 && force > .43) {
      const octave = final ? 2.828 : 2;
      noteFX(quand, racine * octave, racine * octave, .21,
        epoques[epoque].onde, volume * .33 * epoques[epoque].volume, sortieFX);
    }
  }

  function preparerFX() {
    const Contexte = window.AudioContext || window.webkitAudioContext;
    if (!Contexte || muet || !enMarche()) return;
    try {
      if (!audioFX) {
        audioFX = new Contexte();
        compresseur = audioFX.createDynamicsCompressor();
        compresseur.threshold.value = -15;
        compresseur.knee.value = 10;
        compresseur.ratio.value = 8;
        compresseur.attack.value = .004;
        compresseur.release.value = .14;
        // Courbe linéaire jusqu’à −3 dB, puis coude doux borné à −0,5 dB.
        limiteur = audioFX.createWaveShaper();
        limiteur.curve = Float32Array.from({length: 4097}, (_, i) => {
          const x = (i - 2048) / 2048, a = Math.abs(x);
          return a <= .70 ? x : Math.sign(x) * (.70 + .24 * Math.tanh((a - .70) / .24));
        });
        limiteur.connect(audioFX.destination);
        compresseur.connect(limiteur);
        sortieFX = audioFX.createGain();
        sortieFX.connect(compresseur);
        sortieFin = audioFX.createGain();
        sortieFin.connect(compresseur);
        sortieMotif = audioFX.createGain();
        sortieMotif.connect(limiteur);
      }
      // Sur le site, un GainNode assure aussi le réglage sur iOS. En file://
      // la lecture native évite le silence imposé aux médias d'origine opaque.
      if (!sortieMusique && lecteur && /^https?:$/.test(base.protocol)) {
        const source = audioFX.createMediaElementSource(lecteur);
        sortieMusique = audioFX.createGain();
        source.connect(sortieMusique);
        sortieMusique.connect(limiteur);
      }
      mixer();
      if (audioFX.state !== "running") audioFX.resume().catch(() => {});
    } catch { /* La musique via Audio reste disponible seule. */ }
  }

  const ponctuations = {
    cell: [554.37, 830.61, .10], upgrade: [415.30, 830.61, .22],
    bossDefeated: [220, 440, .21], win: [440, 880, .32], clear: [440, 880, .32],
    riftOpen: [220, 659.25, .18],
    riftPickup: [659.25, 329.63, .31], bonus: [440, 659.25, .16],
  };
  function accueillir(priorite) {
    if (voixActives.size < maxVoix) return true;
    let candidate;
    for (const [source, voix] of voixActives) {
      if (voix.priorite < priorite && (!candidate || voix.priorite < candidate.voix.priorite))
        candidate = {source, voix};
    }
    if (!candidate) return false;
    candidate.voix.gain.disconnect();
    candidate.source.stop();
    voixActives.delete(candidate.source);
    return true;
  }

  function couche(t, duree, amplitude, attaque, sortie, priorite, source, filtre) {
    const gain = audioFX.createGain(), fin = t + duree;
    gain.gain.setValueAtTime(.0001, t);
    gain.gain.exponentialRampToValueAtTime(amplitude, t + Math.min(attaque, duree / 2));
    gain.gain.exponentialRampToValueAtTime(.0001, fin);
    if (filtre) { source.connect(filtre); filtre.connect(gain); }
    else source.connect(gain);
    gain.connect(sortie);
    voixActives.set(source, {sortie, gain, priorite});
    source.onended = () => {
      voixActives.delete(source); source.disconnect(); filtre?.disconnect(); gain.disconnect();
    };
    source.start(t);
    source.stop(fin + .005);
  }

  function noteFX(t, depart, fin, duree, onde, amplitude, sortie, attaque = .006, priorite = 0) {
    if (!accueillir(priorite)) return;
    const voix = audioFX.createOscillator();
    voix.type = onde;
    voix.frequency.setValueAtTime(depart, t);
    voix.frequency.exponentialRampToValueAtTime(fin, t + duree);
    couche(t, duree, amplitude, attaque, sortie, priorite, voix);
  }

  function souffleFX(t, depart, fin, duree, amplitude, attaque, sortie, priorite) {
    if (!accueillir(priorite)) return;
    if (!bruit) {
      bruit = audioFX.createBuffer(1, audioFX.sampleRate, audioFX.sampleRate);
      const echantillons = bruit.getChannelData(0);
      let graine = 2985;
      for (let i = 0; i < echantillons.length; i++) {
        graine = (Math.imul(1664525, graine) + 1013904223) >>> 0;
        echantillons[i] = graine / 2147483648 - 1;
      }
    }
    const source = audioFX.createBufferSource(), filtre = audioFX.createBiquadFilter();
    source.buffer = bruit;
    source.loop = true;
    filtre.type = "bandpass"; filtre.Q.value = .78;
    filtre.frequency.setValueAtTime(depart, t);
    filtre.frequency.exponentialRampToValueAtTime(fin, t + duree);
    couche(t, duree, amplitude, attaque, sortie, priorite, source, filtre);
  }

  function bruitage(nom, info, t, sortie, priorite) {
    // Chaque famille associe attaque, corps et réponse de l’arène à échelle de jeu.
    const ton = (d, a, b, l, o, v, att = .006) => noteFX(t+d, a, b, l, o, v, sortie, att, priorite);
    const air = (d, a, b, l, v, att = .004) => souffleFX(t+d, a, b, l, v, att, sortie, priorite);
    if (nom === "rail") {
      switch (epoque) {
        case 0: // relais court, contact sec puis résonance métallique
          air(0, 2500, 780, .028, .65); ton(.009, 390, 327, .092, "triangle", .29);
          ton(.014, 746, 733, .064, "sine", .15); break;
        case 1: // attaque à l’octave, sifflement plongeant et fantôme du laser
          ton(0, 1150, 180, .145, "triangle", .45); ton(.005, 545, 102, .11, "sine", .30);
          ton(.071, 894, 161, .14, "sine", .15); break;
        case 2: // tir d’induction, appel d’air puis deux impacts magnétiques
          air(0, 470, 1800, .064, .66, .029); ton(.035, 235, 76, .16, "sine", .48);
          air(.068, 1600, 420, .091, .51); break;
        case 3: // prisme, bourdon montant et balayage opposé
          ton(0, 160, 590, .105, "triangle", .36); ton(.018, 1480, 320, .13, "sine", .28);
          ton(.095, 380, 710, .13, "triangle", .16, .019); break;
      }
      return;
    }
    if (nom === "arc") {
      const nombre = Math.min(5, Math.max(1, Number(info?.targets) || 1));
      const pas = [.046, .067, .038, .078][epoque];
      for (let i = 0; i < nombre; i++) {
        const d = pas * i, v = 1 / (1 + .18 * i), rapport = 1 + .11 * i;
        if (epoque === 0) {
          ton(d, 312 * rapport, 250, .032, "square", .24*v);
          ton(d+.014, 650, 645 * rapport, .035, "sine", .18*v);
        } else if (epoque === 1) {
          ton(d, 390, 1150 * rapport, .09, "triangle", .29*v, .015);
          ton(d+.033, 760 * rapport, 425, .074, "sine", .23*v);
        } else if (epoque === 2) {
          air(d, 3650, 760, .046, .94*v);
          air(d+.015, 1900, 4100, .029, .6*v);
          ton(d+.009, 610 * rapport, 185, .073, "sine", .20*v);
        } else {
          ton(d, 196 * rapport, 660, .13, "sine", .32*v, .022);
          ton(d+.038, 1090, 790 * rapport, .18, "triangle", .18*v);
        }
      }
      return;
    }
    if (nom === "nova") {
      switch (epoque) {
        case 0: // décharge d'un condensateur, en trois crans descendants
          [320,180,82].forEach((f,i)=>ton(i*.058,f,f*.65,.11,"square",.26-.04*i));
          air(.13, 620, 180, .18, .65); break;
        case 1: // explosion de caisse réverbérée et accord suspendu
          air(0, 2400, 410, .29, 1.2); ton(0, 172, 52, .27, "sine", .71);
          ton(.09, 330, 260, .36, "triangle", .24); air(.18, 1000, 400, .17, .43); break;
        case 2: // implosion, vide, puis onde repoussée
          air(0, 200, 2700, .2, .94, .13); ton(.16, 82, 278, .18, "sine", .56, .026);
          air(.31, 1600, 260, .28, .83); break;
        case 3: // attaque subgrave, fracture, impact et queue harmonique
          ton(0, 150, 44, .49, "sine", .92); air(.012, 3600, 560, .13, 1.05);
          ton(.072, 132, 51, .28, "triangle", .42); air(.12, 1200, 215, .58, .97, .047);
          ton(.19, 220, 164.81, .63, "sine", .39, .055); break;
      }
      return;
    }
    switch (nom) {
      case "boss": // rotor d’armement à pales décalées
        [0,.082,.148,.202].forEach((d,i)=>ton(d,69+12*i,52,.115,"triangle",.35+i*.045));
        air(.06, 380, 1460, .26, .74, .05); return;
      case "bossAttack":
        if (info?.kind === "final") {
          air(0, 520, 2500, .20, .78, .09);
          ton(0, 123.47, 246.94, .18, "triangle", .36, .06);
          ton(.19, 174.61, 349.23, .17, "triangle", .38, .042);
        } else {
          ton(0, 164.81, 185, .09, "square", .19);
          ton(.12, 246.94, 277.18, .11, "triangle", .32);
        }
        return;
      case "bossVolley": // déclenchement au départ réel des projectiles
        air(0, info?.kind === "final" ? 3400 : 1900, 340, .20, .85);
        ton(.015, info?.kind === "final" ? 175 : 235, 61.74, .21, "sine", .54); return;
      case "bossHit":
        if (info?.heart) {
          ton(0, 132, 49, .24, "sine", .72); ton(.077, 92, 56, .17, "triangle", .41);
          air(0, 860, 290, .07, .46);
        } else {
          ton(0, 542, 509, .18, "sine", .47); ton(.007, 875, 811, .12, "triangle", .22);
          air(0, 2100, 1150, .035, .62);
        }
        return;
      case "recover":
        ton(0, 246.94, 329.63, .12, "sine", .32);
        ton(.09, 329.63, 493.88, .22, "triangle", .25); return;
      case "kill":
        air(0, 1250, 380, .088, .62); ton(.008, 165, 78, .095, "sine", .31); return;
      case "timejump":
        air(0, 220, 3800, .47, .92, .21);
        [130.81,196,261.63].forEach((f,i)=>ton(i*.088,f,f*6,.35,"sine",.35,.045));
        ton(.35, 523.25, 261.63, .31, "triangle", .28, .022); return;
      case "death":
        air(0, 2000, 240, .20, .86); ton(0, 261.63, 65.41, .42, "triangle", .49);
        ton(.10, 138.59, 46.25, .42, "sine", .42); return;
      default:
        const timbre = ponctuations[nom];
        if (!timbre) return;
        const palette = epoques[epoque];
        const accord = nom === "cell" ? [1, 1.25, 1.5, 1.875][serieCellules++ % 4] : 1;
        const hauteur = palette.hauteur * accord;
        ton(0, timbre[0]*hauteur, timbre[1]*hauteur, timbre[2], palette.onde, palette.volume*.40);
        if (nom === "bossDefeated" || nom === "win" || nom === "clear")
          ton(.14, 329.63, 659.25, .35, "sine", .33);
    }
  }

  function event(info) {
    let nom = typeof info === "string" ? info : info?.type;
    if (nom === "shot") nom = info?.kind === "arc" ? "arc" : "rail";
    if (nom === "bossDefeated") {
      if (info?.kind !== "final") prochainBoss = "final";
      relache = horloge() + 1.5;
    }
    if (nom === "riftPickup") relache = horloge() + 3;
    if (muet || !fxLevel || !enMarche() || audioFX?.state !== "running" || !sortieFX) return;
    const t = audioFX.currentTime;
    const intervalle = {rail:.22, arc:.12, bossHit:.12, kill:.085}[nom] ?? .055;
    if (t - (fxRecents[nom] ?? -1) < intervalle) return;
    fxRecents[nom] = t;
    const fin = nom === "death" || nom === "win" || nom === "clear";
    if (fin) finJusqua = t + .6;
    const fond = nom === "rail" || nom === "kill";
    const fort = nom === "nova" || nom === "bossVolley" || nom === "timejump" || (nom === "bossHit" && info?.heart);
    bruitage(nom, info, t, fin ? sortieFin : sortieFX, fin ? 3 : fort ? 2 : fond ? 0 : 1);
  }

  function taireFX(garderFin = false) {
    if (sortieFX) sortieFX.gain.value = 0;
    if (sortieMotif) sortieMotif.gain.value = 0;
    if (sortieFin && !garderFin) sortieFin.gain.value = 0;
    for (const [voix, {sortie}] of voixActives) {
      if (sortie !== sortieFin || !garderFin) {
        try { voix.stop(); } catch {}
        voixActives.delete(voix);
      }
    }
  }
  function taire(garderFin = false) {
    ++demande;
    if (lecteur) { lecteur.muted = true; lecteur.pause(); }
    taireFX(garderFin);
    if (image) cancelAnimationFrame(image);
    image = 0;
  }
  function start(eraIndex = 0) {
    taire();
    epoque = indiceEpoque(eraIndex);
    sceneActive = false; pression = 0; duel = null; prochainBoss = "mid";
    relache = finJusqua = serieCellules = 0; dernierAccent = -1;
    enPartie = true; enPause = false; piste = cible = epoques[epoque].piste;
    changement = Infinity; fxRecents = {};
    ancrer(morceaux[piste].mesures[0]);
    jouerFichier(); preparerFX(); avancer();
  }
  function pause() {
    if (!enMarche()) return;
    ancrer(position()); enPause = true; taire();
  }
  function resume() {
    if (!enPartie || !enPause) return;
    ancrer(origine); enPause = false;
    jouerFichier(); preparerFX(); avancer();
  }
  function stop() {
    taire(!muet && audioFX?.currentTime < finJusqua);
    enPartie = false; enPause = false; sceneActive = false;
    piste = cible = 0; changement = Infinity; ancrer(morceaux[0].mesures[0]);
  }
  function setMuted(valeur) {
    ancrer(position()); muet = Boolean(valeur);
    try { localStorage.setItem(preference, muet ? "1" : "0"); } catch {}
    if (muet) {
      if (lecteur) { ++demande; lecteur.muted = true; lecteur.pause(); }
      taireFX();
    } else {
      jouerFichier(); preparerFX();
    }
  }

  window.SnakeSon = { start, setMuted, sector, scene, pause, resume, stop, event, beat,
    setVolumes, get musicLevel() { return musicLevel; }, get fxLevel() { return fxLevel; },
    get muted() { return muet; },
  };
})();
