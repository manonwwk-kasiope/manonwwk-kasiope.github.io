import fs from 'node:fs';import crypto from 'node:crypto';import {sources} from './vm.mjs';
const H=new URL('./',import.meta.url),src=sources(),sha=crypto.createHash('sha256').update(JSON.stringify(src)).digest('hex');
fs.writeFileSync(new URL('sources-finales.json',H),JSON.stringify(src));
fs.writeFileSync(new URL('empreinte-finale.json',H),JSON.stringify({dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),sourceSha256:sha},null,2)+'\n');console.log(sha);
