(() => {
  'use strict';

  const prefix = 'snake2985.hall.tentative.';
  const nameKey = 'snake2985.hall.pilote';
  const attempts = new Map();
  const defaultName = 'PILOTE';
  const displayLimit = 25;
  const numberFormat = new Intl.NumberFormat('fr-FR');
  const labels = { dead: 'défaite', cleared: 'époque franchie', won: 'voyage achevé' };
  let name = defaultName;
  let filterControl;

  function cleanName(value) {
    return Array.from(String(value || '').normalize('NFC').replace(/[\u0000-\u001F\u007F]/g, '').trim())
      .slice(0, 20).join('') || defaultName;
  }

  function validated(row) {
    if (!row || typeof row.id !== 'string' || !row.id || row.id.length > 180) return null;
    const year = Number(row.year), difficulty = Number(row.difficulty), score = Number(row.score);
    if (!Number.isInteger(year) || year <= 0 || !Number.isInteger(difficulty)
      || difficulty < 1 || difficulty > 10 || !Number.isSafeInteger(score) || score < 0) return null;
    const status = Object.hasOwn(labels, row.status) ? row.status : (row.cleared ? 'cleared' : 'dead');
    const endedAt = Number.isFinite(row.endedAt) ? row.endedAt : Date.now();
    return { id: row.id, year, difficulty, score, status, cleared: status !== 'dead',
      name: cleanName(row.name), endedAt };
  }

  function loadAttempt(key, json) {
    try {
      const row = validated(JSON.parse(json));
      if (row && key === prefix + row.id) attempts.set(row.id, row);
    } catch { /* Les autres scores restent lisibles. */ }
  }

  try {
    name = cleanName(localStorage.getItem(nameKey));
    for (let n = 0; n < localStorage.length; n++) {
      const key = localStorage.key(n);
      if (key && key.startsWith(prefix)) loadAttempt(key, localStorage.getItem(key));
    }
  } catch { /* Le classement fonctionne en mémoire quand le stockage est inaccessible. */ }

  function persist(key, value) {
    try { localStorage.setItem(key, value); } catch { /* La copie en mémoire reste disponible. */ }
  }

  function record(input) {
    if (!input) return null;
    const existing = attempts.get(input.id);
    if (existing) return { ...existing };
    const row = validated({ ...input, name: input.name || name });
    if (!row) return null;
    attempts.set(row.id, row);
    persist(prefix + row.id, JSON.stringify(row));
    render();
    return { ...row };
  }

  function setName(id, value) {
    name = cleanName(value);
    persist(nameKey, name);
    const row = attempts.get(id);
    if (row && row.name !== name) {
      row.name = name;
      persist(prefix + row.id, JSON.stringify(row));
      render();
    }
    return name;
  }

  function list(year) {
    return [...attempts.values()]
      .filter(row => !year || row.year === Number(year))
      .sort((a, b) => b.score - a.score || b.difficulty - a.difficulty
        || a.endedAt - b.endedAt || a.id.localeCompare(b.id))
      .map(row => ({ ...row }));
  }

  function populateFilter(select) {
    const years = new Set((window.SnakeArcade?.eras || []).map(era => era.year));
    for (const row of attempts.values()) years.add(row.year);
    const values = ['', ...Array.from(years).sort((a, b) => a - b).map(String)];
    if (select.options.length !== values.length
      || values.some((value, i) => value !== select.options[i].value)) {
      const current = select.value;
      const options = values.map(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value || 'Toutes les époques';
        return option;
      });
      select.replaceChildren(...options);
      select.value = values.includes(current) ? current : '';
    }
    if (filterControl !== select) {
      filterControl?.removeEventListener('change', render);
      filterControl = select;
      select.addEventListener('change', render);
    }
  }

  function render() {
    const body = document.getElementById('classement');
    const select = document.getElementById('filtre-annee');
    const empty = document.getElementById('vide');
    if (!body || !select) return;
    populateFilter(select);
    const rows = list(select.value).slice(0, displayLimit);
    const fragment = document.createDocumentFragment();
    rows.forEach((row, i) => {
      const tr = document.createElement('tr');
      const level = row.difficulty + '/10' + (row.cleared ? ' ✓' : '');
      [String(i + 1), row.name, String(row.year), level, numberFormat.format(row.score)]
        .forEach((value, column) => {
          const td = document.createElement('td');
          td.textContent = value;
          if (column === 3) {
            td.title = labels[row.status];
            td.setAttribute('aria-label', level + ', ' + labels[row.status]);
          }
          tr.append(td);
        });
      fragment.append(tr);
    });
    body.replaceChildren(fragment);
    if (empty) empty.hidden = rows.length > 0;
  }

  window.addEventListener('storage', event => {
    if (!event.key) { attempts.clear(); name = defaultName; }
    else if (event.key === nameKey) name = cleanName(event.newValue);
    else if (event.key.startsWith(prefix)) {
      if (event.newValue === null) attempts.delete(event.key.slice(prefix.length));
      else loadAttempt(event.key, event.newValue);
    } else return;
    render();
  });

  window.SnakePalmares = Object.freeze({ record, setName, getName: () => name, render, list });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render, { once: true });
  else render();
})();
