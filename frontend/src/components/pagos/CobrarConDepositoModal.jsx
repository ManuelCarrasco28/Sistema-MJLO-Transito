import { useEffect, useState } from 'react'
import { Icon } from '../ui/Icon'
import { FloatingInput, FloatingSelect } from '../ui/FormInputs'
import { BotonCancelar, BotonCerrarModal, BotonGuardar } from '../ui/ModalControls'
import { apiFetch, sanitizarMensaje } from '../../config/api'
import { fechaLocalActual } from '../../utils/calendarioCurso'
import { showError, showToast } from '../../utils/SwalUtil'

const dinero = (valor) => `S/ ${Number(valor || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/**
 * Cobro de una papeleta cuyo vehículo está en el depósito: se paga la papeleta y el depósito (días × tarifa) en un solo
 * recibo automático y el vehículo queda liberado con su orden de libertad. Se abre con la papeleta (`papeletaId`) o con
 * el internamiento (`internamientoId`). Si la papeleta no tiene un internamiento retenido avisa por `onSinInternamiento`
 * para que quien la abrió use el cobro simple de la papeleta.
 */
export function CobrarConDepositoModal({ papeletaId, numeroPapeleta, internamientoId, onClose, onPagado, onSinInternamiento }) {
  const [item, setItem] = useState(null)
  const [tarifas, setTarifas] = useState({ guardianiaDia: 0, puedeEditar: false })
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({ fechaPago: fechaLocalActual(), metodo: 'EFECTIVO', numeroVoucher: '', autorizadoDni: '', deposito: '' })

  useEffect(() => {
    let activo = true
    const consulta = internamientoId
      ? `/internamientos?internamientoId=${encodeURIComponent(internamientoId)}&estado=RETENIDO&page=1&porPagina=5`
      : `/internamientos?buscar=${encodeURIComponent(numeroPapeleta || '')}&estado=RETENIDO&page=1&porPagina=20`
    Promise.all([
      apiFetch(consulta).then((res) => (res.ok ? res.json() : null)),
      apiFetch('/internamientos/tarifas').then((res) => (res.ok ? res.json() : null)).catch(() => null),
    ]).then(([lista, t]) => {
      if (!activo) return
      const encontrado = (lista?.data || []).find((x) => (internamientoId ? true : String(x.papeletaId) === String(papeletaId)))
      if (!encontrado) {
        if (onSinInternamiento) onSinInternamiento()
        else { showError('Sin internamiento', 'No se encontró un vehículo retenido para esa papeleta.'); onClose() }
        return
      }
      const tarifa = t?.data || { guardianiaDia: 0, puedeEditar: false }
      setTarifas(tarifa)
      setItem(encontrado)
      const dias = Math.max(1, Number(encontrado.totalDias || 1))
      setForm((previo) => ({
        ...previo,
        autorizadoDni: encontrado.interesadoDni && encontrado.interesadoDni !== 'S/D' ? encontrado.interesadoDni : '',
        deposito: tarifa.guardianiaDia > 0 ? (tarifa.guardianiaDia * dias).toFixed(2) : '',
      }))
    }).catch(() => { if (activo) { showError('Error', 'No se pudo abrir el cobro.'); onClose() } })
      .finally(() => { if (activo) setCargando(false) })
    return () => { activo = false }
  }, [papeletaId, internamientoId]) // eslint-disable-line react-hooks/exhaustive-deps

  // La consulta es instantánea: mientras llega no se muestra nada (una tarjeta vacía parpadeaba antes del formulario)
  if (cargando) return null
  if (!item) return null

  const dias = Math.max(1, Number(item.totalDias || 1))
  const papeletaPorCobrar = Boolean(item.papeletaId) && item.papeletaEstado !== 'PAGADA'
  const montoPapeleta = papeletaPorCobrar ? Number(item.montoPapeleta || 0) : 0
  const deposito = Number(form.deposito || 0)
  const total = montoPapeleta + deposito
  const depositoEditable = tarifas.puedeEditar || !(tarifas.guardianiaDia > 0)

  const cobrar = async (e) => {
    e.preventDefault()
    if (guardando) return
    if (!form.fechaPago) { showError('Validación Fallida', 'Por favor ingresa la fecha de pago.'); return }
    if (new Date(form.fechaPago) > new Date()) { showError('Validación Fallida', 'La fecha de pago no puede ser futura.'); return }
    if (!form.autorizadoDni.trim()) { showError('Validación Fallida', 'Ingresa el DNI de quien retira el vehículo.'); return }
    if (form.metodo !== 'EFECTIVO' && !form.numeroVoucher.trim()) { showError('Validación Fallida', 'Ingresa el N° de operación del pago.'); return }
    setGuardando(true)
    try {
      const res = await apiFetch(`/internamientos/${item.id}/liberar`, {
        method: 'POST',
        body: {
          fechaPago: form.fechaPago,
          metodoPago: form.metodo,
          numeroVoucher: form.metodo === 'EFECTIVO' ? '' : form.numeroVoucher,
          montoGuardiania: deposito,
          autorizadoDni: form.autorizadoDni,
        },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(Object.values(data.messages || {}).join(' ') || data.message || 'No se pudo registrar el cobro.')
      showToast(`Cobro registrado. Orden de libertad ${data.data?.numeroOrdenLibertad || ''}`.trim())
      onPagado?.()
      onClose()
    } catch (err) {
      showError('Error', sanitizarMensaje(err.message, 'No se pudo registrar el cobro.'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-enter">
      <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col rounded-3xl border border-slate-200/80 bg-white shadow-2xl dark:border-[var(--border)] dark:bg-[#1C2438]">
        <div className="flex shrink-0 items-center justify-between rounded-t-3xl border-b border-slate-100 bg-white px-6 py-3.5 dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-[var(--bg-subtle)] dark:text-slate-300">
              <Icon name="payment" className="size-4" />
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Cobrar y liberar vehículo</h3>
          </div>
          <BotonCerrarModal onClick={onClose} title="Cerrar" />
        </div>
        <form onSubmit={cobrar} className="flex min-h-0 flex-1 flex-col rounded-b-3xl">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
            <fieldset className="rounded-xl border border-slate-200 p-4 dark:border-[var(--border-strong)]">
              <legend className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-900 dark:text-white">DETALLES DEL RECIBO</legend>
              <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">Total: {dinero(total)}</p>
                <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 border-t border-emerald-200/70 pt-2 text-[11px] dark:border-emerald-900/50">
                  <dt className="font-semibold uppercase tracking-wider text-emerald-700/70 dark:text-emerald-400/70">Papeleta {item.numeroPapeleta || ''}</dt>
                  <dd className="text-right font-bold text-emerald-800 dark:text-emerald-200">{papeletaPorCobrar ? dinero(montoPapeleta) : 'Ya pagada'}</dd>
                  <dt className="font-semibold uppercase tracking-wider text-emerald-700/70 dark:text-emerald-400/70">Depósito · {dias} {dias === 1 ? 'día' : 'días'}{tarifas.guardianiaDia > 0 ? ` × ${dinero(tarifas.guardianiaDia)}` : ''}</dt>
                  <dd className="text-right font-bold text-emerald-800 dark:text-emerald-200">{dinero(deposito)}</dd>
                </dl>
                <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1.5 border-t border-emerald-200/70 pt-2 text-[11px] sm:grid-cols-2 dark:border-emerald-900/50">
                  {[
                    ['Placa', item.vehiculoPlaca],
                    ['Boleta', item.numeroBoleta],
                    ['Conductor', item.conductorNombre],
                  ].filter(([, valor]) => valor).map(([etiqueta, valor]) => (
                    <div key={etiqueta}>
                      <dt className="font-semibold uppercase tracking-wider text-emerald-700/70 dark:text-emerald-400/70">{etiqueta}</dt>
                      <dd className="font-bold text-emerald-800 dark:text-emerald-200">{valor}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FloatingInput id="liberar_fecha" label="Fecha que figura en el recibo" required type="date" value={form.fechaPago} onChange={(e) => setForm({ ...form, fechaPago: e.target.value })} />
                <FloatingSelect
                  id="liberar_metodo"
                  label="Método de pago"
                  value={form.metodo}
                  onChange={(e) => setForm({ ...form, metodo: e.target.value })}
                  options={[{ value: 'EFECTIVO', label: 'Efectivo' }, { value: 'TARJETA', label: 'Tarjeta' }]}
                />
                {form.metodo !== 'EFECTIVO' && (
                  <FloatingInput id="liberar_operacion" className="sm:col-span-2" label="N° de operación" required maxLength={50} value={form.numeroVoucher} onChange={(e) => setForm({ ...form, numeroVoucher: e.target.value })} />
                )}
                <FloatingInput
                  id="liberar_deposito"
                  label="Depósito (S/)"
                  type="number"
                  min="0"
                  step="0.01"
                  readOnly={!depositoEditable}
                  value={form.deposito}
                  onChange={(e) => setForm({ ...form, deposito: e.target.value })}
                />
                <FloatingInput id="liberar_dni" label="DNI de quien retira el vehículo" required maxLength={15} value={form.autorizadoDni} onChange={(e) => setForm({ ...form, autorizadoDni: e.target.value.replace(/\D/g, '') })} />
              </div>
            </fieldset>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 px-7 py-4 dark:border-[var(--border)]">
            <BotonCancelar onClick={onClose} />
            <BotonGuardar disabled={guardando}>{guardando ? 'Guardando…' : 'Cobrar y liberar'}</BotonGuardar>
          </div>
        </form>
      </div>
    </div>
  )
}
