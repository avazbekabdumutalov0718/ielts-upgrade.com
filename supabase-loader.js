(() => {
  'use strict';
  let readyPromise = null;
  const sources = [
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
    'https://unpkg.com/@supabase/supabase-js@2'
  ];

  function hasClient() {
    return !!(window.supabase && typeof window.supabase.createClient === 'function');
  }

  function loadScript(src, timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
      if (hasClient()) { resolve(window.supabase); return; }
      const script = document.createElement('script');
      let settled = false;
      const timer = setTimeout(() => finish(false, new Error(`Supabase loader timeout: ${src}`)), timeoutMs);
      function finish(ok, value) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        script.onload = script.onerror = null;
        if (!ok) script.remove();
        ok ? resolve(value) : reject(value);
      }
      script.src = src;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.onload = () => hasClient() ? finish(true, window.supabase) : finish(false, new Error(`Supabase global missing after: ${src}`));
      script.onerror = () => finish(false, new Error(`Supabase script failed: ${src}`));
      document.head.appendChild(script);
    });
  }

  async function load() {
    if (hasClient()) return window.supabase;
    for (const src of sources) {
      try {
        await loadScript(src);
        if (hasClient()) return window.supabase;
      } catch (error) {
        console.warn('[VIVID IELTS] Supabase CDN fallback:', error?.message || error);
      }
    }
    try {
      const mod = await import('https://esm.sh/@supabase/supabase-js@2?bundle');
      if (typeof mod?.createClient === 'function') {
        window.supabase = mod;
        return window.supabase;
      }
    } catch (error) {
      console.warn('[VIVID IELTS] Supabase ESM fallback:', error?.message || error);
    }
    return null;
  }

  window.VividSupabaseLoader = {
    ready() {
      if (hasClient()) return Promise.resolve(window.supabase);
      if (!readyPromise) readyPromise = load().finally(() => { if (!hasClient()) readyPromise = null; });
      return readyPromise;
    },
    reset() { if (!hasClient()) readyPromise = null; },
    get loaded() { return hasClient(); }
  };

  window.addEventListener('online', () => window.VividSupabaseLoader.reset());
})();
