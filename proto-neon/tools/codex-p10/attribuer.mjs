import fs from 'node:fs';import {sources,monde} from './vm.mjs';import {installer,compter} from './sonde.mjs';
const src=sources(),resultats=[];
for(const scene of ['charge','boss3','mort-cyclope'])for(const retrait of ['aucun','fx','decor','colosse']){
 const {c,N,S}=monde(src,7);if(scene==='boss3'){N.gfx.resize(390,844);S.view.w=N.gfx.W;S.view.h=N.gfx.H;}installer(c);const P=c.__P10;P.preparer(scene);
 if(retrait!=='aucun')for(const name of ['draw','drawTop','drawFar','drawPlateau','drawFront','drawEcran'])if(N[retrait][name])N[retrait][name]=()=>{};
 const images=[];for(let f=0;f<600;f++){P.stimuler(f);c.frame(f*1000/60);images.push(P.lire(f));}
 const r={scene,retrait,pixels:compter(images),err:c.__ERR};resultats.push(r);console.log(scene,retrait,r.pixels.maxParSeconde);
}
fs.writeFileSync(new URL('attribution.json',import.meta.url),JSON.stringify(resultats,null,2));
