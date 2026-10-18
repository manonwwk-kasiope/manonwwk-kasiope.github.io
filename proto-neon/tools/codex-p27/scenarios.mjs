// Cas construits sur de vraies vagues. Fonction sérialisable, partagée VM / Playwright.
export function scenario(type) {
 const N=window.__N,S=window.__S,h=N.R.temps.h;
 N.intro.skip();N.game.reset(7,{depart:'plongee'});N.game.dbg.vague(2);N.game.dbg.god(true);N.horloge.avancer();
 N.ev.verifier(true);N.journal.actif(true);N.journal.vider();N.ennemis.reset();N.arene.reset();N.outils.geom();
 const directeur=N.dir.update,joueuse=N.joueuse.update,arsenal=N.arsenal.update;
 N.dir.update=()=>{};N.joueuse.update=()=>{};N.arsenal.update=()=>{};
 const P=N.joueuse.tete,V=N.outils.VUE,e=N.ennemis.spawn(type,P.x,P.y,{partie:true});
 const sprite=N.R.serpents?N.R.serpents.types[type].sprite:({tique:9,voleur:13,miroir:11,brouilleur:14})[type];
 const naissance={x:e.x,y:e.y,r:e.r,vue:{...V},horsSprite:e.x<V.x-(sprite/2+N.R.apparitions.marge)||e.x>V.x+V.w+(sprite/2+N.R.apparitions.marge)||e.y<V.y-(sprite/2+N.R.apparitions.marge)||e.y>V.y+V.h+(sprite/2+N.R.apparitions.marge)};
 const step=()=>N.game.dbg.simuler(h),capture=nom=>{
   N.gfx.clear(0);N.outils.origineMonde();N.ennemis.drawEnemies();N.ennemis.drawTele();
   const buf=Array.from(N.gfx.buf()),cyan=N.pal.i('cyan'),cp=N.pal.i('cyanPale');
   return {nom,W:N.gfx.W,H:N.gfx.H,buf,nonVide:buf.filter(c=>c!==0).length,cyan:buf.filter(c=>c===cyan||c===cp).length,horsPalette:buf.filter(c=>c>=N.pal.C.length).length};
 };
 for(let i=0;i<240&&e.etat==='portail';i++)step();
 // Après la vraie apparition hors champ : placer le cas au centre du cadre, sans modifier les garde-fous.
 const x=V.x+V.w/2,y=V.y+V.h/2;
 N.joueuse.force({x:x-40,y,ang:0,len:14,trace:true});e.x=x;e.y=y;
 let debut=null,fin=null,arret=0,annoncePixels=null;
 for(let i=0;i<240&&!e._pretSerpent;i++){
   step();const tele=(S.tele||[]).find(t=>t.par.id===e.id);
   if(tele&&debut===null){debut=N.horloge.t();annoncePixels=capture('annonce');}
   if(e._pretSerpent)fin=N.horloge.t();
 }
 const preavis=fin===null||debut===null?null:fin-debut;
 // Refaire une demi-annonce, perdre la visibilité, revenir : aucune reprise au milieu du préavis.
 N.ennemis.inverser(.1);for(let i=0;i<30;i++)step();
 for(let i=0;i<48;i++)step();
 e.x=V.x-60;e.y=V.y-60;for(let i=0;i<3;i++)step();
 const annule=!e._pretSerpent&&!e._annonceSerpent;
 e.x=x;e.y=y;debut=null;fin=null;
 for(let i=0;i<240&&!e._pretSerpent;i++){step();if((S.tele||[]).some(t=>t.par.id===e.id)&&debut===null)debut=N.horloge.t();if(e._pretSerpent)fin=N.horloge.t();}
 const repris=fin===null||debut===null?null:fin-debut;
 // Rendu réel isolé, animation et état actifs ; seule la pose est ramenée dans le cadre pour ne pas tester du vide.
 const captures=[annoncePixels],transitions=[],L=N.pal.C.map(c=>{const v=c.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(v=>v<=.03928?v/12.92:((v+.055)/1.055)**2.4);return .2126*v[0]+.7152*v[1]+.0722*v[2];});let prec=null,maxPixels=0,hors=0,cyan=0;
 for(let f=0;f<720;f++){
   N.game.dbg.simuler(1/60);e.x=x;e.y=y;
   const c=capture('actif');if(f===0)captures.push(c);maxPixels=Math.max(maxPixels,c.nonVide);hors+=c.horsPalette;cyan+=c.cyan;
   let up=0,dn=0,rin=0,rout=0;const b=c.buf;
   if(prec)for(let j=0;j<b.length;j++){const a=prec[j],v=b[j],la=L[a],lv=L[v];if(lv-la>=.1&&Math.min(la,lv)<.8)up++;if(la-lv>=.1&&Math.min(la,lv)<.8)dn++;const ra=a===5||a===11||a===14,rv=v===5||v===11||v===14;if(rv&&!ra)rin++;if(ra&&!rv)rout++;}
   transitions.push({f,up:up/b.length,dn:dn/b.length,rin:rin/b.length,rout:rout/b.length});prec=b;
 }
 N.dir.update=directeur;N.joueuse.update=joueuse;N.arsenal.update=arsenal;
 return {type,naissance,preavis,interruption:{annule,repris},palette:{hors,cyan,maxPixels},captures:captures.filter(Boolean),transitions,journal:N.journal.dump(),err:window.__ERR.count,erreurs:window.__ERR.sigs};
}

export function vagueScenario(type,vague,duree=60,sansSerpents=false) {
 const N=window.__N,S=window.__S;
 N.intro.skip();N.game.reset(7,{depart:'plongee'});N.game.dbg.vague(vague);N.game.dbg.god(true);N.pilote.lancer('tourneur');
 N.ev.verifier(true);N.journal.actif(true);N.journal.vider();N.horloge.avancer();
 const P=N.joueuse.tete,e=N.ennemis.spawn(type,P.x,P.y,{partie:true});
 const transitions=[],L=N.pal.C.map(c=>{const v=c.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(v=>v<=.03928?v/12.92:((v+.055)/1.055)**2.4);return .2126*v[0]+.7152*v[1]+.0722*v[2];});let prec=null,preavis=null,debut=null,nonVide=0,horsPalette=0,maxSerpents=0,maxTotal=0;
 for(let f=0;f<duree*60;f++){
   N.game.dbg.simuler(1/60);
   const tele=(S.tele||[]).find(t=>t.par.id===e.id);if(tele&&debut===null)debut=N.horloge.t();if(e._pretSerpent&&preavis===null&&debut!==null)preavis=N.horloge.t()-debut;
   maxSerpents=Math.max(maxSerpents,N.ennemis.list.filter(e=>['tique','voleur','miroir','brouilleur'].includes(e.type)&&e.etat!=='mort').length);maxTotal=Math.max(maxTotal,N.ennemis.count());
   // Ablation de dessin seulement, rétablie AVANT tout pas de simulation ; les journaux doivent rester identiques.
   const caches=sansSerpents?N.ennemis.list.filter(e=>['tique','voleur','miroir','brouilleur'].includes(e.type)&&!e._dead):[];
   for(const e of caches)e._dead=true;
   N.game.draw();N.fx.draw();N.game.drawTop();for(const e of caches)e._dead=false;const b=N.gfx.buf();let up=0,dn=0,rin=0,rout=0;
   for(let j=0;j<b.length;j++){const v=b[j];if(v)nonVide++;if(v>=N.pal.C.length)horsPalette++;if(!prec)continue;const a=prec[j],la=L[a],lv=L[v];if(lv-la>=.1&&Math.min(la,lv)<.8)up++;if(la-lv>=.1&&Math.min(la,lv)<.8)dn++;const ra=a===5||a===11||a===14,rv=v===5||v===11||v===14;if(rv&&!ra)rin++;if(ra&&!rv)rout++;}
   transitions.push({f,up:up/b.length,dn:dn/b.length,rin:rin/b.length,rout:rout/b.length});prec=new Uint8Array(b);
 }
 return {type,vague,preavis,transitions,nonVide,horsPalette,maxSerpents,maxTotal,journal:N.journal.dump(),serpents:N.serpents.stats,err:window.__ERR.count,erreurs:window.__ERR.sigs,etat:N.game.etat()};
}
