(() => {
  'use strict';

  // ---------------------------------------------------------------- constants
  const cfg = window.TOPHAT_CONFIG || {};
  const CONFIGURED = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);
  const DEMO = !CONFIGURED;

  const STATUSES = [
    { id: 'not_started', label: 'To do' },
    { id: 'in_progress', label: 'Doing' },
    { id: 'blocked', label: 'Blocked' },
    { id: 'done', label: 'Done' },
  ];
  const STATUS_LABEL = Object.fromEntries(STATUSES.map(s => [s.id, s.label]));
  const COLORS = ['#2e86ab', '#e4572e', '#7b61ff', '#29a35a', '#e0a100', '#d63384', '#00a6a6', '#8d6e63'];

  const ICON = {
    check: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.5l3 3 6-7"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15l6-6 6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>',
  };

  // ---------------------------------------------------------------- helpers
  const $ = sel => document.querySelector(sel);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16);
    }));
  const now = () => new Date().toISOString();
  const byPos = (a, b) => (a.position - b.position) || String(a.created_at || '').localeCompare(String(b.created_at || ''));

  const LS = {
    get(k, d) { try { const v = localStorage.getItem('tophat:' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('tophat:' + k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
    del(k) { try { localStorage.removeItem('tophat:' + k); } catch { /* storage unavailable */ } },
  };

  function safeUrl(raw) {
    let u = String(raw || '').trim();
    if (!u) return null;
    if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) u = 'https://' + u;
    try {
      const p = new URL(u);
      return (p.protocol === 'http:' || p.protocol === 'https:') ? p.href : null;
    } catch { return null; }
  }
  const safeColor = c => (/^#[0-9a-f]{3,8}$/i.test(c || '') ? c : '#888888');
  const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };

  function daysUntil(dateStr) {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    const n = new Date();
    return Math.round((new Date(y, m - 1, d) - new Date(n.getFullYear(), n.getMonth(), n.getDate())) / 86400000);
  }
  function prettyDate(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }
  function ago(iso) {
    if (!iso) return '';
    const then = new Date(iso);
    const s = (Date.now() - then.getTime()) / 1000;
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    const days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) / 86400000);
    if (days === 1) return 'yesterday';
    if (days < 7) return days + 'd ago';
    return then.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  // When a task's status last changed (older rows fall back to when the task was created).
  const statusAt = t => t.status_changed_at || t.created_at;

  // ---------------------------------------------------------------- seed (demo mode)
  function seedData() {
    const plan = [
      ['Profiles & Platforms', '#2e86ab', ['Claim Spotify artist profile', 'Claim YouTube artist page', 'Set up Bandcamp page', 'Create landing page']],
      ['Release Marketing', '#e4572e', [['Pre-save link', ['Set a pre-save goal']], 'Set up Meta ads campaign',
        ['Post content: 3 weeks before → 4 weeks after release', ['Come up with plan', 'Organize and schedule']]]],
      ['Music Video', '#7b61ff', ['Finish music video & figure out timeline', 'Release music video']],
      ['Outreach', '#29a35a', ['Playlisting', 'Radio outreach', 'Reach out to labels']],
      ['Live & Merch', '#e0a100', ['Plan release event', 'Reach out to venues for release show', 'Physical copies']],
    ];
    const categories = [], tasks = [];
    plan.forEach(([name, color, items], ci) => {
      const id = uuid();
      categories.push({ id, name, color, position: ci, created_at: now() });
      items.forEach((it, ti) => {
        const [title, subs] = Array.isArray(it) ? it : [it, []];
        tasks.push({
          id: uuid(), category_id: id, title, owner: null, status: 'not_started', notes: '',
          links: [], subtasks: subs.map(text => ({ text, done: false })), position: ti,
          created_at: now(), updated_at: now(), status_changed_at: now(), status_changed_by: null,
        });
      });
    });
    return {
      settings: { id: 1, band_name: 'Fly Fishermen', album_name: 'Top Hat to the Hoe Down', release_date: '2026-11-05', members: ['Me', 'Nick', 'Gabe'] },
      categories, tasks,
    };
  }

  // ---------------------------------------------------------------- stores
  function makeDemoStore() {
    const KEY = 'demo-db';
    const read = () => LS.get(KEY, null) || (() => { const s = seedData(); LS.set(KEY, s); return s; })();
    const write = fn => { const db = read(); fn(db); LS.set(KEY, db); };
    const listOf = (db, table) => db[table];
    return {
      async load() { return read(); },
      async insert(table, row) { write(db => listOf(db, table).push(row)); },
      async update(table, id, patch) {
        write(db => {
          if (table === 'settings') { Object.assign(db.settings, patch); return; }
          const r = listOf(db, table).find(x => x.id === id);
          if (r) Object.assign(r, patch);
        });
      },
      async remove(table, id) {
        write(db => {
          db[table] = listOf(db, table).filter(x => x.id !== id);
          if (table === 'categories') db.tasks = db.tasks.filter(t => t.category_id !== id);
        });
      },
      subscribe({ reload, status }) {
        status('demo');
        window.addEventListener('storage', e => { if (e.key === 'tophat:' + KEY) reload(); });
      },
      reset() { LS.del(KEY); },
    };
  }

  function makeSupabaseStore() {
    const lib = window.supabase;
    const opts = key => ({ auth: { persistSession: false, autoRefreshToken: false, storageKey: 'tophat-' + key } });
    const db = lib.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, opts('read'));
    const notAllowed = () => Object.assign(new Error('not_allowed'), { code: '42501' });

    return {
      async load() {
        const [s, c, t] = await Promise.all([
          db.from('settings').select('*').eq('id', 1).maybeSingle(),
          db.from('categories').select('*').order('position'),
          db.from('tasks').select('*').order('position'),
        ]);
        const err = s.error || c.error || t.error;
        if (err) throw err;
        return { settings: s.data, categories: c.data, tasks: t.data };
      },
      async insert(table, row) {
        const { error } = await db.from(table).insert(row);
        if (error) throw error;
      },
      async update(table, id, patch) {
        // RLS silently skips rows it won't let us touch, so ask for the rows back.
        const { data, error } = await db.from(table).update(patch).eq('id', id).select('id');
        if (error) throw error;
        if (!data.length) throw notAllowed();
      },
      async remove(table, id) {
        const { data, error } = await db.from(table).delete().eq('id', id).select('id');
        if (error) throw error;
        if (!data.length) throw notAllowed();
      },
      subscribe({ change, status }) {
        db.channel('tophat-live')
          .on('postgres_changes', { event: '*', schema: 'public' }, p => change(p.table, p.eventType, p.new, p.old))
          .subscribe(s => status(s === 'SUBSCRIBED' ? 'on' : 'off'));
      },
    };
  }

  // ---------------------------------------------------------------- state
  const state = {
    loaded: false,
    fatal: null,
    live: 'off',
    settings: { band_name: '', album_name: '', release_date: null, members: [] },
    categories: [],
    tasks: [],
    filter: { owner: LS.get('f-owner', 'all'), status: LS.get('f-status', 'all') },
    me: LS.get('me', ''),
    canEdit: true,
    drawer: null, // {type:'task'|'category'|'settings', id?}
  };

  let store = null;

  function setData(d) {
    state.settings = d.settings || state.settings;
    state.settings.members = state.settings.members || [];
    state.categories = (d.categories || []).slice().sort(byPos);
    state.tasks = (d.tasks || []).map(normTask);
  }
  function normTask(t) {
    return { ...t, links: Array.isArray(t.links) ? t.links : [], subtasks: Array.isArray(t.subtasks) ? t.subtasks : [], notes: t.notes || '' };
  }

  const members = () => state.settings.members || [];
  const catById = id => state.categories.find(c => c.id === id);
  const taskById = id => state.tasks.find(t => t.id === id);
  const tasksIn = cid => state.tasks.filter(t => t.category_id === cid).sort(byPos);

  function applyRemote(table, type, row, old) {
    if (table === 'settings') {
      if (type !== 'DELETE') state.settings = { ...state.settings, ...row };
    } else if (table === 'categories' || table === 'tasks') {
      const list = state[table];
      if (type === 'DELETE') {
        state[table] = list.filter(x => x.id !== old.id);
        if (table === 'categories') state.tasks = state.tasks.filter(t => t.category_id !== old.id);
      } else {
        const r = table === 'tasks' ? normTask(row) : row;
        const i = list.findIndex(x => x.id === r.id);
        if (i >= 0) list[i] = r; else list.push(r);
        if (table === 'categories') list.sort(byPos);
      }
    }
    scheduleRender(true);
  }

  async function refresh() {
    try {
      setData(await store.load());
      state.fatal = null;
      state.loaded = true;
    } catch (e) {
      console.error(e);
      if (!state.loaded) state.fatal = e;
      else toast("Couldn't refresh — check your connection.", true);
    }
    render(true);
  }

  // Apply a change locally right away, then save it. If saving fails, reload the truth.
  // skipDrawer: the edit came from a field in the open drawer, which already shows the new value —
  // redrawing it would steal focus from wherever the person clicked next.
  async function mutate(local, remote, { skipDrawer = false } = {}) {
    local();
    render(false, skipDrawer);
    try {
      await remote();
      return true;
    } catch (e) {
      console.error(e);
      if (e && (e.code === '42501' || e.message === 'not_allowed' || e.status === 401 || e.status === 403)) {
        toast('The database refused that change.', true);
      } else if (e && e.code && e.message) {
        // The database answered with a specific problem — show it instead of blaming the connection.
        toast(`Couldn't save: ${e.message}`, true);
      } else {
        toast("Couldn't save — check your connection and try again.", true);
      }
      await refresh();
      return false;
    }
  }

  // ---------------------------------------------------------------- actions
  const touch = patch => ({ ...patch, updated_at: now() });

  function updateTask(id, patch, opts) {
    const t = taskById(id);
    if (!t) return;
    const p = touch(patch);
    if ('status' in p && p.status !== t.status) {
      p.status_changed_at = p.updated_at;
      p.status_changed_by = state.me || null;
    }
    return mutate(() => Object.assign(t, p), () => store.update('tasks', id, p), opts);
  }

  function addTask(category_id, title) {
    const siblings = tasksIn(category_id);
    const row = {
      id: uuid(), category_id, title, owner: null, status: 'not_started', notes: '', links: [], subtasks: [],
      position: siblings.length ? Math.max(...siblings.map(t => t.position)) + 1 : 0,
      created_at: now(), updated_at: now(), status_changed_at: now(), status_changed_by: state.me || null,
    };
    return mutate(() => state.tasks.push(row), () => store.insert('tasks', row));
  }

  function deleteTask(id) {
    return mutate(() => { state.tasks = state.tasks.filter(t => t.id !== id); }, () => store.remove('tasks', id));
  }

  function addCategory(name, color) {
    const row = {
      id: uuid(), name, color,
      position: state.categories.length ? Math.max(...state.categories.map(c => c.position)) + 1 : 0,
      created_at: now(),
    };
    return mutate(() => state.categories.push(row), () => store.insert('categories', row));
  }

  function updateCategory(id, patch) {
    const c = catById(id);
    if (!c) return;
    return mutate(() => Object.assign(c, patch), () => store.update('categories', id, patch));
  }

  function deleteCategory(id) {
    return mutate(() => {
      state.categories = state.categories.filter(c => c.id !== id);
      state.tasks = state.tasks.filter(t => t.category_id !== id);
    }, () => store.remove('categories', id));
  }

  function moveCategory(id, dir) {
    const list = state.categories.slice().sort(byPos);
    const i = list.findIndex(c => c.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    // Renumber everything so positions are always clean, then save the two that swapped.
    [list[i], list[j]] = [list[j], list[i]];
    const changed = [];
    list.forEach((c, k) => { if (c.position !== k) changed.push([c, k]); });
    return mutate(
      () => { changed.forEach(([c, k]) => { c.position = k; }); state.categories.sort(byPos); },
      async () => { for (const [c, k] of changed) await store.update('categories', c.id, { position: k }); },
    );
  }

  function updateSettings(patch, opts) {
    return mutate(() => Object.assign(state.settings, patch), () => store.update('settings', 1, touch(patch)), opts);
  }

  function renameMember(oldName, newName) {
    newName = newName.trim();
    if (!newName || newName === oldName) return render();
    if (members().includes(newName)) { toast(`${newName} is already in the band.`, true); return render(); }
    const affected = state.tasks.filter(t => t.owner === oldName);
    const list = members().map(m => (m === oldName ? newName : m));
    if (state.me === oldName) { state.me = newName; LS.set('me', newName); }
    if (state.filter.owner === oldName) setFilter('owner', newName);
    return mutate(
      () => { state.settings.members = list; affected.forEach(t => { t.owner = newName; }); },
      async () => {
        await store.update('settings', 1, touch({ members: list }));
        for (const t of affected) await store.update('tasks', t.id, touch({ owner: newName }));
      },
      { skipDrawer: true },
    );
  }

  function removeMember(name) {
    const affected = state.tasks.filter(t => t.owner === name);
    const list = members().filter(m => m !== name);
    if (state.filter.owner === name) setFilter('owner', 'all');
    return mutate(
      () => { state.settings.members = list; affected.forEach(t => { t.owner = null; }); },
      async () => {
        await store.update('settings', 1, touch({ members: list }));
        for (const t of affected) await store.update('tasks', t.id, touch({ owner: null }));
      },
    );
  }


  function setFilter(key, val) {
    state.filter[key] = val;
    LS.set('f-' + key, val);
  }

  // ---------------------------------------------------------------- filtering
  function ownerMatch(t, f) {
    if (f === 'all') return true;
    if (f === 'unassigned') return !t.owner || !members().includes(t.owner);
    return t.owner === f;
  }
  function statusMatch(t, f) {
    if (f === 'all') return true;
    if (f === 'open') return t.status !== 'done';
    return t.status === f;
  }
  const matches = t => ownerMatch(t, state.filter.owner) && statusMatch(t, state.filter.status);
  const filtering = () => state.filter.owner !== 'all' || state.filter.status !== 'all';

  // ---------------------------------------------------------------- render
  let renderQueued = false;
  function scheduleRender(remote) {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => { renderQueued = false; render(remote); });
  }

  // Keep what someone is typing when the page redraws underneath them.
  function captureKeep() {
    const el = document.activeElement;
    if (!el || !el.dataset || !el.dataset.keep) return null;
    return { key: el.dataset.keep, value: el.value, start: el.selectionStart, end: el.selectionEnd };
  }
  function restoreKeep(k) {
    if (!k) return;
    const el = document.querySelector(`[data-keep="${CSS.escape(k.key)}"]`);
    if (!el) return;
    el.value = k.value;
    el.focus();
    try { el.setSelectionRange(k.start, k.end); } catch { /* not a text input */ }
  }

  function render(remote = false, skipDrawer = false) {
    document.body.classList.toggle('readonly', !state.canEdit);
    document.title = (state.settings.band_name || 'Band') + ' · Release HQ';
    const keep = captureKeep();

    if (state.fatal) {
      $('#hdr').innerHTML = '';
      $('#filters').innerHTML = '';
      $('#board').innerHTML = renderFatal();
      return;
    }
    if (!state.loaded) return;

    $('#hdr').innerHTML = renderHeader();
    $('#filters').innerHTML = renderFilters();
    $('#board').innerHTML = renderBoard();

    // Don't yank a form out from under someone mid-edit when a bandmate's change arrives.
    const drawerBusy = remote && $('#drawer').contains(document.activeElement) &&
      /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if (!drawerBusy && !skipDrawer) renderDrawer();
    restoreKeep(keep);
  }

  function renderFatal() {
    const msg = state.fatal && (state.fatal.message || String(state.fatal));
    const missingLib = CONFIGURED && !window.supabase;
    return `<div class="fatal">
      <h2>Couldn't load the dashboard</h2>
      <p>${missingLib ? "The database library didn't load. Check your connection."
        : 'The database may be asleep (free Supabase projects pause after a week of no use — restore it from the Supabase dashboard), or the keys in config.js may be wrong.'}</p>
      ${msg ? `<p><small>${esc(msg)}</small></p>` : ''}
      <button class="btn primary" data-action="retry">Try again</button>
    </div>`;
  }

  function renderHeader() {
    const s = state.settings;
    const total = state.tasks.length;
    const done = state.tasks.filter(t => t.status === 'done').length;
    const pct = total ? Math.round(done / total * 100) : 0;
    const d = daysUntil(s.release_date);
    let num = '—', lbl = 'Set a release date<br>in settings';
    if (d !== null) {
      if (d > 0) { num = d; lbl = `day${d === 1 ? '' : 's'} to release<br>${esc(prettyDate(s.release_date))}`; }
      else if (d === 0) { num = '🎉'; lbl = 'Release day!<br>' + esc(prettyDate(s.release_date)); }
      else { num = -d; lbl = `day${d === -1 ? '' : 's'} since release<br>${esc(prettyDate(s.release_date))}`; }
    }
    const liveCls = state.live === 'demo' ? 'demo' : state.live === 'on' ? 'on' : '';
    const liveTxt = state.live === 'demo' ? 'Demo' : state.live === 'on' ? 'Live' : 'Offline';
    return `
      <div class="hdr-top">
        <div class="titles">
          <h1 class="band">${esc(s.band_name || 'Our Band')}</h1>
          ${s.album_name ? `<p class="album">${esc(s.album_name)}</p>` : ''}
        </div>
        <div class="hdr-actions">
          <span class="live ${liveCls}" title="${state.live === 'demo' ? 'Demo mode — data stays in this browser' : 'Changes sync live'}">${liveTxt}</span>
          <button class="icon-btn" data-action="open-settings" aria-label="Settings" title="Settings">${ICON.gear}</button>
        </div>
      </div>
      <div class="stats">
        <div class="countdown"><span class="num">${num}</span><span class="lbl">${lbl}</span></div>
        <div class="overall">
          <div class="row"><span><strong>${done}</strong> of ${total} tasks done</span><strong>${pct}%</strong></div>
          <div class="bar multi">${total ? state.categories.slice().sort(byPos).map(c => {
            const n = state.tasks.filter(t => t.category_id === c.id && t.status === 'done').length;
            return n ? `<span style="width:${n / total * 100}%;background:${safeColor(c.color)}" title="${esc(c.name)}: ${n} done"></span>` : '';
          }).join('') : ''}</div>
        </div>
      </div>`;
  }

  function renderFilters() {
    const f = state.filter;
    const ownerOpts = [['all', 'Everyone'], ...members().map(m => [m, m === state.me ? `${m} (you)` : m]), ['unassigned', 'Unassigned']];
    const statusOpts = [['all', 'All'], ['open', 'Open'], ...STATUSES.map(s => [s.id, s.label])];
    const ownerCount = v => state.tasks.filter(t => ownerMatch(t, v) && statusMatch(t, f.status)).length;
    const statusCount = v => state.tasks.filter(t => statusMatch(t, v) && ownerMatch(t, f.owner)).length;
    const chip = (key, [v, label], count) =>
      `<button class="chip ${f[key] === v ? 'on' : ''}" data-action="filter" data-key="${key}" data-val="${esc(v)}" aria-pressed="${f[key] === v}">${esc(label)}<span class="n">${count}</span></button>`;
    return `
      <div class="chips" role="group" aria-label="Filter by person">${ownerOpts.map(o => chip('owner', o, ownerCount(o[0]))).join('')}</div>
      <div class="chips" role="group" aria-label="Filter by status">${statusOpts.map(o => chip('status', o, statusCount(o[0]))).join('')}</div>`;
  }

  function renderBoard() {
    const cats = state.categories.slice().sort(byPos);
    const parts = [];
    cats.forEach((c, idx) => {
      const all = tasksIn(c.id);
      const shown = all.filter(matches).sort((a, b) => (a.status === 'done') - (b.status === 'done') || byPos(a, b));
      if (filtering() && !shown.length) return;
      const done = all.filter(t => t.status === 'done').length;
      const pct = all.length ? Math.round(done / all.length * 100) : 0;
      parts.push(`
        <section class="project" style="--c:${safeColor(c.color)}" aria-label="${esc(c.name)}">
          <div class="project-head">
            <div class="project-title">
              <span class="dot"></span>
              <h2>${esc(c.name)}</h2>
              <span class="count">${done}/${all.length}</span>
              <div class="project-tools edit-only">
                <button class="icon-btn sm ghost" data-action="cat-up" data-id="${c.id}" aria-label="Move category up" ${idx === 0 ? 'disabled' : ''}>${ICON.up}</button>
                <button class="icon-btn sm ghost" data-action="cat-down" data-id="${c.id}" aria-label="Move category down" ${idx === cats.length - 1 ? 'disabled' : ''}>${ICON.down}</button>
                <button class="icon-btn sm ghost" data-action="open-category" data-id="${c.id}" aria-label="Edit category">${ICON.edit}</button>
              </div>
            </div>
            <div class="bar thin"><span style="width:${pct}%"></span></div>
          </div>
          <ul class="tasks">${shown.map(renderTask).join('')}</ul>
          <form class="add-task edit-only" data-form="add-task" data-cat="${c.id}">
            <input type="text" name="title" data-keep="add-${c.id}" placeholder="Add a task…" aria-label="New task in ${esc(c.name)}" autocomplete="off" enterkeyhint="done">
            <button class="btn" type="submit">Add</button>
          </form>
        </section>`);
    });
    if (!parts.length) {
      parts.push(state.categories.length
        ? `<p class="empty">No tasks match these filters.</p>`
        : `<p class="empty">No categories yet.</p>`);
    }
    parts.push(`<button class="btn new-project edit-only" data-action="new-category">+ New category</button>`);
    return parts.join('');
  }

  function renderTask(t) {
    const subsDone = t.subtasks.filter(s => s.done).length;
    const meta = [];
    meta.push(t.owner
      ? `<span class="pill owner">${esc(t.owner)}</span>`
      : `<span class="pill owner none">Unassigned</span>`);
    if (t.subtasks.length) meta.push(`<span title="Checklist">${ICON.list} ${subsDone}/${t.subtasks.length}</span>`);
    if (t.links.length) meta.push(`<span title="Links">${ICON.link} ${t.links.length}</span>`);
    const done = t.status === 'done';
    return `
      <li class="task s-${t.status}">
        <button class="check" data-action="toggle-done" data-id="${t.id}" aria-label="${done ? 'Mark not done' : 'Mark done'}" ${state.canEdit ? '' : 'disabled'}><span>${ICON.check}</span></button>
        <button class="task-main" data-action="open-task" data-id="${t.id}">
          <span class="task-title">${esc(t.title)}</span>
          ${t.notes.trim() ? `<span class="task-notes">${esc(t.notes.trim())}</span>` : ''}
          <span class="meta">${meta.join('')}</span>
        </button>
        <button class="task-status" data-action="open-task" data-id="${t.id}" title="Status changed ${esc(new Date(statusAt(t)).toLocaleString())}${t.status_changed_by ? ' by ' + esc(t.status_changed_by) : ''}">
          <span class="status-badge st-${t.status}">${STATUS_LABEL[t.status]}</span>
          <span class="status-when"><span data-ago="${esc(statusAt(t))}">${esc(ago(statusAt(t)))}</span>${t.status_changed_by ? ` · ${esc(t.status_changed_by)}` : ''}</span>
        </button>
      </li>`;
  }

  // ---------------------------------------------------------------- drawer
  function openDrawer(d) {
    state.drawer = d;
    renderDrawer();
    const first = $('#drawer').querySelector('[autofocus]');
    if (first) first.focus();
  }
  function closeDrawer() {
    state.drawer = null;
    renderDrawer();
  }

  function renderDrawer() {
    const el = $('#drawer'), scrim = $('#scrim');
    const d = state.drawer;
    let html = null;
    if (d) {
      if (d.type === 'task') { const t = taskById(d.id); html = t ? drawerTask(t) : null; }
      else if (d.type === 'category') { const c = d.id ? catById(d.id) : { name: '', color: COLORS[state.categories.length % COLORS.length] }; html = c ? drawerCategory(c, !d.id) : null; }
      else if (d.type === 'settings') html = drawerSettings();
    }
    if (!html) {
      if (d) state.drawer = null; // the thing we were looking at was deleted
      el.hidden = true; scrim.hidden = true; el.innerHTML = '';
      document.body.style.overflow = '';
      return;
    }
    const scroll = el.scrollTop;
    el.innerHTML = html;
    el.hidden = false; scrim.hidden = false;
    el.scrollTop = scroll;
    document.body.style.overflow = 'hidden';
    el.querySelectorAll('.title-input').forEach(autosize);
  }

  function autosize(ta) { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }

  const closeBtn = `<button class="icon-btn ghost" data-action="close" aria-label="Close">${ICON.close}</button>`;

  function drawerTask(t) {
    const c = catById(t.category_id) || { name: '', color: '#999' };
    const ro = state.canEdit ? '' : 'readonly';
    const dis = state.canEdit ? '' : 'disabled';
    const owners = members().slice();
    if (t.owner && !owners.includes(t.owner)) owners.push(t.owner);
    const subsDone = t.subtasks.filter(s => s.done).length;
    return `
      <div class="drawer-head">
        <span class="eyebrow" style="--c:${safeColor(c.color)}"><span class="dot"></span>${esc(c.name)}</span>
        ${closeBtn}
      </div>
      <textarea class="title-input" data-field="title" rows="1" aria-label="Task title" ${ro}>${esc(t.title)}</textarea>

      <div class="field">
        <span class="label">Status</span>
        <div class="seg" role="group" aria-label="Status">
          ${STATUSES.map(s => `<button class="st-${s.id} ${t.status === s.id ? 'on' : ''}" data-action="set-status" data-status="${s.id}" aria-pressed="${t.status === s.id}" ${dis}>${s.label}</button>`).join('')}
        </div>
        <p class="hint">${t.status_changed_at ? 'Set to' : 'Added as'} <strong>${STATUS_LABEL[t.status]}</strong> <span data-ago="${esc(statusAt(t))}">${esc(ago(statusAt(t)))}</span>${t.status_changed_by ? ` by ${esc(t.status_changed_by)}` : ''}</p>
      </div>

      <div class="grid2">
        <label class="field"><span class="label">Owner</span>
          <select data-field="owner" ${dis}>
            <option value="">Unassigned</option>
            ${owners.map(m => `<option value="${esc(m)}" ${t.owner === m ? 'selected' : ''}>${esc(m)}</option>`).join('')}
          </select>
        </label>
        <label class="field"><span class="label">Category</span>
          <select data-field="category_id" ${dis}>
            ${state.categories.map(x => `<option value="${x.id}" ${x.id === t.category_id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}
          </select>
        </label>
      </div>

      <span class="section-label">Checklist ${t.subtasks.length ? `<small>${subsDone}/${t.subtasks.length}</small>` : ''}</span>
      <div class="card">
        <ul class="list">
          ${t.subtasks.map((s, i) => `
            <li class="${s.done ? 'done' : ''}">
              <label><input type="checkbox" data-action="toggle-sub" data-i="${i}" ${s.done ? 'checked' : ''} ${dis}><span>${esc(s.text)}</span></label>
              <button class="icon-btn sm ghost edit-only" data-action="del-sub" data-i="${i}" aria-label="Remove step">${ICON.close}</button>
            </li>`).join('') || '<li class="empty-row">No steps yet.</li>'}
        </ul>
        <form class="inline-add edit-only" data-form="add-sub">
          <input type="text" name="text" data-keep="sub-${t.id}" placeholder="Add a step…" aria-label="New step" autocomplete="off" enterkeyhint="done">
          <button class="btn" type="submit">Add</button>
        </form>
      </div>

      <label class="field"><span class="label">Notes</span>
        <textarea data-field="notes" rows="5" placeholder="${state.canEdit ? 'Ideas, contacts, decisions…' : ''}" ${ro}>${esc(t.notes)}</textarea>
      </label>

      <span class="section-label">Links</span>
      <div class="card">
        <ul class="list">
          ${t.links.map((l, i) => {
            const href = safeUrl(l.url);
            return `<li>
              ${href ? `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(l.label || hostOf(href))}<small>${esc(hostOf(href))}</small></a>` : `<span>${esc(l.label || l.url)}</span>`}
              <button class="icon-btn sm ghost edit-only" data-action="del-link" data-i="${i}" aria-label="Remove link">${ICON.close}</button>
            </li>`;
          }).join('') || '<li class="empty-row">No links yet.</li>'}
        </ul>
        <form class="link-form edit-only" data-form="add-link" novalidate>
          <input type="text" name="label" data-keep="ll-${t.id}" placeholder="Label" aria-label="Link label" autocomplete="off">
          <input type="text" name="url" data-keep="lu-${t.id}" placeholder="https://…" aria-label="Link URL" autocomplete="off" inputmode="url">
          <button class="btn" type="submit">Add</button>
        </form>
      </div>

      <div class="drawer-foot">
        <span class="stamp">Updated ${esc(ago(t.updated_at))}</span>
        <button class="btn danger edit-only" data-action="delete-task">Delete task</button>
      </div>`;
  }

  function drawerCategory(c, isNew) {
    const count = isNew ? 0 : tasksIn(c.id).length;
    return `
      <div class="drawer-head"><span class="eyebrow">${isNew ? 'New category' : 'Edit category'}</span>${closeBtn}</div>
      <form data-form="category">
        <label class="field"><span class="label">Name</span>
          <input type="text" name="name" value="${esc(c.name)}" placeholder="e.g. Merch, Tour, Press" autocomplete="off" required autofocus>
        </label>
        <div class="field"><span class="label">Color</span>
          <div class="swatches" role="radiogroup" aria-label="Color">
            ${COLORS.map(col => `<button type="button" class="swatch ${col === c.color ? 'on' : ''}" style="background:${col}" data-action="pick-color" data-color="${col}" role="radio" aria-checked="${col === c.color}" aria-label="${col}"></button>`).join('')}
          </div>
          <input type="hidden" name="color" value="${esc(c.color)}">
        </div>
        <div class="drawer-foot">
          ${isNew ? '<span></span>' : `<button type="button" class="btn danger" data-action="delete-category">Delete category${count ? ` (${count} task${count > 1 ? 's' : ''})` : ''}</button>`}
          <button class="btn primary" type="submit">${isNew ? 'Create category' : 'Save'}</button>
        </div>
      </form>`;
  }

  function drawerSettings() {
    const s = state.settings;
    const dis = state.canEdit ? '' : 'disabled';
    return `
      <div class="drawer-head"><span class="eyebrow">Settings</span>${closeBtn}</div>

      <span class="section-label">On this device</span>
      <div class="card">
        <label class="field" style="margin-bottom:0"><span class="label">Who are you?</span>
          <select data-setting="me">
            <option value="">Choose…</option>
            ${members().map(m => `<option value="${esc(m)}" ${m === state.me ? 'selected' : ''}>${esc(m)}</option>`).join('')}
          </select>
        </label>
      </div>

      <span class="section-label">Band</span>
      <div class="card">
        <label class="field"><span class="label">Band name</span>
          <input type="text" data-setting="band_name" value="${esc(s.band_name || '')}" autocomplete="off" ${dis}>
        </label>
        <label class="field"><span class="label">Album name</span>
          <input type="text" data-setting="album_name" value="${esc(s.album_name || '')}" autocomplete="off" ${dis}>
        </label>
        <label class="field" style="margin-bottom:0"><span class="label">Release date</span>
          <input type="date" data-setting="release_date" value="${esc(s.release_date || '')}" ${dis}>
        </label>
      </div>

      <span class="section-label">Members</span>
      <div class="card">
        ${members().map(m => `
          <div class="member-row">
            <input type="text" data-member="${esc(m)}" value="${esc(m)}" aria-label="Member name" autocomplete="off" ${dis}>
            <button class="icon-btn edit-only" data-action="remove-member" data-name="${esc(m)}" aria-label="Remove ${esc(m)}">${ICON.close}</button>
          </div>`).join('') || '<p class="hint">No members yet.</p>'}
        <form class="inline-add edit-only" data-form="add-member">
          <input type="text" name="name" data-keep="new-member" placeholder="Add a member…" autocomplete="off">
          <button class="btn" type="submit">Add</button>
        </form>
      </div>

      ${DEMO ? `
        <span class="section-label">Demo mode</span>
        <div class="card">
          <p class="hint" style="margin-top:0">This copy isn't connected to a database yet, so changes stay in this browser only. Follow the README to connect Supabase.</p>
          <button class="btn small danger" data-action="reset-demo">Reset demo data</button>
        </div>` : ''}`;
  }

  // ---------------------------------------------------------------- tap-twice confirm
  // Native confirm() pop-ups are blocked in some browsers (including in-app previews), so risky
  // buttons ask for a second tap instead. Returns true only on the second tap within 4 seconds.
  function confirmTap(btn, prompt) {
    if (btn.dataset.armed) return true;
    const original = btn.innerHTML;
    btn.dataset.armed = '1';
    btn.classList.add('armed');
    btn.textContent = prompt;
    setTimeout(() => {
      if (!btn.isConnected) return;
      delete btn.dataset.armed;
      btn.classList.remove('armed');
      btn.innerHTML = original;
    }, 4000);
    return false;
  }

  // ---------------------------------------------------------------- toast
  let toastTimer = null;
  function toast(msg, bad = false) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.toggle('bad', bad);
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), bad ? 5000 : 2500);
  }

  // ---------------------------------------------------------------- events
  document.addEventListener('click', e => {
    if (e.target.id === 'scrim') return closeDrawer();
    const btn = e.target.closest('[data-action]');
    if (!btn || btn.disabled) return;
    const { action, id } = btn.dataset;
    const d = state.drawer;
    const cur = d && d.type === 'task' ? taskById(d.id) : null;

    switch (action) {
      case 'retry': state.fatal = null; render(); refresh(); break;
      case 'close': closeDrawer(); break;
      case 'open-task': openDrawer({ type: 'task', id }); break;
      case 'open-settings': openDrawer({ type: 'settings' }); break;
      case 'open-category': openDrawer({ type: 'category', id }); break;
      case 'new-category': openDrawer({ type: 'category', id: null }); break;
      case 'filter': setFilter(btn.dataset.key, btn.dataset.val); render(); break;
      case 'cat-up': moveCategory(id, -1); break;
      case 'cat-down': moveCategory(id, 1); break;
      case 'toggle-done': {
        const t = taskById(id);
        if (t) updateTask(id, { status: t.status === 'done' ? 'not_started' : 'done' });
        break;
      }
      case 'set-status': if (cur) updateTask(cur.id, { status: btn.dataset.status }); break;
      case 'toggle-sub': {
        if (!cur) break;
        const i = +btn.dataset.i;
        updateTask(cur.id, { subtasks: cur.subtasks.map((s, k) => (k === i ? { ...s, done: btn.checked } : s)) });
        break;
      }
      case 'del-sub': if (cur) updateTask(cur.id, { subtasks: cur.subtasks.filter((_, k) => k !== +btn.dataset.i) }); break;
      case 'del-link': if (cur) updateTask(cur.id, { links: cur.links.filter((_, k) => k !== +btn.dataset.i) }); break;
      case 'delete-task':
        if (cur && confirmTap(btn, 'Tap again to delete')) { deleteTask(cur.id); closeDrawer(); }
        break;
      case 'pick-color': {
        const form = btn.closest('form');
        form.color.value = btn.dataset.color;
        form.querySelectorAll('.swatch').forEach(s => {
          const on = s === btn;
          s.classList.toggle('on', on);
          s.setAttribute('aria-checked', on);
        });
        break;
      }
      case 'delete-category': {
        const c = d && catById(d.id);
        if (!c) break;
        const n = tasksIn(c.id).length;
        if (confirmTap(btn, n ? `Tap again to delete it and ${n} task${n > 1 ? 's' : ''}` : 'Tap again to delete')) {
          deleteCategory(c.id);
          closeDrawer();
        }
        break;
      }
      case 'remove-member': {
        const n = state.tasks.filter(t => t.owner === btn.dataset.name).length;
        if (confirmTap(btn, n ? `Remove? (${n} task${n > 1 ? 's' : ''} → unassigned)` : 'Remove?')) removeMember(btn.dataset.name);
        break;
      }
      case 'reset-demo':
        if (confirmTap(btn, 'Tap again to reset')) { store.reset(); refresh(); closeDrawer(); }
        break;
    }
  });

  document.addEventListener('change', e => {
    const el = e.target;
    const d = state.drawer;
    if (el.dataset.field && d && d.type === 'task') {
      const t = taskById(d.id);
      if (!t) return;
      let v = el.value;
      if (el.dataset.field === 'title') {
        v = v.replace(/\s+/g, ' ').trim();
        if (!v) { el.value = t.title; autosize(el); return; }
      }
      if (el.dataset.field === 'owner') v = v || null;
      if (t[el.dataset.field] !== v) updateTask(t.id, { [el.dataset.field]: v }, { skipDrawer: el.dataset.field !== 'category_id' });
    } else if (el.dataset.setting === 'me') {
      state.me = el.value;
      LS.set('me', el.value);
      render();
    } else if (el.dataset.setting) {
      const key = el.dataset.setting;
      let v = el.value.trim();
      if (key === 'band_name' && !v) { el.value = state.settings.band_name; return; }
      if (key === 'release_date') v = v || null;
      if (state.settings[key] !== v) updateSettings({ [key]: v }, { skipDrawer: true });
    } else if (el.dataset.member !== undefined) {
      const old = el.dataset.member;
      const next = el.value.trim();
      if (next && next !== old && !members().includes(next)) {
        // Keep this row (and its remove button) pointing at the new name without redrawing.
        el.dataset.member = next;
        el.parentElement.querySelector('[data-name]').dataset.name = next;
      }
      renameMember(old, el.value);
    }
  });

  document.addEventListener('input', e => {
    if (e.target.classList.contains('title-input')) autosize(e.target);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && state.drawer) { closeDrawer(); return; }
    // Enter in the title box saves instead of adding a newline.
    if (e.key === 'Enter' && e.target.classList.contains('title-input')) { e.preventDefault(); e.target.blur(); }
  });

  document.addEventListener('submit', async e => {
    const form = e.target;
    const kind = form.dataset.form;
    if (!kind) return;
    e.preventDefault();
    const d = state.drawer;
    const cur = d && d.type === 'task' ? taskById(d.id) : null;

    if (kind === 'add-task') {
      const input = form.elements.title;
      const title = input.value.replace(/\s+/g, ' ').trim();
      if (!title) return;
      input.value = '';
      await addTask(form.dataset.cat, title);
    } else if (kind === 'add-sub' && cur) {
      const input = form.elements.text;
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      await updateTask(cur.id, { subtasks: [...cur.subtasks, { text, done: false }] });
    } else if (kind === 'add-link' && cur) {
      const url = safeUrl(form.elements.url.value);
      if (!url) { toast('That link doesn’t look like a web address.', true); return; }
      const label = form.elements.label.value.trim() || hostOf(url);
      form.reset();
      await updateTask(cur.id, { links: [...cur.links, { label, url }] });
    } else if (kind === 'category') {
      const name = form.elements.name.value.trim();
      const color = form.elements.color.value;
      if (!name) return;
      if (d.id) {
        const c = catById(d.id);
        if (c && (c.name !== name || c.color !== color)) updateCategory(d.id, { name, color });
      } else {
        addCategory(name, color);
      }
      closeDrawer();
    } else if (kind === 'add-member') {
      const name = form.elements.name.value.trim();
      if (!name) return;
      if (members().includes(name)) { toast(`${name} is already in the band.`, true); return; }
      form.reset();
      await updateSettings({ members: [...members(), name] });
    }
  });

  setInterval(() => {
    document.querySelectorAll('[data-ago]').forEach(el => { el.textContent = ago(el.dataset.ago); });
  }, 60000);

  // Phones drop live connections while asleep — catch up when the page comes back.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && state.loaded) refresh();
  });

  // ---------------------------------------------------------------- boot
  async function boot() {
    if (CONFIGURED && !window.supabase) {
      state.fatal = new Error('supabase-js failed to load');
      render();
      return;
    }
    store = DEMO ? makeDemoStore() : makeSupabaseStore();
    await refresh();
    LS.del('pass'); // left over from when editing needed a passcode
    store.subscribe({
      change: applyRemote,
      reload: refresh,
      status: s => { state.live = s; if (state.loaded) $('#hdr').innerHTML = renderHeader(); },
    });
  }

  boot();
})();
