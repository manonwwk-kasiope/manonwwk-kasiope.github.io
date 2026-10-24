/* Conducteur de visite, exclusivement entrées publiques. Pas de skip(), pas de
   changement d'état, pas d'écriture d'un personnage, d'un ennemi ou d'un score. */
export function conduireAventure() {
  const N=window.__N,ancien=window.__PILOT,D=[[1,0],[0,1],[-1,0],[0,-1]];
  let commande=0,cle='',corps=[],derniereTete='';
  function route(w,h,tete,dir,cibles,obstacles) {
    const key=(x,y)=>y*w+x,queue=[{x:tete[0],y:tete[1],d:-1}],vis=new Set([key(...tete)]);
    for(let i=0;i<queue.length;i++) {
      const a=queue[i];if(a.d>=0&&cibles.some(c=>c[0]===a.x&&c[1]===a.y))return a.d;
      for(let d=0;d<D.length;d++){
        if(a.d<0&&(d+2)%4===dir)continue;
        const x=a.x+D[d][0],y=a.y+D[d][1],k=key(x,y);
        if(x<0||y<0||x>=w||y>=h||vis.has(k)||obstacles.has(k))continue;
        vis.add(k);queue.push({x,y,d:a.d<0?d:a.d});
      }
    }
    for(const d of [dir,(dir+1)%4,(dir+3)%4]){const x=tete[0]+D[d][0],y=tete[1]+D[d][1];if(x>=0&&y>=0&&x<w&&y<h&&!obstacles.has(key(x,y)))return d;}
    return dir;
  }
  function orienter(I,x,y){const n=Math.hypot(x,y)||1;I.x=x/n;I.y=y/n;I.mag=1;I.fire=true;}
  window.__PILOT=function(...args) {
    if(ancien)ancien(...args);
    if(N.game.etat()!=='aventure')return;
    const I=N.S.input,et=N.aventure.etape();I.boost=false;I.pouvoir=false;I.apogee=false;
    if(et==='1976'&&N.terminal.actif()) {
      const s=N.terminal.state();if(s.phase!=='jeu'||!s.tete)return;
      const sig=s.tete.join(',');
      if(sig!==derniereTete){corps.unshift(s.tete);corps=corps.slice(0,s.len);derniereTete=sig;}
      if(s.journal.at(-1)?.e?.includes('mort'))corps=[];
      const bloque=new Set(corps.slice(1,-1).map(p=>p[1]*s.cols+p[0]));
      commande=route(s.cols,s.rows,s.tete,s.dir,s.food?[s.food]:[],bloque);orienter(I,...D[commande]);
    }else if(et==='1993'&&N.grille.actif()) {
      const s=N.grille.state(),h=s.snake[0];if(!h||s.mort||['titre','sortie','fini'].includes(s.phase))return;
      let cibles=s.balises.filter(b=>!b.allume&&b.f===h[2]).map(b=>[b.x,b.y]);
      if(!cibles.length&&s.phase==='grille'&&s.objectif.faits>=s.objectif.total)cibles=s.asc.filter(a=>a.ouvert).map(a=>[a.x,a.y]);
      if(s.sortie&&h[2]===0)cibles=[[s.sortie.x,s.sortie.y]];
      if(s.phase==='remontee'&&!cibles.length&&s.plongee.pret&&
        (s.balises.some(b=>!b.allume&&b.f!==h[2])||(s.sortie&&h[2]!==0)))I.pouvoir=true;
      const sig=[s.phase,...h,s.objectif.faits,s.n].join('|');
      if(sig!==cle&&!s.file.length){
        const bloque=new Set((s.piliers[h[2]]||[]).map(p=>p[1]*s.C+p[0]));
        for(const p of s.snake.slice(1,-1))if(p[2]===h[2])bloque.add(p[1]*s.C+p[0]);
        for(const e of s.ennemis)if(e.f===h[2])bloque.add(e.y*s.C+e.x);
        for(const m of s.menaces)if(m.f===h[2]&&m.feu)for(const p of m.cases)bloque.add(p[1]*s.C+p[0]);
        commande=route(s.C,s.R,h,s.dir,cibles,bloque);cle=sig;
      }
      orienter(I,...s.dirsEcran[commande]);
    }else if(et==='1982'&&N.arcade.actif()) {
      const s=N.arcade.state(),[x,y]=s.tete,a=s.arene;
      const cible=s.dore||s.food||{x:(a.x0+a.x1)/2,y:(a.y0+a.y1)/2};
      let dx=cible.x-x,dy=cible.y-y;
      const marge=s.vitesse/s.tempo*60;
      if(x<a.x0+marge)dx=Math.abs(dx)+marge;if(x>a.x1-marge)dx=-Math.abs(dx)-marge;
      if(y<a.y0+marge)dy=Math.abs(dy)+marge;if(y>a.y1-marge)dy=-Math.abs(dy)-marge;
      orienter(I,dx,dy);
    }else if(et==='2975'&&N.cosmos.actif()) {
      const s=N.cosmos.state(),b=s.boss,[x,y]=s.tete;
      const cible=b?.parts.filter(p=>!p.mort&&p.actif).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];
      if(cible){let dx=cible.x-x,dy=cible.y-y;if(Math.hypot(dx,dy)<cible.r+s.vitesse) [dx,dy]=[-dy,dx];orienter(I,dx,dy);}
      else orienter(I,Math.cos(s.t),Math.sin(s.t));
    }
  };
}
