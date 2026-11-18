# Veille du rendu de campagne

**18/11/2026 · 01 h 22, Paris**

Dans la chambre observée, la mise en pause, la fin de partie et la préparation conservent une boucle `requestAnimationFrame`. Le plateau est déjà mis en cache par `dataset.frame`, mais la fonction `sync()`, les lectures d’état et la planification de l'image suivante restent actives. Le banc de recettes dessine au minimum à 40 ms d’intervalle ; le passage d'époque anime ses bandes pendant 740 ms. L'horizon peint arrive depuis une promesse. Sources locales : `campagne/chambre.js`, `campagne/banc.js`, `campagne/matieres.js` et le module `SnakePassage`.

## Raccord proposé

Charger `../veille-rendu/veille.js` avant `chambre.js`. Installer une seule ordonnance avant le premier appel à `preparation`. Sa fonction de cadence est lue après chaque dessin ; une transition qui se termine dans l'image courante s'endort immédiatement.

```js
const veille = SnakeVeille.create(frame, () => {
  if (screen === 'play' || (screen === 'prep' && !ui.passage.hidden)) return 0;
  if ((screen === 'prep' || screen === 'upgrade') && banc.animated && !calm.matches) return 40;
  return null;
});
const banc = SnakeVeille.preview(SnakeBanc, veille.wake);
```

- Dans `show`, utiliser `banc.stop()` et appeler `veille.wake()` au changement d'écran. Les demandes synchrones sont regroupées. Remplacer les autres usages de `SnakeBanc` par `banc` pour le `select`, le `frame` et la propriété passée à `SnakeAtelier.mount`. L’atelier lance sa démonstration dès son ouverture.
- Remplacer `function frame(now)` par `function frame(now, repaint, resumed)`. Utiliser `const dt = clock === null || resumed ? 0 : Math.min(.08,(now-clock)/1000)` puis `clock=now`. Conserver les appels originaux à `sync()`, au banc, à la transition et au moteur. Pour le dessin du plateau, utiliser `if (repaint || screen==='play' || ui.monde.dataset.frame!==frameKey)`. Supprimer les deux appels directs à `requestAnimationFrame(frame)` et utiliser `veille.wake()` à la fin du démarrage.
- À la création d'une partie capturer son identité : `const session = state; SnakeMatieres.load(session.year).then(ready => { if (ready && state === session) veille.wake(); });`. Le décor procédural apparaît dès le premier dessin. L'arrivée de la peinture réveille aussi une pause ou une fin de partie. Une ancienne promesse ne redessine pas la nouvelle session.
- Après changement de la préférence de mouvement, appeler `banc.motion(calm.matches); veille.wake();`. Raccorder également `systemMotion.addEventListener('change', ...)`. L'aperçu animé devient sa pose de référence lorsque les animations sont réduites.
- La page, son cache de navigation, le redimensionnement et l’ouverture/fermeture d’un dialogue sont suivis par le module. Le premier dessin après une interruption reçoit `resumed=true`. Le lecteur tactile des archives garde sa propre animation pendant l’ouverture de son dialogue. `veille.destroy()` annule les tâches et libère les écouteurs en cas de démontage de la chambre.

## Vérification

`node --test veille.test.cjs` vérifie le regroupement des réveils, la reprise sans rattrapage, les futures peintures, le redimensionnement, le cache de navigation, les dialogues, les aperçus de préparation et d’atelier, le mouvement réduit, la fin d’une transition et le démontage pendant un dessin.

Sur une minute simulée avec une synchronisation toutes les 16 ms, le jeu continu appelle 3 750 fois le rendu. La pause, la fin et la préparation statique produisent chacune un unique dessin initial, puis zéro rappel. La page cachée ne produit aucun rappel. Le banc animé produit 1 250 dessins, conformément à son délai minimal et à cette cadence simulée. Les résultats sont enregistrés dans `mesures.json`. Ces chiffres concernent les réveils JavaScript ; la consommation électrique du téléphone n'a pas été mesurée.
