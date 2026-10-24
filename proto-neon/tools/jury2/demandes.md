# Raccords du banc j1

24/10/2026 · 02 h 29 (Paris).

| mission | fichier | besoin | raison |
|---|---|---|---|
| codex-j1 | `musique/morceaux/structure.json` (r1) | intégrer la carte r1 ou la passer avec `--carte` | elle n’est pas présente dans la build reçue ; le banc vérifie le prérequis avant tout lancement de Chrome, puis copie la carte et son empreinte dans le dossier |
| codex-j1 | `30-music.js` (t1), seulement si les blocs NV accélèrent | publier le curseur de fichier réellement audible, ou enrichir les données publiques de lecture avec ses ancres de vitesse | la conversion des blocs à vitesse 1 est exacte sur le moteur reçu ; elle est refusée si son tempo diffère de celui de piste.json. Le curseur `morceau().t` des pistes longues reste suivi directement, y compris quand sa vitesse change |
| codex-j1 | `32-adapte.js` (d1) | conserver une méthode publique `state()`, `etat()` ou `info()` retournant les coefficients et le niveau | le banc exporte les valeurs réellement publiées en JSON, CSV et courbes ; sans contrat, il ne devine pas quel champ représente une compétence ou un coefficient de difficulté |
| codex-j1 | hors bac | lancer la commande en tête de rapport.md, retourner les deux manifestes et `validation-instrument.json` | serveur et Chromium interdits dans ce bac ; aucune tentative, aucun contournement, aucun réseau sortant |

Aucun chiffre de gameplay ajouté, aucune modification de N.R. Les paramètres
d’acquisition et du témoin sont confinés à `protocole.mjs`, comme les paramètres
d’analyse r1 ; ils ne sont pas chargés par le jeu livré. Les seuils du jeu sont
lus dans N.R ; les portes de rythme et difficulté reprennent INCROYABLE.md.
