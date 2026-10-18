import fs from 'node:fs';import zlib from 'node:zlib';
import {murMobileAnnonce} from '../mesure/criteres/R-31-plateau.mjs';
const lire=f=>JSON.parse(fs.readFileSync(new URL('./'+f,import.meta.url)));
const bilan={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),campagne:[],comparaison20:[],scenes:[]};
for(const mode of ['avant','apres']) {
 const {cas}=lire(mode+'.json');
 for(const c of cas){const {journal:j}=JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('./'+c.log,import.meta.url))));const r=Object.fromEntries([['arene','arene'],['vagues','vague'],['phases','phase']].map(([k,t])=>[k,j.filter(e=>e.type===t).map(e=>({...e.d,t:e.t}))]));c.sansAnnonceFinal=j.filter(e=>e.type==='mort'&&e.d.auteur==='murMobile'&&!murMobileAnnonce(r,{...e.d,t:e.t},2)).length;}
 for(const profil of ['paysage','portrait','bureau']){const a=cas.filter(c=>c.profil===profil),s=k=>a.reduce((v,c)=>v+(c[k]||0),0);bilan.campagne.push({mode,profil,parties:a.length,fins:a.filter(c=>c.raison==='fin').length,apparitions:s('apparitions'),dansVue:s('dansVue'),naissancesVue:s('naissancesVue'),armementsHorsVue:s('armementsHorsVue'),mortsMurMobile:s('mortsMurMobile'),sansAnnonce:s('sansAnnonceFinal'),err:s('err'),console:a.flatMap(c=>c.console||[])});}
 bilan[mode]=cas;
}
for(const a of bilan.avant.filter(c=>c.profil==='paysage')){const b=bilan.apres.find(c=>c.profil===a.profil&&c.pilote===a.pilote&&c.graine===a.graine);bilan.comparaison20.push({pilote:a.pilote,graine:a.graine,avant:{temps:a.tempsJeu,vague:a.vague,score:a.score},apres:b&&{temps:b.tempsJeu,vague:b.vague,score:b.score},identique:!!b&&a.tempsJeu===b.tempsJeu&&a.vague===b.vague});}
for(const s of lire('scenes-vm.json')){
 const morts=s.collision.morts,arene=s.collision.annonces.map(e=>({...e.d,t:e.t}));
 const historique=m=>m.d.teleDuree>=2-1e-6||arene.some(a=>['travelling','convoiAnnonce'].includes(a.evt)&&a.t<=m.t-2);
 bilan.scenes.push({mode:s.mode,profil:s.profil,annonceVersMouvement:s.murs[0].premier.delai,annoncePhysiqueVersMort:morts.map(m=>m.t-s.collision.zoneDepuis),teleDuree:morts.map(m=>m.d.teleDuree),sansAnnonceHistorique:morts.filter(m=>!historique(m)).length,sansAnnonceFinal:morts.filter(m=>!murMobileAnnonce({arene},{...m.d,t:m.t},2)).length,bossNaissancesVue:s.boss.naissances.filter(e=>e.dansVue).length,bossEntrees:s.boss.franchissements,bossMouvements:s.boss.mouvements.map(m=>({phase:m.phase,delai:m.delai})),bossPhase:s.boss.phase,sansPreavis:s.sansPreavis.morts.map(m=>m.d.teleDuree),schemas:s.schemas,err:s.err.count,captures:s.captures});
}
bilan.parite20=bilan.comparaison20.length===20&&bilan.comparaison20.every(c=>c.identique);
bilan.campagneComplete=bilan.avant.length===60&&bilan.apres.length===60;
bilan.r06=bilan.campagneComplete&&bilan.campagne.filter(c=>c.mode==='apres').every(c=>c.dansVue===0&&c.armementsHorsVue===0);
bilan.mursAnnonce=bilan.campagneComplete&&bilan.campagne.filter(c=>c.mode==='apres').every(c=>c.sansAnnonce===0);
fs.writeFileSync(new URL('./bilan.json',import.meta.url),JSON.stringify(bilan,null,2));
console.log(JSON.stringify({campagne:bilan.campagne,parite20:bilan.parite20,r06:bilan.r06,mursAnnonce:bilan.mursAnnonce,ecarts:bilan.comparaison20.filter(c=>!c.identique)},null,2));
if(!bilan.campagneComplete||!bilan.r06||!bilan.mursAnnonce||!bilan.parite20)process.exitCode=1;
