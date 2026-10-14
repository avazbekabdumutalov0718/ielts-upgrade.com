/* Original, reviewed exercise sentences. Source passages are never a fallback. */
(function (root) {
  'use strict';
  const VERSION = 'original-practice-v1';
  const BANK_URL = '/practice-sentences/bank.json?v=' + VERSION;
  let bank = null, pending = null;

  function normalize(value) {
    return String(value ?? '').normalize('NFC').toLowerCase()
      .replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();
  }
  function termOf(entry) {
    return typeof entry === 'string' ? entry : entry?.w || entry?.term || entry?.word || '';
  }
  function expression(term) {
    const pattern = String(term).normalize('NFC').trim().split(/\s+/).map(part =>
      part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[‘’']/g, "[‘’']")
    ).join('\\s+');
    return new RegExp('(?<![\\p{L}\\p{N}_’\'−-])' + pattern + '(?![\\p{L}\\p{N}_’\'−-])', 'giu');
  }
  function mask(sentence, term) {
    if (!String(term || '').trim()) return '';
    sentence = String(sentence || '').normalize('NFC');
    const matches = [...sentence.matchAll(expression(term))];
    if (matches.length !== 1) return '';
    const match = matches[0];
    return sentence.slice(0, match.index) + '_____' + sentence.slice(match.index + match[0].length);
  }
  function install(data) {
    if (!data || data.version !== VERSION || !data.entries || typeof data.entries !== 'object') {
      throw new Error('Practice sentence bank has an unsupported format.');
    }
    bank = data;
    return data;
  }
  async function load() {
    if (bank) return bank;
    if (!pending) pending = fetch(BANK_URL).then(response => {
      if (!response.ok) throw new Error('Practice sentence bank could not be loaded.');
      return response.json();
    }).then(install).catch(error => { pending = null; throw error; });
    return pending;
  }
  function get(entry, purpose = 'gap') {
    const term = termOf(entry), key = normalize(term);
    const row = bank && Object.hasOwn(bank.entries, key) ? bank.entries[key] : null;
    if (!row) return null;
    const sentence = row[purpose === 'builder' || purpose === 'sentence' ? 'builder' : 'gap'];
    const masked = mask(sentence, term);
    if (!masked) return null;
    return { sentence, masked, answer: term,
      tokens: sentence.split(/\s+/).map((text, id) => ({ text, id })) };
  }
  function missing(entries) {
    return [...new Set(entries.filter(entry => !get(entry, 'gap') || !get(entry, 'builder')).map(termOf))];
  }
  const api = Object.freeze({ version: VERSION, load, get, missing, mask, normalize });
  root.VividPracticeSentences = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = { ...api, install };
})(typeof window !== 'undefined' ? window : globalThis);
