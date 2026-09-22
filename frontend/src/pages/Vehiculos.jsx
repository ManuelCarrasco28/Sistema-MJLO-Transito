import { useEffect, useState, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Icon } from '../components/ui/Icon'
import { PageLoadError } from '../components/ui/PageLoadError'
import { useQuickCreate } from '../hooks/useQuickCreate'
import { Pagination } from '../components/ui/Pagination'
import { apiFetch, getCachedData, setCachedData } from '../config/api'
import { exportToExcel } from '../utils/exportToExcel'
import { exportToPdf } from '../utils/exportToPdf'

function FloatingInput({ id, label, type = "text", ...props }) {
  return (
    <div className="relative">
      <input
        id={id}
        type={type}
        className="peer flex h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 pt-4 pb-1 text-xs font-semibold text-slate-800 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        placeholder=" "
        autoComplete="off"
        {...props}
      />
      <label
        htmlFor={id}
        className="pointer-events-none absolute left-3 right-3 truncate whitespace-nowrap top-1/2 -translate-y-1/2 select-none text-xs font-medium text-slate-400 transition-all duration-150 peer-focus:top-1 peer-focus:-translate-y-0 peer-focus:text-[9.5px] peer-focus:font-bold peer-focus:text-indigo-600 peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:-translate-y-0 peer-[:not(:placeholder-shown)]:text-[9.5px] peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:text-slate-500 dark:peer-[:not(:placeholder-shown)]:text-slate-400"
      >
        {label}
      </label>
    </div>
  )
}

function FloatingSelect({ id, label, value, onChange, options = [], className = '' }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = options.find((opt) => String(opt.value) === String(value)) || options[0]

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        id={id}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex h-[42px] w-full items-center justify-between rounded-xl border bg-white px-3 pt-3.5 pb-1 text-left text-xs font-semibold text-slate-800 outline-none transition-all dark:bg-slate-900 dark:text-white cursor-pointer ${isOpen
            ? 'border-indigo-500 ring-1 ring-indigo-500/20 dark:border-indigo-400'
            : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
          }`}
      >
        <span className="truncate">{selectedOption?.label || value}</span>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`size-3 text-slate-400 transition-transform duration-150 shrink-0 ml-1.5 ${isOpen ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <label htmlFor={id} className={`pointer-events-none absolute left-3 top-1 text-[9.5px] font-bold select-none transition-all duration-150 ${isOpen ? '!text-indigo-600 dark:!text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
        {label}
      </label>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-800 animate-in fade-in zoom-in-95 duration-100">
          <div className="space-y-0.5">
            {options.map((opt) => {
              const isSelected = String(opt.value) === String(value)
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange({ target: { value: opt.value } })
                    setIsOpen(false)
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-xs transition-colors cursor-pointer ${isSelected
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold'
                      : 'font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/60'
                    }`}
                >
                  <span className="whitespace-nowrap">{opt.label}</span>
                  {isSelected && (
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-3 text-indigo-600 dark:text-indigo-400 shrink-0">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

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

  const handleExportExcel = () => {
    exportToExcel({
      filename: `Padron_Vehicular_${new Date().toISOString().slice(0, 10)}.xls`,
      sheetName: 'Vehículos',
      title: 'PADRÓN VEHICULAR MUNICIPAL',
      subtitle: 'Subgerencia de Tránsito y Transporte - Registro Oficial',
      metadata: [
        { label: 'Tipo Vehículo', value: filterTipo },
        { label: 'Estado', value: filterEstado }
      ],
      columns: [
        { header: 'PLACA', key: 'placa', isText: true, width: 110, align: 'center' },
        { header: 'TIPO VEHÍCULO', key: 'tipo', width: 140 },
        { header: 'MARCA', key: 'marca', width: 120 },
        { header: 'MODELO', key: 'modelo', width: 120 },
        { header: 'COLOR', key: 'color', width: 110 },
        { header: 'AÑO', key: 'anio', width: 80, align: 'center' },
        { header: 'N° MOTOR', key: 'numeroMotor', isText: true, width: 140 },
        { header: 'SERIE / CHASIS', key: 'numeroSerie', isText: true, width: 140 },
        { header: 'ASOCIACIÓN', render: (_, r) => r.asociacion || 'PARTICULAR / SIN ASOC.', width: 220 },
        { header: 'PROPIETARIO', key: 'propietario', width: 180 },
        { header: 'DNI / RUC', key: 'propietarioDni', isText: true, width: 110, align: 'center' },
        { header: 'ESTADO', key: 'estado', width: 110, align: 'center' }
      ],
      data: filteredVehiculos
    })
  }

  const handleExportPdf = () => {
    exportToPdf({
      filename: `Padron_Vehicular_${new Date().toISOString().slice(0, 10)}.pdf`,
      sheetName: 'Vehículos',
      title: 'PADRÓN VEHICULAR MUNICIPAL',
      subtitle: 'Subgerencia de Tránsito y Transporte - Registro Oficial',
      metadata: [
        { label: 'Tipo Vehículo', value: filterTipo },
        { label: 'Estado', value: filterEstado }
      ],
      columns: [
        { header: 'PLACA', key: 'placa', isText: true, width: 110, align: 'center' },
        { header: 'TIPO VEHÍCULO', key: 'tipo', width: 140 },
        { header: 'MARCA', key: 'marca', width: 120 },
        { header: 'MODELO', key: 'modelo', width: 120 },
        { header: 'COLOR', key: 'color', width: 110 },
        { header: 'AÑO', key: 'anio', width: 80, align: 'center' },
        { header: 'N° MOTOR', key: 'numeroMotor', isText: true, width: 140 },
        { header: 'SERIE / CHASIS', key: 'numeroSerie', isText: true, width: 140 },
        { header: 'ASOCIACIÓN', render: (_, r) => r.asociacion || 'PARTICULAR / SIN ASOC.', width: 220 },
        { header: 'PROPIETARIO', key: 'propietario', width: 180 },
        { header: 'DNI / RUC', key: 'propietarioDni', isText: true, width: 110, align: 'center' },
        { header: 'ESTADO', key: 'estado', width: 110, align: 'center' }
      ],
      data: filteredVehiculos
    })
  }

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
        const payload = {
          ...formData,
          estado: formData.asociacion?.trim() ? 'FORMAL' : 'INFORMAL',
        }
        const res = await apiFetch('/vehiculos', {
          method: 'POST',
          body: payload,
        })
        const resData = await res.json().catch(() => ({}))
        if (!res.ok || !resData.data?.id) throw new Error(resData.messages?.error || resData.message || 'No se pudo registrar el vehículo.')
        const newVehiculo = resData.data
        setVehiculos([newVehiculo, ...vehiculos])
        setCurrentPage(1)
      }
      setIsModalOpen(false)
    } catch (err) {
      alert(err.message || 'Error al guardar el vehículo en el servidor.')
    }
  }

  return (
    <div className="space-y-6">
      {loadError && <PageLoadError message={loadError} />}

      {/* Cabecera Principal */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25">
            <Icon name="vehicle" className="size-5.5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                Gestión de Vehículos
              </h1>
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Registro municipal, control de trimóviles, empresas autorizadas y fiscalización vial.
            </p>
          </div>
        </div>
      </div>


      {/* Tarjetas KPI con Bordes de Colores */}
      <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">

        {/* 1. Total Unidades */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-indigo-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-indigo-500/80 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Total Unidades</span>
            <span className="grid size-6 place-items-center rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Icon name="vehicle" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">{new Intl.NumberFormat('es-PE').format(totalVehiculos)}</p>
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded-md">Padrón 2026</span>
          </div>
        </div>

        {/* 2. Formales */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-emerald-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-emerald-500/80 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Formales</span>
            <span className="grid size-6 place-items-center rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 font-bold text-xs">✓</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">{new Intl.NumberFormat('es-PE').format(formales)}</p>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-md">{porcentajeFormales}% En Asoc.</span>
          </div>
        </div>

        {/* 3. Informales */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-amber-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-amber-500/80 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Informales</span>
            <span className="grid size-6 place-items-center rounded-md bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 font-bold text-xs">⚠️</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">{new Intl.NumberFormat('es-PE').format(informales)}</p>
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded-md">Sin Asoc.</span>
          </div>
        </div>

        {/* 4. Observados / Baja */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-rose-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-rose-500/80 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Inhabilitados</span>
            <span className="grid size-6 place-items-center rounded-md bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 font-bold text-xs">✕</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">{new Intl.NumberFormat('es-PE').format(suspendidos)}</p>
            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded-md">Susp. o Baja</span>
          </div>
        </div>
      </div>


      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-[#0f172a] overflow-hidden">
        <div className="flex flex-col gap-2.5 border-b border-slate-100 px-4 py-2.5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">

          <div className="relative flex-1">
            <Icon name="search" className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por placa, marca, modelo, DNI o propietario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-1.5 pl-9 pr-8 text-xs text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-blue-400"
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
              className="rounded-xl border border-slate-200 bg-slate-50 py-1.5 px-3 text-xs font-bold text-slate-700 outline-none transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="TODOS">Todos los tipos</option>
              <option value="Mototaxi (Trimovil)">Mototaxi (Trimovil)</option>
              <option value="Colectivo (Auto)">Colectivo (Auto)</option>
              <option value="Combi / Minivan">Combi / Minivan</option>
            </select>

            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 py-1.5 px-3 text-xs font-bold text-slate-700 outline-none transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
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
                title="Limpiar filtros"
                className="grid size-[34px] place-items-center rounded-xl border border-rose-200/80 bg-rose-50/70 text-rose-600 hover:bg-rose-100 hover:text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60 transition-all active:scale-95 cursor-pointer shadow-2xs"
              >
                <Icon name="filterX" className="size-4" />
              </button>
            )}

            <button
              type="button"
              onClick={handleExportExcel}
              title="Descargar padrón en Excel (.xls)"
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60 transition-all active:scale-95 cursor-pointer shadow-2xs whitespace-nowrap"
            >
              <Icon name="fileSpreadsheet" className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Excel</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              title="Descargar o imprimir padrón en PDF"
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200/80 bg-rose-50/70 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60 transition-all active:scale-95 cursor-pointer shadow-2xs whitespace-nowrap"
            >
              <Icon name="filePdf" className="size-3.5 text-rose-600 dark:text-rose-400" />
              <span>PDF</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-1.5 text-xs font-extrabold text-white shadow-md shadow-blue-600/20 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-600/30 active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <span className="text-base leading-none font-black">+</span>
              <span>Nuevo Vehículo</span>
            </button>
          </div>
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
            <thead className="bg-slate-50/75 dark:bg-slate-800/40 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-3.5 py-2.5 whitespace-nowrap">Placa</th>
                <th className="px-3.5 py-2.5 whitespace-nowrap">Vehículo & Modelo</th>
                <th className="px-3.5 py-2.5 whitespace-nowrap">Asociación / Empresa</th>
                <th className="px-3.5 py-2.5 whitespace-nowrap">Propietario & Titular</th>
                <th className="px-3.5 py-2.5 whitespace-nowrap">Serie Chasis / SUNARP</th>
                <th className="px-3.5 py-2.5 whitespace-nowrap text-center">Estado</th>
                <th className="sticky right-0 z-10 bg-slate-50/75 dark:bg-slate-800/40 px-3 py-3.5 text-center whitespace-nowrap shadow-[-4px_0_8px_rgba(0,0,0,0.03)]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading && vehiculos.length === 0 ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-3.5 py-2.5"><div className="h-6 w-20 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-3.5 py-2.5">
                      <div className="space-y-1.5">
                        <div className="h-3.5 w-32 rounded bg-slate-200 dark:bg-slate-800" />
                        <div className="h-2.5 w-20 rounded bg-slate-100 dark:bg-slate-800/60" />
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5"><div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-3.5 py-2.5"><div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-3.5 py-2.5"><div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-3.5 py-2.5 text-center"><div className="mx-auto h-5 w-20 rounded-full bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="sticky right-0 z-10 bg-white dark:bg-[#0f172a] px-3 py-4 shadow-[-4px_0_8px_rgba(0,0,0,0.03)]"><div className="mx-auto h-7 w-20 rounded-lg bg-slate-200 dark:bg-slate-800" /></td>
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
                    className="group transition-colors hover:bg-cyan-50/30 dark:hover:bg-slate-800/40"
                  >

                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <span className="inline-flex items-center justify-center rounded-lg border-2 border-slate-900 bg-amber-300 px-3 py-1 font-mono text-xs font-black tracking-widest text-slate-950 shadow-xs dark:border-slate-800 dark:bg-amber-400 dark:text-slate-950">
                        {v.placa}
                      </span>
                    </td>


                    <td className="px-3.5 py-2.5">
                      <p className="font-extrabold leading-tight text-slate-800 dark:text-white" title={`${v.marca} ${v.modelo}`}>
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


                    <td className="px-3.5 py-2.5">
                      {isVehiculoFormal(v) ? (
                        <>
                          <p className="text-xs font-bold leading-tight text-slate-700 dark:text-slate-200" title={v.asociacion}>
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


                    <td className="px-3.5 py-2.5">
                      <p className="font-bold leading-tight text-slate-800 dark:text-slate-100 text-xs" title={v.propietario}>{v.propietario}</p>
                      <p className="text-xs font-mono text-slate-400">
                        DNI/RUC: {v.propietarioDni || v.propietarioRuc || 'N/A'}
                      </p>
                    </td>


                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <p className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                        {v.numeroSerie || 'N/A'}
                      </p>
                      <p className="text-[11px] font-mono text-slate-400">
                        {v.partidaRegistral || 'N/A'}
                      </p>
                    </td>


                    <td className="px-3.5 py-2.5 whitespace-nowrap text-center">
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


                    <td className="sticky right-0 z-10 bg-white dark:bg-[#0f172a] px-3 py-3.5 whitespace-nowrap shadow-[-4px_0_8px_rgba(0,0,0,0.03)] transition-colors group-hover:bg-cyan-50/30 dark:group-hover:bg-slate-800/40">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(v)}
                          title="Ver Ficha Técnica"
                          className="size-8 rounded-lg grid place-items-center bg-cyan-50 text-cyan-600 hover:bg-cyan-500 hover:text-white dark:bg-cyan-950/60 dark:text-cyan-400 dark:hover:bg-cyan-500 dark:hover:text-white transition-all cursor-pointer shadow-xs active:scale-95"
                        >
                          <Icon name="eye" className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(v)}
                          title="Editar Vehículo"
                          className="size-8 rounded-lg grid place-items-center bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white dark:bg-amber-950/60 dark:text-amber-400 dark:hover:bg-amber-500 dark:hover:text-white transition-all cursor-pointer shadow-xs active:scale-95"
                        >
                          <Icon name="pencil" className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(v.id)}
                          title="Eliminar Vehículo"
                          className="size-8 rounded-lg grid place-items-center bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white dark:bg-rose-950/60 dark:text-rose-400 dark:hover:bg-rose-500 dark:hover:text-white transition-all cursor-pointer shadow-xs active:scale-95"
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
          onPageChange={(page) => setCurrentPage(Number(page))}
          onItemsPerPageChange={(size) => {
            setItemsPerPage(Number(size))
            setCurrentPage(1)
          }}
        />
      </div>


      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs animate-enter">
          <div className="flex min-h-full items-center justify-center p-4 sm:p-6 pb-24">
            <div className="relative w-full max-w-5xl rounded-3xl bg-white shadow-2xl dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800">
              {/* Cabecera del Modal (Limpia, sin morado) */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-3.5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <Icon name="vehicle" className="size-4" />
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isEditing ? 'Editar Vehículo' : 'Registrar Vehículo'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                title="Cerrar"
                className="grid size-9 shrink-0 place-items-center rounded-xl border border-rose-200/80 bg-rose-50/70 text-rose-500 hover:bg-rose-100 hover:text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/50 transition-all active:scale-95 cursor-pointer shadow-xs"
              >
                <Icon name="close" className="size-5" />
              </button>
            </div>

            <form
              onSubmit={handleFormSubmit}
              autoComplete="off"
              onMouseDown={(event) => {
                if (!event.target.closest('[data-combobox="vehiculo"]')) {
                  setShowPropietarioResults(false)
                  setShowAsociacionResults(false)
                }
              }}
              className="space-y-3 p-4 sm:p-5"
            >

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-blue-600" />
                  Identificación de la Unidad
                </h4>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <FloatingInput
                    id="veh_placa"
                    label="Placa de Rodaje"
                    required
                    maxLength={15}
                    value={formData.placa}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      if (/[^A-Z0-9-]/.test(val)) return;
                      setFormData({ ...formData, placa: val });
                    }}
                    className="peer flex h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 pt-4 pb-1 text-xs font-semibold text-slate-800 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white font-black uppercase"
                  />

                  <FloatingSelect
                    id="veh_tipo"
                    label="Tipo de Vehículo"
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    options={[
                      { value: 'Mototaxi (Trimovil)', label: 'Mototaxi (Trimovil)' },
                      { value: 'Colectivo (Auto)', label: 'Colectivo (Auto)' },
                      { value: 'Combi / Minivan', label: 'Combi / Minivan' },
                    ]}
                  />

                  <FloatingInput
                    id="veh_marca"
                    label="Marca"
                    value={formData.marca}
                    onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                  />

                  <FloatingInput
                    id="veh_modelo"
                    label="Modelo"
                    value={formData.modelo}
                    onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                  />

                  <FloatingInput
                    id="veh_color"
                    label="Color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  />

                  <FloatingInput
                    id="veh_anio"
                    type="number"
                    label="Año de Fabricación"
                    value={formData.anio}
                    onChange={(e) => setFormData({ ...formData, anio: e.target.value })}
                  />

                  <FloatingInput
                    id="veh_categoria"
                    label="Categoría SUNARP"
                    value={formData.categoria || ''}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value.toUpperCase() })}
                    className="peer flex h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 pt-4 pb-1 text-xs font-semibold text-slate-800 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white uppercase"
                  />

                  <FloatingInput
                    id="veh_carroceria"
                    label="Carrocería"
                    value={formData.carroceria || ''}
                    onChange={(e) => setFormData({ ...formData, carroceria: e.target.value.toUpperCase() })}
                    className="peer flex h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 pt-4 pb-1 text-xs font-semibold text-slate-800 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white uppercase"
                  />

                  <FloatingInput
                    id="veh_sede"
                    label="Sede de Registro SUNARP"
                    value={formData.sedeRegistro || ''}
                    onChange={(e) => setFormData({ ...formData, sedeRegistro: e.target.value.toUpperCase() })}
                    className="peer flex h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 pt-4 pb-1 text-xs font-semibold text-slate-800 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white uppercase"
                  />

                  <FloatingInput
                    id="veh_tipo_carroceria"
                    label="Tipo de Carrocería"
                    value={formData.tipoCarroceria || ''}
                    onChange={(e) => setFormData({ ...formData, tipoCarroceria: e.target.value.toUpperCase() })}
                    className="peer flex h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 pt-4 pb-1 text-xs font-semibold text-slate-800 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white uppercase font-mono"
                  />
                </div>
              </div>


              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-cyan-500" />
                  Datos Técnicos & SUNARP
                </h4>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <FloatingInput
                    id="veh_serie"
                    label="Número de Serie (VIN)"
                    value={formData.numeroSerie}
                    onChange={(e) => setFormData({ ...formData, numeroSerie: e.target.value.toUpperCase() })}
                    className="peer flex h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 pt-4 pb-1 text-xs font-semibold text-slate-800 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white font-mono"
                  />

                  <FloatingInput
                    id="veh_motor"
                    label="Serie del Motor"
                    value={formData.serieMotor}
                    onChange={(e) => setFormData({ ...formData, serieMotor: e.target.value.toUpperCase() })}
                    className="peer flex h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 pt-4 pb-1 text-xs font-semibold text-slate-800 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white font-mono"
                  />

                  <FloatingInput
                    id="veh_partida"
                    label="Partida Registral SUNARP"
                    value={formData.partidaRegistral}
                    onChange={(e) => setFormData({ ...formData, partidaRegistral: e.target.value })}
                    className="peer flex h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 pt-4 pb-1 text-xs font-semibold text-slate-800 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>


              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  Titular & Asociación Autorizada
                </h4>
                <div className="grid gap-4 lg:grid-cols-2 items-start">
                  <div className="relative">
                    <FloatingInput
                      id="veh_propietario"
                      label="Propietario registrado en Personas"
                      required
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
                    />
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
                      <p className="px-3.5 pb-2 pt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                        Seleccionado: {formData.propietarioDni} — {formData.propietario}
                      </p>
                    )}
                    {!personas.length && (
                      <p className="px-3.5 pb-2 pt-2 text-xs font-semibold text-amber-600">
                        No hay personas cargadas. Registra primero al propietario en el módulo Personas.
                      </p>
                    )}
                  </div>

                  <div className="relative">
                    <FloatingInput
                      id="veh_org"
                      label="Empresa o Asociación (Define Formal / Informal)"
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
                    />
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
                    <div className="flex items-center justify-between gap-2 px-3.5 pb-2 pt-2 text-xs">
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


              {isEditing && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                    <span className="size-2 rounded-full bg-amber-500" />
                    Estado de Operatividad Municipal
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-1">
                    <FloatingSelect
                      id="veh_estado"
                      label="Estado Municipal del Vehículo"
                      value={formData.estado}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                      options={[
                        { value: 'FORMAL', label: 'FORMAL (Autorizado)' },
                        { value: 'INFORMAL', label: 'INFORMAL (Sin Asociación)' },
                        { value: 'SUSPENDIDO', label: 'SUSPENDIDO' },
                        { value: 'BAJA', label: 'BAJA' }
                      ]}
                    />
                  </div>
                </div>
              )}


              <div className="-mx-5 mt-4 flex items-center justify-end gap-3 border-t border-slate-100 px-5 pt-3 pb-1 dark:border-slate-800 sm:-mx-6 sm:px-6">
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
                
                {/* Historial de Internamientos */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 lg:col-span-2">
                  <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Historial de internamientos al depósito</p>
                  {(() => {
                    const internamientos = selectedVehiculo.historialInternamientos || []
                    
                    if (internamientos.length === 0) {
                      return (
                        <div className="mt-2 rounded-lg bg-slate-50 px-3 py-3 text-sm font-bold text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                          Sin internamientos registrados.
                        </div>
                      )
                    }

                    return (
                      <div className="mt-3 overflow-hidden rounded-lg border border-slate-100 dark:border-slate-800">
                        {internamientos.map((int) => {
                          return (
                            <div key={int.numero_orden} className="grid gap-2 border-b border-slate-100 px-3 py-2 last:border-b-0 dark:border-slate-800 sm:grid-cols-[140px_1fr_120px] sm:items-center">
                              <div>
                                <p className="font-mono text-xs font-black text-rose-700 dark:text-rose-300">{int.numero_orden}</p>
                                <p className="text-[10px] font-bold text-slate-400">{int.fecha_ingreso ? new Date(int.fecha_ingreso).toLocaleDateString() : 'Sin fecha'}</p>
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">{int.motivo || 'Sin motivo'}</p>
                                <p className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">{int.lugar_intervencion || 'Sin lugar'}</p>
                              </div>
                              <div className="text-right">
                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black ${
                                  int.estado === 'LIBERADO' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300' :
                                  'bg-orange-100 text-orange-800 dark:bg-orange-950/70 dark:text-orange-300'
                                }`}>
                                  <span className="size-1.5 rounded-full bg-current" />
                                  {int.estado}
                                </span>
                              </div>
                            </div>
                          )
                        })}
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
