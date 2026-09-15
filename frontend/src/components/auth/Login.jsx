import { useState, useEffect } from 'react'
import { apiFetch } from '../../config/api'

export function Login({ onLogin }) {
  const [username, setUsername] = useState(() => {
    return (typeof window !== 'undefined' && localStorage.getItem('remember_username')) || ''
  })
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(() => {
    return typeof window !== 'undefined' && Boolean(localStorage.getItem('remember_username'))
  })
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

      if (rememberMe) {
        localStorage.setItem('remember_username', username.trim())
      } else {
        localStorage.removeItem('remember_username')
      }

      onLogin(data.data, rememberMe)
    } catch (err) {
      setError('No se pudo conectar con el servidor backend.')
      setIsShaking(true)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 h-dvh w-screen max-w-full flex items-center justify-center bg-gradient-to-br from-[#3B6CED] to-[#2144A5] overflow-hidden font-sans">
      <style>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus, 
        input:-webkit-autofill:active {
            -webkit-box-shadow: 0 0 0 30px #2A51C6 inset !important;
            -webkit-text-fill-color: white !important;
            transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>
      {/* Background waves/circles */}
      <div className="absolute -top-32 -right-24 w-[500px] h-[500px] bg-white/5 rounded-full blur-sm pointer-events-none"></div>
      <div className="absolute -bottom-48 -left-32 w-[700px] h-[700px] bg-white/5 rounded-full blur-sm pointer-events-none"></div>
      <div className="absolute bottom-10 -left-10 w-[400px] h-[400px] bg-white/5 rounded-full blur-sm pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-sm px-6">
        <div className="flex flex-col items-center mb-10">
          <img 
            src="/img/logo-mjlo-blanco.png" 
            alt="Logo Municipalidad JLO" 
            className="h-24 object-contain drop-shadow-md mb-2" 
          />
        </div>

        <form onSubmit={handleSubmit} className={`space-y-5 ${isShaking ? 'animate-shake' : ''}`} noValidate>
          {/* USERNAME */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
              </svg>
            </div>
            <input 
              type="text" 
              value={username}
              onChange={(e) => { setUsername(e.target.value); if(error) setError(''); }}
              placeholder="USUARIO"
              className="w-full pl-12 pr-4 py-3.5 bg-transparent border border-white text-white placeholder-white/70 focus:outline-none focus:ring-1 focus:ring-white transition-all text-[13px] tracking-widest uppercase rounded-none"
              disabled={isLoading}
            />
          </div>

          {/* PASSWORD */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
              </svg>
            </div>
            <input 
              type={showPassword ? 'text' : 'password'} 
              value={password}
              onChange={(e) => { setPassword(e.target.value); if(error) setError(''); }}
              placeholder="CONTRASEÑA"
              className="w-full pl-12 pr-12 py-3.5 bg-transparent border border-white text-white placeholder-white/70 focus:outline-none focus:ring-1 focus:ring-white transition-all text-[13px] tracking-widest uppercase rounded-none"
              disabled={isLoading}
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/70 hover:text-white transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
              </svg>
            </button>
          </div>

          {/* REMEMBER ME */}
          <div className="flex items-center text-[13px] text-white pt-1">
            <label className="flex items-center space-x-2 cursor-pointer select-none">
              <input 
                id="remember" 
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isLoading}
                className="w-4 h-4 bg-transparent border-white rounded focus:ring-white transition-colors disabled:opacity-50" 
              />
              <span className="tracking-wide">Recordar sesión</span>
            </label>
          </div>

          {error && (
            <div className="text-red-200 text-[13px] text-center font-semibold bg-red-900/40 py-2.5 px-3 border border-red-400/30">
              {error}
            </div>
          )}

          {/* LOGIN BUTTON */}
          <div className="pt-2">
            <button 
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-white text-[#2144A5] font-bold text-[13px] tracking-widest uppercase hover:bg-gray-100 transition-colors flex justify-center items-center rounded-none"
            >
              {isLoading ? (
                <svg className="w-5 h-5 animate-spin text-[#2144A5]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                'INICIAR SESIÓN'
              )}
            </button>
          </div>
          
          {/* FORGOT PASSWORD */}
          <div className="text-center pt-3">
            <button type="button" className="text-white text-[13px] hover:underline focus:outline-none tracking-wide">
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
