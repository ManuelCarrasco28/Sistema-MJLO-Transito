import React, { useState, useEffect } from 'react'
import { fechaLocalActual, fechaLocalMasDias } from '../../utils/calendarioCurso'
import { normalizarPlaca } from '../../utils/formatters'
import { Icon } from '../ui/Icon'
import { FloatingInput } from '../ui/FormInputs'
import { sanitizarMensaje, apiFetch } from '../../config/api'
import { showError, showToast } from '../../utils/SwalUtil'
import { BuscadorAdministrados } from './BuscadorAdministrados'
import { generarPlantillaCuerpo } from '../../utils/permisosPlantilla'
import { BotonCancelar, BotonCerrarModal, BotonGuardar } from '../ui/ModalControls'

export function TramiteFormularioModal({
  isOpen,
  onClose,
  initialData = null,
  onSave,
  tramitesDisponibles = []
}) {
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
    horarioInicio: '',
    horarioFin: '',
    fechaEmision: fechaLocalActual(),
    fechaInicioVigencia: fechaLocalActual(),
    fechaFinVigencia: fechaLocalMasDias(365),
    reciboIngresoNumero: '',
    reciboIngresoMonto: '',
    reciboIngresoFecha: fechaLocalActual(),
    tonelaje: '',
    numeroSeguridad: String(Math.floor(10000 + Math.random() * 90000)),
    recorridoIngreso: '',
    recorridoSalida: '',
    flotaPlacas: '',
    observaciones: '',
    contenido: '',
    estado: 'VIGENTE'
  }

  const [formData, setFormData] = useState(initialFormState)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Carga o reseteo de datos al abrir (soporta datos existentes o borrador devuelto de la segunda ventana)
  useEffect(() => {
    if (!isOpen) return

    if (initialData && (initialData.id || initialData.solicitanteNombre || initialData.solicitanteDocumento)) {
      setFormData({
        id: initialData.id || null,
        tipoPermiso: initialData.tipoPermiso || 'CARGA_DESCARGA',
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
        reciboIngresoMonto: initialData.reciboIngresoMonto ? String(initialData.reciboIngresoMonto) : '',
        reciboIngresoFecha: initialData.reciboIngresoFecha || '',
        tonelaje: initialData.tonelaje || '',
        numeroSeguridad: initialData.numeroSeguridad || String(Math.floor(10000 + Math.random() * 90000)),
        recorridoIngreso: initialData.recorridoIngreso || '',
        recorridoSalida: initialData.recorridoSalida || '',
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

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleTipoChange = (newTipo) => {
    let asunto = 'AUTORIZACIÓN MUNICIPAL OFICIAL'
    let monto = '450'

    if (newTipo === 'CARGA_DESCARGA') {
      asunto = 'SE EMITE AUTORIZACION DE CARGA Y DESCARGA'
      monto = '1030'
    } else if (newTipo === 'USO_VIAS') {
      asunto = 'AUTORIZACION PROVISIONAL DE USO DE VIAS'
      monto = '850'
    } else if (newTipo === 'ZONAS_RESERVADAS' || newTipo === 'ZONA_RESERVADA') {
      asunto = 'AUTORIZACIÓN DE ZONA RESERVADA DE ESTACIONAMIENTO EN VÍA PÚBLICA'
      monto = '920'
    } else {
      // CONTROL_VEHICULAR / OPERACION
      asunto = 'AUTORIZACIÓN MUNICIPAL DE CONTROL VEHICULAR Y CIRCULACIÓN'
      monto = '450'
    }

    const updated = {
      ...formData,
      tipoPermiso: newTipo,
      asunto,
      reciboIngresoMonto: formData.reciboIngresoMonto || monto
    }
    updated.contenido = generarPlantillaCuerpo(updated)
    setFormData(updated)
  }

  const handleSelectAdministrado = (item) => {
    const updated = {
      ...formData,
      solicitanteNombre: item.nombre || formData.solicitanteNombre,
      solicitanteDocumento: item.documento || formData.solicitanteDocumento,
      representanteLegal: item.representanteLegal || formData.representanteLegal,
      vehiculoPlaca: item.placa || formData.vehiculoPlaca,
      expediente: item.expediente || formData.expediente,
      referenciaSisgedo: item.expediente || formData.referenciaSisgedo,
      reciboIngresoNumero: item.reciboNumero || formData.reciboIngresoNumero,
      reciboIngresoMonto: item.reciboMonto ? String(item.reciboMonto) : formData.reciboIngresoMonto,
      reciboIngresoFecha: item.reciboFecha || formData.reciboIngresoFecha,
      tramiteId: item.tramiteId || formData.tramiteId
    }
    updated.contenido = generarPlantillaCuerpo(updated)
    setFormData(updated)
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

    const width = Math.min(1380, window.screen.availWidth - 40)
    const height = Math.min(920, window.screen.availHeight - 60)
    const left = Math.max(0, Math.round((window.screen.availWidth - width) / 2))
    const top = Math.max(0, Math.round((window.screen.availHeight - height) / 2))

    const targetUrl = effectiveId
      ? `/permisos-formulario?id=${effectiveId}&draft=1&screen=CUERPO`
      : `/permisos-formulario?draft=1&screen=CUERPO`

    const popup = window.open(
      targetUrl,
      'MJLO_Redaccion_Resolucion',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=no,toolbar=no,menubar=no`
    )

    if (popup) {
      popup.focus()
      showToast('Abriendo segunda ventana para redacción de resolución...')
      onClose()
    } else {
      showError('Ventana bloqueada', 'Por favor habilita las ventanas emergentes en tu navegador para continuar a la redacción.')
    }
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
                <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                  {formData.id ? 'Editar Autorización Municipal' : 'Nueva Autorización Municipal'}
                </h3>
                <span className="shrink-0 rounded-full font-mono text-[10px] font-bold px-2 py-0.5 border border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
                  {formData.numeroAutorizacion || 'Borrador'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Subgerencia de Tránsito, Transporte y Seguridad Vial • Trámite Oficial
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <BotonCerrarModal onClick={onClose} title="Cerrar ventana" />
          </div>
        </div>

        {/* FORMULARIO DE DATOS DEL TRÁMITE */}
        <form onSubmit={handleContinuarRedaccionSegundaVentana} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs">
          {/* Opcional: Vincular con Trámite / Expediente Previo */}
          {!formData.id && tramitesDisponibles.length > 0 && (
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-3 dark:border-[var(--border)] dark:bg-indigo-950/30">
              <label className="mb-1 block font-extrabold uppercase tracking-wider text-indigo-900 dark:text-indigo-200 text-xs">
                Vincular con Trámite / Mesa de Partes Existente (Opcional)
              </label>
              <select
                className="w-full rounded-xl border border-indigo-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 dark:border-[var(--border-strong)] dark:bg-[#1C2438] dark:text-white"
                onChange={(e) => {
                  const tId = Number(e.target.value)
                  if (!tId) return
                  const t = tramitesDisponibles.find((item) => item.id === tId)
                  if (t) {
                    const updated = {
                      ...formData,
                      tramiteId: t.id,
                      solicitanteNombre: t.persona?.razonSocial || `${t.persona?.nombres || ''} ${t.persona?.apellidos || ''}`.trim() || formData.solicitanteNombre,
                      solicitanteDocumento: t.persona?.numeroDocumento || formData.solicitanteDocumento,
                      representanteLegal: t.persona?.representanteLegal || formData.representanteLegal,
                      expediente: t.numeroExpediente || formData.expediente,
                      referenciaSisgedo: t.numeroExpediente || formData.referenciaSisgedo,
                      reciboIngresoNumero: t.reciboNumero || formData.reciboIngresoNumero,
                      reciboIngresoMonto: t.reciboMonto ? String(t.reciboMonto) : formData.reciboIngresoMonto,
                      reciboIngresoFecha: t.reciboFecha || formData.reciboIngresoFecha
                    }
                    setFormData(updated)
                  }
                }}
              >
                <option value="">-- Seleccionar trámite de mesa de partes --</option>
                {tramitesDisponibles.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.numeroExpediente} • {t.persona?.razonSocial || `${t.persona?.nombres || ''} ${t.persona?.apellidos || ''}`.trim()} ({t.tipoProcedimiento?.nombre || 'TUPA'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 1. BUSCADOR INTELIGENTE EN BASE DE DATOS */}
          <div className="rounded-2xl border border-indigo-200 bg-white p-3 dark:border-[var(--border)] dark:bg-[#1C2438] shadow-2xs">
            <BuscadorAdministrados onSelect={handleSelectAdministrado} />
          </div>

          {/* 2. CLASIFICACIÓN / SELECTOR DE TIPO */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs dark:border-[var(--border)] dark:bg-[#1C2438] space-y-2">
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Clasificación / Tipo de Permiso *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => handleTipoChange('CONTROL_VEHICULAR')}
                className={`p-3 rounded-xl border-2 text-left transition cursor-pointer flex flex-col justify-between ${
                  formData.tipoPermiso === 'CONTROL_VEHICULAR' || formData.tipoPermiso === 'OPERACION'
                    ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 shadow-xs ring-1 ring-indigo-500/20'
                    : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-[var(--border)] dark:bg-[#1C2438] dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-xs">Control Vehicular</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                    S/ 450
                  </span>
                </div>
                <p className="text-[10px] opacity-80 leading-snug">
                  Permiso municipal para verificación técnica y circulación autorizada de unidades.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleTipoChange('CARGA_DESCARGA')}
                className={`p-3 rounded-xl border-2 text-left transition cursor-pointer flex flex-col justify-between ${
                  formData.tipoPermiso === 'CARGA_DESCARGA'
                    ? 'border-sky-500 bg-sky-50/80 dark:bg-sky-950/40 text-sky-950 dark:text-sky-200 shadow-xs ring-1 ring-sky-500/20'
                    : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-[var(--border)] dark:bg-[#1C2438] dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-xs">Carga y Descarga</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-900 text-sky-800 dark:text-sky-200">
                    S/ 1030
                  </span>
                </div>
                <p className="text-[10px] opacity-80 leading-snug">
                  Horario nocturno / madrugada (16:00 a 05:00 hrs) para abastecimiento comercial.
                </p>
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
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-xs">Uso de Vías</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                    S/ 850
                  </span>
                </div>
                <p className="text-[10px] opacity-80 leading-snug">
                  Ocupación provisional de calzada/acera para mudanzas, eventos u obras civiles.
                </p>
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
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-xs">Zonas Reservadas</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                    S/ 920
                  </span>
                </div>
                <p className="text-[10px] opacity-80 leading-snug">
                  Reserva exclusiva de estacionamiento en frontis para entidades y establecimientos.
                </p>
              </button>
            </div>
          </div>

          {/* 3. CAMPOS DE DATOS GENERALES */}
          <fieldset className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 dark:border-[var(--border)] dark:bg-slate-900/50 shadow-xs space-y-3">
            <legend className="text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-white px-1 mb-2 flex items-center gap-2">
              <span className="size-2 rounded-full bg-slate-900 dark:bg-white" />
              Datos del Solicitante, Vehículo y Expediente
            </legend>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {/* Administrado / Razón Social */}
              <div className="sm:col-span-2 lg:col-span-2">
                <FloatingInput
                  id="perm_solicitante_nombre"
                  label="Razón Social o Administrado"
                  required
                  value={formData.solicitanteNombre}
                  onChange={(e) => setFormData({ ...formData, solicitanteNombre: e.target.value })}
                  inputClassName="font-bold"
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
                  inputClassName="font-mono font-bold"
                />
              </div>

              {/* Representante Legal */}
              <div>
                <FloatingInput
                  id="perm_representante_legal"
                  label="Representante Legal"
                  value={formData.representanteLegal}
                  onChange={(e) => setFormData({ ...formData, representanteLegal: e.target.value })}
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
                  label="Expediente UTD / SISGEDO"
                  value={formData.expediente}
                  onChange={(e) => setFormData({ ...formData, expediente: e.target.value })}
                  inputClassName="font-mono"
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
                  value={formData.horarioInicio}
                  onChange={(e) => setFormData({ ...formData, horarioInicio: e.target.value })}
                  inputClassName="font-mono text-center"
                />
                <FloatingInput
                  id="perm_horario_fin"
                  label="Horario Fin"
                  value={formData.horarioFin}
                  onChange={(e) => setFormData({ ...formData, horarioFin: e.target.value })}
                  inputClassName="font-mono text-center"
                />
              </div>

              {/* Recibo TUPA */}
              <div>
                <FloatingInput
                  id="perm_recibo_numero"
                  label="N° Recibo de Pago"
                  value={formData.reciboIngresoNumero}
                  onChange={(e) => setFormData({ ...formData, reciboIngresoNumero: e.target.value })}
                  inputClassName="font-mono font-bold"
                />
              </div>

              {/* Monto TUPA */}
              <div>
                <FloatingInput
                  id="perm_recibo_monto"
                  label="Monto Pagado (S/)"
                  type="number"
                  step="0.01"
                  value={formData.reciboIngresoMonto}
                  onChange={(e) => setFormData({ ...formData, reciboIngresoMonto: e.target.value })}
                  inputClassName="font-mono font-bold"
                />
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

              <BotonGuardar className="inline-flex items-center justify-center gap-2">
                <span>Continuar a Redacción de Resolución (Cuerpo Oficial)</span>
                <span className="text-sm font-bold">↗</span>
              </BotonGuardar>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
export default TramiteFormularioModal
