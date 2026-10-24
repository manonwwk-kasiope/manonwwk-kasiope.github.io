import fs from 'node:fs';import crypto from 'node:crypto';import {sources} from './vm.mjs';
const H=new URL('./',import.meta.url),read=n=>JSON.parse(fs.readFileSync(new URL(n,H))),write=(n,v)=>fs.writeFileSync(new URL(n,H),JSON.stringify(v,null,2)+'\n');
const a=read('parties-avant.json'),b=read('parties-apres.json'),cal=read('calibration.json'),c=read('construits.json'),p=read('photos-finales.json'),r11=read('r11-sequence.json');
const sha=crypto.createHash('sha256').update(JSON.stringify(sources())).digest('hex');
if(b.cas.length!==80||b.sourceSha256!==sha)throw Error('80 reçus du candidat final nécessaires');
const r06=b.r06.reduce((s,r)=>{for(const k of ['apparitions','sansVue','dansVue','armements','horsVue'])s[k]+=r[k];return s;},{apparitions:0,sansVue:0,dansVue:0,armements:0,horsVue:0});
const finale={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),sourceSha256:sha,calibration:cal.valide&&cal.cas.length>=10,parties:{total:b.cas.length,identiques:b.identiques,journauxIdentiques:b.cas.filter((x,i)=>x.journalSha256===a.cas[i].journalSha256).length,fin:b.cas.filter(x=>x.raison==='fin').length,erreurs:b.cas.reduce((s,r)=>s+r.err+r.erreursConsole.length,0)},r06,construits:{isolesValides:c.isolesValides,total:c.versions[1].cas.length,reservesComposition:c.reservesComposition},r13:p.cas.map(x=>({profil:x.profil,scene:x.scene,max:x.pixels.maxParSeconde,ok:x.ok,erreursConsole:x.erreursConsole})),r11:r11.cas.filter(x=>x.scene==='colosse').map(x=>({version:x.version,profil:x.profil,gaine:x.analyse.gaine,decorLumineux:x.analyse.decorLumineux,err:x.err,erreursConsole:x.erreursConsole})),navigateur:{execute:false,commande:'node proto-neon/tools/codex-p32/verifier.mjs --criteres'}};
write('bilan.json',finale);
// Reçus canoniques : le premier essai groupé interrompu est conservé séparément.
const ancien=read('mesures-apres.json');if(ancien.r13.length!==9)write('essai-interrompu-139.json',ancien);
const avant=read('mesures-avant.json');avant.construits=c.versions[0].cas;write('mesures-avant.json',avant);
write('mesures-apres.json',{dateParis:finale.dateParis,sourceSha256:sha,limite:'Vrais pixels VM, processus séparés ; aucune validation navigateur.',r11:finale.r11.filter(x=>x.version==='apres'),construits:c.versions[1].cas,r13:p.cas});
const codeAvant=JSON.parse(fs.readFileSync(new URL('avant/sources.json',H))),codeApres=sources();
const s73=s=>s.slice(s.indexOf('  var st = neuf()'),s.indexOf('  /* ============================ le dessin du corps')).replace(/  function dessinerMurs\(\) \{[\s\S]*?\n  \}/,'');
const statique={sourceSha256:sha,modulesModifies:codeApres.filter(([n,s])=>codeAvant.find(([k])=>k===n)?.[1]!==s).map(([n])=>n),logique73Identique:s73(codeAvant.find(([n])=>n==='73-colosse.js')[1])===s73(codeApres.find(([n])=>n==='73-colosse.js')[1]),criteres:read('verification-sources.json').criteres};write('verification-sources.json',statique);
console.log(JSON.stringify({...finale,construits:{...finale.construits,reservesComposition:finale.construits.reservesComposition.length}}));
if(!finale.calibration||finale.parties.identiques!==80||finale.parties.journauxIdentiques!==80||finale.parties.erreurs||r06.dansVue||r06.horsVue||c.isolesValides!==63||p.cas.some(x=>!x.ok||x.erreursConsole.length)||!statique.logique73Identique)process.exitCode=1;
