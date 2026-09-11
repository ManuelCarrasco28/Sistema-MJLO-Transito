import { useState, useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { navigationGroups } from '../../config/navigation'

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
  user,
}) {
  const location = useLocation()

  const unreadCount = notifications.filter((item) => item.unread).length
  const userFullName = [user?.nombres, user?.apellidos].filter(Boolean).join(' ') || 'Usuario'
  const userInitials = [user?.nombres, user?.apellidos]
    .filter(Boolean)
    .map((value) => value.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'US'
  const usernameLabel = user?.usuario ? `@${user.usuario}` : 'Usuario municipal'
  const userRole = user?.cargo || 'Operador de Tránsito'

  const allNavItems = useMemo(() => {
    return navigationGroups.flatMap((group) =>
      group.items.map((item) => ({
        ...item,
        groupName: group.name,
      }))
    )
  }, [])

  const currentNav = allNavItems.find((item) => item.path === location.pathname) || {
    label: 'Dashboard',
    groupName: 'Principal',
    icon: 'dashboard',
    path: '/dashboard',
  }

  const rawDate = new Intl.DateTimeFormat('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Lima',
  }).format(new Date())
  const currentDate = rawDate.charAt(0).toUpperCase() + rawDate.slice(1)

  const formatTime = (d) =>
    new Intl.DateTimeFormat('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZone: 'America/Lima',
    }).format(d).toUpperCase()

  const [currentTime, setCurrentTime] = useState(() => formatTime(new Date()))

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(formatTime(new Date())), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-[#0f172a]/95 px-4 sm:px-6 shadow-xs backdrop-blur-md transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobile}
          aria-label="Abrir menú"
          className="grid size-9 place-items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition lg:hidden shrink-0"
        >
          <Icon name="menu" className="size-4.5" />
        </button>

        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={sidebarHidden ? 'Mostrar menú lateral' : 'Ocultar menú lateral'}
          className={`hidden size-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-2xs transition hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white ${
            sidebarHidden ? 'lg:hidden' : 'lg:grid'
          }`}
        >
          <Icon name="menu" className="size-4.5" />
        </button>

        <span className="hidden sm:block h-6 w-px bg-slate-200/80 dark:bg-slate-700/80 shrink-0" />

        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60 shadow-2xs">
            <Icon name={currentNav.icon} className="size-4.5" />
          </span>
          <div className="min-w-0 flex flex-col justify-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 leading-tight">
              {currentNav.groupName === 'Principal' ? 'MDJLO · Tránsito Municipal' : currentNav.groupName}
            </span>
            <h1 className="text-sm font-bold text-slate-800 dark:text-white leading-tight">
              {currentNav.label}
            </h1>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        <div className="hidden md:flex items-center gap-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/50 px-3 py-1.5 text-xs shadow-2xs whitespace-nowrap">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
            <Icon name="calendar" className="size-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
            <span>{currentDate}</span>
          </div>
          <span className="h-3.5 w-px bg-slate-200 dark:bg-slate-700 shrink-0" />
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="relative flex size-1.5 shrink-0">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
            </span>
            <span className="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-500/15 px-2 py-0.5 font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400 ring-1 ring-blue-200/60 dark:ring-blue-500/30 tabular-nums whitespace-nowrap">
              {currentTime}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDarkMode((prev) => !prev)}
          aria-label="Cambiar tema claro / oscuro"
          className="grid size-9 place-items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-amber-400 shadow-2xs transition hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 shrink-0"
        >
          <Icon name={darkMode ? 'sun' : 'moon'} className="size-4" />
        </button>

        <div className="relative shrink-0" ref={notifRef}>
          <button
            type="button"
            onClick={() => {
              setNotifOpen((prev) => !prev)
              setUserMenuOpen(false)
            }}
            aria-label="Notificaciones"
            className="relative grid size-9 place-items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 shadow-2xs transition hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white"
          >
            <Icon name="bell" className="size-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-orange-500 text-[9px] font-bold text-white ring-2 ring-white dark:ring-[#0f172a]">
                {unreadCount}
              </span>
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
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="relative shrink-0" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => {
              setUserMenuOpen((prev) => !prev)
              setNotifOpen(false)
            }}
            className="flex items-center gap-2.5 rounded-full p-1 pr-2.5 transition hover:bg-slate-100/80 dark:hover:bg-slate-800"
          >
            <span className="grid size-9 place-items-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-xs">
              {userInitials}
            </span>
            <span className="hidden sm:inline text-sm font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
              {userFullName}
            </span>
            <Icon name="chevronDown" className="size-4 text-slate-400 shrink-0 hidden sm:block" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2.5 z-50 w-72 sm:w-80 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] p-3.5 shadow-xl animate-enter">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-xs">
                    {userInitials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800 dark:text-white leading-snug">
                      {userFullName}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {usernameLabel}
                    </p>
                  </div>
                </div>

                <div className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 p-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Cargo institucional
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
                    {userRole}
                  </p>
                </div>
              </div>

              <div className="pt-2">
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
