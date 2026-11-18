"""Compare a fixed sample of unseen normal frames with blinded predictions."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json
ROOT=Path(__file__).resolve().parent
rows=json.loads((ROOT/'annotations.json').read_text())
obs=json.loads((ROOT/'observations.json').read_text());cuts=json.loads((ROOT/'resultats.json').read_text())['thresholds']
years=[1976,1985,1995,2185,2985];F=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',16)
sheet=Image.new('RGB',(1080,720),'#101622');d=ImageDraw.Draw(sheet)
d.text((16,9),'Cercles : référence moteur     Croix : lecteur de pixels     Blanc : tête     Orange : cellule',fill='#f0f0ec',font=F)
for i,y in enumerate(years):
    a=next(a for a in rows if a['year']==y and a['split']=='holdout' and a['mode']=='vol' and a['ablation']=='normal')
    img=Image.open(ROOT/'corpus'/(a['id']+'.png')).convert('RGB').resize((512,235));draw=ImageDraw.Draw(img);p=obs[a['id']]
    for role,col in [('head','#ffffff'),('target','#ffc566')]:
        if a[role]:
            x=a[role][0]*512/a['width'];v=a[role][1]*235/a['height']
            draw.ellipse((x-8,v-8,x+8,v+8),outline=col,width=2)
        if p[role][2]>=cuts[role]:
            x=p[role][0]*512/384;v=p[role][1]*235/176
            draw.line((x-5,v-5,x+5,v+5),fill=col,width=2);draw.line((x-5,v+5,x+5,v-5),fill=col,width=2)
    # Crop only the wide, empty top strip of the local sky for legibility.
    img=img.crop((0,32,512,227));x=16+(i%2)*532;v=42+(i//2)*223
    d.text((x,v),str(y)+' · vol',font=F,fill='#bcd7d9');sheet.paste(img,(x,v+20))
sheet.save(ROOT/'exemples.png')
