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

// Centro de impresión: un solo lugar para reunir en un carrito e imprimir en lote carnets, tarjetas y QR.
export function CentroImpresion() {
  // Desde Cursos se llega con ?pestana=CARNETS&cursoId=..&cursoEtiqueta=.. para imprimir los carnets de ese curso.
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


  // El curso que llega desde Cursos se aplica una sola vez: al volver a la pestaña ya no se re-filtra ni se
  // vuelve a llenar el carrito, y recargar la página tampoco lo repite (se limpia de la URL).
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
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Reúna en un carrito carnets, tarjetas y códigos QR e imprímalos de una vez o por lotes.
            </p>
          </div>
        </div>
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
