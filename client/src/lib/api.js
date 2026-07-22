// ── Fetch wrapper ────────────────────────────────────────────────
async function req(url, opts = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

export const api = {
  // Files
  listFiles:     ()            => req('/api/files'),
  deleteFile:    (id, token)   => req(`/api/files/${id}`, { method: 'DELETE', body: { token } }),
  downloadUrl:   (id)          => `/api/files/${id}/download`,
  pdfUrl:        (id, inline)  => `/api/files/${id}/pdf${inline ? '?inline=1' : ''}`,

  // Notes
  listNotes:     ()            => req('/api/notes'),
  createNote:    (body)        => req('/api/notes', { method: 'POST', body }),
  updateNote:    (id, body)    => req(`/api/notes/${id}`, { method: 'PATCH', body }),
  deleteNote:    (id, token)   => req(`/api/notes/${id}`, { method: 'DELETE', body: { token } }),

  // Feedback
  submitFeedback:(body)        => req('/api/feedback', { method: 'POST', body }),
}

// ── Uploader-token store (localStorage) ──────────────────────────
const TFILE = 'xie_file_tokens', TNOTE = 'xie_note_tokens'
const read  = k => { try { return JSON.parse(localStorage.getItem(k) || '{}') } catch { return {} } }
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v))

export const tokens = {
  fileGet:  id => read(TFILE)[id] || null,
  fileSet:  (id, t) => { const s = read(TFILE); s[id] = t; write(TFILE, s) },
  fileDel:  id => { const s = read(TFILE); delete s[id]; write(TFILE, s) },
  noteGet:  id => read(TNOTE)[id] || null,
  noteSet:  (id, t) => { const s = read(TNOTE); s[id] = t; write(TNOTE, s) },
  noteDel:  id => { const s = read(TNOTE); delete s[id]; write(TNOTE, s) },
}
