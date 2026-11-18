(() => {
  'use strict';
  function capabilities(doc,win){
    const root=doc.documentElement,nav=win.navigator;
    const ios=/iPad|iPhone|iPod/.test(nav.userAgent)||(nav.platform==='MacIntel'&&nav.maxTouchPoints>1);
    const standalone=Boolean(nav.standalone)||win.matchMedia('(display-mode: standalone)').matches;
    const full=!!(doc.fullscreenElement||doc.webkitFullscreenElement);
    const request=doc.fullscreenEnabled&&root.requestFullscreen?()=>root.requestFullscreen():
      doc.webkitFullscreenEnabled&&root.webkitRequestFullscreen?()=>root.webkitRequestFullscreen():null;
    return {ios,standalone,full,request};
  }
  function mount(button,doc=document,win=window){
    let busy=false;
    const update=()=>{
      const c=capabilities(doc,win);
      button.hidden=c.standalone||(!c.ios&&!c.full&&!c.request);
      const label=c.full?'Quitter le plein écran':'Plein écran';
      button.title=label;button.setAttribute('aria-label',label);
    };
    function help(ios){
      if(doc.querySelector('.immersion-aide[open]'))return;
      const dlg=doc.createElement('dialog');dlg.className='snake-archives immersion-aide';
      const head=doc.createElement('header'),h=doc.createElement('h2'),close=doc.createElement('button');
      h.id='titre-immersion';h.textContent='Jouer en plein écran';
      close.type='button';close.textContent='Fermer';close.onclick=()=>dlg.close();
      head.append(h,close);dlg.append(head);dlg.setAttribute('aria-labelledby',h.id);
      if(ios){
        const list=doc.createElement('ol');
        for(const line of ['Dans Safari, touche Partager. Selon la disposition, il se trouve dans le menu de la page.',
          'Choisis « Sur l’écran d’accueil », puis active « Ouvrir comme app web ».','Touche Ajouter et lance SNAKE 2985 depuis son icône.']){
          const item=doc.createElement('li');item.textContent=line;list.append(item);
        }
        dlg.append(list);
      }else{
        const line=doc.createElement('p');line.textContent='Utilise la commande de plein écran du navigateur pour agrandir l’arène.';dlg.append(line);
      }
      dlg.addEventListener('close',()=>{dlg.remove();button.focus();},{once:true});
      doc.body.append(dlg);dlg.showModal();close.focus();
    }
    async function press(){
      if(busy)return;
      const c=capabilities(doc,win);
      busy=true;
      try{
        if(c.full){const exit=doc.exitFullscreen||doc.webkitExitFullscreen;await exit?.call(doc);}
        else if(c.request)await c.request();
        else if(c.ios&&!c.standalone)help(true);
      }catch{help(c.ios);}
      finally{busy=false;update();}
    }
    button.addEventListener('click',press);
    doc.addEventListener('fullscreenchange',update);doc.addEventListener('webkitfullscreenchange',update);
    update();
  }
  const api={mount,capabilities};
  if(typeof window!=='undefined')window.SnakeImmersion=api;
  if(typeof module!=='undefined')module.exports=api;
})();
