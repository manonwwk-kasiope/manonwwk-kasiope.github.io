// Même instrument pour le vrai tampon VM et pour Playwright ; aucune image synthétique.
export function installer(W) {
  const N=W.__N, S=N.S;
  const cfg=N.R.lisibiliteP10?.mesure || {images:600,dt:1/60,luminanceDelta:0.1,luminanceSombre:0.8};
  const poses=new WeakMap();
  for(let d=0;d<16;d++)for(let a=0;a<N.spr.frames('tete');a++)poses.set(N.spr.get('tete',d,a),{direction:d,animation:a});
  const blit=N.gfx.blit;let tete=null;
  N.gfx.blit=function(s,x,y,opts){if(poses.has(s))tete={...poses.get(s),s,x:Math.round(x-N.gfx.ox()),y:Math.round(y-N.gfx.oy()),ci:opts?.ci};return blit.apply(this,arguments);};
  let precedent=null, scene='', kills=0, fatal=false, initial=null;
  function preparer(nom) {
    scene=nom; kills=0; fatal=false; precedent=null;
    const ok=N.game.dbg.scene(nom==='mort-cyclope'?'boss3':nom);
    N.game.dbg.god(true); N.journal.actif(true); N.journal.vider();
    initial={ok,etat:N.game.etat(),phase:N.colosse.phase(),pv:N.colosse.pv()};
    return initial;
  }
  function stimuler(f) {
    if (scene==='charge' && f%4===0 && kills<N.R.tests.scenes.charge.ennemis) {
      const e=N.ennemis.list.find(e=>!e.boss && e.etat!=='mort');
      if(e){N.ennemis.hit(e,1e6,{genre:'arme',type:'canon',id:0});kills++;}
    }
    if (scene==='mort-cyclope' && !fatal) {
      const e=N.ennemis.list.find(e=>e.boss && N.colosse.estOeil(e.id) && e.etat!=='mort');
      if(e) {N.ennemis.hit(e,1e6,{genre:'arme',type:'canon',id:0});fatal=N.journal.lire('kill').some(r=>r.d.boss);}
    }
  }
  function lire(f) {
    const b=N.gfx.buf(), L=N.pal.L, n=b.length;
    let up=0,dn=0,rin=0,rout=0,lum=0;
    for(let i=0;i<n;i++) {
      const c=b[i];lum+=L[c];if(!precedent)continue;
      const a=precedent[i],lo=Math.min(L[a],L[c]);
      if(L[c]-L[a]>=cfg.luminanceDelta&&lo<cfg.luminanceSombre)up++;
      else if(L[a]-L[c]>=cfg.luminanceDelta&&lo<cfg.luminanceSombre)dn++;
      const ra=a===5||a===11||a===14,rc=c===5||c===11||c===14;
      if(rc&&!ra)rin++;else if(ra&&!rc)rout++;
    }
    if(!precedent)precedent=new Uint8Array(b);else precedent.set(b);
    let teteReelle=null;
    if(tete){
      const {s,x,y,ci,direction,animation}=tete;let attendus=0,poses=0,identiques=0,bord=0,gaine=0;
      for(let yy=0;yy<s.h;yy++)for(let xx=0;xx<s.w;xx++){
        const v=s.data[yy*s.w+xx];if(!v)continue;attendus++;
        const X=x+xx,Y=y+yy;if(X<0||Y<0||X>=N.gfx.W||Y>=N.gfx.H)continue;
        const attendu=ci===undefined?v:ci,actuel=b[Y*N.gfx.W+X];poses++;if(attendu===actuel)identiques++;
        if(v===N.pal.i('nuitProfonde')){bord++;if(actuel===attendu)gaine++;}
      }
      teteReelle={direction,animation,x,y,attendus,poses,identiques,bord,gaine,encre:ci??null,panneau:N.intro.current(),ok:poses>0&&poses===attendus&&poses===identiques&&bord>0&&bord===gaine};tete=null;
    }
    return {f,image:S.frame,t:N.horloge.t(),etat:N.game.etat(),phase:N.colosse.phase(),pv:N.colosse.pv(),luminance:lum/n,up:up/n,dn:dn/n,rin:rin/n,rout:rout/n,tete:teteReelle};
  }
  function bilan() {return {initial, fatal, kills, journal:N.journal.dump(), err:W.__ERR, dimensions:[N.gfx.W,N.gfx.H]};}
  function tetes() {
    const g=N.gfx, cas=[], CY=N.pal.i('cyan'), CP=N.pal.i('cyanPale'), NP=N.pal.i('nuitProfonde');
    // Fond clair : une gaine transparente ou absente échoue ; lecture du tampon après blit réel.
    for(let d=0;d<16;d++)for(let a=0;a<N.spr.frames('tete');a++){
      const s=N.spr.get('tete',d,a), x=20,y=20;
      g.origin(0,0);g.clear(N.pal.i('os'));g.blit(s,x,y);
      const b=g.buf(), w=s.w,h=s.h,ex=new Uint8Array(w*h),q=[];
      for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++)if((!xx||!yy||xx===w-1||yy===h-1)&&!s.data[yy*w+xx]){ex[yy*w+xx]=1;q.push(yy*w+xx);}
      for(let i=0;i<q.length;i++){const j=q[i],xx=j%w,yy=(j/w)|0;for(const [dx,dy]of [[-1,0],[1,0],[0,-1],[0,1]]){const nx=xx+dx,ny=yy+dy,k=ny*w+nx;if(nx>=0&&ny>=0&&nx<w&&ny<h&&!ex[k]&&!s.data[k]){ex[k]=1;q.push(k);}}}
      let bord=0,gaine=0,identiques=0,pixels=0,cyan=0;
      const vus=new Set();
      for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){
        const j=yy*w+xx,v=s.data[j];if(v){pixels++;if(b[(y+yy)*g.W+x+xx]===v)identiques++;}
        if(v!==CY&&v!==CP)continue;cyan++;
        for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
          if(!dx&&!dy)continue;const nx=xx+dx,ny=yy+dy,k=ny*w+nx;
          if(nx<0||ny<0||nx>=w||ny>=h){bord++;continue;}
          // Les trous fermés des yeux sont des détails intérieurs, pas le bord extérieur.
          if(s.data[k]===CY||s.data[k]===CP||(!s.data[k]&&!ex[k])||vus.has(k))continue;
          vus.add(k);bord++;if(b[(y+ny)*g.W+x+nx]===NP)gaine++;
        }
      }
      cas.push({direction:d,animation:a,w,h,cx:s.cx,cy:s.cy,bord,gaine,cyan,pixels,identiques,ok:bord>0&&bord===gaine&&pixels===identiques});
    }
    return {cas,completes:cas.filter(c=>c.ok).length,total:cas.length,err:W.__ERR};
  }
  W.__P10={preparer,stimuler,lire,bilan,tetes,cfg};
}
export function compter(images,aire=0.066,dt=1/60) {
  const dernier={},fl=[];
  for(let k=0;k<images.length;k++)for(const [cle,fam,signe]of [['up','L','+'],['dn','L','-'],['rin','R','+'],['rout','R','-']]){
    if(images[k][cle]<=aire)continue;const opp=fam+(signe==='+'?'-':'+');
    if(dernier[opp]!==undefined){if(fl.at(-1)!==k)fl.push(k);delete dernier[opp];}else dernier[fam+signe]=k;
  }
  let max=0,at=0;for(let i=0,j=0;i<fl.length;i++){while(fl[i]-fl[j]>=Math.round(1/dt))j++;if(i-j+1>max){max=i-j+1;at=fl[i];}}
  return {flashs:fl.length,maxParSeconde:max,image:at,fins:fl};
}
export function analyser(r) {
  const flashes=r.journal.filter(e=>e.type==='flash'),comptes=flashes.filter(e=>e.d._compte);
  const tetes=r.images.map(i=>i.tete).filter(Boolean),horsPanneau=tetes.filter(t=>!t.panneau);
  const tete={dessinees:tetes.length,mesurables:horsPanneau.length,identiques:horsPanneau.filter(t=>t.ok).length,ecarts:horsPanneau.filter(t=>!t.ok)};
  let max=0;for(let i=0,j=0;i<comptes.length;i++){while(comptes[i].d._temps-comptes[j].d._temps>=1)j++;max=Math.max(max,i-j+1);}
  return {...r,tete,pixels:compter(r.images),limiteur:{demandes:flashes.length,comptes:comptes.length,refus:flashes.filter(e=>!e.d.accepte).length,maxParSeconde:max},ok:r.images.length===600&&!r.err.count&&compter(r.images).maxParSeconde<=3&&max<=3&&r.initial.ok&&(r.scene!=='mort-cyclope'||r.fatal)};
}
