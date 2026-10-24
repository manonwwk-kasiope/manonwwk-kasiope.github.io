import { decode } from './png.mjs';
const PAL = ['#0d0221','#190b28','#241734','#541388','#2d1b69','#ff2a6d','#ff8fab','#05d9e8','#d1f7ff','#ff9e00','#ffd319','#ff5714','#fffce8','#8a8fa3','#8b0f3a','#01012b'].map(h => [1,3,5].map(i => parseInt(h.substr(i,2),16)));
const NAMES = ['vide','nuit','ardoise','violet','indigo','magenta','rosePale','cyan','cyanPale','ambre','jaune','brasier','os','acier','sang','nuitProfonde'];
function idx(r,g,b){let best=0,bd=1e9;for(let i=0;i<16;i++){const d=(r-PAL[i][0])**2+(g-PAL[i][1])**2+(b-PAL[i][2])**2;if(d<bd){bd=d;best=i;}}return best;}
for (const n of process.argv.slice(2)) {
  const im = decode(new URL('../../art/' + n + '.png', import.meta.url).pathname);
  const hist = new Array(16).fill(0); let x0=1e9,y0=1e9,x1=-1,y1=-1, cx=0, cy=0, cn=0, cxmin=1e9, cxmax=-1, cymin=1e9, cymax=-1;
  for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) {
    const i = (y*im.w+x)*4; if (im.rgba[i+3] < 128) continue;
    x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);
    const c = idx(im.rgba[i],im.rgba[i+1],im.rgba[i+2]); hist[c]++;
    if (c===7||c===8){cx+=x;cy+=y;cn++;cxmin=Math.min(cxmin,x);cxmax=Math.max(cxmax,x);cymin=Math.min(cymin,y);cymax=Math.max(cymax,y);}
  }
  console.log(n, im.w+'x'+im.h, 'bbox', x0,y0,x1,y1, 'cyan n', cn, cn? 'centre '+(cx/cn|0)+','+(cy/cn|0)+' bbox '+cxmin+','+cymin+'-'+cxmax+','+cymax : '');
  console.log('   ', hist.map((v,i)=>v?NAMES[i]+':'+v:'').filter(Boolean).join(' '));
}
