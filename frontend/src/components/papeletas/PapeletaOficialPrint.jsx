import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { apiFetch } from '../../config/api'
import { formatoNumeroPapeleta } from '../../utils/numeroPapeleta'

const dato = (valor) => {
  const texto = String(valor ?? '').trim()
  return texto && !['S/D', 'No Registrado', '—', '--', '-'].includes(texto) ? texto : ''
}

const fechaPartes = (valor) => {
  const m = String(valor ?? '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/)
  return m ? { dia: m[3], mes: m[2], anio: m[1], hora: m[4] && m[5] ? `${m[4]}:${m[5]}` : '' } : { dia: '', mes: '', anio: '', hora: '' }
}

function Campo({ titulo, valor }) {
  return <div className="papeleta-campo border-b border-slate-400 py-1.5 text-xs">
    <span className="text-[10px] font-bold uppercase text-slate-600">{titulo}</span>
    <div className="min-h-4 break-words font-semibold uppercase">{dato(valor)}</div>
  </div>
}

function Bloque({ titulo, children }) {
  return <section className="papeleta-bloque break-inside-avoid border border-slate-500">
    <h3 className="bg-[#17365d] px-2 py-1 text-center text-xs font-black uppercase tracking-wide text-white print:bg-[#17365d]">{titulo}</h3>
    <div className="px-3 pb-2">{children}</div>
  </section>
}

export function PapeletaOficialPrint({ papeleta, onClose }) {
  const [municipalidad, setMunicipalidad] = useState(null)
  const [configReady, setConfigReady] = useState(false)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(() => {
    let activo = true
    apiFetch('/municipalidad/config')
      .then((res) => res.ok ? res.json() : null)
      .then((payload) => { if (activo) setMunicipalidad(payload?.data?.municipalidad ?? null) })
      .catch(() => {})
      .finally(() => { if (activo) setConfigReady(true) })
    return () => { activo = false }
  }, [])

  useEffect(() => {
    if (!configReady || !papeleta) return undefined
    const cerrar = () => onCloseRef.current?.()
    window.addEventListener('afterprint', cerrar)
    const timer = window.setTimeout(() => window.print(), 0)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('afterprint', cerrar)
    }
  }, [configReady, papeleta])

  if (!papeleta || typeof document === 'undefined') return null
  const p = papeleta
  const fecha = fechaPartes(p.fechaHora)
  const detalles = p.detalles?.length ? p.detalles : [{ codigo: p.tipoInfraccionCodigo, descripcion: p.tipoInfraccionDescripcion, montoFinal: p.montoTotal }]

  return createPortal(
    <div id="seccion-impresion" className="papeleta-hoja hidden font-sans text-slate-900 print:block print:bg-white print:p-0">
      <style media="print">{'@page { size: A4 portrait; margin: 0; background: #fff; }'}</style>
      <article className="papeleta-impresion mx-auto w-full max-w-[190mm] bg-white p-5 shadow-xl print:p-0 print:shadow-none">
        <header className="papeleta-cabecera mb-3 flex items-center gap-3 border-b-2 border-[#17365d] pb-3">
          <img src="/img/logo-mjlo.png" alt="Municipalidad Distrital de José Leonardo Ortiz" className="h-20 w-auto max-w-[70mm] object-contain" />
          <div className="min-w-0 flex-1 text-center">
            <p className="text-xs font-bold uppercase">Subgerencia de Tránsito, Transportes y Seguridad Vial</p>
            <p className="text-xs">RUC: {dato(municipalidad?.ruc)}</p>
          </div>
          <div className="papeleta-numero min-w-0 text-center font-mono text-sm font-black text-red-700"><span className="whitespace-nowrap">N° {formatoNumeroPapeleta(p.numeroPapeleta)}</span></div>
          <h2 className="papeleta-titulo rounded bg-[#17365d] px-2 py-1 text-center text-base font-black uppercase tracking-wide text-white print:bg-[#17365d]">Papeleta de infracción</h2>
        </header>

        <div className="papeleta-columnas grid grid-cols-2 items-start gap-2">
          <div className="papeleta-columna space-y-2">
            <Bloque titulo="Del infractor">
              <Campo titulo="Nombre" valor={p.conductorNombre || p.infractor} />
              <Campo titulo="Domicilio" valor={p.conductorDireccion} />
              <Campo titulo="DNI / documento" valor={p.conductorDni} />
              <Campo titulo="N° licencia" valor={p.conductorLicencia} />
              <div className="grid grid-cols-2 gap-2"><Campo titulo="Clase de licencia" valor={p.conductorLicenciaClase} /><Campo titulo="Categoría" valor={p.conductorLicenciaCategoria} /></div>
            </Bloque>
            <Bloque titulo="Del vehículo">
              <Campo titulo="N° de placa" valor={p.vehiculoPlaca} />
              <Campo titulo="Clase de vehículo" valor={p.vehiculoClase} />
              <Campo titulo="Color" valor={p.vehiculoColor} />
              <Campo titulo="Marca" valor={p.vehiculoMarca} />
              <Campo titulo="N° de motor" valor={p.vehiculoMotor} />
              <Campo titulo="Categoría / modelo" valor={p.vehiculoCategoria || p.vehiculoModelo} />
              <Campo titulo="Asociación, si corresponde" valor={p.vehiculoAsociacion} />
            </Bloque>
            <Bloque titulo="De la autoridad">
              <Campo titulo="Unidad" valor={p.unidadAutoridad} />
              <Campo titulo="Nombres" valor={p.inspector} />
              <Campo titulo="Observaciones" valor={p.observacionesAutoridad} />
              <div className="grid grid-cols-2 gap-2"><Campo titulo="Firma" valor="" /><Campo titulo="Doc. inspector" valor={p.inspectorDocumento} /></div>
            </Bloque>
          </div>
          <div className="papeleta-columna space-y-2">
            <Bloque titulo="Del propietario">
              <Campo titulo="Nombre / razón social" valor={p.propietarioNombre} />
              <Campo titulo="Domicilio" valor={p.propietarioDireccion} />
              <Campo titulo="DNI / RUC" valor={p.propietarioDni} />
            </Bloque>
            <Bloque titulo="De la infracción">
              <div className="py-2 text-[10px] font-bold uppercase text-slate-600">Infracción registrada</div>
              {detalles.map((d, i) => <div key={`${d.codigo || 'infraccion'}-${i}`} className="mb-1 border-b border-slate-300 pb-1 text-xs">
                <div className="flex justify-between gap-2 font-bold"><span>{dato(d.codigo)}</span><span>S/ {Number(d.montoFinal ?? d.monto ?? 0).toFixed(2)}</span></div>
                <div className="text-[11px]">{dato(d.descripcion)}</div>
              </div>)}
              <div className="pt-1 text-right text-sm font-black">Total: S/ {Number(p.montoTotal || 0).toFixed(2)}</div>
              <Campo titulo="Lugar" valor={p.lugar} />
              <div className="papeleta-fecha-titulo">Fecha y hora</div>
              <div className="papeleta-fecha grid grid-cols-4"><Campo titulo="Día" valor={fecha.dia} /><Campo titulo="Mes" valor={fecha.mes} /><Campo titulo="Año" valor={fecha.anio} /><Campo titulo="Hora" valor={fecha.hora} /></div>
            </Bloque>
            <Bloque titulo="Observaciones del conductor">
              <div className="papeleta-observaciones min-h-24 whitespace-pre-wrap py-2 text-xs">{dato(p.observacionesConductor).replace(/Conductor no presente durante la intervención\.?/gi, '').trim()}</div>
              {p.firmaConductorImg ? <img src={p.firmaConductorImg} alt="Firma del conductor" className="max-h-16 object-contain" /> : <div className="papeleta-firma-espacio h-12" />}
              <div className="border-t border-slate-600 pt-1 text-[10px] font-bold uppercase">Firma del conductor</div>
            </Bloque>
          </div>
        </div>
      </article>
    </div>, document.body
  )
}
