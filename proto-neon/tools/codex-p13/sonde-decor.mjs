// Mesure juste après le décor composé, avant les acteurs ; aucun compteur d'appels.
export function installerDecor(W) {
 const N=W.__N,g=N.gfx;let dernier=null;
 const draw=N.decor.drawFront;
 N.decor.drawFront=function(){
  const r=draw.apply(this,arguments),b=g.buf(),h=N.decor.horizon();
  let chaud=0,lum=0,n=0,cyan=0,cl=0,cc=0,cn=0;
  for(let y=0;y<g.H;y++)for(let x=0;x<g.W;x++){
   const c=b[y*g.W+x],hot=c===9||c===10||c===11;
   if(c===7||c===8)cyan++;
   if(y>h){n++;if(hot)chaud++;if(N.pal.L[c]>N.R.decorPhotosensibilite.seuilLumineuxSol)lum++;}
   else if(y<h){cn++;if(hot)cc++;if(N.pal.L[c]>.1)cl++;}
  }
  dernier={horizon:h,solChaud:n?chaud/n:0,solLumineux:n?lum/n:0,cielLumineux:cn?cl/cn:0,cielChaud:cn?cc/cn:0,cyan};
  return r;
 };
 W.__P13={lire:()=>dernier};
}
