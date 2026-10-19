import { useEffect, useState } from 'react'
import { Icon } from '../ui/Icon'
import { FloatingInput, FloatingSelect } from '../ui/FormInputs'
import { BotonCancelar, BotonCerrarModal, BotonGuardar } from '../ui/ModalControls'
import { apiFetch, sanitizarMensaje } from '../../config/api'
import { fechaLocalActual } from '../../utils/calendarioCurso'
import { showError, showToast } from '../../utils/SwalUtil'

/**
 * «Cobrar pago» de un trámite CERTICAV pendiente, sin salir de la pantalla de origen (Inspecciones).
 * Trae el cobro por su expediente y lo confirma con el mismo servicio que usa Pagos
 * (POST /pagos/{id}/confirmar), así que el recibo queda registrado igual.
 */
export function CobrarPagoModal({ expediente, inscripcion, onClose, onPagado }) {
  const [pago, setPago] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({
    fechaPago: fechaLocalActual(), metodo: 'EFECTIVO', numeroVoucher: '',
  })

  useEffect(() => {
    let activo = true
    // Un trámite se busca por su expediente; la inscripción a un curso, por el DNI del participante
    const consulta = inscripcion
      ? `/pagos?page=1&porPagina=40&estado=PENDIENTE&tipoPago=CURSO&buscar=${encodeURIComponent(inscripcion.dni || '')}`
      : `/pagos?page=1&porPagina=10&estado=PENDIENTE&buscar=${encodeURIComponent(expediente)}`
    apiFetch(consulta)
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (!activo) return
        const pendiente = (payload?.data || []).find((x) => (inscripcion
          ? x.tipoPago === 'CURSO' && String(x.inscripcionId ?? x.origenId) === String(inscripcion.id)
          : x.tipoPago !== 'INTERNAMIENTO') && x.estado === 'PENDIENTE')
        if (!pendiente) {
          showError('Sin cobro pendiente', inscripcion ? 'No se encontró un cobro pendiente para esa inscripción.' : 'No se encontró un cobro pendiente para ese expediente.')
          onClose()
          return
        }
        setPago(pendiente)
      })
      .catch(() => { if (activo) { showError('Error', 'No se pudo abrir el cobro.'); onClose() } })
      .finally(() => { if (activo) setCargando(false) })
    return () => { activo = false }
  }, [expediente, inscripcion?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const cobrar = async (e) => {
    e.preventDefault()
    if (guardando || !pago) return
    if (!form.fechaPago) { showError('Validación Fallida', 'Por favor ingresa la fecha de pago.'); return }
    if (new Date(form.fechaPago) > new Date()) { showError('Validación Fallida', 'La fecha de pago no puede ser futura.'); return }
    if (form.metodo !== 'EFECTIVO' && !form.numeroVoucher.trim()) { showError('Validación Fallida', 'Ingresa el N° de operación del pago.'); return }
    setGuardando(true)
    try {
      // Una inscripción sin cobro generado (fila «cur_pend_») se genera y se cobra en un solo paso, como en Pagos
      const sinGenerar = String(pago.id).startsWith('cur_pend_')
      const response = await apiFetch(sinGenerar ? '/pagos' : `/pagos/${pago.id}/confirmar`, {
        method: 'POST',
        body: sinGenerar
          ? { tipoPago: pago.tipoPago, inscripcionId: Number(pago.origenId ?? pago.inscripcionId), numeroRecibo: '', ...form, pagadoPorNombre: '', pagadoPorDocumento: '', metodoPago: form.metodo }
          : { tipoPago: pago.tipoPago, ...form, pagadoPorNombre: '', pagadoPorDocumento: '', metodoPago: form.metodo },
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(Object.values(result.messages || {}).join(' ') || result.message || 'No se pudo guardar el pago.')
      showToast(result.data?.operacionRepetida > 0
        ? 'Pago registrado. Atención: ese N° de operación ya figura en otro pago.'
        : 'Pago registrado exitosamente')
      onPagado?.()
      onClose()
    } catch (err) {
      showError('Error', sanitizarMensaje(err.message, 'No se pudo registrar el pago.'))
    } finally {
      setGuardando(false)
    }
  }

  // La consulta es instantánea: mientras llega no se muestra nada (una tarjeta vacía parpadeaba antes del formulario)
  if (cargando) return null
  if (!pago) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-enter">
      <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col rounded-3xl border border-slate-200/80 bg-white shadow-2xl dark:border-[var(--border)] dark:bg-[#1C2438]">
        <div className="flex shrink-0 items-center justify-between rounded-t-3xl border-b border-slate-100 bg-white px-6 py-3.5 dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-[var(--bg-subtle)] dark:text-slate-300">
              <Icon name="payment" className="size-4" />
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Cobrar pago</h3>
          </div>
          <BotonCerrarModal onClick={onClose} title="Cerrar" />
        </div>
        <form onSubmit={cobrar} className="flex min-h-0 flex-1 flex-col rounded-b-3xl">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
            <fieldset className="rounded-xl border border-slate-200 p-4 dark:border-[var(--border-strong)]">
              <legend className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-900 dark:text-white">DETALLES DEL RECIBO</legend>
              <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-2.5 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">Monto: S/ {Number(pago.montoTotal).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{pago.referenciaPago}</p>
                <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1.5 border-t border-emerald-200/70 pt-2 text-[11px] sm:grid-cols-2 dark:border-emerald-900/50">
                  {[
                    ['Concepto', pago.concepto, 'sm:col-span-2'],
                    ['Placa', pago.placa],
                    ['Asociación', pago.asociacion],
                    ['A nombre de', pago.titular || pago.pagadoPor],
                    ['Pendiente desde', pago.fechaRegistro ? new Date(String(pago.fechaRegistro).slice(0, 10) + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : null],
                  ].filter(([, valor]) => valor).map(([etiqueta, valor, ancho]) => (
                    <div key={etiqueta} className={ancho || ''}>
                      <dt className="font-semibold uppercase tracking-wider text-emerald-700/70 dark:text-emerald-400/70">{etiqueta}</dt>
                      <dd className="font-bold text-emerald-800 dark:text-emerald-200">{valor}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FloatingInput id="cobro_fecha" label="Fecha que figura en el recibo" required type="date" value={form.fechaPago} onChange={(e) => setForm({ ...form, fechaPago: e.target.value })} />
                <FloatingSelect
                  id="cobro_metodo"
                  label="Método de pago"
                  value={form.metodo}
                  onChange={(e) => setForm({ ...form, metodo: e.target.value })}
                  options={[{ value: 'EFECTIVO', label: 'Efectivo' }, { value: 'TARJETA', label: 'Tarjeta' }]}
                />
                {form.metodo !== 'EFECTIVO' && (
                  <FloatingInput id="cobro_operacion" className="sm:col-span-2" label="N° de operación" required maxLength={50} value={form.numeroVoucher} onChange={(e) => setForm({ ...form, numeroVoucher: e.target.value })} />
                )}
              </div>
            </fieldset>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 px-7 py-4 dark:border-[var(--border)]">
            <BotonCancelar onClick={onClose} />
            <BotonGuardar disabled={guardando}>{guardando ? 'Guardando…' : 'Cobrar y generar recibo'}</BotonGuardar>
          </div>
        </form>
      </div>
    </div>
  )
}
