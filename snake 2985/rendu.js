/* SNAKE 2985. Le dessin utilise des cases de 20 unités, quelle que soit la dalle. */
(() => {
  'use strict';
  const CASE = 20;
  const COLONNES = 36;
  const LIGNES = 18;
  const LARGEUR = COLONNES * CASE;
  const HAUTEUR = LIGNES * CASE;
  const TOUR = Math.PI * 2;
  const fonds = new WeakMap();
  const victoires = new WeakMap();
  const borne = (x, min = 0, max = 1) => Math.min(max, Math.max(min, x));
  const entre = (a, b, t) => a + (b - a) * t;
  const centre = valeur => (valeur + 0.5) * CASE;

  function trace(c, points, encre, largeur = 1, fond = null) {
    c.beginPath();
    for (let i = 0; i < points.length; i++) {
      const [x, y] = points[i];
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    if (fond) { c.closePath(); c.fillStyle = fond; c.fill(); }
    if (encre) { c.lineWidth = largeur; c.strokeStyle = encre; c.stroke(); }
  }

  function ellipse(c, x, y, rx, ry, fond, trait, largeur = 1) {
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, TOUR);
    if (fond) { c.fillStyle = fond; c.fill(); }
    if (trait) { c.lineWidth = largeur; c.strokeStyle = trait; c.stroke(); }
  }

  function hasard(seed) {
    let n = seed;
    return () => { n = (Math.imul(1664525, n) + 1013904223) >>> 0; return n / 4294967296; };
  }

  function paysage(c, secteur) {
    const alea = hasard(2985);
    const cycle = (Math.max(1, secteur) - 1) % 3;
    const horizons = ['#692044','#702257','#3b315e'];
    const crepuscules = [
      ['#ffdd9d','#ffac69','#fe667d','#ce3e8d'],
      ['#ffd6ba','#ff8b98','#f552a8','#a740a9'],
      ['#d9f2dd','#edafcb','#ba71c3','#7845a9']
    ];
    const nuit = c.createLinearGradient(0, 0, 0, HAUTEUR);
    nuit.addColorStop(0, '#100b2b');
    nuit.addColorStop(.18, '#2e1447');
    nuit.addColorStop(.31, horizons[cycle]);
    nuit.addColorStop(.43, '#180e30');
    nuit.addColorStop(1, '#090b20');
    c.fillStyle = nuit; c.fillRect(0, 0, LARGEUR, HAUTEUR);
    for (let i = 0; i < 90; i++) {
      const x = alea() * LARGEUR, y = alea() * 135, r = alea();
      c.fillStyle = r > .84 ? '#9ca9ce' : '#675788';
      c.fillRect(x, y, r > .84 ? 1.4 : .85, r > .84 ? 1.4 : .85);
    }
    const sx = 480, sy = 76, rayon = 64;
    const halo = c.createRadialGradient(sx, sy, 4, sx, sy, rayon * 2.3);
    halo.addColorStop(0, '#db684170'); halo.addColorStop(.5, '#cd404b31'); halo.addColorStop(1, '#ca375400');
    c.fillStyle = halo; c.fillRect(sx - 150, 0, 300, 235);
    c.save(); c.beginPath(); c.arc(sx, sy, rayon, 0, TOUR); c.clip();
    const soleil = c.createLinearGradient(0, sy - rayon, 0, sy + rayon);
    const tons = crepuscules[cycle];
    soleil.addColorStop(0, tons[0]); soleil.addColorStop(.34, tons[1]);
    soleil.addColorStop(.7, tons[2]); soleil.addColorStop(1, tons[3]);
    c.fillStyle = soleil; c.fillRect(sx - rayon, sy - rayon, rayon * 2, 50);
    let ligne = sy - rayon + 52;
    while (ligne < sy + rayon) {
      const distance = ligne - sy + rayon - 52;
      c.fillRect(sx - rayon, ligne, rayon * 2, 6 - distance * .045);
      ligne += 7 + distance * .035;
    }
    c.restore();

    function chaine(points, base, bord, teinte) {
      trace(c, [...points, [LARGEUR + 1, 186], [-1, 186]], null, 0, base);
      trace(c, points, bord, 1);
      for (let i = 1; i < points.length - 1; i++) {
        const [x, y] = points[i];
        if (y < points[i - 1][1] && y < points[i + 1][1]) {
          const ox = x + 10 + alea() * 13;
          trace(c, [[x, y], [ox - 4, y + 6], [ox - 7, y + 13], [ox + 8, y + 27]], teinte, 1);
        }
      }
    }
    chaine([[-2,122],[36,106],[53,110],[99,83],[114,86],[131,71],[151,88],[168,96],[185,91],[207,107],[238,100],[267,108],[305,90],[339,106],[369,85],[391,82],[411,65],[439,89],[465,82],[482,90],[516,74],[538,83],[565,62],[592,88],[638,71],[681,102],[700,93],[722,101]], '#54264e','#a45a72','#7d4865');
    chaine([[-2,107],[21,92],[43,101],[67,89],[84,105],[112,111],[141,129],[171,115],[197,126],[221,121],[263,135],[286,127],[317,136],[351,114],[378,123],[403,109],[437,118],[465,102],[482,105],[514,97],[531,109],[553,100],[572,106],[592,96],[615,119],[663,101],[701,114],[722,108]], '#34203e','#875073','#674362');
    const horizon = 167;
    for (let x = -3; x <= LARGEUR; ) {
      const w = 5 + Math.floor(alea() * 13);
      const h = 5 + alea() * 30 + ((x % 83 < 17) ? 17 : 0);
      const y = horizon - h;
      c.fillStyle = '#17142d'; c.fillRect(x, y + 4, w, h);
      c.fillRect(x + 2, y, w - 4, 7);
      c.fillStyle = '#70445f'; c.fillRect(x + 2, y, Math.max(1, w - 5), .9);
      for (let j = 0; j < h / 6; j++) {
        if (alea() < .42) continue;
        c.fillStyle = alea() > .47 ? '#9d5970' : '#3d576b';
        c.fillRect(x + 2, y + j * 6 + 3, 1 + Math.floor(alea() * (w * .45)), 1);
      }
      x += w + Math.floor(alea() * 3);
    }
    // Les deux tours de contrôle encadrent l'autoroute plutôt que la tête du serpent.
    for(const [x,toit,h] of [[78,32,84],[116,20,66],[616,29,91],[656,21,72]]){
      const y=horizon-h;
      trace(c,[[x-3,horizon],[x-3,y+9],[x+4,y+9],[x+4,y],[x+toit-3,y],[x+toit-3,y+5],[x+toit,y+5],[x+toit,horizon]], '#643953',.85,'#211b38');
      trace(c,[[x+4,y+1],[x+toit-4,y+1],[x+toit-4,y+8]],'#bc668c',1.1);
      for(let row=y+13;row<horizon-2;row+=6)trace(c,[[x+3,row],[x+toit-4,row]],row%3?'#62446f':'#675a77',.8);
      if(h>80)trace(c,[[x+toit*.6,y],[x+toit*.6,y-17]],'#af788a',1);
    }
    const sol = c.createLinearGradient(0, horizon, 0, HAUTEUR);
    sol.addColorStop(0, '#382139'); sol.addColorStop(.22, '#1a112e'); sol.addColorStop(.68, '#101026'); sol.addColorStop(1, '#15102c');
    c.fillStyle = sol; c.fillRect(0, horizon, LARGEUR, HAUTEUR - horizon);
    for (let i = -12; i <= 12; i++) {
      trace(c, [[344, horizon], [344 + i * 103, HAUTEUR]], '#4b2955', .8);
    }
    for (let i = 0; i < 18; i++) {
      const y = horizon + Math.pow(i / 17, 2.55) * (HAUTEUR - horizon);
      trace(c, [[0, y], [LARGEUR, y]], '#382442', .8);
    }
    /* Lignes du viaduc lointain. Le quadrillage du jeu reste orthogonal. */
    for (const sens of [-1, 1]) {
      const x = n => 342 + sens * n;
      trace(c, [[x(5),horizon],[x(22),horizon+10],[x(38),horizon+24],[x(154),horizon+98],[x(387),horizon+184]], '#663458', 1.5);
      trace(c, [[x(17),horizon],[x(37),horizon+10],[x(58),horizon+22],[x(173),horizon+84],[x(387),horizon+157]], '#513653', 1);
    }
    const voile = c.createLinearGradient(0, 0, 0, HAUTEUR);
    voile.addColorStop(0, '#060d1b30'); voile.addColorStop(.33, '#080a1c45'); voile.addColorStop(.55, '#080a1c16'); voile.addColorStop(1, '#080a1c08');
    c.fillStyle = voile; c.fillRect(0, 0, LARGEUR, HAUTEUR);
  }

  function ciel(c, couleurs, centreHalo, rayonHalo) {
    const degrade = c.createRadialGradient(...centreHalo, 0, ...centreHalo, rayonHalo);
    degrade.addColorStop(0,couleurs[0]); degrade.addColorStop(.48,couleurs[1]); degrade.addColorStop(1,couleurs[2]);
    c.fillStyle = degrade; c.fillRect(0,0,LARGEUR,HAUTEUR);
  }
  function etoiles(c, seed, nombre, limite) {
    const alea = hasard(seed);
    for (let i=0;i<nombre;i++) {
      const x=alea()*LARGEUR,y=alea()*limite,r=alea();
      c.fillStyle = r>.93?'#ccc4d9':'#777c9a'; c.fillRect(x,y,r>.93?1.6:.85,r>.93?1.6:.85);
      if(r>.98) { c.globalAlpha=.45; c.fillRect(x-2,y+.5,5,.6); c.fillRect(x+.5,y-2,.6,5); c.globalAlpha=1; }
    }
  }

  function terminal(c) {
    ciel(c,['#193e36','#102b2b','#08171c'],[418,98],560);
    const vert = '#39725e';
    /* Disque en lignes et relief en fil de fer d'un terminal vectoriel. */
    for(let j=-54;j<=54;j+=5) {
      const dx=Math.sqrt(55*55-j*j);
      trace(c,[[489-dx,70+j],[489+dx,70+j]],j<-8?'#74ad76':'#547b60',j<-8?1.8:1.3);
    }
    const pics=[[0,132],[34,113],[58,124],[93,92],[131,118],[162,101],[200,135],[236,106],[265,124],[308,99],[339,113],[375,86],[414,118],[451,104],[480,120],[508,99],[538,115],[568,86],[592,103],[615,94],[666,118],[692,105],[720,126]];
    trace(c,[...pics,[LARGEUR,170],[0,170]],null,0,'#12312d');
    for(let i=0;i<5;i++){
      const ligne=pics.map(([x,y])=>[x,entre(y,170,i/5)]);
      trace(c,ligne,vert,i===0?1.5:.6);
    }
    for(const [x,y] of pics)trace(c,[[x,y],[entre(x,352,.05),170]],vert,.7);
    for(let i=-8;i<=8;i++) trace(c,[[352+i*8,170],[352+i*105,HAUTEUR]],'#24463e',.75);
    for(let i=0;i<12;i++){const y=172+(i*i)*3.3;trace(c,[[0,y],[LARGEUR,y]],'#29483f',.65)}
    // Deux antennes paraboliques filaires sur les flancs du terminal.
    for(const [x,y,taille] of [[63,132,1],[646,135,.74]]){
      c.save();c.translate(x,y);c.scale(taille,taille);
      c.rotate(-.54);
      c.beginPath();c.ellipse(0,-13,30,10,0,0,TOUR);c.strokeStyle='#5b8e73';c.lineWidth=1.2;c.stroke();
      trace(c,[[-30,-13],[-17,0],[2,7],[18,0],[30,-13]],'#49785e',1);
      trace(c,[[-20,-11],[0,-23],[19,-12]],'#65896d',1);c.restore();
      trace(c,[[x,y+2],[x-7,y+18],[x+7,y+18],[x,y+2]],'#5d8069',1);
    }
    for(let y=2;y<HAUTEUR;y+=4){c.fillStyle='#09161940';c.fillRect(0,y,LARGEUR,.6)}
  }

  function orbite(c) {
    ciel(c,['#29526a','#12283e','#0b0d24'],[176,143],585);
    etoiles(c,2185,150,HAUTEUR);
    const x=159,y=665,r=525;
    c.save();
    c.beginPath();c.arc(x,y,r,0,TOUR);c.clip();
    const mer=c.createLinearGradient(0,148,0,HAUTEUR);
    mer.addColorStop(0,'#72a6ae');mer.addColorStop(.06,'#346172');mer.addColorStop(.38,'#13394b');mer.addColorStop(1,'#101b30');
    c.fillStyle=mer;c.fillRect(0,124,LARGEUR,HAUTEUR);
    const alea=hasard(2185);
    for(let i=0;i<64;i++){
      const cx=alea()*(LARGEUR+40)-20,cy=140+alea()*270;
      const w=10+alea()*38;
      trace(c,[[cx-w,cy],[cx,cy-2-alea()*7],[cx+w,cy-alea()*4]],'#93b4bb20',1+alea()*2);
    }
    c.restore();
    c.beginPath();c.arc(x,y,r,-Math.PI,0);c.strokeStyle='#bdefe7';c.lineWidth=1.9;c.stroke();
    c.save();c.translate(484,73);c.rotate(-.31);
    for(const d of [-1,1]){
      trace(c,[[0,0],[d*63,0]],'#858a9f',1.7);
      for(let j=0;j<2;j++){
        const xx=d*(19+j*23);
        c.fillStyle='#263453';c.strokeStyle='#6e81aa';c.lineWidth=1;
        c.fillRect(xx-9,-13,18,26);c.strokeRect(xx-9,-13,18,26);
        for(let k=-6;k<=6;k+=6)trace(c,[[xx+k,-12],[xx+k,12]],'#637aa0',.6);
        trace(c,[[xx-8,0],[xx+8,0]],'#637aa0',.6);
      }
    }
    trace(c,[[-7,-9],[7,-9],[10,4],[4,12],[-7,10]],'#aab0bf',1.2,'#4d6279');c.restore();
  }

  function cosmos(c) {
    ciel(c,['#673354','#302347','#090f23'],[482,103],510);
    etoiles(c,2985,240,HAUTEUR);
    const cx=487,cy=101;
    c.save();c.translate(cx,cy);c.rotate(-.27);
    for(let i=13;i>=0;i--){
      ellipse(c,0,0,88+i*4.4,11+i*.7,null,i%3?'#bb839a45':'#d49e855c',1+i*.07);
    }
    c.restore();
    const halo=c.createRadialGradient(cx,cy,31,cx,cy,59);
    halo.addColorStop(0,'#fad99e');halo.addColorStop(.08,'#d99188');halo.addColorStop(.26,'#bc73916b');halo.addColorStop(1,'#5c326b00');
    c.fillStyle=halo;c.fillRect(cx-61,cy-61,122,122);
    ellipse(c,cx,cy,31.5,31.5,'#17152e','#e4ae95',1.7);
    c.save();c.translate(cx,cy);c.rotate(-.27);
    c.beginPath();c.ellipse(0,0,87,12,0,0,Math.PI);c.lineWidth=3;c.strokeStyle='#e0a68c';c.stroke();
    c.restore();
    ellipse(c,101,161,26,26,'#493653','#98667e',1.3);
    const poussiere=hasard(583);
    for(let i=0;i<160;i++){
      const u=poussiere(), x=35+u*655,y=250-u*154+Math.sin(u*11)*28+(poussiere()-.5)*35;
      ellipse(c,x,y,poussiere()*1.5+.35,.65,'#9c779657');
    }
    for(const [x,y,k] of [[175,84,1],[212,89,.76],[157,96,.66]]){
      c.save();c.translate(x,y);c.scale(k,k);
      trace(c,[[-17,1],[1,-4],[15,-2],[20,0],[4,4],[-10,4]],'#78667e',.75,'#3e354e');
      trace(c,[[-6,1],[6,-1],[12,0]],'#ba92a1',.8);c.restore();
    }
  }

  function quadrillage(c,ere) {
    for (let x = CASE; x < LARGEUR; x += CASE)
      trace(c, [[x,0],[x,HAUTEUR]], ere===1976?'#a6d8b515':'#a59bdc13', .7);
    for (let y = CASE; y < HAUTEUR; y += CASE)
      trace(c, [[0,y],[LARGEUR,y]], ere===1976?'#b4dfb516':'#c6b7ef15', .7);
    c.fillStyle=ere===1976?'#bfdcba45':'#b9aec545';
    for (let y = CASE; y < HAUTEUR; y += CASE) {
      for (let x = CASE; x < LARGEUR; x += CASE) c.fillRect(x - .65, y - .65, 1.3, 1.3);
    }
    c.strokeStyle = ere===1976?'#77c49b82':'#df83be73'; c.lineWidth = 1.5;
    c.strokeRect(1, 1, LARGEUR - 2, HAUTEUR - 2);
    for (let x = 0; x < LARGEUR; x += CASE * 4) {
      c.fillStyle = ere===1976?'#91c09f':'#c95d89'; c.fillRect(x, 0, 7, 1.7); c.fillRect(x, HAUTEUR - 2, 7, 1.7);
    }
  }

  function papier(canvas, c, secteur, ere) {
    let cache = fonds.get(canvas);
    if (!cache || cache.ere !== ere || cache.secteur !== secteur || cache.width !== canvas.width || cache.height !== canvas.height) {
      const image = document.createElement('canvas'); image.width = canvas.width; image.height = canvas.height;
      const fond = image.getContext('2d'); fond.setTransform(image.width / LARGEUR, 0, 0, image.height / HAUTEUR, 0, 0);
      ({1976:terminal,1985:paysage,2185:orbite,2985:cosmos})[ere](fond, secteur);
      quadrillage(fond,ere);
      cache = { image, secteur, ere, width: image.width, height: image.height }; fonds.set(canvas, cache);
    }
    c.drawImage(cache.image, 0, 0, LARGEUR, HAUTEUR);
    return cache.image;
  }

  function mouvementDecor(c, ere, t, puissance) {
    if (ere===1976) {
      const x=(t*29)%93+22;
      c.fillStyle='#76ac88'; c.fillRect(x,48,5,1.5);
      trace(c,[[x-4,50],[x,48],[x+3,45]],'#486f5e',.8);
    } else if (ere===1985) {
      for(let i=0;i<3;i++){
        const x=(t*13+i*163)%750-15;
        const y=148+i%2*5;
        trace(c,[[x-5,y],[x,y]],i%2?'#91b2c0':'#dc9ca5',1.1+puissance*.35);
      }
    } else if(ere===2185) {
      const a=t*.047+.3,x=150+110*Math.cos(a),y=99+31*Math.sin(a);
      trace(c,[[x-5,y],[x+5,y]],'#9ab6c9',1.4);
      ellipse(c,x,y,2.5,2.5,'#99b3bf');
    } else {
      const a=t*.14+.7;
      c.save();c.translate(487,101);c.rotate(-.27);
      c.beginPath();c.ellipse(0,0,109,16,0,a,a+.24);c.lineWidth=1.75;c.strokeStyle='#c8a3ae';c.stroke();c.restore();
    }
  }

  // Les secousses et le dédoublement n'affectent que cette tranche du décor.
  function chocMusical(c, cache, ere, phase, danger, t) {
    if (phase>.13) return;
    const choc=(1-phase/.13)*(.18+.82*danger);
    const reflets={1976:61,1985:115,2185:162,2985:119}, y=reflets[ere];
    const x=(ere===1976?448:ere===2185?154:449)+Math.sin(Math.floor(t*1.7)*.84)*20;
    const largeur=54+47*danger, hauteur=1.6+3.2*danger, decalage=choc*2.6;
    const fx=cache.width/LARGEUR, fy=cache.height/HAUTEUR;
    // La surface de jeu garde ses coordonnées. Seul un plan de fond tremble sous le coup.
    c.save();
    if(danger>.25){
      const gauche=24, haut=Math.max(12,y-33), largeurPlan=LARGEUR-48;
      c.globalAlpha=choc*.72;
      c.drawImage(cache,gauche*fx,haut*fy,largeurPlan*fx,66*fy,gauche+decalage,haut-decalage*.55,largeurPlan,66);
    }
    c.globalAlpha=.65*choc;
    c.drawImage(cache,x*fx,y*fy,largeur*fx,hauteur*fy,x+decalage,y+.45*decalage,largeur,hauteur);
    c.globalAlpha=.38*choc;
    c.fillStyle='#e961c2';c.fillRect(x+decalage,y+hauteur,largeur*.59,1.2);
    c.fillStyle='#7af6f6';c.fillRect(x-decalage+6,y+hauteur+1.7,largeur*.48,1);
    c.restore();
  }

  function cellule(c, pt, t, battement, ere) {
    const x = centre(pt.x), y = centre(pt.y), phase = .5 + .5 * Math.sin(t * 3 + pt.x);
    c.save(); c.translate(x, y);
    if(ere===1976) {
      c.fillStyle='#173829'; c.strokeStyle='#eecc78';c.lineWidth=1.5;
      c.fillRect(-7,-7,14,14);c.strokeRect(-7,-7,14,14);
      c.fillStyle='#f8dea1';c.fillRect(-3,-3,6,6);c.restore();return;
    }
    ellipse(c, 0, 1, 10, 10, '#502c24', '#ffa34195', .7);
    const r = 8 + battement;
    trace(c, [[0,-r],[r,0],[0,r],[-r,0]], '#372037', 2.4, '#ffb146');
    trace(c, [[0,-r+1.5],[4.6,0],[0,6.2],[-4.6,0]], null, 0, '#fff3ac');
    trace(c, [[0,-5],[2.8,0],[0,3.8],[-2.8,0]], null, 0, '#ff7f40');
    c.globalAlpha = .44 + phase * .4;
    trace(c, [[-12,-1],[-15,0],[-12,1]], '#ffd680', .8);
    trace(c, [[12,-1],[15,0],[12,1]], '#ffd680', .8);
    c.restore();
  }

  function ennemi(c, drone, t, ere) {
    const x = centre(drone.x), y = centre(drone.y);
    const arrive = drone.warmup > 0;
    c.save();
    if (arrive) {
      const r = 10 + Math.min(8, drone.warmup * 5);
      c.strokeStyle = '#f978bd'; c.lineWidth = 1.4; c.setLineDash([4, 3]);
      c.strokeRect(x - r, y - r, r*2, r*2); c.setLineDash([]);
    } else if (drone.next && (drone.next.x !== drone.x || drone.next.y !== drone.y)) {
      const px = centre(drone.next.x), py = centre(drone.next.y);
      c.strokeStyle = '#ff6192aa'; c.lineWidth = 1.2; c.setLineDash([2, 3]);
      c.strokeRect(px-8,py-8,16,16); c.setLineDash([]);
      const a = Math.atan2(py-y,px-x);
      c.save(); c.translate(px,py); c.rotate(a);
      trace(c,[[-2,-3],[1,0],[-2,3]],'#fbb0c9',1.2); c.restore();
    }
    c.translate(x, y);
    if (arrive) c.globalAlpha = .53;
    const souffle = Math.sin(t*3 + drone.id) * 1.2;
    if (ere===1976) {
      const sprite=['1000001','0111110','1101011','1111111','0011100','0100010'];
      c.fillStyle='#ed9d83';
      for(let j=0;j<sprite.length;j++){
        for(let i=0;i<sprite[j].length;i++)if(sprite[j][i]==='1')c.fillRect((i-3.5)*2.1,(j-3)*2.1,2.1,2.1);
      }
      c.restore();return;
    }
    trace(c, [[-9,-6],[-3,-4],[0,-7],[3,-4],[9,-6],[7,3],[3,7],[-3,7],[-7,3]], '#260d29', 2.6, '#c94778');
    trace(c, [[-9,-7],[-4,-4],[-6,1],[-10,3+souffle]], '#ff81bb',1,'#923d73');
    trace(c, [[9,-7],[4,-4],[6,1],[10,3+souffle]], '#ff81bb',1,'#923d73');
    trace(c, [[-5,-1],[0,-3],[5,-1],[2,2],[-2,2]], null,0,'#32112f');
    trace(c, [[-4,-1],[0,0],[4,-1]], '#fff1cc',1.5);
    trace(c, [[-2,4],[0,6],[2,4]], '#ff9c90',1.1);
    c.restore();
  }

  function serpent(c, state, t, mouvementReduit, ere) {
    if (!state.snake.length) return;
    const fraction = mouvementReduit ? 1 : borne(state.progress ?? 1);
    const points = state.snake.map((pt,i) => {
      const avant = state.previousSnake?.[i] ?? pt;
      return [centre(entre(avant.x,pt.x,fraction)),centre(entre(avant.y,pt.y,fraction))];
    });
    const mort = state.status === 'dead';
    const couleurs={1976:['#d3ffd2','#8cd799'],1985:['#bdfff0','#49e8d6'],2185:['#cdf4ed','#80ceca'],2985:['#eddbff','#a7abf1']};
    const clair = mort ? '#c7cccf' : couleurs[ere][0], vif = mort ? '#658b94' : couleurs[ere][1];
    const encre = '#102738';
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    if(ere===1976){
      trace(c,points,'#397653',5);
      for(let j=points.length-1;j>=0;j--){
        const [x,y]=points[j],r=j===0?7:j===points.length-1?4.5:6;
        c.fillStyle='#18352e';c.strokeStyle=j===0?clair:vif;c.lineWidth=j===0?2:1.6;
        c.fillRect(x-r,y-r,2*r,2*r);c.strokeRect(x-r,y-r,2*r,2*r);
        c.fillStyle=j===0?clair:'#71ad82';
        if(j===0){
          c.save();c.translate(x,y);c.rotate(Math.atan2(state.direction.y,state.direction.x));
          c.fillRect(1,-4,4,2);c.fillRect(1,2,4,2);
          if(state.turbo){c.fillStyle='#ffcb71';c.fillRect(-17,-5,10,2);c.fillRect(-17,3,10,2)}
          c.restore();
        } else c.fillRect(x-1.5,y-1.5,3,3);
      }
      c.restore();return;
    }
    trace(c, points, '#071322', 13); trace(c, points, '#126977', 8);
    for (let i = points.length - 1; i >= 1; --i) {
      const [x,y] = points[i], autre = points[i-1];
      c.save(); c.translate(x,y); c.rotate(Math.atan2(autre[1]-y,autre[0]-x));
      const queue = i === points.length-1, largeur = queue ? 4.1 : 6.3;
      trace(c, [[8,0],[5,-largeur],[-4,-largeur*.88],[-(queue?14:9),0],[-4,largeur*.88],[5,largeur]], encre,1.5, vif);
      trace(c, [[6,-1],[1,-largeur+1],[-5,-largeur+1.8],[-1,-.4]], null,0,clair);
      trace(c, [[0,1],[-5,largeur-1],[3,largeur-1],[7,1.4]], null,0,'#258997');
      if (i % 3 === 1)
        trace(c, [[2,0],[-4,-1.8],[-7,0],[-4,1.8]], null,0,'#ff9d8f');
      if (ere===2185 && i%3===1) {
        for(const s of [-1,1])trace(c,[[2,s*4],[-5,s*8],[-8,s*7],[-4,s*4]],'#5a8091',1,'#c8c1a2');
      } else if(ere===2985 && i%2===0) {
        ellipse(c,-1,0,2.3,3.6,'#796aa1','#f5dcf9',1);
      }
      if (i % 4 === 2 && state.levels?.arc > 0) {
        trace(c, [[1,-4],[-3,-8],[-6,-6],[-4,-3]], encre,1,'#bb94ff');
        trace(c, [[1,4],[-3,8],[-6,6],[-4,3]], encre,1,'#bb94ff');
      }
      c.restore();
    }
    const [hx,hy] = points[0];
    c.translate(hx,hy); c.rotate(Math.atan2(state.direction.y,state.direction.x));
    if (state.turbo && !mort) {
      const longueur = mouvementReduit ? 21 : 23 + 3.5 * Math.sin(t * 20);
      for (const s of [-1,1]) {
        trace(c,[[-4,s*5],[-12,s*11],[-longueur-4,s*13],[-longueur+3,s*8],[-10,s*5]],null,0,'#f8833c83');
        trace(c,[[-5,s*5],[-12,s*8.8],[-longueur,s*10],[-13,s*6]],null,0,'#ffbe57');
        trace(c,[[-6,s*5.5],[-16,s*8]],'#fff2ad',1.4);
      }
    }
    const aileron = 9.6 + (mouvementReduit ? 0 : .5 * Math.sin(t*6));
    trace(c, [[5,-4],[-3,-aileron],[-11,-aileron-1],[-8,-4],[-8,4],[-11,aileron+1],[-3,aileron],[5,4]], encre,1.6,'#1f9da6');
    if (state.levels?.rail > 1) {
      for (const s of [-1,1]) {
        trace(c, [[8,s*6],[4,s*8],[-6,s*8]],encre,3.5);
        trace(c, [[8,s*6],[4,s*8],[-6,s*8]],'#ffb293',1.6);
      }
    }
    trace(c, [[12,0],[7,-5],[0,-7],[-7,-6],[-10,-2],[-10,2],[-7,6],[0,7],[7,5]], encre,2,clair);
    trace(c, [[11,0],[2,-2],[-6,-4],[-8,-1],[-4,1],[4,2]], null,0,vif);
    for (const s of [-1,1]) {
      trace(c, [[7,s*1.8],[2,s*4.6],[-1,s*4]], '#123f50',1.8);
      trace(c, [[6,s*2.1],[3,s*3.7]], '#fff4a6',1.2);
    }
    c.restore();
  }

  function tir(c, shot, ere) {
    const pct = borne(shot.life / Math.max(.001,shot.maxLife));
    const sx=centre(shot.x), sy=centre(shot.y), ex=centre(shot.toX), ey=centre(shot.toY);
    c.save(); c.globalAlpha = .24 + .76*pct;
    let pts = [[sx,sy],[ex,ey]];
    if (shot.kind === 'arc') {
      const dx=ex-sx,dy=ey-sy,dist=Math.max(1,Math.hypot(dx,dy));
      const n=Math.max(3,Math.ceil(dist/10));
      pts = [];
      for(let i=0;i<=n;i++){
        const f=i/n, k=i===0||i===n?0:Math.sin(i*17.3+shot.toX*.9)*Math.min(4,dist*.08);
        pts.push([sx+dx*f-dy/dist*k,sy+dy*f+dx/dist*k]);
      }
    }
    const arc=shot.kind==='arc';
    if(ere===1976){
      c.setLineDash([4,4]);trace(c,pts,arc?'#d2bfee':'#f2df89',2);c.restore();return;
    }
    if(!arc && (ere===2185 || ere===2985)){
      const dx=ex-sx,dy=ey-sy,dist=Math.max(1,Math.hypot(dx,dy)),nx=-dy/dist,ny=dx/dist;
      for(const d of [-1,1]){
        const brin=[];
        for(let i=0;i<=16;i++){
          const a=i/16,ecart=(ere===2985?5:3)*Math.sin(a*Math.PI)*Math.sin(a*Math.PI*(ere===2985?7:3));
          brin.push([sx+dx*a+nx*d*ecart,sy+dy*a+ny*d*ecart]);
        }
        trace(c,brin,ere===2985?'#c497ef':'#a2e7e2',1.3);
      }
    }
    trace(c,pts,arc?'#6b4ad998':'#ee76594d',arc?6:8);
    trace(c,pts,arc?'#b59dff':'#ff9d73',arc?2.3:3.2);
    trace(c,pts,arc?'#eef1ff':'#ffedb9',1);
    c.restore();
  }

  function faisceauBoss(c, attaque) {
    if (!attaque?.tiles?.length) return;
    const actif = attaque.phase === 'active';
    const progression = borne(1 - attaque.remaining / Math.max(.01, attaque.total));
    const cases = new Set(attaque.tiles.map(({x,y}) => x + COLONNES*y));
    function incluse(x,y) { return x>=0 && x<COLONNES && y>=0 && y<LIGNES && cases.has(x+COLONNES*y); }
    c.save();
    c.fillStyle = actif ? '#ed39776b' : '#b12c523e';
    for (const {x,y} of attaque.tiles) c.fillRect(x*CASE,y*CASE,CASE,CASE);
    c.beginPath();
    for (const {x,y} of attaque.tiles) {
      const px=x*CASE,py=y*CASE;
      c.moveTo(px+1,py+8);c.lineTo(px+8,py+1);
      c.moveTo(px+1,py+18);c.lineTo(px+18,py+1);
      c.moveTo(px+11,py+18);c.lineTo(px+18,py+11);
    }
    c.lineWidth=actif?1.8:.9+progression*.5;c.strokeStyle=actif?'#ffb29e':'#e47795b3';c.stroke();
    c.beginPath();
    for(const {x,y} of attaque.tiles) {
      const l=x*CASE+.7,r=(x+1)*CASE-.7,t=y*CASE+.7,b=(y+1)*CASE-.7;
      if(!incluse(x,y-1)){c.moveTo(l,t);c.lineTo(r,t)}
      if(!incluse(x,y+1)){c.moveTo(l,b);c.lineTo(r,b)}
      if(!incluse(x-1,y)){c.moveTo(l,t);c.lineTo(l,b)}
      if(!incluse(x+1,y)){c.moveTo(r,t);c.lineTo(r,b)}
    }
    c.setLineDash(actif?[]:[4,3]);
    c.strokeStyle=actif?'#ffe1c5':'#ff91a2';c.lineWidth=actif?2:1.35;c.stroke();
    c.restore();
  }

  function faille(c, rift, t, reduit) {
    const x=centre(rift.x),y=centre(rift.y), reste=borne(rift.remaining/Math.max(.001,rift.total));
    c.save();c.translate(x,y);
    const couleur=reste<.25?'#ffceb0':'#affff4';
    c.rotate(reduit?-.25:-.25+t*.78);
    ellipse(c,0,0,10,10,'#12233c',couleur,1.3);
    for(let j=0;j<3;j++){
      c.save();c.rotate(j*TOUR/3);
      c.beginPath();c.ellipse(0,0,11,5,0,.2,4.8);
      c.strokeStyle=j===1?'#f6b3f5':couleur;c.lineWidth=1.6;c.stroke();c.restore();
    }
    ellipse(c,0,0,2.8,2.8,'#fff1c6');
    c.restore();
  }

  function passage(c, state, ere, reduit) {
    const maintenant = performance.now() / 1000;
    if(!victoires.has(state)) victoires.set(state,maintenant);
    const progression = reduit ? 1 : borne((maintenant-victoires.get(state))/1.8);
    const origine = state.effects.find(fx=>fx.kind==='bossDefeated') ?? state.snake[0];
    if(!origine)return;
    const x=centre(origine.x), y=centre(origine.y);
    const teinte=({1976:'#cbefb5',1985:'#ffadca',2185:'#a0e8df',2985:'#d4b4ff'})[ere];
    c.save();c.translate(x,y);c.rotate(-.25);c.globalAlpha=.86-.5*progression;
    for(let i=0;i<3;i++){
      const k=borne((progression-i*.12)*1.25);
      const rx=9+35*k+i*4,ry=6+19*k+i*2;
      ellipse(c,0,0,rx,ry,null,teinte,1.2+(1-k)*1.3);
    }
    c.restore();
  }

  function gardien(c,b,ere,t,battement) {
    const x=centre(b.x),y=centre(b.y), final=b.kind==='final';
    const couleur=final?'#f67bac':'#eea17d', lumiere=b.weak?'#fff2a6':'#ffc3a8';
    c.save();c.translate(x,y);
    const profondeur=borne((b.plane??0)/2);
    ellipse(c,0,13+profondeur*7,22+profondeur*5,6+profondeur*2,'#070d2273');
    if(profondeur>0){
      for(const d of [-1,1]){
        trace(c,[[d*16,15],[d*20,24+profondeur*5],[d*23,22]],'#c87e9c65',1);
      }
    }
    // Cette emprise correspond aux neuf cases létales, y compris les coins de la coque.
    c.fillStyle='#5e224665';c.fillRect(-29,-29,58,58);
    c.setLineDash([3,3]);c.strokeStyle='#d67d927e';c.lineWidth=.75;c.strokeRect(-29,-29,58,58);c.setLineDash([]);
    if(b.next && (b.next.x!==b.x || b.next.y!==b.y)){
      const dx=Math.sign(b.next.x-b.x),dy=Math.sign(b.next.y-b.y);
      c.save(); c.rotate(Math.atan2(dy,dx));trace(c,[[31,-4],[35,0],[31,4]],'#eeac99',1.1);c.restore();
    }
    const battant=Math.sin(t*2.6)*1.8, mecanique='#381b3c';
    if(ere===1976){
      const cadre=final?24:20;
      c.fillStyle='#152d2b';c.fillRect(-cadre,-21,cadre*2,42);
      c.strokeStyle='#9ac6a0';c.lineWidth=2;c.strokeRect(-cadre,-21,cadre*2,42);
      for(const sens of [-1,1]){
        for(let j=-15;j<=15;j+=7)trace(c,[[sens*(cadre+1),j],[sens*29,j]],'#d3a286',2);
      }
      if(final){
        c.fillStyle='#396055';c.fillRect(-17,-15,34,18);c.strokeStyle='#81ad8c';c.strokeRect(-17,-15,34,18);
        trace(c,[[-13,-6],[-7,-6],[-4,-10],[0,-3],[4,-9],[8,-6],[13,-6]],lumiere,1.6);
        for(let j=0;j<3;j++)trace(c,[[-15,7+j*4],[15,7+j*4]],'#8b9c77',1.2);
      }else{
        for(let j=0;j<3;j++){c.fillStyle='#a5b687';c.fillRect(-14,-12+j*9,20,4);c.fillStyle=j===1?lumiere:'#e6a17e';c.fillRect(10,-12+j*9,4,4)}
      }
    }else if(ere===1985 && !final){
      for(const d of [-1,1]){
        trace(c,[[d*25,-20],[d*12,-20],[d*12,5],[d*7,11],[0,12],[0,25],[d*16,21],[d*25,9]],'#2c1531',2,'#b25178');
        trace(c,[[d*25,-20],[d*12,-20],[d*12,-9],[d*25,-9]],'#ffcbb1',1,'#f4a390');
      }
      ellipse(c,0,3,7,7,'#51294c',couleur,1.5);ellipse(c,0,3,2+battement,2+battement,lumiere);
    }else if(ere===1985 && final){
      for(const d of [-1,1]) {
        trace(c,[[d*6,-13],[d*18,-23],[d*27,-19],[d*23,-4],[d*28,11+battant],[d*18,22],[d*9,13]],'#371831',2,'#99446b');
        trace(c,[[d*23,-17],[d*16,-11],[d*19,-3]],couleur,2);
      }
      trace(c,[[-22,1],[-11,-9],[0,-13],[12,-9],[22,1],[11,10],[0,12],[-12,8]],couleur,2,'#402341');
      ellipse(c,0,0,6+battement,7,'#ffda99');ellipse(c,0,0,2.5,6,'#5c2753');
    }else if(ere===2185){
      c.save();c.rotate(final?-.4:.25);
      if(!final){
        for(const d of [-1,1]){
          c.fillStyle='#654a69';c.strokeStyle='#b687a4';c.fillRect(d*18-9,-12,18,24);c.strokeRect(d*18-9,-12,18,24);
          for(let j=-6;j<9;j+=6)trace(c,[[d*18-8,j],[d*18+8,j]],'#cda8ad',.9);
        }
        ellipse(c,0,0,12,13,'#7e5c7f','#eab8bb',2);ellipse(c,0,0,5+battement,6,lumiere);
      }else{
        ellipse(c,0,0,20,20,'#302842','#f5b096',2);
        c.beginPath();c.arc(0,0,18,-1.2,1.48);c.strokeStyle='#ffd8a3';c.lineWidth=5;c.stroke();
        ellipse(c,0,0,27,8,null,'#be88a4',2);
      }
      c.restore();
    }else{
      if(final){
        for(let j=0;j<3;j++){
          c.save();c.rotate(t*.38+j*Math.PI/3);ellipse(c,0,0,27,10,null,j===1?'#be88e0':'#fab2bd',1.5);c.restore();
        }
        ellipse(c,0,0,13,13,'#241735','#f3c7c9',2.4);
        c.beginPath();c.arc(0,0,16,-.5,1.5);c.strokeStyle=lumiere;c.lineWidth=2;c.stroke();
      }else{
        for(let j=0;j<6;j++){
          c.save();c.rotate(j*TOUR/6+battant*.04);
          trace(c,[[7,-7],[18,-15],[24,-10],[13,-4],[10,1]],'#f2a1bf',1,'#825377');c.restore();
        }
        ellipse(c,0,0,9,9,'#3d294a',lumiere,2.3);
      }
    }
    if(b.stun>0){
      c.strokeStyle='#80e5df';c.lineWidth=1.8;c.setLineDash([2,4]);
      c.strokeRect(-28,-28,56,56);c.setLineDash([]);
      for(let i=0;i<3;i++){
        const a=t*1.8+i*TOUR/3;
        ellipse(c,Math.cos(a)*23,Math.sin(a)*23,2.6,2.6,'#d6fff2');
      }
    }
    if(b.weak) {
      const r=8+battement;
      trace(c,[[0,-r],[r,0],[0,r],[-r,0],[0,-r]],'#fff4a8',1.5);
    }
    const barre=y<55?32:-36;
    c.fillStyle='#271a2c';c.fillRect(-27,barre-1,54,4.6);
    c.fillStyle='#917082';c.fillRect(-26,barre,52,2.6);
    c.fillStyle=lumiere;c.fillRect(-26,barre,52*borne(b.hp/Math.max(1,b.maxHp)),2.6);
    c.restore();
  }

  function effet(c, fx, ere) {
    const x=centre(fx.x), y=centre(fx.y), vie=borne(fx.life/Math.max(.001,fx.maxLife)), p=1-vie;
    c.save(); c.globalAlpha=Math.sqrt(vie);
    if (fx.kind==='nova') {
      const r=Math.max(1,(fx.radius || 3)*CASE*(1-vie*vie));
      if(ere===1976)c.setLineDash([7,4]);
      ellipse(c,x,y,r,r,null,({1976:'#b2d78e',1985:'#d781db',2185:'#93d5e7',2985:'#c49aff'})[ere],2.4);
      ellipse(c,x,y,Math.max(1,r-4),Math.max(1,r-4),null,'#8cecf3',1.2);
      for(let i=0;i<6;i++){
        const a=TOUR*(i+.18*p)/6;
        c.beginPath();
        c.arc(x,y,r+1,a,a+.33);
        c.strokeStyle='#fad8ff'; c.lineWidth=3+vie*1.5; c.stroke();
      }
      for(let i=0;i<12;i++){
        const a=i*TOUR/12;
        trace(c,[[x+Math.cos(a)*r,y+Math.sin(a)*r],[x+Math.cos(a)*(r+5),y+Math.sin(a)*(r+5)]],'#e7cbff',1.5);
      }
    } else if(['riftOpen','riftPickup','riftClose'].includes(fx.kind)){
      ellipse(c,x,y,5+21*p,4+14*p,null,'#97f2e3',1.6);
    } else if(fx.kind==='bossHit'){
      const r=6+16*p;
      ellipse(c,x,y,r,r,null,'#ffca88',1.6);
    } else if (fx.kind==='kill' || fx.kind==='death' || fx.kind==='bossDefeated') {
      const n=fx.kind==='kill'?9:16;
      for(let i=0;i<n;i++) {
        const a=TOUR*i/n+.16*Math.sin(i*4), r=4+p*(9+((i*7)%11))*(n/9);
        trace(c, [[x+Math.cos(a)*r,y+Math.sin(a)*r],[x+Math.cos(a)*(r+2+vie*4),y+Math.sin(a)*(r+2+vie*4)]],i%2?'#ff9c76':'#f086cd',1.5);
      }
    } else if (fx.kind==='cell') {
      const r=6+p*14;
      trace(c,[[x,y-r],[x+r,y],[x,y+r],[x-r,y],[x,y-r]],'#ffe39b',1.5);
    }
    c.restore();
  }

  function draw(canvas, state, nowSeconds = 0, reducedMotion = false) {
    if (!canvas || !state) return;
    const scale = Math.min(2,window.devicePixelRatio || 1);
    const width = Math.round((canvas.clientWidth || LARGEUR)*scale);
    const height = Math.round((canvas.clientHeight || width/scale*HAUTEUR/LARGEUR)*scale);
    if (canvas.width!==width || canvas.height!==height) { canvas.width=width; canvas.height=height; }
    const c=canvas.getContext('2d');
    c.setTransform(width/LARGEUR,0,0,height/HAUTEUR,0,0);
    c.lineJoin='round'; c.lineCap='round';
    const ere = [1976,1985,2185,2985].includes(state.year) ? state.year : 1985;
    const cache = papier(canvas,c,state.sector || 1,ere);
    const t=reducedMotion?0:nowSeconds;
    const phase = window.SnakeSon?.beat?.();
    const battement = reducedMotion ? 0 : Number.isFinite(phase) ? Math.pow(1-borne(phase),3) : .5+.5*Math.sin(t*6);
    mouvementDecor(c,ere,t,battement);
    if(!reducedMotion && state.status==='playing') {
      chocMusical(c,cache,ere,Number.isFinite(phase)?borne(phase):(t*1.9)%1,borne(state.nearBoss||0),t);
    }
    if(state.boss?.attack)faisceauBoss(c,state.boss.attack);
    for (const pt of state.cells) cellule(c,pt,t,battement,ere);
    if(state.rift)faille(c,state.rift,t,reducedMotion);
    if(state.boss)gardien(c,state.boss,ere,t,battement);
    for (const d of state.drones) ennemi(c,d,t,ere);
    for (const s of state.shots) tir(c,s,ere);
    serpent(c,state,t,reducedMotion,ere);
    for (const fx of state.effects) effet(c,fx,ere);
    if(state.status==='cleared' || state.status==='won') passage(c,state,ere,reducedMotion);
  }
  window.SnakeRendu = Object.freeze({draw});
})();
