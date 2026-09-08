# Avis du pilote — une prémisse de G8 est douteuse, à vérifier AVANT d'implémenter

L'audit qui fonde G8 affirme : « Rejoué en direct : `fx.hitstop(12)` → 0 image gelée (dts 16,7 ms
partout) ». La lecture du code contredit ce constat, et l'écart vient probablement de la grandeur mesurée.

## Le gel existe depuis l'origine du projet

Il n'a pas été ajouté par cette branche. Dans `src/90-boot.js`, `frame()` fait, et le faisait déjà au
commit fondateur `5e2ab3d` :

    var hs = S2030.fx.hitstopLeft();
    var scale = hs > 0 ? 0.08 : S.timeScale;
    var dt = raw * scale;

Et `src/20-fx.js` décrémente `_fxHit` d'au moins quatre millisecondes par image, plancher explicite pour
que le compteur avance même quand le cœur ralentit `dt`. Un `hitstop(12)` devrait donc produire environ
trois images à `S.dt` proche de 0,0013 s, très en dessous du seuil de 0,006 s du test 1.

## Pourquoi l'audit a pu voir zéro

Un hitstop ne gèle pas le temps de l'horloge, il ralentit le temps du jeu. Les `dts` cités par l'audit
sont des écarts entre images successives mesurés par `requestAnimationFrame` : ils restent à 16,7 ms quoi
qu'il arrive, puisque l'écran continue de rafraîchir. Mesurer les `dts` pour juger d'un hitstop revient à
regarder la trotteuse pour savoir si le film est au ralenti. La grandeur juste est `S.dt`, et c'est
d'ailleurs celle que le test 1 de la spécification demande.

## Ce que cela change pour l'implémenteur

**Mesure d'abord, n'implémente pas d'emblée.** Pose un crochet dans l'image, compte les images
consécutives où `S.dt < 0,006` après un vrai kill de traqueur, et rapporte le nombre trouvé. Trois cas :

* tu comptes environ trois images : le gel fonctionne déjà, la prémisse de l'audit est fausse, et le
  travail de G8 sur ce point se réduit à passer l'API des millisecondes aux images et à caler les valeurs
  demandées (kill ordinaire 2, élite 5, blessure 4, mort 8) ;
* tu comptes zéro image : la prémisse est juste et il y a un vrai défaut à trouver — dis lequel, avec la
  ligne fautive ;
* tu comptes autre chose : rapporte le chiffre tel quel.

Dans les trois cas, **écris le nombre mesuré dans ton compte rendu**. Ne recopie pas le « aujourd'hui 0 »
de la spécification sans l'avoir revérifié : une prémisse fausse conduit à réparer ce qui marche, et à
manquer ce qui ne marche pas.

Le même doute vaut pour les deux autres affirmations de l'audit, qui elles se vérifient par simple
recherche et que j'ai contrôlées : `au.sfx('ultReady')` existe dans `21-audio.js` et n'a effectivement
aucun appelant ; `fx.hit()` existe dans `20-fx.js` et n'a effectivement aucun appelant. Ces deux-là sont
justes.
