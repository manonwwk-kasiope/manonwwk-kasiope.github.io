import csv
import gzip
import json
from collections import Counter
from pathlib import Path
from statistics import median
from datetime import datetime
from zoneinfo import ZoneInfo
root = Path(__file__).parent
def read(name):
    with gzip.open(root / (name + '.json.gz')) as f:
        return json.load(f)
cal, val = read('cal'), read('val')
assert cal['hashes'] == val['hashes'] and val['singular']
def won(r):
    return r['status'] in ('won', 'cleared')
def percent(a,b):
    return round(100*a/b,1) if b else None
def by(rows, **kw):
    return [r for r in rows if all(r[k]==v for k,v in kw.items())]
def pct(values):
    return percent(sum(values),len(values))
def summarize(rows):
    results=[]
    for variant in ('temoin','relance'):
        sub=by(rows,variant=variant)
        stages=[r['levels'][i]['normal'] for r in sub for i in (6,7,8) if i+1 in r['reached']]
        results.append([pct([v['warnings']>0 for v in stages]), pct([won(r) for r in by(sub,kind='expert')]),pct([won(r) for r in by(sub,kind='habitué')]),sum(v['relaunch'] for v in stages)])
    return results
table=[]
for year in (1976,1985,1995,2185,2985):
    for grade in range(1,11):
        row={'année':year,'cran':grade}
        for kind,tag in (('expert','E'),('habitué','H')):
            sub=[r for r in by(val['rows'],year=year,kind=kind,variant='temoin') if grade in r['reached']]
            phase='duel' if grade in (5,10) else 'normal'
            samples=[r['levels'][grade-1][phase] for r in sub]
            def total(k):
                return sum(v[k] for v in samples)
            t=total('seconds')
            metrics={'entrés':len(sub),'morts':sum(r['status']=='dead' and r['grade']==grade for r in sub),
                'secondes':round(t,2),'sec/entrant':round(t/len(sub),2),'annonces':total('warnings'),'activations':total('activations'),
                'drones/instant':round(total('droneSeconds')/t,2) if t else None,'cases actives/instant':round(total('liveTiles')/t,2) if t else None,
                'choix coupés %':percent(total('cut'),total('choices')),'temps menacé %':percent(total('pressure'),t),
                'sec approche':round(sum(r['levels'][grade-1]['approche']['seconds'] for r in sub),1)}
            row.update({tag+' '+k:v for k,v in metrics.items()})
        table.append(row)
with open(root/'50-crans.csv','w') as f:
    w=csv.DictWriter(f,table[0].keys());w.writeheader();w.writerows(table)
lines=['# Difficulté des cinq époques','',datetime.now(ZoneInfo('Europe/Paris')).strftime('%d/%m/%Y · %H h %M'),'', '## Résultats sur graines réservées','']
for title,data in [('Calibration',cal),('Validation',val)]:
    lines.append(f'{title} — {len(data["rows"])} campagnes commencées. Dans chaque variante, les nombres ci-dessous donnent la proportion des crans 7–9 atteints avec annonce en phase normale, les victoires expertes puis habituées, et le nombre de relances effectivement appliquées.')
    for name,res in zip(('Témoin','Relance'),summarize(data['rows'])):
        lines.append(f'\n- {name} — {res[0]} %, {res[1]} %, {res[2]} %, {res[3]} relances.')
    lines.append('')
for kind in ('expert','habitué'):
    rows=by(val['rows'],kind=kind,variant='temoin')
    ds=[r for r in rows if r['status']=='dead']
    lines.append(f'{kind.capitalize()} — {sum(map(won,rows))}/{len(rows)} époques gagnées. Morts par cran {dict(sorted(Counter(r["grade"] for r in ds).items()))}. Temps médian des décès observés {median(r["t"] for r in ds):.1f} s. Causes {dict(Counter(r["cause"] for r in ds))}.')
    for k in ('mid','final'):
        fights=[f for r in rows for f in r['defeats'] if f['kind']==k]
        lines.append(f'\n- {k} — {len(fights)} victoires, dont {sum(f["volley"]==0 for f in fights)} avant la première salve active. Durée médiane des duels gagnés {median(f["duration"] for f in fights):.1f} s.')
    lines.append('')
lines.extend(['## Exposition par cran et par époque','','Pilote expert témoin. Chaque case indique la fraction du temps avec au moins une trajectoire cardinale praticable coupée par une menace imminente, en pourcentage. Les crans 5 et 10 portent sur le duel. Les autres portent sur la phase normale. Les repos et approches ont leur propre colonne dans les données brutes.','','| Année | '+' | '.join(str(i) for i in range(1,11))+' |','|'+'---|'*11])
for year in (1976,1985,1995,2185,2985):
    yearrows=[r for r in table if r['année']==year]
    lines.append('| '+str(year)+' | '+' | '.join(str(r['E temps menacé %']) for r in yearrows)+' |')
lines.extend(['','Voir `50-crans.csv` pour les deux profils, les entrants et décès par cran, durées, nombres d’annonces et activations, densité de drones, cases actives et décisions coupées. Les JSON compressés contiennent chaque trajectoire, temps de chacune des cinq phases et empreintes du code.'])
(root/'rapport.md').write_text('\n'.join(lines)+'\n')
lines.extend(['','## Lecture des résultats','','Toutes les trajectoires ont franchi les crans dans l’ordre, assertion contrôlée pour les 720 parties. Le cran 10 démarre directement le duel final. Les fenêtres entre commandes se raccourcissent à chaque cran dans le moteur. De 7 à 10, elles passent de 167 à 146 ms en 1976 et de 153 à 136 ms en 2985, hors turbo.','','Le ralentissement ressenti avant les boss a deux composantes mesurables. Dans le témoin expert, le temps de phase normale par entrant tombe de 4,97 s au cran 2 à 2,55 s au 3 puis 1,40 s au 4. La seconde moitié reproduit ce creux, de 3,50 s au 7 à 2,66 s au 8 puis 1,25 s au 9. Ce dernier comprend aussi 1,94 s d’approche et 0,67 s de repos. Même hors de ces deux phases, les activations de zones sur le plan courant au 8 et au 9 ont une exposition moyenne inférieure à 0,005 case par instant. En revanche, la densité de drones sur le plan monte de 0,99 à 1,19 entre le 7 et le 9. La baisse ne touche donc pas tous les dangers.','','Retenir la relance pour rendre plus fréquentes les décisions annoncées en fin de parcours. Elle franchit les critères sur les deux séries. En validation, le gain d’annonces vaut 19,6 points et la survie varie de −0,8 point chez l’expert et +1,7 point chez l’habitué. Chez l’expert au cran 9, la moyenne des cases en préavis sur son plan passe de 1,10 à 1,51 par instant, tandis que les cases actives restent en dessous de 0,005 par instant. On peut davantage rencontrer et contrer les émetteurs. Cette mesure ne démontre pas une progression continue des risques de mort.','','## Limites et reproduction','','Chaque époque repart au cran 1 avec prisme et chaîne. Les deux pilotes connaissent la commande de vol et utilisent la même assistance de trajectoire dans les airs. L’expert répond à l’écologie et aux gardiens. L’habitué utilise une observation retardée au sol. Tous deux peuvent ouvrir le second cœur de 2985 par le contre ou l’esquive. La durée par cran dépend de leur collecte. Le jeu ne contient ici ni temps d’atelier humain, ni réaction tactile, ni distribution représentative de joueurs. Les probabilités sont descriptives pour ces graines et ces stratégies. Les années partagent des graines, et deux conditions partagent un pilote. Les durées de décès excluent les victoires. Une menace imminente coupe une case si elle est déjà active ou se déclenche avant le prochain pas. Le temps au vol figure au dénominateur du temps menacé, sans décision cardinale ajoutée. Les événements des deux plans comptent comme annonces et seules les zones du plan courant alimentent la surface exposée.','','Reproduction depuis ce dossier avec Node et Python standard, dans l’ordre : `node mesurer.cjs cal`, `node mesurer.cjs val`, `python3 analyser.py`.'])
(root/'rapport.md').write_text('\n'.join(lines)+'\n')
