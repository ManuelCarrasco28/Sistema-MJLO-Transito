import { Icon } from '../ui/Icon'
import { PlacaBadge } from '../ui/PlacaBadge'
import { FloatingInput, FloatingSelect } from '../ui/FormInputs'
import { BotonCancelar, BotonCerrarModal, BotonGuardar } from '../ui/ModalControls'

export function PagoPapeletaModal({
  papeletaToAction,
  onClose,
  numeroRecibo,
  setNumeroRecibo,
  fechaPago,
  setFechaPago,
  metodoPago,
  setMetodoPago,
  isProcessingAction,
  onConfirmar,
}) {
  if (!papeletaToAction) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-enter">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl dark:bg-[#1C2438] border border-emerald-500/30 dark:border-emerald-500/20">
        <div className="flex items-center justify-between border-b border-emerald-100 bg-emerald-50/80 px-6 py-4 rounded-t-3xl dark:border-emerald-900/30 dark:bg-emerald-950/40">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-emerald-600 text-white font-black text-sm">
              <Icon name="creditCard" className="size-4.5" />
            </span>
            <div>
              <h3 className="font-extrabold text-slate-800 dark:text-white text-base">Registro de Pago de Papeleta</h3>
              <p className="text-xs font-mono text-emerald-700 dark:text-emerald-400">Papeleta: {papeletaToAction.numeroPapeleta}</p>
            </div>
          </div>
          <BotonCerrarModal onClick={onClose} title="Cerrar" />
        </div>

        <div className="p-6 space-y-4">
          <div className="rounded-2xl bg-emerald-50/50 p-4 border border-emerald-200/60 dark:bg-emerald-950/20 dark:border-emerald-900/40 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="font-bold text-slate-500 dark:text-slate-400">Infractor:</span>
              <span className="font-bold text-slate-800 dark:text-white">{papeletaToAction.conductorNombre || papeletaToAction.infractor}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-500 dark:text-slate-400">Placa / Vehículo:</span>
              <PlacaBadge placa={papeletaToAction.vehiculoPlaca} size="sm" />
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-slate-500 dark:text-slate-400">Infracción{papeletaToAction.detalles?.length > 1 ? 'es' : ''}:</span>
              <span className="font-bold text-slate-800 dark:text-white font-mono">
                {papeletaToAction.detalles?.length > 0
                  ? papeletaToAction.detalles.map(d => d.codigo).join(', ')
                  : (papeletaToAction.tipoInfraccionCodigo || 'G01')}
              </span>
            </div>
            <div className="border-t border-emerald-200 dark:border-emerald-800/60 pt-2 flex justify-between items-center">
              <span className="font-black text-slate-700 dark:text-slate-300 uppercase">Monto a Cancelar:</span>
              <span className="font-mono font-black text-xl text-emerald-600 dark:text-emerald-400">S/ {papeletaToAction.montoTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FloatingInput id="recibo_real" label="Recibo real" maxLength={50} value={numeroRecibo} onChange={e => setNumeroRecibo(e.target.value)} />
            <FloatingInput id="fecha_pago" label="Fecha de pago" type="date" value={fechaPago} onChange={e => setFechaPago(e.target.value)} />
          </div>
          <FloatingSelect
            id="metodo_pago"
            label="Método de Pago"
            value={metodoPago}
            onChange={(e) => setMetodoPago(e.target.value)}
            options={[
              { value: 'EFECTIVO', label: 'Efectivo en Caja Municipal' },
              { value: 'TRANSFERENCIA', label: 'Transferencia / Depósito Bancario' },
              { value: 'TARJETA', label: 'Tarjeta de Débito / Crédito' },
            ]}
          />

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-[var(--border)]">
            <BotonCancelar onClick={onClose} />
            <BotonGuardar
              type="button"
              onClick={onConfirmar}
              disabled={isProcessingAction || !numeroRecibo.trim() || !fechaPago}
              className="inline-flex items-center gap-1.5"
            >
              <Icon name="payment" className="size-4" />
              <span>{isProcessingAction ? 'Procesando...' : 'Confirmar recibo'}</span>
            </BotonGuardar>
          </div>
        </div>
      </div>
    </div>
  )
}
