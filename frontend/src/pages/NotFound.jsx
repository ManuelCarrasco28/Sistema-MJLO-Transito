import { Link } from 'react-router-dom'

export function NotFound({ user }) {
  const isSuperAdmin = (user?.rol || '').toUpperCase() === 'SUPERADMIN'
  const homePath = user ? (isSuperAdmin ? '/superadmin' : '/dashboard') : '/login'

  return (
    <div className="relative min-h-dvh w-full flex flex-col justify-between overflow-x-hidden bg-[#e5f4fd] text-slate-800 dark:bg-[#0c1322] dark:text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Cabecera institucional superior */}
      <header className="w-full px-6 py-5 sm:px-10 sm:py-6 flex items-center justify-between z-20">
        <Link
          to={homePath}
          className="inline-flex items-center gap-3.5 transition-transform hover:scale-[1.02] active:scale-95"
          title="Ir al inicio del sistema"
        >
          <img
            src="/img/logo-mjlo.png"
            alt="Municipalidad Distrital José Leonardo Ortiz"
            className="h-10 sm:h-12 w-auto object-contain drop-shadow-sm"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
          <div className="flex flex-col text-left">
            <span className="text-[11px] sm:text-xs font-black tracking-wider text-slate-800 dark:text-slate-100 uppercase">
              Municipalidad Distrital José Leonardo Ortiz
            </span>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 tracking-wide uppercase">
              Subgerencia de Tránsito y Transporte
            </span>
          </div>
        </Link>
      </header>

      {/* Contenido principal centrado (2 columnas) */}
      <main className="flex-1 flex items-center justify-center px-6 py-6 sm:px-10 lg:px-16 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center w-full">
          {/* Columna Izquierda: Tipografía y Botones (idéntico a la referencia del usuario) */}
          <div className="lg:col-span-5 text-center lg:text-left flex flex-col items-center lg:items-start order-2 lg:order-1">
            <h1 className="font-extrabold tracking-tight leading-[0.92] text-[#36329c] dark:text-indigo-400 select-none">
              <span className="block text-6xl sm:text-7xl lg:text-8xl">Error</span>
              <span className="block text-6xl sm:text-7xl lg:text-8xl mt-1">404</span>
            </h1>

            <p className="mt-6 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-md leading-relaxed font-normal">
              La página que está buscando se movió, quitó, renombró o podría no existir nunca.
            </p>

            <div className="mt-8">
              <Link
                to={homePath}
                className="inline-flex items-center justify-center rounded-sm bg-[#1ec6d6] hover:bg-[#16b0bf] text-white font-extrabold px-7 py-3.5 text-xs sm:text-sm tracking-wider uppercase transition-all shadow-md shadow-cyan-500/25 active:scale-95 cursor-pointer text-center"
              >
                <span>IR A LA PÁGINA DE INICIO</span>
              </Link>
            </div>
          </div>

          {/* Columna Derecha: Ilustración (idéntica a la referencia del usuario) */}
          <div className="lg:col-span-7 flex justify-center items-center order-1 lg:order-2">
            <div className="relative w-full max-w-md sm:max-w-lg lg:max-w-xl">
              <div className="overflow-hidden rounded-3xl bg-white/60 dark:bg-slate-900/40 p-2 sm:p-3 border border-sky-200/50 dark:border-slate-800/60 shadow-xl backdrop-blur-xs">
                <img
                  src="/img/error-404.png"
                  alt="Error 404 - Búsqueda de página"
                  className="w-full h-auto object-contain rounded-2xl select-none pointer-events-none transition-transform hover:scale-[1.01]"
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Pie institucional */}
      <footer className="w-full px-6 py-4 text-center text-xs text-slate-500 dark:text-slate-400">
        <span>Sistema de Tránsito y Transporte · MDJLO</span>
      </footer>
    </div>
  )
}
