// Un seul lot d'un pilote par processus : borne la durée de vie des contextes V8, sans changer le jeu.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {instrument,sources,ICI} from './vm.mjs';
const [pilote,graines,json]=process.argv.slice(2),overrides=JSON.parse(json);
const banc=instrument(sources(),overrides);
for(let graine=1;graine<=+graines;graine++){
  const fichier=path.join(ICI,'recus',banc.hash.slice(0,16)+'-'+pilote+'-'+graine+'.json.gz');
  if(fs.existsSync(fichier))continue;
  const r=banc.run(pilote,graine,{observer:pilote==='bon'});
  fs.writeFileSync(fichier,zlib.gzipSync(JSON.stringify(r)));
  if((!r.fin&&r.raison!=='borne')||r.err||r.erreursConsole.length)throw new Error(JSON.stringify({pilote,graine,raison:r.raison,err:r.err,console:r.erreursConsole}));
  if(!r.fin)console.error(JSON.stringify({casBorne:true,pilote,graine,tempsJeu:r.tempsJeu,raison:r.raison}));
}
