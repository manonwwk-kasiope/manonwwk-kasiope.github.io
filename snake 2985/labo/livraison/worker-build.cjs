'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');

function buildWorker(directory, files) {
  const digest = value => createHash('sha256').update(value).digest('hex');
  const manifest = Object.fromEntries(files.map(name => [name, digest(fs.readFileSync(path.join(directory, name)))]));
  const template = fs.readFileSync(path.join(__dirname, 'sw-source.js'), 'utf8');
  if (!template.includes('__GAME_HASHES__') || !template.includes('__EDITION__')) throw Error('Gabarit du worker incompatible.');
  const worker = template.replace('__GAME_HASHES__', JSON.stringify(manifest, null, 2));
  const edition = digest(worker).slice(0, 16);
  fs.writeFileSync(path.join(directory, 'sw.js'), worker.replace('__EDITION__', edition));
  return edition;
}
module.exports = buildWorker;
