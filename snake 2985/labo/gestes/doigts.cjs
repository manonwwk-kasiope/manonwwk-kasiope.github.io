'use strict';
// The Chromium SyntheticPointerActions backend derives per-finger press/release from active IDs.
function doigts(send) {
  const active=new Map();
  async function publish(type) {
    await send('Input.dispatchTouchEvent',{type,touchPoints:[...active.values()].map(p=>({...p}))});
  }
  async function down(id,x,y) {
    if(active.has(id))throw Error('Doigt déjà posé');
    const first=!active.size;
    active.set(id,{id,x,y,radiusX:4,radiusY:4,force:.6});await publish(first?'touchStart':'touchMove');
  }
  async function move(id,x,y) {
    if(!active.has(id))throw Error('Doigt absent');
    Object.assign(active.get(id),{x,y});await publish('touchMove');
  }
  async function up(id) {
    if(!active.delete(id))throw Error('Doigt absent');
    await publish(active.size?'touchMove':'touchEnd');
  }
  async function cancel() {if(!active.size)return;active.clear();await publish('touchCancel');}
  async function tap(id,p){await down(id,p.x,p.y);await up(id);}
  return {down,move,up,cancel,tap};
}
module.exports=doigts;
