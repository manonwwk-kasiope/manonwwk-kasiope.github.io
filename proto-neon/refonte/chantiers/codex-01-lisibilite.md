# Chantier codex-01 — la lisibilité en jeu

Confié à : **Codex** (sur le Mac de la propriétaire), par la session Claude du cloud, le 17 octobre 2026.
Fichiers à toi, et à toi seul : `proto-neon/src/15-decor.js` et un nouveau dossier `proto-neon/tools/lisibilite/`.
Ne touche à aucun autre fichier de `src/`. Si tu as besoin d'un changement ailleurs, écris-le dans
`proto-neon/refonte/lots/demandes.md` (ligne « codex-01 | fichier | ce qu'il faut | pourquoi »).

## Le problème (mesuré sur une capture)

En jeu (vague 4 « ESSAIM », iPhone 13 paysage), le décor derrière le plateau — tours, structures, sol — est
tramé jaune, ambre et brasier, presque aussi lumineux que les acteurs. Le serpent cyan, les flèches magenta et
les tirs se détachent mal. C'est le défaut le plus visible du jeu aujourd'hui (tableau de bord du 17 octobre).

## Ce qu'il faut obtenir

Dans les états où l'on joue (`N.game.etat()` vaut jeu, nettoyage, alerte, boss, reapparition, mort) :

1. **Le décor lointain garde sa lumière là où il ne gêne pas** : ciel, soleil, horizon embrasé, cité au loin.
   L'intention de `15-decor.js` (« la lumière vient du décor ») reste vraie AU-DESSUS du plateau.
2. **Derrière la zone de jeu, le décor se tait** : les plans qui passent sous les acteurs (P5 structures,
   P6 premier plan, le sol sous le plateau) sont assombris et désaturés d'au moins deux crans de palette
   (tables de couleurs, comme le reste du module ; pas d'alpha, pas de couleur hors des seize).
3. **Plus aucun aplat ni tramage jaune, ambre, brasier ou os à plus de 50 %** derrière les acteurs : ces
   couleurs sont celles des tirs, des cellules et des explosions.
4. Hors jeu (ouverture, titre, VOL, victoire, cartes), rien ne change.

## Comment le prouver (seuils d'acceptation)

Écris `proto-neon/tools/lisibilite/banc.mjs` (Playwright, profils iPhone 13 paysage 844 × 390, portrait
390 × 844, bureau 1440 × 900) qui, pour les vagues 2, 4 et 5 (`N.game.dbg.god(true); N.game.dbg.vague(n)`,
puis 5 s de jeu) :

- dessine le décor SEUL dans le tampon (`N.gfx.clear(0)`, puis `N.decor.drawFar(N.cam)`,
  `N.decor.drawPlateau(N.cam)`, `N.decor.drawFront(N.cam)`, en respectant les origines écran et monde comme
  le fait `src/79-jeu.js` dans `draw()`), puis compte les index de palette de `N.gfx.buf()` **dans le
  rectangle écran du plateau** (`N.world` / `N.cam`) ;
- relève aussi une capture d'écran normale de chaque cas, et regarde-la.

Seuils, dans le rectangle du plateau, sur chaque profil et chaque vague :
- pixels jaune + ambre + brasier + os **≤ 3 %** ;
- pixels de luminance relative > 0,25 (`N.pal.L`) **≤ 8 %** ;
- au-dessus de l'horizon, pixels « lumineux » (luminance > 0,10) **≥ 25 %** (l'intention du module tient) ;
- `window.__ERR.count === 0`, et le coût de l'image (`?perf=1`, `window.__S.perf.p95`) n'augmente pas de plus
  de 0,5 ms sur iPhone paysage par rapport à avant ta modification (mesure avant / après, même graine).

Donne les valeurs AVANT et APRÈS dans `proto-neon/tools/lisibilite/rapport.md`, avec les captures
`avant-*.png` / `apres-*.png` (paysage, vague 4) que tu commites.

## Les règles (proto-neon/COORDINATION.md)

- `git pull --rebase origin claude/snake-game-mobile-17dqpi` avant de commencer et avant chaque push.
- `cd proto-neon && node build.mjs` doit sortir 0 ; commite `index.html` reconstruit dans un commit à part.
- Honnêteté de la mesure : un seuil qui échoue se rapporte avec sa valeur ; n'affaiblis jamais un seuil ;
  « à vérifier » plutôt qu'une valeur inventée.
- Jamais `git add -A`, `git reset --hard`, `git stash`, ni `git checkout` d'une autre branche.
- Quand c'est livré : libère ta réservation dans `COORDINATION.md` et termine ton message de commit par
  « prêt pour /mediateur ». La session Claude jugera avec `/mediateur`.

## Correction du 18 octobre (réponse à la question de Codex)

Codex a démontré que les seuils d'origine se contredisaient : le rectangle du plateau couvre tout l'écran, ciel
compris (paysage : 422 × 195, horizon à y = 114). Garder 25 % du ciel lumineux donne à lui seul environ 14,6 %
de l'écran lumineux, au-dessus du plafond de 8 % ; et les vagues 4 sont déjà sous 25 % avant toute correction.
Le texte d'origine reste ci-dessus ; les seuils qui font foi sont désormais :

- **sous l'horizon** (`y > N.decor.horizon()`, dans le rectangle du plateau) : jaune + ambre + brasier + os
  **≤ 3 %**, luminance > 0,25 **≤ 8 %** (inchangés, mais mesurés là où le jeu se joue au sol) ;
- **au-dessus de l'horizon**, pendant le jeu : pixels de luminance > 0,10 **≥ 12 %** (au lieu de 25 %), et
  jaune + ambre + brasier + os **≤ 12 %**. Tu as le droit d'éteindre le lointain d'un cran pendant les états
  de jeu, soleil compris : la lisibilité prime sur la lumière du décor ;
- le reste (zéro erreur, coût de l'image + 0,5 ms au plus, hors jeu inchangé, captures avant/après) ne change pas.
