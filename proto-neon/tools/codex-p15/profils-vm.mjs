// Contrôles procéduraux sans DOM ; ne constitue pas une preuve navigateur/Safari.
import fs from 'node:fs';
import {monde,sources,ICI} from './vm.mjs';
import {verifierCauses} from './causes.mjs';
const avant=JSON.parse(fs.readFileSync(ICI+'/avant/sources.json')),apres=sources(),cas=[];
for(const [phase,src] of [['avant',avant],['apres',apres]])for(const [profil,w,h] of [['paysage',844,390],['portrait',390,844],['bureau',1440,900]]){
 const m=monde(src,{w,h,reduit:true});
 const causes=JSON.parse(JSON.stringify(m.run('('+verifierCauses.toString()+')()')));
 const impact=JSON.parse(JSON.stringify(m.run(`(function(){
 const N=window.__N,S=N.S;localStorage.clear();N.intro.skip();N.game.reset(7,{depart:'jeu'});N.fx.reset();N.scene.reset();N.fx.setShake(1);
 const x=N.cam.x+N.gfx.W/2,y=N.cam.y+N.gfx.H/2,e=N.ennemis.spawn('fleche',x,y,{elite:'flecheBlindee'});e.x=x;e.y=y;
 N.journal.actif(true);N.journal.dump({vider:true});N.ennemis.hit(e,(e.pvMax||e.pv)*4,{genre:'arme',type:'canon',id:0});
 const trace=[];for(let i=0;i<60;i++){S.frame++;N.fx.update(N.R.temps.imageRef);N.gfx.clear(0);N.gfx.origin(N.cam.x,N.cam.y);N.fx.draw();N.gfx.origin(0,0);N.fx.drawEcran();let br=0,hors=0;const b=N.gfx.buf();for(const ci of b){if(ci===N.pal.i('brasier'))br++;if(ci>=N.pal.C.length)hors++;}trace.push({brasier:br/b.length,shake:S.shake,horsPalette:hors});}
 let suite=0,max=0;for(const x of trace){suite=x.brasier>N.R.criteres.R12.brasier?suite+1:0;max=Math.max(max,suite);}
 return {trace,brasierImages:max,err:window.__ERR,journal:N.journal.dump()};})()`)));
 cas.push({phase,profil,w,h,causes,impact,console:m.erreurs});
}
fs.writeFileSync(ICI+'/profils-vm.json',JSON.stringify({dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),limite:'sans DOM, images/films décodés ou CRT ; contrôle isolé centré, ne remplace pas R-12 officiel',cas},null,2));
console.log(cas.map(c=>({phase:c.phase,profil:c.profil,causes:c.causes.map(x=>x.death?.cause),brasier:c.impact.brasierImages,shake:Math.max(...c.impact.trace.map(t=>t.shake)),err:c.impact.err.count})));
