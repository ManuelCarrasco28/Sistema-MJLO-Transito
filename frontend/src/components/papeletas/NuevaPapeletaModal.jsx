import { useState } from 'react'
import { Icon } from '../ui/Icon'
import { FloatingInput, FloatingSelect } from '../ui/FormInputs'
import { apiFetch, leerMensajeError } from '../../config/api'
import { showError, showToast } from '../../utils/SwalUtil'
import { toTitleCase, normalizarPlaca } from '../../utils/formatters'
import { BotonCancelar, BotonCerrarModal, BotonGuardar } from '../ui/ModalControls'

export function NuevaPapeletaModal({ nuevaForm, setNuevaForm, tiposInfraccion, creandoPapeleta, onSubmit, onClose }) {
  const [isSearchingSunarp, setIsSearchingSunarp] = useState(false)
  const [isSearchingReniec, setIsSearchingReniec] = useState(false)

  const handleSunarpSearch = async () => {
    const rawPlaca = nuevaForm.vehiculoPlaca?.trim() || ''
    const cleanPlaca = rawPlaca.replace(/[^A-Za-z0-9]/g, '').toUpperCase()

    if (!cleanPlaca || cleanPlaca.length !== 6) {
      showError('Placa inválida', 'Ingresa una placa válida de exactamente 6 caracteres alfanuméricos.')
      return
    }

    setIsSearchingSunarp(true)
    try {
      const response = await apiFetch('/pide/sunarp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placa: cleanPlaca,
          codeZona: '11',
          codeOficina: '01'
        })
      })

      if (!response.ok) {
        throw new Error(await leerMensajeError(response, 'No se pudo consultar el servicio vehicular.'))
      }

      const res = await response.json()
      const data = res.data || (res.success && res.data ? res.data : (res.placa ? res : null))

      if (!data) {
        throw new Error(res.message || 'No se encontraron registros para la placa.')
      }

      const cat = (data.categoria || '').toUpperCase().trim()
      const carr = (data.carroceria || '').toUpperCase().trim()
      let inferredClase = nuevaForm.claseVehiculo || ''

      if (cat === 'L1' || cat === 'L2' || cat === 'L3' || carr.includes('LINEAL')) inferredClase = 'Moto Lineal'
      else if (cat === 'L5' || carr.includes('TRIMOVIL') || carr.includes('MOTOTAXI') || carr.includes('MOTOKAR')) inferredClase = 'Mototaxi'
      else if (cat === 'M1' || carr.includes('SEDAN') || carr.includes('HATCHBACK') || carr.includes('SUV') || carr.includes('COUPE') || carr.includes('STATION') || carr.includes('AUTOMOVIL')) inferredClase = 'Automóvil'
      else if (cat === 'M2' || carr.includes('COMBI') || carr.includes('RURAL') || carr.includes('MICROBUS') || carr.includes('MINIBUS')) inferredClase = 'Camioneta Rural'

      setNuevaForm(prev => ({
        ...prev,
        vehiculoPlaca: cleanPlaca,
        marcaVehiculo: data.marca || prev.marcaVehiculo,
        colorVehiculo: data.color || prev.colorVehiculo,
        claseVehiculo: inferredClase,
        motorVehiculo: data.numero_motor || data.nro_motor || prev.motorVehiculo || ''
      }))

      showToast('Datos vehiculares obtenidos', 'success')
    } catch (err) {
      showError('Consulta fallida', err.message || 'Ocurrió un error al consultar el vehículo.')
    } finally {
      setIsSearchingSunarp(false)
    }
  }

  const handleReniecSearch = async () => {
    const rawDni = nuevaForm.conductorDni?.trim() || ''
    if (rawDni.length !== 8 || !/^\d{8}$/.test(rawDni)) {
      showError('DNI inválido', 'Ingresa un DNI válido de exactamente 8 dígitos numéricos.')
      return
    }

    setIsSearchingReniec(true)
    try {
      const response = await apiFetch(`/pide/reniec/${rawDni}`)
      
      if (!response.ok) {
        throw new Error('No se pudo encontrar la información del documento.')
      }

      const { data } = await response.json()

      if (!data) {
        throw new Error('No se encontró a la persona con el documento ingresado.')
      }

      const nombres = (data.nombres || '').toUpperCase()
      const apellidos = `${data.apellidoPaterno || ''} ${data.apellidoMaterno || ''}`.trim().toUpperCase()

      setNuevaForm(prev => ({
        ...prev,
        conductorNombres: nombres || prev.conductorNombres,
        conductorApellidos: apellidos || prev.conductorApellidos
      }))

      showToast('Datos de conductor obtenidos', 'success')
    } catch (err) {
      showError('Consulta fallida', err.message || 'Ocurrió un error al consultar el documento.')
    } finally {
      setIsSearchingReniec(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs" onMouseDown={(e) => { if (e.target === e.currentTarget) e.currentTarget.dataset.downOnOverlay = "1" }} onMouseUp={(e) => { if (e.target === e.currentTarget && e.currentTarget.dataset.downOnOverlay === "1") onClose(); e.currentTarget.dataset.downOnOverlay = "" }}>
      <form onSubmit={(e) => {
        if (!nuevaForm.infraccionesIds.length || nuevaForm.infraccionesIds.some((id) => !id)) {
          e.preventDefault()
          showToast('Seleccione una infracción en cada campo.', 'error')
          return
        }
        onSubmit(e)
      }} className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#1C2438]">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 py-3.5 dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-[var(--bg-subtle)] dark:text-slate-300">
              <Icon name="ticket" className="size-4" />
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Nueva Papeleta</h3>
          </div>
          <BotonCerrarModal onClick={onClose} title="Cerrar" />
        </div>

        <div className="sin-scrollbar min-h-0 min-w-0 flex-1 space-y-5 overflow-x-hidden overflow-y-auto p-4 sm:p-6">
          <fieldset className="min-w-0 rounded-xl border border-slate-200 p-4 dark:border-[var(--border-strong)]">
            <legend className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-900 dark:text-white">Vehículo</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex gap-2">
                <div className="min-w-0 flex-1">
                  <FloatingInput
                    id="nueva_placa"
                    label="Placa"
                    required
                    minLength={6}
                    pattern="[A-Z0-9]{6}"
                    title="La placa debe tener exactamente 6 caracteres (letras y números), sin guion."
                    inputClassName="font-mono uppercase"
                    value={nuevaForm.vehiculoPlaca}
                    onChange={(e) => setNuevaForm({ ...nuevaForm, vehiculoPlaca: normalizarPlaca(e.target.value) })}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSunarpSearch}
                  disabled={isSearchingSunarp || !nuevaForm.vehiculoPlaca?.trim()}
                  className={`flex shrink-0 items-center justify-center rounded-xl bg-indigo-50 px-4 text-indigo-600 transition-colors hover:bg-indigo-100 hover:text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-100 dark:border-indigo-500/20 shadow-xs h-[52px]`}
                  title="Consultar vehículo"
                >
                  <Icon name={isSearchingSunarp ? 'loader' : 'search'} className={`size-5 ${isSearchingSunarp ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <FloatingInput id="nueva_clase" label="Clase" optional value={nuevaForm.claseVehiculo} onChange={(e) => setNuevaForm({ ...nuevaForm, claseVehiculo: e.target.value })} />
              <FloatingInput id="nueva_marca" label="Marca" optional value={nuevaForm.marcaVehiculo} onChange={(e) => setNuevaForm({ ...nuevaForm, marcaVehiculo: e.target.value })} />
              <FloatingInput id="nueva_color" label="Color" optional value={nuevaForm.colorVehiculo} onChange={(e) => setNuevaForm({ ...nuevaForm, colorVehiculo: e.target.value })} />
            </div>
            <p className="mt-2 text-[10.5px] text-slate-400">Si la placa no está registrada, se creará automáticamente con estos datos.</p>
          </fieldset>

          <fieldset className="min-w-0 rounded-xl border border-slate-200 p-4 dark:border-[var(--border-strong)]">
            <legend className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-900 dark:text-white">Conductor / Infractor</legend>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex gap-2">
                <div className="min-w-0 flex-1">
                  <FloatingInput
                    id="nueva_dni"
                    label="DNI"
                    optional
                    maxLength={8}
                    inputClassName="font-mono"
                    value={nuevaForm.conductorDni}
                    onChange={(e) => setNuevaForm({ ...nuevaForm, conductorDni: e.target.value.replace(/\D/g, '') })}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleReniecSearch}
                  disabled={isSearchingReniec || (nuevaForm.conductorDni || '').length !== 8}
                  className={`flex shrink-0 items-center justify-center rounded-xl bg-indigo-50 px-4 text-indigo-600 transition-colors hover:bg-indigo-100 hover:text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-100 dark:border-indigo-500/20 shadow-xs h-[52px]`}
                  title="Consultar documento"
                >
                  <Icon name={isSearchingReniec ? 'loader' : 'search'} className={`size-5 ${isSearchingReniec ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <FloatingInput id="nueva_nombres" label="Nombres" optional value={nuevaForm.conductorNombres} onChange={(e) => setNuevaForm({ ...nuevaForm, conductorNombres: e.target.value })} />
              <FloatingInput id="nueva_apellidos" label="Apellidos" optional value={nuevaForm.conductorApellidos} onChange={(e) => setNuevaForm({ ...nuevaForm, conductorApellidos: e.target.value })} />
            </div>
            <p className="mt-2 text-[10.5px] text-slate-400">Vacío = CONDUCTOR NO PRESENTE.</p>
          </fieldset>

          <fieldset className="min-w-0 rounded-xl border border-slate-200 p-4 dark:border-[var(--border-strong)]">
            <legend className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-900 dark:text-white">Infracción</legend>
            <div className="space-y-4">
              <FloatingInput id="nueva_lugar" label="Lugar de la infracción" required value={nuevaForm.lugar} onChange={(e) => setNuevaForm({ ...nuevaForm, lugar: e.target.value })} />

              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">Infracciones a aplicar</span>
                {nuevaForm.infraccionesIds.map((infId, idx) => (
                  <div key={idx} className="flex min-w-0 gap-2">
                    <FloatingSelect
                      id={`nueva_infraccion_${idx}`}
                      label={`Infracción ${idx + 1}`}
                      className="min-w-0 flex-1"
                      multilineOptions
                      value={String(infId || '')}
                      onChange={(e) => {
                        const newIds = [...nuevaForm.infraccionesIds]
                        newIds[idx] = e.target.value
                        setNuevaForm({ ...nuevaForm, infraccionesIds: newIds })
                      }}
                      options={[
                        { value: '', label: 'Selecciona infracción' },
                        ...tiposInfraccion.map((tipo) => ({
                          value: String(tipo.id),
                          label: `${tipo.codigo} — ${tipo.descripcion || ''} · S/ ${Number(tipo.montoBase || 0).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`,
                        })),
                      ]}
                    />
                    {nuevaForm.infraccionesIds.length > 1 && (
                      <button type="button" onClick={() => {
                        const newIds = [...nuevaForm.infraccionesIds]
                        newIds.splice(idx, 1)
                        setNuevaForm({ ...nuevaForm, infraccionesIds: newIds })
                      }} className="flex shrink-0 items-center justify-center rounded-xl bg-rose-100 px-3 py-2 text-rose-600 hover:bg-rose-200 font-bold transition dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60">
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setNuevaForm({ ...nuevaForm, infraccionesIds: [...nuevaForm.infraccionesIds, ''] })} className="text-xs font-black text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 mt-1 block">
                  + Añadir otra infracción
                </button>

                <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-[var(--border-strong)] dark:bg-[var(--bg-card)]">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Costo Estimado Total</span>
                  <span className="text-base font-black text-rose-600 dark:text-rose-400">
                    S/ {nuevaForm.infraccionesIds.reduce((sum, id) => {
                      if (!id) return sum
                      const tipo = tiposInfraccion.find((t) => String(t.id) === String(id))
                      return sum + (tipo ? Number(tipo.montoBase || 0) : 0)
                    }, 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5">Observación de autoridad</label>
                <textarea
                  value={nuevaForm.observacionesAutoridad}
                  onChange={(e) => setNuevaForm({ ...nuevaForm, observacionesAutoridad: e.target.value })}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold outline-none focus:border-rose-500 focus:bg-white dark:focus:bg-[var(--bg-subtle)] dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-white"
                />
              </div>
            </div>
          </fieldset>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 px-6 py-4 dark:border-[var(--border)]">
          <BotonCancelar onClick={onClose} />
          <BotonGuardar disabled={creandoPapeleta}>
            {creandoPapeleta ? 'Registrando...' : 'Registrar Papeleta'}
          </BotonGuardar>
        </div>
      </form>
    </div>
  )
}
