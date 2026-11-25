(() => {
  if (window.__mediaControlsLoaded) return;
  window.__mediaControlsLoaded = true;

  // Each frame answers with its own token, so commands reach the frame that owns the media.
  const token = Math.random().toString(36).slice(2);
  let lastPlayed = null; // last media element that started playing in this frame
  let current = null;    // media element last reported to the popup

  // "play" does not bubble, but it can be caught in the capture phase.
  document.addEventListener('play', (e) => {
    if (e.target instanceof HTMLMediaElement) lastPlayed = e.target;
  }, true);

  function visibleArea(el) {
    const r = el.getBoundingClientRect();
    const w = Math.min(r.right, innerWidth) - Math.max(r.left, 0);
    const h = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
    return w > 0 && h > 0 ? w * h : 0;
  }

  function usable(el) {
    return el && el.isConnected && el.readyState >= 1 && !(el.duration === 0);
  }

  function pickMedia() {
    const all = Array.from(document.querySelectorAll('video, audio')).filter(usable);
    // 1) Playing media: audio elements first, then the most visible video.
    const playing = all.filter((m) => !m.paused && !m.ended);
    if (playing.length) {
      playing.sort((a, b) => {
        const va = a instanceof HTMLAudioElement ? Infinity : visibleArea(a);
        const vb = b instanceof HTMLAudioElement ? Infinity : visibleArea(b);
        return vb - va;
      });
      return playing[0];
    }
    // 2) Nothing playing: keep showing the last media that played (paused), like the browser's own controls.
    if (usable(lastPlayed)) return lastPlayed;
    if (usable(current)) return current;
    return null;
  }

  // Track handlers the page registered (published by page-hook.js).
  function trackActions() {
    const list = (document.documentElement.getAttribute('data-mc-actions') || '').split(',');
    return { hasPrev: list.includes('previoustrack'), hasNext: list.includes('nexttrack') };
  }

  function info(m) {
    const meta = navigator.mediaSession && navigator.mediaSession.metadata;
    let artwork = '';
    if (meta && meta.artwork && meta.artwork.length) artwork = meta.artwork[meta.artwork.length - 1].src;
    return {
      ok: true,
      token,
      paused: m.paused,
      currentTime: m.currentTime || 0,
      duration: isFinite(m.duration) ? m.duration : null, // null = live stream
      title: (meta && meta.title) || '',
      artist: (meta && meta.artist) || '',
      artwork,
      isVideo: m instanceof HTMLVideoElement,
      ...trackActions()
    };
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'mc-get') {
      const m = pickMedia();
      if (!m) return false; // stay silent so another frame of the tab can answer
      current = m;
      sendResponse(info(m));
      return false;
    }
    if (msg.type === 'mc-cmd' && msg.token === token) {
      const m = usable(current) ? current : pickMedia();
      if (!m) { sendResponse({ ok: false }); return false; }
      if (msg.action === 'toggle') {
        if (m.paused) m.play().catch(() => {}); else m.pause();
      } else if (msg.action === 'next' || msg.action === 'prev') {
        const action = msg.action === 'next' ? 'nexttrack' : 'previoustrack';
        document.dispatchEvent(new CustomEvent('mc-track-action', { detail: action }));
      } else if (msg.action === 'skip' && isFinite(m.duration)) {
        m.currentTime = Math.max(0, Math.min(m.duration, m.currentTime + msg.value));
      } else if (msg.action === 'seek' && isFinite(m.duration)) {
        m.currentTime = Math.max(0, Math.min(m.duration, msg.value));
      }
      sendResponse(info(m));
      return false;
    }
    return false;
  });
})();
