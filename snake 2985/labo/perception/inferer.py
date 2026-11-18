"""Run on a directory of anonymised pixel files; no labels imported."""
import json
from pathlib import Path
import numpy as np
from PIL import Image
from lecteur import positions,dangerfeat
ROOT=Path(__file__).resolve().parent
pred={}
for file in sorted((ROOT/'corpus').glob('*.png')):
    im=np.asarray(Image.open(file).convert('RGB'))
    p=positions(im)
    p['features']=[dangerfeat(im,p['head'][:2],direction).tolist() for direction in [(1,0),(0,1),(-1,0),(0,-1)]]
    p['basefeatures']=[dangerfeat(im,p['basehead'][:2],direction).tolist() for direction in [(1,0),(0,1),(-1,0),(0,-1)]]
    pred[file.stem]=p
(ROOT/'observations.json').write_text(json.dumps(pred,separators=(',',':'))+'\n')
print('Images lues sans métadonnées :',len(pred))
