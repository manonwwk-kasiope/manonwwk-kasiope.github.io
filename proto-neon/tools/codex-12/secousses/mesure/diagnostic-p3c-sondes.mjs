/* Investigations additionnelles : sorties rendues, origines des pixels et temps par module.
   Ces sondes sont dans des contextes distincts du benchmark R-20. */
export async function investiguer(banc) {
  const s=await banc.ouvrir('paysage',{dt:1/60,graine:7});
  try {
    const scenes=[];
    for(const nom of ['vol','colosse','v5']){
      const scene=await s.scene(nom);
      if(!scene.ok){scenes.push({nom,scene});continue;}
      await s.eval(()=>window.__N.game.dbg.masque());await s.images(1);
      const tampon=await s.tampon(true),analyse=await s.analyse({gaine:true});
      const etat=await s.eval(()=>({etat:window.__N.game.etat(),intro:window.__N.intro.state(),vol:window.__N.vol.actif(),horloge:window.__N.horloge.etat(),err:window.__ERR.count}));
      const capture=await s.captureTampon('p3c-provenance-'+nom);
      scenes.push({nom,scene,etat,analyse,tampon:{W:tampon.W,H:tampon.H,buf:Buffer.from(tampon.buf).toString('base64'),masque:tampon.masque?Buffer.from(tampon.masque).toString('base64'):null},capture,journal:await s.journal()});
    }
    const charge=await s.scene('charge');
    let couts=null;
    if(charge.ok){
      await s.eval(()=>{
        const N=window.__N,M=window.__MESURE;N.game.dbg.god(true);M.__p3cCouts={};
        // Coûts inclusifs : ne pas additionner les fonctions imbriquées.
        for(const [module,noms] of Object.entries({decor:['drawFar','drawPlateau','drawFront'],crt:['apply'],fx:['draw','drawEcran','update'],game:['update','draw','drawTop'],hud:['draw']}))
          for(const nom of noms){const obj=N[module],fn=obj&&obj[nom];if(typeof fn!=='function')continue;
            const key=module+'.'+nom;M.__p3cCouts[key]=[];
            obj[nom]=function(){const a=performance.now();try{return fn.apply(this,arguments);}finally{M.__p3cCouts[key].push(performance.now()-a);}};
          }
        M.parImage('p3c-horloge','return {f:window.__FRAME,h:N.horloge.etat(),shake:S.shake,etat:M.etat(),fx:N.fx.stats,lum:M.analyseCourante({masque:false}).lumineux};');
      });
      const images=await s.eval(()=>window.__N.R.tests.mesureVM.images);
      await s.images(images);
      couts=await s.eval(()=>({modules:window.__MESURE.__p3cCouts,images:window.__MESURE.arreter('p3c-horloge'),journal:window.__N.journal.dump(),erreurs:window.__ERR.count}));
    }
    await s.fermer(); // aucune page de charge concurrente pendant la trace CPU ×4
    const q=await banc.ouvrir('paysage',{cpu:4,couts:true});
    let tempsX4;
    try {
      const scene=await q.scene('charge');
      if(!scene.ok)tempsX4={scene};
      else {
        await q.eval(()=>{const N=window.__N;N.game.dbg.god(true);window.__S.reglages.ecran='riche';N.crt.preset('riche');N.crt.auto(true);
          window.__MESURE.parImage('p3c-x4','return {f:window.__FRAME,r:performance.now(),h:N.horloge.etat(),etat:M.etat(),shake:S.shake};');});
        // Une même fenêtre de jeu réelle, sans __DT. Gels, ralentis et temps traité restent séparés.
        const images=await q.eval(()=>window.__N.R.criteres.lots.monotonieImages);
        await q.images(images);
        tempsX4={scene,images:await q.eval(()=>window.__MESURE.arreter('p3c-x4')),journal:await q.journal(),erreurs:await q.bilanErreurs()};
      }
    }finally{await q.fermer();}
    return {scenes,charge,couts,tempsX4,limite:'Profilage inclusif avec sondes ; ne remplace pas R-20 sans ces sondes.'};
  }finally{await s.fermer();}
}
