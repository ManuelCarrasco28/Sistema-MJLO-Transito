import React, { useState, useEffect } from 'react'
import { Editor } from '@tinymce/tinymce-react'
import { Icon } from '../ui/Icon'
import { apiFetch } from '../../config/api'
import { BuscadorAdministrados } from './BuscadorAdministrados'
import { generarPlantillaCuerpo } from '../../utils/permisosPlantilla'

export function TramiteFormularioModal({
  isOpen,
  onClose,
  initialData = null,
  onSave,
  procedimientos = [],
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

  // Estado centralizado para todos los campos del formulario
  const [formData, setFormData] = useState(initialFormState)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Carga y pre-rellenado de datos al abrir o cambiar initialData
  useEffect(() => {
    if (!isOpen) return

    if (initialData && initialData.id) {
      // Edición de trámite existente
      setFormData({
        id: initialData.id,
        tipoPermiso: initialData.tipoPermiso || 'CARGA_DESCARGA',
        numeroAutorizacion: initialData.numeroAutorizacion || '',
        vehiculoPlaca: initialData.vehiculoPlaca || '',
        solicitanteNombre: initialData.solicitanteNombre || initialData.solicitante || '',
        solicitanteDocumento: initialData.solicitanteDocumento || initialData.solicitanteDoc || initialData.solicitanteRuc || initialData.solicitanteDni || '',
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
      // Nuevo trámite con datos precargados iniciales
      const defaultData = {
        ...initialFormState,
        numeroSeguridad: String(Math.floor(10000 + Math.random() * 90000))
      }
      defaultData.contenido = generarPlantillaCuerpo(defaultData)
      setFormData(defaultData)
    }
  }, [isOpen, initialData])

  // Manejador genérico para inputs tradicionales
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Manejador específico para el editor TinyMCE
  const handleEditorChange = (content) => {
    setFormData((prev) => ({ ...prev, contenido: content }))
  }

  // Cambio de clasificación / tipo de permiso
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
    // Si el contenido estaba vacío o era la plantilla base, regenerar con el nuevo tipo
    if (!formData.contenido || formData.contenido.includes('SUBGERENCIA DE TRÁNSITO')) {
      updated.contenido = generarPlantillaCuerpo(updated)
    }
    setFormData(updated)
  }

  // Cuando se selecciona un administrado desde el buscador inteligente
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

  // Regenerar el cuerpo HTML en TinyMCE con los datos actuales
  const handleRecargarPlantilla = () => {
    const cuerpoGenerado = generarPlantillaCuerpo(formData)
    setFormData((prev) => ({ ...prev, contenido: cuerpoGenerado }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
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

      if (onSave) onSave()
      onClose()
    } catch (err) {
      alert(err.message || 'Ocurrió un error al guardar la autorización.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs animate-enter overflow-y-auto">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#0B1437] my-auto">
        
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-600/30">
              <Icon name="routePermit" className="size-5" />
            </span>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {formData.id ? 'Editar Trámite / Autorización' : 'Emitir Trámite y Autorización'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Formulario Oficial con Editor Enriquecido TinyMCE para Referencia Textual y Resolución
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <Icon name="close" className="size-5" />
          </button>
        </div>

        {/* Cuerpo del Formulario con Scroll */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {/* Selector opcional de Trámite / Expediente Previo */}
          {!formData.id && tramitesDisponibles.length > 0 && (
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-3.5 dark:border-indigo-900/60 dark:bg-indigo-950/30">
              <label className="mb-1 block font-extrabold uppercase tracking-wider text-indigo-900 dark:text-indigo-200 text-xs">
                Vincular con Trámite / Mesa de Partes Existente (Opcional)
              </label>
              <select
                className="w-full rounded-xl border border-indigo-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 dark:border-indigo-700 dark:bg-slate-800 dark:text-white"
                onChange={(e) => {
                  const tId = Number(e.target.value)
                  if (!tId) return
                  const t = tramitesDisponibles.find((item) => item.id === tId)
                  if (t) {
                    const updated = {
                      ...formData,
                      tramiteId: t.id,
                      solicitanteNombre: t.solicitanteNombre || t.personaNombre || t.asociacionNombre || formData.solicitanteNombre,
                      solicitanteDocumento: t.solicitanteDocumento || t.personaDocumento || t.asociacionRuc || formData.solicitanteDocumento,
                      expediente: t.numeroExpediente || formData.expediente,
                      vehiculoPlaca: t.vehiculoPlaca || formData.vehiculoPlaca,
                      reciboIngresoNumero: t.reciboIngresoNumero || formData.reciboIngresoNumero,
                      reciboIngresoMonto: t.reciboIngresoMonto ? String(t.reciboIngresoMonto) : formData.reciboIngresoMonto,
                      representanteLegal: t.representanteLegalNombre || formData.representanteLegal,
                    }
                    updated.contenido = generarPlantillaCuerpo(updated)
                    setFormData(updated)
                  }
                }}
              >
                <option value="">-- Trámite directo / Sin vincular expediente previo --</option>
                {tramitesDisponibles.map((t) => (
                  <option key={t.id} value={t.id}>
                    Exp. {t.numeroExpediente || 'S/N'} — {t.solicitanteNombre || t.personaNombre || 'Sin nombre'} {t.procedimientoNombre ? `(${t.procedimientoNombre})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* Buscador inteligente en base de datos para auto-rellenado */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
            <BuscadorAdministrados onSelect={handleSelectAdministrado} />
          </div>

          {/* Clasificación / Selector de Tipo de Trámite */}
          <div>
            <label className="mb-2 block font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Clasificación / Tipo de Permiso *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => handleTipoChange('CARGA_DESCARGA')}
                className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer flex flex-col justify-between ${
                  formData.tipoPermiso === 'CARGA_DESCARGA'
                    ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/30 text-sky-950 dark:text-sky-200'
                    : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
                }`}
              >
                <div>
                  <span className="font-black block text-xs">🚛 Carga y Descarga</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                    Horario Anillo Vial 4:00 PM a 5:00 AM.
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleTipoChange('USO_VIAS')}
                className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer flex flex-col justify-between ${
                  formData.tipoPermiso === 'USO_VIAS'
                    ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/30 text-amber-950 dark:text-amber-200'
                    : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
                }`}
              >
                <div>
                  <span className="font-black block text-xs">🚧 Uso Provisional de Vías</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                    Recorridos y flota vehicular autorizada.
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleTipoChange('RENOVACION_OPERACION')}
                className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer flex flex-col justify-between ${
                  formData.tipoPermiso === 'RENOVACION_OPERACION'
                    ? 'border-violet-500 bg-violet-50/70 dark:bg-violet-950/30 text-violet-950 dark:text-violet-200'
                    : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
                }`}
              >
                <div>
                  <span className="font-black block text-xs">📋 Operación / TUPA</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                    Resolución subgerencial de servicio.
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* BLOQUE 1: Administrado y Expediente */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40 space-y-3">
            <span className="font-black text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2 border-b border-slate-200/60 pb-2 dark:border-slate-800">
              <span className="grid size-5 place-items-center rounded-md bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400 text-[10px]">1</span>
              Datos del Administrado y Expediente
            </span>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                  Razón Social o Administrado *
                </label>
                <input
                  type="text"
                  name="solicitanteNombre"
                  required
                  placeholder="Ej. EMPRESA DE TRANSPORTE DOÑA PEPE"
                  value={formData.solicitanteNombre}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-bold outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                  RUC / DNI *
                </label>
                <input
                  type="text"
                  name="solicitanteDocumento"
                  required
                  placeholder="20601234567"
                  value={formData.solicitanteDocumento}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                  N° Expediente UTD / SISGEDO
                </label>
                <input
                  type="text"
                  name="expediente"
                  placeholder="796383"
                  value={formData.expediente}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                  N° Registro Municipal
                </label>
                <input
                  type="text"
                  name="registroNumero"
                  placeholder="Ej. 610"
                  value={formData.registroNumero}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                  Representante Legal
                </label>
                <input
                  type="text"
                  name="representanteLegal"
                  placeholder="Ej. DENISS ALTAMIRANO"
                  value={formData.representanteLegal}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                  Asunto del Documento *
                </label>
                <input
                  type="text"
                  name="asunto"
                  required
                  placeholder="SE APRUEBA USO DE VÍA O CARGA Y DESCARGA..."
                  value={formData.asunto}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-semibold outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* BLOQUE 2: Parámetros del Vehículo / Flota y Zona */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40 space-y-3">
            <span className="font-black text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2 border-b border-slate-200/60 pb-2 dark:border-slate-800">
              <span className="grid size-5 place-items-center rounded-md bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400 text-[10px]">2</span>
              Parámetros Operativos y Vehiculares
            </span>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                  Placa del Vehículo
                </label>
                <input
                  type="text"
                  name="vehiculoPlaca"
                  placeholder="ABC-123"
                  value={formData.vehiculoPlaca}
                  onChange={(e) => setFormData({ ...formData, vehiculoPlaca: e.target.value.toUpperCase() })}
                  className="w-full rounded-xl border-2 border-sky-400 bg-white px-3 py-2 font-mono font-black outline-none focus:border-sky-600 dark:border-sky-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                  Recibo de Ingreso N°
                </label>
                <input
                  type="text"
                  name="reciboIngresoNumero"
                  placeholder="202400028830"
                  value={formData.reciboIngresoNumero}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono font-bold outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                  Monto Cancelado (S/)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="reciboIngresoMonto"
                  value={formData.reciboIngresoMonto}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-bold outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                  Zona de Circulación o Recorrido
                </label>
                <input
                  type="text"
                  name="zonaCirculacion"
                  value={formData.zonaCirculacion}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                  Horario Autorizado
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="time"
                    name="horarioInicio"
                    value={formData.horarioInicio}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-300 bg-white px-2 py-1.5 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <span className="text-slate-400 font-bold">-</span>
                  <input
                    type="time"
                    name="horarioFin"
                    value={formData.horarioFin}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-300 bg-white px-2 py-1.5 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* BLOQUE 3: Vigencia y Estado Oficial */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40 space-y-3">
            <span className="font-black text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2 border-b border-slate-200/60 pb-2 dark:border-slate-800">
              <span className="grid size-5 place-items-center rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 text-[10px]">3</span>
              Vigencia Temporal y Estado Administrativo
            </span>

            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                  Fecha de Emisión
                </label>
                <input
                  type="date"
                  name="fechaEmision"
                  value={formData.fechaEmision}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                  Inicio de Vigencia
                </label>
                <input
                  type="date"
                  name="fechaInicioVigencia"
                  value={formData.fechaInicioVigencia}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                  Fin de Vigencia
                </label>
                <input
                  type="date"
                  name="fechaFinVigencia"
                  value={formData.fechaFinVigencia}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                  Estado Oficial
                </label>
                <select
                  name="estado"
                  value={formData.estado}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-bold outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="VIGENTE">VIGENTE</option>
                  <option value="VENCIDO">VENCIDO</option>
                  <option value="SUSPENDIDO">SUSPENDIDO</option>
                  <option value="ANULADO">ANULADO</option>
                </select>
              </div>
            </div>
          </div>

          {/* BLOQUE 4: Editor TinyMCE para la Referencia Textual / Cuerpo */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60 space-y-2.5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-2.5 dark:border-slate-800">
              <div>
                <label className="font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100 text-xs flex items-center gap-2">
                  <span className="grid size-5 place-items-center rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400 text-[10px]">4</span>
                  Referencia Textual / Cuerpo de la Resolución (TinyMCE)
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Edita la descripción formal, agrega tablas de vehículos, cláusulas normativas y formato oficial.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRecargarPlantilla}
                className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 shadow-2xs hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/60 dark:text-violet-300 transition active:scale-95 cursor-pointer whitespace-nowrap self-start sm:self-auto"
                title="Genera o restablece la plantilla HTML con los datos actuales del formulario"
              >
                <Icon name="rotateCcw" className="size-3.5" />
                <span>Recargar Plantilla Oficial</span>
              </button>
            </div>

            {/* Componente TinyMCE React Oficial */}
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
              <Editor
                apiKey={import.meta.env.VITE_TINYMCE_API_KEY || 'unmcqzdx4e88wfy3gqtlbelk1w21unqt3sl8hlcltd49u0o8'}
                value={formData.contenido}
                onEditorChange={handleEditorChange}
                init={{
                  height: 320,
                  menubar: false,
                  plugins: [
                    'lists', 'link', 'table', 'code', 'wordcount'
                  ],
                  toolbar: 'undo redo | bold italic underline | alignleft aligncenter alignright alignjustify | bullist numlist | table | code',
                  content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 13px; color: #1e293b; line-height: 1.5; } table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #cbd5e1; padding: 6px; } th { background-color: #f8fafc; }'
                }}
              />
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-5 py-2.5 font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-2.5 font-black text-white shadow-md shadow-violet-600/20 hover:scale-[1.01] active:scale-95 transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando Documento...' : formData.id ? 'Actualizar Documento' : 'Guardar Documento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
