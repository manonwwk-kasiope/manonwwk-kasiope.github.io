'use strict';
(() => {
 const tally={media:0,context:0};
 window.silence=tally;
 const deny=type=>{tally[type]++;throw Error('Audio neutralisé');};
 const proto=HTMLMediaElement.prototype;
 Object.defineProperty(proto,'play',{value(){deny('media');},configurable:false,writable:false});
 for(const name of ['muted','volume']){
   const old=Object.getOwnPropertyDescriptor(proto,name);
   if(!old?.set)throw Error('Propriété audio non vérifiable '+name);
   const fixed=name==='muted'?true:0;
   Object.defineProperty(proto,name,{get(){return fixed;},set(){old.set.call(this,fixed);},configurable:false});
 }
 for(const name of ['AudioContext','webkitAudioContext','OfflineAudioContext','webkitOfflineAudioContext','Audio']){
   Object.defineProperty(window,name,{value:function(){deny('context');},writable:false,configurable:false});
 }
 window.silenceReady=true;
})();
