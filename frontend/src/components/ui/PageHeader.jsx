import { Icon } from './Icon'

export function PageHeader({ icon, title, description, badge, action }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-1">
      <div className="flex items-center gap-3.5">
        {icon && (
          <span
            className="grid size-11 shrink-0 place-items-center rounded-[var(--radius)] text-lg shadow-2xs border"
            style={{
              backgroundColor: 'var(--brand-soft)',
              borderColor: 'var(--border-brand-subtle)',
              color: 'var(--brand)',
            }}
          >
            <Icon name={icon} className="size-5.5" />
          </span>
        )}
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
              {title}
            </h1>
            {badge && <span>{badge}</span>}
          </div>
          {description && (
            <p className="mt-0.5 text-[13px] font-normal" style={{ color: 'var(--text-muted)' }}>
              {description}
            </p>
          )}
        </div>
      </div>
      {action && (
        <div className="flex shrink-0 items-center gap-2">
          {action}
        </div>
      )}
    </div>
  )
}
