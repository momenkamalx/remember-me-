const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;
const $ = (id) => document.getElementById(id);

const pad = (n) => String(n).padStart(2, '0');
const toInput = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

let editingId = null;
let allReminders = [];
let activeFilter = 'all'; // 'all' | 'upcoming' | 'overdue' | 'done'
let searchQuery = '';

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

function formatRelativeTime(due, nowS, isDone) {
  if (isDone) return 'completed';
  const diff = due - nowS;
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60);
  const hours = Math.round(abs / 3600);
  const days = Math.round(abs / 86400);

  if (mins < 1) return diff < 0 ? 'just now' : 'due now';
  if (mins < 60) return diff < 0 ? `${mins}m overdue` : `in ${mins}m`;
  if (hours < 24) return diff < 0 ? `${hours}h overdue` : `in ${hours}h`;
  return diff < 0 ? `${days}d overdue` : `in ${days}d`;
}

// ---------- Tab Navigation ----------
function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  document.querySelectorAll('.tab-pane').forEach((pane) => {
    pane.hidden = pane.id !== tabId;
  });
  if (tabId === 'tab-settings') {
    loadSettings();
  } else if (tabId === 'tab-add') {
    if (editingId === null) setDefaultTime();
    $('title').focus();
  } else if (tabId === 'tab-reminders') {
    renderList();
  }
}

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (btn.dataset.tab === 'tab-add' && editingId !== null) {
      resetForm();
    }
    switchTab(btn.dataset.tab);
  });
});

// ---------- Reminder Form ----------
// Date + 24-hour hour/minute dropdowns
function fillTimeSelects() {
  const h = $('when-h'), m = $('when-m');
  for (let i = 0; i < 24; i++) { const o = document.createElement('option'); o.value = i; o.textContent = pad(i); h.append(o); }
  for (let i = 0; i < 60; i++) { const o = document.createElement('option'); o.value = i; o.textContent = pad(i); m.append(o); }
}

function setWhen(d) {
  $('when-date').value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  $('when-h').value = String(d.getHours());
  $('when-m').value = String(d.getMinutes());
}

// Returns a Date, or null if the date field is empty or not in YYYY-MM-DD form.
function getWhen() {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec($('when-date').value.trim());
  if (!m) return null;
  const h = Number($('when-h').value);
  const min = Number($('when-m').value);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), h, min, 0, 0);
}

function setDefaultTime() {
  setWhen(new Date(Date.now() + 10 * 60000));
}

function resetForm() {
  editingId = null;
  $('title').value = '';
  $('link').value = '';
  $('repeat').value = 'none';
  $('save').textContent = 'Add reminder';
  $('cancel').hidden = true;
  setDefaultTime();
}

function startEdit(r) {
  editingId = r.id;
  $('title').value = r.title;
  $('link').value = r.link || '';
  setWhen(new Date(r.due * 1000));
  $('repeat').value = r.repeat;
  $('save').textContent = 'Save changes';
  $('cancel').hidden = false;
  switchTab('tab-add');
}

document.querySelectorAll('.chips button').forEach((b) =>
  b.addEventListener('click', () => {
    const m = Number(b.dataset.m);
    const d = getWhen() || new Date();
    d.setMinutes(d.getMinutes() + m);
    setWhen(d);
  })
);

$('cancel').onclick = () => {
  resetForm();
  switchTab('tab-reminders');
};

$('f').addEventListener('submit', async (e) => {
  e.preventDefault();
  const when = getWhen();
  if (!when) { alert('Please enter the date as YYYY-MM-DD (for example 2026-12-31).'); return; }
  const due = Math.floor(when.getTime() / 1000);
  const args = { title: $('title').value, due, repeat: $('repeat').value, link: $('link').value.trim() };
  if (editingId !== null) await invoke('update_reminder', { id: editingId, ...args });
  else await invoke('add_reminder', args);
  resetForm();
  await refresh();
  switchTab('tab-reminders');
});

// Quick shortcut: Ctrl+Enter (or Cmd+Enter) to save reminder
$('f').addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    $('f').requestSubmit();
  }
});

// ---------- Search & Filters ----------
document.querySelectorAll('.filter-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    renderList();
  });
});

['input', 'search', 'change'].forEach((ev) => {
  $('search').addEventListener(ev, (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    renderList();
  });
});

$('search').addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && $('search').value) {
    e.preventDefault();
    $('search').value = '';
    searchQuery = '';
    renderList();
  }
});

function btn(label, fn) {
  const b = document.createElement('button');
  b.textContent = label;
  b.onclick = async () => {
    await fn();
    await refresh();
  };
  return b;
}

function renderList() {
  const ul = $('list');
  const empty = $('empty-state');
  ul.innerHTML = '';
  const nowS = Date.now() / 1000;

  let filtered = allReminders;

  if (activeFilter === 'upcoming') {
    filtered = filtered.filter((r) => !r.done && r.due >= nowS);
  } else if (activeFilter === 'overdue') {
    filtered = filtered.filter((r) => !r.done && r.due < nowS);
  } else if (activeFilter === 'done') {
    filtered = filtered.filter((r) => r.done);
  }

  if (searchQuery) {
    filtered = filtered.filter((r) =>
      r.title.toLowerCase().includes(searchQuery) ||
      (r.link && r.link.toLowerCase().includes(searchQuery))
    );
  }

  if (filtered.length === 0) {
    empty.hidden = false;
    if (searchQuery) {
      empty.innerHTML = `No reminders matching "<b>${escapeHtml(searchQuery)}</b>"`;
    } else if (activeFilter === 'overdue') {
      empty.innerHTML = `No overdue reminders 🎉`;
    } else if (activeFilter === 'done') {
      empty.innerHTML = `No completed reminders yet`;
    } else if (activeFilter === 'upcoming') {
      empty.innerHTML = `All caught up! No upcoming reminders.`;
    } else {
      empty.innerHTML = `No reminders yet.<br><br><button type="button" class="primary" id="btn-empty-add">+ Add your first reminder</button>`;
      const btnAdd = $('btn-empty-add');
      if (btnAdd) btnAdd.onclick = () => switchTab('tab-add');
    }
    return;
  }

  empty.hidden = true;

  for (const r of filtered) {
    const li = document.createElement('li');
    if (r.done) li.classList.add('done');
    if (!r.done && r.due < nowS) li.classList.add('over');

    const t = document.createElement('div');
    t.className = 't';
    t.textContent = r.title;

    const d = document.createElement('div');
    d.className = 'd';
    const dateStr = new Date(r.due * 1000).toLocaleString(undefined, { hour12: false });
    const rel = formatRelativeTime(r.due, nowS, r.done);
    const rep = r.repeat !== 'none' ? ' · ' + r.repeat : '';
    d.innerHTML = `<span>${escapeHtml(dateStr)}</span> <span class="rel-badge ${r.due < nowS && !r.done ? 'over' : ''}">(${escapeHtml(rel)})</span>${escapeHtml(rep)}`;

    const bs = document.createElement('div');
    bs.className = 'btns';
    const edit = document.createElement('button');
    edit.textContent = 'Edit';
    edit.onclick = () => startEdit(r);

    bs.append(
      btn(r.done ? 'Undo' : 'Done', () => invoke('toggle_done', { id: r.id })),
      edit,
      btn('Snooze 10m', () => invoke('snooze', { id: r.id, minutes: 10 })),
      btn('Snooze 1h', () => invoke('snooze', { id: r.id, minutes: 60 })),
      btn('Delete', () => invoke('delete_reminder', { id: r.id }))
    );
    if (r.link) bs.prepend(btn('Open link', () => invoke('open_link', { url: r.link })));
    li.append(t, d, bs);
    ul.append(li);
  }
}

async function refresh() {
  allReminders = await invoke('list_reminders');
  const nowS = Date.now() / 1000;

  const total = allReminders.length;
  const upcoming = allReminders.filter((r) => !r.done && r.due >= nowS).length;
  const overdue = allReminders.filter((r) => !r.done && r.due < nowS).length;
  const done = allReminders.filter((r) => r.done).length;
  const openCount = upcoming + overdue;

  $('cnt-all').textContent = total;
  $('cnt-upcoming').textContent = upcoming;
  $('cnt-overdue').textContent = overdue;
  $('cnt-done').textContent = done;

  const badge = $('reminders-badge');
  if (openCount > 0) {
    badge.hidden = false;
    badge.textContent = openCount;
    badge.classList.toggle('badge-alert', overdue > 0);
  } else {
    badge.hidden = true;
  }

  renderList();
}

// ---------- Settings ----------
const sSound = $('s-sound'), sVol = $('s-vol'), sRep = $('s-rep'), sFile = $('s-file'),
      sName = $('s-fname'), sAuto = $('s-auto'), sHot = $('s-hotkey');

async function loadSettings() {
  const s = await invoke('get_settings');
  sSound.value = s.sound || 'chime';
  sVol.value = s.volume || '0.6';
  sRep.value = s.repeats ?? '0';
  sName.textContent = s.custom_name || 'none';
  sAuto.checked = s.autostart !== '0';
  $('s-port').textContent = s.api_port || 'starting...';
  $('s-token').value = s.api_token || '';
  sHot.value = s.hotkey || 'Alt+X';
}

sSound.onchange = () => invoke('set_setting', { key: 'sound', value: sSound.value });
sVol.onchange = () => invoke('set_setting', { key: 'volume', value: sVol.value });
sRep.onchange = () => {
  const v = parseInt(sRep.value);
  const n = isNaN(v) ? 0 : Math.max(0, Math.min(10, v));
  sRep.value = n;
  invoke('set_setting', { key: 'repeats', value: String(n) });
};
sAuto.onchange = () => invoke('set_autostart', { enabled: sAuto.checked }).catch((e) => alert(e));

sFile.onchange = async () => {
  const f = sFile.files[0];
  if (!f) return;
  if (f.size > 2 * 1024 * 1024) { alert('File too big (max 2 MB).'); sFile.value = ''; return; }
  const url = await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(f); });
  await invoke('set_setting', { key: 'custom_sound', value: url });
  await invoke('set_setting', { key: 'custom_name', value: f.name });
  await invoke('set_setting', { key: 'sound', value: 'custom' });
  sSound.value = 'custom';
  sName.textContent = f.name;
};

// On Linux the sound is played by the system's audio tools (the web view's audio is unreliable there).
const IS_LINUX = /Linux/.test(navigator.userAgent) && !/Android/.test(navigator.userAgent);
if (IS_LINUX) $('s-hotkey-note').hidden = false;

$('s-test').onclick = async () => {
  if (IS_LINUX) { await invoke('native_sound', { action: 'test' }); return; }
  let url = null;
  if (sSound.value === 'custom') url = await invoke('get_custom_sound');
  Sound.play(sSound.value, parseFloat(sVol.value), url);
};
$('s-stop').onclick = () => (IS_LINUX ? invoke('native_sound', { action: 'stop' }) : Sound.stop());

// Hotkey capture
function keyName(code) {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  if (/^F([1-9]|1[0-2])$/.test(code)) return code;
  const m = { Space: 'Space', ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right' };
  return m[code] || null;
}

sHot.addEventListener('keydown', async (e) => {
  e.preventDefault();
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;
  const k = keyName(e.code);
  if (!k) { alert('Use a letter, number, F1-F12, Space or an arrow key.'); return; }
  if (!(e.ctrlKey || e.altKey)) { alert('Include Ctrl or Alt (for example Alt+X).'); return; }
  const mods = [];
  if (e.ctrlKey) mods.push('Ctrl');
  if (e.altKey) mods.push('Alt');
  if (e.shiftKey) mods.push('Shift');
  const combo = [...mods, k].join('+');
  try {
    await invoke('set_hotkey', { hotkey: combo });
    sHot.value = combo;
  } catch (err) {
    alert('Could not use ' + combo + ': ' + err);
  }
});

// ---------- Quit Confirmation ----------
listen('confirm-quit', () => { $('quit').hidden = false; });
$('q-no').onclick = () => { $('quit').hidden = true; };
$('q-yes').onclick = () => invoke('quit_app');

listen('quick-add', () => {
  if (editingId === null) setDefaultTime();
  switchTab('tab-add');
  $('title').focus();
  $('title').select();
  refresh();
});

listen('changed', refresh);

$('s-copy').onclick = async () => {
  try { await navigator.clipboard.writeText($('s-token').value); $('s-copy').textContent = 'Copied'; }
  catch (e) { $('s-token').select(); }
  setTimeout(() => { $('s-copy').textContent = 'Copy token'; }, 1500);
};

// Initial startup
fillTimeSelects();
setDefaultTime();
refresh();
loadSettings();
setInterval(refresh, 30000);
