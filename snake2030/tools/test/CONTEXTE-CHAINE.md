# Contexte commun de la chaîne de construction SNAKE 2030

Ce fichier est lu en premier par chaque agent de la chaîne — implémenteur, auteur de tests, exécuteur,
médiateur — et il fait autorité. Il vivait dans un dossier temporaire, ce qui le rendait sensible aux
redémarrages du conteneur et invisible à la relecture ; il est désormais versionné ici.


CONTEXTE COMMUN (SNAKE 2030, chaîne autonome de construction)
- Dépôt : /home/user/manonwwk-kasiope.github.io (branche claude/snake-game-mobile-17dqpi). Jeu : snake2030/ ; sources snake2030/src/*.js concaténées par « cd /home/user/manonwwk-kasiope.github.io/snake2030 && /opt/node22/bin/node build.mjs » → snake2030/index.html (contrôle de syntaxe intégré, doit sortir 0). Contrat des modules : snake2030/src/CONTRACT.md (pas de Date.now → S.t, pas de Math.random → rnd(), DOM seulement dans 26-ui.js sauf exceptions déjà présentes dans 90-boot.js/21-audio.js, une affectation S2030.<nom> par module).
- Serveur de test : http-server port 8112, racine = dépôt → http://127.0.0.1:8112/snake2030/index.html (sert toujours le build courant). S'il ne répond pas (curl -s -o /dev/null -w %{http_code}) : « (cd /home/user/manonwwk-kasiope.github.io && NODE_PATH=/opt/node22/lib/node_modules /opt/node22/bin/node /opt/node22/lib/node_modules/http-server/bin/http-server -p 8112 -s >/dev/null 2>&1 &) ».
- Playwright : import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs' ; Chromium headless préinstallé (ne jamais lancer playwright install). Node : NODE_PATH=/opt/node22/lib/node_modules /opt/node22/bin/node script.mjs. CDP disponible (Input.dispatchTouchEvent, Emulation.setCPUThrottlingRate, Network.emulateNetworkConditions). Profils : bureau = viewport 1440×900 hasTouch:false isMobile:false ; iPhone 13 paysage = devices['iPhone 13'] avec viewport {width:844,height:390} ; tablette 1194×834 hasTouch:true. Lancer chromium avec args ['--autoplay-policy=no-user-gesture-required'].
- La page expose window.__S (état S), window.__M (fx, audio, enemies, weapons, upgrades, levels, ui, phases), window.__K, window.__ERR = {count, sigs} et les crochets de test window.__SEED (graine imposée à resetRun) et window.__DT (pas de temps imposé, en secondes, jamais posé en jeu normal). Écrans : __M.ui.screen() ∈ 'menu'|'settings'|'unlocks'|'cards'|'pause'|'over'|null.


INVARIANTS DE LA JOUEUSE — À NE JAMAIS CASSER, VÉRIFIÉS À CHAQUE OBJECTIF
La personne qui joue est sur iPhone en Safari, en paysage, et veut aussi jouer sur PC et Mac. L iPhone
est la plateforme de référence : ce qui suit ne se négocie pas et un médiateur refuse tout objectif qui
l enfreint, même si tous ses tests passent.
- Plein écran impossible sur iOS. Safari iPhone n a pas l API de plein écran : seul « Sur l écran
  d accueil » en donne un vrai. Le bouton « Plein écran » (#fsb) et la carte d aide qui explique la
  manœuvre RESTENT dans le jeu. Ne les retire pas, ne les remplace pas par un appel qui échouera.
- Sur iPhone rien ne se perd quand on améliore le bureau : manche tactile (.s2ctl.on) présent en jeu,
  boutons tactiles présents, message « Tourne ton téléphone » en portrait, réglages tactiles visibles.
- Zoom tactile : base 1,30, excursions à 2,00 puis 1,00 ; sur bureau la base est 1,05.
- Sur le treillis, le serpent et les ennemis suivent les lignes, mais la tête vise librement.
- Mise en scène : orthogonale, puis espace, puis roulis, puis bascule à 30 degrés.
- Musique en flux (<audio> plus createMediaElementSource) : neonvelocity-2.mp3 puis neonvelocity.mp3 en
  boucle. Jamais de decodeAudioData sur ces fichiers, jamais de préchargement complet.
- Difficulté par défaut 1,55, réglable ; réglages persistés dans localStorage sous « snake2030.v1 ».

HONNÊTETÉ DE LA MESURE — LA RÈGLE QUI PRIME SUR TOUTES LES AUTRES
- Quand la spec parle de rendu, mesure la SORTIE RÉELLE : pixels du canevas, images effectivement
  écoulées, DOM rendu, état S. Jamais l état interne seul. Un compteur d appels ne prouve pas qu un
  pixel a changé.
- Mesure par le CHEMIN QUE LE JEU EMPRUNTE, pas seulement avec la bonne grandeur. Déclencher un effet
  depuis une évaluation hors de la boucle d images produit un nombre qui n existe pas en jeu : le pilote
  a ainsi conclu à tort qu un gel d image gelait une image, parce qu il le posait ENTRE deux images là
  où un kill le pose AU MILIEU d une image, avant que la mise à jour des effets ne le vide. Quand une
  spec décrit son protocole (« pose depuis un crochet sur weapons.update », « jamais dans l image de
  pose »), ce protocole fait partie du seuil : le suivre n est pas un détail.
- Si tu compares une API à un pixel, relève les deux DANS LA MÊME IMAGE. Une lecture désynchronisée
  d une capture a déjà produit un faux écart de 104 px qui a coûté une médiation.
- Vérifie les prémisses de la spec avant d implémenter. L audit qui les a écrites a mesuré la mauvaise
  grandeur au moins une fois : il affirmait qu un gel d image ne gelait rien, en regardant les écarts
  entre images de la boucle d affichage, qui restent à 16,7 ms quoi qu il arrive, au lieu du pas de
  temps du jeu. Si une prémisse est fausse, dis-le avec le chiffre.
- Un test qui échoue se rapporte comme un échec, avec la valeur mesurée. N AFFAIBLIS JAMAIS un seuil de
  la spec pour faire passer un test. N invente jamais une mesure. Si tu n as pas réussi à mesurer
  quelque chose, écris que tu ne l as pas mesuré plutôt que de le déduire.
- UNE LECTURE N EST PAS UNE MESURE, ET UN DOUTE N EST PAS UN ÉCART. Relire une valeur du code contre une
  valeur de la spec ne prouve rien tant qu on n a pas vérifié ce que cette valeur SIGNIFIE : le pilote a
  ainsi reproché au code une onde « de 2 000 unités au lieu de 600 » alors que le cinquième argument de
  fx.ring est une vitesse amortie, pas un rayon ; mesurée au pixel, l onde livrée faisait bien 520 unités
  et la « correction » demandée l aurait réduite à 152. Quand tu ne peux pas mesurer, écris « à vérifier »
  et dis comment le vérifier — jamais « écart ». Le coût d un faux signalement n est pas nul : il détourne
  un implémenteur, et une correction appliquée sur sa foi casse ce qu elle prétend réparer.
- UN GARDE-FOU QUI ÉCHOUE EST SUSPECT AVANT LE BUILD. Avant de conclure à une régression, rejoue le même
  contrôle sur le build précédent (« git show HEAD:snake2030/index.html » servi sur un port dédié). Si les
  deux échouent à l identique, le défaut est dans le contrôle. Les deux premiers échecs du garde-fou des
  invariants étaient tous deux les siens : une apostrophe échappée qu il ne savait pas reconnaître, et un
  gabarit de fenêtre passé à un niveau où la bibliothèque l ignore, si bien qu il testait le portrait dans
  une page restée en paysage.
- Si un seuil de la spec est démontrablement inatteignable, écris la démonstration : c est une erreur de
  la spec, pas un manquement du build. C est déjà arrivé une fois.
- Deux mesures simultanées se polluent. Avant toute mesure, attends que « cat /proc/loadavg » soit sous
  0,5 et que ce compte soit à zéro :
      ps -eo args --no-headers | grep -cE "^/opt/node22/bin/node .*(run|banc)\\.mjs" || true
  L ancrage sur « ^/opt/node22/bin/node » n est pas cosmétique. Un motif non ancré compte AUSSI le shell
  qui exécute la vérification, dont la ligne de commande contient le texte cherché : un exécuteur s est
  bloqué neuf minutes sur son propre garde-fou, qui ne pouvait jamais retomber à zéro. Si ton compteur
  reste haut alors que la charge est nulle, c est ce piège — regarde avec « ps -eo pid,args » ce que tu
  comptes vraiment avant de conclure que la machine est occupée.

RÈGLES DE GIT
Jamais « git reset --hard », « git stash », « git checkout <branche> », « git add -A ». Ne touche pas à
snake2030/docs/ ni aux fichiers mp3. Le commit est réservé au médiateur de l objectif.
ÉTAT DU DÉPÔT — SIX OBJECTIFS VALIDÉS ET COMMITÉS, À NE PAS DÉFAIRE
- G1 (d84c20a) Fondations : brouilleur corrigé dans 23-weapons.js ; frame() de 90-boot.js en quarantaine étape par étape et entité par entité (une entité dont update ou draw lève est marquée dead, l erreur journalisée une fois par signature dans window.__ERR) ; render et hud tournent quoi qu il arrive ; ultime en temps de jeu ; batterie de tests versionnée dans snake2030/tools/test/.
- G2 (bde79bd) Mode bureau : S.desktop, contrôles tactiles et plein écran forcé retirés sur bureau, toute fenêtre jouable (SCALE borné pour w/SCALE entre 1000 et 1600), P et Échap pour la pause, F pour le plein écran, pause propre à la perte de focus, ZOOM_BASE 1,05 sur bureau et 1,30 sur téléphone.
- G3 (5686c89) Souris : phases.worldToScreen, pilotage analogique au curseur avec zone morte de 24 px, clic gauche boost, clic droit pouvoir, molette ultime, mode clavier plus souris pour la visée des canons, réticule masqué après 1,5 s, réglage S.opt.mouse.
- G4 (f1a0b5d) Clavier : curseur de focus .kf sur tous les écrans, Entrée et Espace sur l élément focalisé, raccourcis par écran, verrou de 600 ms à l écran de fin, écrans cachés inertes, cartes en vrais boutons, légende .s2keys, capuchons d aide .s2kcap.
- G5 (e389ad3, réserves) Pilotage : treillis au pas 165, virage au nœud franchi (RAIL_BACK 72 u), phases.pending(), demi-tour, panne de boost franche (boostDry), BOOST_FILL 22, arc de boost, phases.visibleExtent(), caméra bornée en bascule.
- G6 (fafb2a0, réserves) Menaces lisibles : _lvPoint tire à hypot(demi-w, demi-h) + 150 et revérifie hors champ ; portail de 600 ms avant chaque apparition (fx.drawScreen, chevron 24 px, son spawnTick, entrée portal dans S.log) ; les quatre types annonceurs n arment que dans le champ, prolongation de 300 ms et chevron clignotant à la sortie de cadre ; trancheur perpendiculaire sur treillis ; artilleur bSpeed 230 et vie de balle 2,2 s ; absorption des balles au-delà du 8e anneau dans collide ; ui.offscreen() pour boss, élites et mines armées.
- Instrument (1f30a81 et 44b55cd) : le banc d essai agrège médiane, p95 et p99 chacun par son propre minimum sur toutes les séries et toutes les passes, et son modèle d ennemi est construit depuis enemies.defs.chaser. Lire son en-tête avant d interpréter un rapport : la dispersion nulle du p95 sur iphone/bascule-charge y est documentée à environ treize pour cent contre quinze de tolérance.
- Avis du pilote versionnés, à lire quand ils concernent ton objectif : snake2030/tools/test/AVIS-PILOTE-*.md et snake2030/tools/test/G6/*.md..