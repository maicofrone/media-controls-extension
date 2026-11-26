importScripts('pins.js');

// Content scripts are not injected into tabs that were already open when the
// extension was installed or reloaded, so inject them once here.
chrome.runtime.onInstalled.addListener(async () => {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (!tab.id || !/^(https?|file):/.test(tab.url || '')) continue;
    chrome.scripting
      .executeScript({ target: { tabId: tab.id, allFrames: true }, files: ['content.js'] })
      .catch(() => {});
    chrome.scripting
      .executeScript({ target: { tabId: tab.id, allFrames: true }, files: ['page-hook.js'], world: 'MAIN' })
      .catch(() => {});
  }
});

// Clear pins that no longer apply, even while the popup is closed.
chrome.tabs.onUpdated.addListener((tabId, change) => {
  // Unmuted in any way (popup, tab button, keyboard): back to the normal rule.
  if (change.mutedInfo && !change.mutedInfo.muted) Pins.set(tabId, 'muted', false);
  // Making sound again, or a new page: the "paused from the popup" pin is done.
  if (change.audible === true || change.url) Pins.set(tabId, 'paused', false);
});

chrome.tabs.onRemoved.addListener((tabId) => Pins.remove(tabId));
