import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { getCachedData, setCachedData, apiFetch } from '../config/api'
import { ImpresionQrVehiculos } from '../components/vehiculos/ImpresionQrVehiculos'
import { ImpresionCarnetsCurso } from '../components/impresion/ImpresionCarnetsCurso'
import { ImpresionTarjetasOperatividad } from '../components/impresion/ImpresionTarjetasOperatividad'

const PESTANAS = [
  { id: 'CARNETS', label: 'Carnet del curso', icono: 'course' },
  { id: 'TARJETAS', label: 'Tarjeta de operatividad', icono: 'folderShield' },
  { id: 'QR', label: 'QR de vehículos', icono: 'motoTaxi' },
]

const CLAVE_PESTANA = 'impresion_pestana_activa'

const pestanaGuardada = () => {
  try {
    const guardada = localStorage.getItem(CLAVE_PESTANA)
    return PESTANAS.some((p) => p.id === guardada) ? guardada : PESTANAS[0].id
  } catch {
    return PESTANAS[0].id
  }
}

export function CentroImpresion() {
  // Desde Cursos se llega con ?pestana=CARNETS&cursoId=..&cursoEtiqueta=.
  const [params, setParams] = useSearchParams()
  const [cursoInicial, setCursoInicial] = useState(() => (
    params.get('cursoId') ? { id: params.get('cursoId'), etiqueta: params.get('cursoEtiqueta') || `Curso ${params.get('cursoId')}` } : null
  ))
  // También: ?buscar=..&estado=.. (desde la ficha de una tarjeta de operatividad).
  const [tarjetaInicial] = useState(() => (params.get('buscar') ? { buscar: params.get('buscar'), estado: params.get('estado') || '' } : null))
  const [pestana, setPestana] = useState(() => {
    const pedida = params.get('pestana')
    return PESTANAS.some((p) => p.id === pedida) ? pedida : pestanaGuardada()
  })
  const [asociaciones, setAsociaciones] = useState(getCachedData('/asociaciones') || [])
  const [resumen, setResumen] = useState({ CARNETS: null, TARJETAS: null, QR: null })

  useEffect(() => {
    const controller = new AbortController()
    const consultas = [
      ['CARNETS', '/cursos/carnets?page=1&porPagina=1'],
      ['TARJETAS', '/documentos?tipoDocumento=TARJETA_OPERATIVIDAD&page=1&porPagina=1'],
      ['QR', '/vehiculos/estadisticas'],
    ]
    consultas.forEach(async ([clave, url]) => {
      try {
        const response = await apiFetch(url, { signal: controller.signal })
        if (!response.ok) return
        const payload = await response.json()
        const total = clave === 'QR' ? payload.data?.total : payload.meta?.total
        if (!controller.signal.aborted && total != null) {
          setResumen(prev => ({ ...prev, [clave]: Number(total) }))
        }
      } catch { /* Una consulta fallida se muestra sin cifra, no como cero. */ }
    })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    try { localStorage.setItem(CLAVE_PESTANA, pestana) } catch { /* sin almacenamiento */ }
  }, [pestana])

  useEffect(() => {
    if (asociaciones.length > 0) return
    apiFetch('/asociaciones')
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (payload?.data) {
          setAsociaciones(payload.data)
          setCachedData('/asociaciones', payload.data)
        }
      })
      .catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps


  // Aplicar el curso de la URL una vez y limpiar sus parámetros.
  const usarCursoInicial = () => {
    setCursoInicial(null)
    setParams((prev) => {
      const sig = new URLSearchParams(prev)
      sig.delete('cursoId')
      sig.delete('cursoEtiqueta')
      return sig
    }, { replace: true })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center text-slate-900 dark:text-white">
            <Icon name="print" className="size-7 stroke-[2.4]" />
          </span>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">Centro de impresión</h1>
          </div>
        </div>
      </div>

      <div className="kpi-grid">
        {PESTANAS.map((t, i) => {
          const color = [
            { borde: 'border-indigo-400', texto: 'text-indigo-600 dark:text-indigo-400' },
            { borde: 'border-amber-400', texto: 'text-amber-600 dark:text-amber-400' },
            { borde: 'border-cyan-400', texto: 'text-cyan-600 dark:text-cyan-400' },
          ][i]
          return (
            <div key={t.id} className={`relative overflow-hidden rounded-xl border-[1.5px] ${color.borde} bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438]`}>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${color.texto}`}>
                  {['Carnets del curso', 'Tarjetas de operatividad', 'Vehículos para QR'][i]}
                </span>
                <span className={`grid size-6 place-items-center rounded-md ${color.texto}`}>
                  <Icon name={t.icono} className="size-3.5" />
                </span>
              </div>
              <div className="mt-1">
                <p className="text-xl font-black leading-tight text-slate-800 dark:text-white sm:text-2xl">
                  {resumen[t.id] == null ? '—' : resumen[t.id].toLocaleString('es-PE')}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 dark:border-[var(--border)]">
        {PESTANAS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setPestana(t.id)}
            className={`inline-flex items-center gap-1.5 border-b-2 px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer ${
              pestana === t.id
                ? 'border-indigo-600 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Icon name={t.icono} className="size-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {pestana === 'CARNETS' && <ImpresionCarnetsCurso cursoInicial={cursoInicial} alUsarCursoInicial={usarCursoInicial} />}
      {pestana === 'TARJETAS' && <ImpresionTarjetasOperatividad inicial={tarjetaInicial} />}
      {pestana === 'QR' && <ImpresionQrVehiculos asociaciones={asociaciones} />}
    </div>
  )
}

export default CentroImpresion
