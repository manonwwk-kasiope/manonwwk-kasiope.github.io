#!/bin/sh
# Télécharge les clips de cinématique, d'intermède (refonte/INTERMEDES.md) et des deux pilotes (VISION-PROGRESSION.md § 6) générés sur Higgsfield (Kling 3.0, 1912 x 1080, 24 i/s, 5 s,
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
pilote-elle hf_20261017_222702_d6d74dcf-8c50-4e68-85d8-b5013bd37627.mp4
pilote-lui hf_20261017_222702_359f8e29-d545-4753-b95f-eafe0404c4d0.mp4
connexion-elle hf_20261017_222642_9e7d3fc6-2b77-4b43-9fff-ac916abe1e9f.mp4
connexion-lui hf_20261017_222642_4f7d5601-e03c-44be-bd67-5e3488c425f4.mp4
fin-elle hf_20261017_222642_bd8b9225-535d-4808-a0fc-a33c536301c1.mp4
fin-lui hf_20261017_222702_e011b7ef-b469-49ef-9080-9318d6c41f87.mp4
retrouvailles hf_20261017_222642_7c709f67-23a6-465c-9c1c-7c7adc16b90d.mp4
teaser-3019 hf_20261017_222642_45c8590f-76e6-4fad-9335-ded6519add1c.mp4
fissure-elle hf_20261017_222924_555f7f12-3e45-4b52-b779-67bea338055a.mp4
fissure-lui hf_20261017_222925_40f2a1d2-bca8-449f-a340-521712a1af41.mp4
profondeur-elle hf_20261017_222932_192dca7d-752b-48a4-96f1-819ac8780b28.mp4
profondeur-lui hf_20261017_222924_b77a6bf3-5370-44e8-82a1-894f872c3f35.mp4
warp-elle hf_20261017_222924_de0567ff-6af8-429f-b7b0-824e742f4802.mp4
warp-lui hf_20261017_222924_c158f6a0-07f2-45b5-b9d9-3a28190d6a1a.mp4
espace-elle hf_20261017_222950_52d14ec1-5e9f-45cc-b3d9-de86e3cec15d.mp4
espace-lui hf_20261017_222924_0feba397-4848-4bed-8690-d590290e8f6c.mp4
chasse-elle hf_20261017_223948_57c5d05a-075e-4ac8-bf7d-d813e36e36e9.mp4
chasse-lui hf_20261017_223947_dc85f237-bae4-4525-a465-e4ede605471e.mp4
retournement-elle hf_20261017_223948_43a89bb5-d53f-4a2a-9676-9345b3decffd.mp4
retournement-lui hf_20261017_223948_50b6d1ed-8f2a-4615-baad-d9f18c42a6c5.mp4
rival-elle hf_20261017_223949_9f97bf3f-9369-4c41-ba4a-4cc7955159ab.mp4
rival-lui hf_20261017_223948_bfd81e50-c908-421b-91c9-037a11c50378.mp4
plongee-elle hf_20261017_224136_b4489c69-504a-4cbc-8a0a-5ed46f3664bb.mp4
plongee-lui hf_20261017_224136_113e9aad-1537-46a0-b2cc-9dc09f8fee26.mp4
reveil-elle hf_20261017_224157_a4ae3bdf-39b2-4603-945e-eb349d681f3f.mp4
reveil-lui hf_20261017_224157_a8e41a22-78dc-47be-9d7c-d7992d5f735f.mp4
apotheose-elle hf_20261017_224136_4586c2de-46ba-4a06-9a44-726044bd6182.mp4
apotheose-lui hf_20261017_224136_0ad6da3c-9037-456e-9960-f5ab9c89cc41.mp4
amiral-elle hf_20261017_225314_45fd6300-0d20-46da-99a7-0cc36e2e5909.mp4
amiral-lui hf_20261017_225314_99744508-f2c5-440f-9f7f-c92c07fd8837.mp4
defaite-elle hf_20261017_225314_74c40fd0-e78d-4128-b138-d592ebe27965.mp4
defaite-lui hf_20261017_225314_d29506cc-e4aa-4d5b-95b1-d49b0ac3b398.mp4
LISTE
rm -rf "$T"
