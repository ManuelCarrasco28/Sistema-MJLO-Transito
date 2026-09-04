import { useState } from 'react'
import { Icon } from '../ui/Icon'
import { Logo } from '../ui/Logo'

export function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!username.trim() || !password) {
      setError('Ingresa tu usuario y contraseña para continuar.')
      return
    }
    if (username.trim().toLowerCase() !== 'admin' || password !== 'admin123') {
      setError('El usuario o la contraseña son incorrectos.')
      return
    }
    setError('')
    onLogin()
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 px-4 py-8 sm:px-6">
      <div className="absolute inset-0 bg-linear-[135deg,#071a2f_0%,#0b3458_45%,#dcebf4_45%,#f1f6f9_100%]" aria-hidden="true" />
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] bg-size-[24px_24px]" aria-hidden="true" />

      <section className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/30 bg-white shadow-[0_30px_90px_rgba(7,26,47,0.24)] lg:grid-cols-[0.92fr_1.08fr]">
        <div className="relative hidden overflow-hidden bg-[#071a2f] p-10 text-white lg:flex lg:flex-col xl:p-12">
          <div className="absolute -right-32 -top-32 size-80 rounded-full border border-cyan-300/20" aria-hidden="true" />
          <div className="absolute -right-40 -top-40 size-96 rounded-full border border-white/10" aria-hidden="true" />
          <Logo />
          <div className="relative my-auto py-16">
            <p className="mb-5 inline-flex rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1.5 text-sm font-semibold text-cyan-100">Portal institucional interno</p>
            <h1 className="text-4xl font-black leading-tight tracking-tight">Gestión de Tránsito Municipal</h1>
            <p className="mt-5 max-w-sm text-base leading-7 text-slate-300">Herramientas operativas para el personal de Tránsito, Transporte y Seguridad Vial.</p>
          </div>
        </div>

        <div className="p-6 sm:p-10 lg:p-12 xl:p-14">
          <div className="mb-8 flex justify-center lg:hidden"><Logo /></div>
          <div className="mb-8 text-center lg:text-left">
            <p className="text-sm font-bold uppercase tracking-widest text-cyan-700">Municipalidad Distrital de</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-[#071a2f] sm:text-3xl">José Leonardo Ortiz</h2>
            <p className="mt-3 text-base text-slate-500">Sistema de Gestión de Tránsito Municipal</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Usuario</span>
              <span className="flex h-13 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 text-slate-400 transition focus-within:border-cyan-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-cyan-500/10">
                <Icon name="user" />
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  placeholder="Ingresa tu usuario"
                  className="h-full min-w-0 flex-1 bg-transparent text-base text-slate-800 outline-none placeholder:text-slate-400"
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Contraseña</span>
              <span className="flex h-13 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 text-slate-400 transition focus-within:border-cyan-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-cyan-500/10">
                <Icon name="lock" />
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Ingresa tu contraseña"
                  className="h-full min-w-0 flex-1 bg-transparent text-base text-slate-800 outline-none placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="rounded-lg p-1 text-slate-400 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"
                >
                  <Icon name="eye" />
                </button>
              </span>
            </label>

            {error && (
              <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-red-600 text-xs text-white">!</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="group flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-[#0b3458] px-5 text-base font-extrabold text-white shadow-[0_12px_28px_rgba(11,52,88,0.2)] transition hover:-translate-y-0.5 hover:bg-[#092a48] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 active:translate-y-0"
            >
              Iniciar sesión <Icon name="arrow" className="size-5 transition group-hover:translate-x-0.5" />
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-400">© 2026 Municipalidad Distrital de José Leonardo Ortiz</p>
        </div>
      </section>
    </main>
  )
}
