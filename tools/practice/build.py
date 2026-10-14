"""Build the client bank only from checked source rows. Release is coverage-gated."""
import argparse
import collections
import hashlib
import json
import sys
from inventory import ROOT, collect, norm
from quality import Validator

VERSION = 'original-practice-v1'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--preview', action='store_true', help='Explicitly permit an incomplete development bank.')
    args = parser.parse_args()
    inventory, protected, records = collect()
    known = {x['key']: x for x in inventory}
    check = Validator(protected)
    entries, failures = {}, []
    source = ROOT / 'practice-sentences/source/reviewed.json'
    rows = json.loads(source.read_text())
    for row in rows:
        key = norm(row['term'])
        errors = check.check(row)
        if key not in known:
            errors.append('term_not_in_inventory')
        if key in entries:
            errors.append('duplicate_term')
        if errors:
            failures.append(dict(term=row['term'], errors=errors))
        else:
            entries[key] = {slot: row[slot] for slot in ('gap', 'builder')}
    missing = [x['term'] for x in inventory if x['key'] not in entries]
    groups = {}
    for row in records:
        stat = groups.setdefault(row['group'], {'records': 0, 'covered_records': 0})
        stat['records'] += 1
        stat['covered_records'] += row['key'] in entries
    report = dict(version=VERSION, total_terms=len(inventory), covered_terms=len(entries),
                  sentences=len(entries)*2, missing_terms=len(missing),
                  complete=not missing and not failures, failures=failures, groups=groups,
                  semantic_review='Authored seed inspected individually; no claim of automated semantic proof.',
                  scope='Word/collocation/form inventory plus dictionaries; excludes full essay expressions.',
                  source_sha256=hashlib.sha256(source.read_bytes()).hexdigest())
    out = ROOT / 'practice-sentences/generated'
    out.mkdir(parents=True, exist_ok=True)
    (out / 'coverage.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
    (out / 'missing.json').write_text(json.dumps(missing, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps({k: v for k, v in report.items() if k not in ('groups', 'source_sha256')}, ensure_ascii=False))
    if failures or (missing and not args.preview):
        sys.exit(1)
    bank = dict(version=VERSION, complete=report['complete'], entries=entries)
    (ROOT / 'practice-sentences/bank.json').write_text(json.dumps(bank, ensure_ascii=False, separators=(',', ':'))+'\n')


if __name__ == '__main__':
    main()
