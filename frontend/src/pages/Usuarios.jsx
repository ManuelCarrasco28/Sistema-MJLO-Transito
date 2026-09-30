import { useEffect, useState, useMemo } from 'react'
import { showToast, showConfirm, showError, showSuccess } from '../utils/SwalUtil'
import { Icon } from '../components/ui/Icon'
import { PageLoadError } from '../components/ui/PageLoadError'
import { Pagination } from '../components/ui/Pagination'
import { SortableHeader } from '../components/ui/SortableHeader'
import { RoundedSelect, FloatingInput, FloatingSelect } from '../components/ui/FormInputs'
import { StatusBadge } from '../components/ui/StatusBadge'
import { sanitizarMensaje, apiFetch, getCachedData, setCachedData } from '../config/api'

const FILTER_ESTADO_OPTIONS = [
  { value: 'TODOS', label: 'Todos los estados' },
  { value: 'ACTIVO', label: 'Solo Activos' },
  { value: 'INACTIVO', label: 'Solo Inactivos' },
]

const DEFAULT_USER_FORM = {
  id_trabajador: '',
  nombre_usuario: '',
  password: '',
  id_rol: '',
  estado: 'ACTIVO',
}

function escapeXml(unsafe) {
  if (unsafe === null || unsafe === undefined) return ''
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function Usuarios({ user }) {
  const cachedUsers = getCachedData('/usuarios')
  const [usuarios, setUsuarios] = useState(cachedUsers || [])
  const [trabajadores, setTrabajadores] = useState([])
  const [roles, setRoles] = useState([])
  const [isLoading, setIsLoading] = useState(!cachedUsers)
  const [loadError, setLoadError] = useState('')

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEstado, setFilterEstado] = useState('TODOS')
  const [filterRol, setFilterRol] = useState('TODOS')

  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  // Estados de formularios
  const [selectedUser, setSelectedUser] = useState(null)
  const [userForm, setUserForm] = useState(DEFAULT_USER_FORM)
  const [trabajadorSearch, setTrabajadorSearch] = useState('')
  const [trabajadorDropdownOpen, setTrabajadorDropdownOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)

  // Carga de datos
  const loadData = async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const [usersRes, trabRes, rolesRes] = await Promise.all([
        apiFetch('/usuarios'),
        apiFetch('/personal'),
        apiFetch('/usuarios/roles'),
      ])

      if (!usersRes.ok) throw new Error('No se pudo cargar la lista de usuarios.')
      const usersData = await usersRes.json()
      const usersList = usersData.data || []
      setUsuarios(usersList)
      setCachedData('/usuarios', usersList)

      if (trabRes.ok) {
        const trabData = await trabRes.json()
        setTrabajadores(trabData.data || [])
      }

      if (rolesRes.ok) {
        const rolesData = await rolesRes.json()
        const fetchedRoles = rolesData.data || []
        setRoles(fetchedRoles)
      }
    } catch (err) {
      setLoadError(err.message || 'Error al conectar con la base de datos.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Métricas KPI
  const totalUsuarios = usuarios.length
  const activos = usuarios.filter((u) => u.usuario_estado === 'ACTIVO').length
  const inactivos = usuarios.filter((u) => u.usuario_estado !== 'ACTIVO').length
  const administradores = usuarios.filter((u) => {
    const r = (u.rol || '').toUpperCase()
    return r === 'SUPERADMIN' || r === 'GERENTE' || r === 'SUBGERENTE'
  }).length
  const inspectores = usuarios.filter((u) => {
    const r = (u.rol || '').toUpperCase()
    return r === 'SECRETARIA'
  }).length

  // Filtrado
  const filteredUsuarios = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return usuarios.filter((item) => {
      const matchSearch =
        !q ||
        [item.nombre_usuario, item.nombre_completo, item.rol, item.cargo, item.numero_documento]
          .some((val) => String(val || '').toLowerCase().includes(q))

      const matchEstado =
        filterEstado === 'TODOS' || item.usuario_estado === filterEstado

      const matchCargo =
        filterRol === 'TODOS' || String(item.id_rol) === String(filterRol)

      return matchSearch && matchEstado && matchCargo
    })
  }, [usuarios, searchTerm, filterEstado, filterRol])

  // Paginación
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterEstado, filterRol])

  const [sortBy, setSortBy] = useState('')
  const [sortDir, setSortDir] = useState('DESC')
  const handleSort = (column, dir) => {
    setSortBy(column)
    setSortDir(dir)
    setCurrentPage(1)
  }

  const sortedUsuarios = useMemo(() => {
    if (!sortBy) return filteredUsuarios
    const dirMul = sortDir === 'ASC' ? 1 : -1
    return [...filteredUsuarios].sort((a, b) => {
      const valA = String(a[sortBy] ?? '').toLowerCase()
      const valB = String(b[sortBy] ?? '').toLowerCase()
      return valA < valB ? -1 * dirMul : valA > valB ? 1 * dirMul : 0
    })
  }, [filteredUsuarios, sortBy, sortDir])

  const paginatedUsuarios = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return sortedUsuarios.slice(start, start + itemsPerPage)
  }, [sortedUsuarios, currentPage, itemsPerPage])

  // Trabajadores disponibles para asignación (que no tengan usuario ya creado o el seleccionado)
  const trabajadoresDisponibles = useMemo(() => {
    const q = trabajadorSearch.trim().toLowerCase()
    return trabajadores
      .filter((t) => Number(t.tiene_cuenta) !== 1 || String(t.id_persona || t.id) === String(userForm.id_trabajador))
      .filter((t) => {
        if (!q) return true
        return `${t.numero_documento} ${t.nombres} ${t.apellidos} ${t.cargo}`.toLowerCase().includes(q)
      })
      .slice(0, 10)
  }, [trabajadores, trabajadorSearch, userForm.id_trabajador])

  const selectedTrabajador = trabajadores.find(
    (t) => String(t.id_persona || t.id) === String(userForm.id_trabajador)
  )

  // Acciones: Nuevo Usuario
  const handleOpenCreateModal = () => {
    setUserForm(DEFAULT_USER_FORM)
    setTrabajadorSearch('')
    setTrabajadorDropdownOpen(false)
    setIsCreateModalOpen(true)
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    if (!userForm.id_trabajador) {
      showError('Falta información', 'Por favor selecciona un colaborador del padrón municipal.')
      return
    }
    if (!userForm.nombre_usuario || userForm.nombre_usuario.length < 3) {
      showError('Validación', 'El nombre de usuario debe tener al menos 3 caracteres.')
      return
    }
    if (!userForm.password || userForm.password.length < 6) {
      showError('Validación', 'La contraseña inicial debe tener al menos 6 caracteres.')
      return
    }
    if (!userForm.id_rol) {
      showError('Falta información', 'Por favor selecciona el rol que tendrá este usuario.')
      return
    }

    setSaving(true)
    try {
      const res = await apiFetch('/usuarios', {
        method: 'POST',
        body: userForm,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.messages?.error || data.message || 'No se pudo crear el usuario.')

      showSuccess('Usuario Creado', `La cuenta @${userForm.nombre_usuario} ha sido habilitada exitosamente.`)
      setIsCreateModalOpen(false)
      loadData()
    } catch (err) {
      showError('Error al crear usuario', sanitizarMensaje(err.message, 'No se pudo crear el usuario.'))
    } finally {
      setSaving(false)
    }
  }

  // Acciones: Editar Rol y Estado
  const handleOpenEditModal = (u) => {
    setSelectedUser(u)
    setUserForm({
      id_rol: u.id_rol || '',
      estado: u.usuario_estado || 'ACTIVO',
    })
    setIsEditModalOpen(true)
  }

  const handleSaveEditUser = async (e) => {
    e.preventDefault()
    if (!selectedUser) return
    setSaving(true)
    try {
      const res = await apiFetch(`/usuarios/${selectedUser.id}`, {
        method: 'PUT',
        body: {
          id_rol: userForm.id_rol,
          estado: userForm.estado,
        },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.messages?.error || data.message || 'No se pudo actualizar el usuario.')

      showSuccess('Usuario Actualizado', 'Los privilegios y estado han sido guardados.')
      setIsEditModalOpen(false)
      loadData()
    } catch (err) {
      showError('Error al editar', sanitizarMensaje(err.message, 'No se pudo editar el usuario.'))
    } finally {
      setSaving(false)
    }
  }

  // Acciones: Cambiar Contraseña
  const handleOpenPasswordModal = (u) => {
    setSelectedUser(u)
    setNewPassword('')
    setShowPassword(false)
    setIsPasswordModalOpen(true)
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (!newPassword || newPassword.length < 6) {
      showError('Contraseña corta', 'La contraseña debe tener al menos 6 caracteres.')
      return
    }

    setSaving(true)
    try {
      const res = await apiFetch(`/usuarios/${selectedUser.id}/password`, {
        method: 'PUT',
        body: { password: newPassword },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.messages?.error || data.message || 'No se pudo cambiar la contraseña.')

      showSuccess('Contraseña Actualizada', `Se restableció la clave de acceso para @${selectedUser.nombre_usuario}.`)
      setIsPasswordModalOpen(false)
    } catch (err) {
      showError('Error al cambiar contraseña', sanitizarMensaje(err.message, 'No se pudo cambiar la contraseña.'))
    } finally {
      setSaving(false)
    }
  }

  // Acciones: Eliminar Usuario
  const handleDeleteUser = async (u) => {
    const confirm = await showConfirm(
      '¿Eliminar usuario?',
      `Esta acción dará de baja la cuenta de acceso de @${u.nombre_usuario} (${u.nombre_completo || 'Colaborador'}).`,
      'Sí, eliminar',
      'Cancelar'
    )
    if (confirm.isConfirmed) {
      try {
        const res = await apiFetch(`/usuarios/${u.id}`, { method: 'DELETE' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.messages?.error || data.message || 'No se pudo eliminar el usuario.')
        showToast('Usuario eliminado correctamente')
        loadData()
      } catch (err) {
        showError('Error al eliminar', sanitizarMensaje(err.message, 'No se pudo eliminar el usuario.'))
      }
    }
  }

  // Acciones: Ver Ficha Detalle
  const handleOpenDetailModal = (u) => {
    setSelectedUser(u)
    setIsDetailModalOpen(true)
  }

  // Exportar Excel
  const handleExportExcel = () => {
    const listToExport = filteredUsuarios
    if (listToExport.length === 0) {
      showToast('No hay usuarios para exportar con los filtros actuales', 'warning')
      return
    }

    const rowsHtml = listToExport
      .map(
        (u, idx) => `
        <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="text-align: center; font-weight: bold; color: #64748b;">${idx + 1}</td>
          <td style="font-family: monospace; font-weight: bold; color: #1e3a8a;">@${escapeXml(u.nombre_usuario)}</td>
          <td><strong>${escapeXml(u.nombre_completo || '—')}</strong></td>
          <td style="text-align: center; font-family: monospace;">${escapeXml(u.numero_documento || '—')}</td>
          <td>${escapeXml(u.rol || 'Sin rol')}</td>
          <td style="text-align: center;">
            <span style="font-weight: bold; color: ${u.usuario_estado === 'ACTIVO' ? '#047857' : '#be123c'};">
              ${escapeXml(u.usuario_estado || 'ACTIVO')}
            </span>
          </td>
        </tr>
      `
      )
      .join('')

    const excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8"/>
          <style>
            body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
            table { border-collapse: collapse; width: 100%; }
            th { background-color: #1e3a8a; color: #ffffff; font-weight: bold; text-align: left; padding: 8px 10px; border: 1px solid #94a3b8; font-size: 10pt; text-transform: uppercase; }
            td { padding: 6px 10px; border: 1px solid #cbd5e1; font-size: 10pt; vertical-align: middle; }
            .header-title { font-size: 15pt; font-weight: bold; color: #1e3a8a; }
            .header-subtitle { font-size: 10.5pt; color: #475569; margin-bottom: 6px; }
            .header-meta { font-size: 9.5pt; color: #64748b; margin-bottom: 12px; }
          </style>
        </head>
        <body>
          <div class="header-title">MUNICIPALIDAD DISTRITAL JOSÉ LEONARDO ORTIZ</div>
          <div class="header-subtitle">Subgerencia de Tránsito y Transporte · Padrón Oficial de Usuarios del Sistema</div>
          <div class="header-meta">
            Fecha de emisión: ${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE')} | 
            Total usuarios: ${listToExport.length}
          </div>
          <table>
            <thead>
              <tr>
                <th style="text-align: center; width: 45px;">N°</th>
                <th style="width: 140px;">Nombre de Usuario</th>
                <th style="width: 260px;">Colaborador Asignado</th>
                <th style="text-align: center; width: 100px;">DNI</th>
                <th style="width: 220px;">Rol / Cargo en Sistema</th>
                <th style="text-align: center; width: 100px;">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `

    const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Padron_Usuarios_MJLO_${new Date().toISOString().slice(0, 10)}.xls`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  // Exportar PDF
  const handleExportPdf = () => {
    const listToExport = filteredUsuarios
    if (listToExport.length === 0) {
      showToast('No hay usuarios para imprimir con los filtros actuales', 'warning')
      return
    }

    const printWin = window.open('', '_blank', 'width=1100,height=750')
    if (!printWin) {
      showError('Bloqueador emergente', 'Por favor habilita las ventanas emergentes en tu navegador para imprimir.')
      return
    }

    const rowsHtml = listToExport
      .map(
        (u, idx) => `
        <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="text-align: center; font-weight: bold; color: #64748b;">${idx + 1}</td>
          <td style="font-family: monospace; font-weight: bold; color: #1e3a8a;">@${escapeXml(u.nombre_usuario)}</td>
          <td><strong>${escapeXml(u.nombre_completo || '—')}</strong></td>
          <td style="text-align: center; font-family: monospace;">${escapeXml(u.numero_documento || '—')}</td>
          <td>${escapeXml(u.rol || 'Sin rol')}</td>
          <td style="text-align: center;">
            <span style="display:inline-block; padding:2px 7px; font-size:9.5px; font-weight:bold; border-radius:4px; ${
              u.usuario_estado === 'ACTIVO'
                ? 'background:#ecfdf5; color:#047857; border:1px solid #a7f3d0;'
                : 'background:#fff1f2; color:#be123c; border:1px solid #fecdd3;'
            }">
              ${escapeXml(u.usuario_estado || 'ACTIVO')}
            </span>
          </td>
        </tr>
      `
      )
      .join('')

    const pdfHtml = `
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8"/>
          <title>Padron_Usuarios_MJLO_${new Date().toISOString().slice(0, 10)}</title>
          <style>
            @page { size: A4 landscape; margin: 10mm 12mm 10mm 12mm; }
            * { box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 0; font-size: 11px; }
            .header { border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-end; }
            .title { font-size: 15px; font-weight: 900; text-transform: uppercase; color: #1e3a8a; }
            .subtitle { font-size: 11px; color: #475569; margin-top: 2px; }
            .meta { font-size: 9.5px; color: #64748b; text-align: right; }
            table { width: 100%; border-collapse: collapse; margin-top: 6px; }
            thead { display: table-header-group; }
            tr { page-break-inside: avoid; break-inside: avoid; }
            th { background-color: #0f172a; color: #ffffff; text-transform: uppercase; font-size: 9.5px; font-weight: 800; padding: 6px 8px; border: 1px solid #0f172a; text-align: left; }
            td { border: 1px solid #e2e8f0; padding: 6px 8px; vertical-align: middle; font-size: 10px; }
            .footer { margin-top: 14px; font-size: 9px; color: #94a3b8; display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 6px; }
            @media print { .no-print { display: none !important; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">Municipalidad Distrital José Leonardo Ortiz</div>
              <div class="subtitle">Subgerencia de Tránsito y Transporte · Padrón Oficial de Usuarios del Sistema</div>
            </div>
            <div class="meta">
              Fecha de emisión: ${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE')}<br/>
              Total usuarios: <strong>${listToExport.length}</strong>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="text-align: center; width: 35px;">N°</th>
                <th style="width: 140px;">Usuario</th>
                <th>Colaborador Asignado</th>
                <th style="text-align: center; width: 90px;">DNI</th>
                <th>Rol / Privilegio</th>
                <th style="text-align: center; width: 85px;">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="footer">
            <span>Sistema MJLO - Control de Acceso y Seguridad</span>
            <span>Página 1 de 1</span>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `
    printWin.document.open()
    printWin.document.write(pdfHtml)
    printWin.document.close()
  }

  // Estilos y badges de roles
  const getRoleBadge = (rol) => {
    const r = (rol || '').toUpperCase()
    if (r === 'SUPERADMIN') {
      return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-[var(--border)]'
    }
    if (r === 'GERENTE' || r === 'SUBGERENTE') {
      return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-[var(--border)]'
    }
    if (r === 'TRABAJADOR') {
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-[var(--border)]'
    }
    if (r === 'SECRETARIA') {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-[var(--border)]'
    }
    return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-[var(--bg-subtle)] dark:text-slate-300 dark:border-[var(--border-strong)]'
  }

  return (
    <div className="space-y-4">
      {loadError && <PageLoadError message={loadError} onRetry={loadData} />}

      {/* Cabecera Principal con gradiente idéntico a Personas.jsx */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25">
            <Icon name="people" className="size-5.5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                Gestión de Usuarios
              </h1>
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Control de cuentas de acceso, roles institucionales y credenciales del sistema.
            </p>
          </div>
        </div>
      </div>

      {/* Tarjetas KPI con Bordes de Colores: 5 tarjetas idénticas al diseño de Personas.jsx */}
      <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {/* 1. Total usuarios */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-indigo-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[var(--bg-surface)] col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Total usuarios
            </span>
            <span className="grid size-6 place-items-center rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Icon name="people" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {new Intl.NumberFormat('es-PE').format(totalUsuarios)}
            </p>
          </div>
        </div>

        {/* 2. Administradores */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-amber-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Administración
            </span>
            <span className="grid size-6 place-items-center rounded-md bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <Icon name="shieldCheck" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {new Intl.NumberFormat('es-PE').format(administradores)}
            </p>
          </div>
        </div>

        {/* 3. Inspectores */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-cyan-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
              Inspectores
            </span>
            <span className="grid size-6 place-items-center rounded-md bg-cyan-50 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400">
              <Icon name="deviceMobile" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {new Intl.NumberFormat('es-PE').format(inspectores)}
            </p>
          </div>
        </div>

        {/* 4. Activos */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-emerald-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Activos
            </span>
            <span className="grid size-6 place-items-center rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 font-bold text-xs">
              ✓
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {new Intl.NumberFormat('es-PE').format(activos)}
            </p>
          </div>
        </div>

        {/* 5. Inactivos */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-rose-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Inactivos
            </span>
            <span className="grid size-6 place-items-center rounded-md bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 font-bold text-xs">
              ✕
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {new Intl.NumberFormat('es-PE').format(inactivos)}
            </p>
          </div>
        </div>
      </div>

      {/* Contenedor de la Tabla con estilo exacto de Personas.jsx */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-[var(--border)] dark:bg-[var(--bg-surface)] overflow-hidden">
        {/* Barra de Filtros y Acciones */}
        <div className="flex flex-col gap-2.5 border-b border-slate-100 px-4 py-2.5 dark:border-[var(--border)] sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Icon name="search" className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por usuario, nombre completo, DNI o rol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-8 text-xs sm:text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white dark:focus:bg-[var(--bg-subtle)] focus:ring-2 focus:ring-indigo-500/20 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-white dark:focus:border-indigo-400"
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

          <div className="flex flex-wrap items-center gap-2">
            <RoundedSelect
              value={filterEstado}
              onChange={setFilterEstado}
              options={FILTER_ESTADO_OPTIONS}
            />

            <RoundedSelect
              value={filterRol}
              onChange={setFilterRol}
              options={[
                { value: 'TODOS', label: 'Todos los roles' },
                ...roles.map((r) => ({ value: String(r.id), label: r.nombre })),
              ]}
            />

            {(filterEstado !== 'TODOS' || filterRol !== 'TODOS' || searchTerm !== '') && (
              <button
                type="button"
                onClick={() => {
                  setFilterEstado('TODOS')
                  setFilterRol('TODOS')
                  setSearchTerm('')
                }}
                title="Limpiar filtros"
                className="grid size-8.5 place-items-center rounded-xl border border-rose-200/80 bg-rose-50/70 text-rose-600 hover:bg-rose-100 hover:text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60 transition-all active:scale-95 cursor-pointer shadow-2xs"
              >
                <Icon name="filterX" className="size-4" />
              </button>
            )}

            <button
              type="button"
              onClick={handleExportExcel}
              title="Descargar padrón de usuarios en Excel (.xls)"
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60 transition-all active:scale-95 cursor-pointer shadow-2xs whitespace-nowrap"
            >
              <Icon name="fileSpreadsheet" className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Excel</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              title="Descargar o imprimir padrón de usuarios en PDF"
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200/80 bg-rose-50/70 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60 transition-all active:scale-95 cursor-pointer shadow-2xs whitespace-nowrap"
            >
              <Icon name="filePdf" className="size-3.5 text-rose-600 dark:text-rose-400" />
              <span>PDF</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-linear-to-r from-indigo-600 to-violet-600 px-3.5 py-1.5 text-xs font-extrabold text-white shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-indigo-600/30 active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <span className="text-base leading-none font-black">+</span>
              <span>Nuevo usuario</span>
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-left text-xs sm:text-sm">
            <colgroup>
              <col className="w-[25%]" />
              <col className="w-[28%]" />
              <col className="w-[20%]" />
              <col className="w-[12%]" />
              <col className="w-[15%]" />
            </colgroup>
            <thead className="bg-slate-50/75 dark:bg-[var(--bg-subtle)] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-[var(--border)]">
              <tr>
                <th className="px-4 py-3 "><SortableHeader column="nombre_usuario" label="Usuario" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="px-4 py-3 "><SortableHeader column="nombre_completo" label="Colaborador Asignado" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="px-4 py-3 ">Rol / Permiso</th>
                <th className="px-4 py-3 "><SortableHeader column="usuario_estado" label="Estado" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="sticky right-0 z-20 px-4 py-3 text-right bg-slate-50/95 dark:bg-slate-900/95 border-l border-slate-200/60 dark:border-[var(--border)] shadow-[-4px_0_8px_rgba(0,0,0,0.03)] dark:shadow-[-4px_0_8px_rgba(0,0,0,0.2)]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-slate-100 dark:divide-[var(--border)] transition-opacity ${isLoading && usuarios.length > 0 ? 'opacity-50' : ''}`}>
              {isLoading && usuarios.length === 0 ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-full bg-slate-200 dark:bg-[var(--bg-subtle)] shrink-0" />
                        <div className="space-y-1.5 flex-1">
                          <div className="h-3.5 w-28 rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" />
                          <div className="h-2.5 w-20 rounded bg-slate-100 dark:bg-[var(--bg-subtle)]" />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="h-4 w-36 rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="h-5 w-28 rounded-full bg-slate-200 dark:bg-[var(--bg-subtle)]" />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="h-5 w-16 rounded-full bg-slate-200 dark:bg-[var(--bg-subtle)]" />
                    </td>
                    <td className="sticky right-0 z-10 px-4 py-3.5 text-right bg-white dark:bg-[var(--bg-surface)]">
                      <div className="h-8 w-28 ml-auto rounded bg-slate-100 dark:bg-[var(--bg-subtle)]" />
                    </td>
                  </tr>
                ))
              ) : filteredUsuarios.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="mx-auto max-w-xs space-y-1.5">
                      <Icon name="people" className="size-8 mx-auto opacity-40 text-slate-400" />
                      <p className="font-semibold text-slate-800 dark:text-white">
                        No se encontraron usuarios
                      </p>
                      <p className="text-[12.5px]">
                        Intenta con otro término de búsqueda o limpia los filtros activos.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedUsuarios.map((u) => {
                  const initial = (u.nombre_usuario || 'U').slice(0, 2).toUpperCase()
                  const isSuperadmin = (u.rol || '').toUpperCase() === 'SUPERADMIN'

                  return (
                    <tr
                      key={u.id}
                      className="group transition-colors hover:bg-slate-50/80 dark:hover:bg-[var(--bg-subtle)]"
                    >
                      {/* Usuario */}
                      <td className="px-4 py-3 ">
                        <div className="flex items-center gap-3">
                          <div className="size-9 shrink-0 rounded-full font-bold flex items-center justify-center text-xs select-none border border-indigo-200/80 bg-indigo-50 text-indigo-700 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-indigo-300 shadow-2xs">
                            {initial}
                          </div>
                          <div>
                            <p className="font-mono text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                              @{u.nombre_usuario}
                              {isSuperadmin && (
                                <span className="text-amber-500 text-xs" title="Super Administrador">
                                  ★
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                              ID trabajador: {u.id_trabajador || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Colaborador */}
                      <td className="px-4 py-3 ">
                        <p className="font-bold text-slate-800 dark:text-white text-[13px]">
                          {u.nombre_completo || 'Sin personal vinculado'}
                        </p>
                        {u.numero_documento && (
                          <p className="font-mono text-[11px] text-slate-400 dark:text-slate-500">
                            DNI: {u.numero_documento}
                          </p>
                        )}
                      </td>

                      {/* Rol */}
                      <td className="px-4 py-3 ">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold uppercase tracking-wide border ${getRoleBadge(
                            u.rol
                          )}`}
                        >
                          {u.rol || 'Sin rol asignado'}
                        </span>
                        {u.cargo && (
                          <p className="mt-0.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                            {u.cargo}
                          </p>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3 ">
                        <StatusBadge status={u.usuario_estado || 'ACTIVO'} />
                      </td>

                      {/* Acciones */}
                      <td className="sticky right-0 z-10 px-4 py-3 text-right bg-white dark:bg-[var(--bg-surface)] border-l border-slate-100 dark:border-slate-800/80 shadow-[-4px_0_8px_rgba(0,0,0,0.03)] dark:shadow-[-4px_0_8px_rgba(0,0,0,0.2)] group-hover:bg-slate-50/80 dark:group-hover:bg-slate-800/50">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* OJO: Ver Ficha Detalle */}
                          <button
                            type="button"
                            onClick={() => handleOpenDetailModal(u)}
                            title="Ver ficha de usuario"
                            className="size-8 rounded-lg grid place-items-center transition-all cursor-pointer shadow-xs active:scale-95"
                            style={{
                              backgroundColor: 'var(--action-eye-bg)',
                              borderColor: 'var(--action-eye-border)',
                              color: 'var(--action-eye-text)',
                              borderWidth: '1.5px',
                              borderStyle: 'solid',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--action-eye-hover)'
                              e.currentTarget.style.borderColor = 'var(--action-eye-hover)'
                              e.currentTarget.style.color = '#ffffff'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--action-eye-bg)'
                              e.currentTarget.style.borderColor = 'var(--action-eye-border)'
                              e.currentTarget.style.color = 'var(--action-eye-text)'
                            }}
                          >
                            <Icon name="eye" className="size-4" />
                          </button>

                          {/* EDITAR: Modificar Rol / Estado */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(u)}
                            title="Modificar rol y estado"
                            className="size-8 rounded-lg grid place-items-center transition-all cursor-pointer shadow-xs active:scale-95"
                            style={{
                              backgroundColor: 'var(--action-edit-bg)',
                              borderColor: 'var(--action-edit-border)',
                              color: 'var(--action-edit-text)',
                              borderWidth: '1.5px',
                              borderStyle: 'solid',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--action-edit-hover)'
                              e.currentTarget.style.borderColor = 'var(--action-edit-hover)'
                              e.currentTarget.style.color = '#ffffff'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--action-edit-bg)'
                              e.currentTarget.style.borderColor = 'var(--action-edit-border)'
                              e.currentTarget.style.color = 'var(--action-edit-text)'
                            }}
                          >
                            <Icon name="pencil" className="size-4" />
                          </button>

                          {/* CLAVE: Cambiar Contraseña */}
                          <button
                            type="button"
                            onClick={() => handleOpenPasswordModal(u)}
                            title="Restablecer contraseña"
                            className="size-8 rounded-lg grid place-items-center transition-all cursor-pointer shadow-xs active:scale-95"
                            style={{
                              backgroundColor: 'var(--action-print-bg)',
                              borderColor: 'var(--action-print-border)',
                              color: 'var(--action-print-text)',
                              borderWidth: '1.5px',
                              borderStyle: 'solid',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--action-print-hover)'
                              e.currentTarget.style.borderColor = 'var(--action-print-hover)'
                              e.currentTarget.style.color = '#ffffff'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--action-print-bg)'
                              e.currentTarget.style.borderColor = 'var(--action-print-border)'
                              e.currentTarget.style.color = 'var(--action-print-text)'
                            }}
                          >
                            <Icon name="settings" className="size-4" />
                          </button>

                          {/* ELIMINAR: Dar de baja */}
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            title="Eliminar usuario"
                            className="size-8 rounded-lg grid place-items-center transition-all cursor-pointer shadow-xs active:scale-95"
                            style={{
                              backgroundColor: 'var(--action-del-bg)',
                              borderColor: 'var(--action-del-border)',
                              color: 'var(--action-del-text)',
                              borderWidth: '1.5px',
                              borderStyle: 'solid',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--action-del-hover)'
                              e.currentTarget.style.borderColor = 'var(--action-del-hover)'
                              e.currentTarget.style.color = '#ffffff'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--action-del-bg)'
                              e.currentTarget.style.borderColor = 'var(--action-del-border)'
                              e.currentTarget.style.color = 'var(--action-del-text)'
                            }}
                          >
                            <Icon name="trash" className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredUsuarios.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(size) => {
            setItemsPerPage(size)
            setCurrentPage(1)
          }}
          disabled={isLoading}
        />
      </div>

      {/* MODAL 1: NUEVO USUARIO */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl dark:bg-[var(--bg-surface)] border border-slate-200/80 dark:border-[var(--border)] overflow-visible">
            <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4 dark:border-[var(--border)] dark:bg-[var(--bg-surface)] rounded-t-3xl">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                  <Icon name="people" className="size-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Registrar Nuevo Usuario
                  </h3>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Crea credenciales institucionales vinculadas a un colaborador
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="grid size-8 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-[var(--bg-subtle)] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              {/* Buscador de Colaborador */}
              <div className="relative">
                <label className="block text-xs font-black uppercase tracking-wide text-slate-700 dark:text-slate-300 mb-1.5">
                  1. Colaborador Municipal Asignado *
                </label>
                <div className="relative">
                  <Icon name="search" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={trabajadorSearch}
                    onFocus={() => setTrabajadorDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setTrabajadorDropdownOpen(false), 200)}
                    onChange={(e) => {
                      setTrabajadorSearch(e.target.value)
                      setTrabajadorDropdownOpen(true)
                    }}
                    placeholder="Escribe DNI o nombres para buscar en el padrón..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-4 text-xs font-semibold text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white dark:focus:bg-[var(--bg-subtle)] focus:ring-1 focus:ring-indigo-500/20 dark:border-[var(--border-strong)] dark:bg-[var(--bg-surface)] dark:text-white"
                  />
                </div>

                {selectedTrabajador && (
                  <div className="mt-2 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/80 px-3.5 py-2 text-xs dark:border-[var(--border)] dark:bg-emerald-950/30">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-800 dark:text-emerald-300">
                        ✓ Seleccionado:
                      </span>
                      <span className="font-black text-slate-800 dark:text-white">
                        {selectedTrabajador.nombres} {selectedTrabajador.apellidos}
                      </span>
                      <span className="font-mono text-slate-500">
                        (DNI: {selectedTrabajador.numero_documento})
                      </span>
                    </div>
                    <span className="text-[10px] font-extrabold uppercase text-emerald-700 dark:text-emerald-400">
                      {selectedTrabajador.cargo}
                    </span>
                  </div>
                )}

                {trabajadorDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)]">
                    {trabajadoresDisponibles.length ? (
                      trabajadoresDisponibles.map((t) => (
                        <button
                          key={t.id_persona || t.id}
                          type="button"
                          onMouseDown={() => {
                            setUserForm((prev) => ({
                              ...prev,
                              id_trabajador: t.id_persona || t.id,
                            }))
                            setTrabajadorSearch(`${t.numero_documento} - ${t.nombres} ${t.apellidos}`)
                            setTrabajadorDropdownOpen(false)
                          }}
                          className="w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-indigo-50 dark:hover:bg-slate-700 transition flex items-center justify-between"
                        >
                          <div>
                            <p className="font-bold text-slate-800 dark:text-white">
                              {t.nombres} {t.apellidos}
                            </p>
                            <p className="font-mono text-[11px] text-slate-500">
                              DNI: {t.numero_documento}
                            </p>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400">
                            {t.cargo}
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="p-3 text-center text-xs text-slate-500">
                        No se encontraron colaboradores disponibles sin cuenta.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Formulario de Cuenta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                <div>
                  <FloatingInput
                    id="nombre_usuario"
                    label="2. Nombre de Usuario"
                    required
                    value={userForm.nombre_usuario}
                    onChange={(e) =>
                      setUserForm({
                        ...userForm,
                        nombre_usuario: e.target.value.toLowerCase().replace(/\s+/g, ''),
                      })
                    }
                  />
                  <p className="mt-1 text-[10.5px] text-slate-400">
                    Solo minúsculas y sin espacios.
                  </p>
                </div>

                <FloatingInput
                  id="password_inicial"
                  label="3. Contraseña Inicial"
                  type="password"
                  required
                  minLength={6}
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                />

                <FloatingSelect
                  id="cargo_usuario"
                  label="4. Rol / Permiso Asignado"
                  value={userForm.id_rol}
                  onChange={(e) => setUserForm({ ...userForm, id_rol: e.target.value })}
                  options={roles.map((r) => ({ value: String(r.id), label: r.nombre }))}
                />

                <FloatingSelect
                  id="estado_cuenta"
                  label="5. Estado de la Cuenta"
                  value={userForm.estado}
                  onChange={(e) => setUserForm({ ...userForm, estado: e.target.value })}
                  options={[
                    { value: 'ACTIVO', label: 'ACTIVO (Permite iniciar sesión)' },
                    { value: 'INACTIVO', label: 'INACTIVO (Acceso bloqueado)' },
                  ]}
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4 dark:border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-[var(--border-strong)] dark:text-slate-300 dark:hover:bg-[var(--bg-subtle)] transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-linear-to-r from-indigo-600 to-violet-600 px-5 py-2 text-xs font-extrabold text-white shadow-md shadow-indigo-600/25 hover:scale-[1.02] active:scale-95 transition cursor-pointer disabled:opacity-50"
                >
                  <Icon name="check" className="size-4" />
                  <span>{saving ? 'Guardando...' : 'Crear Usuario'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDITAR ROL Y ESTADO */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl dark:bg-[var(--bg-surface)] border border-slate-200/80 dark:border-[var(--border)] overflow-visible">
            <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4 dark:border-[var(--border)] dark:bg-[var(--bg-surface)] rounded-t-3xl">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                  <Icon name="pencil" className="size-4" />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Modificar Rol y Estado
                  </h3>
                  <p className="font-mono text-xs text-indigo-600 dark:text-indigo-400">
                    @{selectedUser.nombre_usuario}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="grid size-8 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-[var(--bg-subtle)] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="p-6 space-y-4">
              <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)]">
                <p className="text-xs font-bold text-slate-500">Colaborador:</p>
                <p className="text-sm font-black text-slate-800 dark:text-white">
                  {selectedUser.nombre_completo || 'Sin personal asignado'}
                </p>
              </div>

              <FloatingSelect
                id="cargo_edit"
                label="Rol en el Sistema"
                value={userForm.id_rol}
                onChange={(e) => setUserForm({ ...userForm, id_rol: e.target.value })}
                options={roles.map((r) => ({ value: String(r.id), label: r.nombre }))}
              />

              <FloatingSelect
                id="estado_edit"
                label="Estado"
                value={userForm.estado}
                onChange={(e) => setUserForm({ ...userForm, estado: e.target.value })}
                options={[
                  { value: 'ACTIVO', label: 'ACTIVO (Permite acceso al sistema)' },
                  { value: 'INACTIVO', label: 'INACTIVO (Bloquear acceso)' },
                ]}
              />

              <div className="mt-5 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4 dark:border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-[var(--border-strong)] dark:text-slate-300 dark:hover:bg-[var(--bg-subtle)] transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 px-5 py-2 text-xs font-extrabold text-white shadow-md shadow-amber-500/25 hover:scale-[1.02] active:scale-95 transition cursor-pointer disabled:opacity-50"
                >
                  <Icon name="check" className="size-4" />
                  <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: RESTABLECER CONTRASEÑA */}
      {isPasswordModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl dark:bg-[var(--bg-surface)] border border-slate-200/80 dark:border-[var(--border)]">
            <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4 dark:border-[var(--border)] dark:bg-[var(--bg-surface)] rounded-t-3xl">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
                  <Icon name="settings" className="size-4" />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Restablecer Contraseña
                  </h3>
                  <p className="font-mono text-xs text-indigo-600 dark:text-indigo-400">
                    @{selectedUser.nombre_usuario}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                className="grid size-8 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-[var(--bg-subtle)] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Ingresa una nueva contraseña para la cuenta del usuario. La clave anterior dejará de ser válida inmediatamente.
              </p>

              <div className="relative">
                <FloatingInput
                  id="nueva_password"
                  label="Nueva Contraseña"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  inputClassName="pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? 'Ocultar' : 'Ver'}
                </button>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4 dark:border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-[var(--border-strong)] dark:text-slate-300 dark:hover:bg-[var(--bg-subtle)] transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-linear-to-r from-purple-600 to-indigo-600 px-5 py-2 text-xs font-extrabold text-white shadow-md shadow-purple-600/25 hover:scale-[1.02] active:scale-95 transition cursor-pointer disabled:opacity-50"
                >
                  <Icon name="check" className="size-4" />
                  <span>{saving ? 'Cambiando...' : 'Actualizar Clave'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: FICHA DETALLE DEL USUARIO */}
      {isDetailModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl dark:bg-[var(--bg-surface)] border border-slate-200/80 dark:border-[var(--border)]">
            <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4 rounded-t-3xl dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400">
                  <Icon name="eye" className="size-4" />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Ficha de Usuario
                  </h3>
                  <p className="text-xs font-medium text-slate-400">
                    Información técnica y permisos asignados
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="grid size-8 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-[var(--bg-subtle)] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)]">
                <div className="size-14 rounded-2xl font-black text-lg flex items-center justify-center border border-indigo-200 bg-indigo-100 text-indigo-700 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-indigo-300">
                  {(selectedUser.nombre_usuario || 'U').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    @{selectedUser.nombre_usuario}
                    <StatusBadge status={selectedUser.usuario_estado || 'ACTIVO'} />
                  </h4>
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-0.5">
                    {selectedUser.nombre_completo || 'Sin colaborador vinculado'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-[var(--border)] dark:bg-slate-900/40">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Rol en Sistema
                  </span>
                  <p className="mt-1 font-black text-slate-800 dark:text-white">
                    {selectedUser.rol || 'Sin rol'}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-[var(--border)] dark:bg-slate-900/40">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    ID Trabajador
                  </span>
                  <p className="mt-1 font-mono font-black text-slate-800 dark:text-white">
                    {selectedUser.id_trabajador || 'N/A'}
                  </p>
                </div>

                {selectedUser.numero_documento && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-[var(--border)] dark:bg-slate-900/40">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Documento de Identidad
                    </span>
                    <p className="mt-1 font-mono font-black text-slate-800 dark:text-white">
                      DNI: {selectedUser.numero_documento}
                    </p>
                  </div>
                )}

                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-[var(--border)] dark:bg-slate-900/40">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Acceso Municipal
                  </span>
                  <p className="mt-1 font-bold text-emerald-600 dark:text-emerald-400">
                    Autorizado MDJLO
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-[var(--border-strong)] dark:text-slate-300 dark:hover:bg-[var(--bg-subtle)] transition cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
