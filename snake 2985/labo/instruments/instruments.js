/* Une seule entrée depuis la boucle de synchronisation du poste de pilotage.
   Toute animation est portée par CSS : aucune horloge, aucun verrou de saisie. */
(() => {
  'use strict';
  const years=[1976,1985,1995,2185,2985];
  const bound=n=>Number.isFinite(n)?Math.min(1,Math.max(0,n)):0;
  const progress=s=>{
    const d=Math.min(10,Math.max(1,Math.trunc(s.difficulty)||1));
    if(s.status==='cleared'||s.status==='won')return 100;
    const within=s.boss?1-bound(s.boss.hp/Math.max(1,s.boss.maxHp)):
      bound((s.sectorCells||0)/Math.max(1,s.sectorGoal||2));
    return Math.floor(((d-1)+within)*10);
  };
  const mounts=new WeakMap();
  function sync(s,screen,reduced=false,doc=document){
    if(!s)return;
    let m=mounts.get(doc);
    if(!m){
      const post=doc.getElementById('poste'),level=doc.getElementById('niveau'),nova=doc.getElementById('nova');
      if(!post||!level||!nova)return;
      m={post,level,nova};mounts.set(doc,m);
      // Le contrôleur existant écrit le pourcentage dans le premier élément enfant.
      // Le nœud texte précédent conserve une légende visible pour le tir.
      if(nova.firstChild?.nodeType===3)nova.firstChild.nodeValue='Nova ';
      level.setAttribute('role','progressbar');level.setAttribute('aria-label','Progression dans l’époque');
      level.setAttribute('aria-valuemin','0');level.setAttribute('aria-valuemax','100');
    }
    const year=years.includes(s.year)?s.year:1976;
    if(m.year!==year){m.year=year;m.post.dataset.instrument=String(year);}
    if(m.screen!==screen||m.reduced!==reduced){
      if(screen==='play'&&m.screen==='prep'&&!reduced)m.post.dataset.startInstrument='';
      else if(m.post.hasAttribute('data-start-instrument'))m.post.removeAttribute('data-start-instrument');
      m.screen=screen;m.reduced=reduced;
    }
    const phase=progress(s),charge=Math.floor(bound(s.novaCharge)*100);
    if(m.phase!==phase){
      m.phase=phase;m.level.style.setProperty('--avance',phase+'%');
      m.level.setAttribute('aria-valuenow',String(phase));
    }
    const text='Secteur '+(Math.min(10,Math.max(1,Math.trunc(s.difficulty)||1)))+' sur 10, '+phase+' %';
    if(m.phaseText!==text){m.phaseText=text;m.level.setAttribute('aria-valuetext',text);}
    if(m.charge!==charge){
      m.charge=charge;m.nova.style.setProperty('--charge',charge+'%');
      m.nova.setAttribute('aria-label',charge===100?'Nova prête':'Nova en charge, '+charge+' %');
      m.nova.dataset.ready=charge===100?'oui':'non';
    }
  }
  const api=Object.freeze({sync});
  if(typeof window!=='undefined')window.SnakeInstruments=api;
  if(typeof module!=='undefined')module.exports=api;
})();
