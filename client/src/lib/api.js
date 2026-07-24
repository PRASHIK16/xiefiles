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

  // Private sharing
  getShared:     (slug)              => req(`/api/share/${slug}`),
  shareDownloadUrl: (id, slug)       => `/api/files/${id}/download?slug=${encodeURIComponent(slug)}`,
  sharePdfUrl:   (id, slug, inline)  => `/api/files/${id}/pdf?slug=${encodeURIComponent(slug)}${inline ? '&inline=1' : ''}`,
  buildShareLink:(slug)              => `${window.location.origin}/f/${slug}`,

  // Notes
  listNotes:     ()            => req('/api/notes'),
  createNote:    (body)        => req('/api/notes', { method: 'POST', body }),
  updateNote:    (id, body)    => req(`/api/notes/${id}`, { method: 'PATCH', body }),
  deleteNote:    (id, token)   => req(`/api/notes/${id}`, { method: 'DELETE', body: { token } }),

  // Feedback
  submitFeedback:(body)        => req('/api/feedback', { method: 'POST', body }),
}

// ── Uploader-token store (localStorage) ──────────────────────────
const TFILE = 'xie_file_tokens', TNOTE = 'xie_note_tokens', TPRIV = 'xie_private_links'
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

// ── Private links store (localStorage) ───────────────────────────
// Keyed by slug. Value: { slug, id, name, size, mime, at }
export const privateLinks = {
  all() {
    const obj = read(TPRIV)
    return Object.values(obj).sort((a, b) => b.at - a.at)
  },
  add(entry) {
    const s = read(TPRIV)
    s[entry.slug] = entry
    write(TPRIV, s)
  },
  remove(slug) {
    const s = read(TPRIV)
    delete s[slug]
    write(TPRIV, s)
  },
}
