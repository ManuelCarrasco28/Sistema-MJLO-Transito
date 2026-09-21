export function StatusBadge({ status, className = '' }) {
  const norm = String(status || '').toUpperCase().trim()

  // Mapeo semántico según la skill rediseno-sobrio
  let tokenType = 'neutral' // default

  if (['ACTIVO', 'VIGENTE', 'FORMAL', 'PAGADO', 'LIBERADO', 'FINALIZADO', 'APROBADO', 'COMPLETADO'].includes(norm)) {
    tokenType = 'ok'
  } else if (['EN_TRAMITE', 'EN TRÁMITE', 'EN TRAMITE', 'PENDIENTE', 'INFORMAL', 'POR_COBRAR', 'EN REVISIÓN', 'EN REVISION', 'INSCRITO', 'PROGRAMADO'].includes(norm)) {
    tokenType = 'warn'
  } else if (['VENCIDO', 'EXPIRADO', 'OBSERVADO', 'EN_DEPOSITO', 'EN DEPÓSITO', 'EN DEPOSITO', 'RETENIDO', 'BAJA', 'INACTIVO'].includes(norm)) {
    tokenType = 'danger'
  } else if (['ANULADO', 'PRESCRITO', 'HISTORICO', 'EFECTIVO', 'TRANSFERENCIA', 'MULTIPLE'].includes(norm)) {
    tokenType = 'neutral'
  }

  const tokenStyles = {
    ok: {
      color: 'var(--ok-fg)',
      backgroundColor: 'var(--ok-bg)',
      borderColor: 'var(--border-ok)'
    },
    warn: {
      color: 'var(--warn-fg)',
      backgroundColor: 'var(--warn-bg)',
      borderColor: 'var(--border-warn)'
    },
    danger: {
      color: 'var(--danger-fg)',
      backgroundColor: 'var(--danger-bg)',
      borderColor: 'var(--border-danger)'
    },
    neutral: {
      color: 'var(--neutral-fg)',
      backgroundColor: 'var(--neutral-bg)',
      borderColor: 'var(--border)'
    }
  }

  const style = tokenStyles[tokenType]

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-sm)] border px-2 py-0.5 text-[12px] font-medium leading-none ${className}`}
      style={style}
    >
      <span
        className="size-1.5 rounded-full shrink-0"
        style={{ backgroundColor: 'currentColor' }}
      />
      <span>{status}</span>
    </span>
  )
}
