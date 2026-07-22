export function bytes(b) {
  if (!b && b !== 0) return '—'
  if (b < 1024) return b + ' B'
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'
  if (b < 1073741824) return (b / 1048576).toFixed(1) + ' MB'
  return (b / 1073741824).toFixed(1) + ' GB'
}

export function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return Math.floor(s / 60) + 'm ago'
  if (s < 86400) return Math.floor(s / 3600) + 'h ago'
  return Math.floor(s / 86400) + 'd ago'
}

export function timeLeft(ts) {
  const ms = ts - Date.now()
  if (ms <= 0) return null
  const d = Math.floor(ms / 86400000)
  const h = Math.floor((ms % 86400000) / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

const MIME = {
  'application/pdf': 'PDF',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.ms-powerpoint': 'PPT',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
  'application/vnd.ms-excel': 'XLS',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'text/plain': 'TXT',
  'application/zip': 'ZIP', 'application/x-zip-compressed': 'ZIP',
  'application/x-rar-compressed': 'RAR',
}
export function mimeLabel(m) {
  if (!m) return 'FILE'
  if (m.startsWith('image/')) return m.split('/')[1].toUpperCase()
  return MIME[m] || m.split('/').pop().toUpperCase().slice(0, 5)
}

export function fileCategory(m) {
  if (m === 'application/pdf') return 'pdf'
  if (m?.includes('word')) return 'doc'
  if (m?.includes('presentation') || m?.includes('powerpoint')) return 'ppt'
  if (m?.includes('sheet') || m?.includes('excel')) return 'xls'
  if (m?.startsWith('image/')) return 'image'
  if (m === 'text/plain') return 'txt'
  if (m?.includes('zip') || m?.includes('rar')) return 'zip'
  return 'file'
}
