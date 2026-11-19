// A small, local-first Getting Things Done app.
// Everything is stored in this browser's localStorage under STORAGE_KEY.

const STORAGE_KEY = 'gtd.v1';
const LISTS = ['inbox', 'next', 'waiting', 'someday'];
const LIST_NAMES = { inbox: 'Inbox', next: 'Next actions', waiting: 'Waiting for', someday: 'Someday / Maybe' };
const SHORT_NAMES = { inbox: 'Inbox', next: 'Next', waiting: 'Waiting', someday: 'Someday' };
const DEFAULT_CONTEXTS = ['home', 'computer', 'phone', 'errands', 'work'];
const VIEWS = ['inbox', 'next', 'projects', 'project', 'waiting', 'someday', 'review'];
const ID_PATTERN = /^[\w-]{1,64}$/;
const DAY = 24 * 60 * 60 * 1000;
const REVIEW_EVERY_DAYS = 7;

const CLARIFY_SUBMIT = {
  next: 'Move to Next actions',
  project: 'Create project',
  waiting: 'Move to Waiting for',
  done: 'Mark as done',
  someday: 'Move to Someday / Maybe',
  trash: 'Delete',
};

const CLARIFY_TOAST = {
  next: 'Moved to Next actions',
  project: 'Project created',
  waiting: 'Moved to Waiting for',
  done: 'Marked done',
  someday: 'Moved to Someday / Maybe',
  trash: 'Deleted',
};

const REVIEW_STEPS = [
  { key: 'collect', phase: 'Get clear', label: 'Gather loose notes, papers, and ideas into the Inbox' },
  { key: 'inbox', phase: 'Get clear', label: 'Process the Inbox to zero', href: '#inbox', count: () => openIn('inbox').length, warn: true },
  { key: 'calendar', phase: 'Get current', label: 'Check your calendar: the past two weeks and what’s coming' },
  { key: 'next', phase: 'Get current', label: 'Review Next actions', href: '#next', count: () => openIn('next').length },
  { key: 'projects', phase: 'Get current', label: 'Give every project a next action', href: '#projects', count: () => stalledProjects().length, warn: true },
  { key: 'waiting', phase: 'Get current', label: 'Follow up on Waiting for', href: '#waiting', count: () => openIn('waiting').length },
  { key: 'someday', phase: 'Get creative', label: 'Review Someday / Maybe', href: '#someday', count: () => openIn('someday').length },
];

const ICONS = {
  chevron: '<svg class="chevron" viewBox="0 0 8 13" aria-hidden="true"><path d="M1.5 1.5 6.5 6.5l-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  folder: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.4l2 2.2h7.6A2.5 2.5 0 0 1 21 9.7v7.8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/></svg>',
  close: '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="m2 2 10 10M12 2 2 12"/></svg>',
};

// ---------- Helpers ----------

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);
const text = (value) => (typeof value === 'string' ? value : '');
const isDate = (value) => typeof value === 'string' && !Number.isNaN(Date.parse(value));
const nowIso = () => new Date().toISOString();
const uid = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const cleanContext = (value) => text(value).trim().replace(/^@+/, '').trim().toLowerCase();
const plural = (n, word, words = `${word}s`) => `${n} ${n === 1 ? word : words}`;
const byCreated = (a, b) => a.createdAt.localeCompare(b.createdAt);
const formText = (data, name) => String(data.get(name) ?? '').trim();

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

function ago(iso) {
  const days = Math.round((startOfDay(new Date()) - startOfDay(new Date(iso))) / DAY);
  if (days < 14) return relative.format(-days, 'day');
  if (days < 60) return relative.format(-Math.round(days / 7), 'week');
  return relative.format(-Math.round(days / 30), 'month');
}

function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ---------- State ----------

const emptyState = () => ({ version: 1, items: [], projects: [], lastReviewAt: null, reviewChecks: {} });

// Coerces stored or imported data into the current shape, dropping anything malformed.
function normalize(raw) {
  const result = emptyState();
  if (!raw || typeof raw !== 'object') return result;

  const ids = new Set();
  const uniqueId = (value) => {
    const id = typeof value === 'string' && ID_PATTERN.test(value) && !ids.has(value) ? value : uid();
    ids.add(id);
    return id;
  };
  const dateOr = (value, fallback) => (isDate(value) ? value : fallback);

  for (const project of Array.isArray(raw.projects) ? raw.projects : []) {
    if (!project || !text(project.title).trim()) continue;
    result.projects.push({
      id: uniqueId(project.id),
      title: text(project.title).trim(),
      notes: text(project.notes),
      done: project.done === true,
      doneAt: dateOr(project.doneAt, null),
      createdAt: dateOr(project.createdAt, nowIso()),
    });
  }

  const projectIds = new Set(result.projects.map((project) => project.id));
  for (const item of Array.isArray(raw.items) ? raw.items : []) {
    if (!item || !text(item.title).trim()) continue;
    const createdAt = dateOr(item.createdAt, nowIso());
    result.items.push({
      id: uniqueId(item.id),
      title: text(item.title).trim(),
      notes: text(item.notes),
      list: LISTS.includes(item.list) ? item.list : 'inbox',
      context: cleanContext(item.context),
      waitingOn: text(item.waitingOn).trim(),
      projectId: projectIds.has(item.projectId) ? item.projectId : null,
      done: item.done === true,
      doneAt: dateOr(item.doneAt, null),
      createdAt,
      movedAt: dateOr(item.movedAt, createdAt),
    });
  }

  result.lastReviewAt = dateOr(raw.lastReviewAt, null);
  if (raw.reviewChecks && typeof raw.reviewChecks === 'object') {
    for (const [key, value] of Object.entries(raw.reviewChecks)) {
      if (value === true) result.reviewChecks[key] = true;
    }
  }
  return result;
}

function load() {
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return emptyState();
  }
  if (!raw) return emptyState();
  try {
    return normalize(JSON.parse(raw));
  } catch {
    // Keep unreadable data around instead of silently overwriting it.
    try {
      localStorage.setItem(`${STORAGE_KEY}.unreadable.${Date.now()}`, raw);
    } catch {
      // Nothing more we can do.
    }
    return emptyState();
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    toast('Couldn’t save. Storage may be full or turned off.');
    return false;
  }
}

let state = load();
let undoSnapshot = null;
let contextFilter = '';
let lastRouteKey = '';
let toastTimer = 0;
const pending = new Map(); // item id -> { done, timer } while a checkbox animation finishes

const itemById = (id) => state.items.find((item) => item.id === id);
const projectById = (id) => state.projects.find((project) => project.id === id);
const openIn = (list) => state.items.filter((item) => !item.done && item.list === list);
const activeProjects = () => state.projects.filter((project) => !project.done).sort(byCreated);
const hasNextStep = (project) =>
  state.items.some((item) => item.projectId === project.id && !item.done && (item.list === 'next' || item.list === 'waiting'));
const stalledProjects = () => activeProjects().filter((project) => !hasNextStep(project));
const hasData = () => state.items.length > 0 || state.projects.length > 0;
const reviewDue = () =>
  hasData() && (!state.lastReviewAt || Date.now() - Date.parse(state.lastReviewAt) > REVIEW_EVERY_DAYS * DAY);
const usedContexts = () =>
  [...new Set(state.items.filter((item) => !item.done && item.context).map((item) => item.context))].sort();

function newItem(title, fields = {}) {
  const now = nowIso();
  return {
    id: uid(),
    title,
    notes: '',
    list: 'inbox',
    context: '',
    waitingOn: '',
    projectId: null,
    done: false,
    doneAt: null,
    createdAt: now,
    movedAt: now,
    ...fields,
  };
}

function newProject(title, notes = '') {
  return { id: uid(), title, notes, done: false, doneAt: null, createdAt: nowIso() };
}

function moveTo(item, list) {
  if (item.list !== list) {
    item.list = list;
    item.movedAt = nowIso();
  }
}

// Applies a change, saves, re-renders, and (with a message) offers a one-step undo.
function commit(change, message = '') {
  const before = JSON.stringify(state);
  change();
  const saved = save();
  render();
  if (!saved) return;
  if (message) {
    undoSnapshot = before;
    toast(message, true);
  } else {
    hideToast();
  }
}

function undo() {
  if (!undoSnapshot) return;
  state = normalize(JSON.parse(undoSnapshot));
  save();
  render();
  hideToast();
}

function toast(message, withUndo = false) {
  const el = $('#toast');
  el.innerHTML = `<span>${esc(message)}</span>${withUndo ? '<button type="button" data-action="undo">Undo</button>' : ''}`;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, withUndo ? 5000 : 3000);
}

function hideToast() {
  clearTimeout(toastTimer);
  $('#toast').classList.remove('show');
  undoSnapshot = null;
}

// ---------- Rendering ----------

function route() {
  const [view, id = ''] = location.hash.slice(1).split('/');
  return VIEWS.includes(view) ? { view, id } : { view: 'inbox', id: '' };
}

function render() {
  let { view, id } = route();
  const project = view === 'project' ? projectById(id) : null;
  if (view === 'project' && !project) {
    history.replaceState(null, '', '#projects');
    view = 'projects';
    id = '';
  }

  const page = buildPage(view, project);
  document.title = view === 'inbox' ? 'GTD' : `${page.title} · GTD`;
  $('#title').textContent = page.title;
  $('#subtitle').textContent = page.subtitle;
  $('#back').hidden = view !== 'project';
  $('#review-link').hidden = view === 'review';
  $('#review-dot').hidden = !reviewDue();
  $('#quick-add').hidden = !page.placeholder;
  $('#quick-input').placeholder = page.placeholder;
  $('#view').innerHTML = page.html;

  const activeTab = view === 'project' ? 'projects' : view;
  for (const tab of $$('.tabbar a')) {
    if (tab.dataset.tab === activeTab) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  }

  const inboxCount = openIn('inbox').length;
  const badge = $('#inbox-badge');
  badge.hidden = inboxCount === 0;
  badge.textContent = inboxCount > 99 ? '99+' : String(inboxCount);

  const routeKey = `${view}/${id}`;
  if (routeKey !== lastRouteKey) {
    lastRouteKey = routeKey;
    window.scrollTo(0, 0);
  }
}

function buildPage(view, project) {
  switch (view) {
    case 'next': {
      const html = nextView(); // May reset an outdated context filter, so build it first.
      const count = openIn('next').length;
      return {
        title: 'Next Actions',
        subtitle: count ? plural(count, 'action') : '',
        placeholder: contextFilter ? `Add a next action @${contextFilter}` : 'Add a next action',
        html,
      };
    }
    case 'projects': {
      const active = activeProjects().length;
      const stalled = stalledProjects().length;
      return {
        title: 'Projects',
        subtitle: [active && plural(active, 'active project'), stalled && `${stalled} need${stalled === 1 ? 's' : ''} a next action`]
          .filter(Boolean)
          .join(' · '),
        placeholder: 'New project: what’s the outcome?',
        html: projectsView(),
      };
    }
    case 'project':
      return {
        title: project.title,
        subtitle: project.done ? 'Completed project' : 'Project',
        placeholder: 'Add an action to this project',
        html: projectView(project),
      };
    case 'waiting': {
      const count = openIn('waiting').length;
      return { title: 'Waiting For', subtitle: count ? plural(count, 'item') : '', placeholder: 'Add something you’re waiting on', html: waitingView() };
    }
    case 'someday': {
      const count = openIn('someday').length;
      return { title: 'Someday / Maybe', subtitle: count ? plural(count, 'idea') : '', placeholder: 'Add an idea for someday', html: somedayView() };
    }
    case 'review':
      return {
        title: 'Weekly Review',
        subtitle: state.lastReviewAt ? `Last done ${ago(state.lastReviewAt)}` : 'Not done yet',
        placeholder: '',
        html: reviewView(),
      };
    default: {
      const count = openIn('inbox').length;
      return {
        title: 'Inbox',
        subtitle: count ? `${plural(count, 'item')} to clarify` : hasData() ? 'All clear' : '',
        placeholder: 'Capture anything…',
        html: inboxView(),
      };
    }
  }
}

const emptyView = (title, body) => `<div class="empty"><h2>${esc(title)}</h2><p>${esc(body)}</p></div>`;
const listOf = (items, options) => `<ul class="list">${items.map((item) => itemRow(item, options)).join('')}</ul>`;

function itemRow(item, { showProject = true } = {}) {
  const pendingDone = pending.get(item.id)?.done;
  const checked = pendingDone ?? item.done;
  const meta = [];
  if (item.list === 'waiting' && !item.done) meta.push(`${item.waitingOn || 'Waiting'} · ${ago(item.movedAt)}`);
  if (item.context) meta.push(`@${item.context}`);
  const project = showProject && item.projectId ? projectById(item.projectId) : null;
  if (project) meta.push(project.title);
  if (item.done && item.doneAt) meta.push(`Done ${ago(item.doneAt)}`);
  const classes = ['row', item.done && 'done', pendingDone === true && 'completing'].filter(Boolean).join(' ');
  return `<li class="${classes}">
      <label class="check-hit"><input type="checkbox" class="check" data-id="${esc(item.id)}" aria-label="Done: ${esc(item.title)}"${checked ? ' checked' : ''}></label>
      <button type="button" class="row-body" data-action="open-item" data-id="${esc(item.id)}">
        <span class="row-text"><span class="row-title">${esc(item.title)}</span>${meta.length ? `<span class="row-meta">${esc(meta.join(' · '))}</span>` : ''}</span>
      </button>
    </li>`;
}

function inboxView() {
  const items = openIn('inbox').sort(byCreated).reverse();
  if (items.length) {
    return `${listOf(items)}<p class="fine-print">Tap an item to clarify it: what is it, and what’s the next step?</p>`;
  }
  if (!hasData()) return welcomeView();
  return emptyView('Inbox zero', 'Capture anything that has your attention. You can clarify it later.');
}

function welcomeView() {
  return `<section class="card">
      <h2>Get it out of your head</h2>
      <ol class="steps">
        <li><b>Capture</b> anything on your mind into the Inbox.</li>
        <li><b>Clarify</b> each item: what is it, and is it actionable?</li>
        <li><b>Organize</b> it into Next, Projects, Waiting, or Someday.</li>
        <li><b>Review</b> your lists once a week.</li>
        <li><b>Engage</b>: pick a next action and do it.</li>
      </ol>
      <p>Your lists are saved only on this device. On iPhone, open this page in Safari and choose Share → Add to Home Screen to use it like an app.</p>
      <button type="button" class="btn block" data-action="load-sample">Explore with example data</button>
    </section>`;
}

function nextView() {
  const items = openIn('next').sort(byCreated);
  if (!items.length) {
    contextFilter = '';
    return emptyView('No next actions', 'Clarify your Inbox, or add the next physical step for something you want to move forward.');
  }
  const contexts = [...new Set(items.map((item) => item.context).filter(Boolean))].sort();
  if (!contexts.includes(contextFilter)) contextFilter = '';
  const chips = contexts.length
    ? `<div class="chips" role="group" aria-label="Filter by context">${[['', 'All'], ...contexts.map((c) => [c, `@${c}`])]
        .map(([value, label]) => `<button type="button" class="chip" data-action="filter" data-context="${esc(value)}" aria-pressed="${value === contextFilter}">${esc(label)}</button>`)
        .join('')}</div>`
    : '';
  const shown = contextFilter ? items.filter((item) => item.context === contextFilter) : items;
  return chips + listOf(shown);
}

function projectsView() {
  const projects = activeProjects();
  if (!projects.length) {
    return emptyView('No active projects', 'A project is any outcome that takes more than one step. Type one above to start.');
  }
  const rows = projects.map((project) => {
    const open = state.items.filter((item) => item.projectId === project.id && !item.done);
    const next = open.filter((item) => item.list === 'next').length;
    const waiting = open.filter((item) => item.list === 'waiting').length;
    const meta = next || waiting
      ? esc([next && plural(next, 'next action'), waiting && `${waiting} waiting`].filter(Boolean).join(' · '))
      : '<span class="warn-text">Needs a next action</span>';
    return `<li class="row">
        <span class="row-icon">${ICONS.folder}</span>
        <a class="row-body" href="#project/${esc(project.id)}">
          <span class="row-text"><span class="row-title">${esc(project.title)}</span><span class="row-meta">${meta}</span></span>${ICONS.chevron}
        </a>
      </li>`;
  });
  return `<ul class="list">${rows.join('')}</ul>
    <p class="fine-print">Every project needs at least one next action (or something you’re waiting on) to keep it moving.</p>`;
}

function projectView(project) {
  const items = state.items.filter((item) => item.projectId === project.id);
  const sections = ['next', 'waiting', 'someday', 'inbox']
    .map((list) => [list, items.filter((item) => !item.done && item.list === list).sort(byCreated)])
    .filter(([, rows]) => rows.length)
    .map(([list, rows]) => `<h2 class="section-title">${LIST_NAMES[list]}</h2>${listOf(rows, { showProject: false })}`)
    .join('');
  const done = items.filter((item) => item.done).sort((a, b) => text(b.doneAt).localeCompare(text(a.doneAt)));

  let callout = '';
  if (project.done) callout = `<p class="callout">Completed ${esc(ago(project.doneAt || project.createdAt))}.</p>`;
  else if (!hasNextStep(project)) callout = '<p class="callout warn">No next action yet. What’s the very next physical step? Add it above.</p>';

  return `${callout}
    ${project.notes ? `<p class="notes">${esc(project.notes)}</p>` : ''}
    ${sections}
    ${done.length ? `<details class="done-section"><summary>Completed (${done.length})</summary>${listOf(done, { showProject: false })}</details>` : ''}
    <div class="button-row">
      <button type="button" class="btn" data-action="edit-project" data-id="${esc(project.id)}">Edit project</button>
      <button type="button" class="btn" data-action="${project.done ? 'reopen-project' : 'complete-project'}" data-id="${esc(project.id)}">${project.done ? 'Reopen project' : 'Complete project'}</button>
    </div>`;
}

function waitingView() {
  const items = openIn('waiting').sort((a, b) => a.movedAt.localeCompare(b.movedAt));
  return items.length ? listOf(items) : emptyView('Nothing to wait on', 'Track anything you’ve delegated or are expecting from someone else.');
}

function somedayView() {
  const items = openIn('someday').sort(byCreated);
  return items.length ? listOf(items) : emptyView('Nothing parked', 'Ideas and projects you might want to do someday, but not now.');
}

function reviewView() {
  const phases = [...new Set(REVIEW_STEPS.map((step) => step.phase))];
  const steps = phases
    .map((phase) => `<h2 class="section-title">${esc(phase)}</h2><ul class="list">${REVIEW_STEPS.filter((step) => step.phase === phase).map(reviewRow).join('')}</ul>`)
    .join('');
  const weekAgo = Date.now() - 7 * DAY;
  const recent = state.items
    .filter((item) => item.done && item.doneAt && Date.parse(item.doneAt) >= weekAgo)
    .sort((a, b) => b.doneAt.localeCompare(a.doneAt));

  return `${steps}
    <button type="button" class="btn primary block" data-action="finish-review">Finish weekly review</button>
    ${recent.length ? `<h2 class="section-title">Completed in the last 7 days</h2>${listOf(recent)}` : ''}
    <h2 class="section-title">Your data</h2>
    <section class="card">
      <p>Your lists are stored only in this browser on this device. Export a backup now and then.</p>
      <div class="button-row">
        <button type="button" class="btn" data-action="export">Export backup</button>
        <button type="button" class="btn" data-action="import">Import backup</button>
      </div>
      <button type="button" class="text-btn" data-action="erase">Erase all data</button>
    </section>`;
}

function reviewRow(step) {
  const checked = state.reviewChecks[step.key] === true;
  const id = `review-${step.key}`;
  const count = step.count ? step.count() : null;
  const badge = count === null ? '' : `<span class="count${step.warn && count ? ' warn' : ''}">${count}</span>`;
  const label = `<span class="row-text"><span class="row-title">${esc(step.label)}</span></span>`;
  const body = step.href
    ? `<a class="row-body" href="${step.href}">${label}${badge}${ICONS.chevron}</a>`
    : `<label class="row-body" for="${id}">${label}</label>`;
  return `<li class="row${checked ? ' done' : ''}">
      <label class="check-hit"><input type="checkbox" class="check" id="${id}" data-review="${step.key}" aria-label="${esc(step.label)}"${checked ? ' checked' : ''}></label>
      ${body}
    </li>`;
}

// ---------- Sheets ----------

const sheet = $('#sheet');

function openSheet(html) {
  sheet.innerHTML = html;
  if (!sheet.open) sheet.showModal();
}

function closeSheet() {
  if (sheet.open) sheet.close();
}

const sheetHead = (title) =>
  `<header class="sheet-head"><h2>${esc(title)}</h2><button type="button" class="icon-btn" data-action="close" aria-label="Close">${ICONS.close}</button></header>`;

function openItem(id) {
  const item = itemById(id);
  if (item) openSheet(item.list === 'inbox' && !item.done ? clarifySheet(item) : editSheet(item));
}

function clarifySheet(item) {
  const choice = (value, title, hint) =>
    `<label class="choice"><input type="radio" name="choice" value="${value}"><span class="choice-box"><strong>${title}</strong><small>${hint}</small></span></label>`;
  return `<form class="sheet-form" data-form="clarify" data-id="${esc(item.id)}">
      ${sheetHead('Clarify')}
      <div class="sheet-body">
        <label class="field"><span>What is it?</span><input name="title" value="${esc(item.title)}" required autocomplete="off"></label>
        <div class="choice-group">
          <h3>Actionable</h3>
          <div class="choices">
            ${choice('next', 'Next action', 'One step I can do')}
            ${choice('project', 'Project', 'Needs more than one step')}
            ${choice('waiting', 'Waiting for', 'Someone else is on it')}
            ${choice('done', 'Done', 'Took under 2 minutes')}
          </div>
        </div>
        <div class="choice-group">
          <h3>Not actionable</h3>
          <div class="choices">
            ${choice('someday', 'Someday / Maybe', 'Not now, maybe later')}
            ${choice('trash', 'Trash', 'Not needed')}
          </div>
        </div>
        <div class="panel" data-panel="next" hidden>
          ${contextField(item.context, 'context')}
          ${projectSelect(item.projectId, 'projectId')}
        </div>
        <div class="panel" data-panel="project" hidden>
          <label class="field"><span>First next action</span><input name="firstAction" autocomplete="off" placeholder="e.g. Email Sam to pick dates"></label>
          ${contextField('', 'firstContext')}
        </div>
        <div class="panel" data-panel="waiting" hidden>
          <label class="field"><span>Waiting on</span><input name="waitingOn" value="${esc(item.waitingOn)}" autocomplete="off" placeholder="Who?"></label>
          ${projectSelect(item.projectId, 'waitingProjectId')}
        </div>
        <label class="field"><span>Notes</span><textarea name="notes" rows="3">${esc(item.notes)}</textarea></label>
      </div>
      <footer class="sheet-foot"><button type="submit" class="btn primary" data-submit disabled>Choose where it goes</button></footer>
    </form>`;
}

function editSheet(item) {
  const visibleFor = (list) => (item.list === list ? '' : ' hidden');
  const segments = ['next', 'waiting', 'someday', 'inbox']
    .map((list) => `<label><input type="radio" name="list" value="${list}"${item.list === list ? ' checked' : ''}><span>${SHORT_NAMES[list]}</span></label>`)
    .join('');
  return `<form class="sheet-form" data-form="edit" data-id="${esc(item.id)}">
      ${sheetHead(item.done ? 'Completed item' : 'Edit')}
      <div class="sheet-body">
        <label class="field"><span>Title</span><input name="title" value="${esc(item.title)}" required autocomplete="off"></label>
        <fieldset class="field">
          <legend class="field-label">List</legend>
          <div class="segmented">${segments}</div>
        </fieldset>
        <div data-show-for="next"${visibleFor('next')}>${contextField(item.context, 'context')}</div>
        <div data-show-for="waiting"${visibleFor('waiting')}>
          <label class="field"><span>Waiting on</span><input name="waitingOn" value="${esc(item.waitingOn)}" autocomplete="off" placeholder="Who?"></label>
        </div>
        ${projectSelect(item.projectId, 'projectId')}
        <label class="field"><span>Notes</span><textarea name="notes" rows="4">${esc(item.notes)}</textarea></label>
        <p class="fine-print">Added ${esc(ago(item.createdAt))}${item.done && item.doneAt ? ` · Done ${esc(ago(item.doneAt))}` : ''}</p>
      </div>
      <footer class="sheet-foot">
        <button type="button" class="btn danger" data-action="delete-item" data-id="${esc(item.id)}">Delete</button>
        <button type="submit" class="btn primary">Save</button>
      </footer>
    </form>`;
}

function projectSheet(project) {
  return `<form class="sheet-form" data-form="project" data-id="${esc(project.id)}">
      ${sheetHead('Edit project')}
      <div class="sheet-body">
        <label class="field"><span>Project</span><input name="title" value="${esc(project.title)}" required autocomplete="off"></label>
        <label class="field"><span>Outcome and notes</span><textarea name="notes" rows="5" placeholder="What does done look like?">${esc(project.notes)}</textarea></label>
      </div>
      <footer class="sheet-foot">
        <button type="button" class="btn danger" data-action="delete-project" data-id="${esc(project.id)}">Delete</button>
        <button type="submit" class="btn primary">Save</button>
      </footer>
    </form>`;
}

function contextField(value, name) {
  const options = [...new Set([...DEFAULT_CONTEXTS, ...usedContexts(), ...(value ? [value] : [])])];
  const chips = options
    .map((c) => `<button type="button" class="chip" data-action="pick-context" data-context="${esc(c)}" aria-pressed="${c === value}">@${esc(c)}</button>`)
    .join('');
  return `<div class="field context-field">
      <span class="field-label" id="${name}-label">Context</span>
      <div class="chips">${chips}</div>
      <input name="${name}" value="${esc(value)}" aria-labelledby="${name}-label" placeholder="Or type your own" autocomplete="off" autocapitalize="none">
    </div>`;
}

function projectSelect(selectedId, name) {
  const projects = state.projects.filter((project) => !project.done || project.id === selectedId).sort(byCreated);
  if (!projects.length) return '';
  const options = projects
    .map((project) => `<option value="${esc(project.id)}"${project.id === selectedId ? ' selected' : ''}>${esc(project.title)}</option>`)
    .join('');
  return `<label class="field"><span>Project</span><select name="${name}"><option value="">None</option>${options}</select></label>`;
}

function updateClarifyChoice(form) {
  const choice = form.elements.choice.value;
  for (const panel of $$('[data-panel]', form)) panel.hidden = panel.dataset.panel !== choice;
  const submit = $('[data-submit]', form);
  submit.disabled = !choice;
  submit.textContent = CLARIFY_SUBMIT[choice] || 'Choose where it goes';
  submit.classList.toggle('destructive', choice === 'trash');
  $(`[data-panel="${choice}"]`, form)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function updateEditFields(form) {
  const list = form.elements.list.value;
  for (const el of $$('[data-show-for]', form)) el.hidden = el.dataset.showFor !== list;
}

function syncContextChips(field) {
  const value = cleanContext($('input', field).value);
  for (const chip of $$('.chip', field)) chip.setAttribute('aria-pressed', String(chip.dataset.context === value));
}

function pickContext(chip) {
  const field = chip.closest('.context-field');
  $('input', field).value = chip.getAttribute('aria-pressed') === 'true' ? '' : chip.dataset.context;
  syncContextChips(field);
}

// ---------- Actions ----------

function quickAdd() {
  const input = $('#quick-input');
  const title = input.value.trim();
  if (!title) return;
  input.value = '';
  const { view, id } = route();
  if (view === 'projects') {
    const project = newProject(title);
    location.hash = `#project/${project.id}`;
    commit(() => state.projects.push(project));
    toast('Project created. What’s the first next action?');
  } else if (view === 'project' && projectById(id)) {
    commit(() => state.items.push(newItem(title, { list: 'next', projectId: id })));
  } else if (LISTS.includes(view)) {
    commit(() => state.items.push(newItem(title, { list: view, context: view === 'next' ? contextFilter : '' })));
  }
}

function toggleDone(id, done, row) {
  clearTimeout(pending.get(id)?.timer);
  row?.classList.toggle('completing', done);
  // A short delay lets the check animation play before the row disappears.
  const timer = setTimeout(() => {
    pending.delete(id);
    const item = itemById(id);
    if (!item || item.done === done) return;
    commit(() => {
      item.done = done;
      item.doneAt = done ? nowIso() : null;
    }, done ? 'Completed' : '');
  }, done ? 400 : 0);
  pending.set(id, { done, timer });
}

function toggleReviewStep(key, checked) {
  commit(() => {
    if (checked) state.reviewChecks[key] = true;
    else delete state.reviewChecks[key];
  });
}

function applyClarify(id, data) {
  const item = itemById(id);
  const choice = String(data.get('choice') ?? '');
  closeSheet();
  if (!item || !CLARIFY_TOAST[choice]) return;
  const title = formText(data, 'title') || item.title;
  const notes = String(data.get('notes') ?? '');

  commit(() => {
    item.title = title;
    item.notes = notes;
    if (choice === 'next') {
      moveTo(item, 'next');
      item.context = cleanContext(data.get('context'));
      item.projectId = data.get('projectId') || null;
    } else if (choice === 'waiting') {
      moveTo(item, 'waiting');
      item.waitingOn = formText(data, 'waitingOn');
      item.projectId = data.get('waitingProjectId') || null;
    } else if (choice === 'someday') {
      moveTo(item, 'someday');
    } else if (choice === 'done') {
      item.done = true;
      item.doneAt = nowIso();
    } else if (choice === 'trash') {
      state.items = state.items.filter((other) => other !== item);
    } else if (choice === 'project') {
      const project = newProject(title, notes);
      state.projects.push(project);
      state.items = state.items.filter((other) => other !== item);
      const firstAction = formText(data, 'firstAction');
      if (firstAction) {
        state.items.push(newItem(firstAction, { list: 'next', projectId: project.id, context: cleanContext(data.get('firstContext')) }));
      }
    }
  }, CLARIFY_TOAST[choice]);
}

function applyEdit(id, data) {
  const item = itemById(id);
  closeSheet();
  if (!item) return;
  const list = String(data.get('list') ?? '');
  commit(() => {
    item.title = formText(data, 'title') || item.title;
    item.notes = String(data.get('notes') ?? '');
    if (LISTS.includes(list)) moveTo(item, list);
    item.context = cleanContext(data.get('context'));
    item.waitingOn = formText(data, 'waitingOn');
    if (data.has('projectId')) item.projectId = data.get('projectId') || null;
  });
}

function applyProject(id, data) {
  const project = projectById(id);
  closeSheet();
  if (!project) return;
  commit(() => {
    project.title = formText(data, 'title') || project.title;
    project.notes = String(data.get('notes') ?? '');
  });
}

function completeProject(id) {
  const project = projectById(id);
  if (!project) return;
  location.hash = '#projects';
  commit(() => {
    const now = nowIso();
    project.done = true;
    project.doneAt = now;
    for (const item of state.items) {
      if (item.projectId === id && !item.done) {
        item.done = true;
        item.doneAt = now;
      }
    }
  }, 'Project completed');
}

function reopenProject(id) {
  const project = projectById(id);
  if (!project) return;
  commit(() => {
    project.done = false;
    project.doneAt = null;
  }, 'Project reopened');
}

function deleteItem(id) {
  closeSheet();
  if (!itemById(id)) return;
  commit(() => {
    state.items = state.items.filter((item) => item.id !== id);
  }, 'Deleted');
}

function deleteProject(id) {
  const project = projectById(id);
  closeSheet();
  if (!project) return;
  const count = state.items.filter((item) => item.projectId === id).length;
  location.hash = '#projects';
  commit(() => {
    state.projects = state.projects.filter((other) => other.id !== id);
    state.items = state.items.filter((item) => item.projectId !== id);
  }, count ? `Deleted project and ${plural(count, 'action')}` : 'Project deleted');
}

function finishReview() {
  commit(() => {
    state.lastReviewAt = nowIso();
    state.reviewChecks = {};
  }, 'Weekly review done. Nice work!');
}

function loadSample() {
  commit(() => {
    state = sampleState();
  }, 'Example data loaded');
}

function eraseAll() {
  if (!confirm('Erase all of your lists on this device?')) return;
  location.hash = '#inbox';
  commit(() => {
    state = emptyState();
  }, 'Everything erased');
}

async function exportBackup() {
  const name = `gtd-backup-${localDate()}.json`;
  const file = new File([JSON.stringify(state, null, 2)], name, { type: 'application/json' });
  // On phones, the share sheet lets you save the file to Files, Notes, email, etc.
  if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return;
    } catch (error) {
      if (error?.name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(file);
  const link = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

async function importBackup(input) {
  const file = input.files?.[0];
  if (!file) return;
  let data;
  try {
    const raw = JSON.parse(await file.text());
    if (!raw || !Array.isArray(raw.items) || !Array.isArray(raw.projects)) throw new Error('Not a GTD backup');
    data = normalize(raw);
  } catch {
    toast('That file doesn’t look like a GTD backup.');
    return;
  } finally {
    input.value = '';
  }
  const summary = `${plural(data.items.length, 'item')}, ${plural(data.projects.length, 'project')}`;
  if (!confirm(`Replace everything on this device with this backup (${summary})?`)) return;
  commit(() => {
    state = data;
  }, 'Backup imported');
}

function sampleState() {
  const daysAgo = (days) => new Date(Date.now() - days * DAY).toISOString();
  const project = (title, notes, days) => ({ ...newProject(title, notes), createdAt: daysAgo(days) });
  const item = (title, list, days, fields = {}) => ({ ...newItem(title, { list, ...fields }), createdAt: daysAgo(days), movedAt: daysAgo(days) });
  const trip = project('Plan a winter getaway', 'Done when flights and the first two nights are booked.', 12);
  const blog = project('Publish the next blog post', '', 9);
  const faucet = project('Fix the leaky kitchen faucet', '', 3);
  return normalize({
    projects: [trip, blog, faucet],
    items: [
      item('Call the dentist to reschedule', 'inbox', 0),
      item('Look into standing desks', 'inbox', 1),
      item('Renew passport?', 'inbox', 2),
      item('Compare flight prices', 'next', 10, { context: 'computer', projectId: trip.id }),
      item('Outline the post', 'next', 8, { context: 'computer', projectId: blog.id }),
      item('Call the bank about the new card', 'next', 5, { context: 'phone' }),
      item('Pick up dry cleaning', 'next', 4, { context: 'errands' }),
      item('Buy cat food', 'next', 2, { context: 'errands' }),
      item('Water the plants', 'next', 1, { context: 'home' }),
      item('Ideas for where to stay', 'waiting', 6, { waitingOn: 'Priya', projectId: trip.id }),
      item('Expense reimbursement', 'waiting', 11, { waitingOn: 'Finance' }),
      item('Learn to make croissants', 'someday', 20),
      item('Take a pottery class', 'someday', 30),
      item('Hike the Pacific Crest Trail', 'someday', 45),
      item('Book a haircut', 'next', 3, { context: 'phone', done: true, doneAt: daysAgo(1) }),
    ],
    lastReviewAt: daysAgo(9),
  });
}

// ---------- Events ----------

document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const { action, id } = target.dataset;
  switch (action) {
    case 'open-item':
      openItem(id);
      break;
    case 'close':
      closeSheet();
      break;
    case 'undo':
      undo();
      break;
    case 'filter':
      contextFilter = target.dataset.context;
      render();
      break;
    case 'pick-context':
      pickContext(target);
      break;
    case 'edit-project': {
      const project = projectById(id);
      if (project) openSheet(projectSheet(project));
      break;
    }
    case 'complete-project':
      completeProject(id);
      break;
    case 'reopen-project':
      reopenProject(id);
      break;
    case 'delete-item':
      deleteItem(id);
      break;
    case 'delete-project':
      deleteProject(id);
      break;
    case 'load-sample':
      loadSample();
      break;
    case 'finish-review':
      finishReview();
      break;
    case 'export':
      exportBackup();
      break;
    case 'import':
      $('#import-file').click();
      break;
    case 'erase':
      eraseAll();
      break;
    default:
      break;
  }
});

document.addEventListener('change', (event) => {
  const el = event.target;
  if (el.matches('.check[data-id]')) toggleDone(el.dataset.id, el.checked, el.closest('.row'));
  else if (el.matches('.check[data-review]')) toggleReviewStep(el.dataset.review, el.checked);
  else if (el.matches('input[name="choice"]')) updateClarifyChoice(el.form);
  else if (el.matches('input[name="list"]')) updateEditFields(el.form);
  else if (el.id === 'import-file') importBackup(el);
});

document.addEventListener('input', (event) => {
  const field = event.target.closest('.context-field');
  if (field) syncContextChips(field);
});

document.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.target;
  if (form.id === 'quick-add') {
    quickAdd();
    return;
  }
  const data = new FormData(form);
  const { id } = form.dataset;
  if (form.dataset.form === 'clarify') applyClarify(id, data);
  else if (form.dataset.form === 'edit') applyEdit(id, data);
  else if (form.dataset.form === 'project') applyProject(id, data);
});

sheet.addEventListener('click', (event) => {
  if (event.target === sheet) closeSheet(); // Tapped the backdrop.
});

sheet.addEventListener('close', () => {
  sheet.innerHTML = '';
});

window.addEventListener('hashchange', () => {
  closeSheet();
  render();
});

// Keep multiple open tabs in sync.
window.addEventListener('storage', (event) => {
  if (event.key !== STORAGE_KEY) return;
  state = load();
  render();
});

render();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

if (navigator.standalone || matchMedia('(display-mode: standalone)').matches) {
  navigator.storage?.persist?.().catch(() => {});
}
