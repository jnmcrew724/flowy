# Flowy

A deliberately tiny personal mobile app that shows a short, sequential **workflow of daily work areas** and lets you tap each step to cycle its status color — so you always know, at a glance, where you are in the day and what's already done.

It's a single-screen installable PWA: no backend, no accounts. State lives in your browser's `localStorage`. Built to live on an iPhone home screen via **Add to Home Screen**.

## Features

- **Tap a step** to cycle its status: `TO DO → IN PROGRESS → DONE` (or a 2-state `TO DO → DONE` mode).
- **Multiple workflows** — keep as many as you like, but **pin up to 4** to show as chips at the top (chips wrap so all pinned flows stay visible); the rest live in the `⋯` manage sheet where you pin/unpin, switch between them, or **delete** any flow (seeded with *Daily Flow* and *Wind-down*).
- **Custom status colors** — a settings sheet (the `tune` icon, top-right) lets you pick exactly what color means *To do* and *Done* (and *In progress* in 3-state mode), plus toggle the middle step on/off. Reset to defaults anytime.
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

Defaults live in `app.js` (`DEFAULT_SETTINGS`): `tapMode` (`red-yellow-green` | `red-green`), `autoReset`, `celebration`, and the status color `palette`. The `tapMode` and `palette` are also editable at runtime from the in-app **Settings** sheet (persisted to `localStorage`).

## Versioning

The app version is a single constant, `VERSION`, near the top of `app.js`. It's shown as a `v1.0` pill next to the wordmark and at the bottom of the Settings sheet. **On each release, bump `VERSION`, add a CHANGELOG entry below, bump the `CACHE` name in `sw.js` (so installed copies update), and tag the merge commit** (`git tag vX.Y && git push origin vX.Y`).

Numbering is loose semver: **minor** bump (1.0 → 1.1) for a new feature, **patch** (1.0 → 1.0.1) for a small fix or tweak.

## Changelog

### v1.2
- **Cross-device sync (optional).** Settings → *Sync across devices* connects Flowy to a Firebase Realtime Database so your phone, the website, and the desktop widget all share one set of flows. Offline still works (localStorage stays the cache); changes push/pull when online and resolve last-edit-wins by timestamp. A one-paste **device link** (Firebase config + private sync code, base64) links additional devices. When sync isn't configured, Flowy behaves exactly as before. See [SYNC-SETUP.md](SYNC-SETUP.md) for the one-time Firebase setup.

### v1.1.1
- Made compact widget mode **much smaller and denser** — short rows, tiny icons, tighter spacing, hidden date line — so it reads like a small desktop reminders widget. Drag the pinned window narrow and it packs tightly.

### v1.1
- **Compact widget mode** — a denser, minimal-chrome layout for running Flowy in a small pinned window (e.g. a corner of the desktop). Turns on automatically when the window is small, or manually via a Settings toggle. Adds a slim progress bar (done/total) in the header while in this mode.
- Pin Flowy as a standalone desktop app via your browser: Safari → *File → Add to Dock*, or Chrome/Edge → *Install page as app*.

### v1.0
- Baseline release. Single-screen PWA workflow tracker: tap steps to cycle status, multiple workflows with up-to-4 pinned chips (chips wrap so all stay visible), full edit mode (add/remove/rename/reorder steps, swap icons), auto-reset each day, confetti on completion, offline service worker.
- Delete a workflow from the `⋯` Manage sheet.
- **Settings** sheet (`tune` icon): press-and-drag color picker for what *To do* / *In progress* / *Done* mean, a 2-state/3-state toggle, and **per-flow color overrides** via a *This flow / All flows* scope switch.
- In-app version badge.

---

Personal-use project. Design and behavior recreated from a high-fidelity handoff prototype.
