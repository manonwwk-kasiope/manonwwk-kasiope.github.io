# SNAKE 2975 — game design d'une campagne d'arcade mobile qui retient

Recherche documentaire du 17 octobre 2026 pour la refonte `proto-neon/`. Elle ne remplace ni `DIRECTION.md` ni `CONTRAT.md`.

**Méthode et limites.** Recherche par moteur de recherche web. L'ouverture directe des pages a échoué (erreur DNS de l'outil de lecture) : les chiffres viennent des extraits indexés des pages citées et sont à revérifier avant d'en faire une norme. Le quota de recherches a été épuisé en fin d'enquête. Aucune source primaire trouvée pour : le système musical adaptatif de Hades, le détail technique de celui de DOOM (2016), la liste complète des 30 réglages de « The Art of Screenshake », une mesure du haut-parleur d'iPhone. La mention *(proposé)* signale un seuil de conception sans source ; tout autre chiffre vient de la source citée, ou d'un calcul signalé comme tel. Fichiers internes lus, non modifiés : `proto-neon/DIRECTION.md`, `snake2030/src/22-enemies.js`, `snake2030/src/25-levels.js`.

## 1. Synthèse en dix lignes

1. Sessions courtes : la session mobile médiane dure 4,45 min (GameAnalytics, T1 2024) ; un niveau et sa relance doivent y tenir, d'où des niveaux de 2 à 3 min.
2. Rétention : au lancement, Survivor.io tenait J1 44 %, J7 15 %, J30 4 %, contre 49, 23 et 11 % pour Archero ([data.ai, via MobileGamer.biz](https://mobilegamer.biz/two-months-in-survivor-io-passes-75m-from-37m-downloads/)) ; médiane du marché sur 2025 : J1 ≈ 22 %, J7 < 4 % ([GameAnalytics 2026](https://gamedevreports.substack.com/p/gameanalytics-mobile-and-pc-game)).
3. Structure : des chapitres à boss réguliers (Survivor.io : un boss toutes les 5 min ; Geometry Wars 3 : tous les 10 niveaux ; Resogun : un par niveau).
4. Envie de relancer : une mort qui coûte peu de temps (Super Meat Boy, Super Hexagon), un gain persistant à chaque partie (Downwell), des systèmes dévoilés sur plusieurs jours (Habby).
5. Chaos lisible : la joueuse toujours visible, tout ce qui blesse codé et annoncé, rien qui naisse sur elle, une densité plafonnée.
6. L'intensité doit respirer : montée, pic bref, relâche (Director de Left 4 Dead) ; une montée continue ne tient que sur une courte séquence.
7. Défis : trois par niveau, nommés, chiffrés, vérifiables par le jeu, de durées variées (Alto's Adventure, Jetpack Joyride, Geometry Wars).
8. Impact : gel d'image proportionné (le « boss stop » de Sakurai), secousse à « trauma », explosions inoffensives ; secousse et flashs réglables (XAG, WCAG).
9. Musique : couches verticales changées à la mesure, passe-bas pour les instants suspendus, jamais de retour au début à chaque mort, et un jeu jouable en mode silencieux.
10. Proposition : 5 chapitres de 5 niveaux (25), boss aux niveaux 5, 10, 15, 20 et 25, 73 défis, ≈ 1 h 06 de jeu sans échec, au plus 1 min 31 de cinématiques, toutes sautables.

## 2. Exigences

Chaque énoncé se juge par oui ou non, en jouant ou en mesurant (horloge de jeu, journal, captures). Priorités : indispensable, important, bonus.

### A. Campagne, sessions, envie de relancer

- **G-01 · indispensable — Un niveau tient dans une session.** Un niveau ordinaire se gagne en 2 min 00 à 3 min 00 de jeu, un niveau de boss en 3 min 00 à 4 min 00, interludes exclus *(fourchettes proposées)*.
  - Pourquoi : session médiane de 4,45 min (T1 2024), de 5 à 6 min en 2024, de 8 à 9 min pour le quart supérieur ; repères : niveaux Voodoo de 45 s au plus, palier de 60 s de Super Hexagon, vagues Brotato de 20 à 90 s (≈ 17 min 30 de combat pour 20 vagues, calcul), manches de Survivor.io jusqu'à 15 min ; le niveau 1 de snake2030 prévoit 98 s de phases (calm 10, rise 24, surge 24, climax 34, clear 6), son boss arrivant au climax. Sources : [GameAnalytics T1 2024](https://gamedevreports.substack.com/p/gameanalytics-benchmarks-in-mobile) · [GameAnalytics 2025](https://gamedevreports.substack.com/p/gameanalytics-mobile-gaming-benchmarks) · [GameAnalytics sur Voodoo](https://www.gameanalytics.com/blog/voodoo-guide-mobile-game-design-keep-things-simple) · [Brotato Wiki](https://brotato.wiki.spellsandguns.com/Waves) · [Naavik](https://naavik.co/deep-dives/survivorio-archeros-footsteps/) · `snake2030/src/25-levels.js`
- **G-02 · indispensable — Relance en deux secondes.** Après une mort, un seul toucher relance, et la joueuse dirige de nouveau le serpent au plus 2 s après l'impact fatal, écran de fin compris ; ni confirmation ni chargement.
  - Pourquoi : sans vies, le coût d'une mort devient le temps de relance (McMillen) ; Cavanagh veut qu'on ne sente jamais perdre de progrès, même en échouant à 59 s ; le seuil de 2 s vient d'un billet de blog, c'est une règle empirique. Sources : [McMillen, Game Developer](https://www.gamedeveloper.com/game-platforms/-i-super-meat-boy-i-s-mcmillen-explains-why-so-hard-) · [Engadget, Super Hexagon](https://www.engadget.com/2012-09-21-terry-cavanagh-goes-inside-super-hexagon.html) · [Bugnet](https://bugnet.io/blog/designing-failure-how-to-make-losing-fun)
- **G-03 · important — Un écran de mort qui relance.** Sans action de la joueuse, il affiche la progression atteinte (temps tenu ou part du niveau), le record personnel et l'état des trois défis.
  - Pourquoi : le « presque » pousse à rejouer, effet de quasi-réussite relevé dans Vampire Survivors (à employer honnêtement, voir section 4) ; Super Hexagon fait de chaque niveau un chronomètre, et tenir 60 s ouvre sa version Hyper. Sources : [The Conversation](https://theconversation.com/vampire-survivors-how-developers-used-gambling-psychology-to-create-a-bafta-winning-game-203613) · [Giant Bomb, Super Hexagon](https://giantbomb.com/wiki/Games/Super_Hexagon)
- **G-04 · important — Toute partie rapporte.** À la fin de chaque partie, gagnée ou perdue, l'énergie ramassée s'ajoute à un total persistant affiché sur l'écran de fin ; ce total ouvre des styles et des modes (paliers en 3.1).
  - Pourquoi : Downwell verse les gemmes de chaque partie dans un total qui ouvre palettes et styles de jeu ; Vampire Survivors ajoute de l'or quand on tient jusqu'à la limite de temps. Sources : [Giant Bomb, Downwell](https://giantbomb.com/wiki/Games/Downwell) · [Wikipédia, Vampire Survivors](https://en.wikipedia.org/wiki/Vampire_Survivors)
- **G-05 · important — Des systèmes dévoilés peu à peu.** Au premier lancement, l'écran-titre n'offre qu'une action, JOUER ; défis, défi du jour, styles et Surcharge apparaissent chacun à un jalon fixé (tableau 3.2).
  - Pourquoi : Habby ouvre ses systèmes sur « plusieurs jours de sessions, pas un tutoriel de 20 minutes », avec un contrôle à un bouton ; Archero 2, bâti sur ce gabarit, rapporterait 27 M$ par mois (2025). Sources : [MobileGamer.biz](https://mobilegamer.biz/the-design-secrets-powering-habbys-hit-machine/) · [Deconstructor of Fun](https://www.deconstructoroffun.com/blog/2025/7/31/habbys-hybridcasual-empire-the-template-that-built-a-powerhouse)
- **G-06 · indispensable — Des boss à rythme fixe.** Chaque chapitre finit par un niveau de boss, et la carte de campagne montre dès le premier lancement où sont les cinq boss (affichage d'avance : proposé).
  - Pourquoi : un boss toutes les 5 min dans Survivor.io, tous les 10 niveaux dans Geometry Wars 3, un par niveau dans Resogun (5 niveaux de 3 phases), à 10 puis 20 min dans HoloCure, à des vagues jalons (20, 80, 100…) dans Nova Drift, à la vague 20 dans Brotato, toutes les 5 salles au chapitre 10 d'Archero ; les fiches de Snake Clash! annoncent elles aussi des boss par étape. Sources : [Naavik](https://naavik.co/deep-dives/survivorio-archeros-footsteps/) · [Geometry Wars wiki](https://geometry-wars.fandom.com/wiki/Adventure_Mode) · [Wikipédia, Resogun](https://en.wikipedia.org/wiki/Resogun) · [HoloCure wiki](https://holocure.wiki.gg/wiki/Stage) · [Samurai Gamers](https://samurai-gamers.com/holocure/stage-1-grassy-plains-walkthrough-and-guide/) · [Nova Drift](https://pixeljam.itch.io/nova-drift/devlog/432409/enemies-20-part-2) · [Brotato Wiki](https://brotato.wiki.spellsandguns.com/Waves) · [Archero wiki](https://archero.fandom.com/wiki/Land_of_Doom) · [App Store, Snake Clash!](https://apps.apple.com/bb/app/snake-clash/id6449243946) · [AppFollow, Snake Clash!](https://apps.appfollow.io/ios/snake-clash/6449243946?country=us)
- **G-07 · important — Un pic connu.** Chaque niveau ordinaire déclenche un élite (version agrandie d'un ennemi) ou une horde entre 55 % et 75 % de sa durée *(proposé)*.
  - Pourquoi : Brotato place élites et hordes aux vagues 11-12, 14-15 et 17-18 selon le niveau de danger ; HoloCure met un premier boss à mi-parcours (10 min sur 20). Sources : [Brotato Wiki](https://brotato.wiki.spellsandguns.com/Waves) · [Samurai Gamers](https://samurai-gamers.com/holocure/stage-1-grassy-plains-walkthrough-and-guide/)
- **G-08 · important — Reprise au boss.** Après un échec dans un niveau de boss, la relance commence à l'entrée du boss, sans la phase d'échauffement.
  - Pourquoi : le remake de Crash Bandicoot ajoute masques et points de reprise après un certain nombre d'échecs ; Hotline Miami renvoie au début de la section, pas du chapitre. Sources : [Activision](https://blog.activision.com/crash-bandicoot/archives/go-ahead-and-jump) · [Horror Obsessive](https://horrorobsessive.com/2022/10/23/hotline-miami-turns-ten/)
- **G-09 · bonus — Défi du jour.** Un niveau du jour identique pour toutes (graine tirée de la date), une seule tentative classée par jour, ni série à entretenir ni pénalité si l'on manque un jour.
  - Pourquoi : Spelunky donne un essai par jour sur une graine commune pour comparer les compétences ; les fiches de Snake Clash! adossent un classement mondial à sa « Tour des défis » ; « jouer sur rendez-vous » figure parmi les motifs sombres de Zagal, Björk et Lewis (2013). Sources : [Spelunky wiki](https://spelunky.fandom.com/wiki/Daily_Challenge_Mode_%28HD%29) · [AppFollow, Snake Clash!](https://apps.appfollow.io/ios/snake-clash/6449243946?country=us) · [Chalmers](https://research.chalmers.se/en/publication/177148)
- **G-10 · bonus — Surenchère choisie.** Battre le boss d'un chapitre ouvre sa version Surcharge (vitesse et densité accrues) et des modificateurs nommés, cumulables, qui augmentent la récompense.
  - Pourquoi : Super Hexagon ouvre la version Hyper d'un niveau après 60 s tenues ; Hades vend la difficulté en conditions nommées (Hard Labor : jusqu'à +100 % de dégâts ennemis) contre de meilleures récompenses ; Brotato a ses niveaux de danger 0 à 5. Sources : [Giant Bomb, Super Hexagon](https://giantbomb.com/wiki/Games/Super_Hexagon) · [TrueAchievements, Hades](https://www.trueachievements.com/game/Hades/walkthrough/7) · [Brotato Wiki](https://brotato.wiki.spellsandguns.com/Waves)

### B. Le chaos lisible

- **G-11 · indispensable — La tête toujours visible.** Sur toute capture de jeu, même au plus fort d'une explosion, la tête et les deux premiers segments sont dessinés au-dessus de tout effet : hors image de dégât subi, 100 % de leurs pixels restent cyan ou cyan pâle.
  - Pourquoi : critique de Geometry Wars 2 : « trouver son vaisseau au milieu d'explosions inutilement chargées est frustrant » ; pour Returnal, Housemarque s'est demandé combien on peut ajouter en restant lisible. Sources : [AV Club](https://www.avclub.com/geometry-wars-retro-evolved-2-1798214562) · [MCV](https://mcvuk.com/business-news/when-we-made-returnal/)
- **G-12 · indispensable — Le danger a une couleur et une forme.** Tout ce qui blesse (ennemi, projectile, zone) est magenta, rose pâle ou sang, et aucun butin ni décor ne l'est ; sur une capture passée en niveaux de gris, les quatre types d'ennemis et le gros ennemi restent identifiables à leur silhouette.
  - Pourquoi : les shoot'em up saturés séparent par des couleurs vives tirs ennemis et tirs de la joueuse, sinon « fausse difficulté » ; les guides d'accessibilité refusent qu'une information passe par la couleur seule. Sources : [TV Tropes, Danmaku](https://tvtropes.org/pmwiki/pmwiki.php/Main/Danmaku) · [XAG 103](https://devdocs.xbox.com/gaming/accessibility/xbox-accessibility-guidelines/103) · [Game Accessibility Guidelines, reprise](https://www.webbie.org.uk/blog/?p=115)
- **G-13 · indispensable — Pas d'attaque sans télégraphe.** Toute attaque capable de tuer est annoncée à l'endroit exact de sa zone de dégâts au moins 500 ms avant ses premiers dégâts (800 ms pour le gros ennemi *(proposé)*).
  - Pourquoi : 500 ms est la règle que tient déjà snake2030 ; un bon télégraphe fait du coup reçu une erreur qu'on apprend, un piège sans signal constant passe pour de la mauvaise communication. Sources : `snake2030/src/22-enemies.js` · [Bugnet](https://bugnet.io/blog/how-to-design-enemy-attack-telegraphs) · [Choost Games](https://choostgames.com/blog/what-makes-a-good-boss-fight/)
- **G-14 · indispensable — Personne ne naît sur la joueuse.** Aucun ennemi n'apparaît à moins de 48 pixels de jeu de la tête *(proposé)* ; il naît hors champ, ou après 600 ms d'animation d'apparition pendant lesquelles il ne blesse pas *(proposé)*.
  - Pourquoi : Vampire Survivors fait naître ses ennemis juste hors de l'écran ; Geometry Wars signale l'apparition par une forme qui pulse ; un testeur de Geometry Wars 3 s'est dit floué par des morts dues à des ennemis tout juste apparus. Sources : [Vampire Survivors wiki](https://vampire-survivors.fandom.com/wiki/Enemies) · [Giant Bomb, Geometry Wars](https://giantbomb.com/wiki/Games/Geometry_Wars_Retro_Evolved) · [Stevivor](https://stevivor.com/previews/preview-geometry-wars-3-dimensions/)
- **G-15 · important — Des contacts cléments.** La zone qui tue la tête est plus petite que son sprite (60 % de sa largeur au plus *(proposé)*), de même pour les projectiles ennemis ; la zone de ramassage de l'énergie est plus grande que son sprite.
  - Pourquoi : dans les shoot'em up, la zone de contact de la joueuse est volontairement bien plus petite que le vaisseau ; Celeste multiplie les tolérances invisibles (coyote time, correction de coin). Sources : [PC Gamer](https://www.pcgamer.com/uk/how-hitboxes-work/) · [Celeste & Forgiveness](https://maddymakesgames.com/articles/celeste_and_forgiveness/)
- **G-16 · important — Une densité plafonnée.** Une constante unique plafonne ennemis vivants et projectiles ennemis ; au plafond, les apparitions attendent, et le p95 du coût d'image reste sous 16,7 ms sur iPhone 13 (critère 7 de DIRECTION.md).
  - Pourquoi : Vampire Survivors cesse les apparitions ordinaires à partir de 300 ennemis vivants ; snake2030 plafonne à 130 (160 si la machine tient la cadence). Sources : [Vampire Survivors wiki](https://vampire-survivors.fandom.com/wiki/Enemies) · `snake2030/src/25-levels.js` · `proto-neon/DIRECTION.md`
- **G-17 · indispensable — Respirer après chaque pic.** Après chaque pic, les ennemis vivants passent sous 40 % du pic pendant au moins 8 s avant la remontée *(seuils proposés)* ; chaque niveau finit sur son plus haut pic.
  - Pourquoi : le Director de Left 4 Dead enchaîne montée, pic de quelques secondes et relâche d'environ 30 à 45 s ; Brotato ouvre sa boutique entre les vagues. Sources : [Left 4 Dead wiki](https://left4dead.fandom.com/wiki/The_Director) · [Wikipédia, Left 4 Dead](https://en.wikipedia.org/wiki/Left_4_Dead_%28series%29) · [TouchArcade, Brotato](https://toucharcade.com/community/threads/430144)
- **G-18 · important — Une aide proposée, jamais imposée.** Après 3 morts de suite sur un niveau *(proposé)*, le jeu propose une aide (segments de bouclier, apparitions ralenties) ; acceptée, elle reste signalée par une icône jusqu'à la fin du niveau.
  - Pourquoi : Crash Bandicoot donnait un masque après 5 vies perdues ; le mode Dieu de Hades part de 20 % de résistance, +2 % par mort, jusqu'à 80 % ; Resident Evil 4 ajuste en secret ; Chen (le flow) et Hunicke défendent l'ajustement. Sources : [Wikipédia, Crash](https://en.wikipedia.org/wiki/Crash_Bandicoot_%28video_game%29) · [Gamepressure, Hades](https://www.gamepressure.com/hades/god-mode/z5eb86) · [Engadget, RE4](https://www.engadget.com/2015-06-03-resident-evil-4-difficulty.html) · [Chen 2007](https://khoury.northeastern.edu/~lieber/courses/csu670/f08/materials/p31-chen-flow-in-games.pdf) · [Hunicke](https://users.cs.northwestern.edu/~hunicke/pubs/Hamlet.pdf)

### C. Facile à jouer sur iPhone

- **G-19 · indispensable — Un pouce suffit.** Toute la campagne se termine en ne faisant que diriger : tir automatique vers l'avant, aucun geste à deux doigts ni appui maintenu ; toute cible de menu mesure au moins 44 × 44 points.
  - Pourquoi : Habby s'en tient à un contrôle à un bouton et Survivor.io vise seul ; 49 % des personnes observées par Hoober tiennent leur téléphone d'une main (chiffre rapporté) ; Apple recommande 44 × 44 pt. Sources : [MobileGamer.biz](https://mobilegamer.biz/the-design-secrets-powering-habbys-hit-machine/) · [Naavik](https://naavik.co/deep-dives/survivorio-archeros-footsteps/) · [Monterail, d'après Hoober](https://www.monterail.com/blog/thumb-friendly-navigation-word-oriented-design) · [Deque](https://dequeuniversity.com/rules/attest-ios/1.0/touch-target-size)
- **G-20 · indispensable — Un virage immédiat et mémorisé.** Un virage se voit à l'écran moins de 100 ms après le toucher ; deux virages saisis coup sur coup s'exécutent dans l'ordre, aucun n'est perdu.
  - Pourquoi : pour Swink, le contrôle « en temps réel » suppose une boucle de correction sous 100 ms ; Celeste mémorise un saut pressé juste avant l'atterrissage. Sources : [Liz England, sur Swink](https://lizengland.com/blog/review-game-feel-by-steve-swink/) · [Celeste & Forgiveness](https://maddymakesgames.com/articles/celeste_and_forgiveness/)

### D. Les défis nommés

- **G-21 · indispensable — Trois défis, vus avant de jouer.** À partir du niveau 1-2, chaque niveau a exactement 3 défis, affichés sur la carte de briefing et rappelés en jeu ; le premier est toujours FINIR.
  - Pourquoi : Alto's Adventure donne ses 180 objectifs trois à la fois ; Jetpack Joyride garde trois missions actives ; Geometry Wars 3 note chaque niveau sur trois étoiles. Sources : [Wikipédia, Alto's Adventure](https://en.wikipedia.org/wiki/Alto%27s_Adventure) · [Adrian Crook](https://adriancrook.com/?p=4709) · [TheSixthAxis](https://www.thesixthaxis.com/2014/12/05/geometry-wars-3-dimensions-review/)
- **G-22 · indispensable — Un nom, un nombre, une portée.** Chaque défi tient en un nom de 14 caractères au plus *(proposé)* et une ligne qui donne un nombre et une portée vérifiable par le jeu (« en une partie », « sans perdre un segment », « en 2 s ») ; aucun ne dépend du hasard des apparitions.
  - Pourquoi : modèles de Geometry Wars 2 : SLALOM (5 portes en 5 s), SURF (esquiver 8 lignes d'ennemis sans tirer), TREATY (activer 30 zones sans tirer ni détruire) ; Vampire Survivors : vaincre 3 000 Milk Elementals ; Spelunky fixe la graine de son défi du jour pour comparer des compétences et non de la chance. Sources : [CheatCC](https://cheatcc.com/articles/geometry-wars-retro-evolved-2-cheats-codes-cheat-codes-walkthrough-guide-faq-unlockables-for-xbox-360-xbox360/) · [N4G](https://n4g.com/articles/all-characters-and-unlock-requirements-in-vampire-survivors) · [Spelunky wiki](https://spelunky.fandom.com/wiki/Daily_Challenge_Mode_%28HD%29)
- **G-23 · indispensable — Réussite et échec lisibles sur-le-champ.** Quand un défi est réussi ou devient impossible, un bandeau (nom et coche ou croix) et un son dédié apparaissent en moins de 1 s *(proposé)*, sans couvrir la tête ni un télégraphe.
  - Pourquoi : c'est l'attendu n° 5 du prototype ; Jetpack Joyride remplace une mission dès qu'elle est accomplie. Sources : `proto-neon/DIRECTION.md` · [Macworld](https://www.macworld.com/article/1163288/jetpack_joyride_for_iphone_and_ipad.html)
- **G-24 · important — Des défis de toutes durées.** Dans chaque chapitre, au moins un tiers des défis autres que FINIR se réalisent dans les 60 premières secondes d'un niveau *(proposé)*.
  - Pourquoi : Jetpack Joyride étage ses missions en 30 s à 2 min, 2 à 10 min et 10 à 30 min et plus, pour qu'il y en ait toujours une à la mesure de la session. Sources : [Adrian Crook](https://adriancrook.com/?p=4709)
- **G-25 · indispensable — Les étoiles ouvrent du bonus, jamais la campagne.** La campagne entière se termine avec la seule étoile FINIR de chaque niveau ; les étoiles en plus n'ouvrent que styles, Surcharge, galerie et niveau secret.
  - Pourquoi : dans Geometry Wars 3, une étoile suffit pour avancer mais les boss exigent un quota d'étoiles, et une seule étoile peut demander de nombreux essais. Sources : [Games Asylum](https://www.gamesasylum.com/2014/12/05/geometry-wars%C2%B3-dimensions-review/)

### E. Explosions et impacts

- **G-26 · indispensable — Un gel d'image proportionné.** Gel de 0 à 1 image quand un tir touche, 2 à 3 images pour un ennemi tué, 6 à 10 pour le gros ennemi, 20 à 30 (≈ 0,5 s) à la mort d'un boss *(valeurs proposées, sous le plafond de 30 images de Smash)* ; deux gels ne s'additionnent jamais.
  - Pourquoi : Sakurai : « s'arrêter pour les grands moments », dont le « boss stop » au coup final ; dans Smash, l'arrêt croît avec les dégâts et plafonne à 30 images depuis Brawl. Sources : [Automaton](https://automaton-media.com/en/?p=15208) · [Nintendo Wire](https://nintendowire.com/news/2022/12/12/this-week-in-sakurai-12-5-12-11-fine-tuning-hit-stop-and-cheating-the-system/) · [SmashWiki](https://www.ssbwiki.com/Hitlag)
- **G-27 · important — Une secousse à « trauma ».** Décalage = amplitude max × trauma² ; le trauma, entre 0 et 1, monte à chaque impact, décroît avec le temps et pilote un bruit continu ; un tir pousse la caméra à l'opposé de sa direction *(exposant 2 à confirmer dans le talk)*.
  - Pourquoi : modèle de Squirrel Eiserloh (GDC 2016), repris et crédité par l'exemple du moteur Bevy ; Jan Willem Nijman (Vlambeer) fait trembler l'écran à l'opposé du tir. Sources : [Game Developer, Eiserloh](https://www.gamedeveloper.com/programming/video-sprucing-up-cameras-with-math) · [Bevy](https://bevy.org/examples/camera/2d-screen-shake/) · [Game Developer, Vlambeer](https://www.gamedeveloper.com/design/vlambeer-co-founder-shares-advice-on-building-better-action-games) · [talk de Nijman](https://www.youtube.com/watch?v=AJdEqssNZ-U)
- **G-28 · indispensable — Secousse et flashs réglables.** Les options proposent « Secousse 100 / 50 / 0 % » et « Flashs oui / non » ; à 0 %, la caméra ne bouge d'aucun pixel.
  - Pourquoi : XAG 117 demande d'éviter la secousse ou de permettre de la couper ; Halo Infinite offre un curseur de 0 à 100 %. Sources : [XAG 117](https://devdocs.xbox.com/gaming/accessibility/xbox-accessibility-guidelines/117)
- **G-29 · indispensable — Photosensibilité.** Aucune zone de l'écran ne flashe plus de 3 fois en une seconde, même pendant une chaîne d'explosions (vérifiable image par image).
  - Pourquoi : critère WCAG 2.3.1 et sa technique « aucun composant ne flashe plus de trois fois par seconde ». Sources : [W3C](https://www.w3.org/WAI/WCAG21/Understanding/three-flashes-or-below-threshold)
- **G-30 · important — Le spectacle sans danger.** Une explosion de mort d'ennemi ne blesse jamais la joueuse ; ses éclats restent ensuite au sol, en couleurs sombres, au moins 3 s *(proposé)*.
  - Pourquoi : dans la démonstration de Nijman, un ennemi sur trois explose « sans danger » à sa mort, pour le seul spectacle ; le « jus », c'est « un maximum de sortie pour un minimum d'entrée » (Jonasson). Sources : [Game Developer, Vlambeer](https://www.gamedeveloper.com/design/vlambeer-co-founder-shares-advice-on-building-better-action-games) · [Game Developer, Juice it or lose it](https://www.gamedeveloper.com/design/video-is-your-game-juicy-enough-)

### F. La musique qui suit l'action

- **G-31 · indispensable — Les couches changent à la mesure.** Basse, batterie, nappe et lead n'entrent et ne sortent qu'aux barres de mesure : dans le journal audio, 100 % des changements tombent à moins de 10 ms d'une barre *(tolérance proposée)*.
  - Pourquoi : c'est la superposition verticale décrite par Winifred Phillips (GDC 2021) ; Wwise et Quartz (Unreal) calent leurs transitions sur la mesure ou le temps ; Mick Gordon décrit la musique de DOOM comme des morceaux que le moteur réassemble selon l'action ; pour Hades, rien de public sur le système, Korb dit seulement travailler sous FMOD. Sources : [Phillips](https://www.gamedeveloper.com/game-platforms/pure-vertical-layering-for-game-music-composers-from-spyder-to-sackboy-gdc-2021-) · [Audiokinetic](https://audiokinetic.com/qa/2144/is-there-way-to-stop-playing-loop-only-at-the-specific-points) · [Unreal Quartz](https://docs.unrealengine.com/5.0/en-US/PythonAPI/class/QuarztQuantizationReference.html) · [Bethesda](https://bethesda.net/ko-KR/news/inside-the-doom-score-mick-gordon-interview) · [GDC Vault, DOOM](https://gdcvault.com/play/1024068/-DOOM-Behind-the) · [Korb](https://www.gamedeveloper.com/game-platforms/composer-darren-korb-talks-audio-middleware-and-its-importance-to-game-developers)
- **G-32 · indispensable — La musique raconte les événements.** Arrivée du boss, mort du boss et réussite d'un défi changent la musique à la mesure suivante ; la pause et le « boss stop » la passent sous un filtre passe-bas.
  - Pourquoi : dans Tetris Effect, la musique change à des paliers (12 lignes, vitesse 2) et la Zone pose un passe-bas en retirant la voix ; le menu de pause de Spelunky étouffe la musique. Sources : [Game Developer, Tetris Effect](https://www.gamedeveloper.com/audio/game-audio-analysis---tetris-effect) · [Unity Asset Store](https://assetstore.unity.com/packages/slug/16902)
- **G-33 · bonus — Les tirs dans le tempo.** Les sons de tir et d'explosion tombent sur la grille rythmique (double croche) et dans la tonalité, l'image restant immédiate.
  - Pourquoi : Rez « quantifiait tous ses effets sonores, des tirs aux explosions » ; Thumper : « on ne joue pas la musique, on y survit ». Sources : [PlayStation Blog](https://blog.eu.playstation.com/2017/10/20/classic-levels-deconstructed-tetsuya-mizuguchi-musician-adam-freeland-dissect-rez-infinites-area-5) · [Superjump](https://www.superjumpmagazine.com/the-helpful-harmful-sounds-of-thumper/)
- **G-34 · indispensable — Pas de rengaine.** Après une mort, la musique continue ou reprend à un point au hasard, jamais au début ; aucune boucle identique ne dure moins de 60 s *(proposé)* ; la règle de DIRECTION.md (rien d'identique plus de deux fois) reste en vigueur.
  - Pourquoi : Cavanagh relance la musique à un point au hasard pour que mourir ne sonne pas comme une perte ; Hotline Miami garde la musique à travers les morts ; une boucle de 30 s revient environ 20 fois en 10 min ; la répétition excessive est documentée comme source de lassitude. Sources : [Engadget](https://www.engadget.com/2012-09-21-terry-cavanagh-goes-inside-super-hexagon.html) · [Stevivor](https://stevivor.com/reviews/hotline-miami/) · [Ortega](https://www.liortega.com/post/the-7-deadly-sins-of-mobile-game-audio) · [Worrall](https://etheses.whiterose.ac.uk/38684/)
- **G-35 · indispensable — Jouable sans le son.** iPhone en mode silencieux, le jeu reste entièrement jouable : tout signal sonore utile (télégraphe, défi, boss, danger) a son équivalent visuel.
  - Pourquoi : Safari iOS coupe Web Audio quand la sonnerie est en vibreur ; en 2013, 73 % des joueurs mobiles jouaient le volume à 10 % ou plus, une autre enquête ne trouve que 8 % de joueurs avec le son du jeu. Sources : [Matt Montag](https://www.mattmontag.com/web/unlock-web-audio-in-safari-for-ios-and-macos) · [TouchArcade](https://toucharcade.com/2013/11/05/73-of-mobile-gamers-play-with-the-sound-on/) · [TapResearch](https://blog.tapresearch.com/how-sound-preferences-impact-player-engagement)
- **G-36 · important — Le son part au premier toucher.** Le premier toucher de l'écran-titre débloque l'audio, et la musique est audible avant la fin de la mesure qui suit.
  - Pourquoi : iOS exige un geste pour démarrer l'audio, qu'on débloque dans l'écouteur de toucher. Sources : [Matt Montag](https://www.mattmontag.com/web/unlock-web-audio-in-safari-for-ios-and-macos)

### G. Les cinématiques

- **G-37 · indispensable — Courtes et sautables.** Toute cinématique se saute d'un toucher ; un toucher reçu dans ses 300 premières ms est ignoré *(proposé, pour qu'un toucher destiné au jeu ne saute pas une scène jamais vue)* ; durées max : ouverture 12 s, début de chapitre 6 s, alerte boss 3 s, fin de chapitre 5 s, fin de campagne 20 s *(ouverture et alerte : DIRECTION.md ; le reste proposé)*.
  - Pourquoi : Ninja Gaiden (NES) se sautait déjà avec Start ; dans Mass Effect 2, 15 % des conversations étaient passées, surtout les moins importantes ; Kojima a raccourci ses cinématiques après avoir constaté que beaucoup les sautaient ; les guides d'accessibilité demandent de pouvoir passer ce qui n'est pas le cœur du jeu. Sources : [Flying Omelette](https://flyingomelette.com/reviews/nes/ninjagaiden.html) · [notice US](https://archive.org/download/NESManuals/Ninja%20Gaiden%20%28USA%29_text.pdf) · [Engadget, ME2](https://www.engadget.com/2010-09-07-half-of-mass-effect-2-players-imported-a-save-and-other-stats.html) · [FRVR, Kojima](https://frvr.com/blog/news/hideo-kojima-says-a-lot-of-people-skipped-death-stranding-cutscenes-but-they-are-part-of-the-game/) · [GAG](https://gameaccessibilityguidelines.com/intermediate/)
- **G-38 · important — Elles encadrent les actes.** Chaque chapitre a une cinématique d'ouverture et une de clôture, aucune entre deux niveaux ordinaires (une carte de résultats de 2 s au plus *(proposé)*), et l'alerte précède toujours le boss.
  - Pourquoi : Ninja Gaiden borde chacun de ses actes de « Cinema Displays » ; Hotline Miami raconte par petites touches entre les missions (répondeur, appartement, coupures de presse) et note chaque chapitre. Sources : [Hardcore Gaming 101](https://www.hardcoregaming101.net/ninja-gaiden-nes/) · [Retronauts](https://retronauts.com/article/1044/30-years-ago-ninja-gaiden-predicted-the-future-of-video-games) · [Wikipédia, Hotline Miami](https://en.wikipedia.org/wiki/Hotline_Miami)
- **G-39 · bonus — Peu de texte.** Une cinématique affiche au plus 3 lignes à la fois (le briefing en trois lignes de DIRECTION.md), et rien de ce qui s'y dit n'est nécessaire pour jouer.
  - Pourquoi : Katana Zero laisse couper la parole à tout personnage, car un assassin n'attend pas la fin du monologue du méchant ; couper la parole y a des conséquences (des personnages se vexent). Sources : [Game Revolution](https://www.gamerevolution.com/features/520685-katana-zero-interview) · [Red Bull](https://www.redbull.com/int-en/katana-zero-developer-justin-stander-interview)
- **G-40 · bonus — La victoire rejouée.** La cinématique de fin de chapitre peut montrer 3 s de la frappe finale de la joueuse, rejouées à partir de la graine et des entrées enregistrées.
  - Pourquoi : selon l'analyse d'Uppercut, Katana Zero présente l'essai réussi comme le vrai film, les échecs comme des hypothèses (« Oui, ça devrait marcher ») ; le jeu est déterministe à graine fixe. Sources : [Uppercut](https://uppercutcrit.com/?p=1552) · `proto-neon/DIRECTION.md`

## 3. Proposition de campagne pour SNAKE 2975

Principe : une campagne courte et dense, un niveau par session, un boss par chapitre, une difficulté choisie plutôt que subie. Les durées sont des cibles *(proposées)* déduites des repères de la section 2, à régler en test.

### 3.1 Les chiffres

| Élément | Proposition | Appui |
|---|---|---|
| Chapitres | 5 : un par type d'ennemi, le cinquième les mêle | une nouveauté à la fois (Habby, G-05) ; Resogun : 5 niveaux |
| Niveaux | 25 = 5 × (4 ordinaires + 1 boss) | Geometry Wars 3 : boss tous les 10 niveaux ; ici tous les 5, les niveaux étant plus longs |
| Niveau ordinaire | 2 min à 3 min, cible 2 min 30 | G-01 |
| Niveau de boss | 3 min 00 (ch. 1) à 3 min 34 (ch. 4-5), calcul en 3.4 | G-01 |
| Chapitre sans échec | 13 min 00 à 13 min 34 de jeu (calcul) | chapitre de 15 min de Survivor.io, mais coupé en 5 sauvegardes |
| Campagne sans échec | ≈ 1 h 06 de jeu (calcul) ; avec les échecs : non estimé | — |
| Boss | niveaux 5, 10, 15, 20, 25 ; le colosse gagne des phases : 1 (ch. 1), 2 (ch. 2-3), 3 (ch. 4-5) | le Warbringer de Nova Drift enchaîne 3 phases dans l'ordre ([wiki](https://nova-drift.fandom.com/wiki/Warbringer)) |
| Pic intermédiaire | un élite ou une horde à 55-75 % de chaque niveau ordinaire | G-07 |
| « Le gros bordel » | niveau 4 de chaque chapitre : plafond de densité tenu au moins 40 s *(proposé)*, 4 couches, fin par une purge où tout l'écran explose | Vampire Survivors vide l'écran à la limite de temps, puis envoie la Faucheuse |
| Surchauffe | ramasser vite de l'énergie donne quelques secondes de tirs plus gros | le « gem high » de Downwell ([Giant Bomb](https://giantbomb.com/wiki/Games/Downwell)) |
| Défis | 73 : FINIR seul en 1-1, puis 3 par niveau (25 FINIR + 48 en plus) | G-21 |
| Paliers d'étoiles en plus | 10, 20, 30 : trois styles (règles modifiées) ; 40 : galerie des cinématiques ; 48 : niveau secret | styles de jeu de Downwell (G-04) |
| Défi du jour | ouvert à la fin du chapitre 1 ; un niveau de 2 min 30, graine = date | G-09 |
| Surcharge | version accélérée d'un chapitre, ouverte par son boss | G-10 |
| Cinématiques | ouverture 12 s (vaut début du ch. 1) ; débuts des ch. 2 à 5 : 6 s ; 5 alertes boss : 3 s ; fins des ch. 1 à 4 : 5 s ; fin de campagne : 20 s → 91 s au plus, ≈ 2,3 % du jeu (calcul) | G-37, G-38 |
| Sauvegarde | à chaque fin de niveau et à l'entrée de chaque boss | G-08 |

### 3.2 Les chapitres

| Ch. | Nom provisoire | Ce qui arrive | Ce qui s'ouvre |
|---|---|---|---|
| 1 | Amorçage | ennemi 1 seul, puis ses élites ; colosse à 1 phase | 1-2 : défis ; fin : défi du jour et Surcharge 1 |
| 2 | Trafic | ennemi 2, mêlé au 1 ; colosse à 2 phases | 10 étoiles : style 1 |
| 3 | Pare-feu | ennemi 3 ; colosse à 2 phases et renforts | 20 étoiles : style 2 |
| 4 | Surtension | ennemi 4 ; colosse à 3 phases | 30 étoiles : style 3 |
| 5 | Noyau | les quatre types mêlés ; colosse à 3 phases et finale | 40 : galerie ; 48 : niveau secret |

Les quatre types et le colosse sont ceux de la refonte, dans l'ordre que l'équipe choisira. Étoiles en plus atteignables au maximum : 8 après le ch. 1, puis 18, 28, 38, 48 : chaque palier est accessible dans le chapitre où il est annoncé. Les panneaux existants (`exterieur`, `connexion`, `eveil`, `briefing`, `alerte`, `boss`, `victoire`, `defaite`) couvrent l'ouverture, les boss et les fins ; une image propre à chaque chapitre demanderait de nouveaux panneaux.

### 3.3 Déroulé d'un niveau ordinaire de 2 min 30

| Temps | Phase (noms de snake2030) | Ce qui se passe | Musique |
|---|---|---|---|
| 0:00-0:10 | calme (calm) | un seul type, aucun tir ennemi, énergie à portée | basse + nappe |
| 0:10-1:25 | montée (rise) | groupes nés hors champ, densité croissante | + batterie, à la mesure |
| 1:25-1:40 | pic 1 (surge), à 57-67 % | élite ou horde, télégraphiée | 4 couches |
| 1:40-1:50 | respiration (nouvelle) | moins de 40 % du pic, énergie abondante | lead coupé |
| 1:50-2:20 | apogée (climax) | les types se combinent, plafond de densité | 4 couches + variation |
| 2:20-2:30 | purge (clear) | la dernière vague tombe : explosions en chaîne, fin sur une barre | coupure, accent final |

Valeurs proposées, sur le modèle montée, pic, relâche du Director de Left 4 Dead, raccourci : sa relâche dure 30 à 45 s dans des parties bien plus longues.

### 3.4 Déroulé d'un niveau de boss

- 0:00-0:50 : échauffement, une vague courte du chapitre ; sautée à la relance (G-08).
- 0:50 : interlude alerte puis boss, 3 s au plus, jeu gelé, hors horloge ; le télégraphe du colosse commence au retour (DIRECTION.md).
- Phases : une de 2 min 10 au ch. 1 ; deux de 65 s aux ch. 2-3 ; trois de 50 s aux ch. 4-5 ; entre deux phases, 7 s de respiration où le colosse se replie et l'énergie afflue *(proposé)*. Calcul, interlude exclu : 3 min 00 (ch. 1), 3 min 07 (ch. 2-3), 3 min 34 (ch. 4-5).
- Coup final : « boss stop » de 20 à 30 images (G-26), explosion qui couvre plus de 8 % de l'écran de brasier pendant au moins 4 images et déplace la caméra d'au moins 6 pixels (critère 4 de DIRECTION.md), puis victoire en 5 s au plus.

### 3.5 Exemples de défis nommés

| Nom | Condition | Durée |
|---|---|---|
| FINIR | terminer le niveau | toujours le premier |
| ARTIFICIER | 3 explosions en chaîne en moins de 2 s | court |
| PREMIER JET | détruire 15 ennemis dans les 30 premières secondes | court |
| GLOUTON | atteindre 40 segments en une partie | moyen |
| FRÔLEUSE | passer à moins de 4 pixels de 10 projectiles sans être touchée | moyen |
| INTOUCHABLE | finir le niveau sans perdre un segment | long |
| CHRONO | vaincre le colosse en moins de 90 s | long |

Nombres à régler niveau par niveau ; la forme suit SLALOM, SURF et TREATY de Geometry Wars 2 (G-22).

### 3.6 Ce qui fait relancer

- La relance prend 2 s (G-02) et l'écran de mort montre ce qui manquait (G-03).
- Chaque partie remplit le total d'énergie, qui ouvre styles et modes (G-04).
- Un défi court est toujours à portée (G-24), et le défi du jour change chaque jour sans rien punir (G-09).
- Piste à tester, sans source : la longueur sert de bouclier. Un choc coupe la queue au lieu de tuer, la mort vient quand la tête est touchée sans réserve ; « s'allonger » et « survivre » ne font plus qu'un, et le jeu devient plus facile sans menu de difficulté.

## 4. Pièges à éviter

- **La montée sans fin.** Le critère 6 de DIRECTION.md (ennemis et volume croissants par tranches de 20 s) convient à 2 minutes de prototype ; appliqué à un niveau de campagne, il interdit la respiration de G-17. À réécrire pour la campagne : « chaque niveau finit sur son plus haut pic ».
- **Le mur d'étoiles.** Des quotas d'étoiles pour avancer obligent à rejouer d'anciens niveaux ([Games Asylum](https://www.gamesasylum.com/2014/12/05/geometry-wars%C2%B3-dimensions-review/)) : en campagne, l'étoile FINIR suffit (G-25).
- **L'explosion qui cache la joueuse** ([AV Club](https://www.avclub.com/geometry-wars-retro-evolved-2-1798214562)) et **l'ennemi qui naît sur la tête** ([Stevivor](https://stevivor.com/previews/preview-geometry-wars-3-dimensions/)) : G-11 et G-14.
- **Le jus qui noie.** Folmer Kelly répond à « Juice it or lose it » que le vernis peut coûter de l'immersion ([Game Developer](https://gamedeveloper.com/design/video-indies-resist-the-urge-to-juice-it-or-lose-it-)) : chaque effet doit servir la lecture, pas la couvrir.
- **Mêmes couleurs pour la joueuse et le danger** : TV Tropes y voit une « fausse difficulté » ([Danmaku](https://tvtropes.org/pmwiki/pmwiki.php/Main/Danmaku)) ; la règle du cyan réservé de DIRECTION.md y répond déjà.
- **Tout ouvrir d'un coup.** Un tutoriel qui dévoile toute l'interface va contre la méthode Habby ([MobileGamer.biz](https://mobilegamer.biz/the-design-secrets-powering-habbys-hit-machine/)).
- **La corvée et le péage.** Nimble Quest a été critiqué parce qu'avancer au-delà d'une heure ou deux devenait presque impossible sans payer ([Game Informer](https://gameinformer.com/games/nimble_quest/b/ios/archive/2013/04/03/nimble-quest-review)) ; corvée et rendez-vous obligatoire sont des motifs sombres ([Chalmers](https://research.chalmers.se/en/publication/177148)).
- **La machine à sous déguisée.** L'écran de coffre de Vampire Survivors emprunte aux machines à sous et ses analyses parlent d'effet de quasi-réussite ([The Conversation](https://theconversation.com/vampire-survivors-how-developers-used-gambling-psychology-to-create-a-bafta-winning-game-203613)) : le spectacle de la récompense, oui ; un hasard truqué ou une quasi-réussite fabriquée, non.
- **La mort au premier contact du bord.** Nimble Quest finit la partie au contact du bord de l'arène ou d'un ennemi ([Pocket Gamer](https://www.pocketgamer.com/nimble-quest/nimble-quest-review/)) : c'est le Snake classique, mais c'est rude pour une campagne « facile à jouer » ; voir la piste du bouclier (3.6).
- **La musique qui redémarre** à chaque mort, et les boucles de 30 s qui reviennent vingt fois en dix minutes ([Ortega](https://www.liortega.com/post/the-7-deadly-sins-of-mobile-game-audio)) : G-34.
- **Le son ou la couleur seuls porteurs d'information** : mode silencieux, daltonisme (G-12, G-35).
- **Compter sur les graves.** Aucune mesure publique du haut-parleur d'iPhone n'a été trouvée : vérifier sur l'appareil que la basse et les explosions restent perceptibles, sinon porter leur identité dans les médiums (non sourcé).
- **Flashs et secousse imposés** : G-28 et G-29, pour toutes les joueuses et pas seulement en option cachée.
- **Cinématiques longues, ou sautées par accident.** Kojima a raccourci les siennes ([FRVR](https://frvr.com/blog/news/hideo-kojima-says-a-lot-of-people-skipped-death-stranding-cutscenes-but-they-are-part-of-the-game/)) ; un saut d'un seul appui malencontreux est un reproche courant, simple avis ([TheGamer](https://www.thegamer.com/three-golden-rules-cutscenes/)) : d'où la garde de 300 ms (G-37).
- **Des défis qui dépendent du hasard** : la graine commune du défi du jour sert justement à comparer des compétences ([Spelunky wiki](https://spelunky.fandom.com/wiki/Daily_Challenge_Mode_%28HD%29)).
- **Une longue partie sans sauvegarde dans un navigateur mobile** : un onglet peut être rechargé en arrière-plan ; sauvegarder à chaque fin de niveau (pratique courante, non sourcée ici).
