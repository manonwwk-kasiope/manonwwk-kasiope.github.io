/* TÉMOIN J1 seulement ; jamais dans le jeu livré. */
(function(){
 var N=window.__N,seed=2975,spawn=N.ennemis.spawn,mute=N.music.mute;
 function rnd(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
 N.ennemis.spawn=function(type,x,y,opts){
   var o=Object.assign({},opts||{});
   o.portail=(o.portail||0)+rnd()*0.9;
   return spawn.call(this,type,x,y,o);
 };
 /* Porte musicale publique, appliquée même après reset. Effets conservés. */
 N.music.mute=function(a,b){var r=mute.apply(this,arguments);mute.call(this,'musique',true);return r;};
 mute.call(N.music,'musique',true);
 window.__JURY_TEMOIN={musiqueCoupee:true,apparitionsAleatoires:true,graine:2975,retardMax:0.9};
})();