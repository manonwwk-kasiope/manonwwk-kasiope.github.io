'use strict';
const fs=require('node:fs'),path=require('node:path'),dir=__dirname,folder=path.join(dir,'releves');
const read=n=>JSON.parse(fs.readFileSync(path.join(folder,n),'utf8'));
const jsonl=n=>fs.readFileSync(path.join(folder,n),'utf8').trim().split('\n').map(JSON.parse);
const s=read('synthese.json'),images=read('images.json'),session=read('session.json'),rss=jsonl('rss.jsonl'),blocks=jsonl('blocs.jsonl'),years=[1976,1985,1995,2185,2985];
const n=(x,d=1)=>x.toLocaleString('fr-FR',{minimumFractionDigits:d,maximumFractionDigits:d});
const pct=x=>n(x*100),mib=x=>x/1048576;
const by=(year,mode)=>s.byYear.find(r=>r.year===year&&r.mode===mode);
const title=new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date());
const md=['# '+title.replace(' ', ' · ').replace(':',' h ')+' · Endurance du rendu SNAKE 2985','',
'Le même navigateur headless-shell a rendu **'+n(s.metadata.frames,0)+' images** pendant **'+n(s.metadata.renderedSeconds/60,2)+' minutes** sur Apple M5. Les deux chemins ont joué les mêmes scénarios, avec les mêmes graines et des créneaux voisins. Les deux formats testés sont 740 × 328 et 568 × 284 pixels CSS, au DPR 2. Le Mac hébergeait aussi les travaux du projet. La température et la charge de fond ne sont pas contrôlées.','',
'![Coûts par époque](cout-rendu.png)','',
'## Cadence et coût du rendu','',
'Chaque ligne agrège les deux formats, quatre phases et les deux réglages de mouvement. La durée JavaScript inclut les appels Canvas synchrones, y compris la lecture des pixels pour les quatre anciennes époques. En 2985, le navigateur peut différer les commandes de dessin. Le coût GPU et la disponibilité réelle d’une image sur une dalle ne sont pas instrumentés.','',
'| Année | Chemin | Images | JS P50 / P95 / P99 (ms) | rAF mesuré (Hz) | rAF P50 / P95 / P99 (ms) | Intervalles >25 / >50 ms | JS >25 / >50 ms |',
'|---|---|---:|---|---:|---|---:|---:|'];
for(const year of years)for(const mode of ['dpr2','logique']){
 const r=by(year,mode),v=a=>[a.p50,a.p95,a.p99].map(x=>n(x)).join(' / ');
 md.push('| '+[year,mode,n(r.frames,0),v(r.js),n(r.rafHz,2),v(r.rAF),r.rAF.over25+' / '+r.rAF.over50,r.js.over25+' / '+r.js.over50].join(' | ')+' |');
}
md.push('','Les percentiles proviennent des histogrammes de toutes les mesures, à 0,1 ms près. Les comptes de dépassement utilisent les valeurs brutes. La fréquence rAF indique les rappels reçus. Cette configuration a cadencé le rendu autour de 60 Hz ; le protocole ne mesure pas un iPhone, une dalle 120 Hz ni les images effectivement présentées.','',
'## Démarrage, changements de décor et allocations','',
'Chaque chaîne conserve ses pièces de décor et tables de palette. La première colonne donne la toute première image de chaque année, la seconde la première image après dix autres changements d’époque sur le même format. Un chiffre par visite est une observation ponctuelle.','',
'| Année | DPR 2 première / après 10 (ms) | Logique première / après 10 (ms) | Surfaces nouvellement créées après 10, DPR / logique | Réduction lue par image au format 740 px |',
'|---|---:|---:|---:|---:|');
for(const year of years){
 const [a,b]=['dpr2','logique'].map(mode=>s.first.find(v=>v.year===year&&v.mode===mode)),duo=z=>n(z.firstVisit.js)+' / '+n(z.afterTenChanges.js);
 const read=s.byViewport.find(v=>v.width===740&&v.year===year&&v.mode==='dpr2').readBytesPerFrame;
 md.push('| '+[year,duo(a),duo(b),a.afterTenChanges.counts.newCanvas+' / '+b.afterTenChanges.counts.newCanvas,n(read/1024,0)+' Kio'].join(' | ')+' |');
}
const firsts=sum=>blocks.reduce((acc,b)=>acc+sum(b),0),totalResets=firsts(b=>b.rows.reduce((a,r)=>a+r.counts.widthReset+r.counts.heightReset,0));
md.push('','Le chemin DPR 2 trace la scène en haute définition, réduit son tampon vers une surface rétro, lit et quantifie cette surface, puis agrandit le résultat. La variante dessine directement à la largeur logique, conserve la lecture et la quantification de cette surface et effectue un seul agrandissement. En 2985 les chemins dessinent en résolution native. Les deux chemins relisent donc le même nombre de pixels rétro. Le témoin recopie en plus tout le canevas DPR 2 vers la surface rétro à chaque image.','',
'Les compteurs observent **'+n(totalResets,0)+' écritures** des propriétés de largeur ou de hauteur de canevas sur toute la campagne. Les lectures complètes allouent un ImageData par image rétro ; leur taille est indiquée ci-dessus. Le compteur ne recense pas les petites allocations des objets du moteur ni les allocations des pilotes.','',
'| Après les cinq époques | Tas JS avant GC (Mio) | Tas JS après GC (Mio) | Octets rapportés pour les backing stores, après GC |','|---|---:|---:|---:|');
for(const v of s.metadata.gc)md.push('| '+[v.pass+1,n(mib(v.gcBefore.usedSize),2),n(mib(v.gcAfter.usedSize),2),n(v.gcAfter.backingStorageSize,0)].join(' | ')+' |');
const mem=rss.map(v=>v.rssKiB/1024);
md.push('','Le RSS cumulé des processus identifiés navigateur, GPU, réseau et renderer varie de **'+n(Math.min(...mem),0)+' à '+n(Math.max(...mem),0)+' Mio** dans les '+rss.length+' relevés. L’échantillonnage système commence '+n((Date.parse(rss[0].time)-Date.parse(session.start))/60000,1)+' minutes après le départ. Le RSS peut compter plusieurs fois les pages partagées. Les deux chaînes de rendu partagent le même processus. Les mesures du tas et les collectes forcées une fois par passage ne suffisent pas à prouver l’absence de fuite native.','',
'## Fidélité des images appariées','',
'![Agrandissements de détails](details-apparies.png)','',
'Les captures utilisent le même gardien, la même graine et le même temps simulé. Le SSIM porte sur la luminance de pavés 8 × 8, moyenné sur le canevas entier. Il sert de comparaison avec le chemin actuel. Le contraste local est le rapport entre les luminances aux percentiles 95 et 10 d’une fenêtre centrée sur une case dangereuse isolée. Ce chiffre dépend du cadrage et des pixels d’arête ; la recette ne mesure pas la reconnaissance par des joueurs.','',
'| Année | Largeur CSS | Pixels strictement identiques | SSIM | Contraste local tête DPR / logique | Contraste local danger DPR / logique |','|---|---:|---:|---:|---:|---:|');
for(const im of images){const contrast=k=>n(im[k].referenceContrast,2)+' / '+n(im[k].logicalContrast,2);
 md.push('| '+[im.year,im.width,pct(im.full.exact)+' %',n(im.full.ssimLuma8,3),contrast('head'),contrast('danger')].join(' | ')+' |');}
const verdict=years.map(year=>{
 const imgs=images.filter(v=>v.year===year),p=s.paired.filter(v=>v.year===year);
 const deltas=p.map(v=>v.medianDelta),min=Math.min(...deltas),max=Math.max(...deltas);
 const bad=imgs.filter(im=>im.danger.referenceContrast>=3&&im.danger.logicalContrast<3);
 return {year,imgs,p,min,max,bad};
});
md.push('','### Décision par époque','',
'Le repère de 3:1 ci-dessous sert à repérer une dégradation sur la case instrumentée. Il constitue une hypothèse de recette, pas un seuil de réussite mesuré auprès de joueurs. Les gains indiqués sont les différences de médianes des quatre couples pris séparément, en millisecondes par image.','');
for(const v of verdict){
 const ix=v.imgs.map(im=>n(im.full.ssimLuma8,3)).join(' / ');
 let sentence;
 if(v.year===2985)sentence='Les chemins sont identiques en résolution native et les deux comparaisons de pixels sont exactes.';
 else if(v.bad.length)sentence='Conserver provisoirement le chemin DPR 2 pour ce style. Avec le tracé logique, le danger mesuré passe sous 3:1 à '+v.bad.map(im=>im.width+' px').join(' et ')+'. Renforcer ou retracer les hachures avant une permutation.';
 else if(v.imgs.some(im=>im.danger.logicalContrast<3))sentence='Le gain pourrait être exploité, mais les deux rendus partagent un contraste local faible sur au moins un danger. Revoir la forme du télégraphe à la résolution finale.';
 else sentence='Le chemin logique préserve un contraste supérieur à 3:1 sur les deux échantillons de danger. Candidat au prochain essai sur l’appareil cible.';
 md.push('- **'+v.year+'**. '+sentence+(v.year===2985?'':' Gain médian de '+n(v.min)+' à '+n(v.max)+' ms selon le couple. SSIM à 568 puis 740 px de '+ix+'.'));
}
md.push('','## Protocole et preuves','',
'Chaque passage alterne les deux méthodes pour chaque année successivement. Leur ordre s’inverse au passage suivant. Un bloc dure 24 secondes et contient huit séquences de trois secondes. Les phases sol, changement de plan, vol et gardien passent une fois en mouvement normal et une fois en mode réduit. Les dimensions alternent à chaque passage. Un contrôleur déterministe actionne le moteur réel à pas fixe, dirige le vol et relance une phase après une mort. Pour convoquer le gardien, la fixture place l’état à la dernière nourriture avant le secteur correspondant ; la génération du gardien et ses attaques sont celles du moteur. Le décompte porte sur '+n(s.encounters.flightFrames,0)+' images avec vol actif, '+n(s.encounters.bossFrames,0)+' avec gardien, '+n(s.encounters.warningFrames,0)+' avec attaque et '+n(s.encounters.shiftFrames,0)+' avec bascule en cours.','',
'Pour reproduire, exécuter `node campagne.cjs` depuis ce dossier pendant un créneau headless réservé, puis `node comparer-images.cjs`, `node synthese.cjs`, `node figures.cjs` et `node rapport.cjs`. La collecte RSS se lance en parallèle avec `node memoire-processus.cjs`. La recette utilise par défaut l’archive vérifiée des huit sources exactement mesurées. Le drapeau `--actuel` charge le code de travail. Les nouveaux sprites, archives et effets visuels musicaux ont été intégrés après le début de cet essai, et leurs coûts additionnels restent à mesurer. La campagne bloque les chargements externes, les API audio et la lecture média avant navigation, et démarre le navigateur avec `--mute-audio`. Le nombre d’appels audio observés est '+s.metadata.audioAttempts+'.','',
'[Relevés par créneau](releves/blocs.jsonl) · [Décomposition par phase et par largeur](releves/synthese.json) · [Comparaison pixel à pixel](releves/images.json) · [Empreintes SHA-256 des sources testées](releves/session.json) · [Correctif expérimental non appliqué](rendu-logique.patch)','','');
fs.writeFileSync(path.join(dir,'rapport.md'),md.join('\n'));
