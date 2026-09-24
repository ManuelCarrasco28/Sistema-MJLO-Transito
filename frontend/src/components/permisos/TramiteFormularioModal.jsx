import React, { useState, useEffect } from 'react'
import { Icon } from '../ui/Icon'
import { sanitizarMensaje, apiFetch } from '../../config/api'
import { showError, showToast } from '../../utils/SwalUtil'
import { BuscadorAdministrados } from './BuscadorAdministrados'
import { generarPlantillaCuerpo } from '../../utils/permisosPlantilla'

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
    zonaCirculacion: 'Anillo Vial - José Leonardo Ortiz',
    ubicacion: 'Paradero Central y Anexos',
    horarioInicio: '16:00:00',
    horarioFin: '05:00:00',
    fechaEmision: new Date().toISOString().slice(0, 10),
    fechaInicioVigencia: new Date().toISOString().slice(0, 10),
    fechaFinVigencia: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    reciboIngresoNumero: '',
    reciboIngresoMonto: '1030.00',
    reciboIngresoFecha: new Date().toISOString().slice(0, 10),
    tonelaje: '03 A 07-TM',
    numeroSeguridad: String(Math.floor(10000 + Math.random() * 90000)),
    recorridoIngreso: 'Av. Balta, Av. Chiclayo, Calle Kennedy',
    recorridoSalida: 'Calle Leguía, Av. México, Av. Sáenz Peña',
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
        asunto: initialData.asunto || 'SE EMITE AUTORIZACION DE CARGA Y DESCARGA',
        zonaCirculacion: initialData.zonaCirculacion || 'Anillo Vial - José Leonardo Ortiz',
        ubicacion: initialData.ubicacion || '',
        horarioInicio: initialData.horarioInicio || '16:00:00',
        horarioFin: initialData.horarioFin || '05:00:00',
        fechaEmision: initialData.fechaEmision || new Date().toISOString().slice(0, 10),
        fechaInicioVigencia: initialData.fechaInicioVigencia || new Date().toISOString().slice(0, 10),
        fechaFinVigencia: initialData.fechaFinVigencia || '',
        reciboIngresoNumero: initialData.reciboIngresoNumero || '',
        reciboIngresoMonto: initialData.reciboIngresoMonto ? String(initialData.reciboIngresoMonto) : '1030.00',
        reciboIngresoFecha: initialData.reciboIngresoFecha || '',
        tonelaje: initialData.tonelaje || '03 A 07-TM',
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
    let monto = '450.00'
    let zona = 'Anillo Vial y Cuadrantes Autorizados - Distrito de José Leonardo Ortiz'
    let horarioInicio = formData.horarioInicio || '06:00:00'
    let horarioFin = formData.horarioFin || '22:00:00'

    if (newTipo === 'CARGA_DESCARGA') {
      asunto = 'SE EMITE AUTORIZACION DE CARGA Y DESCARGA'
      monto = '1030.00'
      zona = 'Anillo Vial y Cuadrante Comercial - José Leonardo Ortiz'
      horarioInicio = '16:00:00'
      horarioFin = '05:00:00'
    } else if (newTipo === 'USO_VIAS') {
      asunto = 'AUTORIZACION PROVISIONAL DE USO DE VIAS'
      monto = '850.00'
      zona = 'Vía pública solicitada - Jurisdicción del Distrito de José Leonardo Ortiz'
      horarioInicio = '08:00:00'
      horarioFin = '18:00:00'
    } else if (newTipo === 'ZONAS_RESERVADAS' || newTipo === 'ZONA_RESERVADA') {
      asunto = 'AUTORIZACIÓN DE ZONA RESERVADA DE ESTACIONAMIENTO EN VÍA PÚBLICA'
      monto = '920.00'
      zona = 'Frontis del establecimiento solicitante - José Leonardo Ortiz'
      horarioInicio = '07:00:00'
      horarioFin = '20:00:00'
    } else {
      // CONTROL_VEHICULAR / OPERACION
      asunto = 'AUTORIZACIÓN MUNICIPAL DE CONTROL VEHICULAR Y CIRCULACIÓN'
      monto = '450.00'
      zona = 'Anillo Vial y Cuadrantes Autorizados - Distrito de José Leonardo Ortiz'
      horarioInicio = '06:00:00'
      horarioFin = '22:00:00'
    }

    const updated = {
      ...formData,
      tipoPermiso: newTipo,
      asunto,
      reciboIngresoMonto: monto,
      zonaCirculacion: zona,
      horarioInicio,
      horarioFin
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
    if (!formData.solicitanteDocumento?.trim()) {
      showError('Validación', 'Por favor ingresa el RUC o DNI del solicitante.')
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
      console.warn('Error guardando borrador temporal:', err)
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
    if (!formData.solicitanteDocumento.trim()) {
      showError('Validación', 'Por favor ingresa el RUC o DNI del solicitante.')
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-enter overflow-y-auto">
      <div className="relative flex flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl dark:border-[var(--border)] dark:bg-[var(--bg-surface)] my-auto w-full max-w-4xl max-h-[92vh] transition-all duration-200">
        
        {/* Cabecera del Modal Estilo /personas */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 py-3.5 dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
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
            <button
              type="button"
              onClick={onClose}
              title="Cerrar ventana"
              className="grid size-8 place-items-center rounded-xl border border-rose-200/80 bg-rose-50/70 text-rose-500 hover:bg-rose-100 hover:text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/50 transition-all active:scale-95 cursor-pointer shadow-xs"
            >
              <Icon name="close" className="size-4" />
            </button>
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
                className="w-full rounded-xl border border-indigo-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 dark:border-[var(--border-strong)] dark:bg-[var(--bg-surface)] dark:text-white"
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
          <div className="rounded-2xl border border-indigo-200 bg-white p-3 dark:border-[var(--border)] dark:bg-[var(--bg-surface)] shadow-2xs">
            <BuscadorAdministrados onSelect={handleSelectAdministrado} />
          </div>

          {/* 2. CLASIFICACIÓN / SELECTOR DE TIPO */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs dark:border-[var(--border)] dark:bg-[var(--bg-surface)] space-y-2">
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
                    : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-[var(--border)] dark:bg-[var(--bg-surface)] dark:text-slate-400 hover:border-slate-300'
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
                    : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-[var(--border)] dark:bg-[var(--bg-surface)] dark:text-slate-400 hover:border-slate-300'
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
                    : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-[var(--border)] dark:bg-[var(--bg-surface)] dark:text-slate-400 hover:border-slate-300'
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
                    : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-[var(--border)] dark:bg-[var(--bg-surface)] dark:text-slate-400 hover:border-slate-300'
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
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs dark:border-[var(--border)] dark:bg-[var(--bg-surface)] space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-[var(--border)] pb-1.5 flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-indigo-600"></span>
              <span>Datos del Solicitante, Vehículo y Expediente</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {/* Administrado / Razón Social */}
              <div className="lg:col-span-2">
                <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                  Razón Social o Administrado *
                </label>
                <input
                  type="text"
                  name="solicitanteNombre"
                  value={formData.solicitanteNombre}
                  onChange={handleInputChange}
                  required
                  placeholder="Ej. ASOCIACIÓN DE TRANSPORTISTAS..."
                  className="w-full rounded-xl border border-slate-300 dark:border-[var(--border-strong)] bg-white dark:bg-[var(--bg-surface)] px-3 py-2 font-bold outline-none focus:border-indigo-500"
                />
              </div>

              {/* Documento RUC / DNI */}
              <div>
                <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                  RUC / DNI *
                </label>
                <input
                  type="text"
                  name="solicitanteDocumento"
                  value={formData.solicitanteDocumento}
                  onChange={handleInputChange}
                  required
                  placeholder="20601234561 o 47589632"
                  className="w-full rounded-xl border border-slate-300 dark:border-[var(--border-strong)] bg-white dark:bg-[var(--bg-surface)] px-3 py-2 font-mono font-bold outline-none focus:border-indigo-500"
                />
              </div>

              {/* Representante Legal */}
              <div>
                <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                  Representante Legal
                </label>
                <input
                  type="text"
                  name="representanteLegal"
                  value={formData.representanteLegal}
                  onChange={handleInputChange}
                  placeholder="Nombres del titular o apoderado"
                  className="w-full rounded-xl border border-slate-300 dark:border-[var(--border-strong)] bg-white dark:bg-[var(--bg-surface)] px-3 py-2 outline-none focus:border-indigo-500"
                />
              </div>

              {/* Vehículo / Placa */}
              <div>
                <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                  Vehículo / Placa
                </label>
                <input
                  type="text"
                  name="vehiculoPlaca"
                  value={formData.vehiculoPlaca}
                  onChange={(e) => setFormData({ ...formData, vehiculoPlaca: e.target.value.toUpperCase() })}
                  placeholder="ABC-123 O FLOTA"
                  className="w-full rounded-xl border border-slate-300 dark:border-[var(--border-strong)] bg-white dark:bg-[var(--bg-surface)] px-3 py-2 font-mono uppercase font-bold outline-none focus:border-indigo-500"
                />
              </div>

              {/* Expediente UTD */}
              <div>
                <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                  Expediente UTD / SISGEDO
                </label>
                <input
                  type="text"
                  name="expediente"
                  value={formData.expediente}
                  onChange={handleInputChange}
                  placeholder="EXP-2026-00451"
                  className="w-full rounded-xl border border-slate-300 dark:border-[var(--border-strong)] bg-white dark:bg-[var(--bg-surface)] px-3 py-2 font-mono outline-none focus:border-indigo-500"
                />
              </div>

              {/* N° Autorización / Resolución */}
              <div>
                <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                  N° Autorización / Resolución
                </label>
                <input
                  type="text"
                  name="numeroAutorizacion"
                  value={formData.numeroAutorizacion}
                  onChange={handleInputChange}
                  placeholder="Generado automáticamente si se deja vacío"
                  className="w-full rounded-xl border border-slate-300 dark:border-[var(--border-strong)] bg-white dark:bg-[var(--bg-surface)] px-3 py-2 font-mono outline-none focus:border-indigo-500"
                />
              </div>

              {/* Zona de Circulación */}
              <div>
                <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                  Zona de Circulación / Cuadrante
                </label>
                <input
                  type="text"
                  name="zonaCirculacion"
                  value={formData.zonaCirculacion}
                  onChange={handleInputChange}
                  placeholder="Anillo Vial - Distrito de José Leonardo Ortiz"
                  className="w-full rounded-xl border border-slate-300 dark:border-[var(--border-strong)] bg-white dark:bg-[var(--bg-surface)] px-3 py-2 outline-none focus:border-indigo-500"
                />
              </div>

              {/* Horario */}
              <div>
                <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                  Horario Autorizado
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    name="horarioInicio"
                    value={formData.horarioInicio}
                    onChange={handleInputChange}
                    placeholder="16:00:00"
                    className="w-full rounded-xl border border-slate-300 dark:border-[var(--border-strong)] bg-white dark:bg-[var(--bg-surface)] px-2.5 py-2 font-mono text-center outline-none focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    name="horarioFin"
                    value={formData.horarioFin}
                    onChange={handleInputChange}
                    placeholder="05:00:00"
                    className="w-full rounded-xl border border-slate-300 dark:border-[var(--border-strong)] bg-white dark:bg-[var(--bg-surface)] px-2.5 py-2 font-mono text-center outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Recibo TUPA */}
              <div>
                <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                  N° Recibo de Pago
                </label>
                <input
                  type="text"
                  name="reciboIngresoNumero"
                  value={formData.reciboIngresoNumero}
                  onChange={handleInputChange}
                  placeholder="REC-2026-00006"
                  className="w-full rounded-xl border border-slate-300 dark:border-[var(--border-strong)] bg-white dark:bg-[var(--bg-surface)] px-3 py-2 font-mono outline-none focus:border-indigo-500"
                />
              </div>

              {/* Monto TUPA */}
              <div>
                <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                  Monto Pagado (S/)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="reciboIngresoMonto"
                  value={formData.reciboIngresoMonto}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-300 dark:border-[var(--border-strong)] bg-white dark:bg-[var(--bg-surface)] px-3 py-2 font-mono font-bold outline-none focus:border-indigo-500"
                />
              </div>

              {/* Vigencia Hasta */}
              <div>
                <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                  Vigencia Hasta
                </label>
                <input
                  type="date"
                  name="fechaFinVigencia"
                  value={formData.fechaFinVigencia}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-300 dark:border-[var(--border-strong)] bg-white dark:bg-[var(--bg-surface)] px-3 py-2 outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Barra de Navegación Inferior */}
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-[var(--border-strong)] dark:text-slate-300 dark:hover:bg-[var(--bg-subtle)] transition cursor-pointer"
            >
              Cancelar
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-[var(--border-strong)] bg-slate-100 dark:bg-[var(--bg-subtle)] px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer disabled:opacity-50"
                title="Guardar directamente con la plantilla predeterminada"
              >
                <span>Guardar directamente</span>
              </button>

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2 text-xs font-black text-white shadow-md shadow-indigo-600/25 transition active:scale-95 cursor-pointer hover:from-indigo-500 hover:to-violet-500"
                title="Abrir editor de resolución en una segunda ventana emergente amplia"
              >
                <span>Continuar a Redacción de Resolución (Cuerpo Oficial)</span>
                <span className="text-sm font-bold">↗</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
export default TramiteFormularioModal
