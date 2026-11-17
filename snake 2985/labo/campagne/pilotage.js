// Convertit un déplacement du pouce en cap sur le plan incliné à l'emplacement de la tête.
(function (root) {
  'use strict';
  function cap(project, camera, head, plane, angle, width, height) {
    const p=project(camera,head.x,head.y,plane);
    const x=project(camera,head.x+.01,head.y,plane);
    const y=project(camera,head.x,head.y+.01,plane);
    const a=(x.x-p.x)*width, b=(y.x-p.x)*width;
    const c=(x.y-p.y)*height, d=(y.y-p.y)*height;
    const det=a*d-b*c, sx=Math.cos(angle), sy=Math.sin(angle);
    if(Math.abs(det)<1e-10)return {x:sx,y:sy};
    const dx=(d*sx-b*sy)/det, dy=(a*sy-c*sx)/det;
    const length=Math.hypot(dx,dy);
    return {x:dx/length,y:dy/length};
  }
  root.SnakePilotage={cap};
})(typeof window!=='undefined'?window:globalThis);
