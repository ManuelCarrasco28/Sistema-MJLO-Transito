import { useState, useEffect } from 'react'
import { apiFetch } from '../../config/api'

export function Login({ onLogin }) {
  const [username, setUsername] = useState(() => {
    return (typeof window !== 'undefined' && localStorage.getItem('remember_username')) || ''
  })
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(() => {
    return typeof window !== 'undefined' && Boolean(localStorage.getItem('remember_username'))
  })
  const [error, setError] = useState('')
  const [isShaking, setIsShaking] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showForgotModal, setShowForgotModal] = useState(false)

  useEffect(() => {
    if (isShaking) {
      const timer = setTimeout(() => setIsShaking(false), 500)
      return () => clearTimeout(timer)
    }
  }, [isShaking])

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!username.trim() || !password) {
      setError('Por favor, ingresa tu usuario y contraseña.')
      setIsShaking(true)
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await apiFetch('/login', {
        method: 'POST',
        body: {
          usuario: username.trim(),
          password,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        const message = data.messages?.error || data.messages || data.message || 'El usuario o la contraseña son incorrectos.'
        setError(Array.isArray(message) ? message.join(' ') : message)
        setIsShaking(true)
        return
      }

      if (rememberMe) {
        localStorage.setItem('remember_username', username.trim())
      } else {
        localStorage.removeItem('remember_username')
      }

      onLogin(data.data, rememberMe)
    } catch (err) {
      setError('No se pudo conectar con el servidor. Verifica tu conexión.')
      setIsShaking(true)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 overflow-hidden font-sans select-none">
      {/* Fotografía institucional del edificio municipal como fondo */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/img/fondo_login.jpg')" }}
      />

      {/* Overlay azul oscuro semitransparente: permite ver la fachada del edificio con total nitidez y sin distraer */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#081f38]/78 via-[#0b2a4e]/72 to-[#061729]/84 backdrop-blur-[1.5px]" />

      {/* Sutil halo radial de iluminación institucional en el centro */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(15,76,129,0.18)_0%,transparent_75%)] pointer-events-none" />

      {/* Tarjeta Central Elegante de Login */}
      <div 
        className={`relative z-10 w-full max-w-[420px] sm:max-w-[440px] bg-white/95 sm:bg-white/98 backdrop-blur-md rounded-2xl sm:rounded-3xl shadow-[0_20px_50px_rgba(0,18,46,0.38),0_1px_3px_rgba(0,0,0,0.06)] border border-white/80 p-7 sm:p-9 transition-all duration-300 ${
          isShaking ? 'animate-shake' : ''
        }`}
      >
        {/* Cabecera: Logo oficial, Título "Bienvenido", Subtítulo y Línea Decorativa */}
        <div className="flex flex-col items-center text-center">
          <img 
            src="/img/logo-mjlo.png" 
            alt="Municipalidad Distrital José Leonardo Ortiz" 
            className="h-16 sm:h-20 w-auto object-contain select-none pointer-events-none drop-shadow-xs" 
          />
          <h1 className="mt-3.5 text-2xl sm:text-[1.7rem] font-extrabold text-slate-800 tracking-tight">
            Bienvenido
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500">
            Acceso al Sistema de Gestión Municipal
          </p>
          {/* Pequeña línea decorativa institucional en azul */}
          <div className="w-12 h-1 bg-[#0f4c81] rounded-full mt-3 mb-6" />
        </div>

        {/* Formulario de Login */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* CAMPO: USUARIO */}
          <div className="group">
            <label 
              htmlFor="username-input" 
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Usuario
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 flex items-center justify-center text-slate-400 group-focus-within:text-[#0f4c81] transition-colors pointer-events-none">
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </span>
              <input 
                id="username-input"
                type="text" 
                value={username}
                onChange={(e) => { 
                  setUsername(e.target.value)
                  if (error) setError('')
                }}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-[#0f4c81] focus:ring-4 focus:ring-[#0f4c81]/15 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 transition-all outline-none"
                placeholder="Ingresa tu usuario"
                disabled={isLoading}
                autoComplete="username"
                autoFocus
              />
            </div>
          </div>

          {/* CAMPO: CONTRASEÑA */}
          <div className="group">
            <label 
              htmlFor="password-input" 
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Contraseña
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 flex items-center justify-center text-slate-400 group-focus-within:text-[#0f4c81] transition-colors pointer-events-none">
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </span>
              <input 
                id="password-input"
                type={showPassword ? 'text' : 'password'} 
                value={password}
                onChange={(e) => { 
                  setPassword(e.target.value)
                  if (error) setError('')
                }}
                className="w-full pl-11 pr-11 py-3 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-[#0f4c81] focus:ring-4 focus:ring-[#0f4c81]/15 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 transition-all outline-none"
                placeholder="Ingresa tu contraseña"
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-lg focus:outline-none transition-colors cursor-pointer"
                tabIndex={-1}
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? (
                  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* REMEMBER ME */}
          <div className="flex items-center text-xs text-slate-600 pt-0.5">
            <label className="flex items-center space-x-2 cursor-pointer select-none">
              <input 
                id="remember" 
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isLoading}
                className="w-4 h-4 text-[#0f4c81] border-slate-300 rounded focus:ring-[#0f4c81]/30 transition-colors disabled:opacity-50 cursor-pointer" 
              />
              <span className="font-medium text-slate-700">Recordar sesión</span>
            </label>
          </div>
          {error && (
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 shadow-xs">
              <svg className="size-4.5 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* BOTÓN PRINCIPAL: INICIAR SESIÓN */}
          <div className="pt-2">
            <button 
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-[#0f4c81] hover:bg-[#0c3e6b] active:bg-[#0a3359] text-white font-bold text-sm tracking-wider uppercase rounded-xl shadow-[0_10px_25px_-5px_rgba(15,76,129,0.35)] hover:shadow-[0_14px_28px_-5px_rgba(15,76,129,0.45)] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg className="size-4.5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Iniciando sesión...</span>
                </>
              ) : (
                'INICIAR SESIÓN'
              )}
            </button>
          </div>
          
          {/* ENLACE: ¿OLVIDASTE TU CONTRASEÑA? */}
          <div className="text-center pt-2">
            <button 
              type="button" 
              onClick={() => setShowForgotModal(true)}
              className="text-xs font-semibold text-slate-500 hover:text-[#0f4c81] hover:underline focus:outline-none cursor-pointer transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        </form>
      </div>

      {/* Modal institucional de Recuperación de Contraseña */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 text-center">
            <div className="size-12 mx-auto mb-3.5 rounded-full bg-blue-50 text-[#0f4c81] flex items-center justify-center">
              <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <h3 className="text-base font-black text-slate-800">
              Recuperación de Contraseña
            </h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Por políticas de seguridad institucional, comunícate con el área de TI / Subgerencia de Informática o el Administrador del Sistema para restablecer tus credenciales de acceso.
            </p>
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="mt-5 w-full py-2.5 px-4 bg-[#0f4c81] hover:bg-[#0c3e6b] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
