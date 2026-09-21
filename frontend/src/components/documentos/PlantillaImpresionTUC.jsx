import React from 'react'
import { TarjetaOperatividadPrint, CarnetCursoVialPrint, CerticavFichaPrint } from './TarjetaOperatividadPrint'
import './TarjetasImpresion.css'

export function PlantillaImpresionTUC({ documento, onClose }) {
  if (!documento) return null

  const isTuc = documento.tipoDocumento === 'TARJETA_OPERATIVIDAD'
  const isCursoVial = documento.tipoDocumento === 'CURSO_VIAL'
  const isCerticav = documento.tipoDocumento === 'CERTICAV'
  const isSoat = documento.tipoDocumento === 'SOAT'

  const propietarioParts = (documento.propietario || '').trim().split(/\s+/).filter(Boolean)
  const fallbackApellidos = propietarioParts.length > 2 ? propietarioParts.slice(-2).join(' ') : documento.propietario || ''
  const fallbackNombres = propietarioParts.length > 2 ? propietarioParts.slice(0, -2).join(' ') : ''

  const printData = {
    tucNumero: documento.codigo || '',
    codigo: documento.codigo || '',
    asociacion: documento.asociacion || 'INDEPENDIENTE',
    resMunicipal: documento.resMunicipal || '',
    dni: documento.conductorDni || documento.propietarioDni || documento.dni || '',
    conductorDni: documento.conductorDni || documento.propietarioDni || '',
    direccion: documento.direccion || '',
    apellidos: documento.conductorApellidos || fallbackApellidos,
    nombres: documento.conductorNombres || fallbackNombres,
    conductorNombres: documento.conductorNombres || documento.propietario || '',
    numeroLicencia: documento.numeroLicencia || '',
    fotoUrl: documento.fotoConductor || '',
    fotoConductor: documento.fotoConductor || '',
    placa: documento.vehiculoPlaca || '',
    vehiculoPlaca: documento.vehiculoPlaca || '',
    numeroMotor: documento.vehiculoMotor || '',
    vehiculoMotor: documento.vehiculoMotor || '',
    vehiculoMarca: documento.vehiculoMarca || '',
    vehiculoModelo: documento.vehiculoModelo || '',
    fechaExpedicion: documento.fechaExpedicion || '',
    fechaVencimiento: documento.fechaExpiracion || '',
    fechaExpiracion: documento.fechaExpiracion || '',
    numeroInspeccion: documento.numeroInspeccion || '',
    propietario: documento.propietario || '',
    propietarioDni: documento.propietarioDni || '',
    qrUrl: documento.codigoQr || ''
  }

  const handlePrint = () => {
    window.print()
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
                {isSoat && 'Constancia de Registro SOAT Vehicular'}
                <span className="rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono px-2 py-0.5 font-bold">
                  {documento.codigo}
                </span>
              </h3>
              <p className="text-xs text-slate-400">Subgerencia de Tránsito y Transporte · MDJLO</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {!isSoat ? (
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-black text-white hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-600/30 transition-all cursor-pointer active:scale-95"
              >
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Imprimir Documento</span>
              </button>
            ) : (
              <span className="text-[11px] text-amber-400 bg-amber-950/40 border border-amber-800/60 px-3 py-1.5 rounded-xl font-bold">
                Seguro Externo SBS (No emite carnet)
              </span>
            )}

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
              {isSoat && 'Registro de Seguro Obligatorio de Accidentes de Tránsito'}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Al pulsar "Imprimir Documento", el sistema aísla exclusivamente el contenedor <code className="font-mono text-emerald-600 dark:text-emerald-400">#seccion-impresion</code> sin mostrar elementos del navegador.
            </p>
          </div>

          {/* Renderizado del componente respectivo para pantalla e impresión */}
          {isTuc && <TarjetaOperatividadPrint data={printData} />}
          {isCursoVial && <CarnetCursoVialPrint data={printData} />}
          {isCerticav && <CerticavFichaPrint data={printData} />}

          {isSoat && (
            <div className="w-full max-w-md bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-4 shadow-sm">
              <div className="size-14 mx-auto grid place-items-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-2xl font-black">
                🛡️
              </div>
              <div>
                <h4 className="font-black text-slate-800 dark:text-white text-base">Póliza SOAT Registrada</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Aseguradora: <strong className="text-emerald-600">{documento.aseguradora || 'La Positiva'}</strong>
                </p>
                <p className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                  Póliza N°: {documento.codigo}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3 text-xs text-slate-600 dark:text-slate-300 text-left space-y-1 border border-slate-200 dark:border-slate-700">
                <p>• <strong>Vehículo Placa:</strong> {documento.vehiculoPlaca}</p>
                <p>• <strong>Titular:</strong> {documento.propietario}</p>
                <p>• <strong>Vigencia:</strong> {documento.fechaExpedicion} al {documento.fechaExpiracion}</p>
                <p>• <strong>Estado:</strong> <span className="font-bold text-emerald-600">{documento.estado}</span></p>
              </div>
              <p className="text-[11px] text-slate-400 italic">
                Nota oficial: El SOAT es expedido por entidades aseguradoras privadas supervisadas por la SBS. No se emite carnet municipal para este documento; únicamente se registra en el padrón para fiscalización.
              </p>
            </div>
          )}

        </div>

      </div>
    </div>
  )
}

