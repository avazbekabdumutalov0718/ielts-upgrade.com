(() => {
  'use strict';

  const VERSION = 'v1-2026-10-05';
  const DONE_KEY = 'vivid-listening-shadowing-done-v1';
  const PREF_KEY = 'vivid-listening-shadowing-captions-v1';

  let dialog = null;
  let shadowFrame = null;
  let shadowTimer = null;
  let shadowTime = 0;
  let shadowRate = 1;
  let shadowCaptions = true;
  let current = null;

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
    }[ch]));
  }

  function youtubeId(url) {
    const raw = String(url || '').trim();
    const m = raw.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{6,})/i);
    if (m) return m[1];
    try {
      const u = new URL(raw);
      return u.searchParams.get('v') || '';
    } catch {
      return '';
    }
  }

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return value && typeof value === 'object' ? value : fallback;
    } catch {
      return fallback;
    }
  }

  function doneMap() {
    return readJson(DONE_KEY, {});
  }

  function captionMap() {
    return readJson(PREF_KEY, {});
  }

  function isDone(url) {
    return !!doneMap()[youtubeId(url)];
  }

  function setDone(url, value) {
    const id = youtubeId(url);
    if (!id) return;
    const map = doneMap();
    if (value) map[id] = new Date().toISOString();
    else delete map[id];
    try { localStorage.setItem(DONE_KEY, JSON.stringify(map)); } catch {}
  }

  function getCaptionPref(url) {
    const id = youtubeId(url);
    const map = captionMap();
    return map[id] !== false;
  }

  function setCaptionPref(url, on) {
    const id = youtubeId(url);
    if (!id) return;
    const map = captionMap();
    map[id] = !!on;
    try { localStorage.setItem(PREF_KEY, JSON.stringify(map)); } catch {}
  }

  function context() {
    const root = document.getElementById('mainContent');
    if (!root) return null;

    const source = root.querySelector('.lb-video-source[href]');
    if (!source) return null;

    const id = youtubeId(source.href);
    if (!id) return null;

    const panel = source.closest('.lb-panel') || root.querySelector('.lb-panel');
    const title = panel?.querySelector('h2')?.textContent?.trim() || 'Core Listening';
    const channel = panel?.querySelector('h2 + p')?.textContent?.trim() || 'VIVID IELTS';

    return {
      url: source.href,
      id,
      title,
      channel
    };
  }

  function pauseCoreAudio() {
    const frame = document.getElementById('lbAudioFrame');
    if (!frame?.contentWindow) return;
    try {
      frame.contentWindow.postMessage(JSON.stringify({
        event:'command',
        func:'pauseVideo',
        args:[]
      }), '*');
    } catch {}
  }

  function embedUrl(ctx, start = 0, autoplay = false) {
    const params = new URLSearchParams({
      enablejsapi:'1',
      playsinline:'1',
      rel:'0',
      modestbranding:'1',
      cc_load_policy: shadowCaptions ? '1' : '0',
      cc_lang_pref:'en',
      hl:'en',
      start:String(Math.max(0, Math.floor(start || 0))),
      autoplay:autoplay ? '1' : '0',
      origin:location.origin
    });
    return 'https://www.youtube.com/embed/' + encodeURIComponent(ctx.id) + '?' + params.toString();
  }

  function send(func, args = []) {
    if (!shadowFrame?.contentWindow) return false;
    try {
      shadowFrame.contentWindow.postMessage(JSON.stringify({
        event:'command',
        func,
        args
      }), '*');
      return true;
    } catch {
      return false;
    }
  }

  function applyCaptionCommand() {
    if (!shadowFrame) return;
    if (shadowCaptions) {
      send('loadModule', ['captions']);
      setTimeout(() => {
        send('setOption', ['captions', 'track', {languageCode:'en'}]);
      }, 120);
    } else {
      send('unloadModule', ['captions']);
    }
  }

  function initPlayer() {
    if (!shadowFrame) return;
    try {
      shadowFrame.contentWindow.postMessage(JSON.stringify({
        event:'listening',
        id:'vivid-listening-shadowing'
      }), '*');
    } catch {}

    clearInterval(shadowTimer);
    shadowTimer = setInterval(() => send('getCurrentTime'), 500);

    setTimeout(() => {
      send('setPlaybackRate', [shadowRate]);
      applyCaptionCommand();
    }, 450);
  }

  function setFrameAt(time, autoplay = true) {
    if (!current || !shadowFrame) return;
    shadowTime = Math.max(0, Number(time) || 0);
    shadowFrame.src = embedUrl(current, shadowTime, autoplay);
    setTimeout(initPlayer, 500);
  }

  function formatTime(sec) {
    sec = Math.max(0, Math.floor(Number(sec) || 0));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m + ':' + String(s).padStart(2, '0');
  }

  function updateTime() {
    const el = dialog?.querySelector('[data-shadow-time]');
    if (el) el.textContent = formatTime(shadowTime);
  }

  function updateCaptionButton() {
    const btn = dialog?.querySelector('[data-shadow-captions]');
    if (!btn) return;
    btn.classList.toggle('is-on', shadowCaptions);
    btn.textContent = shadowCaptions ? 'CC Captions ON' : 'CC Captions OFF';
    btn.setAttribute('aria-pressed', String(shadowCaptions));
  }

  function updateRateButtons() {
    dialog?.querySelectorAll('[data-shadow-rate]').forEach(btn => {
      btn.classList.toggle('active', Number(btn.dataset.shadowRate) === shadowRate);
    });
  }

  function updateDoneButtons() {
    const done = current ? isDone(current.url) : false;
    const ctx = context();
    if (ctx) {
      document.querySelectorAll('[data-shadow-open]').forEach(btn => {
        const d = isDone(ctx.url);
        btn.classList.toggle('shadow-done', d);
        if (btn.classList.contains('lb-shadow-tab')) btn.innerHTML = d ? '🎙 Shadowing ✓' : '🎙 Shadowing';
        else btn.textContent = d ? '🎙 Shadowing ✓' : '🎙 Shadowing';
      });
    }
    const complete = dialog?.querySelector('[data-shadow-complete]');
    if (complete) {
      complete.classList.toggle('is-done', done);
      complete.textContent = done ? '✓ Shadowing tugallangan' : 'Shadowingni tugatdim ✓';
    }
  }

  function ensureDialog() {
    if (dialog && document.body.contains(dialog)) return dialog;

    dialog = document.createElement('dialog');
    dialog.id = 'vividShadowingDialog';
    dialog.className = 'lb-shadow-dialog';
    dialog.innerHTML = '<div class="lb-shadow-shell"></div>';
    document.body.appendChild(dialog);

    dialog.addEventListener('close', cleanupPlayer);
    dialog.addEventListener('cancel', cleanupPlayer);
    dialog.addEventListener('click', event => {
      if (event.target === dialog) dialog.close();
    });

    return dialog;
  }

  function cleanupPlayer() {
    clearInterval(shadowTimer);
    shadowTimer = null;
    if (shadowFrame) {
      try { send('pauseVideo'); } catch {}
      try { shadowFrame.src = 'about:blank'; } catch {}
    }
    shadowFrame = null;
    shadowTime = 0;
  }

  function renderDialog(ctx) {
    current = ctx;
    shadowTime = 0;
    shadowRate = 1;
    shadowCaptions = getCaptionPref(ctx.url);

    const d = ensureDialog();
    const shell = d.querySelector('.lb-shadow-shell');
    shell.innerHTML = `
      <header class="lb-shadow-head">
        <div>
          <span class="lb-shadow-kicker">VIVID IELTS · CORE LISTENING</span>
          <h2>🎙 Shadowing · ${esc(ctx.title)}</h2>
          <p>${esc(ctx.channel)} · Videoni eshiting va speaker bilan bir vaqtda ovoz chiqarib takrorlang.</p>
        </div>
        <button type="button" class="lb-shadow-close" data-shadow-close aria-label="Yopish">×</button>
      </header>

      <section class="lb-shadow-guide">
        <div><b>1</b><span>Avval 1 marta oddiy tinglang</span></div>
        <div><b>2</b><span>Captions ON bilan birga takrorlang</span></div>
        <div><b>3</b><span>5 soniya ortga qaytib qiyin joyni qaytaring</span></div>
        <div><b>4</b><span>Captions OFF qilib yana shadowing qiling</span></div>
      </section>

      <div class="lb-shadow-video-wrap">
        <iframe
          id="lbShadowVideo"
          class="lb-shadow-video"
          src="${esc(embedUrl(ctx, 0, false))}"
          title="Shadowing video — ${esc(ctx.title)}"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowfullscreen
          referrerpolicy="strict-origin-when-cross-origin"></iframe>
      </div>

      <div class="lb-shadow-caption-note">
        <span>💬</span>
        <div>
          <strong>Ketma-ket captions</strong>
          <p>YouTube English captions video bilan birga real vaqtda chiqadi. Shu videoda YouTube caption mavjud bo‘lsa, ular avtomatik yoqiladi.</p>
        </div>
        <button type="button" class="lb-shadow-caption-toggle" data-shadow-captions aria-pressed="true">CC Captions ON</button>
      </div>

      <div class="lb-shadow-controls">
        <div class="lb-shadow-main-controls">
          <button type="button" data-shadow-control="play">▶ Play</button>
          <button type="button" data-shadow-control="pause">Ⅱ Pause</button>
          <button type="button" data-shadow-control="back">↶ 5s</button>
          <button type="button" data-shadow-control="forward">5s ↷</button>
          <button type="button" data-shadow-control="restart">↺ Boshidan</button>
          <strong data-shadow-time>0:00</strong>
        </div>
        <div class="lb-shadow-rates">
          <span>Shadowing speed:</span>
          <button type="button" data-shadow-rate="0.75">0.75×</button>
          <button type="button" class="active" data-shadow-rate="1">1×</button>
          <button type="button" data-shadow-rate="1.25">1.25×</button>
        </div>
      </div>

      <section class="lb-shadow-practice">
        <article><span>👂</span><div><strong>Listen</strong><p>Gapning ritmi va urg‘usini ushlang.</p></div></article>
        <article><span>🗣️</span><div><strong>Repeat together</strong><p>Speakerdan ortda qolmasdan bir vaqtda ayting.</p></div></article>
        <article><span>🔁</span><div><strong>Repeat difficult parts</strong><p>Qiyin joyda ↶ 5s tugmasidan foydalaning.</p></div></article>
        <article><span>🙈</span><div><strong>Without captions</strong><p>Oxirida CC'ni o‘chirib yana bir marta bajaring.</p></div></article>
      </section>

      <footer class="lb-shadow-footer">
        <span>Shadowing Core Listening score'ini o‘zgartirmaydi; pronunciation, rhythm va listening fluency uchun qo‘shimcha practice.</span>
        <div>
          <button type="button" class="lb-shadow-secondary" data-shadow-close>Lesson'ga qaytish</button>
          <button type="button" class="lb-shadow-complete" data-shadow-complete>Shadowingni tugatdim ✓</button>
        </div>
      </footer>
    `;

    shadowFrame = d.querySelector('#lbShadowVideo');
    updateCaptionButton();
    updateRateButtons();
    updateDoneButtons();

    if (typeof d.showModal === 'function') {
      if (!d.open) d.showModal();
    } else {
      d.setAttribute('open', '');
    }

    requestAnimationFrame(initPlayer);
  }

  function openShadowing() {
    const ctx = context();
    if (!ctx) return;
    pauseCoreAudio();
    renderDialog(ctx);
  }

  function markComplete() {
    if (!current) return;
    const wasDone = isDone(current.url);
    setDone(current.url, !wasDone);
    if (!wasDone) {
      try {
        window.VividHistoryRecord?.(
          'Listening',
          'Shadowing · ' + current.title,
          'Core Listening · captions practice',
          {shadowing:true, youtubeId:current.id}
        );
        window.VocabCloud?.queue?.();
      } catch {}
    }
    updateDoneButtons();
  }

  function injectLaunchers() {
    const ctx = context();
    if (!ctx) return;

    const root = document.getElementById('mainContent');
    if (!root) return;

    const meta = root.querySelector('.lb-panel .lb-lesson-meta');
    if (meta && !meta.querySelector('.lb-shadow-launch')) {
      const launch = document.createElement('button');
      launch.type = 'button';
      launch.className = 'lb-chip lb-shadow-launch';
      launch.dataset.shadowOpen = '1';
      launch.textContent = isDone(ctx.url) ? '🎙 Shadowing ✓' : '🎙 Shadowing';
      meta.appendChild(launch);
    }

    const tabs = root.querySelector('.lb-tabs:not(.sl-tabs)');
    if (tabs && !tabs.querySelector('.lb-shadow-tab')) {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'lb-tab lb-shadow-tab';
      tab.dataset.shadowOpen = '1';
      tab.innerHTML = isDone(ctx.url) ? '🎙 Shadowing ✓' : '🎙 Shadowing';
      tabs.appendChild(tab);
    }
  }

  document.addEventListener('click', event => {
    const open = event.target.closest('[data-shadow-open]');
    if (open) {
      event.preventDefault();
      openShadowing();
      return;
    }

    const close = event.target.closest('[data-shadow-close]');
    if (close) {
      event.preventDefault();
      if (dialog?.open && typeof dialog.close === 'function') dialog.close();
      else {
        dialog?.removeAttribute('open');
        cleanupPlayer();
      }
      return;
    }

    const caption = event.target.closest('[data-shadow-captions]');
    if (caption) {
      shadowCaptions = !shadowCaptions;
      if (current) setCaptionPref(current.url, shadowCaptions);
      updateCaptionButton();
      const at = shadowTime;
      setFrameAt(at, true);
      setTimeout(() => {
        if (!shadowCaptions) send('unloadModule', ['captions']);
        else applyCaptionCommand();
      }, 700);
      return;
    }

    const rate = event.target.closest('[data-shadow-rate]');
    if (rate) {
      shadowRate = Number(rate.dataset.shadowRate) || 1;
      send('setPlaybackRate', [shadowRate]);
      updateRateButtons();
      return;
    }

    const control = event.target.closest('[data-shadow-control]');
    if (control) {
      const action = control.dataset.shadowControl;
      if (action === 'play') send('playVideo');
      if (action === 'pause') send('pauseVideo');
      if (action === 'back') setFrameAt(Math.max(0, shadowTime - 5), true);
      if (action === 'forward') setFrameAt(shadowTime + 5, true);
      if (action === 'restart') setFrameAt(0, true);
      return;
    }

    const complete = event.target.closest('[data-shadow-complete]');
    if (complete) markComplete();
  }, true);

  window.addEventListener('message', event => {
    if (!shadowFrame || event.source !== shadowFrame.contentWindow) return;
    let data = event.data;
    try {
      if (typeof data === 'string') data = JSON.parse(data);
    } catch {
      return;
    }

    const time = data?.info?.currentTime;
    if (Number.isFinite(time)) {
      shadowTime = time;
      updateTime();
    }
  });

  const observer = new MutationObserver(() => {
    clearTimeout(observer._timer);
    observer._timer = setTimeout(injectLaunchers, 40);
  });

  function start() {
    const host = document.getElementById('mainContent');
    if (!host) {
      setTimeout(start, 120);
      return;
    }
    observer.observe(host, {childList:true, subtree:true});
    injectLaunchers();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, {once:true});
  } else {
    start();
  }

  window.VividListeningShadowing = {
    version: VERSION,
    open: openShadowing
  };
})();