// Deux écrans sans MP4 : titre de l'ouverture (masques déjà acquis) et film À SUIVRE (rendu public).
import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';import crypto from 'node:crypto';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {chargerVM} from '../jury2/vm-temoins.mjs';import {transitions,compteur,flashs} from './r13.mjs';
const H=path.dirname(fileURLToPath(import.meta.url)),ROOT=path.resolve(H,'../..'),data=JSON.parse(fs.readFileSync(path.join(H,'films.json'))),cas=[];
for(const c of data.films.find(f=>f.nom==='briefing').cas.filter(c=>c.route==='ouverture')){
 const a=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(H,'films',c.masques)))).filter(x=>x.segment==='titre').map((x,i)=>({...x,w:i/c.hz}));
 const r=flashs(a,.066,undefined,{hzFixe:c.hz});assert(r.qualifiable);cas.push({nom:'titre ouverture (horizon + logo)',profil:c.profil,hz:c.hz,masques:c.masques,segment:'titre',rendus:a.length,...r});
}
for(const [profil,[w,h]]of Object.entries({paysage:[844,390],portrait:[390,844],bureau:[1440,900]}))for(const hz of[12,60]){
 const {N,c,erreurs}=chargerVM(ROOT);N.intro.skip();const d=N.gfx.resize(w,h);Object.assign(N.S.view,{w:d.w,h:d.h,safe:{l:0,t:0,r:0,b:0}});N.gfx.clear(N.pal.i('nuitProfonde'));
 const e=N.aventure.ETAPES.find(e=>e.id==='asuivre');assert(e.type==='film'&&e.base===null);N.film.jouer(null,{...e,duree:e.duree+1});
 const r=N.R.lisibiliteP10.mesure,C=compteur(N.R.criteres.R13.aire,{hzFixe:hz}),trace=[],sha=crypto.createHash('sha256');let old=null;
 for(let k=0;k<e.duree*hz;k++){N.S.frame++;N.S.dt=k?1/hz:0;if(k)N.film.update(1/hz);N.film.draw();const B=N.gfx.buf();assert(B.every(v=>v<16));sha.update(B);const x={w:k/hz,W:N.gfx.W,H:N.gfx.H,...transitions(old,B,N.pal.L,r.luminanceDelta,r.luminanceSombre)};trace.push(x);C.ajouter(x);old=new Uint8Array(B);assert.equal(c.__ERR.count,0);assert.equal(erreurs.length,0);}
 const file=`a-suivre-${profil}-${hz}.json.gz`;fs.writeFileSync(path.join(H,file),zlib.gzipSync(JSON.stringify(trace)));const out=C.resultat();cas.push({nom:'À SUIVRE (sans clip)',profil,hz,masques:file,rendus:trace.length,sha256SuitePalette:sha.digest('hex'),err:c.__ERR.count,...out});
}
const out={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),cas};fs.writeFileSync(path.join(H,'proceduraux.json'),JSON.stringify(out,null,2)+'\n');console.log(cas.map(c=>({nom:c.nom,profil:c.profil,hz:c.hz,max:c.maxParSeconde})));
