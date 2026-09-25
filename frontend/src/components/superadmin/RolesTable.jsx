import { useMemo, useState } from 'react'
import { Icon } from '../ui/Icon'

export function RolesTable({ roles, loading, onEdit }) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredRoles = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return roles
    return roles.filter((grupo) => {
      const matchRol = (grupo.rol || '').toLowerCase().includes(q)
      const matchMiembro = (grupo.miembros || []).some((m) =>
        (m.nombre_usuario || '').toLowerCase().includes(q) ||
        (m.nombre_completo || '').toLowerCase().includes(q)
      )
      return matchRol || matchMiembro
    })
  }, [roles, searchTerm])

  const totalAsignaciones = useMemo(() => {
    return roles.reduce((acc, r) => acc + (r.miembros?.length || 0), 0)
  }, [roles])

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-[var(--border)] sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Icon name="search" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar rol, cargo o usuario asignado..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-10 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white dark:focus:bg-[var(--bg-subtle)] focus:ring-2 focus:ring-blue-500/20 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-white dark:focus:border-blue-400"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-2 text-xs font-medium text-slate-500 dark:border-[var(--border)] dark:bg-slate-900/30 dark:text-slate-400">
        <span>
          Mostrando <strong className="text-slate-800 dark:text-white">{filteredRoles.length}</strong> de{' '}
          <strong className="text-slate-800 dark:text-white">{roles.length}</strong> roles registrados ({totalAsignaciones} usuarios vinculados)
        </span>
        <span className="hidden sm:inline text-[11px] text-slate-400">
          Roles y perfiles de usuario MDJLO · {new Date().getFullYear()}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-[var(--border)] dark:bg-slate-900/80 dark:text-slate-400">
            <tr>
              <th className="px-3.5 py-3.5 whitespace-nowrap">Rol / Cargo</th>
              <th className="px-3.5 py-3.5 whitespace-nowrap text-center">Total Asignados</th>
              <th className="px-3.5 py-3.5 whitespace-nowrap">Usuarios con este Rol</th>
              <th className="px-3.5 py-3.5 whitespace-nowrap text-center">Estado</th>
              <th className="sticky right-0 z-20 bg-slate-50/95 px-4 py-3.5 text-right whitespace-nowrap border-l border-slate-200/60 shadow-[-4px_0_8px_rgba(0,0,0,0.03)] dark:border-[var(--border)] dark:bg-slate-900/95 dark:shadow-[-4px_0_8px_rgba(0,0,0,0.2)]">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-[var(--border)]">
            {loading ? (
              <tr><td colSpan="5" className="px-4 py-8 text-center font-bold text-slate-500">Cargando roles...</td></tr>
            ) : filteredRoles.length ? filteredRoles.map((grupo) => (
              <tr key={grupo.rol} className="group transition-colors hover:bg-blue-50/30 dark:hover:bg-[var(--bg-subtle)]">
                <td className="px-3.5 py-3.5 align-top">
                  <p className="font-black text-slate-800 dark:text-white">{grupo.rol}</p>
                  <p className="text-xs font-semibold text-slate-400">Perfil del sistema</p>
                </td>
                <td className="px-3.5 py-3.5 align-top">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                    <span className="size-1.5 rounded-full bg-blue-500" />
                    {grupo.miembros.length} {grupo.miembros.length === 1 ? 'usuario' : 'usuarios'}
                  </span>
                </td>
                <td className="px-3.5 py-3.5 align-top">
                  <div className="flex flex-wrap gap-1.5 max-w-xl">
                    {grupo.miembros.length ? grupo.miembros.map((m) => (
                      <span
                        key={m.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200/80 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-slate-200"
                      >
                        <span className="font-bold text-slate-900 dark:text-white">{m.nombre_usuario}</span>
                        <span className="text-[11px] text-slate-400">({m.nombre_completo})</span>
                      </span>
                    )) : (
                      <span className="text-xs italic text-slate-400">Sin usuarios asignados</span>
                    )}
                  </div>
                </td>
                <td className="px-3.5 py-3.5 align-top">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-extrabold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    <span className="size-1.5 rounded-full bg-current" />
                    ACTIVO
                  </span>
                </td>
                <td className="sticky right-0 z-10 bg-white px-4 py-3.5 text-right whitespace-nowrap border-l border-slate-100 shadow-[-4px_0_8px_rgba(0,0,0,0.03)] group-hover:bg-blue-50/40 dark:border-slate-800/80 dark:bg-[var(--bg-surface)] dark:shadow-[-4px_0_8px_rgba(0,0,0,0.2)] dark:group-hover:bg-slate-800/60 align-top">
                  <div className="flex justify-end gap-1.5">
                    {grupo.miembros.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => onEdit(grupo.miembros[0])}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600 transition hover:bg-blue-500 hover:text-white dark:bg-blue-950/60 dark:text-blue-400"
                        title="Gestionar rol"
                      >
                        <Icon name="shieldCheck" className="size-4" />
                        <span>Gestionar</span>
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 italic">N/A</span>
                    )}
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="5" className="p-12 text-center"><Icon name="lock" className="size-10 mb-2 mx-auto text-slate-300 dark:text-slate-600" /><p className="font-bold text-slate-600 dark:text-slate-300">No se encontraron roles coincidentes</p></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
