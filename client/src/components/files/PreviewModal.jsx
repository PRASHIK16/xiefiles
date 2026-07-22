import { Printer, Download } from 'lucide-react'
import { Modal } from '../ui'
import { api } from '../../lib/api'
import { useToast } from '../../context/ToastContext'

export default function PreviewModal({ file, onClose }) {
  const toast = useToast()
  if (!file) return null

  const isImage = file.mime_type?.startsWith('image/')
  const url = api.pdfUrl(file.id, true)

  const print = () => {
    let frame = document.getElementById('xie-print-frame')
    if (!frame) {
      frame = document.createElement('iframe')
      frame.id = 'xie-print-frame'
      frame.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:0;height:0;border:0'
      document.body.appendChild(frame)
    }
    frame.src = url
    frame.onload = () => { try { frame.contentWindow.focus(); frame.contentWindow.print() } catch { window.open(url, '_blank') } }
    toast.info('Opening print dialog…')
  }

  return (
    <Modal open={!!file} onClose={onClose} title={file.original_name} wide
      actions={
        <>
          <button onClick={print} className="btn btn-primary text-xs px-3 py-1.5">
            <Printer size={14} /> <span className="hidden sm:inline">Print</span>
          </button>
          <button onClick={() => { window.location.href = api.downloadUrl(file.id) }}
            className="btn btn-ghost text-xs px-3 py-1.5">
            <Download size={14} /> <span className="hidden sm:inline">Download</span>
          </button>
        </>
      }>
      <div className="bg-slate-700 dark:bg-slate-950 h-[70vh] flex items-center justify-center">
        {isImage
          ? <img src={url} alt={file.original_name} className="max-w-full max-h-full object-contain" />
          : <iframe src={url} title="Preview" className="w-full h-full border-0" />}
      </div>
    </Modal>
  )
}
