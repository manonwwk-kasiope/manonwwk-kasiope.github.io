/* Scènes communes VM/navigateur. Modules réels, interfaces publiques seulement.
   Les essais courts isolent l'arsenal (ennemis stationnaires) ; les endurances utilisent tout le jeu. */
(function () {
  const N = window.__N, ids = ['onde','sillage','perforation','surtension','epines'];
  function preparer() {
    N.pilote.arreter(); localStorage.clear(); N.S.jour = 20261017;
    N.game.reset(2975); N.game.dbg.etat('jeu'); N.intro.stop(); N.game.dbg.god(true);
    N.ennemis.reset(); N.journal.actif(true); N.journal.vider(); N.ev.verifier(true); N.ev.nouveauPas();
    N.joueuse.force({ x: 500, y: 250, ang: 0, len: 24, trace: true });
    N.cam.reset(); N.cam.update(1); N.outils.geom(); N.horloge.avancer();
  }
  function prerequis(id) {
    if (id === 'perforation') N.cartes.choisir('canon');
    if (id === 'surtension') N.cartes.choisir('arc');
  }
  function pas(n, avant) {
    for (let i = 0; i < n; i++) {
      N.ev.nouveauPas(); N.horloge.avancer(); N.S.frame++;
      if (avant) avant(i);
      N.arsenal.update(N.R.temps.h); N.fx.update(N.R.temps.h);
    }
  }
  function pv(es) { return es.map(e => ({ id:e.id, pv:e.pv, pvMax:e.pvMax, etat:e.etat, x:e.x, y:e.y })); }
  function scene(id, avec) {
    preparer(); prerequis(id);
    const choix = avec ? N.cartes.choisir(id) : null;
    let es, avant, temps;
    if (id === 'onde') {
      es = [N.ennemis.spawn('ruche',500,270),N.ennemis.spawn('larve',500,258)];
      avant=pv(es); pas(145); temps=145*N.R.temps.h;
    } else if (id === 'sillage') {
      pas(1); const q=N.joueuse.segPos(N.joueuse.len());
      es=[N.ennemis.spawn('ruche',q.x,q.y),N.ennemis.spawn('larve',q.x,q.y)];
      avant=pv(es); pas(120); temps=1;
    } else if (id === 'perforation') {
      N.joueuse.force({x:500,y:250,ang:0,len:8,trace:true});
      es=[N.ennemis.spawn('ruche',530,250),N.ennemis.spawn('ruche',556,250),N.ennemis.spawn('ruche',582,250)];
      avant=pv(es); pas(100); temps=100*N.R.temps.h;
    } else if (id === 'surtension') {
      // Quatrième cible hors de la portée native du dernier rebond, dans celle de SURTENSION.
      es=[N.ennemis.spawn('ruche',500,280),N.ennemis.spawn('ruche',500,330),N.ennemis.spawn('ruche',500,380),N.ennemis.spawn('ruche',500,447)];
      avant=pv(es); pas(61); temps=61*N.R.temps.h;
    } else {
      const q=N.joueuse.segPos(12);
      es=[N.ennemis.spawn('ruche',q.x,q.y),N.ennemis.spawn('larve',q.x,q.y)];
      avant=pv(es); pas(120); temps=1;
    }
    return { id,avec,choix,temps,avant,apres:pv(es),joueuse:N.joueuse.etat,arsenal:N.arsenal.etat(),
      degats:es.map((e,i)=>avant[i].pv-e.pv),journal:N.journal.dump(),err:window.__ERR.count,sigs:window.__ERR.sigs };
  }
  function cartes() {
    preparer(); const sans=N.cartes.vivier(), refus=N.cartes.choisir('perforation');
    N.cartes.choisir('canon'); const apresCanon=N.cartes.vivier();
    N.cartes.choisir('arc'); const apresArc=N.cartes.vivier();
    const offerts={};
    for(let i=0;i<240;i++) for(const id of N.cartes.main(5,{vague:2})) offerts[id]=(offerts[id]||0)+1;
    const textes={};
    for(const id of ids) {
      textes[id]=[];
      while(N.cartes.vivier().includes(id)) { textes[id].push(N.cartes.texte(id)); N.cartes.choisir(id); }
    }
    const textesConformes=Object.values(textes).flat().every(t=>t.nom.length<=N.R.cartes.texte.nomMax && t.l1.length<=N.R.cartes.texte.ligneMax && t.l2.length<=N.R.cartes.texte.ligneMax);
    return {sans,refus,apresCanon,apresArc,offerts,textes,textesConformes,schemaMods:N.ids.valider('mods',N.cartes.mods),err:window.__ERR.count};
  }
  function endurance(id,avec) {
    localStorage.clear(); N.S.jour=20261017;
    if(N.S.reglages) N.S.reglages.actions='doigts'; N.intro.skip(); N.game.reset(2975,{depart:'plongee'});
    if(N.game.etat()==='demarrage') N.game.dbg.etat('plongee');
    prerequis(id); const choix=avec?N.cartes.choisir(id):null;
    N.pilote.lancer('bon'); N.game.dbg.god(true); N.ev.verifier(true); N.journal.actif(true); N.horloge.avancer();
    let simule=0;
    while(N.horloge.t()<60 && N.game.etat()!=='fin' && simule<240 && !window.__ERR.count) {N.game.dbg.simuler(0.25);simule+=0.25;}
    const journal=N.journal.dump();
    return {id,avec,choix,tempsJeu:N.horloge.t(),simule,etat:N.game.etat(),score:N.score.score,
      kills:journal.filter(e=>e.type==='kill').length,arsenal:N.arsenal.etat(),prises:{...N.cartes.prises()},
      err:window.__ERR.count,sigs:window.__ERR.sigs,perdusBus:N.ev.stats().perdus,journal};
  }
  function controle() {
    preparer(); N.cartes.choisir('onde'); N.cartes.choisir('onde');
    const b=N.ennemis.tir(500,270,0,0,{vie:5,src:{genre:'ennemi',type:'tourelle',id:null}});
    pas(145); N.ennemis.update(N.R.temps.h);
    const onde={tirsApres:N.ennemis.tirs.length,cellules:N.butin.list.filter(e=>e.type==='cellule').length,id:b.id};
    preparer(); for(let i=0;i<4;i++) N.cartes.choisir('sillage');
    pas(1); const q=N.joueuse.segPos(N.joueuse.len());
    N.ennemis.tir(q.x,q.y,0,0,{vie:5,src:{genre:'ennemi',type:'tourelle',id:null}});
    pas(1); N.ennemis.update(N.R.temps.h);
    const sillage={tirsApres:N.ennemis.tirs.length};
    preparer(); N.cartes.choisir('epines'); N.game.dbg.input({pouvoir:true}); N.joueuse.update(N.R.temps.h);
    const pos=N.joueuse.segPos(12),e=N.ennemis.spawn('ruche',pos.x,pos.y),pv0=e.pv;
    pas(60); const traversee={pouvoir:{...N.joueuse.pouvoir},degats:pv0-e.pv};
    preparer(); N.game.dbg.god(false); const mur=N.joueuse.tuer('mur',{genre:'decor',type:'mur',id:null});
    return {onde,sillage,traversee,mur:{resultat:mur,etat:N.joueuse.etat},morsure:N.R.mort.morsure.effet,err:window.__ERR.count};
  }
  window.__P1B={ids,preparer,scene,cartes,endurance,controle,pas};
})();
