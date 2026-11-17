'use strict';
const art=require('./sprites.js'),catalog={};
for(const year of art.years)for(const id of ['head','body','drone','cell','mid','final']){
  for(const plane of [0,1]){
    const img=art.raster(year,['mid','final'].includes(id)?'boss':id,{kind:id,plane,reduced:true});
    catalog[[year,id,plane].join(':')]={...img,data:Buffer.from(img.data).toString('base64')};
  }
}
process.stdout.write(JSON.stringify(catalog));
