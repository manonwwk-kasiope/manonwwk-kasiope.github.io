// Une seule VM par processus : reprise bornée après les arrêts Node 139 du banc groupé.
import fs from 'node:fs';import {sources,monde} from './vm.mjs';import {installer,analyser} from '../codex-p10/sonde.mjs';
const [profil,scene]=process.argv.slice(2),dims={paysage:[844,390],portrait:[390,844],bureau:[1440,900]};
const {N,c,S,erreurs}=monde(sources(),7),[w,h]=dims[profil];N.gfx.resize(w,h);S.view.w=N.gfx.W;S.view.h=N.gfx.H;
installer(c);const P=c.__P10;P.preparer(scene);const images=[];
for(let f=0;f<N.R.lisibiliteP10.mesure.images;f++){P.stimuler(f);c.frame((c.__FRAME||0)*1000/60);images.push(P.lire(f));}
const r={...analyser({profil,scene,images,...P.bilan()}),erreursConsole:erreurs};
fs.writeFileSync(new URL('photo-'+profil+'-'+scene+'.json',import.meta.url),JSON.stringify(r,null,2)+'\n');console.log(profil,scene,r.pixels.maxParSeconde,r.ok);if(!r.ok||erreurs.length)process.exitCode=1;
