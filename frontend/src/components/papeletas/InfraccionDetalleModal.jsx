import { Icon } from '../ui/Icon'
import { BotonCancelar, BotonCerrarModal } from '../ui/ModalControls'

export function InfraccionDetalleModal({ selectedInfraccion, onClose }) {
  if (!selectedInfraccion) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-enter"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-[var(--border)] dark:bg-[#1C2438]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-rose-100 bg-rose-50/80 px-5 py-4 dark:border-rose-950/60 dark:bg-rose-950/40">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-rose-600 text-white font-black text-sm shadow-sm">
              <Icon name="scale" className="size-4" />
            </span>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Detalle de Infracción
              </h3>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Reglamento de Tránsito Municipal
              </p>
            </div>
          </div>
          <BotonCerrarModal onClick={onClose} title="Cerrar" />
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4 border border-slate-100 dark:bg-slate-900/50 dark:border-[var(--border)]">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Código</span>
              <p className="text-2xl font-black font-mono text-rose-700 dark:text-rose-400">
                {selectedInfraccion.codigo}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Gravedad</span>
              <div className="mt-0.5">
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-black ${selectedInfraccion.gravedad === 'MUY GRAVE'
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                    : selectedInfraccion.gravedad === 'GRAVE'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-900'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-900'
                  }`}>
                  {selectedInfraccion.gravedad}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Descripción
            </h4>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 text-xs font-medium leading-relaxed text-slate-800 dark:border-[var(--border)] dark:bg-slate-900/40 dark:text-slate-200">
              {selectedInfraccion.descripcion}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            {selectedInfraccion.monto > 0 && (
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-[var(--border)] dark:bg-slate-900/40">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Monto Multa</span>
                <p className="text-base font-black font-mono text-slate-900 dark:text-white">
                  S/ {Number(selectedInfraccion.monto).toFixed(2)}
                </p>
              </div>
            )}
            {selectedInfraccion.porcentajeUit && (
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-[var(--border)] dark:bg-slate-900/40">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Sanción UIT</span>
                <p className="text-base font-black font-mono text-slate-900 dark:text-white">
                  {selectedInfraccion.porcentajeUit}% UIT
                </p>
              </div>
            )}
            {selectedInfraccion.numeroPapeleta && (
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-[var(--border)] dark:bg-slate-900/40 col-span-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Papeleta Asociada</span>
                <p className="text-xs font-bold font-mono text-rose-700 dark:text-rose-400">
                  {selectedInfraccion.numeroPapeleta}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-100 bg-slate-50/50 p-4 dark:border-[var(--border)] dark:bg-slate-900/40">
          <BotonCancelar onClick={onClose}>Cerrar</BotonCancelar>
        </div>
      </div>
    </div>
  )
}
