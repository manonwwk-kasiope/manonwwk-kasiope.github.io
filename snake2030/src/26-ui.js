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
var _uiSafe = { t: 0, r: 0, b: 0, l: 0 };
var _uiLvName = '', _uiLvCache = -1;
var _uiRects = {
  boost: { x: 0, y: 0, r: 46 },
  special: { x: 0, y: 0, r: 40 },
  ult: { x: 0, y: 0, r: 40 },
  joy: { x: 0, y: 0, r: 56 }
};

/* mémoire d'affichage : on n'écrit dans le DOM que ce qui a bougé */
var _uiP = {
  score: -1, mult: -1, len: -1, maxlen: -1, lvl: -1, prog: -1,
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
  { id: 'u_ult',    icon: '★', name: 'CONDENSATEUR',  cost: 320, desc: 'L\'ultime se charge 20 % plus vite.' },
  { id: 'u_shield', icon: '◈', name: 'PARE-CHOCS',    cost: 400, desc: 'Une seconde d\'invulnérabilité en plus.' },
  { id: 'u_luck',   icon: '◇', name: 'ORACLE',        cost: 520, desc: 'Meilleures chances de cartes rares.' }
];

/* ======
   FEUILLE DE STYLE
   ====== */
var _UI_CSS = [
'#ui{',
'  --uis:1; --bl:1; --glow:1; --ca:1;',
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
'.s2mult{display:flex;align-items:center;gap:6px;height:11px}',
'.s2mult>b{font:900 calc(var(--uis)*clamp(11px,2.6vh,16px))/1 var(--fm);color:var(--am);',
'  text-shadow:0 0 calc(12px*var(--bl)*var(--glow)) var(--am);opacity:.5;transition:opacity .15s}',
'.s2mult.up>b{opacity:1}',
'.s2mult>i{display:block;width:calc(var(--uis)*54px);height:3px;background:rgba(255,209,102,.18);',
'  border-radius:2px;overflow:hidden}',
'.s2mult>i>u{display:block;height:100%;width:100%;transform-origin:0 50%;transform:scaleX(0);',
'  background:var(--am)}',

'.s2lv{display:flex;align-items:baseline;gap:7px;white-space:nowrap;max-width:100%}',
'.s2lv>b{font:900 calc(var(--uis)*clamp(10px,2.4vh,14px))/1 var(--fs);letter-spacing:.18em;',
'  color:var(--cy);text-shadow:0 0 calc(12px*var(--bl)*var(--glow)) var(--cy)}',
'.s2lv>s{text-decoration:none;font:700 calc(var(--uis)*clamp(9px,2vh,12px))/1.3 var(--fs);',
'  letter-spacing:.14em;color:var(--dim);overflow:hidden;text-overflow:ellipsis}',
'.s2prog{width:calc(var(--uis)*clamp(90px,26vw,220px));height:4px;border-radius:3px;',
'  background:rgba(0,229,255,.14);overflow:hidden}',
'.s2prog>u{display:block;height:100%;width:100%;transform-origin:0 50%;transform:scaleX(0);',
'  background:linear-gradient(90deg,var(--cy),var(--vi));',
'  box-shadow:0 0 calc(10px*var(--bl)) rgba(0,229,255,.7)}',

'.s2boss{display:none;flex-direction:column;align-items:center;gap:3px;width:calc(var(--uis)*clamp(150px,44vw,420px))}',
'.s2boss.on{display:flex}',
'.s2boss>b{font:900 calc(var(--uis)*clamp(10px,2.3vh,14px))/1 var(--fs);letter-spacing:.24em;',
'  color:var(--mg);text-shadow:0 0 calc(14px*var(--bl)*var(--glow)) var(--mg)}',
'.s2boss>i{display:block;width:100%;height:9px;background:rgba(255,46,99,.16);',
'  border:1px solid rgba(255,46,99,.55);border-radius:2px;overflow:hidden;',
'  box-shadow:0 0 calc(16px*var(--bl)) rgba(255,46,99,.35)}',
'.s2boss>i>u{display:block;height:100%;width:100%;transform-origin:0 50%;',
'  background:linear-gradient(90deg,#ff2e63,#ff8a5c);transition:transform .12s linear}',

'.s2ann{min-height:0;text-align:center;opacity:0;transform:translateY(-6px);',
'  transition:opacity .18s,transform .18s;pointer-events:none}',
'.s2ann.on{opacity:1;transform:none}',
'.s2ann>b{display:block;font:900 calc(var(--uis)*clamp(11px,2.6vh,16px))/1.1 var(--fs);',
'  letter-spacing:.16em;color:#fff;text-shadow:0 0 calc(16px*var(--bl)*var(--glow)) var(--cy)}',
'.s2ann>s{display:block;text-decoration:none;margin-top:2px;',
'  font:700 calc(var(--uis)*clamp(9px,2vh,12px))/1.1 var(--fs);letter-spacing:.1em;color:var(--dim)}',

'.s2seg{display:flex;align-items:center;gap:6px}',
'.s2seg>b{font:800 calc(var(--uis)*clamp(13px,3.2vh,21px))/1 var(--fm);color:var(--cy);',
'  text-shadow:0 0 calc(12px*var(--bl)*var(--glow)) var(--cy)}',
'.s2seg>s{text-decoration:none;font:800 calc(var(--uis)*clamp(8px,1.8vh,11px))/1 var(--fs);',
'  letter-spacing:.18em;color:var(--dim)}',
'.s2seg.low>b{color:#fff;animation:s2danger .5s infinite steps(2)}',
'@keyframes s2danger{0%{color:#fff;text-shadow:0 0 18px var(--mg)}50%{color:var(--mg);text-shadow:none}}',
'.s2g{display:flex;align-items:center;gap:5px}',
'.s2g>s{text-decoration:none;font:800 calc(var(--uis)*clamp(7px,1.6vh,10px))/1 var(--fs);',
'  letter-spacing:.14em;color:var(--dim);width:2.2em;text-align:right}',
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
'  width:38px;height:38px;display:flex;align-items:center;justify-content:center;',
'  pointer-events:auto;opacity:.4;font-size:13px;letter-spacing:.1em;color:var(--cy)}',
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
'.s2btn{position:absolute;transform:translate(-50%,50%);border-radius:50%;',
'  display:flex;align-items:center;justify-content:center;',
'  opacity:calc(.26*var(--ca));transition:opacity .1s ease;will-change:opacity}',
'.s2btn.on{opacity:calc(.55*var(--ca))}',
'.s2btn>svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}',
'.s2btn .trk{fill:currentColor;fill-opacity:.16;stroke:currentColor;stroke-opacity:.5;stroke-width:2}',
'.s2btn .arc{fill:none;stroke:currentColor;stroke-width:7;stroke-linecap:round;',
'  transform:rotate(-90deg);transform-origin:50% 50%;',
'  filter:drop-shadow(0 0 calc(6px*var(--bl)) currentColor)}',
'.s2btn>span{position:relative;font:900 1em/1 var(--fs);color:#04101a;',
'  text-shadow:0 0 6px rgba(255,255,255,.5)}',
'.s2btn.rdy{animation:s2rdy .9s ease-in-out infinite}',
'@keyframes s2rdy{0%,100%{filter:none}50%{filter:brightness(1.7)}}',
'#ui.nf .s2btn.rdy{animation:none}',
'.s2b-boost{color:var(--am)} .s2b-special{color:var(--vi)} .s2b-ult{color:var(--mg)}',
'.s2b-boost.dry{color:#ff2a2a} .s2b-boost.dry .trk{fill-opacity:.85;stroke-opacity:1}',   /* panne : bouton rouge */

/* ------ bannière - */
'.s2ban{position:absolute;inset:0;display:none;align-items:center;justify-content:center;',
'  pointer-events:none;overflow:hidden;z-index:2}',
'.s2ban.on{display:flex}',
'.s2ban>b{position:relative;font:900 calc(var(--uis)*clamp(26px,10vh,76px))/1 var(--fs);',
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
'.s2sub{font:700 calc(var(--uis)*clamp(9px,2vh,12px))/1.3 var(--fs);letter-spacing:.14em;color:var(--dim)}',
'.s2row{display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap}',
'.s2fill{flex:1 1 auto;min-height:0}',

'#ui .s2big{position:relative;flex:0 0 auto;padding:0 clamp(20px,5vw,54px);',
'  height:clamp(46px,13.5vh,78px);min-width:clamp(150px,34vw,320px);',
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

'#ui .s2pill{flex:0 0 auto;padding:0 clamp(12px,3vw,24px);height:clamp(34px,9vh,50px);',
'  border-radius:8px;border:1px solid var(--line);background:var(--pan);color:var(--ink);',
'  font:800 calc(var(--uis)*clamp(10px,2.3vh,14px))/1 var(--fs);letter-spacing:.16em}',
'#ui .s2pill:active{background:rgba(0,229,255,.22);border-color:var(--cy)}',
'#ui .s2pill.dim{color:var(--dim)}',

/* menu */
'.s2menu{flex-direction:row;align-items:center;gap:clamp(12px,4vw,48px)}',
'.s2mL{flex:1 1 0;display:flex;flex-direction:column;gap:clamp(4px,1.4vh,12px);min-width:0}',
'.s2mR{flex:0 0 auto;display:flex;flex-direction:column;align-items:center;gap:clamp(8px,2.4vh,18px)}',
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
'.s2kv>s{text-decoration:none;font:800 calc(var(--uis)*clamp(8px,1.7vh,10px))/1 var(--fs);',
'  letter-spacing:.2em;color:var(--dim)}',
'.s2kv>b{font:800 calc(var(--uis)*clamp(14px,3.4vh,22px))/1 var(--fm);color:var(--am);',
'  text-shadow:0 0 calc(12px*var(--bl)*var(--glow)) rgba(255,209,102,.7)}',
'.s2kv.cy>b{color:var(--cy);text-shadow:0 0 calc(12px*var(--bl)*var(--glow)) rgba(0,229,255,.7)}',

/* cartes */
'.s2cards{align-items:center;justify-content:center;gap:clamp(6px,1.6vh,14px)}',
'.s2cardrow{display:flex;gap:clamp(8px,2.2vw,20px);align-items:stretch;justify-content:center;',
'  width:100%;flex:1 1 auto;min-height:0;max-height:clamp(120px,52vh,250px)}',
'.s2card{position:relative;flex:1 1 0;min-width:0;max-width:clamp(150px,31%,300px);',
'  display:flex;flex-direction:column;align-items:center;justify-content:center;',
'  gap:clamp(3px,1.1vh,10px);padding:clamp(8px,2.4vh,20px) clamp(6px,1.4vw,16px);',
'  border-radius:12px;border:2px solid var(--r);',
'  background:linear-gradient(168deg,rgba(12,18,36,.95),rgba(4,6,15,.97));',
'  box-shadow:0 0 calc(24px*var(--bl)) var(--rg),inset 0 0 calc(40px*var(--bl)) var(--rg);',
'  animation:s2cardIn .34s cubic-bezier(.16,1,.3,1) both;animation-delay:var(--d,0ms)}',
'.s2card:active{transform:scale(.97);filter:brightness(1.35)}',
'@keyframes s2cardIn{0%{opacity:0;transform:translateY(26px) scale(.9)}100%{opacity:1;transform:none}}',
'.s2card>u{position:absolute;top:0;left:0;right:0;height:3px;background:var(--r);',
'  box-shadow:0 0 calc(14px*var(--bl)) var(--r)}',
'.s2card .ic{font:400 calc(var(--uis)*clamp(22px,8vh,54px))/1.1 var(--fs);color:var(--t,var(--r));',
'  text-shadow:0 0 calc(18px*var(--bl)*var(--glow)) var(--t,var(--r))}',
'.s2card .nm{font:900 calc(var(--uis)*clamp(12px,3vh,20px))/1.05 var(--fs);letter-spacing:.1em;',
'  color:#fff;text-align:center;word-break:break-word}',
'.s2card .ds{font:600 calc(var(--uis)*clamp(9px,2.1vh,13px))/1.28 var(--fs);color:var(--dim);',
'  text-align:center;flex:0 1 auto}',
'.s2card .rr{margin-top:clamp(2px,1.2vh,9px);font:800 calc(var(--uis)*clamp(7px,1.6vh,10px))/1.3 var(--fs);letter-spacing:.24em;',
'  color:var(--r);opacity:.9}',
'.s2card .lv{position:absolute;top:5px;right:8px;font:800 calc(var(--uis)*9px)/1.3 var(--fs);',
'  letter-spacing:.12em;color:var(--r);opacity:.6}',
'.s2card.ultra{animation:s2cardIn .34s cubic-bezier(.16,1,.3,1) both,s2ultra 1.8s linear infinite .34s}',
'@keyframes s2ultra{0%,100%{box-shadow:0 0 calc(22px*var(--bl)) var(--rg),inset 0 0 30px var(--rg)}',
'  50%{box-shadow:0 0 calc(52px*var(--bl)) var(--r),inset 0 0 54px var(--rg)}}',
'#ui.nf .s2card,#ui.nf .s2card.ultra{animation:none}',

/* fin de partie */
'.s2grid{display:flex;flex-wrap:wrap;justify-content:center;gap:clamp(5px,1.4vh,14px);width:100%}',
'.s2tile{flex:1 1 clamp(78px,17%,140px);min-width:clamp(72px,16%,140px);max-width:clamp(120px,22%,210px);',
'  padding:clamp(5px,1.4vh,12px) clamp(6px,1.2vw,14px);border-radius:8px;',
'  border:1px solid var(--line);background:var(--pan);display:flex;flex-direction:column;gap:3px}',
'.s2tile>s{text-decoration:none;font:800 calc(var(--uis)*clamp(7px,1.6vh,10px))/1.35 var(--fs);',
'  letter-spacing:.18em;color:var(--dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
'.s2tile>b{font:800 calc(var(--uis)*clamp(12px,2.9vh,19px))/1.2 var(--fm);color:#fff;',
/* La tuile ARME tronquait six noms sur huit sur petit écran : elle prend
   toute la largeur qu'il lui faut, et son texte rétrécit plutôt que de se
   couper. */
'.s2tile.wide{flex:1 1 100%;max-width:100%}',
'.s2tile.wide>b{font-size:calc(var(--uis)*clamp(9px,2.1vh,14px));white-space:nowrap;'
  + 'overflow:hidden;text-overflow:clip}',
'  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
'.s2tile.hi{border-color:var(--am)}.s2tile.hi>b{color:var(--am)}',
'.s2rec{font:900 calc(var(--uis)*clamp(10px,2.4vh,15px))/1 var(--fs);letter-spacing:.22em;',
'  color:var(--am);text-shadow:0 0 calc(16px*var(--bl)) var(--am);animation:s2blink 1s infinite;opacity:0}',
'.s2rec.on{opacity:1}',

/* réglages */
'.s2scroll{flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;touch-action:pan-y;',
'  -webkit-overflow-scrolling:touch;padding:2px 2px 6px;display:flex;flex-direction:column;gap:5px}',
'.s2grp{font:800 calc(var(--uis)*clamp(8px,1.8vh,11px))/1 var(--fs);letter-spacing:.26em;',
'  color:var(--cy);opacity:.85;margin:8px 0 1px}',
'.s2opt{display:flex;align-items:center;gap:10px;padding:clamp(4px,1vh,9px) 10px;',
'  border-radius:7px;background:var(--pan);border:1px solid rgba(255,255,255,.07)}',
'.s2opt>s{text-decoration:none;flex:1 1 auto;font:700 calc(var(--uis)*clamp(10px,2.2vh,14px))/1.1 var(--fs);',
'  letter-spacing:.06em}',
'.s2sw{position:relative;flex:0 0 auto;width:52px;height:28px;border-radius:14px;',
'  background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.16);transition:background .15s}',
'.s2sw::after{content:"";position:absolute;top:2px;left:2px;width:22px;height:22px;border-radius:50%;',
'  background:#8ba3bd;transition:transform .15s ease,background .15s}',
'.s2sw.on{background:rgba(0,229,255,.3);border-color:var(--cy)}',
'.s2sw.on::after{transform:translateX(24px);background:var(--cy);box-shadow:0 0 12px var(--cy)}',
'.s2stp{flex:0 0 auto;display:flex;align-items:center;gap:6px}',
'#ui .s2stp>button{width:42px;height:38px;border-radius:6px;border:1px solid var(--line);',
'  background:rgba(0,229,255,.09);font:900 16px/1 var(--fs);color:var(--cy)}',
'#ui .s2stp>button:active{background:rgba(0,229,255,.3)}',
'.s2stp>span{min-width:76px;text-align:center;font:800 calc(var(--uis)*12px)/1 var(--fm);color:#fff}',
'.s2seg2{flex:0 0 auto;display:flex;border:1px solid var(--line);border-radius:7px;overflow:hidden}',
'#ui .s2seg2>button{padding:0 12px;height:30px;font:800 calc(var(--uis)*10px)/1 var(--fs);',
'  letter-spacing:.12em;color:var(--dim);background:rgba(255,255,255,.03)}',
'#ui .s2seg2>button.on{background:var(--cy);color:#03121a}',

/* déblocages */
'.s2ug{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}',
'.s2u{flex:1 1 clamp(120px,30%,220px);min-width:120px;display:flex;align-items:center;gap:9px;',
'  padding:8px 10px;border-radius:8px;border:1px solid var(--line);background:var(--pan)}',
'.s2u>i{font-style:normal;font-size:calc(var(--uis)*20px);color:var(--cy);width:1.3em;text-align:center}',
'.s2u>div{flex:1 1 auto;min-width:0}',
'.s2u b{display:block;font:900 calc(var(--uis)*11px)/1.1 var(--fs);letter-spacing:.1em}',
'.s2u s{display:block;text-decoration:none;font:600 calc(var(--uis)*9px)/1.2 var(--fs);color:var(--dim)}',
'#ui .s2u>button{flex:0 0 auto;padding:0 10px;height:30px;border-radius:6px;border:1px solid var(--am);',
'  color:var(--am);font:900 calc(var(--uis)*10px)/1 var(--fm);background:rgba(255,209,102,.1)}',
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

  /* --- centre : niveau, progression, boss, annonces --- */
  var C = _uiMk('div', 's2col s2hc', bar);
  var lv = _uiMk('div', 's2lv', C);
  _uiE.lvN = _uiMk('b', '', lv, 'NIVEAU 1');
  _uiE.lvT = _uiMk('s', '', lv, '');
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
  _uiMk('s', '', sg, 'SEG');
  _uiE.segN = _uiMk('b', '', sg, '9');
  var gb = _uiMk('div', 's2g s2gb', R);
  _uiE.gBoostBox = gb;
  _uiMk('s', '', gb, 'BST');
  _uiE.gBoost = _uiMk('u', '', _uiMk('i', '', gb));
  var gu = _uiMk('div', 's2g s2gu', R);
  _uiE.gUltBox = gu;
  _uiMk('s', '', gu, 'ULT');
  _uiE.gUlt = _uiMk('u', '', _uiMk('i', '', gu));

  _uiE.pauseBtn = _uiTap(_uiMk('button', 's2pause', hud, '❚❚'), function () {
    if (typeof togglePause === 'function') togglePause();
  });
}

function _uiMkBtn(parent, key, glyph) {
  var b = _uiMk('div', 's2btn s2b-' + key, parent);
  var svg = _uiSvgMk('svg', b, { viewBox: '0 0 100 100' });
  _uiSvgMk('circle', svg, { cx: 50, cy: 50, r: 36, 'class': 'trk' });
  var arc = _uiSvgMk('circle', svg, { cx: 50, cy: 50, r: 44, 'class': 'arc' });
  var c = 2 * Math.PI * 44;
  arc.setAttribute('stroke-dasharray', c.toFixed(2));
  arc.style.strokeDashoffset = c.toFixed(2);
  arc._uc0 = c;
  _uiMk('span', '', b, glyph);
  b._arc = arc;
  return b;
}

function _uiBuildCtl(root) {
  var ctl = _uiMk('div', 's2ctl', root);
  _uiE.ctl = ctl;
  var joy = _uiMk('div', 's2joy', ctl);
  _uiE.joy = joy;
  _uiE.knob = _uiMk('div', 's2knob', joy);
  _uiE.btnBoost = _uiMkBtn(ctl, 'boost', '»');
  _uiE.btnSpecial = _uiMkBtn(ctl, 'special', '◈');
  _uiE.btnUlt = _uiMkBtn(ctl, 'ult', '★');
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
  var L = _uiMk('div', 's2mL', sc);
  var lg = _uiMk('div', 's2logo', L);
  _uiMk('b', '', lg, 'SNAKE');
  _uiMk('i', '', lg, '2030');
  _uiMk('div', 's2sub', L, 'ARCADE SURVIE — SURVIS À LA SURCHARGE');
  var st = _uiMk('div', 's2stat2', L);
  var k1 = _uiMk('div', 's2kv', st);
  _uiMk('s', '', k1, 'MEILLEUR');
  _uiE.mBest = _uiMk('b', '', k1, '0');
  var k2 = _uiMk('div', 's2kv cy', st);
  _uiMk('s', '', k2, 'CRÉDITS');
  _uiE.mCoins = _uiMk('b', '', k2, '0');
  var k3 = _uiMk('div', 's2kv cy', st);
  _uiMk('s', '', k3, 'PARTIES');
  _uiE.mRuns = _uiMk('b', '', k3, '0');

  var R = _uiMk('div', 's2mR', sc);
  _uiTap(_uiMk('button', 's2big', R, 'JOUER'), function () {
    _uiNewRun();
    if (typeof startRun === 'function') startRun();
  });
  var row = _uiMk('div', 's2row', R);
  _uiTap(_uiMk('button', 's2pill', row, 'RÉGLAGES'), function () { _uiShow('settings'); });
  _uiTap(_uiMk('button', 's2pill', row, 'DÉBLOCAGES'), function () { _uiShow('unlocks'); });
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
    var c = _uiMk('div', 's2card', row);
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
  var g = _uiMk('div', 's2grid', sc);
  _uiE.oScore = _uiTile(g, 'SCORE', true);
  _uiE.oTime = _uiTile(g, 'DURÉE');
  _uiE.oLvl = _uiTile(g, 'NIVEAU');
  _uiE.oKills = _uiTile(g, 'DÉTRUITS');
  _uiE.oWpn = _uiTile(g, 'ARME');
  _uiE.oWpn.parentNode.classList.add('wide');
  _uiE.oBest = _uiTile(g, 'RECORD');
  _uiE.oCoins = _uiTile(g, 'CRÉDITS', true);
  var row = _uiMk('div', 's2row', sc);
  _uiTap(_uiMk('button', 's2big mag', row, 'REJOUER'), function () {
    _uiNewRun();
    if (typeof startRun === 'function') startRun();
  });
  _uiTap(_uiMk('button', 's2pill dim', row, 'MENU'), function () { _uiQuit(); });
}

/* ------ réglages -- */
function _uiOptRow(parent, label) {
  var r = _uiMk('div', 's2opt', parent);
  _uiMk('s', '', r, label);
  return r;
}
function _uiTog(parent, label, key, after) {
  var r = _uiOptRow(parent, label);
  var sw = _uiMk('div', 's2sw', r);
  function refresh() { sw.classList.toggle('on', !!S.opt[key]); }
  _uiTap(sw, function () {
    S.opt[key] = !S.opt[key];
    refresh(); _uiApplyOpt();
    if (after) after(S.opt[key]);
  });
  _uiWidgets.push(refresh);
  refresh();
  return r;
}
function _uiStepper(parent, label, key, vals, fmt) {
  var r = _uiOptRow(parent, label);
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
  _uiWidgets.push(refresh);
  refresh();
  return r;
}
function _uiSeg2(parent, label, key, opts) {
  var r = _uiOptRow(parent, label);
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
  _uiWidgets.push(refresh);
  refresh();
  return r;
}
function _uiPct(v) { return Math.round(v * 100) + ' %'; }

function _uiBuildSettings(root) {
  var sc = _uiMk('div', 's2scr', root);
  sc.style.gap = '6px';
  _uiE.scrSet = sc;
  _uiMk('div', 's2ttl', sc, 'RÉGLAGES');
  var box = _uiMk('div', 's2scroll', sc);
  _uiScrollable(box);

  _uiMk('div', 's2grp', box, 'PARTIE');
  /* Les valeurs du sélecteur DOIVENT venir de la table du moteur. En les
     écrivant à la main, deux crans du sélecteur (2,7 et 3,5) tombaient sur le
     même palier moteur et les étiquettes annonçaient autre chose que ce qui
     était appliqué. */
  _uiStepper(box, 'Difficulté', 'diff', DIFFS.map(function (d) { return d.m; }),
    function (v, i) { return DIFFS[i].nom; });
  /* Netteté contre fluidité : au maximum, une image sur dix est perdue sur
     un téléphone. Le repère par défaut tient les soixante images. */
  _uiStepper(box, 'Netteté', 'px', [1, 1.25, 1.5, 2],
    function (v) { return v >= 2 ? 'MAXIMALE' : v >= 1.5 ? 'FLUIDE' : v >= 1.25 ? 'LÉGÈRE' : 'BASSE'; });

  _uiMk('div', 's2grp', box, 'CONTRÔLES');
  /* Les six lignes du manche et des boutons tactiles n'ont pas d'objet sur
     bureau : elles reçoivent hidden (voir _uiSyncDesktop). */
  var tr = _uiE.touchRows = [];
  tr.push(_uiSeg2(box, 'Manche', 'joyFloat', [{ v: false, t: 'FIXE' }, { v: true, t: 'FLOTTANT' }]));
  tr.push(_uiSeg2(box, 'Main directrice', 'leftHanded', [{ v: false, t: 'DROITIER' }, { v: true, t: 'GAUCHER' }]));
  tr.push(_uiStepper(box, 'Taille des contrôles', 'joySize', [0.8, 0.9, 1, 1.1, 1.25, 1.4], _uiPct));
  tr.push(_uiStepper(box, 'Opacité des contrôles', 'joyAlpha', [0.5, 0.75, 1, 1.25, 1.5], _uiPct));
  _uiStepper(box, 'Sensibilité', 'sens', [0.7, 0.85, 1, 1.2, 1.4, 1.6], _uiPct);
  tr.push(_uiStepper(box, 'Hauteur des contrôles', 'ctlY', [-24, -12, 0, 14, 28, 44],
    function (v) { return (v > 0 ? '+' : '') + v + ' px'; }));
  tr.push(_uiStepper(box, 'Écart du bord', 'ctlX', [-14, -7, 0, 10, 22, 36],
    function (v) { return (v > 0 ? '+' : '') + v + ' px'; }));

  _uiMk('div', 's2grp', box, 'CONFORT');
  _uiE.vibRow = _uiTog(box, 'Vibrations', 'haptics');
  _uiTog(box, 'Réduire les flashs', 'reduceFlash');
  _uiTog(box, 'Réduire les secousses', 'reduceShake');
  _uiTog(box, 'Réduire le bloom', 'reduceBloom');
  _uiTog(box, 'Contraste renforcé', 'contrast');
  _uiStepper(box, 'Taille de l\'interface', 'uiScale', [0.85, 0.95, 1, 1.1, 1.25], _uiPct);
  _uiStepper(box, 'Densité des particules', 'particles', [0.4, 0.7, 1], _uiPct);

  _uiMk('div', 's2grp', box, 'SON');
  _uiTog(box, 'Musique', 'music', function (v) {
    if (S2030.audio && S2030.audio.setMusic) S2030.audio.setMusic(v);
  });
  _uiTog(box, 'Effets sonores', 'sfx', function (v) {
    if (S2030.audio && S2030.audio.setSfx) S2030.audio.setSfx(v);
  });

  var row = _uiMk('div', 's2row', sc);
  _uiTap(_uiMk('button', 's2pill', row, 'RETOUR'), function () { _uiShow(_uiPrevScr); });
  _uiSyncDesktop();
}

/* Bureau : les réglages du manche et des boutons tactiles n'ont pas d'objet ;
   Vibrations non plus sans navigator.vibrate (Safari iOS) ni sur bureau, où
   l'API existe mais ne vibre rien. Resynchronisé à chaque ouverture des
   réglages : S.desktop peut tomber au premier toucher. */
function _uiSyncDesktop() {
  var d = !!S.desktop, rows = _uiE.touchRows || [];
  for (var i = 0; i < rows.length; i++) rows[i].hidden = d;
  if (_uiE.vibRow) _uiE.vibRow.hidden = d || !navigator.vibrate;
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
  if (o.joyAlpha === undefined) o.joyAlpha = 1;
  if (o.joySize === undefined) o.joySize = 1;
  if (o.sens === undefined) o.sens = 1;
  if (o.particles === undefined) o.particles = 1;
  // les parties sauvegardées avant l'ajout du réglage repartent au cran de
  // référence, pas au plus facile
  if (o.diff === undefined) o.diff = DIFFS[1].m;
  if (o.px === undefined) o.px = 1.5;
}

function _uiApplyOpt() {
  if (!_uiBuilt) return;
  _uiDefaults();
  var o = S.opt, r = _uiRoot;
  r.style.setProperty('--uis', '' + clamp(o.uiScale, 0.7, 1.6));
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
  if (prev) prev.classList.remove('on');
  _uiScreen = name || null;
  var el = _uiScrEl(_uiScreen);
  if (el) el.classList.add('on');

  if (_uiScreen === 'menu') { _uiRefreshMenu(); _uiRunMs = 0; }
  if (_uiScreen === 'unlocks') _uiRefreshUnlocks();
  if (_uiScreen === 'settings') _uiSyncDesktop();
  if (_uiScreen === 'over') _uiFillOver();
  if (_uiScreen === null && (prev === _uiE.scrMenu || prev === _uiE.scrOver)) _uiNewRun();
}

function _uiRefreshMenu() {
  _uiTxt(_uiE.mBest, _uiNum(S.stats.best || 0));
  _uiTxt(_uiE.mCoins, _uiNum(S.stats.coins || 0));
  _uiTxt(_uiE.mRuns, _uiNum(S.stats.runs || 0));
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

function _uiFillOver() {
  var rec = false;
  if (S.score > (S.stats.best || 0)) { S.stats.best = S.score; rec = true; }
  S.stats.coins = (S.stats.coins || 0) + (S.coins || 0);
  S.stats.runs = (S.stats.runs || 0) + 1;
  if (typeof saveStats === 'function') saveStats();

  _uiTxt(_uiE.oScore, _uiNum(S.score));
  _uiTxt(_uiE.oTime, _uiTime(_uiRunMs));
  _uiTxt(_uiE.oLvl, '' + S.level);
  _uiTxt(_uiE.oKills, _uiNum(S.kills));
  _uiTxt(_uiE.oWpn, _uiBestWeapon());
  _uiTxt(_uiE.oBest, _uiNum(S.stats.best || 0));
  _uiTxt(_uiE.oCoins, '+' + _uiNum(S.coins || 0));
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
  _uiRunMs = 0;
  _uiRunLast = S.t;
  _uiRunOn = false;
}

/* ======
   ANNONCES
   ====== */
function _uiToast(title, sub) {
  if (!_uiBuilt) return;
  _uiTxt(_uiE.annT, title == null ? '' : ('' + title));
  _uiTxt(_uiE.annS, sub == null ? '' : ('' + sub));
  _uiE.ann.classList.add('on');
  if (_uiToastTo) clearTimeout(_uiToastTo);
  _uiToastTo = setTimeout(function () {
    _uiE.ann.classList.remove('on');
    _uiToastTo = 0;
  }, 1900);
}

function _uiBanner(text) {
  if (!_uiBuilt) return;
  var b = _uiE.banT;
  var s = ('' + text).toUpperCase();
  b.textContent = s;
  b.setAttribute('data-t', s);
  _uiE.ban.classList.remove('on');
  /* on force un reflow pour relancer proprement l'animation */
  void _uiE.ban.offsetWidth;
  _uiE.ban.classList.add('on');
  if (_uiBanTo) clearTimeout(_uiBanTo);
  _uiBanTo = setTimeout(function () {
    _uiE.ban.classList.remove('on');
    _uiBanTo = 0;
  }, 1200);
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
    o.el.style.setProperty('--d', (i * 55) + 'ms');
    o.el.classList.toggle('ultra', c.rarity === 'ultra');
    o.id = c.id;
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
  var dry = _uiDryOn(s) ? 1 : 0;
  if (dry !== _uiP.dryBtn) { _uiP.dryBtn = dry; _uiE.btnBoost.classList.toggle('dry', !!dry); }
}

// panne de boost : éclat rouge à 0–120 et 240–360 ms après s.boostDryT
function _uiDryOn(s) {
  if (!s || s.boostDryT === undefined) return false;
  var d = S.t - s.boostDryT;
  return d >= 0 && d < 480 && ((d / 120) | 0) % 2 === 0;
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
  if (!showHud) return;

  var s = S.snake;

  /* score et multiplicateur */
  if (S.score !== _uiP.score) { _uiP.score = S.score; _uiTxt(_uiE.score, _uiNum(S.score)); }
  var m = Math.round(S.mult * 10);
  if (m !== _uiP.mult) {
    _uiP.mult = m;
    _uiTxt(_uiE.mult, '×' + (m % 10 === 0 ? (m / 10) : (m / 10).toFixed(1)));
    _uiE.multBox.classList.toggle('up', S.mult > 1.01);
  }
  _uiBar(_uiE.multBar, S.multT > 0 ? S.multT / 3200 : 0);

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
    _uiBar(_uiE.bossBar, boss.hp / bmax);
  }

  /* vie, boost, ultime */
  if (s) {
    var len = s.len | 0;
    if (len !== _uiP.len) {
      _uiP.len = len;
      _uiTxt(_uiE.segN, '' + len);
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

/* ======
   API PUBLIQUE
   ====== */
S2030.ui = {

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
    window.addEventListener('resize', function () { setTimeout(_uiLayout, 70); });
    window.addEventListener('orientationchange', function () { setTimeout(_uiLayout, 220); });
    return self;
  },

  /* ------ hud */
  hud: _uiHud,

  /* ------ écrans */
  showScreen: function (name) { _uiShow(name); },
  showCards: function (cards, cb) { _uiShowCards(cards, cb); },
  toast: function (title, sub) { _uiToast(title, sub); },
  banner: function (text) { _uiBanner(text); },

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
  syncDesktop: function () { _uiSyncDesktop(); }
};
