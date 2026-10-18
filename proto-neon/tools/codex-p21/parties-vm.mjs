import fs from 'node:fs';import zlib from 'node:zlib';import vm from 'node:vm';
import {sources,compiler,monde,partie,hash,sauver,dateParis,chargerAvant} from './vm.mjs';
const phase=process.argv.includes('--avant')?'avant':'apres', raccord=process.argv.includes('--raccord');
let src=phase==='avant'?chargerAvant():sources();
if(raccord){const {execFileSync}=await import('node:child_process'); const os=await import('node:os'); const path=await import('node:path');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'snake-p21-')); fs.mkdirSync(path.join(dir,'proto-neon/src'),{recursive:true});
 const file=path.join(dir,'proto-neon/src/70-joueuse.js');fs.writeFileSync(file,src.find(([f])=>f==='70-joueuse.js')[1]);
 execFileSync('patch',['-p1','-i',path.resolve('proto-neon/tools/codex-p21/raccord-70-joueuse.patch')],{cwd:dir});
 src=src.map(([f,s])=>[f,f==='70-joueuse.js'?fs.readFileSync(file,'utf8'):s]);fs.rmSync(dir,{recursive:true});}
const script=compiler(src), cas=[], mode=process.argv.includes('--r23')?'r23':'pilotes';
for(const pilote of mode==='r23'?['diriger','auto']:['inerte','tourneur','maladroit','kamikaze','humain','bon','expert','dieu']){
 for(let graine=1;graine<=(mode==='r23'?50:10);graine++){
  const m=monde(script,graine);
  let fn=partie.toString();
  if(mode==='r23') fn=fn.replace("pilote === 'humain' ? 'auto' : 'doigts'","pilote === 'auto' ? 'auto' : 'doigts'").replace('N.pilote.lancer(pilote);',"N.pilote.lancer('expert',{variante:pilote});" );
  if(process.argv.includes('--pouce'))fn=fn.replace('N.journal.actif(true);',"S.input.stick.active=true; N.journal.actif(true);");
  m.c.opts={pilote,graine}; const r=vm.runInContext('('+fn+')(opts)',m.c);
  const journal=JSON.parse(JSON.stringify(r.journal)); delete r.journal;delete r.echantillons;
  cas.push({...r,journalSha256:hash(journal),victoire:journal.some(e=>e.type==='phase'&&e.d.evt==='mort'),impulsions:journal.filter(e=>e.type==='pilote'&&(['pouvoir','apogee'].includes(e.d.evt)||e.d.evt==='boost'&&e.d.on)).length,erreursConsole:m.erreurs});
 }
 console.log(phase,raccord?'raccord':'sources',pilote,cas.filter(c=>c.pilote===pilote&&c.victoire).length+'/'+cas.filter(c=>c.pilote===pilote).length);
 sauver(`${mode}-${phase}${raccord?'-raccord':''}${process.argv.includes('--pouce')?'-pouce':''}.json`,{dateParis:dateParis(),sourceSha256:hash(src),cas});
}
