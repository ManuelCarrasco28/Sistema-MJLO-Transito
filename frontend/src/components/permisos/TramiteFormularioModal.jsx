import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fechaLocalActual } from '../../utils/calendarioCurso'
import { normalizarPlaca, formatFecha } from '../../utils/formatters'
import { Icon } from '../ui/Icon'
import { FloatingInput } from '../ui/FormInputs'
import { sanitizarMensaje, apiFetch } from '../../config/api'
import { showError, showToast, showConfirm } from '../../utils/SwalUtil'
import { BuscadorAdministrados } from './BuscadorAdministrados'
import { generarPlantillaCuerpo } from '../../utils/permisosPlantilla'
import { BotonCancelar, BotonCerrarModal, BotonGuardar } from '../ui/ModalControls'

const formatearMontoVinculado = (valor) => (
  valor === null || valor === undefined || valor === '' ? '' : String(valor)
)

export function TramiteFormularioModal({
  isOpen,
  onClose,
  initialData = null,
  onSave
}) {
  const navigate = useNavigate()
  const initialFormState = {
    id: null,
    tipoPermiso: 'CARGA_DESCARGA',
    numeroAutorizacion: '',
    vehiculoPlaca: '',
    solicitanteNombre: '',
    solicitanteDocumento: '',
    representanteLegal: '',
    expediente: '',
    registroNumero: '',
    referenciaSisgedo: '',
    asunto: 'SE EMITE AUTORIZACION DE CARGA Y DESCARGA',
    zonaCirculacion: '',
    ubicacion: '',
    // Horario inicial razonable para una nueva solicitud de carga y descarga.
    horarioInicio: '16:00',
    horarioFin: '05:00',
    fechaEmision: fechaLocalActual(),
    fechaInicioVigencia: fechaLocalActual(),
    fechaFinVigencia: '',
    reciboIngresoNumero: '',
    reciboIngresoMonto: '',
    reciboIngresoFecha: '',
    tonelaje: '',
    numeroSeguridad: String(Math.floor(10000 + Math.random() * 90000)),
    recorridoIngreso: '',
    flotaPlacas: '',
    observaciones: '',
    contenido: '',
    estado: 'VIGENTE'
  }

  const [formData, setFormData] = useState(initialFormState)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    if (initialData && (initialData.id || initialData.solicitanteNombre || initialData.solicitanteDocumento)) {
      setFormData({
        id: initialData.id || null,
        tipoPermiso: initialData.tipoPermiso === 'ZONA_RESERVADA' ? 'ZONAS_RESERVADAS' : (initialData.tipoPermiso || 'CARGA_DESCARGA'),
        numeroAutorizacion: initialData.numeroAutorizacion || '',
        vehiculoPlaca: initialData.vehiculoPlaca || '',
        solicitanteNombre: initialData.solicitanteNombre || initialData.solicitante || '',
        solicitanteDocumento:
          initialData.solicitanteDocumento ||
          initialData.solicitanteDoc ||
          initialData.solicitanteRuc ||
          initialData.solicitanteDni ||
          '',
        representanteLegal: initialData.representanteLegal || '',
        expediente: initialData.expediente || initialData.expedienteNumero || '',
        registroNumero: initialData.registroNumero || '',
        referenciaSisgedo: initialData.referenciaSisgedo || '',
        asunto: initialData.asunto || '',
        zonaCirculacion: initialData.zonaCirculacion || '',
        ubicacion: initialData.ubicacion || '',
        horarioInicio: initialData.horarioInicio || '',
        horarioFin: initialData.horarioFin || '',
        fechaEmision: initialData.fechaEmision || fechaLocalActual(),
        fechaInicioVigencia: initialData.fechaInicioVigencia || fechaLocalActual(),
        fechaFinVigencia: initialData.fechaFinVigencia || '',
        reciboIngresoNumero: initialData.reciboIngresoNumero || '',
        reciboIngresoMonto: formatearMontoVinculado(initialData.reciboIngresoMonto),
        reciboIngresoFecha: initialData.reciboIngresoFecha || '',
        tonelaje: initialData.tonelaje || '',
        numeroSeguridad: initialData.numeroSeguridad || String(Math.floor(10000 + Math.random() * 90000)),
        recorridoIngreso: initialData.recorridoIngreso || '',
        flotaPlacas: initialData.flotaPlacas || '',
        observaciones: initialData.observaciones || '',
        contenido: initialData.contenido || generarPlantillaCuerpo(initialData),
        estado: initialData.estado || 'VIGENTE'
      })
    } else {
      const defaultData = {
        ...initialFormState,
        numeroSeguridad: String(Math.floor(10000 + Math.random() * 90000))
      }
      defaultData.contenido = generarPlantillaCuerpo(defaultData)
      setFormData(defaultData)
    }
  }, [isOpen, initialData])

  // Escuchar si el documento es guardado en la segunda ventana o si vuelve con borrador
  useEffect(() => {
    if (!isOpen) return
    const handleMsg = (e) => {
      if (e.origin !== window.location.origin) return
      if (e.data?.type === 'PERMISO_GUARDADO') {
        if (onSave) onSave()
        onClose()
      } else if (e.data?.type === 'VOLVER_A_DATOS_MODAL' && e.data?.draft) {
        setFormData((prev) => ({
          ...prev,
          ...e.data.draft,
          id: e.data.draft.id || prev.id || initialData?.id || null
        }))
      }
    }
    const handleStorage = (e) => {
      if (e.key === 'mjlo_permisos_updated') {
        if (onSave) onSave()
        onClose()
      }
    }
    window.addEventListener('message', handleMsg)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener('message', handleMsg)
      window.removeEventListener('storage', handleStorage)
    }
  }, [isOpen, onSave, onClose, initialData])

  // Con un trámite o administrado vinculado, estos datos salen de sus documentos y no se digitan
  const vinculado = Boolean(formData.tramiteId)
  const claseDeterminado = 'read-only:bg-slate-100 read-only:text-slate-500 read-only:cursor-default dark:read-only:bg-slate-800/60 dark:read-only:text-slate-400'

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleTipoChange = async (newTipo) => {
    const tipo = newTipo === 'ZONA_RESERVADA' ? 'ZONAS_RESERVADAS' : newTipo
    if (!['CARGA_DESCARGA', 'USO_VIAS', 'ZONAS_RESERVADAS'].includes(tipo) || tipo === formData.tipoPermiso) return
    const vinculoIncompatible = Boolean(formData.tramiteId && tipo !== formData.tipoPermiso)
    const asuntoPorTipo = {
      CARGA_DESCARGA: 'SE EMITE AUTORIZACION DE CARGA Y DESCARGA',
      USO_VIAS: 'AUTORIZACION PROVISIONAL DE USO DE VIAS',
      ZONAS_RESERVADAS: 'AUTORIZACIÓN DE ZONA RESERVADA DE ESTACIONAMIENTO EN VÍA PÚBLICA'
    }
    const horario = !formData.id
      ? (tipo === 'CARGA_DESCARGA'
          ? { horarioInicio: '16:00', horarioFin: '05:00' }
          : { horarioInicio: '00:00', horarioFin: '23:59' })
      : {}
    const updated = {
      ...formData,
      ...horario,
      tipoPermiso: tipo,
      ...(vinculoIncompatible ? { tramiteId: null, reciboIngresoNumero: '', reciboIngresoMonto: '', reciboIngresoFecha: '' } : {}),
      asunto: asuntoPorTipo[tipo]
    }
    updated.contenido = generarPlantillaCuerpo(updated)
    setFormData(updated)
  }

  const handleSelectAdministrado = (item) => {
    if (formData.tramiteId) return
    const updated = {
      ...formData,
      solicitanteNombre: item.nombre || formData.solicitanteNombre,
      solicitanteDocumento: item.documento || formData.solicitanteDocumento,
      representanteLegal: item.representanteLegal || formData.representanteLegal,
      vehiculoPlaca: item.placa || formData.vehiculoPlaca,
      expediente: item.expediente || formData.expediente,
      referenciaSisgedo: item.expediente || formData.referenciaSisgedo,
      reciboIngresoNumero: item.reciboNumero || item.reciboIngresoNumero || '',
      reciboIngresoMonto: formatearMontoVinculado(item.reciboMonto ?? item.reciboIngresoMonto),
      reciboIngresoFecha: item.reciboFecha || item.reciboIngresoFecha || '',
      tramiteId: item.tramiteId || null
    }
    updated.contenido = generarPlantillaCuerpo(updated)
    setFormData(updated)
  }


  const quitarVinculo = async () => {
    if (formData.contenido?.trim()) {
      const confirmation = await showConfirm('Quitar vínculo', 'Se quitará el expediente y el pago. Se conservarán los datos del solicitante; el contenido actual se reemplazará para retirar las referencias al pago.', 'Quitar y regenerar', 'Cancelar')
      if (!confirmation.isConfirmed) return
    }
    setFormData((prev) => {
      const updated = { ...prev, tramiteId: null, reciboIngresoNumero: '', reciboIngresoMonto: '', reciboIngresoFecha: '' }
      updated.contenido = generarPlantillaCuerpo(updated)
      return updated
    })
  }

  // Continuar a redacción abriendo una segunda ventana para mayor comodidad
  const handleContinuarRedaccionSegundaVentana = (e) => {
    if (e && e.preventDefault) e.preventDefault()

    if (!formData.solicitanteNombre?.trim()) {
      showError('Validación', 'Por favor ingresa o selecciona la Razón Social o Administrado antes de continuar.')
      return
    }
    if (!/^\d{8}$|^\d{11}$/.test(formData.solicitanteDocumento?.trim() || '')) {
      showError('Validación', 'El RUC o DNI del solicitante debe tener 8 dígitos (DNI) u 11 dígitos (RUC).')
      return
    }

    const effectiveId = formData.id || initialData?.id || null
    const currentData = {
      ...formData,
      id: effectiveId
    }
    if (!currentData.contenido || currentData.contenido.trim() === '') {
      currentData.contenido = generarPlantillaCuerpo(currentData)
    }

    try {
      sessionStorage.setItem('mjlo_permiso_borrador', JSON.stringify(currentData))
      localStorage.setItem('mjlo_permiso_borrador', JSON.stringify(currentData))
    } catch (err) {
      showError('Almacenamiento local', 'No se pudo guardar el borrador en memoria temporal de su navegador.')
    }

    // La redacción se abre en la misma ventana (el borrador ya quedó guardado en el navegador)
    const targetUrl = effectiveId
      ? `/permisos-formulario?id=${effectiveId}&draft=1&screen=CUERPO`
      : `/permisos-formulario?draft=1&screen=CUERPO`
    onClose()
    navigate(targetUrl)
  }

  // Guardar directamente sin abrir segunda ventana
  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault()

    if (!formData.solicitanteNombre.trim()) {
      showError('Validación', 'Por favor ingresa o selecciona la Razón Social o Administrado.')
      return
    }
    if (!/^\d{8}$|^\d{11}$/.test(formData.solicitanteDocumento.trim())) {
      showError('Validación', 'El RUC o DNI del solicitante debe tener 8 dígitos (DNI) u 11 dígitos (RUC).')
      return
    }

    setIsSubmitting(true)
    try {
      const effectiveId = formData.id || initialData?.id || null
      const isEdit = Boolean(effectiveId)
      const url = isEdit ? `/permisos/${effectiveId}` : '/permisos'
      const method = isEdit ? 'PUT' : 'POST'

      const currentData = {
        ...formData,
        id: effectiveId || undefined
      }
      if (!currentData.contenido || currentData.contenido.trim() === '') {
        currentData.contenido = generarPlantillaCuerpo(currentData)
      }
      if (!isEdit && !currentData.numeroAutorizacion?.trim()) {
        delete currentData.numeroAutorizacion
      }

      const res = await apiFetch(url, {
        method,
        body: currentData
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(Object.values(data.messages || {}).join(' ') || data.message || 'Error al procesar la autorización municipal.')
      }

      showToast(isEdit ? 'Autorización actualizada correctamente' : 'Autorización emitida correctamente')
      if (onSave) onSave()
      onClose()
    } catch (err) {
      showError('Error', sanitizarMensaje(err.message, 'No se pudo guardar la autorización.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-enter overflow-y-auto" onMouseDown={(e) => { if (e.target === e.currentTarget) e.currentTarget.dataset.downOnOverlay = "1" }} onMouseUp={(e) => { if (e.target === e.currentTarget && e.currentTarget.dataset.downOnOverlay === "1") onClose(); e.currentTarget.dataset.downOnOverlay = "" }}>
      <div className="relative flex flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl dark:border-[var(--border)] dark:bg-[#1C2438] my-auto w-full max-w-4xl max-h-[92vh] transition-all duration-200">

        {/* Cabecera del Modal Estilo /personas */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 py-3.5 dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-[var(--bg-subtle)] dark:text-slate-300">
              <Icon name="routePermit" className="size-4" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white min-w-0 break-words">
                  {formData.id ? 'Editar Autorización Municipal' : 'Nueva Autorización Municipal'}
                </h3>
                <span className="shrink-0 rounded-full font-mono text-[10px] font-bold px-2 py-0.5 border border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
                  {formData.numeroAutorizacion || 'Borrador'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 min-w-0 break-words">
                  Tránsito y Transporte • Trámite Oficial
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <BotonCerrarModal onClick={onClose} title="Cerrar ventana" />
          </div>
        </div>

        {/* FORMULARIO DE DATOS DEL TRÁMITE */}
        <form onSubmit={handleContinuarRedaccionSegundaVentana} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs">

          {/* 1. BUSCADOR INTELIGENTE EN BASE DE DATOS */}
          {!vinculado && <div className="rounded-2xl border border-indigo-200 bg-white p-3 dark:border-[var(--border)] dark:bg-[#1C2438] shadow-2xs"><BuscadorAdministrados onSelect={handleSelectAdministrado} /></div>}

          {/* 2. CLASIFICACIÓN / SELECTOR DE TIPO */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs dark:border-[var(--border)] dark:bg-[#1C2438] space-y-2">
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Clasificación / Tipo de Permiso
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">

              <button
                type="button"
                onClick={() => handleTipoChange('CARGA_DESCARGA')}
                className={`p-3 rounded-xl border-2 text-left transition cursor-pointer flex flex-col justify-between ${
                  formData.tipoPermiso === 'CARGA_DESCARGA'
                    ? 'border-sky-500 bg-sky-50/80 dark:bg-sky-950/40 text-sky-950 dark:text-sky-200 shadow-xs ring-1 ring-sky-500/20'
                    : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-[var(--border)] dark:bg-[#1C2438] dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <span className="font-black text-xs">Carga y Descarga</span>
              </button>

              <button
                type="button"
                onClick={() => handleTipoChange('USO_VIAS')}
                className={`p-3 rounded-xl border-2 text-left transition cursor-pointer flex flex-col justify-between ${
                  formData.tipoPermiso === 'USO_VIAS'
                    ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 shadow-xs ring-1 ring-amber-500/20'
                    : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-[var(--border)] dark:bg-[#1C2438] dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <span className="font-black text-xs">Uso de Vías</span>
              </button>

              <button
                type="button"
                onClick={() => handleTipoChange('ZONAS_RESERVADAS')}
                className={`p-3 rounded-xl border-2 text-left transition cursor-pointer flex flex-col justify-between ${
                  formData.tipoPermiso === 'ZONAS_RESERVADAS' || formData.tipoPermiso === 'ZONA_RESERVADA'
                    ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 shadow-xs ring-1 ring-emerald-500/20'
                    : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-[var(--border)] dark:bg-[#1C2438] dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <span className="font-black text-xs">Zonas Reservadas</span>
              </button>
            </div>
          </div>

          {/* 3. CAMPOS DE DATOS GENERALES */}
          <fieldset className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 dark:border-[var(--border)] dark:bg-slate-900/50 shadow-xs space-y-3">
            <legend className="text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-white px-1 mb-2 flex items-center gap-2">
              <span className="size-2 rounded-full bg-slate-900 dark:bg-white" />
              Datos del Solicitante, Vehículo y Expediente
            </legend>
            {vinculado && (
              <p className="flex items-center justify-between gap-2 rounded-xl bg-indigo-50 px-3 py-1.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                <span>Expediente {formData.expediente || 'sin número'} vinculado. Solicitante: {formData.solicitanteNombre}.</span>
                <button type="button" onClick={quitarVinculo} className="shrink-0 cursor-pointer font-bold underline">Quitar vínculo</button>
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {/* Administrado / Razón Social */}
              <div className="sm:col-span-2 lg:col-span-2">
                <FloatingInput
                  id="perm_solicitante_nombre"
                  label="Razón Social o Administrado"
                  required
                  value={formData.solicitanteNombre}
                  onChange={(e) => setFormData({ ...formData, solicitanteNombre: e.target.value })}
                  readOnly={vinculado}
                  inputClassName={`font-bold ${claseDeterminado}`}
                />
              </div>

              {/* Documento RUC / DNI */}
              <div>
                <FloatingInput
                  id="perm_solicitante_documento"
                  label="RUC / DNI"
                  required
                  maxLength={15}
                  value={formData.solicitanteDocumento}
                  onChange={(e) => setFormData({ ...formData, solicitanteDocumento: e.target.value })}
                  readOnly={vinculado}
                  inputClassName={`font-mono font-bold ${claseDeterminado}`}
                />
              </div>

              {/* Representante Legal */}
              <div>
                <FloatingInput
                  id="perm_representante_legal"
                  label="Representante Legal"
                  value={formData.representanteLegal}
                  readOnly
                  inputClassName={claseDeterminado}
                  onChange={() => {}}
                />
              </div>

              {/* Vehículo / Placa */}
              <div>
                <FloatingInput
                  id="perm_vehiculo_placa"
                  label="Vehículo / Placa"
                  value={formData.vehiculoPlaca}
                  onChange={(e) => setFormData({ ...formData, vehiculoPlaca: normalizarPlaca(e.target.value) })}
                  inputClassName="font-mono font-bold uppercase"
                />
              </div>

              {/* Expediente UTD */}
              <div>
                <FloatingInput
                  id="perm_expediente"
                  label="N.º de expediente UTD / SISGEDO"
                  value={formData.expediente}
                  onChange={(e) => setFormData({ ...formData, expediente: e.target.value, referenciaSisgedo: e.target.value })}
                  inputClassName={`font-mono ${claseDeterminado}`}
                />
              </div>

              {/* N° Autorización / Resolución */}
              <div>
                <FloatingInput
                  id="perm_numero_autorizacion"
                  label="N° Autorización / Resolución"
                  optional
                  value={formData.numeroAutorizacion}
                  onChange={(e) => setFormData({ ...formData, numeroAutorizacion: e.target.value })}
                  inputClassName="font-mono font-bold"
                />
              </div>

              {/* Zona de Circulación */}
              <div>
                <FloatingInput
                  id="perm_zona_circulacion"
                  label="Zona de Circulación / Cuadrante"
                  value={formData.zonaCirculacion}
                  onChange={(e) => setFormData({ ...formData, zonaCirculacion: e.target.value })}
                />
              </div>

              {/* Horario */}
              <div className="grid grid-cols-2 gap-2">
                <FloatingInput
                  id="perm_horario_inicio"
                  label="Horario Inicio"
                  type="time"
                  value={formData.horarioInicio}
                  onChange={(e) => setFormData({ ...formData, horarioInicio: e.target.value })}
                />
                <FloatingInput
                  id="perm_horario_fin"
                  label="Horario Fin"
                  type="time"
                  value={formData.horarioFin}
                  onChange={(e) => setFormData({ ...formData, horarioFin: e.target.value })}
                />
              </div>

              <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-[var(--border)] dark:bg-slate-900/40">
                <span className="font-bold">Pago vinculado: </span>{formData.reciboIngresoNumero ? `Recibo ${formData.reciboIngresoNumero}${formData.reciboIngresoMonto !== '' ? ` · S/ ${Number(formData.reciboIngresoMonto).toLocaleString('es-PE', { maximumFractionDigits: 2 })}` : ''}${formData.reciboIngresoFecha ? ` · ${formatFecha(formData.reciboIngresoFecha)}` : ''}` : 'Sin pago vinculado'}
              </div>

              {/* Vigencia Hasta */}
              <div>
                <FloatingInput
                  id="perm_vigencia_hasta"
                  label="Vigencia Hasta"
                  type="date"
                  value={formData.fechaFinVigencia}
                  onChange={(e) => setFormData({ ...formData, fechaFinVigencia: e.target.value })}
                />
              </div>
            </div>
          </fieldset>

          {/* Barra de Navegación Inferior */}
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-[var(--border)]">
            <BotonCancelar onClick={onClose} />

            <div className="flex items-center gap-2">
              <BotonGuardar
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="hidden sm:inline-flex items-center gap-1.5"
              >
                <span>Guardar directamente</span>
              </BotonGuardar>

              <button
                type="submit"
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-1.5 text-xs font-bold text-white transition hover:bg-indigo-700 active:scale-95 dark:bg-indigo-500 dark:hover:bg-indigo-400"
              >
                <span>Continuar a redacción</span>
                <span className="text-sm font-bold">→</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
export default TramiteFormularioModal
