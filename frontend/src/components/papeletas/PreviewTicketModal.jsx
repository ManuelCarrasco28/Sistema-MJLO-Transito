import { Icon } from '../ui/Icon'

export function PreviewTicketModal({ selectedPapeleta, onClose }) {
  if (!selectedPapeleta) return null

  const montoBaseTotal = selectedPapeleta.detalles?.length > 0
    ? selectedPapeleta.detalles.reduce((acc, d) => acc + (parseFloat(d.monto) || 0), 0)
    : (parseFloat(selectedPapeleta.montoTotal) || 0)

  const descuentoTotal = selectedPapeleta.detalles?.length > 0
    ? selectedPapeleta.detalles.reduce((acc, d) => acc + (parseFloat(d.descuento) || 0), 0)
    : 0

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-enter print:static print:block print:p-0 print:bg-transparent">
      <div className="absolute top-4 right-4 flex gap-3 print:hidden">
        <button onClick={() => window.print()} className="rounded-xl bg-white px-5 py-2.5 text-xs font-extrabold text-rose-600 shadow-lg hover:bg-rose-50 cursor-pointer flex items-center gap-2">
          <Icon name="print" className="size-4" /> Imprimir Ticket
        </button>
        <button onClick={onClose} className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-extrabold text-white shadow-lg hover:bg-slate-800 cursor-pointer">
          Cerrar
        </button>
      </div>

      <div id="seccion-impresion-ticket" className="w-full max-w-[320px] bg-white text-black font-mono text-[11px] leading-tight shadow-2xl print:shadow-none print:max-w-full">
        <div className="p-4 border border-slate-200 print:border-none print:p-0">
          <div className="text-center mb-3">
            <h2 className="text-sm font-black uppercase mb-1">MUNICIPALIDAD DISTRITAL</h2>
            <h3 className="text-xs font-bold uppercase mb-1">José Leonardo Ortiz</h3>
            <p className="text-[10px]">Subgerencia de Tránsito</p>
            <p className="text-[10px]">RUC: 20141234567</p>
          </div>

          <div className="border-t-2 border-dashed border-black my-2"></div>

          <div className="text-center mb-2">
            <h3 className="font-black text-sm uppercase">BOLETA DE INFRACCIÓN</h3>
            <p className="font-bold text-sm mt-0.5">{selectedPapeleta.numeroPapeleta}</p>
          </div>

          <div className="border-t-2 border-dashed border-black my-2"></div>

          <div className="space-y-1 mb-2">
            <div className="flex justify-between">
              <span className="font-bold">FECHA/HORA:</span>
              <span>{new Date(selectedPapeleta.fechaHora).toLocaleString()}</span>
            </div>
            <div>
              <span className="font-bold">LUGAR:</span>
              <p className="break-words">{selectedPapeleta.lugar}</p>
            </div>
          </div>

          <div className="border-t-2 border-dashed border-black my-2"></div>

          <div className="space-y-2 mb-2">
            <span className="font-bold">INFRACCIONES:</span>
            {selectedPapeleta.detalles?.length > 0 ? (
              selectedPapeleta.detalles.map((d, i) => (
                <div key={i} className="pl-1 border-b border-dotted border-slate-300 pb-1.5 last:border-b-0 last:pb-0">
                  <div className="flex justify-between font-bold">
                    <span>{d.codigo} ({d.gravedad || 'LEVE'})</span>
                    <span>S/ {parseFloat(d.monto || 0).toFixed(2)}</span>
                  </div>
                  {d.descripcion && (
                    <p className="text-[10px] text-slate-700 leading-tight mt-0.5 break-words">
                      {d.descripcion}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <div className="pl-1">
                <div className="flex justify-between font-bold">
                  <span>{selectedPapeleta.tipoInfraccionCodigo || 'N/A'} ({selectedPapeleta.tipoInfraccionGravedad || 'LEVE'})</span>
                  <span>S/ {selectedPapeleta.montoTotal.toFixed(2)}</span>
                </div>
                {selectedPapeleta.tipoInfraccionDescripcion && (
                  <p className="text-[10px] text-slate-700 leading-tight mt-0.5 break-words">
                    {selectedPapeleta.tipoInfraccionDescripcion}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="border-t-2 border-dashed border-black my-2"></div>

          <div className="space-y-1 mb-2">
            <div className="flex justify-between">
              <span className="font-bold">PLACA:</span>
              <span>{selectedPapeleta.vehiculoPlaca}</span>
            </div>
            <div>
              <span className="font-bold">INFRACTOR:</span>
              <p className="break-words uppercase">{selectedPapeleta.infractor}</p>
            </div>
            <div>
              <span className="font-bold">INSPECTOR:</span>
              <p className="break-words uppercase">
                {selectedPapeleta.inspector} {selectedPapeleta.inspectorCIP ? `(CIP: ${selectedPapeleta.inspectorCIP})` : ''}
              </p>
            </div>
          </div>

          <div className="border-t-2 border-dashed border-black my-2"></div>

          <div className="space-y-1 mb-2">
            <div className="flex justify-between">
              <span>Monto Base:</span>
              <span>S/ {montoBaseTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Descuento:</span>
              <span>- S/ {descuentoTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Gastos/Int:</span>
              <span>+ S/ 0.00</span>
            </div>
          </div>

          <div className="border-t-2 border-dashed border-black my-2"></div>

          <div className="flex justify-between items-center my-2">
            <span className="font-black text-sm uppercase">Total a Pagar:</span>
            <span className="font-black text-sm">S/ {selectedPapeleta.montoTotal.toFixed(2)}</span>
          </div>

          <div className="text-center mt-1">
            <span className="text-[10px] uppercase block">Estado: {selectedPapeleta.estado === 'PENDIENTE_PAGO' ? 'PENDIENTE' : selectedPapeleta.estado}</span>
          </div>

          {selectedPapeleta.firmaConductorImg && (
            <>
              <div className="border-t-2 border-dashed border-black my-2"></div>
              <div className="text-center mt-2 flex flex-col items-center">
                <img src={selectedPapeleta.firmaConductorImg} alt="Firma Conductor" className="max-h-16 object-contain" />
                <span className="text-[10px] uppercase font-bold mt-1">Firma del Infractor</span>
              </div>
            </>
          )}

          <div className="border-t-2 border-dashed border-black my-2"></div>

          <div className="text-center mt-3 text-[9px] text-slate-800">
            <p>Tiene 5 días hábiles para acceder</p>
            <p>al descuento por pronto pago.</p>
            <p className="mt-2 font-bold">Conserve este ticket</p>
            <p>www.munijlo.gob.pe/transito</p>
          </div>
        </div>
      </div>
    </div>
  )
}
