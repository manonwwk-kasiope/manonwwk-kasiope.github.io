(() => {
  'use strict';
  const ui = Object.fromEntries([...document.querySelectorAll('[id]')].map(node => [node.id, node]));
  const engine = window.SnakeArcade, audio = window.SnakeSon;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const portraitPhone = matchMedia('(orientation: portrait) and (any-pointer: coarse)');
  const echo = window.SnakeEcho;
  let game = engine.create(), mode = 'home', previousTime = 0;
  const hall = window.SnakePalmares;
  let record = 0, pointer = null, noticeUntil = 0;
  let attemptId = '', target = null, epoch = 0, transit = null;
  const panels = { home: ui.accueil, paused: ui.interruption, upgrade: ui.atelier, over: ui.fin };
  try { record = Number(localStorage.getItem('snake2985.record')) || 0; } catch {}
  try { ui.calme.checked = localStorage.getItem('snake2985.calme') === '1'; } catch {}
  const quietMotion = () => reducedMotion.matches || ui.calme.checked;
  function orientation() {
    document.querySelector('.cabinet').inert = portraitPhone.matches;
    if (portraitPhone.matches && mode === 'playing') pause();
  }

  function write(element, value) {
    if (element.textContent !== value) element.textContent = value;
  }
  function formatScore(score) { return String(score).padStart(6, '0'); }
  function announce(message, seconds = 2.4) {
    write(ui.annonce, message);
    noticeUntil = game.elapsed + seconds;
  }
  function sync() {
    const playing = mode === 'playing';
    const charge = Math.floor(game.novaCharge * 100);
    write(ui.score, formatScore(game.score));
    const era = engine.eras[game.eraIndex];
    write(ui['record-label'], target === null ? 'Record local' : 'À battre');
    write(ui.record, formatScore(target === null ? Math.max(record, game.score) : target));
    write(ui.longueur, String(game.snake.length));
    write(ui.annee, String(game.year));
    write(ui.difficulte, game.difficulty + '/10');
    write(ui['nom-epoque'], game.year + ' · ' + era.name);
    const boss = game.boss;
    const warning = game.nextBossKind === 'final' ? 'Boss final en approche' : 'Mi-niveau en approche';
    write(ui.menace, boss ? boss.name + ' · ' + boss.hp + '/' + boss.maxHp :
      game.nearBoss >= .45 ? warning : (game.status === 'playing' && mode !== 'home' ? (game.sectorCells + '/2 cellules') : ''));
    write(ui.armement, [
      era.weapons[0] + (game.levels.rail ? ' +' + game.levels.rail : ''),
      ...(game.levels.arc ? [era.weapons[1] + ' +' + game.levels.arc] : []),
      era.weapons[2] + (game.levels.nova ? ' +' + game.levels.nova : ''),
    ].join('  /  '));
    write(ui.charge, charge + ' %');
    if (ui.nova.style.getPropertyValue('--fuel') !== charge + '%') ui.nova.style.setProperty('--fuel', charge + '%');
    ui.nova.disabled = !playing || game.novaCharge < 1;
    ui.turbo.disabled = !playing;
    ui.turbo.setAttribute('aria-pressed', String(!!game.turbo));
    ui.son.setAttribute('aria-pressed', String(!audio.muted));
    write(ui.son, audio.muted ? 'Son coupé' : 'Son actif');
    ui.pause.disabled = !playing && mode !== 'paused';
    write(ui.pause, mode === 'paused' ? 'Reprendre' : 'Pause');
    if (playing && game.elapsed > noticeUntil) write(ui.annonce, '');
  }
  function display(next) {
    mode = next;
    pointer = null;
    for (const [key, panel] of Object.entries(panels)) panel.hidden = key !== next;
    ui.overlay.hidden = next === 'playing';
    ui.overlay.classList.toggle('center', next !== 'home');
    sync();
  }
  function start(muted, eraIndex = 0, scoreToBeat = null, jumping = false) {
    if (portraitPhone.matches) return;
    const fromYear = game.year;
    epoch = eraIndex;
    target = scoreToBeat;
    document.body.classList.toggle('cible', target !== null);
    attemptId = globalThis.crypto?.randomUUID?.() || (Date.now().toString(36) + Math.random().toString(36).slice(2));
    game = engine.create(Math.random, epoch);
    const echoMessage = echo.begin(game.year,{timejump:jumping});
    echo.update(game);
    audio.setMuted(muted);
    audio.start(epoch);
    transit = null;
    if (jumping) {
      audio.event('timejump');
      transit = {fromYear,elapsed:0,duration:quietMotion() ? .25 : .95};
    }
    previousTime = performance.now();
    display('playing');
    announce(echoMessage || (jumping ? 'Saut en ' + game.year + ' · Score à battre : ' + target :
      'Vise les cellules. Turbo ×2 accélère le serpent et double tes points.'), 3);
  }
  function pause() {
    if (mode !== 'playing') return;
    audio.pause();
    display('paused');
  }
  function resume() {
    if (mode !== 'paused' || document.hidden || portraitPhone.matches) return;
    audio.resume();
    previousTime = performance.now();
    display('playing');
  }
  function saveRecord() {
    if (game.score <= record) return;
    record = game.score;
    try { localStorage.setItem('snake2985.record', String(record)); } catch {}
  }
  function finish() {
    const cleared = ['cleared','won'].includes(game.status);
    saveRecord();
    echo.end(game);
    audio.stop();
    const name = hall.getName();
    hall.record({id: attemptId, name, year: game.year, score: game.score, difficulty: game.difficulty, cleared, status: game.status});
    ui.pseudo.value = name;
    write(ui.signer, 'Signer');
    write(ui.verdict, cleared ? (game.status === 'won' ? '2985 libérée.' : 'Époque libérée.') : 'Signal perdu en ' + game.year + '.');
    const causes = { Mur: 'Impact contre le mur.', Drone: 'Collision avec un drone.', 'Ta propre queue': 'Tu as recoupé ton corps.' };
    const reason = cleared ? 'Boss final détruit.' : (causes[game.cause] || game.cause + '.');
    const outcome = target === null ? '' : game.score > target ? 'Objectif battu !' : 'Objectif : dépasser ' + target + '.';
    const bonus = game.bonus ? game.bonus.name + ' : +' + game.bonus.points + ' !' : '';
    write(ui.bilan, [reason, game.score + ' points · difficulté ' + game.difficulty + '/10.', bonus, outcome].filter(Boolean).join(' '));
    ui.destination.replaceChildren();
    const next = engine.eras.map((era, index) => ({era,index})).filter(({index}) =>
      index > epoch && (!cleared || index === epoch + 1));
    if (!next.length) next.push({era:engine.eras[0], index:0});
    for (const {era, index} of next) ui.destination.add(new Option(era.year + ' · ' + era.name, String(index)));
    write(ui.rejouer, 'Rejouer ' + game.year);
    write(ui['destination-label'], next[0].index === 0 ? 'Nouveau cycle' : 'Saut vers');
    write(ui.sauter, next[0].index === 0 ? 'Repartir' : 'Se téléporter');
    announce('');
    display('over');
  }
  function sign() {
    if (mode !== 'over') return;
    hall.setName(attemptId, ui.pseudo.value);
    ui.pseudo.value = hall.getName();
    write(ui.signer, 'Signé');
  }
  function processEvents() {
    for (const event of game.events.splice(0)) {
      audio.event(event);
      if (event.type === 'nova') announce('Nova déployée');
      if (event.type === 'boss') announce('Vise le cœur du gardien quand il s’ouvre.', 3);
      if (event.type === 'bossDefeated') announce('Gardien détruit', 2);
      if (event.type === 'riftOpen') announce('Faille ouverte ! Rejoins-la pour immobiliser le gardien.', 4);
      if (event.type === 'riftPickup') announce('Temps suspendu · Nova rechargée', 3);
      if (event.type === 'bossAttack') announce(game.boss?.attack?.label || 'Salve imminente', 1.2);
      if (event.type === 'cell') announce('Cellule absorbée · ' + game.snake.length + ' anneaux', 1);
    }
    if (mode !== 'playing') return;
    if (game.status === 'upgrade') {
      saveRecord();
      audio.pause();
      write(ui['upgrade-label'], game.year + ' · Difficulté ' + game.difficulty + '/10 · Choisis une amélioration.');
      for (const button of ui.choix.children) {
        const index = engine.weapons.findIndex(weapon => weapon.id === button.dataset.weapon);
        const w = engine.weapons[index];
        write(button.firstChild, engine.eras[epoch].weapons[index] + ' · niv. ' + (game.levels[w.id] + 1));
      }
      display('upgrade');
    } else if (['dead','cleared','won'].includes(game.status)) finish();
  }
  function choose(id) {
    if (mode !== 'upgrade' || !engine.upgrade(game, id)) return;
    audio.resume();
    previousTime = performance.now();
    display('playing');
    processEvents();
    announce(game.year + ' · ' + engine.eras[epoch].weapons[engine.weapons.findIndex(w => w.id === id)]);
  }
  for (const weapon of engine.weapons) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.weapon = weapon.id;
    const title = document.createElement('strong'), hint = document.createElement('small');
    hint.textContent = weapon.description;
    button.append(title, hint);
    button.addEventListener('click', () => choose(weapon.id));
    ui.choix.append(button);
  }
  ui.jouer.addEventListener('click', () => start(false));
  ui.silence.addEventListener('click', () => start(true));
  ui.rejouer.addEventListener('click', () => { sign(); start(audio.muted, epoch, Math.max(target || 0, game.score)); });
  ui.sauter.addEventListener('click', () => { sign(); start(audio.muted, Number(ui.destination.value), Math.max(target || 0, game.score), true); });
  ui.signer.addEventListener('click', sign);
  ui.pseudo.addEventListener('input', () => write(ui.signer, 'Signer'));
  ui.pseudo.addEventListener('change', sign);
  function openHall() {
    if (mode === 'playing') pause();
    if (mode === 'over') sign();
    hall.render();
    ui.palmares.showModal();
  }
  ui['ouvrir-palmares'].addEventListener('click', openHall);
  ui['hall-portrait'].addEventListener('click', openHall);
  ui['voir-palmares'].addEventListener('click', openHall);
  ui['fermer-palmares'].addEventListener('click', () => ui.palmares.close());
  function refreshVolumes() {
    for (const [key,level] of [['musique', audio.musicLevel], ['fx', audio.fxLevel]]) {
      ui[key+'-volume'].value = Math.round(level * 100);
      write(ui[key+'-val'], ui[key+'-volume'].value+' %');
    }
  }
  ui['ouvrir-options'].addEventListener('click', () => {
    if (mode === 'playing') pause();
    refreshVolumes();
    ui['echo-actif'].checked = echo.getEnabled();
    ui.options.showModal();
  });
  ui['fermer-options'].addEventListener('click', () => ui.options.close());
  for (const [id,key] of [['musique-volume','music'],['fx-volume','fx']]) {
    ui[id].addEventListener('input', () => { audio.setVolumes({[key]: Number(ui[id].value)/100}); refreshVolumes(); });
  }
  ui['echo-actif'].addEventListener('change', () => echo.setEnabled(ui['echo-actif'].checked));
  ui.calme.addEventListener('change', () => { try { localStorage.setItem('snake2985.calme',ui.calme.checked ? '1':'0'); } catch {} });
  ui.reprendre.addEventListener('click', resume);
  ui.pause.addEventListener('click', () => mode === 'paused' ? resume() : pause());
  ui.son.addEventListener('click', () => { audio.setMuted(!audio.muted); sync(); });
  function turbo() {
    if (mode !== 'playing') return;
    engine.turbo(game, !game.turbo);
    announce(game.turbo ? 'Turbo · points doublés' : 'Vitesse normale');
    sync();
  }
  function nova() {
    if (mode === 'playing' && engine.fire(game)) { processEvents(); sync(); }
  }
  ui.turbo.addEventListener('click', turbo);
  ui.nova.addEventListener('click', nova);
  function steer(dx, dy) {
    if (mode === 'playing') engine.turn(game, dx, dy);
  }
  for (const button of document.querySelectorAll('[data-dx]')) {
    const move = () => steer(Number(button.dataset.dx), Number(button.dataset.dy));
    button.addEventListener('pointerdown', event => { event.preventDefault(); move(); });
    button.addEventListener('click', event => { if (event.detail === 0) move(); });
  }
  const directions = { ArrowUp: [0,-1], ArrowDown: [0,1], ArrowLeft: [-1,0], ArrowRight: [1,0] };
  document.addEventListener('keydown', event => {
    if (ui.palmares.open || ui.options.open || portraitPhone.matches || ['INPUT','SELECT'].includes(event.target.tagName) || event.altKey || event.ctrlKey || event.metaKey) return;
    if (mode === 'playing' && directions[event.key]) {
      event.preventDefault(); if (!event.repeat) steer(...directions[event.key]); return;
    }
    if (event.repeat) return;
    const key = event.key.toLowerCase();
    if ((key === 'p' || key === 'escape') && (mode === 'playing' || mode === 'paused')) {
      event.preventDefault(); if (mode === 'playing') pause(); else resume();
    } else if (mode === 'playing' && event.code === 'Space') {
      event.preventDefault(); nova();
    } else if (mode === 'playing' && key === 't') {
      turbo();
    } else if (mode === 'upgrade' && /^[1-3]$/.test(key)) {
      choose(engine.weapons[Number(key)-1].id);
    }
  });
  function beginSwipe(event) {
    if (mode !== 'playing' || !event.isPrimary) return;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function swipe(event) {
    if (!pointer || event.pointerId !== pointer.id) return;
    const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
    const threshold = Math.max(9, ui.arene.clientWidth / 32);
    if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return;
    if (Math.abs(dx) > Math.abs(dy)) steer(Math.sign(dx),0); else steer(0,Math.sign(dy));
    pointer.x = event.clientX; pointer.y = event.clientY;
  }
  for (const surface of [ui.arene, ui.manche]) {
    surface.addEventListener('pointerdown', beginSwipe);
  }
  document.addEventListener('pointermove', swipe);
  document.addEventListener('pointerup', event => { swipe(event); if (event.pointerId === pointer?.id) pointer = null; });
  document.addEventListener('pointercancel', event => { if (event.pointerId === pointer?.id) pointer = null; });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { saveRecord(); pause(); } });
  portraitPhone.addEventListener('change', orientation);
  window.addEventListener('pagehide', () => { saveRecord(); pause(); });
  function frame(time) {
    const dt = Math.max(0, Math.min((time - previousTime) / 1000, 0.08));
    previousTime = time;
    if (mode === 'playing' && transit) {
      transit.elapsed += dt;
      if (transit.elapsed >= transit.duration) transit = null;
    } else if (mode === 'playing') {
      engine.tick(game, dt);
      echo.update(game);
      audio.scene(game.eraIndex, game.difficulty, game.nearBoss, game.bossKind, game.nextBossKind);
      processEvents();
      sync();
    }
    if (mode === 'home') window.SnakeAttract.draw(ui.arene, time/1000, quietMotion());
    else {
      window.SnakeRendu.draw(ui.arene, game, game.elapsed, quietMotion());
      echo.draw(ui.arene, game, quietMotion());
      if (transit) window.SnakeAttract.jump(ui.arene,transit.elapsed/transit.duration,transit.fromYear,game.year,quietMotion());
    }
    requestAnimationFrame(frame);
  }
  display('home');
  orientation();
  requestAnimationFrame(frame);
})();
