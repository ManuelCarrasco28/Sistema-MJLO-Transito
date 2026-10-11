export function StatusBadge({ status, label, className = '' }) {
  const norm = String(status || '').toUpperCase().trim()

  // Mapeo semántico según la skill rediseno-sobrio
  let tokenType = 'neutral' // default

  if (['ACTIVO', 'VIGENTE', 'FORMAL', 'PAGADO', 'LIBERADO', 'FINALIZADO', 'APROBADO', 'COMPLETADO', 'ENTREGADO'].includes(norm)) {
    tokenType = 'ok'
  } else if (['EN_CURSO', 'EN CURSO'].includes(norm)) {
    tokenType = 'info'
  } else if (['EN_TRAMITE', 'EN TRÁMITE', 'EN TRAMITE', 'PENDIENTE', 'INFORMAL', 'POR_COBRAR', 'EN REVISIÓN', 'EN REVISION', 'INSCRITO', 'PROGRAMADO'].includes(norm)) {
    tokenType = 'warn'
  } else if (['VENCIDO', 'EXPIRADO', 'OBSERVADO', 'EN_DEPOSITO', 'EN DEPÓSITO', 'EN DEPOSITO', 'RETENIDO', 'BAJA', 'SUSPENDIDO', 'CANCELADO', 'DESAPROBADO', 'INACTIVO', 'RECHAZADO'].includes(norm)) {
    tokenType = 'danger'
  } else if (['ANULADO', 'ANULADA', 'PRESCRITO', 'HISTORICO', 'EFECTIVO', 'TRANSFERENCIA', 'MULTIPLE'].includes(norm)) {
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
    info: {
      color: 'var(--info-fg)',
      backgroundColor: 'var(--info-bg)',
      borderColor: 'var(--border-info)'
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

  const labelMap = {
    EN_CURSO: 'EN CURSO',
    EN_TRAMITE: 'EN TRÁMITE',
    EN_DEPOSITO: 'EN DEPÓSITO',
    POR_COBRAR: 'POR COBRAR',
    PENDIENTE_PAGO: 'PENDIENTE DE PAGO',
    POR_PAGAR: 'POR PAGAR',
  }
  const displayText = labelMap[norm] || String(status || '').replace(/_/g, ' ')

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-sm)] border px-2 py-0.5 text-[12px] font-medium leading-none ${className}`}
      style={style}
    >
      <span
        className="size-1.5 rounded-full shrink-0"
        style={{ backgroundColor: 'currentColor' }}
      />
      <span>{label ?? displayText}</span>
    </span>
  )
}
