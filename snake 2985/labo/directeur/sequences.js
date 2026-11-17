// Pas fixe de 1/60 s. Tous les effets sont renvoyés, sans horloge ni entrée globale.
(function (root, factory) {
  if (typeof module === 'object') module.exports = factory();
  else root.Directeur = factory();
})(globalThis, function () {
  const scenes = ['gare', 'mue', 'colosse'];
  const cycle = 240, beat = 30;
  const limit = n => Math.min(.96, Math.max(.04, n));
  const near = (p, x, y, r) => Math.hypot(p.x - x, p.y - y) <= r;
  function initial(scene) {
    if (!scenes.includes(scene)) throw Error('Scène inconnue');
    return { scene, t: 0, x: .32, y: .5, z: scene === 'gare' ? 1 : 0, score: 0, coups: 0,
      actionAvant: false, attente: 0, protection: 0, prix: -1, ride: 0, double: null, events: [] };
  }
  function decor(s) {
    const f = s.t % cycle, manche = Math.floor(s.t / cycle);
    const voie = [.50,.28,.72][manche % 3], railY = .8 - .65 * s.x;
    return { f, manche, voie, railY, train: -.25 + (f - 60) * .012,
      rayon: Math.max(0,(f - 60) * .006), phase: (s.t % beat) / beat };
  }
  function step(before, input = {}) {
    const s = { ...before, t: before.t + 1, events: [] };
    const d = decor(s), emit = name => s.events.push(name);
    s.protection = Math.max(0, s.protection - 1);
    let dx = Number(input.dx) || 0, dy = Number(input.dy) || 0;
    const norm = Math.max(1, Math.hypot(dx,dy));
    s.x = limit(s.x + dx / norm * .0075);
    s.y = limit(s.y + dy / norm * .0075);
    if (input.action && !s.actionAvant) s.attente = s.t + beat;
    s.actionAvant = !!input.action;
    if (s.double && s.double.fin < s.t) s.double = null;
    if (d.f === 1) emit('signal');
    if (d.f === 60) emit('départ');
    if (s.attente && s.t % beat === 0) {
      s.attente = 0;
      if (s.scene === 'mue') {
        s.double = { x:s.x, y:s.y, z:s.z, fin:s.t+120 };
        emit('mue');
      }
      if (s.scene === 'colosse' && s.z === 0 &&
          d.f >= 60 && Math.abs(Math.hypot(s.x-.12,s.y-.8) - d.rayon) < .105) {
        s.ride = 90; emit('capture');
      } else { s.ride = 0; }
      s.z = 1 - s.z;
      emit('bascule');
    }
    const award = (key,points) => {
      if (s.prix !== d.manche) { s.prix = d.manche; s.score += points; emit(key); }
    };
    const hit = () => {
      if (!s.protection) { s.coups++; s.protection=80; emit('impact'); }
    };
    if (s.scene === 'gare' && s.z === 1 && Math.abs(s.y-d.voie)<.1) {
      if (s.x > d.train-.31 && s.x < d.train+.065) hit();
      if (!s.protection && d.f>60 && near(s,d.train-.46,d.voie,.075)) award('sillage',3);
    }
    if (s.scene === 'mue') {
      const arm = s.double && s.double.z === 0 && near(s.double,.32,d.voie,.115);
      if (s.z===1 && near(s,.72,d.voie,.10) && d.f>=90 && d.f<=210) {
        if (arm && s.t % beat===0) award('tir croisé',5);
        else if (!arm && s.t % beat===0) hit();
      }
    }
    if (s.scene === 'colosse') {
      if (s.ride) {
        s.ride--;
        if (Math.abs(s.y-d.railY)>.17) { s.ride=0; emit('décrochage'); }
        else { s.x=limit(s.x+.005); if (s.x>.78) award('rail',6); }
      } else if (s.z===0 && d.f>=60 &&
        Math.abs(Math.hypot(s.x-.12,s.y-.8)-d.rayon)<.03) hit();
    }
    return s;
  }
  return { initial, step, decor, scenes, cycle, beat };
});
