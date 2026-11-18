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
  const portrait = matchMedia('(orientation:portrait) and (any-pointer:coarse)');
  let state = arcade.create();
  let screen = 'prep', clock = null, selected = {core: 'orbit', mod: 'blast'};
  let hints=SnakeLecture.create(), nextHint=0,menuFinal=null;
  let activeFlight = false, pointer = null, held = new Set(), until = 0, target = null;
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
  function menaces(s,dt){SnakeEquilibre.tick(s,dt,SnakeGardiens.tick);}
  const text = (node, value) => { if (node.textContent !== value) node.textContent = value; };
  function button(parent, label, callback, primary = false) {
    const el = document.createElement('button');
    el.type = 'button'; el.textContent = label;
    if (primary) el.className = 'action';
    el.addEventListener('click',callback); parent.append(el); return el;
  }
  function note(label, seconds = 2, danger = false) {
    ui.message.textContent=label; until=state.elapsed+seconds;
    ui.lecture.dataset.tone=danger?'danger':'normal';
  }
  function resetTouch() {
    controls.reset(); pointer=null; held.clear();
    ui.stick.firstElementChild.style.transform='';
  }
  function show(page, title = '', explanation = '') {
    menuFinal?.destroy();menuFinal=null;
    ui.bifurcation.hidden=page!=='end';ui.carte.hidden=page!=='prep';
    ui.rideau.setAttribute('aria-labelledby',page==='end'?'issue-partie':'titre');
    if(page!=='prep')SnakePassage.stop(ui.passage);
    SnakeBanc.stop();screen=page; document.body.dataset.screen=page;
    resetTouch(); ui.rideau.hidden=page==='play';
    ui.bandeau.inert=ui.pouces.inert=page!=='play';
    ui.pouces.hidden=page!=='play';
    if (page!=='play') {
      ui.titre.textContent=title; ui.explication.textContent=explanation;
      ui.rang.textContent=state.year+' · '+arcade.eras[state.eraIndex].name;
      ui.options.replaceChildren(); ui.validations.replaceChildren();
    }
    if(page==='pause'||page==='upgrade')audio.pause();
    if(page==='play')audio.resume();
    clock=null;
  }
  function preparation(epoch=0) {
    audio.stop();
    state=arcade.create(Math.random,epoch);SnakeCarte.visit(state.year);SnakeMatieres.load(state.year); state.director=SnakeDirector.create();state.initiation=SnakeInitiation.create('facultatif',0); archives.newRun(state); hints=SnakeLecture.create();nextHint=0; activeFlight=false;
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
      if(preview)SnakeBanc.select(ui.vitrine,state.year,selected.core,selected.mod,calm.matches);
    };
    choice('core',forge.cores,'Noyau'); choice('mod',forge.mods,'Catalyseur'); update();
    const launch=(sound)=>{
      audio.start(state.year);
      if(sound)void audio.setMuted(false);
      show('play');note('Prends la cellule devant toi.',3.2);
    };
    button(ui.validations,'Jouer en silence',()=>launch(false),true);
    button(ui.validations,'Avec musique',()=>launch(true));
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
    volumeControl('Musique',audio.musicLevel,'music');volumeControl('Bruitages',audio.fxLevel,'fx');
    const motion=document.createElement('label'),check=document.createElement('input');
    check.type='checkbox';check.checked=manualCalm||systemMotion.matches;check.disabled=systemMotion.matches;
    check.addEventListener('change',()=>{manualCalm=check.checked;try{localStorage.setItem('snake2985.calme',manualCalm?'1':'0');}catch{}});
    motion.className='option-calme';motion.append(check,'Réduire les secousses et les glitches');ui.options.append(motion);
  }
  function upgrade() {
    if(SnakeAtelier.available(state)){
      show('upgrade','Atelier satellite','Garde ta recette ou remplace son cœur.');
      SnakeAtelier.mount(ui.options,state,{forge,banc:SnakeBanc,archives,reduced:calm.matches,onDone(receipt){
        selected={core:receipt.core,mod:receipt.mod};upgrade();
      }});
      return;
    }
    show('upgrade','Une arme de plus.','Choisis le système à amplifier.');
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
  function finish() {
    const dead=state.status==='dead', era=state.eraIndex;
    archives.end(state);audio.finish(state.status);
    show('end',dead?'Signal perdu.':'Gardien vaincu.',(dead?(archives.death(state)?.tip||state.cause)+' · ':'')+state.score+' points en '+state.year+'.');
    const records={};
    for(const row of SnakePalmares.list())records[row.year]=Math.max(records[row.year]||0,row.score);
    menuFinal=SnakeBifurcation.mount(ui.bifurcation,{
      year:state.year,status:state.status,score:state.score,records,cause:dead?state.cause:'',
      boss:state.boss?.name||'',...archives.bande(state)
    },{
      onJump:({year,cycle})=>{
        target=cycle?null:state.score;if(!cycle)archives.jump(state);
        const departure=state.year;
        SnakePassage.start(ui.passage,ui.monde,departure,year,calm.matches);
        preparation(arcade.eras.findIndex(e=>e.year===year));
      },
      onRetry:()=>{target=state.score;preparation(era);},
      onReview:archives.openReplay
    });
    const title=menuFinal.root.querySelector('.bf-title');title.id='issue-partie';
    const row=document.createElement('div');row.className='titre-saut';title.replaceWith(row);row.append(title);
    button(row,'Signer · Palmarès',archives.openHall);
    menuFinal.focus();
  }
  function events() {
    SnakeMondeVivant.observe(state);
    const batch=state.events.splice(0);audio.events(batch);
    for(const e of batch){
      SnakeImpact.event(state,e);SnakeMondeVivant.observe(state,e);
      if(e.type==='novaOverload')note(SnakeSurcharges.read(state).name,1.6);
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
    if(state.status==='upgrade')upgrade();
    if(['cleared','won','dead'].includes(state.status))finish();
  }
  function sync() {
    ui.son.setAttribute('aria-pressed',String(!audio.muted));ui.son.setAttribute('aria-label',audio.muted?'Activer le son':'Couper le son');
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
    text(ui.nova.lastElementChild,hot?'Surcharge':Math.floor(state.novaCharge*100)+' %');
    SnakeInstruments.sync(state,screen,calm.matches);
    const pilot=state.flight?'Vol · '+state.flight.passed+'/'+state.flight.goal:forge.name(state.forge.core,state.forge.mod);
    text(ui.partenaire,screen==='play'?(archives.label(state)||(target===null?pilot:pilot+' · À battre '+target)):'');
    if(screen==='play' && state.elapsed>=nextHint){
      nextHint=state.elapsed+.06;
      const cue=SnakeLecture.read(hints,state).primary;
      if(cue && (cue.kind==='danger'||state.elapsed>=until)){
        ui.lecture.dataset.tone=cue.kind==='danger'?'danger':'normal';
        text(ui.message,cue.kind==='target' && state.aide?.text?state.aide.text:cue.text);
      }
    }else if(screen!=='play')text(ui.message,'');
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
    if(screen!=='play')return;
    if(which==='surf'){if(SnakeSurf.action(state))events();return;}
    if(which==='plane'){ const old=state.plane; arcade.shiftPlane(state); if(state.plane!==old)note(state.plane?'Grille haute':'Grille basse',1); }
    if(which==='nova' && arcade.fire(state))note('Nova',.7);
  }
  ui.carte.addEventListener('click',()=>{
    if(screen!=='prep')return;
    SnakeCarte.open({year:state.year,eras:arcade.eras,records:SnakePalmares.list()},({year,record})=>{
      target=record;SnakePassage.start(ui.passage,ui.monde,state.year,year,calm.matches);
      preparation(arcade.eras.findIndex(era=>era.year===year));
    });
  });
  ui.pause.addEventListener('click',pause);
  ui.son.addEventListener('click',()=>{if(screen==='play')void audio.setMuted(!audio.muted);});
  ui.plan.addEventListener('click',()=>action('plane'));
  ui.nova.addEventListener('click',()=>action('nova'));
  ui.surf.addEventListener('click',()=>action('surf'));
  function touch(phase,e){
    if(screen!=='play')return;
    if(phase==='down'){
      if(pointer)return;
      pointer={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY};
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
    if(screen!=='play')return;
    if(e.key==='Escape'||e.code==='KeyP'){e.preventDefault();pause();return}
    if(e.code==='KeyF'){e.preventDefault();if(!e.repeat)action('surf');return;}
    if(e.code==='KeyT'){e.preventDefault();if(!e.repeat){arcade.turbo(state,!state.turbo);note(state.turbo?'Turbo · Points doublés':'Vitesse normale');}return}
    if(e.code==='KeyX'||e.code==='Space'){e.preventDefault();if(!e.repeat)action(e.code==='KeyX'?'plane':'nova');return}
    if(!directions[e.key])return;
    e.preventDefault();held.add(e.key);
    if(!state.flight && !e.repeat)arcade.turn(state,...directions[e.key]);
  });
  document.addEventListener('keyup',e=>held.delete(e.key));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});
  window.addEventListener('blur',()=>{if(screen==='play')pause()});
  portrait.addEventListener('change',()=>{if(portrait.matches)pause()});
  function frame(now) {
    const dt=clock===null?0:Math.min(.08,(now-clock)/1000);clock=now;
    if(screen==='play'){
      if(state.flight && held.size){
        let x=0,y=0; for(const key of held){x+=directions[key][0];y+=directions[key][1];}
        if(x||y)aimOnScreen(Math.atan2(y,x));
      }
      if(['boss','recovery'].includes(state.director.phase))state.spawnClock=Math.max(.15,state.spawnClock);
      SnakeEcologie.tick(state,dt,menaces);
      const encounter=SnakeDirector.tick(state.director,state,dt);
      state.score+=encounter.points;
      for(const cue of encounter.events){
        audio.encounter(cue);
        if(cue.type==='open')note(SnakeIndices.labels[cue.kind]||'Rejoins la balise.',1.8);
        if(cue.type==='score')note('Trajectoire réussie · +'+cue.points);
      }
      audio.scene(state.year,state.difficulty,state.nearBoss,state.boss?.kind);
      state.musicPulse=audio.pulse().pulse;
      SnakeInitiation.update(state.initiation,state,dt,state.events);
      state.aide=SnakeInitiation.cue(state.initiation,state);
      archives.tick(state);events();
    }
    sync();if(screen==='prep'){
      if(calm.matches&&!ui.passage.hidden)SnakePassage.stop(ui.passage);
      else SnakePassage.draw(ui.passage,now);
    }
    if(screen==='prep'||screen==='upgrade')SnakeBanc.frame(now);
    const frameKey=screen==='prep'?screen+'-'+state.year+'-'+SnakeMatieres.ready(state.year):screen;
    if(screen==='play'||ui.monde.dataset.frame!==frameKey){
      SnakeSpectacle.draw(ui.monde,state,state.elapsed,calm.matches);
      ui.monde.dataset.frame=frameKey;
    }
    requestAnimationFrame(frame);
  }
  preparation(arcade.eras.findIndex(era=>era.year===SnakeCarte.resume(SnakePalmares.list())));
  requestAnimationFrame(frame);
})();
