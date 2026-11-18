(function(){
 'use strict';
 const seen=new WeakMap();
 function before(s){
   let m=seen.get(s);
   if(!m){m={grade:0,midAlive:false,recoveryEnd:0,armed:false};seen.set(s,m);}
   if(m.midAlive&&!s.boss)m.recoveryEnd=s.elapsed+4;
   m.midAlive=s.boss?.kind==='mid';
   if(m.grade!==s.difficulty){m.grade=s.difficulty;m.armed=s.difficulty>=7&&s.difficulty<=9;}
   if(!m.armed||s.boss||s.flight||s.status!=='playing'||s.nearBoss>=.84||
      s.elapsed<m.recoveryEnd||['boss','recovery'].includes(s.director.phase)||!s.ecologie)return false;
   m.armed=false;
   if(s.ecologie.wave)return false;
   const due=s.elapsed+(.95-.18*(s.difficulty-7));
   if(s.ecologie.due<=due)return false;
   s.ecologie.due=due;return true;
 }
 window.SnakeRelance={before};
})();
