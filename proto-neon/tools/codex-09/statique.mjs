import fs from 'node:fs';
import path from 'node:path';
import { ROOT, sources, monde } from './vm.mjs';
import { parcours } from './parcours.mjs';
const calibration = JSON.parse(fs.readFileSync(new URL('./calibration.json', import.meta.url)));
if (calibration.controles.length < 10 || calibration.controles.some(c => !c.identique)) throw Error('VM non validée');
const sortie = { dateParis: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }), limite: 'VM sans DOM ni décodage : rendu procédural du tampon, pas une qualification navigateur.', profils: [] };
for (const [nom, w, h] of [['paysage',844,390], ['portrait',390,844], ['bureau',1440,900]]) {
  const m = monde(sources(), w, h, true);
  const r = parcours(m.N, m.S, () => { m.c.__DT = 0; m.c.frame(0); });
  const overlays = [];
  m.N.game.reset(1, { depart: 'titre' }); m.N.horloge.avancer(); m.N.game.dbg.simuler(1);
  m.S.input.valider = true; m.N.game.update(m.N.horloge.H); m.S.input.valider = false;
  // Une UI titre volontairement laissée ouverte doit rester absente de l'image aventure.
  for (const epoque of ['choix', '1976', '1982']) {
    let i = 0;
    while (m.N.aventure.etape() !== epoque && i++ < 2000) {
      if (m.N.film.actif()) m.N.aventure.sauter();
      else if (m.N.aventure.etape() === 'choix' || m.N.aventure.etape() === '1976') m.N.aventure.sauter();
      m.N.game.dbg.simuler(m.N.horloge.H);
    }
    m.N.ui.ouvrir('titre'); m.N.intro.transition('defaite');
    m.N.gfx.origin(0,0); m.N.gfx.clear(0); m.N.aventure.draw();
    const attendu = m.N.gfx.buf().slice(); m.c.__DT = 0; m.c.frame(0);
    const obtenu = m.N.gfx.buf(); let differents = 0;
    for (let j = 0; j < attendu.length; j++) if (attendu[j] !== obtenu[j]) differents++;
    overlays.push({ epoque, etape: m.N.aventure.etape(), pixelsDifferents: differents, ok: m.N.aventure.etape() === epoque && differents === 0 });
    m.N.intro.stop(); m.N.ui.fermer();
  }
  const err = JSON.parse(JSON.stringify(m.c.__ERR));
  const p = { nom, ...r, overlays, err, erreursConsole: m.erreurs };
  p.conforme = r.conforme && overlays.every(c => c.ok) && !err.count && !m.erreurs.length;
  sortie.profils.push(p);
  console.log(JSON.stringify({ nom, conforme:p.conforme, echecs:r.controles.filter(c=>!c.ok), overlays, err, erreursConsole:m.erreurs }));
}
sortie.conforme = sortie.profils.every(p => p.conforme);
fs.writeFileSync(path.join(ROOT, 'tools/codex-09/statique.json'), JSON.stringify(sortie, null, 2));
if (!sortie.conforme) process.exitCode = 1;
