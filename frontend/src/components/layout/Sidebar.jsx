import { useNavigate } from 'react-router-dom'
import { navigation } from '../../../public/js/navigation'
import { Icon } from '../ui/Icon'

export function Sidebar({ activeItem, mobileOpen, onClose, onLogout, hiddenOnDesktop }) {
  const navigate = useNavigate()

  const groups = [
    ['Principal', navigation.slice(0, 1)],
    ['Gestión', navigation.slice(1, 5)],
    ['Operaciones', navigation.slice(5, 9)],
    ['Control', navigation.slice(9)],
  ]

  // Función simple para generar ruta a partir del nombre
  const getRoute = (label) => {
    const formatStr = label.toLowerCase()
      .replace('í', 'i')
      .replace('ó', 'o')
    return `/${formatStr}`
  }

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
        className={`fixed inset-y-0 left-0 z-50 flex h-svh w-68 max-w-[86vw] flex-col overflow-hidden bg-[#0d1730] text-slate-200 shadow-2xl transition-transform duration-300 lg:relative lg:z-auto lg:w-full lg:max-w-none lg:translate-x-0 lg:shadow-[8px_0_24px_rgba(15,23,42,0.08)] ${
          hiddenOnDesktop ? 'lg:hidden' : ''
        } ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="relative flex shrink-0 flex-col items-center border-b border-white/10 bg-[#111d3a] px-4 pb-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
          >
            <Icon name="close" />
          </button>
          <div className="flex w-full max-w-52 items-center justify-center rounded-xl border border-white/20 bg-white px-3 py-1.5 shadow-[0_4px_14px_rgba(0,0,0,0.25)]">
            <img
              src="/img/logo-mjlo.png"
              alt="Municipalidad Distrital de José Leonardo Ortiz"
              className="h-10 w-auto max-w-full object-contain"
            />
          </div>
          <p className="mt-2 text-center text-xs font-black uppercase leading-tight tracking-wider text-white">
            TRÁNSITO MUNICIPAL
          </p>
        </div>

        <nav aria-label="Navegación principal" className="flex-1 px-3 py-3">
          {groups.map(([groupName, items]) => (
            <div key={groupName} className="mb-3 last:mb-0">
              <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">{groupName}</p>
              <div className="space-y-0.5">
                {items.map(([icon, label]) => {
                  const selected = activeItem === label
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        navigate(getRoute(label))
                        onClose()
                      }}
                      className={`group flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-left text-sm font-semibold transition-all duration-200 ${
                        selected
                          ? 'bg-[#1a73e8] text-white shadow-[0_6px_18px_rgba(26,115,232,0.35)]'
                          : 'text-slate-400 hover:translate-x-1 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Icon name={icon} className="size-4.5 shrink-0 transition-transform duration-200 group-hover:scale-110" />
                      <span className="flex-1 truncate">{label}</span>
                      {selected && <span className="size-1.5 shrink-0 rounded-full bg-cyan-300" />}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mx-3 mb-3 shrink-0 rounded-xl border border-white/10 bg-[#0b1328] p-2">
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-slate-400 transition hover:bg-red-500/15 hover:text-red-300"
          >
            <Icon name="logout" className="size-4.5 shrink-0" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  )
}
