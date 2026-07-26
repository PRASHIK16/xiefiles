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
const { PDFDocument } = require('pdf-lib');
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
const OTP_TTL_MS    = 24 * 60 * 60 * 1000;      // OTP valid for 24 hours
const DRAFT_TTL_MS  = 60 * 60 * 1000;           // unshared drafts auto-delete after 1 hour

const UPLOAD_DIR    = path.join(__dirname, 'uploads');
const CONVERTED_DIR = path.join(__dirname, 'converted');
[UPLOAD_DIR, CONVERTED_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));

// ─────────────────────────────────────────────
//  EXPRESS + SOCKET.IO
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
const app        = express();
app.set('trust proxy', 1);
const httpServer = http.createServer(app);
const io         = new Server(httpServer, { cors: { origin: '*' } });

app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true, limit: '12mb' }));
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
//  MULTER
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

// Strip secrets before sending to clients
function publicFile(f) {
  const { uploader_token, share_slug, otp_code, owner_batch, ...pub } = f;
  return pub;
}

// Generate a unique 4-digit OTP not currently in active use
function makeOtp() {
  const now = Date.now();
  for (let attempt = 0; attempt < 50; attempt++) {
    const code = String(Math.floor(1000 + Math.random() * 9000)); // 1000–9999
    const inUse = db.getByOtp(code).length > 0
      || db.list({ deleted: false }).some(f => f.otp_code === code && f.otp_expires_at > now && !f.is_draft);
    if (!inUse) return code;
  }
  // Fallback (extremely unlikely): timestamp-based
  return String(1000 + (now % 9000));
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
//  STUDENT API — FILES
// ─────────────────────────────────────────────

/**
 * POST /api/upload
 * body.visibility = 'public'  → shows on board (default)
 * body.visibility = 'otp'     → uploads as DRAFT (hidden). owner_batch groups the drafts.
 */
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

    const isOtp = req.body.visibility === 'otp';
    // For OTP drafts, the client sends a batch id so all files in one "share" group together.
    const ownerBatch = isOtp ? (req.body.batch || uuid()) : null;

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
      visibility:      isOtp ? 'otp' : 'public',
      share_slug:      null,
      // OTP fields
      is_draft:        isOtp,        // draft until "Share" is pressed
      owner_batch:     ownerBatch,
      otp_code:        null,
      otp_expires_at:  null,
    };

    db.insert(record);

    // Only PUBLIC files hit the board / broadcast. OTP drafts stay hidden.
    if (!isOtp) io.emit('file:added', publicFile(record));

    res.json({
      success: true,
      file: publicFile(record),
      uploaderToken,
      visibility: record.visibility,
      batch: ownerBatch,            // client keeps this to share the whole batch later
    });

    if (pdfStatus === 'converting') triggerConversion(record.id, record.stored_name);
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/files — public board only */
app.get('/api/files', (req, res) => res.json(db.activePublic()));

/** GET /api/files/:id/download?otp=... */
app.get('/api/files/:id/download', (req, res) => {
  let f = db.getActive(req.params.id);
  // Public files: direct. OTP files: only if the correct OTP is supplied.
  if (f && f.visibility !== 'public') f = null;
  if (!f && req.query.otp) {
    const match = db.getByOtp(req.query.otp).find(x => x.id === req.params.id);
    if (match) f = match;
  }
  if (!f) return res.status(404).json({ error: 'File not found' });

  const fp = path.join(UPLOAD_DIR, f.stored_name);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'File missing on disk' });
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(f.original_name)}`);
  res.setHeader('Content-Type', f.mime_type);
  res.sendFile(fp);
});

/** GET /api/files/:id/pdf?inline=1&otp=... */
app.get('/api/files/:id/pdf', (req, res) => {
  let f = db.getActive(req.params.id);
  if (f && f.visibility !== 'public') f = null;
  if (!f && req.query.otp) {
    const match = db.getByOtp(req.query.otp).find(x => x.id === req.params.id);
    if (match) f = match;
  }
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

/** DELETE /api/files/:id  (owner token required) */
app.delete('/api/files/:id', (req, res) => {
  const { token } = req.body;
  const f = db.getById(req.params.id);
  if (!f || f.deleted_at) return res.status(404).json({ error: 'File not found' });
  if (f.uploader_token !== token) return res.status(403).json({ error: 'Not authorized' });
  db.update(f.id, { deleted_at: Date.now() });
  if (f.visibility === 'public') io.emit('file:removed', { id: f.id });
  res.json({ success: true });
});

// ═════════════════════════════════════════════
//  OTP SHARING
// ═════════════════════════════════════════════

/**
 * POST /api/otp/share  { batch }
 * Turns all draft files in a batch into a shared OTP session.
 */
app.post('/api/otp/share', (req, res) => {
  const { batch } = req.body;
  if (!batch) return res.status(400).json({ error: 'Missing batch id' });

  const drafts = db.getDraftsByOwner(batch);
  if (drafts.length === 0) return res.status(400).json({ error: 'No files to share' });

  const code      = makeOtp();
  const now       = Date.now();
  const expiresAt = now + OTP_TTL_MS;

  drafts.forEach(f => db.update(f.id, {
    is_draft:       false,
    otp_code:       code,
    otp_expires_at: expiresAt,
  }));

  res.json({ success: true, otp: code, expiresAt, count: drafts.length });
});

// ── Rate limiting for OTP access (in-memory) ──────────────────────
const otpAttempts = new Map();  // ip → { count, firstAt }
const OTP_MAX_ATTEMPTS = 5;
const OTP_BLOCK_MS     = 15 * 60 * 1000;

function checkRate(ip) {
  const now = Date.now();
  const rec = otpAttempts.get(ip);
  if (!rec) return { ok: true };
  if (now - rec.firstAt > OTP_BLOCK_MS) { otpAttempts.delete(ip); return { ok: true }; }
  if (rec.count >= OTP_MAX_ATTEMPTS) {
    const waitMin = Math.ceil((OTP_BLOCK_MS - (now - rec.firstAt)) / 60000);
    return { ok: false, waitMin };
  }
  return { ok: true };
}
function recordFail(ip) {
  const now = Date.now();
  const rec = otpAttempts.get(ip);
  if (!rec || now - rec.firstAt > OTP_BLOCK_MS) otpAttempts.set(ip, { count: 1, firstAt: now });
  else rec.count++;
}

/**
 * POST /api/otp/access  { otp }
 * Returns the files under a valid OTP. Rate-limited.
 */
app.post('/api/otp/access', (req, res) => {
  const ip  = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const otp = String(req.body.otp || '').trim();

  const rate = checkRate(ip);
  if (!rate.ok) return res.status(429).json({ error: `Too many attempts. Try again in ${rate.waitMin} min.` });

  if (!/^\d{4}$/.test(otp)) { recordFail(ip); return res.status(400).json({ error: 'Enter a valid 4-digit code' }); }

  const files = db.getByOtp(otp);
  if (files.length === 0) {
    recordFail(ip);
    return res.status(404).json({ error: 'Invalid or expired code' });
  }

  // success → reset attempts for this ip
  otpAttempts.delete(ip);
  res.json({
    success: true,
    files: files.map(f => {
      const { uploader_token, share_slug, otp_code, owner_batch, otp_expires_at, ...pub } = f;
      return pub;
    }),
  });
});

// ─────────────────────────────────────────────
//  ADMIN
// ─────────────────────────────────────────────
const requireAdmin = (req, res, next) =>
  req.session?.isAdmin ? next() : res.status(401).json({ error: 'Admin authentication required' });

app.post('/api/admin/login', (req, res) => {
  if (req.body.password === ADMIN_PASS) { req.session.isAdmin = true; res.json({ success: true }); }
  else res.status(401).json({ error: 'Invalid password' });
});
app.post('/api/admin/logout', (req, res) => { req.session.destroy(); res.json({ success: true }); });
app.get('/api/admin/session', (req, res) => res.json({ isAdmin: !!req.session?.isAdmin }));

app.get('/api/admin/files', requireAdmin, (req, res) => {
  const { search = '', status = '', deleted = '0' } = req.query;
  res.json(db.list({
    deleted: deleted === '1',
    search:  search || undefined,
    status:  status || undefined,
    limit:   500,
  }));
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
  if (f.expires_at > Date.now() && f.visibility === 'public' && !f.is_draft)
    io.emit('file:added', publicFile({ ...f, deleted_at: null }));
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

app.get('/api/admin/stats', requireAdmin, (req, res) => res.json({ overview: db.stats() }));

app.put('/api/admin/settings', requireAdmin, (req, res) => {
  const days = parseInt(req.body.expiry_days);
  if (days > 0 && days <= 365) process.env.EXPIRY_DAYS = String(days);
  res.json({ success: true, expiry_days: EXPIRY_DAYS() });
});

// ═════════════════════════════════════════════
//  NOTES API
// ═════════════════════════════════════════════
app.get('/api/notes', (req, res) => res.json(db.notes.list()));

app.post('/api/notes', (req, res) => {
  const { title = '', content = '', color = 'default' } = req.body;
  if (!content.trim() && !title.trim()) return res.status(400).json({ error: 'Note is empty' });
  const now = Date.now();
  const rec = {
    id: uuid(), title: String(title).slice(0, 200), content: String(content).slice(0, 50_000),
    color, created_at: now, updated_at: now, owner_token: uuid(),
  };
  db.notes.insert(rec);
  io.emit('note:added', db.notes.publicOf(rec));
  res.json({ success: true, note: db.notes.publicOf(rec), ownerToken: rec.owner_token });
});

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
app.post('/api/feedback', (req, res) => {
  const { name = 'Anonymous', type = 'General', message = '' } = req.body;
  if (!message.trim()) return res.status(400).json({ error: 'Message is required' });
  db.feedback.insert({
    id: uuid(), name: String(name).slice(0, 100) || 'Anonymous',
    type: String(type).slice(0, 40), message: String(message).slice(0, 5000),
    resolved: false, featured: false, created_at: Date.now(),
  });
  res.json({ success: true });
});

app.get('/api/feedback/featured', (req, res) => res.json({ items: db.feedback.featured() }));

app.get('/api/admin/feedback', requireAdmin, (req, res) => {
  const { search = '', resolved } = req.query;
  const opts = { search: search || undefined };
  if (resolved === '1') opts.resolved = true;
  if (resolved === '0') opts.resolved = false;
  res.json({ items: db.feedback.list(opts), stats: db.feedback.stats() });
});

app.patch('/api/admin/feedback/:id/resolve', requireAdmin, (req, res) => {
  const ok = db.feedback.update(req.params.id, { resolved: !!req.body.resolved });
  ok ? res.json({ success: true }) : res.status(404).json({ error: 'Not found' });
});

app.patch('/api/admin/feedback/:id/feature', requireAdmin, (req, res) => {
  const ok = db.feedback.update(req.params.id, { featured: !!req.body.featured });
  ok ? res.json({ success: true }) : res.status(404).json({ error: 'Not found' });
});

app.delete('/api/admin/feedback/:id', requireAdmin, (req, res) => {
  db.feedback.remove(req.params.id);
  res.json({ success: true });
});

app.get('/api/admin/feedback/export', requireAdmin, (req, res) => {
  const rows = db.feedback.list();
  const esc = s => `"${String(s).replace(/"/g, '""')}"`;
  const csv = ['Name,Type,Message,Status,Featured,Submitted']
    .concat(rows.map(r => [
      esc(r.name), esc(r.type), esc(r.message),
      r.resolved ? 'Resolved' : 'Pending', r.featured ? 'Yes' : 'No',
      esc(new Date(r.created_at).toLocaleString('en-IN')),
    ].join(','))).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="xiefiles_feedback.csv"');
  res.send(csv);
});

// ═════════════════════════════════════════════
//  MERGE PDF
// ═════════════════════════════════════════════
const mergeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 20 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') return cb(null, true);
    cb(Object.assign(new Error('Only PDF files can be merged'), { code: 'INVALID_TYPE' }));
  },
});

app.post('/api/merge-pdf', (req, res, next) => {
  mergeUpload.array('files', 20)(req, res, (err) => {
    if (err) {
      const code = err.code === 'INVALID_TYPE' ? 415 : err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(code).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    const files = req.files || [];
    if (files.length < 2) return res.status(400).json({ error: 'Upload at least 2 PDFs to merge' });

    let order = files.map((_, i) => i);
    if (req.body.order) {
      const parsed = String(req.body.order).split(',').map(n => parseInt(n, 10));
      if (parsed.length === files.length && parsed.every(n => n >= 0 && n < files.length)) order = parsed;
    }

    const merged = await PDFDocument.create();
    for (const idx of order) {
      const src = await PDFDocument.load(files[idx].buffer);
      const pages = await merged.copyPages(src, src.getPageIndices());
      pages.forEach(p => merged.addPage(p));
    }

    const bytes = await merged.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="merged.pdf"');
    res.send(Buffer.from(bytes));
  } catch (err) {
    console.error('Merge failed:', err.message);
    res.status(500).json({ error: 'Could not merge PDFs. Make sure all files are valid PDFs.' });
  }
});

// ─────────────────────────────────────────────
//  SOCKET.IO
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
// Every 15 min: delete unshared drafts older than 1 hour
cron.schedule('*/15 * * * *', () => {
  const cutoff = Date.now() - DRAFT_TTL_MS;
  const stale = db.list({ deleted: false }).filter(f => f.is_draft && f.uploaded_at <= cutoff);
  stale.forEach(f => {
    db.update(f.id, { deleted_at: Date.now() });
    const op = path.join(UPLOAD_DIR, f.stored_name);
    if (fs.existsSync(op)) fs.unlinkSync(op);
  });
  if (stale.length) console.log(`🧹  Removed ${stale.length} unshared draft(s)`);
});

// Every hour: soft-delete expired files
cron.schedule('0 * * * *', () => {
  const now = Date.now();
  db.list({ deleted: false }).filter(f => f.expires_at <= now).forEach(f => {
    db.update(f.id, { deleted_at: now });
    if (f.visibility === 'public') io.emit('file:removed', { id: f.id });
  });
});

// Every night at 3 AM: permanently purge old soft-deleted files
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
//  SPA FALLBACK
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
  console.log(`⏰  Expiry     →  ${EXPIRY_DAYS()} days · OTP 24h · drafts 1h`);
  console.log(`🔑  Admin pass →  ${ADMIN_PASS.slice(0,3)}***\n`);
});