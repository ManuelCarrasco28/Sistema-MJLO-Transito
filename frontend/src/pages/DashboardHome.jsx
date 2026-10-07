import { useEffect, useState } from 'react'
import { MetricCards } from '../components/dashboard/MetricCards'
import { ChartsSection } from '../components/dashboard/ChartsSection'
import { apiFetch, getCachedData, setCachedData } from '../config/api'
import { Icon } from '../components/ui/Icon'


export function DashboardHome({ user }) {
  const cached = getCachedData('/dashboard')
  const [dashboardData, setDashboardData] = useState(cached || null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    let pending = false
    const controller = new AbortController()

    const cargar = () => {
      if (!active || pending || document.visibilityState === 'hidden') return
      pending = true
      apiFetch('/dashboard', { signal: controller.signal })
        .then((response) => {
          if (!response.ok) throw new Error('No se pudo cargar el resumen del dashboard.')
          return response.json()
        })
        .then((data) => {
          if (active) {
            setDashboardData(data)
            setCachedData('/dashboard', data)
            setError('')
          }
        })
        .catch(() => {
          if (active && !cached) setError('No se pudo cargar la información del panel principal.')
        })
        .finally(() => { pending = false })
    }

    cargar()
    // Se actualiza solo cada minuto y al volver a la pestaña (mes, dias y montos siempre al dia)
    const timer = setInterval(cargar, 60000)
    const alVolver = () => { if (document.visibilityState === 'visible') cargar() }
    document.addEventListener('visibilitychange', alVolver)

    return () => {
      active = false
      controller.abort()
      clearInterval(timer)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="flex items-center gap-3.5">
          <span className="grid shrink-0 place-items-center text-slate-900 dark:text-white">
            <Icon name="dashboard" className="size-9" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                Panel de Control
              </h1>
            </div>
            <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              Resumen estadístico y accesos rápidos del sistema de tránsito municipal.
            </p>
          </div>
        </div>
      </div>
      {error && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          {error}
        </div>
      )}




      {/* KPI Metric Cards */}
      <MetricCards cards={dashboardData?.summaryCards} loading={!dashboardData && !error} user={user} />
      
      {/* Main Dashboard Grid */}
      <ChartsSection data={dashboardData} loading={!dashboardData && !error} user={user} />
    </div>
  )
}

