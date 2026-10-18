// Même décompte conservateur que tools/mesure/criteres/R-13-photosensibilite.mjs.
// Transitions agrégées du vrai tampon ; recouvrement spatial non établi.
export function photosensibilite(images,R,dt=1/60){
 const flashes=[],last={};for(const x of images)for(const[k,s]of[['up','L+'],['dn','L-'],['rin','R+'],['rout','R-']])if(x[k]>R.aire){const opp=s[0]+(s[1]==='+'?'-':'+');if(last[opp]!==undefined){if(flashes.at(-1)!==x.f)flashes.push(x.f);delete last[opp];}else last[s]=x.f;}
 let max=0;const fps=Math.round(1/dt);for(let i=0,j=0;i<flashes.length;i++){while(flashes[i]-flashes[j]>=fps)j++;max=Math.max(max,i-j+1);}
 return{images:images.length,flashs:flashes.length,maxParSeconde:max,aireMax:Math.max(...images.flatMap(x=>[x.up,x.dn,x.rin,x.rout]))};
}
export function apparitions(journal){const app=journal.filter(x=>x.type==='apparition'),arm=journal.filter(x=>x.type==='armement');return{apparitions:app.length,dansVue:app.filter(x=>{const d=x.d,v=d.vue;return v&&d.x>=v.x&&d.x<=v.x+v.w&&d.y>=v.y&&d.y<=v.y+v.h;}).length,armements:arm.length,horsVue:arm.filter(x=>!x.d.shown).length};}
