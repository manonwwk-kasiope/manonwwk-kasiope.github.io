// Fonction sérialisable commune à la VM et au navigateur. La vraie frame est exposée par l'instrument.
export function relance({mode='clavier',frames=200,preparation=40}={}){
 const N=window.__N,S=window.__S,dt=window.__DT;
 localStorage.clear();S.jour=20261017;N.intro.skip();N.game.reset(1,{depart:'jeu'});N.pilote.arreter();
 N.game.dbg.scene('fin');N.journal.actif(true);
 for(let f=0;f<preparation;f++)window.__P41Image(0);
 const capture=()=>({etat:N.game.etat(),joueuse:N.joueuse.etat,ecran:N.ui.ecran(),film:N.intro.current(),t:N.horloge.t(),pas:N.horloge.pas(),tete:{...N.joueuse.tete},vies:N.score.vies,score:N.score.score,vague:N.dir.vague()});
 const pixels=()=>{const b=N.gfx.buf(),hist=Array(N.pal.C.length).fill(0);let horsPalette=0,hash=2166136261;for(const c of b){if(c<hist.length)hist[c]++;else horsPalette++;hash=Math.imul(hash^c,16777619)>>>0;}return {w:N.gfx.W,h:N.gfx.H,hist,horsPalette,empreinte:hash};};
 const avant=capture(),tamponAvant=pixels(),images=[];
 if(mode==='clavier')N.game.dbg.input({valider:true,any:true});
 else {const a=N.ui.finActions().rejouer;N.game.dbg.input({taps:[{x:a.x+a.w/2,y:a.y+a.h/2,t0:0,t1:0}],any:true});}
 for(let f=1;f<=frames;f++){window.__P41Image(0);images.push({f,secondes:f*dt,...capture(),pixels:pixels()});}
 const k=images.findIndex(i=>i.etat==='jeu'&&i.joueuse==='vivant');
 // Contrôle de la prise en main : vrai déplacement ET virage sous une entrée publique.
 // Se replacer à la première frame jouable dans un contrôle séparé évite la mort au mur après 200 images.
 return {mode,avant,tamponAvant,images,premiereImage:k<0?null:images[k].f,secondes:k<0?null:images[k].secondes,
   etats:[...new Set(images.map(i=>i.etat))],sansBriefing:!images.some(i=>['briefing','ouverture'].includes(i.etat)),
   journal:N.journal.dump(),err:window.__ERR.count,erreurs:window.__ERR.sigs};
}
export function main(){
 const N=window.__N,S=window.__S;N.intro.skip();N.game.reset(1,{depart:'jeu'});N.pilote.arreter();N.game.dbg.scene('fin');
 for(let i=0;i<40;i++)window.__P41Image(0);
 N.game.dbg.input({valider:true,any:true});let f=0;
 while(f<200){window.__P41Image(0);f++;if(N.game.etat()==='jeu'&&N.joueuse.etat==='vivant')break;}
 const a={...N.joueuse.tete};N.game.dbg.input({x:Math.cos(a.ang-Math.PI/2),y:Math.sin(a.ang-Math.PI/2),mag:0.7});
 window.__P41Image(0);const b={...N.joueuse.tete};
 return {images:f,avant:a,apres:b,deplacement:Math.hypot(b.x-a.x,b.y-a.y),virage:Math.atan2(Math.sin(b.ang-a.ang),Math.cos(b.ang-a.ang)),etat:N.game.etat(),vivant:N.joueuse.etat==='vivant',err:window.__ERR.count};
}
