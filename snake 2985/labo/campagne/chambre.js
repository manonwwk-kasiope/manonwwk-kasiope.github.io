(() => {
  'use strict';
  const ui = Object.fromEntries([...document.querySelectorAll('[id]')].map(el => [el.id, el]));
  SnakeSurf.install();
  const knot=SnakeKnot.install(window.SnakeArcade,SnakeEvolution.install(window.SnakeForge),{mode:'exact'});
  const equipped=SnakeSurcharges.install(knot.engine,knot.forge);
  window.SnakeForge=equipped.forge;
  const arcade=equipped.engine,forge=equipped.forge,audio=SnakeCampagneSon,archives=SnakeArchives;
  const systemMotion=matchMedia('(prefers-reduced-motion: reduce)');
  let manualCalm=false;
  try{manualCalm=localStorage.getItem('snake2985.calme')==='1';}catch{}
  const calm={get matches(){return manualCalm||systemMotion.matches;}};
  const portrait=SnakeOrientation.query(window);
  let state = arcade.create();
  const revanche=SnakeRevanche.create();
  let screen = 'prep', selected = {core: 'orbit', mod: 'blast'};
  let tripStorage;
  try{tripStorage=window.sessionStorage;}catch{}
  let voyage=SnakeEpilogue.create(tripStorage,true);
  let hints=SnakeLecture.create(), nextHint=0,menuFinal=null;
  let activeFlight = false, pointer = null, held = new Set(), until = 0, target = null;
  const ticks=SnakeCadence.create(simuler,()=>state.flight?120:60);
  const veille=SnakeVeille.create(frame,()=>{
    if(screen==='play'||(screen==='prep'&&!ui.passage.hidden))return 0;
    if((screen==='prep'||screen==='upgrade')&&banc.animated&&!calm.matches)return 40;
    return null;
  });
  const banc=SnakeVeille.preview(SnakeBanc,veille.wake);
  const directions = {ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
  const controls = LabControls.createInput(action => {
    if (screen !== 'play') return;
    if (action.type === 'turn') arcade.turn(state,action.x,action.y);
    if (action.type === 'aim') aimOnScreen(action.angle);
  });
  function aimOnScreen(angle) {
    const renderer=window.SnakeSpectacle,field=ui.monde;
    const cap=SnakePilotage.cap(renderer.project,renderer.camera(state,state.elapsed,calm.matches),
      state.snake[0],state.plane,angle,field.clientWidth/renderer.width,field.clientHeight/renderer.height);
    SnakeFlight.aim(state,cap.x,cap.y);
  }
  function defense(s,dt){SnakeEquilibre.tick(s,dt,SnakeGardiens.tick);}
  function menaces(s,dt){SnakeSingularite.tick(s,dt,defense);}
  const text = (node, value) => { if (node.textContent !== value) node.textContent = value; };
  function button(parent, label, callback, primary = false) {
    const el = document.createElement('button');
    el.type = 'button'; el.textContent = label;
    if (primary) el.className = 'action';
    el.addEventListener('click',callback); parent.append(el); return el;
  }
  function note(label, seconds = 2, danger = false) {
    ui['compte-contrat'].hidden=true;ui.message.textContent=label; until=state.elapsed+seconds;
    ui.lecture.dataset.tone=danger?'danger':'normal';
  }
  function resetTouch() {
    if(pointer?.owner.hasPointerCapture(pointer.id))pointer.owner.releasePointerCapture(pointer.id);
    controls.reset(); pointer=null; held.clear();
    ui.stick.firstElementChild.style.transform='';
  }
  function show(page, title = '', explanation = '', stamp) {
    menuFinal?.destroy();menuFinal=null;
    ui.bifurcation.hidden=page!=='end';ui['acces-borne'].hidden=page!=='prep';
    ui.rideau.setAttribute('aria-labelledby',page==='end'?'issue-partie':'titre');
    if(page!=='prep')SnakePassage.stop(ui.passage);
    banc.stop();screen=page; document.body.dataset.screen=page;
    resetTouch(); ui.rideau.hidden=page==='play';
    ui.bandeau.inert=ui.pouces.inert=page!=='play';
    ui.pouces.hidden=page!=='play';
    if (page!=='play') {
      ui.titre.textContent=title; ui.explication.textContent=explanation;
      ui.rang.textContent=state.year+' · '+arcade.eras[state.eraIndex].name;
      ui.options.replaceChildren(); ui.validations.replaceChildren();
    }
    if(page==='pause'||page==='upgrade')audio.pause(stamp/1000);
    if(page==='play')audio.resume();
    ticks.reset(page==='play'?performance.now():null);veille.wake();
  }
  function loadHorizon(session){
    SnakeMatieres.load(session.year).then(ready=>{if(ready&&state===session)veille.wake();});
  }
  window.addEventListener('online',()=>{if(!SnakeMatieres.ready(state.year))loadHorizon(state);});
  function preparation(epoch=0,resume=false,retry=false) {
    audio.stop();
    const course=revanche.begin(arcade.eras[epoch].year,{retry});
    state=arcade.create(course.random,epoch);SnakeCarte.visit(state.year);
    loadHorizon(state);
    state.director=SnakeDirector.create();state.initiation=SnakeInitiation.create('facultatif',0); archives.newRun(state,{resume}); hints=SnakeLecture.create();nextHint=0; activeFlight=false;
    controls.configure({mode:'stick',flying:false});
    show('prep','Arme ton serpent.');
    ui.rang.textContent=state.year+' · '+({1976:'2 bits',1985:'4 bits',1995:'8 bits',2185:'16 bits',2985:'32 bits'})[state.year]+' · '+arcade.eras[epoch].name;
    const choice=(key, items, label)=>{
      const row=document.createElement('div'); row.className='groupe'; row.setAttribute('role','group'); row.setAttribute('aria-label',label);
      ui.options.append(row);
      for (const item of items) {
        const choose=()=>{ selected[key]=item.id; for(const b of row.children) b.setAttribute('aria-pressed',String(b.dataset.id===item.id)); update(true); };
        const b=button(row,item.name,choose); b.dataset.id=item.id; b.setAttribute('aria-pressed',String(selected[key]===item.id));
      }
    };
    const update=(preview=false)=>{
      ui.titre.textContent=forge.name(selected.core,selected.mod);
      ui.explication.textContent=forge.cores.find(c=>c.id===selected.core).description+' '+forge.mods.find(m=>m.id===selected.mod).description;
      SnakeForge.equip(state,selected.core,selected.mod);
      if(preview)banc.select(ui.vitrine,state.year,selected.core,selected.mod,calm.matches);
    };
    choice('core',forge.cores,'Noyau'); choice('mod',forge.mods,'Catalyseur'); update();
    const launch=(sound)=>{
      SnakeEpilogue.start(voyage,state);audio.start(state.year);
      if(sound)void audio.setMuted(false);
      show('play');note('Prends la cellule devant toi.',3.2);
    };
    button(ui.validations,'Jouer en silence',()=>launch(false),true);
    if(!audio.muteLocked)button(ui.validations,'Avec musique',()=>launch(true));
    const discover=button(ui.options,'Parcours découverte',()=>{
      if(SnakeInitiation.prepare(state.initiation)){
        discover.setAttribute('aria-pressed','true');discover.textContent='Parcours découverte activé';
      }
    });
    discover.className='apprendre';discover.setAttribute('aria-pressed','false');
    button(ui.validations,'Palmarès',archives.openHall);
    if(archives.offer(state)){
      const wagerButton=button(ui.validations,'Miser de la nova',()=>{
        if(archives.wager(state)){wagerButton.textContent='Mise engagée';wagerButton.disabled=true;}
      });
    }
  }
  function volumeControl(label,value,setting) {
    const line=document.createElement('label'),input=document.createElement('input');
    line.className='mixage'; line.append(label);
    input.type='range'; input.min=0;input.max=100;input.value=Math.round(value*100);
    input.addEventListener('input',()=>audio.setVolumes({[setting]:Number(input.value)/100}));
    line.append(input);ui.options.append(line);
  }
  function pause() {
    if(screen!=='play')return;
    show('pause','Pause.',forge.name(state.forge.core,state.forge.mod));
    button(ui.validations,'Reprendre',()=>{if(!portrait.matches && !document.hidden)show('play')},true);
    const turbo=button(ui.validations,state.turbo?'Turbo actif':'Turbo ×2',()=>{
      arcade.turbo(state,!state.turbo);turbo.textContent=state.turbo?'Turbo actif':'Turbo ×2';
      turbo.setAttribute('aria-pressed',String(state.turbo));
    });
    turbo.setAttribute('aria-pressed',String(state.turbo));
    button(ui.validations,'Palmarès',archives.openHall);
    button(ui.validations,'Pilotage',()=>SnakeGuide.open(state,arcade.eras[state.eraIndex]));
    if(!audio.muteLocked){
      volumeControl('Musique',audio.musicLevel,'music');volumeControl('Bruitages',audio.fxLevel,'fx');
      volumeControl('Stéréo des tirs',audio.spaceLevel,'space');
    }
    const motion=document.createElement('label'),check=document.createElement('input');
    check.type='checkbox';check.checked=manualCalm||systemMotion.matches;check.disabled=systemMotion.matches;
    check.addEventListener('change',()=>{manualCalm=check.checked;banc.motion(calm.matches);veille.wake();try{localStorage.setItem('snake2985.calme',manualCalm?'1':'0');}catch{}});
    motion.className='option-calme';motion.append(check,'Réduire les secousses et les glitches');ui.options.append(motion);
  }
  function upgrade(stamp) {
    if(SnakeAtelier.available(state)){
      show('upgrade','Atelier satellite','Garde ta recette ou remplace son cœur.',stamp);
      SnakeAtelier.mount(ui.options,state,{forge,banc,archives,reduced:calm.matches,onDone(receipt){
        selected={core:receipt.core,mod:receipt.mod};upgrade();
      }});
      return;
    }
    show('upgrade','Une arme de plus.','Choisis le système à amplifier.',stamp);
    const row=document.createElement('div');row.className='ameliorations';ui.options.append(row);
    const gains=['Étend les salves sur les lignes voisines.','Enchaîne les cibles depuis ton corps.','Agrandit l’onde et accélère sa recharge.'];
    arcade.weapons.forEach((w,i)=>{
      const choice=button(row,'',()=>{
        if(arcade.upgrade(state,w.id)){show('play');note(w.description);}
      });
      for(const [tag,value] of [['strong',arcade.eras[state.eraIndex].weapons[i]],['small','Niv. '+(state.levels[w.id]+1)+' · '+gains[i]]]){
        const label=document.createElement(tag);label.textContent=value;choice.append(label);
      }
    });
  }
  function finish(stamp) {
    const dead=state.status==='dead', era=state.eraIndex;
    const entry=archives.end(state),bilan=SnakeEpilogue.finish(voyage,state,entry,SnakePalmares);
    audio.finish(state.status,stamp/1000);
    show('end',dead?'Signal perdu.':'Gardien vaincu.',(dead?(archives.death(state)?.tip||state.cause)+' · ':'')+state.score+' points en '+state.year+'.');
    const depart=({year,cycle})=>{
      target=cycle?null:state.score;
      if(cycle){archives.abandon();voyage=SnakeEpilogue.create(tripStorage);}
      else archives.jump(state,year);
      SnakePassage.start(ui.passage,ui.monde,state.year,year,calm.matches);
      preparation(arcade.eras.findIndex(e=>e.year===year));
    };
    const retry=()=>{archives.abandon();target=state.score;preparation(era,false,true);};
    if(bilan){
      menuFinal=SnakeEpilogue.mount(ui.bifurcation,bilan,{
        onHall:archives.openHall,onRetry:retry,onCycle:()=>depart({year:1976,cycle:true})
      },{reduced:calm.matches});
      menuFinal.focus();return;
    }
    const records={};
    for(const row of SnakePalmares.list())records[row.year]=Math.max(records[row.year]||0,row.score);
    menuFinal=SnakeBifurcation.mount(ui.bifurcation,{
      year:state.year,status:state.status,score:state.score,records,cause:dead?state.cause:'',
      boss:state.boss?.name||(dead?'':arcade.eras[era].bosses[1]),...archives.bande(state)
    },{
      onJump:depart,onRetry:retry,
      onReview:()=>archives.openReplay(()=>calm.matches)
    });
    const title=menuFinal.root.querySelector('.bf-title');title.id='issue-partie';
    const row=document.createElement('div');row.className='titre-saut';title.replaceWith(row);row.append(title);
    button(row,'Signer · Palmarès',archives.openHall);
    menuFinal.focus();
  }
  function events(stamp) {
    SnakeMondeVivant.observe(state);
    const batch=state.events.splice(0);SnakeEpilogue.observe(voyage,state,batch);audio.events(batch,state,stamp/1000);
    for(const e of batch){
      SnakeImpact.event(state,e);SnakeMondeVivant.observe(state,e);
      if(!calm.matches)SnakeCameraMusicale.cue(state,e,state.beat);
      if(e.type==='singularitySplit')note(e.beacons.length?'Relie les deux balises ou esquive la salve.':'Esquive la salve, puis riposte.',2.4,true);
      if(e.type==='singularityBeacon')note('Une balise reliée · Change de plan !',2,true);
      if(e.type==='singularityOpen')note(e.route==='balises'?'Salve désarmée · Frappe le cœur !':'Ouverture · Riposte !',1.8,true);
      if(e.type==='novaOverload')note(SnakeSurcharges.read(state).name,1.6);
      if(e.type==='novaSync'){
        const name=batch.some(event=>event.type==='novaOverload')?SnakeSurcharges.read(state).name:'Nova';
        note(name+' en rythme · +'+Math.round(e.refund*100)+' %',1.6);
      }
      if(e.type==='surfGate')note('Onde du gardien · Rejoins son bord',1.7,true);
      if(e.type==='surfStart')note('Suis la crête · Impulsion sur la salve',2);
      if(e.type==='surfPulse')note('Vise le cœur !',1.2);
      if(e.type==='knotClosed')note('Circuit fermé · Arc de queue',2);
      if(e.type==='ecoAbsorb')note('Deux anneaux sacrifiés · tu survis',2);
      if(e.type==='planeShift')note(state.plane?'Grille haute':'Grille basse',1);
      if(e.type==='flightGate')note('Franchis la porte pour voler.',2.4);
      if(e.type==='flightStart')note('Vol libre · Vise les trois anneaux.',3);
      if(e.type==='flightRing')note('Anneau '+e.passed+' / '+e.goal,1);
      if(e.type==='flightEnd')note(e.success?'Slalom réussi · +'+e.points:'Retour sur grille',2);
      if(e.type==='boss')note('Gardien · Cherche son ouverture.',2.5,true);
      if(e.type==='guardianWarning')note(e.hint,2,true);
      if(e.type==='guardianCounter')note('Cœur ouvert · Riposte !',e.seconds,true);
      if(e.type==='bossAttack')note(state.boss?.attack?.label||'Salve imminente',1.2,true);
    }
    if(state.status==='upgrade')upgrade(stamp);
    if(['cleared','won','dead'].includes(state.status))finish(stamp);
  }
  function syncGuardian(){
    const b=state.boss,approaching=!b&&state.nearBoss>=.70;
    ui.duel.hidden=screen!=='play'||(!b&&!approaching);
    if(ui.duel.hidden)return;
    const names=arcade.eras[state.eraIndex].bosses;
    const target=state.nextBossKind==='final'?10:5;
    const cells=Math.max(1,(target-state.difficulty)*state.sectorGoal-state.sectorCells);
    text(ui['nom-garde'],b?b.name:names[target===10?1:0]);
    const split=b&&SnakeSingularite.read(state);
    const defenseText=split?.phase==='split'?(split.points.length?'Balise '+(split.index+1)+'/2 · ou esquive':'Esquive la salve'):(b?.weak?'Cœur ouvert':'Bouclier actif');
    text(ui['etat-garde'],b?defenseText:'À '+cells+(cells===1?' cellule':' cellules'));
    ui.integrite.hidden=!b;
    if(b){
      const pct=Math.ceil(100*b.hp/b.maxHp),str=String(pct);
      if(ui.integrite.getAttribute('aria-valuenow')!==str){
        ui.integrite.setAttribute('aria-valuenow',str);ui.integrite.firstElementChild.style.width=pct+'%';
      }
      ui.duel.dataset.weak=b.weak?'yes':'no';
    }
  }
  function syncBeat(stamp){
    state.beat=audio.pulseAt(stamp/1000);state.musicPulse=state.beat.pulse;
  }
  function actualiseCommande(){
    if(screen==='play'){
      const now=performance.now();ticks.advance(now);
      if(screen==='play')syncBeat(now);
    }
    return screen==='play';
  }
  function toggleTurbo(){
    if(actualiseCommande()&&arcade.turbo(state,!state.turbo))note(state.turbo?'Turbo · Score doublé':'Vitesse normale',1.2);
  }
  function sync() {
    syncGuardian();text(ui.son,audio.muted?'Muet':'Son');
    const speed=state.turbo?'true':'false';
    if(ui.turbo.getAttribute('aria-pressed')!==speed){
      ui.turbo.setAttribute('aria-pressed',speed);ui.turbo.setAttribute('aria-label',state.turbo?'Désactiver le turbo':'Activer le turbo');
      text(ui.turbo,state.turbo?'Turbo ×2':'Turbo');
    }
    ui.son.disabled=audio.muteLocked;ui.son.setAttribute('aria-pressed',String(!audio.muted));ui.son.setAttribute('aria-label',audio.muteLocked?'Son verrouillé par le lien':audio.muted?'Activer le son':'Couper le son');
    text(ui.date,String(state.year));text(ui.niveau,state.difficulty+' / 10');
    text(ui.points,String(state.score).padStart(6,'0'));
    const surf=SnakeSurf.read(state);ui.surf.hidden=!(surf?.pulse||surf?.accessible);
    if(!ui.surf.hidden)text(ui.surf,surf.pulse?'Impulsion':'Surfer');
    text(ui.plan.lastElementChild,'Plan '+(1+state.plane));
    const overload=SnakeSurcharges.read(state);
    const hot=screen==='play'&&overload.ready;
    if(hot && ui.nova.dataset.charged!=='yes')note(overload.name+' · Nova prête',1.6);
    const marker=hot?'yes':'no';
    if(ui.nova.dataset.charged!==marker){
      ui.nova.dataset.charged=marker;
      ui.nova.setAttribute('aria-description',hot?overload.name:'Déclenche une onde autour de la tête.');
    }
    SnakeSynchroNova.paint(ui.nova,state,screen==='play'?state.beat:null,calm.matches);
    text(ui.nova.lastElementChild,hot?'Surcharge':Math.floor(state.novaCharge*100)+' %');
    SnakeInstruments.sync(state,screen,calm.matches);
    const pilot=state.flight?'Vol · '+state.flight.passed+'/'+state.flight.goal:forge.name(state.forge.core,state.forge.mod);
    text(ui.partenaire,screen==='play'?(archives.label(state)||(target===null?pilot:pilot+' · À battre '+target)):'');
    if(screen==='play' && state.elapsed>=nextHint){
      nextHint=state.elapsed+.06;
      const cue=SnakeLecture.read(hints,state).primary;
      const offer=state.director.offer;
      const timed=offer?.phase==='active'&&cue?.kind==='target'&&state.elapsed>=until&&!state.aide?.text;
      ui['compte-contrat'].hidden=!timed;
      if(timed)text(ui['compte-contrat'],Math.max(1,Math.ceil(state.director.remaining))+' s');
      if(cue && (cue.kind==='danger'||state.elapsed>=until)){
        ui.lecture.dataset.tone=cue.kind==='danger'?'danger':'normal';
        text(ui.message,cue.kind==='target' && state.aide?.text?state.aide.text:cue.text);
      }
    }else if(screen!=='play'){text(ui.message,'');ui['compte-contrat'].hidden=true;}
  }
  function syncFlightControls(){
    if(Boolean(state.flight)!==activeFlight) {
      activeFlight=Boolean(state.flight); controls.configure({flying:activeFlight,angle:state.flight?.angle||0});
      if(pointer){
        const base={id:pointer.id,t:performance.now(),zone:'pilot'};
        controls.route({...base,phase:'down',x:pointer.x,y:pointer.y});
        controls.route({...base,phase:'move',x:pointer.lastX,y:pointer.lastY});
      }else ui.stick.firstElementChild.style.transform='';
    }
  }
  function action(which){
    if(!actualiseCommande())return;
    if(which==='surf'){if(SnakeSurf.action(state))events();return;}
    if(which==='plane'){ const old=state.plane; arcade.shiftPlane(state); if(state.plane!==old)note(state.plane?'Grille haute':'Grille basse',1); }
    if(which==='nova' && SnakeSynchroNova.fire(state,audio.pulse(),arcade.fire))note('Nova',.7);
  }
  ui.carte.addEventListener('click',()=>{
    if(screen!=='prep')return;
    SnakeCarte.open({reduced:()=>calm.matches,year:state.year,eras:arcade.eras,records:SnakePalmares.list()},({year,record})=>{
      archives.abandon();target=record;SnakePassage.start(ui.passage,ui.monde,state.year,year,calm.matches);
      preparation(arcade.eras.findIndex(era=>era.year===year));
    });
  });
  SnakeGestes.bind(ui.turbo,toggleTurbo);
  SnakeGestes.bind(ui.pause,()=>{if(actualiseCommande())pause();});
  SnakeGestes.bind(ui.son,()=>{if(screen==='play')void audio.setMuted(!audio.muted);});
  SnakeGestes.bind(ui.plan,()=>action('plane'));
  SnakeGestes.bind(ui.nova,()=>action('nova'));
  SnakeGestes.bind(ui.surf,()=>action('surf'));
  function touch(phase,e){
    if(!actualiseCommande())return;
    if(phase==='down'){
      if(pointer)return;
      pointer={id:e.pointerId,owner:e.currentTarget,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY};
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    if(!pointer||e.pointerId!==pointer.id)return;
    e.preventDefault();
    pointer.lastX=e.clientX;pointer.lastY=e.clientY;
    controls.route({phase,id:e.pointerId,x:e.clientX,y:e.clientY,t:e.timeStamp,zone:'pilot'});
    const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y,k=Math.min(1,20/(Math.hypot(dx,dy)||1));
    ui.stick.firstElementChild.style.transform='translate('+dx*k+'px,'+dy*k+'px)';
    if(phase==='up'||phase==='cancel'){pointer=null;ui.stick.firstElementChild.style.transform='';}
  }
  for(const el of [ui.stick,ui.monde]) for(const [event,phase] of [['pointerdown','down'],['pointermove','move'],['pointerup','up'],['pointercancel','cancel'],['lostpointercapture','cancel']])el.addEventListener(event,e=>touch(phase,e));
  document.addEventListener('keydown',e=>{
    if(document.querySelector('dialog[open]'))return;
    if(e.key==='Escape'&&screen==='pause'){if(!document.hidden&&!portrait.matches)show('play'); return}
    if(!actualiseCommande())return;
    if(e.key==='Escape'||e.code==='KeyP'){e.preventDefault();pause();return}
    if(e.code==='KeyF'){e.preventDefault();if(!e.repeat)action('surf');return;}
    if(e.code==='KeyT'){e.preventDefault();if(!e.repeat)toggleTurbo();return}
    if(e.code==='KeyX'||e.code==='Space'){e.preventDefault();if(!e.repeat)action(e.code==='KeyX'?'plane':'nova');return}
    if(!directions[e.key])return;
    e.preventDefault();held.add(e.key);
    if(!state.flight && !e.repeat)arcade.turn(state,...directions[e.key]);
  });
  document.addEventListener('keyup',e=>{if(held.has(e.key)){actualiseCommande();held.delete(e.key);}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});
  window.addEventListener('blur',()=>{if(screen==='play')pause()});
  systemMotion.addEventListener('change',()=>{banc.motion(calm.matches);veille.wake();});
  function simuler(dt,stamp){
    syncBeat(stamp);
    if(state.flight && held.size){
      let x=0,y=0; for(const key of held){x+=directions[key][0];y+=directions[key][1];}
      if(x||y)aimOnScreen(Math.atan2(y,x));
    }
    if(['boss','recovery'].includes(state.director.phase))state.spawnClock=Math.max(.15,state.spawnClock);
    SnakeRelance.before(state);
    SnakeEcologie.tick(state,dt,menaces);
    const encounter=SnakeDirector.tick(state.director,state,dt);
    state.score+=encounter.points;SnakeEpilogue.observe(voyage,state,encounter.events);
    for(const cue of encounter.events){
      audio.encounter(cue);
      if(cue.type==='open' && !state.flight)note(SnakeIndices.labels[cue.kind]||'Rejoins la balise.',1.8);
      if(cue.type==='score')note('Trajectoire réussie · +'+cue.points);
    }
    SnakeInitiation.update(state.initiation,state,dt,state.events);
    state.aide=SnakeInitiation.cue(state.initiation,state);
    archives.tick(state);events(stamp);
    syncFlightControls();
    return screen==='play'&&state.status==='playing';
  }
  function frame(now,repaint,resumed){
    if(screen==='play'){
      if(resumed)ticks.reset(now);
      ticks.advance(now);
      if(screen==='play')syncBeat(now);
      if(screen==='play')audio.scene(state.year,state.difficulty,state.nearBoss,state.boss?.kind);
    }
    sync();if(screen==='prep'){
      if(calm.matches&&!ui.passage.hidden)SnakePassage.stop(ui.passage);
      else SnakePassage.draw(ui.passage,now);
    }
    if(screen==='prep'||screen==='upgrade')banc.frame(now);
    const frameKey=screen==='prep'?screen+'-'+state.year+'-'+SnakeMatieres.ready(state.year):screen;
    if(repaint||screen==='play'||ui.monde.dataset.frame!==frameKey){
      SnakeSpectacle.draw(ui.monde,state,state.elapsed,calm.matches);
      ui.monde.dataset.frame=frameKey;
    }
  }
  preparation(arcade.eras.findIndex(era=>era.year===(archives.resumeYear()??SnakeCarte.resume(SnakePalmares.list()))),true);
  SnakeImmersion.mount(ui.immersif);
  SnakeOrientation.mount(ui.vertical,{
    query:portrait,year:()=>state.year,screen:()=>screen,pause,calm:()=>calm.matches,
    primary:()=>ui.validations.querySelector('button.action')||ui.validations.querySelector('button')
  });
  veille.wake();
})();
