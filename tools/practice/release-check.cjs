// Production must never accidentally publish the intentionally partial seed.
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file)));
const coverage = read('practice-sentences/generated/coverage.json');
const bank = read('practice-sentences/bank.json');
const source = fs.readFileSync(path.join(root, 'practice-sentences/source/reviewed.json'));
const hash = crypto.createHash('sha256').update(source).digest('hex');
if (hash !== coverage.source_sha256 || coverage.failures.length ||
    Object.keys(bank.entries).length !== coverage.covered_terms) {
  throw new Error('Stale or invalid practice bank. Rebuild and validate it before deployment.');
}
if (process.env.VERCEL_ENV === 'preview') {
  console.log(`Preview only: ${coverage.covered_terms}/${coverage.total_terms} terms have original sentences.`);
} else if (!coverage.complete || !bank.complete || coverage.missing_terms !== 0) {
  throw new Error(`Production blocked: ${coverage.missing_terms} terms still need original, reviewed sentences.`);
} else {
  console.log(`Production coverage: ${coverage.covered_terms} terms, ${coverage.sentences} distinct sentences.`);
}
