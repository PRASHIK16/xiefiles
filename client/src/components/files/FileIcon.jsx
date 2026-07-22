import { FileText, FileImage, FileSpreadsheet, Presentation, FileArchive, FileType, File } from 'lucide-react'
import { fileCategory } from '../../lib/format'

const MAP = {
  pdf:   { Icon: FileText,        cls: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
  doc:   { Icon: FileType,        cls: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
  ppt:   { Icon: Presentation,    cls: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' },
  xls:   { Icon: FileSpreadsheet, cls: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
  image: { Icon: FileImage,       cls: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' },
  txt:   { Icon: FileText,        cls: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' },
  zip:   { Icon: FileArchive,     cls: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
  file:  { Icon: File,            cls: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' },
}

export default function FileIcon({ mime, size = 'md' }) {
  const { Icon, cls } = MAP[fileCategory(mime)] || MAP.file
  const dim = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10'
  const isz = size === 'sm' ? 16 : 19
  return (
    <div className={`${dim} ${cls} rounded-lg flex items-center justify-center shrink-0`}>
      <Icon size={isz} />
    </div>
  )
}
