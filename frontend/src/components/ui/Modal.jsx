import { Icon } from './Icon'

export function Modal({ title, children, onClose, maxWidth = '' }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className={`w-full ${maxWidth} rounded-2xl bg-white shadow-2xl dark:bg-[var(--bg-surface)] border border-slate-100 dark:border-[var(--border)]`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 rounded-t-2xl dark:border-[var(--border)]">
          <h3 className="text-lg font-black text-slate-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-[var(--bg-subtle)] dark:hover:text-white cursor-pointer"><Icon name="close" /></button>
        </div>
        <div className="p-5 rounded-b-2xl">{children}</div>
      </div>
    </div>
  )
}
