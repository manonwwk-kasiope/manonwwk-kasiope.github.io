// Relit les reçus Chromium fournis ; aucune nouvelle partie, aucun navigateur ni réseau.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resumer} from '../mesure/parties.mjs';
import {mediane} from '../reglage/analyse.mjs';
const HERE=path.dirname(new URL(import.meta.url).pathname),ROOT=path.resolve(HERE,'../..');
const DIR='/Users/manonwojciechowski/Projets/wt-snake/recus/batterie-318ce61/parties',OUT=path.join(HERE,'recus-318ce61');fs.mkdirSync(OUT,{recursive:true});
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const original=execFileSync('git',['show','318ce61:proto-neon/tools/mesure/parties.mjs'],{cwd:ROOT,encoding:'utf8'});
const code=fs.readFileSync(path.join(ROOT,'tools/mesure/parties.mjs'),'utf8');if(code!==original)throw Error('Résumé différent de 318ce61, arrêter cette relecture');
const names=['inerte','tourneur','maladroit','kamikaze','humain','bon','expert','dieu'],cas=[];
for(const pilote of names)for(let graine=1;graine<=5;graine++){
 const f=fs.readdirSync(DIR).find(f=>f.includes('_paysage_'+pilote+'_-_'+graine+'_')&&f.endsWith('_20261017_-.json.gz'));
 if(!f)throw Error('Reçu absent '+pilote+' '+graine);
 const bytes=fs.readFileSync(path.join(DIR,f)),r=JSON.parse(zlib.gunzipSync(bytes)),p=resumer(r);
 fs.writeFileSync(path.join(OUT,f),bytes);
 const phase=r.journal.find(e=>e.type==='phase'&&e.d.evt==='arrivee'),entree=r.journal.find(e=>e.type==='phase'&&e.d.evt==='entree'),v=r.journal.find(e=>e.type==='section'&&e.d.nom==='victoire');
 cas.push({pilote,graine,fin:p.finie,temps:p.duree,gameOverR04:p.gameOver,atteintR04:p.cyclopeAtteint,atteintPhase:!!phase,victoireR04:p.victoire,victoireSection:!!v,combatR04:p.combatCyclope,combatSection:entree&&v?v.t-entree.t:null,
  panneauSansBoss:!phase?r.echantillons.find(e=>e.etat==='panneau')||null:null,recu:'recus-318ce61/'+f,sha256:sha(bytes)});
}
const pilotes={};for(const nom of names){const a=cas.filter(c=>c.pilote===nom);pilotes[nom]={n:a.length,tempsMediane:mediane(a.map(c=>c.temps)),defaites:a.filter(c=>c.gameOverR04!==null).length,gameOverR04:mediane(a.map(c=>c.gameOverR04)),atteintR04:a.filter(c=>c.atteintR04).length,atteintPhase:a.filter(c=>c.atteintPhase).length,victoiresR04:a.filter(c=>c.victoireR04).length,combatSection:a.map(c=>c.combatSection)};}
const s={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),provenance:'Reçus Chromium existants 318ce61 ; aucune simulation nouvelle',resumerCodeIdentique318:true,cas,pilotes};
fs.writeFileSync(path.join(HERE,'relecture-318ce61.json'),JSON.stringify(s,null,2)+'\n');console.log(JSON.stringify(pilotes,null,2));
