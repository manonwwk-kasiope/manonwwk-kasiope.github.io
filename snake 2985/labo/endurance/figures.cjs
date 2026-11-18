// Génère les deux planches à partir des reçus. Aucun navigateur nécessaire.
'use strict';
const {createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[require('node:path').join(require('node:os').homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),__dirname]}));
const fs=require('node:fs'),path=require('node:path'),dir=__dirname,folder=path.join(dir,'releves'),years=[1976,1985,1995,2185,2985];
const summary=JSON.parse(fs.readFileSync(path.join(folder,'synthese.json'),'utf8'));
const png=(cv,file)=>fs.writeFileSync(path.join(dir,file),cv.toBuffer('image/png'));
function plot(){
 const canvas=createCanvas(1450,790),c=canvas.getContext('2d');
 function text(t,x,y,size=20,ink='#edf0f0',weight=''){c.fillStyle=ink;c.font=(weight?weight+' ':'')+size+'px Helvetica';c.fillText(t,x,y);}
 function line(x1,y1,x2,y2,color,width=1){c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.lineWidth=width;c.strokeStyle=color;c.stroke();}
 c.fillStyle='#111722';c.fillRect(0,0,1450,790);
 text('Rendu des cinq époques',46,72,42,'#f0ede5','bold');
 text('Coût du dessin par image · Apple M5 · Chromium headless-shell · deux formats de canevas mobile',48,111,20,'#b8c9d1');
 const max=Math.max(20,...summary.byYear.map(v=>v.js.p99)),ceil=Math.ceil(max/5)*5,X=n=>195+n/ceil*1130;
 for(let i=0;i<=ceil;i+=5){const x=X(i);line(x,189,x,649,'#3a4251');text(i+' ms',x-12,174,16,'#b0bdca');}
 const colors=['#f0a481','#70d2c0'];
 for(let i=0;i<5;i++){
   text(String(years[i]),48,242+i*86,25,'#dce1df','bold');
   for(let k=0;k<2;k++){
     const o=summary.byYear.find(a=>a.year===years[i]&&a.mode===['dpr2','logique'][k]),y=212+i*86+k*22,col=colors[k];
     c.fillStyle=col;c.fillRect(X(0),y,X(o.js.p50)-X(0),10);line(X(o.js.p50),y+5,X(o.js.p99),y+5,col,1.5);
     line(X(o.js.p95),y-1,X(o.js.p95),y+11,col,2);
     c.beginPath();c.arc(X(o.js.p99),y+5,3,0,Math.PI*2);c.fill();
   }
 }
 const limit=1000/60;line(X(limit),185,X(limit),649,'#dbbd7c',1.5);
 text('Intervalle à 60 Hz',X(limit)-30,674,15,'#dbbd7c');
 c.fillStyle=colors[0];c.fillRect(50,708,26,10);text('Canevas DPR 2',85,721,19);
 c.fillStyle=colors[1];c.fillRect(300,708,26,10);text('Tracé en résolution logique',336,721,19);
 text('Barre = médiane     Trait vertical = P95     Point = P99',730,721,19,'#c1ccd2');
 text('Le chronomètre couvre les appels de dessin côté JavaScript. Le suivi requestAnimationFrame figure dans le rapport.',50,761,17,'#98aaba');
 png(canvas,'cout-rendu.png');
}
async function pairs(){
 const cv=createCanvas(1440,1370),c=cv.getContext('2d');c.fillStyle='#111722';c.fillRect(0,0,1440,1370);
 c.fillStyle='#eeeae0';c.font='bold 32px Helvetica';c.fillText('Même partie, même instant : détails du plateau',28,50);
 c.font='19px Helvetica';c.fillStyle='#aec1c9';c.fillText('Canevas 740 × 328 px CSS, DPR 2. Extraits à l’échelle des pixels de capture.',29,83);
 c.fillStyle='#ffc6a5';c.fillText('Canevas DPR 2, puis réduction',150,120);
 c.fillStyle='#8fe4d3';c.fillText('Tracé directement à la résolution logique',795,120);
 for(const [i,year] of years.entries()){
   c.font='bold 21px Helvetica';c.fillStyle='#d8d8cf';c.fillText(String(year),28,240+i*246);
   for(const [k,mode] of ['dpr2','logique'].entries()){
     const img=await loadImage(path.join(folder,'740-'+year+'-'+mode+'.png'));
     c.drawImage(img,320,218,624,224,140+k*644,135+i*246,624,224);
   }
 }
 png(cv,'details-apparies.png');
}
plot();pairs().catch(e=>{console.error(e);process.exitCode=1;});
