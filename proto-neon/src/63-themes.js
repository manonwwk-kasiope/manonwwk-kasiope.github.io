/* ===== 63-themes.js — N.themes : le thème musical de chaque pilote =====
   refonte/HISTOIRE.md (« un thème musical par personnage ») : ELLE, des arpèges rapides et un synthé brillant ;
   LUI, une basse lente et des nappes chaudes. Les deux thèmes sont dans la même tonalité que Neon Velocity
   (ré mineur : ré – si bémol – fa – do, deux mesures par accord) et sur la même horloge (152 BPM, en doubles
   croches) : LUI joue à demi-temps sur la grille d'ELLE. Ils peuvent donc se superposer exactement — c'est
   « deux », la musique des retrouvailles, où les deux mondes se touchent.

   API
     N.themes.jouer(qui, o)   qui = 'elle' | 'lui' | 'deux' ; o.fondu (s, défaut 0,6) ; o.volume (0..1, défaut 1).
                              Rejouer le même thème ne le relance pas ; changer de thème fond l'un dans l'autre.
     N.themes.arreter(fondu)  s'éteint en fondu (défaut 0,8 s).
     N.themes.update()        à appeler à chaque image tant qu'un thème joue (ordonnancement à 150 ms d'avance).
     N.themes.qui()           le thème en cours, ou null.
     N.themes.state()         { qui, pas, mesure, actif } pour les bancs.
   Sur le contexte audio de N.music (déjà débloqué au premier geste) ; muet si la musique est coupée ; rien ne
   casse sans audio. Aucun hasard : les variations suivent le numéro de mesure. */

N.themes = (function () {
  var BPM = 152, PAS = 60 / BPM / 4;                  // une double croche
  var ACC = [[50, 53, 57], [46, 50, 53], [53, 57, 60], [48, 52, 55]];   // Rém, Si♭, Fa, Do (fondamentale, tierce, quinte)
  var A = { ctx: null, out: null, delay: null, bus: { elle: null, lui: null }, next: 0, pas: 0, qui: null, actif: false };

  function audio() {
    if (A.ctx) return A.ctx;
    var c = null;
    try { c = N.music && N.music.context ? N.music.context() : null; } catch (e) { c = null; }
    if (!c || !c.createOscillator) return null;
    A.ctx = c;
    A.out = c.createGain(); A.out.gain.value = 0; A.out.connect(c.destination);
    /* l'écho d'ELLE : une croche pointée, brillante */
    A.delay = c.createDelay(1); A.delay.delayTime.value = PAS * 3;
    var fb = c.createGain(); fb.gain.value = 0.35; A.delay.connect(fb); fb.connect(A.delay);
    var ret = c.createGain(); ret.gain.value = 0.45; A.delay.connect(ret); ret.connect(A.out);
    ['elle', 'lui'].forEach(function (k) { var g = c.createGain(); g.gain.value = 0; g.connect(A.out); A.bus[k] = g; });
    return c;
  }
  function muet() { try { return !!(N.music && N.music.muted && (N.music.muted('musique') || N.music.muted() === true)); } catch (e) { return false; } }
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  /* ---- ELLE : arpège carré filtré, qui s'ouvre au fil des deux mesures de l'accord ---- */
  function arp(t, m, d, v, ouv, bus) {
    var c = A.ctx, o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    o.type = 'square'; o.frequency.setValueAtTime(hz(m), t);
    f.type = 'lowpass'; f.Q.value = 6; f.frequency.setValueAtTime(900 + ouv * 3200, t); f.frequency.exponentialRampToValueAtTime(500, t + d);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0008, t + d);
    o.connect(f); f.connect(g); g.connect(bus); g.connect(A.delay);
    o.start(t); o.stop(t + d + 0.02);
  }
  function scintille(t, m, v, bus) {                   // la note haute en dents de scie, sur le dernier temps
    var c = A.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(hz(m), t); o.detune.setValueAtTime(0, t); o.detune.linearRampToValueAtTime(-30, t + PAS * 4);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0008, t + PAS * 4);
    o.connect(g); g.connect(bus); g.connect(A.delay); o.start(t); o.stop(t + PAS * 4 + 0.02);
  }
  /* ---- LUI : basse ronde et nappe chaude (deux scies désaccordées, filtre fermé) ---- */
  function basse(t, m, d, v, bus) {
    var c = A.ctx, o = c.createOscillator(), s = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(hz(m), t);
    s.type = 'sine'; s.frequency.setValueAtTime(hz(m - 12), t);
    f.type = 'lowpass'; f.frequency.value = 420;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.03); g.gain.setValueAtTime(v, t + d * 0.7); g.gain.linearRampToValueAtTime(0, t + d);
    o.connect(f); s.connect(f); f.connect(g); g.connect(bus);
    o.start(t); s.start(t); o.stop(t + d + 0.02); s.stop(t + d + 0.02);
  }
  function nappe(t, notes, d, v, bus) {
    var c = A.ctx, f = c.createBiquadFilter(), g = c.createGain();
    f.type = 'lowpass'; f.Q.value = 0.7; f.frequency.setValueAtTime(500, t); f.frequency.linearRampToValueAtTime(1100, t + d * 0.5); f.frequency.linearRampToValueAtTime(600, t + d);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + d * 0.35); g.gain.setValueAtTime(v, t + d * 0.7); g.gain.linearRampToValueAtTime(0, t + d);
    f.connect(g); g.connect(bus);
    notes.forEach(function (m) {
      [-7, 7].forEach(function (dt) {
        var o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(hz(m), t); o.detune.value = dt;
        o.connect(f); o.start(t); o.stop(t + d + 0.05);
      });
    });
  }

  /* une double croche de la grille commune ; i = numéro du pas depuis le début */
  function pas(t, i) {
    var mes = Math.floor(i / 16), k = i % 16, a = ACC[Math.floor(mes / 2) % 4], tour = Math.floor(mes / 8);
    var ouv = ((mes % 2) * 16 + k) / 32;               // le filtre s'ouvre sur les deux mesures de l'accord
    /* ELLE : fondamentale, quinte, octave, tierce haute… ; au deuxième tour, l'arpège monte d'une octave sur la 2e mesure */
    var MOTIF = [0, 2, 3, 1, 2, 3, 4, 2, 0, 2, 3, 1, 4, 3, 2, 1];
    var gamme = [a[0] + 12, a[1] + 12, a[2] + 12, a[0] + 24, a[1] + 24];
    var m = gamme[MOTIF[k]] + ((tour % 2 === 1 && mes % 2 === 1) ? 12 : 0);
    arp(t, m, PAS * 1.6, k % 4 === 0 ? 0.24 : 0.17, ouv, A.bus.elle);
    if (k === 12 && mes % 2 === 1) scintille(t, a[0] + 36, 0.08, A.bus.elle);
    /* LUI : la basse sur les temps 1 et 3 d'une mesure sur deux (demi-temps), la nappe sur deux mesures */
    if (k === 0 && mes % 2 === 0) { nappe(t, [a[0] + 12, a[1] + 12, a[2] + 12], PAS * 32, 0.022, A.bus.lui); basse(t, a[0] - 12, PAS * 14, 0.2, A.bus.lui); }
    if (k === 0 && mes % 2 === 1) basse(t, (tour % 2 ? a[2] : a[0]) - 12, PAS * 6, 0.16, A.bus.lui);
    if (k === 8 && mes % 2 === 1) basse(t, a[0] - 12, PAS * 7, 0.14, A.bus.lui);
  }

  function niveaux(qui) { return { elle: qui === 'elle' || qui === 'deux' ? 1 : 0, lui: qui === 'lui' || qui === 'deux' ? (qui === 'deux' ? 0.9 : 1.2) : 0 }; }
  function glisse(p, v, t, d) { try { p.cancelScheduledValues(t); p.setValueAtTime(p.value, t); p.linearRampToValueAtTime(v, t + d); } catch (e) {} }

  function jouer(qui, o) {
    if (qui !== 'elle' && qui !== 'lui' && qui !== 'deux') return false;
    o = o || {};
    var c = audio(); if (!c) { A.qui = qui; return false; }
    var f = o.fondu == null ? 0.6 : o.fondu, t = c.currentTime, n = niveaux(qui), vol = o.volume == null ? 1 : o.volume;
    if (!A.actif) { A.actif = true; A.next = t + 0.06; A.pas = 0; }
    glisse(A.out.gain, 0.5 * vol, t, f);
    glisse(A.bus.elle.gain, n.elle, t, f); glisse(A.bus.lui.gain, n.lui, t, f);
    A.qui = qui;
    return true;
  }
  function arreter(fondu) {
    var c = A.ctx; A.qui = null;
    if (!c || !A.actif) { A.actif = false; return; }
    var f = fondu == null ? 0.8 : fondu;
    glisse(A.out.gain, 0, c.currentTime, f);
    A.fin = c.currentTime + f;
  }
  function update() {
    var c = A.ctx; if (!c || !A.actif) return;
    if (A.qui === null && A.fin && c.currentTime >= A.fin) { A.actif = false; A.fin = 0; return; }
    if (c.state !== 'running' || muet()) { A.next = c.currentTime + 0.06; return; }
    if (A.next < c.currentTime) A.next = c.currentTime + 0.05;
    while (A.next < c.currentTime + 0.15) { pas(A.next, A.pas); A.pas++; A.next += PAS; }
  }

  return {
    jouer: jouer, arreter: arreter, update: update,
    qui: function () { return A.qui; },
    state: function () { return { qui: A.qui, pas: A.pas, mesure: Math.floor(A.pas / 16), actif: A.actif }; }
  };
})();
