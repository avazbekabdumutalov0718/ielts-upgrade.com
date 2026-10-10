/* Each Part has its own wheel containing every topic in the practice bank. */
(() => {
  'use strict';
  const PARTS = [1, 2, 3];
  const COLORS = ['#5b3ab5', '#245ea8', '#187976', '#9a427a', '#965524'];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));

  function create({getBank, onOpen}) {
    const wheels = new Map();
    let host = null;
    const topicsFor = part => (getBank()?.['part' + part] || [])
      .map((group, index) => ({index, title: group.title, count: group.questions?.length || 0}));
    function getWheel(part) {
      if (!wheels.has(part)) wheels.set(part, {pool: topicsFor(part), rotation: 0, selected: null, spin: null, frame: null, zoom: 1});
      return wheels.get(part);
    }
    function cardFor(part) { return host?.querySelector('[data-speaking-wheel="' + part + '"]'); }
    function angle(wheel) {
      if (!wheel.spin) return wheel.rotation;
      const progress = Math.min(1, Math.max(0, (performance.now() - wheel.spin.started) / wheel.spin.duration));
      return wheel.spin.from + (wheel.spin.to - wheel.spin.from) * (1 - Math.pow(1 - progress, 4));
    }
    function discMarkup(pool) {
      if (!pool.length) return '';
      const point = degrees => [600 + 580 * Math.sin(degrees * Math.PI / 180), 600 - 580 * Math.cos(degrees * Math.PI / 180)];
      const step = 360 / pool.length;
      const fontSize = pool.length > 110 ? 9 : pool.length > 80 ? 11 : pool.length > 50 ? 14 : 18;
      return '<svg viewBox="0 0 1200 1200" aria-hidden="true" focusable="false">' + pool.map((topic, i) => {
        const start = point(i * step), end = point((i + 1) * step), middle = (i + 0.5) * step;
        const shape = pool.length === 1 ? '<circle cx="600" cy="600" r="580"' : '<path d="M 600 600 L ' + start.join(' ') + ' A 580 580 0 ' + (step > 180 ? 1 : 0) + ' 1 ' + end.join(' ') + ' Z"';
        const fit = topic.title.length * fontSize * 0.56 > 325 ? ' textLength="325" lengthAdjust="spacingAndGlyphs"' : '';
        return '<g data-topic-index="' + topic.index + '"><title>' + escape(topic.title) + '</title>' + shape + ' fill="' + COLORS[i % COLORS.length] + '" stroke="#fff" stroke-width="1"/>' +
          '<text x="0" y="0" dy=".35em" fill="#fff" text-anchor="middle" font-size="' + fontSize + '" font-weight="600"' + fit + ' transform="translate(600 600) rotate(' + middle + ') translate(0 -400) rotate(' + (middle > 180 ? -90 : 90) + ')">' + escape(topic.title) + '</text></g>';
      }).join('') + '</svg>';
    }
    function render(part = 1) {
      if (!PARTS.includes(part)) return '';
      const wheel = getWheel(part), topics = wheel.pool, selected = wheel.selected;
      return '<section class="spw-section" aria-labelledby="spw-heading"><div class="spw-heading"><div><span>' + ['QISQA JAVOB', 'CUE CARD', 'MUHOKAMA'][part - 1] + '</span><h2 id="spw-heading">Part ' + part + ' · Topic barabani</h2></div><b>∞ Cheksiz aylantirish</b></div>' +
        '<p class="spw-intro">Part ' + part + ' dagi barcha <strong>' + topics.length + ' ta mavzu</strong> barabanga kiritilgan. Har bir mavzu alohida bo‘lakda. Xohlagancha aylantiring.</p>' +
        '<article class="spw-card" data-speaking-wheel="' + part + '" aria-label="Part ' + part + ' barabani"><div class="spw-layout"><div class="spw-visual">' +
        '<div class="spw-zoom" role="group" aria-label="Baraban o‘lchami"><span>Kattalashtirish</span><button type="button" class="spw-zoom-out" aria-label="Barabanni kichraytirish">−</button><output class="spw-zoom-value">' + Math.round(wheel.zoom * 100) + '%</output><button type="button" class="spw-zoom-in" aria-label="Barabanni kattalashtirish">+</button><button type="button" class="spw-zoom-reset">Sig‘dirish</button></div>' +
        '<div class="spw-viewport" tabindex="0" role="region" aria-label="Barcha mavzular barabani; kattalashtirganda surib ko‘ring"><div class="spw-frame" style="width:' + (wheel.zoom * 100) + '%"><span class="spw-pointer" aria-hidden="true"></span><div class="spw-disc" style="transform:rotate(' + angle(wheel) + 'deg)">' + discMarkup(topics) + '</div><span class="spw-hub" aria-hidden="true">PART<br>' + part + '</span></div></div>' +
        '<p class="spw-zoom-hint">Nomlarni yaqinroq ko‘rish uchun + ni bosing va barabanni suring.</p></div><div class="spw-controls">' +
        '<button type="button" class="spw-spin" aria-label="Part ' + part + ' barabanini aylantirish"' + (wheel.spin || !topics.length ? ' disabled' : '') + '>' + (wheel.spin ? 'Aylanyapti…' : selected ? '↻ Yana aylantirish' : '↻ Aylantirish') + '</button>' +
        '<div class="spw-result" role="status" aria-live="polite" aria-atomic="true"><small>' + (wheel.spin ? 'MAVZU TANLANMOQDA' : selected ? 'TANLANGAN MAVZU' : 'TAYYORMISIZ?') + '</small><strong>' + escape(wheel.spin ? 'Baraban aylanyapti…' : selected?.title || 'Barabanni aylantiring') + '</strong></div>' +
        '<button type="button" class="spw-open"' + (!selected || wheel.spin ? ' hidden' : '') + '>Mavzu savollarini ochish →</button>' +
        '<details class="spw-catalog" open><summary>Barabandagi barcha ' + topics.length + ' ta mavzu</summary><ol>' + topics.map(topic => '<li data-wheel-topic="' + topic.index + '"' + (selected?.index === topic.index ? ' class="is-selected"' : '') + '><span>' + escape(topic.title) + '</span><small>' + topic.count + ' ta savol</small></li>').join('') + '</ol></details></div></div></article></section>';
    }
    function update(part) {
      const card = cardFor(part), wheel = getWheel(part);
      if (!card) return;
      const spinning = !!wheel.spin;
      card.querySelector('.spw-disc').style.transform = 'rotate(' + angle(wheel) + 'deg)';
      const button = card.querySelector('.spw-spin');
      button.disabled = spinning || !wheel.pool.length;
      button.textContent = spinning ? 'Aylanyapti…' : '↻ Yana aylantirish';
      card.querySelector('.spw-result small').textContent = spinning ? 'MAVZU TANLANMOQDA' : 'TANLANGAN MAVZU';
      card.querySelector('.spw-result strong').textContent = spinning ? 'Baraban aylanyapti…' : wheel.selected?.title || 'Barabanni aylantiring';
      card.querySelector('.spw-open').hidden = spinning || !wheel.selected;
      card.querySelectorAll('[data-wheel-topic]').forEach(item => item.classList.toggle('is-selected', !spinning && Number(item.dataset.wheelTopic) === wheel.selected?.index));
    }
    function animate(part) {
      const wheel = getWheel(part);
      cancelAnimationFrame(wheel.frame);
      function frame() {
        const card = cardFor(part);
        if (!wheel.spin || !card?.isConnected) { wheel.frame = null; return; }
        card.querySelector('.spw-disc').style.transform = 'rotate(' + angle(wheel) + 'deg)';
        wheel.frame = requestAnimationFrame(frame);
      }
      frame();
    }
    function spin(part) {
      if (!PARTS.includes(part)) return;
      const wheel = getWheel(part);
      if (wheel.spin || !wheel.pool.length) return;
      const winner = Math.floor(Math.random() * wheel.pool.length), target = wheel.pool[winner];
      const step = 360 / wheel.pool.length;
      // The pointer is at 12 o'clock; stop at the chosen segment's centre.
      const landing = (360 - (winner + 0.5) * step) % 360;
      const from = wheel.rotation % 360;
      const to = from + 360 * 5 + (landing - from + 360) % 360;
      const duration = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ? 40 : 3600;
      wheel.spin = {from, to, started: performance.now(), duration};
      update(part);
      animate(part);
      setTimeout(() => {
        wheel.selected = target;
        wheel.rotation = landing;
        wheel.spin = null;
        cancelAnimationFrame(wheel.frame);
        wheel.frame = null;
        update(part);
      }, duration);
    }
    function updateZoom(part, zoom) {
      const wheel = getWheel(part), card = cardFor(part);
      wheel.zoom = Math.max(1, Math.min(3, zoom));
      if (!card) return;
      card.querySelector('.spw-frame').style.width = (wheel.zoom * 100) + '%';
      card.querySelector('.spw-zoom-value').textContent = Math.round(wheel.zoom * 100) + '%';
      card.querySelector('.spw-zoom-out').disabled = wheel.zoom === 1;
      card.querySelector('.spw-zoom-in').disabled = wheel.zoom === 3;
      const viewport = card.querySelector('.spw-viewport');
      viewport.scrollLeft = Math.max(0, (viewport.scrollWidth - viewport.clientWidth) / 2);
      if (wheel.zoom === 1) viewport.scrollTop = 0;
    }
    function mount(root) {
      host = root;
      PARTS.forEach(part => {
        const card = cardFor(part);
        if (!card) return;
        card.querySelector('.spw-spin').addEventListener('click', () => spin(part));
        card.querySelector('.spw-zoom-out').addEventListener('click', () => updateZoom(part, getWheel(part).zoom - 0.5));
        card.querySelector('.spw-zoom-in').addEventListener('click', () => updateZoom(part, getWheel(part).zoom + 0.5));
        card.querySelector('.spw-zoom-reset').addEventListener('click', () => updateZoom(part, 1));
        updateZoom(part, getWheel(part).zoom);
        card.querySelector('.spw-open').addEventListener('click', () => {
          const wheel = getWheel(part);
          if (!wheel.spin && wheel.selected) {
            onOpen(part, wheel.selected.index);
            const destination = host.querySelector('.speaking-list');
            if (destination) {
              destination.setAttribute('tabindex', '-1');
              destination.focus({preventScroll: true});
              destination.scrollIntoView({behavior: 'auto', block: 'start'});
            }
          }
        });
        if (getWheel(part).spin) animate(part);
      });
    }
    return {render, mount};
  }
  window.SpeakingPartWheels = {create};
})();
