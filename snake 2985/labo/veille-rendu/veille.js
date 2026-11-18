(() => {
  'use strict';
  // cadence() returns 0 for the display refresh rate, milliseconds for a preview, or null to sleep.
  function create(render,cadence,host=window) {
    const doc=host.document;
    let raf=null,timer=null,generation=0,dirty=false,drawing=false,closed=false,resumed=true,away=false;
    let covered=!!doc.querySelector('dialog[open]');
    function cancel() {
      generation++;
      if(raf!==null)host.cancelAnimationFrame(raf);
      if(timer!==null)host.clearTimeout(timer);
      raf=timer=null;
    }
    function sleep(){cancel();dirty=true;resumed=true;}
    function nextFrame(){
      if(raf!==null || closed || away || doc.hidden || covered)return;
      const token=generation;
      raf=host.requestAnimationFrame(function frame(now){
        if(token!==generation||closed)return;
        raf=null;
        if(away||doc.hidden||covered){sleep();return;}
        const repaint=dirty, first=resumed;
        dirty=resumed=false;drawing=true;
        try {render(now,repaint,first);} finally {drawing=false;}
        if(closed||away||doc.hidden||covered)return;
        if(dirty){nextFrame();return;}
        const delay=cadence();
        if(delay===0){nextFrame();return;}
        if(!Number.isFinite(delay)||delay<=0)return;
        // Time spent painting counts toward the preview period.
        const wait=Math.max(0,now+delay-host.performance.now());
        timer=host.setTimeout(()=>{
          if(token!==generation || closed)return;
          timer=null;nextFrame();
        },wait);
      });
    }
    function wake(){
      if(closed)return;
      dirty=true;
      if(timer!==null){host.clearTimeout(timer);timer=null;generation++;}
      if(!drawing)nextFrame();
    }
    function visibility(){
      covered=!!doc.querySelector('dialog[open]');
      if(doc.hidden||covered)sleep();
      else wake();
    }
    function dialog(e){if(e.target?.tagName==='DIALOG')visibility();}
    function pagehide(){away=true;sleep();}
    function pageshow(){away=false;resumed=true;visibility();}
    host.addEventListener('resize',wake);
    host.addEventListener('pageshow',pageshow);
    host.addEventListener('pagehide',pagehide);
    doc.addEventListener('visibilitychange',visibility);
    doc.addEventListener('toggle',dialog,true);
    doc.addEventListener('close',dialog,true);
    // Some engines dispatch close but omit toggle when showModal() opens a dialog.
    const observer=host.MutationObserver && new host.MutationObserver(changes=>{
      if(changes.some(change=>change.target.tagName==='DIALOG'))visibility();
    });
    if(observer)observer.observe(doc.documentElement,{subtree:true,attributes:true,attributeFilter:['open']});
    function destroy(){
      observer?.disconnect();
      closed=true;cancel();
      host.removeEventListener('resize',wake);
      host.removeEventListener('pageshow',pageshow);
      host.removeEventListener('pagehide',pagehide);
      doc.removeEventListener('visibilitychange',visibility);
      doc.removeEventListener('toggle',dialog,true);
      doc.removeEventListener('close',dialog,true);
    }
    return {wake,destroy};
  }

  // Both the preparation screen and the satellite workshop use the same bench instance.
  function preview(base,wake) {
    let current=null;
    function select(canvas,year,core,mod,reduced){
      current={canvas,year,core,mod,reduced};
      base.select(canvas,year,core,mod,reduced);wake();
    }
    function motion(reduced){
      if(current && current.reduced!==reduced){
        const {canvas,year,core,mod}=current;select(canvas,year,core,mod,reduced);
      }
    }
    function stop(){base.stop();current=null;wake();}
    return {select,motion,stop,frame:now=>base.frame(now),get animated(){return !!current && !current.reduced;}};
  }
  const api={create,preview};
  if(typeof window!=='undefined')window.SnakeVeille=api;
  if(typeof module!=='undefined')module.exports=api;
})();
