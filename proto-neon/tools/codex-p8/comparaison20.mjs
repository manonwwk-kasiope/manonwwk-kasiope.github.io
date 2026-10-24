import fs from 'node:fs';
import crypto from 'node:crypto';
import { sources, monde, partie } from './vm.mjs';
const avant=sources(),apres=sources();for(const f of fs.readdirSync(new URL('./avant/',import.meta.url)))avant[f]=fs.readFileSync(new URL('./avant/'+f,import.meta.url),'utf8');
const reference=JSON.parse(fs.readFileSync(new URL('../pilotes/sortie.json',import.meta.url)));
const cas=[],dateParis=()=>new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'});
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const resultat={dateParis:dateParis(),sourcesApresSha256:hash(JSON.stringify(apres)),cas};
for(const r of reference.cas.filter(c=>c.graine<=4&&['inerte','tourneur','maladroit','kamikaze','humain'].includes(c.pilote))){
 const a=monde(avant),b=monde(apres),ra=partie(a,r.pilote,r.graine),rb=partie(b,r.pilote,r.graine);
 const ja=hash(JSON.stringify(a.N.journal.dump())),jb=hash(JSON.stringify(b.N.journal.dump()));
 const attendu=Object.fromEntries(Object.keys(rb).map(k=>[k,r[k]]));
 cas.push({avant:ra,apres:rb,attendu,journalAvant:ja,journalApres:jb,identique:JSON.stringify(ra)===JSON.stringify(rb)&&ja===jb,referenceIdentique:JSON.stringify(rb)===JSON.stringify(attendu)});
 fs.writeFileSync(new URL('./comparaison20.json',import.meta.url),JSON.stringify(resultat,null,2));
 console.log(JSON.stringify({pilote:r.pilote,graine:r.graine,identique:cas.at(-1).identique,referenceIdentique:cas.at(-1).referenceIdentique}));
}
resultat.avantApresConforme=cas.length>=20&&cas.every(c=>c.identique&&c.apres.raison==='fin'&&!c.apres.err);
resultat.referenceHistoriqueConforme=cas.every(c=>c.referenceIdentique);
resultat.conforme=resultat.avantApresConforme&&resultat.referenceHistoriqueConforme;
fs.writeFileSync(new URL('./comparaison20.json',import.meta.url),JSON.stringify(resultat,null,2));
if(!resultat.conforme)process.exitCode=1;
