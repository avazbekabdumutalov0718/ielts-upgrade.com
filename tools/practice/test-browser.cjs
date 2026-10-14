/* Local browser integration test. No real accounts, credentials, or remote writes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { chromium } = require(process.env.PRACTICE_PLAYWRIGHT || 'playwright');
const root = path.resolve(__dirname, '../..');
const read = f => JSON.parse(fs.readFileSync(path.join(root, f)));
const words = read('data.json');
const bank = read('practice-sentences/bank.json');
const article = read('articles-data.json').articles[0];
const normalize = v => v.toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();
const escaped = v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const url = 'http://127.0.0.1:8765/';

(async () => {
  const server = spawn('python3', ['-u', '-m', 'http.server', '8765', '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  process.on('exit', () => server.kill());
  let browser;
  try {
    for (let i = 0; i < 50; i++) {
      try { await fetch(url); break; } catch { await new Promise(r => setTimeout(r, 100)); }
    }
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'],
      ...(process.env.PRACTICE_CHROMIUM_BIN ? { executablePath: process.env.PRACTICE_CHROMIUM_BIN } : {}) });
    const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, serviceWorkers: 'block' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', async route => {
      const request = new URL(route.request().url());
      if (request.hostname !== '127.0.0.1') return route.fulfill({ status: 200, body: '' });
      if (['/supabase-loader.js', '/supabase-config.js', '/pwa.js'].includes(request.pathname)) {
        return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
      }
      if (request.pathname === '/cloud.js') return route.fulfill({ status: 200, contentType: 'application/javascript', body:
        `window.VocabCloud={key:k=>k,setProvider:()=>{},queue:()=>{},start:async fn=>{document.body.classList.remove('cloud-locked');document.getElementById('cloudGate').remove();await fn({mode:'local'});}};` });
      return route.continue();
    });
    let navigation = 0;
    async function openPack(mode) {
      await page.goto(url + '?practice-test=' + (++navigation) + '#all');
      await page.locator('[data-action="pack-games"][data-index="0"]').first().click();
      await page.locator(`[data-action="start-pack-game"][data-mode="${mode}"]`).click();
      await page.waitForSelector('.game-stage');
      const session = await page.evaluate(mode => Object.values(JSON.parse(localStorage.getItem('vocab-atlas-sessions-v2') || '{}')).find(s => s.mode === mode), mode);
      return words[session.order[session.idx]];
    }
    for (const mode of ['flash', 'mcq', 'pairs', 'gap', 'rush', 'typing', 'sentence']) {
      const word = await openPack(mode), row = bank.entries[normalize(word.w)];
      assert.ok(row);
      if (mode === 'flash') {
        await page.locator('.game-card [data-action="flip"]').click();
        assert.ok((await page.locator('.game-card').innerText()).includes(row.gap));
        await page.locator('[data-action="flash-grade"][data-value="known"]').click();
      } else if (mode === 'pairs') {
        const id = await page.locator('[data-action="pair"][data-side="left"]').first().getAttribute('data-id');
        await page.locator(`[data-action="pair"][data-side="left"][data-id="${id}"]`).click();
        await page.locator(`[data-action="pair"][data-side="right"][data-id="${id}"]`).click();
        assert.equal(await page.locator('.pair.matched').count(), 2);
      } else if (mode === 'sentence') {
        const expected = row.builder.split(/\s+/);
        assert.deepEqual((await page.locator('.sentence-tokens .token').allTextContents()).sort(), [...expected].sort());
        for (const token of expected) await page.locator('.sentence-tokens .token').filter({ hasText: new RegExp('^' + escaped(token) + '$') }).first().click();
        await page.locator('[data-action="check-sentence"]').click();
        assert.match(await page.locator('#feedback').innerText(), /To‘g‘ri!/);
      } else if (mode === 'gap' || mode === 'typing') {
        const prompt = await page.locator('.quiz-word').innerText();
        assert.ok(prompt.includes('_____'));
        assert.equal(await page.evaluate(w => window.VividPracticeSentences.get(w, 'gap').sentence, word), row.gap);
        await page.locator('#gameAnswer').fill(word.w);
        await page.locator('[data-action="check-input"]').click();
        assert.match(await page.locator('#feedback').innerText(), /To‘g‘ri!/);
      } else {
        const labels = await page.locator('.choice').allTextContents();
        const answer = labels.includes(word.u) ? word.u : word.w;
        await page.locator('.choice').filter({ hasText: new RegExp('^' + escaped(answer) + '$') }).click();
        assert.match(await page.locator('#feedback').innerText(), /To‘g‘ri!/);
      }
      console.log('Main game passed:', mode);
    }
    // Wait for the answer's existing advance timer, then verify resume uses its
    // new context version and keeps the correct score and place.
    await page.waitForFunction(() => Object.values(JSON.parse(localStorage.getItem('vocab-atlas-sessions-v2'))).some(s => s.mode === 'sentence' && s.idx === 1 && s.correct === 1));
    await openPack('sentence');
    assert.match(await page.locator('.game-head-actions').innerText(), /1 to‘g‘ri/);

    for (let mode = 0; mode < 7; mode++) {
      await page.evaluate(async ({ mode, entries }) => {
        window.VividArticleGames.dispose();
        const host = document.getElementById('mainContent');
        host.innerHTML = '<section id="article-test"><div class="ar-games-heading"></div><div class="ar-game-grid"></div><div id="ar-game-play" hidden></div></section>';
        window.articleTestState = {};
        await window.VividArticleGames.launch({ mode, section: document.getElementById('article-test'), entries,
          paragraphs: ['This deliberately unusable source paragraph must never appear in any exercise.'],
          getState: () => window.articleTestState, setState: value => { window.articleTestState = value; } });
      }, { mode, entries: article.collocations });
      const word = article.collocations[0], row = bank.entries[normalize(word.w)];
      assert.equal(await page.locator('.ar-game-screen').count(), 1);
      if (mode === 0) {
        await page.locator('#ar-flash-card').click();
        assert.ok((await page.locator('.ar-flash-description').innerText()).includes(row.gap));
        await page.locator('#ar-flash-know').click();
      } else if (mode === 2) {
        const id = await page.locator('[data-left]').first().getAttribute('data-left');
        await page.locator(`[data-left="${id}"]`).click();
        await page.locator(`[data-right="${id}"]`).click();
        assert.match(await page.locator('#ar-pair-counter').innerText(), /1 \/ /);
      } else if (mode === 3 || mode === 5) {
        if (mode === 3) assert.equal(await page.locator('.ar-question-text').innerText(), await page.evaluate(w => window.VividPracticeSentences.get(w, 'gap').masked, word));
        await page.locator('#ar-game-input').fill(word.w);
        await page.locator('#ar-game-form button').click();
        assert.match(await page.locator('#ar-play-feedback').innerText(), /To‘g‘ri!/);
      } else if (mode === 6) {
        const tokens = row.builder.split(/\s+/);
        assert.equal(await page.locator('[data-token]').count(), tokens.length);
        for (let i = 0; i < tokens.length; i++) await page.locator(`[data-token="${i}"]`).click();
        await page.locator('#ar-builder-check').click();
        assert.match(await page.locator('#ar-play-feedback').innerText(), /To‘g‘ri!/);
      } else {
        const labels = await page.locator('.ar-choice-option').allTextContents();
        const answer = labels.includes(word.u) ? word.u : word.w;
        await page.locator('.ar-choice-option').filter({ hasText: new RegExp('^' + escaped(answer) + '$') }).click();
        assert.match(await page.locator('#ar-play-feedback').innerText(), /To‘g‘ri!/);
      }
      const saved = await page.evaluate(() => window.articleTestState);
      assert.equal(saved.correct, 1);
      assert.equal(saved.contextVersion, 'original-practice-v1');
      assert.ok(!((await page.locator('#mainContent').innerText()).includes('deliberately unusable')));
      console.log('Article game passed:', mode);
    }
    // Unknown terms remain visible as unavailable, never replaced by source text.
    await page.evaluate(async () => {
      window.VividArticleGames.dispose();
      await window.VividArticleGames.launch({ mode: 3, section: document.getElementById('article-test'),
        entries: [{w:'unreviewed term',u:'test',e:'An old article sentence with an unreviewed term.'}] });
    });
    assert.match(await page.locator('#ar-game-play').innerText(), /yangi gaplar hali tayyor emas/);
    assert.deepEqual(errors, []);
    console.log('14 game flows, sentence-session resume, missing-content handling and console checks passed.');
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
