/* ======
   SNAKE 2030 — 26-ui.js
   S2030.ui : interface, contrôles tactiles, écrans. SEUL module qui touche
   au DOM.

   API du contrat :
     build(root) hud() showCards(cards, cb) showScreen(name)
     toast(title, sub) banner(text) setControls(cfg)

   EXTENSIONS EXPOSÉES (détaillées en fin de fichier, section « pont coeur ») :
     joyEl knobEl btnEls rects() hitTest(x,y) placeJoy(x,y) releaseJoy()
     useCanvasControls(on) setControlsVisible(v) runTime() screen()

   Conventions : tout identifiant de niveau fichier est préfixé `_ui` / `_UI`.
   Aucun Math.random(), aucun Date.now() : le temps est S.t.
   ====== */

/* ------ état local */
var _uiRoot = null, _uiBuilt = false;
var _uiE = {};                       // références d'éléments, remplies au build
var _uiScreen = null, _uiPrevScr = 'menu';
var _uiCardEls = [], _uiCardCb = null, _uiCardLock = false;
var _uiWidgets = [];                 // rafraîchisseurs des réglages
var _uiCanvasCtl = false;            // true : le coeur dessine les contrôles
var _uiCtlShown = -1, _uiHudShown = -1;
var _uiJoyMoved = false;
var _uiRunMs = 0, _uiRunLast = 0, _uiRunOn = false;
var _uiBanTo = 0, _uiToastTo = 0;
var _uiBanQ = [], _uiBanBusy = 0;   // file des bannières : une à la fois (G9)
var _uiAnnQ = [], _uiAnnOn = 0;     // file des toasts, exclusion mutuelle avec la bannière (G10)
var _uiPhTo = 0;                    // tag de phase caméra (1 s)
var _uiSafe = { t: 0, r: 0, b: 0, l: 0 };
var _uiLvName = '', _uiLvCache = -1;
var _uiKF = null, _uiOverLock = false;       // curseur clavier, verrou de l'écran de fin
var _UI_INERT = 'inert' in document.createElement('div');
var _UI_KEYS_D = '↑←↓→ / ZQSD / WASD diriger · SOURIS viser · ESPACE ou clic boost · E ou clic droit pouvoir · R ou molette APOGÉE · P / ÉCHAP pause · F plein écran';
var _uiRects = {
  boost: { x: 0, y: 0, r: 46 },
  special: { x: 0, y: 0, r: 40 },
  ult: { x: 0, y: 0, r: 40 },
  joy: { x: 0, y: 0, r: 56 }
};

/* mémoire d'affichage : on n'écrit dans le DOM que ce qui a bougé */
var _uiP = {
  score: -1, mult: -1, multNx: -1, len: -1, maxlen: -1, lvl: -1, prog: -1,
  boost: -1, ult: -1, sp: -1, xp: -1, boss: -2, bossName: '',
  ja: -1, jx: -9, jy: -9, ready: -1, low: -1
};

var _UI_RAR = {
  common: { c: '#9fb6cc', n: 'COMMUN' },
  rare:   { c: '#00e5ff', n: 'RARE' },
  epic:   { c: '#b388ff', n: 'ÉPIQUE' },
  ultra:  { c: '#ffd166', n: 'ULTRA' }
};

/* déblocages permanents : purement locaux, écrits dans S.stats.unlocks */
var _UI_UNLOCKS = [
  { id: 'u_len',    icon: '⌁', name: 'BIO-RALLONGE',  cost: 120, desc: 'Départ à +3 segments.' },
  { id: 'u_boost',  icon: '»', name: 'RÉACTEUR',      cost: 180, desc: 'Réserve de boost +25 %.' },
  { id: 'u_start',  icon: '▲', name: 'CANON LOURD',   cost: 240, desc: 'Le canon frontal démarre au niveau 2.' },
  { id: 'u_ult',    icon: '★', name: 'CONDENSATEUR',  cost: 320, desc: 'L\'APOGÉE se charge 20 % plus vite.' },
  /* Le texte annonçait une seconde d'invulnérabilité ; le code (resetRun)
     donne une charge de bouclier, qui absorbe un coup. */
  { id: 'u_shield', icon: '◈', name: 'PARE-CHOCS',    cost: 400, desc: 'Absorbe un coup par partie.' },
  { id: 'u_luck',   icon: '◇', name: 'ORACLE',        cost: 520, desc: 'Meilleures chances de cartes rares.' }
];

/* G14 — libellé de build : axe dominant des cartes prises + arme la plus haute.
   Les noms d'arme sont RACCOURCIS : « ARC ÉLECTRIQUE 6 » déborde la ligne, et
   c'est le niveau qui porte l'information. */
var _UI_AXES = { elec: 'ÉLECTRICIEN', laser: 'TIREUR', explo: 'ARTIFICIER',
                 speed: 'COUREUR', fort: 'BLINDÉ', ghost: 'SPECTRE', core: 'TECHNICIEN' };
var _UI_WSHORT = { frontCannon: 'CANON', sideTurrets: 'TOURELLES', tailLaser: 'QUEUE',
                   arcLightning: 'ARC', missiles: 'MISSILES', drones: 'DRONES',
                   shockwave: 'ONDE', tailMines: 'MINES' };

/* ======
   FEUILLE DE STYLE
   ====== */
var _UI_CSS = [
'#ui{',
'  --uis:1; --bl:1; --glow:1; --ca:1; --fmin:11px;',
'  --sat:env(safe-area-inset-top,0px); --sar:env(safe-area-inset-right,0px);',
'  --sab:env(safe-area-inset-bottom,0px); --sal:env(safe-area-inset-left,0px);',
'  --cy:#00e5ff; --mg:#ff2e63; --vi:#b388ff; --am:#ffd166; --li:#7cffb2;',
'  --ho:#ff5c8a; --ink:#eaf7ff; --dim:#8ba3bd; --ok:#7cffb2;',
'  --pan:rgba(6,10,22,.72); --pan2:rgba(4,7,16,.9); --line:rgba(0,229,255,.28);',
'  --fs:system-ui,-apple-system,"Segoe UI Variable","Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;',
'  --fm:ui-monospace,"SF Mono",SFMono-Regular,Menlo,Consolas,"Roboto Mono",monospace;',
'  font-family:var(--fs); color:var(--ink); -webkit-font-smoothing:antialiased;',
'}',
'#ui.hc{--pan:rgba(2,4,10,.93); --pan2:rgba(1,3,8,.97); --dim:#c2d6e8; --glow:.25;',
'  --line:rgba(120,240,255,.55)}',
'#ui *{box-sizing:border-box}',
'#ui button{font:inherit;color:inherit;background:none;border:0;cursor:pointer;',
'  -webkit-tap-highlight-color:transparent;touch-action:manipulation}',
/* bureau : réticule en jeu, masqué à l'inactivité, pointeur sur le cliquable */
"#game.s2ret{cursor:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2300e5ff' stroke-width='2'%3E%3Ccircle cx='12' cy='12' r='7'/%3E%3Cpath d='M12 1v5M12 18v5M1 12h5M18 12h5'/%3E%3C/svg%3E\") 12 12,auto}",
'#game.s2nocur{cursor:none}',
'.s2card,.s2opt{cursor:pointer}',
'@media(hover:hover){button:hover{filter:brightness(1.15)}#ui button{transition:filter .08s}',
'  #ui .s2card:hover{transform:translateY(-6px);border-color:var(--r)}',
'  #ui.kb .s2card.kf:hover{transform:translateY(-6px) scale(1.04)}}',
/* clavier : curseur de focus (.kb : bureau, ou dès la première touche), focus visible, légende, capuchons */
'#ui.kb .kf{border:2px solid var(--cy)!important;transform:scale(1.04);transition:transform .08s,border-color .08s}',
'#ui :focus-visible{outline:2px solid var(--cy);outline-offset:2px}',
'.s2keys{font:600 calc(var(--uis)*max(12px,var(--fmin)))/1.5 var(--fs);letter-spacing:.05em;color:var(--dim);text-align:center}',
'.s2menu .s2keys{text-align:left}',
'.s2g{position:relative}.s2gs[hidden]{display:none}',
'.s2gs>i>u{background:linear-gradient(90deg,var(--vi),#d9c4ff);box-shadow:0 0 calc(10px*var(--bl)) var(--vi)}',
'.s2kcap{position:absolute;right:100%;top:50%;transform:translateY(-50%);margin-right:7px;',
'  font:800 calc(var(--uis)*var(--fmin))/1 var(--fm);letter-spacing:.08em;color:var(--ink);border:1px solid var(--line);',
'  border-radius:3px;padding:2px 4px;background:var(--pan);white-space:nowrap;opacity:0;transition:opacity .4s}',
'.s2hud.kc .s2kcap{opacity:1}',
'.s2p{position:fixed;inset:0;visibility:hidden;pointer-events:none;',
'  padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px)',
'  env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)}',

/* ------ HUD --- */
'.s2hud{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .22s ease}',
'.s2hud.on{opacity:1}',
'.s2xp{position:absolute;top:0;left:0;right:0;height:3px;background:rgba(0,229,255,.12)}',
'.s2xp>u{display:block;height:100%;width:100%;transform-origin:0 50%;transform:scaleX(0);',
'  background:linear-gradient(90deg,var(--cy),#b7fbff);',
'  box-shadow:0 0 calc(10px*var(--bl)) var(--cy)}',
'.s2bar{position:absolute;top:calc(var(--sat) + 7px);left:calc(var(--sal) + 12px);',
'  right:calc(var(--sar) + 12px);display:flex;align-items:flex-start;gap:8px}',
'.s2col{display:flex;flex-direction:column;gap:5px;min-width:0}',
'.s2hl{align-items:flex-start;flex:1 1 0}',
'.s2hc{align-items:center;flex:0 1 auto;max-width:46%}',
'.s2hr{align-items:flex-end;flex:1 1 0;padding-right:calc(var(--uis)*34px)}',

'.s2score{font:800 calc(var(--uis)*clamp(17px,4.4vh,30px))/1 var(--fm);letter-spacing:.04em;',
'  color:#fff;text-shadow:0 0 calc(14px*var(--bl)*var(--glow)) rgba(0,229,255,.9),0 2px 0 rgba(0,0,0,.65)}',
'.s2mult{display:flex;align-items:center;gap:6px;height:calc(var(--uis)*11px)}',
'.s2mult>b{font:900 calc(var(--uis)*clamp(11px,2.6vh,16px))/1 var(--fm);color:var(--am);',
'  text-shadow:0 0 calc(12px*var(--bl)*var(--glow)) var(--am);opacity:.5;transition:opacity .15s}',
'.s2mult.up>b{opacity:1}',
'.s2mult>s{font:700 calc(var(--uis)*max(var(--fmin),clamp(8px,1.9vh,11px)))/1 var(--fm);color:var(--am);',
'  opacity:.72;text-decoration:none;white-space:nowrap}',
'.s2mult>i{display:block;width:calc(var(--uis)*54px);height:3px;background:rgba(255,209,102,.18);',
'  border-radius:2px;overflow:hidden}',
'.s2mult>i>u{display:block;height:100%;width:100%;transform-origin:0 50%;transform:scaleX(0);',
'  background:var(--am)}',

'.s2lv{display:flex;align-items:baseline;gap:7px;white-space:nowrap;max-width:100%}',
'.s2lv>b{font:900 calc(var(--uis)*max(var(--fmin),clamp(10px,2.4vh,14px)))/1 var(--fs);letter-spacing:.18em;',
'  color:var(--cy);text-shadow:0 0 calc(12px*var(--bl)*var(--glow)) var(--cy)}',
'.s2lv>s{text-decoration:none;font:700 calc(var(--uis)*max(var(--fmin),clamp(9px,2vh,12px)))/1.3 var(--fs);',
'  letter-spacing:.14em;color:var(--dim);overflow:hidden;text-overflow:ellipsis}',
'.s2ph{text-decoration:none;font:800 calc(var(--uis)*var(--fmin))/1.3 var(--fs);letter-spacing:.18em;',
'  color:var(--vi);white-space:nowrap;opacity:0;transition:opacity .16s}',
'.s2ph.on{opacity:.95}',
'.s2prog{width:calc(var(--uis)*clamp(90px,26vw,220px));height:4px;border-radius:3px;',
'  background:rgba(0,229,255,.14);overflow:hidden}',
'.s2prog>u{display:block;height:100%;width:100%;transform-origin:0 50%;transform:scaleX(0);',
'  background:linear-gradient(90deg,var(--cy),var(--vi));',
'  box-shadow:0 0 calc(10px*var(--bl)) rgba(0,229,255,.7)}',

'.s2boss{display:none;flex-direction:column;align-items:center;gap:3px;width:calc(var(--uis)*clamp(150px,44vw,420px))}',
'.s2boss.on{display:flex}',
'.s2boss>b{font:900 calc(var(--uis)*max(var(--fmin),clamp(10px,2.3vh,14px)))/1 var(--fs);letter-spacing:.24em;',
'  color:var(--mg);text-shadow:0 0 calc(14px*var(--bl)*var(--glow)) var(--mg)}',
'.s2boss>i{display:block;width:100%;height:9px;background:rgba(255,46,99,.16);',
'  border:1px solid rgba(255,46,99,.55);border-radius:2px;overflow:hidden;',
'  box-shadow:0 0 calc(16px*var(--bl)) rgba(255,46,99,.35)}',
'.s2boss>i>u{display:block;height:100%;width:100%;transform-origin:0 50%;',
'  background:linear-gradient(90deg,#ff2e63,#ff8a5c);transition:transform .12s linear}',

'.s2ann{min-height:0;text-align:center;opacity:0;transform:translateY(-6px);',
'  transition:opacity .18s,transform .18s;pointer-events:none}',
'.s2ann.on{opacity:1;transform:none}',
'.s2ann>b{display:block;font:900 calc(var(--uis)*max(var(--fmin),clamp(11px,2.6vh,16px)))/1.1 var(--fs);',
'  letter-spacing:.16em;color:#fff;text-shadow:0 0 calc(16px*var(--bl)*var(--glow)) var(--cy)}',
'.s2ann>s{display:block;text-decoration:none;margin-top:2px;',
'  font:700 calc(var(--uis)*max(var(--fmin),clamp(9px,2vh,12px)))/1.1 var(--fs);letter-spacing:.1em;color:var(--dim)}',

'.s2seg{display:flex;align-items:center;gap:6px}',
'.s2seg>b{font:800 calc(var(--uis)*clamp(13px,3.2vh,21px))/1 var(--fm);color:var(--cy);',
'  text-shadow:0 0 calc(12px*var(--bl)*var(--glow)) var(--cy)}',
'.s2seg>s{text-decoration:none;font:800 calc(var(--uis)*max(var(--fmin),clamp(8px,1.8vh,11px)))/1 var(--fs);',
'  letter-spacing:.18em;color:var(--dim)}',
'.s2seg.low>b{color:#fff;animation:s2danger .5s infinite steps(2)}',
/* G14 : une pastille par segment. Le chiffre seul ne se lit pas d'un coup
   d'oeil ; la rangée, si. Largeur totale bornée (84 px de gabarit) : la
   pastille et l'écart rétrécissent quand le serpent s'allonge, le COMPTE
   reste exact quelle que soit la longueur. */
'.s2pels{display:flex;align-items:center;gap:var(--pg,3px)}',
/* Pas de halo sur les pastilles : elles peuvent être 53 en fin de partie, et
   cinquante-trois ombres portées floues coûtent une image sur le téléphone
   (banc iphone/bascule-charge, p95 17,3 ms contre 16,7 de plafond). Le trait
   plein suffit à les lire, il est même plus net. */
'.s2pels>i{display:block;width:calc(var(--uis)*var(--pw,5px));height:calc(var(--uis)*9px);',
'  border-radius:2px;background:var(--cy)}',
'.s2seg.low .s2pels>i{background:var(--mg);box-shadow:none;animation:s2pelLow .5s infinite steps(2)}',
'@keyframes s2pelLow{0%{background:#fff}50%{background:var(--mg)}}',
'#ui.nf .s2seg.low .s2pels>i{animation:none}',
'@keyframes s2danger{0%{color:#fff;text-shadow:0 0 18px var(--mg)}50%{color:var(--mg);text-shadow:none}}',
'.s2g{display:flex;align-items:center;gap:5px}',
'.s2g>s{text-decoration:none;font:800 calc(var(--uis)*max(var(--fmin),clamp(7px,1.6vh,10px)))/1 var(--fs);',
'  letter-spacing:.14em;color:var(--dim);min-width:2.2em;text-align:right;white-space:nowrap}',
'.s2g>i{display:block;width:calc(var(--uis)*clamp(54px,13vw,96px));height:6px;border-radius:3px;',
'  background:rgba(255,255,255,.1);overflow:hidden}',
'.s2g>i>u{display:block;height:100%;width:100%;transform-origin:0 50%;transform:scaleX(0)}',
'.s2gb>i>u{background:linear-gradient(90deg,#ffb347,var(--am));',
'  box-shadow:0 0 calc(10px*var(--bl)) var(--am)}',
'.s2gu>i>u{background:linear-gradient(90deg,var(--mg),#ff9ec4);',
'  box-shadow:0 0 calc(10px*var(--bl)) var(--mg)}',
'.s2gu.rdy>s{color:var(--mg);animation:s2blink .7s infinite}',
'.s2gb.dry>s{color:#ff2a2a} .s2gb.dry>i{background:rgba(255,42,42,.55);box-shadow:0 0 calc(10px*var(--bl)) #ff2a2a}',
'.s2gb.dry>i>u{background:#ff2a2a;box-shadow:none}',   /* panne de boost : barre BST rouge le temps de deux éclats */
'@keyframes s2blink{0%,100%{opacity:1}50%{opacity:.3}}',

'#ui .s2pause{position:absolute;top:calc(var(--sat) + 4px);right:calc(var(--sar) + 6px);',
'  width:calc(var(--uis)*38px);height:calc(var(--uis)*38px);display:flex;align-items:center;justify-content:center;',
'  pointer-events:auto;opacity:.4;font-size:calc(var(--uis)*max(13px,var(--fmin)));letter-spacing:.1em;color:var(--cy)}',
'#ui .s2pause:active{opacity:.9}',
'#ui .s2pause::after{content:"";position:absolute;inset:-12px}',

/* ------ contrôles -- */
'.s2ctl{position:absolute;inset:0;pointer-events:none;opacity:0;',
'  transition:opacity .2s ease;will-change:opacity}',
'.s2ctl.on{opacity:1}',
'.s2opt[hidden]{display:none}',
'.s2pause-blur{color:#ffd166;text-shadow:0 0 calc(18px*var(--bl)*var(--glow)) #ffd166}',
'.s2joy{position:absolute;transform:translate(-50%,50%);border-radius:50%;',
'  border:2px solid var(--cy);opacity:calc(.24*var(--ca));transition:opacity .14s ease;',
'  box-shadow:0 0 calc(18px*var(--bl)) rgba(0,229,255,.35),inset 0 0 calc(22px*var(--bl)) rgba(0,229,255,.14)}',
'.s2joy::before{content:"";position:absolute;inset:22%;border-radius:50%;',
'  border:1px dashed rgba(0,229,255,.5)}',
'.s2joy.on{opacity:calc(.5*var(--ca))}',
'.s2knob{position:absolute;left:50%;top:50%;width:44%;height:44%;margin:-22% 0 0 -22%;',
'  border-radius:50%;background:radial-gradient(circle at 35% 30%,#bffaff,#00e5ff 60%,#0091b0);',
'  box-shadow:0 0 calc(20px*var(--bl)) rgba(0,229,255,.75);will-change:transform}',
/* G14 : trois boutons à 0,26 d'opacité, sans nom, ne se lisaient ni au repos
   ni prêts. Base 0,45, prêt 0,90 — et une étiquette de 11 px dessous. */
'.s2btn{position:absolute;transform:translate(-50%,50%);border-radius:50%;',
'  display:flex;align-items:center;justify-content:center;',
'  opacity:calc(.45*var(--ca));transition:opacity .1s ease;will-change:opacity}',
'.s2btn.on{opacity:calc(.72*var(--ca))}',
'.s2blab{position:absolute;left:50%;top:100%;transform:translate(-50%,3px);white-space:nowrap;',
'  font:800 max(11px,calc(var(--uis)*11px))/1 var(--fs);font-style:normal;letter-spacing:.08em;',
'  color:currentColor;text-shadow:0 0 5px rgba(0,0,0,.85);pointer-events:none}',
'.s2bcd{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-style:normal;',
'  font:900 calc(var(--uis)*clamp(15px,4vh,22px))/1 var(--fm);color:#fff;pointer-events:none;',
'  text-shadow:0 0 8px rgba(0,0,0,.8)}',
'.s2btn>svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}',
'.s2btn .trk{fill:currentColor;fill-opacity:.16;stroke:currentColor;stroke-opacity:.5;stroke-width:2}',
'.s2btn .arc{fill:none;stroke:currentColor;stroke-width:7;stroke-linecap:round;',
'  transform:rotate(-90deg);transform-origin:50% 50%;',
'  filter:drop-shadow(0 0 calc(6px*var(--bl)) currentColor)}',
'.s2btn>span{position:relative;font:900 1em/1 var(--fs);color:#04101a;',
'  text-shadow:0 0 6px rgba(255,255,255,.5)}',
'.s2btn.rdy{animation:s2rdy .9s ease-in-out infinite;opacity:calc(.9*var(--ca))}',
/* prêt ET pressé : .rdy suit .on à specificite egale, un bouton pret s'assombrissait
   sous le doigt (0,42 au lieu de 0,55). L'appui reste l'etat le plus lumineux. */
'.s2btn.rdy.on{opacity:calc(1*var(--ca))}',
/* prêt : halo de l'arc × 1,3 — la jauge pleine se voyait à peine */
'.s2btn.rdy .arc{stroke-width:8;filter:drop-shadow(0 0 calc(7.8px*var(--bl)) currentColor)}',
'@keyframes s2rdy{0%,100%{filter:none}50%{filter:brightness(1.7)}}',
'#ui.nf .s2btn.rdy{animation:none}',
'.s2b-boost{color:var(--am)} .s2b-special{color:var(--vi)} .s2b-ult{color:var(--mg)}',
'.s2b-boost.dry{color:#ff2a2a} .s2b-boost.dry .trk{fill-opacity:.85;stroke-opacity:1}',   /* panne : bouton rouge */
/* PANNE : l'ANNEAU aussi, et c'est un TRACÉ, pas une couleur. Mesuré sur le
   build (tools/test/G10/r1-anneau-boost.mjs) : à la panne la réserve vaut zéro,
   _uiArc pose donc un strokeDashoffset égal à toute la circonférence et l'arc ne
   dessine RIEN — la couronne (0,80 à 1,00 du rayon) y perdait 77 points de rouge
   au lieu d'en gagner, avec un écart rouge − vert de 2,8. Ajouter une couleur à
   .arc n'aurait changé aucun pixel : on force la longueur de l'arc à sa
   circonférence entière le temps de l'éclat, indépendamment de la valeur. Le
   !important est nécessaire, _uiArc écrit strokeDashoffset en style en ligne. */
'.s2b-boost.dry .arc{stroke-dashoffset:0!important;stroke-opacity:1}',

/* ------ bannière - */
'.s2ban{position:absolute;inset:0;display:none;align-items:center;justify-content:center;',
'  pointer-events:none;overflow:hidden;z-index:2}',
'.s2ban.on{display:flex}',
'.s2ban>b{position:relative;font:900 calc(var(--uis)*clamp(26px,10vh,76px))/1 var(--fs);',
/* Plafond par le nombre de caracteres (--n, pose en JS) : K = 0,95 em par
   caractere, MESURE sur ce build (maximum des onze chaines de banniere :
   DOUBLE LAME, 0,9466 ; letter-spacing .2em compris). Le garde-fou de
   _uiBanFit reste seul juge : il reduit par pas de 4 % tant que le texte
   deborde. Si le navigateur ne sait pas diviser par une var(), cette
   declaration tombe et la taille du raccourci font: ci-dessus reste. */
'  font-size:min(calc(var(--uis)*clamp(26px,10vh,76px)),calc(.9*100vw/(.95*var(--n,20))));',
'  letter-spacing:.2em;color:#fff;white-space:nowrap;padding:0 .1em;',
'  text-shadow:0 0 calc(26px*var(--bl)) var(--cy),0 0 calc(62px*var(--bl)) var(--mg);',
'  animation:s2banIn 1.15s cubic-bezier(.14,1,.3,1) both}',
'.s2ban>b::before,.s2ban>b::after{content:attr(data-t);position:absolute;left:0;top:0;',
'  width:100%;text-align:center;opacity:.75;mix-blend-mode:screen}',
'.s2ban>b::before{color:var(--mg);animation:s2glA 1.15s steps(3) both}',
'.s2ban>b::after{color:var(--cy);animation:s2glB 1.15s steps(3) both}',
'.s2ban i{position:absolute;left:-10%;right:-10%;height:2px;background:var(--cy);',
'  box-shadow:0 0 calc(24px*var(--bl)) var(--cy);animation:s2sweep 1.15s ease-out both}',
'@keyframes s2banIn{0%{opacity:0;transform:scale(1.6) skewX(-14deg);filter:blur(6px)}',
'  18%{opacity:1;transform:scale(1) skewX(0);filter:blur(0)}',
'  74%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.12)}}',
'@keyframes s2glA{0%,100%{transform:translate(0,0);opacity:0}12%{transform:translate(-6px,2px);opacity:.8}',
'  26%{transform:translate(3px,-2px);opacity:.5}60%{transform:translate(-2px,0);opacity:.25}}',
'@keyframes s2glB{0%,100%{transform:translate(0,0);opacity:0}12%{transform:translate(6px,-2px);opacity:.8}',
'  26%{transform:translate(-3px,2px);opacity:.5}60%{transform:translate(2px,0);opacity:.25}}',
'@keyframes s2sweep{0%{transform:scaleX(0);opacity:0}20%{transform:scaleX(1);opacity:1}',
'  100%{transform:scaleX(1);opacity:0}}',
'#ui.nf .s2ban>b{animation:s2banSoft 1.1s ease both;text-shadow:0 0 10px var(--cy)}',
'#ui.nf .s2ban>b::before,#ui.nf .s2ban>b::after,#ui.nf .s2ban i{display:none}',
'@keyframes s2banSoft{0%{opacity:0}15%{opacity:1}80%{opacity:1}100%{opacity:0}}',

/* ------ écrans - */
'.s2scr{position:absolute;inset:0;display:none;flex-direction:column;z-index:0;',
'  padding:calc(var(--sat) + 10px) calc(var(--sar) + 16px) calc(var(--sab) + 10px) calc(var(--sal) + 16px);',
'  pointer-events:auto;overscroll-behavior:contain}',
'.s2scr.on{display:flex}',
'.s2scr::before{content:"";position:absolute;inset:0;pointer-events:none;z-index:-2;',
'  background:radial-gradient(120% 90% at 50% 108%,rgba(255,46,99,.2),transparent 60%),',
'  radial-gradient(110% 80% at 50% -10%,rgba(0,229,255,.16),transparent 62%),',
'  linear-gradient(180deg,rgba(3,4,12,.94),rgba(3,4,12,.86) 55%,rgba(2,3,9,.97))}',
'.s2scr::after{content:"";position:absolute;inset:0;pointer-events:none;z-index:-1;opacity:.5;',
'  background:repeating-linear-gradient(180deg,rgba(0,0,0,.22) 0 1px,transparent 1px 3px)}',
'#ui.hc .s2scr::before{background:linear-gradient(180deg,rgba(1,2,7,.985),rgba(1,2,7,.985))}',
'#ui.hc .s2scr::after{display:none}',

'.s2ttl{font:900 calc(var(--uis)*clamp(14px,3.4vh,22px))/1 var(--fs);letter-spacing:.26em;',
'  color:var(--cy);text-shadow:0 0 calc(18px*var(--bl)*var(--glow)) var(--cy);text-align:center}',
'.s2sub{font:700 calc(var(--uis)*max(var(--fmin),clamp(9px,2vh,12px)))/1.3 var(--fs);letter-spacing:.14em;color:var(--dim)}',
'.s2row{display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap}',
'.s2fill{flex:1 1 auto;min-height:0}',

'#ui .s2big{position:relative;flex:0 0 auto;padding:0 clamp(20px,5vw,54px);',
'  height:calc(var(--uis)*clamp(46px,13.5vh,78px));min-width:calc(var(--uis)*clamp(150px,34vw,320px));',
'  border-radius:9px;border:2px solid var(--cy);color:#031018;',
'  background:linear-gradient(180deg,#9ffaff,#00e5ff 46%,#00a6c8);',
'  font:900 calc(var(--uis)*clamp(15px,4vh,26px))/1 var(--fs);letter-spacing:.2em;',
'  box-shadow:0 0 calc(34px*var(--bl)) rgba(0,229,255,.55),inset 0 -3px 0 rgba(0,0,0,.28);',
'  animation:s2breathe 2.6s ease-in-out infinite}',
'#ui .s2big::after{content:"";position:absolute;inset:-9px;border-radius:13px;',
'  border:1px solid rgba(0,229,255,.35);pointer-events:none}',
'#ui .s2big:active{transform:translateY(2px) scale(.985);filter:brightness(1.2)}',
'@keyframes s2breathe{0%,100%{box-shadow:0 0 calc(26px*var(--bl)) rgba(0,229,255,.45),inset 0 -3px 0 rgba(0,0,0,.28)}',
'  50%{box-shadow:0 0 calc(48px*var(--bl)) rgba(0,229,255,.75),inset 0 -3px 0 rgba(0,0,0,.28)}}',
'#ui.nf .s2big{animation:none}',
'#ui .s2big.mag::after{border-color:rgba(255,46,99,.4)}',
'#ui .s2big.mag{border-color:var(--mg);background:linear-gradient(180deg,#ffc2d4,#ff2e63 46%,#c00c3c);',
'  color:#22030b;box-shadow:0 0 calc(34px*var(--bl)) rgba(255,46,99,.55),inset 0 -3px 0 rgba(0,0,0,.28)}',

'#ui .s2pill{flex:0 0 auto;padding:0 calc(var(--uis)*clamp(12px,3vw,24px));height:calc(var(--uis)*clamp(34px,9vh,50px));',
'  border-radius:8px;border:1px solid var(--line);background:var(--pan);color:var(--ink);',
'  font:800 calc(var(--uis)*max(var(--fmin),clamp(10px,2.3vh,14px)))/1 var(--fs);letter-spacing:.16em}',
'#ui .s2pill:active{background:rgba(0,229,255,.22);border-color:var(--cy)}',
'#ui .s2pill.dim{color:var(--dim)}',

/* menu */
/* G10 : menu en COLONNE centree. En ligne, le logo et JOUER s'eloignaient
   l'un de l'autre a mesure que la fenetre s'elargissait (3 000 px de vide a
   3440 px). Les trois blocs sont empiles, centres, et bornes a 1100 px. */
'.s2menu{flex-direction:column;align-items:center;justify-content:center;gap:clamp(8px,2.4vh,30px)}',
'.s2mL,.s2mR,.s2mF{width:100%;max-width:1100px;display:flex;flex-direction:column;align-items:center;min-width:0}',
'.s2mL{gap:clamp(4px,1.4vh,12px);text-align:center}',
'.s2mR{gap:clamp(8px,2.4vh,18px)}',
'.s2mF{gap:clamp(4px,1.4vh,12px)}',
'.s2menu .s2keys{text-align:center}',
'.s2logo{display:flex;flex-direction:column;line-height:.86}',
'.s2logo>b{font:900 calc(var(--uis)*clamp(30px,12vh,80px))/.86 var(--fs);letter-spacing:.06em;color:#dff3ff}',
'.s2logo>i{font:900 calc(var(--uis)*clamp(24px,9vh,60px))/.9 var(--fs);letter-spacing:.3em;',
'  font-style:normal;color:var(--mg);text-shadow:0 0 calc(24px*var(--bl)) var(--mg),',
'  0 0 calc(60px*var(--bl)) rgba(255,46,99,.5)}',
'@supports ((-webkit-background-clip:text) or (background-clip:text)){',
'.s2logo>b{background:linear-gradient(178deg,#ffffff 6%,#cfe9ff 34%,#5f92b4 51%,#f2feff 62%,#8fd2ff 100%);',
'  -webkit-background-clip:text;background-clip:text;color:transparent;',
'  filter:drop-shadow(0 0 calc(16px*var(--bl)) rgba(0,229,255,.55))}}',
'.s2stat2{display:flex;gap:clamp(10px,3vw,26px);flex-wrap:wrap}',
'.s2kv{display:flex;flex-direction:column;gap:2px}',
'.s2kv>s{text-decoration:none;font:800 calc(var(--uis)*max(var(--fmin),clamp(8px,1.7vh,10px)))/1 var(--fs);',
'  letter-spacing:.2em;color:var(--dim)}',
'.s2kv>b{font:800 calc(var(--uis)*clamp(14px,3.4vh,22px))/1 var(--fm);color:var(--am);',
'  text-shadow:0 0 calc(12px*var(--bl)*var(--glow)) rgba(255,209,102,.7)}',
'.s2kv.cy>b{color:var(--cy);text-shadow:0 0 calc(12px*var(--bl)*var(--glow)) rgba(0,229,255,.7)}',

/* cartes */
'.s2cards{align-items:center;justify-content:center;gap:clamp(6px,1.6vh,14px)}',
'.s2cardrow{display:flex;gap:clamp(8px,2.2vw,20px);align-items:stretch;justify-content:center;',
'  width:100%;flex:1 1 auto;min-height:0;max-height:calc(var(--uis)*clamp(120px,52vh,250px))}',
/* MAX-width, jamais une width imposee : flex:1 1 0 avec min-width:0 laisse la
   carte retrecir sous 300 px la ou la place manque (iPhone paysage : trois
   cartes dans ~680 px, soit 227 px chacune). */
'#ui .s2card{position:relative;flex:1 1 0;min-width:0;max-width:clamp(300px,22vw,480px);',
'  display:flex;flex-direction:column;align-items:center;justify-content:center;',
'  gap:clamp(3px,1.1vh,10px);padding:clamp(8px,2.4vh,20px) clamp(6px,1.4vw,16px);',
'  border-radius:12px;border:2px solid var(--rb,var(--r));transition:transform .08s,border-color .08s;',
'  background:linear-gradient(168deg,rgba(12,18,36,.95),rgba(4,6,15,.97));',
'  box-shadow:0 0 calc(24px*var(--bl)) var(--rg),inset 0 0 calc(40px*var(--bl)) var(--rg);',
'  animation:s2cardIn .34s cubic-bezier(.16,1,.3,1) both;animation-delay:var(--d,0ms)}',
'#ui .s2card:active{transform:scale(.97);filter:brightness(1.35)}',
'@keyframes s2cardIn{0%{opacity:0;transform:translateY(26px) scale(.9)}100%{opacity:1}}',
'.s2card>u{position:absolute;top:0;left:0;right:0;height:3px;background:var(--r);',
'  box-shadow:0 0 calc(14px*var(--bl)) var(--r)}',
'.s2card .ic{font:400 calc(var(--uis)*clamp(22px,8vh,54px))/1.1 var(--fs);color:var(--t,var(--r));',
'  text-shadow:0 0 calc(18px*var(--bl)*var(--glow)) var(--t,var(--r))}',
'.s2card .nm{font:900 calc(var(--uis)*max(var(--fmin),clamp(12px,3vh,20px)))/1.05 var(--fs);letter-spacing:.1em;',
'  color:#fff;text-align:center;word-break:break-word}',
'.s2card .ds{font:600 calc(var(--uis)*max(var(--fmin),clamp(9px,2.1vh,13px)))/1.28 var(--fs);color:var(--dim);',
'  text-align:center;flex:0 1 auto}',
'.s2card .rr{margin-top:clamp(2px,1.2vh,9px);font:800 calc(var(--uis)*max(var(--fmin),clamp(7px,1.6vh,10px)))/1.3 var(--fs);letter-spacing:.24em;',
'  color:var(--r);opacity:.9}',
'.s2card .lv{position:absolute;top:5px;right:8px;font:800 calc(var(--uis)*var(--fmin))/1.3 var(--fs);',
'  letter-spacing:.12em;color:var(--r);opacity:.6}',
'.s2card.ultra{animation:s2cardIn .34s cubic-bezier(.16,1,.3,1) both,s2ultra 1.8s linear infinite .34s}',
'@keyframes s2ultra{0%,100%{box-shadow:0 0 calc(22px*var(--bl)) var(--rg),inset 0 0 30px var(--rg)}',
'  50%{box-shadow:0 0 calc(52px*var(--bl)) var(--r),inset 0 0 54px var(--rg)}}',
'#ui.nf .s2card,#ui.nf .s2card.ultra{animation:none}',

/* fin de partie */
'.s2grid{display:flex;flex-wrap:wrap;justify-content:center;gap:clamp(5px,1.4vh,14px);width:100%;',
'  max-width:900px;margin:0 auto}',
'.s2tile{flex:1 1 clamp(78px,17%,140px);min-width:clamp(72px,16%,140px);max-width:clamp(120px,22%,210px);',
'  padding:clamp(5px,1.4vh,12px) clamp(6px,1.2vw,14px);border-radius:8px;',
'  border:1px solid var(--line);background:var(--pan);display:flex;flex-direction:column;gap:3px}',
'.s2tile>s{text-decoration:none;font:800 calc(var(--uis)*max(var(--fmin),clamp(7px,1.6vh,10px)))/1.35 var(--fs);',
'  letter-spacing:.18em;color:var(--dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
/* La tuile ARME tronquait six noms sur huit sur petit écran : elle prend
   toute la largeur qu'il lui faut, et son texte rétrécit plutôt que de se
   couper. Les deux règles .s2tile.wide étaient jusqu'ici INSÉRÉES AU MILIEU
   du bloc .s2tile>b, donc lues comme des règles imbriquées « & .s2tile.wide »
   qui ne correspondent à rien : mesuré nul sur le build (cssRules), le
   correctif était inerte. Elles sortent du bloc. */
'.s2tile>b{font:800 calc(var(--uis)*max(var(--fmin),clamp(12px,2.9vh,19px)))/1.2 var(--fm);color:#fff;',
'  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
'.s2tile.wide{flex:1 1 100%;max-width:100%}',
'.s2tile.wide>b{font-size:calc(var(--uis)*max(var(--fmin),clamp(9px,2.1vh,14px)));white-space:nowrap;',
'  overflow:hidden;text-overflow:clip}',
'.s2tile.hi{border-color:var(--am)}.s2tile.hi>b{color:var(--am)}',
'.s2rec{font:900 calc(var(--uis)*max(var(--fmin),clamp(10px,2.4vh,15px)))/1 var(--fs);letter-spacing:.22em;',
'  color:var(--am);text-shadow:0 0 calc(16px*var(--bl)) var(--am);animation:s2blink 1s infinite;opacity:0}',
'.s2rec.on{opacity:1}',
/* G14 — écran de fin qui explique */
'.s2kill{font:700 calc(var(--uis)*max(var(--fmin),clamp(10px,2.3vh,15px)))/1.35 var(--fs);',
'  color:var(--ink);text-align:center;max-width:900px}',
'.s2kill>b{color:var(--mg);font-weight:900;letter-spacing:.06em}',
'.s2tip{font:700 calc(var(--uis)*max(var(--fmin),clamp(10px,2.2vh,14px)))/1.35 var(--fs);',
'  color:var(--am);text-align:center;max-width:860px}',
'.s2tip:empty{display:none}',
'.s2build{font:900 calc(var(--uis)*max(var(--fmin),clamp(10px,2.2vh,14px)))/1.2 var(--fs);',
'  letter-spacing:.14em;color:var(--vi);text-align:center}',
'.s2delta{font:700 calc(var(--uis)*max(var(--fmin),clamp(9px,2vh,12px)))/1.3 var(--fs);',
'  color:var(--dim);text-align:center}',
'.s2delta:empty{display:none}',
'.s2bcards{display:flex;flex-wrap:wrap;justify-content:center;gap:4px;max-width:900px}',
'.s2bcards>span{display:inline-flex;align-items:center;gap:3px;padding:1px 7px;border-radius:999px;',
'  border:1px solid var(--line);background:var(--pan);color:var(--ink);',
'  font:800 calc(var(--uis)*max(var(--fmin),clamp(9px,2vh,12px)))/1.5 var(--fs)}',
'.s2bcards>span>u{text-decoration:none;color:var(--am)}',
'#ui .s2next{position:relative;display:block;flex:0 0 auto;width:min(620px,94%);padding:0;overflow:hidden;',
'  border-radius:9px;border:1px solid var(--line);background:var(--pan);text-align:left}',
'#ui .s2next>s{display:block;text-decoration:none;padding:6px 12px 7px;',
'  font:800 calc(var(--uis)*max(var(--fmin),clamp(9px,2vh,12px)))/1.25 var(--fs);',
'  letter-spacing:.1em;color:var(--ink)}',
'#ui .s2next::after{content:"";position:absolute;left:0;right:0;bottom:0;height:6px;',
'  background:rgba(255,255,255,.1)}',
'#ui .s2next>u{position:relative;z-index:1;display:block;height:6px;width:0;',
'  background:var(--am);box-shadow:0 0 calc(9px*var(--bl)) var(--am)}',
'.s2first{font:700 calc(var(--uis)*max(var(--fmin),clamp(10px,2.2vh,13px)))/1.3 var(--fs);',
'  letter-spacing:.06em;color:var(--am);text-align:center}',
'#ui .s2next[hidden]{display:none}',
'.s2crank{display:flex;gap:clamp(10px,3vw,26px);flex-wrap:wrap;justify-content:center}',

/* réglages */
'.s2scroll{flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;touch-action:pan-y;',
'  -webkit-overflow-scrolling:touch;padding:2px 2px 6px;display:flex;flex-direction:column;gap:5px}',
'.s2grp{font:800 calc(var(--uis)*max(var(--fmin),clamp(8px,1.8vh,11px)))/1 var(--fs);letter-spacing:.26em;',
'  color:var(--cy);opacity:.85;margin:8px 0 1px}',
'.s2opt{display:flex;align-items:center;gap:10px;padding:clamp(4px,1vh,9px) 10px;',
'  border-radius:7px;background:var(--pan);border:1px solid rgba(255,255,255,.07)}',
'.s2optx{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:2px}',
'.s2optx>s{text-decoration:none;font:700 calc(var(--uis)*max(var(--fmin),clamp(10px,2.2vh,14px)))/1.1 var(--fs);',
'  letter-spacing:.06em}',
'.s2optd{font:600 calc(var(--uis)*var(--fmin))/1.25 var(--fs);font-style:normal;color:var(--dim)}',
/* panneau des reglages : centre, borne a 820 px, et un onglet a la fois */
'.s2set{align-items:center}',
'.s2set>.s2scroll,.s2set>.s2tabs,.s2set>.s2row{width:100%;max-width:820px}',
'.s2scroll[hidden]{display:none}',
'.s2tabs{flex:0 0 auto;display:flex;gap:6px;justify-content:center}',
'#ui .s2tabs>button{flex:1 1 0;padding:0 calc(var(--uis)*10px);height:calc(var(--uis)*30px);',
'  border:1px solid var(--line);border-radius:7px;background:rgba(255,255,255,.03);',
'  font:800 calc(var(--uis)*var(--fmin))/1 var(--fs);letter-spacing:.14em;color:var(--dim)}',
'#ui .s2tabs>button.on{background:var(--cy);color:#03121a}',
'.s2sw{position:relative;flex:0 0 auto;width:52px;height:28px;border-radius:14px;',
'  background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.16);transition:background .15s}',
'.s2sw::after{content:"";position:absolute;top:2px;left:2px;width:22px;height:22px;border-radius:50%;',
'  background:#8ba3bd;transition:transform .15s ease,background .15s}',
'.s2sw.on{background:rgba(0,229,255,.3);border-color:var(--cy)}',
'.s2sw.on::after{transform:translateX(24px);background:var(--cy);box-shadow:0 0 12px var(--cy)}',
'.s2stp{flex:0 0 auto;display:flex;align-items:center;gap:6px}',
'#ui .s2stp>button{width:calc(var(--uis)*42px);height:calc(var(--uis)*38px);border-radius:6px;border:1px solid var(--line);',
'  background:rgba(0,229,255,.09);font:900 calc(var(--uis)*max(16px,var(--fmin)))/1 var(--fs);color:var(--cy)}',
'#ui .s2stp>button:active{background:rgba(0,229,255,.3)}',
'.s2stp>span{min-width:calc(var(--uis)*76px);text-align:center;font:800 calc(var(--uis)*max(12px,var(--fmin)))/1 var(--fm);color:#fff}',
'.s2seg2{flex:0 0 auto;display:flex;border:1px solid var(--line);border-radius:7px;overflow:hidden}',
'#ui .s2seg2>button{padding:0 calc(var(--uis)*12px);height:calc(var(--uis)*30px);font:800 calc(var(--uis)*var(--fmin))/1 var(--fs);',
'  letter-spacing:.12em;color:var(--dim);background:rgba(255,255,255,.03)}',
'#ui .s2seg2>button.on{background:var(--cy);color:#03121a}',

/* déblocages */
'.s2ug{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}',
'.s2u{flex:1 1 clamp(120px,30%,220px);min-width:120px;display:flex;align-items:center;gap:9px;',
'  padding:8px 10px;border-radius:8px;border:1px solid var(--line);background:var(--pan)}',
'.s2u>i{font-style:normal;font-size:calc(var(--uis)*20px);color:var(--cy);width:1.3em;text-align:center}',
'.s2u>div{flex:1 1 auto;min-width:0}',
'.s2u b{display:block;font:900 calc(var(--uis)*max(11px,var(--fmin)))/1.1 var(--fs);letter-spacing:.1em}',
'.s2u s{display:block;text-decoration:none;font:600 calc(var(--uis)*var(--fmin))/1.2 var(--fs);color:var(--dim)}',
'#ui .s2u>button{flex:0 0 auto;padding:0 calc(var(--uis)*10px);height:calc(var(--uis)*30px);border-radius:6px;border:1px solid var(--am);',
'  color:var(--am);font:900 calc(var(--uis)*var(--fmin))/1 var(--fm);background:rgba(255,209,102,.1)}',
'.s2u.got{border-color:var(--ok)}#ui .s2u.got>button{border-color:var(--ok);color:var(--ok);background:none}',
'#ui .s2u.no>button{opacity:.35}',
''].join('\n');

/* ======
   PETITES AIDES DOM
   ====== */
function _uiMk(tag, cls, parent, txt) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt !== undefined && txt !== null) e.textContent = txt;
  if (parent) parent.appendChild(e);
  return e;
}
function _uiSvgMk(tag, parent, attrs) {
  var e = document.createElementNS('http://www.w3.org/2000/svg', tag);
  if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function _uiTxt(el, s) { if (el._uv !== s) { el._uv = s; el.textContent = s; } }
function _uiBar(el, v) {
  v = v < 0 ? 0 : (v > 1 ? 1 : v);
  var q = (v * 256) | 0;
  if (el._ub !== q) { el._ub = q; el.style.transform = 'scaleX(' + (q / 256) + ')'; }
}
function _uiArc(el, v) {
  v = v < 0 ? 0 : (v > 1 ? 1 : v);
  var q = (v * 128) | 0;
  if (el._ub !== q) { el._ub = q; el.style.strokeDashoffset = (el._uc0 * (1 - q / 128)).toFixed(1); }
}

/* activation tactile : on court-circuite les écouteurs du coeur posés sur #app */
function _uiTap(el, fn) {
  var busy = false;
  function fire(e) {
    if (busy) return;
    busy = true;
    setTimeout(function () { busy = false; }, 220);
    if (e) { e.stopPropagation(); if (e.cancelable) e.preventDefault(); }
    _uiClick();
    fn(el);
  }
  if (window.PointerEvent) {
    el.addEventListener('pointerdown', fire, { passive: false });
    el.addEventListener('touchstart', function (e) { e.stopPropagation(); if (e.cancelable) e.preventDefault(); }, { passive: false });
  } else {
    el.addEventListener('touchstart', fire, { passive: false });
    el.addEventListener('mousedown', fire, { passive: false });
  }
  el.addEventListener('touchmove', function (e) { e.stopPropagation(); }, { passive: true });
  el.addEventListener('touchend', function (e) { e.stopPropagation(); if (e.cancelable) e.preventDefault(); }, { passive: false });
  // clavier : Entrée ou Espace sur l'élément focalisé, même verrou busy. Le verrou de l'écran de fin
  // vaut aussi ici : l'événement atteint le bouton focalisé AVANT le gestionnaire d'écran, donc sans
  // ce garde une touche encore enfoncée à la mort relancerait la partie avant les 600 ms.
  el.addEventListener('keydown', function (e) {
    if (e.repeat) return;
    if (!(e.key === 'Enter' || e.key === ' ' || e.code === 'Space')) return;
    if (_uiScreen === 'over' && _uiOverLock) return;
    fire(e);
  });
  el._kf = fire;
  return el;
}
function _uiClick() {
  if (S2030.audio && S2030.audio.sfx) S2030.audio.sfx('click');
  if (typeof haptic === 'function') haptic(8);
}
/* laisse défiler un panneau sans que le coeur n'avale le geste */
function _uiScrollable(el) {
  el.addEventListener('touchstart', function (e) { e.stopPropagation(); }, { passive: true });
  el.addEventListener('touchmove', function (e) { e.stopPropagation(); }, { passive: true });
  el.addEventListener('touchend', function (e) { e.stopPropagation(); }, { passive: true });
}

/* ------ formatage -- */
/* « ×4 », « ×4.5 » : un dixième seulement quand il y en a un */
function _uiMultTxt(v) { var m = Math.round(v * 10); return m % 10 === 0 ? String(m / 10) : (m / 10).toFixed(1); }

function _uiNum(n) {
  n = Math.round(n) || 0;
  if (n < 1000) return '' + n;
  var s = '' + n, out = '', c = 0;
  for (var i = s.length - 1; i >= 0; i--) {
    out = s.charAt(i) + out;
    if (++c % 3 === 0 && i > 0) out = ' ' + out;
  }
  return out;
}
function _uiTime(ms) {
  var t = Math.max(0, ms / 1000) | 0;
  var m = (t / 60) | 0, s = t % 60;
  return m + ':' + (s < 10 ? '0' : '') + s;
}

/* ======
   GÉOMÉTRIE DES CONTRÔLES
   Les mêmes formules que le coeur (90-boot.js, btnRects) afin que le dessin
   colle aux zones tactiles même si le coeur garde son propre calcul.
   ====== */
function _uiMeasureSafe() {
  var p = _uiE.probe;
  if (!p) return;
  var cs = window.getComputedStyle(p);
  _uiSafe.t = parseFloat(cs.paddingTop) || 0;
  _uiSafe.r = parseFloat(cs.paddingRight) || 0;
  _uiSafe.b = parseFloat(cs.paddingBottom) || 0;
  _uiSafe.l = parseFloat(cs.paddingLeft) || 0;
  /* le coeur lit window.__safeR pour caler ses cercles tactiles */
  window.__safeT = _uiSafe.t; window.__safeR = _uiSafe.r;
  window.__safeB = _uiSafe.b; window.__safeL = _uiSafe.l;
}

function _uiPlace(el, cx, cyb, d) {
  el.style.left = cx.toFixed(1) + 'px';
  el.style.bottom = cyb.toFixed(1) + 'px';
  el.style.width = d.toFixed(1) + 'px';
  el.style.height = d.toFixed(1) + 'px';
  el.style.fontSize = (d * 0.34).toFixed(1) + 'px';
}

function _uiLayout() {
  if (!_uiBuilt) return;
  _uiScaleVars();
  _uiMeasureSafe();
  var W = window.innerWidth, H = window.innerHeight;
  var o = S.opt;
  var s = o.joySize || 1;
  var right = !o.leftHanded;
  var ox = o.ctlX || 0, oy = o.ctlY || 0;
  var sgn = right ? 1 : -1;

  var pad = 26 + _uiSafe.r + ox;
  var bx = right ? W - pad - 62 : (26 + _uiSafe.l + ox) + 62;
  var by = 96 + oy;                       // distance au bas de l'écran

  var R = _uiRects;
  R.boost.x = bx;                 R.boost.yb = by;         R.boost.r = 62 * s;
  R.special.x = bx - 96 * sgn;    R.special.yb = by + 20;  R.special.r = 46 * s;
  R.ult.x = bx - 40 * sgn;        R.ult.yb = by + 108;     R.ult.r = 46 * s;
  R.joy.x = right ? (110 + _uiSafe.l + ox) : (W - 110 - _uiSafe.r - ox);
  R.joy.yb = by; R.joy.r = 56 * s;
  R.boost.y = H - R.boost.yb; R.special.y = H - R.special.yb;
  R.ult.y = H - R.ult.yb;     R.joy.y = H - R.joy.yb;

  _uiPlace(_uiE.btnBoost, R.boost.x, R.boost.yb, R.boost.r * 1.44);
  _uiPlace(_uiE.btnSpecial, R.special.x, R.special.yb, R.special.r * 1.44);
  _uiPlace(_uiE.btnUlt, R.ult.x, R.ult.yb, R.ult.r * 1.44);
  if (!_uiJoyMoved) {
    _uiPlace(_uiE.joy, R.joy.x, R.joy.yb, R.joy.r * 2);
  } else {
    _uiE.joy.style.width = _uiE.joy.style.height = (R.joy.r * 2).toFixed(1) + 'px';
  }
}

/* ======
   CONSTRUCTION
   ====== */
function _uiBuildHud(root) {
  var hud = _uiMk('div', 's2hud', root);
  _uiE.hud = hud;

  var xp = _uiMk('div', 's2xp', hud);
  _uiE.xp = _uiMk('u', '', xp);

  var bar = _uiMk('div', 's2bar', hud);

  /* --- gauche : score et multiplicateur --- */
  var L = _uiMk('div', 's2col s2hl', bar);
  _uiE.score = _uiMk('div', 's2score', L, '0');
  var mu = _uiMk('div', 's2mult', L);
  _uiE.mult = _uiMk('b', '', mu, '×1');
  _uiE.multBox = mu;
  _uiE.multBar = _uiMk('u', '', _uiMk('i', '', mu));
  _uiE.multNx = _uiMk('s', '', mu, '');

  /* --- centre : niveau, progression, boss, annonces --- */
  var C = _uiMk('div', 's2col s2hc', bar);
  var lv = _uiMk('div', 's2lv', C);
  _uiE.lvN = _uiMk('b', '', lv, 'NIVEAU 1');
  _uiE.lvT = _uiMk('s', '', lv, '');
  _uiE.phTag = _uiMk('s', 's2ph', lv, '');   // nom de phase caméra, 1 s
  _uiE.prog = _uiMk('u', '', _uiMk('div', 's2prog', C));
  var bo = _uiMk('div', 's2boss', C);
  _uiE.bossBox = bo;
  _uiE.bossName = _uiMk('b', '', bo, 'BOSS');
  _uiE.bossBar = _uiMk('u', '', _uiMk('i', '', bo));
  var an = _uiMk('div', 's2ann', C);
  _uiE.ann = an;
  _uiE.annT = _uiMk('b', '', an, '');
  _uiE.annS = _uiMk('s', '', an, '');

  /* --- droite : pause, segments, boost, ultime --- */
  var R = _uiMk('div', 's2col s2hr', bar);
  var sg = _uiMk('div', 's2seg', R);
  _uiE.segBox = sg;
  _uiMk('s', '', sg, 'VIE');
  _uiE.segN = _uiMk('b', '', sg, '9');
  _uiE.segPel = _uiMk('div', 's2pels', sg);
  var gb = _uiMk('div', 's2g s2gb', R);
  _uiE.gBoostBox = gb;
  _uiMk('s', '', gb, 'BOOST');
  _uiE.gBoost = _uiMk('u', '', _uiMk('i', '', gb));
  // bureau : recharge du pouvoir (sur tactile, l'arc du bouton ◈ la montre)
  var gs = _uiMk('div', 's2g s2gs', R);
  _uiE.gSpBox = gs; gs.hidden = true;
  _uiMk('s', '', gs, 'POUVOIR');
  _uiE.gSp = _uiMk('u', '', _uiMk('i', '', gs));
  var gu = _uiMk('div', 's2g s2gu', R);
  _uiE.gUltBox = gu;
  _uiMk('s', '', gu, 'APOGÉE');
  _uiE.gUlt = _uiMk('u', '', _uiMk('i', '', gu));
  // capuchons de touches (bureau, 3 premières parties, 6 s)
  _uiMk('kbd', 's2kcap', gb, 'ESPACE'); _uiMk('kbd', 's2kcap', gs, 'E'); _uiMk('kbd', 's2kcap', gu, 'R');

  _uiE.pauseBtn = _uiTap(_uiMk('button', 's2pause', hud, '❚❚'), function () {
    if (typeof togglePause === 'function') togglePause();
  });
  _uiE.pauseBtn.setAttribute('aria-label', 'Pause');
  _uiE.pauseBtn.tabIndex = -1;
}

function _uiMkBtn(parent, key, glyph, label) {
  var b = _uiMk('div', 's2btn s2b-' + key, parent);
  b.setAttribute('aria-label', label);
  var svg = _uiSvgMk('svg', b, { viewBox: '0 0 100 100' });
  _uiSvgMk('circle', svg, { cx: 50, cy: 50, r: 36, 'class': 'trk' });
  var arc = _uiSvgMk('circle', svg, { cx: 50, cy: 50, r: 44, 'class': 'arc' });
  var c = 2 * Math.PI * 44;
  arc.setAttribute('stroke-dasharray', c.toFixed(2));
  arc.style.strokeDashoffset = c.toFixed(2);
  arc._uc0 = c;
  b._gl = _uiMk('span', '', b, glyph);
  b._cd = _uiMk('em', 's2bcd', b, '');
  b._cd.style.display = 'none';
  b._lab = _uiMk('em', 's2blab', b, label);
  b._arc = arc;
  return b;
}

function _uiBuildCtl(root) {
  var ctl = _uiMk('div', 's2ctl', root);
  _uiE.ctl = ctl;
  var joy = _uiMk('div', 's2joy', ctl);
  _uiE.joy = joy;
  _uiE.knob = _uiMk('div', 's2knob', joy);
  /* Le nom sous le bouton est aussi son aria-label : ce que la joueuse lit est
     ce que le lecteur d'écran dit. Le pouvoir change de nom en cours de partie
     (phases.buttonState), _uiSyncCtl le remet à jour. */
  _uiE.btnBoost = _uiMkBtn(ctl, 'boost', '»', 'BOOST');
  _uiE.btnSpecial = _uiMkBtn(ctl, 'special', '◈', 'TRAVERSÉE');
  _uiE.btnUlt = _uiMkBtn(ctl, 'ult', '★', 'APOGÉE');
}

function _uiBuildBanner(root) {
  var b = _uiMk('div', 's2ban', root);
  _uiE.ban = b;
  _uiMk('i', '', b);
  _uiE.banT = _uiMk('b', '', b, '');
}

/* ------ menu --- */
function _uiBuildMenu(root) {
  var sc = _uiMk('div', 's2scr s2menu', root);
  _uiE.scrMenu = sc;
  /* G10 : trois blocs EMPILÉS et centrés — le logo, puis l'accroche, puis
     JOUER. Les statistiques et la légende descendent sous les boutons : le
     logo touche ainsi le bouton, quelle que soit la largeur de la fenêtre. */
  var L = _uiMk('div', 's2mL', sc);
  var lg = _uiMk('div', 's2logo', L);
  _uiMk('b', '', lg, 'SNAKE');
  _uiMk('i', '', lg, '2030');
  _uiMk('div', 's2sub', L, 'ARCADE SURVIE — SURVIS À LA SURCHARGE');

  var R = _uiMk('div', 's2mR', sc);
  _uiTap(_uiMk('button', 's2big', R, 'JOUER'), function () {
    _uiNewRun();
    if (typeof startRun === 'function') startRun();
  });
  var row = _uiMk('div', 's2row', R);
  _uiTap(_uiMk('button', 's2pill', row, 'RÉGLAGES'), function () { _uiShow('settings'); });
  _uiTap(_uiMk('button', 's2pill', row, 'DÉBLOCAGES'), function () { _uiShow('unlocks'); });

  var F = _uiMk('div', 's2mF', sc);
  /* Le cran et SON record vivent hors du bloc de statistiques : ils restent
     visibles sur un profil vierge, où MEILLEUR / CRÉDITS / PARTIES ne diraient
     que des zéros. */
  var cr = _uiMk('div', 's2crank', F);
  var k0 = _uiMk('div', 's2kv', cr);
  _uiE.mCranS = _uiMk('s', '', k0, 'CRAN');
  _uiE.mCran = _uiMk('b', '', k0, '0');
  var st = _uiMk('div', 's2stat2', F);
  _uiE.mStat = st;
  var k1 = _uiMk('div', 's2kv', st);
  _uiMk('s', '', k1, 'MEILLEUR');
  _uiE.mBest = _uiMk('b', '', k1, '0');
  var k2 = _uiMk('div', 's2kv cy', st);
  _uiMk('s', '', k2, 'CRÉDITS');
  _uiE.mCoins = _uiMk('b', '', k2, '0');
  var k3 = _uiMk('div', 's2kv cy', st);
  _uiMk('s', '', k3, 'PARTIES');
  _uiE.mRuns = _uiMk('b', '', k3, '0');
  _uiE.mFirst = _uiMk('div', 's2first', F, 'Première partie : les cartes tombent à 12 s');
  _uiE.keysMenu = _uiMk('div', 's2keys', F, '');
}

/* ------ cartes -- */
function _uiBuildCards(root) {
  var sc = _uiMk('div', 's2scr s2cards', root);
  _uiE.scrCards = sc;
  _uiMk('div', 's2ttl', sc, 'AMÉLIORATION');
  _uiMk('div', 's2sub', sc, 'CHOISIS UNE CARTE').style.textAlign = 'center';
  var row = _uiMk('div', 's2cardrow', sc);
  _uiE.cardRow = row;
  for (var i = 0; i < 4; i++) {
    var c = _uiMk('button', 's2card', row);
    c.style.display = 'none';
    _uiMk('u', '', c);
    var o = {};
    o.el = c;
    o.lv = _uiMk('div', 'lv', c, '');
    o.ic = _uiMk('div', 'ic', c, '');
    o.nm = _uiMk('div', 'nm', c, '');
    o.ds = _uiMk('div', 'ds', c, '');
    o.rr = _uiMk('div', 'rr', c, '');
    o.id = null;
    _uiCardEls.push(o);
    (function (slot) {
      _uiTap(slot.el, function () { _uiPickCard(slot); });
    })(o);
  }
}

function _uiPickCard(slot) {
  if (_uiCardLock || !slot.id) return;
  _uiCardLock = true;
  var cb = _uiCardCb;
  _uiCardCb = null;
  if (typeof haptic === 'function') haptic(14);
  _uiShow(null);
  if (cb) cb(slot.id);
}

/* ------ pause -- */
function _uiBuildPause(root) {
  var sc = _uiMk('div', 's2scr', root);
  sc.style.alignItems = 'center';
  sc.style.justifyContent = 'center';
  sc.style.gap = 'clamp(10px,3vh,26px)';
  _uiE.scrPause = sc;
  _uiE.pauseTtl = _uiMk('div', 's2ttl', sc, 'PAUSE');
  /* Pause subie (fenêtre inactive, onglet caché) : un bandeau distinct prend
     la place du titre ; il n'est dans le document que pendant cette pause. */
  _uiE.pauseBlur = document.createElement('div');
  _uiE.pauseBlur.className = 's2ttl s2pause-blur';
  _uiE.pauseBlur.textContent = 'PAUSE — FENÊTRE INACTIVE';
  var row = _uiMk('div', 's2row', sc);
  _uiTap(_uiMk('button', 's2big', row, 'REPRENDRE'), function () {
    if (typeof togglePause === 'function') togglePause(); else _uiShow(null);
  });
  var row2 = _uiMk('div', 's2row', sc);
  _uiTap(_uiMk('button', 's2pill', row2, 'RÉGLAGES'), function () { _uiShow('settings'); });
  _uiTap(_uiMk('button', 's2pill dim', row2, 'ABANDONNER'), function () { _uiQuit(); });
  _uiE.keysPause = _uiMk('div', 's2keys', sc, '');
}

function _uiSetPauseBlur(on) {
  var sc = _uiE.scrPause, b = _uiE.pauseBlur, t = _uiE.pauseTtl;
  if (!sc || !b || !t) return;
  if (on) {
    if (t.parentNode === sc) sc.replaceChild(b, t);
    else if (b.parentNode !== sc) sc.insertBefore(b, sc.firstChild);
  } else {
    if (b.parentNode === sc) sc.replaceChild(t, b);
    else if (t.parentNode !== sc) sc.insertBefore(t, sc.firstChild);
  }
}

/* ------ fin de partie -- */
function _uiTile(parent, label, hi) {
  var t = _uiMk('div', 's2tile' + (hi ? ' hi' : ''), parent);
  _uiMk('s', '', t, label);
  return _uiMk('b', '', t, '0');
}
function _uiBuildOver(root) {
  var sc = _uiMk('div', 's2scr', root);
  sc.style.alignItems = 'center';
  sc.style.justifyContent = 'center';
  sc.style.gap = 'clamp(9px,2.6vh,20px)';
  _uiE.scrOver = sc;
  var head = _uiMk('div', 's2row', sc);
  _uiMk('div', 's2ttl', head, 'SIGNAL PERDU');
  _uiE.rec = _uiMk('div', 's2rec', head, 'NOUVEAU RECORD');
  /* L'écran de fin déborde en paysage téléphone dès qu'il explique quelque
     chose : il défile, et « safe center » garde le haut atteignable (un
     centrage simple coupe le titre au lieu de le laisser défiler). */
  sc.style.overflowY = 'auto';
  sc.style.justifyContent = 'safe center';
  _uiE.oKill = _uiMk('div', 's2kill', sc, '');
  var g = _uiMk('div', 's2grid', sc);
  _uiE.oScore = _uiTile(g, 'SCORE', true);
  _uiE.oTime = _uiTile(g, 'DURÉE');
  _uiE.oLvl = _uiTile(g, 'NIVEAU');
  _uiE.oProg = _uiTile(g, 'PROGRESSION');
  _uiE.oKills = _uiTile(g, 'DÉTRUITS');
  _uiE.oCombo = _uiTile(g, 'COMBO MAX');
  _uiE.oWpn = _uiTile(g, 'ARME');
  _uiE.oWpn.parentNode.classList.add('wide');
  _uiE.oBest = _uiTile(g, 'RECORD');
  _uiE.oCoins = _uiTile(g, 'CRÉDITS', true);
  _uiE.oBuild = _uiMk('div', 's2build', sc, '');
  _uiE.oCards = _uiMk('div', 's2bcards', sc);
  _uiE.oDelta = _uiMk('div', 's2delta', sc, '');
  _uiE.oTip = _uiMk('div', 's2tip', sc, '');
  /* La barre du prochain déblocage est un BOUTON : elle mène là où l'on dépense
     ce qu'on vient de gagner. */
  var nx = _uiMk('button', 's2next', sc);
  _uiE.oNextS = _uiMk('s', '', nx, '');
  _uiE.oNextU = _uiMk('u', '', nx);
  _uiE.oNext = nx;
  _uiTap(nx, function () { _uiShow('unlocks'); });
  var row = _uiMk('div', 's2row', sc);
  _uiE.btnReplay = _uiTap(_uiMk('button', 's2big mag', row, 'REJOUER'), function () {
    _uiNewRun();
    if (typeof startRun === 'function') startRun();
  });
  _uiE.btnUp = _uiTap(_uiMk('button', 's2pill', row, 'REJOUER AU CRAN SUPÉRIEUR'), function () {
    var i = diffIdx();
    if (i < DIFFS.length - 1) { S.opt.diff = DIFFS[i + 1].m; if (typeof saveStats === 'function') saveStats(); }
    _uiNewRun();
    if (typeof startRun === 'function') startRun();
  });
  _uiE.btnUp.hidden = true;
  _uiTap(_uiMk('button', 's2pill dim', row, 'MENU'), function () { _uiQuit(); });
}

/* ------ réglages -- */
function _uiOptRow(parent, label, desc) {
  var r = _uiMk('div', 's2opt', parent);
  r.tabIndex = 0;
  var t = _uiMk('div', 's2optx', r);
  _uiMk('s', '', t, label);
  _uiMk('em', 's2optd', t, desc || label);
  return r;
}
function _uiTog(parent, label, key, after, desc) {
  var r = _uiOptRow(parent, label, desc);
  var sw = _uiMk('div', 's2sw', r);
  function refresh() { sw.classList.toggle('on', !!S.opt[key]); }
  _uiTap(sw, function () {
    S.opt[key] = !S.opt[key];
    refresh(); _uiApplyOpt();
    if (after) after(S.opt[key]);
  });
  r._kadj = function () { sw._kf(); };
  _uiWidgets.push(refresh);
  refresh();
  return r;
}
function _uiStepper(parent, label, key, vals, fmt, desc) {
  var r = _uiOptRow(parent, label, desc);
  var st = _uiMk('div', 's2stp', r);
  var minus = _uiMk('button', '', st, '−');
  var val = _uiMk('span', '', st, '');
  var plus = _uiMk('button', '', st, '+');
  function idx() {
    var v = S.opt[key], b = 0, bd = 1e9;
    for (var i = 0; i < vals.length; i++) {
      var d = Math.abs(vals[i] - v);
      if (d < bd) { bd = d; b = i; }
    }
    return b;
  }
  function refresh() { _uiTxt(val, fmt(S.opt[key], idx())); }
  function move(d) {
    var i = clamp(idx() + d, 0, vals.length - 1);
    S.opt[key] = vals[i];
    refresh(); _uiApplyOpt();
  }
  _uiTap(minus, function () { move(-1); });
  _uiTap(plus, function () { move(1); });
  r._kadj = function (d) { (d < 0 ? minus : plus)._kf(); };
  _uiWidgets.push(refresh);
  refresh();
  return r;
}
function _uiSeg2(parent, label, key, opts, desc) {
  var r = _uiOptRow(parent, label, desc);
  var g = _uiMk('div', 's2seg2', r);
  var btns = [];
  function refresh() {
    for (var i = 0; i < btns.length; i++) btns[i].classList.toggle('on', S.opt[key] === opts[i].v);
  }
  for (var i = 0; i < opts.length; i++) {
    var b = _uiMk('button', '', g, opts[i].t);
    btns.push(b);
    (function (v) { _uiTap(b, function () { S.opt[key] = v; refresh(); _uiApplyOpt(); }); })(opts[i].v);
  }
  r._kadj = function (d) {
    var i = 0; for (var j = 0; j < opts.length; j++) if (S.opt[key] === opts[j].v) i = j;
    btns[clamp(i + d, 0, btns.length - 1)]._kf();
  };
  _uiWidgets.push(refresh);
  refresh();
  return r;
}
function _uiPct(v) { return Math.round(v * 100) + ' %'; }

function _uiSetTab(k) {
  var B = _uiE.setBoxes || [], T = _uiE.setTabs || [];
  for (var i = 0; i < B.length; i++) {
    B[i].hidden = (i !== k);
    T[i].classList.toggle('on', i === k);
  }
  _uiE.setTab = k;
}

/* G10 : trois onglets (JEU / CONTRÔLES / CONFORT). Un seul est monté à la
   fois : sur iPhone paysage la liste unique dépassait de deux hauteurs
   d'écran, et rien ne disait à quoi servait un réglage — chaque ligne porte
   maintenant une description. */
function _uiBuildSettings(root) {
  var sc = _uiMk('div', 's2scr s2set', root);
  sc.style.gap = '6px';
  _uiE.scrSet = sc;
  _uiMk('div', 's2ttl', sc, 'RÉGLAGES');

  var tabs = _uiMk('div', 's2tabs', sc);
  var noms = ['JEU', 'CONTRÔLES', 'CONFORT'];
  var boxes = [], btns = [];
  for (var i = 0; i < noms.length; i++) {
    var tb = _uiMk('button', '', tabs, noms[i]);
    btns.push(tb);
    (function (k) { _uiTap(tb, function () { _uiSetTab(k); }); })(i);
  }
  for (var j = 0; j < noms.length; j++) {
    var bx = _uiMk('div', 's2scroll', sc);
    _uiScrollable(bx);
    boxes.push(bx);
  }
  _uiE.setTabs = btns; _uiE.setBoxes = boxes;

  /* ---- onglet JEU ---- */
  var box = boxes[0];
  _uiMk('div', 's2grp', box, 'PARTIE');
  /* Les valeurs du sélecteur DOIVENT venir de la table du moteur. En les
     écrivant à la main, deux crans du sélecteur (2,7 et 3,5) tombaient sur le
     même palier moteur et les étiquettes annonçaient autre chose que ce qui
     était appliqué. */
  /* Le cran multiplie le score (DIFF_SCORE) : le facteur s'affiche à côté du
     nom, sinon le classement par cran resterait une règle cachée. */
  _uiStepper(box, 'Difficulté', 'diff', DIFFS.map(function (d) { return d.m; }),
    function (v, i) { return DIFFS[i].nom + '  ×' + ('' + DIFF_SCORE[i]).replace('.', ','); },
    'Vitesse et nombre des ennemis, et facteur de score. NORMAL est le cran de référence.');
  /* Netteté contre fluidité : au maximum, une image sur dix est perdue sur
     un téléphone. Le repère par défaut tient les soixante images. */
  _uiStepper(box, 'Qualité d\'image', 'px', [0.6, 0.75, 1, 1.5, 2],
    function (v) { return v >= 2 ? 'MAXIMALE' : v >= 1.25 ? 'ÉQUILIBRÉE' : v >= 1 ? 'ÉCONOMIE' : (Math.round(v * 100) + ' %'); },
    'Finesse du rendu. Sous ÉCONOMIE, le jeu rend moins de pixels et le navigateur les étire : c\'est ce qui rend les soixante images sur une machine lente.');

  _uiMk('div', 's2grp', box, 'SON');
  _uiTog(box, 'Musique', 'music', function (v) {
    if (S2030.audio && S2030.audio.setMusic) S2030.audio.setMusic(v);
  }, 'La bande-son en boucle pendant la partie.');
  _uiTog(box, 'Effets sonores', 'sfx', function (v) {
    if (S2030.audio && S2030.audio.setSfx) S2030.audio.setSfx(v);
  }, 'Tirs, impacts, alertes et sons d\'interface.');

  /* ---- onglet CONTRÔLES ---- */
  box = boxes[1];
  /* Les lignes du manche et des boutons tactiles n'ont pas d'objet sur bureau :
     elles reçoivent hidden (voir _uiSyncDesktop) — LE TITRE AUSSI. Sans lui
     dans la liste, un bureau affichait « MANCHE ET BOUTONS » au-dessus des deux
     seules lignes qui restaient, Sensibilité et Mode souris. */
  var tr = _uiE.touchRows = [];
  tr.push(_uiMk('div', 's2grp', box, 'MANCHE ET BOUTONS'));
  tr.push(_uiSeg2(box, 'Manche', 'joyFloat', [{ v: false, t: 'FIXE' }, { v: true, t: 'FLOTTANT' }],
    'FLOTTANT : le manche naît sous le pouce, où qu\'il se pose.'));
  tr.push(_uiSeg2(box, 'Main directrice', 'leftHanded', [{ v: false, t: 'DROITIER' }, { v: true, t: 'GAUCHER' }],
    'Échange le côté du manche et celui des boutons.'));
  tr.push(_uiStepper(box, 'Taille des contrôles', 'joySize', [0.8, 0.9, 1, 1.1, 1.25, 1.4], _uiPct,
    'Diamètre du manche et des trois boutons tactiles.'));
  tr.push(_uiStepper(box, 'Opacité des contrôles', 'joyAlpha', [0.5, 0.75, 1, 1.25, 1.5], _uiPct,
    'Plus discret laisse voir le jeu, plus opaque se vise mieux.'));
  tr.push(_uiStepper(box, 'Hauteur des contrôles', 'ctlY', [-24, -12, 0, 14, 28, 44],
    function (v) { return (v > 0 ? '+' : '') + v + ' px'; },
    'Remonte ou descend le manche et les boutons.'));
  tr.push(_uiStepper(box, 'Écart du bord', 'ctlX', [-14, -7, 0, 10, 22, 36],
    function (v) { return (v > 0 ? '+' : '') + v + ' px'; },
    'Éloigne les contrôles du bord de l\'écran.'));
  /* Sur bureau, ces deux lignes SONT tout l'onglet : elles méritent leur titre. */
  _uiE.kbGrp = _uiMk('div', 's2grp', box, 'CLAVIER & SOURIS');
  _uiStepper(box, 'Sensibilité', 'sens', [0.7, 0.85, 1, 1.2, 1.4, 1.6], _uiPct,
    'Réactivité de la direction au manche comme à la souris.');
  _uiE.mouseRow = _uiSeg2(box, 'Mode souris', 'mouse',
    [{ v: 'auto', t: 'AUTO' }, { v: 'always', t: 'TOUJOURS' }, { v: 'never', t: 'JAMAIS' }],
    'AUTO : la souris pilote dès qu\'elle bouge, le clavier reprend la main.');

  /* ---- onglet CONFORT ---- */
  box = boxes[2];
  _uiMk('div', 's2grp', box, 'CONFORT');
  /* Maître : coupe secousses, flashs, bloom et l'emphase des bannières d'un
     seul geste ; pré-coché quand le système annonce prefers-reduced-motion. */
  _uiTog(box, 'Réduire les mouvements', 'reduceMotion', function (v) {
    S.opt.reduceShake = v; S.opt.reduceFlash = v; S.opt.reduceBloom = v;
    _uiApplyOpt();
  }, 'Coupe secousses, flashs, halos et l\'emphase des bannières.');
  _uiTog(box, 'Réduire les flashs', 'reduceFlash', null,
    'Atténue les éclats plein écran et les bannières animées.');
  _uiTog(box, 'Réduire les secousses', 'reduceShake', null,
    'Calme les tremblements de caméra aux impacts.');
  _uiTog(box, 'Réduire le bloom', 'reduceBloom', null,
    'Diminue les halos lumineux, plus lisible sur petit écran.');
  _uiTog(box, 'Contraste renforcé', 'contrast', null,
    'Fonds plus opaques et traits plus francs dans les menus.');
  _uiE.vibRow = _uiTog(box, 'Vibrations', 'haptics', null,
    'Retour haptique aux impacts, si l\'appareil le permet.');
  _uiStepper(box, 'Taille de l\'interface', 'uiScale', [0.85, 0.95, 1, 1.15, 1.3, 1.5], _uiPct,
    'Agrandit tous les textes et boutons de l\'interface.');
  _uiStepper(box, 'Densité des particules', 'particles', [0.4, 0.7, 1], _uiPct,
    'Moins de particules : moins joli, plus fluide.');

  var row = _uiMk('div', 's2row', sc);
  _uiTap(_uiMk('button', 's2pill', row, 'RETOUR'), function () { _uiShow(_uiPrevScr); });
  _uiSetTab(0);
  _uiSyncDesktop();
}

/* Bureau : les réglages du manche et des boutons tactiles n'ont pas d'objet ;
   Vibrations non plus sans navigator.vibrate (Safari iOS) ni sur bureau, où
   l'API existe mais ne vibre rien. Resynchronisé à chaque ouverture des
   réglages : S.desktop peut tomber au premier toucher. */
function _uiSyncDesktop() {
  var d = !!S.desktop, rows = _uiE.touchRows || [];
  for (var i = 0; i < rows.length; i++) rows[i].hidden = d;
  if (_uiE.mouseRow) _uiE.mouseRow.hidden = !d;
  if (_uiE.kbGrp) _uiE.kbGrp.hidden = !d;
  if (_uiE.vibRow) _uiE.vibRow.hidden = d || !navigator.vibrate;
  _uiKeysTxt();
}

/* ------ déblocages -- */
function _uiBuildUnlocks(root) {
  var sc = _uiMk('div', 's2scr', root);
  sc.style.gap = '8px';
  _uiE.scrUnl = sc;
  var head = _uiMk('div', 's2row', sc);
  _uiMk('div', 's2ttl', head, 'DÉBLOCAGES');
  var kv = _uiMk('div', 's2kv', head);
  _uiMk('s', '', kv, 'CRÉDITS');
  _uiE.uCoins = _uiMk('b', '', kv, '0');
  var box = _uiMk('div', 's2scroll', sc);
  _uiScrollable(box);
  var g = _uiMk('div', 's2ug', box);
  _uiE.unlockEls = [];
  for (var i = 0; i < _UI_UNLOCKS.length; i++) {
    var d = _UI_UNLOCKS[i];
    var el = _uiMk('div', 's2u', g);
    _uiMk('i', '', el, d.icon);
    var mid = _uiMk('div', '', el);
    _uiMk('b', '', mid, d.name);
    _uiMk('s', '', mid, d.desc);
    var btn = _uiMk('button', '', el, d.cost + ' ◆');
    _uiE.unlockEls.push({ el: el, btn: btn, def: d });
    (function (def, o) {
      _uiTap(btn, function () { _uiBuy(def, o); });
    })(d, _uiE.unlockEls[i]);
  }
  var row = _uiMk('div', 's2row', sc);
  _uiTap(_uiMk('button', 's2pill', row, 'RETOUR'), function () { _uiShow(_uiPrevScr); });
}

function _uiOwned() {
  if (!S.stats.unlocks) S.stats.unlocks = {};
  return S.stats.unlocks;
}
function _uiBuy(def, o) {
  var own = _uiOwned();
  if (own[def.id]) return;
  if ((S.stats.coins || 0) < def.cost) { _uiToast('CRÉDITS INSUFFISANTS', def.cost + ' requis'); return; }
  S.stats.coins -= def.cost;
  own[def.id] = 1;
  if (typeof saveStats === 'function') saveStats();
  _uiRefreshUnlocks();
  _uiToast('DÉBLOQUÉ', def.name);
}
function _uiRefreshUnlocks() {
  var own = _uiOwned(), c = S.stats.coins || 0;
  _uiTxt(_uiE.uCoins, _uiNum(c));
  for (var i = 0; i < _uiE.unlockEls.length; i++) {
    var o = _uiE.unlockEls[i], got = !!own[o.def.id];
    o.el.classList.toggle('got', got);
    o.el.classList.toggle('no', !got && c < o.def.cost);
    _uiTxt(o.btn, got ? 'ACQUIS' : (o.def.cost + ' ◆'));
  }
}

/* ======
   OPTIONS
   ====== */
function _uiDefaults() {
  var o = S.opt;
  if (o.ctlX === undefined) o.ctlX = 0;
  if (o.ctlY === undefined) o.ctlY = 0;
  if (o.reduceBloom === undefined) o.reduceBloom = false;
  if (o.uiScale === undefined) o.uiScale = 1;
  /* pré-coché quand le système le demande — et il entraîne alors les trois
     réglages qu'il commande */
  if (o.reduceMotion === undefined) {
    o.reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (o.reduceMotion) { o.reduceShake = true; o.reduceFlash = true; o.reduceBloom = true; }
  }
  if (o.joyAlpha === undefined) o.joyAlpha = 1;
  if (o.joySize === undefined) o.joySize = 1;
  if (o.sens === undefined) o.sens = 1;
  if (o.mouse === undefined) o.mouse = 'auto';
  if (o.particles === undefined) o.particles = 1;
  // les parties sauvegardées avant l'ajout du réglage repartent au cran de
  // référence, pas au plus facile
  if (o.diff === undefined) o.diff = DIFFS[1].m;
  if (o.px === undefined) o.px = 1.5;
}

/* G10 : --uis suit la HAUTEUR de la fenêtre, pas seulement le réglage. Sur un
   écran de 1440 px l'interface doublait de taille ; à 720 px elle est
   inchangée (facteur 1 exactement, donc .s2score reste à 30 px). La borne
   haute passe de 1,6 à 3,3 pour couvrir 2,2 × 1,5. */
function _uiScaleVars() {
  if (!_uiRoot) return;
  var o = S.opt, h = window.innerHeight || 720;
  var k = clamp(h / 720, 1, 2.2) * clamp(o.uiScale || 1, 0.85, 1.5);
  _uiRoot.style.setProperty('--uis', '' + clamp(k, 0.7, 3.3));
  _uiRoot.style.setProperty('--fmin', S.desktop ? '12px' : '11px');
}

function _uiApplyOpt() {
  if (!_uiBuilt) return;
  _uiDefaults();
  var o = S.opt, r = _uiRoot;
  _uiScaleVars();
  r.style.setProperty('--bl', o.reduceBloom ? '.3' : '1');
  r.style.setProperty('--glow', o.reduceBloom ? '.3' : '1');
  r.style.setProperty('--ca', '' + clamp(o.joyAlpha, 0.2, 1.6));
  r.classList.toggle('hc', !!o.contrast);
  r.classList.toggle('nf', !!o.reduceFlash);
  _uiLayout();
  for (var i = 0; i < _uiWidgets.length; i++) _uiWidgets[i]();
  if (typeof saveStats === 'function') saveStats();
}

/* ======
   ÉCRANS
   ====== */
function _uiScrEl(name) {
  if (name === 'menu') return _uiE.scrMenu;
  if (name === 'over') return _uiE.scrOver;
  if (name === 'pause') return _uiE.scrPause;
  if (name === 'cards') return _uiE.scrCards;
  if (name === 'settings') return _uiE.scrSet;
  if (name === 'unlocks') return _uiE.scrUnl;
  return null;
}

function _uiShow(name) {
  if (!_uiBuilt) return;
  if (name === _uiScreen) return;
  if (_uiScreen && _uiScreen !== 'settings' && _uiScreen !== 'unlocks') _uiPrevScr = _uiScreen;
  var prev = _uiScrEl(_uiScreen);
  if (prev) { prev.classList.remove('on'); _uiInert(prev, true); }
  _uiKFocus(null);
  var a = document.activeElement;
  if (a && prev && prev.contains(a)) a.blur();
  _uiScreen = name || null;
  var el = _uiScrEl(_uiScreen);
  if (el) { el.classList.add('on'); _uiInert(el, false); }

  if (_uiScreen === 'menu') { _uiRefreshMenu(); _uiRunMs = 0; }
  if (_uiScreen === 'unlocks') _uiRefreshUnlocks();
  if (_uiScreen === 'settings') _uiSyncDesktop();
  if (_uiScreen === 'over') {
    _uiFillOver();
    _uiOverLock = true;                     // 600 ms sans REJOUER au clavier
    setTimeout(function () { _uiOverLock = false; }, 600);
  }
  if (_uiScreen === 'menu' || _uiScreen === 'pause') _uiKeysTxt();
  /* Curseur sur le premier élément — SAUF à l'écran de fin, dont le premier
     élément est désormais la barre du prochain déblocage : Entrée doit
     continuer de relancer la partie, pas d'ouvrir la boutique. */
  if (el && _uiScreen === 'over' && _uiE.btnReplay) _uiKFocus(_uiE.btnReplay);
  else if (el) _uiKMove(1);
  if (_uiScreen === null && (prev === _uiE.scrMenu || prev === _uiE.scrOver)) _uiNewRun();
}

function _uiBestByDiff() {
  var st = S.stats, bd = st.bestByDiff;
  if (!bd || bd.length !== 5) bd = st.bestByDiff = [(bd && bd[0]) | 0, 0, 0, 0, 0];
  return bd;
}
function _uiRefreshMenu() {
  var st = S.stats, di = diffIdx(), bd = _uiBestByDiff();
  var vierge = (st.runs | 0) === 0;
  _uiTxt(_uiE.mCranS, 'CRAN ' + DIFFS[di].nom);
  _uiTxt(_uiE.mCran, _uiNum(bd[di] | 0));
  _uiTxt(_uiE.mBest, _uiNum(st.best || 0));
  _uiTxt(_uiE.mCoins, _uiNum(st.coins || 0));
  _uiTxt(_uiE.mRuns, _uiNum(st.runs || 0));
  /* Un profil vierge n'a rien à classer : trois zéros n'apprennent rien, la
     phrase qui les remplace apprend quand tombe la première carte. */
  _uiE.mStat.style.display = vierge ? 'none' : '';
  _uiE.mFirst.style.display = vierge ? '' : 'none';
}

function _uiBestWeapon() {
  var defs = S2030.weapons && S2030.weapons.defs;
  var best = null, lv = 0;
  if (defs) {
    for (var k in defs) {
      var n = S.up[k] | 0;
      if (n > lv) { lv = n; best = defs[k]; }
    }
  }
  if (!best) return '—';
  return (best.name || '?') + ' ' + lv;
}

/* Libellé de build : axe dominant des cartes prises, puis l'arme la plus haute.
   Les huit cartes d'ARME portent l'id de l'arme, leur compte EST le niveau. */
function _uiBuildLabel() {
  var wid = null, wlv = 0, defs = S2030.weapons && S2030.weapons.defs, k;
  if (defs) for (k in defs) { var n = S.up[k] | 0; if (n > wlv) { wlv = n; wid = k; } }
  var pool = S2030.upgrades && S2030.upgrades.pool, ax = {}, bax = null, bn = 0;
  if (pool) for (var i = 0; i < pool.length; i++) {
    var c = pool[i], q = S.up[c.id] | 0;
    if (q > 0 && c.axis) ax[c.axis] = (ax[c.axis] || 0) + q;
  }
  for (k in ax) if (ax[k] > bn) { bn = ax[k]; bax = k; }
  return (_UI_AXES[bax] || 'PILOTE') + ' — ' + (_UI_WSHORT[wid] || 'CANON') + ' ' + (wlv || 1);
}
/* Les cartes du build, en icônes, avec leur niveau. */
function _uiFillBuildCards() {
  var box = _uiE.oCards, pool = S2030.upgrades && S2030.upgrades.pool;
  while (box.firstChild) box.removeChild(box.firstChild);
  if (!pool) return;
  for (var i = 0; i < pool.length; i++) {
    var c = pool[i], n = S.up[c.id] | 0;
    if (n <= 0) continue;
    var sp = _uiMk('span', '', box, (c.icon || '◆') + ' ');
    sp.title = c.name || c.id;
    _uiMk('u', '', sp, '' + n);
  }
}
/* Article le moins cher encore à acquérir. */
function _uiNextUnlock() {
  var own = _uiOwned(), best = null;
  for (var i = 0; i < _UI_UNLOCKS.length; i++) {
    var d = _UI_UNLOCKS[i];
    if (own[d.id]) continue;
    if (!best || d.cost < best.cost) best = d;
  }
  return best;
}
/* Une seule phrase-conseil, la première règle qui s'applique : deux conseils
   à la fois n'en font lire aucun. */
function _uiOverTip() {
  var r = S.run || {};
  if ((r.ultReadyAt | 0) > 0 && !r.usedUlt)
    return 'Ton ultime ★ / R était prêt à ' + _uiTime(r.ultReadyAt) + ' et n\'a pas servi';
  if (!r.usedSpecial) return 'E / ◈ : traverse les ennemis 2 s';
  if (!r.boosted) return 'Espace / » : fuis';
  if ((r.cardsTaken | 0) === 0) return 'Les cartes tombent à 12 s : survis jusque-là';
  return '';
}

/* Clôture de la partie : une seule fois, quoi qu'il arrive ensuite. L'écran de
   fin mène maintenant aux DÉBLOCAGES et RETOUR y ramène — sans ce verrou, le
   simple aller-retour ajoutait une partie au compteur et recréditait les
   crédits de la partie. Rend l'état d'AVANT l'enregistrement, dont la peinture
   a besoin (record du cran, partie précédente, nombre de parties). */
var _uiOverSnap = null;
function _uiCloseRun() {
  var st = S.stats, di = diffIdx(), bd = _uiBestByDiff();
  var ms = Math.round(_uiRunMs);
  var q = { di: di, ms: ms, recAvant: bd[di] | 0, runsAvant: st.runs | 0,
            prevScore: st.lastScore | 0, prevMs: st.lastTime | 0 };
  q.rec = q.runsAvant > 0 && S.score > q.recAvant;
  if (S.score > (st.best || 0)) st.best = S.score;
  if (S.score > q.recAvant) bd[di] = S.score;
  if (S.level > (st.bestLevel | 0)) st.bestLevel = S.level;
  if (ms > (st.bestTime | 0)) st.bestTime = ms;
  st.bossKills = (st.bossKills | 0) + (S.bossKills | 0);
  st.coins = (st.coins || 0) + (S.coins || 0);
  st.runs = q.runsAvant + 1;
  st.lastScore = S.score; st.lastTime = ms;
  if (typeof saveStats === 'function') saveStats();
  return q;
}

function _uiFillOver() {
  var st = S.stats, r = S.run || {};
  if (!_uiOverSnap) _uiOverSnap = _uiCloseRun();
  var q = _uiOverSnap, di = q.di, bd = _uiBestByDiff(), ms = q.ms;
  var recAvant = q.recAvant, runsAvant = q.runsAvant;
  var prevScore = q.prevScore, prevMs = q.prevMs, rec = q.rec;

  var lh = S.lastHit;
  var prog = Math.round(((lh ? lh.progress : S.levelProgress) || 0) * 100);
  _uiTxt(_uiE.oKill, 'Détruit par ' + (lh ? lh.name : 'LA ZONE')
    + ' — niveau ' + (lh ? lh.level : S.level)
    + ' — ' + prog + ' % du secteur — ' + _uiTime(ms));

  _uiTxt(_uiE.oScore, _uiNum(S.score));
  _uiTxt(_uiE.oTime, _uiTime(ms));
  _uiTxt(_uiE.oLvl, '' + S.level);
  _uiTxt(_uiE.oProg, prog + ' %');
  _uiTxt(_uiE.oKills, _uiNum(S.kills));
  _uiTxt(_uiE.oCombo, '' + (r.comboMax | 0));
  _uiTxt(_uiE.oWpn, _uiBestWeapon());
  _uiTxt(_uiE.oBest, _uiNum(bd[di] | 0));
  _uiTxt(_uiE.oCoins, '+' + _uiNum(S.coins || 0));
  _uiTxt(_uiE.oBuild, _uiBuildLabel());
  _uiFillBuildCards();

  var dl = '';
  if (runsAvant > 0) {
    var ds = S.score - prevScore, dt = ms - prevMs;
    dl = 'Partie précédente : ' + (ds >= 0 ? '+' : '−') + _uiNum(Math.abs(ds)) + ' pts, '
       + (dt >= 0 ? '+' : '−') + _uiTime(Math.abs(dt))
       + '  ·  Record ' + DIFFS[di].nom + ' : ' + (S.score - recAvant >= 0 ? '+' : '−')
       + _uiNum(Math.abs(S.score - recAvant)) + ' pts';
  }
  _uiTxt(_uiE.oDelta, dl);
  _uiTxt(_uiE.oTip, _uiOverTip());

  var nx = _uiNextUnlock();
  if (nx) {
    var coins = st.coins || 0;
    var manque = Math.max(0, nx.cost - coins);
    var f = Math.min(1, coins / nx.cost);
    _uiTxt(_uiE.oNextS, 'PROCHAIN DÉBLOCAGE : ' + nx.name + ' dans ' + manque + ' ◆');
    _uiE.oNextU.style.width = (f * 100).toFixed(3) + '%';
    _uiE.oNext.hidden = false;
  } else {
    _uiE.oNext.hidden = true;
  }

  /* Monter d'un cran n'a de sens qu'après avoir tenu trois secteurs, et
     seulement s'il reste un cran au-dessus. */
  _uiE.btnUp.hidden = !(S.level >= 3 && di < DIFFS.length - 1);
  _uiE.rec.classList.toggle('on', rec);
}

function _uiQuit() {
  S.paused = false;
  if (S2030.audio && S2030.audio.stop) S2030.audio.stop();
  if (typeof resetRun === 'function') resetRun();
  S.phase = 'menu';
  if (typeof releaseWake === 'function') releaseWake();
  _uiShow('menu');
}

function _uiNewRun() {
  _uiOverSnap = null;
  _uiRunMs = 0;
  _uiRunLast = S.t;
  _uiRunOn = false;
}

/* ======
   CLAVIER — curseur .kf et raccourcis d'écran (S2030.ui.key, appelé par le coeur)
   ====== */
function _uiInert(sc, on) {
  if (_UI_INERT) { sc.inert = on; return; }
  var q = sc.querySelectorAll('button,.s2opt');   // repli : tabindex -1
  for (var i = 0; i < q.length; i++) q[i].tabIndex = on ? -1 : 0;
}
function _uiKeysTxt() {
  var s = S.desktop ? _UI_KEYS_D : (S.opt.leftHanded ? 'Pouce droit' : 'Pouce gauche') + ' : diriger · » boost · ◈ pouvoir · ★ APOGÉE';
  if (_uiE.keysMenu) { _uiTxt(_uiE.keysMenu, s); _uiTxt(_uiE.keysPause, s); }
}
/* éléments navigables de l'écran affiché : boutons hors ligne de réglage, lignes .s2opt visibles */
function _uiKItems() {
  var sc = _uiScrEl(_uiScreen), out = [];
  if (!sc) return out;
  var q = sc.querySelectorAll('button,.s2opt');
  for (var i = 0; i < q.length; i++) {
    var el = q[i];
    if (el.offsetParent === null) continue;
    if (el.tagName === 'BUTTON' && el.closest('.s2opt')) continue;
    out.push(el);
  }
  return out;
}
function _uiKMark(el) {
  if (_uiKF === el) return;
  if (_uiKF) _uiKF.classList.remove('kf');
  _uiKF = el;
  if (el) el.classList.add('kf');
}
function _uiKFocus(el) {
  _uiKMark(el);
  if (!el) return;
  try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
  if (el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
}
function _uiKMove(d) {
  var it = _uiKItems(), n = it.length;
  if (!n) { _uiKMark(null); return; }
  var i = it.indexOf(_uiKF);
  i = i < 0 ? (d > 0 ? 0 : n - 1) : (i + d + n) % n;
  _uiKFocus(it[i]);
}
function _uiKey(e) {
  var sc = _uiScreen;
  if (!_uiBuilt) return false;
  var k = (e.key || '').toLowerCase(), c = e.code || '', kf = _uiKF, t = e.target;
  if (!k && c) k = c.length === 4 && c.indexOf('Key') === 0 ? c.charAt(3).toLowerCase() : c.toLowerCase();
  if (k === 'space') k = ' ';
  if (!sc) {
    // en jeu, Tab ne quitte pas le document (sinon blur → pause subie) : il va au bouton pause
    if (k === 'tab' && S.phase === 'play' && !S.paused) { e.preventDefault(); _uiE.pauseBtn.focus(); return true; }
    // un bouton du HUD focalisé (le bouton pause) prend Entrée/Espace : le jeu ne les reçoit pas en double
    if ((k === 'enter' || k === ' ') && t && t._kf) return true;
    return false;
  }
  _uiRoot.classList.add('kb');
  var lr = k === 'arrowleft' ? -1 : k === 'arrowright' ? 1 : 0;
  var nav = k === 'tab' ? (e.shiftKey ? -1 : 1) : k === 'arrowup' ? -1 : k === 'arrowdown' ? 1 : lr;
  if (sc === 'cards' && e.repeat) return true;    // touche gardée enfoncée au passage en cartes
  if (lr && kf && kf._kadj) { kf._kadj(lr); e.preventDefault(); return true; }
  if (nav) { _uiKMove(nav); e.preventDefault(); return true; }
  if (e.repeat) return true;
  if (k === 'enter' || k === ' ') {
    if (sc === 'over' && _uiOverLock) return true;
    if (t && (t._kf || t._kadj)) { if (t._kadj) { t._kadj(1); e.preventDefault(); } return true; }  // l'élément focalisé s'en charge
    if (kf) { if (kf._kadj) kf._kadj(1); else if (kf._kf) kf._kf(); }
    e.preventDefault();
    return true;
  }
  if (k === 'escape') {
    if (sc === 'pause') { if (typeof togglePause === 'function') togglePause(); }
    else if (sc === 'over') _uiQuit();
    else if (sc === 'settings' || sc === 'unlocks') _uiShow(_uiPrevScr);
    return true;                                   // menu, cartes : sans effet
  }
  if (sc === 'menu') {
    if (k === 's') { _uiShow('settings'); return true; }
    if (k === 'd') { _uiShow('unlocks'); return true; }
  }
  if (sc === 'cards') {
    var m = /^(Digit|Numpad)([1-4])$/.exec(c), n = m ? +m[2] : (k >= '1' && k <= '4' && k.length === 1 ? +k : 0);
    if (n && _uiCardEls[n - 1].id) { _uiPickCard(_uiCardEls[n - 1]); return true; }
    return k === 'p';
  }
  if (sc === 'over') {
    if (k === 'r') { if (!_uiOverLock && _uiE.btnReplay) _uiE.btnReplay._kf(); return true; }
    if (k === 'm') { _uiQuit(); return true; }
  }
  return k === 'p' && sc !== 'pause';              // P inerte hors de l'écran de pause
}

/* ======
   ANNONCES
   ====== */
/* EXCLUSION MUTUELLE (G10), DANS LES DEUX SENS. Un toast demandé pendant une
   bannière attend, une bannière demandée pendant un toast attend. L'attente se
   cale sur la fin RÉELLE de l'annonce — 1 200 ms pour la bannière (l'instant où
   .on tombe), 1 900 ms pour le toast — et non sur les 1,15 s de l'animation
   CSS, qui laisseraient 50 ms de recouvrement. */
function _uiToast(title, sub) {
  if (!_uiBuilt) return;
  if (_uiBanBusy) {
    _uiAnnQ.push({ t: title, s: sub });
    if (_uiAnnQ.length > 3) _uiAnnQ.shift();
    return;
  }
  _uiToastShow(title, sub);
}
function _uiToastShow(title, sub) {
  _uiTxt(_uiE.annT, title == null ? '' : ('' + title));
  _uiTxt(_uiE.annS, sub == null ? '' : ('' + sub));
  _uiE.ann.classList.add('on');
  _uiAnnOn = 1;
  if (_uiToastTo) clearTimeout(_uiToastTo);
  _uiToastTo = setTimeout(function () {
    _uiE.ann.classList.remove('on');
    _uiToastTo = 0;
    _uiAnnOn = 0;
    _uiBanNext();
    _uiAnnNext();
  }, 1900);
}
function _uiAnnNext() {
  if (_uiBanBusy || _uiAnnOn) return;
  var it = _uiAnnQ.shift();
  if (!it) return;
  _uiToastShow(it.t, it.s);
}

/* FILE D'ATTENTE (G9) : deux annonces coup sur coup — le nom du boss puis
   « SECTEUR NETTOYÉ », ou « +60 ◆ » — s'écrasaient l'une l'autre. Elles
   passent maintenant l'une APRÈS l'autre, chacune sa durée. */
function _uiBanner(text, dur) {
  if (!_uiBuilt) return;
  _uiBanQ.push({ s: ('' + text).toUpperCase(), d: (+dur > 0 ? +dur : 1200) });
  if (_uiBanQ.length > 5) _uiBanQ.splice(0, _uiBanQ.length - 5);
  if (!_uiBanBusy) _uiBanNext();
}
/* GARDE-FOU DE MESURE : le plafond CSS par --n repose sur un coefficient
   moyen ; ici on lit la largeur RÉELLE et on réduit par pas de 4 %, au plus
   dix fois, tant que le texte dépasse le cadre. C'est lui qui garantit
   « la bannière tient dans l'écran », pas le coefficient. */
function _uiBanFit() {
  var ban = _uiE.ban, b = _uiE.banT;
  b.style.fontSize = '';
  for (var i = 0; i < 10; i++) {
    var w = ban.clientWidth;
    if (!w || b.scrollWidth <= w) break;
    var fs = parseFloat(getComputedStyle(b).fontSize) || 26;
    b.style.fontSize = (fs * 0.96).toFixed(2) + 'px';
  }
}
function _uiBanNext() {
  if (_uiAnnOn && _uiBanQ.length) { _uiBanBusy = 1; return; }   // un toast est à l'écran : attendre
  var it = _uiBanQ.shift();
  if (!it) { _uiBanBusy = 0; _uiAnnNext(); return; }
  _uiBanBusy = 1;
  var b = _uiE.banT;
  b.textContent = it.s;
  b.setAttribute('data-t', it.s);
  _uiE.ban.style.setProperty('--n', '' + Math.max(1, it.s.length));
  _uiE.ban.classList.remove('on');
  /* on force un reflow pour relancer proprement l'animation */
  void _uiE.ban.offsetWidth;
  _uiE.ban.classList.add('on');
  _uiBanFit();
  if (_uiBanTo) clearTimeout(_uiBanTo);
  _uiBanTo = setTimeout(function () {
    _uiE.ban.classList.remove('on');
    _uiBanTo = 0;
    _uiBanBusy = 0;
    _uiBanNext();
  }, it.d);
}

/* Nom de phase caméra : un tag de 11 px à droite du nom de niveau, une
   seconde. Quatre bannières plein écran en 22 s ne disaient rien de plus. */
function _uiPhaseTag(text) {
  if (!_uiBuilt || !_uiE.phTag) return;
  _uiTxt(_uiE.phTag, ('' + text).toUpperCase());
  _uiE.phTag.classList.add('on');
  if (_uiPhTo) clearTimeout(_uiPhTo);
  _uiPhTo = setTimeout(function () {
    _uiE.phTag.classList.remove('on');
    _uiTxt(_uiE.phTag, '');
    _uiPhTo = 0;
  }, 1000);
}

/* ======
   CARTES
   ====== */
function _uiShowCards(cards, cb) {
  if (!_uiBuilt) { if (cb && cards && cards.length) cb(cards[0].id); return; }
  _uiCardCb = cb || null;
  _uiCardLock = false;
  var n = Math.min(_uiCardEls.length, cards ? cards.length : 0);
  for (var i = 0; i < _uiCardEls.length; i++) {
    var o = _uiCardEls[i];
    if (i >= n) { o.el.style.display = 'none'; o.id = null; continue; }
    var c = cards[i];
    var rar = _UI_RAR[c.rarity] || _UI_RAR.common;
    var col = rar.c;                       /* cadre et libellé : la RARETÉ */
    o.el.style.display = '';
    o.el.style.setProperty('--r', col);
    o.el.style.setProperty('--t', c.tint || col);   /* icône : l'axe */
    o.el.style.setProperty('--rg', _uiAlpha(col, 0.22));
    o.el.style.setProperty('--rb', _uiAlpha(col, 0.7));
    o.el.style.setProperty('--d', (i * 55) + 'ms');
    o.el.classList.toggle('ultra', c.rarity === 'ultra');
    o.id = c.id;
    o.el.setAttribute('data-id', c.id);
    _uiTxt(o.ic, c.icon || '◆');
    _uiTxt(o.nm, c.name || '?');
    _uiTxt(o.ds, c.desc || '');
    _uiTxt(o.rr, rar.n);
    var lv = S.up[c.id] | 0;
    _uiTxt(o.lv, lv > 0 ? ('NIV ' + (lv + 1)) : (c.max > 1 ? 'NOUVEAU' : ''));
    /* relance l'animation d'entrée */
    o.el.style.animation = 'none';
    void o.el.offsetWidth;
    o.el.style.animation = '';
  }
  _uiShow('cards');
}

/* #rrggbb -> rgba(...) ; toute autre notation est renvoyée telle quelle */
function _uiAlpha(col, a) {
  if (typeof col !== 'string' || col.charAt(0) !== '#' || col.length < 7) return col;
  var r = parseInt(col.substr(1, 2), 16), g = parseInt(col.substr(3, 2), 16), b = parseInt(col.substr(5, 2), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
}

/* ======
   RAFRAÎCHISSEMENT PAR IMAGE
   ====== */
function _uiTickRun() {
  var t = S.t;
  if (S.phase === 'play' && !S.paused) {
    if (_uiRunOn) {
      var d = t - _uiRunLast;
      if (d > 0 && d < 250) _uiRunMs += d;
    }
    _uiRunOn = true;
  } else _uiRunOn = false;
  _uiRunLast = t;
}

function _uiSyncCtl() {
  var show = !_uiCanvasCtl && S.phase === 'play' && !S.paused && !_uiScreen;
  show = show && !S.desktop;            // bureau : ni manche ni boutons
  /* Sur bureau la couche est retirée du rendu (display:none par l'attribut
     hidden), pas seulement transparente : rien à composer, rien à toucher.
     Sur mobile on garde le fondu d'opacité. */
  var dk = !!S.desktop;
  if (_uiE.ctl.hidden !== dk) _uiE.ctl.hidden = dk;
  var si = show ? 1 : 0;
  if (si !== _uiCtlShown) {
    _uiCtlShown = si;
    _uiE.ctl.classList.toggle('on', show);
  }
  if (!show) return;

  var inp = S.input, s = S.snake;

  /* manche */
  var ja = inp.jactive ? 1 : 0;
  if (ja !== _uiP.ja) {
    _uiP.ja = ja;
    _uiE.joy.classList.toggle('on', !!ja);
    if (!ja && _uiJoyMoved) { _uiJoyMoved = false; _uiLayout(); }
  }
  var R = _uiRects.joy.r * 0.62;
  var kx = ja ? (inp.jx * inp.jmag * R) : 0;
  var ky = ja ? (inp.jy * inp.jmag * R) : 0;
  var qx = kx | 0, qy = ky | 0;
  if (qx !== _uiP.jx || qy !== _uiP.jy) {
    _uiP.jx = qx; _uiP.jy = qy;
    _uiE.knob.style.transform = 'translate(' + qx + 'px,' + qy + 'px)';
  }

  /* boutons : jauge circulaire + état enfoncé + halo « prêt » */
  var fb = s ? s.boostE / (s.boostMax || 100) : 1;
  var cdMax = S.specialCdMax || 7000;
  var fs = S.specialCd > 0 ? 1 - S.specialCd / cdMax : 1;
  var fu = S.ult / (S.ultMax || 100);
  _uiArc(_uiE.btnBoost._arc, fb);
  _uiArc(_uiE.btnSpecial._arc, fs);
  _uiArc(_uiE.btnUlt._arc, fu);
  _uiBtnState(_uiE.btnBoost, inp.boost, fb > 0.98);
  _uiBtnState(_uiE.btnSpecial, inp.special, fs >= 1);
  _uiBtnState(_uiE.btnUlt, inp.ult, fu >= 1);
  /* Nom du pouvoir courant sous le bouton ◈, et secondes restantes au centre
     pendant la recharge (S.specialCd est en millisecondes depuis G14). */
  var bs = S2030.phases && S2030.phases.buttonState ? S2030.phases.buttonState() : null;
  _uiBtnLabel(_uiE.btnSpecial, bs ? bs.nom : 'TRAVERSÉE');
  _uiBtnCd(_uiE.btnSpecial, S.specialCd > 0 ? Math.ceil(S.specialCd / 1000) : 0);
  var dry = _uiDryOn(s) ? 1 : 0;
  if (dry !== _uiP.dryBtn) { _uiP.dryBtn = dry; _uiE.btnBoost.classList.toggle('dry', !!dry); }
}

// panne de boost : éclat rouge à 0–120 et 240–360 ms après s.boostDryT
function _uiDryOn(s) {
  if (!s || s.boostDryT === undefined) return false;
  var d = S.t - s.boostDryT;
  return d >= 0 && d < 480 && ((d / 120) | 0) % 2 === 0;
}

/* étiquette d'un bouton tactile : texte ET nom accessible, changés ensemble */
function _uiBtnLabel(el, txt) {
  if (!el || !el._lab || el._lab._uv === txt) return;
  _uiTxt(el._lab, txt);
  el.setAttribute('aria-label', txt);
}
/* n secondes au centre du bouton pendant la recharge ; 0 rend le glyphe */
function _uiBtnCd(el, n) {
  if (!el || !el._cd || el._cdv === n) return;
  el._cdv = n;
  if (n > 0) { _uiTxt(el._cd, '' + n); el._cd.style.display = ''; el._gl.style.visibility = 'hidden'; }
  else { _uiTxt(el._cd, ''); el._cd.style.display = 'none'; el._gl.style.visibility = ''; }
}
function _uiBtnState(el, on, rdy) {
  var v = (on ? 1 : 0) | (rdy ? 2 : 0);
  if (el._us === v) return;
  el._us = v;
  el.classList.toggle('on', !!on);
  el.classList.toggle('rdy', !!rdy);
}

function _uiHud() {
  if (!_uiBuilt) return;
  _uiTickRun();
  _uiSyncCtl();

  var ph = S.phase;
  var showHud = (ph === 'play' || ph === 'cards' || ph === 'boss' || ph === 'warp' || ph === 'intro');
  var hi = showHud ? 1 : 0;
  if (hi !== _uiHudShown) {
    _uiHudShown = hi;
    _uiE.hud.classList.toggle('on', showHud);
  }
  // bouton pause : tabulable en jeu seulement
  var pt = (ph === 'play' && !S.paused && !_uiScreen) ? 0 : -1;
  if (pt !== _uiP.ptab) { _uiP.ptab = pt; _uiE.pauseBtn.tabIndex = pt; }
  var dk = S.desktop ? 1 : 0;
  var kc = (dk && ph === 'play' && (S.stats.runs | 0) < 3 && _uiRunMs < 6000) ? 1 : 0;
  if (kc !== _uiP.kc) { _uiP.kc = kc; _uiE.hud.classList.toggle('kc', !!kc); }
  if (!showHud) return;
  if (dk !== _uiP.dk) { _uiP.dk = dk; _uiE.gSpBox.hidden = !dk; }
  if (dk) _uiBar(_uiE.gSp, S.specialCd > 0 ? 1 - S.specialCd / (S.specialCdMax || 7000) : 1);

  var s = S.snake;

  /* score et multiplicateur */
  if (S.score !== _uiP.score) { _uiP.score = S.score; _uiTxt(_uiE.score, _uiNum(S.score)); }
  var m = Math.round(S.mult * 10);
  if (m !== _uiP.mult) {
    _uiP.mult = m;
    _uiTxt(_uiE.mult, '×' + _uiMultTxt(m / 10));
    _uiE.multBox.classList.toggle('up', S.mult > 1.01);
  }
  /* Combien de kills avant le palier suivant. Le compte descend à CHAQUE kill
     sans que mult bouge : il lui faut son propre cache, sinon le texte reste
     figé jusqu'au palier. Absent au plafond et à combo nul. */
  var nk = (S.combo | 0) * 1000 + m;              // clé : ni chaîne ni allocation par image
  if (nk !== _uiP.multNx) {
    _uiP.multNx = nk;
    var nx = '', cap = multCap();
    if (S.combo > 0 && S.mult < cap - 1e-9) {
      var rem = 3 - (S.combo % 3);
      nx = '· ' + rem + (rem > 1 ? ' kills → ×' : ' kill → ×')
         + _uiMultTxt(Math.min(cap, 1 + (Math.floor(S.combo / 3) + 1) * 0.5));
    }
    _uiTxt(_uiE.multNx, nx);
  }
  /* La jauge se divise par la durée COURANTE de la fenêtre (5 000 ms, 7 000 au
     delà de ×3) : divisée par 3 200 en dur, elle restait collée au maximum
     pendant les premières secondes. */
  _uiBar(_uiE.multBar, S.multT > 0 ? S.multT / (S.multTMax || 5000) : 0);

  /* progression */
  if (S.level !== _uiLvCache) {
    _uiLvCache = S.level;
    _uiTxt(_uiE.lvN, 'NIVEAU ' + S.level);
    _uiLvName = '';
    var defs = S2030.levels && S2030.levels.defs;
    if (defs) for (var i = 0; i < defs.length; i++) if (defs[i] && defs[i].n === S.level) { _uiLvName = defs[i].name || ''; break; }
    if (!_uiLvName) _uiLvName = S.levelName || '';   // SURCHARGE et au-delà
    _uiTxt(_uiE.lvT, _uiLvName ? ('— ' + _uiLvName) : '');
  }
  _uiBar(_uiE.prog, S.levelProgress || 0);
  _uiBar(_uiE.xp, S.xpNext ? S.xp / S.xpNext : 0);

  /* boss */
  var boss = S.boss && !S.boss.dead ? S.boss : null;
  var bo = boss ? 1 : 0;
  if (bo !== _uiP.boss) {
    _uiP.boss = bo;
    _uiE.bossBox.classList.toggle('on', !!boss);
  }
  if (boss) {
    var bn = boss.name || boss.type || 'BOSS';
    if (bn !== _uiP.bossName) { _uiP.bossName = bn; _uiTxt(_uiE.bossName, ('' + bn).toUpperCase()); }
    var bmax = S.bossHpMax || boss.maxHp || boss.hp || 1;
    /* la jauge se REMPLIT en 900 ms depuis l'éclosion — donc pleine avant que
       le boss n'entre dans le cadre — puis suit les PV */
    var bq = boss.hp / bmax, bel = S.t - (S.bossBornT || 0);
    if (bel < 900) { var bf = bel / 900; if (bf < bq) bq = bf; }
    _uiBar(_uiE.bossBar, bq);
  }

  /* vie, boost, ultime */
  if (s) {
    var len = s.len | 0;
    if (len !== _uiP.len) {
      _uiP.len = len;
      _uiTxt(_uiE.segN, '' + len);
      _uiPellets(len);
      var low = len <= 3 ? 1 : 0;
      if (low !== _uiP.low) { _uiP.low = low; _uiE.segBox.classList.toggle('low', !!low); }
    }
    _uiBar(_uiE.gBoost, s.boostE / (s.boostMax || 100));
    var dryB = _uiDryOn(s) ? 1 : 0;
    if (dryB !== _uiP.dryBar) { _uiP.dryBar = dryB; _uiE.gBoostBox.classList.toggle('dry', !!dryB); }
  }
  var fu = S.ult / (S.ultMax || 100);
  _uiBar(_uiE.gUlt, fu);
  var rdy = fu >= 1 ? 1 : 0;
  if (rdy !== _uiP.ready) { _uiP.ready = rdy; _uiE.gUltBox.classList.toggle('rdy', !!rdy); }
}

/* Une pastille par segment, dans un gabarit de 84 px : au-delà d'une vingtaine
   de segments la pastille et l'écart rétrécissent ensemble, le COMPTE reste
   exact — c'est lui que la joueuse lit d'un coup d'oeil quand il tombe à 3. */
function _uiPellets(n) {
  var box = _uiE.segPel;
  if (!box) return;
  n = n < 0 ? 0 : (n | 0);
  if (box._n === n) return;
  box._n = n;
  while (box.children.length > n) box.removeChild(box.lastChild);
  while (box.children.length < n) _uiMk('i', '', box);
  var unit = 84 / (n < 1 ? 1 : n);
  var w = unit * 0.72, g = unit * 0.28;
  if (w > 5) w = 5;
  if (g > 3) g = 3;
  box.style.setProperty('--pw', w.toFixed(2) + 'px');
  box.style.setProperty('--pg', g.toFixed(2) + 'px');
}

/* ======
   API PUBLIQUE
   ====== */
/* ======
   MARQUEURS HORS CHAMP
   Boss, élites et mines amorcées gardent un repère sur le cadre : 20 px du
   bord, dans leur direction, taille inversement proportionnelle à la distance.
   La liste est calculée ici (calque écran) et tracée par fx.drawScreen, qui
   est le seul endroit du jeu en coordonnées écran.
   ====== */

var _uiOffL = [], _uiOffPool = [], _uiOffP = { x: 0, y: 0 };

function _uiOffKind(e) {
  if (e.boss) return 'boss';
  if (e.type === 'mine' && e.st === 1) return 'mine';
  if (e.elite) return 'elite';
  return null;
}

function _uiOffscreen() {
  _uiOffL.length = 0;
  if (!S.snake || S.phase !== 'play' || !CW || !CH) return _uiOffL;
  var list = S.enemies, P = S2030.phases;
  var cx = CW * 0.5, cy = CH * 0.5, hw = cx - 20, hh = cy - 20;
  if (hw < 10 || hh < 10) return _uiOffL;
  /* DEUX PASSES : les boss d'abord. Le plafond de douze marqueurs évinçait le
     boss en approche quand la vague précédente tenait encore le cadre. */
  for (var pass = 0; pass < 2; pass++)
  for (var i = 0; i < list.length && _uiOffL.length < 12; i++) {
    var e = list[i];
    if (e.dead) continue;
    var kind = _uiOffKind(e);
    if (!kind || inView(e.x, e.y, 8)) continue;
    if ((kind === 'boss') !== (pass === 0)) continue;
    var sx, sy;
    var p = (P && P.toScreen) ? P.toScreen(e.x, e.y, _uiOffP) : null;
    if (p && isFinite(p.x) && isFinite(p.y)) { sx = p.x * CW; sy = p.y * CH; }
    else {                                   // bascule : projection non finie pour un point très éloigné
      sx = CW * (0.5 + (e.x - S.cam.x) / Math.max(1, S.view.w));
      sy = CH * (0.5 + (e.y - S.cam.y) / Math.max(1, S.view.h));
    }
    var dx = sx - cx, dy = sy - cy, adx = Math.abs(dx), ady = Math.abs(dy);
    if (adx < 1e-4 && ady < 1e-4) continue;
    var t = Math.min(adx > 1e-6 ? hw / adx : 1e9, ady > 1e-6 ? hh / ady : 1e9);
    var o = _uiOffPool[_uiOffL.length];
    if (!o) { o = { x: 0, y: 0, kind: '', d: 0, sz: 16, color: '#fff' }; _uiOffPool.push(o); }
    var d = dist(e.x, e.y, S.snake.x, S.snake.y);
    o.x = cx + dx * t; o.y = cy + dy * t; o.kind = kind; o.d = Math.round(d);
    o.sz = clamp(11000 / (d < 420 ? 420 : d), 8, 26);
    o.color = kind === 'boss' ? '#ff2b2b' : (kind === 'mine' ? '#ff8a3d' : '#ffe45e');
    _uiOffL.push(o);
  }
  return _uiOffL;
}

S2030.ui = {

  /* menaces hors champ, en px écran : [{x, y, kind}] */
  offscreen: _uiOffscreen,

  /* ------ build */
  build: function (root) {
    if (_uiBuilt) return;
    _uiRoot = root || document.getElementById('ui');
    if (!_uiRoot) return;
    _uiRoot.textContent = '';

    var st = document.createElement('style');
    st.id = 's2030-style';
    st.textContent = _UI_CSS;
    document.head.appendChild(st);

    _uiE.probe = _uiMk('div', 's2p', _uiRoot);

    _uiBuildHud(_uiRoot);
    _uiBuildCtl(_uiRoot);
    _uiBuildMenu(_uiRoot);
    _uiBuildCards(_uiRoot);
    _uiBuildPause(_uiRoot);
    _uiBuildOver(_uiRoot);
    _uiBuildSettings(_uiRoot);
    _uiBuildUnlocks(_uiRoot);
    _uiBuildBanner(_uiRoot);   /* en dernier : la bannière passe au-dessus de tout */

    _uiBuilt = true;
    _uiRoot.classList.toggle('kb', !!S.desktop);
    var scrs = _uiRoot.querySelectorAll('.s2scr');
    for (var i = 0; i < scrs.length; i++) _uiInert(scrs[i], true);
    // un clic qui déplace le focus déplace aussi le curseur clavier
    _uiRoot.addEventListener('focusin', function (e) {
      var t = e.target;
      if (_uiScreen && t && (t._kf || t._kadj) && _uiScrEl(_uiScreen).contains(t)) _uiKMark(t);
    });

    /* références attendues par le coeur */
    this.joyEl = _uiE.joy;
    this.knobEl = _uiE.knob;
    this.btnEls = { boost: _uiE.btnBoost, special: _uiE.btnSpecial, ult: _uiE.btnUlt };
    this.ctlEl = _uiE.ctl;
    this.hudEl = _uiE.hud;

    _uiDefaults();
    _uiApplyOpt();
    _uiRefreshMenu();

    var self = this;
    /* Un seul minuteur, comme pour le canevas : un redimensionnement émet
       soixante événements par seconde et chacun posait sa propre mise en page. */
    var lt = 0;
    var plan = function (ms) { if (lt) clearTimeout(lt); lt = setTimeout(function () { lt = 0; _uiLayout(); }, ms); };
    window.addEventListener('resize', function () { plan(80); });
    window.addEventListener('orientationchange', function () { plan(220); });
    return self;
  },

  /* ------ hud */
  hud: _uiHud,

  /* ------ écrans */
  showScreen: function (name) { _uiShow(name); },
  showCards: function (cards, cb) { _uiShowCards(cards, cb); },
  toast: function (title, sub) { _uiToast(title, sub); },
  banner: function (text, dur) { _uiBanner(text, dur); },
  phaseTag: function (text) { _uiPhaseTag(text); },

  /* ------ options */
  setControls: function (cfg) {
    if (cfg) for (var k in cfg) if (cfg[k] !== undefined) S.opt[k] = cfg[k];
    _uiApplyOpt();
  },

  /* ====== PONT AVEC LE COEUR ======
     Le coeur capte les touchers et remplit S.input ; l'interface ne fait que
     refléter cet état. Ce qui suit est le contrat exact.

     joyEl   : <div> du manche. Positionné en left/bottom (px, repère écran),
               transform:translate(-50%,50%) : left/bottom = CENTRE du manche.
     knobEl  : <div> de la poignée, enfant de joyEl. Piloté automatiquement
               depuis S.input.jx/jy/jmag à chaque hud().
     btnEls  : { boost, special, ult } — <div> des trois boutons, mêmes règles
               de positionnement. Leur jauge circulaire et leur état enfoncé
               sont pilotés automatiquement depuis S.input.boost/special/ult,
               S.snake.boostE, S.specialCd et S.ult.

     rects()     -> { boost, special, ult, joy }, chacun { x, y, r } en pixels
                    écran (y depuis le HAUT, comme btnRects du coeur), r = rayon
                    de la ZONE TACTILE (le graphisme ne fait que 72 % de r).
     hitTest(x,y)-> 'boost' | 'special' | 'ult' | null, avec une marge de 18 %.
     joyHome()   -> { x, y, r } position de repos du manche, en pixels écran.
     placeJoy(x,y)  : manche flottant — appeler avec le centre voulu en pixels
                      écran à chaque déplacement de l'origine du manche.
     releaseJoy()   : retour à la position de repos.
     useCanvasControls(on) : true si le coeur préfère dessiner lui-même les
                      contrôles sur le canvas ; masque alors la couche DOM.
     runTime()   -> durée de la partie en cours, en ms.
     screen()    -> nom de l'écran affiché ou null.
     ====== */
  joyEl: null,
  knobEl: null,
  btnEls: null,
  ctlEl: null,
  hudEl: null,

  rects: function () { return _uiRects; },

  /* On rend le bouton dont le CENTRE est le plus proche, pas le premier dont
     le disque contient le point. Les zones tactiles se chevauchent (le boost
     a 73 px de rayon, le pouvoir 54, leurs centres sont à 98 px) et le
     premier de la liste gagnait : appuyer sur le bord dessiné du bouton de
     pouvoir déclenchait le boost. */
  hitTest: function (x, y) {
    var R = _uiRects, k, b, rr, d2, best = null, bestD = 1e9;
    for (k in R) {
      if (k === 'joy') continue;
      b = R[k];
      rr = b.r * 1.18;
      d2 = dist2(x, y, b.x, b.y);
      if (d2 >= rr * rr) continue;
      // distance rapportée au rayon : un petit bouton ne se fait pas manger
      var rel = d2 / (rr * rr);
      if (rel < bestD) { bestD = rel; best = k; }
    }
    return best;
  },

  joyHome: function () { return _uiRects.joy; },

  placeJoy: function (x, y) {
    if (!_uiBuilt) return;
    _uiJoyMoved = true;
    _uiE.joy.style.left = x.toFixed(1) + 'px';
    _uiE.joy.style.bottom = (window.innerHeight - y).toFixed(1) + 'px';
  },

  releaseJoy: function () {
    if (!_uiBuilt || !_uiJoyMoved) return;
    _uiJoyMoved = false;
    _uiLayout();
  },

  useCanvasControls: function (on) {
    _uiCanvasCtl = !!on;
    _uiCtlShown = -1;
  },

  setControlsVisible: function (v) {
    if (!_uiBuilt) return;
    _uiCtlShown = v ? 1 : 0;
    _uiE.ctl.classList.toggle('on', !!v);
  },

  relayout: function () { _uiLayout(); },
  runTime: function () { return _uiRunMs; },
  screen: function () { return _uiScreen; },
  /* pause subie (fenêtre inactive) : bandeau .s2pause-blur à la place du titre */
  setPauseBlur: function (on) { _uiSetPauseBlur(!!on); },
  /* S.desktop a changé : lignes de réglages tactiles masquées ou non */
  syncDesktop: function () { _uiSyncDesktop(); },
  /* keydown reçu par le coeur : true si l'écran affiché l'a consommé */
  key: function (e) { return _uiKey(e); },
  /* curseur du canvas : '' normal, 'ret' réticule, 'none' masqué */
  cursor: function (m) {
    var g = document.getElementById('game');
    if (g) { g.classList.toggle('s2ret', m === 'ret'); g.classList.toggle('s2nocur', m === 'none'); }
  }
};
