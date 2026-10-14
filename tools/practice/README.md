# Original practice sentences — unfinished corpus, draft integration

The former `unique-game-contexts.js` attempted to replace functions hidden inside
the main application's closure. That could not affect the games. Articles also
selected exercise sentences from the source passage, and their Sentence Builder
only reordered the collocation itself.

This branch explicitly connects the main games (including Speaking Words,
Speaking topics, Writing, saved Reading words, Topic 100, daily packs and mocks),
MAX Speaking, and Articles to one authored sentence bank. Articles no longer
receive passage text as an exercise-sentence input. The gap and builder sentences
are different. Matching, translation and spelling exercises keep their existing
mechanics. A missing sentence is never synthesized with a generic template or
copied from `e`, `examples`, or a sample answer.

## Current content status

Only **46 terms / 92 sentences** have been individually authored and inspected.
This includes the first 30 main vocabulary cards, all 15 collocations in Article
001, and `profound` from the reported screenshot. Full inventory coverage is
**39,282 distinct terms**, so **39,236 terms remain**. The bank is deliberately
marked `complete: false`. Do not merge or deploy it to production yet.

The inventory includes main, Speaking, Writing, Articles, MAX banks, Topic 100,
mock vocabulary, C1 lists, nominal word forms and all dictionary keys. Duplicate
keys share one original pair. Different senses of the same key may require a
later explicit sense split; conflicting meanings must be reviewed before release.
Essay-sized expression strings are not treated as word/collocation answers.
Personal words added later can be absent from this repository inventory.

Malformed source terms such as `ordinary rapidly working` remain visible in the
inventory. They must be corrected editorially in their source collections and
recounted. They are not silently discarded or forced into nonsense sentences.

## Rebuild and check

```sh
python3 tools/practice/inventory.py
python3 tools/practice/build.py --preview
python3 tools/practice/test-quality.py
node tools/practice/test-runtime.cjs
node --check app.js
node --check article-games-experience.js
```

With Playwright and Chromium installed, `node tools/practice/test-browser.cjs`
starts its own localhost server and tests the first main pack and Article 001.
`PRACTICE_PLAYWRIGHT` and `PRACTICE_CHROMIUM_BIN` can point to existing test
installations. The test substitutes only the localhost cloud adapter, uses empty
test storage, blocks external requests, and never logs into or changes an account.
Verified on this branch: all seven main modes, all seven Article modes, correct
answers, full-sentence building, versioned progress/resume, missing-content
handling, and no page JavaScript errors. This is a check of the seed and game
integration, not of the unfinished 39,236-term corpus.

`build.py` without `--preview` is the release gate. It fails for missing terms,
missing targets, target matches within other words, duplicate sentences, identical
frames with the target swapped, fragments, metalinguistic examples, and copied
source sentences or nine-word spans. Sentences must be 12–28 words and contain
the exact answer once. These checks do **not** prove grammatical or semantic
perfection: every generated pair also requires editorial review.

The runtime accepts apostrophe variants, protects word boundaries, retains
punctuation, and assigns a distinct token ID to each occurrence of a repeated
word. Correct solutions are compared by text rather than rejecting interchangeable
identical word tokens. New sentence sessions are versioned separately.

## Bulk authoring preparation

`author.py` defaults to a dry run. It builds a cost estimate from the current AI
Gateway model catalog and sends no completion requests. It submits no article
text. Generated sentences receive an independent editorial pass, structural
validation, and checkpoints. Rejected or ambiguous entries stay in a review queue.

No paid requests have been made. No API key was available when preparing this
branch. An approved budget and an environment-supplied `AI_GATEWAY_API_KEY` are
needed before using `--run`. Never put credentials in source, JSON, a browser,
or chat. Job checkpoints must be outside this publicly served static repository.

```sh
python3 tools/practice/author.py
# Only after a budget is explicitly approved and a key is configured securely:
python3 tools/practice/author.py --run --budget-usd 50 \
  --work-dir /private/path/practice-job --max-batches 1
```

The first paid batch is intentionally small. Inspect its acceptance and rejection
files before increasing the batch limit. The ledger reserves each request's
maximum token cost before sending it; uncertain or failed requests retain their
reservation. Completed usage releases only the unused reservation, without
assuming cache discounts. Stop on unexpected billing or output formats. A timeout
is not automatically retried because it may already have been billed.

Accepted checkpoints are still drafts until their meaning and any cross-source
sense conflicts have been reviewed. Add approved rows to `source/reviewed.json`,
resolve source OCR errors, rebuild the full bank, rerun quality/runtime/browser
checks, and only then clear the draft state. Current estimates are assumptions,
not a promise about final cost or completion time.
