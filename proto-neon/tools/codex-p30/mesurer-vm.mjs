import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {sources,monde,ICI,PROTO} from './vm.mjs';
import {OBSERVER_TETE,ANALYSE} from '../mesure/criteres/R-37-arsenal.mjs';
import {flashs} from '../mesure/criteres/R-13-photosensibilite.mjs';
import {encodeIndex} from '../mesure/png.mjs';
import {construits,r37,r03,r13} from './scenarios.mjs';
const validation=JSON.parse(fs.readFileSync(path.join(ICI,'validation-vm.json')));
if(validation.identiques<10||validation.vmSha256!==crypto.createHash('sha256').update(fs.readFileSync(path.join(ICI,'vm.mjs'))).digest('hex'))throw Error('VM non validée');
const mode=process.argv[2]||'avant',sonde=fs.readFileSync(path.join(PROTO,'tools/mesure/sonde.js'),'utf8');
let src=sources().map(([f,s])=>[f,mode==='avant'&&fs.existsSync(path.join(ICI,'avant',f))?fs.readFileSync(path.join(ICI,'avant',f),'utf8'):s]);
if(mode==='avec-correctif-sprite')src=src.map(([f,s])=>[f,f==='40-sprites.js'?s.replace('d[j - 1] && d[j + 1] && d[j - w] && d[j + w]) continue;','d[j - 1] && d[j + 1] && d[j - w] && d[j + w]) { o.data[j] = NP; continue; }'):s]);
const out={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),mode,sourceSha256:crypto.createHash('sha256').update(src.map(([f,s])=>f+'\n'+s).join('\n')).digest('hex'),profils:[]};
const dossier=path.join(ICI,'pixels-vm',mode);fs.mkdirSync(dossier,{recursive:true});
for(const [profil,w,h] of [['paysage',844,390],['portrait',390,844],['bureau',1440,900]]){
  function nouveau(){const m=monde(src,{w,h,camera:true});vm.runInContext(sonde,m.c);vm.runInContext('('+OBSERVER_TETE.toString()+')()',m.c);m.c.__P30Analyse=vm.runInContext('(new Function("N","S","M",'+JSON.stringify(ANALYSE)+'))',m.c);return m;}
  const m=nouveau();const construit=vm.runInContext('('+construits.toString()+')()',m.c);
  const t=nouveau();t.c.__P30Sauver=nom=>{const g=t.N.gfx;fs.writeFileSync(path.join(dossier,profil+'-'+nom+'.png'),encodeIndex(g.W,g.H,g.buf(),t.N.pal.C.map(c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16))),3));};
  const R37=vm.runInContext('('+r37.toString()+')()',t.c);const a=nouveau(),R03=vm.runInContext('('+r03.toString()+')()',a.c);
  const b=nouveau(),R13=vm.runInContext('('+r13.toString()+')()',b.c);R13.compte=flashs(R13.images,b.N.R.criteres.R13.aire,1/60);
  const F=R13.journal.filter(e=>e.type==='flash'&&e.d.accepte);let max=0;for(let i=0,j=0;i<F.length;i++){while(F[i].t-F[j].t>=1)j++;max=Math.max(max,i-j+1);}R13.gateMax=max;
  out.profils.push({profil,dimensions:[t.N.gfx.W,t.N.gfx.H],construit,R37,R03,R13,console:[...m.erreurs,...t.erreurs,...a.erreurs,...b.erreurs]});
  fs.writeFileSync(path.join(ICI,mode+'-mesures.json'),JSON.stringify(out,null,2)+'\n');
  console.log(profil,'gaine',R37.captures.filter(a=>a.bord&&a.bord===a.gaine).length,'identiques',R37.captures.filter(a=>!a.differences&&a.tete===a.sprite).length,'proches',Math.max(...R37.captures.map(a=>a.proches)),'R13',JSON.stringify(R13.compte),'gate',max,'err',R37.err.count,R03.err.count,R13.err.count);
}
