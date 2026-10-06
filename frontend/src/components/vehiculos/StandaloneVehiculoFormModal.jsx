import { useState, useEffect } from 'react'
import { apiFetch, leerMensajeError } from '../../config/api'
import { showError, showToast } from '../../utils/SwalUtil'
import { VehiculoFormModal } from './VehiculoFormModal'
import { useOficinaRegistral } from '../../hooks/useOficinaRegistral'

export function StandaloneVehiculoFormModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    placa: '', tipo: 'Mototaxi', marca: '', modelo: '', color: '', anio: '',
    categoria: '', carroceria: '', sedeRegistro: 'CHICLAYO', tipoCarroceria: '', numeroSerie: '', serieMotor: '',
    asociacion: '', propietario: '', propietarioDni: '', estado: 'ACTIVO', soatEstado: 'VIGENTE',
    tucNumero: `TUC-2026-${Math.floor(100 + Math.random() * 900)}`
  })
  
  const [propietarioSearch, setPropietarioSearch] = useState('')
  const [showPropietarioResults, setShowPropietarioResults] = useState(false)
  const [propietarioResults, setPropietarioResults] = useState([])
  const [asociacionSearch, setAsociacionSearch] = useState('')
  const [showAsociacionResults, setShowAsociacionResults] = useState(false)
  const [asociacionesList, setAsociacionesList] = useState([])
  const oficinaReg = useOficinaRegistral()
  const [isBuscandoSunarp, setIsBuscandoSunarp] = useState(false)

  useEffect(() => {
    const rawQuery = (propietarioSearch || '').trim()
    if (!rawQuery || rawQuery.includes('—') || rawQuery.length < 2) return
    const timer = setTimeout(() => {
      apiFetch(`/personas?buscar=${encodeURIComponent(rawQuery)}&porPagina=10`)
        .then(r => r.ok ? r.json() : { data: [] })
        .then(payload => setPropietarioResults(payload.data || []))
        .catch(() => {})
    }, 250)
    return () => clearTimeout(timer)
  }, [propietarioSearch])

  useEffect(() => {
    apiFetch('/asociaciones')
      .then(r => r.ok ? r.json() : { data: [] })
      .then(payload => setAsociacionesList(payload.data || []))
      .catch(() => {})
  }, [])

  const asociacionResults = asociacionesList
    .filter((a) => {
      if (!asociacionSearch) return true
      const terms = asociacionSearch.toLowerCase().split(' ')
      const val = `${a.razonSocial || a.razon_social || a.nombre || ''} ${a.ruc || ''}`.toLowerCase()
      return terms.every((t) => val.includes(t))
    })
    .slice(0, 15)

  const getPersonaNombre = (persona) => (
    persona.nombreCompleto ||
    `${persona.nombres || ''} ${persona.apellidoPaterno || persona.apellido_paterno || ''} ${persona.apellidoMaterno || persona.apellido_materno || ''}`.trim()
  )

  const selectPropietario = (persona) => {
    const documento = String(persona.numeroDocumento || persona.numero || persona.dni || '').trim()
    const nombre = getPersonaNombre(persona)
    setFormData((prev) => ({
      ...prev,
      propietarioDni: documento,
      propietario: nombre,
    }))
    setPropietarioSearch(documento ? `${documento} — ${nombre}` : nombre)
    setShowPropietarioResults(false)
  }

  const selectAsociacion = (a) => {
    const ruc = a.ruc || a.numero_documento || ''
    const nombre = a.razonSocial || a.razon_social || a.nombre || ''
    setFormData(prev => ({ ...prev, asociacion: nombre }))
    setAsociacionSearch(`${nombre} — ${ruc}`)
    setShowAsociacionResults(false)
  }

  const clearAsociacion = () => {
    setFormData(prev => ({ ...prev, asociacion: '' }))
    setAsociacionSearch('')
  }

  const handleBuscarSunarp = async () => {
    if (!formData.placa || formData.placa.length < 6) {
      showError('Placa inválida', 'Debe ingresar una placa de rodaje válida (mínimo 6 caracteres).')
      return
    }
    setIsBuscandoSunarp(true)
    try {
      const plate = formData.placa.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
      const response = await apiFetch('/pide/sunarp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placa: plate, codeZona: oficinaReg.codeZona, codeOficina: oficinaReg.codeOficina })
      })
      
      if (!response.ok) {
        throw new Error('No se pudo encontrar información para esta placa en los registros públicos.')
      }
      
      const res = await response.json()
      const sunarpData = res.data || (res.success && res.data ? res.data : (res.placa ? res : null))
      if (!sunarpData) {
        throw new Error('No se encontraron registros para la placa ingresada.')
      }
      
      setFormData(prev => ({
        ...prev,
        marca: sunarpData.marca || prev.marca,
        modelo: sunarpData.modelo || prev.modelo,
        color: sunarpData.color || prev.color,
        anio: sunarpData.anioFabricacion || sunarpData.anio_fabricacion || prev.anio,
        numeroSerie: sunarpData.serie || sunarpData.numero_serie || prev.numeroSerie,
        serieMotor: sunarpData.motor || sunarpData.numero_motor || prev.serieMotor,
        sedeRegistro: sunarpData.sede || sunarpData.sede_registro || prev.sedeRegistro,
        tipo: sunarpData.clase || prev.tipo
      }))
      showToast('Datos vehiculares actualizados desde SUNARP', 'success')
    } catch (err) {
      showError('Consulta Fallida', err.message || 'No se pudo obtener la información. Verifique que la placa sea correcta y vuelva a intentarlo.')
    } finally {
      setIsBuscandoSunarp(false)
    }
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    
    const placaClean = formData.placa.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
    if (!placaClean || !formData.propietarioDni.trim()) {
      showError('Campos Incompletos', 'Por favor completa los campos requeridos (Placa y Propietario registrado).')
      return
    }
    if (placaClean.length !== 6) {
      showError('Placa Inválida', 'La placa debe tener exactamente 6 caracteres (letras y números), sin guion.')
      return
    }
    const anioActual = new Date().getFullYear()
    if (formData.anio && (formData.anio < 1950 || formData.anio > anioActual + 1)) {
      showError('Año Inválido', `El año de fabricación debe ser válido (entre 1950 y ${anioActual + 1}).`)
      return
    }

    try {
      const payload = {
        placa: placaClean,
        tipo: formData.tipo,
        marca: formData.marca,
        modelo: formData.modelo,
        color: formData.color,
        anio: formData.anio,
        categoria: formData.categoria,
        carroceria: formData.carroceria,
        sedeRegistro: formData.sedeRegistro,
        tipoCarroceria: formData.tipoCarroceria,
        numeroSerie: formData.numeroSerie,
        serieMotor: formData.serieMotor,
        asociacion: formData.asociacion,
        propietario: formData.propietario,
        propietarioDni: formData.propietarioDni,
        estado: formData.estado,
        soatEstado: formData.soatEstado,
        tucNumero: formData.tucNumero,
      }
      
      const response = await apiFetch('/vehiculos', {
        method: 'POST',
        body: payload
      })
      
      if (!response.ok) {
        const errorMsg = await leerMensajeError(response, 'No se pudo registrar el vehículo.')
        throw new Error(errorMsg)
      }
      
      showToast('Vehículo registrado correctamente', 'success')
      if (onSuccess) onSuccess()
      onClose()
    } catch (err) {
      showError('Error', err.message)
    }
  }

  return (
    <VehiculoFormModal
      isEditing={false}
      formData={formData}
      setFormData={setFormData}
      onSubmit={handleFormSubmit}
      onClose={onClose}
      propietarioSearch={propietarioSearch}
      setPropietarioSearch={setPropietarioSearch}
      showPropietarioResults={showPropietarioResults}
      setShowPropietarioResults={setShowPropietarioResults}
      propietarioResults={propietarioResults}
      getPersonaNombre={getPersonaNombre}
      selectPropietario={selectPropietario}
      personas={[]}
      asociacionSearch={asociacionSearch}
      setAsociacionSearch={setAsociacionSearch}
      showAsociacionResults={showAsociacionResults}
      setShowAsociacionResults={setShowAsociacionResults}
      asociacionResults={asociacionResults}
      selectAsociacion={selectAsociacion}
      clearAsociacion={clearAsociacion}
      onBuscarSunarp={handleBuscarSunarp}
      oficinaRegistral={oficinaReg}
      isBuscandoSunarp={isBuscandoSunarp}
      titularDetectado={null}
      onOpenPersonaRapida={() => {}}
    />
  )
}
