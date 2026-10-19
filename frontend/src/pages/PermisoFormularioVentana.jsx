import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fechaLocalActual } from '../utils/calendarioCurso'
import { Editor } from '@tinymce/tinymce-react'
import { Icon } from '../components/ui/Icon'
import { Cargando } from '../components/ui/Cargando'
import { FloatingInput } from '../components/ui/FormInputs'
import { sanitizarMensaje, leerMensajeError, apiFetch } from '../config/api'
import { leerBorradorPermiso, guardarBorradorPermiso, limpiarBorradorPermiso, avisarPermisoActualizado } from '../utils/borradorPermiso'
import { showError, showConfirm } from '../utils/SwalUtil'
import { normalizarPlaca, formatFecha } from '../utils/formatters'
import { BuscadorAdministrados } from '../components/permisos/BuscadorAdministrados'
import { generarPlantillaCuerpo } from '../utils/permisosPlantilla'
import { normalizarFormatoEnLinea } from '../utils/formatoEditor'
import { BotonCancelar, BotonGuardar } from '../components/ui/ModalControls'

const formatearMontoVinculado = (valor) => (
  valor === null || valor === undefined || valor === '' ? '' : String(valor)
)

// TinyMCE local bajo licencia GPL; sin servicios externos.
const TINYMCE_SCRIPT = '/tinymce/tinymce.min.js'

export function PermisoFormularioVentana() {
  const navigate = useNavigate()
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
          tipoPermiso: draftData.tipoPermiso === 'ZONA_RESERVADA' ? 'ZONAS_RESERVADAS' : draftData.tipoPermiso,
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
          const tipoPermiso = p.tipoPermiso === 'ZONA_RESERVADA' ? 'ZONAS_RESERVADAS' : (p.tipoPermiso || 'CARGA_DESCARGA')
          const asuntoPorTipo = {
            CARGA_DESCARGA: 'SE EMITE AUTORIZACION DE CARGA Y DESCARGA',
            USO_VIAS: 'AUTORIZACION PROVISIONAL DE USO DE VIAS',
            ZONAS_RESERVADAS: 'AUTORIZACIÓN DE ZONA RESERVADA DE ESTACIONAMIENTO EN VÍA PÚBLICA'
          }
          const merged = {
              id: Number(p.id || permitId),
            tipoPermiso,
              numeroAutorizacion: p.numeroAutorizacion || '',
              vehiculoPlaca: p.vehiculoPlaca || '',
              solicitanteNombre: p.solicitanteNombre || p.solicitante || '',
              solicitanteDocumento: p.solicitanteDocumento || p.solicitanteDoc || p.solicitanteRuc || p.solicitanteDni || '',
              representanteLegal: p.representanteLegal || '',
              expediente: p.expediente || p.expedienteNumero || '',
              registroNumero: p.registroNumero || '',
              referenciaSisgedo: p.referenciaSisgedo || '',
              asunto: p.asunto || asuntoPorTipo[tipoPermiso] || '',
              zonaCirculacion: p.zonaCirculacion || '',
              ubicacion: p.ubicacion || '',
              horarioInicio: p.horarioInicio || '',
              horarioFin: p.horarioFin || '',
              fechaEmision: p.fechaEmision || fechaLocalActual(),
              fechaInicioVigencia: p.fechaInicioVigencia || fechaLocalActual(),
              fechaFinVigencia: p.fechaFinVigencia || '',
              reciboIngresoNumero: p.reciboIngresoNumero || '',
              reciboIngresoMonto: formatearMontoVinculado(p.reciboIngresoMonto),
              reciboIngresoFecha: p.reciboIngresoFecha || '',
              tonelaje: p.tonelaje || '',
              numeroSeguridad: p.numeroSeguridad || String(Math.floor(10000 + Math.random() * 90000)),
              recorridoIngreso: p.recorridoIngreso || '',
              flotaPlacas: p.flotaPlacas || '',
              observaciones: p.observaciones || '',
              contenido: p.contenido || generarPlantillaCuerpo(p),
              estado: p.estado || 'VIGENTE'
            }

            if (draftData) {
              Object.assign(merged, draftData)
              merged.id = Number(p.id || permitId)
            }
            if (merged.tipoPermiso === 'ZONA_RESERVADA') merged.tipoPermiso = 'ZONAS_RESERVADAS'

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
  const handleTipoChange = async (newTipo) => {
    const tipo = newTipo === 'ZONA_RESERVADA' ? 'ZONAS_RESERVADAS' : newTipo
    if (!['CARGA_DESCARGA', 'USO_VIAS', 'ZONAS_RESERVADAS'].includes(tipo) || tipo === formData.tipoPermiso) return
    const vinculoIncompatible = Boolean(formData.tramiteId && tipo !== formData.tipoPermiso)
    const asuntoPorTipo = {
      CARGA_DESCARGA: 'SE EMITE AUTORIZACION DE CARGA Y DESCARGA',
      USO_VIAS: 'AUTORIZACION PROVISIONAL DE USO DE VIAS',
      ZONAS_RESERVADAS: 'AUTORIZACIÓN DE ZONA RESERVADA DE ESTACIONAMIENTO EN VÍA PÚBLICA'
    }
    const updated = {
      ...formData,
      ...(formData.id ? {} : (tipo === 'CARGA_DESCARGA'
        ? { horarioInicio: '16:00', horarioFin: '05:00' }
        : { horarioInicio: '00:00', horarioFin: '23:59' })),
      tipoPermiso: tipo,
      ...(vinculoIncompatible ? { tramiteId: null, reciboIngresoNumero: '', reciboIngresoMonto: '', reciboIngresoFecha: '' } : {}),
      asunto: asuntoPorTipo[tipo]
    }
    updated.contenido = generarPlantillaCuerpo(updated)
    setFormData(updated)
  }

  // Cuando se selecciona un administrado desde el buscador
  const handleSelectAdministrado = (item) => {
    if (formData.tramiteId) return
    const updated = {
      ...formData,
      solicitanteNombre: item.nombre || item.solicitanteNombre || formData.solicitanteNombre,
      solicitanteDocumento: item.documento || item.solicitanteDocumento || formData.solicitanteDocumento,
      representanteLegal: item.representanteLegal || formData.representanteLegal,
      vehiculoPlaca: item.placa || item.vehiculoPlaca || formData.vehiculoPlaca,
      expediente: item.expediente || formData.expediente,
      referenciaSisgedo: item.expediente || formData.referenciaSisgedo,
      reciboIngresoNumero: item.reciboNumero || item.reciboIngresoNumero || '',
      reciboIngresoMonto: formatearMontoVinculado(item.reciboMonto ?? item.reciboIngresoMonto),
      reciboIngresoFecha: item.reciboFecha || item.reciboIngresoFecha || '',
      tramiteId: item.tramiteId || null
    }
    // Regenerar el cuerpo HTML en TinyMCE con los datos actualizados
    updated.contenido = generarPlantillaCuerpo(updated)
    setFormData(updated)
  }

  const handleSelectTramite = async (t) => {
    if (formData.contenido?.trim()) {
      const confirmation = await showConfirm('Vincular expediente', 'El contenido actual puede reemplazarse por una plantilla con los datos del expediente.', 'Reemplazar contenido', 'Vincular y conservar')
      if (!confirmation.isConfirmed && confirmation.dismiss !== 'cancel') return
      const updated = { ...formData, tramiteId: t.id, solicitanteNombre: t.solicitanteNombre || t.persona?.razonSocial || `${t.persona?.nombres || ''} ${t.persona?.apellidos || ''}`.trim() || '', solicitanteDocumento: t.solicitanteDocumento || t.persona?.numeroDocumento || '', vehiculoPlaca: t.vehiculoPlaca || '', representanteLegal: t.representanteLegalNombre || t.representanteLegal || t.persona?.representanteLegal || '', expediente: t.numeroExpediente || '', referenciaSisgedo: t.numeroExpediente || '', reciboIngresoNumero: t.reciboIngresoNumero || t.reciboNumero || '', reciboIngresoMonto: formatearMontoVinculado(t.reciboIngresoMonto ?? t.reciboMonto), reciboIngresoFecha: t.reciboIngresoFecha || t.reciboFecha || '' }
      if (confirmation.isConfirmed) updated.contenido = generarPlantillaCuerpo(updated)
      setFormData(updated)
      return
    }
    const updated = { ...formData, tramiteId: t.id, solicitanteNombre: t.solicitanteNombre || t.persona?.razonSocial || `${t.persona?.nombres || ''} ${t.persona?.apellidos || ''}`.trim() || '', solicitanteDocumento: t.solicitanteDocumento || t.persona?.numeroDocumento || '', vehiculoPlaca: t.vehiculoPlaca || '', representanteLegal: t.representanteLegalNombre || t.representanteLegal || t.persona?.representanteLegal || '', expediente: t.numeroExpediente || '', referenciaSisgedo: t.numeroExpediente || '', reciboIngresoNumero: t.reciboIngresoNumero || t.reciboNumero || '', reciboIngresoMonto: formatearMontoVinculado(t.reciboIngresoMonto ?? t.reciboMonto), reciboIngresoFecha: t.reciboIngresoFecha || t.reciboFecha || '' }
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

    // Vuelve a la lista de permisos (misma ventana) y reabre los datos del trámite con el borrador
    navigate(`/permisos?reopenDraft=1${effectiveId ? `&id=${effectiveId}` : ''}`)
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
    if (!/^(?:\d{8}|\d{11})$/.test(formData.solicitanteDocumento?.trim() || '')) {
      setActiveScreen('DATOS')
      showError('Validación', 'El DNI debe tener 8 dígitos o el RUC 11 dígitos.')
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

      await res.json()
      setSuccessMsg('¡Autorización municipal guardada exitosamente!')

      limpiarBorradorPermiso()

      avisarPermisoActualizado()

      // Tras la breve confirmación se vuelve a la lista de permisos
      setTimeout(() => navigate('/permisos'), 1200)
    } catch (err) {
      showError('Error', sanitizarMensaje(err.message, 'Ocurrió un error al guardar la autorización.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCerrar = () => {
    navigate('/permisos')
  }

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 dark:bg-[#080d1a] p-4">
        <Cargando className="py-0" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-[#070d1e] dark:text-slate-100 flex flex-col">
      {/* Barra Superior de la Ventana */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#1C2438]/95 backdrop-blur-md border-b border-slate-200 dark:border-[var(--border)] px-4 sm:px-6 py-2.5 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
            <Icon name="fileText" className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-white min-w-0 break-words">
                {formData.id ? 'Editar autorización' : 'Nueva autorización'}
              </h1>
              <span className="shrink-0 text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {formData.numeroAutorizacion || 'Borrador'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 min-w-0 break-words">
              Tránsito y Transporte • Sistema municipal
            </p>
          </div>

          {activeScreen === 'CUERPO' && (
            <div className="hidden lg:flex items-center gap-3 pl-3.5 border-l border-slate-200 dark:border-slate-700 min-w-0">
              <div className="min-w-0">
                <p className="min-w-0 break-words font-bold text-xs text-slate-800 dark:text-slate-200" title={formData.solicitanteNombre}>
                  {formData.solicitanteNombre || 'Sin solicitante'}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  {formData.solicitanteDocumento && <span className="font-mono">{formData.solicitanteDocumento}</span>}
                  {formData.vehiculoPlaca && (
                    <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                      Placa: {formData.vehiculoPlaca}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {activeScreen === 'CUERPO' && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRecargarPlantilla}
              disabled={isSubmitting}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-[var(--border)] dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition cursor-pointer"
              title="Restablecer plantilla con los datos del trámite"
            >
              <Icon name="refresh" className="size-4 text-indigo-500" />
              <span className="hidden sm:inline">Restablecer plantilla</span>
            </button>

            <button
              type="button"
              onClick={handleVolverADatosModal}
              disabled={isSubmitting}
              className="inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 text-xs font-semibold text-rose-600 transition hover:border-rose-500/40 hover:bg-rose-500/20 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-400 dark:hover:bg-rose-500/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400 disabled:opacity-50"
              title="Volver a datos del trámite"
            >
              <Icon name="logout" className="size-4 text-rose-500 dark:text-rose-400" />
              <span>Volver a datos</span>
            </button>

            <button
              type="button"
              onClick={handleCerrar}
              disabled={isSubmitting}
              className="h-9 shrink-0 rounded-lg px-3 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 disabled:opacity-50 transition cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-wait transition shadow-sm cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin text-sm">⟳</span>
                  <span>Guardando…</span>
                </>
              ) : (
                <>
                  <Icon name="check" className="size-4" />
                  <span>Guardar autorización</span>
                </>
              )}
            </button>
          </div>
        )}
      </header>

      {/* Contenido Principal con Formulario */}
      <main className={`flex-1 mx-auto w-full ${activeScreen === 'CUERPO' ? 'max-w-[960px] p-2 sm:p-4' : 'max-w-6xl p-3 sm:p-5'} space-y-4`}>
        {/* Banner de Éxito si guardó */}
        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center justify-between text-xs font-bold animate-enter">
            <span>✓ {successMsg} (Volviendo a la lista de permisos...)</span>
            <button type="button" onClick={() => setSuccessMsg('')} className="text-emerald-600">✕</button>
          </div>
        )}

        {/* ========================================================= */}
        {/* PANTALLA 1: DATOS DEL TRÁMITE Y ADMINISTRADO               */}
        {/* ========================================================= */}
        {activeScreen === 'DATOS' && (
          <div className="space-y-5 animate-enter">
            {/* 1. BUSCADOR INTELIGENTE EN BASE DE DATOS (Auto-rellenado) */}
            {!formData.tramiteId && <div className="space-y-3 rounded-3xl border border-indigo-200 bg-white p-5 shadow-sm dark:border-[var(--border)] dark:bg-[#1C2438]">
              <BuscadorAdministrados onSelect={handleSelectAdministrado} />
            </div>}

            {/* 2. CLASIFICACIÓN / SELECTOR DE TIPO */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[var(--border)] dark:bg-[#1C2438] space-y-3">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Clasificación / Tipo de Permiso
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

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
                  </div>
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
                  </div>
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
                  </div>
                </button>
              </div>
            </div>

            {/* 3. CAMPOS DE DATOS GENERALES */}
            <fieldset className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 dark:border-[var(--border)] dark:bg-slate-900/50 shadow-xs space-y-3">
              <legend className="text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-white px-1 mb-2 flex items-center gap-2">
                <span className="size-2 rounded-full bg-slate-900 dark:bg-white" />
                Datos del Solicitante, Vehículo y Expediente
              </legend>
              {formData.tramiteId && <p className="flex items-center justify-between gap-2 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"><span>Expediente {formData.expediente || 'sin número'} vinculado. Solicitante: {formData.solicitanteNombre}.</span><button type="button" onClick={quitarVinculo} className="shrink-0 underline">Quitar vínculo</button></p>}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {/* Administrado / Razón Social */}
                <div className="sm:col-span-2 lg:col-span-2">
                  <FloatingInput
                    id="perm_solicitante_nombre_win"
                    label="Razón Social o Administrado"
                    required
                    value={formData.solicitanteNombre}
                    onChange={(e) => setFormData({ ...formData, solicitanteNombre: e.target.value })}
                    readOnly={Boolean(formData.tramiteId)}
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
                    readOnly={Boolean(formData.tramiteId)}
                    inputClassName="font-mono font-bold"
                  />
                </div>

                {/* Representante Legal */}
                <div>
                  <FloatingInput
                    id="perm_representante_legal_win"
                    label="Representante Legal"
                    value={formData.representanteLegal}
                    readOnly
                    inputClassName="read-only:bg-slate-100 read-only:text-slate-500 read-only:cursor-default dark:read-only:bg-slate-800/60 dark:read-only:text-slate-400"
                    onChange={() => {}}
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
                    label="N.º de expediente UTD / SISGEDO"
                    value={formData.expediente}
                    onChange={(e) => setFormData({ ...formData, expediente: e.target.value, referenciaSisgedo: e.target.value })}
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

                <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-[var(--border)] dark:bg-slate-900/40"><span className="font-bold">Pago vinculado: </span>{formData.reciboIngresoNumero ? `Recibo ${formData.reciboIngresoNumero}${formData.reciboIngresoMonto !== '' ? ` · S/ ${Number(formData.reciboIngresoMonto).toLocaleString('es-PE', { maximumFractionDigits: 2 })}` : ''}${formData.reciboIngresoFecha ? ` · ${formatFecha(formData.reciboIngresoFecha)}` : ''}` : 'Sin pago vinculado'}</div>

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
                  <span>Redactar autorización</span>
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
          <div className="space-y-3 animate-enter">
            {/* Contenedor del Editor TinyMCE: Alto y Espacioso para Redacción Cómoda */}
            <div className="rounded-xl border border-slate-200 bg-white dark:border-[var(--border)] dark:bg-[#1C2438]">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-[var(--border)] px-4 py-3">
                <div>
                  <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Icon name="fileText" className="size-4 text-indigo-600" />
                    <span>Redacción de la autorización</span>
                  </h2>
                </div>
                <span className="text-[10px] font-semibold text-slate-400">
                  A4
                </span>
              </div>

              <div className="permiso-editor">
                <Editor
                  tinymceScriptSrc={TINYMCE_SCRIPT}
                  licenseKey="gpl"
                  value={formData.contenido}
                  onEditorChange={handleEditorChange}
                  onBeforeSetContent={(evento) => { if (evento.format !== 'raw') evento.content = normalizarFormatoEnLinea(evento.content) }}
                  init={{
                    min_height: 680,
                    autoresize_bottom_margin: 24,
                    resize: false,
                    toolbar_mode: 'sliding',
                    toolbar_sticky: true,
                    toolbar_sticky_offset: 54,
                    menubar: 'file edit view insert format tools table help',
                    statusbar: false,
                    language: 'es',
                    promotion: false,
                    branding: false,
                    plugins: [
                      'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                      'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                      'insertdatetime', 'media', 'table', 'help', 'wordcount', 'autoresize'
                    ],
                    toolbar:
                      'undo redo | blocks fontfamily fontsize | bold italic underline forecolor backcolor | ' +
                      'alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | ' +
                      'table link code fullscreen | removeformat',
                    font_family_formats: 'Times New Roman=times new roman,times,serif; Arial=arial,helvetica,sans-serif; Calibri=calibri,sans-serif; Courier New=courier new,courier,monospace; Georgia=georgia,serif; Verdana=verdana,sans-serif',
                    font_size_formats: '8pt 9pt 10pt 11pt 12pt 13pt 14pt 16pt 18pt 20pt 24pt 28pt',
                    content_style:
                      'html { background: #e8edf3; padding: 16px 10px; } ' +
                      'body { background: #ffffff; box-sizing: border-box; width: 100%; max-width: 794px; min-height: 1123px; margin: 0 auto !important; padding: 30px 56px; ' +
                      'box-shadow: 0 1px 5px rgba(15,23,42,0.12); font-family: "Times New Roman", Times, serif; font-size: 11pt; line-height: 1.3; color: #000; } ' +
                      '@media(max-width:600px) { html { padding: 8px 4px; } body { padding: 20px 14px; } } ' +
                      'p { margin: 0 0 8pt; } table { border-collapse: collapse; } img { max-width: 100%; }',
                  }}
                />
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  )
}
export default PermisoFormularioVentana
