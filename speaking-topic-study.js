/* Collections retain the vocabulary and exact example sentences in sample answers. */
(() => {
  'use strict';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
  const clean = text => String(text || '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
  const normalize = text => clean(text).toLocaleLowerCase('en').replace(/[’‘]/g, "'");
  function exampleFor(word, variant = 0) {
    const examples = word.sampleExamples || [word.e];
    const index = Math.abs(Math.trunc(Number(variant) || 0)) % Math.max(1, examples.length);
    return examples[index] || word.e || '';
  }
  function answerMarkup(value, words) {
    // Mark the collocations that actually occur in this individual answer.
    const phrases = [...new Set(words.map(word => String(word.w || '').trim()).filter(Boolean))]
      .sort((a, b) => b.length - a.length);
    const raw = String(value || '').replace(/\\*\\*/g, '').replace(/ {2,}/g, '\\n\\n');
    return raw.split(/\\n\\s*\\n/).map(paragraph => {
      const content = paragraph.replace(/\\s+/g, ' ').trim();
      const lower = content.toLocaleLowerCase('en').replace(/[’‘]/g, "'");
      const ranges = [];
      phrases.forEach(phrase => {
        const needle = phrase.toLocaleLowerCase('en').replace(/[’‘]/g, "'");
        const i = lower.indexOf(needle);
        if (i >= 0 && !ranges.some(r => i < r.end && i + needle.length > r.start))
          ranges.push({start: i, end: i + needle.length});
      });
      ranges.sort((a, b) => a.start - b.start);
      let output = '', cursor = 0;
      ranges.forEach(r => {
        output += escape(content.slice(cursor, r.start));
        output += '<mark class="stc-answer-phrase">' + escape(content.slice(r.start, r.end)) + '</mark>';
        cursor = r.end;
      });
      return '<p>' + output + escape(content.slice(cursor)) + '</p>';
    }).join('');
  }
  function create({getBank, getWord = () => null, getGames, getProgress = () => null, onGame, onQuestion, onSpeak}) {
    const collections = new Map(), wordsById = new Map();
    function collect(part, topicIndex) {
      const group = getBank()?.['part' + part]?.[topicIndex];
      if (!group) return null;
      const key = 'speaking-topic:' + part + ':' + topicIndex;
      const cached = collections.get(key);
      if (cached?.source === group) return cached;
      const items = [];
      const byQuestion = [];
      (group.questions || []).forEach((question, questionIndex) => {
        const answer = clean(question.answer);
        const normalAnswer = normalize(answer);
        const questionItems = [];
        const available = (question.cards || []).map(ref => Number.isInteger(ref) ? getWord(ref) : ref).filter(card => card?.w);
        const used = new Set();
        const chosen = [];
        // Include every marked phrase (not a fixed number). Then include any
        // separately listed phrases used in this answer but not bolded.
        for (const match of String(question.answer || '').matchAll(/\*\*([^*]+)\*\*/g)) {
          const phrase = match[1].trim();
          const index = available.findIndex((card, i) => !used.has(i) && normalize(card.w) === normalize(phrase));
          if (index >= 0) { chosen.push(available[index]); used.add(index); }
          else if (phrase) chosen.push({w: phrase, u: 'Tarjimasi hali kiritilmagan'});
        }
        available.forEach((card, index) => {
          if (!used.has(index) && normalAnswer.includes(normalize(card.w))) chosen.push(card);
        });
        chosen.forEach((card, cardIndex) => {
          const ownExample = clean(card.e);
          const sentence = ownExample && normalAnswer.includes(normalize(ownExample)) ? ownExample :
            (answer.match(/[^.!?]+[.!?]+(?:["'”’])?|[^.!?]+$/g) || []).map(clean).find(text => normalize(text).includes(normalize(card.w))) || answer;
          const word = {
            id: key + ':' + (question.id || questionIndex) + ':' + cardIndex,
            w: card.w, u: card.u || '', d: card.d || '', e: sentence, p: card.p || '',
            t: group.title, s: true, sampleAnswerSource: true,
            sampleExamples: [sentence].filter(Boolean),
            sources: [{questionIndex, questionId: question.id, question: question.q, sentence}]
          };
          items.push(word);
          questionItems.push(word);
          wordsById.set(word.id, word);
        });
        byQuestion.push({question, questionIndex, items: questionItems});
      });
      const collection = {key, part, topicIndex, title: group.title, questionCount: group.questions.length, occurrences: items.length, items, byQuestion, source: group};
      collections.set(key, collection);
      return collection;
    }
    function wordById(id) {
      if (wordsById.has(id)) return wordsById.get(id);
      const match = /^speaking-topic:([123]):(\d+):/.exec(String(id));
      if (match) collect(Number(match[1]), Number(match[2]));
      return wordsById.get(id);
    }
    function sourceMarkup(source, part, topicIndex) {
      return '<li><p class="stc-question">' + (source.questionIndex + 1) + '. ' + escape(source.question) + '</p><blockquote>' + escape(source.sentence) + '</blockquote><button type="button" class="stc-source-open" data-stc-question="' + source.questionIndex + '" data-part="' + part + '" data-topic="' + topicIndex + '">Sample answerni ochish →</button></li>';
    }
    function questionMarkup(collection) {
      const questions = collection.byQuestion.map(({question, questionIndex, items}) => {
        const answer = answerMarkup(question.answer, items);
        return '<article class="stc-qa-card"><h4><span>' + String(questionIndex + 1).padStart(2, '0') +
          '</span> ' + escape(question.q) + '</h4><div class="stc-sample-label">SAMPLE ANSWER</div>' +
          '<div class="stc-sample-answer" lang="en">' + answer + '</div><h5>Shu javobdagi barcha ' + items.length +
          ' ta collocation</h5><ol class="stc-question-phrases">' + items.map(item =>
            '<li><strong lang="en">' + escape(item.w) + '</strong><span>' + escape(item.u) + '</span></li>'
          ).join('') + '</ol></article>';
      }).join('');
      return '<section class="stc-questions"><h3>Barcha ' + collection.questionCount +
        ' ta savol va sample answer</h3>' + questions + '</section>' +
        '<h2 class="stc-collection-title">Topicdagi barcha sample answer collocationlari</h2>' +
        '<p class="stc-collection-note">Har bir savolning iboralari alohida saqlangan. Takrorlangan iboralar ham aynan ishlatilgan savoli uchun hisobga olinadi. Hech qanday sonli limit yo‘q.</p>';
    }
    function render(part, topicIndex) {
      const collection = collect(part, topicIndex);
      if (!collection) return '';
      const {items, title, questionCount} = collection;
      return '<section class="stc-section" data-study-part="' + part + '" data-study-topic="' + topicIndex + '" aria-labelledby="stc-title"><div class="stc-heading"><div><span>PART ' + part + ' · SAMPLE ANSWER COLLOCATIONS</span><h2 id="stc-title">' + escape(title) + ' · Collocation to‘plami</h2><p>Shu topicdagi barcha ' + questionCount + ' ta savol, ularning sample answerlari va har bir javobdagi barcha collocationlar.</p></div><b>' + items.length + ' ta ibora</b></div>' + questionMarkup(collection) +
        '<h3 class="stc-games-title">Barcha ' + items.length + ' ta iborani 7 o‘yinda o‘rganing</h3><div class="games-grid stc-games">' + getGames().map(game => {
          const progress = getProgress(collection, game[0]);
          return '<button type="button" class="game-tile ' + game[4] + '" data-stc-game="' + game[0] + '" data-part="' + part + '" data-topic="' + topicIndex + '"' + (!items.length ? ' disabled' : '') + '><span class="game-icon" aria-hidden="true">' + game[3] + '</span><strong>' + escape(game[1]) + '</strong><small>' + escape(game[2]) + '</small><span class="game-count">' + (progress ? 'Davom ettirish: ' + Math.min(progress.idx, items.length) + ' / ' + items.length : items.length + ' ta ibora') + '</span></button>';
        }).join('') + '</div><p class="stc-game-note">Gapli mashqlarda aynan shu sample answerlardagi gaplar ishlatiladi.</p><div class="stc-cards">' + items.map((word, index) =>
          '<article class="stc-card" data-collocation-id="' + escape(word.id) + '"><div class="stc-card-top"><span>' + String(index + 1).padStart(2, '0') + '</span><button type="button" class="stc-speak" data-stc-speak="' + escape(word.id) + '" aria-label="' + escape(word.w) + ' talaffuzi">🔊 Eshitish</button></div><h3 lang="en">' + escape(word.w) + '</h3><p class="stc-meaning">' + escape(word.u) + '</p><small class="stc-example-label">SAMPLE ANSWERDAGI GAP</small><blockquote lang="en">' + escape(word.e) + '</blockquote><details class="stc-sources"><summary>' + word.sources.length + ' ta savolda ishlatilgan · Sample answerlar</summary><ol>' + word.sources.map(source => sourceMarkup(source, part, topicIndex)).join('') + '</ol></details></article>'
        ).join('') + '</div></section>';
    }
    function mount(host) {
      host.querySelectorAll('[data-stc-game]').forEach(button => button.addEventListener('click', () => {
        const collection = collect(Number(button.dataset.part), Number(button.dataset.topic));
        if (collection?.items.length && getGames().some(game => game[0] === button.dataset.stcGame)) onGame(button.dataset.stcGame, collection);
      }));
      host.querySelectorAll('[data-stc-question]').forEach(button => button.addEventListener('click', () => onQuestion(Number(button.dataset.part), Number(button.dataset.topic), Number(button.dataset.stcQuestion))));
      host.querySelectorAll('[data-stc-speak]').forEach(button => button.addEventListener('click', () => {
        const word = wordById(button.dataset.stcSpeak);
        if (word) onSpeak(word.w);
      }));
    }
    return {collect, wordById, render, mount};
  }
  window.SpeakingTopicStudy = {create, exampleFor};
})();
