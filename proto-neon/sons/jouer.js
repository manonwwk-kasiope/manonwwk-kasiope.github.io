/* SNAKE 2975 — le lecteur de reference de la banque de sons
   ==========================================================
   Transforme une recette de sons/banque.js en noeuds Web Audio, sur n'importe quel contexte
   (AudioContext du jeu ou OfflineAudioContext du banc : le code est le meme, donc on mesure ce qu'on
   joue). Aucune dependance. Le lot 7b le reprend dans 30-music.js, ou s'en inspire.

     var L = SONS_2975_JOUER.lecteur(ctx, SONS_2975, { sortie: noeud, graine: 2975 });
     L.jouer('kill', { t: ctx.currentTime, pitch: 3, pan: 0.28 });   // -> { duree, noeuds, cle }
     L.noeuds()                                                      // noeuds crees depuis le debut
   cfg.reserves = false desactive la reserve de voix (champ `reserve` des sons tres frequents).

   opts : t (instant, par defaut maintenant) ; pitch ; type (variante ou identifiant aliase) ;
          pan (si `panneurs` est fourni au lecteur, le son va au panoramique le plus proche ; sinon il
          sort sur `sortie`) ; total (duree d'un telegraphe, pour les sons etirables) ; gain (usure, 0-1) ;
          pile (rang d'empilement d'un kill, 1-12) ; sortie (remplace celle du lecteur pour ce son).

   La garde (FUSION, PLAFOND, USURE, empilement des kills, escalier du butin) est a part :
     var G = SONS_2975_JOUER.garde(SONS_2975);
     var d = G.demande('kill', t, opts);   // null si le son est fusionne ou plafonne ; sinon {t, opts}
     if (d) L.jouer('kill', d.opts) ;      // d.opts porte t, gain, pile, pitch
     G.stats()                             // { demandes, joues, fusionnes, plafonnes } par nom
*/
(function (racine) {
  'use strict';

  var NOMS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function midi(n) {
    if (typeof n === 'number') return n;
    var m = /^([A-G])(b|#)?(-?\d)$/.exec(n);
    if (!m) throw new Error('note illisible : ' + n);
    return 12 * (+m[3] + 1) + NOMS[m[1]] + (m[2] === 'b' ? -1 : m[2] === '#' ? 1 : 0);
  }
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* une duree : un nombre (s) ou une fraction de ronde au tempo ('1/8' = une croche) */
  function duree(v, bpm) {
    if (v === undefined || v === null) return 0;
    if (typeof v === 'number') return v;
    var m = /^(\d+)\/(\d+)$/.exec(v);
    if (!m) throw new Error('duree illisible : ' + v);
    return (+m[1] / +m[2]) * 4 * 60 / bpm;
  }

  /* monter de `pas` degres dans une gamme (relative au centre) ; une note hors gamme garde son ecart */
  function degres(m, pas, gamme, centre) {
    if (!pas) return m;
    var rel = m - centre, oct = Math.floor(rel / 12), pc = rel - oct * 12;
    var i = 0, r = 0;
    for (var k = gamme.length - 1; k >= 0; k--) if (gamme[k] <= pc) { i = k; r = pc - gamme[k]; break; }
    var j = i + pas, n = gamme.length, o2 = oct + Math.floor(j / n), jj = ((j % n) + n) % n;
    return centre + o2 * 12 + gamme[jj] + r;
  }

  function mulberry(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* la recette effective d'un son pour ces options : variante, alias, pile */
  function resoudre(B, nom, opts) {
    var s = B.sons[nom];
    if (!s) return null;
    var cle = nom, r = s;
    var t = opts && opts.type;
    if (t !== undefined && t !== null && s.variantes) {
      var v = s.alias && Object.prototype.hasOwnProperty.call(s.alias, t) ? s.alias[t] : t;
      if (v && s.variantes[v]) { r = s.variantes[v]; cle = nom + '.' + v; }
    }
    if (opts && opts.pile > 0 && s.pile) { r = s.pile; cle = nom + '.pile'; }
    return {
      cle: cle, base: s, couches: r.couches || s.couches,
      niveau: r.niveau !== undefined ? r.niveau : s.niveau,
      duree: r.duree !== undefined ? r.duree : s.duree
    };
  }

  function lecteur(ctx, B, cfg) {
    cfg = cfg || {};
    var T = B.tonalite, bpm = cfg.bpm || T.bpm, centre = 60 + T.classeCentre;
    var rnd = cfg.rng || mulberry(cfg.graine || 2975);
    var transpo = cfg.transpo || 0;            /* si la tonalite courante n'est pas re */
    var compte = 0;
    var sr = ctx.sampleRate;

    /* --- tampons et formes d'onde, crees une fois par contexte --- */
    var ondes = {};
    function regler(o, nom) { if (/^(pulse|doux|verre)/.test(nom)) o.setPeriodicWave(onde(nom)); else o.type = nom || 'sine'; }
    function onde(nom) {
      if (ondes[nom]) return ondes[nom];
      if (nom === 'verre') {
        /* une clochette : la fondamentale, la douzieme (harmonique 3) et la double octave (4), faibles */
        var vr = new Float32Array([0, 0, 0, 0, 0]), vi = new Float32Array([0, 1, 0, 0.3, 0.1]);
        return (ondes[nom] = ctx.createPeriodicWave(vr, vi));
      }
      var d = /12$/.test(nom) ? 0.125 : 0.25, nh = /^doux/.test(nom) ? 6 : 48;
      var re = new Float32Array(nh + 1), im = new Float32Array(nh + 1);
      for (var n = 1; n <= nh; n++) re[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * d);
      return (ondes[nom] = ctx.createPeriodicWave(re, im));
    }
    var bruits = {};
    function bruit(nom) {
      if (bruits[nom]) return bruits[nom];
      var len = Math.floor(sr * 1.0), b = ctx.createBuffer(1, len, sr), x = b.getChannelData(0);
      var g = mulberry(nom === 'metal' ? 93 : nom === 'grave' ? 7 : nom === 'medium' ? 5 : 3), i;
      if (nom === 'metal') {
        /* registre a decalage de 15 bits, mode court (NES) : 93 pas, metallique */
        var reg = 1, hold = Math.max(1, Math.round(sr / 22050)), v = 1;
        for (i = 0; i < len; i++) {
          if (i % hold === 0) { var fb = ((reg & 1) ^ ((reg >> 6) & 1)); reg = (reg >> 1) | (fb << 14); v = (reg & 1) ? 1 : -1; }
          x[i] = v * 0.7;
        }
      } else {
        for (i = 0; i < len; i++) x[i] = g() * 2 - 1;
        if (nom === 'medium' || nom === 'grave') {
          /* filtres a un pole appliques a la creation : pas de noeud de filtre a la lecture */
          var fh = nom === 'medium' ? 500 : 30, fl = nom === 'medium' ? 3000 : 700;
          var ah = Math.exp(-2 * Math.PI * fh / sr), al = 1 - Math.exp(-2 * Math.PI * fl / sr);
          var px = 0, py = 0, lp = 0, lp2 = 0, mx = 0;
          for (i = 0; i < len; i++) {
            var hp = ah * (py + x[i] - px); px = x[i]; py = hp;
            lp += al * (hp - lp); lp2 += al * (lp - lp2);
            x[i] = lp2; if (Math.abs(lp2) > mx) mx = Math.abs(lp2);
          }
          for (i = 0; i < len; i++) x[i] = x[i] / mx * 0.9;
        }
      }
      return (bruits[nom] = b);
    }
    var courbes = {};
    function courbe(k) {
      var key = String(k);
      if (courbes[key]) return courbes[key];
      var n = 2049, c = new Float32Array(n), nrm = Math.tanh(k);
      for (var i = 0; i < n; i++) { var x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(k * x) / nrm; }
      return (courbes[key] = c);
    }

    function nn(node) { compte++; return node; }
    var alea = 0;                              /* desaccord aleatoire du son en cours (cents), commun a ses couches */

    /* l'enveloppe : 0 -> c en a (lineaire), tenue h, chute exponentielle en d ; rend l'instant de fin */
    function enveloppe(p, t, e, pic, k) {
      var a = Math.max(0.001, (e.a || 0) * k), h = (e.h || 0) * k, d = Math.max(0.005, (e.d || 0.05) * k);
      p.setValueAtTime(0, t);
      p.linearRampToValueAtTime(pic, t + a);
      if (h > 0) p.setValueAtTime(pic, t + a + h);
      p.exponentialRampToValueAtTime(Math.max(1e-6, pic * 1e-3), t + a + h + d);
      p.setValueAtTime(0, t + a + h + d + 0.002);
      return t + a + h + d + 0.003;
    }

    /* une couche ; f transpose une hauteur MIDI ; k etire le temps ; mul est le gain final */
    function couche(L, t0, f, k, mul, sortie, nombre, v) {
      var notes = L.notes ? L.notes.slice() : [L.note || 'A4'];
      if (nombre && L.notes) notes = notes.slice(0, nombre);
      var temps = [], i;
      for (i = 0; i < notes.length; i++) {
        temps.push(L.temps ? duree(L.temps[i], bpm) : duree(L.ecart || 0, bpm) * i);
      }
      var t1 = t0 + duree(L.retard || 0, bpm) * k, fin = t1;
      var suit = L.suit !== false;
      var m0 = midi(notes[0]);
      var gl = L.vers !== undefined ? midi(L.vers) - m0 : L.glisse || 0;
      var gd = (L.gduree !== undefined ? L.gduree : (L.env.a || 0) + (L.env.h || 0) + (L.env.d || 0)) * k;
      var e = L.env, pic = (e.c === undefined ? 1 : e.c) * mul;
      if (L.legato || v) return voix(L, notes, temps, t1, f, k, pic, sortie, suit, gl, gd, v);
      for (i = 0; i < notes.length; i++) {
        var t = t1 + temps[i] * k;
        var m = suit ? f(midi(notes[i])) + transpo : midi(notes[i]) + transpo;
        var src, g = nn(ctx.createGain()), tete = g;
        if (L.src === 'bruit') {
          src = nn(ctx.createBufferSource()); src.buffer = bruit(L.bruit || 'blanc'); src.loop = true;
          var vit = L.vitesse || 1;
          src.playbackRate.value = vit;
          src.loopStart = 0; src.loopEnd = src.buffer.duration;
        } else {
          src = nn(ctx.createOscillator());
          regler(src, L.onde);
          var det = (L.desaccord || 0) + alea;
          var f0 = hz(m) * Math.pow(2, det / 1200);
          src.frequency.setValueAtTime(f0, t);
          if (gl) src.frequency.exponentialRampToValueAtTime(f0 * Math.pow(2, gl / 12), t + Math.max(0.005, gd));
          if (L.vibrato && L.vibrato.c) {
            var lfo = nn(ctx.createOscillator()), lg = nn(ctx.createGain());
            lfo.frequency.value = L.vibrato.f; lg.gain.setValueAtTime(0, t);
            lg.gain.linearRampToValueAtTime(L.vibrato.c, t + (L.vibrato.retard || 0.02) * k + 0.05);
            lfo.connect(lg); lg.connect(src.detune); lfo.start(t);
            src._lfo = lfo;
          }
          if (L.mod) {
            var mo = nn(ctx.createOscillator()), mg = nn(ctx.createGain());
            mo.frequency.setValueAtTime(f0 * L.mod.ratio, t);
            if (gl) mo.frequency.exponentialRampToValueAtTime(f0 * L.mod.ratio * Math.pow(2, gl / 12), t + Math.max(0.005, gd));
            mg.gain.setValueAtTime(L.mod.indice * f0, t);
            mg.gain.linearRampToValueAtTime((L.mod.fin === undefined ? L.mod.indice : L.mod.fin) * f0, t + (L.mod.duree || 0.2) * k);
            mo.connect(mg); mg.connect(src.frequency); mo.start(t);
            src._mod = mo;
          }
        }
        var chaine = src;
        if (L.sature) { var ws = nn(ctx.createWaveShaper()); ws.curve = courbe(L.sature); chaine.connect(ws); chaine = ws; }
        if (L.filtre) {
          var bq = nn(ctx.createBiquadFilter()), F = L.filtre;
          bq.type = F.type; bq.Q.value = F.q === undefined ? 0.7 : F.q;
          bq.frequency.setValueAtTime(F.f, t);
          if (F.vers) bq.frequency.exponentialRampToValueAtTime(F.vers, t + (F.duree || 0.1) * k);
          chaine.connect(bq); chaine = bq;
        }
        chaine.connect(g); g.connect(sortie);
        var te = enveloppe(g.gain, t, e, pic, k);
        src.start(t); src.stop(te);
        if (src._lfo) src._lfo.stop(te);
        if (src._mod) src._mod.stop(te);
        if (te > fin) fin = te;
      }
      return fin;
    }

    /* une seule voix pour toute une suite de notes (salve, meche, sirene) : chaque note coupe la precedente */
    function voix(L, notes, temps, t1, f, k, pic, sortie, suit, gl, gd, v) {
      var src, g, e = L.env, i;
      var bq = null;
      if (v) {
        /* une voix de la reserve : deja creee et branchee, on ne fait que reprogrammer ses parametres */
        src = v.o; g = v.g; bq = v.bq;
        if (src.frequency) src.frequency.cancelScheduledValues(t1);
        g.gain.cancelScheduledValues(t1);
        if (bq) bq.frequency.cancelScheduledValues(t1);
      } else g = nn(ctx.createGain());
      if (v) { /* rien a creer */ } else if (L.src === 'bruit') {
        src = nn(ctx.createBufferSource()); src.buffer = bruit(L.bruit || 'blanc'); src.loop = true;
        src.playbackRate.value = L.vitesse || 1;
      } else {
        src = nn(ctx.createOscillator());
        regler(src, L.onde);
        if (L.vibrato && L.vibrato.c) {
          var lfo = nn(ctx.createOscillator()), lg = nn(ctx.createGain());
          lfo.frequency.value = L.vibrato.f; lg.gain.value = L.vibrato.c;
          lfo.connect(lg); lg.connect(src.detune); lfo.start(t1); src._lfo = lfo;
        }
      }
      if (!v) {
        var chaine = src;
        if (L.sature) { var ws = nn(ctx.createWaveShaper()); ws.curve = courbe(L.sature); chaine.connect(ws); chaine = ws; }
        if (L.filtre) {
          bq = nn(ctx.createBiquadFilter()); bq.type = L.filtre.type; bq.Q.value = L.filtre.q === undefined ? 0.7 : L.filtre.q;
          chaine.connect(bq); chaine = bq;
        }
        chaine.connect(g); g.connect(sortie);
      }
      var det = (L.desaccord || 0) + alea, fin = t1;
      g.gain.setValueAtTime(0, t1);
      for (i = 0; i < notes.length; i++) {
        var t = t1 + temps[i] * k, suivant = i + 1 < notes.length ? t1 + temps[i + 1] * k : Infinity;
        var a = Math.max(0.001, (e.a || 0) * k), h = (e.h || 0) * k, d = Math.max(0.005, (e.d || 0.05) * k);
        var bout = Math.min(t + a + h + d, suivant - 0.002);
        if (src.frequency) {
          var m = suit ? f(midi(notes[i])) + transpo : midi(notes[i]) + transpo;
          var f0 = hz(m) * Math.pow(2, det / 1200);
          src.frequency.setValueAtTime(f0, t);
          if (gl) src.frequency.exponentialRampToValueAtTime(f0 * Math.pow(2, gl / 12), t + Math.max(0.005, Math.min(gd, bout - t)));
        }
        if (bq) {
          bq.frequency.setValueAtTime(L.filtre.f, t);
          if (L.filtre.vers) bq.frequency.exponentialRampToValueAtTime(L.filtre.vers, t + Math.max(0.005, Math.min((L.filtre.duree || 0.1) * k, bout - t)));
        }
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(pic, t + a);
        if (h > 0 && t + a + h < bout) g.gain.setValueAtTime(pic, t + a + h);
        g.gain.exponentialRampToValueAtTime(Math.max(1e-6, pic * 1e-3), Math.max(t + a + 0.001, bout));
        g.gain.setValueAtTime(0, Math.max(t + a + 0.002, bout + 0.001));
        fin = Math.max(t + a + 0.003, bout + 0.002);
      }
      if (v) { v.libre = fin; return fin; }
      src.start(t1); src.stop(fin);
      if (src._lfo) src._lfo.stop(fin);
      return fin;
    }

    /* la RESERVE de voix des sons tres frequents (tir, salve, impact, tirEnnemi, butin) : n voix creees
       une fois par panoramique, qui tournent en silence ; une lecture ne cree alors aucun noeud. Seules
       les recettes d'une seule couche (oscillateur ou bruit, avec ou sans filtre), sans saturation,
       modulation ni vibrato, y ont droit. */
    var reserves = {}, compteReserve = 0;
    function reservable(cs) {
      if (!cs || cs.length !== 1) return false;
      var L = cs[0];
      return !L.sature && !L.mod && !(L.vibrato && L.vibrato.c);
    }
    function prendreVoix(cle, L, iPan, sortie, n, t) {
      var key = cle + '|' + iPan, R = reserves[key], i;
      if (!R) {
        R = reserves[key] = [];
        var avant = compte;
        for (i = 0; i < n; i++) {
          var o, g = nn(ctx.createGain()), bq = null, ch;
          if (L.src === 'bruit') {
            o = nn(ctx.createBufferSource()); o.buffer = bruit(L.bruit || 'blanc'); o.loop = true; o.playbackRate.value = L.vitesse || 1;
          } else { o = nn(ctx.createOscillator()); regler(o, L.onde); }
          ch = o;
          if (L.filtre) { bq = nn(ctx.createBiquadFilter()); bq.type = L.filtre.type; bq.Q.value = L.filtre.q === undefined ? 0.7 : L.filtre.q; ch.connect(bq); ch = bq; }
          g.gain.value = 0; ch.connect(g); g.connect(sortie); o.start(0);
          R.push({ o: o, g: g, bq: bq, libre: 0 });
        }
        compteReserve += compte - avant;
      }
      var best = R[0];
      for (i = 0; i < R.length; i++) { if (R[i].libre <= t) return R[i]; if (R[i].libre < best.libre) best = R[i]; }
      return best;
    }

    function jouer(nom, opts) {
      opts = opts || {};
      var R = resoudre(B, nom, opts);
      if (!R) return null;
      var s = R.base, t0 = opts.t !== undefined ? opts.t : ctx.currentTime;
      var gamme = s.hauteur === 'hexa' ? T.gammes.hexa : T.gammes.penta;
      var p = opts.pitch | 0, nombre = 0;
      if (s.cycle) p = ((p % s.cycle) + s.cycle) % s.cycle;
      if (s.pitchMax !== undefined) p = clamp(p, s.pitchMin || 0, s.pitchMax);
      if (s.hauteur === 'nombre') { nombre = clamp(opts.pitch || s.pitchMin || 2, s.pitchMin || 1, s.pitchMax || 8); p = 0; }
      if (s.hauteur === 'aucune') p = 0;
      if (R.cle === nom + '.pile') {
        p = Math.min(p + clamp(opts.pile | 0, 1, s.pile.max), s.pile.plafond === undefined ? 99 : s.pile.plafond);
      }
      var f = function (m) { return degres(m, p, gamme, centre); };
      var k = 1;
      if (s.etirable && opts.total > 0 && R.duree > 0) k = clamp(opts.total / R.duree, 0.6, 2);
      var cal = B.calibrage[R.cle] || 1;
      var mul = cal * (opts.gain === undefined ? 1 : opts.gain);
      if (s.pente && p) mul *= Math.pow(10, s.pente * p / 20);
      if (R.cle === nom + '.pile') {
        var gdb = (s.pile.dbParPas || 0) * (clamp(opts.pile | 0, 1, s.pile.max) - 1);
        mul *= Math.pow(10, Math.min(gdb, s.pile.dbMax === undefined ? 99 : s.pile.dbMax) / 20);
      }
      var sortie = opts.sortie || cfg.sortie || ctx.destination, iPan = -1;
      if (cfg.panneurs && opts.pan !== undefined) {
        var best = 0, bd = 9;
        for (var i = 0; i < B.pans.length; i++) { var dd = Math.abs(B.pans[i] - opts.pan); if (dd < bd) { bd = dd; best = i; } }
        sortie = cfg.panneurs[best]; iPan = best;
      }
      alea = s.alea ? (rnd() - 0.5) * 2 * s.alea : 0;
      var avant = compte, fin = t0;
      var cs = R.couches, v = null;
      if (s.reserve && cfg.reserves !== false && !opts.sortie && reservable(cs)) v = prendreVoix(R.cle, cs[0], iPan, sortie, s.reserve, t0);
      for (var c = 0; c < cs.length; c++) {
        var te = couche(cs[c], t0, f, k, mul, sortie, nombre, v);
        if (te > fin) fin = te;
      }
      return { cle: R.cle, duree: fin - t0, noeuds: compte - avant, esquive: s.esquive || 0 };
    }

    return {
      jouer: jouer,
      noeuds: function () { return compte; },
      noeudsReserve: function () { return compteReserve; },
      resoudre: function (nom, opts) { return resoudre(B, nom, opts || {}); }
    };
  }

  /* --- la garde : FUSION, PLAFOND et USURE (sauf pour le kill), empilement des kills, escalier du butin --- */
  function garde(B) {
    var st = {}, stats = {};
    function S(nom) { return st[nom] || (st[nom] = { last: -1e9, dens: 0, fins: [], pile: 0, tPile: -1e9, marche: 0, tMarche: -1e9 }); }
    function compter(nom, champ) { var x = stats[nom] || (stats[nom] = { demandes: 0, joues: 0, fusionnes: 0, plafonnes: 0 }); x[champ]++; }
    function demande(nom, t, opts) {
      var s = B.sons[nom]; opts = opts || {};
      compter(nom, 'demandes');
      if (!s) return null;
      var e = S(nom), o = {}, k;
      for (k in opts) if (Object.prototype.hasOwnProperty.call(opts, k)) o[k] = opts[k];
      if (s.pile) {
        /* aucun kill muet : dans la fenetre du precedent, on empile une note, au moins ecartMin plus tard */
        if (t - e.last < s.pile.fenetre) {
          e.pile = Math.min(s.pile.max, e.pile + 1);
          var tp = Math.max(t, e.tPile + s.pile.ecartMin);
          e.tPile = tp; o.t = tp; o.pile = e.pile;
        } else { e.pile = 0; e.tPile = t; o.t = t; }
        e.last = t;
        compter(nom, 'joues');
        return { t: o.t, opts: o };
      }
      if (s.escalier) {
        e.marche = t - e.tMarche < s.escalier.fenetre ? Math.min(s.escalier.max, e.marche + 1) : 0;
        e.tMarche = t;
        if (o.pitch === undefined) o.pitch = e.marche;
      }
      var G = s.garde || {};
      if (G.fusion && t - e.last < G.fusion) { compter(nom, 'fusionnes'); return null; }
      e.dens = e.dens * Math.exp(-(t - e.last)) + 1; e.last = t;
      var vivants = [];
      for (var i = 0; i < e.fins.length; i++) if (e.fins[i] > t) vivants.push(e.fins[i]);
      e.fins = vivants;
      if (G.plafond && vivants.length >= G.plafond) { compter(nom, 'plafonnes'); return null; }
      var R = resoudre(B, nom, o);
      e.fins.push(t + (R ? R.duree : 0.2));
      o.t = t;
      o.gain = (o.gain === undefined ? 1 : o.gain) / Math.sqrt(1 + (G.usure || 0) * (e.dens - 1));
      compter(nom, 'joues');
      return { t: t, opts: o };
    }
    return { demande: demande, stats: function () { return stats; } };
  }

  var API = { lecteur: lecteur, garde: garde, midi: midi, hz: hz, degres: degres, duree: duree, resoudre: resoudre };
  if (typeof module === 'object' && module && module.exports) module.exports = API;
  if (racine) racine.SONS_2975_JOUER = API;
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
