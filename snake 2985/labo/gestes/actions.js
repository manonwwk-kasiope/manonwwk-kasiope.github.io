(() => {
  'use strict';
  // A second finger does not generate a compatibility click on every mobile browser.
  function bind(button,activate) {
    let secondary=null, handled=null;
    const finish=()=>{secondary=null;};
    button.addEventListener('pointerdown',e=>{
      handled=null;
      if(e.pointerType==='touch'&&!e.isPrimary&&!secondary)secondary={id:e.pointerId,x:e.clientX,y:e.clientY,canceled:false};
    });
    button.addEventListener('pointermove',e=>{
      if(secondary?.id===e.pointerId && Math.hypot(e.clientX-secondary.x,e.clientY-secondary.y)>14)secondary.canceled=true;
    });
    button.addEventListener('pointercancel',e=>{if(secondary?.id===e.pointerId)finish();});
    button.addEventListener('lostpointercapture',e=>{if(secondary?.id===e.pointerId)finish();});
    button.addEventListener('pointerup',e=>{
      if(secondary?.id!==e.pointerId)return;
      const first=secondary;finish();
      const r=button.getBoundingClientRect();
      const valid=!first.canceled && Math.hypot(e.clientX-first.x,e.clientY-first.y)<=14
        && e.clientX>=r.left-6 && e.clientX<=r.right+6 && e.clientY>=r.top-6 && e.clientY<=r.bottom+6;
      // Suppress the matching native compatibility click even when the gesture was canceled.
      handled={t:e.timeStamp};if(valid&&!button.disabled)activate(e);
    });
    button.addEventListener('click',e=>{
      const duplicate=handled && e.detail>0 && e.timeStamp-handled.t>=0 && e.timeStamp-handled.t<800;
      handled=null;if(!duplicate&&!button.disabled)activate(e);
    });
  }
  const api={bind};
  if(typeof module!=='undefined')module.exports=api;
  if(typeof window!=='undefined')window.SnakeGestes=api;
})();
