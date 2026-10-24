# Proposition du cloud pour le chantier n° 1 (le tempo qui change) — à comparer avec codex-p33b

Préparée pendant que la réservation de codex-p33 semblait caduque (aucun commit de 04 h 18 à 07 h 18) ; la médiation
de 07 h 24 a ensuite confié la reprise à codex-p33b. Pour ne pas créer deux tempos concurrents dans `30-music.js`, ce
correctif n'est PAS appliqué : il est rangé ici pour que la cheffe d'orchestre le compare, le confie à p33b, ou l'applique.
`git apply refonte/propositions/tempo-cloud.patch` sur 87b7a33 (7 fichiers, +290 / −40), puis `node build.mjs`.

## Ce qu'il fait
- `N.music.tempoJeu(défaut)` : en aventure, le tempo qui joue (`N.music.tempo()`) ; hors aventure, la constante
  d'origine, au caractère près. Branché sur 76-directeur (apparitions sur les temps), 74-arsenal (ONDE), 17-vol (tempo
  pris au départ du VOL), 15-decor (sol, soleil, clignotement).
- Changements mis en scène dans `30-music.js`, en varispeed « bande » (k = 2^(n/12), tempo et hauteur ensemble), toujours
  sur une barre : pic de vague +1 demi-ton (×1,06, mesure de montée) ; INVERSION / RALENTI demi-temps ×0,5 (coupure de
  250 ms) puis retour (stinger) ; vague nettoyée → ×1 ; CYCLOPE : coup de frein sur une barre puis +2 (×1,12).
  Réglages : `N.R.musique.tempoScene = { montee: 1, demi: -12, cyclope: 2 }`.

## Mesures (Chromium)
- Tempo relevé : piste 143,76 → 152,31 au pic → 71,88 à l'INVERSION → 152,31 → 143,76 vague nettoyée ; electro-calme
  114,67 → 121,66 → 57,3 → 121,7 ; voix-duo au CYCLOPE 121,8 → 69,1 (frein) → 144,6. Carte des barres recoupée : 1 à 11 ms.
- Hors aventure : 3 graines × 2 protocoles identiques (relevés et journaux) ; témoin aventure forcée : différent dès le 1er relevé.
- Bancs : voyage tout passe ; aventure 321/321 ; H/morceaux 60/60 en paysage (contrôle du CYCLOPE adapté : il lisait le
  tempo pendant le frein, comportement voulu ici — c'est sans doute aussi la cause du 174/180 de p33).

## Réserves
Écoute réelle sur iPhone nécessaire (demi-temps une octave plus bas, voix comprises) ; le demi-temps peut déborder d'une
barre (≈ 4 s à ×0,5) ; la voix de voix-duo peut entrer pendant le frein ; inscrire `[60, '30-music']` pour `inversion`,
`pouvoir`, `phase` dans EVT de 03-socle.
