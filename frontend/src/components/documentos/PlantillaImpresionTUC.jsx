import React from 'react'
import { TarjetaOperatividadPrint, CarnetCursoVialPrint, CerticavFichaPrint, SoatConstanciaPrint } from './TarjetaOperatividadPrint'
import './TarjetasImpresion.css'

export function PlantillaImpresionTUC({ documento, onClose }) {
  if (!documento) return null

  const isTuc = documento.tipoDocumento === 'TARJETA_OPERATIVIDAD'
  const isCursoVial = documento.tipoDocumento === 'CURSO_VIAL'
  const isCerticav = documento.tipoDocumento === 'CERTICAV'
  const isSoat = documento.tipoDocumento === 'SOAT'

  const printData = {
    tucNumero: documento.codigo || '',
    codigo: documento.codigo || '',
    transportador: documento.asociacion || 'INDEPENDIENTE',
    asociacion: documento.asociacion || 'INDEPENDIENTE',
    resMunicipal: documento.resMunicipal || 'R.M. N° 045-2024-MDJLO/GSCyT',
    dni: documento.propietarioDni || documento.dni || '45892140',
    conductorDni: documento.conductorDni || documento.propietarioDni || '45892140',
    direccion: documento.direccion || 'CALLE LOS HEROES 450 - JLO',
    apellidos: documento.propietario || documento.conductorNombres || '',
    nombres: '',
    conductorNombres: documento.conductorNombres || documento.propietario || '',
    conductorNombre: documento.conductorNombres || documento.propietario || '',
    conductorLicencia: documento.numeroLicencia || 'B-IIc',
    numeroLicencia: documento.numeroLicencia || 'B-IIc',
    fotoUrl: documento.fotoConductor || '',
    fotoConductor: documento.fotoConductor || '',
    placa: documento.vehiculoPlaca || '',
    vehiculoPlaca: documento.vehiculoPlaca || '',
    numeroMotor: documento.vehiculoMotor || '162FMJ-98214',
    vehiculoMotor: documento.vehiculoMotor || '162FMJ-98214',
    vehiculoMarca: documento.vehiculoMarca || 'WANXIN',
    vehiculoModelo: documento.vehiculoModelo || 'WX-200',
    vehiculoAnio: documento.vehiculoAnio || documento.anioFabricacion || '2022',
    anioFabricacion: documento.vehiculoAnio || documento.anioFabricacion || '2022',
    fecha: documento.fechaExpedicion || documento.fecha || '',
    fechaExpedicion: documento.fechaExpedicion || '',
    fechaVencimiento: documento.fechaExpiracion || '',
    fechaExpiracion: documento.fechaExpiracion || '',
    numeroRegistro: documento.numeroRegistro || documento.numeroInspeccion || documento.codigo || 'INSP-2026-001',
    numeroSerieCerticav: documento.numeroSerieCerticav || documento.codigo || '',
    numeroInspeccion: documento.numeroInspeccion || 'CAV-2026-APROBADO',
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

  const handlePrint = () => {
    window.scrollTo(0, 0)
    const scrollContainers = document.querySelectorAll('.overflow-y-auto')
    scrollContainers.forEach(c => { c.scrollTop = 0 })
    setTimeout(() => {
      window.print()
    }, 50)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-enter">
      <div className="w-full max-w-4xl bg-white dark:bg-[#0f172a] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto">
        
        {/* Cabecera del visualizador */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            </span>
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                {isTuc && 'Tarjeta de Operatividad (TUC) — Impresión Oficial'}
                {isCursoVial && 'Carnet de Seguridad Vial (Curso Vial) — Impresión Oficial'}
                {isCerticav && 'Ficha Oficial CertiCAV (Inspección Técnica en Hoja A4)'}
                {isSoat && 'Constancia Oficial de Registro SOAT (Hoja A4)'}
                <span className="rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono px-2 py-0.5 font-bold">
                  {documento.codigo}
                </span>
              </h3>
              <p className="text-xs text-slate-400">Subgerencia de Tránsito y Transporte · MDJLO</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-black text-white hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-600/30 transition-all cursor-pointer active:scale-95"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>{isSoat ? 'Imprimir Constancia SOAT' : 'Imprimir Documento'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="grid size-8 place-items-center rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Contenido con Scroll de previsualización en pantalla */}
        <div className="p-6 max-h-[75vh] overflow-y-auto bg-slate-100 dark:bg-slate-900/60 flex flex-col items-center justify-center gap-4">
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
