const list = document.getElementById('list');
const empty = document.getElementById('empty');
const tpl = document.getElementById('card-tpl');
const cards = new Map(); // tabId -> { el, token, dragging }

function fmt(t) {
  if (t == null || !isFinite(t)) return '--:--';
  t = Math.floor(t);
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

// A tab that never answers (hibernated, frozen, still loading...) must not block
// the whole popup, so each message gives up after a short time.
const SEND_TIMEOUT_MS = 400;

function send(tabId, msg) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), SEND_TIMEOUT_MS);
    try {
      chrome.tabs.sendMessage(tabId, msg, (res) => {
        void chrome.runtime.lastError; // tab has no media / no content script
        clearTimeout(timer);
        resolve(res && res.ok ? res : null);
      });
    } catch {
      clearTimeout(timer);
      resolve(null);
    }
  });
}

// Which tabs belong in the popup:
//  - tabs making sound you can hear (audible and not muted);
//  - tabs muted from this popup (until unmuted, by the popup or the tab itself);
//  - tabs paused from this popup (until they make sound again).
// Tabs that are silent, or muted outside the extension, are left out.
function shouldShow(tab, pin) {
  const muted = !!(tab.mutedInfo && tab.mutedInfo.muted);
  if (pin && pin.muted && muted) return true;
  if (pin && pin.paused) return true;
  return !!tab.audible && !muted;
}

async function collect() {
  const [tabs, pins] = await Promise.all([chrome.tabs.query({}), Pins.getAll()]);
  const results = await Promise.all(
    tabs.map(async (tab) => {
      // Discarded (hibernated) tabs have no running page to ask.
      if (!tab.id || tab.discarded || !/^(https?|file):/.test(tab.url || '')) return null;
      const pin = pins[tab.id];
      // Muted pin left over from a manual unmute the background missed: drop it.
      if (pin && pin.muted && !(tab.mutedInfo && tab.mutedInfo.muted)) Pins.set(tab.id, 'muted', false);
      if (!shouldShow(tab, pin)) return null;
      const info = await send(tab.id, { type: 'mc-get' });
      if (!info) return null;
      // Paused from the popup but playing again: back to the normal rule.
      if (pin && pin.paused && !info.paused) Pins.set(tab.id, 'paused', false);
      return { tab, info };
    })
  );
  // Playing media first, then the active tab, then the rest.
  return results.filter(Boolean).sort((a, b) =>
    (a.info.paused - b.info.paused) || (b.tab.active - a.tab.active));
}

function createCard(tab) {
  const el = tpl.content.firstElementChild.cloneNode(true);
  const card = { el, token: null, dragging: false };
  const cmd = async (action, value) => {
    const info = await send(tab.id, { type: 'mc-cmd', token: card.token, action, value });
    if (info) update(card, tab, info);
  };

  el.querySelector('.head').addEventListener('click', () => {
    chrome.tabs.update(tab.id, { active: true });
    chrome.windows.update(tab.windowId, { focused: true });
  });
  // Mutes the whole tab (same as the tab's own mute), not just the media element.
  el.querySelector('.mute').addEventListener('click', async () => {
    const t = await chrome.tabs.get(tab.id);
    const muted = !t.mutedInfo.muted;
    // Muting here keeps the tab in the popup; unmuting releases it.
    await Pins.set(tab.id, 'muted', muted);
    await chrome.tabs.update(tab.id, { muted });
    card.muteLockUntil = Date.now() + 700; // ignore a refresh that read the old state
    setMuted(el, muted);
  });
  // Pausing here keeps the tab in the popup (it stops making sound), so it can be resumed.
  el.querySelector('.play').addEventListener('click', async () => {
    const info = await send(tab.id, { type: 'mc-cmd', token: card.token, action: 'toggle' });
    if (!info) return;
    await Pins.set(tab.id, 'paused', info.paused);
    update(card, tab, info);
  });
  el.querySelector('.skip-back').addEventListener('click', () => cmd('skip', -5));
  el.querySelector('.skip-fwd').addEventListener('click', () => cmd('skip', 5));
  el.querySelector('.prev').addEventListener('click', () => cmd('prev'));
  el.querySelector('.next').addEventListener('click', () => cmd('next'));

  const seek = el.querySelector('.seek');
  seek.addEventListener('input', () => {
    card.dragging = true;
    el.querySelector('.cur').textContent = fmt(Number(seek.value));
    paintSeek(seek);
  });
  seek.addEventListener('change', async () => {
    await cmd('seek', Number(seek.value));
    card.dragging = false;
  });

  cards.set(tab.id, card);
  list.appendChild(el);
  return card;
}

function paintSeek(seek) {
  const max = Number(seek.max) || 1;
  seek.style.setProperty('--pct', `${(Number(seek.value) / max) * 100}%`);
}

function setMuted(el, muted) {
  el.classList.toggle('muted', muted);
  el.querySelector('.mute').title = muted ? 'Unmute tab' : 'Mute tab';
}

function update(card, tab, info) {
  const { el } = card;
  card.token = info.token;
  el.classList.toggle('playing', !info.paused);

  let host = '';
  try { host = new URL(tab.url).hostname.replace(/^www\./, ''); } catch {}
  const title = info.title || tab.title || host;
  const source = info.artist ? `${info.artist} · ${host}` : host;
  el.querySelector('.title').textContent = title;
  el.querySelector('.title').title = title;
  el.querySelector('.source').textContent = source;
  const fav = el.querySelector('.favicon');
  const favUrl = tab.favIconUrl || '';
  if (fav.getAttribute('src') !== favUrl) fav.setAttribute('src', favUrl);

  const live = info.duration == null;
  const seek = el.querySelector('.seek');
  el.querySelector('.skip-back').disabled = live;
  el.querySelector('.skip-fwd').disabled = live;
  seek.disabled = live;
  // Enabled only when the site offers next/previous (YouTube, Spotify, SoundCloud, ...).
  el.querySelector('.prev').disabled = !info.hasPrev;
  el.querySelector('.next').disabled = !info.hasNext;
  el.querySelector('.dur').textContent = live ? 'LIVE' : fmt(info.duration);
  if (!card.dragging) {
    seek.max = live ? 1 : info.duration;
    seek.value = live ? 0 : info.currentTime;
    el.querySelector('.cur').textContent = live ? '' : fmt(info.currentTime);
    paintSeek(seek);
  }
}

let refreshing = false;
async function refresh() {
  // The 500 ms timer must not stack up calls while a previous refresh is still waiting.
  if (refreshing) return;
  refreshing = true;
  try {
    await doRefresh();
  } finally {
    refreshing = false;
  }
}

async function doRefresh() {
  const items = await collect();
  const seen = new Set();
  // Cards keep their position once shown (pausing one must not move it);
  // only new media is added, at the end.
  items.forEach(({ tab, info }) => {
    seen.add(tab.id);
    const card = cards.get(tab.id) || createCard(tab);
    update(card, tab, info);
    if (!(card.muteLockUntil > Date.now())) setMuted(card.el, !!(tab.mutedInfo && tab.mutedInfo.muted));
  });
  for (const [id, card] of cards) {
    if (!seen.has(id) && !card.dragging) { card.el.remove(); cards.delete(id); }
  }
  empty.textContent = 'No media playing';
  empty.hidden = items.length > 0;
}

// Show something right away, so the popup never opens as an empty strip while
// the tabs are being asked.
empty.textContent = 'Looking for media…';
empty.hidden = false;
refresh();
setInterval(refresh, 500);
