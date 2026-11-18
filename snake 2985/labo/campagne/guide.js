// Aide consultée depuis la pause. Les dessins et l'arsenal proviennent de l'époque jouée.
(() => {
  'use strict';
  function node(parent,tag,text) {
    const el=document.createElement(tag);
    if(text!==undefined)el.textContent=text;
    parent.append(el);return el;
  }
  function open(state,era) {
    const focus=document.activeElement;
    const el=node(document.body,'dialog');
    el.className='snake-archives guide';el.setAttribute('aria-labelledby','guide-title');
    const top=node(el,'header');
    const title=node(top,'h2','Pilotage · '+state.year);title.id='guide-title';
    const close=node(top,'button','Fermer');close.type='button';
    close.addEventListener('click',()=>el.close());
    el.addEventListener('close',()=>{el.remove();focus?.focus();},{once:true});
    el.addEventListener('keydown',e=>e.stopPropagation());
    const controls=node(el,'div');controls.className='guide-nav';
    controls.setAttribute('role','group');controls.setAttribute('aria-label','Rubrique');
    const body=node(el,'div');body.className='guide-fiches';
    const tabs=[];
    function card(name,line,role,opts={}){
      const part=node(body,'section');
      if(role){
        const canvas=node(part,'canvas');canvas.width=100;canvas.height=58;
        canvas.setAttribute('aria-hidden','true');
        SnakeSprites.draw(canvas.getContext('2d'),role,state.year,{x:50,y:29,unit:1.5,viewportWidth:500,reduced:true,...opts});
      }
      node(part,'h3',name);node(part,'p',line);
    }
    function select(arsenal){
      tabs.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===Number(arsenal))));
      body.replaceChildren();
      if(arsenal){
        const technique=SnakeEvolution.describe(state.year,state.forge.core,state.forge.mod);
        card(technique.name,technique.gesture);
        card(SnakeForge.name(state.forge.core,state.forge.mod),technique.geometry+' '+technique.route);
        card(SnakeSurcharges.read(state).name,'Prends deux cellules entre deux tirs de nova. À pleine charge, touche Nova pour libérer la surcharge de cette époque.');
        card('Circuit fermé','Encercle un drone avec ton corps. Juste avant de croiser ta queue, change de plan pour décharger la boucle.');
        card(era.bosses[state.difficulty<=5?0:1],state.boss?SnakeGardiens.read(state).hint:'Les gardiens arrivent aux crans 5 et 10. Évite les cases marquées, puis frappe le cœur ouvert sur son plan.','boss',{kind:state.difficulty<=5?'mid':'final'});
      }else{
        card('Prends les cellules','Fais glisser le pouce gauche dans la direction du virage. Deux cellules te font avancer d’un cran.','head');
        card('Change de plan','Touche Plan du pouce droit pour passer au-dessus ou au-dessous des obstacles. Le reste du corps te suit.');
        card('Déclenche la nova','Ta forge tire seule. À pleine charge, touche Nova pour frapper les ennemis autour de la tête, sur ton plan.');
        card('Quitte la grille','Traverse le portail. Garde le pouce sur le manche pour courber ta trajectoire et enfiler les anneaux.');
      }
    }
    for(const [i,label] of ['Commandes','Arsenal de '+state.year].entries()){
      const b=node(controls,'button',label);b.type='button';tabs.push(b);
      b.addEventListener('click',()=>select(Boolean(i)));
    }
    const keys=node(el,'p','Clavier · Flèches pour piloter, X pour le plan, Espace pour la nova, F pour surfer, T pour le turbo et P pour la pause.');
    keys.className='guide-clavier';select(false);el.showModal();close.focus();
  }
  window.SnakeGuide={open};
})();
