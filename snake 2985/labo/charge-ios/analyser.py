"""Analyse the bounded, per-block distributions without interpreting callback rate as physical FPS."""
import json,statistics,sys
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo
root=Path(__file__).resolve().parent
source=Path(sys.argv[1]) if len(sys.argv)>1 else root/'resultats/passe-safari.jsonl'
rows=[json.loads(l) for l in source.read_text().splitlines()]
cells=[r for r in rows if r['kind']=='cell']
start=next(r for r in rows if r['kind']=='start')
done=next((r for r in rows if r['kind']=='done'),None)
def median(a):return statistics.median(a)
def fmt(x,dec=1):return f'{x:.{dec}f}'.replace('.',',')
def pct(n,d):return fmt(n*100/d)+' %' if d else '—'
def counts(rs,metric,key):return sum(r[metric][key] for r in rs)
def pick(**fields):return [r for r in cells if all(r[k]==v for k,v in fields.items())]
def summary(rs):
    n=counts(rs,'raf','n')
    return [len(rs),sum(r['frames'] for r in rs),fmt(1000*n/sum(r['elapsed'] for r in rs)),
      fmt(median(r['raf']['p95'] for r in rs)),pct(counts(rs,'raf','over25'),n),
      pct(counts(rs,'raf','over50'),n),fmt(median(r['draw']['p95'] for r in rs)),
      fmt(median(r['simulation']['p95'] for r in rs)),fmt(median(r['firstPresented'] for r in rs))]
def validate():
    assert done and done['rows']==160 and len(cells)==160
    assert len({(r['year'],r['mode'],r['phase'],r['reduced'],r['size']) for r in cells})==len(cells)
    assert all(r['raf']['n']>0 and sum(r['raf']['bins'])==r['raf']['n'] and sum(r['draw']['bins'])==r['draw']['n'] for r in cells)
    assert all(r['elapsed']>=4000 and r['steps']>=240 for r in cells)
    assert all(not any(r['audio'].values()) for r in cells) and not any(done['audio'].values())
    assert all(r['counts'][r['phase']]>0 for r in cells if r['phase'] in ['guide','vol','boss'])
    assert all(r['counts']['painted']>0 for r in cells if r['year'] in [2185,2985])
    assert all(r['counts']['artillery']>0 for r in cells)
    assert done['lifecycle']['controlledStops']==done['lifecycle']['controlledRestarts']==1
    assert len({tuple(r['css']) for r in cells})==2
if __name__=='__main__' and len(cells)<160:
    print(f'{len(cells)} / 160 blocs reçus');sys.exit(0)
validate()
lines=[]
def line(t=''):lines.append(str(t))
def table(labels,values):
    line();line('| '+' | '.join(labels)+' |');line('|'+ '|'.join(['---']*len(labels))+'|')
    for v in values:line('| '+' | '.join(str(x) for x in v)+' |')
    line()
cols=['Blocs','Images JS','Rappels/s','rAF p95 (ms)','rAF >25 ms','rAF >50 ms','Draw p95 (ms)','Moteur p95 (ms)','Premier rappel après draw (ms)']
line('# Charge réelle sous MobileSafari simulé')
line();line(datetime.now(ZoneInfo('Europe/Paris')).strftime('%d/%m/%Y · %H h %M')+' (Paris)')
line()
v=start['view']
line('Safari '+start['ua'].split('Version/')[1].split()[0]+' a exécuté les '+str(len(cells))+' blocs sur un iPhone 17 simulé sous iOS 27.2. Le viewport était en '+v['orientation']+' ('+str(v['w'])+' × '+str(v['h'])+' CSS). Les deux surfaces de jeu étaient '+', '.join(str(a)+' × '+str(b) for a,b in sorted({tuple(r['css']) for r in cells},reverse=True))+' CSS. Durée depuis le lancement du protocole : '+fmt(done['wallMs']/60000,2)+' min.')
line()
line('## Chemins de rendu')
line();line('La référence dessine la scène à la résolution du canvas de sortie, avec le DPR plafonné à 2. La sélection dessine à la résolution logique avant agrandissement en 1985 et 2185. Les trois autres dates gardent le même chemin et servent de témoins. Tous les modules visuels, les contrôles d’entrée et les décors peints sont identiques entre les variantes.')
table(['Année','Chemin']+cols,[[y,m]+summary(pick(year=y,mode=m)) for y in [1976,1985,1995,2185,2985] for m in ['reference','selection']])
line('Les p95 affichés sont les médianes des p95 de blocs. Les proportions de retards utilisent tous les intervalles du groupe. « Rappels/s » est le nombre de rappels rAF divisé par le temps actif mesuré. Les comptages et les histogrammes de tous les blocs se trouvent dans le JSONL.')
line();line('## Comparaisons appariées')
line()
def key(r):return (r['year'],r['phase'],r['reduced'],r['size'])
ref={key(r):r for r in pick(mode='reference')}
def deltas(year):
    tests=pick(year=year,mode='selection')
    pairs=[(r,ref[key(r)]) for r in tests]
    return [year,len(pairs),fmt(median(a['draw']['p95']-b['draw']['p95'] for a,b in pairs)),
      fmt(median(a['raf']['p95']-b['raf']['p95'] for a,b in pairs)),sum(a['draw']['p95']<b['draw']['p95'] for a,b in pairs),
      sum(a['raf']['p95']<b['raf']['p95'] for a,b in pairs)]
table(['Année','Paires','Δ draw p95 (ms)','Δ rAF p95 (ms)','Draw amélioré','rAF amélioré'],[deltas(y) for y in [1976,1985,1995,2185,2985]])
line('Chaque différence est calculée à phase, taille et réglage de mouvement égaux. Une différence négative favorise la sélection. L’ordre est alterné ; chaque configuration n’a qu’une exécution par chemin.')
line();line('## Phases, taille et mouvement de la sélection')
table(['Regroupement']+cols,[[k]+summary(pick(mode='selection',phase=k)) for k in ['guide','grille','vol','boss']]+
    [[k]+summary(pick(mode='selection',size=k)) for k in ['grand','compact']]+
    [[k]+summary(pick(mode='selection',reduced=v)) for k,v in [('normal',False),('réduit',True)]])
line();line('## Bascule et premier écran')
table(['Époque','Premier draw (ms)','Rappel suivant (ms)','Peinture prête au draw (ms)','Images avec peinture (%)'],[
 [y,fmt(rs[0]['firstDraw']),fmt(rs[0]['firstPresented']),fmt(rs[0]['decorReady']) if rs[0]['decorReady'] is not None else 'procédural',
  pct(sum(r['counts']['painted'] for r in rs),sum(r['frames'] for r in rs)) if y in [2185,2985] else 'procédural']
 for y in [1976,1985,1995,2185,2985] for rs in [pick(year=y)]])
line('Le temps de bascule part de la demande de la scène. Le premier draw compte la création du moteur et le temps jusqu’au premier dessin retourné. Le rappel suivant donne une borne approchée de présentation. Le protocole JavaScript a démarré '+fmt(start['navigationReady'])+' ms après le début de navigation. First Contentful Paint exposé par Safari : '+(fmt(done['firstContentfulPaint'])+' ms' if done['firstContentfulPaint'] is not None else 'indisponible')+'.')
line();line('## Pointes et limites')
worst=sorted(pick(mode='selection'),key=lambda r:r['raf']['p95'],reverse=True)[:5]
table(['Année','Phase','Taille','Mouvement','rAF p95 (ms)','Draw p95 (ms)','Simulation p95 (ms)','rAF >50 ms'],[[r['year'],r['phase'],r['size'],'réduit' if r['reduced'] else 'normal',fmt(r['raf']['p95']),fmt(r['draw']['p95']),fmt(r['simulation']['p95']),str(r['raf']['over50'])+'/'+str(r['raf']['n'])] for r in worst])
line('Le chronomètre du draw couvre le travail JavaScript et les appels synchrones Canvas. Le rAF inclut le scheduling de Safari et la concurrence du simulateur et du Mac. Un retard rAF avec un draw court ne permet pas d’attribuer le coût au GPU. Aucune mesure de présentation du compositeur ou de fréquence native de l’écran n’est exposée ici. Mémoire JS et mémoire du processus WebContent : indisponibles.')
line();line('Le démarrage a été contrôlé par consultation du processus MobileSafari, capture isolée du simulateur et bref diagnostic système pendant les premiers blocs 1976. Ces premières observations peuvent inclure cette charge. La version 27.2 provient du runtime CoreSimulator et de la version de Safari ; la chaîne de compatibilité de l’agent utilisateur indique aussi iPhone OS 18_7.')
line();line('Chaque cellule reproduit quatre secondes de temps actif. Le jeu réel et les composants visuels sont chargés sans la coque interactive complète ; les scènes sont préparées pour atteindre les états voulus, notamment le boss de cran 10. Le réglage réduit est transmis au vrai moteur de rendu ; la préférence système est restée '+('activée' if start['osReduced'] else 'désactivée')+'. Les intervalles entre cellules, les transferts de résultats et la pause de contrôle ne comptent pas dans les distributions. Cette première passe couvre un simulateur en orientation portrait, sur deux tailles de canvas. Les durées retournées par Safari sont quantifiées à la milliseconde ; une médiane nulle de simulation est inférieure à la résolution exploitable de cette mesure.')
line();line('La coroutine du banc a été suspendue pendant 0,25 seconde au milieu du bloc 81 : la simulation et le compteur de dessins sont restés immobiles, puis un rappel les a relancés. Changements réels de visibilité pendant la passe : '+str(done['lifecycle']['hiddenStops'])+' masquage(s), '+str(done['lifecycle']['visibleRestarts'])+' reprise(s). Tentatives audio : '+str(sum(done['audio'].values()))+'.')
(root/'rapport.md').write_text('\n'.join(lines)+'\n')
print('Intégrité vérifiée ; rapport.md produit.')
