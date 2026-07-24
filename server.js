require('dotenv').config();
const express      = require('express');
const http         = require('http');
const { Server }   = require('socket.io');
const multer       = require('multer');
const path         = require('path');
const fs           = require('fs');
const { v4: uuid } = require('uuid');
const crypto       = require('crypto');
const cron         = require('node-cron');
const { exec }     = require('child_process');
const session      = require('express-session');
const db           = require('./db');

// ─────────────────────────────────────────────
//  CONFIG
// ─────────────────────────────────────────────
const PORT          = parseInt(process.env.PORT || '3000');
const ADMIN_PASS    = process.env.ADMIN_PASSWORD  || 'xieadmin123';
const SESSION_SEC   = process.env.SESSION_SECRET  || 'xie-secret-dev';
const MAX_MB        = parseInt(process.env.MAX_FILE_SIZE_MB || '100');
const EXPIRY_DAYS   = () => parseInt(process.env.EXPIRY_DAYS || '30');
const PERM_DEL_DAYS = parseInt(process.env.PERMANENT_DELETE_AFTER_DAYS || '7');

const UPLOAD_DIR    = path.join(__dirname, 'uploads');
const CONVERTED_DIR = path.join(__dirname, 'converted');
[UPLOAD_DIR, CONVERTED_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));

// ─────────────────────────────────────────────
//  EXPRESS + SOCKET.IO
// ─────────────────────────────────────────────
const app        = express();
const httpServer = http.createServer(app);
const io         = new Server(httpServer, { cors: { origin: '*' } });

app.use(express.json({ limit: '12mb' }));            // notes may embed base64 images
app.use(express.urlencoded({ extended: true, limit: '12mb' }));
// Serve the built React app (client/dist). Falls back to legacy public/ for admin.html.
const CLIENT_DIST = path.join(__dirname, 'client', 'dist');
if (fs.existsSync(CLIENT_DIST)) app.use(express.static(CLIENT_DIST));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: SESSION_SEC, resave: false, saveUninitialized: false,
  cookie: { maxAge: 86_400_000, httpOnly: true }
}));

// ─────────────────────────────────────────────
//  ALLOWED MIME TYPES
// ─────────────────────────────────────────────
const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
  'application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed',
]);

// ─────────────────────────────────────────────
//  MULTER (multer v2 API)
// ─────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '';
    cb(null, uuid() + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
    const err = new Error(`File type not allowed: ${file.mimetype}`);
    err.code = 'INVALID_TYPE';
    cb(err);
  },
});

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────
function initialPdfStatus(mime) {
  if (mime === 'application/pdf')  return 'ready';
  if (mime.startsWith('image/'))   return 'ready';
  if (mime.includes('zip') || mime.includes('rar')) return 'na';
  return 'converting';
}

// Strip secrets (uploader_token + share_slug) before sending to clients
function publicFile(f) {
  const { uploader_token, share_slug, ...pub } = f;
  return pub;
}

// Unguessable URL-safe token for private share links (~32 chars)
function makeSlug() {
  return crypto.randomBytes(24).toString('base64url');
}

// ─────────────────────────────────────────────
//  LIBREOFFICE CHECK
// ─────────────────────────────────────────────
let loAvailable = false;
exec('which soffice', (err, out) => {
  if (!err && out.trim()) { loAvailable = true; console.log('✅  LibreOffice:', out.trim()); }
  else console.warn('⚠️   LibreOffice not found — conversion disabled');
});

// ─────────────────────────────────────────────
//  CONVERSION SERVICE
// ─────────────────────────────────────────────
function convertToPdf(storedName) {
  return new Promise((resolve, reject) => {
    if (!loAvailable) return reject(new Error('LibreOffice unavailable'));
    const inputPath = path.join(UPLOAD_DIR, storedName);
    const cmd = `soffice --headless --norestore --convert-to pdf --outdir "${CONVERTED_DIR}" "${inputPath}"`;
    exec(cmd, { timeout: 60_000 }, (err) => {
      if (err) return reject(err);
      const base    = path.basename(storedName, path.extname(storedName));
      const pdfName = base + '.pdf';
      const pdfPath = path.join(CONVERTED_DIR, pdfName);
      if (fs.existsSync(pdfPath)) resolve(pdfName);
      else reject(new Error('Converted file not found'));
    });
  });
}

async function triggerConversion(fileId, storedName) {
  try {
    const pdfName = await convertToPdf(storedName);
    db.update(fileId, { pdf_status: 'ready', pdf_stored_name: pdfName });
    io.emit('file:badge_update', { id: fileId, pdf_status: 'ready', pdf_stored_name: pdfName });
    console.log(`✅  Converted → ${pdfName}`);
  } catch (err) {
    db.update(fileId, { pdf_status: 'failed' });
    io.emit('file:badge_update', { id: fileId, pdf_status: 'failed' });
    console.error('❌  Conversion failed:', err.message);
  }
}

// ─────────────────────────────────────────────
//  STUDENT API
// ─────────────────────────────────────────────

/** POST /api/upload  (body field: visibility = 'public' | 'private') */
app.post('/api/upload', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      const code = err.code === 'INVALID_TYPE' ? 415 : err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(code).json({ error: err.message });
    }
    next();
  });
}, (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    const f             = req.file;
    const uploaderToken = uuid();
    const now           = Date.now();
    const pdfStatus     = initialPdfStatus(f.mimetype);

    // Private uploads get a secret slug and stay OFF the public board.
    const isPrivate = req.body.visibility === 'private';
    const shareSlug = isPrivate ? makeSlug() : null;

    const record = {
      id:              uuid(),
      original_name:   f.originalname,
      stored_name:     f.filename,
      mime_type:       f.mimetype,
      size:            f.size,
      uploaded_at:     now,
      expires_at:      now + EXPIRY_DAYS() * 86_400_000,
      deleted_at:      null,
      pdf_status:      pdfStatus,
      pdf_stored_name: null,
      uploader_token:  uploaderToken,
      visibility:      isPrivate ? 'private' : 'public',
      share_slug:      shareSlug,
    };

    db.insert(record);

    // Only announce PUBLIC files to everyone. Private files must not leak.
    if (!isPrivate) io.emit('file:added', publicFile(record));

    res.json({
      success: true,
      file: publicFile(record),
      uploaderToken,
      visibility: record.visibility,
      shareSlug,   // null for public; the secret for private
    });

    if (pdfStatus === 'converting') triggerConversion(record.id, record.stored_name);
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/files — public board only */
app.get('/api/files', (req, res) => res.json(db.activePublic()));

/** GET /api/files/:id/download?slug=...  (public by id, private by slug) */
app.get('/api/files/:id/download', (req, res) => {
  let f = db.getActive(req.params.id);
  if (f && f.visibility === 'private') f = null;           // private not reachable by id
  if (!f && req.query.slug) f = db.getBySlug(req.query.slug);
  if (!f) return res.status(404).json({ error: 'File not found' });

  const fp = path.join(UPLOAD_DIR, f.stored_name);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'File missing on disk' });
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(f.original_name)}`);
  res.setHeader('Content-Type', f.mime_type);
  res.sendFile(fp);
});

/** GET /api/files/:id/pdf?inline=1&slug=...  (public by id, private by slug) */
app.get('/api/files/:id/pdf', (req, res) => {
  let f = db.getActive(req.params.id);
  if (f && f.visibility === 'private') f = null;
  if (!f && req.query.slug) f = db.getBySlug(req.query.slug);
  if (!f) return res.status(404).json({ error: 'File not found' });

  let fp;
  if (f.mime_type === 'application/pdf') {
    fp = path.join(UPLOAD_DIR, f.stored_name);
  } else if (f.pdf_status === 'ready' && f.pdf_stored_name) {
    fp = path.join(CONVERTED_DIR, f.pdf_stored_name);
  } else if (f.mime_type.startsWith('image/')) {
    const ip = path.join(UPLOAD_DIR, f.stored_name);
    if (!fs.existsSync(ip)) return res.status(404).json({ error: 'File missing' });
    res.setHeader('Content-Type', f.mime_type);
    res.setHeader('Content-Disposition', 'inline');
    return res.sendFile(ip);
  } else {
    return res.status(404).json({ error: 'PDF not available yet' });
  }

  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'PDF missing on disk' });
  const inline = req.query.inline === '1';
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', inline ? 'inline' : `attachment; filename*=UTF-8''${encodeURIComponent(path.parse(f.original_name).name + '.pdf')}`);
  res.sendFile(fp);
});

/** GET /api/share/:slug — metadata for a private shared file */
app.get('/api/share/:slug', (req, res) => {
  const f = db.getBySlug(req.params.slug);
  if (!f) return res.status(404).json({ error: 'This link is invalid or has expired' });
  const { uploader_token, ...pub } = f;   // keep share_slug so client can build URLs
  res.json({ file: pub });
});

/** DELETE /api/files/:id  (owner token required) */
app.delete('/api/files/:id', (req, res) => {
  const { token } = req.body;
  const f = db.getById(req.params.id);
  if (!f || f.deleted_at) return res.status(404).json({ error: 'File not found' });
  if (f.uploader_token !== token) return res.status(403).json({ error: 'Not authorized' });
  db.update(f.id, { deleted_at: Date.now() });
  if (f.visibility !== 'private') io.emit('file:removed', { id: f.id });
  res.json({ success: true });
});

// ─────────────────────────────────────────────
//  ADMIN MIDDLEWARE
// ─────────────────────────────────────────────
const requireAdmin = (req, res, next) =>
  req.session?.isAdmin ? next() : res.status(401).json({ error: 'Admin authentication required' });

app.post('/api/admin/login', (req, res) => {
  if (req.body.password === ADMIN_PASS) {
    req.session.isAdmin = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

app.post('/api/admin/logout', (req, res) => { req.session.destroy(); res.json({ success: true }); });
app.get('/api/admin/session', (req, res) => res.json({ isAdmin: !!req.session?.isAdmin }));

app.get('/api/admin/files', requireAdmin, (req, res) => {
  const { search = '', status = '', deleted = '0' } = req.query;
  const files = db.list({
    deleted: deleted === '1' ? true : false,
    search:  search || undefined,
    status:  status || undefined,
    limit:   500,
  });
  res.json(files);
});

app.delete('/api/admin/files/:id', requireAdmin, (req, res) => {
  const f = db.getById(req.params.id);
  if (!f) return res.status(404).json({ error: 'File not found' });
  db.update(f.id, { deleted_at: Date.now() });
  io.emit('file:removed', { id: f.id });
  res.json({ success: true });
});

app.patch('/api/admin/files/:id/restore', requireAdmin, (req, res) => {
  const f = db.getById(req.params.id);
  if (!f) return res.status(404).json({ error: 'File not found' });
  db.update(f.id, { deleted_at: null });
  if (f.expires_at > Date.now() && f.visibility !== 'private') io.emit('file:added', publicFile({ ...f, deleted_at: null }));
  res.json({ success: true });
});

app.patch('/api/admin/files/:id', requireAdmin, (req, res) => {
  const f = db.getById(req.params.id);
  if (!f) return res.status(404).json({ error: 'File not found' });
  const updates = {};
  if (req.body.original_name) updates.original_name = String(req.body.original_name).trim();
  if (req.body.expires_at)    updates.expires_at    = new Date(req.body.expires_at).getTime();
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'Nothing to update' });
  db.update(f.id, updates);
  res.json({ success: true });
});

app.get('/api/admin/stats', requireAdmin, (req, res) => {
  const overview = db.stats();
  res.json({ overview });
});

app.put('/api/admin/settings', requireAdmin, (req, res) => {
  const days = parseInt(req.body.expiry_days);
  if (days > 0 && days <= 365) process.env.EXPIRY_DAYS = String(days);
  res.json({ success: true, expiry_days: EXPIRY_DAYS() });
});

// ═════════════════════════════════════════════
//  NOTES API  (live collaborative notice board)
// ═════════════════════════════════════════════

/** GET /api/notes */
app.get('/api/notes', (req, res) => res.json(db.notes.list()));

/** POST /api/notes  { title, content(HTML), color } */
app.post('/api/notes', (req, res) => {
  const { title = '', content = '', color = 'default' } = req.body;
  if (!content.trim() && !title.trim()) return res.status(400).json({ error: 'Note is empty' });
  const now = Date.now();
  const rec = {
    id:         uuid(),
    title:      String(title).slice(0, 200),
    content:    String(content).slice(0, 50_000),
    color,
    created_at: now,
    updated_at: now,
    owner_token: uuid(),
  };
  db.notes.insert(rec);
  io.emit('note:added', db.notes.publicOf(rec));
  res.json({ success: true, note: db.notes.publicOf(rec), ownerToken: rec.owner_token });
});

/** PATCH /api/notes/:id  (owner token required) */
app.patch('/api/notes/:id', (req, res) => {
  const n = db.notes.getById(req.params.id);
  if (!n) return res.status(404).json({ error: 'Note not found' });
  if (n.owner_token !== req.body.token) return res.status(403).json({ error: 'Not authorized' });
  const fields = { updated_at: Date.now() };
  if (req.body.title   !== undefined) fields.title   = String(req.body.title).slice(0, 200);
  if (req.body.content !== undefined) fields.content = String(req.body.content).slice(0, 50_000);
  if (req.body.color   !== undefined) fields.color   = req.body.color;
  db.notes.update(n.id, fields);
  io.emit('note:updated', db.notes.publicOf({ ...n, ...fields }));
  res.json({ success: true });
});

/** DELETE /api/notes/:id  (owner token required) */
app.delete('/api/notes/:id', (req, res) => {
  const n = db.notes.getById(req.params.id);
  if (!n) return res.status(404).json({ error: 'Note not found' });
  if (n.owner_token !== req.body.token) return res.status(403).json({ error: 'Not authorized' });
  db.notes.remove(n.id);
  io.emit('note:removed', { id: n.id });
  res.json({ success: true });
});

// ═════════════════════════════════════════════
//  FEEDBACK API
// ═════════════════════════════════════════════

/** POST /api/feedback  { name, type, message } — anyone can submit */
app.post('/api/feedback', (req, res) => {
  const { name = 'Anonymous', type = 'General', message = '' } = req.body;
  if (!message.trim()) return res.status(400).json({ error: 'Message is required' });
  const rec = {
    id:         uuid(),
    name:       String(name).slice(0, 100) || 'Anonymous',
    type:       String(type).slice(0, 40),
    message:    String(message).slice(0, 5000),
    resolved:   false,
    created_at: Date.now(),
  };
  db.feedback.insert(rec);
  res.json({ success: true });
});

/** GET /api/admin/feedback — admin only */
app.get('/api/admin/feedback', requireAdmin, (req, res) => {
  const { search = '', resolved } = req.query;
  const opts = { search: search || undefined };
  if (resolved === '1') opts.resolved = true;
  if (resolved === '0') opts.resolved = false;
  res.json({ items: db.feedback.list(opts), stats: db.feedback.stats() });
});

/** PATCH /api/admin/feedback/:id/resolve — toggle resolved */
app.patch('/api/admin/feedback/:id/resolve', requireAdmin, (req, res) => {
  const ok = db.feedback.update(req.params.id, { resolved: !!req.body.resolved });
  ok ? res.json({ success: true }) : res.status(404).json({ error: 'Not found' });
});

/** DELETE /api/admin/feedback/:id */
app.delete('/api/admin/feedback/:id', requireAdmin, (req, res) => {
  db.feedback.remove(req.params.id);
  res.json({ success: true });
});

/** GET /api/admin/feedback/export — CSV download */
app.get('/api/admin/feedback/export', requireAdmin, (req, res) => {
  const rows = db.feedback.list();
  const esc = s => `"${String(s).replace(/"/g, '""')}"`;
  const csv = ['Name,Type,Message,Status,Submitted']
    .concat(rows.map(r => [
      esc(r.name), esc(r.type), esc(r.message),
      r.resolved ? 'Resolved' : 'Pending',
      esc(new Date(r.created_at).toLocaleString('en-IN')),
    ].join(','))).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="xiefiles_feedback.csv"');
  res.send(csv);
});

// ─────────────────────────────────────────────
//  SOCKET.IO  (files, notes, live presence)
// ─────────────────────────────────────────────
let liveUsers = 0;
io.on('connection', (socket) => {
  liveUsers++;
  io.emit('presence', { users: liveUsers });
  socket.emit('init',       db.activePublic());
  socket.emit('notes:init', db.notes.list());

  socket.on('disconnect', () => {
    liveUsers = Math.max(0, liveUsers - 1);
    io.emit('presence', { users: liveUsers });
  });
});

// ─────────────────────────────────────────────
//  CRON JOBS
// ─────────────────────────────────────────────
// Every hour: soft-delete expired files
cron.schedule('0 * * * *', () => {
  const now = Date.now();
  const all = db.list({ deleted: false });
  all.filter(f => f.expires_at <= now).forEach(f => {
    db.update(f.id, { deleted_at: now });
    io.emit('file:removed', { id: f.id });
  });
});

// Every night at 3 AM: permanently purge files soft-deleted > PERM_DEL_DAYS ago
cron.schedule('0 3 * * *', () => {
  const cutoff = Date.now() - PERM_DEL_DAYS * 86_400_000;
  const old = db.hardDeleteWhere(f => f.deleted_at && f.deleted_at <= cutoff);
  old.forEach(f => {
    const op = path.join(UPLOAD_DIR, f.stored_name);
    if (fs.existsSync(op)) fs.unlinkSync(op);
    if (f.pdf_stored_name) {
      const pp = path.join(CONVERTED_DIR, f.pdf_stored_name);
      if (fs.existsSync(pp)) fs.unlinkSync(pp);
    }
  });
  if (old.length) console.log(`🗑️  Purged ${old.length} file(s) permanently`);
});

// ─────────────────────────────────────────────
//  SPA FALLBACK — serve React index.html for client-side routes
// ─────────────────────────────────────────────
app.get(/^(?!\/api).*/, (req, res, next) => {
  const indexFile = path.join(CLIENT_DIST, 'index.html');
  if (fs.existsSync(indexFile)) return res.sendFile(indexFile);
  next();
});

// ─────────────────────────────────────────────
//  START
// ─────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`\n🚀  XIE Files  →  http://localhost:${PORT}`);
  console.log(`🔑  Admin      →  http://localhost:${PORT}/admin.html`);
  console.log(`📁  Uploads    →  ${UPLOAD_DIR}`);
  console.log(`⏰  Expiry     →  ${EXPIRY_DAYS()} days`);
  console.log(`🔑  Admin pass →  ${ADMIN_PASS.slice(0,3)}***\n`);
});
