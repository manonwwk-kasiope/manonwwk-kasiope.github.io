/* Briques communes des tests d'acceptation de G9.
   - REC : enregistreur EN PAGE, branché sur une boucle d'images qui se réenregistre
     à chaque image APRÈS celle du jeu ; il relève donc l'état de fin d'image (positions
     réelles, S.timeScale réellement écrit, DOM rendu), jamais un état intermédiaire.
   - Les crochets de mesure sont posés sur des points que le jeu emprunte
     (weapons.update, ui.banner, ui.showCards), jamais depuis une évaluation hors boucle.
   Les horloges sont nommées partout : S.t = horloge de jeu brute (= horloge murale du
   simulateur, elle avance au temps d'image brut), phaseT = horloge de phase (dt ralenti),
   gameT = temps de jeu cumulé (somme des dt). */

export const G9REC_SRC = `
(function(){
  if (window.__G9) return;
  const S = window.__S, M = window.__M, K = window.__K;
  const G = window.__G9 = { on:0, F:[], banners:[], cards:null, cardSets:[], logN:0, portals:[], spawns:[],
                            hpHook:null, hurtBoss:0, hurtAll:0, done:0, tMort:-1, bossVus:0, bossMorts:0 };

  function inView(x,y,m){ m=m||0;
    const P=M.phases, V=(P&&P.visibleExtent)?P.visibleExtent():null;
    if (V) return x>V.x0-m && x<V.x1+m && y>V.y0-m && y<V.y1+m;
    return Math.abs(x-S.cam.x)<S.view.w*0.5+m && Math.abs(y-S.cam.y)<S.view.h*0.5+m; }
  G.inView = inView;

  /* --- crochet de mesure sur weapons.update : c'est le chemin du jeu, au MILIEU
     d'une image, jamais entre deux. Sert à rendre le boss invulnérable (test 2). --- */
  const wu = M.weapons.update;
  M.weapons.update = function(dt){
    if (G.hpHook) { try { G.hpHook(); } catch(e){} }
    return wu.call(M.weapons, dt);
  };

  /* --- bannières : texte + horloge murale (S.t) --- */
  const ban = M.ui.banner;
  M.ui.banner = function(t, d){ G.banners.push({ t: S.t, s: String(t), d: d||0 }); return ban.call(M.ui, t, d); };

  /* --- cartes proposées --- */
  const sc = M.ui.showCards;
  M.ui.showCards = function(cards, cb){
    const cs = cards.map(c => ({ id:c.id, rarity:c.rarity }));
    G.cards = cs; G.cardSets.push({ t:S.t, cards:cs });
    return sc.call(M.ui, cards, cb);
  };

  /* mort d'un boss, datée à l'image exacte : le pas de scrutation de Node est
     mille fois plus lent que le simulateur, il raterait la seconde qui suit. */
  const od = M.enemies.onDeath;
  M.enemies.onDeath = function(e){
    if (e && e.boss) { G.bossMorts++; G.tMort = S.t; }
    return od.call(M.enemies, e);
  };

  /* --- coups reçus pendant le climax, avec leur source (signature du burst rouge) --- */
  const burst = M.fx.burst;
  M.fx.burst = function(x,y,color,n){
    /* G8 a changé la gerbe de blessure de 22 à 12 particules : on accepte les deux */
    if (G.on && color==='#ff2e63' && (n===12 || n===22) && S.phase==='play'){
      G.hurtAll++;
      let best=null, bd=1e9;
      for (const e of S.enemies){ const d=Math.hypot(e.x-x,e.y-y); if (d<bd){ bd=d; best=e; } }
      let bul=null;
      for (const b of S.ebullets) if (Math.abs(b.x-x)<2 && Math.abs(b.y-y)<2) { bul=b; break; }
      if (best && bd<1.5 && best.boss) G.hurtBoss++;
      else if (bul && bul.oid!==undefined) { for (const e of S.enemies) if (e.id===bul.oid && e.boss) G.hurtBoss++; }
      else if (bul){ // balle : le tireur le plus proche de son origine encore vivant
        let bb=null, bbd=1e9;
        for (const e of S.enemies){ const d=Math.hypot(e.x-x,e.y-y); if (e.boss && d<bbd){ bbd=d; bb=e; } }
        if (bb && bbd < 260) G.hurtBoss++;
      }
    }
    return burst.apply(M.fx, arguments);
  };

  function bar(){
    const u = document.querySelector('.s2boss u'), i = document.querySelector('.s2boss i');
    if (!u || !i) return -1;
    const wu = u.getBoundingClientRect().width, wi = i.getBoundingClientRect().width;
    return wi > 0 ? wu / wi : -1;
  }
  function bannerText(){
    const b = document.querySelector('.s2ban');
    if (!b) return '';
    return b.classList.contains('on') ? (b.textContent||'').trim() : '';
  }
  G.bar = bar; G.bannerText = bannerText;

  G.start = function(opts){
    G.on = 1; G.F.length = 0; G.banners.length = 0; G.cards = null;
    G.portals.length = 0; G.spawns.length = 0; G.hurtBoss = 0; G.hurtAll = 0;
    G.dom = !!(opts && opts.dom);
    /* La transition CSS de 120 ms de la jauge court sur l'horloge RÉELLE du
       compositeur, pas sur l'horloge synthétique du simulateur : dans un
       simulateur qui avance cinquante fois plus vite, elle masquerait la rampe
       de 900 ms qu'on veut mesurer. On la neutralise : la sortie mesurée reste
       la LARGEUR RENDUE (getBoundingClientRect), pas une valeur interne. */
    if (G.dom && !document.getElementById('g9nofx')) {
      const st = document.createElement('style');
      st.id = 'g9nofx';
      st.textContent = '.s2boss>i>u{transition:none!important}';
      document.head.appendChild(st);
    }
    S.log = []; G.logN = 0;
    G.gameT = 0; G.t0 = S.t; G.snakeD = 0; G.snakePrev = null; G.tPrev = S.t;
    G.done = 0; G.tMort = -1; G.bossMorts = 0; G.cardSets.length = 0;
    G.stopAfter = (opts && opts.stopAfter) || 0;   // s de temps de jeu après l'éclosion
    G.hatch = -1;
  };
  G.stop = function(){ G.on = 0; };

  function tick(){
    requestAnimationFrame(tick);
    if (!G.on || S.phase !== 'play') return;
    const dt = S.dt || 0;
    G.gameT += dt;
    const ph = M.levels.phaseName(), pt = M.levels.phaseT();
    // journal du jeu : on estampille chaque nouvelle entrée avec l'horloge de phase
    for (; G.logN < S.log.length; G.logN++){
      const L = S.log[G.logN];
      if (L.kind === 'portal') G.portals.push({ t:L.t, pt, ph, boss:!!L.boss, lead:L.lead, type:L.type });
      else if (L.kind === 'spawn') G.spawns.push({ t:L.t, pt, ph, boss:!!L.boss, type:L.type, id:L.id });
    }
    const s = S.snake;
    const rd = (S.t - G.tPrev) / 1000;             // pas d'horloge MURALE (S.t avance au temps brut)
    G.tPrev = S.t;
    let sd = 0;
    if (s){ if (G.snakePrev) sd = Math.hypot(s.x-G.snakePrev.x, s.y-G.snakePrev.y);
            G.snakePrev = { x:s.x, y:s.y }; }
    const b = S.boss && !S.boss.dead ? S.boss : null;
    const f = { t:S.t, gt:G.gameT, dt, rd, pt, ph, ts:S.timeScale, lvl:S.level,
                bs: !!(M.levels.bossSlow && M.levels.bossSlow()),
                en:S.enemies.length, pend:M.levels.pend?M.levels.pend():-1,
                /* vitesse MONDE par seconde d'horloge murale : c'est elle qui doit
                   rester constante quand le monde ralentit, pas la distance par dt */
                sd, sspd: rd>0 ? sd/rd : 0, len: s?s.len:0,
                /* rapportée à la vitesse que le serpent a EN PROPRE cette image
                   (s.speed, qui monte et descend avec le boost) : le rapport doit
                   rester à 1 quand le monde ralentit, boost ou pas */
                sspdN: (rd>0 && s && s.speed>1) ? sd/rd/s.speed : 0,
                coins:S.coins, ult:S.ult, lvlUps:S.lvlUps, phase:S.phase,
                bossKills:S.bossKills|0 };
    if (b){
      const p = M.phases.toScreen(b.x, b.y);          // MÊME image que inView ci-dessous
      /* iv  : champ strict (m = 0), c'est le seuil du test ;
         iv8 : le prédicat de ui.offscreen() (m = 8), pour juger du MARQUEUR */
      f.b = { hp:b.hp, max:S.bossHpMax, name:b.name||'', iv: inView(b.x,b.y,0), iv8: inView(b.x,b.y,8), iv100: inView(b.x,b.y,100),
              sx:p.x, sy:p.y, noDmg:!!b.noDmg, enraged:!!b.enraged, x:b.x, y:b.y };
      let off = 0;
      try { const l = M.ui.offscreen(); for (const o of l) if (o.kind==='boss') off++; } catch(e){}
      f.off = off;
    }
    if (G.dom){ f.bar = bar(); f.ban = bannerText(); }
    G.F.push(f);
    if (G.hatch < 0 && f.b) G.hatch = G.gameT;
    if (G.stopAfter && G.hatch >= 0 && G.gameT - G.hatch > G.stopAfter) { G.on = 0; G.done = 1; }
    if (G.F.length > 60000) { G.on = 0; G.done = 1; }
  }
  requestAnimationFrame(tick);
})();
`;

/** Démarre une partie (sans attendre la mort) avec graine, difficulté et pas de temps imposés. */
export async function startRun(page, cfg = {}) {
  const { diff = 2, seed = 900, god = true, maxT = 600000, slowmo = false } = cfg;
  await page.evaluate(({ diff, seed, god, maxT, slowmo }) => {
    const S = window.__S, M = window.__M;
    S.opt.diff = [1.25, 1.55, 1.9, 2.3, 2.75][diff];
    S.opt.music = false; S.opt.sfx = false; S.opt.haptics = false;
    S.stats.unlocks = {};
    window.__SEED = seed;
    window.__DT = 1 / 60;
    window.__PSIM = { maxT, joy: false, god };
    window.__LSIM = { aborted: false };
    const b = Array.from(document.querySelectorAll('#ui button'))
      .filter(x => /^(JOUER|REJOUER)$/.test(x.textContent.trim()) && x.offsetParent !== null)[0];
    if (!b) throw new Error('bouton JOUER introuvable');
    b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    if (slowmo) setTimeout(() => { S.up.f_slowmo = 1; }, 30);
  }, { diff, seed, god, maxT, slowmo });
  await page.waitForFunction(() => window.__S.phase === 'play', null, { timeout: 15000 });
}

export const pct = (a, b) => b ? +(100 * a / b).toFixed(1) : 0;
export function median(a) {
  if (!a.length) return 0;
  const b = a.slice().sort((x, y) => x - y);
  const m = b.length >> 1;
  return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2;
}
