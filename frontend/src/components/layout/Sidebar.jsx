import { navigation } from '../../../public/js/navigation'
import { Icon } from '../ui/Icon'

export function Sidebar({ activeItem, onSelect, mobileOpen, onClose, onLogout }) {
  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#10162a] text-slate-200 shadow-2xl transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="relative flex flex-col items-center px-4 pt-5 pb-4 border-b border-white/10">
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
          >
            <Icon name="close" />
          </button>
          <div className="flex w-full max-w-53.75 items-center justify-center rounded-xl border border-white/20 bg-white px-3 py-2 shadow-[0_4px_14px_rgba(0,0,0,0.25)]">
            <img
              src="/img/logo-mjlo.png"
              alt="Municipalidad Distrital de José Leonardo Ortiz"
              className="h-11 w-auto max-w-full object-contain"
            />
          </div>
          <p className="mt-3 text-xs font-black uppercase tracking-wider text-white leading-tight text-center">
            TRÁNSITO MUNICIPAL
          </p>
        </div>

        <div className="px-4 pb-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Navegación</p>
        </div>

        <nav aria-label="Navegación principal" className="flex-1 space-y-0.5 overflow-y-auto no-scrollbar px-3 pb-4">
          {navigation.map(([icon, label]) => {
            const selected = activeItem === label
            return (
              <button
                key={label}
                type="button"
                onClick={() => {
                  onSelect(label)
                  onClose()
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-all duration-150 ${
                  selected
                    ? 'bg-[#1a73e8] text-white shadow-[0_4px_14px_rgba(26,115,232,0.35)]'
                    : 'text-slate-400 hover:bg-white/8 hover:text-white'
                }`}
              >
                <Icon name={icon} className="size-4.5 shrink-0" />
                <span className="flex-1 truncate">{label}</span>
                {selected && <span className="size-1.5 shrink-0 rounded-full bg-cyan-300" />}
              </button>
            )
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-400 transition hover:bg-red-500/15 hover:text-red-300"
          >
            <Icon name="logout" className="size-4.5 shrink-0" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  )
}
