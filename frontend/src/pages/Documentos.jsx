import { useEffect, useState } from 'react'
import { Icon } from '../components/ui/Icon'
import { Pagination } from '../components/ui/Pagination'
import { apiFetch, getCachedData, setCachedData } from '../config/api'

export function Documentos() {
  const cachedDocs = getCachedData('/documentos')
  const cachedVeh = getCachedData('/vehiculos')
  const [documentos, setDocumentos] = useState(cachedDocs || [])
  const [vehiculos, setVehiculos] = useState(cachedVeh || [])
  const [isLoading, setIsLoading] = useState(!cachedDocs)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTipo, setFilterTipo] = useState('TODOS')
  const [filterEstado, setFilterEstado] = useState('TODOS')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(8)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [isEditing, setIsEditing] = useState(false)

  const [formData, setFormData] = useState({
    vehiculoPlaca: '',
    tipoDocumento: 'TARJETA_OPERATIVIDAD',
    codigo: '',
    fechaExpedicion: '2026-01-01',
    fechaExpiracion: '2027-01-01',
    estado: 'VIGENTE',
    propietario: '',
    asociacion: '',
  })

  useEffect(() => {
    Promise.all([
      apiFetch('/documentos').then((response) => response.ok ? response.json() : Promise.reject(response)),
      apiFetch('/vehiculos').then((response) => response.ok ? response.json() : Promise.reject(response))
    ]).then(([docsPayload, vehPayload]) => {
      const dData = docsPayload.data ?? []
      const vData = vehPayload.data ?? []
      setDocumentos(dData)
      setVehiculos(vData)
      setCachedData('/documentos', dData)
      setCachedData('/vehiculos', vData)
    }).catch(() => { })
      .finally(() => setIsLoading(false))
  }, [])

  const totalDocs = documentos.length
  const vigentes = documentos.filter((d) => d.estado === 'VIGENTE').length
  const enTramite = documentos.filter((d) => d.estado === 'EN_TRAMITE').length
  const vencidos = documentos.filter((d) => d.estado === 'VENCIDO').length
  const porcentajeVigentes = totalDocs > 0 ? Math.round((vigentes / totalDocs) * 100) : 0

  const filteredDocs = documentos.filter((d) => {
    const fullSearch = `${d.codigo} ${d.vehiculoPlaca} ${d.propietario} ${d.asociacion} ${d.tipoDocumento}`.toLowerCase()
    const matchesSearch = fullSearch.includes(searchTerm.toLowerCase())
    const matchesTipo = filterTipo === 'TODOS' || d.tipoDocumento === filterTipo
    const matchesEstado = filterEstado === 'TODOS' || d.estado === filterEstado

    return matchesSearch && matchesTipo && matchesEstado
  })

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterTipo, filterEstado])

  const paginatedDocs = filteredDocs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handleOpenCreateModal = () => {
    setFormData({
      vehiculoPlaca: vehiculos[0]?.placa || '',
      tipoDocumento: 'TARJETA_OPERATIVIDAD',
      codigo: `TUC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      fechaExpedicion: new Date().toISOString().split('T')[0],
      fechaExpiracion: '2027-12-31',
      estado: 'VIGENTE',
      propietario: vehiculos[0]?.propietario || '',
      asociacion: vehiculos[0]?.organizacion || '',
    })
    setIsEditing(false)
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (doc) => {
    setSelectedDoc(doc)
    setFormData({ ...doc })
    setIsEditing(true)
    setIsModalOpen(true)
  }

  const handleOpenPreview = (doc) => {
    setSelectedDoc(doc)
    setIsPreviewModalOpen(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('¿Está seguro de anular o eliminar este documento del sistema?')) {
      try {
        await apiFetch(`/documentos/${id}`, { method: 'DELETE' })
        setDocumentos(documentos.filter((d) => d.id !== id))
      } catch (err) {
        alert('No se pudo anular el documento.')
      }
    }
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    if (!formData.codigo.trim() || !formData.vehiculoPlaca.trim()) {
      alert('Por favor completa los campos requeridos.')
      return
    }

    // Validaciones
    if (new Date(formData.fechaExpiracion) < new Date(formData.fechaExpedicion)) {
      alert('La fecha de vencimiento no puede ser anterior a la fecha de expedición.')
      return
    }

    try {
      if (isEditing) {
        await apiFetch(`/documentos/${selectedDoc.id}`, {
          method: 'PUT',
          body: formData,
        })
        setDocumentos(documentos.map((d) => (d.id === selectedDoc.id ? { ...formData, id: d.id } : d)))
      } else {
        const res = await apiFetch('/documentos', {
          method: 'POST',
          body: formData,
        })
        const resData = await res.json()
        const newDoc = resData.data || {
          ...formData,
          id: Date.now(),
        }
        setDocumentos([newDoc, ...documentos])
      }
      setIsModalOpen(false)
    } catch (err) {
      alert('Error al registrar el documento en el servidor.')
    }
  }

  const getDocTypeBadge = (tipo) => {
    switch (tipo) {
      case 'TARJETA_OPERATIVIDAD':
        return (
          <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
            TUC (Tarjeta Operatividad)
          </span>
        )
      case 'SOAT':
        return (
          <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            SOAT Vehicular
          </span>
        )
      case 'CITV':
        return (
          <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-extrabold text-purple-800 dark:bg-purple-950 dark:text-purple-300">
            CITV
          </span>
        )
      default:
        return (
          <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            Tarjeta de Propiedad
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
            <Icon name="document" className="size-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                Control de TUCs, SOAT y Revisiones
              </h1>
            </div>
            <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              Control documental, autorizaciones vehiculares (TUC), SOAT y certificados vigentes.
            </p>
          </div>
        </div>
      </div>


      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Emitidos</span>
            <span className="grid size-10 place-items-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400">
              <Icon name="document" className="size-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-800 dark:text-white">{new Intl.NumberFormat('es-PE').format(totalDocs)}</p>
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-full">Padrón 2026</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Documentos procesados</p>
        </div>


        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Vigentes</span>
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 font-bold">✓</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-800 dark:text-white">{new Intl.NumberFormat('es-PE').format(vigentes)}</p>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">{porcentajeVigentes}% al día</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${porcentajeVigentes}%` }}
            />
          </div>
        </div>


        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">En Trámite</span>
            <span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 font-bold">⏳</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-800 dark:text-white">{new Intl.NumberFormat('es-PE').format(enTramite)}</p>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">Pendientes</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">En revisión o firma</p>
        </div>


        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-500 dark:text-rose-400">Vencidos / Anulados</span>
            <span className="grid size-10 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 font-bold">✕</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-800 dark:text-white">{new Intl.NumberFormat('es-PE').format(vencidos)}</p>
            <span className="text-xs font-bold text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full">Expirados</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Requieren renovación</p>
        </div>
      </div>


      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-[#0f172a] overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Icon name="search" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por N° Código, placa vehicular, titular o empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-10 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-emerald-400"
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
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-700 outline-none transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="TODOS">Todos los tipos</option>
              <option value="TARJETA_OPERATIVIDAD">Tarjeta de Operatividad (TUC)</option>
              <option value="SOAT">SOAT Vehicular</option>
              <option value="CITV">CITV</option>
              <option value="TARJETA_PROPIEDAD">Tarjeta de Propiedad</option>
            </select>

            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-700 outline-none transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="VIGENTE">Vigentes</option>
              <option value="EN_TRAMITE">En Trámite</option>
              <option value="VENCIDO">Vencidos</option>
            </select>

            {(filterTipo !== 'TODOS' || filterEstado !== 'TODOS' || searchTerm !== '') && (
              <button
                type="button"
                onClick={() => {
                  setFilterTipo('TODOS')
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
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-extrabold text-white shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-emerald-600/30 active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <span className="text-base leading-none font-black">+</span>
              <span>Emitir Documento</span>
            </button>
          </div>
        </div>


        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-2 text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-400">
          <span>
            Mostrando <strong className="text-slate-800 dark:text-white">{filteredDocs.length}</strong> de{' '}
            <strong className="text-slate-800 dark:text-white">{documentos.length}</strong> documentos registrados
          </span>
          <span className="hidden sm:inline text-[11px] text-slate-400">
            Registro Oficial MDJLO · {new Date().getFullYear()}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
              <tr>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Documento / Código</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Placa Vehicular</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Titular / Empresa</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Emisión</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Vencimiento</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Estado</th>
                <th className="sticky right-0 z-20 bg-slate-50/95 dark:bg-slate-900/95 px-4 py-3.5 text-right whitespace-nowrap border-l border-slate-200/60 dark:border-slate-800 shadow-[-4px_0_8px_rgba(0,0,0,0.03)] dark:shadow-[-4px_0_8px_rgba(0,0,0,0.2)]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading && documentos.length === 0 ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-3.5 py-4"><div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-3.5 py-4"><div className="h-6 w-20 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-3.5 py-4"><div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-3.5 py-4"><div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-3.5 py-4"><div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-3.5 py-4"><div className="h-5 w-16 rounded-full bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="sticky right-0 z-10 bg-white dark:bg-[#0f172a] px-4 py-4 text-right border-l border-slate-100 dark:border-slate-800"><div className="h-7 w-20 ml-auto rounded-lg bg-slate-200 dark:bg-slate-800" /></td>
                  </tr>
                ))
              ) : filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-slate-400">
                    <div className="mx-auto max-w-xs space-y-2">
                      <Icon name="document" className="size-10" />
                      <p className="font-bold text-slate-600 dark:text-slate-300">
                        No se encontraron documentos
                      </p>
                      <p className="text-xs text-slate-400">
                        Modifica los parámetros de búsqueda o los filtros aplicados.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedDocs.map((d) => (
                  <tr key={d.id} className="group transition-colors hover:bg-emerald-50/30 dark:hover:bg-slate-800/40">
                    <td className="px-3.5 py-3.5 whitespace-nowrap">
                      <div className="space-y-1">
                        <p className="font-mono font-extrabold text-slate-800 dark:text-white">{d.codigo}</p>
                        {getDocTypeBadge(d.tipoDocumento)}
                      </div>
                    </td>


                    <td className="px-3.5 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center justify-center rounded-lg border-2 border-slate-900 bg-amber-300 px-3 py-1 font-mono text-xs font-black tracking-widest text-slate-950 shadow-xs dark:border-slate-800 dark:bg-amber-400 dark:text-slate-950">
                        {d.vehiculoPlaca}
                      </span>
                    </td>

                    <td className="px-3.5 py-3.5 max-w-[160px]">
                      <p className="font-bold text-slate-800 dark:text-slate-100 truncate text-xs" title={d.propietario}>{d.propietario}</p>
                      <p className="text-xs text-slate-400 truncate max-w-[140px]" title={d.asociacion}>{d.asociacion}</p>
                    </td>
                    <td className="px-3.5 py-3.5 whitespace-nowrap">
                      <p className="font-mono font-semibold text-slate-700 dark:text-slate-300">{d.fechaExpedicion}</p>
                    </td>
                    <td className="px-3.5 py-3.5 whitespace-nowrap">
                      <p className="font-mono font-bold text-slate-800 dark:text-slate-200">{d.fechaExpiracion}</p>
                    </td>
                    <td className="px-3.5 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold ${d.estado === 'VIGENTE'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : d.estado === 'EN_TRAMITE'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                      >
                        <span className="size-1.5 rounded-full bg-current" />
                        {d.estado}
                      </span>
                    </td>
                    <td className="sticky right-0 z-10 bg-white group-hover:bg-emerald-50/40 dark:bg-[#0f172a] dark:group-hover:bg-slate-800/60 px-4 py-3.5 text-right whitespace-nowrap border-l border-slate-100 dark:border-slate-800/80 shadow-[-4px_0_8px_rgba(0,0,0,0.03)] dark:shadow-[-4px_0_8px_rgba(0,0,0,0.2)]">
                      <div className="flex items-center justify-end gap-1.5 pr-1">
                        <button
                          type="button"
                          onClick={() => handleOpenPreview(d)}
                          title="Imprimir / Ver TUC Digital"
                          className="rounded-xl p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white dark:bg-emerald-950/60 dark:text-emerald-400 dark:hover:bg-emerald-500 dark:hover:text-white transition-all duration-200 shadow-2xs hover:shadow-md active:scale-95 cursor-pointer"
                        >
                          <Icon name="print" className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(d)}
                          title="Editar / Renovar Documento"
                          className="rounded-xl p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white dark:bg-amber-950/60 dark:text-amber-400 dark:hover:bg-amber-500 dark:hover:text-white transition-all duration-200 shadow-2xs hover:shadow-md active:scale-95 cursor-pointer"
                        >
                          <Icon name="pencil" className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(d.id)}
                          title="Anular Documento"
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
          totalItems={filteredDocs.length}
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
          <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-blue-900/20 bg-[#123b6d] px-6 py-4.5 text-white dark:border-slate-800 dark:bg-[#102a4d]">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-white/10 text-cyan-300">
                  <Icon name="document" className="size-5" />
                </span>
                <div>
                  <h3 className="text-lg font-extrabold text-white">
                    {isEditing ? 'Editar Documento Municipal' : 'Emitir Nuevo Documento'}
                  </h3>
                  <p className="text-xs text-blue-100/80">Gestión de TUC, SOAT y habilitaciones</p>
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

            <form onSubmit={handleFormSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-3 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-600" />
                  Información del Documento
                </h4>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-emerald-600 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-4 focus-within:ring-emerald-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-emerald-400">
                    <select
                      id="doc_veh"
                      value={formData.vehiculoPlaca}
                      onChange={(e) => {
                        const veh = vehiculos.find((v) => v.placa === e.target.value)
                        setFormData({
                          ...formData,
                          vehiculoPlaca: e.target.value,
                          propietario: veh ? veh.propietario : formData.propietario,
                          asociacion: veh ? veh.organizacion : formData.asociacion,
                        })
                      }}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-bold text-slate-800 outline-none dark:text-white"
                    >
                      {vehiculos.map((v) => (
                        <option key={v.id} value={v.placa}>
                          {v.placa} ({v.marca} {v.modelo})
                        </option>
                      ))}
                    </select>
                    <label
                      htmlFor="doc_veh"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400"
                    >
                      Placa Vehicular Asignada
                    </label>
                  </div>

                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-emerald-600 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-4 focus-within:ring-emerald-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-emerald-400">
                    <select
                      id="doc_tipo"
                      value={formData.tipoDocumento}
                      onChange={(e) => setFormData({ ...formData, tipoDocumento: e.target.value })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-bold text-slate-800 outline-none dark:text-white"
                    >
                      <option value="TARJETA_OPERATIVIDAD">Tarjeta de Operatividad (TUC)</option>
                      <option value="SOAT">SOAT Vehicular</option>
                      <option value="CITV">CITV</option>
                      <option value="TARJETA_PROPIEDAD">Tarjeta de Propiedad</option>
                    </select>
                    <label
                      htmlFor="doc_tipo"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400"
                    >
                      Tipo de Documento
                    </label>
                  </div>

                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-emerald-600 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-4 focus-within:ring-emerald-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-emerald-400">
                    <input
                      id="doc_codigo"
                      type="text"
                      required
                      placeholder=" "
                      value={formData.codigo}
                      onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-mono font-bold text-slate-800 outline-none dark:text-white"
                    />
                    <label
                      htmlFor="doc_codigo"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-emerald-600 dark:peer-focus:text-emerald-400"
                    >
                      Código / Correlativo Documento
                    </label>
                  </div>

                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-emerald-600 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-4 focus-within:ring-emerald-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-emerald-400">
                    <input
                      id="doc_expedicion"
                      type="date"
                      value={formData.fechaExpedicion}
                      onChange={(e) => setFormData({ ...formData, fechaExpedicion: e.target.value })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-semibold text-slate-800 outline-none dark:text-white"
                    />
                    <label
                      htmlFor="doc_expedicion"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400"
                    >
                      Fecha de Expedición
                    </label>
                  </div>

                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-emerald-600 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-4 focus-within:ring-emerald-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-emerald-400">
                    <input
                      id="doc_expiracion"
                      type="date"
                      value={formData.fechaExpiracion}
                      onChange={(e) => setFormData({ ...formData, fechaExpiracion: e.target.value })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-semibold text-slate-800 outline-none dark:text-white"
                    />
                    <label
                      htmlFor="doc_expiracion"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400"
                    >
                      Fecha de Vencimiento
                    </label>
                  </div>

                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-emerald-600 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-4 focus-within:ring-emerald-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-emerald-400">
                    <select
                      id="doc_estado"
                      value={formData.estado}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-bold text-slate-800 outline-none dark:text-white"
                    >
                      <option value="VIGENTE">VIGENTE</option>
                      <option value="EN_TRAMITE">EN TRÁMITE</option>
                      <option value="VENCIDO">VENCIDO</option>
                    </select>
                    <label
                      htmlFor="doc_estado"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400"
                    >
                      Estado del Documento
                    </label>
                  </div>
                </div>
              </div>


              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-2.5 text-xs font-black text-white hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-600/25 transition-all cursor-pointer"
                >
                  {isEditing ? 'Guardar Cambios' : 'Emitir Documento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {isPreviewModalOpen && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-enter">
          <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
            <div className="border-b border-slate-100 bg-[#071a2f] p-6 text-white text-center relative">
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(false)}
                className="absolute right-4 top-4 rounded-full p-1 text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer"
              >
                ✕
              </button>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">
                MUNICIPALIDAD DISTRITAL JOSÉ LEONARDO ORTIZ
              </p>
              <h3 className="text-xl font-black mt-1">TARJETA ÚNICA DE CIRCULACIÓN (TUC)</h3>
              <p className="text-xs font-mono font-bold text-cyan-300 mt-0.5">{selectedDoc.codigo}</p>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="rounded-2xl border border-slate-200 bg-emerald-50/50 p-5 dark:border-slate-800 dark:bg-slate-900/60 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2 dark:border-slate-800">
                  <span className="font-bold text-slate-500">Placa Autorizada</span>
                  <span className="inline-flex items-center justify-center rounded-lg border-2 border-slate-900 bg-amber-300 px-3 py-1 font-mono text-sm font-black text-slate-950 shadow-xs">
                    {selectedDoc.vehiculoPlaca}
                  </span>
                </div>

                <div className="flex justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
                  <span className="font-bold text-slate-500">Titular / Propietario</span>
                  <span className="font-bold text-slate-800 dark:text-white">{selectedDoc.propietario}</span>
                </div>

                <div className="flex justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
                  <span className="font-bold text-slate-500">Empresa / Asociación</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedDoc.asociacion}</span>
                </div>

                <div className="flex justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
                  <span className="font-bold text-slate-500">Fecha de Expedición</span>
                  <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{selectedDoc.fechaExpedicion}</span>
                </div>

                <div className="flex justify-between">
                  <span className="font-bold text-slate-500">Vencimiento Habilitación</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{selectedDoc.fechaExpiracion}</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-black text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  <Icon name="print" className="size-4" />
                  <span>Imprimir TUC Digital</span>
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
