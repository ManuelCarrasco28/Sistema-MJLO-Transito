import { useState, useEffect } from 'react'
import { apiFetch } from '../../config/api'

export function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [isShaking, setIsShaking] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isShaking) {
      const timer = setTimeout(() => setIsShaking(false), 500)
      return () => clearTimeout(timer)
    }
  }, [isShaking])

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!username.trim() || !password) {
      setError('Ingresa tu usuario y contraseña para continuar.')
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

      localStorage.setItem('user', JSON.stringify(data.data))
      onLogin(data.data)
    } catch (err) {
      setError('No se pudo conectar con el servidor backend.')
      setIsShaking(true)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div 
      className="font-sans text-[#2B3674] min-h-screen flex flex-col justify-between antialiased selection:bg-[#4318FF] selection:text-white bg-[#F4F7FE]"
      style={{
        background: '#F4F7FE radial-gradient(circle at 10% 20%, rgba(67, 24, 255, 0.07) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(67, 24, 255, 0.05) 0%, transparent 35%)'
      }}
    >
      <header className="w-full px-6 lg:px-12 py-5 flex items-center justify-between z-20">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-white shadow-[0px_18px_40px_rgba(112,144,176,0.12)] flex items-center justify-center border border-slate-100">
            <svg className="w-6 h-6 text-[#4318FF]" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              <path d="m9 12 2 2 4-4"></path>
            </svg>
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#A3AED0] block leading-none">Gobierno Municipal</span>
            <span className="text-sm font-extrabold text-[#2B3674] tracking-tight">MDJLO · Lambayeque</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex items-center space-x-2 bg-white px-3.5 py-1.5 rounded-full border border-slate-100 shadow-sm text-xs font-semibold text-[#2B3674]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Red Interna Operativa</span>
          </div>
          <a className="flex items-center space-x-1.5 text-xs font-bold text-[#A3AED0] hover:text-[#4318FF] transition-colors bg-white px-3.5 py-2 rounded-xl border border-slate-100 shadow-sm hover:shadow" href="#soporte-ti">
            <svg className="w-4 h-4 text-[#A3AED0] group-hover:text-[#4318FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
            </svg>
            <span>Mesa de Ayuda</span>
          </a>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-6 z-10">
        <div className="w-full max-w-[1180px] bg-white rounded-3xl shadow-[0px_18px_40px_rgba(112,144,176,0.12)] border border-slate-100/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
          
          <section className="lg:col-span-5 bg-[#111C44] relative p-8 sm:p-12 text-white flex flex-col justify-between overflow-hidden">
            <div className="absolute -right-16 -top-16 w-64 h-64 bg-[#4318FF]/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-[#3311CC]/30 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="relative z-10">
              <div className="mb-6">
                <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 inline-flex items-center justify-center">
                  <img src="/img/logo-mjlo-blanco.png" alt="Logo Municipalidad JLO" className="h-14 object-contain" />
                </div>
              </div>
              
              <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full text-xs font-semibold bg-[#4318FF]/30 text-white border border-[#4318FF]/40 mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Portal Institucional Interno
              </span>
              
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight mb-3">
                Gestión de Tránsito <br className="hidden sm:block"/>y Transporte
              </h1>
              
              <p className="text-[#A3AED0] text-sm leading-relaxed max-w-sm">
                Sistema operativo centralizado para la fiscalización, control vehicular, actas de control y seguridad vial de la jurisdicción de José Leonardo Ortiz.
              </p>
            </div>
            
            <div className="relative z-10 my-8 space-y-3">
              <div className="flex items-center space-x-3 bg-white/5 border border-white/10 rounded-2xl p-3">
                <div className="w-8 h-8 rounded-lg bg-[#4318FF]/30 flex items-center justify-center text-[#E0E7FF] text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Fiscalización & Papeletas MTC</p>
                  <p className="text-[11px] text-[#A3AED0]">Interconexión digital en tiempo real con depósito municipal</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 bg-white/5 border border-white/10 rounded-2xl p-3">
                <div className="w-8 h-8 rounded-lg bg-[#4318FF]/30 flex items-center justify-center text-[#E0E7FF] text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Canal Cifrado SSL 256-bit</p>
                  <p className="text-[11px] text-[#A3AED0]">Sesiones monitoreadas y firma electrónica institucional</p>
                </div>
              </div>
            </div>
            
            <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-[#A3AED0]">
              <span>Versión 2.6.4-prod</span>
              <span className="font-medium text-slate-300">Subgerencia de Tránsito</span>
            </div>
          </section>

          <section className="lg:col-span-7 p-8 sm:p-12 lg:p-14 flex flex-col justify-center bg-white">
            <div className="max-w-md w-full mx-auto">
              
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4318FF]"></span>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#4318FF]">Acceso Seguro</p>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#2B3674] tracking-tight">Iniciar Sesión</h2>
                <p className="text-sm text-[#A3AED0] mt-1">Ingresa tus credenciales institucionales registradas en la municipalidad.</p>
              </div>
              
              <div className="mb-6">
                <label className="block text-xs font-bold uppercase tracking-wide text-[#2B3674] mb-2">Módulo o Perfil</label>
                <div className="grid grid-cols-2 p-1 bg-[#F4F7FE] rounded-2xl border border-slate-200/80">
                  <button aria-pressed="true" className="py-2.5 text-xs font-bold text-[#4318FF] bg-white rounded-xl shadow-sm transition-all focus:outline-none" type="button">
                    Inspector / Operativo
                  </button>
                  <button className="py-2.5 text-xs font-bold text-[#A3AED0] hover:text-[#2B3674] rounded-xl transition-all focus:outline-none" type="button">
                    Administración / TI
                  </button>
                </div>
              </div>
              
              <form onSubmit={handleSubmit} className={`space-y-5 ${isShaking ? 'animate-shake' : ''}`} noValidate>
                
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#2B3674] mb-2" htmlFor="username">
                    Usuario o DNI <span className="text-[#4318FF]">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#A3AED0]">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                      </svg>
                    </div>
                    <input 
                      id="username" 
                      name="username" 
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value)
                        if (error) setError('')
                      }}
                      placeholder="Ej. dbarturen o 73294821" 
                      required 
                      type="text"
                      disabled={isLoading}
                      className="w-full pl-11 pr-4 py-3.5 bg-[#F4F7FE]/60 hover:bg-[#F4F7FE] focus:bg-white border border-transparent focus:border-[#4318FF] rounded-2xl text-sm font-semibold text-[#2B3674] placeholder-[#A3AED0]/70 focus:outline-none focus:ring-4 focus:ring-[#4318FF]/10 transition-all duration-200 disabled:opacity-50" 
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#2B3674]" htmlFor="password">
                      Contraseña <span className="text-[#4318FF]">*</span>
                    </label>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#A3AED0]">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                      </svg>
                    </div>
                    <input 
                      id="password" 
                      name="password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        if (error) setError('')
                      }}
                      placeholder="••••••••••••" 
                      required 
                      type={showPassword ? 'text' : 'password'}
                      disabled={isLoading}
                      className="w-full pl-11 pr-12 py-3.5 bg-[#F4F7FE]/60 hover:bg-[#F4F7FE] focus:bg-white border border-transparent focus:border-[#4318FF] rounded-2xl text-sm font-semibold text-[#2B3674] placeholder-[#A3AED0]/70 focus:outline-none focus:ring-4 focus:ring-[#4318FF]/10 transition-all duration-200 disabled:opacity-50" 
                    />
                    
                    <button 
                      aria-label="Mostrar u ocultar contraseña" 
                      className={`absolute inset-y-0 right-0 pr-4 flex items-center transition-colors focus:outline-none disabled:opacity-50 ${showPassword ? 'text-[#4318FF]' : 'text-[#A3AED0] hover:text-[#2B3674]'}`} 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                        <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center space-x-2 cursor-pointer select-none">
                    <input 
                      id="remember" 
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      disabled={isLoading}
                      className="w-4 h-4 text-[#4318FF] border-slate-300 rounded focus:ring-[#4318FF] focus:ring-offset-0 transition-colors disabled:opacity-50" 
                    />
                    <span className="font-medium text-[#2B3674]">Recordar sesión</span>
                  </label>
                  <a className="font-bold text-[#4318FF] hover:text-[#3311CC] hover:underline transition-all" href="#recuperar-credenciales">
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>

                {error && (
                  <div role="alert" className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-red-700 shadow-xs animate-enter mt-2">
                    <span className="grid size-4 shrink-0 place-items-center rounded-full bg-red-600 text-[11px] text-white shadow-xs font-bold leading-none">!</span>
                    <span>{error}</span>
                  </div>
                )}

                <div className="pt-2">
                  <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 px-6 bg-[#4318FF] hover:bg-[#3311CC] text-white font-bold text-sm rounded-2xl shadow-[0px_18px_40px_rgba(112,144,176,0.12)] hover:shadow-[0px_24px_48px_rgba(67,24,255,0.20)] active:scale-[0.99] transition-all duration-200 flex items-center justify-center space-x-2 group disabled:opacity-80 disabled:pointer-events-none" 
                  >
                    {isLoading ? (
                      <>
                        <svg className="w-5 h-5 animate-spin text-white/80" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Validando credenciales...</span>
                      </>
                    ) : (
                      <>
                        <span>Ingresar al Sistema</span>
                        <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </form>
              
              <div className="mt-8 pt-6 border-t border-slate-100 flex items-start space-x-3 text-xs text-[#A3AED0]">
                <svg className="w-4 h-4 text-[#4318FF] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                </svg>
                <p className="leading-relaxed">
                  Sistema de uso reservado para el personal activo de la Subgerencia de Tránsito y Transporte. Todo intento no autorizado quedará registrado bajo la Ley N° 30096.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="w-full px-6 lg:px-12 py-5 text-center text-xs text-[#A3AED0]">
        <p>
          © {new Date().getFullYear()} Municipalidad Distrital de José Leonardo Ortiz. Todos los derechos reservados · Chiclayo, Perú
        </p>
      </footer>
    </div>
  )
}
