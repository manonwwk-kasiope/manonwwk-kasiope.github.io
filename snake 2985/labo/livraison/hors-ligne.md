# Migration et démarrage sans réseau

18/11/2026 · 01 h 04, Paris

L’édition locale `e76640d9cc7bd070` affiche la préparation des cinq époques après un redémarrage complet de Chromium hors réseau. Le navigateur avait d’abord installé le véritable jeu à quatre époques. Il a ensuite activé le nouveau service worker sur la même origine et gardé son profil sur disque. Les quatre scores et les quatre fantômes enregistrés par l’ancien moteur sont lisibles après le redémarrage. La clé 1995 est indépendante.

| Vérification | Résultat |
|---|---|
| Deux assemblages successifs | Les 23 fichiers livrés sont identiques octet par octet. Le service worker met les 22 autres ressources en cache. |
| Reprise à froid dans Chromium | Écran de préparation chargé ; le SHA-256 de chaque fichier correspond à la distribution. Le serveur local coupe aussi les sockets pour empêcher un recours au réseau. |
| Fragments d’images et de son | Le navigateur a servi une plage exacte sur chacun des 10 WebP et 5 MP3. Le banc Node couvre 60 réponses 206, les suffixes, les plages ouvertes, les validateurs et les plages impossibles en 416. |
| Première installation partielle | Avec une carte illustrée et une piste absentes dès l’installation, le jeu démarre hors ligne. La carte affiche un dessin de secours ; la piste reçoit 503. Leur première demande en ligne restaure les deux fichiers et leurs plages redeviennent disponibles hors ligne. |
| Échec d’actualisation | Le banc Node maintient le worker des quatre époques si le nouveau précache complet échoue. Une tentative neuve privée du code indispensable est refusée sans cache résiduel. |
| Décors peints | Chantier orbital, circuit antenne, étoile effondrée et quai verrière sont déclarés dans le worker et vérifiés en lecture complète et partielle. |

Le manifeste de cache découvre tous les WebP dans `labo/campagne/decors/`. L’identifiant d’édition couvre les octets de la distribution et du service worker. Le témoin `temoin-4-epoques/` contient les fichiers originaux de l’ancienne édition et reste exploitable après remplacement du jeu à la racine.

Exécuter `node hors-ligne.cjs` dans ce dossier pour le banc HTTP/Node. L’option `--browser` lance exclusivement le headless shell de Chromium avec son coupé, dans un profil temporaire supprimé en fin de test. Deux exécutions navigateur ont abouti. `hors-ligne-chromium.json` est le reçu de la dernière ; `hors-ligne-modele.json` contient le volet Node de cette même édition. Cette recette a utilisé une origine HTTP de boucle locale, des données fictives et le moteur Chromium. Le comportement de Safari sur iPhone et la diffusion publique relèvent de vérifications distinctes.
