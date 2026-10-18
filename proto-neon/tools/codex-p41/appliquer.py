"""Application réelle des patches dans des copies temporaires, jamais dans src/."""
from pathlib import Path
import subprocess, tempfile, json, hashlib
ici=Path(__file__).resolve().parent
root=ici.parent.parent
cas=[]
for ordre in [('p41',),('p38','p41'),('p41','p38')]:
    with tempfile.TemporaryDirectory(prefix='snake-p41-') as d:
        cible=Path(d)/'proto-neon/src';cible.mkdir(parents=True)
        for f in ['79-jeu.js','50-fx.js']:(cible/f).write_bytes((root/'src'/f).read_bytes())
        appels=[]
        for lot in ordre:
            for f in (['79-jeu.js'] if lot=='p41' else ['79-jeu.js','50-fx.js']):
                patch=ici/(f'raccord-{f}.patch' if lot=='p41' else f'p38-{f}.patch')
                r=subprocess.run(['/usr/bin/patch','--batch','-F','0','-p1','-i',str(patch)],cwd=d,capture_output=True,text=True)
                appels.append({'lot':lot,'fichier':f,'code':r.returncode,'sortie':r.stdout,'erreur':r.stderr})
                assert r.returncode==0,(ordre,appels)
        cas.append({'ordre':ordre,'appels':appels,'sha256':{f:hashlib.sha256((cible/f).read_bytes()).hexdigest() for f in ['79-jeu.js','50-fx.js']}})
assert cas[1]['sha256']==cas[2]['sha256']
(ici/'compatibilite-outils.json').write_text(json.dumps({'outil':'/usr/bin/patch --batch -F 0 -p1','conforme':True,'cas':cas},ensure_ascii=False,indent=2)+'\n')
print('Trois ordres appliqués sans fuzz ; résultats combinés identiques.')
