// Une partie, un processus Node, un contexte VM. Aucun DOM, serveur, Chromium ou thread Worker.
import fs from 'node:fs';import zlib from 'node:zlib';import vm from 'node:vm';import {monde,partie,hash} from './vm.mjs';import {partiePouce} from './partie-r23.mjs';
const input=JSON.parse(fs.readFileSync(0,'utf8')),src=JSON.parse(zlib.gunzipSync(fs.readFileSync(input.sources))),m=monde(src,input.opts.graine);
m.c.opts=input.opts;const fn=input.methode==='r23'?partiePouce:partie;
const result=vm.runInContext('('+fn.toString()+')(opts)',m.c),journal=JSON.parse(JSON.stringify(result.journal));delete result.journal;delete result.echantillons;
process.stdout.write(JSON.stringify({...result,journalSha256:hash(journal),erreursConsole:m.erreurs}));
