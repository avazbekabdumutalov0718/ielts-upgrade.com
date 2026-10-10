/* Topic wheels use the same bank and navigation as Part 1–3 practice. */
(() => {
  'use strict';
  const PARTS = [1, 2, 3];
  const COLORS = ['#5b3ab5', '#245ea8', '#187976', '#9a427a', '#965524'];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));

  function create({getBank, onOpen}) {
    const wheels = new Map();
    let host = null;
    const topicsFor = part => (getBank()?.['part' + part] || [])
      .map((group, index) => ({index, title: group.title, count: group.questions?.length || 0}))
      .filter(topic => topic.count > 0);
    function sample(topics) {
      const pool = [...topics];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      return pool.slice(0, 10);
    }
    function getWheel(part) {
      if (!wheels.has(part)) wheels.set(part, {pool: sample(topicsFor(part)), rotation: 0, selected: null, spin: null, frame: null});
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
      const point = degrees => [180 + 170 * Math.sin(degrees * Math.PI / 180), 180 - 170 * Math.cos(degrees * Math.PI / 180)];
      const step = 360 / pool.length;
      return '<svg viewBox="0 0 360 360" aria-hidden="true" focusable="false">' + pool.map((topic, i) => {
        const start = point(i * step), end = point((i + 1) * step), middle = (i + 0.5) * step;
        const label = topic.title.length > 23 ? topic.title.slice(0, 22) + '…' : topic.title;
        const shape = pool.length === 1 ? '<circle cx="180" cy="180" r="170"' : '<path d="M 180 180 L ' + start.join(' ') + ' A 170 170 0 ' + (step > 180 ? 1 : 0) + ' 1 ' + end.join(' ') + ' Z"';
        return '<g><title>' + escape(topic.title) + '</title>' + shape + ' fill="' + COLORS[i % COLORS.length] + '" stroke="#fff" stroke-width="1.5"/>' +
          '<text x="0" y="0" fill="#fff" text-anchor="middle" font-size="10" font-weight="700" textLength="' + Math.min(114, label.length * 5.4) + '" lengthAdjust="spacingAndGlyphs" transform="translate(180 180) rotate(' + middle + ') translate(0 -112) rotate(' + (middle > 180 ? -90 : 90) + ')">' + escape(label) + '</text></g>';
      }).join('') + '</svg>';
    }
    function render() {
      return '<section class="spw-section" aria-labelledby="spw-heading"><div class="spw-heading"><div><span>TOPIC TANLANG</span><h2 id="spw-heading">Har bir Part uchun alohida baraban</h2></div><b>∞ Cheksiz aylantirish</b></div>' +
        '<p class="spw-intro">Har aylanishda barcha topiclardan 10 tasi barabanga tushadi. Har bir mavzu tanlanishi mumkin — xohlagancha qayta aylantiring.</p><div class="spw-grid">' + PARTS.map(part => {
          const wheel = getWheel(part), topics = topicsFor(part), selected = wheel.selected;
          return '<article class="spw-card" data-speaking-wheel="' + part + '" aria-labelledby="spw-title-' + part + '"><div class="spw-card-heading"><h3 id="spw-title-' + part + '">Part ' + part + '</h3><span>' + topics.length + ' ta topic</span></div><p class="spw-part-label">' + ['Qisqa javob', 'Cue card', 'Muhokama'][part - 1] + '</p>' +
            '<div class="spw-frame"><span class="spw-pointer" aria-hidden="true"></span><div class="spw-disc" style="transform:rotate(' + angle(wheel) + 'deg)">' + discMarkup(wheel.pool) + '</div><span class="spw-hub" aria-hidden="true">PART<br>' + part + '</span></div>' +
            '<button type="button" class="spw-spin" aria-label="Part ' + part + ' barabanini aylantirish"' + (wheel.spin || !topics.length ? ' disabled' : '') + '>' + (wheel.spin ? 'Aylanyapti…' : '↻ Aylantirish') + '</button>' +
            '<div class="spw-result" role="status" aria-live="polite" aria-atomic="true"><small>' + (wheel.spin ? 'MAVZU TANLANMOQDA' : selected ? 'TANLANGAN MAVZU' : 'TAYYORMISIZ?') + '</small><strong>' + escape(wheel.spin ? 'Baraban aylanyapti…' : selected?.title || 'Barabanni aylantiring') + '</strong></div>' +
            '<button type="button" class="spw-open"' + (!selected || wheel.spin ? ' hidden' : '') + '>Mavzu savollarini ochish →</button>' +
            '<details class="spw-catalog"><summary>Barcha ' + topics.length + ' ta topic</summary><ol>' + topics.map(topic => '<li>' + escape(topic.title) + '<small>' + topic.count + ' ta savol</small></li>').join('') + '</ol></details></article>';
        }).join('') + '</div></section>';
    }
    function update(part) {
      const card = cardFor(part), wheel = getWheel(part);
      if (!card) return;
      const spinning = !!wheel.spin;
      card.querySelector('.spw-disc').style.transform = 'rotate(' + angle(wheel) + 'deg)';
      const button = card.querySelector('.spw-spin');
      button.disabled = spinning || !topicsFor(part).length;
      button.textContent = spinning ? 'Aylanyapti…' : '↻ Yana aylantirish';
      card.querySelector('.spw-result small').textContent = spinning ? 'MAVZU TANLANMOQDA' : 'TANLANGAN MAVZU';
      card.querySelector('.spw-result strong').textContent = spinning ? 'Baraban aylanyapti…' : wheel.selected?.title || 'Barabanni aylantiring';
      card.querySelector('.spw-open').hidden = spinning || !wheel.selected;
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
      const wheel = getWheel(part), topics = topicsFor(part);
      if (wheel.spin || !topics.length) return;
      wheel.pool = sample(topics);
      const winner = Math.floor(Math.random() * wheel.pool.length), target = wheel.pool[winner];
      const step = 360 / wheel.pool.length;
      // The pointer is at 12 o'clock; stop at the chosen segment's centre.
      const landing = (360 - (winner + 0.5) * step) % 360;
      const from = wheel.rotation % 360;
      const to = from + 360 * 5 + (landing - from + 360) % 360;
      const duration = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 40 : 3600;
      wheel.spin = {from, to, started: performance.now(), duration};
      const card = cardFor(part);
      if (card) card.querySelector('.spw-disc').innerHTML = discMarkup(wheel.pool);
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
    function mount(root) {
      host = root;
      PARTS.forEach(part => {
        const card = cardFor(part);
        if (!card) return;
        card.querySelector('.spw-spin').addEventListener('click', () => spin(part));
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
