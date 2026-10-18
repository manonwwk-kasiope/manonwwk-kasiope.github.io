import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
import {sources,ICI,PROTO}from './vm.mjs';
const read=f=>JSON.parse(fs.readFileSync(ICI+'/'+f+'.json')),sha=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const final=sources(),mesure=read('apres-sources'),changements=[];
for(let i=0;i<final.length;i++){
 assert.equal(final[i][0],mesure[i][0]);let a=mesure[i][1],b=final[i][1];if(a===b)continue;
 assert.equal(final[i][0],'72-serpents.js');
 const ancien='if (partie && N.ennemis.counts().regular >= plafond) return;',nouveau='if (partie && (N.ennemis.counts().regular >= plafond || N.ennemis.count() >= N.R.secteurs[0].plafondDur.ennemis)) return;';
 assert.ok(a.includes(ancien));a=a.replace(ancien,nouveau).replace('// hors aventure : rien, pas même un tirage','// aucun tirage hors du mode demandé');assert.equal(a,b);
 changements.push({fichier:final[i][0],avant:ancien,apres:nouveau,portee:'Branche partie uniquement. Aucun appel à pasPartie dans 76 non raccordé ; sans effet dans les 80 parties.'});
}
assert.ok(!final.find(([f])=>f==='76-directeur.js')[1].includes('N.serpents.pasPartie'));
const parite=read('parite');assert.equal(parite.length,80);assert.ok(parite.every(c=>c.identique&&c.fin&&!c.erreurs));
const calibration=read('calibrer');assert.equal(calibration.cas.length,10);assert.ok(calibration.cas.every(c=>c.identique&&!c.err&&!c.console.length));
for(const f of ['aventure','voyages']){
 const avant=read(f+'-avant'),apres=read(f+'-apres');assert.deepEqual(avant.cas,apres.cas);assert.ok(avant.conforme&&apres.conforme);
}
const cloud=read('cloud-apres-raccords');assert.equal(cloud.verdicts.length,114);assert.ok(cloud.verdicts.every(c=>c.ok));
const scenes=read('scenes-apres'),vagues=read('vagues-apres');assert.equal(scenes.cas.length,12);assert.ok(scenes.conforme);assert.equal(vagues.cas.length,12);
const ablation=read('ablation');assert.ok(ablation.journalIdentique);
const reutilisation={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),sourcesMesureesSha256:sha(mesure),sourcesFinalesSha256:sha(final),changements,partiesIdentiques:80,calibration:10,bornes:read('bornes'),portee:'Reçus des 80 parties réutilisés après le seul garde-fou partie non raccordée. Les bornes nouvelles sont réellement exécutées ; les vagues raccordées sont rejouées.'};
fs.writeFileSync(ICI+'/reutilisation-parties.json',JSON.stringify(reutilisation,null,2));fs.writeFileSync(ICI+'/final-sources.json',JSON.stringify(final));
const validation={dateParis:reutilisation.dateParis,sourcesFinalesSha256:sha(final),bundleSha256:crypto.createHash('sha256').update(fs.readFileSync(PROTO+'/index.html')).digest('hex'),calibrationExacte:10,partiesIdentiques:80,partiesFinies:80,cloudAssertions:114,scenes:12,morsures:read('morsures-apres'),voyagesIdentiques:true,moduleAventureIdentique:true,R13:{avant:read('vagues-avant').cas.map(c=>({profil:c.profil,type:c.type,max:c.R13.maxParSeconde})),apres:vagues.cas.map(c=>({profil:c.profil,type:c.type,max:c.R13.maxParSeconde})),ablation:ablation.cas.map(c=>({sansSerpents:c.sansSerpents,max:c.R13.maxParSeconde})),valide:vagues.conforme},navigateur:'Non exécuté : listen et Chromium interdits dans ce bac.',statut:'Lot arrêté avant validation globale : R-13, intégration des raccords et reçu navigateur attendus.'};
fs.writeFileSync(ICI+'/validation.json',JSON.stringify(validation,null,2));console.log(JSON.stringify({calibration:10,parite:80,cloud:114,scenes:12,R13:vagues.conforme}));
