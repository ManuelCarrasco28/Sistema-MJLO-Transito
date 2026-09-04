import { useState, useEffect } from 'react'
import { Icon } from '../ui/Icon'
import { Logo } from '../ui/Logo'

export function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [isShaking, setIsShaking] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Clear shake state after animation finishes
  useEffect(() => {
    if (isShaking) {
      const timer = setTimeout(() => setIsShaking(false), 500)
      return () => clearTimeout(timer)
    }
  }, [isShaking])

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!username.trim() || !password) {
      setError('Ingresa tu usuario y contraseña para continuar.')
      setIsShaking(true)
      return
    }

    setIsLoading(true)
    setError('')

    // Simulamos una petición de red de 1.5s
    setTimeout(() => {
      if (username.trim().toLowerCase() !== 'admin' || password !== 'admin123') {
        setError('El usuario o la contraseña son incorrectos.')
        setIsShaking(true)
        setIsLoading(false)
        return
      }
      setIsLoading(false)
      onLogin()
    }, 1500)
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 px-4 py-4 sm:px-6 sm:py-6">
      <div className="absolute inset-0 bg-linear-[135deg,#071a2f_0%,#0b3458_45%,#dcebf4_45%,#f1f6f9_100%]" aria-hidden="true" />
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] bg-size-[24px_24px]" aria-hidden="true" />

      <section className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/30 bg-white shadow-[0_24px_70px_rgba(7,26,47,0.22)] lg:grid-cols-[0.92fr_1.08fr]">
        <div className="relative hidden overflow-hidden bg-[#071a2f] p-8 text-white lg:flex lg:flex-col lg:justify-between xl:p-10">
          {/* Subtle gradient glow effects */}
          <div className="absolute -right-32 -top-32 size-80 rounded-full border border-cyan-300/20 bg-cyan-500/5 blur-3xl" aria-hidden="true" />
          <div className="absolute -left-20 -bottom-20 size-96 rounded-full border border-white/10 bg-blue-500/10 blur-3xl" aria-hidden="true" />

          <Logo />
          <div className="relative my-auto py-8 z-10">
            <p className="mb-4 inline-flex rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100 backdrop-blur-sm">
              Portal institucional interno
            </p>
            <h1 className="text-3xl font-black leading-tight tracking-tight xl:text-4xl">
              Gestión de Tránsito Municipal
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-300 xl:text-base">
              Herramientas operativas para el personal de Tránsito, Transporte y Seguridad Vial.
            </p>
          </div>
          <p className="relative z-10 text-xs text-cyan-200/50">MDJLO · Chiclayo, Perú</p>
        </div>

        <div className="p-6 sm:p-8 lg:p-9 xl:p-10 flex flex-col justify-center">
          <div className="mb-6 flex justify-center lg:hidden"><Logo /></div>
          <div className="mb-6 text-center lg:text-left">
            <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-cyan-700">Municipalidad Distrital de</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-[#071a2f] sm:text-3xl">José Leonardo Ortiz</h2>
            <p className="mt-1.5 text-sm sm:text-base text-slate-500">Sistema de Gestión de Tránsito Municipal</p>
          </div>

          <form onSubmit={handleSubmit} className={`space-y-4 ${isShaking ? 'animate-shake' : ''}`} noValidate>
            <label className="block">
              <span className="mb-1.5 block text-xs sm:text-sm font-bold text-slate-700">Usuario</span>
              <span className="flex h-11 sm:h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-slate-400 transition-colors focus-within:border-cyan-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-cyan-500/10 hover:border-slate-300 hover:bg-slate-100">
                <Icon name="user" />
                <input
                  value={username}
                  onChange={(event) => {
                    setUsername(event.target.value)
                    if (error) setError('')
                  }}
                  autoComplete="username"
                  placeholder="Ingresa tu usuario"
                  disabled={isLoading}
                  className="h-full min-w-0 flex-1 bg-transparent text-sm sm:text-base text-slate-800 outline-none placeholder:text-slate-400 disabled:opacity-50"
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs sm:text-sm font-bold text-slate-700">Contraseña</span>
              <span className="flex h-11 sm:h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-slate-400 transition-colors focus-within:border-cyan-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-cyan-500/10 hover:border-slate-300 hover:bg-slate-100">
                <Icon name="lock" />
                <input
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    if (error) setError('')
                  }}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Ingresa tu contraseña"
                  disabled={isLoading}
                  className="h-full min-w-0 flex-1 bg-transparent text-sm sm:text-base text-slate-800 outline-none placeholder:text-slate-400 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  disabled={isLoading}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="rounded-lg p-1 text-slate-400 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 disabled:opacity-50"
                >
                  <Icon name="eye" />
                </button>
              </span>
            </label>

            <div className="flex items-center justify-between text-xs sm:text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLoading}
                  className="size-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-600 cursor-pointer disabled:cursor-not-allowed"
                />
                <span className="font-medium text-slate-600 hover:text-slate-800 transition-colors">Recordar sesión</span>
              </label>

              <button type="button" className="font-bold text-cyan-700 hover:text-cyan-800 hover:underline transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600">
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {error && (
              <div role="alert" className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-red-700 shadow-xs animate-enter">
                <span className="grid size-4 shrink-0 place-items-center rounded-full bg-red-600 text-[11px] text-white shadow-xs font-bold leading-none">!</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="group relative flex h-11 sm:h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-[#0b3458] px-5 text-sm sm:text-base font-extrabold text-white shadow-[0_10px_24px_rgba(11,52,88,0.18)] transition-all hover:-translate-y-0.5 hover:bg-[#092a48] hover:shadow-[0_14px_28px_rgba(11,52,88,0.22)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 active:translate-y-0 disabled:opacity-80 disabled:pointer-events-none disabled:transform-none"
            >
              {isLoading ? (
                <>
                  <svg className="size-4 sm:size-5 animate-spin text-white/80" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Validando credenciales...</span>
                </>
              ) : (
                <>
                  <span>Iniciar sesión</span>
                  <Icon name="arrow" className="size-4 sm:size-5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          <p className="mt-5 sm:mt-6 text-center text-xs text-slate-400">© 2026 Municipalidad Distrital de José Leonardo Ortiz</p>
        </div>
      </section>
    </main>
  )
}
