import fs from 'node:fs';
import path from 'node:path';
import {ICI} from './vm.mjs';
const lire=f=>JSON.parse(fs.readFileSync(path.join(ICI,f)));
const existe=f=>fs.existsSync(path.join(ICI,f));
const base=lire('baseline.json'), finales=existe('final.json')?lire('final.json'):null;
const series=fs.readdirSync(ICI).filter(f=>/(moins|plus)\.json$/.test(f)).sort().map(lire);
const fmt=x=>x===null||x===undefined?'à vérifier':typeof x==='number'?x.toFixed(2).replace('.',','):String(x);
const pct=x=>x===null||x===undefined?'à vérifier':fmt(x*100)+' %';
const intervalle=a=>a?a.map(fmt).join('–')+' s':'à vérifier';
const tauxLasso=o=>`${o.reussis}/${o.tentatives} (${pct(o.taux)})`;
const rapport=(a,b)=>Number.isFinite(a/b)?(a/b).toFixed(4).replace('.',','):'à vérifier';
const dateParis=new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'});
function mesures(r){
  const p=r.resume.pilotes,ry=r.resume.rythme;
  const mortRange=r.cas.filter(c=>c.pilote==='inerte'&&c.premiereMort).map(c=>c.premiereMort.t);
  return [
    ['inerte.35','inerte','3 vies perdues avant 35 s',pct(p.inerte.avant35),'100 %','B'],
    ['inerte.mur8','inerte','première mort au mur avant 8 s',pct(p.inerte.mortMur8)+' ; '+intervalle([Math.min(...mortRange),Math.max(...mortRange)]),'100 %','B'],
    ['tourneur.90','tourneur','3 vies perdues avant 90 s',pct(p.tourneur.avant90),'100 %','B'],
    ['tourneur.score','tourneur','rapport des scores médians tourneur/bon',rapport(p.tourneur.score,p.bon.score),'< 0,10','i'],
    ['maladroit.mediane','maladroit','game over médian',fmt(p.maladroit.mediane)+' s','45–150 s','B'],
    ['maladroit.cyclope','maladroit','CYCLOPE atteint',pct(p.maladroit.atteint),'0/50','B'],
    ['maladroit.coup30','maladroit','premier coup avant 30 s',pct(p.maladroit.premierCoup30),'≥ 80 %','i'],
    ['kamikaze.avant','kamikaze','game over avant CYCLOPE',pct(1-p.kamikaze.atteint),'≥ 90 %','B'],
    ['kamikaze.gagne','kamikaze','victoires',pct(p.kamikaze.battu),'≤ 2/50','B'],
    ['humain.mediane','humain','game over médian',fmt(p.humain.mediane)+' s','120–210 s','B'],
    ['humain.cyclope','humain','CYCLOPE atteint',pct(p.humain.atteint),'10–35 %','i'],
    ['humain.bat','humain','CYCLOPE battu',pct(p.humain.battu),'2–12 %','i'],
    ['humain.coupV1','humain','au moins un coup en V1',pct(p.humain.coupV1),'≥ 50 %','i'],
    ['humain.lassoCourt','humain','LASSO 8–20 segments',tauxLasso(p.humain.lassoCourt),'≥ 50 %','B'],
    ['humain.lassoLong','humain','LASSO 30–40 segments',tauxLasso(p.humain.lassoLong),'≥ 40 %','B'],
    ['bon.cyclope','bon','CYCLOPE atteint',pct(p.bon.atteint),'30–60 %','B'],
    ['bon.bat','bon','CYCLOPE battu',pct(p.bon.battu),'10–30 %','B'],
    ['bon.mortAvant','bon','mort avant CYCLOPE',pct(p.bon.mortAvant),'≥ 70 %','i'],
    ['bon.coupV1','bon','au moins un coup en V1',pct(p.bon.coupV1),'≥ 40 %','i'],
    ['bon.longueur','bon','première longueur maximale, médiane',fmt(p.bon.longueurMaxDepuis),'≥ 120 s ou non atteinte','i'],
    ['expert.cyclope','expert','CYCLOPE atteint',pct(p.expert.atteint),'≥ 80 %','i'],
    ['expert.bat','expert','CYCLOPE battu',pct(p.expert.battu),'40–70 %','B'],
    ['expert.perdVie','expert','au moins une vie perdue',pct(p.expert.perdVie),'≥ 80 %','B'],
    ['expert.lassos','expert','LASSO affectant un ennemi, minimum par partie',fmt(p.expert.lassosMin),'≥ 10','i'],
    ['expert.apogees','expert','APOGÉE, minimum par partie',fmt(p.expert.apogeesMin),'≥ 2','i'],
    ['dieu.duree','dieu','durée secteur, min–max',intervalle(p.dieu.temps),'320–390 s pour toutes les parties','B'],
    ['dieu.combat','dieu','combat CYCLOPE, min–max',intervalle(p.dieu.combat),'55–90 s pour toutes les parties','B'],
    ['dieu.erreurs','dieu','erreurs VM',fmt(p.dieu.erreurs),'0','B'],
    ['rythme.pics','rythme','pics médians V1 à V5',ry.pics.map(x=>fmt(x.mediane)+' (n='+x.effectif+')').join(' ; '),'V1 < V2 < V3 < V4 < V5','B'],
    ['rythme.respiration','rythme','minimum sous 40 %, après vagues terminées',fmt(ry.respirations.minJeu)+' s jeu / '+fmt(ry.respirations.minReel)+' s simulé ; '+ry.respirations.echecs.length+'/'+ry.respirations.complete+' échecs','≥ 8 s de jeu','B'],
    ['rythme.tirs','rythme','parties avec tir ennemi avant V2',fmt(ry.tirsAvantV2.length),'0','B'],
    ['rythme.score','rythme','rapport scores médians bon/kamikaze',rapport(p.bon.score,p.kamikaze.score),'≥ 1,3','i']
  ].map(([id,pilote,cible,valeur,seuil,statut])=>({id,pilote,cible,valeur:valeur+(p[pilote]?.censures?' [parties sans fin : '+p[pilote].censures+', données incomplètes]':''),seuil,statut,tenu:(statut==='B'?r.resume.B:r.resume.i)[id]}));
}
const lignesBase=mesures(base);
let sensibilite='# Sensibilité — résultats mesurés sur vingt graines par pilote\n\n'+dateParis+' (Paris), mis à jour à '+dateParis+'.\n\n'+
'Chaque variante ne change que le groupe indiqué ; valeurs exactes dans les JSON de série. Pas de modification des sources du jeu. Les colonnes donnent les valeurs, puis entre parenthèses le résultat au seuil gelé : oui/non/à vérifier. Les proportions sur 20 graines sont exploratoires (erreur type autour de 50 % : ±11 points).\n\n';
const toutes=[base,...series.filter(s=>s.complete)];
for(const pilote of ['inerte','tourneur','maladroit','kamikaze','humain','bon','expert','dieu','rythme']){
  const cols=lignesBase.filter(l=>l.pilote===pilote);
  sensibilite+=`## ${pilote}\n\n| Variante | ${cols.map(c=>c.cible+' ['+c.statut+']').join(' | ')} |\n|---|${cols.map(()=>'---').join('|')}|\n`;
  for(const s of toutes){const lignes=mesures(s).filter(l=>l.pilote===pilote);sensibilite+=`| ${s.spec.nom} | ${lignes.map(l=>l.valeur+' ('+(l.tenu===true?'oui':l.tenu===false?'non':'à vérifier')+')').join(' | ')} |\n`;}
  sensibilite+='\n';
}
fs.writeFileSync(path.join(ICI,'sensibilite.md'),sensibilite);
const csv=[['variante','parametres','cible','B_i','valeur','seuil','tenu']];
for(const s of toutes)for(const m of mesures(s))csv.push([s.spec.nom,JSON.stringify(s.spec.overrides),m.id,m.statut,m.valeur,m.seuil,m.tenu===null?'à vérifier':m.tenu]);
fs.writeFileSync(path.join(ICI,'sensibilite.csv'),csv.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\n')+'\n');
if(finales?.complete){
  const lignes=mesures(finales);
  let table=dateParis+' (Paris), mis à jour à '+dateParis+'.\n\n| Pilote | Cible | Avant (20 graines) | Final (50 graines) | Seuil | B/i | Tenu ? |\n|---|---|---|---|---|---|---|\n';
  table+=lignes.map(l=>`| ${l.pilote} | ${l.cible} | ${lignesBase.find(b=>b.id===l.id).valeur} | ${l.valeur} | ${l.seuil} | ${l.statut} | ${l.tenu===true?'oui':l.tenu===false?'non':'à vérifier'} |`).join('\n')+'\n';
  fs.writeFileSync(path.join(ICI,'tableau-final.md'),table);
}
console.log(JSON.stringify({sensibilites:series.filter(s=>s.complete).length,final:!!finales?.complete}));
