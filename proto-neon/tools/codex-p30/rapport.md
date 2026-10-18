# codex-p30 — tête et arsenal, R-37

18/10/2026 04:16:26 (Paris).

**Commande hors bac :** `cd proto-neon && node tools/codex-p30/verifier.mjs`. Préparée, contrôle de syntaxe réussi, jamais exécutée ici : serveur local et Chromium interdits dans ce bac.

**Lot préparé, intégration non achevée.** Le dessin livré dans 70/74 supprime les pixels proches et place la tête en dernier. La fermeture complète dépend du correctif séparé [40-sprites-gaine.patch](40-sprites-gaine.patch), appliqué uniquement en mémoire pour les mesures finales. Le fichier partagé 40-sprites.js et le critère R-37 sont inchangés. Aucun commit, aucun réseau sortant.

## Modifications

- 70-joueuse.js : sprite de tête posé après bouclier, critique et chevron ; aucune mise à jour du jeu modifiée.
- 74-arsenal.js : exclusion visuelle autour de la boîte réelle de tête, élargie du silence existant de 3 px. Toutes les primitives de l'arsenal passent par les dessinateurs locaux ; hors de la zone, les primitives rapides de N.gfx restent employées. Positions de naissance, trajectoires et collisions inchangées. Aucun champ privé supplémentaire lu ; aucune fonction d'un autre module remplacée.
- 02-regles.js : ajout lisibiliteP30.teteHz=5, fréquence historique déplacée depuis le dessin de tête, partagée avec son calcul de boîte. 75-cartes.js ne nécessite aucun changement.
- Correctif séparé 40 : les yeux transparents prennent nuitProfonde. Leur forme reste sombre sur un fond clair ; le cyan du sprite reste inchangé. Les trous laissés transparents faisaient compter leurs voisins cyan comme bord dans l'instrument R-37 reçu.

## Instrument et VM

Validation historique obligatoire : 10/10 parties e1bdc6f reproduites exactement (temps jeu/combat, pas, temps simulé, vague, score, état et erreurs), reçu [validation-vm.json](validation-vm.json). Vraies sources concaténées comme build.mjs, même fermeture, sans DOM ; protocole officiel des pilotes, localStorage vide et jour20261017. La VM ne qualifie ni Safari ni le CRT navigateur.

Les trois cas construits tête seule, tir collé et tête recouverte donnent respectivement proximité0/différence0, proximité1, différence1. Le vrai sprite isolé est testé dans ses 48 poses : gaine0/48 avant →48/48 avec le correctif séparé. Seuils inchangés ; aucun faux compteur d'appel utilisé. Voir [diagnostic-avant.json](diagnostic-avant.json), [diagnostic-apres.json](diagnostic-apres.json), [diagnostic-correctif.json](diagnostic-correctif.json).

## R-37, vraies captures du tampon VM

Scène v5, trois images initiales puis dix captures espacées de trente images comme le banc du critère, vrai masque de propriété et dernier sprite observé. Trois profils, un seul calcul local ; PNG dans pixels-vm/ (ce ne sont pas des captures navigateur).

| Profil | Gaine complète | Sprite intact | Arsenal à moins de3px, pire | Cyan hors tête/corps, pire |
|---|---:|---:|---:|---:|
| paysage | 0/10 → 10/10 | 10/10 → 10/10 | 8 → 0 | 0.870 % → 0.859 % |
| portrait | 0/10 → 10/10 | 10/10 → 10/10 | 10 → 0 | 0.934 % → 0.913 % |
| bureau | 0/10 → 10/10 | 10/10 → 10/10 | 8 → 0 | 0.857 % → 0.847 % |

Le résultat après comprend le correctif de sprite en mémoire. **Sans ce correctif**, le diagnostic paysage livré donne gaine0/10, sprite10/10 et arsenal proche0. La batterie historique318ce61 rapportait0/10,9/10 et6 ; elle n'est pas le témoin avant de cet état reçu566340a.

## Parties avant/après

**80/80 identiques**, huit pilotes × dix graines, état reçu avant/après et correctif de sprite en mémoire après. Comparaison de tous les champs retournés, dont temps de jeu/combat, vague, score, morts, armements et SHA-256 du journal complet. 80/80 fins avant, 80/80 après. Erreurs jeu/console : 0 avant, 0 après. Reçus avant-parties.json, apres-parties.json et comparaison.json. La référence historique n'est pas utilisée pour exiger la parité des sources actuelles.

## R-03 et R-13, régressions et limites conservées

R-03 : 37/37 captures admissibles restent identiques pour la part de cyan hors masque (comparaison.json détaille chaque valeur). Cinq captures restent **non mesurables** : mortTir reste jeu en paysage et bureau ; vol affiche encore le panneau plongee dans les trois profils. La mort portrait est bien atteinte. Ces cinq cas ne sont pas validés. Aucun de ces cas n'est retiré pour annoncer une conformité globale.

R-13 : minute complète de charge par profil, vraies images, trente destructions sollicitées sur deux secondes. Deux événements opposés et seuils0,1/0,8/6,6% repris du critère inchangé. Le contrôle brut du journal compte tous les accepte, y compris sous-seuil/rafale ; la colonne _compte est informative et ne remplace pas son échec.

| Profil | Max flashs/s pixels avant→après (seuil3) | Acceptés bruts/s avant→après | _compte/s avant→après | Journal |
|---|---:|---:|---:|---|
| paysage | 1 → 1 | 32 → 32 | 3 → 3 | identique |
| portrait | 4 → 4 | 22 → 22 | 3 → 3 | identique |
| bureau | 2 → 2 | 13 → 13 | 3 → 3 | identique |

Les échecs préexistants restent publiés ; **R-13 global n'est pas validé**. Aucun effet, seuil ou limiteur modifié dans ce lot. Zéro erreur mesurée sur les trois profils (valeurs détaillées dans comparaison.json).

## Vérifications et reste

Build demandé : node build.mjs, sortie0 (build.log). git apply --check du correctif séparé réussi. Le script Playwright prépare les mêmes cas construits et mesures avant/après/sans correctif sur iPhone13 paysage844×390 tactile, portrait390×844 et bureau1440×900, un seul Chromium --mute-audio en série, captures réelles, masque, état, journaux et erreurs. Les requêtes extérieures sont bloquées.

**Chantier bloqué pour la validation finale :** intégrer le correctif séparé de40 avec codex-p27, reconstruire, faire exécuter le banc hors bac et qualifier Safari. Faire examiner par les propriétaires du banc/effets les échecs R-13 et les cinq captures R-03 non mesurables. Aucun résultat navigateur inventé. Les travaux indépendants autorisés de ce lot sont livrés ; aucun commit.
