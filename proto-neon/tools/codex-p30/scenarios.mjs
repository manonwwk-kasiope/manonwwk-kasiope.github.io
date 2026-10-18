// Même programme dans la VM et dans Chromium ; les données viennent du vrai tampon.
export function construits() {
  const N=window.__N,M=window.__MESURE,g=N.gfx;
  const lire=()=>window.__P30Analyse(N,N.S,M),cas=[];
  g.origin(0,0);N.game.dbg.masque();
  // Tête témoin 3×3 : huit pixels sombres, centre cyan. Entrées de l'instrument, pas un actif du jeu.
  const sp={w:3,h:3,data:new Uint8Array([15,15,15,15,7,15,15,15,15])};
  function base(){g.clear(0);g.owner(1);g.blit(sp,30,30);M.__tete37={...sp,x:30,y:30,data:Array.from(sp.data),ink:null};}
  base();cas.push({nom:'tête seule témoin',...lire()});
  base();g.owner(3);g.px(33,31,10);cas.push({nom:'tir collé témoin',...lire()});
  base();g.owner(3);g.px(31,31,10);cas.push({nom:'tête recouverte témoin',...lire()});
  // Le vrai sprite sans aucun autre objet ; 16 orientations et toutes les animations.
  const sprites=[];
  for(let d=0;d<16;d++)for(let f=0;f<N.spr.frames('tete');f++){
    g.clear(0);const s=N.spr.make('tete:'+d,f);g.owner(1);g.blit(s,30,30);
    sprites.push({d,f,...lire()});
  }
  g.owner(0);return {cas,sprites};
}
export function r37() {
  const N=window.__N,M=window.__MESURE;
  const scene=N.game.dbg.scene('v5');N.game.dbg.god(true);N.game.dbg.masque();
  const captures=[];
  // Comme session.scene du banc : trois images initiales, puis dix captures espacées de trente images.
  for(let f=0;f<3;f++)window.__P30Frame();
  for(let k=0;k<10;k++){
    for(let f=0;f<30;f++)window.__P30Frame();
    captures.push({...window.__P30Analyse(N,N.S,M),etat:N.game.etat(),t:N.horloge.t()});
    if(window.__P30Sauver)window.__P30Sauver('R37-'+k);
  }
  return {scene,captures,err:window.__ERR,etat:N.game.etat(),journal:N.journal.dump()};
}
export function r03() {
  const N=window.__N,M=window.__MESURE,cas=[];
  for(const nom of ['calme','montee','chaos','colosse','charge','v5','boss3','travelling','convoi','lasso6','mort','vol','inversion','cartes']){
    let ok;
    if(nom==='cartes'){N.game.dbg.scene('v5');ok=N.game.dbg.etat('cartes');}
    else ok=N.game.dbg.scene(nom==='mort'?'mortTir':nom);
    N.game.dbg.masque();
    for(let i=0;i<3;i++)window.__P30Frame();
    if(nom==='mort')for(let i=0;i<480&&N.game.etat()!=='mort';i++)window.__P30Frame();
    window.__P30Frame();
    cas.push({nom,ok,etat:N.game.etat(),film:N.intro.current(),...M.analyseCourante()});
  }
  return {cas,err:window.__ERR,journal:N.journal.dump()};
}
export function r13() {
  const N=window.__N,M=window.__MESURE,scene=N.game.dbg.scene('charge');
  N.game.dbg.god(true);N.journal.actif(true);N.journal.vider();
  const images=[];let prev=null,kills=0;
  for(let f=0;f<3600;f++){
    if(f%4===0&&kills<30){const e=N.ennemis.list.find(e=>e.etat!=='mort'&&!e.boss);if(e){N.ennemis.hit(e,1e6,{genre:'arme',type:'canon',id:0});kills++;}}
    window.__P30Frame();const b=N.gfx.buf(),L=M.L,n=b.length;
    let up=0,dn=0,rin=0,rout=0;
    if(prev)for(let i=0;i<n;i++){
      const a=prev[i],c=b[i];if(a===c)continue;const la=L[a],lc=L[c],lo=Math.min(la,lc);
      if(lc-la>=.1&&lo<.8)up++;else if(la-lc>=.1&&lo<.8)dn++;
      const ra=a===5||a===11||a===14,rc=c===5||c===11||c===14;
      if(rc&&!ra)rin++;else if(ra&&!rc)rout++;
    }
    if(!prev)prev=new Uint8Array(b);else prev.set(b);
    images.push({f,up:up/n,dn:dn/n,rin:rin/n,rout:rout/n});
  }
  return {scene,kills,images,err:window.__ERR,journal:N.journal.dump()};
}
