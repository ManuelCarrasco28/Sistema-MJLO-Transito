import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { apiFetch } from '../../config/api'
import { errorPasswordUsuario } from '../../utils/passwordPolicy'
import { BotonCancelar, BotonCerrarModal, BotonGuardar } from '../ui/ModalControls'

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
  
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [profileForm, setProfileForm] = useState({
    password_actual: '',
    password_nuevo: '',
    password_confirmacion: '',
  })
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  const handleProfileSubmit = async (event) => {
    event.preventDefault()
    setProfileError('')
    setProfileSuccess('')

    const wantsPasswordChange = profileForm.password_actual || profileForm.password_nuevo || profileForm.password_confirmacion

    if (wantsPasswordChange) {
      if (!profileForm.password_actual || !profileForm.password_nuevo || !profileForm.password_confirmacion) {
        setProfileError('Completa la contraseña actual, nueva contraseña y confirmación.')
        return
      }
      const errorPassword = errorPasswordUsuario(profileForm.password_nuevo, user?.usuario || user?.nombre_usuario || '')
      if (errorPassword) {
        setProfileError(errorPassword)
        return
      }
      if (profileForm.password_nuevo !== profileForm.password_confirmacion) {
        setProfileError('La nueva contraseña y confirmación no coinciden.')
        return
      }
      if (!user?.id) {
        setProfileError('No se encontró el ID del usuario.')
        return
      }
    }

    setSavingProfile(true)
    try {
      if (wantsPasswordChange) {
        const response = await apiFetch('/perfil/password', {
          method: 'POST',
          body: {
            id_usuario: user.id,
            password_actual: profileForm.password_actual,
            password_nuevo: profileForm.password_nuevo,
          },
        })

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          const message = data.messages?.error || data.messages || data.message || 'Error al cambiar contraseña.'
          setProfileError(Array.isArray(message) ? message.join(' ') : message)
          return
        }
      }
      setProfileSuccess('Contraseña actualizada correctamente.')
      setProfileForm({
        password_actual: '',
        password_nuevo: '',
        password_confirmacion: '',
      })
    } finally {
      setSavingProfile(false)
    }
  }

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
  const navigate = useNavigate()
  const [notifFiltro, setNotifFiltro] = useState('TODAS')
  const hayReportes = notifications.some((n) => n.categoria === 'reportes')
  const CATEGORIAS_NOTIF = [
    { id: 'TODAS', label: 'Todas' },
    { id: 'permisos', label: 'Permisos' },
    ...(hayReportes ? [{ id: 'reportes', label: 'Reportes' }] : []),
    { id: 'internamientos', label: 'Depósito' },
    { id: 'papeletas', label: 'Papeletas' },
  ]
  const notifVisibles = notifFiltro === 'TODAS' ? notifications : notifications.filter((n) => n.categoria === notifFiltro)
  const contarNotif = (id) => (id === 'TODAS' ? notifications : notifications.filter((n) => n.categoria === id)).length

  // Las leídas se recuerdan para que el sondeo periódico no las vuelva a marcar como nuevas
  const recordarLeidas = (ids) => {
    try {
      const actuales = JSON.parse(localStorage.getItem('notif_leidas') || '[]')
      localStorage.setItem('notif_leidas', JSON.stringify([...new Set([...actuales, ...ids])].slice(-500)))
    } catch { /* sin almacenamiento */ }
  }
  const userFullName = [user?.nombres, user?.apellidos].filter(Boolean).join(' ') || 'Usuario'
  const userInitials = [user?.nombres, user?.apellidos]
    .filter(Boolean)
    .map((value) => value.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'US'
  const userEmail = user?.usuario ? `${user.usuario}@mdjlo.gob.pe` : 'usuario@mdjlo.gob.pe'
  const userRole = user?.cargo || user?.rol || 'Trabajador municipal'
  const avatarImage = user?.foto_img || ''

  return (
    <header className="flex items-center justify-between gap-3 mt-2 mb-0.5 px-3.5 sm:px-5 lg:px-6" data-purpose="horizon-topbar">
      {/* Left side: Mobile trigger */}
      <div className="flex items-center lg:hidden">
        <button
          type="button"
          onClick={onOpenMobile}
          className="p-1.5 rounded-xl bg-white dark:bg-[#1C2438] text-[#2B3674] dark:text-white shadow-xs border border-[#E9EDF7] dark:border-white/10 cursor-pointer"
        >
          <Icon name="menu" className="size-5" />
        </button>
      </div>
      
      {/* Right Horizon Floating Search & Control Capsule */}
      <div className="ml-auto flex items-center gap-2 bg-white dark:bg-[#1C2438] px-2.5 py-1.5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-white/10 shrink-0">

        {/* Date and Time Pill */}
        <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-xl border border-slate-200/60 dark:border-white/10 bg-slate-50/70 dark:bg-white/5">
          <Icon name="calendar" className="size-3.5 text-slate-400 dark:text-white/60" />
          <span className="text-[11.5px] font-semibold text-slate-600 dark:text-white/70">{currentDate}</span>
          <div className="w-[1px] h-3 bg-slate-200 dark:bg-white/10 mx-0.5"></div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#01B574]"></span>
            <div className="px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-[#5B6EE1]/20">
              <span className="text-[10px] font-bold text-[#5B6EE1] dark:text-blue-300 tracking-wide tabular-nums">{currentTime}</span>
            </div>
          </div>
        </div>

        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button 
            className={`relative size-8 grid place-items-center rounded-xl transition-colors cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 ${unreadCount > 0 ? 'text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300' : 'text-slate-400 dark:text-white/70 hover:text-slate-700 dark:hover:text-white'}`} 
            title="Notificaciones"
            onClick={() => {
              setNotifOpen(!notifOpen)
              setUserMenuOpen(false)
            }}
          >
            <svg className={`size-4.5 ${unreadCount > 0 ? 'campana-alerta fill-amber-400 stroke-slate-900 dark:fill-amber-400 dark:stroke-amber-400' : ''}`} fill={unreadCount > 0 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center z-10">
                <span className="absolute inset-0 animate-ping rounded-full bg-[#EE5D50]/60" />
                <span className="relative inline-flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[#EE5D50] px-[4px] text-[9px] font-black leading-none text-white shadow-2xs">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              </span>
            )}
          </button>
          
          {notifOpen && (
            <div className="absolute right-0 top-full z-50 mt-2.5 w-[26rem] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl animate-enter dark:border-[var(--border-strong)] dark:bg-[#1C2438]">
              <div className="flex items-center justify-between px-4 pb-2 pt-3.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-extrabold text-slate-800 dark:text-white">Notificaciones</h4>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                      {unreadCount} nuevas
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      recordarLeidas(notifications.map((n) => n.id))
                      setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))
                    }}
                    className="cursor-pointer text-[11px] font-bold text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Marcar leídas
                  </button>
                )}
              </div>

              <div className={`grid ${hayReportes ? 'grid-cols-5' : 'grid-cols-4'} gap-1 border-b border-slate-100 px-3 pb-2 dark:border-[var(--border)]`}>
                {CATEGORIAS_NOTIF.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setNotifFiltro(c.id)}
                    className={`flex min-w-0 cursor-pointer items-center justify-center gap-1 rounded-lg px-1.5 py-1 text-[11px] font-bold transition ${notifFiltro === c.id
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10'}`}
                  >
                    <span className="truncate">{c.label}</span>
                    <span className={`shrink-0 text-[10px] ${notifFiltro === c.id ? 'opacity-70' : 'text-slate-400'}`}>{contarNotif(c.id)}</span>
                  </button>
                ))}
              </div>

              <div className="custom-scrollbar max-h-[22rem] overflow-y-auto">
                {notifVisibles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                    <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-slate-50 dark:bg-white/5">
                      <Icon name="bell" className="size-5 text-slate-400 dark:text-slate-500" />
                    </div>
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Sin notificaciones</p>
                    <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">Te avisaremos cuando haya novedades.</p>
                  </div>
                ) : (
                  notifVisibles.map((n) => {
                    const tones = {
                      rose: 'bg-rose-50 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300',
                      emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300',
                      amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300',
                      blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300',
                    }
                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => {
                          recordarLeidas([n.id])
                          setNotifications((prev) => prev.map((item) => (item.id === n.id ? { ...item, unread: false } : item)))
                          setNotifOpen(false)
                          if (n.link) navigate(n.link)
                        }}
                        className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
                      >
                        <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${tones[n.tone] || tones.blue}`}>
                          <Icon name={n.icon} className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate text-xs text-slate-800 dark:text-white ${n.unread ? 'font-extrabold' : 'font-semibold'}`}>{n.title}</span>
                          <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">{n.description}</span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-1">
                          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">{n.time}</span>
                          {n.unread && <span className="size-1.5 rounded-full bg-blue-600" />}
                        </span>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Dark Mode Toggle Button */}
        <button 
          className="size-8 grid place-items-center rounded-xl text-slate-400 dark:text-white/70 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer" 
          title="Modo Claro/Oscuro"
          onClick={() => setDarkMode(!darkMode)}
        >
          {darkMode ? (
            <Icon name="sun" className="size-4.5 text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.55)]" />
          ) : (
            <svg className="size-4.5 fill-indigo-200 stroke-indigo-600" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
          )}
        </button>

        <div className="w-[1px] h-4.5 bg-slate-200 dark:bg-white/10 mx-0.5"></div>

        {/* User Profile Pill */}
        <div className="relative" ref={userMenuRef}>
          <div 
            className="flex items-center gap-2 pl-0.5 pr-1 cursor-pointer select-none"
            onClick={() => {
              setUserMenuOpen(!userMenuOpen)
              setNotifOpen(false)
            }}
          >
            <div className="relative">
              {avatarImage ? (
                <img src={avatarImage} alt={userFullName} className="size-7.5 rounded-full object-cover shadow-2xs ring-1.5 ring-white dark:ring-[#1C2438]" />
              ) : (
                <div className="size-7.5 rounded-full bg-gradient-to-tr from-[#5B6EE1] to-[#6CB8E8] flex items-center justify-center font-extrabold text-white text-[11px] shadow-2xs">
                  {userInitials}
                </div>
              )}
              <span className="size-2 bg-[#01B574] rounded-full border border-white dark:border-[#1C2438] absolute -bottom-0.5 -right-0.5"></span>
            </div>
            <div className="hidden xl:block text-left leading-tight">
              <h4 className="text-[11.5px] font-bold text-slate-800 dark:text-white">{userFullName}</h4>
              <p className="text-[9px] font-semibold text-slate-400 dark:text-white/60 uppercase tracking-tight">{userRole}</p>
            </div>
          </div>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-3 z-50 w-56 rounded-2xl border border-slate-200 dark:border-[var(--border-strong)] bg-white dark:bg-[#1C2438] p-2 shadow-[0_20px_45px_rgba(112,144,176,0.20)] dark:shadow-none animate-enter">
              <div className="border-b border-slate-100 dark:border-[var(--border-strong)] px-3 py-2.5">
                <p className="text-sm font-bold text-slate-800 dark:text-white">{userFullName}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{userEmail}</p>
                <span className="mt-1.5 inline-block rounded-md bg-blue-50 dark:bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-[#5B6EE1] dark:text-blue-300">
                  {userRole}
                </span>
              </div>
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false)
                    setProfileModalOpen(true)
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-[#2B3674] dark:text-blue-200 transition hover:bg-blue-50 dark:hover:bg-blue-500/20 cursor-pointer"
                >
                  <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125 16.875 4.5M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                  </svg>
                  <span>Editar perfil</span>
                </button>
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

      {profileModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleProfileSubmit}
            className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-[var(--border-strong)] dark:bg-[#1C2438]"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-[var(--border-strong)]">
              <div>
                <h3 className="text-lg font-black text-[#2B3674] dark:text-white">Editar perfil</h3>
                <p className="text-xs font-semibold text-slate-400">Tu foto viene del registro de ciudadano. Aquí solo puedes cambiar tu contraseña.</p>
              </div>
              <BotonCerrarModal onClick={() => setProfileModalOpen(false)} />
            </div>

            <div className="space-y-4 p-5">
              <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-[var(--border-strong)] dark:bg-[#1C2438]">
                {avatarImage ? (
                  <img src={avatarImage} alt="Foto de perfil" className="h-16 w-16 rounded-2xl object-cover shadow-sm" />
                ) : (
                  <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-tr from-[#5B6EE1] to-[#6CB8E8] text-lg font-black text-white">
                    {userInitials}
                  </div>
                )}
                <div>
                  <p className="text-sm font-black text-slate-700 dark:text-slate-100">Foto del ciudadano</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 dark:border-[var(--border-strong)]">
                <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-300">Cambiar contraseña</p>
                <div className="space-y-3">
                  <input
                    type="password"
                    value={profileForm.password_actual}
                    onChange={(event) => setProfileForm((prev) => ({ ...prev, password_actual: event.target.value }))}
                    placeholder="Contraseña actual"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#5B6EE1] focus:ring-2 focus:ring-[#5B6EE1]/10 dark:border-[var(--border-strong)] dark:bg-[#1C2438] dark:text-white"
                  />
                  <input
                    type="password"
                    value={profileForm.password_nuevo}
                    onChange={(event) => setProfileForm((prev) => ({ ...prev, password_nuevo: event.target.value }))}
                    placeholder="Nueva contraseña"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#5B6EE1] focus:ring-2 focus:ring-[#5B6EE1]/10 dark:border-[var(--border-strong)] dark:bg-[#1C2438] dark:text-white"
                  />
                  <input
                    type="password"
                    value={profileForm.password_confirmacion}
                    onChange={(event) => setProfileForm((prev) => ({ ...prev, password_confirmacion: event.target.value }))}
                    placeholder="Confirmar nueva contraseña"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#5B6EE1] focus:ring-2 focus:ring-[#5B6EE1]/10 dark:border-[var(--border-strong)] dark:bg-[#1C2438] dark:text-white"
                  />
                </div>
              </div>

              {profileError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                  {profileError}
                </div>
              )}

              {profileSuccess && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                  {profileSuccess}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4 dark:border-[var(--border-strong)]">
              <BotonCancelar onClick={() => setProfileModalOpen(false)} />
              <BotonGuardar disabled={savingProfile}>
                {savingProfile ? 'Guardando...' : 'Guardar cambios'}
              </BotonGuardar>
            </div>
          </form>
        </div>
      )}
    </header>
  )
}
