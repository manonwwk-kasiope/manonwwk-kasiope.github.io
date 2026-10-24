import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { P } from './protocole.mjs';
import { fileURLToPath } from 'node:url';
import { monde } from './vm-temoins.mjs';

export async function testsTemoins({ test, ROOT, HERE, avant = false }) {
  const original = f => execFileSync('git', ['show', 'a294e2b:proto-neon/tools/jury2/' + f], { cwd: ROOT, encoding: 'utf8' });
  const codeBanc = avant ? original('banc.mjs') : fs.readFileSync(path.join(HERE, 'banc.mjs'), 'utf8');
  let options = {};
  if (avant) {
    const temoin = original('temoin.mjs'), a = temoin.indexOf('export function sourceAjout('), b = temoin.indexOf('/* Bâtit un bundle', a);
    const ajout = vm.runInNewContext(temoin.slice(a, b).replace('export ', '') + '\nsourceAjout()', { P });
    const debut = codeBanc.indexOf('await page.evaluate(cas=>{\n      const N=window.__N,S=window.__S;');
    const fin = codeBanc.indexOf('\n    },cas);', debut);
    const preparation = vm.runInNewContext('(' + codeBanc.slice(debut + 'await page.evaluate('.length, fin) + '\n})');
    options = { ajout, preparation };
  }
  const creer = mode => monde(ROOT, mode, options);
  const observations = [];
  async function controle(nom, mesurer, valider) {
    await test(nom, () => {
      const valeur = mesurer(); observations.push({ nom, valeur });
      valider(valeur); return valeur;
    });
  }
  for (const mode of ['synchro', 'desync']) {
    await controle('Audio VM : préparation réelle, applyMute et reset — ' + mode, () => {
      const m = creer(mode); m.disque.set('ancien', 'à effacer'); m.preparer();
      const jeu = fs.readFileSync(path.join(ROOT, 'src/79-jeu.js'), 'utf8');
      const fn = jeu.slice(jeu.indexOf('  function applyMute() {'), jeu.indexOf('  function toggleMute() {'));
      vm.runInContext('(function(){var muted=false,demo=false;' + fn + ';this.reappliquer=applyMute;}).call(this)', m.c);
      const etapes = [];
      const relever = nom => etapes.push({ nom, canaux: { ...m.canaux } });
      relever('préparation');
      for (let i = 0; i < 100; i++) m.c.reappliquer(); relever('100 applyMute');
      m.N.game.reset(101, { depart: 'plongee' }); relever('reset réel');
      for (let i = 0; i < 100; i++) m.c.reappliquer(); relever('100 applyMute après reset');
      m.propre();
      return { mode, ancienEfface: !m.disque.has('ancien'), profil: JSON.parse(m.disque.get('snake2975.v1') || '{}').reglages || null, etapes };
    }, r => {
      assert(r.ancienEfface); assert.equal(r.profil?.effets, false); assert.equal(r.profil?.musique, true);
      for (const s of r.etapes) assert.deepEqual(s.canaux, { effets: true, musique: mode === 'desync' });
    });
  }

  function emission(mode, opts, { changement = false, placement = false } = {}) {
    const m = creer(mode); m.preparer('sync-probe'); m.grille();
    const { N } = m, debut = N.rythme.lire().t, emis = [];
    Object.assign(N.outils.A, { x0: 0, y0: 0, x1: 1000, y1: 1000 });
    Object.assign(N.outils.VUE, { x: 100, y: 100, w: 200, h: 100 });
    N.ev.on('apparition', 1, d => emis.push({ id: d.id, t: N.rythme.lire().t, x: d.x, y: d.y, morceau: N.rythme.lire().id }));
    const e = N.ennemis.spawn('planeur', 450, 150, opts);
    assert(e, 'Naissance refusée par la fixture');
    // La même horloge avance par petits pas : chaîne réelle update → attendre → émission.
    if (placement) Object.assign(N.outils.VUE, { x: 0, y: 0, w: 1000, h: 1000 });
    for (let i = 1; i <= 600 && !emis.length; i++) {
      const t = debut + i * .005;
      if (changement && t >= 10.4) m.avancer(t - 10.2, 'autre', .2);
      else m.avancer(t);
      if (placement && t >= 11.3) Object.assign(N.outils.VUE, { x: 100, y: 100, w: 200, h: 100 });
    }
    m.propre();
    return { mode, opts, debut, emissions: emis, journal: N.journal.dump().filter(x => /rythme-(action|annulation)/.test(x.type)),
      restant: N.ennemis.list.map(x => ({ id: x.id, etat: x.etat })) };
  }
  for (const mode of ['synchro', 'desync']) for (const presente of [false, true]) {
    await controle('Temps VM : émission réelle — ' + mode + ' — échéance ' + (presente ? 'présente' : 'absente'),
      () => emission(mode, { portail: .6, ...(presente ? { rythmeFin: 11.25 } : {}) }), r => {
        assert.equal(r.emissions.length, 1); const t = r.emissions[0].t;
        if (mode === 'synchro') assert(Math.abs(t - 11) <= .005001, 'Émission attendue à 11 s, obtenue ' + t);
        else assert(Math.abs(t - 11.075132799195126) <= .005001, 'Échéance indépendante non livrée : ' + t);
        assert(t - r.debut >= .6); assert.equal(r.journal.filter(x => x.type === 'rythme-action').length, 1);
      });
  }
  for (const mode of ['synchro', 'desync']) {
  await controle('Temps VM : minimum contractuel du portail, même sans option — ' + mode, () => emission(mode, {}), r => {
    assert.equal(r.emissions.length, 1); const t = r.emissions[0].t;
    assert(t - r.debut >= .6, 'Préavis réel insuffisant : ' + (t - r.debut));
    assert(Math.abs(t - (mode === 'synchro' ? 11 : 11.075132799195126)) <= .005001);
  });
  await controle('Temps VM : changement de morceau annule, aucun faux positif — ' + mode, () => emission(mode, { portail: .6 }, { changement: true }), r => {
    assert.equal(r.emissions.length, 0); assert.equal(r.restant.length, 0);
    assert(r.journal.some(x => x.type === 'rythme-annulation' && x.d.raison === 'transport'));
  });
  await controle('Temps VM : placement impossible reporte réellement l’émission — ' + mode, () => emission(mode, { portail: .6 }, { placement: true }), r => {
    assert.equal(r.emissions.length, 1); const e = r.emissions[0]; assert(e.t >= 11.3);
    assert(e.x < 100 || e.x > 300 || e.y < 100 || e.y > 200, 'Naissance dans la vue');
    // Ce cas empêché est explicitement exclu des positifs connus, sa phase reste publiée.
    r.empeche = true; r.ecartAuTempsMs = Math.min(e.t % .5, .5 - e.t % .5) * 1000;
  });
  }
  await controle('Temps VM : livraison au pas suivant, pas de rétrodatage', () => {
    const m = creer('synchro'); m.preparer('sync-probe'); m.grille();
    Object.assign(m.N.outils.A, { x0: 0, y0: 0, x1: 1000, y1: 1000 });
    Object.assign(m.N.outils.VUE, { x: 100, y: 100, w: 200, h: 100 });
    const emissions = []; m.N.ev.on('apparition', 1, () => emissions.push(m.N.rythme.lire().t));
    m.N.ennemis.spawn('planeur', 450, 150, { portail: .6, rythmeFin: 11.25 });
    for (const t of [10.99, 11.005, 11.255]) m.avancer(t);
    return { emissions, journal: m.N.journal.dump().filter(x => x.type === 'rythme-action') };
  }, r => { assert.deepEqual(r.emissions, [11.005]); assert.equal(r.journal[0].d.observe, 11.005); });
  await controle('Audio VM : aucune coupure persistée hors audio-probe', () => {
    const m = creer('synchro'); m.preparer('sync-probe');
    return { reglages: { ...m.N.score.profil.reglages() }, canaux: { ...m.canaux } };
  }, r => { assert.equal(r.reglages.effets, true); assert.equal(r.reglages.musique, true); assert.deepEqual(r.canaux, { musique: false, effets: false }); });
  await controle('Traçabilité : les deux modes ont chacun leur dossier brut', () => {
    const s = codeBanc;
    const expression = s.match(/const dir=path\.join\(opts.out,([^;]+)\);/)[1];
    return ['synchro', 'desync'].map(mode => vm.runInNewContext(s.split('\n').find(l => l.startsWith('const safe=')) + '\n' + expression, { cas: { genre: 'sync-probe', profil: 'paysage', pilote: 'bon', graine: 101, modeTemoin: mode } }));
  }, r => { assert(r[0].endsWith('-synchro')); assert(r[1].endsWith('-desync')); assert.notEqual(r[0], r[1]); });
  fs.writeFileSync(path.join(HERE, avant ? 'temoins-observations-avant.json' : 'temoins-observations.json'), JSON.stringify(observations, null, 2) + '\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../..'), controles = [];
  const avant = process.argv.includes('--avant');
  await testsTemoins({ HERE, ROOT, avant, test: async (nom, f) => {
    try { controles.push({ nom, ok: true, valeur: f() }); } catch (e) { controles.push({ nom, ok: false, erreur: String(e) }); }
  } });
  const preuve = { dateParis: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }), avant, controles, echecs: controles.filter(c => !c.ok).length };
  fs.writeFileSync(path.join(HERE, 'temoins-regression-' + (avant ? 'avant' : 'apres') + '.json'), JSON.stringify(preuve, null, 2) + '\n');
  console.log(JSON.stringify({ avant, controles: controles.length, echecs: preuve.echecs }));
  if (preuve.echecs) process.exitCode = 1;
}
