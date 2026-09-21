import { useState, useEffect } from 'react'
import { Icon } from '../components/ui/Icon'
import { PageLoadError } from '../components/ui/PageLoadError'
import { useQuickCreate } from '../hooks/useQuickCreate'
import { Pagination } from '../components/ui/Pagination'
import { apiFetch, getCachedData, setCachedData } from '../config/api'
import { CerticavFichaPrint } from '../components/documentos/TarjetaOperatividadPrint'
import { exportToExcel } from '../utils/exportToExcel'

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
  const [loadError, setLoadError] = useState('')

  const [formData, setFormData] = useState({
    vehiculoPlaca: '',
    numeroRegistro: '',
    numeroSerieCerticav: '',
    fecha: new Date().toISOString().split('T')[0],
    inspector: '',
    tecnicoId: '',
    conductorNombre: '',
    conductorDni: '',
    conductorLicencia: '',
    primeraEvaluacion: 'APROBADO',
    segundaEvaluacion: '',
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
    const numSerie = i.numeroSerieCerticav || ('CCV-2026-' + String(i.id || '').padStart(6, '0'))
    const fullSearch = `${i.numeroInspeccion || ''} ${i.numeroRegistro || ''} ${numSerie} ${i.vehiculoPlaca || ''} ${i.inspector || ''} ${i.conductorNombre || ''} ${vehiculo?.propietario || ''} ${vehiculo?.marca || ''} ${vehiculo?.modelo || ''}`.toLowerCase()
    const matchesSearch = fullSearch.includes(searchTerm.toLowerCase().trim())
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

  const handleExportExcel = () => {
    exportToExcel({
      filename: `Inspecciones_Tecnicas_${new Date().toISOString().slice(0, 10)}.xls`,
      sheetName: 'Inspecciones',
      title: 'REGISTRO DE INSPECCIONES TÉCNICAS VEHICULARES - CERTICAV',
      subtitle: 'Subgerencia de Tránsito y Transporte - Control de Seguridad Vial',
      metadata: [
        { label: 'Resultado', value: filterResultado },
        { label: 'Total Registros', value: String(filteredInspecciones.length) }
      ],
      columns: [
        { header: 'N° REGISTRO', key: 'numeroRegistro', isText: true, width: 120, align: 'center' },
        { header: 'SERIE CERTICAV', render: (_, i) => i.numeroSerieCerticav || ('CCV-2026-' + String(i.id || '').padStart(6, '0')), isText: true, width: 140, align: 'center' },
        { header: 'PLACA', key: 'vehiculoPlaca', isText: true, width: 110, align: 'center' },
        { header: 'CONDUCTOR', key: 'conductorNombre', width: 180 },
        { header: 'DNI CONDUCTOR', key: 'conductorDni', isText: true, width: 120, align: 'center' },
        { header: 'LICENCIA', key: 'conductorLicencia', isText: true, width: 120, align: 'center' },
        { header: 'INSPECTOR', key: 'inspector', width: 180 },
        { header: 'FECHA INSPECCIÓN', key: 'fecha', width: 120, align: 'center' },
        { header: 'RESULTADO', key: 'resultado', width: 120, align: 'center' }
      ],
      data: filteredInspecciones
    })
  }

  useEffect(() => {
    setLoadError('')
    apiFetch('/personal').then(r => r.ok ? r.json() : Promise.reject(r)).then(r => setTecnicos((r.data || []).filter(p => p.estado === 'ACTIVO'))).catch(() => setTecnicos([]))
    Promise.all([
      apiFetch('/inspecciones').then(res => res.ok ? res.json() : Promise.reject(res)),
      apiFetch('/inspeccion-criterios').then(res => res.ok ? res.json() : Promise.reject(res)),
      apiFetch('/vehiculos').then(res => res.ok ? res.json() : Promise.reject(res))
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
      setLoadError('No se pudo cargar el módulo de inspecciones.')
      setIsLoading(false)
    })
  }, [])

  const handleOpenCreateModal = () => {
    const defaultTecnico = tecnicos.length > 0 ? tecnicos[0] : null
    const nextReg = 'REG-' + new Date().getFullYear() + '-' + String(inspecciones.length + 101).padStart(5, '0')
    const nextSerie = String(inspecciones.length + 8180).padStart(7, '0')
    setFormData({
      vehiculoPlaca: '',
      numeroRegistro: nextReg,
      numeroSerieCerticav: nextSerie,
      fecha: new Date().toISOString().split('T')[0],
      inspector: defaultTecnico ? `${defaultTecnico.nombres} ${defaultTecnico.apellidos}` : '',
      tecnicoId: defaultTecnico ? defaultTecnico.id : '',
      conductorNombre: '',
      conductorDni: '',
      conductorLicencia: '',
      primeraEvaluacion: 'APROBADO',
      segundaEvaluacion: '',
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
    const vMatch = vehiculos.find((v) => v.placa === inspeccion.vehiculoPlaca)
    setFormData({
      vehiculoPlaca: inspeccion.vehiculoPlaca,
      numeroRegistro: inspeccion.numeroRegistro || inspeccion.numeroInspeccion || '',
      numeroSerieCerticav: inspeccion.numeroSerieCerticav || '',
      fecha: inspeccion.fecha ? String(inspeccion.fecha).split('T')[0] : new Date().toISOString().split('T')[0],
      inspector: inspeccion.inspector || '',
      tecnicoId: inspeccion.tecnicoId || '',
      conductorNombre: inspeccion.conductorNombre || vMatch?.propietario || '',
      conductorDni: inspeccion.conductorDni || vMatch?.propietarioDni || '',
      conductorLicencia: inspeccion.conductorLicencia || vMatch?.propietarioDni || '',
      primeraEvaluacion: inspeccion.primeraEvaluacion || (inspeccion.resultado === 'DESAPROBADO' ? 'DESAPROBADO' : 'APROBADO'),
      segundaEvaluacion: inspeccion.segundaEvaluacion || '',
      resultado: inspeccion.resultado,
      observaciones: inspeccion.observaciones || '',
      detalles: criteriosInspeccion.map((c) => {
        const found = (inspeccion.detalles || []).find((d) => Number(d.criterioId) === c.id)
        return found || { criterioId: c.id, estado: 'BIEN', obs: '' }
      }),
    })
    setSelectedInspeccion(inspeccion)
    setIsModalOpen(true)
  }

  const handlePlacaChange = (val) => {
    const placaUpper = val.toUpperCase()
    const vMatch = vehiculos.find((v) => v.placa.toUpperCase() === placaUpper)
    setFormData((prev) => ({
      ...prev,
      vehiculoPlaca: placaUpper,
      conductorNombre: prev.conductorNombre || (vMatch?.propietario || ''),
      conductorDni: prev.conductorDni || (vMatch?.propietarioDni || ''),
      conductorLicencia: prev.conductorLicencia || (vMatch?.propietarioDni || '')
    }))
  }

  const handleCopiarPropietario = () => {
    const vMatch = vehiculos.find((v) => v.placa === formData.vehiculoPlaca)
    if (vMatch) {
      setFormData((prev) => ({
        ...prev,
        conductorNombre: vMatch.propietario || '',
        conductorDni: vMatch.propietarioDni || '',
        conductorLicencia: vMatch.propietarioDni || ''
      }))
    }
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
    setFormData((prev) => {
      const newDetalles = prev.detalles.map((d) => (d.criterioId === criterioId ? { ...d, [field]: value } : d))

      // Auto-sincronizar el resultado técnico final según el estado de los checks
      let newResultado = prev.resultado
      let newPrimeraEval = prev.primeraEvaluacion
      if (field === 'estado') {
        const hayMalEstado = newDetalles.some((d) => d.estado === 'MAL_ESTADO')
        const hayNoTiene = newDetalles.some((d) => d.estado === 'NO_TIENE')

        if (hayMalEstado || hayNoTiene) {
          if (prev.resultado === 'APROBADO') {
            newResultado = 'OBSERVADO'
          }
        } else {
          newResultado = 'APROBADO'
          newPrimeraEval = 'APROBADO'
        }
      }

      return {
        ...prev,
        detalles: newDetalles,
        resultado: newResultado,
        primeraEvaluacion: newPrimeraEval
      }
    })
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
          const selectedTecnico = tecnicos.find(t => String(t.id) === String(formData.tecnicoId))
          const inspectorName = selectedTecnico ? `${selectedTecnico.nombres} ${selectedTecnico.apellidos}` : (formData.inspector || selectedInspeccion.inspector)
          setInspecciones(inspecciones.map(i => i.id === selectedInspeccion.id ? {
            ...i,
            ...formData,
            inspector: inspectorName
          } : i))
        }
      } else {
        const response = await apiFetch('/inspecciones', {
          method: 'POST',
          body: payload
        })
        const result = await response.json()
        if (response.ok && result.data) {
          const selectedTecnico = tecnicos.find(t => String(t.id) === String(formData.tecnicoId))
          const inspectorName = result.data.inspector || (selectedTecnico ? `${selectedTecnico.nombres} ${selectedTecnico.apellidos}` : (formData.inspector || 'Inspector Técnico Municipal'))
          const newInspeccion = {
            ...result.data,
            ...formData,
            id: result.data.id,
            fecha: formData.fecha || result.data.fecha || new Date().toISOString().split('T')[0],
            inspector: inspectorName,
            detalles: typeof result.data.detalles === 'string' ? JSON.parse(result.data.detalles) : (result.data.detalles || formData.detalles)
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
      {loadError && <PageLoadError message={loadError} />}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-sky-500 text-white shadow-lg shadow-sky-500/30">
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


      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Realizadas
            </span>
            <span className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Icon name="inspection" className="size-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-800 dark:text-white">{totales}</p>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full">
              Historial
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Constataciones registradas</p>
        </div>


        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Aprobados
            </span>
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 font-bold">
              ✓
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-800 dark:text-white">{aprobados}</p>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
              {porcentajeAprobados}% Aptos
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${porcentajeAprobados}%` }}
            />
          </div>
        </div>


        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Observados
            </span>
            <span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              ⚠️
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-800 dark:text-white">{observados}</p>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
              Subsanables
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Deficiencias leves (plazo 48h)</p>
        </div>


        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Desaprobados
            </span>
            <span className="grid size-10 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
              ✕
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-800 dark:text-white">{desaprobados}</p>
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full">
              Fallas Críticas
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Peligro para circular</p>
        </div>
      </div>


      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-[#0f172a]">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Icon name="search" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por código, placa, inspector o datos del vehículo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-10 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-indigo-400"
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
              onClick={handleExportExcel}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-extrabold text-emerald-700 shadow-2xs hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
              title="Descargar registro de inspecciones en Excel"
            >
              <Icon name="table" className="size-4" />
              <span>Exportar Excel</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-linear-to-r from-sky-600 to-indigo-600 px-4 py-2 text-xs font-extrabold text-white shadow-md shadow-sky-600/20 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-sky-600/30 active:scale-95 cursor-pointer whitespace-nowrap"
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
                <th className="px-3.5 py-3.5 whitespace-nowrap">N° Registro</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Serie CertiCAV</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Placa Vehicular</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Vehículo & Propietario</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Fecha & Vigencia (6 Meses)</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Inspector Asignado</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">Resultado</th>
                <th className="sticky right-0 z-20 bg-slate-50/95 dark:bg-slate-900/95 px-4 py-3.5 text-right whitespace-nowrap border-l border-slate-200/60 dark:border-slate-800 shadow-[-4px_0_8px_rgba(0,0,0,0.03)] dark:shadow-[-4px_0_8px_rgba(0,0,0,0.2)]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading && inspecciones.length === 0 ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-3.5 py-4"><div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-3.5 py-4"><div className="h-5 w-28 rounded bg-slate-200 dark:bg-slate-800" /></td>
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
                    <td className="sticky right-0 z-10 bg-white dark:bg-[#0f172a] px-4 py-4 text-right border-l border-slate-100 dark:border-slate-800"><div className="h-7 w-20 ml-auto rounded-lg bg-slate-200 dark:bg-slate-800" /></td>
                  </tr>
                ))
              ) : filteredInspecciones.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-5 py-12 text-center text-slate-400">
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
                  const numSerie = i.numeroSerieCerticav || ('CCV-2026-' + String(i.id || '').padStart(6, '0'))
                  return (
                    <tr key={i.id} className="group transition-colors hover:bg-indigo-50/30 dark:hover:bg-slate-800/40">
                      <td className="px-3.5 py-3.5 whitespace-nowrap">
                        <span className="font-mono font-black text-indigo-700 dark:text-indigo-400 text-sm">
                          {i.numeroInspeccion}
                        </span>
                      </td>

                      <td className="px-3.5 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 font-mono text-xs font-black text-sky-700 bg-sky-50 dark:text-sky-300 dark:bg-sky-950/60 px-2.5 py-1 rounded-lg border border-sky-200 dark:border-sky-800 shadow-2xs">
                          {numSerie}
                        </span>
                      </td>

                      <td className="px-3.5 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center justify-center rounded-lg border-2 border-slate-900 bg-amber-300 px-3 py-1 font-mono text-xs font-black tracking-widest text-slate-950 shadow-xs dark:border-slate-800 dark:bg-amber-400 dark:text-slate-950">
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
                        {(() => {
                          const fEmision = (() => {
                            if (!i.fecha) return new Date().toLocaleDateString('es-PE')
                            const parts = String(i.fecha).split('T')[0].split('-')
                            if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
                            const dt = new Date(i.fecha)
                            return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('es-PE')
                          })()

                          const fVenc = (() => {
                            if (i.fechaVencimiento) {
                              const parts = String(i.fechaVencimiento).split('T')[0].split('-')
                              if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
                              const dt = new Date(i.fechaVencimiento)
                              if (!isNaN(dt.getTime())) return dt.toLocaleDateString('es-PE')
                            }
                            if (i.fecha) {
                              try {
                                const dt = new Date(i.fecha)
                                if (!isNaN(dt.getTime())) {
                                  dt.setMonth(dt.getMonth() + 6)
                                  return dt.toLocaleDateString('es-PE')
                                }
                              } catch (_) { }
                            }
                            return '—'
                          })()

                          return (
                            <div className="space-y-0.5 font-mono text-xs">
                              <p className="font-bold text-slate-700 dark:text-slate-200">
                                <span className="text-slate-400 font-normal mr-1">Expedición:</span>
                                {fEmision}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                <span className="text-slate-400 mr-1">Vence (+6m):</span>
                                <span className="font-semibold text-slate-700 dark:text-slate-300">{fVenc}</span>
                              </p>
                            </div>
                          )
                        })()}
                      </td>

                      <td className="px-3.5 py-3.5 whitespace-nowrap">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          {i.inspector || 'Inspector Técnico Municipal'}
                        </p>
                      </td>


                      <td className="px-3.5 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold ${i.resultado === 'APROBADO'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                            : i.resultado === 'OBSERVADO'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300'
                            }`}
                        >
                          <span className="size-2 rounded-full bg-current animate-pulse" />
                          {i.resultado}
                        </span>
                      </td>


                      <td className="sticky right-0 z-10 bg-white group-hover:bg-indigo-50/40 dark:bg-[#0f172a] dark:group-hover:bg-slate-800/60 px-4 py-3.5 text-right whitespace-nowrap border-l border-slate-100 dark:border-slate-800/80 shadow-[-4px_0_8px_rgba(0,0,0,0.03)] dark:shadow-[-4px_0_8px_rgba(0,0,0,0.2)]">
                        <div className="flex items-center justify-end gap-1.5 pr-1">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(i)}
                            title="Ver Ficha Técnica"
                            className="rounded-xl p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-500 hover:text-white dark:bg-indigo-950/60 dark:text-indigo-400 transition-all duration-200 shadow-2xs hover:shadow-md cursor-pointer"
                          >
                            <Icon name="eye" className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(i)}
                            title="Editar Inspección"
                            className="rounded-xl p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white dark:bg-amber-950/60 dark:text-amber-400 transition-all duration-200 shadow-2xs hover:shadow-md cursor-pointer"
                          >
                            <Icon name="pencil" className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenPreview(i)}
                            title="Imprimir Acta"
                            className="rounded-xl p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white dark:bg-emerald-950/60 dark:text-emerald-400 transition-all duration-200 shadow-2xs hover:shadow-md cursor-pointer"
                          >
                            <Icon name="print" className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(i.id)}
                            title="Eliminar Inspección"
                            className="rounded-xl p-1.5 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white dark:bg-red-950/60 dark:text-red-400 transition-all duration-200 shadow-2xs hover:shadow-md cursor-pointer"
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
          totalItems={filteredInspecciones.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(size) => {
            setItemsPerPage(size)
            setCurrentPage(1)
          }}
        />
      </div>


      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-enter overflow-y-auto">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#0f172a] my-auto">
            {/* Cabecera del Modal */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/80">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-2xl bg-sky-500 text-white shadow-md shadow-sky-500/30">
                  <Icon name="inspection" className="size-5" />
                </span>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {selectedInspeccion ? 'Editar Constatación de Características (CERTICAV)' : 'Registrar Inspección Técnica Vehicular (CERTICAV)'}
                  </h3>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Formato Oficial · Ordenanza Municipal Nº 012-2012-MDJLO
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white cursor-pointer transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="flex-1 space-y-6 overflow-y-auto p-6 text-xs">
              
              {/* BLOQUE 1: DATOS DEL VEHÍCULO Y DOCUMENTO OFICIAL */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4.5 dark:border-slate-800 dark:bg-slate-900/40 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2 dark:border-slate-800">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <span className="grid size-5 place-items-center rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400 text-[10px]">1</span>
                    Datos de Identificación del Vehículo y Certificado
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">
                    * Campos obligatorios
                  </span>
                </div>

                <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Placa */}
                  <div>
                    <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                      Placa del Vehículo *
                    </label>
                    <input
                      type="text"
                      required
                      list="vehiculos-list"
                      placeholder="Ej. 6968-5M"
                      value={formData.vehiculoPlaca}
                      onChange={(e) => handlePlacaChange(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-xs font-black uppercase text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                    <datalist id="vehiculos-list">
                      {vehiculos.map((v) => (
                        <option key={v.id} value={v.placa}>
                          {v.marca} {v.modelo} - {v.propietario} ({v.asociacion || 'Independiente'})
                        </option>
                      ))}
                    </datalist>
                  </div>

                  {/* N° de Registro */}
                  <div>
                    <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                      N° de Registro *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. REG-2026-00101"
                      value={formData.numeroRegistro}
                      onChange={(e) => setFormData({ ...formData, numeroRegistro: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-xs font-bold text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  {/* N° Serie CERTICAV (Sello Rojo de 7 dígitos) */}
                  <div>
                    <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>Serie CERTICAV *</span>
                      <span className="text-[10px] text-rose-500 font-black">Sello Rojo</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. 0008180"
                      value={formData.numeroSerieCerticav}
                      onChange={(e) => setFormData({ ...formData, numeroSerieCerticav: e.target.value })}
                      className="w-full rounded-xl border border-rose-300 bg-rose-50/30 px-3 py-2 font-mono text-xs font-black tracking-wider text-rose-600 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-400"
                    />
                  </div>

                  {/* Fecha de Inspección */}
                  <div>
                    <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                      Fecha de Inspección *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.fecha}
                      onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-xs font-bold text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                {/* Resumen del vehículo seleccionado */}
                {(() => {
                  const vMatch = vehiculos.find(v => v.placa === formData.vehiculoPlaca)
                  return (
                    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-800/60">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Marca / Modelo:</span>
                        <span className="font-extrabold text-slate-800 dark:text-white">
                          {vMatch ? `${vMatch.marca} ${vMatch.modelo}` : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Año Fab. / Motor:</span>
                        <span className="font-extrabold text-slate-800 dark:text-white font-mono">
                          {vMatch ? `${vMatch.anio || '—'} / ${vMatch.serieMotor || '—'}` : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Transportador (Asociación):</span>
                        <span className="font-extrabold text-slate-800 dark:text-white truncate block" title={vMatch?.asociacion || 'Independiente'}>
                          {vMatch?.asociacion || 'Independiente'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Propietario Titular:</span>
                        <span className="font-extrabold text-slate-800 dark:text-white truncate block" title={vMatch?.propietario || '—'}>
                          {vMatch ? `${vMatch.propietario} (${vMatch.propietarioDni || 'DNI'})` : '—'}
                        </span>
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* BLOQUE 2: CONDUCTOR Y TÉCNICO RESPONSABLE */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4.5 dark:border-slate-800 dark:bg-slate-900/40 space-y-4">
                <div className="flex flex-wrap items-center justify-between border-b border-slate-200/60 pb-2 dark:border-slate-800 gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <span className="grid size-5 place-items-center rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400 text-[10px]">2</span>
                    Conductor Evaluado y Técnico Responsable
                  </span>
                  <button
                    type="button"
                    onClick={handleCopiarPropietario}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700 hover:bg-sky-100 dark:bg-sky-950/60 dark:text-sky-300 cursor-pointer transition border border-sky-200 dark:border-sky-800"
                  >
                    <span>Copiar datos del Titular (ÍDEM)</span>
                  </button>
                </div>

                <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                      Nombre del Conductor *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. BANCES PISCOYA JOSE JAIRO"
                      value={formData.conductorNombre}
                      onChange={(e) => setFormData({ ...formData, conductorNombre: e.target.value.toUpperCase() })}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-extrabold uppercase text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                      D.N.I. del Conductor
                    </label>
                    <input
                      type="text"
                      maxLength={8}
                      placeholder="Ej. 46357529"
                      value={formData.conductorDni}
                      onChange={(e) => setFormData({ ...formData, conductorDni: e.target.value.trim() })}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-xs font-bold text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                      N° Licencia de Conducir *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. 46357529 o B-IIc"
                      value={formData.conductorLicencia}
                      onChange={(e) => setFormData({ ...formData, conductorLicencia: e.target.value.toUpperCase() })}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-xs font-bold text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                      Técnico Responsable *
                    </label>
                    <select
                      required
                      disabled={!!selectedInspeccion}
                      value={formData.tecnicoId || ''}
                      onChange={(e) => {
                        const tId = e.target.value
                        const tObj = tecnicos.find((t) => String(t.id) === String(tId))
                        setFormData({
                          ...formData,
                          tecnicoId: tId,
                          inspector: tObj ? `${tObj.nombres} ${tObj.apellidos}` : '',
                        })
                      }}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="">Seleccione el inspector técnico</option>
                      {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nombres} {t.apellidos}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* BLOQUE 3: CHECKLIST DE 37 ÍTEMS OFICIALES EN 2 COLUMNAS */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4.5 dark:border-slate-800 dark:bg-slate-900/40 space-y-4">
                <div className="flex flex-wrap items-center justify-between border-b border-slate-200/60 pb-2 dark:border-slate-800 gap-2">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
                      <span className="grid size-5 place-items-center rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400 text-[10px]">3</span>
                      Checklist Técnico Municipal (37 Criterios)
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      B = Bien · M.E. = Mal Estado · N.T. = No Tiene
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        detalles: criteriosInspeccion.map((c) => ({ criterioId: c.id, estado: 'BIEN', obs: '' })),
                        resultado: 'APROBADO',
                        primeraEvaluacion: 'APROBADO',
                      }))
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-emerald-700 shadow-sm transition cursor-pointer"
                  >
                    <Icon name="check" className="size-3.5" />
                    <span>Marcar Todo como BIEN (Apto)</span>
                  </button>
                </div>

                {/* Cuadrícula de 2 columnas simétricas con los criterios */}
                <div className="grid gap-6 lg:grid-cols-2">
                  
                  {/* Columna Izquierda: SISTEMA ELÉCTRICO + ASPECTOS INTERIORES */}
                  <div className="space-y-4">
                    {['SISTEMA ELECTRICO', 'ASPECTOS INTERIORES'].map((secName) => {
                      const normalizeSec = (s) => (s || '').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
                      const itemsInSec = criteriosInspeccion.filter(c => normalizeSec(c.seccion) === normalizeSec(secName))
                      if (itemsInSec.length === 0) return null
                      return (
                        <div key={secName} className="rounded-xl border border-slate-200 bg-white overflow-hidden dark:border-slate-800 dark:bg-slate-900/60 shadow-2xs">
                          <div className="bg-[#004b93] text-white px-3.5 py-2 flex items-center justify-between">
                            <span className="font-black text-xs tracking-wider uppercase">{secName}</span>
                            <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">{itemsInSec.length} ítems</span>
                          </div>

                          <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {itemsInSec.map((crit) => {
                              const det = formData.detalles.find((d) => d.criterioId === crit.id)
                              const estadoVal = det?.estado || 'BIEN'

                              return (
                                <div key={crit.id} className="p-2.5 transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                                      {crit.nombre}
                                    </span>

                                    {/* 3 Botones de selección B / M.E. / N.T. */}
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleDetalleChange(crit.id, 'estado', 'BIEN')
                                          handleDetalleChange(crit.id, 'obs', '')
                                        }}
                                        className={`px-2 py-0.5 rounded-md font-black text-[10px] transition cursor-pointer ${estadoVal === 'BIEN'
                                          ? 'bg-emerald-600 text-white shadow-xs'
                                          : 'bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 dark:bg-slate-800 dark:text-slate-400'
                                          }`}
                                      >
                                        B
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDetalleChange(crit.id, 'estado', 'MAL_ESTADO')}
                                        className={`px-2 py-0.5 rounded-md font-black text-[10px] transition cursor-pointer ${estadoVal === 'MAL_ESTADO'
                                          ? 'bg-rose-600 text-white shadow-xs'
                                          : 'bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-700 dark:bg-slate-800 dark:text-slate-400'
                                          }`}
                                      >
                                        M.E.
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDetalleChange(crit.id, 'estado', 'NO_TIENE')}
                                        className={`px-2 py-0.5 rounded-md font-black text-[10px] transition cursor-pointer ${estadoVal === 'NO_TIENE'
                                          ? 'bg-amber-600 text-white shadow-xs'
                                          : 'bg-slate-100 text-slate-500 hover:bg-amber-50 hover:text-amber-700 dark:bg-slate-800 dark:text-slate-400'
                                          }`}
                                      >
                                        N.T.
                                      </button>
                                    </div>
                                  </div>

                                  {/* Campo de detalle cuando está observado */}
                                  {estadoVal !== 'BIEN' && (
                                    <div className="mt-2">
                                      <input
                                        type="text"
                                        placeholder={`Indicar deficiencia técnica para: ${crit.nombre}...`}
                                        value={det?.obs || ''}
                                        onChange={(e) => handleDetalleChange(crit.id, 'obs', e.target.value)}
                                        className="w-full rounded-lg border border-rose-300 bg-rose-50/40 px-2.5 py-1 text-[11px] text-slate-900 outline-none focus:border-rose-500 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-300"
                                      />
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Columna Derecha: ESPECIFICACIONES MECÁNICAS + ASPECTOS EXTERIORES */}
                  <div className="space-y-4">
                    {['ESPECIFICACIONES MECANICAS', 'ASPECTOS EXTERIORES'].map((secName) => {
                      const normalizeSec = (s) => (s || '').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
                      const itemsInSec = criteriosInspeccion.filter(c => normalizeSec(c.seccion) === normalizeSec(secName))
                      if (itemsInSec.length === 0) return null
                      return (
                        <div key={secName} className="rounded-xl border border-slate-200 bg-white overflow-hidden dark:border-slate-800 dark:bg-slate-900/60 shadow-2xs">
                          <div className="bg-[#004b93] text-white px-3.5 py-2 flex items-center justify-between">
                            <span className="font-black text-xs tracking-wider uppercase">{secName}</span>
                            <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">{itemsInSec.length} ítems</span>
                          </div>

                          <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {itemsInSec.map((crit) => {
                              const det = formData.detalles.find((d) => d.criterioId === crit.id)
                              const estadoVal = det?.estado || 'BIEN'

                              return (
                                <div key={crit.id} className="p-2.5 transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                                      {crit.nombre}
                                    </span>

                                    {/* 3 Botones de selección B / M.E. / N.T. */}
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleDetalleChange(crit.id, 'estado', 'BIEN')
                                          handleDetalleChange(crit.id, 'obs', '')
                                        }}
                                        className={`px-2 py-0.5 rounded-md font-black text-[10px] transition cursor-pointer ${estadoVal === 'BIEN'
                                          ? 'bg-emerald-600 text-white shadow-xs'
                                          : 'bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 dark:bg-slate-800 dark:text-slate-400'
                                          }`}
                                      >
                                        B
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDetalleChange(crit.id, 'estado', 'MAL_ESTADO')}
                                        className={`px-2 py-0.5 rounded-md font-black text-[10px] transition cursor-pointer ${estadoVal === 'MAL_ESTADO'
                                          ? 'bg-rose-600 text-white shadow-xs'
                                          : 'bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-700 dark:bg-slate-800 dark:text-slate-400'
                                          }`}
                                      >
                                        M.E.
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDetalleChange(crit.id, 'estado', 'NO_TIENE')}
                                        className={`px-2 py-0.5 rounded-md font-black text-[10px] transition cursor-pointer ${estadoVal === 'NO_TIENE'
                                          ? 'bg-amber-600 text-white shadow-xs'
                                          : 'bg-slate-100 text-slate-500 hover:bg-amber-50 hover:text-amber-700 dark:bg-slate-800 dark:text-slate-400'
                                          }`}
                                      >
                                        N.T.
                                      </button>
                                    </div>
                                  </div>

                                  {/* Campo de detalle cuando está observado */}
                                  {estadoVal !== 'BIEN' && (
                                    <div className="mt-2">
                                      <input
                                        type="text"
                                        placeholder={`Indicar deficiencia técnica para: ${crit.nombre}...`}
                                        value={det?.obs || ''}
                                        onChange={(e) => handleDetalleChange(crit.id, 'obs', e.target.value)}
                                        className="w-full rounded-lg border border-rose-300 bg-rose-50/40 px-2.5 py-1 text-[11px] text-slate-900 outline-none focus:border-rose-500 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-300"
                                      />
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                </div>
              </div>

              {/* BLOQUE 4: EVALUACIONES Y RESULTADO FINAL */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4.5 dark:border-slate-800 dark:bg-slate-900/40 space-y-4">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2 border-b border-slate-200/60 pb-2 dark:border-slate-800">
                  <span className="grid size-5 place-items-center rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400 text-[10px]">4</span>
                  Dictamen Oficial, Evaluaciones y Resultado
                </span>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                      Primera Evaluación *
                    </label>
                    <select
                      value={formData.primeraEvaluacion}
                      onChange={(e) => setFormData({ ...formData, primeraEvaluacion: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-black outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="APROBADO">APROBADO</option>
                      <option value="DESAPROBADO">DESAPROBADO</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                      Segunda Evaluación (Subsanación)
                    </label>
                    <select
                      value={formData.segundaEvaluacion || ''}
                      onChange={(e) => setFormData({ ...formData, segundaEvaluacion: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="">No aplica (1ra Evaluación)</option>
                      <option value="APROBADO">APROBADO (Subsanado)</option>
                      <option value="DESAPROBADO">DESAPROBADO (Persisten Fallas)</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                      Estado Oficial en Sistema *
                    </label>
                    <select
                      value={formData.resultado}
                      onChange={(e) => setFormData({ ...formData, resultado: e.target.value })}
                      className={`w-full rounded-xl border-2 px-3 py-2 text-xs font-black outline-none ${formData.resultado === 'APROBADO'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : formData.resultado === 'OBSERVADO'
                          ? 'border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                          : 'border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                        }`}
                    >
                      <option value="APROBADO">APROBADO (Apto para Circular)</option>
                      <option value="OBSERVADO">OBSERVADO (Plazo de Subsanación)</option>
                      <option value="DESAPROBADO">DESAPROBADO (No Apto)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                    Observaciones Generales y Dictamen Técnico
                  </label>
                  <textarea
                    rows="2"
                    placeholder="Detalles adicionales, número de subsanación o condiciones del vehículo..."
                    value={formData.observaciones}
                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                    className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex justify-end gap-3 border-t border-slate-200/80 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-linear-to-r from-sky-600 to-indigo-600 px-6 py-2.5 text-xs font-black text-white shadow-md shadow-sky-600/20 hover:scale-[1.01] active:scale-95 transition cursor-pointer"
                >
                  {selectedInspeccion ? 'Guardar Cambios' : 'Guardar Inspección'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL DE DETALLE COMPLETO */}
      {isDetailModalOpen && selectedInspeccion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-enter">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#0f172a]">
            <div className="flex items-center justify-between border-b border-slate-100 bg-[#004b93] p-5 text-white">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-sky-200">
                  Ficha Oficial de Inspección Técnica (CERTICAV)
                </p>
                <h3 className="text-xl font-black mt-0.5">
                  {selectedInspeccion.numeroRegistro || selectedInspeccion.numeroInspeccion}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center rounded-lg border-2 border-slate-900 bg-amber-300 px-3 py-1 font-mono text-xs font-black tracking-widest text-slate-950 shadow-xs">
                  {selectedInspeccion.vehiculoPlaca}
                </span>
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="rounded-full p-1 text-sky-200 hover:bg-white/10 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-4 p-6 text-xs max-h-[80vh] overflow-y-auto">
              
              {/* Resumen Oficial */}
              <div className="grid gap-2 sm:grid-cols-2 rounded-2xl border border-sky-100 bg-sky-50/50 p-4 dark:border-sky-900/40 dark:bg-sky-950/20">
                <div>
                  <span className="font-bold text-slate-400 block text-[10px] uppercase">N° Serie CERTICAV (Sello):</span>
                  <span className="font-mono font-black text-rose-600 text-sm">
                    {selectedInspeccion.numeroSerieCerticav || ('000' + String(selectedInspeccion.id || '').padStart(4, '0'))}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block text-[10px] uppercase">Fecha de Inspección:</span>
                  <span className="font-bold text-slate-800 dark:text-white">
                    {selectedInspeccion.fecha || '—'}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block text-[10px] uppercase">Conductor:</span>
                  <span className="font-bold text-slate-800 dark:text-white">
                    {selectedInspeccion.conductorNombre || '—'}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block text-[10px] uppercase">N° Licencia / DNI:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-white">
                    {selectedInspeccion.conductorLicencia || selectedInspeccion.conductorDni || '—'}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block text-[10px] uppercase">1ra Evaluación:</span>
                  <span className="font-black text-emerald-700 dark:text-emerald-400">
                    {selectedInspeccion.primeraEvaluacion || 'APROBADO'}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block text-[10px] uppercase">2da Evaluación (Subsanación):</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {selectedInspeccion.segundaEvaluacion || 'No requerida'}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block text-[10px] uppercase">Inspector Asignado:</span>
                  <span className="font-bold text-slate-800 dark:text-white">
                    {selectedInspeccion.inspector}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block text-[10px] uppercase">Resultado Final:</span>
                  <span className={`font-black px-2 py-0.5 rounded-md inline-block text-[11px] ${selectedInspeccion.resultado === 'APROBADO'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : selectedInspeccion.resultado === 'OBSERVADO'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}>
                    {selectedInspeccion.resultado}
                  </span>
                </div>
              </div>

              {/* Lista de Criterios */}
              {selectedInspeccion.detalles && selectedInspeccion.detalles.length > 0 && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                  <p className="mb-2.5 font-bold uppercase text-slate-400 text-[11px] tracking-wider">
                    Checklist Evaluado ({selectedInspeccion.detalles.length} Criterios)
                  </p>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {selectedInspeccion.detalles.map((det) => {
                      const crit = criteriosInspeccion.find((c) => c.id === det.criterioId)
                      return (
                        <div
                          key={det.criterioId}
                          className="flex items-center justify-between border-b border-slate-200/40 py-1.5 last:border-0 dark:border-slate-800/40 text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-700 dark:text-slate-200">
                              {crit ? crit.nombre : `Criterio #${det.criterioId}`}
                            </span>
                            {det.obs && <p className="text-[11px] italic text-rose-500">{det.obs}</p>}
                          </div>
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-black ${det.estado === 'BIEN'
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
                  <p className="font-bold uppercase text-slate-400 text-[10px]">Observaciones Generales</p>
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
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 font-bold text-white hover:bg-emerald-700 cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Icon name="print" className="size-4" />
                  <span>Imprimir Ficha Oficial A4</span>
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

      {/* MODAL DE PREVISUALIZACIÓN E IMPRESIÓN */}
      {isPreviewModalOpen && selectedInspeccion && (() => {
        const vInfo = vehiculos.find(v => v.placa === selectedInspeccion.vehiculoPlaca)
        const certicavData = {
          codigo: selectedInspeccion.numeroInspeccion,
          numeroInspeccion: selectedInspeccion.numeroInspeccion,
          numeroRegistro: selectedInspeccion.numeroRegistro || selectedInspeccion.numeroInspeccion,
          numeroSerieCerticav: selectedInspeccion.numeroSerieCerticav || ('CCV-2026-' + String(selectedInspeccion.id || '').padStart(6, '0')),
          placa: selectedInspeccion.vehiculoPlaca,
          vehiculoPlaca: selectedInspeccion.vehiculoPlaca,
          propietario: selectedInspeccion.propietario || vInfo?.propietario || '—',
          propietarioDni: selectedInspeccion.propietarioDni || vInfo?.propietarioDni || '—',
          conductorNombre: selectedInspeccion.conductorNombre || vInfo?.propietario || '—',
          conductorDni: selectedInspeccion.conductorDni || vInfo?.propietarioDni || '—',
          conductorLicencia: selectedInspeccion.conductorLicencia || vInfo?.propietarioDni || '—',
          transportador: selectedInspeccion.transportador || vInfo?.asociacion || 'Independiente',
          asociacion: selectedInspeccion.transportador || vInfo?.asociacion || 'Independiente',
          vehiculoMarca: selectedInspeccion.vehiculoMarca || vInfo?.marca || 'WANXIN',
          vehiculoModelo: selectedInspeccion.vehiculoModelo || vInfo?.modelo || 'WX-200',
          vehiculoAnio: selectedInspeccion.vehiculoAnio || vInfo?.anio || '—',
          anioFabricacion: selectedInspeccion.vehiculoAnio || vInfo?.anio || '—',
          numeroMotor: selectedInspeccion.vehiculoMotor || vInfo?.serieMotor || '—',
          fecha: selectedInspeccion.fecha,
          fechaExpedicion: selectedInspeccion.fecha,
          fechaVencimiento: selectedInspeccion.fechaVencimiento,
          vigenciaMeses: 6,
          estadoVigencia: selectedInspeccion.estadoVigencia,
          diasRestantes: selectedInspeccion.diasRestantes,
          primeraEvaluacion: selectedInspeccion.primeraEvaluacion || (selectedInspeccion.resultado === 'DESAPROBADO' ? 'DESAPROBADO' : 'APROBADO'),
          segundaEvaluacion: selectedInspeccion.segundaEvaluacion || '',
          resultado: selectedInspeccion.resultado,
          inspector: selectedInspeccion.inspector,
          observaciones: selectedInspeccion.observaciones,
          detalles: selectedInspeccion.detalles || [],
          qrUrl: `https://munijlo.gob.pe/transito/validar?tipo=CERTICAV&reg=${encodeURIComponent(selectedInspeccion.numeroRegistro || selectedInspeccion.numeroInspeccion || '')}&placa=${encodeURIComponent(selectedInspeccion.vehiculoPlaca || '')}`
        }

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-enter">
            <div className="w-full max-w-4xl bg-white dark:bg-[#0f172a] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto">
              
              {/* Cabecera del visualizador */}
              <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-xl bg-emerald-500/20 text-emerald-400">
                    <Icon name="print" className="size-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                      Ficha Oficial CERTICAV (Inspección Técnica en Hoja A4)
                      <span className="rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono px-2 py-0.5 font-bold">
                        {selectedInspeccion.numeroRegistro || selectedInspeccion.numeroInspeccion}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">Subgerencia de Tránsito y Transporte · MDJLO</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-black text-white hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-600/30 transition-all cursor-pointer active:scale-95"
                  >
                    <Icon name="print" className="size-4" />
                    <span>Imprimir Ficha A4</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPreviewModalOpen(false)}
                    className="grid size-8 place-items-center rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Vista previa y componente oficial para impresión */}
              <div className="p-6 max-h-[75vh] overflow-y-auto bg-slate-100 dark:bg-slate-900/60 flex flex-col items-center justify-center gap-4">
                <div className="text-center max-w-lg">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Formato Oficial Hoja A4 — Ficha de Inspección Técnica con Checklist Mecánico / Eléctrico
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Al pulsar "Imprimir Ficha A4", el sistema aísla exclusivamente el contenedor <code className="font-mono text-emerald-600 dark:text-emerald-400">#seccion-impresion</code> garantizando 1 sola página exacta idéntica al documento físico.
                  </p>
                </div>

                <CerticavFichaPrint data={certicavData} />
              </div>

            </div>
          </div>
        )
      })()}
    </div>
  )
}
