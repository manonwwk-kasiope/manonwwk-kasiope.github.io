// Fixtures de composition uniquement : les défis publics sont placés aux trois stades.
// L'acquisition terminale passe par le vrai bilan de score, depuis le seuil - 1.
export function scenario({N,S,nom,stade,profil}) {
  localStorage.clear();
  const catalogue=N.R.deblocages.map(d=>d.id),seuils=N.R.defis.retour.seuils;
  const terminal=stade==='tout';
  localStorage.setItem('snake2975.v1',JSON.stringify({v:1,profil:{energie:terminal?seuils.at(-1)-1:seuils[1],deblocages:terminal?catalogue.slice(0,-1):catalogue.slice(0,2),defisFaits:[],parties:1,codex:[],gestesVus:[]},records:[],reglages:{musique:false,effets:false}}));
  N.score.profil.charger();S.jour=20261017;N.intro.skip();N.game.reset(1,{depart:'plongee'});
  N.game.dbg.vague(4);N.journal.actif(true);
  if(nom==='fin'||terminal)N.score.terminer(terminal);
  if(nom==='fin')N.game.dbg.etat('fin');
  const r=N.score.resume(),defis=nom==='fin'?r.defis:N.score.defis;
  // Inclure les deux libellés signalés dans la mission, quelle que soit la sélection du jour.
  defis.splice(0,defis.length,
    {id:'finir',nom:'FINIR',but:1,prog:0,fait:false},
    {id:'premierJet',nom:'PREMIER JET',but:25,prog:0,fait:false},
    {id:'sansCoupe',nom:'SANS COUPE',but:2,prog:0,fait:false});
  for(const d of defis){d.prog=stade==='faits'||terminal?d.but:stade==='encours'?Math.max(0,d.but-1):0;d.fait=d.prog===d.but;}
  N.score.defiVague={n:4,id:'composition',def:{broyes:3},but:3,prog:stade==='faits'||terminal?3:stade==='encours'?1:0,fait:stade==='faits'||terminal};
  S.view.safe=profil==='paysage'?{l:24,r:24,t:0,b:10}:profil==='portrait'?{l:0,r:0,t:23,b:17}:{l:0,r:0,t:0,b:0};
  N.outils.geom();N.ui.ouvrir(nom,{victoire:!!r?.victoire});N.ui.update(N.R.ecrans.fin.garde);
  N.gfx.origin(0,0);N.gfx.clear(N.pal.i('vide'));N.ui.draw();N.gfx.present();
  const m=S.ecran.retour,b=N.gfx.buf(),hist=Array(N.pal.C.length).fill(0);let horsPalette=0;
  for(const ci of b){if(ci>=hist.length)horsPalette++;else hist[ci]++;}
  const lignes=m.lignes.map(l=>{
    let pixels=0;for(let y=Math.max(0,l.y);y<Math.min(N.gfx.H,l.y+l.h);y++)for(let x=Math.max(0,l.x);x<Math.min(N.gfx.W,l.x+l.w);x++)if(b[y*N.gfx.W+x]===l.encre)pixels++;
    return {...l,pixels,dansZone:l.x>=m.x&&l.x+l.w<=m.x+m.w&&l.y>=m.y&&l.y+l.h<=m.bas};
  });
  const collisions=[];
  for(let i=0;i<lignes.length;i++)for(let j=i+1;j<lignes.length;j++){
    const a=lignes[i],c=lignes[j];if(a.x<c.x+c.w&&c.x<a.x+a.w&&a.y<c.y+c.h&&c.y<a.y+a.h)collisions.push([a.texte,c.texte]);
  }
  const boutons=m.actions?['continuer','rejouer','bilan'].map(k=>({nom:k,...m.actions[k],wPt:m.actions[k].w*N.gfx.PX,hPt:m.actions[k].h*N.gfx.PX})):[];
  return {nom,stade,profil,fixture:true,etat:N.game.etat(),modele:m,lignes,collisions,boutons,hist,horsPalette,cyan:hist[N.pal.i('cyan')]+hist[N.pal.i('cyanPale')],err:window.__ERR,journal:N.journal.dump(),acquis:N.score.deblocages.slice(),catalogue,prochain:N.score.prochain(),resume:r,tampon:{w:N.gfx.W,h:N.gfx.H,px:N.gfx.PX,data:Array.from(b)}};
}
