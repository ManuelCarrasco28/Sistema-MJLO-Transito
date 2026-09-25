import { Icon } from '../ui/Icon'
import { FloatingInput } from '../ui/FormInputs'

export function NuevaPapeletaModal({ nuevaForm, setNuevaForm, tiposInfraccion, creandoPapeleta, onSubmit, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
      <form onSubmit={onSubmit} className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[var(--bg-surface)]">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 py-3.5 dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-[var(--bg-subtle)] dark:text-slate-300">
              <Icon name="ticket" className="size-4" />
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Nueva Papeleta</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Cerrar"
            className="grid size-9 shrink-0 place-items-center rounded-xl border border-rose-200/80 bg-rose-50/70 text-rose-500 hover:bg-rose-100 hover:text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/50 transition-all active:scale-95 cursor-pointer shadow-xs"
          >
            <Icon name="close" className="size-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
          <fieldset className="min-w-0 rounded-xl border border-slate-200 p-4 dark:border-[var(--border-strong)]">
            <legend className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Vehículo</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <FloatingInput
                id="nueva_placa"
                label="Placa"
                required
                inputClassName="font-mono uppercase"
                value={nuevaForm.vehiculoPlaca}
                onChange={(e) => setNuevaForm({ ...nuevaForm, vehiculoPlaca: e.target.value.toUpperCase() })}
              />
              <FloatingInput id="nueva_clase" label="Clase" optional value={nuevaForm.claseVehiculo} onChange={(e) => setNuevaForm({ ...nuevaForm, claseVehiculo: e.target.value })} />
              <FloatingInput id="nueva_marca" label="Marca" optional value={nuevaForm.marcaVehiculo} onChange={(e) => setNuevaForm({ ...nuevaForm, marcaVehiculo: e.target.value })} />
              <FloatingInput id="nueva_color" label="Color" optional value={nuevaForm.colorVehiculo} onChange={(e) => setNuevaForm({ ...nuevaForm, colorVehiculo: e.target.value })} />
            </div>
            <p className="mt-2 text-[10.5px] text-slate-400">Si la placa no está registrada, se creará automáticamente con estos datos.</p>
          </fieldset>

          <fieldset className="min-w-0 rounded-xl border border-slate-200 p-4 dark:border-[var(--border-strong)]">
            <legend className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Conductor / Infractor</legend>
            <div className="grid gap-4 sm:grid-cols-3">
              <FloatingInput
                id="nueva_dni"
                label="DNI"
                optional
                maxLength={11}
                inputClassName="font-mono"
                value={nuevaForm.conductorDni}
                onChange={(e) => setNuevaForm({ ...nuevaForm, conductorDni: e.target.value.replace(/\D/g, '') })}
              />
              <FloatingInput id="nueva_nombres" label="Nombres" optional value={nuevaForm.conductorNombres} onChange={(e) => setNuevaForm({ ...nuevaForm, conductorNombres: e.target.value })} />
              <FloatingInput id="nueva_apellidos" label="Apellidos" optional value={nuevaForm.conductorApellidos} onChange={(e) => setNuevaForm({ ...nuevaForm, conductorApellidos: e.target.value })} />
            </div>
            <p className="mt-2 text-[10.5px] text-slate-400">Vacío = CONDUCTOR NO PRESENTE.</p>
          </fieldset>

          <fieldset className="min-w-0 rounded-xl border border-slate-200 p-4 dark:border-[var(--border-strong)]">
            <legend className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Infracción</legend>
            <div className="space-y-4">
              <FloatingInput id="nueva_lugar" label="Lugar de la infracción" required value={nuevaForm.lugar} onChange={(e) => setNuevaForm({ ...nuevaForm, lugar: e.target.value })} />

              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">Infracciones a aplicar</span>
                {nuevaForm.infraccionesIds.map((infId, idx) => (
                  <div key={idx} className="flex gap-2">
                    <select
                      required
                      value={infId}
                      onChange={(e) => {
                        const newIds = [...nuevaForm.infraccionesIds]
                        newIds[idx] = e.target.value
                        setNuevaForm({ ...nuevaForm, infraccionesIds: newIds })
                      }}
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold outline-none focus:border-rose-500 focus:bg-white dark:focus:bg-[var(--bg-subtle)] dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-white"
                    >
                      <option value="">Selecciona infracción</option>
                      {tiposInfraccion.map((tipo) => (
                        <option key={tipo.id} value={tipo.id}>{tipo.codigo} — {tipo.descripcion.length > 85 ? tipo.descripcion.substring(0, 85) + '...' : tipo.descripcion} · S/ {Number(tipo.montoBase || 0).toFixed(2)}</option>
                      ))}
                    </select>
                    {nuevaForm.infraccionesIds.length > 1 && (
                      <button type="button" onClick={() => {
                        const newIds = [...nuevaForm.infraccionesIds]
                        newIds.splice(idx, 1)
                        setNuevaForm({ ...nuevaForm, infraccionesIds: newIds })
                      }} className="flex items-center justify-center rounded-xl bg-rose-100 px-3 py-2 text-rose-600 hover:bg-rose-200 font-bold transition dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60">
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setNuevaForm({ ...nuevaForm, infraccionesIds: [...nuevaForm.infraccionesIds, ''] })} className="text-xs font-black text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 mt-1 block">
                  + Añadir otra infracción
                </button>
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
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer dark:border-[var(--border-strong)] dark:text-slate-300 dark:hover:bg-[var(--bg-subtle)]">Cancelar</button>
          <button disabled={creandoPapeleta} type="submit" className="rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 px-5 py-2 text-xs font-extrabold text-white shadow-md shadow-rose-600/25 hover:brightness-105 transition-all cursor-pointer disabled:opacity-60">
            {creandoPapeleta ? 'Registrando...' : 'Registrar Papeleta'}
          </button>
        </div>
      </form>
    </div>
  )
}
