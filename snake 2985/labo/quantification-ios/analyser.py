import datetime,json,sys
from pathlib import Path
from zoneinfo import ZoneInfo
p=Path(sys.argv[1]);rows=[json.loads(l) for l in p.read_text().splitlines()]
years=[r for r in rows if r['kind']=='year'];done=[r for r in rows if r['kind']=='done']
assert len(years)==8 and len(done)==2 and len({(r['css'],r['year']) for r in years})==8
assert all(not sum(r['audio'].values()) for r in done)
assert all(len(r['hashes'])==3 and all(h['a']==h['b'] for h in r['hashes']) for r in years)
now=datetime.datetime.now(ZoneInfo('Europe/Paris')).strftime('%d/%m/%Y · %H h %M')
text=[f'# Quantification dans MobileSafari\n\n{now} (Paris)',f'Le simulateur iPhone 17 utilise iOS 27.2. Les deux canevas mesurés occupent respectivement 874 × 292 et 568 × 275 points CSS dans le viewport paysage. La scène est celle du boss de chaque époque avec la même géométrie, le même équipement et les mêmes instants dans les deux chemins. Les 24 paires d’empreintes SHA-256 du framebuffer RGBA concordent. Les quatre WebP et les scripts ont été gelés et hachés avant le démarrage. Les compteurs audio indiquent zéro tentative.','','Chaque époque et chaque taille comporte huit fenêtres de 3,9 s en ordre A/B/B/A équilibré, avec quatre frames de chauffe entre les fenêtres. Les agrégats sont établis sur toutes les images du même chemin. Les temps de conversion encadrent seulement le branchement de conversion, et le temps de dessin couvre SnakeSpectacle.draw, lecture et restitution comprises. Le rAF mesure l’intervalle entre deux callbacks. La mesure porte sur le Safari du simulateur.','','| CSS | Année | Images A / B | Conversion p50 A / B | Conversion p95 A / B | Dessin p50 A / B | Dessin p95 A / B | rAF p95 A / B |','|---|---:|---:|---:|---:|---:|---:|---:|']
for r in years:
    a,b=r['timings']
    def pair(k,v):return f"{a[k][v]:.2f} / {b[k][v]:.2f}"
    text.append(f"|{r['css']} × {292 if r['css']==874 else 275}|{r['year']}|{a['draw']['n']} / {b['draw']['n']}|{pair('conversion','p50')}|{pair('conversion','p95')}|{pair('draw','p50')}|{pair('draw','p95')}|{pair('raf','p95')}|")
drawWins=sum(r['timings'][1]['draw']['p95']<r['timings'][0]['draw']['p95'] for r in years)
conversionWins=sum(r['timings'][1]['conversion']['p95']<r['timings'][0]['conversion']['p95'] for r in years)
frames=sum(t['draw']['n'] for r in years for t in r['timings'])
text+=['',f'Sur {frames:,} images chronométrées, le P95 de la conversion baisse dans {conversionWins}/8 combinaisons et le P95 du dessin complet dans {drawWins}/8. À 568 × 275 pour 2185, le dessin P95 passe de 7,08 à 7,24 ms et le rAF P95 de 16,70 à 16,72 ms. Les variations du dessin ne s’expliquent pas toutes par la conversion. La nouvelle passe peut rester activée sur les quatre formats étudiés. Le rendu natif 2985 ne passe pas par ce convertisseur.'.replace(',',' ',1),'','A est la boucle originale, B la conversion par tables. Tous les temps sont en millisecondes. Les mesures portent sur des scènes de boss à état physique figé dont l’animation graphique continue.','',f'Reçu brut et empreintes disponibles dans `{p.name}`.']
Path(__file__).with_name('rapport.md').write_text('\n'.join(text)+'\n')
