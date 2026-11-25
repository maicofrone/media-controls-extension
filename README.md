# Media Controls

A small browser extension that adds a **music-note button to the toolbar** for controlling
the media playing in your tabs — like the global media controls built into Chrome and Brave,
for Chromium browsers that don't have them (e.g. Vivaldi).

## Features

- One card per tab with media: site icon, title and source (click it to jump to the tab)
- Previous track · Back 5 s · Play/Pause · Forward 5 s · Next track
- Seek bar with current time and duration
- Previous/next use the site's own track controls (YouTube, Spotify, SoundCloud, YouTube Music…)
  and are greyed out when the site has none
- Picks up autoplaying videos right away, including muted ones (Instagram Reels)
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

## How it works

| File | Role |
| --- | --- |
| `content.js` | Finds the media in each page and runs play/pause/seek |
| `page-hook.js` | Runs in the page itself to catch the site's next/previous track handlers |
| `popup.html/.css/.js` | The toolbar panel |
| `background.js` | Injects the scripts into tabs already open at install time |

## License

[MIT](LICENSE)
