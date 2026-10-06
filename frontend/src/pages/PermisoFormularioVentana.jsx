import React, { useState, useEffect } from 'react'
import { Editor } from '@tinymce/tinymce-react'
import { Icon } from '../components/ui/Icon'
import { FloatingInput } from '../components/ui/FormInputs'
import { sanitizarMensaje, leerMensajeError, apiFetch } from '../config/api'
import { leerBorradorPermiso, guardarBorradorPermiso, limpiarBorradorPermiso, avisarPermisoActualizado } from '../utils/borradorPermiso'
import { showError } from '../utils/SwalUtil'
import { normalizarPlaca } from '../utils/formatters'
import { BuscadorAdministrados } from '../components/permisos/BuscadorAdministrados'
import { generarPlantillaCuerpo } from '../utils/permisosPlantilla'
import { BotonCancelar, BotonGuardar } from '../components/ui/ModalControls'

const TINYMCE_API_KEY =
  import.meta.env.VITE_TINYMCE_API_KEY ||
  'unmcqzdx4e88wfy3gqtlbelk1w21unqt3sl8hlcltd49u0o8'

export function PermisoFormularioVentana() {
  const [searchParams] = useState(() => new URLSearchParams(window.location.search))
  const permitId = searchParams.get('id')
  const draftParam = searchParams.get('draft')
  const screenParam = searchParams.get('screen')

  const initialFormState = {
    id: permitId ? Number(permitId) : null,
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
    fechaEmision: new Date().toISOString().slice(0, 10),
    fechaInicioVigencia: new Date().toISOString().slice(0, 10),
    fechaFinVigencia: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    reciboIngresoNumero: '',
    reciboIngresoMonto: '',
    reciboIngresoFecha: new Date().toISOString().slice(0, 10),
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
  const [activeScreen, setActiveScreen] = useState(() => (screenParam === 'CUERPO' ? 'CUERPO' : 'DATOS'))
  const [isLoading, setIsLoading] = useState(Boolean(permitId && !draftParam))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  // Cargar datos en caso de edición o borrador transferido
  useEffect(() => {
    let draftData = null
    if (draftParam) {
      draftData = leerBorradorPermiso()
    }

    if (!permitId) {
      if (draftData) {
        const cleaned = {
          ...draftData,
          id: null,
          numeroAutorizacion: draftData.id ? '' : (draftData.numeroAutorizacion || '')
        }
        setFormData(cleaned)
      } else {
        const defaultData = {
          ...initialFormState,
          id: null,
          numeroSeguridad: String(Math.floor(10000 + Math.random() * 90000))
        }
        defaultData.contenido = generarPlantillaCuerpo(defaultData)
        setFormData(defaultData)
      }
      setIsLoading(false)
      return
    }

    let cancelled = false
    async function fetchPermit() {
      try {
        setIsLoading(true)
        const res = await apiFetch(`/permisos/${permitId}`)
        if (res.ok) {
          const json = await res.json()
          const p = json.data
          if (!cancelled && p) {
            const merged = {
              id: Number(p.id || permitId),
              tipoPermiso: p.tipoPermiso || 'CARGA_DESCARGA',
              numeroAutorizacion: p.numeroAutorizacion || '',
              vehiculoPlaca: p.vehiculoPlaca || '',
              solicitanteNombre: p.solicitanteNombre || p.solicitante || '',
              solicitanteDocumento: p.solicitanteDocumento || p.solicitanteDoc || p.solicitanteRuc || p.solicitanteDni || '',
              representanteLegal: p.representanteLegal || '',
              expediente: p.expediente || p.expedienteNumero || '',
              registroNumero: p.registroNumero || '',
              referenciaSisgedo: p.referenciaSisgedo || '',
              asunto: p.asunto || 'SE EMITE AUTORIZACION DE CARGA Y DESCARGA',
              zonaCirculacion: p.zonaCirculacion || 'Anillo Vial - José Leonardo Ortiz',
              ubicacion: p.ubicacion || '',
              horarioInicio: p.horarioInicio || '16:00:00',
              horarioFin: p.horarioFin || '05:00:00',
              fechaEmision: p.fechaEmision || new Date().toISOString().slice(0, 10),
              fechaInicioVigencia: p.fechaInicioVigencia || new Date().toISOString().slice(0, 10),
              fechaFinVigencia: p.fechaFinVigencia || '',
              reciboIngresoNumero: p.reciboIngresoNumero || '',
              reciboIngresoMonto: p.reciboIngresoMonto ? String(p.reciboIngresoMonto) : '1030',
              reciboIngresoFecha: p.reciboIngresoFecha || '',
              tonelaje: p.tonelaje || '03 A 07-TM',
              numeroSeguridad: p.numeroSeguridad || String(Math.floor(10000 + Math.random() * 90000)),
              recorridoIngreso: p.recorridoIngreso || '',
              recorridoSalida: p.recorridoSalida || '',
              flotaPlacas: p.flotaPlacas || '',
              observaciones: p.observaciones || '',
              contenido: p.contenido || generarPlantillaCuerpo(p),
              estado: p.estado || 'VIGENTE'
            }

            if (draftData) {
              Object.assign(merged, draftData)
              merged.id = Number(p.id || permitId)
            }

            setFormData(merged)
          }
        } else if (draftData) {
          setFormData({
            ...draftData,
            id: Number(permitId)
          })
        }
      } catch (err) {
        if (draftData) {
          setFormData({
            ...draftData,
            id: Number(permitId)
          })
        } else {
          showError('Error al cargar', sanitizarMensaje(err.message, 'No se pudo cargar la información del permiso.'))
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchPermit()
    return () => {
      cancelled = true
    }
  }, [permitId, draftParam])

  // Sincronizar campos
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Manejador del editor TinyMCE
  const handleEditorChange = (content) => {
    setFormData((prev) => ({ ...prev, contenido: content }))
  }

  // Cambio de clasificación / tipo
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

  // Cuando se selecciona un administrado desde el buscador
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
    // Regenerar el cuerpo HTML en TinyMCE con los datos actualizados
    updated.contenido = generarPlantillaCuerpo(updated)
    setFormData(updated)
  }

  // Regenerar plantilla
  const handleRecargarPlantilla = () => {
    const cuerpoGenerado = generarPlantillaCuerpo(formData)
    setFormData((prev) => ({ ...prev, contenido: cuerpoGenerado }))
  }

  // Salir de la segunda ventana y regresar a la ventana emergente de los datos
  const handleVolverADatosModal = () => {
    const effectiveId = formData.id || (permitId ? Number(permitId) : null)
    const dataToSave = {
      ...formData,
      id: effectiveId
    }

    guardarBorradorPermiso(dataToSave)

    // Notificar a la ventana principal / modal opener
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({ type: 'VOLVER_A_DATOS_MODAL', draft: dataToSave }, '*')
      window.opener.focus()
      window.close()
    } else {
      window.location.href = `/permisos?reopenDraft=1${effectiveId ? `&id=${effectiveId}` : ''}`
    }
  }

  // Navegar entre pantallas con scroll al inicio
  const goToScreen = (screen) => {
    setActiveScreen(screen)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Guardar documento
  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault()

    if (!formData.solicitanteNombre?.trim()) {
      setActiveScreen('DATOS')
      showError('Validación', 'Por favor ingresa la Razón Social o nombre del Administrado.')
      return
    }
    if (!formData.solicitanteDocumento?.trim()) {
      setActiveScreen('DATOS')
      showError('Validación', 'Por favor ingresa el RUC o DNI del Administrado.')
      return
    }

    setIsSubmitting(true)

    try {
      const effectiveId = formData.id || (permitId ? Number(permitId) : null)
      const isEdit = Boolean(effectiveId)
      const url = isEdit ? `/permisos/${effectiveId}` : '/permisos'
      const method = isEdit ? 'PUT' : 'POST'

      const payload = {
        ...formData,
        id: effectiveId || undefined
      }

      // Si es creación y no se especificó un número, omitir para que el backend autogenere el correlativo único
      if (!isEdit && !payload.numeroAutorizacion?.trim()) {
        delete payload.numeroAutorizacion
      }

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        throw new Error(await leerMensajeError(res, 'Error al procesar la autorización municipal.'))
      }

      const resData = await res.json()
      setSuccessMsg('¡Autorización municipal guardada exitosamente!')

      limpiarBorradorPermiso()

      // Notificar a la ventana principal / pestaña padre
      if (window.opener) {
        window.opener.postMessage({ type: 'PERMISO_GUARDADO', id: resData.id || effectiveId }, '*')
      }
      avisarPermisoActualizado()

      // Cerrar ventana tras breve confirmación
      setTimeout(() => {
        if (window.opener) {
          window.close()
        }
      }, 1200)
    } catch (err) {
      showError('Error', sanitizarMensaje(err.message, 'Ocurrió un error al guardar la autorización.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCerrar = () => {
    if (window.opener) {
      window.close()
    } else {
      window.history.back()
    }
  }

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 dark:bg-[#080d1a] p-4">
        <div className="text-center space-y-3">
          <div className="size-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-bold text-slate-500">Cargando datos de la autorización...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-[#070d1e] dark:text-slate-100 flex flex-col">
      {/* Barra Superior de la Ventana */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#1C2438]/95 backdrop-blur-md border-b border-slate-200 dark:border-[var(--border)] px-4 sm:px-6 py-3.5 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md">
            <Icon name="fileText" className="size-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                {formData.id ? 'Editar Autorización Municipal' : 'Nueva Autorización y Trámite Municipal'}
              </h1>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {formData.numeroAutorizacion || 'Borrador'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Subgerencia de Tránsito, Transporte y Seguridad Vial — Sistema Oficial
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {activeScreen === 'CUERPO' ? (
            <button
              type="button"
              onClick={() => goToScreen('DATOS')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-indigo-200 dark:border-[var(--border-strong)] bg-indigo-50 dark:bg-[var(--bg-subtle)] text-indigo-700 dark:text-slate-200 hover:bg-indigo-100 dark:hover:bg-slate-700 transition cursor-pointer"
              title="Ver y editar los datos del trámite y administrado"
            >
              <span>← Volver a Datos del Trámite</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => goToScreen('CUERPO')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-violet-200 dark:border-[var(--border-strong)] bg-violet-50 dark:bg-[var(--bg-subtle)] text-violet-700 dark:text-slate-200 hover:bg-violet-100 dark:hover:bg-slate-700 transition cursor-pointer"
              title="Continuar al editor de redacción de la resolución"
            >
              <span>Continuar a Redacción →</span>
            </button>
          )}

          <BotonCancelar onClick={handleCerrar}>Cerrar ventana</BotonCancelar>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-5 py-2 text-xs font-black text-white shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin text-sm">⟳</span>
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Icon name="check" className="size-4" />
                <span>Guardar Documento</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Contenido Principal con Formulario */}
      <main className="flex-1 max-w-6xl mx-auto w-full p-4 sm:p-6 space-y-5">
        {/* Banner de Éxito si guardó */}
        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center justify-between text-xs font-bold animate-enter">
            <span>✓ {successMsg} (Cerrando ventana automáticamente...)</span>
            <button type="button" onClick={() => setSuccessMsg('')} className="text-emerald-600">✕</button>
          </div>
        )}

        {/* ========================================================= */}
        {/* PANTALLA 1: DATOS DEL TRÁMITE Y ADMINISTRADO               */}
        {/* ========================================================= */}
        {activeScreen === 'DATOS' && (
          <div className="space-y-5 animate-enter">
            {/* 1. BUSCADOR INTELIGENTE EN BASE DE DATOS (Auto-rellenado) */}
            <div className="rounded-3xl border border-indigo-200 bg-white p-5 shadow-sm dark:border-[var(--border)] dark:bg-[#1C2438]">
              <BuscadorAdministrados onSelect={handleSelectAdministrado} />
            </div>

            {/* 2. CLASIFICACIÓN / SELECTOR DE TIPO */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[var(--border)] dark:bg-[#1C2438] space-y-3">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Clasificación / Tipo de Permiso *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => handleTipoChange('CONTROL_VEHICULAR')}
                  className={`p-3.5 rounded-2xl border-2 text-left transition cursor-pointer flex flex-col justify-between ${
                    formData.tipoPermiso === 'CONTROL_VEHICULAR' || formData.tipoPermiso === 'OPERACION'
                      ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 shadow-sm ring-1 ring-indigo-500/20'
                      : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-[var(--border)] dark:bg-[#1C2438] dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-black text-xs">Control Vehicular</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                      S/ 450
                    </span>
                  </div>
                  <p className="text-[11px] opacity-80">
                    Permiso municipal para verificación técnica y circulación autorizada de unidades.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleTipoChange('CARGA_DESCARGA')}
                  className={`p-3.5 rounded-2xl border-2 text-left transition cursor-pointer flex flex-col justify-between ${
                    formData.tipoPermiso === 'CARGA_DESCARGA'
                      ? 'border-sky-500 bg-sky-50/80 dark:bg-sky-950/40 text-sky-950 dark:text-sky-200 shadow-sm ring-1 ring-sky-500/20'
                      : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-[var(--border)] dark:bg-[#1C2438] dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-black text-xs">Carga y Descarga</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-900 text-sky-800 dark:text-sky-200">
                      S/ 1030
                    </span>
                  </div>
                  <p className="text-[11px] opacity-80">
                    Horario nocturno / madrugada (16:00 a 05:00 hrs) para camiones y abastecimiento comercial.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleTipoChange('USO_VIAS')}
                  className={`p-3.5 rounded-2xl border-2 text-left transition cursor-pointer flex flex-col justify-between ${
                    formData.tipoPermiso === 'USO_VIAS'
                      ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 shadow-sm ring-1 ring-amber-500/20'
                      : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-[var(--border)] dark:bg-[#1C2438] dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-black text-xs">Uso de Vías</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                      S/ 850
                    </span>
                  </div>
                  <p className="text-[11px] opacity-80">
                    Ocupación provisional de calzada/acera para eventos, mudanzas u obras civiles.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleTipoChange('ZONAS_RESERVADAS')}
                  className={`p-3.5 rounded-2xl border-2 text-left transition cursor-pointer flex flex-col justify-between ${
                    formData.tipoPermiso === 'ZONAS_RESERVADAS' || formData.tipoPermiso === 'ZONA_RESERVADA'
                      ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 shadow-sm ring-1 ring-emerald-500/20'
                      : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-[var(--border)] dark:bg-[#1C2438] dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-black text-xs">Zonas Reservadas</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                      S/ 920
                    </span>
                  </div>
                  <p className="text-[11px] opacity-80">
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
                    id="perm_solicitante_nombre_win"
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
                    id="perm_solicitante_documento_win"
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
                    id="perm_representante_legal_win"
                    label="Representante Legal"
                    value={formData.representanteLegal}
                    onChange={(e) => setFormData({ ...formData, representanteLegal: e.target.value })}
                  />
                </div>

                {/* Vehículo / Placa */}
                <div>
                  <FloatingInput
                    id="perm_vehiculo_placa_win"
                    label="Vehículo / Placa"
                    value={formData.vehiculoPlaca}
                    onChange={(e) => setFormData({ ...formData, vehiculoPlaca: normalizarPlaca(e.target.value) })}
                    inputClassName="font-mono font-bold uppercase"
                  />
                </div>

                {/* Expediente UTD */}
                <div>
                  <FloatingInput
                    id="perm_expediente_win"
                    label="Expediente UTD / SISGEDO"
                    value={formData.expediente}
                    onChange={(e) => setFormData({ ...formData, expediente: e.target.value })}
                    inputClassName="font-mono"
                  />
                </div>

                {/* N° Autorización Oficial */}
                <div>
                  <FloatingInput
                    id="perm_numero_autorizacion_win"
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
                    id="perm_zona_circulacion_win"
                    label="Zona de Circulación / Cuadrante"
                    value={formData.zonaCirculacion}
                    onChange={(e) => setFormData({ ...formData, zonaCirculacion: e.target.value })}
                  />
                </div>

                {/* Horario */}
                <div className="grid grid-cols-2 gap-2">
                  <FloatingInput
                    id="perm_horario_inicio_win"
                    label="Horario Inicio"
                    value={formData.horarioInicio}
                    onChange={(e) => setFormData({ ...formData, horarioInicio: e.target.value })}
                    inputClassName="font-mono text-center"
                  />
                  <FloatingInput
                    id="perm_horario_fin_win"
                    label="Horario Fin"
                    value={formData.horarioFin}
                    onChange={(e) => setFormData({ ...formData, horarioFin: e.target.value })}
                    inputClassName="font-mono text-center"
                  />
                </div>

                {/* Recibo TUPA */}
                <div>
                  <FloatingInput
                    id="perm_recibo_numero_win"
                    label="N° Recibo de Pago"
                    value={formData.reciboIngresoNumero}
                    onChange={(e) => setFormData({ ...formData, reciboIngresoNumero: e.target.value })}
                    inputClassName="font-mono font-bold"
                  />
                </div>

                {/* Monto TUPA */}
                <div>
                  <FloatingInput
                    id="perm_recibo_monto_win"
                    label="Monto Pagado (S/)"
                    type="number"
                    step="0.01"
                    value={formData.reciboIngresoMonto}
                    onChange={(e) => setFormData({ ...formData, reciboIngresoMonto: e.target.value })}
                    inputClassName="font-mono font-bold"
                  />
                </div>

                {/* Vigencia */}
                <div>
                  <FloatingInput
                    id="perm_vigencia_hasta_win"
                    label="Vigencia Hasta"
                    type="date"
                    value={formData.fechaFinVigencia}
                    onChange={(e) => setFormData({ ...formData, fechaFinVigencia: e.target.value })}
                  />
                </div>
              </div>
            </fieldset>

            {/* Barra Inferior en Pantalla 1: Continuar a Redacción */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 pb-8">
              <BotonCancelar onClick={handleCerrar} className="w-full sm:w-auto">Cerrar ventana</BotonCancelar>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <BotonGuardar
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="hidden sm:inline-flex items-center gap-1.5"
                >
                  <span>Guardar directamente</span>
                </BotonGuardar>

                <BotonGuardar
                  type="button"
                  onClick={() => goToScreen('CUERPO')}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2"
                >
                  <span>Continuar a Redacción de Resolución (Cuerpo Oficial)</span>
                  <span className="text-base leading-none">→</span>
                </BotonGuardar>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* PANTALLA 2: CUERPO OFICIAL CON EDITOR TINYMCE AMPLIO       */}
        {/* ========================================================= */}
        {activeScreen === 'CUERPO' && (
          <div className="space-y-4 animate-enter">
            {/* Barra Superior de Redacción: Información de contexto y controles */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-[var(--border)] dark:bg-[#1C2438] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => goToScreen('DATOS')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[var(--border-strong)] bg-slate-50 dark:bg-[var(--bg-subtle)] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  <span>← Volver a Datos del Trámite</span>
                </button>

                <div className="text-xs">
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    {formData.solicitanteNombre || 'Sin administrado'}
                  </span>
                  {formData.solicitanteDocumento && (
                    <span className="ml-1.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      ({formData.solicitanteDocumento})
                    </span>
                  )}
                  {formData.vehiculoPlaca && (
                    <span className="ml-2 font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                      Placa: {formData.vehiculoPlaca}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRecargarPlantilla}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-indigo-300 dark:hover:bg-slate-700 text-xs font-bold transition cursor-pointer"
                  title="Regenera el texto y la tabla de resolución incorporando los datos ingresados en el Paso 1"
                >
                  <span>↺ Regenerar plantilla con datos</span>
                </button>
              </div>
            </div>

            {/* Contenedor del Editor TinyMCE: Alto y Espacioso para Redacción Cómoda */}
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-[var(--border)] dark:bg-[#1C2438] space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-[var(--border)] pb-2.5">
                <div>
                  <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Icon name="fileText" className="size-4 text-indigo-600" />
                    <span>Cuerpo Oficial de la Resolución / Autorización</span>
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Espacio amplio de redacción jurídica y resolutiva. Formato enriquecido compatible con impresión A4.
                  </p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Modo Redacción Amplia
                </span>
              </div>

              <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-[var(--border-strong)] shadow-xs">
                <Editor
                  apiKey={TINYMCE_API_KEY}
                  value={formData.contenido}
                  onEditorChange={handleEditorChange}
                  init={{
                    height: 640,
                    min_height: 520,
                    menubar: true,
                    language: 'es',
                    plugins: [
                      'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                      'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                      'insertdatetime', 'media', 'table', 'help', 'wordcount'
                    ],
                    toolbar:
                      'undo redo | blocks fontfamily fontsize | bold italic underline forecolor backcolor | ' +
                      'alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | ' +
                      'table link code fullscreen | removeformat',
                    content_style:
                      'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 13.5px; line-height: 1.6; color: #0f172a; padding: 24px; max-width: 900px; margin: 0 auto; } table { border-collapse: collapse; width: 100%; margin: 12px 0; } th, td { border: 1px solid #cbd5e1; padding: 8px 12px; } th { background-color: #f8fafc; font-weight: bold; }'
                  }}
                />
              </div>
            </div>

            {/* Barra Inferior de Acciones en Pantalla 2 */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 pb-8">
              <button
                type="button"
                onClick={() => goToScreen('DATOS')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-[var(--border-strong)] bg-white dark:bg-[var(--bg-subtle)] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                <span>← Volver a Datos del Trámite</span>
              </button>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <BotonCancelar onClick={handleCerrar} />

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-6 py-2.5 text-xs font-black text-white shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin text-sm">⟳</span>
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Icon name="check" className="size-4" />
                      <span>Guardar y Emitir Autorización</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
export default PermisoFormularioVentana
