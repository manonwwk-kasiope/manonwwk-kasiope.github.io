/* Relecture numérique des PNG historiques, sans VM ni navigateur. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decode } from './png.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const bilan={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),r01:[],r32:[]};
for(const [profil,PX,dpr] of [['paysage',2,3],['portrait',2,3],['bureau',4,1]]){
  const im=decode(path.join(HERE,'sortie/captures/R-01-'+profil+'.png')),B=PX*dpr;
  let blocs=0,nonUniformes=0;
  for(let by=0;by<Math.floor(im.h/B);by++)for(let bx=0;bx<Math.floor(im.w/B);bx++){
    const o=(by*B*im.w+bx*B)*4;let uniforme=true;
    for(let y=0;y<B;y++)for(let x=0;x<B;x++){
      const k=((by*B+y)*im.w+bx*B+x)*4;
      if(im.rgba[k]!==im.rgba[o]||im.rgba[k+1]!==im.rgba[o+1]||im.rgba[k+2]!==im.rgba[o+2])uniforme=false;
    }
    blocs++;if(!uniforme)nonUniformes++;
  }
  bilan.r01.push({profil,w:im.w,h:im.h,PX,dpr,blocs,nonUniformes,premiereColonne:Array.from({length:8},(_,y)=>Array.from(im.rgba.slice(y*im.w*4,y*im.w*4+3)))});
}
const sombre=new Set([0x190b28,0x241734,0x541388,0x2d1b69,0x8b0f3a,0x01012b]);
for(const q of ['docks','artere','centrale','ciel','tours','coeur','eclipse']){
  const im=decode(path.join(HERE,'sortie/captures/R-32-'+q+'-paysage-tampon.png'));
  let classesCite=0,n=0;
  // Les huit premières rangées du vrai tampon (captures agrandies x2) sont du ciel.
  for(let y=0;y<8;y++)for(let x=0;x<im.w/2;x++){
    const o=(y*2*im.w+x*2)*4,c=(im.rgba[o]<<16)|(im.rgba[o+1]<<8)|im.rgba[o+2];
    n++;if(sombre.has(c))classesCite++;
  }
  bilan.r32.push({quartier:q,zone:'8 premières rangées du tampon, ciel',pixels:n,classesCite,part:classesCite/n});
}
fs.writeFileSync(path.join(HERE,'diagnostic/p3b-recus.json'),JSON.stringify(bilan,null,2)+'\n');
console.log(JSON.stringify(bilan));
