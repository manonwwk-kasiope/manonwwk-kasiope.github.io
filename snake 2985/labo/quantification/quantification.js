/* Source et destination : octets RGBA du même ImageData. La table palette
   existante utilise toujours le codage numérique 0xAABBGGRR. */
(() => {
  'use strict';
  const nativeLittle=new Uint8Array(new Uint32Array([1]).buffer)[0]===1;
  const dither=[-6,2,-4,4,6,-2,8,0,-3,5,-5,3,9,1,7,-1];
  const index5=new Uint8Array(4096),rg3=new Uint8ClampedArray(4096),blue2=new Uint8ClampedArray(4096);
  for(let tile=0;tile<16;tile++){
    for(let v=0;v<256;v++){
      const j=(tile<<8)+v,delta=dither[tile]*.75;
      index5[j]=Math.min(255,Math.max(0,v+dither[tile]*.55))>>3;
      rg3[j]=Math.min(7,Math.max(0,Math.round((v+delta)*7/255)))*255/7;
      blue2[j]=Math.min(3,Math.max(0,Math.round((v+delta*1.6)*3/255)))*85;
    }
  }
  function convert(bytes,w,h,bits,palette){
    if(bits===32||!(w*h))return;
    const words=nativeLittle&&(bytes.byteOffset&3)===0?new Uint32Array(bytes.buffer,bytes.byteOffset,w*h):null;
    if(bits===16){
      if(words){
        for(let i=0;i<words.length;i++){
          const v=words[i];
          words[i]=(v&0xfff8fcf8)|((v>>>5)&0x00070007)|((v>>>6)&0x00000300);
        }
      }else for(let j=0;j<w*h*4;j+=4){
        bytes[j]=(bytes[j]&248)|(bytes[j]>>5);
        bytes[j+1]=(bytes[j+1]&252)|(bytes[j+1]>>6);
        bytes[j+2]=(bytes[j+2]&248)|(bytes[j+2]>>5);
      }
      return;
    }
    for(let y=0,i=0;y<h;y++){
      const row=(y&3)<<10;
      if(bits===8){
        for(let x=0;x<w;x++,i++){
          const bank=row|((x&3)<<8),j=i*4;
          bytes[j]=rg3[bank|bytes[j]];bytes[j+1]=rg3[bank|bytes[j+1]];
          bytes[j+2]=blue2[bank|bytes[j+2]];
        }
      }else if(words){
        for(let x=0;x<w;x++,i++){
          const bank=row|((x&3)<<8),j=i*4;
          words[i]=palette[(index5[bank|bytes[j]]<<10)|(index5[bank|bytes[j+1]]<<5)|index5[bank|bytes[j+2]]];
        }
      }else for(let x=0;x<w;x++,i++){
        const bank=row|((x&3)<<8),j=i*4;
        const v=palette[(index5[bank|bytes[j]]<<10)|(index5[bank|bytes[j+1]]<<5)|index5[bank|bytes[j+2]]];
        bytes[j]=v&255;bytes[j+1]=(v>>>8)&255;bytes[j+2]=(v>>>16)&255;bytes[j+3]=v>>>24;
      }
    }
  }
  const api=Object.freeze({convert});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof window!=='undefined')window.SnakeQuantification=api;
})();
