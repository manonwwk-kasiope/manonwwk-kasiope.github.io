import {instrument,sources} from './vm.mjs';
const c=instrument(sources()).create();const N=c.__N;
N.intro.skip();N.game.reset(1,{depart:'plongee'});N.game.dbg.scene('calme');N.game.dbg.masque();
function image(){N.gfx.clear(0);N.game.draw();N.fx.draw();N.game.drawTop();N.gfx.origin(0,0);N.fx.drawEcran();}
function analyse(){const b=N.gfx.buf(),m=N.gfx.mask(),a={};for(let i=0;i<b.length;i++)if(b[i]===7||b[i]===8)a[m[i]]=(a[m[i]]||0)+1;return a;}
image();console.log('calme',analyse(),c.__ERR);
N.vol.start('docks','artere');
for(const dt of [0,.1,.4,1,2]){N.vol.update(dt);N.vol.draw();console.log('vol',N.vol.etat().t,analyse(),c.__ERR);}
N.vol.start('docks','artere');N.vol.draw();console.log('vol-second-start',analyse(),c.__ERR);
