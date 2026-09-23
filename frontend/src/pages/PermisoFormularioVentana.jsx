import React, { useState, useEffect } from 'react'
import { Editor } from '@tinymce/tinymce-react'
import { Icon } from '../components/ui/Icon'
import { apiFetch } from '../config/api'
import { BuscadorAdministrados } from '../components/permisos/BuscadorAdministrados'
import { generarPlantillaCuerpo } from '../utils/permisosPlantilla'

const TINYMCE_API_KEY =
  import.meta.env.VITE_TINYMCE_API_KEY ||
  'unmcqzdx4e88wfy3gqtlbelk1w21unqt3sl8hlcltd49u0o8'

export function PermisoFormularioVentana() {
  const [searchParams] = useState(() => new URLSearchParams(window.location.search))
  const permitId = searchParams.get('id')

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
  const [isLoading, setIsLoading] = useState(Boolean(permitId))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  // Cargar datos en caso de edición
  useEffect(() => {
    if (!permitId) {
      const defaultData = {
        ...initialFormState,
        numeroSeguridad: String(Math.floor(10000 + Math.random() * 90000))
      }
      defaultData.contenido = generarPlantillaCuerpo(defaultData)
      setFormData(defaultData)
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
            setFormData({
              id: p.id,
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
              reciboIngresoMonto: p.reciboIngresoMonto ? String(p.reciboIngresoMonto) : '1030.00',
              reciboIngresoFecha: p.reciboIngresoFecha || '',
              tonelaje: p.tonelaje || '03 A 07-TM',
              numeroSeguridad: p.numeroSeguridad || String(Math.floor(10000 + Math.random() * 90000)),
              recorridoIngreso: p.recorridoIngreso || '',
              recorridoSalida: p.recorridoSalida || '',
              flotaPlacas: p.flotaPlacas || '',
              observaciones: p.observaciones || '',
              contenido: p.contenido || generarPlantillaCuerpo(p),
              estado: p.estado || 'VIGENTE'
            })
          }
        }
      } catch (err) {
        alert('Error al cargar la información del permiso: ' + err.message)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchPermit()
    return () => {
      cancelled = true
    }
  }, [permitId])

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
    const updated = {
      ...formData,
      tipoPermiso: newTipo,
      asunto:
        newTipo === 'CARGA_DESCARGA'
          ? 'SE EMITE AUTORIZACION DE CARGA Y DESCARGA'
          : newTipo === 'USO_VIAS'
            ? 'AUTORIZACION PROVISIONAL DE USO DE VIAS'
            : 'AUTORIZACIÓN DE OPERACIÓN TUPA',
      reciboIngresoMonto: newTipo === 'CARGA_DESCARGA' ? '1030.00' : newTipo === 'USO_VIAS' ? '850.00' : '450.00',
      zonaCirculacion:
        newTipo === 'CARGA_DESCARGA' ? 'Anillo Vial - José Leonardo Ortiz' : 'Jurisdicción del Distrito de José Leonardo Ortiz'
    }
    if (!formData.contenido || formData.contenido.includes('SUBGERENCIA DE TRÁNSITO')) {
      updated.contenido = generarPlantillaCuerpo(updated)
    }
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

  // Guardar documento
  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    setIsSubmitting(true)

    try {
      const isEdit = Boolean(formData.id)
      const url = isEdit ? `/permisos/${formData.id}` : '/permisos'
      const method = isEdit ? 'PUT' : 'POST'

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        let msg = 'Error al procesar la autorización municipal.'
        try {
          const errData = await res.json()
          if (errData?.message) msg = errData.message
          else if (errData?.messages?.error) msg = errData.messages.error
        } catch (_) {}
        throw new Error(msg)
      }

      const resData = await res.json()
      setSuccessMsg('¡Autorización municipal guardada exitosamente!')

      // Notificar a la ventana principal / pestaña padre
      if (window.opener) {
        window.opener.postMessage({ type: 'PERMISO_GUARDADO', id: resData.id || formData.id }, '*')
      }
      try {
        localStorage.setItem('mjlo_permisos_updated', Date.now().toString())
      } catch (_) {}

      // Cerrar ventana tras breve confirmación
      setTimeout(() => {
        if (window.opener) {
          window.close()
        }
      }, 1200)
    } catch (err) {
      alert(err.message || 'Ocurrió un error al guardar la autorización.')
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
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0B1437]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3.5 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30">
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
              Subgerencia de Tránsito, Transporte y Seguridad Vial — Segunda Ventana Oficial
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleCerrar}
            className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            Cerrar ventana
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-5 py-2 text-xs font-black text-white shadow-md shadow-emerald-600/25 transition active:scale-95 cursor-pointer disabled:opacity-50"
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

        {/* 1. BUSCADOR INTELIGENTE EN BASE DE DATOS (Auto-rellenado) */}
        <div className="rounded-3xl border border-indigo-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0B1437]">
          <BuscadorAdministrados onSelect={handleSelectAdministrado} />
        </div>

        {/* 2. CLASIFICACIÓN / SELECTOR DE TIPO */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0B1437] space-y-3">
          <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Clasificación / Tipo de Permiso *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => handleTipoChange('CARGA_DESCARGA')}
              className={`p-3.5 rounded-2xl border-2 text-left transition cursor-pointer flex flex-col justify-between ${
                formData.tipoPermiso === 'CARGA_DESCARGA'
                  ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/30 text-sky-950 dark:text-sky-200 shadow-sm'
                  : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-black text-xs">Carga y Descarga</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-900 text-sky-800 dark:text-sky-200">
                  TUPA S/ 1030.00
                </span>
              </div>
              <p className="text-[11px] opacity-80">
                Horario nocturno / madrugada (16:00 a 05:00 hrs) para camiones y unidades de abastecimiento.
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleTipoChange('USO_VIAS')}
              className={`p-3.5 rounded-2xl border-2 text-left transition cursor-pointer flex flex-col justify-between ${
                formData.tipoPermiso === 'USO_VIAS'
                  ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-200 shadow-sm'
                  : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-black text-xs">Uso Provisional de Vías</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                  TUPA S/ 850.00
                </span>
              </div>
              <p className="text-[11px] opacity-80">
                Ocupación autorizada de vía pública para eventos, mudanzas u obras programadas.
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleTipoChange('OPERACION')}
              className={`p-3.5 rounded-2xl border-2 text-left transition cursor-pointer flex flex-col justify-between ${
                formData.tipoPermiso === 'OPERACION'
                  ? 'border-violet-500 bg-violet-50/70 dark:bg-violet-950/30 text-violet-950 dark:text-violet-200 shadow-sm'
                  : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-black text-xs">Operación General TUPA</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-violet-100 dark:bg-violet-900 text-violet-800 dark:text-violet-200">
                  TUPA S/ 450.00
                </span>
              </div>
              <p className="text-[11px] opacity-80">
                Tarjeta de operatividad y autorizaciones de servicio especial en el distrito.
              </p>
            </button>
          </div>
        </div>

        {/* 3. CAMPOS DE DATOS GENERALES */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0B1437] space-y-4">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800 pb-2">
            Datos del Solicitante, Vehículo y Expediente
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
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
                placeholder="Nombre completo o Empresa titular"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 font-bold outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800"
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
                placeholder="20601234567 o 71234567"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 font-mono font-bold outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800"
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
                placeholder="Nombre del apoderado legal"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800"
              />
            </div>

            {/* Placa Principal */}
            <div>
              <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                Vehículo / Placa
              </label>
              <input
                type="text"
                name="vehiculoPlaca"
                value={formData.vehiculoPlaca}
                onChange={handleInputChange}
                placeholder="ABC-123"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 font-mono font-bold uppercase outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800"
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
                placeholder="EXP-796383"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 font-mono outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800"
              />
            </div>

            {/* N° Autorización Oficial */}
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
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 font-mono outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800"
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
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800"
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
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 py-2 font-mono text-center outline-none focus:border-indigo-500"
                />
                <input
                  type="text"
                  name="horarioFin"
                  value={formData.horarioFin}
                  onChange={handleInputChange}
                  placeholder="05:00:00"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 py-2 font-mono text-center outline-none focus:border-indigo-500"
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
                placeholder="REC-00124"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 font-mono outline-none focus:border-indigo-500"
              />
            </div>

            {/* Monto TUPA */}
            <div>
              <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                Monto Pagado (S/)
              </label>
              <input
                type="number"
                step="0.10"
                name="reciboIngresoMonto"
                value={formData.reciboIngresoMonto}
                onChange={handleInputChange}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 font-mono font-bold outline-none focus:border-indigo-500"
              />
            </div>

            {/* Vigencia */}
            <div>
              <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                Vigencia Hasta
              </label>
              <input
                type="date"
                name="fechaFinVigencia"
                value={formData.fechaFinVigencia}
                onChange={handleInputChange}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* 4. EDITOR ENRIQUECIDO TINYMCE */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0B1437] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Icon name="fileText" className="size-4 text-indigo-600" />
                <span>Cuerpo Oficial de la Resolución / Autorización</span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Edita libremente con formato enriquecido. Los datos del administrado se integran en la plantilla.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRecargarPlantilla}
              className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
            >
              <span>↺ Regenerar plantilla con datos</span>
            </button>
          </div>

          <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
            <Editor
              apiKey={TINYMCE_API_KEY}
              value={formData.contenido}
              onEditorChange={handleEditorChange}
              init={{
                height: 480,
                menubar: true,
                language: 'es',
                plugins: [
                  'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                  'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                  'insertdatetime', 'media', 'table', 'help', 'wordcount'
                ],
                toolbar:
                  'undo redo | blocks | fontfamily fontsize | bold italic underline forecolor backcolor | ' +
                  'alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | ' +
                  'table link code fullscreen | removeformat',
                content_style:
                  'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 13px; line-height: 1.6; color: #1e293b; padding: 16px; } table { border-collapse: collapse; width: 100%; margin: 8px 0; } th, td { border: 1px solid #cbd5e1; padding: 6px 10px; }'
              }}
            />
          </div>
        </div>

        {/* 5. BARRA INFERIOR DE ACCIONES */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 pb-8">
          <p className="text-xs text-slate-400 text-center sm:text-left">
            Al guardar, los datos se registrarán en la base de datos municipal y se actualizará automáticamente la lista.
          </p>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCerrar}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 px-6 py-2.5 text-xs font-black text-white shadow-md shadow-indigo-600/30 transition active:scale-95 cursor-pointer disabled:opacity-50"
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
      </main>
    </div>
  )
}
export default PermisoFormularioVentana
