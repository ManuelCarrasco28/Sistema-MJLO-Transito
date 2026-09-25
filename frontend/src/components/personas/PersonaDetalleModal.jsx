import { Icon } from '../ui/Icon'
import { StatusBadge } from '../ui/StatusBadge'
import { formatFecha } from '../../utils/formatters'

function calcularEdad(fechaNacStr) {
  if (!fechaNacStr) return null
  try {
    const d = new Date(fechaNacStr)
    const diffMs = Date.now() - d.getTime()
    const ageDt = new Date(diffMs)
    const edad = Math.abs(ageDt.getUTCFullYear() - 1970)
    return !isNaN(edad) && edad > 0 && edad < 120 ? `(${edad} años)` : null
  } catch {
    return null
  }
}

function formatSexo(val) {
  if (!val) return '—'
  const v = val.toUpperCase().trim()
  if (v === 'M' || v === 'MASCULINO') return 'Masculino'
  if (v === 'F' || v === 'FEMENINO') return 'Femenino'
  return val
}

export function PersonaDetalleModal({ selectedPersona, onClose }) {
  if (!selectedPersona) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-enter">
      <div className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl dark:bg-[var(--bg-surface)] border border-slate-200/80 dark:border-[var(--border)]">
        <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-3.5 rounded-t-3xl dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-[var(--bg-subtle)] dark:text-slate-300">
              <Icon name="user" className="size-4" />
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Ficha del Administrado
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Cerrar ficha"
            className="grid size-9 shrink-0 place-items-center rounded-xl border border-rose-200/80 bg-rose-50/70 text-rose-500 hover:bg-rose-100 hover:text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/50 transition-all active:scale-95 cursor-pointer shadow-xs"
          >
            <Icon name="close" className="size-5" />
          </button>
        </div>

        <div className="p-5 pb-6 space-y-3">
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 flex flex-col sm:flex-row items-center gap-4 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)] shadow-xs">
            {selectedPersona.fotoImg ? (
              <img
                src={selectedPersona.fotoImg}
                alt={selectedPersona.nombres}
                onError={(e) => {
                  e.currentTarget.onerror = null
                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedPersona.nombres)}+${encodeURIComponent(selectedPersona.apellidoPaterno)}&background=f1f5f9&color=475569&bold=true`
                }}
                className="w-[84px] h-[105px] rounded-xl object-cover border-2 border-slate-200 dark:border-[var(--border-strong)] shrink-0 shadow-xs bg-slate-100 dark:bg-[var(--bg-subtle)]"
              />
            ) : (
              <div className="w-[84px] h-[105px] rounded-xl font-bold flex flex-col items-center justify-center text-xl uppercase select-none border border-slate-200 bg-slate-800 text-white shrink-0 shadow-xs">
                <span>{selectedPersona.nombres?.[0] || '?'}{selectedPersona.apellidoPaterno?.[0] || ''}</span>
                <span className="text-[10px] text-slate-400 font-normal tracking-wide mt-1">Sin foto</span>
              </div>
            )}
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <h4 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                {[selectedPersona.apellidoPaterno, selectedPersona.apellidoMaterno].filter(Boolean).join(' ') || selectedPersona.nombres}
                {selectedPersona.apellidoPaterno && selectedPersona.nombres ? `, ${selectedPersona.nombres}` : ''}
              </h4>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-mono text-[11px] font-bold text-slate-700 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-slate-200 shadow-xs">
                  <span className="text-slate-400 font-semibold">
                    {selectedPersona.tipoDocumento === 'DOCUMENTO NACIONAL DE IDENTIDAD' ? 'DNI' : selectedPersona.tipoDocumento}:
                  </span>
                  <strong>{selectedPersona.numeroDocumento}</strong>
                </span>

                <StatusBadge status={selectedPersona.estado} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 dark:border-[var(--border)] dark:bg-slate-900/50 space-y-1.5 shadow-xs">
              <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Datos personales
              </h5>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 shrink-0 mr-2">Nombres</span>
                  <span className="font-bold text-slate-800 dark:text-white text-right">
                    {selectedPersona.nombres || '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 shrink-0 mr-2">Apellido paterno</span>
                  <span className="font-bold text-slate-800 dark:text-white text-right">
                    {selectedPersona.apellidoPaterno || '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 shrink-0 mr-2">Apellido materno</span>
                  <span className="font-bold text-slate-800 dark:text-white text-right">
                    {selectedPersona.apellidoMaterno || '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 shrink-0 mr-2">Sexo</span>
                  <span className="font-bold text-slate-800 dark:text-white">
                    {formatSexo(selectedPersona.sexo)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 shrink-0 mr-2">Nacimiento</span>
                  <span className="font-bold text-slate-800 dark:text-white text-right">
                    {formatFecha(selectedPersona.fechaNacimiento)} {calcularEdad(selectedPersona.fechaNacimiento)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 shrink-0 mr-2">Estado civil</span>
                  <span className="font-bold text-slate-800 dark:text-white">
                    {selectedPersona.estadoCivil || '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 shrink-0 mr-2">Ocupación</span>
                  <span className="font-bold text-slate-800 dark:text-white text-right break-words" title={selectedPersona.profesion}>
                    {selectedPersona.profesion || '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 shrink-0 mr-2">N° Licencia</span>
                  {selectedPersona.numeroLicencia ? (
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                      {selectedPersona.numeroLicencia}
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                      Sin licencia
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 dark:border-[var(--border)] dark:bg-slate-900/50 space-y-1.5 shadow-xs">
              <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Contacto
              </h5>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 shrink-0 mr-2">Celular</span>
                  <span className="font-bold text-slate-800 dark:text-white">
                    {selectedPersona.celular || '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 shrink-0 mr-2">Teléfono fijo</span>
                  <span className="font-semibold text-slate-800 dark:text-white">
                    {selectedPersona.telefono || '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 shrink-0 mr-2">Email</span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400 text-right break-all select-all" title={selectedPersona.email}>
                    {selectedPersona.email || '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 shrink-0 mr-2">Dirección</span>
                  <span className="font-semibold text-slate-800 dark:text-white text-right break-words" title={selectedPersona.direccion}>
                    {selectedPersona.direccion || '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-3.5">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 dark:border-[var(--border)] dark:bg-slate-900/50 flex flex-col shadow-xs max-h-60">
              <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 shrink-0">
                Historial de Papeletas ({selectedPersona.historialPapeletas?.length || 0})
              </h5>
              <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                {!selectedPersona.historialPapeletas || selectedPersona.historialPapeletas.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-4">No registra papeletas.</p>
                ) : (
                  selectedPersona.historialPapeletas.map((pap, i) => (
                    <div key={i} className="bg-white dark:bg-[var(--bg-subtle)] p-2 rounded-xl border border-slate-200 dark:border-[var(--border-strong)] text-xs">
                      <div className="flex justify-between items-center mb-1">
                        <strong className="text-rose-600 dark:text-rose-400 font-mono">{pap.numero_papeleta}</strong>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[var(--bg-surface)] text-slate-600 dark:text-slate-400">{pap.estado}</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 font-semibold">Placa: {pap.placa}</p>
                      <p className="text-slate-500 dark:text-slate-400 text-[10px]">{formatFecha(pap.fecha_hora)} - {pap.lugar}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 dark:border-[var(--border)] dark:bg-slate-900/50 flex flex-col shadow-xs max-h-60">
              <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 shrink-0">
                Historial de Cursos ({selectedPersona.historialCursos?.length || 0})
              </h5>
              <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                {!selectedPersona.historialCursos || selectedPersona.historialCursos.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-4">No registra cursos de seguridad vial.</p>
                ) : (
                  selectedPersona.historialCursos.map((cur, i) => (
                    <div key={i} className="bg-white dark:bg-[var(--bg-subtle)] p-2 rounded-xl border border-slate-200 dark:border-[var(--border-strong)] text-xs">
                      <div className="flex justify-between items-start mb-1">
                        <strong className="text-indigo-600 dark:text-indigo-400 leading-tight">{cur.curso_nombre}</strong>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ml-2 whitespace-nowrap ${
                          cur.estado === 'APROBADO' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400' :
                          cur.estado === 'DESAPROBADO' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400' :
                          'bg-slate-100 text-slate-600 dark:bg-[var(--bg-surface)] dark:text-slate-400'
                        }`}>{cur.estado}</span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-[10px]">Inscrito: {formatFecha(cur.fecha_inscripcion)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
