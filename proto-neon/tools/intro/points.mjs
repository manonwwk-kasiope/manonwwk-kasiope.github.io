import { decode, encode, zoom } from './png.mjs';
const PAL = ['#0d0221','#190b28','#241734','#541388','#2d1b69','#ff2a6d','#ff8fab','#05d9e8','#d1f7ff','#ff9e00','#ffd319','#ff5714','#fffce8','#8a8fa3','#8b0f3a','#01012b'].map(h => [1,3,5].map(i => parseInt(h.substr(i,2),16)));
function idx(r,g,b){let best=0,bd=1e9;for(let i=0;i<16;i++){const d=(r-PAL[i][0])**2+(g-PAL[i][1])**2+(b-PAL[i][2])**2;if(d<bd){bd=d;best=i;}}return best;}
function load(n){const im=decode(new URL('../../art/'+n+'.png',import.meta.url).pathname);const d=new Uint8Array(im.w*im.h);for(let i=0;i<d.length;i++)d[i]=im.rgba[i*4+3]<128?255:idx(im.rgba[i*4],im.rgba[i*4+1],im.rgba[i*4+2]);return {...im,d};}
const boss = load('boss');
// pixels jaune/os/ambre dans le tiers haut
let pts=[];for(let y=0;y<80;y++)for(let x=120;x<280;x++){const c=boss.d[y*boss.w+x];if(c===10||c===12)pts.push([x,y,c]);}
console.log('boss jaune/os haut:', pts.length, pts.slice(0,40).map(p=>p.join(',')).join(' '));
// crop zoom of boss head
function crop(im,x0,y0,w,h,k,file){const o={w,h,rgba:new Uint8Array(w*h*4)};for(let y=0;y<h;y++)for(let x=0;x<w;x++){const s=((y0+y)*im.w+x0+x)*4,dd=(y*w+x)*4;for(let c=0;c<4;c++)o.rgba[dd+c]=im.rgba[s+c];o.rgba[dd+3]=255;}encode(new URL(file,import.meta.url).pathname,...Object.values(zoom(o,k)));}
crop(boss,150,0,120,80,5,'boss-tete.png');
const hz = load('horizon');
crop(hz,128,90,256,130,3,'horizon-sol.png');
// lignes de l'horizon : quelle rangée est l'horizon ? couleur dominante par rangée
for(let y=100;y<130;y++){const h=new Array(16).fill(0);for(let x=0;x<hz.w;x++)h[hz.d[y*hz.w+x]]++;console.log('horizon y',y,h.map((v,i)=>v>20?i+':'+v:'').filter(Boolean).join(' '));}
