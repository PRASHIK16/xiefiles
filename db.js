/**
 * db.js — Lightweight JSON file store
 * Mimics the SQLite API shape used in server.js
 * Persists to data/xiefiles.json; rebuilds on crash/restart automatically.
 */
const fs   = require('fs');
const path = require('path');

const DATA_DIR  = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'xiefiles.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ── In-memory store ────────────────────────────────────────────────
let _store = [];
function _load() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      _store = JSON.parse(raw) || [];
    }
  } catch { _store = []; }
}
function _save() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(_store, null, 2), 'utf8');
}
_load();

// ── Public API ─────────────────────────────────────────────────────

/** Insert a file record */
function insert(record) {
  _store.push({ ...record });
  _save();
}

/** Get one file by id (any deleted state) */
function getById(id) {
  return _store.find(f => f.id === id) || null;
}

/** Get one active (not deleted, not expired) file by id */
function getActive(id) {
  const now = Date.now();
  return _store.find(f => f.id === id && !f.deleted_at && f.expires_at > now) || null;
}

/**
 * Get one active file by its private share_slug (used for private links).
 * Works regardless of visibility — the slug IS the access grant.
 */
function getBySlug(slug) {
  if (!slug) return null;
  const now = Date.now();
  return _store.find(f => f.share_slug === slug && !f.deleted_at && f.expires_at > now) || null;
}

/**
 * List files matching filter criteria (returns shallow copies, no uploader_token)
 * opts: { deleted, search, status, limit }
 * NOTE: admin uses this and is allowed to see BOTH public and private files.
 */
function list(opts = {}) {
  const now   = Date.now();
  const limit = opts.limit || 500;
  return _store
    .filter(f => {
      if (opts.deleted === true  && !f.deleted_at)  return false;
      if (opts.deleted === false && f.deleted_at)    return false;
      if (opts.deleted === false && f.expires_at <= now) return false; // expired
      if (opts.status && f.pdf_status !== opts.status) return false;
      if (opts.search && !f.original_name.toLowerCase().includes(opts.search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => b.uploaded_at - a.uploaded_at)
    .slice(0, limit)
    .map(f => ({ ...f }));
}

/**
 * List active PUBLIC files only — public shape (no token, no slug).
 * Private files are intentionally excluded so they never appear on the
 * shared board or in the socket broadcast.
 */
function activePublic() {
  const now = Date.now();
  return _store
    .filter(f => !f.deleted_at && f.expires_at > now && f.visibility !== 'private')
    .sort((a, b) => b.uploaded_at - a.uploaded_at)
    .map(({ uploader_token, share_slug, ...pub }) => pub);
}

/** Update arbitrary fields on a record by id */
function update(id, fields) {
  const idx = _store.findIndex(f => f.id === id);
  if (idx === -1) return false;
  Object.assign(_store[idx], fields);
  _save();
  return true;
}

/** Hard-delete a record by id (used by purge cron) */
function hardDelete(id) {
  const before = _store.length;
  _store = _store.filter(f => f.id !== id);
  if (_store.length !== before) { _save(); return true; }
  return false;
}

/** Hard-delete all records matching a predicate (used by purge cron) */
function hardDeleteWhere(predicate) {
  const removed = _store.filter(predicate);
  _store = _store.filter(f => !predicate(f));
  if (removed.length) _save();
  return removed;
}

/** Stats */
function stats() {
  const now = Date.now();
  const active  = _store.filter(f => !f.deleted_at && f.expires_at > now);
  const deleted = _store.filter(f =>  f.deleted_at);
  return {
    total:        _store.length,
    active:       active.length,
    deleted:      deleted.length,
    active_bytes: active.reduce((s, f) => s + (f.size || 0), 0),
    total_bytes:  _store.reduce((s, f) => s + (f.size || 0), 0),
  };
}

module.exports = { insert, getById, getActive, getBySlug, list, activePublic, update, hardDelete, hardDeleteWhere, stats };

// ════════════════════════════════════════════════════════════════
//  NOTES + FEEDBACK collections (separate JSON files)
// ════════════════════════════════════════════════════════════════
const NOTES_FILE    = path.join(DATA_DIR, 'notes.json');
const FEEDBACK_FILE = path.join(DATA_DIR, 'feedback.json');

function _loadArr(file) {
  try { if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8')) || []; } catch {}
  return [];
}
let _notes    = _loadArr(NOTES_FILE);
let _feedback = _loadArr(FEEDBACK_FILE);
const _saveNotes    = () => fs.writeFileSync(NOTES_FILE, JSON.stringify(_notes, null, 2));
const _saveFeedback = () => fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(_feedback, null, 2));

// ── NOTES ──────────────────────────────────────────────────────
const notes = {
  list() {
    return _notes.slice().sort((a, b) => b.updated_at - a.updated_at)
      .map(({ owner_token, ...pub }) => pub);
  },
  insert(rec) { _notes.push({ ...rec }); _saveNotes(); },
  getById(id) { return _notes.find(n => n.id === id) || null; },
  update(id, fields) {
    const i = _notes.findIndex(n => n.id === id);
    if (i === -1) return false;
    Object.assign(_notes[i], fields);
    _saveNotes();
    return true;
  },
  remove(id) {
    const before = _notes.length;
    _notes = _notes.filter(n => n.id !== id);
    if (_notes.length !== before) { _saveNotes(); return true; }
    return false;
  },
  publicOf(rec) { const { owner_token, ...pub } = rec; return pub; },
};

// ── FEEDBACK ───────────────────────────────────────────────────
const feedback = {
  list(opts = {}) {
    let arr = _feedback.slice();
    if (opts.search) arr = arr.filter(f =>
      (f.name || '').toLowerCase().includes(opts.search.toLowerCase()) ||
      (f.message || '').toLowerCase().includes(opts.search.toLowerCase()));
    if (opts.resolved === true)  arr = arr.filter(f => f.resolved);
    if (opts.resolved === false) arr = arr.filter(f => !f.resolved);
    return arr.sort((a, b) => b.created_at - a.created_at);
  },
  insert(rec) { _feedback.push({ ...rec }); _saveFeedback(); },
  update(id, fields) {
    const i = _feedback.findIndex(f => f.id === id);
    if (i === -1) return false;
    Object.assign(_feedback[i], fields);
    _saveFeedback();
    return true;
  },
  remove(id) {
    const before = _feedback.length;
    _feedback = _feedback.filter(f => f.id !== id);
    if (_feedback.length !== before) { _saveFeedback(); return true; }
    return false;
  },
  stats() {
    return {
      total:    _feedback.length,
      resolved: _feedback.filter(f => f.resolved).length,
      pending:  _feedback.filter(f => !f.resolved).length,
      byType:   _feedback.reduce((acc, f) => { acc[f.type] = (acc[f.type]||0)+1; return acc; }, {}),
    };
  },
};

module.exports.notes    = notes;
module.exports.feedback = feedback;
