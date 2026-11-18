# Recette de quantification dans Safari

18/11/2026 · 01 h 20 (Paris)

Ce banc ouvre MobileSafari du système sur le simulateur iPhone 17 iOS 27.2. XCUITest oriente le simulateur, ouvre une URL sur 127.0.0.1 et attend la fin. Le serveur ne sert que les scripts et images lus et hachés à son démarrage. La politique du document interdit les médias et le premier script rend inopérantes les API de lecture. Le serveur accepte les mesures de sa propre origine sur un point d’entrée aléatoire. La cible d’interface ne dispose pas d’application hôte personnalisée.

Après réservation du simulateur, préparer le bundle local avec `python3 preparer-xctest.py`, puis exécuter `SNAKE_QUANT_XCTEST="chemin xctestrun retourné" python3 lancer.py --creneau-accorde`. Le lanceur n’amorce que l’iPhone 17 ciblé s’il est initialement éteint. Il ferme le serveur et arrête ce simulateur à sa sortie.

Chaque format teste trois empreintes du canevas visible, puis quatre fenêtres par variante. Les deux variantes utilisent l’algorithme et le choix de surface du dépôt, en exposant le convertisseur optimisé ou en laissant le rendu choisir son repli intégré. Deux lectures de l’horloge encadrent uniquement la branche de conversion. Le passage à 568 points conserve le Safari utilisé à 874 points, recharge les mêmes ressources immuables et attend que chaque surface soit entièrement visible. Aucun prélèvement par capture XCTest n’a lieu pendant le chronométrage nominal.

Lancer `python3 analyser.py safari-HHMMSS.jsonl` sur la passe complète. Le fichier `safari-011518.jsonl` constitue un essai préliminaire interrompu par le délai d’une ancienne version compilée du test. Ses chronométrages sont exclus du rapport.
