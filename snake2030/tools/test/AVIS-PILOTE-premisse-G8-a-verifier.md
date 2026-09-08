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

## MESURÉ par le pilote — chiffres, script rejouable `tools/test/pilote-hitstop.mjs`

Bureau 1440×900, partie réelle, sonde posée dans la boucle d'image, grandeur relevée : le nombre d'images
consécutives où `S.dt` descend sous six millisecondes.

| protocole | images ralenties |
|---|---|
| `fx.hitstop(12)` appelé directement | **1** |
| `fx.hitstop(55)` appelé directement | **4** |
| kill réel de traqueur | non mesuré, voir plus bas |

**La prémisse de l'audit est fausse.** Le gel ne produit pas zéro image : douze millisecondes en
produisent une, cinquante-cinq en produisent quatre. L'audit regardait les écarts entre images de la
boucle d'affichage, qui restent à 16,7 ms quoi qu'il arrive ; ils sont bien à 16,7 ms dans ma mesure
aussi, au moment même où `S.dt` tombe à un huitième. Les deux grandeurs disent des choses différentes et
seule la seconde parle du gel.

**Mon hypothèse de lecture était fausse aussi.** J'avais prédit trois images pour douze millisecondes, en
supposant que le compteur se vidait de quatre millisecondes par image, son plancher. Il s'en vide en fait
d'environ seize : `fx.update` reçoit le temps réel et non le temps de jeu ralenti. D'où la règle
observée, une image par tranche de 16,7 ms demandée — douze millisecondes donnent une image,
cinquante-cinq en donnent quatre.

**Ce que vaut un kill ordinaire aujourd'hui.** Le chemin est sans ambiguïté et n'a qu'un seul point
d'appel : `22-enemies.js` ligne 1834 appelle `fx.kill`, qui appelle `_fxHitstop(big ? 55 : 12)` sans
condition. Un kill ordinaire gèle donc **une image**, une élite ou un boss **quatre**. La spécification
en demande deux et cinq. Le travail est réel, mais c'est un étalonnage, pas un mécanisme à construire.

**Ce que je n'ai pas mesuré, et je le dis.** Mes trois tentatives pour déclencher un vrai kill dans la
fenêtre de mesure ont rendu zéro kill : forcer les points de vie ne suffit pas à faire mourir un ennemi
dans le temps imparti. Le « une image » du kill ordinaire est établi par le chemin de code et par l'appel
direct, pas par une mesure de bout en bout. À l'implémenteur de la faire.

## Ce que cela change pour l'implémenteur

**Mesure d'abord, n'implémente pas d'emblée.** Pose un crochet dans l'image, compte les images
consécutives où `S.dt < 0,006` après un vrai kill de traqueur, et rapporte le nombre trouvé. Trois cas :

* tu retrouves une image pour douze millisecondes : le gel fonctionne déjà, la prémisse de l'audit est fausse, et le
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
