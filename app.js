/* Flowy — ADHD workflow status tracker. Zero-build vanilla PWA.
   Behavior ported 1:1 from the design prototype (Flowy.dc.html). */
(function () {
  'use strict';

  var KEY = 'flow-app-v2';
  // App version — bump this one line on each release (see CHANGELOG in README).
  // Shown next to the wordmark and at the bottom of the Settings sheet.
  var VERSION = '1.5';
  // How many workflows can be "pinned" (shown as chips up top) at once.
  var MAX_ACTIVE = 4;
  // Material Symbols Rounded ligature names, grouped by theme so the picker browses well.
  var ICONS = [
    // Work / office
    'ads_click','calendar_month','gavel','domain','campaign','mail','call','phone_in_talk','phone_iphone','laptop_mac',
    'inbox','payments','receipt_long','savings','account_balance','work','edit_note','checklist','task_alt','description',
    'article','newspaper','contract_edit','note_alt','sticky_note_2','psychology','group','person','event','today',
    'schedule','alarm','timer',
    // Books / library / studying
    'menu_book','auto_stories','import_contacts','chrome_reader_mode','local_library','library_books','collections_bookmark','book','book_2','bookmark',
    'bookmarks','school','history_edu','subject','translate','science','biotech','calculate','functions','quiz',
    'fact_check','lightbulb','edit','draw','stylus_note',
    // Physical activity / sports
    'directions_run','directions_walk','hiking','fitness_center','exercise','self_improvement','spa','directions_bike','pool','surfing',
    'sports_soccer','sports_basketball','sports_tennis','sports_golf','sports_baseball','sports_football','sports_martial_arts','emoji_events',
    // Family / kids
    'family_restroom','escalator_warning','child_care','toys',
    // Home repair / yard / garden
    'handyman','home_repair_service','construction','format_paint','grass','yard','potted_plant','local_florist','agriculture',
    // Sorting / organizing / piles
    'sort','swap_vert','filter_list','filter_alt','low_priority','category','stacks','layers','view_kanban','inventory_2','move_to_inbox','sort_by_alpha',
    // Daily life
    'home','restaurant','local_dining','lunch_dining','coffee','local_cafe','shopping_cart','bed','bedtime','nightlight',
    'wb_sunny','pets','music_note','movie','flight','directions_car','water_drop','medication','favorite','star',
    'grade','check_circle','park','forest','cleaning_services','local_laundry_service','flag'
  ];
  var EMOJI_MAP = {'🎯':'ads_click','📅':'calendar_month','⚖️':'gavel','🏢':'domain','📣':'campaign','✉️':'mail','📞':'call','💰':'payments','📝':'edit_note','⏱️':'schedule','📬':'inbox','🧾':'receipt_long','💼':'work','🧠':'psychology','☕':'local_cafe','🏃':'directions_run'};

  // Settings (persisted). Defaults match the prototype's defaults.
  var SKEY = 'flow-settings-v1';
  var DEFAULT_SETTINGS = { tapMode: 'red-green', autoReset: true, celebration: true, palette: ['#a8503f','#a3781f','#3f7d5a'], widget: false };
  function loadSettings() {
    try {
      var raw = localStorage.getItem(SKEY);
      if (raw) return Object.assign({}, DEFAULT_SETTINGS, JSON.parse(raw));
    } catch (e) {}
    return Object.assign({}, DEFAULT_SETTINGS);
  }
  var settings = loadSettings();

  // Compact "widget" layout: on when the user forces it in Settings, OR when
  // the window is small (so pinning Flowy small in a corner just works).
  function applyWidgetClass() {
    var small = window.innerWidth <= 380 || window.innerHeight <= 540;
    document.body.classList.toggle('widget', !!settings.widget || small);
  }
  window.addEventListener('resize', applyWidgetClass);

  // Track the *visible* viewport height so bottom sheets sit above the mobile
  // keyboard (which shrinks visualViewport) instead of hiding behind it.
  function setVVH() {
    var h = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
    document.documentElement.style.setProperty('--vvh', Math.round(h) + 'px');
  }
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', setVVH);
    window.visualViewport.addEventListener('scroll', setVVH);
  }
  window.addEventListener('resize', setVVH);
  setVVH();

  function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function uid() { return 'x' + Math.random().toString(36).slice(2, 8); }
  function fixIcon(ic) { return EMOJI_MAP[ic] || (/^[a-z_0-9]+$/.test(ic || '') ? ic : 'flag'); }

  function seed() {
    return {
      workflows: [
        { id: 'w1', name: 'Daily Flow', active: true, steps: [
          { id: 's1', name: 'Leads', icon: 'ads_click', st: 0 },
          { id: 's2', name: 'Events', icon: 'calendar_month', st: 0 },
          { id: 's3', name: 'Cases', icon: 'gavel', st: 0 },
          { id: 's4', name: 'Firm Management', icon: 'domain', st: 0 },
          { id: 's5', name: 'Marketing', icon: 'campaign', st: 0 },
          { id: 's6', name: 'Email', icon: 'mail', st: 0 }
        ]},
        { id: 'w2', name: 'Wind-down', active: true, steps: [
          { id: 's7', name: 'Log time', icon: 'schedule', st: 0 },
          { id: 's8', name: 'Tomorrow’s list', icon: 'edit_note', st: 0 }
        ]}
      ],
      activeId: 'w1', editing: false, pickerFor: null, dragId: null,
      managing: false, capNote: false, settingsOpen: false, colorPickerFor: null, confetti: null, lastReset: today(), updatedAt: 0
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY) || localStorage.getItem('flow-app-v1');
      if (raw) {
        var d = JSON.parse(raw);
        if (d && d.workflows && d.workflows.length) {
          var wfs = d.workflows.map(function (w) {
            return Object.assign({}, w, { steps: w.steps.map(function (p) { return Object.assign({}, p, { icon: fixIcon(p.icon) }); }) });
          });
          // Backfill the "active" (pinned) flag for data saved before this feature:
          // if none of the workflows carry the flag, pin the first MAX_ACTIVE.
          var hasFlag = wfs.some(function (w) { return typeof w.active === 'boolean'; });
          wfs = wfs.map(function (w, i) {
            return Object.assign({}, w, { active: hasFlag ? !!w.active : i < MAX_ACTIVE });
          });
          if (!wfs.some(function (w) { return w.active; })) wfs[0].active = true;
          // The viewed workflow must be one that's pinned.
          var aid = d.activeId;
          if (!wfs.some(function (w) { return w.id === aid && w.active; })) {
            aid = wfs.filter(function (w) { return w.active; })[0].id;
          }
          return { workflows: wfs, activeId: aid, editing: false, pickerFor: null, dragId: null, managing: false, capNote: false, settingsOpen: false, colorPickerFor: null, confetti: null, lastReset: d.lastReset || today(), updatedAt: d.updatedAt || 0 };
        }
      }
    } catch (e) {}
    return seed();
  }

  var state = load();
  var confettiTimer = null;

  function persist() {
    if (!syncApplying) state.updatedAt = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify({ workflows: state.workflows, activeId: state.activeId, lastReset: state.lastReset, updatedAt: state.updatedAt || 0 })); } catch (e) {}
    if (!syncApplying) syncPush();
  }
  function setState(patch) { Object.assign(state, patch); persist(); render(); }

  // ================= Cross-device sync (Firebase Realtime Database) =================
  // Optional. When configured, the same data blob localStorage holds is mirrored
  // to Firebase under a private "sync code". Any device with the same config +
  // code shares one Flowy. Offline still works (localStorage is the cache);
  // conflicts resolve last-edit-wins by timestamp.
  var SYNCKEY = 'flow-sync-v1';
  var FBV = '10.12.5';
  var FB_CDN = [
    'https://www.gstatic.com/firebasejs/' + FBV + '/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/' + FBV + '/firebase-auth-compat.js',
    'https://www.gstatic.com/firebasejs/' + FBV + '/firebase-database-compat.js'
  ];
  function loadSync() { try { return JSON.parse(localStorage.getItem(SYNCKEY)) || {}; } catch (e) { return {}; } }
  function saveSync() { try { localStorage.setItem(SYNCKEY, JSON.stringify(sync)); } catch (e) {} }
  var sync = loadSync();
  var syncApplying = false;
  var fb = { ready: false, ref: null, clientId: null, status: sync.enabled ? 'connecting' : 'off', error: '' };

  function setSyncStatus(s, err) { fb.status = s; fb.error = err || ''; if (state.settingsOpen) render(); }
  function currentPayload() { return { workflows: state.workflows, activeId: state.activeId, lastReset: state.lastReset }; }

  // Unicode-safe base64 for the one-paste "device link".
  function b64enc(str) { return btoa(unescape(encodeURIComponent(str))); }
  function b64dec(str) { return decodeURIComponent(escape(atob(str))); }
  function makeDeviceLink() { return b64enc(JSON.stringify({ config: sync.config, code: sync.code })); }
  function parseDeviceLink(str) { var o = JSON.parse(b64dec((str || '').trim())); if (!o.config || !o.code) throw new Error('bad link'); return o; }

  // Accept a pasted Firebase config as JSON, a bare {…} object, or the whole
  // Firebase snippet (import lines + initializeApp) — we pull out just the
  // object assigned to firebaseConfig. Unquoted keys and trailing commas ok.
  function parseConfig(text) {
    text = text || '';
    var body = null;
    var m = text.match(/firebaseConfig\s*=\s*(\{[\s\S]*?\})\s*;?/);   // the actual config object, if a full snippet was pasted
    if (m) body = m[1];
    if (!body) { var m2 = text.match(/\{[\s\S]*\}/); if (m2) body = m2[0]; }
    if (!body) throw new Error('No { … } config found');
    try { return JSON.parse(body); } catch (e) {}
    var fixed = body.replace(/([,{]\s*)([A-Za-z0-9_]+)\s*:/g, '$1"$2":').replace(/'/g, '"').replace(/,(\s*[}\]])/g, '$1');
    return JSON.parse(fixed);
  }
  function sanitizeCode(c) { return String(c || '').replace(/[.#$\[\]\/]/g, '-').replace(/\s+/g, '-'); }
  function randomCode() { return 'flowy-' + Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 8); }

  // Normalize a remote data blob the same way load() treats stored data.
  function normalizeData(d) {
    if (!d || !d.workflows || !d.workflows.length) return null;
    var wfs = d.workflows.map(function (w) {
      return Object.assign({}, w, { steps: (w.steps || []).map(function (p) { return Object.assign({}, p, { icon: fixIcon(p.icon) }); }) });
    });
    var hasFlag = wfs.some(function (w) { return typeof w.active === 'boolean'; });
    wfs = wfs.map(function (w, i) { return Object.assign({}, w, { active: hasFlag ? !!w.active : i < MAX_ACTIVE }); });
    if (!wfs.some(function (w) { return w.active; })) wfs[0].active = true;
    var aid = d.activeId;
    if (!wfs.some(function (w) { return w.id === aid && w.active; })) aid = wfs.filter(function (w) { return w.active; })[0].id;
    return { workflows: wfs, activeId: aid, lastReset: d.lastReset || today() };
  }

  function syncPush() {
    if (!fb.ready || syncApplying) return;
    if (!state.updatedAt) state.updatedAt = Date.now();
    try { fb.ref.set({ data: currentPayload(), updatedAt: state.updatedAt, from: fb.clientId }); } catch (e) {}
  }
  function applyRemote(v) {
    var norm = normalizeData(v && v.data);
    if (!norm) return;
    syncApplying = true;
    state.workflows = norm.workflows; state.activeId = norm.activeId; state.lastReset = norm.lastReset;
    state.updatedAt = v.updatedAt || Date.now();
    persist();            // refresh local cache without bumping timestamp or re-pushing
    syncApplying = false;
    render();
  }
  function onRemote(snap) {
    var v = snap.val();
    if (!v || !v.data) { syncPush(); return; }   // remote empty → seed from this device
    var rt = v.updatedAt || 0, lt = state.updatedAt || 0;
    if (rt > lt) applyRemote(v);
    else if (rt < lt) syncPush();                 // this device is newer → push
  }

  function loadScriptsSeq(list) {
    return list.reduce(function (chain, src) {
      return chain.then(function () {
        return new Promise(function (res, rej) {
          if (document.querySelector('script[src="' + src + '"]')) return res();
          var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('Failed to load ' + src)); };
          document.head.appendChild(s);
        });
      });
    }, Promise.resolve());
  }
  function initFirebase() {
    if (!(sync.enabled && sync.config && sync.code)) { setSyncStatus('off'); return; }
    setSyncStatus('connecting');
    loadScriptsSeq(FB_CDN).then(function () {
      if (!window.firebase) throw new Error('Firebase failed to load (offline?)');
      if (!firebase.apps.length) firebase.initializeApp(sync.config);
      return firebase.auth().signInAnonymously();
    }).then(function (cred) {
      fb.clientId = (cred && cred.user && cred.user.uid) || ('c' + Math.random().toString(36).slice(2));
      if (fb.ref) { try { fb.ref.off('value', onRemote); } catch (e) {} }
      fb.ref = firebase.database().ref('flows/' + sanitizeCode(sync.code));
      fb.ready = true;
      setSyncStatus('connected');
      fb.ref.on('value', onRemote);
    }).catch(function (e) {
      fb.ready = false;
      setSyncStatus('error', (e && e.message) || String(e));
    });
  }
  function connectSync(config, code) {
    sync = { enabled: true, config: config, code: sanitizeCode(code || randomCode()) };
    saveSync();
    fb.ready = false;
    initFirebase();
  }
  function disconnectSync() {
    if (fb.ref) { try { fb.ref.off('value', onRemote); } catch (e) {} }
    fb.ready = false; fb.ref = null;
    sync = { enabled: false };
    saveSync();
    setSyncStatus('off');
  }

  function wf() { return state.workflows.filter(function (w) { return w.id === state.activeId; })[0] || state.workflows[0]; }
  function activeCount() { return state.workflows.filter(function (w) { return w.active; }).length; }
  // Pin / unpin a workflow. Enforces the MAX_ACTIVE cap and keeps at least one
  // pinned; if the currently-viewed workflow gets unpinned, switch to another.
  function toggleActive(id) {
    var target = state.workflows.filter(function (w) { return w.id === id; })[0];
    if (!target) return;
    if (target.active) {
      if (activeCount() <= 1) return; // never leave zero pinned
      state.workflows = state.workflows.map(function (w) { return w.id === id ? Object.assign({}, w, { active: false }) : w; });
      var patch = { capNote: false };
      if (state.activeId === id) patch.activeId = state.workflows.filter(function (w) { return w.active; })[0].id;
      setState(patch);
    } else {
      if (activeCount() >= MAX_ACTIVE) { setState({ capNote: true }); return; }
      state.workflows = state.workflows.map(function (w) { return w.id === id ? Object.assign({}, w, { active: true }) : w; });
      setState({ capNote: false });
    }
  }
  // Permanently delete a workflow. Keeps at least one workflow and at least
  // one pinned; if the deleted one was being viewed, switch to another.
  function deleteWorkflow(id) {
    if (state.workflows.length <= 1) return;
    var rest = state.workflows.filter(function (w) { return w.id !== id; });
    if (!rest.some(function (w) { return w.active; })) rest[0] = Object.assign({}, rest[0], { active: true });
    var patch = { workflows: rest, editing: false, pickerFor: null, capNote: false };
    if (state.activeId === id) {
      var next = rest.filter(function (w) { return w.active; })[0] || rest[0];
      patch.activeId = next.id;
    }
    setState(patch);
  }
  // ---- settings persistence ----
  function persistSettings() { try { localStorage.setItem(SKEY, JSON.stringify(settings)); } catch (e) {} }
  function saveSettings(patch) { Object.assign(settings, patch); persistSettings(); render(); }
  // Update one status color without re-rendering (keeps the native color
  // picker open while dragging); the sheet re-renders when it's closed.
  function setPaletteColor(idx, v) { var np = palette().slice(); np[idx] = v; settings.palette = np; persistSettings(); }
  // Same, but writes to the active workflow's own color override (seeded from
  // the global palette the first time). No re-render, so a drag isn't broken.
  function setFlowPaletteColor(idx, v) {
    var w = wf();
    var base = hasFlowPalette(w) ? w.palette.slice() : palette().slice();
    base[idx] = v;
    mutWfNoRender(function (x) { return Object.assign({}, x, { palette: base }); });
  }
  // Drop the active workflow's color override so it falls back to the default.
  function clearFlowPalette() {
    var id = wf().id;
    var rest = state.workflows.map(function (x) {
      if (x.id !== id) return x;
      var y = Object.assign({}, x); delete y.palette; return y;
    });
    setState({ workflows: rest, colorPickerFor: null });
  }
  function mutWf(fn) {
    var id = wf().id;
    state.workflows = state.workflows.map(function (w) { return w.id === id ? fn(w) : w; });
    persist(); render();
  }
  function palette() {
    var p = settings.palette;
    return (Array.isArray(p) && p.length >= 3) ? p : ['#a8503f','#a3781f','#3f7d5a'];
  }
  // A workflow's effective status colors: its own override if it has one,
  // otherwise the global default from settings.
  function paletteFor(w) {
    var p = w && w.palette;
    return (Array.isArray(p) && p.length >= 3) ? p : palette();
  }
  function hasFlowPalette(w) { return !!(w && Array.isArray(w.palette) && w.palette.length >= 3); }
  function mix(hex, pct) { return 'color-mix(in oklab, ' + hex + ' ' + pct + '%, #fdfbf7)'; }

  // ---- color math for the drag-to-pick picker (hex <-> HSV) ----
  function hexToRgb(hex) {
    hex = (hex || '').replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(function (c) { return c + c; }).join('');
    var n = parseInt(hex || '000000', 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function rgbToHex(r, g, b) {
    function h(x) { x = Math.round(Math.min(255, Math.max(0, x))); return (x < 16 ? '0' : '') + x.toString(16); }
    return '#' + h(r) + h(g) + h(b);
  }
  function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min, hh = 0;
    if (d) {
      if (max === r) hh = ((g - b) / d) % 6;
      else if (max === g) hh = (b - r) / d + 2;
      else hh = (r - g) / d + 4;
      hh *= 60; if (hh < 0) hh += 360;
    }
    return { h: hh, s: max ? d / max : 0, v: max };
  }
  function hsvToHex(h, s, v) {
    var c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c, r, g, b;
    if (h < 60) { r = c; g = x; b = 0; } else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; } else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; } else { r = c; g = 0; b = x; }
    return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
  }
  function hexToHsv(hex) { var c = hexToRgb(hex); return rgbToHsv(c.r, c.g, c.b); }

  function tap(idx) {
    var three = settings.tapMode === 'red-yellow-green';
    mutWf(function (w) {
      return Object.assign({}, w, { steps: w.steps.map(function (p, i) {
        if (i !== idx) return p;
        return Object.assign({}, p, { st: three ? (p.st + 1) % 3 : (p.st === 2 ? 0 : 2) });
      }) });
    });
    setTimeout(checkDone, 0);
  }

  function checkDone() {
    var w = wf();
    var allDone = w.steps.length && w.steps.every(function (p) { return p.st === 2; });
    if (settings.celebration && allDone && !state.confetti) {
      var colors = ['#a8503f','#a3781f','#3f7d5a','#41618f','#7a5a94','#c2764a'];
      var pieces = [];
      for (var i = 0; i < 60; i++) {
        pieces.push({
          left: Math.random() * 100, w: 6 + Math.random() * 6, h: 9 + Math.random() * 7,
          bg: colors[i % 6], rad: Math.random() > 0.5 ? 99 : 2,
          dur: 2.2 + Math.random() * 1.6, delay: Math.random() * 0.7
        });
      }
      setState({ confetti: pieces });
      clearTimeout(confettiTimer);
      confettiTimer = setTimeout(function () { setState({ confetti: null }); }, 4200);
    }
  }

  function swap(a, b) {
    mutWf(function (w) { var st = w.steps.slice(); var t = st[a]; st[a] = st[b]; st[b] = t; return Object.assign({}, w, { steps: st }); });
  }
  function beginDrag(e, idx) {
    e.preventDefault();
    var ROW = 72, curr = idx, startY = e.clientY;
    setState({ pickerFor: null, dragId: wf().steps[idx].id });
    function move(ev) {
      var dy = ev.clientY - startY;
      var n = wf().steps.length;
      if (dy > ROW / 2 && curr < n - 1) { swap(curr, curr + 1); curr++; startY += ROW; }
      else if (dy < -ROW / 2 && curr > 0) { swap(curr, curr - 1); curr--; startY -= ROW; }
    }
    function up() {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setState({ dragId: null });
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  // ---- helpers to build DOM ----
  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'style') n.setAttribute('style', attrs[k]);
      else if (k === 'class') n.className = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    }
    if (children) children.forEach(function (c) { if (c != null) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function icon(name, cls, style) { return el('span', { 'class': (cls ? cls + ' ' : '') + 'msr', style: style || '' , text: name }); }
  // Inline gear (SVG) for the settings button — always renders, no icon-font
  // dependency, so it can never fall back to showing the word "tune".
  function gearIcon() {
    var s = el('span', { 'class': 'gearico' });
    s.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>';
    return s;
  }
  function esc(s) { return s; }

  function dateLine() {
    var d = new Date();
    return ['SUN','MON','TUE','WED','THU','FRI','SAT'][d.getDay()] + ' · ' +
      ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][d.getMonth()] + ' ' + d.getDate();
  }

  function render() {
    var app = document.getElementById('app');
    var s = state, w = wf(), pal = paletteFor(w);
    var allDone = w.steps.length > 0 && w.steps.every(function (p) { return p.st === 2; });

    var frag = document.createDocumentFragment();

    // Brand
    frag.appendChild(el('div', { 'class': 'brand' }, [
      el('img', { src: 'assets/badge-green.png', alt: '' }),
      el('span', { text: 'Flowy' }),
      el('span', { 'class': 'ver', text: 'v' + VERSION }),
      el('button', { 'class': 'gearbtn', 'aria-label': 'Settings',
        onClick: function () { setState({ settingsOpen: true, pickerFor: null, managing: false, colorPickerFor: null, colorScope: 'flow' }); } }, [ gearIcon() ])
    ]));

    // Chips — only pinned (active) workflows show up top.
    var chips = el('div', { 'class': 'chips' });
    s.workflows.filter(function (x) { return x.active; }).forEach(function (x) {
      chips.appendChild(el('button', {
        'class': 'chip ' + (x.id === w.id ? 'active' : 'inactive'),
        text: x.name,
        onClick: function () { setState({ activeId: x.id, pickerFor: null }); }
      }));
    });
    chips.appendChild(el('button', {
      'class': 'chip add', text: '＋', 'aria-label': 'Add workflow',
      onClick: function () {
        var id = uid();
        var full = activeCount() >= MAX_ACTIVE;
        state.workflows = state.workflows.concat([{ id: id, name: 'New flow', active: !full, steps: [{ id: uid(), name: 'First step', icon: 'flag', st: 0 }] }]);
        // No room to pin it? Drop into the manage sheet so it can be seen/pinned.
        if (full) setState({ managing: true, capNote: true });
        else setState({ activeId: id, editing: true, pickerFor: null });
      }
    }));
    chips.appendChild(el('button', {
      'class': 'chip manage', text: '⋯', 'aria-label': 'Manage workflows',
      onClick: function () { setState({ managing: true, capNote: false, pickerFor: null }); }
    }));
    frag.appendChild(chips);

    // Header
    var header = el('div', { 'class': 'header' });
    if (s.editing) {
      var wfInput = el('input', {
        'class': 'wfname-input', value: w.name, 'aria-label': 'Workflow name',
        onInput: function (ev) { var v = ev.target.value; mutWfNoRender(function (x) { return Object.assign({}, x, { name: v }); }); updateChipLabel(w.id, v); }
      });
      header.appendChild(wfInput);
    } else {
      header.appendChild(el('h1', { 'class': 'wfname', text: w.name }));
    }
    var sub = el('div', { 'class': 'subline' + (allDone && !s.editing ? ' done' : ''),
      text: s.editing ? 'Drag ⠿ to reorder · tap icon to swap' : (allDone ? 'All clear — flow complete' : dateLine()) });
    header.appendChild(sub);
    // Slim progress bar (visible in widget mode) — done steps at a glance.
    if (!s.editing) {
      var doneN = w.steps.filter(function (p) { return p.st === 2; }).length;
      var totN = w.steps.length;
      var pct = totN ? Math.round(doneN / totN * 100) : 0;
      header.appendChild(el('div', { 'class': 'progress', 'aria-label': doneN + ' of ' + totN + ' done' }, [
        el('span', { 'class': 'progress-track' }, [
          el('i', { 'class': 'progress-fill', style: 'width:' + pct + '%;background:' + pal[2] })
        ]),
        el('span', { 'class': 'progress-cap', text: doneN + '/' + totN })
      ]));
    }
    frag.appendChild(header);

    // List
    var list = el('div', { 'class': 'list' });
    if (!s.editing) {
      w.steps.forEach(function (p, i) {
        var tag = p.st === 0 ? 'TO DO' : p.st === 1 ? 'IN PROGRESS' : 'DONE ✓';
        list.appendChild(el('button', {
          'class': 'step',
          style: 'background:' + mix(pal[p.st], p.st === 2 ? 20 : 13) + ';border:1px solid ' + mix(pal[p.st], 40),
          onClick: (function (idx) { return function () { tap(idx); }; })(i)
        }, [
          el('span', { 'class': 'ic', style: 'background:' + pal[p.st] }, [ icon(p.icon) ]),
          el('span', { 'class': 'nm', style: 'color:' + (p.st === 2 ? '#5a6b5f' : '#241f1a'), text: p.name }),
          el('span', { 'class': 'tag', style: 'color:' + pal[p.st], text: tag })
        ]));
      });
    } else {
      w.steps.forEach(function (p, i) {
        var top = el('div', { 'class': 'erow-top' }, [
          el('span', { 'class': 'drag', text: '⠿', 'aria-label': 'Drag to reorder',
            onPointerdown: (function (idx) { return function (ev) { beginDrag(ev, idx); }; })(i) }),
          el('button', { 'class': 'icbtn', 'aria-label': 'Change icon',
            onClick: (function (id) { return function () { setState({ pickerFor: s.pickerFor === id ? null : id }); }; })(p.id) }, [ icon(p.icon, null, 'font-size:25px;color:#6b6355') ]),
          el('input', { 'class': 'nameinput', value: p.name, placeholder: 'Step name', 'aria-label': 'Step name',
            onInput: (function (idx) { return function (ev) { var v = ev.target.value; mutWfNoRender(function (x) { return Object.assign({}, x, { steps: x.steps.map(function (q, j) { return j === idx ? Object.assign({}, q, { name: v }) : q; }) }); }); }; })(i) }),
          el('button', { 'class': 'rm', text: '✕', 'aria-label': 'Remove step',
            onClick: (function (idx) { return function () { mutWf(function (x) { return Object.assign({}, x, { steps: x.steps.filter(function (q, j) { return j !== idx; }) }); }); }; })(i) })
        ]);
        var rowChildren = [top];
        if (s.pickerFor === p.id) {
          var grid = el('div', { 'class': 'grid' });
          ICONS.forEach(function (ch) {
            grid.appendChild(el('button', {
              'class': 'gcell',
              style: 'background:' + (ch === p.icon ? '#e8dfc9' : '#f1ebdf') + ';border:1px solid ' + (ch === p.icon ? '#241f1a' : 'transparent'),
              onClick: (function (idx, c) { return function () {
                mutWfNoRender(function (x) { return Object.assign({}, x, { steps: x.steps.map(function (q, j) { return j === idx ? Object.assign({}, q, { icon: c }) : q; }) }); });
                setState({ pickerFor: null });
              }; })(i, ch)
            }, [ icon(ch, null, 'font-size:24px;color:#6b6355') ]));
          });
          rowChildren.push(grid);
        }
        list.appendChild(el('div', { 'class': 'erow', style: 'background:' + (s.dragId === p.id ? '#f1ebdf' : '#fdfbf7') }, rowChildren));
      });
      if (s.workflows.length > 1) {
        list.appendChild(el('button', { 'class': 'delwf', text: '✕ DELETE THIS WORKFLOW',
          onClick: function () {
            if (window.confirm('Delete “' + (w.name || 'Untitled flow') + '”? This can’t be undone.')) deleteWorkflow(w.id);
          } }));
      }
    }
    frag.appendChild(list);

    // Footer
    var footer = el('div', { 'class': 'footer' });
    if (!s.editing) {
      footer.appendChild(el('button', { 'class': 'btn ghost', text: 'Reset',
        onClick: function () { mutWf(function (x) { return Object.assign({}, x, { steps: x.steps.map(function (p) { return Object.assign({}, p, { st: 0 }); }) }); }); } }));
      footer.appendChild(el('button', { 'class': 'btn solid grow', text: 'Edit flow',
        onClick: function () { setState({ editing: true, pickerFor: null }); } }));
    } else {
      footer.appendChild(el('button', { 'class': 'btn ghost grow', text: '＋ Add step',
        onClick: function () { mutWf(function (x) { return Object.assign({}, x, { steps: x.steps.concat([{ id: uid(), name: '', icon: 'flag', st: 0 }]) }); }); } }));
      footer.appendChild(el('button', { 'class': 'btn solid grow', text: 'Done',
        onClick: function () { setState({ editing: false, pickerFor: null }); } }));
    }
    frag.appendChild(footer);

    // Manage sheet — pin/unpin any workflow. Only pinned ones become top chips.
    if (s.managing) {
      var actN = activeCount();
      var backdrop = el('div', { 'class': 'sheet-backdrop',
        onClick: function () { setState({ managing: false, capNote: false }); } });
      var panel = el('div', { 'class': 'sheet', onClick: function (ev) { ev.stopPropagation(); } });
      panel.appendChild(el('div', { 'class': 'sheet-title', text: 'Workflows' }));
      panel.appendChild(el('div', { 'class': 'sheet-sub',
        text: 'Pin up to ' + MAX_ACTIVE + ' to show up top · ' + actN + '/' + MAX_ACTIVE + ' pinned' }));
      if (s.capNote) panel.appendChild(el('div', { 'class': 'sheet-note',
        text: 'That’s ' + MAX_ACTIVE + ' pinned — unpin one to make room.' }));
      var wlist = el('div', { 'class': 'sheet-list' });
      s.workflows.forEach(function (x) {
        var pinned = !!x.active;
        var row = el('div', { 'class': 'wfrow' + (x.id === w.id ? ' current' : '') }, [
          el('button', {
            'class': 'pin' + (pinned ? ' on' : ''),
            'aria-label': pinned ? 'Unpin workflow' : 'Pin workflow',
            onClick: (function (id) { return function () { toggleActive(id); }; })(x.id)
          }, [ icon('push_pin') ]),
          el('button', {
            'class': 'wfrow-name',
            onClick: (function (xx) { return function () {
              // Tapping a pinned workflow opens it; an unpinned one pins it.
              if (xx.active) setState({ activeId: xx.id, managing: false, capNote: false });
              else toggleActive(xx.id);
            }; })(x)
          }, [
            el('span', { 'class': 'wfrow-title', text: x.name || 'Untitled flow' }),
            el('span', { 'class': 'wfrow-meta', text: x.steps.length + (x.steps.length === 1 ? ' step' : ' steps') + (pinned ? '' : ' · not pinned') })
          ]),
          (s.workflows.length > 1 ? el('button', {
            'class': 'wfrow-del', 'aria-label': 'Delete workflow',
            onClick: (function (xx) { return function (ev) {
              ev.stopPropagation();
              if (window.confirm('Delete “' + (xx.name || 'Untitled flow') + '”? This can’t be undone.')) deleteWorkflow(xx.id);
            }; })(x)
          }, [ icon('delete') ]) : null)
        ]);
        wlist.appendChild(row);
      });
      panel.appendChild(wlist);
      panel.appendChild(el('button', { 'class': 'btn solid sheet-done', text: 'Done',
        onClick: function () { setState({ managing: false, capNote: false }); } }));
      backdrop.appendChild(panel);
      frag.appendChild(backdrop);
    }

    // Settings sheet — app-wide status colors + tap behavior.
    if (s.settingsOpen) {
      var three = settings.tapMode === 'red-yellow-green';
      var sBackdrop = el('div', { 'class': 'sheet-backdrop',
        onClick: function () { setState({ settingsOpen: false, colorPickerFor: null }); } });
      var sPanel = el('div', { 'class': 'sheet', onClick: function (ev) { ev.stopPropagation(); } });
      sPanel.appendChild(el('div', { 'class': 'sheet-title', text: 'Settings' }));
      var scopeGlobal = s.colorScope === 'global';
      var curPal = scopeGlobal ? palette() : paletteFor(w);
      sPanel.appendChild(el('div', { 'class': 'sheet-sub', text: 'What the colors mean' }));

      // Scope switch — tune just this flow's colors, or the app-wide default.
      sPanel.appendChild(el('div', { 'class': 'scope' }, [
        el('button', { 'class': 'scope-opt' + (!scopeGlobal ? ' on' : ''), text: 'This flow',
          onClick: function () { setState({ colorScope: 'flow', colorPickerFor: null }); } }),
        el('button', { 'class': 'scope-opt' + (scopeGlobal ? ' on' : ''), text: 'All flows',
          onClick: function () { setState({ colorScope: 'global', colorPickerFor: null }); } })
      ]));
      sPanel.appendChild(el('div', { 'class': 'set-cap',
        text: scopeGlobal ? 'Default for flows without their own colors'
          : (hasFlowPalette(w) ? 'Custom colors for “' + (w.name || 'this flow') + '”'
                               : 'Set colors just for “' + (w.name || 'this flow') + '”') }));

      // A press-and-drag color picker: a saturation/brightness square + a hue
      // strip. Dragging updates the color live (persist only, no re-render, so
      // the gesture isn't interrupted); the swatch/value update in place.
      var buildPicker = function (startHex, swatchEl, valEl, writeFn) {
        var hsv = hexToHsv(startHex);
        var hue = hsv.h, sat = hsv.s, val = hsv.v;
        var svThumb = el('span', { 'class': 'sv-thumb' });
        var sv = el('div', { 'class': 'sv-square' }, [ svThumb ]);
        var hueThumb = el('span', { 'class': 'hue-thumb' });
        var hueBar = el('div', { 'class': 'hue-bar' }, [ hueThumb ]);
        function paintSV() {
          sv.style.background = 'linear-gradient(to top, #000, rgba(0,0,0,0)),' +
            'linear-gradient(to right, #fff, rgba(255,255,255,0)), hsl(' + hue + ',100%,50%)';
        }
        function placeThumbs() {
          svThumb.style.left = (sat * 100) + '%';
          svThumb.style.top = ((1 - val) * 100) + '%';
          hueThumb.style.left = (hue / 360 * 100) + '%';
        }
        function commit() {
          var hex = hsvToHex(hue, sat, val);
          writeFn(hex);
          svThumb.style.background = hex;
          hueThumb.style.background = 'hsl(' + hue + ',100%,50%)';
          if (swatchEl) swatchEl.style.background = hex;
          if (valEl) valEl.textContent = hex.toUpperCase();
        }
        function dragOn(surface, onMove) {
          surface.addEventListener('pointerdown', function (e) {
            e.preventDefault();
            var r = surface.getBoundingClientRect();
            function upd(ev) { onMove(ev, r); placeThumbs(); commit(); }
            upd(e);
            function mv(ev) { ev.preventDefault(); upd(ev); }
            function up() { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); }
            window.addEventListener('pointermove', mv);
            window.addEventListener('pointerup', up);
          });
        }
        dragOn(sv, function (ev, r) {
          var x = Math.min(Math.max(ev.clientX - r.left, 0), r.width);
          var y = Math.min(Math.max(ev.clientY - r.top, 0), r.height);
          sat = r.width ? x / r.width : 0;
          val = r.height ? 1 - y / r.height : 0;
        });
        dragOn(hueBar, function (ev, r) {
          var x = Math.min(Math.max(ev.clientX - r.left, 0), r.width);
          hue = r.width ? x / r.width * 360 : 0;
          paintSV();
        });
        paintSV(); placeThumbs();
        svThumb.style.background = startHex;
        hueThumb.style.background = 'hsl(' + hue + ',100%,50%)';
        return el('div', { 'class': 'picker' }, [ sv, hueBar ]);
      };

      // Persist one color to the active scope (flow override vs global default).
      var writeColor = function (idx) {
        return scopeGlobal
          ? function (hex) { setPaletteColor(idx, hex); }
          : function (hex) { setFlowPaletteColor(idx, hex); };
      };

      var colorRow = function (label, idx) {
        var open = s.colorPickerFor === idx;
        var cur = curPal[idx];
        var swatchEl = el('span', { 'class': 'swatch', style: 'background:' + cur });
        var valEl = el('span', { 'class': 'setval', text: cur.toUpperCase() });
        var header = el('button', { 'class': 'setrow setrow-btn' + (open ? ' open' : ''), 'aria-label': label + ' color',
          onClick: (function (i) { return function () { setState({ colorPickerFor: s.colorPickerFor === i ? null : i }); }; })(idx) }, [
          swatchEl,
          el('span', { 'class': 'setlabel', text: label }),
          valEl,
          el('span', { 'class': 'setcaret msr', text: open ? 'expand_less' : 'expand_more' })
        ]);
        var wrap = el('div', { 'class': 'setcolor' + (open ? ' open' : '') }, [ header ]);
        if (open) wrap.appendChild(buildPicker(cur, swatchEl, valEl, writeColor(idx)));
        return wrap;
      };

      var setBody = el('div', { 'class': 'set-list' });
      setBody.appendChild(colorRow('“To do”', 0));
      if (three) setBody.appendChild(colorRow('“In progress”', 1));
      setBody.appendChild(colorRow('“Done”', 2));
      if (scopeGlobal) {
        setBody.appendChild(el('button', { 'class': 'set-reset', text: 'Reset to default colors',
          onClick: function () { saveSettings({ palette: DEFAULT_SETTINGS.palette.slice() }); } }));
      } else if (hasFlowPalette(w)) {
        setBody.appendChild(el('button', { 'class': 'set-reset', text: 'Use default colors for this flow',
          onClick: function () { clearFlowPalette(); } }));
      }
      sPanel.appendChild(setBody);

      sPanel.appendChild(el('div', { 'class': 'sheet-sub', style: 'margin-top:18px', text: 'Behavior' }));
      var behBody = el('div', { 'class': 'set-list' });
      behBody.appendChild(el('button', { 'class': 'setrow setrow-btn', 'aria-label': 'Toggle in-progress step',
        onClick: function () { saveSettings({ tapMode: three ? 'red-green' : 'red-yellow-green' }); } }, [
        el('span', { 'class': 'setlabel', text: 'Include an “In progress” step' }),
        el('span', { 'class': 'toggle' + (three ? ' on' : '') }, [ el('span', { 'class': 'knob' }) ])
      ]));
      behBody.appendChild(el('button', { 'class': 'setrow setrow-btn', 'aria-label': 'Toggle compact widget mode',
        onClick: function () { saveSettings({ widget: !settings.widget }); } }, [
        el('span', { 'class': 'setlabel' }, [
          el('span', { text: 'Compact widget mode' }),
          el('span', { 'class': 'sethint', text: 'Denser layout · auto-on in a small window' })
        ]),
        el('span', { 'class': 'toggle' + (settings.widget ? ' on' : '') }, [ el('span', { 'class': 'knob' }) ])
      ]));
      sPanel.appendChild(behBody);

      // ---- Sync across devices ----
      sPanel.appendChild(el('div', { 'class': 'sheet-sub', style: 'margin-top:18px', text: 'Sync across devices' }));
      var syncBody = el('div', { 'class': 'set-list' });
      var connected = !!(sync.enabled && sync.config && sync.code);
      if (connected) {
        var statusText = fb.status === 'connected' ? 'Connected · syncing'
          : fb.status === 'connecting' ? 'Connecting…'
          : fb.status === 'error' ? 'Not connected' : 'On';
        syncBody.appendChild(el('div', { 'class': 'setrow', style: 'display:block' }, [
          el('div', { 'class': 'syncstat ' + fb.status }, [ el('span', { 'class': 'syncdot' }), el('span', { text: statusText }) ]),
          el('div', { 'class': 'sethint', style: 'margin-top:9px', text: 'Sync code' }),
          el('div', { 'class': 'synccode', text: sync.code }),
          (fb.status === 'error' && fb.error ? el('div', { 'class': 'sethint', style: 'color:var(--remove);margin-top:7px', text: fb.error }) : null)
        ]));
        syncBody.appendChild(el('button', { 'class': 'setrow setrow-btn', 'aria-label': 'Copy device link',
          onClick: function () {
            try { navigator.clipboard.writeText(makeDeviceLink()); } catch (e) {}
            window.alert('Device link copied.\n\nOn your other device: open Flowy → Settings → Sync, and paste it into the box, then tap Connect.');
          } }, [ el('span', { 'class': 'setlabel' }, [
          el('span', { text: 'Copy device link' }),
          el('span', { 'class': 'sethint', text: 'One paste links another device' })
        ]) ]));
        if (fb.status === 'error') syncBody.appendChild(el('button', { 'class': 'set-reset', text: 'Retry connection', onClick: function () { initFirebase(); } }));
        syncBody.appendChild(el('button', { 'class': 'set-reset', style: 'color:var(--remove)', text: 'Turn off sync on this device',
          onClick: function () { if (window.confirm('Turn off sync on this device? Your data stays here — it just stops syncing.')) disconnectSync(); } }));
      } else {
        syncBody.appendChild(el('div', { 'class': 'sethint', style: 'margin:0 2px 5px;text-transform:none;letter-spacing:0',
          text: 'Paste a device link from an already-synced device, or your Firebase config, to share one Flowy everywhere. Set up on the device that has the flows you want to keep first.' }));
        var ta = el('textarea', { 'class': 'syncinput', rows: '3', placeholder: 'Paste device link or Firebase config…', spellcheck: 'false', autocapitalize: 'off', autocorrect: 'off' });
        var codeIn = el('input', { 'class': 'synccode-input', placeholder: 'Sync code (optional — auto-created)', spellcheck: 'false', autocapitalize: 'off' });
        syncBody.appendChild(ta);
        syncBody.appendChild(codeIn);
        syncBody.appendChild(el('button', { 'class': 'btn solid', style: 'width:100%', text: 'Connect',
          onClick: function () {
            var raw = (ta.value || '').trim();
            if (!raw) { window.alert('Paste a device link or your Firebase config first.'); return; }
            try {
              var link = null;
              try { link = parseDeviceLink(raw); } catch (e) { link = null; }
              if (link) connectSync(link.config, link.code);
              else connectSync(parseConfig(raw), (codeIn.value || '').trim() || randomCode());
            } catch (e) { window.alert('Could not read that. Paste the full Firebase config object, or a device link from another device.\n\n(' + ((e && e.message) || e) + ')'); }
          } }));
        if (fb.status === 'error' && fb.error) syncBody.appendChild(el('div', { 'class': 'sethint', style: 'color:var(--remove);margin-top:7px', text: fb.error }));
      }
      sPanel.appendChild(syncBody);

      sPanel.appendChild(el('div', { 'class': 'set-ver', text: 'Flowy · v' + VERSION }));
      sPanel.appendChild(el('button', { 'class': 'btn solid sheet-done', text: 'Done',
        onClick: function () { setState({ settingsOpen: false, colorPickerFor: null }); } }));
      sBackdrop.appendChild(sPanel);
      frag.appendChild(sBackdrop);
    }

    // Confetti
    if (s.confetti) {
      var overlay = el('div', { 'class': 'confetti' });
      s.confetti.forEach(function (p) {
        overlay.appendChild(el('i', { style:
          'left:' + p.left + '%;width:' + p.w + 'px;height:' + p.h + 'px;background:' + p.bg +
          ';border-radius:' + p.rad + 'px;animation:flowFall ' + p.dur + 's linear ' + p.delay + 's forwards' }));
      });
      frag.appendChild(overlay);
    }

    app.innerHTML = '';
    app.appendChild(frag);
    applyWidgetClass();
  }

  // Mutate the active workflow WITHOUT re-rendering (used for text inputs so
  // the caret/focus is preserved while typing). Persists immediately.
  function mutWfNoRender(fn) {
    var id = wf().id;
    state.workflows = state.workflows.map(function (w) { return w.id === id ? fn(w) : w; });
    persist();
  }
  function updateChipLabel(id, name) {
    var chips = document.querySelectorAll('.chips .chip');
    var idx = state.workflows.map(function (w) { return w.id; }).indexOf(id);
    if (idx >= 0 && chips[idx]) chips[idx].textContent = name;
  }

  // Auto-reset on open if a new day (matches componentDidMount).
  if (settings.autoReset && state.lastReset !== today()) {
    state.lastReset = today();
    state.workflows = state.workflows.map(function (w) {
      return Object.assign({}, w, { steps: w.steps.map(function (p) { return Object.assign({}, p, { st: 0 }); }) });
    });
    persist();
  }

  render();

  // Kick off cross-device sync if it's been configured on this device.
  if (sync.enabled && sync.config && sync.code) initFirebase();
})();
