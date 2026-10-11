import { useMemo, useState } from 'react'
import { Icon } from '../ui/Icon'
import { StatusBadge } from '../ui/StatusBadge'
import { BotonAccion, BotonSecundario, CLASE_TABLA_ENCABEZADO } from '../ui/ToolbarButtons'

export function RolesTable({ roles, loading, onEdit, onReload }) {
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

  const totalAsignaciones = useMemo(() => roles.reduce((acc, r) => acc + (r.miembros?.length || 0), 0), [roles])

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438] overflow-hidden">
      <div className="flex flex-col gap-2.5 border-b border-slate-100 px-4 py-2.5 dark:border-[var(--border)] sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Icon name="search" className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar rol, cargo o usuario"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-8 text-xs sm:text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white dark:focus:bg-[var(--bg-subtle)] focus:ring-2 focus:ring-indigo-500/20 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-white"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <BotonSecundario onClick={onReload} disabled={loading} title="Volver a cargar roles y usuarios">
            <Icon name="refresh" className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </BotonSecundario>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead className={CLASE_TABLA_ENCABEZADO}>
            <tr>
              <th className="px-4 py-3 whitespace-nowrap">Rol</th>
              <th className="px-4 py-3 whitespace-nowrap text-center">Usuarios</th>
              <th className="px-4 py-3 whitespace-nowrap">Usuarios con este rol</th>
              <th className="px-4 py-3 whitespace-nowrap text-center">Estado</th>
              <th className="px-4 py-3 whitespace-nowrap text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-[var(--border)]">
            {loading ? (
              <tr><td colSpan="5" className="px-4 py-8 text-center font-bold text-slate-500">Cargando roles...</td></tr>
            ) : filteredRoles.length ? filteredRoles.map((grupo) => (
              <tr key={grupo.rol} className="transition-colors hover:bg-slate-50/70 dark:hover:bg-[var(--bg-subtle)]">
                <td className="px-4 py-3 align-top">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{grupo.rol}</p>
                  <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Perfil del sistema</p>
                </td>
                <td className="px-4 py-3 text-center align-top">
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {grupo.miembros.length}
                  </span>
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {grupo.miembros.length ? grupo.miembros.map((m) => (
                      <p key={m.id} className="text-xs text-slate-700 dark:text-slate-200">
                        <span className="font-bold text-slate-900 dark:text-white">@{m.nombre_usuario}</span>
                        <span className="ml-1 text-[11px] text-slate-500 dark:text-slate-400">{m.nombre_completo}</span>
                      </p>
                    )) : (
                      <span className="text-xs italic text-slate-400">Sin usuarios asignados</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-center align-top">
                  <StatusBadge status="ACTIVO" />
                </td>
                <td className="px-4 py-3 text-center align-top">
                  {grupo.miembros.length > 0 ? (
                    <div className="inline-flex justify-center">
                      <BotonAccion tipo="edit" title="Gestionar rol" onClick={() => onEdit(grupo.miembros[0])} />
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">N/A</span>
                  )}
                </td>
              </tr>
            )) : (
              <tr><td colSpan="5" className="p-12 text-center"><Icon name="lock" className="size-10 mb-2 mx-auto text-slate-300 dark:text-slate-600" /><p className="font-bold text-slate-600 dark:text-slate-300">No se encontraron roles coincidentes</p></td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-2 text-[11px] font-medium text-slate-500 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)] dark:text-slate-400">
        Mostrando <strong className="text-slate-800 dark:text-white">{filteredRoles.length}</strong> de <strong className="text-slate-800 dark:text-white">{roles.length}</strong> roles · {totalAsignaciones} usuarios vinculados
      </div>
    </div>
  )
}
