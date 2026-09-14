import { useState, useEffect } from 'react'
import { apiFetch } from '../../config/api'

export function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
      setError('El usuario o la contraseña son incorrectos.')
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
      setError('El usuario o la contraseña son incorrectos.')
      setIsShaking(true)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden font-sans select-none">
      {/* Background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-105"
        style={{ backgroundImage: "url('/img/fondo_login.jpg')" }}
      />

      {/* Subtle warm light overlay for enhanced illumination */}
      <div className="absolute inset-0 bg-white/5 pointer-events-none" />

      {/* Main Login Card - Transparent, illuminated, without blur */}
      <div className={`relative z-10 w-full max-w-[420px] mx-4 bg-white/20 rounded-2xl shadow-[0_20px_50px_rgba(0,18,46,0.25)] p-7 sm:p-9 border border-white/60 transition-all ${isShaking ? 'animate-shake' : ''}`}>
        {/* Municipal Logo */}
        <div className="flex justify-center mb-7">
          <img 
            src="/img/logo-mjlo.png" 
            alt="Municipalidad Distrital José Leonardo Ortiz" 
            className="h-16 w-auto object-contain select-none pointer-events-none drop-shadow-[0_2px_8px_rgba(255,255,255,0.8)]" 
          />
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* USERNAME FIELD */}
          <div className="relative mb-5">
            <label className="absolute -top-2.5 left-4 bg-white px-2 py-0.5 rounded text-[11px] font-semibold text-[#0f4c81] shadow-xs border border-gray-200 z-10 pointer-events-none">
              Usuario
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 flex items-center justify-center w-7 h-7 rounded-md bg-[#fff2ec] border border-[#fed7c3] text-[#ea580c] pointer-events-none">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <input 
                type="text" 
                value={username}
                onChange={(e) => { 
                  setUsername(e.target.value); 
                  if (error) setError(''); 
                }}
                className="w-full pl-13 pr-4 py-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[#0f4c81] focus:ring-2 focus:ring-[#0f4c81]/20 transition-all placeholder-gray-400 shadow-xs"
                placeholder=""
                disabled={isLoading}
                autoComplete="username"
                autoFocus
              />
            </div>
          </div>

          {/* PASSWORD FIELD */}
          <div className="relative mb-4">
            <label className="absolute -top-2.5 left-4 bg-white px-2 py-0.5 rounded text-[11px] font-semibold text-[#0f4c81] shadow-xs border border-gray-200 z-10 pointer-events-none">
              Contraseña
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 flex items-center justify-center w-7 h-7 rounded-md bg-[#eff6ff] border border-[#bfdbfe] text-[#2563eb] pointer-events-none">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              </div>
              <input 
                type={showPassword ? 'text' : 'password'} 
                value={password}
                onChange={(e) => { 
                  setPassword(e.target.value); 
                  if (error) setError(''); 
                }}
                className="w-full pl-13 pr-11 py-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 tracking-wider focus:outline-none focus:border-[#0f4c81] focus:ring-2 focus:ring-[#0f4c81]/20 transition-all placeholder-gray-400 shadow-xs"
                placeholder=""
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 p-1.5 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none cursor-pointer"
                tabIndex={-1}
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* ERROR ALERT */}
          {error && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 mb-4 bg-[#fef2f2] border border-[#fca5a5] rounded-lg text-xs text-[#991b1b] shadow-xs">
              <svg className="w-4 h-4 text-[#dc2626] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span className="font-normal">{error}</span>
            </div>
          )}

          {/* SUBMIT BUTTON */}
          <div className="pt-2">
            <button 
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-[#0f4c81] hover:bg-[#0b3b64] active:bg-[#092d4d] text-white font-semibold text-sm tracking-wide uppercase rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center cursor-pointer disabled:opacity-75"
            >
              {isLoading ? (
                <svg className="w-5 h-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                'INICIAR SESIÓN'
              )}
            </button>
          </div>
          
          {/* FORGOT PASSWORD LINK */}
          <div className="text-center mt-5">
            <button 
              type="button" 
              onClick={() => alert('Por favor, comunícate con el área de TI o Administrador para restablecer tu contraseña.')}
              className="text-xs text-[#0f4c81] hover:text-[#092d4d] hover:underline focus:outline-none tracking-normal cursor-pointer transition-colors font-semibold"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
