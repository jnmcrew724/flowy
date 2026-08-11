/* Flowy — ADHD workflow status tracker. Zero-build vanilla PWA.
   Behavior ported 1:1 from the design prototype (Flowy.dc.html). */
(function () {
  'use strict';

  var KEY = 'flow-app-v2';
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
    // Daily life
    'home','restaurant','local_dining','lunch_dining','coffee','local_cafe','shopping_cart','bed','bedtime','nightlight',
    'wb_sunny','pets','music_note','movie','flight','directions_car','water_drop','medication','favorite','star',
    'grade','check_circle','park','forest','cleaning_services','local_laundry_service','flag'
  ];
  var EMOJI_MAP = {'🎯':'ads_click','📅':'calendar_month','⚖️':'gavel','🏢':'domain','📣':'campaign','✉️':'mail','📞':'call','💰':'payments','📝':'edit_note','⏱️':'schedule','📬':'inbox','🧾':'receipt_long','💼':'work','🧠':'psychology','☕':'local_cafe','🏃':'directions_run'};

  // Settings (persisted). Defaults match the prototype's defaults.
  var SKEY = 'flow-settings-v1';
  var DEFAULT_SETTINGS = { tapMode: 'red-green', autoReset: true, celebration: true, palette: ['#a8503f','#a3781f','#3f7d5a'] };
  function loadSettings() {
    try {
      var raw = localStorage.getItem(SKEY);
      if (raw) return Object.assign({}, DEFAULT_SETTINGS, JSON.parse(raw));
    } catch (e) {}
    return Object.assign({}, DEFAULT_SETTINGS);
  }
  var settings = loadSettings();

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
      managing: false, capNote: false, confetti: null, lastReset: today()
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
          return { workflows: wfs, activeId: aid, editing: false, pickerFor: null, dragId: null, managing: false, capNote: false, confetti: null, lastReset: d.lastReset || today() };
        }
      }
    } catch (e) {}
    return seed();
  }

  var state = load();
  var confettiTimer = null;

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify({ workflows: state.workflows, activeId: state.activeId, lastReset: state.lastReset })); } catch (e) {}
  }
  function setState(patch) { Object.assign(state, patch); persist(); render(); }

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
  function mutWf(fn) {
    var id = wf().id;
    state.workflows = state.workflows.map(function (w) { return w.id === id ? fn(w) : w; });
    persist(); render();
  }
  function palette() {
    var p = settings.palette;
    return (Array.isArray(p) && p.length >= 3) ? p : ['#a8503f','#a3781f','#3f7d5a'];
  }
  function mix(hex, pct) { return 'color-mix(in oklab, ' + hex + ' ' + pct + '%, #fdfbf7)'; }

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
  function esc(s) { return s; }

  function dateLine() {
    var d = new Date();
    return ['SUN','MON','TUE','WED','THU','FRI','SAT'][d.getDay()] + ' · ' +
      ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][d.getMonth()] + ' ' + d.getDate();
  }

  function render() {
    var app = document.getElementById('app');
    var s = state, w = wf(), pal = palette();
    var allDone = w.steps.length > 0 && w.steps.every(function (p) { return p.st === 2; });

    var frag = document.createDocumentFragment();

    // Brand
    frag.appendChild(el('div', { 'class': 'brand' }, [
      el('img', { src: 'assets/badge-green.png', alt: '' }),
      el('span', { text: 'Flowy' })
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
            var rest = state.workflows.filter(function (x) { return x.id !== w.id; });
            var next = rest.filter(function (x) { return x.active; })[0] || rest[0];
            if (!next.active) rest = rest.map(function (x) { return x.id === next.id ? Object.assign({}, x, { active: true }) : x; });
            setState({ workflows: rest, activeId: next.id, editing: false, pickerFor: null, managing: false });
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
          ])
        ]);
        wlist.appendChild(row);
      });
      panel.appendChild(wlist);
      panel.appendChild(el('button', { 'class': 'btn solid sheet-done', text: 'Done',
        onClick: function () { setState({ managing: false, capNote: false }); } }));
      backdrop.appendChild(panel);
      frag.appendChild(backdrop);
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
})();
