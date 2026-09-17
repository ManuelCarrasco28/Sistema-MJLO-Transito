import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Icon } from '../components/ui/Icon'
import { PageLoadError } from '../components/ui/PageLoadError'
import { useQuickCreate } from '../hooks/useQuickCreate'
import { Pagination } from '../components/ui/Pagination'
import { apiFetch, getCachedData, setCachedData } from '../config/api'

export function Vehiculos() {
  const cachedVeh = getCachedData('/vehiculos')
  const cachedOrg = getCachedData('/asociaciones')
  const cachedPersonas = getCachedData('/personas')
  const [vehiculos, setVehiculos] = useState(cachedVeh || [])
  const [asociaciones, setAsociaciones] = useState(cachedOrg || [])
  const [personas, setPersonas] = useState(cachedPersonas || [])
  const [isLoading, setIsLoading] = useState(!cachedVeh)
  const [searchTerm, setSearchTerm] = useState('')
  const [propietarioSearch, setPropietarioSearch] = useState('')
  const [showPropietarioResults, setShowPropietarioResults] = useState(false)
  const [asociacionSearch, setAsociacionSearch] = useState('')
  const [showAsociacionResults, setShowAsociacionResults] = useState(false)
  const [filterTipo, setFilterTipo] = useState('TODOS')
  const [filterEstado, setFilterEstado] = useState('TODOS')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(8)
  const [loadError, setLoadError] = useState('')


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
    categoria: '',
    carroceria: '',
    sedeRegistro: '',
    tipoCarroceria: '',
    numeroSerie: '',
    serieMotor: '',
    partidaRegistral: '',
    asociacion: '',
    propietario: '',
    propietarioDni: '',
    estado: 'FORMALIZADO',
    soatEstado: 'VIGENTE',
    tucNumero: 'TUC-2026-000',
  })

  useEffect(() => {
    setLoadError('')
    Promise.all([
      apiFetch('/vehiculos').then((response) => response.ok ? response.json() : Promise.reject(response)),
      apiFetch('/asociaciones').then((response) => response.ok ? response.json() : Promise.reject(response)),
      apiFetch('/personas').then((response) => response.ok ? response.json() : Promise.reject(response))
    ]).then(([vehPayload, orgPayload, personasPayload]) => {
      const vData = vehPayload.data ?? []
      const oData = orgPayload.data ?? []
      const pData = personasPayload.data ?? []
      setVehiculos(vData)
      setAsociaciones(oData)
      setPersonas(pData)
      setCachedData('/vehiculos', vData)
      setCachedData('/asociaciones', oData)
      setCachedData('/personas', pData)
    }).catch(() => {
      setLoadError('No se pudo cargar el padrón vehicular.')
    })
      .finally(() => setIsLoading(false))
  }, [])

  const getPersonaNombre = (persona) => (
    persona.nombreCompleto ||
    `${persona.nombres || ''} ${persona.apellidoPaterno || persona.apellido_paterno || ''} ${persona.apellidoMaterno || persona.apellido_materno || ''}`.trim()
  )

  const propietarioResults = personas
    .filter((persona) => {
      const query = propietarioSearch.trim().toLowerCase()
      if (!query) return true
      const documento = String(persona.numeroDocumento || '').toLowerCase()
      const nombre = getPersonaNombre(persona).toLowerCase()
      return documento.includes(query) || nombre.includes(query)
    })
    .slice(0, 8)

  const selectPropietario = (persona) => {
    const documento = String(persona.numeroDocumento || '')
    const nombre = getPersonaNombre(persona)
    setFormData({
      ...formData,
      propietarioDni: documento,
      propietario: nombre
    })
    setPropietarioSearch(`${documento} — ${nombre}`)
    setShowPropietarioResults(false)
  }

  const asociacionResults = asociaciones
    .filter((org) => {
      const query = asociacionSearch.trim().toLowerCase()
      if (!query) return true
      return `${org.razonSocial || ''} ${org.ruc || ''} ${org.partidaRegistral || ''}`.toLowerCase().includes(query)
    })
    .slice(0, 8)

  const selectAsociacion = (org) => {
    const nombre = org?.razonSocial || ''
    setFormData({
      ...formData,
      asociacion: nombre,
      estado: formData.estado === 'SUSPENDIDO' || formData.estado === 'BAJA' ? formData.estado : (nombre ? 'FORMAL' : 'INFORMAL')
    })
    setAsociacionSearch(nombre)
    setShowAsociacionResults(false)
  }

  const clearAsociacion = () => {
    setFormData({
      ...formData,
      asociacion: '',
      estado: formData.estado === 'SUSPENDIDO' || formData.estado === 'BAJA' ? formData.estado : 'INFORMAL'
    })
    setAsociacionSearch('')
    setShowAsociacionResults(false)
  }

  const isVehiculoFormal = (v) => Boolean(
    v?.asociacionId || 
    (v?.asociacion && v.asociacion !== 'Sin Asociación' && v.asociacion !== 'Independiente' && v.asociacion !== 'Independiente / Particular')
  )

  const totalVehiculos = vehiculos.length
  const formales = vehiculos.filter((v) => isVehiculoFormal(v)).length
  const informales = vehiculos.filter((v) => !isVehiculoFormal(v)).length
  const suspendidos = vehiculos.filter((v) => v.estado === 'SUSPENDIDO' || v.estado === 'BAJA').length

  const porcentajeFormales = totalVehiculos > 0 ? Math.round((formales / totalVehiculos) * 100) : 0

  const filteredVehiculos = vehiculos.filter((v) => {
    const matchesSearch =
      v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.propietario.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.asociacion && v.asociacion.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (v.propietarioDni && v.propietarioDni.includes(searchTerm))

    const matchesTipo = filterTipo === 'TODOS' || v.tipo === filterTipo
    const formal = isVehiculoFormal(v)
    const matchesEstado = 
      filterEstado === 'TODOS' ||
      (filterEstado === 'FORMAL' && formal) ||
      (filterEstado === 'INFORMAL' && !formal) ||
      (filterEstado === 'SUSPENDIDO' && (v.estado === 'SUSPENDIDO' || v.estado === 'BAJA'))

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

  const formatCerticavQr = (certicav) => {
    if (!certicav) return 'CERTICAV / Inspeccion tecnica: SIN REGISTRO'

    return [
      `CERTICAV / Inspeccion tecnica: ${certicav.numeroSerieCerticav || certicav.numeroRegistro || 'SIN NUMERO'}`,
      `Resultado: ${certicav.resultado || 'SIN RESULTADO'}`,
      `Estado: ${certicav.estado || 'SIN ESTADO'}`,
      `Fecha: ${certicav.fecha || 'SIN FECHA'}`,
    ].join(' | ')
  }

  const buildVehiculoQrValue = (vehiculo) => {
    const tarjetaPropiedad = getVehiculoDocumento(vehiculo, 'TARJETA_PROPIEDAD')
    const soat = getVehiculoDocumento(vehiculo, 'SOAT')
    const certicav = vehiculo.certicav
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
      `Categoria: ${vehiculo.categoria || 'SIN CATEGORIA'}`,
      `Carroceria: ${vehiculo.carroceria || 'SIN CARROCERIA'}`,
      `Sede de registro: ${vehiculo.sedeRegistro || 'SIN SEDE'}`,
      `Tipo de carroceria: ${vehiculo.tipoCarroceria || 'SIN TIPO CARROCERIA'}`,
      `Propietario: ${vehiculo.propietario || 'SIN PROPIETARIO'}`,
      `DNI propietario: ${vehiculo.propietarioTipoDocumento === 'DNI' ? vehiculo.propietarioDni || 'SIN DNI' : 'NO APLICA'}`,
      `RUC asociacion: ${vehiculo.asociacionRuc || 'SIN RUC'}`,
      `Asociacion vehiculo: ${vehiculo.asociacion || 'INDEPENDIENTE'}`,
      formatDocumentoQr('Tarjeta de propiedad numero', tarjetaPropiedad),
      formatDocumentoQr('SOAT', soat),
      formatCerticavQr(certicav),
      'Historial de papeletas del vehiculo:',
      papeletasQr,
    ].join('\n')
  }

  const handleOpenCreateModal = () => {
    setPropietarioSearch('')
    setShowPropietarioResults(false)
    setAsociacionSearch('')
    setShowAsociacionResults(false)
    setFormData({
      placa: '',
      tipo: 'Mototaxi (Trimovil)',
      marca: '',
      modelo: '',
      color: '',
      anio: new Date().getFullYear(),
      categoria: '',
      carroceria: '',
      sedeRegistro: '',
      tipoCarroceria: '',
      numeroSerie: '',
      serieMotor: '',
      partidaRegistral: '',
      asociacion: '',
      propietario: '',
      propietarioDni: '',
      estado: 'INFORMAL',
      soatEstado: 'VIGENTE',
      tucNumero: `TUC-2026-${Math.floor(100 + Math.random() * 900)}`,
    })
    setIsEditing(false)
    setIsModalOpen(true)
  }

  useQuickCreate(handleOpenCreateModal, !isLoading)

  const handleOpenEditModal = (vehiculo) => {
    setSelectedVehiculo(vehiculo)
    setPropietarioSearch(vehiculo.propietarioDni ? `${vehiculo.propietarioDni} — ${vehiculo.propietario || ''}` : '')
    setShowPropietarioResults(false)
    setAsociacionSearch(isVehiculoFormal(vehiculo) ? (vehiculo.asociacion || '') : '')
    setShowAsociacionResults(false)
    setFormData({ 
      ...vehiculo,
      asociacion: isVehiculoFormal(vehiculo) ? (vehiculo.asociacion || '') : '',
      propietarioDni: vehiculo.propietarioDni || '',
      propietario: vehiculo.propietario || '',
      estado: vehiculo.estado === 'SUSPENDIDO' || vehiculo.estado === 'BAJA' 
        ? vehiculo.estado 
        : (isVehiculoFormal(vehiculo) ? 'FORMAL' : 'INFORMAL')
    })
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
    // Validaciones
    const placaClean = formData.placa.trim().toUpperCase()
    if (!placaClean || !formData.propietarioDni.trim()) {
      alert('Por favor completa los campos requeridos (Placa y Propietario registrado).')
      return
    }
    if (placaClean.length < 6) {
      alert('La placa debe tener al menos 6 caracteres.')
      return
    }
    const anioActual = new Date().getFullYear()
    if (formData.anio && (formData.anio < 1950 || formData.anio > anioActual + 1)) {
      alert(`El año de fabricación debe ser válido (entre 1950 y ${anioActual + 1}).`)
      return
    }

    try {
      if (isEditing) {
        const res = await apiFetch(`/vehiculos/${selectedVehiculo.id}`, {
          method: 'PUT',
          body: formData,
        })
        const resData = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(resData.messages?.error || resData.message || 'No se pudo actualizar el vehículo.')
        setVehiculos(vehiculos.map((v) => (v.id === selectedVehiculo.id ? { ...v, ...formData, id: v.id } : v)))
      } else {
        const res = await apiFetch('/vehiculos', {
          method: 'POST',
          body: formData,
        })
        const resData = await res.json().catch(() => ({}))
        if (!res.ok || !resData.data?.id) throw new Error(resData.messages?.error || resData.message || 'No se pudo registrar el vehículo.')
        const newVehiculo = resData.data
        setVehiculos([newVehiculo, ...vehiculos])
      }
      setIsModalOpen(false)
    } catch (err) {
      alert(err.message || 'Error al guardar el vehículo en el servidor.')
    }
  }

  return (
    <div className="space-y-6">
      {loadError && <PageLoadError message={loadError} />}

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
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Formales</span>
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 font-bold">✓</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-800 dark:text-white">{new Intl.NumberFormat('es-PE').format(formales)}</p>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">{porcentajeFormales}% En Asociación</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${porcentajeFormales}%` }} />
          </div>
        </div>


        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Informales</span>
            <span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 font-bold">⚠️</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-800 dark:text-white">{new Intl.NumberFormat('es-PE').format(informales)}</p>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">Sin Asociación</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Vehículos independientes no afiliados</p>
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
              <option value="FORMAL">Formales (En Asociación)</option>
              <option value="INFORMAL">Informales (Sin Asociación)</option>
              <option value="SUSPENDIDO">Inhabilitados (Suspendidos/Baja)</option>
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
                <th className="px-3.5 py-3.5 whitespace-nowrap">Asociación / Empresa</th>
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
                      {isVehiculoFormal(v) ? (
                        <>
                          <p className="truncate text-xs font-bold text-slate-700 dark:text-slate-200" title={v.asociacion}>
                            {v.asociacion}
                          </p>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">MDJLO-AUTORIZADO</span>
                        </>
                      ) : (
                        <>
                          <p className="truncate text-xs font-bold text-slate-500 dark:text-slate-400">
                            Sin Asociación
                          </p>
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono font-bold">INFORMAL</span>
                        </>
                      )}
                    </td>


                    <td className="px-3.5 py-3.5 max-w-[160px]">
                      <p className="font-bold text-slate-800 dark:text-slate-100 truncate text-xs" title={v.propietario}>{v.propietario}</p>
                      <p className="text-xs font-mono text-slate-400">
                        DNI/RUC: {v.propietarioDni || v.propietarioRuc || 'N/A'}
                      </p>
                    </td>


                    <td className="px-3.5 py-3.5 whitespace-nowrap">
                      <p className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                        {v.numeroSerie || 'N/A'}
                      </p>
                      <p className="text-[11px] font-mono text-slate-400">
                        {v.partidaRegistral || 'N/A'}
                      </p>
                    </td>


                    <td className="px-3.5 py-3.5 whitespace-nowrap">
                      {v.estado === 'SUSPENDIDO' || v.estado === 'BAJA' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300">
                          <span className="size-2 rounded-full bg-current" />
                          {v.estado}
                        </span>
                      ) : isVehiculoFormal(v) ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                          <span className="size-2 rounded-full bg-current" />
                          FORMAL
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
                          <span className="size-2 rounded-full bg-current animate-pulse" />
                          INFORMAL
                        </span>
                      )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-slate-950/70 backdrop-blur-xs animate-enter sm:p-4">
          <div className="w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800">
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

            <form
              onSubmit={handleFormSubmit}
              onMouseDown={(event) => {
                if (!event.target.closest('[data-combobox="vehiculo"]')) {
                  setShowPropietarioResults(false)
                  setShowAsociacionResults(false)
                }
              }}
              className="no-scrollbar max-h-[calc(96vh-88px)] space-y-5 overflow-y-auto p-5 sm:p-6"
            >

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-blue-600" />
                  Identificación de la Unidad
                </h4>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div data-combobox="vehiculo" className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-blue-600 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-4 focus-within:ring-blue-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-blue-400">
                    <input
                      id="veh_placa"
                      type="text"
                      required
                      maxLength={15}
                      placeholder=" "
                      value={formData.placa}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        if (/[^A-Z0-9-]/.test(val)) return;
                        setFormData({ ...formData, placa: val });
                      }}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-black uppercase text-slate-800 outline-none dark:text-white"
                    />
                    <label
                      htmlFor="veh_placa"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-blue-600 dark:peer-focus:text-blue-400"
                    >
                      Placa de Rodaje
                    </label>
                  </div>

                  <div data-combobox="vehiculo" className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-blue-600 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-4 focus-within:ring-blue-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-blue-400">
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

                  <div data-combobox="vehiculo" className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-blue-600 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-4 focus-within:ring-blue-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-blue-400">
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

                  <div data-combobox="vehiculo" className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-blue-600 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-4 focus-within:ring-blue-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-blue-400">
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

                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-blue-600 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-4 focus-within:ring-blue-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-blue-400">
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

                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-blue-600 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-4 focus-within:ring-blue-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-blue-400">
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

                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-blue-600 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-4 focus-within:ring-blue-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-blue-400">
                    <input
                      id="veh_categoria"
                      type="text"
                      placeholder=" "
                      value={formData.categoria || ''}
                      onChange={(e) => setFormData({ ...formData, categoria: e.target.value.toUpperCase() })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-semibold uppercase text-slate-800 outline-none dark:text-white"
                    />
                    <label
                      htmlFor="veh_categoria"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-blue-600 dark:peer-focus:text-blue-400"
                    >
                      Categoría SUNARP
                    </label>
                  </div>

                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-blue-600 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-4 focus-within:ring-blue-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-blue-400">
                    <input
                      id="veh_carroceria"
                      type="text"
                      placeholder=" "
                      value={formData.carroceria || ''}
                      onChange={(e) => setFormData({ ...formData, carroceria: e.target.value.toUpperCase() })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-semibold uppercase text-slate-800 outline-none dark:text-white"
                    />
                    <label
                      htmlFor="veh_carroceria"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-blue-600 dark:peer-focus:text-blue-400"
                    >
                      Carrocería
                    </label>
                  </div>

                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-blue-600 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-4 focus-within:ring-blue-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-blue-400">
                    <input
                      id="veh_sede"
                      type="text"
                      placeholder=" "
                      value={formData.sedeRegistro || ''}
                      onChange={(e) => setFormData({ ...formData, sedeRegistro: e.target.value.toUpperCase() })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-semibold uppercase text-slate-800 outline-none dark:text-white"
                    />
                    <label
                      htmlFor="veh_sede"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-blue-600 dark:peer-focus:text-blue-400"
                    >
                      Sede de Registro SUNARP
                    </label>
                  </div>

                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-blue-600 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-4 focus-within:ring-blue-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-blue-400">
                    <input
                      id="veh_tipo_carroceria"
                      type="text"
                      placeholder=" "
                      value={formData.tipoCarroceria || ''}
                      onChange={(e) => setFormData({ ...formData, tipoCarroceria: e.target.value.toUpperCase() })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-mono uppercase text-slate-800 outline-none dark:text-white"
                    />
                    <label
                      htmlFor="veh_tipo_carroceria"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-blue-600 dark:peer-focus:text-blue-400"
                    >
                      Tipo de Carrocería
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
                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-blue-600 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-4 focus-within:ring-blue-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-blue-400">
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

                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-blue-600 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-4 focus-within:ring-blue-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-blue-400">
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

                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-blue-600 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-4 focus-within:ring-blue-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-blue-400">
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
                  Titular & Asociación Autorizada
                </h4>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-blue-600 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-4 focus-within:ring-blue-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-blue-400">
                    <input
                      id="veh_propietario"
                      required
                      type="text"
                      placeholder="Escribe DNI o nombre del propietario..."
                      value={propietarioSearch}
                      onFocus={() => setShowPropietarioResults(true)}
                      onChange={(e) => {
                        const value = e.target.value
                        setPropietarioSearch(value)
                        setFormData({
                          ...formData,
                          propietarioDni: '',
                          propietario: ''
                        })
                        setShowPropietarioResults(true)
                      }}
                      className="peer block w-full bg-transparent px-3.5 pt-5 pb-2 text-sm font-bold text-slate-800 outline-none dark:text-white"
                    />
                    <label
                      htmlFor="veh_propietario"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400"
                    >
                      Propietario registrado en Personas
                    </label>
                    {showPropietarioResults && (
                      <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 max-h-44 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                        {propietarioResults.length ? (
                          propietarioResults.map((persona) => {
                            const documento = persona.numeroDocumento || ''
                            const nombre = getPersonaNombre(persona)
                            return (
                              <button
                                key={persona.id || documento}
                                type="button"
                                onMouseDown={(event) => {
                                  event.preventDefault()
                                  event.stopPropagation()
                                  selectPropietario(persona)
                                }}
                                className="flex w-full flex-col rounded-xl px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-slate-800"
                              >
                                <span className="font-mono text-xs font-black text-blue-700 dark:text-blue-300">{documento}</span>
                                <span className="truncate text-sm font-bold text-slate-800 dark:text-white">{nombre || 'Sin nombre'}</span>
                              </button>
                            )
                          })
                        ) : (
                          <div className="px-3 py-3 text-sm font-semibold text-amber-600">
                            No se encontró una persona con ese DNI o nombre. Regístrala primero en Personas.
                          </div>
                        )}
                      </div>
                    )}
                    {formData.propietarioDni && (
                      <p className="px-3.5 pb-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                        Seleccionado: {formData.propietarioDni} — {formData.propietario}
                      </p>
                    )}
                    {!personas.length && (
                      <p className="px-3.5 pb-2 text-xs font-semibold text-amber-600">
                        No hay personas cargadas. Registra primero al propietario en el módulo Personas.
                      </p>
                    )}
                  </div>

                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-blue-600 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-4 focus-within:ring-blue-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-blue-400">
                    <input
                      id="veh_org"
                      type="text"
                      placeholder="Escribe nombre o RUC de la asociación..."
                      value={asociacionSearch}
                      onFocus={() => setShowAsociacionResults(true)}
                      onChange={(e) => {
                        const value = e.target.value
                        setAsociacionSearch(value)
                        setFormData({
                          ...formData,
                          asociacion: '',
                          estado: formData.estado === 'SUSPENDIDO' || formData.estado === 'BAJA' ? formData.estado : 'INFORMAL'
                        })
                        setShowAsociacionResults(true)
                      }}
                      className="peer block w-full bg-transparent px-3.5 pt-5 pb-2 text-sm font-semibold text-slate-800 outline-none dark:text-white"
                    />
                    <label
                      htmlFor="veh_org"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400"
                    >
                      Empresa o Asociación (Define Formal / Informal)
                    </label>
                    {showAsociacionResults && (
                      <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-40 max-h-44 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                        {asociacionResults.length ? (
                          asociacionResults.map((org) => (
                            <button
                              key={org.id || org.ruc || org.razonSocial}
                              type="button"
                              onMouseDown={(event) => {
                                event.preventDefault()
                                event.stopPropagation()
                                selectAsociacion(org)
                              }}
                              className="flex w-full flex-col rounded-xl px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-slate-800"
                            >
                              <span className="truncate text-sm font-bold text-slate-800 dark:text-white">{org.razonSocial}</span>
                              <span className="font-mono text-xs font-black text-blue-700 dark:text-blue-300">RUC: {org.ruc || 'S/D'}</span>
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-3 text-sm font-semibold text-amber-600">
                            No se encontró asociación. Si el vehículo no pertenece a una asociación, déjalo vacío.
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2 px-3.5 pb-2 text-xs">
                      {formData.asociacion ? (
                        <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                          Formal: {formData.asociacion}
                        </span>
                      ) : (
                        <span className="font-semibold text-amber-600">
                          Sin asociación: vehículo informal
                        </span>
                      )}
                      {formData.asociacion && (
                        <button type="button" onClick={clearAsociacion} className="font-bold text-rose-500 hover:text-rose-700">
                          Quitar asociación
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>


              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-amber-500" />
                  Estado de Operatividad Municipal
                </h4>
                <div className="grid gap-4 sm:grid-cols-1">
                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-blue-600 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-4 focus-within:ring-blue-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-blue-400">
                    <select
                      id="veh_estado"
                      value={formData.estado}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-bold text-slate-800 outline-none dark:text-white"
                    >
                      <option value="FORMAL">FORMAL (Autorizado)</option>
                      <option value="INFORMAL">INFORMAL (Sin Asociación)</option>
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


              <div className="sticky bottom-0 z-30 -mx-5 flex items-center justify-end gap-3 border-t border-slate-100 bg-white/95 px-5 pt-4 pb-1 backdrop-blur-sm dark:border-slate-800 dark:bg-[#0f172a]/95 sm:-mx-6 sm:px-6">
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
                      className={`rounded-md px-2.5 py-1 text-xs font-black ${isVehiculoFormal(selectedVehiculo)
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                    >
                      {isVehiculoFormal(selectedVehiculo) ? 'FORMAL' : 'INFORMAL'}
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
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Categoría</p>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-100">{selectedVehiculo.categoria || 'N/A'}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Carrocería</p>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-100">{selectedVehiculo.carroceria || 'N/A'}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sede de registro</p>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-100">{selectedVehiculo.sedeRegistro || 'N/A'}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tipo de carrocería</p>
                      <p className="font-mono text-sm font-black text-slate-800 dark:text-slate-100">{selectedVehiculo.tipoCarroceria || 'N/A'}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Condición Legal</p>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-100">{isVehiculoFormal(selectedVehiculo) ? 'FORMAL' : 'INFORMAL'}</p>
                    </div>
                  </div>
                </div>
              </div>


              <div className="grid gap-3 text-xs lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                  <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Propietario Registrado</p>
                  <p className="mt-1 text-sm font-extrabold text-slate-800 dark:text-white">{selectedVehiculo.propietario}</p>
                  <p className="text-slate-500 font-mono">DNI: {selectedVehiculo.propietarioTipoDocumento === 'DNI' ? selectedVehiculo.propietarioDni || 'N/A' : 'N/A'}</p>
                  <p className="text-slate-500 font-mono">RUC: {selectedVehiculo.asociacionRuc || 'N/A'}</p>
                  <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Asociación del vehículo</p>
                    <p className="mt-1 font-bold text-slate-800 dark:text-cyan-300">{isVehiculoFormal(selectedVehiculo) ? selectedVehiculo.asociacion : 'Sin Asociación (Vehículo Informal)'}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                  <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Documentos del Vehículo</p>
                  {[
                    ['Tarjeta de propiedad', getVehiculoDocumento(selectedVehiculo, 'TARJETA_PROPIEDAD')],
                    ['SOAT', getVehiculoDocumento(selectedVehiculo, 'SOAT')],
                  ].map(([label, documento]) => (
                    <div key={label} className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900">
                      <span className="font-bold text-slate-600 dark:text-slate-300">{label}</span>
                      <span className="text-right font-mono font-black text-slate-800 dark:text-white">
                        {documento?.codigo || 'N/A'}
                        <span className="ml-2 text-[10px] font-bold text-slate-400">{documento?.estado || 'SIN_REGISTRO'}</span>
                      </span>
                    </div>
                  ))}
                  <div className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-cyan-50 px-3 py-2 dark:bg-cyan-950/30">
                    <span className="font-bold text-slate-600 dark:text-slate-300">CERTICAV / Inspección técnica</span>
                    <span className="text-right font-mono font-black text-slate-800 dark:text-white">
                      {selectedVehiculo.certicav?.numeroSerieCerticav || selectedVehiculo.certicav?.numeroRegistro || 'N/A'}
                      <span className="ml-2 text-[10px] font-bold text-slate-400">
                        {selectedVehiculo.certicav?.resultado || selectedVehiculo.certicav?.estado || 'SIN_REGISTRO'}
                      </span>
                    </span>
                  </div>
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
                  {(() => {
                    const historial = selectedVehiculo.historialPapeletas || []
                    const pendientes = historial.filter((p) => p.estado === 'PENDIENTE_PAGO')
                    const pagadas = historial.filter((p) => p.estado === 'PAGADA')
                    const anuladas = historial.filter((p) => p.estado === 'ANULADA')
                    const deuda = pendientes.reduce((sum, p) => sum + Number(p.montoTotal || 0), 0)
                    const pagado = pagadas.reduce((sum, p) => sum + Number(p.montoTotal || 0), 0)

                    if (historial.length === 0) {
                      return (
                        <div className="mt-2 rounded-lg bg-slate-50 px-3 py-3 text-sm font-bold text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                          Sin papeletas registradas.
                        </div>
                      )
                    }

                    return (
                      <div className="mt-3 space-y-3">
                        <div className="grid gap-2 sm:grid-cols-4">
                          <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900">
                            <p className="text-[10px] font-black uppercase text-slate-400">Total</p>
                            <p className="font-mono text-base font-black text-slate-900 dark:text-white">{historial.length}</p>
                          </div>
                          <div className="rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-950/40">
                            <p className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-300">Debe</p>
                            <p className="font-mono text-base font-black text-amber-700 dark:text-amber-300">S/ {deuda.toFixed(2)}</p>
                          </div>
                          <div className="rounded-lg bg-emerald-50 px-3 py-2 dark:bg-emerald-950/40">
                            <p className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-300">Pagado</p>
                            <p className="font-mono text-base font-black text-emerald-700 dark:text-emerald-300">S/ {pagado.toFixed(2)}</p>
                          </div>
                          <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900">
                            <p className="text-[10px] font-black uppercase text-slate-400">Anuladas</p>
                            <p className="font-mono text-base font-black text-slate-700 dark:text-slate-300">{anuladas.length}</p>
                          </div>
                        </div>

                        <div className="overflow-hidden rounded-lg border border-slate-100 dark:border-slate-800">
                          {historial.map((papeleta) => {
                            const pagada = papeleta.estado === 'PAGADA'
                            const anulada = papeleta.estado === 'ANULADA'
                            return (
                              <div key={papeleta.numeroPapeleta} className="grid gap-2 border-b border-slate-100 px-3 py-2 last:border-b-0 dark:border-slate-800 sm:grid-cols-[140px_1fr_110px_120px] sm:items-center">
                                <div>
                                  <p className="font-mono text-xs font-black text-rose-700 dark:text-rose-300">{papeleta.numeroPapeleta}</p>
                                  <p className="text-[10px] font-bold text-slate-400">{papeleta.fechaHora ? new Date(papeleta.fechaHora).toLocaleDateString() : 'Sin fecha'}</p>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-black text-slate-800 dark:text-slate-100">{papeleta.codigoInfraccion || 'SIN CODIGO'} · {papeleta.gravedad || 'SIN GRAVEDAD'}</p>
                                  <p className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400" title={papeleta.tipoInfraccion}>{papeleta.tipoInfraccion || papeleta.lugar || 'Infracción no especificada'}</p>
                                </div>
                                <p className="font-mono text-xs font-black text-slate-800 dark:text-slate-100">S/ {Number(papeleta.montoTotal || 0).toFixed(2)}</p>
                                <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black ${pagada ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300' : anulada ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'}`}>
                                  <span className="size-1.5 rounded-full bg-current" />
                                  {pagada ? 'PAGADA' : anulada ? 'ANULADA' : 'DEBE'}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })()}
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
