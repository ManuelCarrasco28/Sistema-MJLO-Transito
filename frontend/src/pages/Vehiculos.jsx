import { useEffect, useState, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Icon } from '../components/ui/Icon'
import { PageLoadError } from '../components/ui/PageLoadError'
import { useQuickCreate } from '../hooks/useQuickCreate'
import { Pagination } from '../components/ui/Pagination'
import { StatusBadge } from '../components/ui/StatusBadge'
import { sanitizarMensaje, apiFetch, getCachedData, setCachedData } from '../config/api'
import { showError, showConfirm, showToast } from '../utils/SwalUtil'
import { exportToExcel } from '../utils/exportToExcel'
import { exportToPdf } from '../utils/exportToPdf'
import { RoundedSelect, FloatingInput, FloatingSelect } from '../components/ui/FormInputs'
import { VehiculoFormModal } from '../components/vehiculos/VehiculoFormModal'
import { VehiculoDetalleModal } from '../components/vehiculos/VehiculoDetalleModal'

export function Vehiculos({ user }) {
  const rolNormalizado = (user?.rol || '').toUpperCase()
  const isOffice = ['SUPERADMIN', 'GERENTE', 'SUBGERENTE', 'SECRETARIA'].includes(rolNormalizado)

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
  const [filterEstado, setFilterEstado] = useState('FORMAL')
  const [filterActivo, setFilterActivo] = useState('TODOS')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(8)
  const [loadError, setLoadError] = useState('')


  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedVehiculo, setSelectedVehiculo] = useState(null)
  const [isEditing, setIsEditing] = useState(false)

  const [consultaPlaca, setConsultaPlaca] = useState('')
  const [consultaResult, setConsultaResult] = useState(null)
  const [consultaError, setConsultaError] = useState('')

  const handleConsulta = async (e) => {
    e.preventDefault()
    if (!consultaPlaca.trim()) return
    const plate = consultaPlaca.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
    
    if (plate.length < 5) {
      setConsultaError('Ingrese una placa válida (ej. M6Y544 o M6Y-544).')
      return
    }

    setConsultaResult(null)
    setConsultaError('')
    setIsSearchingSunarp(true)

    try {
      const response = await apiFetch('/pide/sunarp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placa: plate, codeZona: '11', codeOficina: '01' })
      })

      if (!response.ok) {
        let errorMsg = 'No se pudo consultar el servicio vehicular SUNARP.'
        try {
          const errData = await response.json()
          errorMsg = errData.messages?.error || errData.message || errorMsg
        } catch (_) {}
        throw new Error(errorMsg)
      }

      const res = await response.json()
      const sunarpData = res.data || (res.success && res.data ? res.data : (res.placa ? res : null))

      if (!sunarpData) {
        throw new Error(res.message || 'No se encontraron registros en SUNARP para la placa ingresada.')
      }

      const foundInPadron = vehiculos.find(v => (v.placa || '').toUpperCase() === plate)

      const rawProps = Array.isArray(sunarpData.propietarios) ? sunarpData.propietarios : []
      const propNames = rawProps
        .map(p => typeof p === 'string' ? p.trim() : (p.nombre || p.razon_social || p.apellidos_nombres || ''))
        .filter(Boolean)
        .join(' - ')

      const cat = (sunarpData.categoria || '').toUpperCase().trim()
      const carr = (sunarpData.carroceria || '').toUpperCase().trim()
      let inferredTipo = 'Vehículo'
      if (cat === 'L1' || cat === 'L2' || cat === 'L3' || carr.includes('LINEAL')) inferredTipo = 'Moto Lineal'
      else if (cat === 'L5' || carr.includes('TRIMOVIL') || carr.includes('MOTOTAXI') || carr.includes('MOTOKAR')) inferredTipo = 'Mototaxi'
      else if (cat === 'M1' || carr.includes('SEDAN') || carr.includes('HATCHBACK') || carr.includes('SUV')) inferredTipo = 'Automóvil'
      else if (cat === 'M2' || carr.includes('COMBI') || carr.includes('RURAL') || carr.includes('MICROBUS')) inferredTipo = 'Camioneta Rural'

      const combined = {
        placa: plate,
        marca: foundInPadron?.marca || sunarpData.marca || 'N/A',
        modelo: foundInPadron?.modelo || sunarpData.modelo || 'N/A',
        color: foundInPadron?.color || sunarpData.color || 'N/A',
        serieMotor: foundInPadron?.serieMotor || sunarpData.numero_motor || sunarpData.nro_motor || 'N/A',
        numeroSerie: foundInPadron?.numeroSerie || sunarpData.serie || sunarpData.vin || sunarpData.numero_serie || sunarpData.nro_serie || 'N/A',
        partidaRegistral: foundInPadron?.partidaRegistral || sunarpData.partida || sunarpData.partida_registral || 'N/A',
        propietario: foundInPadron?.propietario || propNames || 'NO REGISTRADO',
        propietarioTipoDocumento: foundInPadron ? 'DNI' : (rawProps[0]?.numero_documento ? 'DNI' : null),
        propietarioDni: foundInPadron?.propietarioDni || rawProps[0]?.numero_documento || rawProps[0]?.dni || null,
        asociacion: foundInPadron?.asociacion || null,
        estado: foundInPadron?.estado || 'INACTIVO',
        esDelPadron: !!foundInPadron,
        anio: foundInPadron?.anio || sunarpData.ano_fabricacion || sunarpData.anio_fabricacion || sunarpData.anio || 'N/A',
        categoria: foundInPadron?.categoria || sunarpData.categoria || 'N/A',
        carroceria: foundInPadron?.carroceria || sunarpData.carroceria || 'N/A',
        sedeRegistro: foundInPadron?.sedeRegistro || sunarpData.sede || sunarpData.oficina_registral || sunarpData.oficina || 'N/A',
        tipoCarroceria: foundInPadron?.tipoCarroceria || sunarpData.tipo_carroceria || sunarpData.carroceria || 'N/A',
        tipo: foundInPadron?.tipo || inferredTipo,
        ...(foundInPadron || {})
      }

      setConsultaResult(combined)
    } catch (err) {
      setConsultaError(err.message || 'Error al realizar la consulta.')
    } finally {
      setIsSearchingSunarp(false)
    }
  }

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
    estado: 'ACTIVO',
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
      asociacion: nombre
    })
    setAsociacionSearch(nombre)
    setShowAsociacionResults(false)
  }

  const clearAsociacion = () => {
    setFormData({
      ...formData,
      asociacion: ''
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
      (filterEstado === 'INFORMAL' && !formal)
    const matchesActivo = filterActivo === 'TODOS' || v.estado === filterActivo

    return matchesSearch && matchesTipo && matchesEstado && matchesActivo
  })

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterTipo, filterEstado, filterActivo])

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
        { label: 'Formalidad', value: filterEstado },
        { label: 'Estado', value: filterActivo }
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
      filename: `Padron_Vehicular_${new Date().toISOString().slice(0, 10)}`,
      subtitle: 'Subgerencia de Tránsito y Transporte · Padrón Oficial Vehicular',
      summaryItems: [
        { label: 'Total en padrón', value: totalVehiculos },
        { label: 'Exportando', value: `${filteredVehiculos.length} vehículos` },
        { label: 'Formales', value: formales },
        { label: 'Informales', value: informales },
        { label: 'Inhabilitados', value: suspendidos },
      ],
      columns: [
        { header: 'PLACA', key: 'placa', width: 80, align: 'center' },
        { header: 'TIPO', key: 'tipo', width: 130 },
        { header: 'MARCA', key: 'marca', width: 90 },
        { header: 'MODELO', key: 'modelo', width: 90 },
        { header: 'COLOR', key: 'color', width: 80 },
        { header: 'AÑO', key: 'anio', width: 45, align: 'center' },
        { header: 'N° SERIE', key: 'numeroSerie', width: 120 },
        { header: 'ASOCIACIÓN', render: (_, r) => r.asociacion || 'SIN ASOC.', width: 180 },
        { header: 'PROPIETARIO', key: 'propietario', width: 150 },
        { header: 'DNI/RUC', key: 'propietarioDni', width: 90, align: 'center' },
        { header: 'ESTADO', key: 'estado', width: 80, align: 'center' },
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
      estado: 'ACTIVO',
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
      estado: vehiculo.estado === 'INACTIVO' ? 'INACTIVO' : 'ACTIVO'
    })
    setIsEditing(true)
    setIsModalOpen(true)
  }

  const handleOpenDetail = (vehiculo) => {
    setSelectedVehiculo(vehiculo)
    setIsDetailModalOpen(true)
  }

  const handleDelete = async (id) => {
    const result = await showConfirm(
      '¿Eliminar vehículo?',
      '¿Está seguro de eliminar este vehículo del registro municipal?',
      'Sí, eliminar',
      'Cancelar'
    )
    if (result.isConfirmed) {
      try {
        await apiFetch(`/vehiculos/${id}`, { method: 'DELETE' })
        setVehiculos(vehiculos.filter((v) => v.id !== id))
        showToast('Vehículo eliminado correctamente')
      } catch (err) {
        showError('Error', 'No se pudo eliminar el vehículo.')
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
        setCurrentPage(1)
      }
      setIsModalOpen(false)
    } catch (err) {
      showError('Error', sanitizarMensaje(err.message, 'Error al guardar el vehículo en el servidor.'))
    }
  }

  if (!isOffice) {
    return (
      <div className="mx-auto w-full max-w-3xl animate-enter py-6">
        <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
          <div className="mb-8 flex flex-col items-center justify-center text-center">
            <div className="mb-4 flex size-20 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
              <Icon name="search" className="size-10" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Consulta Vehicular</h1>
            <p className="mt-2 text-base font-medium text-slate-500">
              Búsqueda rápida en el padrón municipal por número de placa
            </p>
          </div>
          
          <form onSubmit={handleConsulta} className="relative flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-5">
                <Icon name="motoTaxi" className="size-6 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Ej. 1234-AB"
                value={consultaPlaca}
                onChange={(e) => setConsultaPlaca(e.target.value.toUpperCase())}
                className="block w-full rounded-2xl border-2 border-slate-200 bg-slate-50 py-4 pl-14 pr-4 text-2xl font-black uppercase tracking-widest text-slate-900 transition focus:border-indigo-500 focus:bg-white focus:outline-hidden focus:ring-4 focus:ring-indigo-500/10 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-white dark:focus:border-indigo-400 placeholder:text-slate-300 dark:placeholder:text-slate-600"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={isSearchingSunarp}
              className={`flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-10 py-4 text-lg font-bold text-white shadow-xl shadow-indigo-600/30 transition hover:bg-indigo-700 active:scale-95 cursor-pointer ${isSearchingSunarp ? 'opacity-75 cursor-wait' : ''}`}
            >
              <Icon name={isSearchingSunarp ? 'loader' : 'search'} className={`size-6 ${isSearchingSunarp ? 'animate-spin' : ''}`} />
              <span>{isSearchingSunarp ? 'Consultando...' : 'Consultar'}</span>
            </button>
          </form>

          {consultaError && (
            <div className="mt-6 animate-enter rounded-2xl bg-rose-50 p-4 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20">
              <div className="flex items-center gap-3">
                <Icon name="alertCircle" className="size-5 shrink-0" />
                <p className="font-bold">{consultaError}</p>
              </div>
            </div>
          )}
        </div>

        {consultaResult && (
           <div className="animate-enter rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
             <div className="mb-6 flex flex-col items-start justify-between gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-center dark:border-[var(--border)]">
               <div className="flex items-center gap-4">
                 <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 dark:bg-[var(--bg-subtle)]">
                   <Icon name="motoTaxi" className="size-8 text-slate-600 dark:text-slate-300" />
                 </div>
                 <div>
                   <h2 className="text-3xl font-black tracking-widest text-slate-900 dark:text-white">
                     {consultaResult.placa}
                   </h2>
                   <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                     {consultaResult.marca} {consultaResult.modelo}
                   </span>
                 </div>
               </div>
               <button 
                 onClick={() => handleOpenDetail(consultaResult)} 
                 className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-50 px-5 py-3 text-sm font-bold text-indigo-600 hover:bg-indigo-100 sm:w-auto dark:bg-indigo-500/20 dark:text-indigo-300 dark:hover:bg-indigo-500/30 transition active:scale-95 cursor-pointer"
               >
                 <Icon name="eye" className="size-4" />
                 Ficha Técnica
               </button>
             </div>
             
             <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)]">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Asociación / Empresa</p>
                  <p className="mt-1.5 text-lg font-black text-slate-800 dark:text-slate-200 line-clamp-2">
                    {isVehiculoFormal(consultaResult) ? (consultaResult.asociacion || 'NO ASIGNADA') : 'PARTICULAR'}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)]">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Propietario / Titular</p>
                  <p className="mt-1.5 text-lg font-black text-slate-800 dark:text-slate-200 line-clamp-2">
                    {consultaResult.propietario || 'NO REGISTRADO'}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)]">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Estado Formal</p>
                  <div className="mt-2">
                    {isVehiculoFormal(consultaResult) ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-3 py-1.5 text-sm font-bold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                        <Icon name="checkCircle" className="size-4 shrink-0" /> FORMAL
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-1.5 text-sm font-bold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                        <Icon name="alertTriangle" className="size-4 shrink-0" /> INFORMAL
                      </span>
                    )}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)]">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Estado Padrón</p>
                  <div className="mt-2">
                    {consultaResult.esDelPadron ? (
                      <StatusBadge status={consultaResult.estado || 'ACTIVO'} />
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-200 px-3 py-1.5 text-sm font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                        <Icon name="x" className="size-4 shrink-0" /> NO REGISTRADO
                      </span>
                    )}
                  </div>
                </div>
             </div>
           </div>
        )}

        <VehiculoDetalleModal
          selectedVehiculo={isDetailModalOpen ? selectedVehiculo : null}
          onClose={() => setIsDetailModalOpen(false)}
          isVehiculoFormal={isVehiculoFormal}
          buildVehiculoQrValue={buildVehiculoQrValue}
          getVehiculoDocumento={getVehiculoDocumento}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {loadError && <PageLoadError message={loadError} />}

      {/* Cabecera Principal */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25">
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
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-indigo-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
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
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-emerald-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
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
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-amber-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Informales</span>
            <span className="grid size-6 place-items-center rounded-md bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 font-bold text-xs"><Icon name="alert" className="size-3.5" /></span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">{new Intl.NumberFormat('es-PE').format(informales)}</p>
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded-md">Sin Asoc.</span>
          </div>
        </div>

        {/* 4. Observados / Baja */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-rose-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
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

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-[var(--border)]">
        <button
          type="button"
          onClick={() => setFilterEstado(filterEstado === 'FORMAL' ? 'TODOS' : 'FORMAL')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-xs font-extrabold transition-all cursor-pointer ${
            filterEstado === 'FORMAL'
              ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Icon name="shieldCheck" className="size-4" />
          <span>Vehículos Formal ({formales})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterEstado(filterEstado === 'INFORMAL' ? 'TODOS' : 'INFORMAL')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-xs font-extrabold transition-all cursor-pointer ${
            filterEstado === 'INFORMAL'
              ? 'border-amber-500 text-amber-600 dark:border-amber-400 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Icon name="alert" className="size-4" />
          <span>Vehículos Informal ({informales})</span>
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-[var(--border)] dark:bg-[var(--bg-surface)] overflow-hidden">
        <div className="flex flex-col gap-2.5 border-b border-slate-100 px-4 py-2.5 dark:border-[var(--border)] sm:flex-row sm:items-center sm:justify-between">

          <div className="relative flex-1">
            <Icon name="search" className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por placa, marca, modelo, DNI o propietario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-1.5 pl-9 pr-8 text-xs text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white dark:focus:bg-[var(--bg-subtle)] focus:ring-2 focus:ring-blue-500/20 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-white dark:focus:border-blue-400"
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
            <RoundedSelect
              value={filterTipo}
              onChange={setFilterTipo}
              options={[
                { value: 'TODOS', label: 'Todos los tipos' },
                { value: 'Mototaxi (Trimovil)', label: 'Mototaxi (Trimovil)' },
                { value: 'Automóvil (Sedán/Hatchback)', label: 'Automóvil (Sedán/Hatchback)' },
                { value: 'Camioneta Rural (Combi)', label: 'Camioneta Rural (Combi)' },
                { value: 'Moto Lineal', label: 'Moto Lineal' }
              ]}
            />

            <RoundedSelect
              value={filterActivo}
              onChange={setFilterActivo}
              options={[
                { value: 'TODOS', label: 'Todos los estados' },
                { value: 'ACTIVO', label: 'Activos' },
                { value: 'INACTIVO', label: 'Inactivos' }
              ]}
            />

            {(filterTipo !== 'TODOS' || filterActivo !== 'TODOS' || searchTerm !== '') && (
              <button
                type="button"
                onClick={() => {
                  setFilterTipo('TODOS')
                  setFilterActivo('TODOS')
                  setSearchTerm('')
                }}
                title="Limpiar filtros"
                className="grid size-8.5 place-items-center rounded-xl border border-rose-200/80 bg-rose-50/70 text-rose-600 hover:bg-rose-100 hover:text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60 transition-all active:scale-95 cursor-pointer shadow-2xs"
              >
                <Icon name="filterX" className="size-4" />
              </button>
            )}

            {isOffice && (
              <>
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
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 px-3.5 py-1.5 text-xs font-extrabold text-white shadow-md shadow-blue-600/20 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-600/30 active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <span className="text-base leading-none font-black">+</span>
                  <span>Nuevo Vehículo</span>
                </button>
              </>
            )}
          </div>
        </div>





        <div className="overflow-x-auto overscroll-x-contain" role="region" aria-label="Listado de vehículos" tabIndex={0}>
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50/75 dark:bg-[var(--bg-subtle)] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-[var(--border)]">
              <tr>
                <th className="px-3.5 py-2.5 whitespace-nowrap">Placa</th>
                <th className="px-3.5 py-2.5 whitespace-nowrap">Vehículo & Modelo</th>
                <th className="px-3.5 py-2.5 whitespace-nowrap">Asociación / Empresa</th>
                <th className="px-3.5 py-2.5 whitespace-nowrap">Propietario & Titular</th>
                <th className="px-3.5 py-2.5 whitespace-nowrap">Serie Chasis / SUNARP</th>
                <th className="px-3.5 py-2.5 whitespace-nowrap text-center">Estado</th>
                <th className="sticky right-0 z-10 bg-slate-50/75 dark:bg-[var(--bg-subtle)] px-3 py-3.5 text-center whitespace-nowrap shadow-[-4px_0_8px_rgba(0,0,0,0.03)]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[var(--border)]">
              {isLoading && vehiculos.length === 0 ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-3.5 py-2.5"><div className="h-6 w-20 rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                    <td className="px-3.5 py-2.5">
                      <div className="space-y-1.5">
                        <div className="h-3.5 w-32 rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" />
                        <div className="h-2.5 w-20 rounded bg-slate-100 dark:bg-[var(--bg-subtle)]" />
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5"><div className="h-4 w-28 rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                    <td className="px-3.5 py-2.5"><div className="h-4 w-28 rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                    <td className="px-3.5 py-2.5"><div className="h-4 w-24 rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                    <td className="px-3.5 py-2.5 text-center"><div className="mx-auto h-5 w-20 rounded-full bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                    <td className="sticky right-0 z-10 bg-white dark:bg-[var(--bg-surface)] px-3 py-4 shadow-[-4px_0_8px_rgba(0,0,0,0.03)]"><div className="mx-auto h-7 w-20 rounded-lg bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                  </tr>
                ))
              ) : filteredVehiculos.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center">
                    <Icon name="vehicle" className="size-10 mb-2 mx-auto text-slate-300 dark:text-slate-600" />
                    <p className="font-bold text-slate-600 dark:text-slate-300">No se encontraron vehículos</p>
                  </td>
                </tr>
              ) : (
                paginatedVehiculos.map((v) => (
                  <tr
                    key={v.id}
                    className="group transition-colors hover:bg-cyan-50/30 dark:hover:bg-[var(--bg-subtle)]"
                  >

                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <span className="inline-flex items-center justify-center rounded-lg border-2 border-slate-900 bg-amber-300 px-3 py-1 font-mono text-xs font-black tracking-widest text-slate-950 shadow-xs dark:border-[var(--border)] dark:bg-amber-400 dark:text-slate-950">
                        {v.placa}
                      </span>
                    </td>


                    <td className="px-3.5 py-2.5">
                      <p className="font-extrabold leading-tight text-slate-800 dark:text-white" title={`${v.marca} ${v.modelo}`}>
                        {v.marca} {v.modelo}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-slate-400">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-600 dark:bg-[var(--bg-subtle)] dark:text-slate-300">
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
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
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
                      <StatusBadge status={v.estado || 'ACTIVO'} />
                    </td>


                    <td className="sticky right-0 z-10 bg-white dark:bg-[var(--bg-surface)] px-3 py-3.5 whitespace-nowrap shadow-[-4px_0_8px_rgba(0,0,0,0.03)] transition-colors group-hover:bg-cyan-50/30 dark:group-hover:bg-slate-800/40 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(v)}
                          title="Ver Ficha Técnica"
                          className="size-8 rounded-lg border-[1.5px] grid place-items-center transition-all cursor-pointer shadow-xs active:scale-95 bg-[var(--action-eye-bg)] border-[var(--action-eye-border)] text-[var(--action-eye-text)] hover:bg-[var(--action-eye-hover)] hover:border-[var(--action-eye-hover)] hover:text-white"
                        >
                          <Icon name="eye" className="size-4" />
                        </button>
                        {isOffice && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(v)}
                              title="Editar Vehículo"
                              className="size-8 rounded-lg border-[1.5px] grid place-items-center transition-all cursor-pointer shadow-xs active:scale-95 bg-[var(--action-edit-bg)] border-[var(--action-edit-border)] text-[var(--action-edit-text)] hover:bg-[var(--action-edit-hover)] hover:border-[var(--action-edit-hover)] hover:text-white"
                            >
                              <Icon name="pencil" className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(v.id)}
                              title="Eliminar Vehículo"
                              className="size-8 rounded-lg border-[1.5px] grid place-items-center transition-all cursor-pointer shadow-xs active:scale-95 bg-[var(--action-del-bg)] border-[var(--action-del-border)] text-[var(--action-del-text)] hover:bg-[var(--action-del-hover)] hover:border-[var(--action-del-hover)] hover:text-white"
                            >
                              <Icon name="trash" className="size-4" />
                            </button>
                          </>
                        )}
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
        <VehiculoFormModal
          isEditing={isEditing}
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleFormSubmit}
          onClose={() => setIsModalOpen(false)}
          propietarioSearch={propietarioSearch}
          setPropietarioSearch={setPropietarioSearch}
          showPropietarioResults={showPropietarioResults}
          setShowPropietarioResults={setShowPropietarioResults}
          propietarioResults={propietarioResults}
          getPersonaNombre={getPersonaNombre}
          selectPropietario={selectPropietario}
          personas={personas}
          asociacionSearch={asociacionSearch}
          setAsociacionSearch={setAsociacionSearch}
          showAsociacionResults={showAsociacionResults}
          setShowAsociacionResults={setShowAsociacionResults}
          asociacionResults={asociacionResults}
          selectAsociacion={selectAsociacion}
          clearAsociacion={clearAsociacion}
        />
      )}


      {isDetailModalOpen && (
        <VehiculoDetalleModal
          selectedVehiculo={selectedVehiculo}
          onClose={() => setIsDetailModalOpen(false)}
          isVehiculoFormal={isVehiculoFormal}
          buildVehiculoQrValue={buildVehiculoQrValue}
          getVehiculoDocumento={getVehiculoDocumento}
        />
      )}
    </div>
  )
}
