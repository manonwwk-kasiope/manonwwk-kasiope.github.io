// Compose les captures existantes sans démarrer de navigateur.
'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),__dirname]}));
const entries=[
 [1976,'Salle de télémétrie',2,'384 px'],
 [1985,'Les porteurs de la ligne de nuit',4,'480 px'],
 [1995,'L’express des docks',8,'568 px'],
 [2185,'Chantier orbital',16,'768 px'],
 [2985,'Horizon des événements',32,'Natif']
];
(async()=>{
 const canvas=createCanvas(1480,1140),c=canvas.getContext('2d');
 c.fillStyle='#111321';c.fillRect(0,0,1480,1140);
 for(const [i,[year,title,bits,grid]] of entries.entries()){
   const x=i%2*740,y=Math.floor(i/2)*380,img=await loadImage(path.join(__dirname,'scene-'+year+'.png'));
   c.drawImage(img,x,y,740,328);
   c.font='bold 19px Helvetica';c.fillStyle='#dfc39c';c.fillText(String(year),x+15,y+357);
   c.font='18px Helvetica';c.fillStyle='#e7e6e6';c.fillText(title,x+76,y+357);
   c.textAlign='right';c.fillStyle='#acaebb';c.font='15px Helvetica';c.fillText(bits+' bits  ·  '+grid,x+722,y+357);c.textAlign='left';
 }
 c.fillStyle='#191c2d';c.fillRect(740,760,740,380);
 c.fillStyle='#d8b78d';c.font='bold 16px Helvetica';c.fillText('SNAKE 2985   /   LABORATOIRE',780,837);
 c.fillStyle='#ece9e3';c.font='bold 33px Helvetica';c.fillText('Cinq époques, une même scène',780,891);
 c.font='19px Helvetica';c.fillStyle='#c0c4cc';
 ['La tête monte au second plan. Le gardien annonce son tir.','Chaque époque traite l’image entière, du ciel aux projectiles.','Les largeurs indiquent la résolution de travail du rendu.'].forEach((v,j)=>c.fillText(v,780,934+j*31));
 fs.writeFileSync(path.join(__dirname,'cinq-mondes.png'),canvas.toBuffer('image/png'));
})().catch(e=>{console.error(e);process.exitCode=1;});
