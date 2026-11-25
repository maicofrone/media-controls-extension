// Runs in the page's own JavaScript world (not the extension's isolated world), so it can
// see the "next track" / "previous track" handlers that sites (YouTube, Spotify, ...)
// register through navigator.mediaSession — the same ones the browser's media keys use.
(() => {
  if (window.__mediaControlsHook || !('mediaSession' in navigator)) return;
  window.__mediaControlsHook = true;

  const TRACK_ACTIONS = ['previoustrack', 'nexttrack'];
  const handlers = {};
  const original = navigator.mediaSession.setActionHandler.bind(navigator.mediaSession);

  // Tell the content script which track actions exist, via an attribute both worlds can read.
  function publish() {
    const root = document.documentElement;
    if (!root) return;
    root.setAttribute('data-mc-actions', TRACK_ACTIONS.filter((a) => handlers[a]).join(','));
  }

  navigator.mediaSession.setActionHandler = function (action, handler) {
    if (TRACK_ACTIONS.includes(action)) {
      handlers[action] = typeof handler === 'function' ? handler : null;
      publish();
    }
    return original(action, handler);
  };

  // The content script asks for an action with a DOM event.
  document.addEventListener('mc-track-action', (e) => {
    const action = e.detail;
    if (TRACK_ACTIONS.includes(action) && handlers[action]) {
      try { handlers[action]({ action }); } catch {}
    }
  });

  if (!document.documentElement) document.addEventListener('DOMContentLoaded', publish, { once: true });
})();
