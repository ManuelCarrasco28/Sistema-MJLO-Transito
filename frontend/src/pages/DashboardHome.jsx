import { useEffect, useState } from 'react'
import { MetricCards } from '../components/dashboard/MetricCards'
import { ChartsSection } from '../components/dashboard/ChartsSection'
import { apiFetch, getCachedData, setCachedData } from '../config/api'
import { Icon } from '../components/ui/Icon'
import { QuickActions } from '../components/dashboard/QuickActions'

export function DashboardHome() {
  const cached = getCachedData('/dashboard')
  const [dashboardData, setDashboardData] = useState(cached || null)
  const [error, setError] = useState('')

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
        if (active && !cached) setError('No se pudo cargar la información del panel principal.')
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="flex items-center gap-3.5">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#0075FF] text-white shadow-lg shadow-[#0075FF]/30">
            <Icon name="dashboard" className="size-6" />
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

      {/* Quick Actions (Accesos rápidos) */}
      <QuickActions />

      {/* Alertas Preventivas de Vencimiento */}
      {dashboardData?.alertasVencimiento && dashboardData.alertasVencimiento.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
                <Icon name="alert-triangle" className="size-4" />
              </span>
              <h2 className="text-sm font-bold text-slate-800 dark:text-white">Alertas de Vencimiento</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600 dark:bg-[var(--bg-subtle)] dark:text-slate-400">
              Próximos 30 días
            </span>
          </div>
          
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dashboardData.alertasVencimiento.map((alerta, idx) => (
              <div key={idx} className={`relative overflow-hidden rounded-xl border p-4 ${
                alerta.nivel === 'rojo' 
                  ? 'border-rose-200 bg-rose-50/50 dark:border-rose-900/50 dark:bg-rose-950/20' 
                  : alerta.nivel === 'naranja'
                  ? 'border-orange-200 bg-orange-50/50 dark:border-orange-900/50 dark:bg-orange-950/20'
                  : 'border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20'
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className={`text-xs font-black uppercase tracking-wider ${
                      alerta.nivel === 'rojo' ? 'text-rose-700 dark:text-rose-400' :
                      alerta.nivel === 'naranja' ? 'text-orange-700 dark:text-orange-400' :
                      'text-amber-700 dark:text-amber-400'
                    }`}>{alerta.tipo}</p>
                    <p className="mt-1 font-bold text-slate-900 dark:text-white">{alerta.identificador}</p>
                    <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{alerta.detalle}</p>
                  </div>
                  <div className={`flex flex-col items-center justify-center rounded-lg px-2 py-1.5 ${
                    alerta.nivel === 'rojo' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300' :
                    alerta.nivel === 'naranja' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-300' :
                    'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                  }`}>
                    <span className="text-lg font-black leading-none">{alerta.dias}</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider">días</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Metric Cards */}
      <MetricCards cards={dashboardData?.summaryCards} loading={!dashboardData && !error} />
      
      {/* Main Dashboard Grid */}
      <ChartsSection data={dashboardData} loading={!dashboardData && !error} />
    </div>
  )
}
