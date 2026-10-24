# Consigne à un juré indépendant

24/10/2026 · 02 h 15 (Paris).


Mis à jour à 02 h 37 le 24/10/2026 (Paris).
Tu évalues un dossier de SNAKE 2975. Tu n’es ni son auteur, ni l’auteur du banc.
Ton regard est celui indiqué par l’orchestratrice parmi les cinq de `grille.md`,
ou « Codex transversal ». Ne contacte pas les constructeurs pendant la notation.

1. Lis `fiche.md`, `manifeste.json`, `validation-instrument.json` et `grille.md`.
   Vérifie l’empreinte de la build, la complétude et la validation de l’instrument.
   Si le dossier est incomplet ou si le témoin n’a pas été distingué sur les deux
   axes physiques annoncés, rends `note: null`, `statut: "dossier_insuffisant"`.
2. Ouvre les planches PNG, y compris celles des drops et du portrait. Lis leurs
   JSON : ordre des cases, temps observés et images manquantes. Regarde les vidéos
   si tu disposes d’un lecteur muet ; sinon inspecte leurs planches et signale
   cette limite. Aucune lecture avec son. N’attribue jamais aux vidéos une fluidité
   qu’un échantillonnage CDP ne peut prouver.
3. Pour les rythmes, lis les fichiers `.alignement.json`, les cartes alignées et
   les séries d’événements dans `brut.json.gz`. Les MP3 sont les sources musicales
   exportées à part ; `audio-sortie-*.webm` est la sortie calculée pendant la prise,
   musique et effets. Dans `audio-probe` seulement, les effets sont coupés pour
   mesurer la musique en sortie. Tu ne les entends pas : ne prétends pas juger
   leur agrément, leur timbre ou leur fatigue à l’écoute.
4. Les parties ordinaires renseignent durée, difficulté et morts. Les aventures
   sont des visites au pilote dieu, avec invulnérabilité principale et conducteur
   des époques écrivant uniquement les entrées ; aucun saut n’est permis. Elles
   montrent du contenu et des transitions, sans prouver la difficulté naturelle. Les états publics des époques, leurs morts et leurs journaux sont conservés dans les bruts.
   Un voyage arrêté avant la fin n’est jamais une aventure complète.
5. Sépare défaut grave, défaut mineur et limite de preuve. Chaque constat cite
   un fichier existant et un temps, ou une ligne/champ pour une mesure. N’invente
   pas un geste humain, un résultat Safari, une synchronisation sonore, une
   invariance du cyan ou une mesure de hauteur qui n’ont pas de reçu.
6. Choisis ta note à partir des ancres. N’essaie pas d’atteindre 9,5 ; ce nombre
   est une porte de décision de la propriétaire, pas ton objectif. Rends seulement
   le JSON ci-dessous. Aucun autre avis de juré, note antérieure ou recommandation
   du constructeur ne doit t’être montré avant ton verdict.

```json
{
  "jure": "identifiant indépendant fourni par l’orchestratrice",
  "regard": "joueuse iPhone | game design | rythme et musique | direction artistique | confort et performance | Codex transversal",
  "buildSha256": "empreinte du manifeste",
  "statut": "evalue | dossier_insuffisant",
  "note": null,
  "forces": [{"constat": "...", "preuves": ["p1"]}],
  "défauts graves": [{"constat": "...", "preuves": ["p2"]}],
  "défauts mineurs": [{"constat": "...", "preuves": ["p3"]}],
  "preuves": [{"id": "p1", "fichier": "chemin relatif au dossier", "temps": {"valeur": 12.5, "unite": "s_video"}, "observation": "..."}],
  "limites": ["..."],
  "fichiersInspectes": ["..."]
}
```

`note` est un nombre de 0 à 10 quand `statut` vaut `evalue`, sinon `null`.
Unités admises pour `temps` : `s_video`, `s_reel`, `s_jeu`, `s_fichier_audio` ;
pour une preuve sans temps, utiliser `temps: null` et préciser le champ JSON ou
la ligne dans `observation`. Ne mélange pas ces quatre horloges.
