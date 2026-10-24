# Jouabilité et contrôles d'un jeu d'action sur téléphone — état de l'art 2023-2026

Recherche documentaire pour SNAKE 2975 (`proto-neon/`), menée le 17 octobre 2026. Cible : iPhone et Safari (onglet et web app d'écran d'accueil), puis PC et Mac.
Chaque « Test » dit comment un juge répond oui ou non, en jouant sur iPhone ou par mesure (banc à graine fixe, crochets `__SEED` et `__DT`). Les valeurs marquées *non sourcé* sont des points de départ à régler au doigt, pas des faits.
Sources : les pages Apple, MDN et ses données de compatibilité (BCD, lues le 17/10/2026), WebKit (code source), W3C, npm et GitHub ont été lues en entier ; un lien suivi de ° n'a été lu que par extraits de moteur de recherche (page inaccessible depuis l'environnement). « Audit interne » renvoie aux mesures réelles de [snake2030/docs/audit-2026-09.md](../../snake2030/docs/audit-2026-09.md).

## 1. Synthèse en dix lignes

1. Pour diriger d'une main un personnage qui avance sans cesse, le standard 2025-2026 est le manche virtuel flottant : invisible au repos, il naît là où le pouce se pose, sur la plus grande zone possible (Apple HIG 2025, WWDC26). Viser depuis le centre de l'écran, comme le prototype actuel, est à abandonner.
2. Le serpent garde son cap quand on lève le doigt ; zone morte de l'ordre de 10 à 15 % de la course ; origine qui suit le pouce ; virage dès l'image suivante, jamais différé à un nœud de grille.
3. Tir automatique vers l'avant : viser, c'est diriger. Tout le jeu se joue à un pouce ; une action secondaire passe par le manche lui-même (poussée au-delà de 80 %) ou par un second doigt facultatif.
4. Le portrait est le mode « une main » des références (Archero, Survivor.io, Vampire Survivors) ; Safari ne sait pas verrouiller l'orientation : les deux doivent marcher.
5. Prise en main sans texte : cinq secondes sans danger avec un pouce fantôme, deux touchers au plus pour jouer, relance en moins d'une seconde sans faux départ, défis de 1 min 30 à 4 min (session mobile médiane : 5 à 6 min).
6. Mise en arrière-plan = pause immédiate et attente d'un toucher ; au retour, le son doit revenir (état `interrupted` d'iOS, interrupteur silencieux).
7. Game feel : gel d'image proportionné qui n'avale jamais un virage, secousse brève, trois flashs par seconde au plus (WCAG 2.3.1), mode « mouvements réduits » ; chaque événement a son son et son image dans la même image.
8. Pas de vibration web sur iPhone : `navigator.vibrate` n'existe pas dans Safari et l'astuce du `<input switch>` a été corrigée dans iOS 26.5. Le son et l'image portent tout le retour.
9. Plein écran uniquement via l'écran d'accueil (depuis iOS 26, tout site ajouté s'y ouvre en web app), avec `viewport-fit=cover` et les zones sûres ; neutraliser les gestes du navigateur ; la barre d'accueil reste au système.
10. Tout au temps réel (`dt`) : Safari passe à 30 images/s en mode économie d'énergie et plafonne à 60 images/s par défaut sur les écrans 120 Hz.

## 2. Exigences

Priorités : **indispensable** (sans elle, le jeu n'est ni facile ni haut de gamme), **important**, **bonus**. Conditions de test : iPhone récent sous iOS 26 ou plus, en onglet Safari et en web app ; « pouce » = un seul doigt, gauche ou droit.

### 2.1 Diriger le serpent

#### J-01 · Manche flottant, né sous le pouce — indispensable
**Exigence.** En jeu, un appui n'importe où dans la zone jouable pose l'origine du manche sous le doigt ; le cap visé est le vecteur origine → doigt, jamais la position du doigt par rapport au centre de l'écran ou à la tête. **Test :** en portrait puis en paysage, poser le pouce dans chacun des quatre quarts de l'écran et glisser vers le haut : le serpent part vers le haut dans les huit cas.
**Pourquoi.** Apple : « show a virtual thumbstick wherever the player lands their thumb instead of a static thumbstick position », avec « as large of an input area as possible », car le joueur ne sent pas où est son pouce. Le prototype vise aujourd'hui depuis le centre de l'écran ([90-boot.js](../src/90-boot.js), `onTouch`). Sources : [HIG Game controls](https://developer.apple.com/design/human-interface-guidelines/game-controls) ; [Meet with Apple 243](https://developer.apple.com/videos/play/meet-with-apple/243/) ; [Baldauf et al. 2015°](https://publications.ait.ac.at/en/publications/investigating-on-screen-gamepad-designs-for-smartphone-controlled/) (le manche flottant réduit les coups d'œil vers l'appareil, dans une étude où le téléphone pilote un écran distant) ; [nipplejs](https://github.com/yoannmoinet/nipplejs) (mode `dynamic` par défaut).

#### J-02 · Cap conservé au relâcher — indispensable
**Exigence.** Lever le doigt ne change ni le cap ni la vitesse : le serpent file droit à ±2° près tant qu'on ne retouche pas l'écran. **Test :** glisser vers la droite, lever, relever le cap pendant 2 s.
**Pourquoi.** Quand le personnage avance seul, le geste ne sert qu'à tourner ; un retour au neutre au relâcher ferait tourner sans le vouloir. Le prototype remet `S.input.mag` à 0 au `touchend` : le module de jeu doit lire ce zéro comme « garder le cap », jamais comme « revenir au neutre ». Sources : [Nimble Quest vs the D-pads°](https://www.gamedeveloper.com/design/nimble-quest-vs-the-d-pads) ; [Ollie's Arcade – Snake°](https://support.iconfactory.com/kb/ollies-arcade/controls-snake) ; [wiki Slither.io°](https://slitherio-archive.fandom.com/wiki/How_to_boost).

#### J-03 · Zone morte contre le tremblement — indispensable
**Exigence.** Tant que le doigt reste à moins de D de l'origine, le cap visé ne change pas ; au-delà, il suit le doigt sans lissage. D vaut 10 à 15 % du rayon de course R (départ proposé, *non sourcé* : D = 8 px CSS pour R = 60 px CSS). **Test :** pouce posé immobile 3 s → dérive du cap inférieure à 2° ; glisser de D + 2 px → le serpent tourne.
**Pourquoi.** Aucune valeur publiée pour un manche tactile ; des outils répandus donnent l'ordre de grandeur : Unity Input System, zone morte 0,125 et saturation 0,925 par défaut ; nipplejs, seuil directionnel 0,1 et cercle de 100 px. Sources : [Unity InputSettings.cs](https://github.com/Unity-Technologies/InputSystem/blob/develop/Packages/com.unity.inputsystem/InputSystem/Runtime/InputSettings.cs) ; [nipplejs](https://github.com/yoannmoinet/nipplejs).

#### J-04 · Origine qui suit, doigt propriétaire — important
**Exigence.** Si le doigt dépasse R, l'origine est traînée derrière lui à distance R : un demi-tour ne demande jamais plus de 2R de course. Le manche appartient au premier doigt (suivi par `identifier`) : un second doigt ne déplace pas l'origine et lever le premier ne fait pas sauter le cap. **Test :** glisser de 200 px vers la droite puis revenir → inversion après au plus 2R + D ; poser puis lever un second doigt → cap inchangé.
**Pourquoi.** Évite que le pouce dérive loin de l'origine au fil d'une longue partie. Le prototype lit `e.touches[0]`, qui change de doigt quand le premier se lève. Sources : [nipplejs, option `follow`](https://github.com/yoannmoinet/nipplejs) ; [Unity OnScreenStick, `ExactPositionWithDynamicOrigin`](https://github.com/Unity-Technologies/InputSystem/blob/develop/Packages/com.unity.inputsystem/InputSystem/Runtime/Plugins/OnScreen/OnScreenStick.cs).

#### J-05 · Une image de latence — indispensable
**Exigence.** Le premier appel de boucle (`requestAnimationFrame`) qui suit un événement tactile change déjà le cap ; aucune file d'attente ni aucun filtre ne retarde le début d'un virage. **Test :** horodater l'événement et l'image où le cap bouge (le banc de snake2030 mesurait 1 image au doigt).
**Pourquoi.** La confiance dans les commandes est la clé du tactile : elles doivent répondre à chaque fois (Zach Gage) ; la performance baisse quand la latence monte, et les appareils du commerce étudiés en 2013 allaient jusqu'à 125 ms (Jota et al.). Sources : [GDC 2012, Controls You Can Feel°](https://gdcvault.com/play/1015404/Controls-You-Can-Feel-Putting) ; [compte rendu Giant Bomb°](https://giantbomb.com/posts/the-path-to-better-touch-controls) ; [Jota et al., CHI 2013°](https://doi.org/10.1145/2470654.2481317) ; [audit interne](../../snake2030/docs/audit-2026-09.md).

#### J-06 · Virage franc, jamais différé — indispensable
**Exigence.** Pilotage libre : 90° en 350 ms au plus. Si un mode sur grille existe : une case parcourue en 100 ms au plus (*non sourcé*) et les deux virages suivants mis en file, aucun perdu. **Test :** 20 virages scriptés à positions aléatoires, délai demande → virage relevé.
**Pourquoi.** Dans snake2030, le pilotage libre tournait de 90° en 19 à 21 images (≈ 340 ms, jugé excellent), mais sur les rails le virage attendait le nœud suivant : 700 ms médians, 1,85 s au pire, classé bloquant. Ollie's Arcade enchaîne les virages en glissant sans lever le doigt. Sources : [audit interne](../../snake2030/docs/audit-2026-09.md) ; [Ollie's Arcade – Snake°](https://support.iconfactory.com/kb/ollies-arcade/controls-snake).

#### J-07 · Tout le jeu à un pouce — indispensable
**Exigence.** De l'écran-titre à « rejouer », tout se fait avec un seul pouce, gauche ou droit, téléphone tenu d'une main en portrait ; aucune action n'exige deux doigts. **Test :** une droitière puis une gauchère finissent un défi d'une seule main.
**Pourquoi.** Archero et Survivor.io partagent « a one-finger control setup and auto-aim » ; Hoober a observé 49 % d'usages à une main, pouce gauche dans un tiers de ces cas. Sources : [Naavik°](https://naavik.co/deep-dives/survivorio-archeros-footsteps/) ; [Hoober 2013°](https://uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php) ; [TouchArcade, Vampire Survivors°](https://toucharcade.com/2022/12/09/vampire-survivors-mobile-review-controller-cloud-save-sync-dlc-unlock-iphone-ipad-pro/).

#### J-08 · Action secondaire sans bouton à chercher — important
**Exigence.** Une éventuelle accélération ou un pouvoir se déclenche en poussant le manche au-delà de 80 % de R, ou par un second doigt posé n'importe où ; jamais par un bouton fixe que le pouce doit aller chercher. **Test :** déclencher l'action dix fois de suite sans que le pouce quitte sa zone.
**Pourquoi.** Apple montre un sprint commandé par l'inclinaison du manche (au-delà de 0,8, vitesse × 1,3 : « No second finger is required! ») et conseille de fondre les actions en un seul contrôle (double toucher, appui long). Sources : [WWDC26 358](https://developer.apple.com/videos/play/wwdc2026/358/) ; [HIG Game controls](https://developer.apple.com/design/human-interface-guidelines/game-controls) ; [Meet with Apple 243](https://developer.apple.com/videos/play/meet-with-apple/243/).

#### J-09 · Commandes invisibles au repos, retour visible sous le pouce — important
**Exigence.** Rien n'est dessiné tant que l'écran n'est pas touché ; pendant l'appui, origine et plot apparaissent avec un halo qui déborde du pouce ; en portrait, la caméra garde la tête hors du quart inférieur de l'écran (*non sourcé*). **Test :** captures : aucun contrôle au repos ; tête dans le quart bas sur moins de 5 % des images.
**Pourquoi.** Apple : cacher le déplacement jusqu'au toucher, un état pressé visible même sous le doigt, le centre libre pour le personnage. Dans snake2030, 62 % des images avaient un ennemi sous un contrôle ou sous le HUD. Sources : [HIG Game controls](https://developer.apple.com/design/human-interface-guidelines/game-controls) ; [WWDC26 358](https://developer.apple.com/videos/play/wwdc2026/358/) ; [audit interne](../../snake2030/docs/audit-2026-09.md).

### 2.2 Tirer

#### J-10 · Tir automatique vers l'avant — indispensable
**Exigence.** Le tir part seul, vers l'avant, moins d'1 s après la prise de contrôle (snake2030 : 0,8 s) et sans aucun bouton : viser, c'est diriger. **Test :** lancer une partie sans toucher l'écran : le serpent tire.
**Pourquoi.** Les succès du genre automatisent l'attaque (Vampire Survivors, Survivor.io ; Brotato par défaut, visée manuelle en option) ; « ne tirer qu'à l'arrêt » (Archero, Squad Busters) est impossible pour un serpent qui ne s'arrête jamais. Sources : [Naavik°](https://naavik.co/deep-dives/survivorio-archeros-footsteps/) ; [TalkAndroid°](https://www.talkandroid.com/24372-survivor-io-ultimate-game-guide-with-tips-2023/) ; [games.gg°](https://games.gg/archero/) ; [Brotato, Wikipédia°](https://en.wikipedia.org/wiki/Brotato).

#### J-11 · Jouer rapporte plus que ne rien faire — indispensable
**Exigence.** Sur 10 graines, un robot qui ne touche jamais l'écran fait moins de 30 % du score d'un robot simple qui va vers l'énergie la plus proche (seuil *non sourcé*). **Test :** banc à graine fixe.
**Pourquoi.** Avec le tir automatique, snake2030 récompensait l'inaction : 439 et 574 points sans toucher l'écran, contre 123 et 121 en jouant. Source : [audit interne](../../snake2030/docs/audit-2026-09.md).

### 2.3 Orientation, prise en main, rythme

#### J-12 · Portrait et paysage — indispensable
**Exigence.** Le jeu est complet dans les deux orientations, sans voile « tourne ton téléphone » ; une rotation en pleine partie met en pause (J-18) puis reprend sans perte d'état ni élément hors écran. **Test :** cinq rotations pendant un défi.
**Pourquoi.** Safari ne peut pas verrouiller l'orientation (`screen.orientation.lock()` absent, champ `orientation` du manifeste ignoré sur iOS) ; le portrait est le mode une main des références, et Vampire Survivors démarre en portrait avec le paysage en option ; WCAG 1.3.4 demande de ne pas imposer d'orientation. Sources : [MDN lock()](https://developer.mozilla.org/en-US/docs/Web/API/ScreenOrientation/lock) ; [MDN manifeste orientation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/orientation) ; [TouchArcade°](https://toucharcade.com/2022/12/09/vampire-survivors-mobile-review-controller-cloud-save-sync-dlc-unlock-iphone-ipad-pro/) ; [WCAG 1.3.4](https://www.w3.org/WAI/WCAG22/Understanding/orientation.html) ; [Game Accessibility Guidelines°](https://gameaccessibilityguidelines.com/allow-play-in-both-landscape-and-portrait/).

#### J-13 · Jouer en deux touchers — indispensable
**Exigence.** Page chargée, deux touchers au plus mènent au serpent contrôlable ; toute cinématique et tout interlude cèdent au premier toucher. **Test :** compter les touchers et chronométrer depuis un démarrage à froid.
**Pourquoi.** Apple : « Jump into gameplay », « Let people cancel motion », un écran de démarrage qui dure « just long enough » ; snake2030 passait de JOUER au jeu en 541 à 583 ms. Sources : [HIG Designing for games](https://developer.apple.com/design/human-interface-guidelines/designing-for-games) ; [HIG Motion](https://developer.apple.com/design/human-interface-guidelines/motion) ; [HIG Onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding) ; [audit interne](../../snake2030/docs/audit-2026-09.md).

#### J-14 · Comprendre en cinq secondes, sans lire — indispensable
**Exigence.** À la toute première partie, 5 s sans ennemi ni dégât possible ; un pouce fantôme animé mime le geste et s'efface au premier virage de plus de 45° (*non sourcé*) ; le premier ennemi n'arrive qu'après ce virage. **Test :** une personne qui n'a jamais joué tourne dans les 5 s sans lire de texte ; le délai est journalisé.
**Pourquoi.** Apple : « Teach through play », « Teach through interactivity » ; [DIRECTION.md](../DIRECTION.md) vise « on comprend en cinq secondes » ; dans snake2030, 7 parties sur 7 finissaient au niveau 1 sans qu'aucun mécanisme ait été enseigné. Sources : [HIG Designing for games](https://developer.apple.com/design/human-interface-guidelines/designing-for-games) ; [HIG Onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding) ; [audit interne](../../snake2030/docs/audit-2026-09.md).

#### J-15 · Calme, gros bordel, respiration — important
**Exigence.** En campagne, le nombre d'ennemis vivants, relevé par tranches de 10 s, redescend d'au moins 40 % après chaque pic avant le suivant ; le prototype de deux minutes garde, lui, sa montée continue (critère 6 de DIRECTION.md). **Test :** journal du banc sur cinq défis.
**Pourquoi.** C'est la demande de la direction artistique ; aucune source chiffrée n'a été trouvée sur la forme idéale de la courbe : les 10 s et 40 % sont *non sourcés*, à régler en jouant. Source : [DIRECTION.md](../DIRECTION.md).

#### J-16 · Des défis courts — important
**Exigence.** Un défi nommé se conclut, réussi ou raté et affiché comme tel, entre 1 min 30 et 4 min ; ouverture, défi et écran de fin tiennent en moins de 6 min. **Test :** chronométrer cinq défis.
**Pourquoi.** Session mobile médiane de 5 à 6 min en 2024, 8 à 9 min pour le quart supérieur (GameAnalytics) ; environ 170 s en hypercasual (Appodeal, Android). La fourchette en est déduite (*non sourcée* telle quelle) ; les parties de Survivor.io (15 min) et de Vampire Survivors (30 min) relèvent d'un autre format. Sources : [GameAnalytics 2025°](https://gamedevreports.substack.com/p/gameanalytics-mobile-gaming-benchmarks) ; [Appodeal 2025°](https://files.gameindustrylibrary.com/documents/mobile-casual-benchmarks-report-2025.pdf) ; [PocketGamer.biz°](https://www.pocketgamer.biz/feature/79592/how-innovation-and-iteration-has-transformed-survivorio/) ; [Tampere Playlab°](https://www.tuni.fi/playlab/objective-survive-vampire-survivors).

#### J-17 · Relance instantanée, sans faux départ — indispensable
**Exigence.** À la mort, l'écran de fin (score, défi réussi ou raté) apparaît en moins d'1 s ; REJOUER rend un serpent contrôlable en moins d'1 s ; le doigt posé au moment de la mort ne compte pas, et REJOUER n'accepte un nouveau toucher qu'après 400 ms (garde *non sourcée*). **Test :** mourir pouce posé → aucune relance ; chronométrer la relance.
**Pourquoi.** La relance immédiate rend l'échec supportable (Super Meat Boy) ; snake2030 relançait déjà en moins de 600 ms. Sources : [Game Informer°](https://gameinformer.com/b/features/archive/2011/01/07/video-game-stress-relievers.aspx) ; [HIG Motion](https://developer.apple.com/design/human-interface-guidelines/motion) ; [audit interne](../../snake2030/docs/audit-2026-09.md).

#### J-18 · Pause automatique — indispensable
**Exigence.** Dès que la page devient cachée (`visibilitychange` → `hidden` : écran d'accueil, appel, verrouillage) ou, sur ordinateur, perd le focus, le jeu se fige et la musique se coupe ; au retour, un écran PAUSE attend un toucher : le jeu ne repart jamais seul. **Test :** en plein chaos, écran d'accueil 10 s puis retour : même état, aucun dégât subi.
**Pourquoi.** Apple : un jeu « needs to pause automatically when people leave the experience » ; les navigateurs cessent d'appeler `requestAnimationFrame` en arrière-plan, et sans pause explicite la partie repartirait sans prévenir au retour. Sources : [HIG Going full screen](https://developer.apple.com/design/human-interface-guidelines/going-full-screen) ; [MDN Page Visibility](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API).

#### J-19 · Le son revient toujours — indispensable
**Exigence.** Le premier toucher démarre l'audio ; après chaque retour d'arrière-plan, appel ou verrouillage, le son revient moins d'1 s après le toucher « reprendre » (traiter l'état `interrupted`, repli `suspend()` puis `resume()`). **Test :** trois cycles verrouillage/déverrouillage, son présent à chaque fois.
**Pourquoi.** Web Audio ne démarre que dans un geste de l'utilisatrice ; iOS met l'`AudioContext` en `interrupted` hors du contrôle de la page, et des rapports WebKit de 2024 décrivent des contextes qui ne repartent pas seuls. Sources : [MDN Autoplay](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay) ; [MDN BaseAudioContext.state](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/state) ; [WebKit 276016°](https://bugs.webkit.org/show_bug.cgi?id=276016).

#### J-20 · Interrupteur silencieux assumé — important
**Exigence.** Par défaut, l'audio reste `ambient` (il respecte l'interrupteur silencieux et n'interrompt pas la musique de la joueuse) ; un réglage « Son même en silencieux » passe `navigator.audioSession.type` à `'playback'`. **Test :** iPhone en silencieux, réglage actif → son audible ; réglage inactif → la musique d'une autre app continue.
**Pourquoi.** Un `AudioContext` est `ambient` par défaut ; sous iOS, `ambient` est coupé par l'interrupteur, `playback` ne l'est pas mais met en pause les autres lectures ; l'API existe depuis Safari 16.4. Sans ce réglage, une joueuse en silencieux croit le jeu muet (à vérifier sur appareil). Sources : [MDN Audio Session API](https://developer.mozilla.org/en-US/docs/Web/API/Audio_Session_API) ; [MDN AudioSession.type](https://developer.mozilla.org/en-US/docs/Web/API/AudioSession/type) ; [Apple, ambient](https://developer.apple.com/documentation/avfaudio/avaudiosession/category-swift.struct/ambient) ; [Apple, playback](https://developer.apple.com/documentation/avfaudio/avaudiosession/category-swift.struct/playback) ; [WebKit 264473°](https://bugs.webkit.org/show_bug.cgi?id=264473).

### 2.4 Game feel

#### J-21 · Gel d'image proportionné, entrée préservée — important
**Exigence.** Le gel croît avec l'importance de l'événement (départ *non sourcé* : petit ennemi 0 à 1 image, gros 4 à 6, colosse 10 à 16) ; un virage demandé pendant un gel s'applique à la première image qui suit, jamais perdu. **Test :** demander un virage pendant un gel de 10 images → cap modifié à l'image 11.
**Pourquoi.** Gel d'image, cohérence du son et caméra pèsent le plus sur la sensation d'impact (Lin et al. 2022, étude corrélationnelle) ; Smash Bros. gèle plus longtemps les coups plus forts (8 images à 15 % de dégâts dans Melee, 15 dans Ultimate). Sources : [Lin et al.°](https://arxiv.org/abs/2208.06155) ; [SmashWiki, Hitlag°](https://www.ssbwiki.com/Hitlag) ; [Sakurai, Famitsu°](https://sourcegaming.info/2015/11/11/thoughts-on-hitstop-sakurais-famitsu-column-vol-490-1/).

#### J-22 · Secousses brèves, flashs bornés — indispensable
**Exigence.** Jamais plus de trois flashs de grande surface par seconde, et aucun flash rouge ou magenta saturé répété ; la secousse retombe en moins de 400 ms (*non sourcé*) et la tête reste à l'écran. **Test :** analyse des captures d'une chaîne d'explosions : au plus 3 inversions de luminance de grande surface par fenêtre d'1 s.
**Pourquoi.** WCAG 2.3.1 cite justement les « close-ups of rapid-fire explosions » et note une sensibilité accrue au rouge ; la secousse est un outil d'impact (Nijman, 2013) qu'Apple veut bref et précis. Sources : [WCAG 2.3.1](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html) ; [Game Feel, Bayreuth°](https://medienwissenschaft.uni-bayreuth.de/wp-content/uploads/GxD-10-Game-Feel.pdf) ; [HIG Motion](https://developer.apple.com/design/human-interface-guidelines/motion).

#### J-23 · Mouvements réduits — important
**Exigence.** Si « Réduire les animations » est actif dans iOS (`prefers-reduced-motion: reduce`), secousse et flashs plein écran sont coupés par défaut ; un réglage « Secousses : fortes / douces / aucune » existe. **Test :** activer le réglage iOS → aucun déplacement de caméra lors d'un gros kill.
**Pourquoi.** Apple : « Make motion optional », et choisir les réglages par défaut d'après l'accessibilité de l'appareil ; WCAG 2.3.3 ; Safari iOS gère cette requête média. Sources : [HIG Motion](https://developer.apple.com/design/human-interface-guidelines/motion) ; [HIG Designing for games](https://developer.apple.com/design/human-interface-guidelines/designing-for-games) ; [MDN prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion) ; [WCAG 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html).

#### J-24 · Son et image dans la même image — indispensable
**Exigence.** Tir, kill, gros kill, dégât, butin, défi réussi, défi raté : chacun déclenche un son distinct et un effet visuel dans la même image de jeu ; un dégât montre d'où il vient. **Test :** instrumenter `N.music.sfx` et `N.fx` : même numéro d'image pour les sept événements.
**Pourquoi.** Sans vibration sur iPhone (J-25), son et image portent seuls le retour ; Apple veut des retours visuels, sonores et tactiles en harmonie, et la cohérence du son pèse sur l'impact. Sources : [HIG Playing haptics](https://developer.apple.com/design/human-interface-guidelines/playing-haptics) ; [HIG Game controls](https://developer.apple.com/design/human-interface-guidelines/game-controls) ; [Lin et al.°](https://arxiv.org/abs/2208.06155).

#### J-25 · Rien ne dépend de la vibration — indispensable
**Exigence.** Le jeu est entièrement lisible sans haptique ; `navigator.vibrate` n'est appelé que s'il existe (Chrome Android, après un geste), derrière un réglage « Vibrations » affiché seulement là où il marche ; aucun détournement de `<input switch>`. Bonus : grondement de manette sur Mac (`vibrationActuator`, Safari macOS 16.4+, absent d'iOS). **Test :** sur iPhone, aucun réglage « Vibrations » et zéro erreur.
**Pourquoi.** Safari iOS n'a jamais pris en charge `navigator.vibrate` ; l'astuce du commutateur (Safari 17.4) ne marchait par script que d'iOS 17.4 à 26.4 (« apple patched it in ios 26.5 ») et la version actuelle de la bibliothèque ne relaie plus qu'un vrai toucher. Sources : [MDN vibrate](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate) ; [ios-haptics 3.1.1](https://www.npmjs.com/package/ios-haptics/v/3.1.1) ; [ios-haptics](https://github.com/tijnjh/ios-haptics) ; [BCD Gamepad](https://github.com/mdn/browser-compat-data/blob/main/api/Gamepad.json) ; [HIG Playing haptics](https://developer.apple.com/design/human-interface-guidelines/playing-haptics).

### 2.5 Web sur iPhone

#### J-26 · Plein écran par l'écran d'accueil — indispensable
**Exigence.** Manifeste `display: "standalone"` (pas `fullscreen`, ignoré par iOS), `viewport-fit=cover`, `apple-mobile-web-app-status-bar-style` à `black-translucent` ; ajouté à l'écran d'accueil, le jeu s'ouvre sans interface Safari et le monde couvre tout l'écran, barre d'état comprise ; dans un onglet, une image montre une seule fois « Partager → Sur l'écran d'accueil ». **Test :** ajouter, ouvrir : ni barre Safari, ni bande noire.
**Pourquoi.** `requestFullscreen()` n'existe que sur iPad, et un glissement vers le bas en sort (« unsuitable for some use cases like games ») ; depuis iOS 26, tout site ajouté à l'écran d'accueil s'ouvre en web app. Sources : [MDN requestFullscreen](https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen) ; [MDN manifeste display](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/display) ; [WebKit, Safari 26°](https://webkit.org/?p=16993) ; [Apple, Configuring Web Applications](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html) ; [MDN viewport](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/viewport).

#### J-27 · Zones sûres — indispensable
**Exigence.** HUD, boutons et textes restent dans `env(safe-area-inset-*)` dans les deux orientations ; le monde du jeu, lui, va jusqu'aux bords ; aucune action n'exige de toucher dans ces marges. **Test :** iPhone à îlot dynamique, paysage des deux côtés : aucun élément d'interface sous l'îlot, dans les coins ou sur la barre d'accueil.
**Pourquoi.** Apple : ne pas chevaucher l'indicateur d'accueil ni l'îlot dynamique, utiliser tout l'écran, le letterbox en dernier recours ; `env()` est l'outil web prévu pour cela. Sources : [HIG Game controls](https://developer.apple.com/design/human-interface-guidelines/game-controls) ; [Meet with Apple 243](https://developer.apple.com/videos/play/meet-with-apple/243/) ; [MDN env()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env) ; [HIG Layout](https://developer.apple.com/design/human-interface-guidelines/layout).

#### J-28 · Gestes du navigateur neutralisés — indispensable
**Exigence.** Sur la surface de jeu : `touch-action: none`, écouteurs `touchstart` et `touchmove` non passifs avec `preventDefault()`, `-webkit-user-select: none`, `-webkit-touch-callout: none`, `overscroll-behavior: none`. Résultat : ni défilement, ni zoom, ni loupe ou sélection au toucher long, ni « Précédent » par balayage du bord dans un onglet. **Test :** 50 balayages partant à moins de 10 px de chaque bord, en onglet et en web app.
**Pourquoi.** `touch-action` et `preventDefault()` reprennent les gestes au navigateur ; bloquer `touchstart` arrête les gestes de navigation depuis iOS 13.4 ; la barre d'accueil reste au système : seule une app native peut différer ces gestes (`preferredScreenEdgesDeferringSystemGestures`), aucun équivalent web trouvé. Sources : [MDN touch-action](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action) ; [pqina°](https://pqina.nl/blog/blocking-navigation-gestures-on-ios-13-4/) ; [HIG Going full screen](https://developer.apple.com/design/human-interface-guidelines/going-full-screen) ; [BCD, propriétés CSS](https://github.com/mdn/browser-compat-data/tree/main/css/properties).

#### J-29 · Indépendant de la fréquence d'images — indispensable
**Exigence.** À 30 et à 60 images/s (`__DT` = 1/30 puis 1/60), la distance parcourue par seconde et la vitesse de virage diffèrent de moins de 2 % (*non sourcé*), et J-05 tient toujours. **Test :** banc à graine fixe, deux pas de temps.
**Pourquoi.** En mode économie d'énergie, Safari iOS plafonne `requestAnimationFrame` à 30 images/s, volontairement ; sur écran 120 Hz, WebKit vise 60 images/s par défaut (`PreferPageRenderingUpdatesNear60FPSEnabled`). Sources : [WebKit 215745°](https://bugs.webkit.org/show_bug.cgi?id=215745) ; [WebKit, UnifiedWebPreferences.yaml](https://github.com/WebKit/WebKit/blob/main/Source/WTF/Scripts/Preferences/UnifiedWebPreferences.yaml) ; [HIG Motion](https://developer.apple.com/design/human-interface-guidelines/motion).

#### J-30 · Cibles et textes à la bonne taille — important
**Exigence.** Tout bouton d'interface fait au moins 44 × 44 px CSS (28 px pour un menu secondaire) ; tout texte à lire utilise la police 5×7 à px ≥ 2, soit des capitales de 14 px CSS. **Test :** mesure sur captures iPhone.
**Pourquoi.** Apple : 44 × 44 pt pour les commandes fréquentes, 28 pt au minimum, texte de 11 pt au moins (17 pt par défaut) ; WCAG 2.5.8 : 24 px CSS minimum. Les équivalences pt ↔ px CSS et capitales ↔ corps de texte sont des approximations *non sourcées*. Sources : [HIG Designing for games](https://developer.apple.com/design/human-interface-guidelines/designing-for-games) ; [HIG Game controls](https://developer.apple.com/design/human-interface-guidelines/game-controls) ; [WCAG 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

### 2.6 PC, Mac et réglages

#### J-31 · Clavier et manette sur PC et Mac — important
**Exigence.** Sans écran tactile, aucun contrôle tactile n'est dessiné ; flèches, ZQSD et WASD dirigent, Espace = action principale, Échap ou P = pause, Entrée = valider ; une manette (Gamepad API) dirige au stick gauche et à la croix ; la perte de focus met en pause. **Test :** finir un défi sur Mac sans souris, puis à la manette.
**Pourquoi.** Apple : commandes à une touche, action principale sur Espace, touches personnalisables ; Gamepad API dans Safari depuis 10.1, iOS compris ; snake2030 dessinait ses contrôles tactiles sur bureau (défaut majeur). Sources : [HIG Game controls](https://developer.apple.com/design/human-interface-guidelines/game-controls) ; [BCD Gamepad](https://github.com/mdn/browser-compat-data/blob/main/api/Gamepad.json) ; [audit interne](../../snake2030/docs/audit-2026-09.md).

#### J-32 · Peu de réglages, tous utiles — bonus
**Exigence.** Un seul écran de réglages, six lignes au plus (taille du manche, secousses, son en silencieux, vibrations si disponibles, musique, effets) (*non sourcé*). **Test :** compter les lignes.
**Pourquoi.** Chez Pik-Pok, chacune des quatre dispositions proposées était choisie par environ 25 % des joueurs : le choix compte ; Apple conseille de laisser régler commandes, intensité des mouvements et balance sonore ; snake2030 alignait 18 lignes sur 4 écrans (défaut majeur). Sources : [Game Accessibility Guidelines°](https://gameaccessibilityguidelines.com/allow-interfaces-to-be-rearranged/) ; [HIG Designing for games](https://developer.apple.com/design/human-interface-guidelines/designing-for-games) ; [audit interne](../../snake2030/docs/audit-2026-09.md).

#### J-33 · Cap visé visible — bonus
**Exigence.** Quand le cap visé diffère du cap réel de plus de 20°, un chevron cyan de 3 pixels de jeu montre la direction visée devant la tête (valeurs *non sourcées*). **Test :** captures pendant un virage.
**Pourquoi.** Le doigt cache le manche : un retour d'entrée près de la tête rassure ; Apple insiste sur l'état pressé et les retours riches. Sources : [WWDC26 358](https://developer.apple.com/videos/play/wwdc2026/358/) ; [HIG Game controls](https://developer.apple.com/design/human-interface-guidelines/game-controls).

## 3. Jeux de référence et ce qu'on leur prend

- **Survivor.io** (Habby, 2022) : un doigt, manche, attaque automatique, portrait, parties de 15 min. On prend le pouce unique, le tir automatique et le choix d'améliorations entre deux vagues. [Naavik°](https://naavik.co/deep-dives/survivorio-archeros-footsteps/), [TalkAndroid°](https://www.talkandroid.com/24372-survivor-io-ultimate-game-guide-with-tips-2023/), [PocketGamer.biz°](https://www.pocketgamer.biz/feature/79592/how-innovation-and-iteration-has-transformed-survivorio/)
- **Archero** (Habby) : « one-finger control setup and auto-aim », mais l'archer ne tire qu'à l'arrêt. On prend la visée automatique et la lisibilité, pas le « stop pour tirer ». [Naavik°](https://naavik.co/deep-dives/survivorio-archeros-footsteps/), [games.gg°](https://games.gg/archero/)
- **Vampire Survivors** (poncle, mobile en décembre 2022) : zéro bouton, démarrage en portrait, paysage dans les options ; reproche des critiques : manche tactile moins réactif qu'un vrai stick, d'où le soin de J-03 à J-05. [TouchArcade°](https://toucharcade.com/2022/12/09/vampire-survivors-mobile-review-controller-cloud-save-sync-dlc-unlock-iphone-ipad-pro/), [Common Sense Media°](https://www.commonsensemedia.org/app-reviews/vampire-survivors)
- **Brotato** (mobile, mars 2023) : tir automatique par défaut, visée manuelle en option pour les expertes. [Wikipédia°](https://en.wikipedia.org/wiki/Brotato), [Pocket Gamer°](https://www.pocketgamer.com/brotato/release/)
- **Squad Busters** (Supercell, 2024) : manche et attaque automatique à l'arrêt, jouable d'une main ; Supercell en a annoncé l'arrêt (serveurs coupés courant 2026) : de bons contrôles ne sauvent pas une boucle d'apprentissage faible. [mobidictum°](https://mobidictum.com/squad-busters-has-been-released/), [Deconstructor of Fun°](https://deconstructoroffun.com/blog/2024/5/26/squad-busters-supercell-hits-the-apex-or-spins-off-track), [mobilegamer.biz°](https://mobilegamer.biz/why-not-just-keep-squad-busters-alive-but-on-autopilot-supercell-explains/)
- **Slither.io** : par défaut on appuie dans la direction voulue, donc par rapport à la tête au centre de l'écran (déduction) ; manche en option en bas à gauche ou à droite, bouton d'accélération de l'autre côté. On prend l'option manche, pas le défaut. [wiki°](https://slitherio-archive.fandom.com/wiki/How_to_boost), [Xataka°](https://www.xatakandroid.com/aplicaciones-android/slither-io-vuelve-a-estar-disponible-en-google-play-y-viene-con-varias-novedades)
- **Snake.io** : manche pour gaucher ou droitier, un seul bouton d'accélération qui coûte de la longueur (bon risque-récompense) ; sur PC, souris ou WASD et flèches, clic ou Espace : parité PC-mobile. [fiche°](https://toucharcade.com/games/snake-io-fun-online-snake), [Xbox°](https://www.xbox.com/en-US/games/store/snakeio/9NKVC0G99GPQ)
- **Snake Clash!** (Supercent) : on dirige en glissant le doigt, le serpent avance sans cesse ; le glisser libre suffit à un succès hybride-casual. [App Store°](https://apps.apple.com/bb/app/snake-clash/id6449243946), [BlueStacks°](https://www.bluestacks.com/th/apps/action/snake-clash-on-pc.html)
- **Snake Rivals** (Supersolid) : balayage pour tourner, bouton d'accélération ; sources faibles. [fptshop°](https://fptshop.com.vn/tin-tuc/giai-tri/snake-rivals-198238)
- **Nimble Quest** (NimbleBit, 2013) : balayage pour tourner, héros qui attaquent seuls ; les « quatre directions » sont en fait deux virages à 90° : c'est le modèle si SNAKE 2975 garde une grille. [Game Developer°](https://www.gamedeveloper.com/design/nimble-quest-vs-the-d-pads), [PocketGamer°](https://www.pocketgamer.co.uk/nimble-quest/how-to-walk-the-walk-in-nimble-quest-hints-tips-and-tricks/)
- **Ollie's Arcade – Snake** (Iconfactory, 2023) : balayage n'importe où, ou glisser sans lever le doigt pour enchaîner les virages ; pas de croix virtuelle ; manette et clavier. [Iconfactory°](https://support.iconfactory.com/kb/ollies-arcade/controls-snake)

## 4. Pièges à éviter

- **Viser depuis le centre de l'écran** (prototype actuel) : le pouce couvre le jeu et doit traverser l'écran pour aller vers le haut ou vers le côté opposé ; Apple recommande l'inverse (J-01). Les zones gauche/droite pour tourner ne font pas mieux : ce sont les boutons directionnels qui demandent le plus d'attention ([Baldauf°](https://publications.ait.ac.at/en/publications/investigating-on-screen-gamepad-designs-for-smartphone-controlled/)), et aucune source trouvée ne les recommande pour ce genre.
- **Le pavé relatif façon volant** : Apple le réserve à la caméra ; pour le déplacement, c'est le manche ([WWDC26 358](https://developer.apple.com/videos/play/wwdc2026/358/)).
- **Manche fixe et boutons dessinés en permanence** : 62 % des images de snake2030 avaient un ennemi dessous (J-09).
- **Virage différé à une case ou un nœud** : 700 ms médians dans snake2030, bloquant (J-06).
- **Tir automatique qui rend l'inaction rentable** (J-11).
- **Croire au plein écran du navigateur** : pas de `requestFullscreen()` sur iPhone ; `display: "fullscreen"` et `orientation` du manifeste sont ignorés par iOS, or [snake2030/manifest.json](../../snake2030/manifest.json) déclare les deux (J-26).
- **Imposer le paysage par un voile** : rien ne verrouille l'orientation, et le voile de snake2030 rendait JOUER incliquable dans une demi-fenêtre de bureau (J-12).
- **Promettre des vibrations sur iPhone** : `navigator.vibrate` absent, astuce du `switch` corrigée en iOS 26.5 (J-25).
- **Le silence inexpliqué** : interrupteur silencieux, `AudioContext` resté `interrupted` (J-19, J-20).
- **La relance par le pouce encore posé** au moment de la mort (J-17, *non sourcé*).
- **Le gel d'image qui avale un virage** et **la chaîne d'explosions stroboscopique** (J-21, J-22).
- **La vitesse liée aux images** : en mode économie d'énergie, le jeu tournerait deux fois moins vite (J-29).
- **Les gestes système** : balayage du bord (Précédent en onglet), barre d'accueil, centres de notifications et de contrôle depuis le haut ; une page web ne peut pas les différer (J-27, J-28). Un forum Apple rapporte même un « Accès facile » déclenché en plein jeu natif par un balayage vers le bas près de la barre d'accueil ([forum°](https://developer.apple.com/forums/thread/797889)).
- **Le tutoriel à lire et les réglages pléthoriques** (J-14, J-32).
- **Ne tester que dans un onglet Safari** : la web app d'écran d'accueil se comporte autrement (exemple : Wake Lock n'y marchait pas avant iOS 18.4, d'après la BCD) ; tester les deux, sur un vrai iPhone, mode économie d'énergie compris.

## Limites de cette recherche

- Aucune donnée chiffrée fiable sur la part des jeux mobiles en portrait, ni sur la zone morte ou le rayon idéaux d'un manche tactile : ces valeurs sont marquées *non sourcé*.
- Aucune conférence GDC 2023-2026 consacrée aux contrôles tactiles d'un jeu d'action n'a été trouvée ; la référence GDC citée date de 2012. Les sources Apple de 2025-2026 (HIG mises à jour le 9 juin 2025, WWDC26) sont les plus récentes et les plus précises.
- Les fiches de jeux reposent sur des critiques, guides et fiches de boutique (°) ; aucune n'a été vérifiée manette en main.
