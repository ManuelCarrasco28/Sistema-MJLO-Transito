import { useEffect, useState } from 'react'
import { MetricCards } from '../components/dashboard/MetricCards'
import { QuickActions } from '../components/dashboard/QuickActions'
import { ChartsSection } from '../components/dashboard/ChartsSection'

export function DashboardHome() {
  const [dashboardData, setDashboardData] = useState(null)
  const [error, setError] = useState('')
  const currentDate = new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date())

  useEffect(() => {
    let active = true

    fetch('http://localhost:8080/api/dashboard', { credentials: 'include' })
      .then((response) => {
        if (!response.ok) throw new Error('No se pudo cargar el resumen del dashboard.')
        return response.json()
      })
      .then((data) => {
        if (active) setDashboardData(data)
      })
      .catch(() => {
        if (active) setError('No se pudo cargar información de la base de datos.')
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-blue-900/10 bg-[#123b6d] p-5 text-white shadow-[0_12px_28px_rgba(15,42,82,0.18)] dark:border-blue-900/40 dark:bg-[#102a4d] sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="border-l-4 border-cyan-300 pl-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-100">
              Municipalidad Distrital de José Leonardo Ortiz
            </p>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-[2rem]">
              Panel de Control Operativo
            </h1>
            <p className="mt-1 text-sm text-blue-50/90">
              Subgerencia de Tránsito, Transporte y Seguridad Vial · MDJLO
            </p>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-2 lg:min-w-[22rem]">
            {[
              ['Área', 'Tránsito Municipal'],
              ['Fecha', currentDate],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-white/15 bg-white/8 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-100/80">{label}</p>
                <p className="mt-1 font-bold text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-800 dark:text-white sm:text-xl">
            Resumen de gestión municipal
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Indicadores obtenidos desde la base de datos.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
          {error}
        </div>
      )}

      <MetricCards cards={dashboardData?.summaryCards} loading={!dashboardData && !error} />
      <QuickActions />
      <ChartsSection data={dashboardData} loading={!dashboardData && !error} />
    </div>
  )
}
