# SNAKE 2975 — les intermèdes : des mini-films 8 bits entre les moments de jeu

Demande de la propriétaire (17 octobre, soir) : « je veux que le jeu soit entrecoupé de mini films 8 bits
faits sur Higgsfield ». Ces films sont générés sur Higgsfield (image clé GPT Image 2.5, animation Kling 3.0,
5 s), réduits par `tools/cine.sh` à 384 × 216 et 12 images/s dans `cine/`, puis convertis EN DIRECT en vrais
gros pixels de la palette par `05-art.js` (`N.art.play / get / stop / ended`). Chacun a aussi son panneau
fixe dans `art/` (première image convertie), pour le repli sans vidéo.

| film | moment | durée | sautable |
|---|---|---|---|
| `affiche` | écran-titre, en boucle | — | — |
| `exterieur`, `connexion`, `eveil`, `briefing` | l'ouverture | 2 s chacun environ | oui |
| `chasse` puis `retournement` | après la vague 1, avant les cartes : le serpent poursuivi, puis la chasse qui s'inverse, façon intermède de Pac-Man | 2,5 s + 2,5 s | oui |
| `plongee` | entrée dans LE VOL | 2 s | oui |
| `rival` | annonce du RIVAL (phase 2) | 3 s | oui |
| `reveil` puis `alerte`, `boss` | annonce du CYCLOPE | 2 s + 3 s | oui |
| `apotheose` puis `victoire` | victoire | 3 s puis boucle sous le bilan | oui |
| `defaite` | défaite, sous l'écran de fin | boucle | — |

Règles : le jeu est gelé pendant un intermède, un toucher le saute (garde de 300 ms), la musique passe à la
section prévue sur la mesure, aucun intermède ne dure plus de 6 s, et le même intermède ne revient pas deux
fois dans une partie. C'est au lot 2 (`60-intro.js`, `N.intro.transition`) de les jouer et à `79-jeu.js` de
les appeler aux transitions d'état ; l'intégrateur vérifie l'enchaînement complet.
