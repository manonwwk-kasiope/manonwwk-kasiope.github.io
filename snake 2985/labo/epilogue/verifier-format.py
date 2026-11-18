"""Budget du petit paysage en pixels CSS ; mesures des libellés avec la police système de repli."""
from PIL import ImageFont
from pathlib import Path
import json
folder=Path('/System/Library/Fonts/Supplemental')
f=lambda size,bold=False: ImageFont.truetype(str(folder/('Arial Bold.ttf' if bold else 'Arial.ttf')),size)
width=568-18-2-20  # marges hôte, bordure hôte, padding horizontal
height=275-15-2-12-2 # idem en hauteur avec filet supérieur
buttons=['Signer le palmarès','Rejouer 2985','Nouveau cycle · 1976']
button_width=sum(f(14,i==2).getlength(label)+20 for i,label in enumerate(buttons))+12
heading=f(21,True).getlength('Singularité vaincue')+max(f(18,True).getlength('99 999 999 pts'),f(12).getlength('Record précédent 99 999 999 · −99 999 998 pts'))+5
gestures=sum(f(13).getlength(t)+17 for t in ['Cœur frappé en surf · 2985','Circuit de queue fermé · 1995'])+18
pano=height-37-20-44-3*4
assert max(button_width,heading,gestures)<width and pano>=48
print(json.dumps(dict(viewport=[568,275],disponible=[width,height],largeurBoutons=round(button_width),largeurTitreEtRecord=round(heading),largeurGestes=round(gestures),hauteurPanorama=pano),ensure_ascii=False))
