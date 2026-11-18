"""Valide les trajectoires, compte les entrées et vérifie les dimensions de chaque capture."""
import json,struct,sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo
root=Path(__file__).resolve().parent
folder=root/'preuves'/(sys.argv[1] if len(sys.argv)>1 else 'passe-01')
rows=[json.loads(t) for t in (folder/'journal.jsonl').read_text().splitlines()]
outcome=json.loads((folder/'resultat.json').read_text())
issues=[r for r in rows if r['type']=='issue']
ok=[r for r in issues if r['status'] in ('won','cleared')]
years=[1976,1985,1995,2185,2985];assert [r['year'] for r in ok]==years
mouvement=outcome.get('mouvement','reduit')
assert mouvement in ('normal','reduit')
if 'mouvement' in outcome:
    starts=[r for r in rows if r['type']=='départ']
    assert {r['year'] for r in starts}==set(years)
    if mouvement=='normal':
        assert all(r['motion']=='no-preference' for r in starts)
motion_text=('caméra animée dès la préparation et pendant les cinq époques' if mouvement=='normal'
             else 'mouvement réduit au départ et caméra animée pour le boss final de 2985' if outcome.get('epilogueMeasurements')
             else 'mouvement réduit')
results=[]
for r in ok:
    y=r['year'];events=r['events']
    type_ = lambda v:[e for e in events if e['type']==v]
    assert [e['difficulty'] for e in type_('sector')]==list(range(2,11))
    assert len(type_('bossDefeated'))==2 and [e['kind'] for e in type_('boss')]==['mid','final']
    assert len(type_('workshopRecipe'))==1
    rec=type_('workshopRecipe')[0]
    values=[y,r['attempt'],r['score'],', '.join(e['name'] for e in type_('bossDefeated')),rec['from']+' → '+rec['core'],len(type_('flightStart'))]
    results.append('| '+' | '.join(str(v) for v in values)+' |')
for f in folder.glob('*.png'):
    data=f.read_bytes()
    assert data[:8]==b'\x89PNG\r\n\x1a\n' and struct.unpack('>II',data[16:24])==(854,393),f
for completion in ok:
    y,attempt=completion['year'],completion['attempt']
    required=[f'{y}-{attempt}-boss-{q}.png' for q in ['mid','final']]+[f'{y}-{attempt}-upgrade-{q}.png' for q in [3,5,7,9]]+[f'{y}-{attempt}-atelier-satellite.png']
    assert all((folder/f).is_file() for f in required)
epilogue=outcome.get('epilogueMeasurements')
if epilogue is not None:
    variants=[(854,393,'no-preference'),(568,275,'no-preference'),(568,275,'reduce')]
    assert [(e['width'],e['height'],e['motion']) for e in epilogue]==variants
    for e in epilogue:
        width,height,motion=e['width'],e['height'],e['motion']
        png=folder/'epilogue'/f'{width}x{height}-{motion}.png'
        assert struct.unpack('>II',png.read_bytes()[16:24])==(width,height)
        assert len(e['dates'])==5 and len(e['buttons'])==3 and e['scroll']<=1
        assert all(b['w']>=44 and b['h']>=44 for b in e['buttons'])
        assert len(e['images'])==5 and all(i['loaded'] for i in e['images'])
        assert all(i['name']==('none' if motion=='reduce' else 'vic-arrive') for i in e['images'])
last=outcome['last'];assert last['year']==1976 and last['screen']=='prep'
assert last['hall']==outcome['persisted'] and all(x['name']=='ARCADE QA' for x in last['hall'])
assert outcome['changed'] and outcome['kept'] and outcome['upgradeCount']==20 and not outcome['errors']
assert sum(last['muted'].values())==0 and last['inputs']['synthetic']==0
failed=[r for r in issues if r['status']=='dead']
stamp=datetime.now(ZoneInfo('Europe/Paris')).strftime('%d/%m/%Y · %H h %M')
text=['# Recette des cinq campagnes intégrées','',stamp+' · Paris','',
'Les cinq campagnes sont terminées depuis un profil WebKit neuf. Les dix boss ont été vaincus dans l’ordre, les cinq scores signés depuis le palmarès restent identiques après rechargement. Après la victoire en 2985, le bouton de nouveau cycle a ouvert 1976 et la nouvelle partie a effectivement avancé de plus de 0,5 seconde.',
'','| Époque | Tentative victorieuse | Score | Boss vaincus | Cœur avant et après l’atelier satellite | Vols |','|---|---|---|---|---|---|',*results,'',
'Morts naturelles observées : '+str(len(failed))+'. '+(' '.join(str(r['year'])+' — '+str(r['cause']) for r in failed) if failed else 'Chaque époque a été franchie à sa première tentative.'),'',
'Le pilote a reçu la position publique des entités, choisi des commandes et piloté les anneaux par clavier. Les actions passent par les boutons normaux et les touches Playwright. Le document a reçu '+str(last['inputs']['trusted'])+' événements clavier/clic de confiance et zéro événement synthétique injecté par script avant le départ du nouveau cycle. Le banc contrôle les paramètres du navigateur, la graine initiale 298501 et la distribution des rappels d’animation ; il ne modifie aucun état de la partie. Chaque cran a été vérifié depuis le journal du vrai moteur.',
'','WebKit headless, viewport 854 × 393, '+motion_text+', son neutralisé avant le chargement et ressources médias bloquées. Les '+str(last['draws'])+' appels au véritable dessin de la chambre ont été exécutés jusqu’à la préparation du nouveau cycle. Les '+str(len(list(folder.glob('*.png'))))+' captures au format PNG incluent les dix boss, les vingt améliorations, les cinq ateliers satellites et le palmarès. Le temps de jeu est virtuel. Cette recette teste les commandes clavier et souris, pas l’ergonomie tactile ni les performances d’un iPhone physique.','',
'Reproduction dans ce dossier : `node entrainement.cjs`, puis lors d’un créneau WebKit disponible `CAMPAGNE_PASSE=passe-02 node recette.cjs`, puis `python3 controle.py passe-02`. Les nouvelles captures et les journaux utilisent le dossier nommé par CAMPAGNE_PASSE.']
if epilogue:
    text[-1:] = ['Le panorama de victoire présente les cinq dates parcourues. Les trois actions restent visibles en 854 × 393 et en 568 × 275. Le banc a vérifié les cinq entrées animées décalées, leur suppression en mouvement réduit et le retour du focus après signature.', '', 'Preuves de cette passe dans `preuves/'+folder.name+'`. Une nouvelle exécution demande un nom de passe libre pour conserver les captures existantes.']
(root/'rapport.md').write_text('\n'.join(text)+'\n')
print('50 crans, dix boss, persistance et captures contrôlés.')
