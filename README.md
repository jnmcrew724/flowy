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

The app version is a single constant, `VERSION`, near the top of `app.js`. It's shown as a `v1.3` pill next to the wordmark and at the bottom of the Settings sheet. **On each release, bump `VERSION`, add a CHANGELOG entry below, and bump the `CACHE` name in `sw.js`** (so installed copies update).

Numbering is a simple running counter — each release just goes up one tenth: **1.3 → 1.4 → 1.5 → …** (no three-part patch numbers).

## Changelog

### v1.6
- **Reorder workflows** by dragging the `⠿` handle in the Manage (`⋯`) sheet — this also sets the order the pinned chips appear across the top.

### v1.5
- Added a **Sorting / organizing** group to the step-icon picker (sort, swap, filter, low-priority, category, stacks, layers, kanban, inventory, move-to-inbox, sort-by-alpha) — for steps about sorting things into piles.

### v1.4
- Settings button is now a **gear icon** (drawn inline as SVG, so it always renders and never falls back to the word "tune").

### v1.3
- Sync-setup polish: the sync box now accepts the **entire Firebase snippet** (import lines and all), not just the config object. Bottom sheets (Settings/Manage) now sit **above the mobile keyboard** and scroll, so controls like the sync **Connect** button are always reachable on a phone.
- Switched to simple running version numbers (1.3, 1.4, …).

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
