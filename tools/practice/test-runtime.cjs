const assert = require('node:assert/strict');
const fs = require('node:fs');
const api = require('../../unique-game-contexts.js');
const bank = JSON.parse(fs.readFileSync(require('node:path').resolve(__dirname, '../../practice-sentences/bank.json')));
api.install(bank);
for (const [term, row] of Object.entries(bank.entries)) {
  for (const slot of ['gap', 'builder']) {
    const exercise = api.get({w: term, e: 'Untrusted source passage.'}, slot);
    assert.ok(exercise, `${term}:${slot} is playable`);
    assert.equal(exercise.sentence, row[slot]);
    assert.equal(exercise.masked.split('_____').length, 2);
    assert.equal(exercise.tokens.map(x => x.text).join(' '), row[slot]);
    assert.equal(new Set(exercise.tokens.map(x => x.id)).size, exercise.tokens.length);
  }
}
assert.equal(api.mask('The artist wrote an article about art.', 'art'), 'The artist wrote an article about _____.');
assert.equal(api.mask('Art and art appear together.', 'art'), '');
assert.equal(api.mask('A state-of-the-art design was selected.', 'art'), '');
assert.equal(api.mask('Her neighbour’s garden overlooks the river.', "neighbour's"), 'Her _____ garden overlooks the river.');
assert.equal(api.mask('Work-life balance matters.', 'work-life balance'), '_____ matters.');
assert.equal(api.get({w: 'missing', e: 'Old article sentence.'}), null);
assert.equal(api.get({w: '__proto__'}), null);
assert.notEqual(api.get('profound', 'gap').sentence, api.get('profound', 'builder').sentence);
console.log(`Runtime checks passed for ${Object.keys(bank.entries).length} terms / ${Object.keys(bank.entries).length * 2} sentences.`);
