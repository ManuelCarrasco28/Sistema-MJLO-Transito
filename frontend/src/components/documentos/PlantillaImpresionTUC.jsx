import React from 'react'
import { Icon } from '../ui/Icon'
import { TarjetaOperatividadPrint, CarnetCursoVialPrint, CerticavFichaPrint, SoatConstanciaPrint } from './TarjetaOperatividadPrint'
import './TarjetasImpresion.css'
import { BotonCerrarModal } from '../ui/ModalControls'

export function datosImpresionDocumento(documento) {
  const propietarioParts = (documento.propietario || '').trim().split(/\s+/).filter(Boolean)
  const fallbackApellidos = propietarioParts.length > 2 ? propietarioParts.slice(-2).join(' ') : documento.propietario || ''
  const fallbackNombres = propietarioParts.length > 2 ? propietarioParts.slice(0, -2).join(' ') : ''

  const printData = {
    tucNumero: documento.codigo || '',
    codigo: documento.codigo || '',
    transportador: documento.asociacion || 'INDEPENDIENTE',
    asociacion: documento.asociacion || 'INDEPENDIENTE',
    resMunicipal: documento.resMunicipal || '',
    dni: documento.conductorDni || documento.propietarioDni || documento.dni || '',
    conductorDni: documento.conductorDni || documento.propietarioDni || '',
    direccion: documento.direccion || '',
    apellidos: documento.conductorApellidos || fallbackApellidos,
    nombres: documento.conductorNombres || fallbackNombres,
    conductorNombres: documento.conductorNombres || documento.propietario || '',
    conductorNombre: documento.conductorNombres || documento.propietario || '',
    conductorLicencia: documento.numeroLicencia || '',
    numeroLicencia: documento.numeroLicencia || '',
    fotoUrl: documento.fotoConductor || '',
    fotoConductor: documento.fotoConductor || '',
    placa: documento.vehiculoPlaca || '',
    vehiculoPlaca: documento.vehiculoPlaca || '',
    numeroMotor: documento.vehiculoMotor || '',
    vehiculoMotor: documento.vehiculoMotor || '',
    vehiculoMarca: documento.vehiculoMarca || '',
    vehiculoModelo: documento.vehiculoModelo || '',
    vehiculoAnio: documento.vehiculoAnio || documento.anioFabricacion || '',
    anioFabricacion: documento.vehiculoAnio || documento.anioFabricacion || '',
    fecha: documento.fechaExpedicion || documento.fecha || '',
    fechaExpedicion: documento.fechaExpedicion || '',
    fechaVencimiento: documento.fechaExpiracion || '',
    fechaExpiracion: documento.fechaExpiracion || '',
    numeroRegistro: documento.numeroRegistro || documento.numeroInspeccion || documento.codigo || '',
    numeroSerieCerticav: documento.numeroSerieCerticav || documento.codigo || '',
    numeroInspeccion: documento.numeroInspeccion || '',
    primeraEvaluacion: documento.primeraEvaluacion || 'APROBADO',
    segundaEvaluacion: documento.segundaEvaluacion || '',
    propietario: documento.propietario || '',
    propietarioDni: documento.propietarioDni || '',
    aseguradora: documento.aseguradora || '',
    resultado: documento.resultado || 'APROBADO',
    inspector: documento.inspector || 'Inspector Técnico Municipal',
    observaciones: documento.observaciones || '',
    detalles: documento.detalles || [],
    qrUrl: `https://munijlo.gob.pe/transito/validar?doc=${encodeURIComponent(documento.codigo || '')}&placa=${encodeURIComponent(documento.vehiculoPlaca || '')}`
  }
  return printData
}

export function PlantillaImpresionTUC({ documento, onClose }) {
  if (!documento) return null

  const isTuc = documento.tipoDocumento === 'TARJETA_OPERATIVIDAD'
  const isCursoVial = documento.tipoDocumento === 'CURSO_VIAL'
  const isCerticav = documento.tipoDocumento === 'CERTICAV'
  const isSoat = documento.tipoDocumento === 'SOAT'

  const printData = datosImpresionDocumento(documento)

  const previewContainerRef = React.useRef(null)

  React.useEffect(() => {
    if (previewContainerRef.current) {
      previewContainerRef.current.scrollTop = 0
    }
  }, [documento])

  const handlePrint = () => {
    window.scrollTo(0, 0)
    const scrollContainers = document.querySelectorAll('.overflow-y-auto')
    scrollContainers.forEach(c => { c.scrollTop = 0 })
    setTimeout(() => {
      window.print()
    }, 50)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-enter">
      <div className="w-full max-w-4xl bg-white dark:bg-[#1C2438] rounded-3xl shadow-2xl border border-slate-200 dark:border-[var(--border)] overflow-hidden my-auto">

        {/* Header estilo /personas */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 py-3.5 dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-[var(--bg-subtle)] dark:text-slate-300">
              <Icon name="document" className="size-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  {isTuc && 'Tarjeta de Operatividad (TUC)'}
                  {isCursoVial && 'Carnet de Seguridad Vial'}
                  {isCerticav && 'Ficha Oficial CertiCAV'}
                  {isSoat && 'Constancia de Registro SOAT'}
                </h3>
                {documento.codigo && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-600 dark:bg-[var(--bg-subtle)] dark:text-slate-300">
                    {documento.codigo}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Subgerencia de Tránsito y Transporte • Formato Oficial
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition cursor-pointer active:scale-95 shadow-xs"
            >
              <Icon name="print" className="size-4" />
              <span>{isSoat ? 'Imprimir Constancia SOAT' : 'Imprimir Documento'}</span>
            </button>

            <BotonCerrarModal onClick={onClose} title="Cerrar previsualización" />
          </div>
        </div>

        {/* Contenido con Scroll de previsualización en pantalla */}
        <div ref={previewContainerRef} className="p-6 max-h-[75vh] overflow-y-auto bg-slate-100 dark:bg-[var(--bg-subtle)] flex flex-col items-center justify-start gap-4">
          <div className="text-center max-w-lg">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {isTuc && 'Formato Carnet Oficial a 2 Caras (8.5 cm × 5.5 cm) — Anverso y Reverso'}
              {isCursoVial && 'Carnet Horizontal Oficial (8.5 cm × 5.5 cm) — Anverso y Reverso'}
              {isCerticav && 'Formato Oficial Hoja A4 — Ficha de Inspección Técnica con Checklist Mecánico / Eléctrico'}
              {isSoat && 'Formato Oficial Hoja A4 — Constancia Municipal de Registro y Vigencia SOAT'}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Al pulsar "Imprimir", el sistema aísla exclusivamente el contenedor <code className="font-mono text-emerald-600 dark:text-emerald-400">#seccion-impresion</code> garantizando 1 sola hoja limpia.
            </p>
          </div>

          {/* Renderizado del componente respectivo para pantalla e impresión */}
          {isTuc && <TarjetaOperatividadPrint data={printData} />}
          {isCursoVial && <CarnetCursoVialPrint data={printData} />}
          {isCerticav && <CerticavFichaPrint data={printData} />}
          {isSoat && <SoatConstanciaPrint data={printData} />}

        </div>

      </div>
    </div>
  )
}
