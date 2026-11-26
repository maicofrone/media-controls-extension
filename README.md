# Media Controls

A small browser extension that adds a **music-note button to the toolbar** for controlling
the media playing in your tabs — like the global media controls built into Chrome and Brave,
for Chromium browsers that don't have them (e.g. Vivaldi).

## Features

- Lists only the tabs that are **making sound** — ten open YouTube tabs don't fill the panel,
  just the one you're listening to
- One card per tab: site icon, title and source (click it to jump to the tab)
- Previous track · Back 5 s · Play/Pause · Forward 5 s · Next track
- Seek bar with current time and duration
- Previous/next use the site's own track controls (YouTube, Spotify, SoundCloud, YouTube Music…)
  and are greyed out when the site has none
- Muting or pausing from the panel keeps the tab listed, so you can unmute or resume it
- Cards stay in place when you pause, so you don't click the wrong one
- Follows the system light/dark theme
- No data collection: nothing leaves your browser

## Install

1. Download this repository (**Code → Download ZIP**) and extract it, or `git clone` it.
2. Open your browser's extensions page (`chrome://extensions`, `vivaldi://extensions`, `brave://extensions`…).
3. Turn on **Developer mode**.
4. Click **Load unpacked** and select the extracted folder (the one with `manifest.json`).
5. Pin the music-note icon to the toolbar.

Tabs that were already open get the extension automatically. If next/previous stay greyed out
on a music site, reload that tab once.

## Update

Download the new version over the old folder (or `git pull`), then click the reload button
on the extension's card in the extensions page.

## Which tabs are listed

| Tab | Listed? |
| --- | --- |
| Making sound | Yes |
| Silent (paused, stopped, or a muted autoplay video) | No |
| Muted from the panel | Yes, until it's unmuted — from the panel or from the tab itself |
| Paused from the panel | Yes, until it plays again |
| Muted outside the panel (tab button, keyboard) | No |

The browser marks a tab as silent a couple of seconds after the sound stops, so a card can take
that long to disappear.

## How it works

| File | Role |
| --- | --- |
| `content.js` | Finds the media in each page and runs play/pause/seek |
| `page-hook.js` | Runs in the page itself to catch the site's next/previous track handlers |
| `popup.html/.css/.js` | The toolbar panel |
| `pins.js` | Remembers tabs muted or paused from the panel, so they stay listed |
| `background.js` | Injects the scripts into open tabs at install time and clears pins that no longer apply |

## License

[MIT](LICENSE)
