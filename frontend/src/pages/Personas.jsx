import { useEffect, useState } from 'react'
import { Icon } from '../components/ui/Icon'
import { PageLoadError } from '../components/ui/PageLoadError'
import { Pagination } from '../components/ui/Pagination'
import { apiFetch, getCachedData, setCachedData } from '../config/api'

export function Personas({ user, onUserUpdate }) {
  const cached = getCachedData('/personas')
  const [personas, setPersonas] = useState(cached || [])
  const [isLoading, setIsLoading] = useState(!cached)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEstado, setFilterEstado] = useState('TODOS')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(8)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedPersona, setSelectedPersona] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [toast, setToast] = useState(null)
  const [loadError, setLoadError] = useState('')

  const [formData, setFormData] = useState({
    tipoDocumento: 'DNI',
    numeroDocumento: '',
    nombres: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    direccion: '',
    telefono: '',
    celular: '',
    email: '',
    numeroLicencia: '',
    estado: 'ACTIVO',
    fotoImg: '',
  })

  const loadPersonas = async () => {
    const response = await apiFetch('/personas')
    if (!response.ok) throw response
    const payload = await response.json()
    const data = payload.data ?? []
    setPersonas(data)
    setCachedData('/personas', data)
    return data
  }

  useEffect(() => {
    setLoadError('')
    loadPersonas()
      .catch(() => setLoadError('No se pudo cargar el padrón de personas.'))
      .finally(() => setIsLoading(false))
  }, [])

  const totalPersonas = personas.length
  const conductores = personas.filter((p) => Boolean(p.numeroLicencia)).length
  const propietarios = personas.filter((p) => !p.numeroLicencia).length
  const activos = personas.filter((p) => p.estado === 'ACTIVO').length
  const porcentajeActivos = totalPersonas > 0 ? Math.round((activos / totalPersonas) * 100) : 0

  const filteredPersonas = personas.filter((p) => {
    const fullSearch = `${p.nombres || ''} ${p.apellidoPaterno || ''} ${p.apellidoMaterno || ''} ${p.numeroDocumento || ''} ${p.numeroLicencia || ''}`.toLowerCase()
    const matchesSearch = fullSearch.includes(searchTerm.toLowerCase())
    const matchesEstado = filterEstado === 'TODOS' || p.estado === filterEstado

    return matchesSearch && matchesEstado
  })

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterEstado])

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const showToast = (message, type = 'success') => {
    setToast({
      id: Date.now(),
      message,
      type,
    })
  }

  const paginatedPersonas = filteredPersonas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handleOpenCreateModal = () => {
    setFormData({
      tipoDocumento: 'DNI',
      numeroDocumento: '',
      nombres: '',
      apellidoPaterno: '',
      apellidoMaterno: '',
      direccion: '',
      telefono: '',
      celular: '',
      email: '',
      numeroLicencia: '',
      estado: 'ACTIVO',
      fotoImg: '',
    })
    setIsEditing(false)
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (persona) => {
    setSelectedPersona(persona)
    setFormData({
      ...persona,
      celular: persona.celular || persona.telefono || '',
      fotoImg: persona.fotoImg || '',
    })
    setIsEditing(true)
    setIsModalOpen(true)
  }

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP).')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const rawData = ev.target?.result
      if (!rawData) return
      const img = new Image()
      img.onload = () => {
        const maxDim = 400
        let width = img.width
        let height = img.height
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          } else {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        const compressed = canvas.toDataURL('image/jpeg', 0.85)
        setFormData((prev) => ({ ...prev, fotoImg: compressed, fotoUrl: compressed }))
      }
      img.onerror = () => {
        setFormData((prev) => ({ ...prev, fotoImg: rawData, fotoUrl: rawData }))
      }
      img.src = rawData
    }
    reader.readAsDataURL(file)
  }

  const handleClearPhoto = () => {
    setFormData((prev) => ({ ...prev, fotoImg: '', fotoUrl: '' }))
  }

  const handleOpenDetail = (persona) => {
    setSelectedPersona(persona)
    setIsDetailModalOpen(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('¿Está seguro de eliminar a esta persona del padrón municipal?')) {
      try {
        await apiFetch(`/personas/${id}`, { method: 'DELETE' })
        const nextPersonas = personas.filter((p) => p.id !== id)
        setPersonas(nextPersonas)
        setCachedData('/personas', nextPersonas)
        showToast('Se ha eliminado')
      } catch (err) {
        alert('No se pudo eliminar a la persona.')
      }
    }
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    // Validaciones
    const docLen = formData.numeroDocumento.trim().length
    if (!formData.numeroDocumento.trim() || !formData.nombres.trim() || !formData.apellidoPaterno.trim()) {
      alert('Por favor completa los campos requeridos (Documento, Nombres, Apellido Paterno).')
      return
    }
    if (formData.tipoDocumento === 'DNI' && (docLen !== 8 || !/^\d{8}$/.test(formData.numeroDocumento.trim()))) {
      alert('El DNI debe tener exactamente 8 dígitos numéricos.')
      return
    }
    if (formData.tipoDocumento !== 'DNI' && (docLen < 8 || docLen > 15)) {
      alert('El número de documento debe tener entre 8 y 15 caracteres.')
      return
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      alert('Por favor ingresa un correo electrónico válido.')
      return
    }
    if (formData.celular && !/^\d{9}$/.test(formData.celular)) {
      alert('El número de celular debe tener exactamente 9 dígitos numéricos.')
      return
    }

    try {
      if (isEditing) {
        const response = await apiFetch(`/personas/${selectedPersona.id}`, {
          method: 'PUT',
          body: formData,
        })
        if (!response.ok) throw response
        const resData = await response.json()
        const updatedPersona = resData.data || { ...selectedPersona, ...formData }
        const nextPersonas = personas.map((persona) =>
          persona.id === selectedPersona.id ? updatedPersona : persona
        )
        setPersonas(nextPersonas)
        setCachedData('/personas', nextPersonas)
        if (Number(user?.id_persona) === Number(updatedPersona.id) && onUserUpdate) {
          onUserUpdate({
            ...user,
            nombres: updatedPersona.nombres || user.nombres,
            apellidos: [updatedPersona.apellidoPaterno, updatedPersona.apellidoMaterno].filter(Boolean).join(' ') || user.apellidos,
            foto_img: updatedPersona.fotoImg || '',
          })
        }
        showToast('Se ha actualizado')
      } else {
        const res = await apiFetch('/personas', {
          method: 'POST',
          body: formData,
        })
        if (!res.ok) throw res
        const resData = await res.json()
        const newPersona = resData.data || {
          ...formData,
          id: Date.now(),
        }
        const nextPersonas = [newPersona, ...personas]
        setPersonas(nextPersonas)
        setCachedData('/personas', nextPersonas)
        showToast('Se ha agregado')
      }
      setIsModalOpen(false)
    } catch (err) {
      let message = 'Error al guardar la persona en el servidor.'
      if (err?.json) {
        try {
          const errorData = await err.json()
          message = errorData?.message || errorData?.error || message
        } catch (_) {
          message = err.statusText || message
        }
      }
      alert(message)
    }
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div
          key={toast.id}
          className="fixed right-6 top-6 z-[80] flex items-center gap-3 rounded-[1.4rem] border border-white/70 bg-white/95 px-5 py-3.5 text-sm font-black text-slate-800 shadow-2xl shadow-cyan-900/15 ring-1 ring-slate-900/5 backdrop-blur-md animate-enter dark:border-slate-700 dark:bg-slate-900/95 dark:text-white"
        >
          <span className="grid size-9 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-base text-white shadow-lg shadow-cyan-500/25">
            ✓
          </span>
          <span>{toast.message}</span>
        </div>
      )}
      {loadError && <PageLoadError message={loadError} />}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/30">
            <Icon name="people" className="size-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                Padrón de Conductores y Propietarios
              </h1>
            </div>
            <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              Directorio oficial de administrados, conductores autorizados y propietarios vehiculares.
            </p>
          </div>
        </div>
      </div>


      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Registrados</span>
            <span className="grid size-10 place-items-center rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400">
              <Icon name="people" className="size-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-800 dark:text-white">{new Intl.NumberFormat('es-PE').format(totalPersonas)}</p>
            <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 px-2 py-0.5 rounded-full">Padrón 2026</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">En la plataforma municipal</p>
        </div>


        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Con licencia</span>
            <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Icon name="permit" className="size-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-800 dark:text-white">{new Intl.NumberFormat('es-PE').format(conductores)}</p>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full">Con Licencia</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Habilitados para operar</p>
        </div>


        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Sin licencia</span>
            <span className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Icon name="vehicle" className="size-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-800 dark:text-white">{new Intl.NumberFormat('es-PE').format(propietarios)}</p>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full">Titulares</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Dueños de unidades móviles</p>
        </div>


        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Estado Activo</span>
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 font-bold">✓</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-800 dark:text-white">{new Intl.NumberFormat('es-PE').format(activos)}</p>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">{porcentajeActivos}% Aptos</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${porcentajeActivos}%` }}
            />
          </div>
        </div>
      </div>


      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-[#0f172a] overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Icon name="search" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por DNI, nombres, apellidos o número de licencia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-10 text-sm text-slate-800 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-cyan-400"
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

          <div className="flex flex-wrap items-center gap-2.5">

            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-700 outline-none transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="ACTIVO">Activos</option>
              <option value="INACTIVO">Inactivos</option>
            </select>

            {(filterEstado !== 'TODOS' || searchTerm !== '') && (
              <button
                type="button"
                onClick={() => {
                  setFilterEstado('TODOS')
                  setSearchTerm('')
                }}
                className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400"
              >
                Limpiar Filtros
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-xs font-extrabold text-white shadow-md shadow-cyan-600/20 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-cyan-600/30 active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <span className="text-base leading-none font-black">+</span>
              <span>Nueva Persona</span>
            </button>
          </div>
        </div>


        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-2 text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-400">
          <span>
            Mostrando <strong className="text-slate-800 dark:text-white">{filteredPersonas.length}</strong> de{' '}
            <strong className="text-slate-800 dark:text-white">{personas.length}</strong> personas registradas
          </span>
          <span className="hidden sm:inline text-[11px] text-slate-400">
            Padrón Único MDJLO · {new Date().getFullYear()}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
              <tr>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Persona</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Documento</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Licencia de Conducir</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Contacto</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Estado</th>
                <th className="sticky right-0 z-20 bg-slate-50/95 dark:bg-slate-900/95 px-4 py-3.5 text-right whitespace-nowrap border-l border-slate-200/60 dark:border-slate-800 shadow-[-4px_0_8px_rgba(0,0,0,0.03)] dark:shadow-[-4px_0_8px_rgba(0,0,0,0.2)]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading && personas.length === 0 ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-3.5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="h-3.5 w-32 rounded bg-slate-200 dark:bg-slate-800" />
                          <div className="h-2.5 w-24 rounded bg-slate-100 dark:bg-slate-800/60" />
                        </div>
                      </div>
                    </td>
                    <td className="px-3.5 py-4"><div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-3.5 py-4"><div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-3.5 py-4"><div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-3.5 py-4"><div className="h-5 w-16 rounded-full bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="sticky right-0 z-10 bg-white dark:bg-[#0f172a] px-4 py-4 text-right border-l border-slate-100 dark:border-slate-800"><div className="h-7 w-20 ml-auto rounded-lg bg-slate-200 dark:bg-slate-800" /></td>
                  </tr>
                ))
              ) : filteredPersonas.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-12 text-center text-slate-400">
                    <div className="mx-auto max-w-xs space-y-2">
                      <Icon name="people" className="size-10" />
                      <p className="font-bold text-slate-600 dark:text-slate-300">
                        No se encontraron personas
                      </p>
                      <p className="text-xs text-slate-400">
                        Intenta con otro término de búsqueda o modifica los filtros.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedPersonas.map((p) => (
                  <tr key={p.id} className="group transition-colors hover:bg-cyan-50/30 dark:hover:bg-slate-800/40">
                    <td className="px-3.5 py-3.5 max-w-[200px]">
                      <div className="flex items-center gap-3 min-w-0">
                        {p.fotoImg ? (
                          <img
                            src={p.fotoImg}
                            alt={p.nombres}
                            onError={(e) => {
                              e.currentTarget.onerror = null
                              e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.nombres)}+${encodeURIComponent(p.apellidoPaterno)}&background=0284c7&color=fff&bold=true`
                            }}
                            className="size-10 shrink-0 rounded-full object-cover border-2 border-slate-200 shadow-xs dark:border-slate-700"
                          />
                        ) : (
                          <div className="size-10 shrink-0 rounded-full bg-gradient-to-br from-cyan-600 to-blue-700 text-white font-black flex items-center justify-center text-xs shadow-xs border-2 border-slate-200 dark:border-slate-700 uppercase select-none">
                            {p.nombres?.[0] || '?'}{p.apellidoPaterno?.[0] || ''}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-extrabold text-slate-800 dark:text-white truncate" title={`${p.nombres} ${p.apellidoPaterno} ${p.apellidoMaterno}`}>
                            {p.nombres} {p.apellidoPaterno} {p.apellidoMaterno}
                          </p>
                          <p className="text-xs text-slate-400 truncate" title={p.direccion}>{p.direccion}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3.5 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                        <span>{p.tipoDocumento === 'DOCUMENTO NACIONAL DE IDENTIDAD' ? 'DNI' : p.tipoDocumento}:</span>
                        <span>{p.numeroDocumento}</span>
                      </span>
                    </td>
                    <td className="px-3.5 py-3.5 whitespace-nowrap">
                      {p.numeroLicencia ? (
                        <div>
                          <p className="font-mono font-bold text-cyan-700 dark:text-cyan-400">{p.numeroLicencia}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Sin Licencia</span>
                      )}
                    </td>
                    <td className="px-3.5 py-3.5 whitespace-nowrap">
                      <p className="font-bold text-slate-700 dark:text-slate-300">{p.celular || p.telefono || '—'}</p>
                      <p className="mt-0.5 min-w-40 max-w-64 whitespace-normal text-xs leading-relaxed text-slate-500 [overflow-wrap:anywhere] dark:text-slate-400">{p.email}</p>
                    </td>
                    <td className="px-3.5 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold ${p.estado === 'ACTIVO'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                      >
                        <span className="size-1.5 rounded-full bg-current" />
                        {p.estado}
                      </span>
                    </td>
                    <td className="sticky right-0 z-10 bg-white group-hover:bg-cyan-50/40 dark:bg-[#0f172a] dark:group-hover:bg-slate-800/60 px-4 py-3.5 text-right whitespace-nowrap border-l border-slate-100 dark:border-slate-800/80 shadow-[-4px_0_8px_rgba(0,0,0,0.03)] dark:shadow-[-4px_0_8px_rgba(0,0,0,0.2)]">
                      <div className="flex items-center justify-end gap-1.5 pr-1">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(p)}
                          title="Ver Ficha Digital"
                          className="rounded-xl p-1.5 bg-sky-50 text-sky-600 hover:bg-sky-500 hover:text-white dark:bg-sky-950/60 dark:text-sky-400 dark:hover:bg-sky-500 dark:hover:text-white transition-all duration-200 shadow-2xs hover:shadow-md active:scale-95 cursor-pointer"
                        >
                          <Icon name="eye" className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(p)}
                          title="Editar Persona"
                          className="rounded-xl p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white dark:bg-amber-950/60 dark:text-amber-400 dark:hover:bg-amber-500 dark:hover:text-white transition-all duration-200 shadow-2xs hover:shadow-md active:scale-95 cursor-pointer"
                        >
                          <Icon name="pencil" className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id)}
                          title="Eliminar Persona"
                          className="rounded-xl p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white dark:bg-rose-950/60 dark:text-rose-400 dark:hover:bg-rose-500 dark:hover:text-white transition-all duration-200 shadow-2xs hover:shadow-md active:scale-95 cursor-pointer"
                        >
                          <Icon name="trash" className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalItems={filteredPersonas.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(size) => {
            setItemsPerPage(size)
            setCurrentPage(1)
          }}
        />
      </div>


      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-enter">
          <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-blue-900/20 bg-[#123b6d] shrink-0 px-5 py-3 text-white dark:border-slate-800 dark:bg-[#102a4d]">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-white/10 text-cyan-300">
                  <Icon name="people" className="size-5" />
                </span>
                <div>
                  <h3 className="text-lg font-extrabold text-white">
                    {isEditing ? 'Editar Registro de Persona' : 'Registrar Nueva Persona'}
                  </h3>
                  <p className="text-xs text-blue-100/80">Gestión de conductores y administrados</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="grid size-9 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 text-white shadow-xs transition hover:bg-white/20 cursor-pointer"
              >
                <Icon name="close" className="size-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="flex min-h-0 flex-col">
              <div className="min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-3">
                <div className="flex flex-col sm:flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/40">
                  <div className="shrink-0">
                    {formData.fotoImg ? (
                      <img
                        src={formData.fotoImg}
                        alt="Vista previa"
                        onError={(e) => {
                          e.currentTarget.onerror = null
                          e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.nombres || 'P')}+${encodeURIComponent(formData.apellidoPaterno || 'P')}&background=0284c7&color=fff&bold=true`
                        }}
                        className="size-14 rounded-2xl object-cover border-2 border-cyan-500 shadow-md"
                      />
                    ) : (
                      <div className="size-14 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-700 text-white font-black flex items-center justify-center text-xl shadow-md border-2 border-slate-200 dark:border-slate-700 uppercase select-none">
                        {formData.nombres?.[0] || '?'}{formData.apellidoPaterno?.[0] || ''}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 w-full space-y-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <span>Fotografía del Administrado / Conductor</span>
                        <span className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400">(Opcional)</span>
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Formatos permitidos: JPG, PNG, WebP (máx. 2 MB)
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-100 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer">
                        <Icon name="camera" className="size-4 text-cyan-600" />
                        <span>{formData.fotoImg ? 'Cambiar fotografía...' : 'Subir fotografía...'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </label>

                      {formData.fotoImg && (
                        <button
                          type="button"
                          onClick={handleClearPhoto}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400 transition-all cursor-pointer"
                        >
                          <Icon name="trash" className="size-3.5" />
                          <span>Quitar foto</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 mb-2 flex items-center gap-2">
                    <span className="size-2 rounded-full bg-cyan-600" />
                    Datos Personales & Documentos
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-cyan-600 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-4 focus-within:ring-cyan-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-cyan-400">
                      <select
                        id="per_tipo_doc"
                        value={formData.tipoDocumento}
                        onChange={(e) => setFormData({ ...formData, tipoDocumento: e.target.value })}
                        className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-bold text-slate-800 outline-none dark:text-white"
                      >
                        <option value="DNI">DNI (Documento Nacional)</option>
                        <option value="CE">Carnet de Extranjería</option>
                        <option value="PASAPORTE">Pasaporte</option>
                      </select>
                      <label
                        htmlFor="per_tipo_doc"
                        className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400"
                      >
                        Tipo de Documento
                      </label>
                    </div>

                    <div className="relative sm:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-cyan-600 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-4 focus-within:ring-cyan-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-cyan-400">
                      <input
                        id="per_num_doc"
                        type="text"
                        required
                        maxLength={formData.tipoDocumento === 'DNI' ? 8 : 15}
                        placeholder=" "
                        value={formData.numeroDocumento}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (formData.tipoDocumento === 'DNI' && !/^\d*$/.test(val)) return;
                          setFormData({ ...formData, numeroDocumento: val })
                        }}
                        className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-mono font-bold text-slate-800 outline-none dark:text-white"
                      />
                      <label
                        htmlFor="per_num_doc"
                        className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-cyan-600 dark:peer-focus:text-cyan-400"
                      >
                        Número de Documento
                      </label>
                    </div>

                    <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-cyan-600 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-4 focus-within:ring-cyan-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-cyan-400">
                      <input
                        id="per_nombres"
                        type="text"
                        required
                        placeholder=" "
                        value={formData.nombres}
                        onChange={(e) => setFormData({ ...formData, nombres: e.target.value })}
                        className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-semibold text-slate-800 outline-none dark:text-white"
                      />
                      <label
                        htmlFor="per_nombres"
                        className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-cyan-600 dark:peer-focus:text-cyan-400"
                      >
                        Nombres Completo
                      </label>
                    </div>

                    <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-cyan-600 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-4 focus-within:ring-cyan-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-cyan-400">
                      <input
                        id="per_paterno"
                        type="text"
                        required
                        placeholder=" "
                        value={formData.apellidoPaterno}
                        onChange={(e) => setFormData({ ...formData, apellidoPaterno: e.target.value })}
                        className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-semibold text-slate-800 outline-none dark:text-white"
                      />
                      <label
                        htmlFor="per_paterno"
                        className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-cyan-600 dark:peer-focus:text-cyan-400"
                      >
                        Apellido Paterno
                      </label>
                    </div>

                    <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-cyan-600 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-4 focus-within:ring-cyan-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-cyan-400">
                      <input
                        id="per_materno"
                        type="text"
                        placeholder=" "
                        value={formData.apellidoMaterno}
                        onChange={(e) => setFormData({ ...formData, apellidoMaterno: e.target.value })}
                        className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-semibold text-slate-800 outline-none dark:text-white"
                      />
                      <label
                        htmlFor="per_materno"
                        className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-cyan-600 dark:peer-focus:text-cyan-400"
                      >
                        Apellido Materno
                      </label>
                    </div>
                  </div>
                </div>


                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 mb-2 flex items-center gap-2">
                    <span className="size-2 rounded-full bg-blue-500" />
                    Licencia de Conducir
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-cyan-600 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-4 focus-within:ring-cyan-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-cyan-400">
                      <input
                        id="per_licencia"
                        type="text"
                        placeholder=" "
                        value={formData.numeroLicencia}
                        onChange={(e) => setFormData({ ...formData, numeroLicencia: e.target.value.toUpperCase() })}
                        className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-mono font-bold text-slate-800 outline-none dark:text-white"
                      />
                      <label
                        htmlFor="per_licencia"
                        className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-cyan-600 dark:peer-focus:text-cyan-400"
                      >
                        Número de Licencia
                      </label>
                    </div>




                  </div>
                </div>


                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 mb-2 flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    Contacto y estado
                  </h4>
                  <div className="mb-3 grid gap-3 sm:grid-cols-2">
                    {[
                      ['direccion', 'Dirección', 250, 'text'],
                      ['email', 'Correo electrónico', 150, 'email'],
                    ].map(([field, label, maxLength, type]) => (
                      <label key={field} className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {label}
                        <input type={type} maxLength={maxLength} value={formData[field] || ''}
                          onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                          className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-cyan-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                      </label>
                    ))}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-cyan-600 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-4 focus-within:ring-cyan-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-cyan-400">
                      <input
                        id="per_celular"
                        type="tel"
                        maxLength={9}
                        placeholder=" "
                        value={formData.celular}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!/^\d*$/.test(val)) return;
                          setFormData({ ...formData, celular: val });
                        }}
                        className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-semibold text-slate-800 outline-none dark:text-white"
                      />
                      <label
                        htmlFor="per_celular"
                        className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-cyan-600 dark:peer-focus:text-cyan-400"
                      >
                        Teléfono / celular de contacto
                      </label>
                    </div>



                    <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-cyan-600 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-4 focus-within:ring-cyan-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-cyan-400">
                      <select
                        id="per_estado"
                        value={formData.estado}
                        onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                        className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-bold text-slate-800 outline-none dark:text-white"
                      >
                        <option value="ACTIVO">ACTIVO</option>
                        <option value="INACTIVO">INACTIVO</option>
                      </select>
                      <label
                        htmlFor="per_estado"
                        className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400"
                      >
                        Estado del Registro
                      </label>
                    </div>
                  </div>
                </div>


              </div>
              <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 bg-white px-5 py-3 dark:border-slate-800 dark:bg-[#0f172a]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 px-6 py-2.5 text-xs font-black text-white hover:from-cyan-700 hover:to-teal-700 shadow-md shadow-cyan-600/25 transition-all cursor-pointer"
                >
                  {isEditing ? 'Guardar Cambios' : 'Registrar Persona'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {isDetailModalOpen && selectedPersona && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-enter">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
            <div className="border-b border-slate-100 bg-[#071a2f] p-6 text-white text-center relative">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="absolute right-4 top-4 rounded-full p-1 text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer"
              >
                ✕
              </button>
              {selectedPersona.fotoImg ? (
                <img
                  src={selectedPersona.fotoImg}
                  alt={selectedPersona.nombres}
                  onError={(e) => {
                    e.currentTarget.onerror = null
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedPersona.nombres)}+${encodeURIComponent(selectedPersona.apellidoPaterno)}&background=0284c7&color=fff&bold=true`
                  }}
                  className="size-24 rounded-full mx-auto object-cover border-4 border-cyan-400 shadow-lg"
                />
              ) : (
                <div className="size-24 rounded-full mx-auto bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-black flex items-center justify-center text-2xl border-4 border-cyan-400 shadow-lg uppercase select-none">
                  {selectedPersona.nombres?.[0] || '?'}{selectedPersona.apellidoPaterno?.[0] || ''}
                </div>
              )}
              <h3 className="mt-3 text-xl font-black">{selectedPersona.nombres} {selectedPersona.apellidoPaterno} {selectedPersona.apellidoMaterno}</h3>
              <span className="mt-1 inline-block rounded-full bg-cyan-500/20 px-3 py-0.5 text-xs font-bold text-cyan-300 border border-cyan-500/30">
                {selectedPersona.tipoDocumento === 'DOCUMENTO NACIONAL DE IDENTIDAD' ? 'DNI' : selectedPersona.tipoDocumento}: {selectedPersona.numeroDocumento}
              </span>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-2.5 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex justify-between border-b border-slate-200/60 pb-2 dark:border-slate-800">
                  <span className="font-bold text-slate-400">Licencia de Conducir</span>
                  <span className="font-mono font-extrabold text-cyan-600 dark:text-cyan-400">{selectedPersona.numeroLicencia || 'N/A'}</span>
                </div>


                <div className="flex justify-between border-b border-slate-200/60 pb-2 dark:border-slate-800">
                  <span className="font-bold text-slate-400">Celular / Teléfono</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedPersona.celular || selectedPersona.telefono || 'N/A'}</span>
                </div>

              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-extrabold text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Cerrar Ficha
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
