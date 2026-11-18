from pathlib import Path
import collections,json,math
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parent
def read(f):return json.loads((ROOT/f).read_text())
rows=read('annotations.json');rows=[a for a in rows if a['split']=='holdout' and a['ablation']=='normal']
obs,geom,metrics=read('observations.json'),read('audit.json'),read('resultats.json');cut=metrics['thresholds']
def point(a,q):return None if a[q] is None else (a[q][0]*384/a['width'],a[q][1]*176/a['height'])
def outcome(a,key,q):
    xy=obs[a['id']][key]
    if xy[2]<cut[key]:return 'silence'
    goal=point(a,q)
    if goal and math.dist(goal,xy[:2])<=4:return 'correct'
    candidates=[v for v in geom[a['id']] if not (v['tag']=='tete' and a['head'] is None)]
    nearest=min(candidates,key=lambda p:math.dist((p['x'],p['y']),xy[:2]))
    if math.dist((nearest['x'],nearest['y']),xy[:2])>5:return 'autre'
    return nearest['tag']+((' du plan' if nearest['plane']==a['plane'] else ' hors plan') if nearest['tag']=='cellule' else '')
counts={key:dict(collections.Counter(outcome(a,key,q) for a in rows)) for key,q in [('head','head'),('basehead','head'),('target','target'),('basetarget','target')]}
invers=onbody=nearestCount=badWithTrueHead=0
for a in rows:
    if not a['target']:continue
    items=geom[a['id']];h=items[0];cells=[q for q in items if q['tag']=='cellule' and q['plane']==a['plane']]
    grid=min(cells,key=lambda p:math.dist((h['gx'],h['gy']),(p['gx'],p['gy'])))
    proj=min(cells,key=lambda p:math.dist((h['x'],h['y']),(p['x'],p['y'])))
    invers+=grid!=proj;nearestCount+=1
    onbody+=any(p['tag']=='corps' and p['plane']==a['plane'] and math.dist((p['gx'],p['gy']),(grid['gx'],grid['gy']))<.55 for p in items)
    badWithTrueHead+=outcome(a,'target','target') not in ['silence','correct'] and outcome(a,'head','head')=='correct'
active=[a for a in rows if a['mode']!='vol']
def eligible_stats(sample):
    tp=fp=fn=0
    for a in sample:
        out=outcome(a,'target','target');has=a['target'] is not None
        tp+=out=='correct';fp+=out not in ['silence','correct'];fn+=has and out!='correct'
    return dict(n=len(sample),positives=tp+fn,tp=tp,fp=fp,fn=fn)
report=dict(nearest_objects=counts,projection={'cell_targets':nearestCount,'rank_inversions':invers,'overlaps_same_body':onbody,'bad_cell_on_correct_head':badWithTrueHead},cell_when_collectable=eligible_stats(active))
(ROOT/'diagnostic.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
examples=[
 ('Le gardien pris pour la tête',next(a for a in rows if a['head'] and outcome(a,'head','head')=='gardien' and outcome(a,'basehead','head')=='correct'),'head','head','basehead'),
 ('Tête masquée pour le contrôle négatif',next(a for a in rows if a['head'] is None and outcome(a,'basehead','head') not in ['silence','correct']),'head','head','basehead'),
 ('Une cellule du plan, mais plus loin',next(a for a in rows if a['mode']!='vol' and outcome(a,'head','head')=='correct' and outcome(a,'target','target')=='cellule du plan'),'target','target','basetarget'),
 ('La cellule de l’autre plan est retenue',next(a for a in rows if a['mode']!='vol' and outcome(a,'target','target')=='cellule hors plan'),'target','target','basetarget')]
F=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',17);B=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf',20)
sheet=Image.new('RGB',(1264,694),'#111923');d=ImageDraw.Draw(sheet)
d.text((16,8),'Cercle blanc : moteur      Croix rose : gabarits      Croix bleue : couleur seule',font=F,fill='#e4e9e9')
for i,(title,a,k,role,bk) in enumerate(examples):
    orig=Image.open(ROOT/'corpus'/(a['id']+'.png')).convert('RGB').resize((608,279));g=ImageDraw.Draw(orig)
    t=point(a,role)
    if t:
        x=t[0]*608/384;y=t[1]*279/176;g.ellipse((x-8,y-8,x+8,y+8),outline='white',width=2)
    for key,color,scale in [(k,'#ff58bc',7),(bk,'#5ce6ff',4)]:
        x,y,s=obs[a['id']][key]
        if s<cut[key]:continue
        x*=608/384;y*=279/176
        g.line((x-scale,y-scale,x+scale,y+scale),fill=color,width=2);g.line((x-scale,y+scale,x+scale,y-scale),fill=color,width=2)
    x=16+(i%2)*624;y=46+(i//2)*319
    d.text((x,y),str(a['year'])+' · '+title,font=B,fill='#dff1e9');sheet.paste(orig,(x,y+28))
sheet.save(ROOT/'erreurs.png')
