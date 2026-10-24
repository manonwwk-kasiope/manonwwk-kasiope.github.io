/* TÉMOIN J1 seulement ; jamais dans le jeu livré. */
(function(){
 var N=window.__N,seed=2975,spawn=N.ennemis.spawn,mute=N.music.mute;
 var mode=window.__JURY_TEMOIN_MODE==='synchro'?'synchro':'desync';
 var DOUBLES=["fleche","dard","larve"];
 function rnd(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
 /* délai qui fait tomber l'apparition sur un temps audio : le moteur publie la phase du temps courant */
 function versTemps(d){
   var b=N.music.beat&&N.music.beat(),bpm=N.music.tempo&&N.music.tempo();
   if(!b||!(bpm>0)||!isFinite(b.phase))return d;
   var T=60/bpm,reste=(1-b.phase)*T;
   if(d<=reste)return reste;
   return reste+Math.ceil((d-reste)/T-1e-9)*T;
 }
 N.ennemis.spawn=function(type,x,y,opts){
   var o=Object.assign({},opts||{}),e;
   if(mode==='synchro'){
     o.portail=versTemps(o.portail||0.05);
     return spawn.call(this,type,x,y,o);
   }
   o.portail=(o.portail||0)+rnd()*0.9;
   e=spawn.call(this,type,x,y,o);
   if(!o.ext&&DOUBLES.indexOf(type)>=0&&rnd()<0.6){
     spawn.call(this,type,x+6,y+6,Object.assign({},o,{portail:(opts&&opts.portail||0)+rnd()*0.9}));
   }
   return e;
 };
 if(mode==='desync'){
   /* Porte musicale publique, appliquée même après reset. Effets conservés. */
   N.music.mute=function(a,b){var r=mute.apply(this,arguments);mute.call(this,'musique',true);return r;};
   mute.call(N.music,'musique',true);
 }
 window.__JURY_TEMOIN={mode:mode,musiqueCoupee:mode==='desync',apparitionsAleatoires:mode==='desync',apparitionsCalees:mode==='synchro',poursuivantsDoubles:mode==='desync',graine:2975,retardMax:0.9,doublonProba:0.6};
})();