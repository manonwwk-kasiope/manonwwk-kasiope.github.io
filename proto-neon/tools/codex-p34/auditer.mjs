// Vérifications de livraison, aucune simulation supplémentaire.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const HERE=path.dirname(new URL(import.meta.url).pathname),ROOT=path.resolve(HERE,'../..');
const read=n=>JSON.parse(fs.readFileSync(path.join(HERE,n))),save=(n,x)=>fs.writeFileSync(path.join(HERE,n),JSON.stringify(x,null,2)+'\n');
const git=(...a)=>execFileSync('git',a,{cwd:ROOT,encoding:'utf8'}).trim();
const s=read('synthese.json'),v=read('validation-vm.json'),temoin=read('verification-temoin.json');
const src=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(HERE,'sources-recues.json.gz'))));
const current=fs.readdirSync(path.join(ROOT,'src')).filter(f=>f.endsWith('.js')).sort();
const checks={calibration10:v.conforme&&v.cas.length===10,actuel80:s.actuel.cas.length===80,contrefactuel30:s.avantP14.cas.length===30,finEtZeroErreur:[...s.actuel.cas,...s.avantP14.cas].every(c=>c.fin&&!c.err&&!c.erreursConsole.length),paires190:s.paires.length===190&&new Set(s.paires.map(p=>p.a+'-'+p.b)).size===190,temoin20:temoin.conforme,sourceListe:JSON.stringify(current)===JSON.stringify(src.map(([f])=>f)),sourcesIntactes:src.every(([f,t])=>fs.readFileSync(path.join(ROOT,'src',f),'utf8')===t),indexIdentiqueHead:git('hash-object','index.html')===git('rev-parse','HEAD:proto-neon/index.html'),relecture40:read('relecture-318ce61.json').cas.length===40};
for(const c of read('relecture-318ce61.json').cas){const bytes=fs.readFileSync(path.join(HERE,c.recu));if(crypto.createHash('sha256').update(bytes).digest('hex')!==c.sha256)throw Error('Reçu historique altéré');}
const verdict={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),checks,tousConformes:Object.values(checks).every(Boolean),buildSortie:0,playwright:'script contrôlé, non exécuté',reseauSortant:'aucun',commit:'aucun',incidentAudit:{commande:'git show HEAD:proto-neon/index.html via execFileSync',erreur:'ENOBUFS',resolution:'Comparaison des empreintes de blob Git, sans transférer le contenu du bundle dans le tampon de sortie ; aucune simulation rejouée'}};
save('verification-finale.json',verdict);
if(!verdict.tousConformes)throw Error(JSON.stringify(verdict));
save('REPRISE.json',{dateParis:verdict.dateParis,statut:'analyse terminée ; aucune tâche engagée',objectif:'Compatibilité des 20 cibles B, sans régler le jeu',budget:{calibrations:10,actuelles:80,contrefactuelles:30,simulations:120,historiquesRelues:40},preuves:['rapport.md','verification-finale.json','validation-vm.json','synthese.json','paires.csv','relecture-318ce61.json','durees.json'],conclusions:['cibles numériquement non contradictoires, réalisation par les pilotes figés non prouvée','R04 : faux accès au boss par panneau, médianes de populations différentes, repère phase/mort manquant','p14 : gain apparié humain/bon/expert ; dieu suit une autre politique que bon','inerte : trajet initial au mur incompatible avec moins de 8 secondes'],resteHorsMission:['décision cheffe et jury sur définitions et politiques','corrections par les propriétaires, aucun seuil modifié ici','si nécessaire : Playwright hors bac puis qualification sur cinquante graines du candidat figé'],prochaineAction:'Lire rapport.md ; ne pas rejouer les séries VM inchangées. Commande navigateur : cd proto-neon && node tools/codex-p34/verifier.mjs'});
console.log(JSON.stringify(verdict));
