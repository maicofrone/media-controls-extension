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
