"""Rebuild the practice inventory from the actual repository; no UI counters.

Sentence expressions from essays are indexed separately, because they are not
word/collocation answers. No source example is used as a generated exercise.
"""
import collections
import hashlib
import json
import pathlib
import re
import subprocess
import unicodedata

ROOT = pathlib.Path(__file__).resolve().parents[2]


def norm(value):
    return re.sub(r'\s+', ' ', unicodedata.normalize('NFC', str(value)).lower()
                  .replace('’', "'").replace('‘', "'")).strip()


def read(name):
    return json.loads((ROOT / name).read_text())


def collect():
    embedded = json.loads(subprocess.check_output(
        ['node', str(ROOT / 'tools/practice/extract-literals.cjs')], text=True))
    rows = []
    protected = []
    def add(term, meaning, group, source, pointer, definition='', category='word'):
        if not str(term).strip():
            raise ValueError(f'Empty term: {source}:{pointer}')
        rows.append(dict(term=term, key=norm(term), meaning=meaning,
                         definition=definition, group=group, source=source,
                         pointer=pointer, category=category))
    def cards(items, group, source, pointer):
        for i, c in enumerate(items):
            add(c.get('w', c.get('term', c.get('word'))),
                c.get('u', c.get('uz', c.get('def', ''))), group, source,
                f'{pointer}[{i}]', c.get('d', ''))
            for example in [c.get('e', ''), c.get('example', ''), *c.get('examples', [])]:
                if example:
                    protected.append(str(example))
    cards(read('data.json'), 'main', 'data.json', '')
    for part, files in read('speaking-chunks.json').items():
        for filename in files:
            for ti, t in enumerate(read(filename)):
                for qi, q in enumerate(t['questions']):
                    cards(q['cards'], part, filename, f'[{ti}].questions[{qi}].cards')
                    for name in ('answer', 'sample', 'sampleAnswer'):
                        if isinstance(q.get(name), str):
                            protected.append(q[name])
    for i, a in enumerate(read('articles-data.json')['articles']):
        cards(a['collocations'], 'articles', 'articles-data.json', f'articles[{i}].collocations')
        protected.extend(a['body'])
    for ti, t in enumerate(embedded['maxBank']['value']['topics']):
        for ci, c in enumerate(t['entries']):
            cards([c], 'max_' + c['kind'].lower(), 'app.js',
                  f'maxSpeakingBank.topics[{ti}].entries[{ci}]')
    writing = read('writing-data.json')
    for ti, t in enumerate(writing['collocationTopics']):
        cards(t['cards'], 'writing', 'writing-data.json', f'collocationTopics[{ti}].cards')
    for ti, t in enumerate(writing['lizIdeas']):
        for ci, term in enumerate(t['vocab']):
            add(term, '', 'writing_ideas', 'writing-data.json', f'lizIdeas[{ti}].vocab[{ci}]')
    for ti, t in enumerate(read('topic-lab.json')):
        for tense, answer in t['answers'].items():
            cards([c for c in answer['cards'] if isinstance(c, dict)], 'topic100',
                  'topic-lab.json', f'[{ti}].answers.{tense}.cards')
    for qi, q in enumerate(read('mock-analysis-health-sleep.json')['questions']):
        cards(q['cards'], 'mock', 'mock-analysis-health-sleep.json', f'questions[{qi}].cards')
    for f in embedded['c1']:
        cards(f['value'], 'reading_c1', f['file'], 'C1_WORDS')
    for i, pair in enumerate(read('grammar-content.json')['nominalForms']):
        for j, term in enumerate(pair):
            add(term, '', 'grammar_forms', 'grammar-content.json', f'nominalForms[{i}][{j}]')
    for group, filename, field in [
        ('reading_lexicon', 'reading-lexicon.json', 'words'),
        ('reading_verified', 'reading-lexicon.json', 'verified'),
        ('reading_translations', 'reading-translations.json', 'words'),
        ('articles_glossary', 'articles-glossary.json', 'translations'),
    ]:
        for term, meaning in read(filename)[field].items():
            add(term, meaning, group, filename, f'{field}[{json.dumps(term)}]')
    for term, meaning in embedded['articleCore']['value'].items():
        add(term, meaning, 'articles_core', 'articles-engine.js', 'ARTICLE_CORE_TRANSLATIONS')
    for term, meaning in embedded['readingHints']['value']:
        add(term, meaning, 'reading_hints', 'app.js', 'rbWordHints')
    by_term = collections.defaultdict(list)
    for r in rows:
        by_term[r['key']].append(r)
    inventory = []
    for key, occurrences in sorted(by_term.items()):
        term = occurrences[0]['term']
        issues = []
        if not re.search(r'[a-zA-Z]', term):
            issues.append('no_english_letters')
        if len(term.split()) > 12 or len(term) > 120:
            issues.append('sentence_or_ocr_fragment')
        if re.search(r'[\[\]{}<>]|\(.*\)|[.!?;:]\s+\S', term):
            issues.append('notation_or_sentence_boundary')
        inventory.append(dict(
            key=key, term=term,
            meanings=list(dict.fromkeys(str(r['meaning']) for r in occurrences if r['meaning'])),
            definitions=list(dict.fromkeys(r['definition'] for r in occurrences if r['definition'])),
            groups=sorted(set(r['group'] for r in occurrences)),
            occurrences=len(occurrences), issues=issues,
            sources=[dict(source=r['source'], pointer=r['pointer']) for r in occurrences],
        ))
    return inventory, protected, rows


if __name__ == '__main__':
    items, _, rows = collect()
    target = ROOT / 'practice-sentences/generated/inventory.json'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(items, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'records': len(rows), 'terms': len(items),
                      'flagged_terms': sum(bool(x['issues']) for x in items)}))
