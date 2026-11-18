(function(root){
  'use strict';
  const range=0x100000000;
  const advance=word=>(Math.imul(1664525,word)+1013904223)>>>0;
  function stream(seed){
    if(!Number.isInteger(seed)||seed<0||seed>=range)throw new RangeError('Graine uint32 attendue.');
    let next=seed;
    return {peek:()=>next,random(){
      const word=next;next=advance(word);return word/range;
    }};
  }
  function create(entropy=Math.random){
    let active=null;
    function begin(year,{retry=false}={}){
      if(!Number.isInteger(year))throw new RangeError('Année civile attendue.');
      let seed;
      if(!active){
        const sample=entropy();
        if(!Number.isFinite(sample)||sample<0||sample>=1)throw new RangeError('Source aléatoire hors intervalle.');
        seed=Math.floor(sample*range);
      }else if(retry&&active.year===year){
        seed=active.seed;
      }else{
        seed=active.cursor.peek();
        // A menu may change eras without the previous game requesting any random number.
        if(seed===active.seed)seed=advance(seed);
      }
      const cursor=stream(seed);active={year,seed,cursor};
      return {seed,random:cursor.random};
    }
    return {begin};
  }
  const api=Object.freeze({create,random:seed=>stream(seed).random});
  if(typeof module==='object')module.exports=api;
  if(typeof window!=='undefined')root.SnakeRevanche=api;
})(typeof window!=='undefined'?window:globalThis);
