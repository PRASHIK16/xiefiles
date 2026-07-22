import { Github, Mail, Heart } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 mt-8 px-5 py-6
                       flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
      <div>
        <p className="text-sm font-semibold">
          Designed &amp; Developed by <span className="text-brand-600 dark:text-brand-400">Prashik Dongre</span>
        </p>
        <p className="text-xs text-slate-400 mt-0.5">
          Department of Information Technology · Xavier Institute of Engineering
        </p>
      </div>

      <div className="flex items-center gap-4">
        <a href="#" className="text-slate-400 hover:text-brand-500 transition-colors" aria-label="GitHub"><Github size={18} /></a>
        <a href="#" className="text-slate-400 hover:text-brand-500 transition-colors" aria-label="Contact"><Mail size={18} /></a>
        <div className="text-xs text-slate-400 pl-4 border-l border-slate-200 dark:border-slate-800">
          <div>v1.0.0 · Updated Jul 2026</div>
          <div className="flex items-center gap-1 justify-center md:justify-start mt-0.5">
            Made with <Heart size={11} className="text-red-500 fill-red-500" /> for XIE Students
          </div>
        </div>
      </div>
    </footer>
  )
}
