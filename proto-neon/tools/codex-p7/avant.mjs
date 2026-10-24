import fs from 'node:fs';
import { sources, monde } from './vm.mjs';
const src = sources('HEAD'), cas = [];
for (const [profil, w, h] of [['paysage', 844, 390], ['portrait', 390, 844], ['bureau', 1440, 900]]) {
  const { N, S, c } = monde(src, w, h);
  N.game.reset(7, { depart: 'jeu' }); N.horloge.avancer(); N.game.dbg.scene('fin'); N.horloge.avancer();
  N.game.dbg.simuler(N.R.ecrans.fin.garde);
  S.input.valider = true; N.game.dbg.simuler(N.R.temps.h); S.input.valider = false;
  let relance = N.R.temps.h;
  while ((N.game.etat() !== 'jeu' || N.joueuse.etat !== 'vivant') && relance < 2) { N.game.dbg.simuler(N.R.temps.h); relance += N.R.temps.h; }
  cas.push({ profil, continuerAPI: typeof N.score.continuer, relance, etat: N.game.etat(), joueuse: N.joueuse.etat, erreurs: c.__ERR });
}
fs.writeFileSync(new URL('./avant.json', import.meta.url), JSON.stringify({ dateParis: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }), sources: 'HEAD avant lot codex-p7', cas }, null, 2));
console.log(cas);
