import { useEffect, useState } from 'react'
import { MetricCards } from '../components/dashboard/MetricCards'
import { QuickActions } from '../components/dashboard/QuickActions'
import { ChartsSection } from '../components/dashboard/ChartsSection'
import { Icon } from '../components/ui/Icon'
import { apiFetch, getCachedData, setCachedData } from '../config/api'

export function DashboardHome() {
  const cached = getCachedData('/dashboard')
  const [dashboardData, setDashboardData] = useState(cached || null)
  const [error, setError] = useState('')
  const currentDate = new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date())

  useEffect(() => {
    let active = true

    apiFetch('/dashboard')
      .then((response) => {
        if (!response.ok) throw new Error('No se pudo cargar el resumen del dashboard.')
        return response.json()
      })
      .then((data) => {
        if (active) {
          setDashboardData(data)
          setCachedData('/dashboard', data)
        }
      })
      .catch(() => {
        if (active && !cached) setError('No se pudo cargar información de la base de datos.')
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-600 text-white shadow-lg shadow-blue-500/30">
            <Icon name="dashboard" className="size-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                Panel de Control Operativo
              </h1>
            </div>
            <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              Subgerencia de Tránsito, Transporte y Seguridad Vial · MDJLO
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 shadow-xs dark:border-slate-800 dark:bg-[#0f172a]">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Tránsito Municipal</span>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 shadow-xs dark:border-slate-800 dark:bg-[#0f172a] dark:text-slate-300">
            {currentDate}
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
