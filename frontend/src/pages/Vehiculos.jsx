import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Icon } from '../components/ui/Icon'
import { useQuickCreate } from '../hooks/useQuickCreate'
import { Pagination } from '../components/ui/Pagination'
import { apiFetch, getCachedData, setCachedData } from '../config/api'

export function Vehiculos() {
  const cachedVeh = getCachedData('/vehiculos')
  const cachedOrg = getCachedData('/organizaciones')
  const [vehiculos, setVehiculos] = useState(cachedVeh || [])
  const [organizaciones, setOrganizaciones] = useState(cachedOrg || [])
  const [isLoading, setIsLoading] = useState(!cachedVeh)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTipo, setFilterTipo] = useState('TODOS')
  const [filterEstado, setFilterEstado] = useState('TODOS')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(8)


  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedVehiculo, setSelectedVehiculo] = useState(null)
  const [isEditing, setIsEditing] = useState(false)

  const [formData, setFormData] = useState({
    placa: '',
    tipo: 'Mototaxi (Trimovil)',
    marca: '',
    modelo: '',
    color: '',
    anio: new Date().getFullYear(),
    numeroSerie: '',
    serieMotor: '',
    partidaRegistral: '',
    organizacion: '',
    propietario: '',
    propietarioDni: '',
    estado: 'FORMALIZADO',
    soatEstado: 'VIGENTE',
    tucNumero: 'TUC-2026-000',
  })

  useEffect(() => {
    Promise.all([
      apiFetch('/vehiculos').then((response) => response.ok ? response.json() : Promise.reject(response)),
      apiFetch('/organizaciones').then((response) => response.ok ? response.json() : Promise.reject(response))
    ]).then(([vehPayload, orgPayload]) => {
      const vData = vehPayload.data ?? []
      const oData = orgPayload.data ?? []
      setVehiculos(vData)
      setOrganizaciones(oData)
      setCachedData('/vehiculos', vData)
      setCachedData('/organizaciones', oData)
    }).catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const totalVehiculos = vehiculos.length
  const formalizados = vehiculos.filter((v) => v.estado === 'FORMALIZADO').length
  const pendientes = vehiculos.filter((v) => v.estado === 'PENDIENTE').length
  const suspendidos = vehiculos.filter((v) => v.estado === 'SUSPENDIDO' || v.estado === 'BAJA').length

  const porcentajeFormalizados = totalVehiculos > 0 ? Math.round((formalizados / totalVehiculos) * 100) : 0

  const filteredVehiculos = vehiculos.filter((v) => {
    const matchesSearch =
      v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.propietario.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.organizacion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.propietarioDni && v.propietarioDni.includes(searchTerm))

    const matchesTipo = filterTipo === 'TODOS' || v.tipo === filterTipo
    const matchesEstado = filterEstado === 'TODOS' || v.estado === filterEstado

    return matchesSearch && matchesTipo && matchesEstado
  })

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterTipo, filterEstado])

  const paginatedVehiculos = filteredVehiculos.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const getVehiculoDocumento = (vehiculo, tipoDocumento) => (
    vehiculo?.documentosVehiculo?.find((doc) => doc.tipoDocumento === tipoDocumento)
  )

  const formatDocumentoQr = (label, documento) => {
    if (!documento) return `${label}: SIN REGISTRO`

    return `${label}: ${documento.codigo || 'SIN CODIGO'} | Estado: ${documento.estado || 'SIN ESTADO'} | Vence: ${documento.fechaExpiracion || 'SIN FECHA'}`
  }

  const buildVehiculoQrValue = (vehiculo) => {
    const tarjetaPropiedad = getVehiculoDocumento(vehiculo, 'TARJETA_PROPIEDAD')
    const soat = getVehiculoDocumento(vehiculo, 'SOAT')
    const certicav = getVehiculoDocumento(vehiculo, 'CERTICAV')
    const papeletas = vehiculo.historialPapeletas || []
    const papeletasQr = papeletas.length > 0
      ? papeletas.slice(0, 8).map((papeleta, index) => (
        `${index + 1}. ${papeleta.numeroPapeleta || 'SIN NUMERO'} | ${papeleta.estado || 'SIN ESTADO'} | S/ ${Number(papeleta.montoTotal || 0).toFixed(2)} | ${papeleta.fechaHora || 'SIN FECHA'}`
      )).join('\n')
      : 'SIN PAPELETAS REGISTRADAS'

    return [
      'MDJLO - Sistema de Gestion de Transito Municipal',
      `Codigo QR: ${vehiculo.codigoQr || 'SIN CODIGO'}`,
      `Placa del vehiculo: ${vehiculo.placa || 'SIN PLACA'}`,
      `Tipo de vehiculo: ${vehiculo.tipo || 'SIN TIPO'}`,
      `Marca: ${vehiculo.marca || 'SIN MARCA'}`,
      `Modelo: ${vehiculo.modelo || 'SIN MODELO'}`,
      `Color: ${vehiculo.color || 'SIN COLOR'}`,
      `Anio fabricacion: ${vehiculo.anio || 'SIN ANIO'}`,
      `Propietario: ${vehiculo.propietario || 'SIN PROPIETARIO'}`,
      `DNI propietario: ${vehiculo.propietarioTipoDocumento === 'DNI' ? vehiculo.propietarioDni || 'SIN DNI' : 'NO APLICA'}`,
      `RUC organizacion: ${vehiculo.organizacionRuc || 'SIN RUC'}`,
      `Organizacion vehiculo: ${vehiculo.organizacion || 'INDEPENDIENTE'}`,
      formatDocumentoQr('Tarjeta de propiedad numero', tarjetaPropiedad),
      formatDocumentoQr('SOAT', soat),
      formatDocumentoQr('CERTICAV', certicav),
      'Historial de papeletas del vehiculo:',
      papeletasQr,
    ].join('\n')
  }

  const handleOpenCreateModal = () => {
    setFormData({
      placa: '',
      tipo: 'Mototaxi (Trimovil)',
      marca: '',
      modelo: '',
      color: '',
      anio: new Date().getFullYear(),
      numeroSerie: '',
      serieMotor: '',
      partidaRegistral: '',
      organizacion: organizaciones[0]?.razonSocial || '',
      propietario: '',
      propietarioDni: '',
      estado: 'FORMALIZADO',
      soatEstado: 'VIGENTE',
      tucNumero: `TUC-2026-${Math.floor(100 + Math.random() * 900)}`,
    })
    setIsEditing(false)
    setIsModalOpen(true)
  }

  useQuickCreate(handleOpenCreateModal, !isLoading)

  const handleOpenEditModal = (vehiculo) => {
    setSelectedVehiculo(vehiculo)
    setFormData({ ...vehiculo })
    setIsEditing(true)
    setIsModalOpen(true)
  }

  const handleOpenDetail = (vehiculo) => {
    setSelectedVehiculo(vehiculo)
    setIsDetailModalOpen(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('¿Está seguro de eliminar este vehículo del registro municipal?')) {
      try {
        await apiFetch(`/vehiculos/${id}`, { method: 'DELETE' })
        setVehiculos(vehiculos.filter((v) => v.id !== id))
      } catch (err) {
        alert('No se pudo eliminar el vehículo.')
      }
    }
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    if (!formData.placa.trim() || !formData.propietario.trim()) {
      alert('Por favor completa los campos requeridos.')
      return
    }

    try {
      if (isEditing) {
        await apiFetch(`/vehiculos/${selectedVehiculo.id}`, {
          method: 'PUT',
          body: formData,
        })
        setVehiculos(vehiculos.map((v) => (v.id === selectedVehiculo.id ? { ...v, ...formData, id: v.id } : v)))
      } else {
        const res = await apiFetch('/vehiculos', {
          method: 'POST',
          body: formData,
        })
        const resData = await res.json()
        if (!res.ok || !resData.data?.id) throw new Error('No se pudo registrar el vehículo.')
        const newVehiculo = resData.data
        setVehiculos([newVehiculo, ...vehiculos])
      }
      setIsModalOpen(false)
    } catch (err) {
      alert('Error al guardar el vehículo en el servidor.')
    }
  }

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30">
            <Icon name="vehicle" className="size-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                Padrón Oficial de Vehículos
              </h1>
            </div>
            <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              Registro municipal, control de trimóviles, empresas autorizadas y fiscalización vial.
            </p>
          </div>
        </div>
      </div>

      
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Unidades</span>
            <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Icon name="vehicle" className="size-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-800 dark:text-white">{new Intl.NumberFormat('es-PE').format(totalVehiculos)}</p>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full">Padrón 2026</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Vehículos en la base municipal</p>
        </div>

        
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Formalizados</span>
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 font-bold">✓</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-800 dark:text-white">{new Intl.NumberFormat('es-PE').format(formalizados)}</p>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">{porcentajeFormalizados}% Aptos</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${porcentajeFormalizados}%` }} />
          </div>
        </div>

        
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">En Trámite</span>
            <span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 font-bold">⏳</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-800 dark:text-white">{new Intl.NumberFormat('es-PE').format(pendientes)}</p>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">Pendientes</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">En revisión documental</p>
        </div>

        
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-500 dark:text-rose-400">Observados / Baja</span>
            <span className="grid size-10 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 font-bold">✕</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-800 dark:text-white">{new Intl.NumberFormat('es-PE').format(suspendidos)}</p>
            <span className="text-xs font-bold text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full">Inhabilitados</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Restringidos para circular</p>
        </div>
      </div>

      
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-[#0f172a] overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          
          <div className="relative flex-1">
            <Icon name="search" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por placa, marca, modelo, DNI o propietario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-10 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-blue-400"
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
              <option value="Mototaxi (Trimovil)">Mototaxi (Trimovil)</option>
              <option value="Colectivo (Auto)">Colectivo (Auto)</option>
              <option value="Combi / Minivan">Combi / Minivan</option>
            </select>

            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-700 outline-none transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="FORMALIZADO">Formalizados</option>
              <option value="PENDIENTE">Pendientes</option>
              <option value="SUSPENDIDO">Suspendidos</option>
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
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-extrabold text-white shadow-md shadow-blue-600/20 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-600/30 active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <span className="text-base leading-none font-black">+</span>
              <span>Nuevo Vehículo</span>
            </button>
          </div>
        </div>

        
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-2 text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-400">
          <span>
            Mostrando <strong className="text-slate-800 dark:text-white">{filteredVehiculos.length}</strong> de{' '}
            <strong className="text-slate-800 dark:text-white">{vehiculos.length}</strong> vehículos registrados
          </span>
          <span className="hidden sm:inline text-[11px] text-slate-400">
            JLO Tránsito Digital · {new Date().getFullYear()}
          </span>
        </div>

        
        <div className="overflow-x-auto overscroll-x-contain" role="region" aria-label="Listado de vehículos" tabIndex={0}>
          <table className="w-full min-w-[1160px] table-fixed text-left text-sm">
            <colgroup>
              <col className="w-[11%]" />
              <col className="w-[19%]" />
              <col className="w-[16%]" />
              <col className="w-[17%]" />
              <col className="w-[14%]" />
              <col className="w-[13%]" />
              <col className="w-[10%]" />
            </colgroup>
            <thead className="border-b border-slate-100 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
              <tr>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Placa</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Vehículo & Modelo</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Organización / Empresa</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Propietario & Titular</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Serie Chasis / SUNARP</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Estado</th>
                <th className="px-3 py-3.5 text-center whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading && vehiculos.length === 0 ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-3.5 py-4"><div className="h-6 w-20 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-3.5 py-4">
                      <div className="space-y-1.5">
                        <div className="h-3.5 w-32 rounded bg-slate-200 dark:bg-slate-800" />
                        <div className="h-2.5 w-20 rounded bg-slate-100 dark:bg-slate-800/60" />
                      </div>
                    </td>
                    <td className="px-3.5 py-4"><div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-3.5 py-4"><div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-3.5 py-4"><div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-3.5 py-4"><div className="h-5 w-20 rounded-full bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-3 py-4"><div className="mx-auto h-7 w-20 rounded-lg bg-slate-200 dark:bg-slate-800" /></td>
                  </tr>
                ))
              ) : filteredVehiculos.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-slate-400">
                    <div className="mx-auto max-w-xs space-y-2">
                      <Icon name="vehicle" className="size-10" />
                      <p className="font-bold text-slate-600 dark:text-slate-300">
                        No se encontraron vehículos
                      </p>
                      <p className="text-xs text-slate-400">
                        Intenta cambiando los términos de búsqueda o los filtros seleccionados.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedVehiculos.map((v) => (
                  <tr
                    key={v.id}
                    className="group transition-colors hover:bg-blue-50/30 dark:hover:bg-slate-800/40"
                  >
                    
                    <td className="px-3.5 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center justify-center rounded-lg border-2 border-slate-900 bg-amber-300 px-3 py-1 font-mono text-xs font-black tracking-widest text-slate-950 shadow-xs dark:border-slate-800 dark:bg-amber-400 dark:text-slate-950">
                        {v.placa}
                      </span>
                    </td>

                    
                    <td className="px-3.5 py-3.5 max-w-[200px]">
                      <p className="font-extrabold text-slate-800 dark:text-white truncate" title={`${v.marca} ${v.modelo}`}>
                        {v.marca} {v.modelo}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-slate-400">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {v.tipo}
                        </span>
                        <span>·</span>
                        <span>{v.color}</span>
                        <span>({v.anio})</span>
                      </div>
                    </td>

                    
                    <td className="px-3.5 py-3.5 max-w-[160px]">
                      <p className="truncate text-xs font-bold text-slate-700 dark:text-slate-200" title={v.organizacion}>
                        {v.organizacion}
                      </p>
                      <span className="text-[10px] text-slate-400 font-mono">MDJLO-AUTORIZADO</span>
                    </td>

                    
                    <td className="px-3.5 py-3.5 max-w-[160px]">
                      <p className="font-bold text-slate-800 dark:text-slate-100 truncate text-xs" title={v.propietario}>{v.propietario}</p>
                      <p className="text-xs font-mono text-slate-400">
                        DNI/RUC: {v.propietarioDni || v.propietarioRuc || 'N/A'}
                      </p>
                    </td>

                    
                    <td className="px-3.5 py-3.5 whitespace-nowrap">
                      <p className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                        {v.numeroSerie || 'SN-2026-9912'}
                      </p>
                      <p className="text-[11px] font-mono text-slate-400">
                        {v.partidaRegistral || 'PR-11029841'}
                      </p>
                    </td>

                    
                    <td className="px-3.5 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold ${
                          v.estado === 'FORMALIZADO'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                            : v.estado === 'PENDIENTE'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300'
                        }`}
                      >
                        <span className="size-2 rounded-full bg-current animate-pulse" />
                        {v.estado}
                      </span>
                    </td>

                    
                    <td className="px-3 py-3.5 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(v)}
                          title="Ver Ficha Técnica"
                          className="rounded-xl p-1.5 bg-sky-50 text-sky-600 hover:bg-sky-500 hover:text-white dark:bg-sky-950/60 dark:text-sky-400 dark:hover:bg-sky-500 dark:hover:text-white transition-all duration-200 shadow-2xs hover:shadow-md active:scale-95 cursor-pointer"
                        >
                          <Icon name="eye" className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(v)}
                          title="Editar Vehículo"
                          className="rounded-xl p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white dark:bg-amber-950/60 dark:text-amber-400 dark:hover:bg-amber-500 dark:hover:text-white transition-all duration-200 shadow-2xs hover:shadow-md active:scale-95 cursor-pointer"
                        >
                          <Icon name="pencil" className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(v.id)}
                          title="Eliminar Vehículo"
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
          totalItems={filteredVehiculos.length}
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
                  <Icon name="vehicle" className="size-5" />
                </span>
                <div>
                  <h3 className="text-lg font-extrabold text-white">
                    {isEditing ? 'Editar Registro de Vehículo' : 'Registrar Nuevo Vehículo'}
                  </h3>
                  <p className="text-xs text-blue-100/80">Gestión de datos técnicos y propietario</p>
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
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-blue-600" />
                  Identificación de la Unidad
                </h4>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-blue-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-blue-400">
                    <input
                      id="veh_placa"
                      type="text"
                      required
                      placeholder=" "
                      value={formData.placa}
                      onChange={(e) => setFormData({ ...formData, placa: e.target.value.toUpperCase() })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-black uppercase text-slate-800 outline-none dark:text-white"
                    />
                    <label
                      htmlFor="veh_placa"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-blue-600 dark:peer-focus:text-blue-400"
                    >
                      Placa de Rodaje
                    </label>
                  </div>

                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-blue-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-blue-400">
                    <select
                      id="veh_tipo"
                      value={formData.tipo}
                      onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-semibold text-slate-800 outline-none dark:text-white"
                    >
                      <option value="Mototaxi (Trimovil)">Mototaxi (Trimovil)</option>
                      <option value="Colectivo (Auto)">Colectivo (Auto)</option>
                      <option value="Combi / Minivan">Combi / Minivan</option>
                    </select>
                    <label
                      htmlFor="veh_tipo"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400"
                    >
                      Tipo de Vehículo
                    </label>
                  </div>

                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-blue-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-blue-400">
                    <input
                      id="veh_marca"
                      type="text"
                      placeholder=" "
                      value={formData.marca}
                      onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-semibold text-slate-800 outline-none dark:text-white"
                    />
                    <label
                      htmlFor="veh_marca"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-blue-600 dark:peer-focus:text-blue-400"
                    >
                      Marca
                    </label>
                  </div>

                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-blue-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-blue-400">
                    <input
                      id="veh_modelo"
                      type="text"
                      placeholder=" "
                      value={formData.modelo}
                      onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-semibold text-slate-800 outline-none dark:text-white"
                    />
                    <label
                      htmlFor="veh_modelo"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-blue-600 dark:peer-focus:text-blue-400"
                    >
                      Modelo
                    </label>
                  </div>

                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-blue-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-blue-400">
                    <input
                      id="veh_color"
                      type="text"
                      placeholder=" "
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-semibold text-slate-800 outline-none dark:text-white"
                    />
                    <label
                      htmlFor="veh_color"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-blue-600 dark:peer-focus:text-blue-400"
                    >
                      Color
                    </label>
                  </div>

                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-blue-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-blue-400">
                    <input
                      id="veh_anio"
                      type="number"
                      placeholder=" "
                      value={formData.anio}
                      onChange={(e) => setFormData({ ...formData, anio: e.target.value })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-semibold text-slate-800 outline-none dark:text-white"
                    />
                    <label
                      htmlFor="veh_anio"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-blue-600 dark:peer-focus:text-blue-400"
                    >
                      Año de Fabricación
                    </label>
                  </div>
                </div>
              </div>

              
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-cyan-500" />
                  Datos Técnicos & SUNARP
                </h4>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-blue-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-blue-400">
                    <input
                      id="veh_serie"
                      type="text"
                      placeholder=" "
                      value={formData.numeroSerie}
                      onChange={(e) => setFormData({ ...formData, numeroSerie: e.target.value.toUpperCase() })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-mono text-slate-800 outline-none dark:text-white"
                    />
                    <label
                      htmlFor="veh_serie"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-blue-600 dark:peer-focus:text-blue-400"
                    >
                      Número de Serie (VIN)
                    </label>
                  </div>

                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-blue-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-blue-400">
                    <input
                      id="veh_motor"
                      type="text"
                      placeholder=" "
                      value={formData.serieMotor}
                      onChange={(e) => setFormData({ ...formData, serieMotor: e.target.value.toUpperCase() })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-mono text-slate-800 outline-none dark:text-white"
                    />
                    <label
                      htmlFor="veh_motor"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-blue-600 dark:peer-focus:text-blue-400"
                    >
                      Serie del Motor
                    </label>
                  </div>

                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-blue-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-blue-400">
                    <input
                      id="veh_partida"
                      type="text"
                      placeholder=" "
                      value={formData.partidaRegistral}
                      onChange={(e) => setFormData({ ...formData, partidaRegistral: e.target.value })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-mono text-slate-800 outline-none dark:text-white"
                    />
                    <label
                      htmlFor="veh_partida"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-blue-600 dark:peer-focus:text-blue-400"
                    >
                      Partida Registral SUNARP
                    </label>
                  </div>
                </div>
              </div>

              
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  Titular & Empresa Autorizada
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-blue-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-blue-400">
                    <input
                      id="veh_propietario"
                      type="text"
                      required
                      placeholder=" "
                      value={formData.propietario}
                      onChange={(e) => setFormData({ ...formData, propietario: e.target.value })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-bold text-slate-800 outline-none dark:text-white"
                    />
                    <label
                      htmlFor="veh_propietario"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-blue-600 dark:peer-focus:text-blue-400"
                    >
                      Nombre Completo del Propietario
                    </label>
                  </div>

                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-blue-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-blue-400">
                    <input
                      id="veh_dni"
                      type="text"
                      placeholder=" "
                      value={formData.propietarioDni}
                      onChange={(e) => setFormData({ ...formData, propietarioDni: e.target.value })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-mono text-slate-800 outline-none dark:text-white"
                    />
                    <label
                      htmlFor="veh_dni"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-blue-600 dark:peer-focus:text-blue-400"
                    >
                      DNI / RUC del Propietario
                    </label>
                  </div>

                  <div className="relative sm:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-blue-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-blue-400">
                    <select
                      id="veh_org"
                      value={formData.organizacion}
                      onChange={(e) => setFormData({ ...formData, organizacion: e.target.value })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-semibold text-slate-800 outline-none dark:text-white"
                    >
                      {organizaciones.map((org) => (
                        <option key={org.id} value={org.razonSocial}>
                          {org.razonSocial} ({org.siglas})
                        </option>
                      ))}
                      <option value="Independiente / Particular">Independiente / Particular</option>
                    </select>
                    <label
                      htmlFor="veh_org"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400"
                    >
                      Empresa u Organización de Transportes
                    </label>
                  </div>
                </div>
              </div>

              
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-amber-500" />
                  Estado de Operatividad Municipal
                </h4>
                <div className="grid gap-4 sm:grid-cols-1">
                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-blue-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-blue-400">
                    <select
                      id="veh_estado"
                      value={formData.estado}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-bold text-slate-800 outline-none dark:text-white"
                    >
                      <option value="FORMALIZADO">FORMALIZADO</option>
                      <option value="PENDIENTE">PENDIENTE</option>
                      <option value="SUSPENDIDO">SUSPENDIDO</option>
                      <option value="BAJA">BAJA</option>
                    </select>
                    <label
                      htmlFor="veh_estado"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400"
                    >
                      Estado Municipal del Vehículo
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
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-2.5 text-xs font-black text-white hover:from-blue-700 hover:to-cyan-700 shadow-md shadow-blue-600/25 transition-all cursor-pointer"
                >
                  {isEditing ? 'Guardar Cambios' : 'Registrar Vehículo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      
      {isDetailModalOpen && selectedVehiculo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-xs animate-enter sm:p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#0f172a]">
            
            <div className="relative overflow-hidden border-b border-slate-800 bg-[#071a2f] px-5 py-4 text-white">
              <div className="absolute right-0 top-0 translate-x-6 -translate-y-6 size-44 rounded-full bg-cyan-500/10 blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between relative z-10">
                <div>
                  <span className="inline-flex rounded-md border border-cyan-500/30 bg-cyan-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-cyan-200">
                    Ficha vehicular municipal
                  </span>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <h3 className="text-2xl font-black tracking-tight sm:text-3xl">{selectedVehiculo.placa}</h3>
                    <span
                      className={`rounded-md px-2.5 py-1 text-xs font-black ${
                        selectedVehiculo.estado === 'FORMALIZADO'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {selectedVehiculo.estado}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="rounded-lg p-2 text-slate-300 transition-all hover:bg-white/10 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            
            <div className="max-h-[calc(92vh-84px)] space-y-4 overflow-y-auto p-5">
              
              <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
                <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <QRCodeSVG
                    value={buildVehiculoQrValue(selectedVehiculo)}
                    size={180}
                    level="Q"
                    marginSize={4}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    title={`Código QR del vehículo ${selectedVehiculo.placa}`}
                  />
                  <span className="mt-2 font-mono text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    Escanea para identificar el vehículo
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <span className="inline-flex rounded-md bg-blue-100 px-2.5 py-1 text-xs font-extrabold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        {selectedVehiculo.tipo}
                      </span>
                      <h4 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                        {selectedVehiculo.marca} {selectedVehiculo.modelo}
                      </h4>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-right dark:border-slate-800 dark:bg-slate-950">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Código QR</p>
                      <p className="font-mono text-xs font-black text-slate-700 dark:text-slate-200">{selectedVehiculo.codigoQr || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Placa</p>
                      <p className="font-mono text-lg font-black text-slate-900 dark:text-white">{selectedVehiculo.placa}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Color</p>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-100">{selectedVehiculo.color || 'N/A'}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Año fabricación</p>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-100">{selectedVehiculo.anio || 'N/A'}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Estado</p>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-100">{selectedVehiculo.estado || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              
              <div className="grid gap-3 text-xs lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                  <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Propietario Registrado</p>
                  <p className="mt-1 text-sm font-extrabold text-slate-800 dark:text-white">{selectedVehiculo.propietario}</p>
                  <p className="text-slate-500 font-mono">DNI: {selectedVehiculo.propietarioTipoDocumento === 'DNI' ? selectedVehiculo.propietarioDni || 'N/A' : 'N/A'}</p>
                  <p className="text-slate-500 font-mono">RUC: {selectedVehiculo.organizacionRuc || 'N/A'}</p>
                  <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Organización del vehículo</p>
                    <p className="mt-1 font-bold text-slate-800 dark:text-cyan-300">{selectedVehiculo.organizacion || 'Independiente'}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                  <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Documentos del Vehículo</p>
                  {[
                    ['Tarjeta de propiedad', getVehiculoDocumento(selectedVehiculo, 'TARJETA_PROPIEDAD')],
                    ['SOAT', getVehiculoDocumento(selectedVehiculo, 'SOAT')],
                    ['CERTICAV', getVehiculoDocumento(selectedVehiculo, 'CERTICAV')],
                  ].map(([label, documento]) => (
                    <div key={label} className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900">
                      <span className="font-bold text-slate-600 dark:text-slate-300">{label}</span>
                      <span className="text-right font-mono font-black text-slate-800 dark:text-white">
                        {documento?.codigo || 'N/A'}
                        <span className="ml-2 text-[10px] font-bold text-slate-400">{documento?.estado || 'SIN_REGISTRO'}</span>
                      </span>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                  <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Número de Serie (Chasis)</p>
                  <p className="mt-1 font-mono font-bold text-slate-700 dark:text-slate-200">{selectedVehiculo.numeroSerie || 'N/A'}</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                  <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Partida Registral SUNARP</p>
                  <p className="mt-1 font-mono font-bold text-slate-700 dark:text-slate-200">{selectedVehiculo.partidaRegistral || 'N/A'}</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 lg:col-span-2">
                  <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Historial de papeletas del vehículo</p>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-extrabold text-slate-800 dark:text-white">
                      {(selectedVehiculo.historialPapeletas || []).length} papeleta(s) registrada(s)
                    </p>
                    <p className="font-semibold text-slate-500">
                      Última: {selectedVehiculo.historialPapeletas?.[0]?.numeroPapeleta || 'Sin historial'} {selectedVehiculo.historialPapeletas?.[0]?.estado ? `· ${selectedVehiculo.historialPapeletas?.[0]?.estado}` : ''}
                    </p>
                  </div>
                </div>
              </div>

              
              <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="rounded-lg bg-slate-900 px-6 py-2.5 text-xs font-extrabold text-white transition-all hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 cursor-pointer"
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
