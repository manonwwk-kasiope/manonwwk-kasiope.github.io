from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parent
for year in (1976,1985,1995,2185,2985):
    source=(root.parent/'mondes'/f'scene-{year}.png' if year==1976 else root.parent/'mondes'/'preuves-horizons'/f'{year}.png')
    with Image.open(source) as src:
        w,h=src.size
        # Keep the horizon and its era-specific landmarks above most of the playing field.
        src.crop((0,0,w,round(h*.51))).resize((600,round(600*h*.51/w)),Image.Resampling.LANCZOS).convert('RGB').save(root/f'paysage-{year}.webp',quality=85,method=6)
