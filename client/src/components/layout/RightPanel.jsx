import { Activity, HardDrive, Printer, FileCheck2 } from 'lucide-react'
import { useFiles } from '../../context/FilesContext'
import { useSocket } from '../../context/SocketContext'
import FileIcon from '../files/FileIcon'
import { bytes, timeAgo } from '../../lib/format'

const STORAGE_CAP = 100 * 1024 * 1024 * 1024 // 100 GB display cap

function Stat({ icon: Icon, label, value, tint }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${tint}`}>
        <Icon size={17} />
      </div>
      <div className="min-w-0">
        <div className="text-lg font-bold leading-none tabular-nums">{value}</div>
        <div className="text-[11px] text-slate-400 mt-1">{label}</div>
      </div>
    </div>
  )
}

export default function RightPanel() {
  const { files, stats } = useFiles()
  const { liveUsers } = useSocket()
  const recent = files.slice(0, 5)
  const pct = Math.min(100, (stats.bytes / STORAGE_CAP) * 100)

  return (
    <aside className="hidden xl:flex flex-col w-72 shrink-0 border-l border-slate-200 dark:border-slate-800
                      bg-white/50 dark:bg-slate-900/30 p-4 gap-4 overflow-auto">
      {/* Quick stats */}
      <div className="card p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Quick Stats</h3>
        <div className="grid grid-cols-2 gap-4">
          <Stat icon={FileCheck2} label="Live files"   value={stats.count} tint="bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400" />
          <Stat icon={Printer}    label="Print ready"  value={stats.ready} tint="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
          <Stat icon={Activity}   label="Online now"   value={liveUsers}   tint="bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" />
          <Stat icon={HardDrive}  label="In use"       value={bytes(stats.bytes)} tint="bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
        </div>
      </div>

      {/* Storage bar */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Storage</h3>
          <span className="text-[11px] text-slate-400">{bytes(stats.bytes)} used</span>
        </div>
        <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all"
               style={{ width: Math.max(2, pct) + '%' }} />
        </div>
        <p className="text-[11px] text-slate-400 mt-2">Files auto-delete after 30 days</p>
      </div>

      {/* Recent activity */}
      <div className="card p-4 flex-1 min-h-0">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Recent Activity</h3>
        {recent.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">No uploads yet</p>
        ) : (
          <div className="flex flex-col gap-3">
            {recent.map(f => (
              <div key={f.id} className="flex items-center gap-2.5">
                <FileIcon mime={f.mime_type} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium truncate">{f.original_name}</p>
                  <p className="text-[11px] text-slate-400">{timeAgo(f.uploaded_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
