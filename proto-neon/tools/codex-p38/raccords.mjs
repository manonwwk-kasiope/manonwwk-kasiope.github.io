// Raccords appliqués seulement aux chaînes en mémoire. Les sources réservées restent intactes.
export function camera(src) {
  const remplacements=[
    ["if (!simulant && modOk(N.cam, 'update')) N.cam.update(dt);", "if (modOk(N.cam, 'update')) N.cam.update(dt);"],
    ["/* la caméra suit la tête à chaque pas de jeu (le mode simulé l'avance lui-même) */", "/* Même ordre caméra/jeu en simulation et dans la boucle dessinée. */"],
    ["if (!simulant && N.cam && N.cam.update) appel('cam.update', function () { N.cam.update(dt); });", "if (N.cam && N.cam.update) appel('cam.update', function () { N.cam.update(dt); });"],
    ["      if (N.cam && N.cam.update) N.cam.update(dt);\n", "      /* update() a déjà avancé la caméra, comme dans frame(). */\n"]
  ];
  for(const [a,b] of remplacements) { if(src.split(a).length!==2) throw Error('raccord caméra à rebaser : '+a);src=src.replace(a,b); }
  return src;
}
export function gel(src) {
  const a='var gl = hitstopLeft() / 60;';
  if(src.split(a).length!==2) throw Error('raccord gel à rebaser');
  return src.replace(a,`/* Le gel du monde s'use au pas fixe, même sans image dessinée. */
      var gl = N.horloge && N.horloge.resteGel ? N.horloge.resteGel() : hitstopLeft() / 60;`);
}
export function corriger(src,mode='complet') {
  return {...src,'79-jeu.js':camera(src['79-jeu.js']),...(mode==='camera'?{}:{'50-fx.js':gel(src['50-fx.js'])})};
}
