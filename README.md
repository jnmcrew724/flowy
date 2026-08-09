# Flowy

A deliberately tiny personal mobile app that shows a short, sequential **workflow of daily work areas** and lets you tap each step to cycle its status color — so you always know, at a glance, where you are in the day and what's already done.

It's a single-screen installable PWA: no backend, no accounts. State lives in your browser's `localStorage`. Built to live on an iPhone home screen via **Add to Home Screen**.

## Features

- **Tap a step** to cycle its status: `TO DO → IN PROGRESS → DONE` (or a 2-state `TO DO → DONE` mode).
- **Multiple workflows** — switch between them with the chips at the top (seeded with *Daily Flow* and *Wind-down*).
- **Fully editable** — add / remove / rename steps, swap icons, drag to reorder, rename and add / delete workflows. All in edit mode, all saved instantly.
- **Auto-reset** — every step resets to *TO DO* on the first open of a new day.
- **Celebration** — a confetti burst when every step is done.
- **Offline** — a service worker caches the app shell so it runs with no connection.

## Tech

Zero-build static site — plain `index.html` + `app.js`, a web app manifest, and a service worker. Nothing to compile.

```
index.html            markup + styles (design tokens as CSS variables)
app.js                all app logic and rendering (vanilla JS)
manifest.webmanifest  PWA metadata + icons
sw.js                 offline service worker
assets/               logo + generated PWA/app icons
```

## Run locally

Any static file server works, e.g.:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. (A service worker needs `http://localhost` or HTTPS — opening the file directly won't register it.)

## Deploy

Served as-is on **GitHub Pages** (Settings → Pages → deploy from `main` / root). `.nojekyll` keeps Pages from touching the files.

## Settings

Behavior toggles live in `app.js` (`DEFAULT_SETTINGS`): `tapMode` (`red-yellow-green` | `red-green`), `autoReset`, `celebration`, and the status color `palette`.

---

Personal-use project. Design and behavior recreated from a high-fidelity handoff prototype.
