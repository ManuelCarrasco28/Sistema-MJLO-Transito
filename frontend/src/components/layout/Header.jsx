import { Icon } from '../ui/Icon'

export function Header({
  onOpenMobile,
  sidebarHidden,
  onToggleSidebar,
  darkMode,
  setDarkMode,
  notifications,
  setNotifications,
  notifOpen,
  setNotifOpen,
  userMenuOpen,
  setUserMenuOpen,
  notifRef,
  userMenuRef,
  onLogout,
}) {
  const unreadCount = notifications.filter((item) => item.unread).length
  const currentDate = new Intl.DateTimeFormat('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  return (
    <header className="sticky top-0 z-30 flex h-18 items-center justify-between border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-[#0f172a]/95 px-4 shadow-xs backdrop-blur sm:px-6 xl:px-8 transition-colors">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobile}
          aria-label="Abrir menú"
          className="rounded-xl border border-slate-200 dark:border-slate-700 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 lg:hidden"
        >
          <Icon name="menu" />
        </button>
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={sidebarHidden ? 'Mostrar menú lateral' : 'Ocultar menú lateral'}
          className="hidden size-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-xs transition hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-[#1e293b] dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white lg:grid"
        >
          <Icon name="menu" className="size-5" />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <p className="truncate text-sm font-bold text-slate-700 dark:text-slate-200">
              Sistema de Gestión de Tránsito Municipal
            </p>
            <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 sm:inline-flex">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
              </span>
              En línea
            </span>
          </div>
          <p className="hidden truncate text-xs capitalize text-slate-400 dark:text-slate-500 sm:block">
            {currentDate}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => setDarkMode((prev) => !prev)}
          aria-label="Cambiar tema claro / oscuro"
          className="flex size-10 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1e293b] text-slate-500 dark:text-amber-400 shadow-xs transition hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800"
        >
          <Icon name={darkMode ? 'sun' : 'moon'} className="size-4.5" />
        </button>

        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => {
              setNotifOpen((prev) => !prev)
              setUserMenuOpen(false)
            }}
            aria-label="Notificaciones"
            className="relative flex size-10 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1e293b] text-slate-500 dark:text-slate-300 shadow-xs transition hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white"
          >
            <Icon name="bell" className="size-4.5" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 size-2.5 rounded-full border-2 border-white dark:border-[#1e293b] bg-orange-500" />
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2.5 z-50 w-80 sm:w-96 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] shadow-xl overflow-hidden animate-enter">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 py-3 bg-slate-50/70 dark:bg-slate-900/80">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white">Notificaciones</h4>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300">
                      {unreadCount} nuevas
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Marcar leídas
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.map((n) => {
                  const tones = {
                    rose: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400',
                    emerald: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
                    amber: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400',
                    blue: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400',
                  }
                  return (
                    <div
                      key={n.id}
                      onClick={() =>
                        setNotifications((prev) =>
                          prev.map((item) => (item.id === n.id ? { ...item, unread: false } : item))
                        )
                      }
                      className={`flex items-start gap-3.5 p-3.5 transition-colors cursor-pointer ${
                        n.unread
                          ? 'bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50/70 dark:hover:bg-blue-950/40'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${tones[n.tone]}`}>
                        <Icon name={n.icon} className="size-4.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{n.title}</p>
                          {n.unread && <span className="size-2 shrink-0 rounded-full bg-blue-600" />}
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-snug">
                          {n.description}
                        </p>
                        <p className="mt-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">{n.time}</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 p-2.5 text-center bg-slate-50/50 dark:bg-slate-900/60">
                <button
                  type="button"
                  onClick={() => setNotifOpen(false)}
                  className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition"
                >
                  Ver todas las notificaciones
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => {
              setUserMenuOpen((prev) => !prev)
              setNotifOpen(false)
            }}
            className="flex items-center gap-2.5 rounded-full p-1 transition hover:bg-slate-100/80 dark:hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            <span className="grid size-10 place-items-center rounded-full bg-[#1a73e8] text-xs font-bold text-white shadow-xs">
              MT
            </span>
            <span className="hidden text-sm font-semibold text-slate-700 dark:text-slate-200 sm:inline">
              Manuel Carrasco
            </span>
            <Icon name="chevronDown" className="size-4 text-slate-400" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 z-50 w-56 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] p-2 shadow-xl animate-enter">
              <div className="border-b border-slate-100 dark:border-slate-800 px-3 py-2.5">
                <p className="text-sm font-bold text-slate-800 dark:text-white">Manuel Carrasco</p>
                <p className="text-xs text-slate-400 truncate">manuelpe@mdjlo.gob.pe</p>
                <span className="mt-1.5 inline-block rounded-md bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300">
                  Administradora
                </span>
              </div>
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false)
                    onLogout()
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 transition hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <Icon name="logout" className="size-4" />
                  <span>Cerrar sesión</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
