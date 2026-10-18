import fs from 'node:fs';
import crypto from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {monde,partie} from './vm-bundle.mjs';
const a=JSON.parse(fs.readFileSync(new URL('sources-avant.json',import.meta.url))),refs=JSON.parse(fs.readFileSync(new URL('parties-avant.json',import.meta.url)));
const r=refs.cas.find(r=>r.pilote==='humain'&&r.graine===1),t=performance.now(),m=monde(a),b=partie(m,'humain',1);
b.tempsCombat=m.N.game.dbg().t;b.journalSha256=crypto.createHash('sha256').update(JSON.stringify(m.N.journal.dump())).digest('hex');b.erreursConsole=m.erreurs;
const out={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),ms:performance.now()-t,identique:JSON.stringify(r)===JSON.stringify(b),attendu:r,obtenu:b};
fs.writeFileSync(new URL('calibration-bundle-long.json',import.meta.url),JSON.stringify(out,null,2)+'\n');console.log(out);if(!out.identique)process.exitCode=1;
