import { useState, useEffect } from 'react'
import { Icon } from '../components/ui/Icon'
import { useQuickCreate } from '../hooks/useQuickCreate'
import { Pagination } from '../components/ui/Pagination'
import { apiFetch, getCachedData, setCachedData } from '../config/api'

export function Inspecciones() {
  const cachedInsp = getCachedData('/inspecciones')
  const cachedCrit = getCachedData('/inspeccion-criterios')
  const cachedVeh = getCachedData('/vehiculos')
  const [tecnicos, setTecnicos] = useState([])
  const [inspecciones, setInspecciones] = useState(cachedInsp || [])
  const [criteriosInspeccion, setCriteriosInspeccion] = useState(cachedCrit || [])
  const [vehiculos, setVehiculos] = useState(cachedVeh || [])
  const [isLoading, setIsLoading] = useState(!cachedInsp)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterResultado, setFilterResultado] = useState('TODOS')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(8)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  const [selectedInspeccion, setSelectedInspeccion] = useState(null)

  const [formData, setFormData] = useState({
    vehiculoPlaca: '',
    inspector: '', tecnicoId: '',
    resultado: 'APROBADO',
    observaciones: '',
    detalles: [],
  })

  const totales = inspecciones.length
  const aprobados = inspecciones.filter((i) => i.resultado === 'APROBADO').length
  const observados = inspecciones.filter((i) => i.resultado === 'OBSERVADO').length
  const desaprobados = inspecciones.filter((i) => i.resultado === 'DESAPROBADO').length
  const porcentajeAprobados = totales > 0 ? Math.round((aprobados / totales) * 100) : 0

  const filteredInspecciones = inspecciones.filter((i) => {
    const vehiculo = vehiculos.find((v) => v.placa === i.vehiculoPlaca)
    const fullSearch = `${i.numeroInspeccion} ${i.vehiculoPlaca} ${i.inspector} ${vehiculo?.propietario || ''} ${vehiculo?.marca || ''} ${vehiculo?.modelo || ''}`.toLowerCase()
    const matchesSearch = fullSearch.includes(searchTerm.toLowerCase())
    const matchesResultado = filterResultado === 'TODOS' || i.resultado === filterResultado
    return matchesSearch && matchesResultado
  })

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterResultado])

  const paginatedInspecciones = filteredInspecciones.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  useEffect(() => {
    apiFetch('/personal').then(r => r.json()).then(r => setTecnicos((r.data || []).filter(p => p.estado === 'ACTIVO'))).catch(() => { })
    Promise.all([
      apiFetch('/inspecciones').then(res => res.json()).catch(() => ({ data: [] })),
      apiFetch('/inspeccion-criterios').then(res => res.json()).catch(() => ({ data: [] })),
      apiFetch('/vehiculos').then(res => res.json()).catch(() => ({ data: [] }))
    ]).then(([inspRes, critRes, vehRes]) => {
      const fetched = (inspRes.data || []).map(i => ({
        ...i,
        detalles: typeof i.detalles === 'string' ? JSON.parse(i.detalles) : (i.detalles || [])
      }))
      const cData = critRes.data || []
      const vData = vehRes.data || []
      setInspecciones(fetched)
      setCriteriosInspeccion(cData)
      setVehiculos(vData)
      setCachedData('/inspecciones', fetched)
      setCachedData('/inspeccion-criterios', cData)
      setCachedData('/vehiculos', vData)
      setIsLoading(false)
    }).catch(err => {
      console.error('Error fetching inspecciones:', err)
      setIsLoading(false)
    })
  }, [])

  const handleOpenCreateModal = () => {
    setFormData({
      vehiculoPlaca: '',
      inspector: '', tecnicoId: '',
      resultado: 'APROBADO',
      observaciones: '',
      detalles: criteriosInspeccion.map((c) => ({ criterioId: c.id, estado: 'BIEN', obs: '' })),
    })
    setSelectedInspeccion(null)
    setIsModalOpen(true)
  }

  useQuickCreate(handleOpenCreateModal, !isLoading)

  const handleOpenDetail = (inspeccion) => {
    setSelectedInspeccion(inspeccion)
    setIsDetailModalOpen(true)
  }

  const handleOpenPreview = (inspeccion) => {
    setSelectedInspeccion(inspeccion)
    setIsPreviewModalOpen(true)
  }

  const handleOpenEditModal = (inspeccion) => {
    setFormData({
      vehiculoPlaca: inspeccion.vehiculoPlaca,
      inspector: inspeccion.inspector, tecnicoId: inspeccion.tecnicoId || '',
      resultado: inspeccion.resultado,
      observaciones: inspeccion.observaciones || '',
      detalles: inspeccion.detalles || criteriosInspeccion.map((c) => ({ criterioId: c.id, estado: 'BIEN', obs: '' })),
    })
    setSelectedInspeccion(inspeccion)
    setIsModalOpen(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('¿Está seguro que desea eliminar este registro de inspección?')) {
      try {
        await apiFetch(`/inspecciones/${id}`, { method: 'DELETE' })
        setInspecciones(inspecciones.filter(i => i.id !== id))
      } catch (err) {
        console.error('Error al eliminar:', err)
        alert('Error al eliminar la inspección')
      }
    }
  }

  const handleDetalleChange = (criterioId, field, value) => {
    setFormData((prev) => ({
      ...prev,
      detalles: prev.detalles.map((d) => (d.criterioId === criterioId ? { ...d, [field]: value } : d)),
    }))
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    if (!formData.vehiculoPlaca.trim()) {
      alert('Por favor ingrese la placa del vehículo.')
      return
    }

    const payload = {
      ...formData,
      resultado: formData.resultado,
      observaciones: formData.observaciones,
      detalles: formData.detalles
    }

    try {
      if (selectedInspeccion) {
        const response = await apiFetch(`/inspecciones/${selectedInspeccion.id}`, {
          method: 'PUT',
          body: payload
        })
        if (response.ok) {
          setInspecciones(inspecciones.map(i => i.id === selectedInspeccion.id ? { ...i, ...formData } : i))
        }
      } else {
        const response = await apiFetch('/inspecciones', {
          method: 'POST',
          body: payload
        })
        const result = await response.json()
        if (response.ok && result.data) {
          const newInspeccion = {
            ...result.data,
            detalles: typeof result.data.detalles === 'string' ? JSON.parse(result.data.detalles) : result.data.detalles
          }
          setInspecciones([newInspeccion, ...inspecciones])
        }
      }
      setIsModalOpen(false)
    } catch (err) {
      console.error('Error guardando inspección:', err)
      alert('Error al guardar la inspección')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#6C4CF1] to-[#9A6CF7] text-white shadow-lg shadow-[#6C4CF1]/30">
            <Icon name="inspection" className="size-6 text-white" />
          </span>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Inspecciones Técnicas Vehiculares
            </h1>
            <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              Constatación de características técnicas, estado operativo y seguridad de la flota de mototaxis.
            </p>
          </div>
        </div>
      </div>

      {/* Tarjetas de Métricas - Total Realizadas dividida en Total Realizadas y Aprobados */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Total Realizadas */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#6C4CF1] to-[#956BF6] p-5 text-white shadow-lg shadow-[#6C4CF1]/20 transition-all hover:shadow-xl hover:shadow-[#6C4CF1]/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-purple-100">
              Total Realizadas
            </span>
            <span className="grid size-9 place-items-center rounded-xl bg-white/20 text-white backdrop-blur-xs">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                <rect x="9" y="3" width="6" height="4" rx="1.5" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black">{totales}</p>
            <span className="rounded-full bg-white/25 px-2.5 py-0.5 text-xs font-bold text-white">
              Historial
            </span>
          </div>
          <p className="mt-1 text-xs text-purple-100 font-medium">Constataciones registradas</p>
        </div>

        {/* 2. Aprobados (Dividido con icono de escudo/aprobación) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#25BE80] to-[#46DCA0] p-5 text-white shadow-lg shadow-[#25BE80]/20 transition-all hover:shadow-xl hover:shadow-[#25BE80]/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-100">
              Aprobados
            </span>
            <span className="grid size-9 place-items-center rounded-xl bg-white/20 text-white backdrop-blur-xs">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black">{aprobados}</p>
            <span className="rounded-full bg-white/25 px-2.5 py-0.5 text-xs font-black text-white">
              {porcentajeAprobados}% Aptos
            </span>
          </div>
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full rounded-full bg-white transition-all duration-500"
              style={{ width: `${porcentajeAprobados}%` }}
            />
          </div>
        </div>

        {/* 3. Observados */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#FF6F8E] to-[#FF9AA8] p-5 text-white shadow-lg shadow-[#FF6F8E]/20 transition-all hover:shadow-xl hover:shadow-[#FF6F8E]/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-rose-100">
              Observados
            </span>
            <span className="grid size-9 place-items-center rounded-xl bg-white/20 text-white backdrop-blur-xs">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black">{observados}</p>
            <span className="rounded-full bg-white/25 px-2.5 py-0.5 text-xs font-bold text-white">
              Subsanables
            </span>
          </div>
          <p className="mt-1 text-xs text-rose-100 font-medium">Deficiencias leves (plazo 48h)</p>
        </div>

        {/* 4. Desaprobados */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-[#1B1536]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Desaprobados
            </span>
            <span className="grid size-9 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="12" cy="12" r="9" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-800 dark:text-white">{desaprobados}</p>
            <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
              Fallas Críticas
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">Peligro para circular</p>
        </div>
      </div>

      {/* Tabla Panel */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1B1536]">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Icon name="search" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por código, placa, inspector o datos del vehículo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-10 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900/50 dark:text-white dark:focus:border-indigo-400"
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
            <select
              value={filterResultado}
              onChange={(e) => setFilterResultado(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-xs font-semibold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <option value="TODOS">Todos los Resultados</option>
              <option value="APROBADO">Aprobados</option>
              <option value="OBSERVADO">Observados</option>
              <option value="DESAPROBADO">Desaprobados</option>
            </select>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#6C4CF1] to-[#9A6CF7] px-4 py-2.5 text-xs font-extrabold text-white shadow-md shadow-[#6C4CF1]/20 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-[#6C4CF1]/30 active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <span className="text-base leading-none font-black">+</span>
              <span>Registrar Inspección</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/70 text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
              <tr>
                <th className="px-3.5 py-3.5 whitespace-nowrap">N° Inspección</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Placa Vehicular</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Vehículo & Propietario</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Fecha & Hora</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Inspector Asignado</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Resultado</th>
                <th className="sticky right-0 z-20 bg-slate-50/95 dark:bg-slate-900/95 px-4 py-3.5 text-right whitespace-nowrap border-l border-slate-200/60 dark:border-slate-800 shadow-[-4px_0_8px_rgba(0,0,0,0.03)] dark:shadow-[-4px_0_8px_rgba(0,0,0,0.2)]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading && inspecciones.length === 0 ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-3.5 py-4"><div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-3.5 py-4"><div className="h-6 w-20 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-3.5 py-4">
                      <div className="space-y-1.5">
                        <div className="h-3.5 w-32 rounded bg-slate-200 dark:bg-slate-800" />
                        <div className="h-2.5 w-20 rounded bg-slate-100 dark:bg-slate-800/60" />
                      </div>
                    </td>
                    <td className="px-3.5 py-4"><div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-3.5 py-4"><div className="h-5 w-20 rounded-full bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-3.5 py-4"><div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="sticky right-0 z-10 bg-white dark:bg-[#1B1536] px-4 py-4 text-right border-l border-slate-100 dark:border-slate-800"><div className="h-7 w-20 ml-auto rounded-lg bg-slate-200 dark:bg-slate-800" /></td>
                  </tr>
                ))
              ) : filteredInspecciones.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-slate-400">
                    <div className="mx-auto max-w-xs space-y-2">
                      <p className="text-3xl">📋</p>
                      <p className="font-bold text-slate-600 dark:text-slate-300">
                        No se encontraron inspecciones
                      </p>
                      <p className="text-xs text-slate-400">
                        Modifica los parámetros de búsqueda o los filtros de resultado.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedInspecciones.map((i) => {
                  const vehiculo = vehiculos.find((v) => v.placa === i.vehiculoPlaca)
                  return (
                    <tr key={i.id} className="group transition-colors hover:bg-[#FAF9FE] dark:hover:bg-slate-800/40">
                      <td className="px-3.5 py-3.5 whitespace-nowrap">
                        <span className="font-mono font-extrabold text-[#6C4CF1] dark:text-[#A87EFD]">
                          {i.numeroInspeccion}
                        </span>
                      </td>

                      <td className="px-3.5 py-3.5 whitespace-nowrap">
                        <span className="inline-block rounded-lg border border-[#F3DE9E] bg-[#FFF3D6] px-2.5 py-1 font-mono text-xs font-black text-[#8A6A0A] dark:border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-300">
                          {i.vehiculoPlaca}
                        </span>
                      </td>

                      <td className="px-3.5 py-3.5 max-w-45">
                        <p className="font-bold text-slate-800 dark:text-white truncate" title={`${vehiculo?.marca || ''} ${vehiculo?.modelo || ''}`}>
                          {vehiculo ? `${vehiculo.marca} ${vehiculo.modelo}` : 'Vehículo Registrado'}
                        </p>
                        <p className="text-xs text-slate-400 truncate max-w-40" title={vehiculo?.propietario || 'No especificado'}>
                          {vehiculo?.propietario || 'Propietario no asignado'}
                        </p>
                      </td>

                      <td className="px-3.5 py-3.5 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        <p className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {new Date(i.fecha).toLocaleDateString()}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {new Date(i.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </td>

                      <td className="px-3.5 py-3.5 whitespace-nowrap">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{i.inspector}</p>
                      </td>

                      {/* RESULTADO: Píldora con sombreado acorde al color original */}
                      <td className="px-3.5 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wider ${i.resultado === 'APROBADO'
                              ? 'bg-[#E6FAF0] text-[#0F7547] shadow-[0_3px_10px_rgba(31,181,116,0.22)] dark:bg-emerald-950/40 dark:text-emerald-300'
                              : i.resultado === 'OBSERVADO'
                                ? 'bg-[#FFF4E2] text-[#8A5308] shadow-[0_3px_10px_rgba(224,135,18,0.2)] dark:bg-amber-950/40 dark:text-amber-300'
                                : 'bg-[#FDEAEE] text-[#A22E43] shadow-[0_3px_10px_rgba(240,91,114,0.22)] dark:bg-rose-950/40 dark:text-rose-300'
                            }`}
                        >
                          <span
                            className={`size-2 rounded-full ${i.resultado === 'APROBADO'
                                ? 'bg-[#1FB574]'
                                : i.resultado === 'OBSERVADO'
                                  ? 'bg-[#E08712]'
                                  : 'bg-[#F05B72]'
                              }`}
                          />
                          {i.resultado}
                        </span>
                      </td>

                      {/* ACCIONES: Botones circulares con paleta original y sombreado */}
                      <td className="sticky right-0 z-10 bg-white group-hover:bg-[#FAF9FE] dark:bg-[#1B1536] dark:group-hover:bg-slate-800/60 px-4 py-3.5 text-right whitespace-nowrap border-l border-slate-100 dark:border-slate-800/80 shadow-[-4px_0_8px_rgba(0,0,0,0.03)] dark:shadow-[-4px_0_8px_rgba(0,0,0,0.2)]">
                        <div className="flex items-center justify-end gap-2 pr-1">
                          {/* Ver - Violeta */}
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(i)}
                            title="Ver Ficha Técnica"
                            className="flex size-8.5 items-center justify-center rounded-full bg-[#EDE8FF] text-[#6C4CF1] shadow-[0_4px_10px_rgba(108,76,241,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#6C4CF1]/30 dark:bg-indigo-950/60 dark:text-indigo-400 cursor-pointer"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>

                          {/* Editar - Ámbar */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(i)}
                            title="Editar Inspección"
                            className="flex size-8.5 items-center justify-center rounded-full bg-[#FFF2D9] text-[#E08712] shadow-[0_4px_10px_rgba(224,135,18,0.2)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#E08712]/30 dark:bg-amber-950/60 dark:text-amber-400 cursor-pointer"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                            </svg>
                          </button>

                          {/* Imprimir - Verde */}
                          <button
                            type="button"
                            onClick={() => handleOpenPreview(i)}
                            title="Imprimir Acta"
                            className="flex size-8.5 items-center justify-center rounded-full bg-[#DDF7EC] text-[#1FB574] shadow-[0_4px_10px_rgba(31,181,116,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#1FB574]/30 dark:bg-emerald-950/60 dark:text-emerald-400 cursor-pointer"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                              <path d="M6 9V2h12v7" />
                              <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
                              <rect x="6" y="14" width="12" height="8" />
                            </svg>
                          </button>

                          {/* Eliminar - Rojo/Coral */}
                          <button
                            type="button"
                            onClick={() => handleDelete(i.id)}
                            title="Eliminar Inspección"
                            className="flex size-8.5 items-center justify-center rounded-full bg-[#FDECEF] text-[#F05B72] shadow-[0_4px_10px_rgba(240,91,114,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#F05B72]/30 dark:bg-rose-950/60 dark:text-rose-400 cursor-pointer"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                            </svg>
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

        <Pagination
          currentPage={currentPage}
          totalItems={filteredInspecciones.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(size) => {
            setItemsPerPage(size)
            setCurrentPage(1)
          }}
        />
      </div>

      {/* Modal Crear / Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-enter">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#1B1536]">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
              <div>
                <h3 className="text-lg font-extrabold text-slate-800 dark:text-white">
                  {selectedInspeccion ? 'Editar Constatación de Características' : 'Registrar Constatación de Características'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Evaluación reglamentaria de condiciones de seguridad vehicular
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="flex-1 space-y-6 overflow-y-auto p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Placa del Vehículo *
                  </label>
                  <input
                    type="text"
                    required
                    list="vehiculos-list"
                    placeholder="Ej. M4X-821"
                    value={formData.vehiculoPlaca}
                    onChange={(e) => setFormData({ ...formData, vehiculoPlaca: e.target.value.toUpperCase() })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-mono text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <datalist id="vehiculos-list">
                    {vehiculos.map((v) => (
                      <option key={v.id} value={v.placa}>
                        {v.marca} {v.modelo} - {v.propietario}
                      </option>
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Inspector Técnico
                  </label>
                  <select
                    required
                    disabled={!!selectedInspeccion}
                    value={formData.tecnicoId || ''}
                    onChange={e => setFormData({ ...formData, tecnicoId: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm dark:bg-slate-800"
                  >
                    <option value="">Seleccione el técnico responsable</option>
                    {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nombres} {t.apellidos}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <h4 className="mb-3 border-b border-slate-200 pb-2 text-sm font-bold text-slate-800 dark:border-slate-700 dark:text-white">
                  Criterios de Evaluación Obligatoria
                </h4>
                <div className="space-y-3">
                  {criteriosInspeccion.map((criterio) => {
                    const detalle = formData.detalles.find((d) => d.criterioId === criterio.id)
                    return (
                      <div
                        key={criterio.id}
                        className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-3.5 dark:border-slate-800/80 dark:bg-slate-900/30"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                              {criterio.codigo} - {criterio.nombre}{' '}
                              {criterio.obligatorio && <span className="text-rose-500 font-bold">*</span>}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                              {criterio.descripcion}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <select
                              value={detalle?.estado || 'BIEN'}
                              onChange={(e) => handleDetalleChange(criterio.id, 'estado', e.target.value)}
                              className={`rounded-lg border-2 px-3 py-1.5 text-xs font-extrabold outline-none cursor-pointer ${detalle?.estado === 'BIEN'
                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                  : detalle?.estado === 'MAL_ESTADO'
                                    ? 'border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                                    : 'border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                }`}
                            >
                              <option value="BIEN">BIEN (Apto)</option>
                              <option value="MAL_ESTADO">MAL ESTADO (Falla)</option>
                              <option value="NO_TIENE">NO TIENE (Falta)</option>
                            </select>
                          </div>
                        </div>

                        {detalle?.estado !== 'BIEN' && (
                          <div className="mt-2.5">
                            <input
                              type="text"
                              placeholder="Indicar detalle de la falla u observación técnica..."
                              value={detalle?.obs || ''}
                              onChange={(e) => handleDetalleChange(criterio.id, 'obs', e.target.value)}
                              className="w-full rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-amber-700/60 dark:bg-slate-800 dark:text-slate-200"
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Observaciones Generales y Dictamen
                  </label>
                  <textarea
                    rows="2"
                    placeholder="Notas o requerimientos adicionales..."
                    value={formData.observaciones}
                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  ></textarea>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Resultado Técnico Final
                  </label>
                  <select
                    value={formData.resultado}
                    onChange={(e) => setFormData({ ...formData, resultado: e.target.value })}
                    className={`w-full rounded-xl border-2 px-3.5 py-2.5 text-sm font-black outline-none cursor-pointer ${formData.resultado === 'APROBADO'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400'
                        : formData.resultado === 'OBSERVADO'
                          ? 'border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400'
                          : 'border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-900/20 dark:text-rose-400'
                      }`}
                  >
                    <option value="APROBADO">APROBADO (Apto para Circular)</option>
                    <option value="OBSERVADO">OBSERVADO (Plazo de Subsanación)</option>
                    <option value="DESAPROBADO">DESAPROBADO (No Apto)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#6C4CF1] px-5 py-2.5 text-xs font-extrabold text-white shadow-md shadow-[#6C4CF1]/20 hover:bg-[#5A3BD8] cursor-pointer"
                >
                  {selectedInspeccion ? 'Guardar Cambios' : 'Guardar Inspección'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ficha Detalle */}
      {isDetailModalOpen && selectedInspeccion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-enter">
          <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#1B1536]">
            <div className="flex items-center justify-between border-b border-slate-100 bg-[#241A4A] p-5 text-white">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#B6ADE6]">
                  Ficha de Inspección Técnica
                </p>
                <h3 className="text-xl font-black mt-0.5">{selectedInspeccion.numeroInspeccion}</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-block rounded-lg border border-[#F3DE9E] bg-[#FFF3D6] px-3 py-1 font-mono text-xs font-black tracking-widest text-[#8A6A0A]">
                  {selectedInspeccion.vehiculoPlaca}
                </span>
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="rounded-full p-1 text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-4 p-6 text-xs max-h-[80vh] overflow-y-auto">
              <div className="space-y-2.5 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex justify-between border-b border-slate-200/60 pb-2 dark:border-slate-800">
                  <span className="font-bold text-slate-400">Fecha y Hora</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {new Date(selectedInspeccion.fecha).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-2 dark:border-slate-800">
                  <span className="font-bold text-slate-400">Inspector Responsable</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {selectedInspeccion.inspector}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-400">Veredicto Técnico</span>
                  <span
                    className={`font-black px-2.5 py-0.5 rounded-full ${selectedInspeccion.resultado === 'APROBADO'
                        ? 'bg-[#E6FAF0] text-[#0F7547] dark:bg-emerald-950 dark:text-emerald-300'
                        : selectedInspeccion.resultado === 'OBSERVADO'
                          ? 'bg-[#FFF4E2] text-[#8A5308] dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-[#FDEAEE] text-[#A22E43] dark:bg-rose-950 dark:text-rose-300'
                      }`}
                  >
                    {selectedInspeccion.resultado}
                  </span>
                </div>
              </div>

              {selectedInspeccion.detalles && selectedInspeccion.detalles.length > 0 && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                  <p className="mb-2.5 font-bold uppercase text-slate-400 text-[11px] tracking-wider">
                    Evaluación de Criterios Técnicos
                  </p>
                  <div className="space-y-2">
                    {selectedInspeccion.detalles.map((det) => {
                      const crit = criteriosInspeccion.find((c) => c.id === det.criterioId)
                      return (
                        <div
                          key={det.criterioId}
                          className="flex items-center justify-between border-b border-slate-200/40 py-1.5 last:border-0 dark:border-slate-800/40"
                        >
                          <div>
                            <span className="font-bold text-slate-700 dark:text-slate-200">
                              {crit ? crit.nombre : `Criterio #${det.criterioId}`}
                            </span>
                            {det.obs && <p className="mt-0.5 text-[11px] italic text-rose-500">{det.obs}</p>}
                          </div>
                          <span
                            className={`rounded-lg px-2.5 py-0.5 text-[11px] font-extrabold ${det.estado === 'BIEN'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : det.estado === 'MAL_ESTADO'
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              }`}
                          >
                            {det.estado === 'BIEN' ? 'BIEN' : det.estado === 'MAL_ESTADO' ? 'MAL ESTADO' : 'NO TIENE'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {selectedInspeccion.observaciones && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                  <p className="font-bold uppercase text-slate-400 text-[11px]">Observaciones Generales</p>
                  <p className="mt-1 font-semibold text-slate-800 dark:text-white leading-relaxed">
                    {selectedInspeccion.observaciones}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsDetailModalOpen(false)
                    handleOpenPreview(selectedInspeccion)
                  }}
                  className="rounded-xl bg-[#1FB574] px-4 py-2.5 font-bold text-white hover:bg-[#17965E] cursor-pointer inline-flex items-center gap-1.5 shadow-sm shadow-[#1FB574]/20"
                >
                  <Icon name="print" className="size-4" />
                  <span>Imprimir Acta</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="rounded-xl bg-slate-900 px-5 py-2.5 font-bold text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Previsualización de Acta */}
      {isPreviewModalOpen && selectedInspeccion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-enter">
          <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#1B1536] border border-slate-200 dark:border-slate-800">
            <div className="border-b border-slate-100 bg-[#241A4A] p-6 text-white text-center relative">
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(false)}
                className="absolute right-4 top-4 rounded-full p-1 text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer"
              >
                ✕
              </button>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#B6ADE6]">
                MUNICIPALIDAD DISTRITAL JOSÉ LEONARDO ORTIZ
              </p>
              <h3 className="text-xl font-black mt-1">ACTA DE CONSTATACIÓN DE CARACTERÍSTICAS</h3>
              <p className="text-xs font-mono font-bold text-purple-200 mt-0.5">
                {selectedInspeccion.numeroInspeccion}
              </p>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="rounded-2xl border border-slate-200 bg-purple-50/40 p-5 dark:border-slate-800 dark:bg-slate-900/60 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2 dark:border-slate-800">
                  <span className="font-bold text-slate-500">Placa Autorizada</span>
                  <span className="inline-block rounded-lg border border-[#F3DE9E] bg-[#FFF3D6] px-3 py-1 font-mono text-xs font-black tracking-widest text-[#8A6A0A]">
                    {selectedInspeccion.vehiculoPlaca}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200 pb-2 dark:border-slate-800">
                  <span className="font-bold text-slate-500">Fecha de Constatación</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-white">
                    {new Date(selectedInspeccion.fecha).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200 pb-2 dark:border-slate-800">
                  <span className="font-bold text-slate-500">Inspector Responsable</span>
                  <span className="font-bold text-slate-800 dark:text-white">{selectedInspeccion.inspector}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-500">Dictamen Oficial</span>
                  <span
                    className={`font-black px-3 py-1 rounded-full text-xs ${selectedInspeccion.resultado === 'APROBADO'
                        ? 'bg-[#E6FAF0] text-[#0F7547]'
                        : selectedInspeccion.resultado === 'OBSERVADO'
                          ? 'bg-[#FFF4E2] text-[#8A5308]'
                          : 'bg-[#FDEAEE] text-[#A22E43]'
                      }`}
                  >
                    {selectedInspeccion.resultado}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-center dark:border-slate-700 text-slate-500 dark:text-slate-400">
                <p className="text-[11px] leading-relaxed">
                  El presente documento certifica que el vehículo menor ha pasado la evaluación técnica vehicular de
                  conformidad con las ordenanzas municipales de transporte de José Leonardo Ortiz.
                </p>
                <div className="mt-6 flex justify-around pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div className="text-center">
                    <div className="w-28 border-b border-slate-400 mx-auto mb-1"></div>
                    <span className="text-[10px] font-bold">Firma del Inspector</span>
                  </div>
                  <div className="text-center">
                    <div className="w-28 border-b border-slate-400 mx-auto mb-1"></div>
                    <span className="text-[10px] font-bold">Sello Municipalidad</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-xl bg-[#1FB574] px-5 py-2.5 text-xs font-extrabold text-white hover:bg-[#17965E] shadow-md shadow-[#1FB574]/20 cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Icon name="print" className="size-4" />
                  <span>Imprimir Certificado</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-extrabold text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 cursor-pointer"
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