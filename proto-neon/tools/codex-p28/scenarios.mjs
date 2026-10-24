// Sondes de test sur interfaces publiques, sans toucher au code du moteur.
export function installerTrace() {
 const N=window.__N,O=N.outils;window.__P28=[];
 const draw=N.ui.draw;N.ui.draw=function(){window.__P28=[];return draw.apply(this,arguments);};
 function garder(t,x,y,c,o,sc){window.__P28.push({texte:String(t),x:Math.round(x),y:Math.round(y),encre:c,contour:!!o,echelle:sc||1,w:O.textW(String(t),sc||1),h:7*(sc||1)});}
 const text=O.text,centre=O.textC;
 O.text=function(t,x,y,c,o,sc){garder(t,x,y,c,o,sc);return text.apply(this,arguments);};
 O.textC=function(t,x,y,c,o,sc){garder(t,x-O.textW(String(t),sc||1)/2,y,c,o,sc);return centre.apply(this,arguments);};
}
export function observerFin() {
 const N=window.__N,S=window.__S,g=N.gfx,b=g.buf(),sf=S.safe||N.outils.geo.safe,r=N.score.resume();
 const lignes=(window.__P28||[]).concat((S.ecran?.retour?.lignes||[]).filter(l=>l.phrase)).map(l=>{
  let pixels=0,attendus=0;const s=N.spr.text(l.texte,{ci:l.encre,echelle:l.echelle,contour:l.contour,ombre:false}),m=l.contour?l.echelle:0,top=s.top===undefined?3*l.echelle+m:s.top;
  for(let yy=0;yy<s.h;yy++)for(let xx=0;xx<s.w;xx++)if(s.data[yy*s.w+xx]===l.encre){attendus++;const x=l.x-m+xx,y=l.y-top+yy;if(x>=0&&x<g.W&&y>=0&&y<g.H&&b[y*g.W+x]===l.encre)pixels++;}
  return {...l,pixels,attendus,intact:pixels===attendus&&pixels>0,dansZone:l.x>=Math.ceil(sf.l)&&l.x+l.w<=g.W-Math.ceil(sf.r)&&l.y>=Math.ceil(sf.t)&&l.y+l.h<=g.H-Math.ceil(sf.b)};
 });
 const collisions=[];for(let i=0;i<lignes.length;i++)for(let j=i+1;j<lignes.length;j++){const a=lignes[i],c=lignes[j];if(a.x<c.x+c.w&&c.x<a.x+a.w&&a.y<c.y+c.h&&c.y<a.y+a.h)collisions.push([a.texte,c.texte]);}
 const texte=lignes.map(l=>l.texte).join(' '),a=N.ui.finActions();
 const obligatoires={cause:!r.cause||texte.includes(N.ids.texte(r.cause,r.auteur)),quartier:!r.quartier||texte.includes(N.ids.noms[r.quartier]),progression:/SECTEUR \d+ %/.test(texte),score:/SCORE/.test(texte),record:/RECORD/.test(texte),ecart:r.ecart===null||/ÉCART/.test(texte),build:!r.build||texte.includes(r.build.nom),note:/NOTE [SABCD]/.test(texte),conseil:!r.conseil||texte.includes(r.conseil),defis:/DÉFIS DU JOUR/.test(texte),energie:/ÉNERGIE/.test(texte),prochain:/RALENTI|REPLI|STYLES|GALERIE|DÉPART V3|TOUT DÉBLOQUÉ/.test(texte),continuer:/CONTINUER \?/.test(texte)};
 const compteurs=lignes.filter(l=>/^\d+\/\d+$/.test(l.texte)).map(l=>l.x+l.w);
 const boutons=['continuer','rejouer','bilan'].filter(n=>a[n]).map(n=>({nom:n,...a[n],wPt:a[n].w*g.PX,hPt:a[n].h*g.PX}));
 const horsPalette=Array.from(b).filter(v=>v>=N.pal.C.length).length;
 return {etat:N.game.etat(),lignes,collisions,obligatoires,compteursAlignes:compteurs.every(x=>x===compteurs[0]),boutons,err:window.__ERR,journal:N.journal.dump(),w:g.W,h:g.H,px:g.PX,horsPalette,ok:Object.values(obligatoires).every(Boolean)&&!collisions.length&&lignes.every(l=>l.intact&&l.dansZone&&l.echelle>=2)&&boutons.every(b=>b.wPt>=44&&b.hPt>=44)&&!window.__ERR.count&&!horsPalette};
}
