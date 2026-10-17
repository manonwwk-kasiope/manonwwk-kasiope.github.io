# codex-06 — commandes bureau et priorité du doigt

18/10/2026 · 01 h 08 (Paris).

**28 contrôles sur 28 passent, zéro erreur de jeu, de console ou de page.** Source limitée à `src/90-boot.js` ; banc, reçus et captures dans ce dossier. Revue indépendante attendue.

- Clavier : Espace et les deux Maj tiennent réellement le boost (réserve consommée, événements on/off), E déclenche un pouvoir équipé, R déclenche APOGÉE avec jauge pleine ; une seule impulsion. Espace n'active plus la cadence de tir. P/Échap mettent en pause et reprennent. Les dix touches de direction (flèches, ZQSD, WASD) pilotent le cap de la joueuse.
- Souris : cap vers le pointeur converti par la caméra, zone morte de 24 px CSS autour de la tête ; gauche tenu boost, droit pouvoir, molette APOGÉE. Le curseur se cache après 1,5 s sans mouvement et revient au mouvement suivant. Les taps de menus restent au relâchement.
- Manette : stick gauche, A boost, X pouvoir, Y APOGÉE, Start pause. Les boutons ponctuels sont lus sur front montant ; tenir Start n'alterne pas la pause. Le banc compte dix lectures de getGamepads pour dix images (deux pas par image), et contrôle S.input.manette. La manette est émulée à l'API standard, pas testée sur un contrôleur physique.
- iPhone : le manche garde sa direction et son amplitude malgré une souris, une manette et des touches concurrentes ; le second doigt tient le boost, son toucher déclenche le pouvoir, son glissé APOGÉE. Les événements de bureau ne volent plus le manche. Clavier/souris attendent leur premier usage.

Preuves : [apres/sortie.json](apres/sortie.json), [avant/sortie.json](avant/sortie.json). Le banc rejette bien l'ancienne implémentation sur les nouvelles commandes ; les directions et pauses déjà présentes y passent. Aucun effet du jeu n'est remplacé : les événements DOM rejoignent le vrai frame(), qui met à jour la joueuse ; le god de préparation évite seulement une mort incidente. Le pouvoir et la jauge sont préparés par leurs API publiques, pas forcés à l'état « actif ».

**Conservation tactile : six instantanés strictement identiques avant/après**, y compris leurs journaux, et mêmes horodatages relatifs des gestes. Sources : [comparaison-tactile.json](comparaison-tactile.json), `tactile-avant/` et `tactile-apres/`. Ce scénario ne contient que les gestes du téléphone ; le scénario concurrent du banc principal prouve en plus leur priorité.

Les premiers résultats de l'instrument sont conservés séparément (`instrument-initial/`, non admissibles comme verdict final) : le journal cumulait des événements d'autres scénarios, et l'assertion souris attendait un angle absolu malgré le mouvement de caméra. Le journal est maintenant vidé entre cas et la direction est contrôlée par le cap réel de la joueuse et le vecteur réellement visé. L'horloge de test est arrêtée puis avancée explicitement ; `preuve-horloge-tactile/` montre 160 ms avant le second doigt, puis 181 ms de tenue. La méthode corrigée a d'abord été prouvée sur ce cas avant le banc entier. Aucun seuil du jeu ni garde tactile n'a été changé.

Les SHA des bundles et du protocole sont dans chaque JSON. Chromium muet, bureau 1440 × 900 et iPhone 13 paysage 844 × 390 émulés. Le bilan des contrôles ne qualifie ni la difficulté ni l'appareil physique. Les réserves de codex-05 restent ouvertes dans `tools/horloge/rapport.md` ; aucune ne se transforme en réussite par cette livraison.

Mis à jour à 01 h 09 : après intégration du nouveau 79-jeu / 10-gfx (codex-p6) et de l’affiche duo, les 28 contrôles passent encore, zéro erreur (`integration/sortie.json`). Aucun autre banc déjà conforme rejoué.

Prêt pour /mediateur.
