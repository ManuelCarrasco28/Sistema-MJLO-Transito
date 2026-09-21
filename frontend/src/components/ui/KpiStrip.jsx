import { Icon } from './Icon'

export function KpiStrip({ items = [] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
      {items.map((item, index) => (
        <div
          key={index}
          className={`rounded-xl p-4 sm:p-4.5 flex flex-col justify-between min-h-[112px] transition-all hover:shadow-sm ${item.borderClass || ''}`}
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderStyle: 'solid',
            borderWidth: '1.5px',
            borderColor: item.borderColor || 'var(--border-strong)',
            borderTopWidth: '4px',
            borderTopColor: item.accentColor || 'var(--brand)',
            ...item.style,
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[12.5px] font-medium block" style={{ color: 'var(--text-muted)' }}>
                {item.label}
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span
                  className="text-[30px] font-semibold leading-none"
                  style={{
                    color: 'var(--text)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {item.value}
                </span>
              </div>
            </div>

            {item.icon && (
              <span
                className={`grid size-9 shrink-0 place-items-center rounded-[var(--radius)] text-sm ${item.iconClass || 'bg-[var(--brand-soft)] text-[var(--brand)] border border-[var(--border-brand-subtle)]'}`}
              >
                <Icon name={item.icon} className="size-4.5" />
              </span>
            )}
          </div>

          <div className="mt-2.5 pt-1">
            {typeof item.progress === 'number' && (
              <div
                className="h-1.5 w-full overflow-hidden rounded-full mb-1.5"
                style={{ backgroundColor: 'var(--bg-subtle)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.max(0, item.progress))}%`,
                    backgroundColor: item.progressColor || 'var(--ok-fg)',
                  }}
                />
              </div>
            )}
            {item.context && (
              <p className="text-[12px] truncate font-medium" style={{ color: 'var(--text-muted)' }}>
                {item.context}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
