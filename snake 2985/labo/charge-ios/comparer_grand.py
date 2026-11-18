"""Append the separate wide-raster experiment, keeping the CSS viewport orientation explicit."""
import json,statistics
from pathlib import Path
root=Path(__file__).resolve().parent
p=root/'resultats/paysage.jsonl'
rows=[json.loads(l) for l in p.read_text().splitlines()]
retry=root/'resultats/paysage-reprise.jsonl'
partial=not any(r['kind']=='done' for r in rows)
earlier=0
if partial and retry.exists():
 first=next(r for r in rows if r['kind']=='start')
 earlier=(rows[-1]['received']-first['received'])*1000
 rows += [json.loads(l) for l in retry.read_text().splitlines()]
cells=[r for r in rows if r['kind']=='cell']
done=next((r for r in rows if r['kind']=='done'),None)
assert done and done['rows']==40 and len(cells)==40
assert len({(r['year'],r['phase'],r['mode']) for r in cells})==40
assert all(r['size']=='paysage' and not r['reduced'] and r['view']['orientation']=='paysage' for r in cells)
assert all(r['frames']>1 and r['steps']>=240 and r['counts']['artillery']>0 for r in cells)
assert all(r['counts']['painted']>0 for r in cells if r['year'] in [2185,2985])
assert all(r['counts'][r['phase']]>0 for r in cells if r['phase'] in ['boss','guide','vol'])
assert not any(done['audio'].values()) and (partial or done['lifecycle']['controlledRestarts']==1)
lines=['','## Plateau en orientation paysage native','']
w,h=cells[0]['css'];r=rows[1]
lines.append(f'Un complément de {(earlier+done["wallMs"])/60000:.2f} min affiche un plateau de {w} × {h} CSS, soit {cells[0]["pixels"][0]} × {cells[0]["pixels"][1]} pixels de sortie. Le viewport natif de Safari est en paysage, obtenu en orientant l’iPhone avec XCUIDevice. L’application utilisée par le banc reste MobileSafari. Les cinq dates et quatre phases sont rejouées dans les deux chemins, en mouvement normal. La première ouverture a produit 31 blocs avant l’arrêt inattendu du simulateur, dont la cause est inconnue. Après un nouveau démarrage, les neuf blocs manquants ont été rejoués sur les mêmes assets. La première case reprise (boss 2185, sélection) redémarre à cache froid. La durée cumulée exclut le redémarrage.')
lines+=['','| Époque | Chemin | p95 draw (ms) | p95 rAF (ms) | rAF >25 ms | rAF >50 ms |','|---|---|---|---|---|---|']
def fmt(x):return f'{x:.1f}'.replace('.',',')
for y in (1976,1985,1995,2185,2985):
 for m in ('reference','selection'):
    a=[r for r in cells if r['year']==y and r['mode']==m]
    n=sum(r['raf']['n'] for r in a)
    lines.append('| '+' | '.join(map(str,[y,m,fmt(statistics.median(r['draw']['p95'] for r in a)),fmt(statistics.median(r['raf']['p95'] for r in a)),fmt(100*sum(r['raf']['over25'] for r in a)/n)+' %',fmt(100*sum(r['raf']['over50'] for r in a)/n)+' %']))+' |')
lines+=['','En paysage, sur les quatre phases :']
for y in (1985,2185):
  a=[r for r in cells if r['year']==y and r['mode']=='reference']
  b=[r for r in cells if r['year']==y and r['mode']=='selection']
  da,db=[statistics.median(r['draw']['p95'] for r in c) for c in (a,b)]
  ra,rb=[statistics.median(r['raf']['p95'] for r in c) for c in (a,b)]
  lines.append(f'- {y} : le chemin logique fait passer le p95 médian de dessin de {fmt(da)} à {fmt(db)} ms et celui des intervalles rAF de {fmt(ra)} à {fmt(rb)} ms.')
lines+=['','Les deux chemins utilisent le même moteur, les mêmes scènes et les mêmes peintures. Les relevés attribuent la différence au chemin de dessin complet. Ils ne ventilent pas le temps entre le dessin de primitives, la quantification des couleurs et la copie ou composition de la surface.']
file=root/'rapport.md'
text=file.read_text().split('\n## Plateau en orientation paysage native')[0].rstrip()+'\n'
file.write_text(text+'\n'.join(lines)+'\n')
