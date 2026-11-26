// Tabs "pinned" to the popup by an action taken in the extension.
//
// The popup normally lists only tabs that are making sound. A tab muted or paused
// from the popup stops making sound, but must stay listed so it can be unmuted or
// resumed. Each pin clears itself when it no longer applies:
//   muted  -> cleared when the tab is unmuted (from the popup or the tab itself)
//   paused -> cleared when the tab makes sound again (or navigates away)
//
// Stored in chrome.storage.session: kept while the browser is open, gone on restart.
const Pins = {
  KEY: 'pins',

  async getAll() {
    const data = await chrome.storage.session.get(Pins.KEY);
    return data[Pins.KEY] || {};
  },

  async set(tabId, kind, on) {
    const all = await Pins.getAll();
    const pin = { ...(all[tabId] || {}) };
    if (on) pin[kind] = true; else delete pin[kind];
    if (Object.keys(pin).length) all[tabId] = pin; else delete all[tabId];
    await chrome.storage.session.set({ [Pins.KEY]: all });
  },

  async remove(tabId) {
    const all = await Pins.getAll();
    if (!(tabId in all)) return;
    delete all[tabId];
    await chrome.storage.session.set({ [Pins.KEY]: all });
  },
};
