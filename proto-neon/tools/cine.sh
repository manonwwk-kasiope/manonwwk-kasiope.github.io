#!/bin/sh
# Télécharge les quinze clips de cinématique et d'intermède (refonte/INTERMEDES.md) générés sur Higgsfield (Kling 3.0, 1912 x 1080, 24 i/s, 5 s,
# chacun animé à partir de son panneau de art/) et les réduit au format du jeu dans cine/ :
# 384 x 216, douze images par seconde, H.264 sans son. 05-art.js les tramera dans la palette à la volée.
# Prérequis : d8j0ntlcm91z4.cloudfront.net autorisé par la politique réseau de l'environnement, et ffmpeg.
set -e
cd "$(dirname "$0")/.."
B=https://d8j0ntlcm91z4.cloudfront.net/user_2zAigZWKtEbZRffWMKw7amURquW
T=$(mktemp -d)
mkdir -p cine
while read -r nom fichier; do
  curl -sSf -o "$T/$nom.mp4" "$B/$fichier"
  ffmpeg -nostdin -y -v error -i "$T/$nom.mp4" -vf "scale=384:216:flags=lanczos,fps=12" -c:v libx264 -profile:v main \
    -level 3.0 -pix_fmt yuv420p -crf 25 -preset veryslow -tune animation -an -movflags +faststart "cine/$nom.mp4"
  echo "$nom : $(wc -c < "cine/$nom.mp4") octets"
done <<'LISTE'
affiche hf_20261017_132548_3689727a-48f4-4b51-a1b5-b33f7faa1b04.mp4
exterieur hf_20261017_132547_e966c109-9905-4e77-86dc-9308e34ac5ba.mp4
connexion hf_20261017_132547_16455135-c944-4382-abe7-ccd6c2067058.mp4
eveil hf_20261017_132547_87fc9419-721c-42d7-8934-bfb2d73baf86.mp4
briefing hf_20261017_132548_0a08d118-80d4-4654-a0be-eb2798af99d5.mp4
alerte hf_20261017_132548_2d05f50d-9bea-48dd-a0ae-12e1ac4bc01c.mp4
boss hf_20261017_132548_b2801323-6ef8-4980-b192-df6e487b8543.mp4
victoire hf_20261017_132559_218f960d-d35b-453f-b326-3bed81198244.mp4
defaite hf_20261017_132547_54b2ce0b-b80b-4231-ad0d-a5f31b7c05ba.mp4
chasse hf_20261017_211056_c23c4530-c815-478d-ac3f-1c9e11f182eb.mp4
retournement hf_20261017_211056_368917f9-8837-411e-95b7-e1e47aaeab47.mp4
rival hf_20261017_211057_aebaf3b2-00dc-453b-a664-b4912b7cafe1.mp4
plongee hf_20261017_211056_731d70fa-5e14-41f4-b807-e9dfcf7ea100.mp4
reveil hf_20261017_211056_9ad5aacf-ca1d-4fa5-a366-e08fc8c81f35.mp4
apotheose hf_20261017_211114_db5d10b0-7639-4328-9c1d-28d51ad32643.mp4
LISTE
rm -rf "$T"
