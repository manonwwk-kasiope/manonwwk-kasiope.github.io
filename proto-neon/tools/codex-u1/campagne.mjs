import fs from 'node:fs';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import { ICI, sources, compiler, jouer, hash, dateParis } from './vm.mjs';
import { raccorder } from './raccords.mjs';
const save=(n,o)=>fs.writeFileSync(ICI+'/'+n,JSON.stringify(o,null,2)+'\n');
if(process.argv.includes('--calibrer')) {
 const ref=JSON.parse(fs.readFileSync(ICI+'/../pilotes/sortie.json')).cas;
 const script=compiler(sources('e1bdc6f')),cas=[];
 for(const a of ref.filter(r=>r.graine===1||r.graine===2&&['bon','expert'].includes(r.pilote))) {
  const b=jouer(script,a.pilote,a.graine),champs=['tempsJeu','tempsCombat','tempsSimule','vague','score'];
  cas.push({pilote:a.pilote,graine:a.graine,attendu:Object.fromEntries(champs.map(k=>[k,a[k]])),obtenu:Object.fromEntries(champs.map(k=>[k,b[k]])),identique:champs.every(k=>a[k]===b[k])&&!b.err&&!b.erreursConsole.length,journalIdentique:hash(b.journal)===a.journalSha256});
  save('calibration.json',{dateParis:dateParis(),conforme:cas.length>=10&&cas.every(c=>c.identique),cas});
  console.log(a.pilote,a.graine,cas.at(-1).identique);
 }
 assert(cas.length>=10&&cas.every(c=>c.identique));
} else {
 assert(JSON.parse(fs.readFileSync(ICI+'/calibration.json')).conforme);
 const version=process.argv.includes('--avant')?'avant':process.argv.includes('--hors-score')?'hors-score':'apres';
 let src=version==='avant'?JSON.parse(zlib.gunzipSync(fs.readFileSync(ICI+'/sources-avant.json.gz'))):raccorder(sources());
 if(version==='hors-score')src=src.map(([f,s])=>[f,f==='77-score.js'?s.replace("var ok = L.filter(function (d) { return butDe(d) && !(n === R.accueilU1.premiereVague && !R.accueilU1.defiV1Lasso && d.lassos); });",'var ok = L.filter(butDe);').replace('if (m.activiteVague.kills >= R.accueilU1.primeKills || m.activiteVague.ramassages >= R.accueilU1.primeRamassages) ajouter(p * c.n, null, null);','ajouter(p * c.n, null, null);'):s]);
 const script=compiler(src),sha=hash(src),cas=[];
 fs.mkdirSync(ICI+'/parties',{recursive:true});
 for(const pilote of ['inerte','tourneur','maladroit','kamikaze','humain','bon','expert','dieu'])for(let graine=1;graine<=10;graine++) {
  const fichier=`parties/${sha.slice(0,16)}-${pilote}-${graine}.json.gz`;
  const b=fs.existsSync(ICI+'/'+fichier)?JSON.parse(zlib.gunzipSync(fs.readFileSync(ICI+'/'+fichier))):jouer(script,pilote,graine);
  if(!fs.existsSync(ICI+'/'+fichier))fs.writeFileSync(ICI+'/'+fichier,zlib.gzipSync(JSON.stringify(b)));
  const {journal,echantillons,...r}=b;cas.push({...r,journalSha256:hash(journal),echantillonsSha256:hash(echantillons),fichier});
  save(version+'.json',{dateParis:dateParis(),sourcesSha256:sha,complete:cas.length===80,cas});
  console.log(version,pilote,graine,b.raison,b.tempsJeu,b.score);
 }
}
