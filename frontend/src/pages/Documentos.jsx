import { useEffect, useState, useRef } from 'react'
import { Icon } from '../components/ui/Icon'
import { Pagination } from '../components/ui/Pagination'
import { apiFetch, getCachedData, setCachedData, invalidateCache } from '../config/api'
import { PlantillaImpresionTUC } from '../components/documentos/PlantillaImpresionTUC'

export function Documentos() {
  const [documentos, setDocumentos] = useState([])
  const [vehiculos, setVehiculos] = useState([])
  const [inspecciones, setInspecciones] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTipo, setFilterTipo] = useState('TODOS')
  const [filterEstado, setFilterEstado] = useState('TODOS')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(8)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [isEditing, setIsEditing] = useState(false)

  // Autocompletado / Búsqueda de Placa Vehicular
  const [isPlacaDropdownOpen, setIsPlacaDropdownOpen] = useState(false)
  const placaDropdownRef = useRef(null)
  const fileInputRef = useRef(null)

  const [formData, setFormData] = useState({
    vehiculoPlaca: '',
    tipoDocumento: 'TARJETA_OPERATIVIDAD',
    codigo: '',
    resMunicipal: 'R.M. N° 045-2024-MDJLO/GSCyT',
    direccion: 'AV. JOSÉ LEONARDO ORTIZ 450 - CHICLAYO',
    fechaExpedicion: new Date().toISOString().split('T')[0],
    fechaExpiracion: '2027-12-31',
    estado: 'VIGENTE',
    propietario: '',
    propietarioDni: '',
    asociacion: '',
    aseguradora: '',
    numeroLicencia: '',
    fotoConductor: '',
    conductorNombres: '',
    conductorDni: '',
    idInspeccion: '',
    numeroInspeccion: '',
    checklist: {
      luces: true,
      frenos: true,
      chasis: true,
      neumaticos: true,
      seguridad: true,
    },
    resultadoInspeccion: 'APROBADO',
    observacionesInspeccion: '',
    inspectorTecnico: 'Ing. Carlos Mendoza (CIP 148201)',
  })

  // Cargar datos frescos del backend
  const loadData = () => {
    setIsLoading(true)
    Promise.all([
      apiFetch('/documentos').then((response) => (response.ok ? response.json() : Promise.reject(response))),
      apiFetch('/vehiculos').then((response) => (response.ok ? response.json() : Promise.reject(response))),
      apiFetch('/inspecciones')
        .then((response) => (response.ok ? response.json() : Promise.reject(response)))
        .catch(() => ({ data: [] })),
    ])
      .then(([docsPayload, vehPayload, inspPayload]) => {
        const dData = docsPayload.data ?? []
        const vData = vehPayload.data ?? []
        const iData = inspPayload.data ?? []
        setDocumentos(dData)
        setVehiculos(vData)
        setInspecciones(iData)
        setCachedData('/documentos', dData)
        setCachedData('/vehiculos', vData)
        setCachedData('/inspecciones', iData)
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    invalidateCache()
    loadData()
  }, [])

  // Cerrar dropdown de placa al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (placaDropdownRef.current && !placaDropdownRef.current.contains(event.target)) {
        setIsPlacaDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const totalDocs = documentos.length
  const vigentes = documentos.filter((d) => d.estado === 'VIGENTE').length
  const enTramite = documentos.filter((d) => d.estado === 'EN_TRAMITE').length
  const vencidos = documentos.filter((d) => d.estado === 'VENCIDO').length
  const porcentajeVigentes = totalDocs > 0 ? Math.round((vigentes / totalDocs) * 100) : 0

  const filteredDocs = documentos.filter((d) => {
    const fullSearch = `${d.codigo} ${d.vehiculoPlaca} ${d.propietario || ''} ${d.conductorNombres || ''} ${d.asociacion || ''} ${d.tipoDocumento} ${d.aseguradora || ''} ${d.resMunicipal || ''}`.toLowerCase()
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

  // Inspección técnica aprobada para el vehículo seleccionado
  const getApprovedInspectionForVehicle = (placa) => {
    return inspecciones.find((i) => i.vehiculoPlaca === placa && i.resultado === 'APROBADO')
  }

  // Filtrar placas según lo que el usuario escribe en el input
  const filteredPlacas = vehiculos.filter((v) =>
    v.placa.toLowerCase().includes((formData.vehiculoPlaca || '').toLowerCase())
  )

  const handleOpenCreateModal = () => {
    const defaultVeh = vehiculos[0]
    const approvedInsp = defaultVeh ? getApprovedInspectionForVehicle(defaultVeh.placa) : null

    setFormData({
      vehiculoPlaca: defaultVeh?.placa || '',
      tipoDocumento: 'TARJETA_OPERATIVIDAD',
      codigo: `TUC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      resMunicipal: 'R.M. N° 045-2024-MDJLO/GSCyT',
      direccion: 'AV. JOSÉ LEONARDO ORTIZ 450 - CHICLAYO',
      fechaExpedicion: new Date().toISOString().split('T')[0],
      fechaExpiracion: '2027-12-31',
      estado: 'VIGENTE',
      propietario: defaultVeh?.propietario || '',
      propietarioDni: defaultVeh?.propietarioDni || '45892140',
      asociacion: defaultVeh?.asociacion || 'Independiente',
      aseguradora: '',
      numeroLicencia: defaultVeh?.propietarioLicencia || 'Q-45892140',
      fotoConductor: '',
      conductorNombres: defaultVeh?.propietario || '',
      conductorDni: defaultVeh?.propietarioDni || '45892140',
      idInspeccion: approvedInsp ? approvedInsp.id : '',
      numeroInspeccion: approvedInsp ? approvedInsp.numeroInspeccion : '',
      checklist: {
        luces: true,
        frenos: true,
        chasis: true,
        neumaticos: true,
        seguridad: true,
      },
      resultadoInspeccion: 'APROBADO',
      observacionesInspeccion: '',
      inspectorTecnico: 'Ing. Carlos Mendoza (CIP 148201)',
    })
    setIsEditing(false)
    setIsPlacaDropdownOpen(false)
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (doc) => {
    setSelectedDoc(doc)
    setFormData({
      vehiculoPlaca: doc.vehiculoPlaca || '',
      tipoDocumento: doc.tipoDocumento === 'CITV' ? 'INSPECCION_TECNICA' : doc.tipoDocumento,
      codigo: doc.codigo || '',
      resMunicipal: doc.resMunicipal || 'R.M. N° 045-2024-MDJLO/GSCyT',
      direccion: doc.direccion || 'AV. JOSÉ LEONARDO ORTIZ 450 - CHICLAYO',
      fechaExpedicion: doc.fechaExpedicion || '',
      fechaExpiracion: doc.fechaExpiracion || '',
      estado: doc.estado || 'VIGENTE',
      propietario: doc.propietario || '',
      propietarioDni: doc.propietarioDni || '',
      asociacion: doc.asociacion || '',
      aseguradora: doc.aseguradora || '',
      numeroLicencia: doc.numeroLicencia || '',
      fotoConductor: doc.fotoConductor || '',
      conductorNombres: doc.conductorNombres || '',
      conductorDni: doc.conductorDni || doc.propietarioDni || '',
      idInspeccion: doc.idInspeccion || '',
      numeroInspeccion: doc.numeroInspeccion || '',
      checklist: {
        luces: true,
        frenos: true,
        chasis: true,
        neumaticos: true,
        seguridad: true,
      },
      resultadoInspeccion: 'APROBADO',
      observacionesInspeccion: '',
      inspectorTecnico: 'Ing. Carlos Mendoza (CIP 148201)',
    })
    setIsEditing(true)
    setIsPlacaDropdownOpen(false)
    setIsModalOpen(true)
  }

  const prepararDocCompleto = (doc) => {
    const veh = vehiculos.find((v) => v.placa === doc.vehiculoPlaca)
    const approvedInsp = getApprovedInspectionForVehicle(doc.vehiculoPlaca)
    return {
      ...doc,
      vehiculoMarca: doc.vehiculoMarca || veh?.marca || 'WANXIN',
      vehiculoModelo: doc.vehiculoModelo || veh?.modelo || 'WX-200',
      vehiculoColor: doc.vehiculoColor || veh?.color || 'AZUL',
      vehiculoAnio: doc.vehiculoAnio || veh?.anio || '2024',
      vehiculoMotor: doc.vehiculoMotor || veh?.serieMotor || '162FMJ-98214',
      vehiculoSerie: doc.vehiculoSerie || veh?.numeroSerie || 'LBBX200-84721',
      vehiculoCarroceria: doc.vehiculoCarroceria || veh?.carroceria || 'TRIMOVIL PASAJEROS',
      vehiculoPartidaRegistral: doc.vehiculoPartidaRegistral || veh?.partidaRegistral || '11482910 (SUNARP)',
      propietarioDni: doc.propietarioDni || veh?.propietarioDni || '45892140',
      conductorDni: doc.conductorDni || doc.propietarioDni || veh?.propietarioDni || '45892140',
      resMunicipal: doc.resMunicipal || 'R.M. N° 045-2024-MDJLO/GSCyT',
      direccion: doc.direccion || 'AV. JOSÉ LEONARDO ORTIZ 450 - CHICLAYO',
      numeroInspeccion: doc.numeroInspeccion || approvedInsp?.numeroInspeccion || 'CAV-2026-APROBADO',
      asociacion: doc.asociacion || veh?.asociacion || 'Independiente',
      numeroLicencia: doc.numeroLicencia || veh?.propietarioLicencia || 'B-IIc',
      conductorNombres: doc.conductorNombres || doc.propietario || veh?.propietario || 'CONDUCTOR AUTORIZADO',
    }
  }

  const handleOpenPreview = (doc) => {
    setSelectedDoc(prepararDocCompleto(doc))
    setIsPreviewModalOpen(true)
  }

  // Manejo de Impresión Oficial: Se monta el contenedor #seccion-impresion y se activa window.print()
  const handlePrint = (doc) => {
    const fullDoc = prepararDocCompleto(doc)
    setSelectedDoc(fullDoc)
    setIsPreviewModalOpen(true)
    setTimeout(() => {
      window.print()
    }, 300)
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

  const handleVehicleChange = (placa) => {
    const veh = vehiculos.find((v) => v.placa === placa)
    const approvedInsp = getApprovedInspectionForVehicle(placa)

    setFormData((prev) => ({
      ...prev,
      vehiculoPlaca: placa,
      propietario: veh ? veh.propietario : prev.propietario,
      propietarioDni: veh?.propietarioDni || prev.propietarioDni,
      asociacion: veh ? veh.asociacion : prev.asociacion,
      idInspeccion: approvedInsp ? approvedInsp.id : prev.idInspeccion,
      numeroInspeccion: approvedInsp ? approvedInsp.numeroInspeccion : prev.numeroInspeccion,
      conductorNombres: prev.tipoDocumento === 'CURSO_VIAL' && !prev.conductorNombres ? (veh?.propietario || '') : prev.conductorNombres,
      numeroLicencia: prev.tipoDocumento === 'CURSO_VIAL' && !prev.numeroLicencia ? (veh?.propietarioLicencia || 'Q-45892140') : prev.numeroLicencia,
    }))
  }

  const handleDocTypeChange = (tipo) => {
    let prefix = 'DOC'
    if (tipo === 'TARJETA_OPERATIVIDAD') prefix = 'TUC'
    else if (tipo === 'CURSO_VIAL') prefix = 'CSV'
    else if (tipo === 'CERTICAV') prefix = 'CAV'
    else if (tipo === 'SOAT') prefix = 'SOAT'
    else if (tipo === 'INSPECCION_TECNICA') prefix = 'INSP'

    const approvedInsp = getApprovedInspectionForVehicle(formData.vehiculoPlaca)
    const veh = vehiculos.find((v) => v.placa === formData.vehiculoPlaca)

    setFormData((prev) => ({
      ...prev,
      tipoDocumento: tipo,
      codigo: `${prefix}-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      idInspeccion: tipo === 'TARJETA_OPERATIVIDAD' && approvedInsp ? approvedInsp.id : prev.idInspeccion,
      numeroInspeccion: tipo === 'TARJETA_OPERATIVIDAD' && approvedInsp ? approvedInsp.numeroInspeccion : prev.numeroInspeccion,
      conductorNombres: tipo === 'CURSO_VIAL' && !prev.conductorNombres ? (veh?.propietario || '') : prev.conductorNombres,
      numeroLicencia: tipo === 'CURSO_VIAL' && !prev.numeroLicencia ? (veh?.propietarioLicencia || 'Q-45892140') : prev.numeroLicencia,
      resMunicipal: prev.resMunicipal || 'R.M. N° 045-2024-MDJLO/GSCyT',
    }))
  }

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      alert('La fotografía del conductor no debe superar los 2MB.')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, fotoConductor: reader.result }))
    }
    reader.readAsDataURL(file)
  }

  const handleChecklistToggle = (key) => {
    setFormData((prev) => {
      const updatedChecklist = {
        ...prev.checklist,
        [key]: !prev.checklist[key],
      }
      const allPassed = Object.values(updatedChecklist).every(Boolean)
      return {
        ...prev,
        checklist: updatedChecklist,
        resultadoInspeccion: allPassed ? 'APROBADO' : 'DESAPROBADO',
      }
    })
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()

    if (!formData.codigo.trim() || !formData.vehiculoPlaca.trim()) {
      alert('Por favor completa los campos requeridos de código y placa.')
      return
    }

    // 1. REGLA: Al seleccionar "Tarjeta de Operatividad", exigir vinculación a Res. Municipal y CertiCAV Aprobado
    if (formData.tipoDocumento === 'TARJETA_OPERATIVIDAD') {
      if (!formData.resMunicipal || !formData.resMunicipal.trim()) {
        alert('Para emitir la Tarjeta de Operatividad es obligatorio indicar la Resolución Municipal de Autorización.')
        return
      }
      if (!formData.numeroInspeccion || !formData.numeroInspeccion.trim()) {
        alert('Para emitir la Tarjeta de Operatividad es obligatorio vincular un CertiCAV (Inspección Técnica) en estado APROBADO.')
        return
      }
    }

    // 2. REGLA: Al seleccionar "Curso Vial", exigir N° de Licencia
    if (formData.tipoDocumento === 'CURSO_VIAL') {
      if (!formData.numeroLicencia || !formData.numeroLicencia.trim()) {
        alert('Para emitir el Carnet de Seguridad Vial (Curso Vial) es obligatorio registrar el N° de Licencia de Conducir.')
        return
      }
    }

    // Validación de fechas
    if (new Date(formData.fechaExpiracion) < new Date(formData.fechaExpedicion)) {
      alert('La fecha de vencimiento no puede ser anterior a la fecha de expedición.')
      return
    }

    try {
      if (isEditing) {
        const res = await apiFetch(`/documentos/${selectedDoc.id}`, {
          method: 'PUT',
          body: formData,
        })
        const resData = await res.json()
        if (!res.ok) {
          alert(resData.messages?.error || resData.message || 'Error al actualizar el documento.')
          return
        }
        setDocumentos(documentos.map((d) => (d.id === selectedDoc.id ? { ...d, ...formData } : d)))
      } else {
        const res = await apiFetch('/documentos', {
          method: 'POST',
          body: formData,
        })
        const resData = await res.json()
        if (!res.ok) {
          alert(resData.messages?.error || resData.message || 'Error al registrar el documento.')
          return
        }
        const newDoc = resData.data || {
          ...formData,
          id: Date.now(),
        }
        setDocumentos([newDoc, ...documentos])
      }
      setIsModalOpen(false)
    } catch (err) {
      alert('Error de comunicación con el servidor al registrar el documento.')
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
      case 'CURSO_VIAL':
        return (
          <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            Carnet Curso Vial
          </span>
        )
      case 'CERTICAV':
        return (
          <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-extrabold text-purple-800 dark:bg-purple-950 dark:text-purple-300">
            CertiCAV (Inspección Técnica)
          </span>
        )
      case 'SOAT':
        return (
          <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            SOAT Vehicular
          </span>
        )
      case 'INSPECCION_TECNICA':
      case 'CITV':
        return (
          <span className="rounded-md bg-cyan-100 px-2 py-0.5 text-[10px] font-extrabold text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300">
            Inspección Técnica
          </span>
        )
      default:
        return (
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-800 dark:bg-slate-800 dark:text-slate-300">
            {tipo}
          </span>
        )
    }
  }

  const currentApprovedInsp = getApprovedInspectionForVehicle(formData.vehiculoPlaca)

  return (
    <div className="space-y-6">
      {/* Cabecera del Módulo */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
            <Icon name="document" className="size-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                Emisión de TUCs, Carnets e Inspecciones
              </h1>
            </div>
            <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              Control de Tarjetas Únicas de Circulación (TUC), Carnet de Seguridad Vial (Curso Vial), CertiCAV y SOAT.
            </p>
          </div>
        </div>
      </div>

      {/* Tarjetas de Métricas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Emitidos</span>
            <span className="grid size-10 place-items-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400">
              <Icon name="document" className="size-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-800 dark:text-white">
              {new Intl.NumberFormat('es-PE').format(totalDocs)}
            </p>
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-full">
              Padrón 2026
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Documentos municipales</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Vigentes</span>
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 font-bold">
              ✓
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-800 dark:text-white">
              {new Intl.NumberFormat('es-PE').format(vigentes)}
            </p>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
              {porcentajeVigentes}% al día
            </span>
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
            <span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 font-bold">
              ⏳
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-800 dark:text-white">
              {new Intl.NumberFormat('es-PE').format(enTramite)}
            </p>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
              Pendientes
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">En revisión o firma</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-500 dark:text-rose-400">Expirados</span>
            <span className="grid size-10 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 font-bold">
              ✕
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-800 dark:text-white">
              {new Intl.NumberFormat('es-PE').format(vencidos)}
            </p>
            <span className="text-xs font-bold text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full">
              Expirados
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Requieren renovación</p>
        </div>
      </div>

      {/* Tabla y Filtros */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-[#0f172a] overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Icon name="search" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por N° Código, placa, titular, conductor, aseguradora..."
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
            {/* Combo de Tipos Oficiales */}
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-700 outline-none transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="TODOS">Todos los tipos</option>
              <option value="TARJETA_OPERATIVIDAD">Tarjeta de Operatividad (TUC)</option>
              <option value="CURSO_VIAL">Carnet Curso Vial</option>
              <option value="CERTICAV">CertiCAV (Inspección)</option>
              <option value="SOAT">SOAT Vehicular</option>
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
            Emisión Oficial MDJLO · Impresión optimizada a doble cara y formato A4
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
              <tr>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Documento / Código</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Placa Vehicular</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Titular / Conductor</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Detalle / Requisito</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Emisión</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Vencimiento</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Estado</th>
                <th className="sticky right-0 z-20 bg-slate-50/95 dark:bg-slate-900/95 px-4 py-3.5 text-right whitespace-nowrap border-l border-slate-200/60 dark:border-slate-800 shadow-[-4px_0_8px_rgba(0,0,0,0.03)] dark:shadow-[-4px_0_8px_rgba(0,0,0,0.2)]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading && documentos.length === 0 ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-3.5 py-4"><div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-3.5 py-4"><div className="h-6 w-20 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-3.5 py-4"><div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-3.5 py-4"><div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-3.5 py-4"><div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-3.5 py-4"><div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-3.5 py-4"><div className="h-5 w-16 rounded-full bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="sticky right-0 z-10 bg-white dark:bg-[#0f172a] px-4 py-4 text-right border-l border-slate-100 dark:border-slate-800">
                      <div className="h-7 w-20 ml-auto rounded-lg bg-slate-200 dark:bg-slate-800" />
                    </td>
                  </tr>
                ))
              ) : filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-5 py-12 text-center text-slate-400">
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
                paginatedDocs.map((d) => {
                  const isDocCursoVial = d.tipoDocumento === 'CURSO_VIAL'
                  const titularDisplay = isDocCursoVial ? (d.conductorNombres || d.propietario) : d.propietario

                  return (
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

                      <td className="px-3.5 py-3.5 max-w-[170px]">
                        <div className="flex items-center gap-2">
                          {d.fotoConductor ? (
                            <img
                              src={d.fotoConductor}
                              alt=""
                              className="size-7 rounded-full object-cover shrink-0 border border-emerald-400"
                            />
                          ) : isDocCursoVial ? (
                            <span className="size-7 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 grid place-items-center text-xs shrink-0">
                              👤
                            </span>
                          ) : null}
                          <div className="truncate">
                            <p
                              className="font-bold text-xs truncate text-slate-800 dark:text-slate-100"
                              title={titularDisplay}
                            >
                              {titularDisplay || '—'}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate max-w-[140px]" title={d.asociacion}>
                              {d.asociacion || 'Independiente'}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-3.5 py-3.5 whitespace-nowrap">
                        {d.tipoDocumento === 'SOAT' && d.aseguradora ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                            🛡️ {d.aseguradora}
                          </span>
                        ) : d.tipoDocumento === 'CURSO_VIAL' ? (
                          <div className="text-xs">
                            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                              Lic: {d.numeroLicencia || 'B-IIc'}
                            </span>
                          </div>
                        ) : d.tipoDocumento === 'TARJETA_OPERATIVIDAD' ? (
                          <div className="text-xs space-y-0.5">
                            <div className="font-mono text-[10.5px] font-bold text-blue-700 dark:text-blue-300">
                              {d.resMunicipal ? `Res: ${d.resMunicipal}` : 'R.M. Vinculada'}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Insp: {d.numeroInspeccion || 'CertiCAV Aprobado'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 font-mono">
                            {d.numeroInspeccion || 'CertiCAV Oficial'}
                          </span>
                        )}
                      </td>

                      <td className="px-3.5 py-3.5 whitespace-nowrap">
                        <p className="font-mono font-semibold text-slate-700 dark:text-slate-300 text-xs">
                          {d.fechaExpedicion}
                        </p>
                      </td>

                      <td className="px-3.5 py-3.5 whitespace-nowrap">
                        <p className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                          {d.fechaExpiracion}
                        </p>
                      </td>

                      <td className="px-3.5 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold ${
                            d.estado === 'VIGENTE'
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
                            onClick={() => handlePrint(d)}
                            title="Imprimir Carnet Oficial / TUC Digital"
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
                  )
                })
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

      {/* Modal Emitir / Editar Documento Dinámico */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-enter">
          <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800">
            
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-blue-900/20 bg-[#123b6d] px-6 py-4.5 text-white dark:border-slate-800 dark:bg-[#102a4d]">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-white/10 text-cyan-300">
                  <Icon name="document" className="size-5" />
                </span>
                <div>
                  <h3 className="text-lg font-extrabold text-white">
                    {isEditing ? 'Editar Documento Municipal' : 'Emitir Nuevo Documento Oficial'}
                  </h3>
                  <p className="text-xs text-blue-100/80">
                    Módulo Dinámico: Tarjeta de Operatividad, Curso Vial, CertiCAV y SOAT
                  </p>
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
              
              {/* Información Base del Documento */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-3 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-600" />
                  Información Base del Documento
                </h4>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  
                  {/* Selector / Autocompletado de Placa Vehicular */}
                  <div className="relative" ref={placaDropdownRef}>
                    <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-emerald-600 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-4 focus-within:ring-emerald-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-emerald-400">
                      <input
                        id="doc_veh_placa"
                        type="text"
                        required
                        placeholder=" "
                        autoComplete="off"
                        value={formData.vehiculoPlaca}
                        onFocus={() => setIsPlacaDropdownOpen(true)}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase().trim()
                          handleVehicleChange(val)
                          setIsPlacaDropdownOpen(true)
                        }}
                        className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-mono font-black tracking-wider text-slate-800 outline-none dark:text-white"
                      />
                      <label
                        htmlFor="doc_veh_placa"
                        className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400"
                      >
                        Placa Vehicular Asignada *
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsPlacaDropdownOpen(!isPlacaDropdownOpen)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs p-1 cursor-pointer"
                        tabIndex={-1}
                      >
                        ▼
                      </button>
                    </div>

                    {isPlacaDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-40 max-h-48 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-[#0f172a] text-xs">
                        {filteredPlacas.length === 0 ? (
                          <div className="px-3 py-2.5 text-center text-slate-400 font-medium">
                            No se encontraron vehículos registrados
                          </div>
                        ) : (
                          filteredPlacas.map((v) => (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => {
                                handleVehicleChange(v.placa)
                                setIsPlacaDropdownOpen(false)
                              }}
                              className={`w-full text-left px-3 py-2 rounded-xl font-mono font-black text-xs transition flex items-center justify-between cursor-pointer ${
                                formData.vehiculoPlaca === v.placa
                                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : 'text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/80'
                              }`}
                            >
                              <span>{v.placa}</span>
                              {formData.vehiculoPlaca === v.placa && (
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">✓</span>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Selector Dinámico de Tipo de Documento */}
                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-emerald-600 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-4 focus-within:ring-emerald-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-emerald-400">
                    <select
                      id="doc_tipo"
                      value={formData.tipoDocumento}
                      onChange={(e) => handleDocTypeChange(e.target.value)}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-bold text-slate-800 outline-none dark:text-white"
                    >
                      <option value="TARJETA_OPERATIVIDAD">Tarjeta de Operatividad (TUC)</option>
                      <option value="CURSO_VIAL">Curso Vial (Carnet de Seguridad Vial)</option>
                      <option value="CERTICAV">CERTICAV (Inspección Técnica)</option>
                      <option value="SOAT">SOAT Vehicular</option>
                    </select>
                    <label
                      htmlFor="doc_tipo"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400"
                    >
                      Tipo de Documento Emisible *
                    </label>
                  </div>

                  {/* Código Correlativo */}
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
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400"
                    >
                      N° Documento / Correlativo *
                    </label>
                  </div>

                  {/* Fecha Expedición */}
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

                  {/* Fecha Vencimiento */}
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

                  {/* Estado */}
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

              {/* ====================================================================
                  CAMPOS DINÁMICOS SEGÚN EL TIPO DE DOCUMENTO SELECCIONADO
                 ==================================================================== */}

              {/* 1. DINÁMICO PARA TARJETA DE OPERATIVIDAD (TUC):
                     Exige vinculación a una Res. Municipal y a un CertiCAV Aprobado */}
              {formData.tipoDocumento === 'TARJETA_OPERATIVIDAD' && (
                <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/60 p-4.5 dark:border-blue-900/60 dark:bg-blue-950/30 space-y-4">
                  <div className="flex items-center justify-between border-b border-blue-200/80 pb-2 dark:border-blue-900/60">
                    <h4 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 flex items-center gap-2">
                      <span className="size-2.5 rounded-full bg-blue-600 animate-pulse" />
                      Requisitos Obligatorios: Resolución Municipal & CertiCAV Aprobado
                    </h4>
                    <span className="rounded-full bg-blue-200/70 text-blue-900 dark:bg-blue-900 dark:text-blue-200 px-2.5 py-0.5 text-[10px] font-bold">
                      Control Legal TUC
                    </span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Campo 1: Resolución Municipal (EXIGIDO) */}
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 block mb-1">
                        Resolución Municipal de Autorización *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.resMunicipal}
                        onChange={(e) => setFormData({ ...formData, resMunicipal: e.target.value })}
                        placeholder="Ej. R.M. N° 045-2024-MDJLO/GSCyT"
                        className="w-full rounded-xl border border-blue-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 dark:border-blue-800 dark:bg-slate-900 dark:text-white"
                      />
                      <p className="text-[11px] text-blue-800 dark:text-blue-300 mt-1">
                        ★ Obligatorio: Resolución que autoriza la operatividad en el distrito.
                      </p>
                    </div>

                    {/* Campo 2: Vinculación a CertiCAV Aprobado (EXIGIDO) */}
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 block mb-1">
                        CertiCAV (Inspección Técnica) Aprobado *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.numeroInspeccion || (currentApprovedInsp?.numeroInspeccion || '')}
                        onChange={(e) => setFormData({ ...formData, numeroInspeccion: e.target.value })}
                        placeholder="Ej. CAV-2026-0089 (Debe estar APROBADO)"
                        className="w-full rounded-xl border border-blue-300 bg-white px-3.5 py-2.5 text-xs font-mono font-bold text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 dark:border-blue-800 dark:bg-slate-900 dark:text-white"
                      />
                      
                      {currentApprovedInsp ? (
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold mt-1 flex items-center gap-1">
                          <span>✓</span> CertiCAV Aprobado detectado en sistema: {currentApprovedInsp.numeroInspeccion} ({currentApprovedInsp.fecha})
                        </p>
                      ) : (
                        <div className="mt-1.5 rounded-lg bg-amber-100 border border-amber-300 p-2 text-[10.5px] text-amber-900 dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-200">
                          ⚠️ <strong>Advertencia Normativa:</strong> El vehículo {formData.vehiculoPlaca || '(sin placa)'} no tiene inspección CertiCAV previa registrada como APROBADO. Verifique el N° de CertiCAV para completar la emisión.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-blue-100 dark:border-blue-900/40">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 block mb-1">
                        Dirección Legal del Titular (Impresión Carnet) *
                      </label>
                      <input
                        type="text"
                        value={formData.direccion}
                        onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                        placeholder="Ej. Av. José Leonardo Ortiz 450"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 block mb-1">
                        Titular / Propietario Validado
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={formData.propietario || '—'}
                        className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        Asociación: <strong>{formData.asociacion || 'Independiente'}</strong>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. DINÁMICO PARA CURSO VIAL (CARNET DE SEGURIDAD VIAL):
                     Debe mostrar N° de Licencia y Carga de Foto del Conductor */}
              {formData.tipoDocumento === 'CURSO_VIAL' && (
                <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/60 p-4.5 dark:border-emerald-900/60 dark:bg-emerald-950/30 space-y-4">
                  <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2 dark:border-emerald-900/60">
                    <h4 className="text-xs font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
                      <span className="size-2.5 rounded-full bg-emerald-600 animate-pulse" />
                      Carnet de Seguridad Vial: Datos de Licencia & Fotografía Digital
                    </h4>
                    <span className="rounded-full bg-emerald-200/70 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200 px-2.5 py-0.5 text-[10px] font-bold">
                      Curso Vial 2026
                    </span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-12 items-center">
                    {/* Previsualización y carga de Foto Digital */}
                    <div className="sm:col-span-4 flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/60 text-center">
                      <div className="size-24 rounded-2xl border-2 border-emerald-500 overflow-hidden bg-slate-100 dark:bg-slate-800 mb-2 flex items-center justify-center shadow-xs">
                        {formData.fotoConductor ? (
                          <img src={formData.fotoConductor} alt="Conductor" className="size-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-400">
                            <span className="text-2xl">📷</span>
                            <span className="text-[10px] font-bold">Sin Fotografía</span>
                          </div>
                        )}
                      </div>

                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700 transition shadow-xs cursor-pointer"
                      >
                        Subir Foto Conductor
                      </button>
                      <p className="text-[10px] text-slate-400 mt-1">Formato carnet (JPG/PNG max 2MB)</p>
                    </div>

                    {/* Campos de texto de Conductor y Licencia */}
                    <div className="sm:col-span-8 space-y-3">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 block mb-1">
                          N° de Licencia de Conducir *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.numeroLicencia}
                          onChange={(e) => setFormData({ ...formData, numeroLicencia: e.target.value.toUpperCase() })}
                          placeholder="Ej. Q45892140 / Categoría B-IIc"
                          className="w-full rounded-xl border border-emerald-300 bg-white px-3.5 py-2.5 text-xs font-mono font-bold text-slate-800 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 dark:border-emerald-800 dark:bg-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 block mb-1">
                          Nombre Completo del Conductor
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.conductorNombres}
                          onChange={(e) => setFormData({ ...formData, conductorNombres: e.target.value })}
                          placeholder="Apellidos y Nombres del Conductor Capacitado"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 block mb-1">
                            DNI del Conductor
                          </label>
                          <input
                            type="text"
                            value={formData.conductorDni}
                            onChange={(e) => setFormData({ ...formData, conductorDni: e.target.value })}
                            placeholder="DNI 8 dígitos"
                            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-mono font-bold text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 block mb-1">
                            Res. de Gerencia
                          </label>
                          <input
                            type="text"
                            value={formData.resMunicipal}
                            onChange={(e) => setFormData({ ...formData, resMunicipal: e.target.value })}
                            placeholder="R.G. N° 018-2025"
                            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. DINÁMICO PARA CERTICAV:
                     Debe desplegar el Checklist de Inspección Técnica (luces, frenos, chasis, etc.) */}
              {formData.tipoDocumento === 'CERTICAV' && (
                <div className="rounded-2xl border-2 border-purple-200 bg-purple-50/60 p-4.5 dark:border-purple-900/60 dark:bg-purple-950/30 space-y-4">
                  <div className="flex items-center justify-between border-b border-purple-200/80 pb-2 dark:border-purple-900/60">
                    <h4 className="text-xs font-black uppercase tracking-wider text-purple-900 dark:text-purple-300 flex items-center gap-2">
                      <span className="size-2.5 rounded-full bg-purple-600 animate-pulse" />
                      Ficha CertiCAV: Checklist Oficial de Inspección Técnica
                    </h4>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                        formData.resultadoInspeccion === 'APROBADO'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      Resultado: {formData.resultadoInspeccion}
                    </span>
                  </div>

                  {/* Checklist interactivo por categorías normativas */}
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {/* Item 1: Luces */}
                    <div className="flex items-center justify-between rounded-xl bg-white p-3 border border-purple-200 dark:bg-slate-900 dark:border-purple-900/50 shadow-2xs">
                      <div>
                        <strong className="text-xs block text-slate-800 dark:text-white">1. Sistema de Luces</strong>
                        <span className="text-[10px] text-slate-400">Faros altas/bajas, direccionales, freno, luz de placa</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleChecklistToggle('luces')}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-black transition cursor-pointer ${
                          formData.checklist.luces
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                        }`}
                      >
                        {formData.checklist.luces ? '✓ Conforme' : '✕ Observado'}
                      </button>
                    </div>

                    {/* Item 2: Frenos */}
                    <div className="flex items-center justify-between rounded-xl bg-white p-3 border border-purple-200 dark:bg-slate-900 dark:border-purple-900/50 shadow-2xs">
                      <div>
                        <strong className="text-xs block text-slate-800 dark:text-white">2. Sistema de Frenos</strong>
                        <span className="text-[10px] text-slate-400">Freno de servicio (pedal), estacionamiento, líquido</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleChecklistToggle('frenos')}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-black transition cursor-pointer ${
                          formData.checklist.frenos
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                        }`}
                      >
                        {formData.checklist.frenos ? '✓ Conforme' : '✕ Observado'}
                      </button>
                    </div>

                    {/* Item 3: Chasis y Carrocería */}
                    <div className="flex items-center justify-between rounded-xl bg-white p-3 border border-purple-200 dark:bg-slate-900 dark:border-purple-900/50 shadow-2xs">
                      <div>
                        <strong className="text-xs block text-slate-800 dark:text-white">3. Chasis & Carrocería</strong>
                        <span className="text-[10px] text-slate-400">Bastidor sin fisuras, toldo reglamentario, asientos</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleChecklistToggle('chasis')}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-black transition cursor-pointer ${
                          formData.checklist.chasis
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                        }`}
                      >
                        {formData.checklist.chasis ? '✓ Conforme' : '✕ Observado'}
                      </button>
                    </div>

                    {/* Item 4: Neumáticos y Dirección */}
                    <div className="flex items-center justify-between rounded-xl bg-white p-3 border border-purple-200 dark:bg-slate-900 dark:border-purple-900/50 shadow-2xs">
                      <div>
                        <strong className="text-xs block text-slate-800 dark:text-white">4. Neumáticos & Dirección</strong>
                        <span className="text-[10px] text-slate-400">Cocada reglamentaria, alineación, amortiguación</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleChecklistToggle('neumaticos')}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-black transition cursor-pointer ${
                          formData.checklist.neumaticos
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                        }`}
                      >
                        {formData.checklist.neumaticos ? '✓ Conforme' : '✕ Observado'}
                      </button>
                    </div>

                    {/* Item 5: Equipamiento de Seguridad */}
                    <div className="flex items-center justify-between rounded-xl bg-white p-3 border border-purple-200 dark:bg-slate-900 dark:border-purple-900/50 shadow-2xs sm:col-span-2">
                      <div>
                        <strong className="text-xs block text-slate-800 dark:text-white">5. Equipamiento de Seguridad</strong>
                        <span className="text-[10px] text-slate-400">Extintor con carga vigente, botiquín de primeros auxilios, cintas reflectivas</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleChecklistToggle('seguridad')}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-black transition cursor-pointer ${
                          formData.checklist.seguridad
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                        }`}
                      >
                        {formData.checklist.seguridad ? '✓ Conforme' : '✕ Observado'}
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-purple-100 dark:border-purple-900/40">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 block mb-1">
                        Inspector Técnico Evaluador
                      </label>
                      <input
                        type="text"
                        value={formData.inspectorTecnico}
                        onChange={(e) => setFormData({ ...formData, inspectorTecnico: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 block mb-1">
                        Resultado de Inspección
                      </label>
                      <select
                        value={formData.resultadoInspeccion}
                        onChange={(e) => setFormData({ ...formData, resultadoInspeccion: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-black text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      >
                        <option value="APROBADO">APROBADO — Emite CertiCAV Válido</option>
                        <option value="DESAPROBADO">DESAPROBADO — Con Observaciones Técnicas</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. DINÁMICO PARA SOAT: Compañía Aseguradora */}
              {formData.tipoDocumento === 'SOAT' && (
                <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/60 p-4.5 dark:border-amber-900/60 dark:bg-amber-950/30 space-y-3">
                  <div className="flex items-center justify-between border-b border-amber-200/80 pb-2 dark:border-amber-900/60">
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center gap-2">
                      <span className="size-2.5 rounded-full bg-amber-600" />
                      Póliza SOAT Vehicular — Registro Externo SBS
                    </h4>
                    <span className="rounded-full bg-amber-200/70 text-amber-900 dark:bg-amber-900 dark:text-amber-200 px-2.5 py-0.5 text-[10px] font-bold">
                      Control Externo
                    </span>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 block mb-1">
                      Compañía Aseguradora Registrada *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.aseguradora}
                      onChange={(e) => setFormData({ ...formData, aseguradora: e.target.value })}
                      placeholder="Ej. La Positiva Seguros, Rímac, Pacífico, Mapfre, Interseguro..."
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {['La Positiva', 'Rímac Seguros', 'Pacífico', 'Mapfre', 'Interseguro'].map((aseg) => (
                        <button
                          key={aseg}
                          type="button"
                          onClick={() => setFormData({ ...formData, aseguradora: aseg })}
                          className="rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300 transition cursor-pointer"
                        >
                          + {aseg}
                        </button>
                      ))}
                    </div>
                  </div>

                  <p className="text-[11px] text-amber-800 dark:text-amber-300 italic pt-1">
                    ℹ️ Nota oficial: El SOAT es expedido por entidades aseguradoras privadas supervisadas por la SBS. Este módulo solo registra la póliza para verificación y fiscalización vehicular; no emite carnet municipal.
                  </p>
                </div>
              )}

              {/* Botones de acción del formulario */}
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
                  {isEditing ? 'Guardar Cambios' : 'Emitir Documento Oficial'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PLANTILLA OFICIAL DE IMPRESIÓN Y CARNET DEDICADA (#seccion-impresion) */}
      {isPreviewModalOpen && selectedDoc && (
        <PlantillaImpresionTUC
          documento={selectedDoc}
          onClose={() => setIsPreviewModalOpen(false)}
        />
      )}
    </div>
  )
}
