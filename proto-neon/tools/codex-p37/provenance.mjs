import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {sources} from '../codex-p14/vm.mjs';
import {HERE,ROOT,hash,save,snap,read,partie,date} from './mesurer.mjs';
const courant=fs.readFileSync(path.join(HERE,'mesurer.mjs'),'utf8');
// Seul le dispatch optionnel synthese a été corrigé pendant la série avant.
// Le mode avant n'exécute pas ce dispatch ; le corps de partie et le chargeur sont inchangés.
const instrumentAvant=courant.replace("else if(mode==='synthese')import('./analyser.mjs');","else if(mode==='synthese')await import('./analyser.mjs');");
fs.writeFileSync(path.join(HERE,'instrument-avant.mjs'),instrumentAvant);
const A=read('avant.json'),B=read('apres.json');
if(hash(instrumentAvant)!==A.protocoleSha256)throw Error('Instrument avant non reconstitué exactement');
if(hash(courant)!==B.protocoleSha256)throw Error('Instrument après dérivé');
if(hash(sources())!==B.sourceSha256)throw Error('Candidat dérivé');
const srcA=snap('sources-avant.json.gz'),srcB=snap('sources-apres.json.gz'),old=new Map(srcA);
const modifications=srcB.filter(([f,s])=>s!==old.get(f)).map(([f,s])=>({fichier:f,avantSha256:hash(old.get(f)),apresSha256:hash(s)}));
const instruments=['mesurer.mjs','analyser.mjs','conformite.mjs','profils.mjs','verifier.mjs','rapport.mjs','provenance.mjs','../codex-p14/vm.mjs'];
save('provenance.json',{dateParis:date(),headRecu:execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim(),
 sourcesAvantSha256:hash(srcA),sourcesApresSha256:hash(srcB),candidatToujoursFige:hash(sources())===hash(srcB),modifications,
 instrumentAvantSha256:hash(instrumentAvant),instrumentApresSha256:hash(courant),corpsPartieSha256:hash(partie.toString()),
 differenceInstrument:'Seule la ligne du mode optionnel synthese passe de await import à import ; aucune branche avant/apres/valider ni corps de simulation changé.',
 bundleSha256:hash(fs.readFileSync(path.join(ROOT,'index.html'),'utf8')),instruments:instruments.map(f=>({f,sha256:hash(fs.readFileSync(path.join(HERE,f),'utf8'))}))});
console.log('Sources figées et instruments vérifiés ; seule différence de dispatch sans effet de simulation.');
