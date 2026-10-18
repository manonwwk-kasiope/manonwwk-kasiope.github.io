/* Tableau p5, même extraction des valeurs et mêmes seuils, deux lots appariés de50graines. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath}from'node:url';
const ICI=path.dirname(fileURLToPath(import.meta.url)),lire=f=>JSON.parse(fs.readFileSync(path.join(ICI,f),'utf8'));
const base=lire('avant.json'),finales=lire('apres.json');if(!base.complete||!finales.complete||base.graines!==50||finales.graines!==50)throw Error('Deux collectes50 complètes requises');
const fmt=x=>x===null||x===undefined?'à vérifier':typeof x==='number'?x.toFixed(2).replace('.',','):String(x),pct=x=>x===null||x===undefined?'à vérifier':fmt(x*100)+' %',intervalle=a=>a?a.map(fmt).join('–')+' s':'à vérifier',tauxLasso=o=>`${o.reussis}/${o.tentatives} (${pct(o.taux)})`,rapport=(a,b)=>Number.isFinite(a/b)?(a/b).toFixed(4).replace('.',','):'à vérifier';
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

const a=mesures(base),b=mesures(finales),dateParis=new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'});const table=`${dateParis} (Paris), mis à jour à ${dateParis}.

| Pilote | Cible | Avant (50 graines) | Après (50 graines) | Seuil inchangé | B/i | Tenu après ? |
|---|---|---|---|---|---|---|
`+b.map(l=>`| ${l.pilote} | ${l.cible} | ${a.find(x=>x.id===l.id).valeur} | ${l.valeur} | ${l.seuil} | ${l.statut} | ${l.tenu===true?'oui':l.tenu===false?'non':'à vérifier'} |`).join('\n')+'\n';fs.writeFileSync(path.join(ICI,'tableau-final.md'),table);
const ecarts=finales.cas.map((c,i)=>{const p=base.cas[i];if(c.pilote!==p.pilote||c.graine!==p.graine)throw Error('Non apparié');return{pilote:c.pilote,graine:c.graine,avant:p,apres:c}});fs.writeFileSync(path.join(ICI,'ecarts.json'),JSON.stringify({dateParis,ecarts},null,2)+'\n');console.log(JSON.stringify({avant:base.resume.nbB,apres:finales.resume.nbB,finAvant:base.cas.filter(x=>x.fin).length,finApres:finales.cas.filter(x=>x.fin).length}));
