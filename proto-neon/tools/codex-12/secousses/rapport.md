# Ordre14 — budget des secousses

18/10/2026 · 12 h 15 (Paris), mis à jour à 18/10/2026 · 12 h 15.

**80/80 parties paysage strictement identiques hors caméra ; 100/100 en incluant les20bon portrait/bureau. 0 erreur avant, 0 après (jeu/console).** 78/80 fins avant et 78/80 après ; mêmes expert/2 et dieu/9 bornés à540s, publiés dans bilan.json.

Base7e5037b : seuls02-regles et50-fx diffèrent dans les sources de la paire. Le vrai50-fx n’a jamais été édité : raccord-50-fx.patch est établi contre cette pointe et appliqué dans la copie apres-sources.json/bundle.gz. L’ajout02 est une configuration caméra : fenêtre1s, priorité forte égale au seuil caméra R12 existant. Une seule proposition, aucune recherche de difficulté ni seconde valeur.

## R14 en VM, sonde actuelle

| Profil, bon10 | Pire avant | Pire après | Médiane avant | Médiane après | Seuil après |
|---|---:|---:|---:|---:|---|
| paysage | 16,156 % | 11,939 % | 13,437 % | 10,346 % | tenu ≤12 % |
| portrait | 16,296 % | 12,330 % | 14,620 % | 11,176 % | échoué ≤12 % |
| bureau | 18,769 % | 14,412 % | 15,429 % | 11,668 % | échoué ≤12 % |

Lecture S.shake>0 après chaque vrai N.cam.update, avec la sonde simulerPartie actuelle copiée sans changement. Dix graines par profil ; les10bon paysage appartiennent aussi aux80, aucun doublon. Point de lecture et dénominateur du critère R14 conservés ; mesures VM, pas des images de Chromium. Détails par graine et compteurs bruts : bilan.json et recus/.

## Effet isolé, CYCLOPE et flashs

12/12 contrats réels de50-fx conformes. Les six courbes isolées (2,2/6/12px, PX2/4) sont strictement identiques avant/après, pic et durée compris. Une rafale ordinaire construite de120pas passe de120 à20pas secoués ; le CYCLOPE reprend immédiatement sa pleine amplitude, l’écriture directe S.shake reste conservée et la préférence0 produit toujours0. Aucun budget imposé aux flashs :120 décisions/journaux de la porte sont strictement identiques sous les mêmes sollicitations.

Le budget ne somme plus les petits coups dans sa fenêtre : la crête la plus forte remplace la précédente, les faibles ne réamorcent pas la queue. Une frappe forte reprend la main immédiatement. La décroissance reste2,4/s ; l’horloge dédiée du budget ne change pas clk, l’âge des effets ou les tirages aléatoires. Les comparaisons de flash ne valent pas une qualification générale R13 au tampon : les défauts préexistants de l’ordre13 restent publiés.

Une erreur de contrat initiale comparait des prototypes de deux contextes VM : échec conservé dans contrats-avant-normalisation.json ; seule la comparaison JSON stricte du contrat de flash a été corrigée/rejouée, sans retoucher le candidat ni les onze contrats déjà passés.

## Égalité du jeu et portée

Chaque reçu complet est comparé en JSON strict, y compris journal, score, horloge, fin, vies, cartes, mouvements et transitions. Seuls parPas.secoues et les métadonnées phase/source sont exclus. Pas de tolérance numérique, de filtrage d’événements ni de remplacement de seuil. Les100comparaisons figurent dans bilan.json ; toute divergence est publiée. Sources/protocole figés par phase, un processus de graine à la fois, reçus conservés et aucun replay de campagne. Aucun verdict de ciblesB ni garantie de parité stricte VM/Chromium.

## Vérification prête pour Claude

verifier.mjs sert cette même paire figée et mesure R14/R12/R13 sur les trois profils. Chromium muet, un seul à la fois. En exécution directe il acquiert le verrou Chef atomiquement et attend témoin boîte absent/zéro headless. Avec --verrou-detenu, l’appelant Chef garde son verrou, jamais retiré par ce script. Le mode --seulement R14 publie une portée partielle sans réduire les graines/durées. Syntaxe et aide CLI vérifiées ; **aucun Chromium lancé par la boîte pour ce lot** et aucun résultat navigateur revendiqué. Avant tout lancement, le contrôleur a aussi été corrigé pour isoler les caches par profil : le critère R14 copié ne transmet pas ce profil à lot(), et un dossier commun aurait réutilisé les parties paysage. Aucun reçu Chromium n’existait ; instruments officiels inchangés. Voir LISEZMOI.md avant application/intégration par la cheffe après p35/p38.

**Lot arrêté, palier non validé** : conserver les échecs dans bilan.json et arbitrer avec Claude ; aucune seconde valeur essayée.
