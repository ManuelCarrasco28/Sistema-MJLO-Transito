import { Icon } from "../ui/Icon"

const ESTILOS_ESTADO = {
  VIGENTE: {
    etiqueta: 'Vigente',
    clases: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
    punto: 'bg-emerald-500',
  },
  VENCIDO: {
    etiqueta: 'Vencido',
    clases: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800',
    punto: 'bg-rose-500',
  },
  ANULADO: {
    etiqueta: 'Anulado',
    clases: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
    punto: 'bg-amber-500',
  },
  NO_REGISTRADO: {
    etiqueta: 'No registrado',
    clases: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    punto: 'bg-slate-400',
  },
}

// Documento vigente del tipo indicado (si lo hay), para avisar antes de emitir un duplicado.
export function documentoVigenteDelTipo(resumen, tipoDocumento, excluirId = null) {
  const doc = resumen.find((r) => r.tipoDocumento === tipoDocumento)
  if (!doc || doc.estado !== 'VIGENTE') return null
  if (excluirId && Number(doc.id) === Number(excluirId)) return null
  return doc
}

export function EstadoDocumentosVehiculo({
  resumen,
  isLoading,
  tipoSeleccionado,
  documentoEditandoId,
  documentoExistente = null,
  onSeleccionarTipo = null,
  onVaciar = null,
}) {
  const duplicado = documentoVigenteDelTipo(resumen, tipoSeleccionado, documentoEditandoId)
  // Si el formulario está actualizando el documento existente no hay duplicado que advertir.
  const aviso = duplicado && !documentoExistente
    ? {
        clases: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
        texto: `Este vehículo ya tiene ${duplicado.etiqueta} vigente (N° ${duplicado.codigo}). Anúlelo o espere a que venza antes de emitir otro.`,
      }
    : null

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-2 dark:border-[var(--border-strong)] dark:bg-slate-800/80 text-xs">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400 leading-tight">
        Documentos del vehículo
      </span>

      {isLoading && resumen.length === 0 ? (
        <p className="py-2 text-center text-slate-400">Consultando documentos...</p>
      ) : (
        <ul className={`grid grid-cols-3 gap-1.5 transition-opacity ${isLoading ? 'opacity-50' : ''}`}>
          {resumen.map((doc) => {
            const estilo = ESTILOS_ESTADO[doc.estado] || ESTILOS_ESTADO.NO_REGISTRADO
            const seleccionado = doc.tipoDocumento === tipoSeleccionado
            const clasesTarjeta = `flex h-full w-full flex-col items-start gap-1 rounded-lg border px-2 py-1.5 text-left transition ${
              seleccionado
                ? 'border-blue-300 bg-blue-50/70 ring-1 ring-blue-200 dark:border-blue-800 dark:bg-blue-950/30 dark:ring-blue-900'
                : 'border-slate-200/70 dark:border-slate-700'
            } ${onSeleccionarTipo && !seleccionado ? 'cursor-pointer hover:border-blue-200 hover:bg-slate-50 dark:hover:bg-slate-700/40' : ''}`

            const contenido = (
              <>
                <span className="w-full min-w-0 break-words font-bold leading-tight text-slate-800 dark:text-white" title={doc.etiqueta}>
                  {doc.etiqueta}
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-px text-[9.5px] font-bold uppercase ${estilo.clases}`}>
                  <span className={`size-1.5 rounded-full ${estilo.punto}`} />
                  {estilo.etiqueta}
                </span>
              </>
            )

            return (
              <li key={doc.tipoDocumento} className="relative">
                {onVaciar && doc.id && (
                  <button
                    type="button"
                    onClick={() => onVaciar(doc)}
                    title={`Vaciar ${doc.etiqueta}: eliminar este documento para registrar uno nuevo`}
                    aria-label={`Vaciar ${doc.etiqueta}`}
                    className="absolute bottom-1.5 right-1.5 z-10 grid size-6 cursor-pointer place-items-center rounded-md border border-rose-200/80 bg-rose-50/80 text-rose-500 transition hover:bg-rose-100 hover:text-rose-600 active:scale-95 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/50"
                  >
                    <Icon name="trash" className="size-3.5" />
                  </button>
                )}
                {onSeleccionarTipo ? (
                  <button
                    type="button"
                    onClick={() => onSeleccionarTipo(doc.tipoDocumento)}
                    aria-pressed={seleccionado}
                    title={seleccionado ? doc.etiqueta : `Emitir ${doc.etiqueta}`}
                    className={clasesTarjeta}
                  >
                    {contenido}
                  </button>
                ) : (
                  <div className={clasesTarjeta}>{contenido}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {aviso && (
        <p className={`mt-1.5 rounded-lg border px-2 py-1 text-[10.5px] font-medium leading-snug ${aviso.clases}`}>
          {aviso.texto}
        </p>
      )}
    </div>
  )
}
