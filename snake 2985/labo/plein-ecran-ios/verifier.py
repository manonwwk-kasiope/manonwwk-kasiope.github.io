"""Mesure l'arène réelle en pixels CSS et les deux espaces de stockage depuis les beacons."""
import json,sys
from pathlib import Path
rows=[json.loads(line) for line in Path(sys.argv[1]).read_text().splitlines() if line.startswith('{')]
for standalone in (False,True):
    scoped=[r for r in rows if r['standalone'] is standalone]
    assert scoped, f'Contexte absent, standalone={standalone}'
    assert scoped[0]['keys']==[] and scoped[0]['session'] is None and scoped[0]['local'] is None, scoped[0]
    print('Stockage initial',standalone,scoped[0]['local'],scoped[0]['session'],scoped[0]['keys'])
assert all(r['mute']=='?muet=1' and r['sound']=={'media':0,'context':0} for r in rows)
games=[r for r in rows if r['standalone'] and r['display'] and r.get('page')=='play' and r['size'][0]>r['size'][1]]
assert games, 'Jeu paysage autonome absent'
r=games[-1];width,height=r['size'];x,y,w,h=r['arena']
assert sorted(r['screen'])==sorted([width,height]),r
assert w>=width*.98 and h>=height*.98,r
assert any(r.get('page')=='pause' and r['standalone'] for r in rows)
print(json.dumps(r,ensure_ascii=False,indent=2))
