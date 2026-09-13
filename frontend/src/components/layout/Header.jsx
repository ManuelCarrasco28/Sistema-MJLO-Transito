import { useState, useEffect } from 'react'
import { Icon } from '../ui/Icon'
import { useLocation } from 'react-router-dom'

export function Header({
  onOpenMobile,
  sidebarCollapsed,
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
    }).format(d)
    
  const [currentTime, setCurrentTime] = useState(() => formatTime(new Date()))
  
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(formatTime(new Date())), 1000)
    return () => clearInterval(id)
  }, [])

  const unreadCount = notifications.filter((item) => item.unread).length
  const userFullName = [user?.nombres, user?.apellidos].filter(Boolean).join(' ') || 'Usuario'
  const userInitials = [user?.nombres, user?.apellidos]
    .filter(Boolean)
    .map((value) => value.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'US'
  const userEmail = user?.usuario ? `${user.usuario}@mdjlo.gob.pe` : 'usuario@mdjlo.gob.pe'
  const userRole = user?.cargo || 'Trabajador municipal'

  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6 px-4 sm:px-6 lg:px-8" data-purpose="horizon-topbar">
      {/* Mobile Menu Button - Added for functionality */}
      <div className="flex items-center gap-3 lg:hidden mb-2 md:mb-0">
        <button
          type="button"
          onClick={onOpenMobile}
          className="p-2 rounded-xl bg-white text-[#2B3674] shadow-sm border border-[#E9EDF7]"
        >
          <Icon name="menu" className="size-5" />
        </button>
      </div>

      <div className="flex items-center gap-4">
        {/* Desktop Sidebar Toggle */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="hidden lg:flex p-2.5 rounded-[15px] bg-white dark:bg-[#111C44] text-[#2B3674] dark:text-white shadow-[0px_18px_40px_rgba(112,144,176,0.12)] dark:shadow-none border border-white/60 dark:border-none hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
        >
          <Icon name="menu" className="size-5" />
        </button>
      </div>
      
      {/* Right Horizon Floating Search & Control Capsule */}
      <div className="flex flex-wrap md:flex-nowrap items-center gap-3 bg-white dark:bg-[#111C44] p-2 sm:p-2.5 rounded-[30px] shadow-[0px_18px_40px_rgba(112,144,176,0.12)] dark:shadow-none border border-white/60 dark:border-none">

        {/* Date and Time Pill */}
        <div className="hidden xl:flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-slate-200/60 dark:border-white/10 bg-white/50 dark:bg-white/5">
          <Icon name="calendar" className="size-4 text-slate-400 dark:text-white/60" />
          <span className="text-xs font-semibold text-slate-500 dark:text-white/70">{currentDate}</span>
          <div className="w-[1px] h-3.5 bg-slate-200 dark:bg-white/10 mx-1"></div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#01B574]"></span>
            <div className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-[#4318FF]/20">
              <span className="text-[11px] font-bold text-[#4318FF] dark:text-blue-300 tracking-wide tabular-nums">{currentTime}</span>
            </div>
          </div>
        </div>

        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button 
            className="relative p-2.5 rounded-full text-[#A3AED0] dark:text-white/70 hover:text-[#2B3674] dark:hover:text-white hover:bg-[#F4F7FE] dark:hover:bg-white/10 transition-colors cursor-pointer" 
            title="Notificaciones"
            onClick={() => {
              setNotifOpen(!notifOpen)
              setUserMenuOpen(false)
            }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
            {unreadCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#EE5D50]"></span>}
          </button>
          
          {notifOpen && (
            <div className="absolute right-0 top-full mt-2.5 z-50 w-80 sm:w-96 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111C44] shadow-xl overflow-hidden animate-enter">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 px-4 py-3 bg-slate-50/70 dark:bg-[#0B1437]/50">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white">Notificaciones</h4>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-blue-50 dark:bg-blue-500/20 border border-blue-200/60 dark:border-blue-500/30 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300">
                      {unreadCount} nuevas
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Marcar leídas
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                {notifications.map((n) => {
                  const tones = {
                    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300',
                    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300',
                    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300',
                    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300',
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
                          ? 'bg-blue-50/40 hover:bg-blue-50/70'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${tones[n.tone]}`}>
                        <Icon name={n.icon} className="size-4.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold text-slate-800 truncate">{n.title}</p>
                          {n.unread && <span className="size-2 shrink-0 rounded-full bg-blue-600" />}
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-2 leading-snug">
                          {n.description}
                        </p>
                        <p className="mt-1 text-[10px] font-medium text-slate-400">{n.time}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Dark Mode Toggle Button */}
        <button 
          className="p-2.5 rounded-full text-[#A3AED0] dark:text-white/70 hover:text-[#2B3674] dark:hover:text-white hover:bg-[#F4F7FE] dark:hover:bg-white/10 transition-colors cursor-pointer" 
          title="Modo Claro/Oscuro"
          onClick={() => setDarkMode(!darkMode)}
        >
          {darkMode ? (
            <Icon name="sun" className="size-5" />
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
          )}
        </button>

        {/* Info icon */}
        <button className="p-2.5 rounded-full text-[#A3AED0] dark:text-white/70 hover:text-[#2B3674] dark:hover:text-white hover:bg-[#F4F7FE] dark:hover:bg-white/10 transition-colors hidden sm:block cursor-pointer" title="Información MDJLO">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" strokeLinecap="round" strokeLinejoin="round"></path>
          </svg>
        </button>

        {/* User Profile Pill */}
        <div className="relative" ref={userMenuRef}>
          <div 
            className="flex items-center gap-2.5 pl-1 pr-2 cursor-pointer"
            onClick={() => {
              setUserMenuOpen(!userMenuOpen)
              setNotifOpen(false)
            }}
          >
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#4318FF] to-[#39B8FF] flex items-center justify-center font-extrabold text-white text-xs shadow-sm">
                {userInitials}
              </div>
              <span className="w-2.5 h-2.5 bg-[#01B574] rounded-full border-2 border-white dark:border-[#111C44] absolute bottom-0 right-0"></span>
            </div>
            <div className="hidden xl:block text-left leading-tight">
              <h4 className="text-xs font-bold text-[#2B3674] dark:text-white">{userFullName}</h4>
              <p className="text-[10px] font-semibold text-[#A3AED0] dark:text-white/60">{userRole}</p>
            </div>
          </div>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-3 z-50 w-56 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111C44] p-2 shadow-[0_20px_45px_rgba(112,144,176,0.20)] dark:shadow-none animate-enter">
              <div className="border-b border-slate-100 dark:border-slate-700 px-3 py-2.5">
                <p className="text-sm font-bold text-slate-800 dark:text-white">{userFullName}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{userEmail}</p>
                <span className="mt-1.5 inline-block rounded-md bg-blue-50 dark:bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-[#4318FF] dark:text-blue-300">
                  {userRole}
                </span>
              </div>
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false)
                    onLogout()
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 transition hover:bg-red-50 dark:hover:bg-red-500/20 cursor-pointer"
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
