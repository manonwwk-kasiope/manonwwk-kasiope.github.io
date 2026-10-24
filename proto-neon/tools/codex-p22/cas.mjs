// Même fonction sérialisée dans la VM et dans Playwright. Vraies interfaces et vrais pixels.
export function construire({nom, pixels=false, sens=1, flashs}) {
  const N=window.__N,S=window.__S,G=N.gfx;
  localStorage.clear();S.jour=20261017;N.intro.skip();N.game.reset(7,{depart:'plongee'});
  if(N.game.etat()==='demarrage')N.game.dbg.etat('plongee');
  N.game.dbg.scene('calme');if(flashs!==undefined)S.reglages.flashs=flashs;N.pilote.arreter();N.journal.actif(true);N.game.dbg.masque();
  const sons=[],sfx=N.music.sfx,danger=N.music.danger;
  N.music.sfx=function(a,...args){sons.push({nom:a,t:N.horloge.t()});return sfx.call(this,a,...args);};
  if(danger)N.music.danger=function(k){sons.push({nom:'danger',k,t:N.horloge.t()});return danger.call(this,k);};
  const image=()=>{
    G.origin(0,0);G.clear(0);
    if(N.game.etat()==='vol')N.vol.draw();
    else {N.game.draw();N.fx.draw();N.game.drawTop();}
    G.origin(0,0);N.fx.drawEcran();
  };
  const lire=()=>{
    const b=G.buf(),m=G.mask(),parCode={},r={W:G.W,H:G.H,cyan:0,hors:0,horsPalette:0,proprietaires:0};
    for(let i=0;i<b.length;i++){
      if(m[i])r.proprietaires++;
      if(b[i]>=N.pal.C.length)r.horsPalette++;
      if(b[i]===N.pal.i('cyan')||b[i]===N.pal.i('cyanPale')) {
        r.cyan++;parCode[m[i]]=(parCode[m[i]]||0)+1;
        if(!(m[i]>=1&&m[i]<=4))r.hors++;
      }
    }
    r.part=r.hors/b.length;r.parCode=parCode;
    if(pixels){r.buf=Array.from(b);r.masque=Array.from(m);}
    return r;
  };
  const areneImage=()=>{G.origin(0,0);G.clear(0);N.outils.geom();N.outils.origineMonde();N.arene.draw();return Array.from(G.buf());};
  try {
    if(nom==='calme'){image();return {nom,etat:N.game.etat(),seuil:N.R.criteres.R03.cyanHorsMasque,image:lire(),journal:N.journal.dump(),err:window.__ERR};}
    if(nom==='vol' || nom==='fondCyan') {
      image();
      const drawVol=N.decor.drawVol;
      // Mutation volontaire du producteur : démontre que la protection recolore le fond, pas son masque.
      if(nom==='fondCyan')N.decor.drawVol=function(o){drawVol.call(this,o);G.rect(0,0,G.W,G.H,N.pal.i('cyan'));};
      N.vol.start('docks','artere');N.game.dbg.etat('vol');
      const images=[];let dernier=0;
      // Les deux balayages, le milieu du VOL, et une deuxième entrée après que le tampon existe.
      for(const t of [0,0.1,0.4,0.5,1,2,3,3.6,3.9]) {
        N.vol.update(t-dernier);dernier=t;image();images.push({t,...lire()});
      }
      N.vol.start('artere','tours');image();images.push({t:0,secondeEntree:true,...lire()});
      N.decor.drawVol=drawVol;
      return {nom,etat:N.game.etat(),images,pire:Math.max(...images.map(x=>x.part)),seuil:N.R.criteres.R03.cyanHorsMasque,journal:N.journal.dump(),sons,err:window.__ERR};
    }
    N.arene.reset();N.journal.vider();
    if(nom==='convoi' || nom==='sillage') {
      const cfg=N.R.tests.scenes.convoi,y=N.R.arene.convois.voies[cfg.voie];
      N.joueuse.force({x:N.world.W/2,y:y+N.R.arene.convois.hauteurVoie,ang:0});
      N.cam.reset(N.joueuse.tete.x,N.joueuse.tete.y);N.outils.geom();
      const avant=areneImage();const lance=N.arene.convois({voie:cfg.voie,sens:cfg.sens*sens});
      if(nom==='sillage') {
        // Avancer le vrai convoi jusqu'au centre visible, sans faire jouer les autres modules.
        const temps=N.R.arene.convois.annonce + (N.joueuse.tete.x-N.world.x0)/N.R.arene.convois.vitesse;
        for(let t=0;t<temps;t+=N.R.temps.h)N.arene.update(N.R.temps.h);
        areneImage();return {nom,seuil:N.R.criteres.R03.cyanHorsMasque,image:lire(),journal:N.journal.dump(),err:window.__ERR};
      }
      const apres=areneImage();const couleurs=[N.pal.i('magenta'),N.pal.i('rosePale')];
      const visibles=apres.reduce((n,c,i)=>n+(c!==avant[i]&&couleurs.includes(c)),0);
      return {nom,lance,etat:N.arene.etat(),journal:N.journal.dump(),sons,pixelsVisuels:visibles,...(pixels?{buf:apres,W:G.W,H:G.H}:{}),err:window.__ERR};
    }
    if(nom==='travelling') {
      const avant=areneImage();const lance=N.arene.travelling(N.R.arene.travelling.vitesses[3]*sens,sens>0?N.R.tests.scenes.travelling.depuis:N.world.W-N.R.arene.travelling.largeur-N.R.tests.scenes.travelling.depuis);
      const apres=areneImage();
      const rose=N.pal.i('rosePale'),magenta=N.pal.i('magenta');
      // Rose = pointes des chevrons, distinctes des simples lignes magenta des murs.
      const chevrons=apres.reduce((n,c,i)=>n+(c===rose&&c!==avant[i]),0);
      return {nom,lance,etat:N.arene.etat(),journal:N.journal.dump(),sons,pixelsVisuels:chevrons,...(pixels?{buf:apres,W:G.W,H:G.H}:{}),err:window.__ERR};
    }
    if(nom==='battement') {
      const al=N.R.monde.mur.alerte;
      N.joueuse.force({x:N.world.x0+al/4,y:N.world.H/2,ang:Math.PI/2});
      N.scene.reset();
      const images=[],h=N.R.temps.h,hz=N.R.scene.danger.bordsHz;
      // Un cycle entier, sans déplacer la joueuse ni créer une fausse annonce.
      for(let i=0;i<=Math.ceil(1/hz/h);i++) {
        N.horloge.avancer();N.fx.update(h);N.scene.update(h);
        G.origin(0,0);G.clear(0);N.fx.drawEcran();
        const b=Array.from(G.buf()),bord=b.reduce((n,c)=>n+(c!==0),0);
        images.push({t:N.horloge.t(),bord,...(pixels&&i===Math.floor(1/hz/h/4)?{buf:b,W:G.W,H:G.H}:{})});
      }
      const tailles=images.map(x=>x.bord);
      return {nom,images,min:Math.min(...tailles),max:Math.max(...tailles),journal:N.journal.dump(),sons,err:window.__ERR};
    }
    throw new Error('Cas inconnu : '+nom);
  } finally {N.music.sfx=sfx;if(danger)N.music.danger=danger;}
}

export function verdictCas(r) {
  if(r.erreur || r.exception || !r.err || r.err.count || r.erreursConsole?.length)return false;
  const image=a=>a.proprietaires>0 && a.part<r.seuil && a.horsPalette===0;
  if(['vol','fondCyan'].includes(r.nom))return r.images.length>0 && r.images.every(image);
  if(['calme','sillage'].includes(r.nom))return image(r.image);
  const evt=r.nom==='convoi'?'convoiAnnonce':r.nom==='travelling'?'travellingAnnonce':'battement';
  const trace=r.journal.find(x=>x.type==='arene'&&x.d.evt===evt);
  const son=r.sons.find(x=>x.nom===(r.nom==='battement'?'danger':r.nom)&&(r.nom!=='battement'||x.k>0));
  return !!trace && !!son && Math.abs(trace.t-son.t)<=0.1 && (r.nom==='battement'?r.min>0&&r.max>r.min:r.lance&&r.pixelsVisuels>0);
}
