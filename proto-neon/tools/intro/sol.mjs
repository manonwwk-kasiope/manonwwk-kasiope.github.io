import { decode } from './png.mjs';
const PAL = ['#0d0221','#190b28','#241734','#541388','#2d1b69','#ff2a6d','#ff8fab','#05d9e8','#d1f7ff','#ff9e00','#ffd319','#ff5714','#fffce8','#8a8fa3','#8b0f3a','#01012b'].map(h => [1,3,5].map(i => parseInt(h.substr(i,2),16)));
function idx(r,g,b){let best=0,bd=1e9;for(let i=0;i<16;i++){const d=(r-PAL[i][0])**2+(g-PAL[i][1])**2+(b-PAL[i][2])**2;if(d<bd){bd=d;best=i;}}return best;}
const im=decode(new URL('../../art/horizon.png',import.meta.url).pathname);
const d=new Uint8Array(im.w*im.h);for(let i=0;i<d.length;i++)d[i]=idx(im.rgba[i*4],im.rgba[i*4+1],im.rgba[i*4+2]);
// pour chaque rangée, part de violet (3) dans la bande centrale x 150..360 hors lignes verticales
for(let y=110;y<220;y++){let v=0,n=0,h=new Array(16).fill(0);for(let x=0;x<512;x++){const c=d[y*512+x];h[c]++;}
 console.log(y, 'violet', h[3], 'indigo', h[4], 'nuit', h[1], 'ardoise', h[2], 'nP', h[15], 'mag', h[5], 'rose', h[6]);}
