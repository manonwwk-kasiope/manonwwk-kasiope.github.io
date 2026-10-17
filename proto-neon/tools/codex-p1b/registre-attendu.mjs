// Fixture EXPLICITE d'intégration : aucun fichier de production n'est modifié.
// Seules les déclarations du registre sont complétées ; aucun comportement du jeu n'est remplacé.
export function registreAttendu(source) {
  const remplacements = [
    ["armes: ['canon', 'tourelles', 'arc', 'missiles', 'drones', 'minesQ']", "armes: ['canon', 'tourelles', 'arc', 'missiles', 'drones', 'minesQ', 'onde', 'sillage']"],
    ["'sangFroid', 'braise']", "'sangFroid', 'braise', 'perforation', 'surtension', 'epines']"],
    ["arme: L.armes.concat(['lasso', 'apogee', 'grappe', 'eperon'])", "arme: L.armes.concat(['lasso', 'apogee', 'grappe', 'eperon', 'epines'])"],
    ["sangFroid: 'b', braise: entierEntre(0, 2)", "sangFroid: 'b', braise: entierEntre(0, 2), perforation: entierEntre(0, 3), surtension: entierEntre(0, 3), epines: entierEntre(0, 3)"],
    ["var NOMS = {", "var NOMS = { onde: 'ONDE DE CHOC', sillage: 'SILLAGE', perforation: 'PERFORATION', surtension: 'SURTENSION', epines: 'ÉPINES',"]
  ];
  for (const [a,b] of remplacements) {
    if (!source.includes(a)) throw Error('Fixture périmée : ' + a);
    source = source.replace(a,b);
  }
  return source;
}
