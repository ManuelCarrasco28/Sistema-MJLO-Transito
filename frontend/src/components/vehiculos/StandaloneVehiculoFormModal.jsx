import { useState, useEffect } from 'react'
import { apiFetch, leerMensajeError } from '../../config/api'
import { showError, showToast } from '../../utils/SwalUtil'
import { VehiculoFormModal } from './VehiculoFormModal'
import { useOficinaRegistral } from '../../hooks/useOficinaRegistral'
import { usePersonaRapida } from '../../hooks/usePersonaRapida'
import { obtenerAnioFormularioVehiculo } from '../../utils/anioSunarp'
import { isVehiculoFormal } from '../../utils/vehiculos'

// Con `vehiculo` el mismo formulario edita ese vehículo; sin él registra uno nuevo.
export function StandaloneVehiculoFormModal({ onClose, onSuccess, placaInicial = '', vehiculo = null }) {
  const editando = Boolean(vehiculo?.id)
  const formal = editando && isVehiculoFormal(vehiculo)
  const [formData, setFormData] = useState(editando ? {
    ...vehiculo,
    asociacion: formal ? (vehiculo.asociacion || '') : '',
    propietarioDni: vehiculo.propietarioDni || '',
    propietario: vehiculo.propietario || '',
    estado: vehiculo.estado === 'INACTIVO' ? 'INACTIVO' : 'ACTIVO',
  } : {
    placa: placaInicial, tipo: 'Mototaxi', marca: '', modelo: '', color: '', anio: '',
    categoria: '', carroceria: '', sedeRegistro: 'CHICLAYO', tipoCarroceria: '', numeroSerie: '', serieMotor: '', partidaRegistral: '',
    asociacion: '', propietario: '', propietarioDni: '', estado: 'ACTIVO', soatEstado: 'VIGENTE',
    tucNumero: `TUC-2026-${Math.floor(100 + Math.random() * 900)}`
  })
  
  const [erroresForm, setErroresForm] = useState({})
  const [propietarioSearch, setPropietarioSearch] = useState(editando && vehiculo.propietarioDni ? `${vehiculo.propietarioDni} — ${vehiculo.propietario || ''}` : '')
  const [showPropietarioResults, setShowPropietarioResults] = useState(false)
  const [propietarioResults, setPropietarioResults] = useState([])
  const [asociacionSearch, setAsociacionSearch] = useState(formal ? (vehiculo.asociacion || '') : '')
  const [showAsociacionResults, setShowAsociacionResults] = useState(false)
  const [asociacionesList, setAsociacionesList] = useState([])
  const oficinaReg = useOficinaRegistral()
  const [isBuscandoSunarp, setIsBuscandoSunarp] = useState(false)
  const [titularDetectado, setTitularDetectado] = useState(null)
  const { abrir: abrirPersonaRapida, modal: modalPersonaRapida } = usePersonaRapida({ alCrear: persona => selectPropietario(persona) })

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
        anio: obtenerAnioFormularioVehiculo(sunarpData),
        categoria: sunarpData.categoria || prev.categoria,
        carroceria: sunarpData.carroceria || prev.carroceria,
        tipoCarroceria: sunarpData.tipo_carroceria || sunarpData.carroceria || prev.tipoCarroceria,
        numeroSerie: sunarpData.serie || sunarpData.vin || sunarpData.numero_serie || sunarpData.nro_serie || prev.numeroSerie,
        serieMotor: sunarpData.motor || sunarpData.numero_motor || sunarpData.nro_motor || prev.serieMotor,
        partidaRegistral: sunarpData.partida || sunarpData.partida_registral || prev.partidaRegistral,
        sedeRegistro: sunarpData.sede || sunarpData.sede_registro || sunarpData.oficina_registral || sunarpData.oficina || prev.sedeRegistro,
        tipo: sunarpData.clase || (sunarpData.categoria === 'M1' ? 'Automóvil' : sunarpData.categoria === 'L5' ? (/CARG/i.test(sunarpData.carroceria || '') ? 'Motocarguera' : 'Mototaxi') : prev.tipo)
      }))
      const owner = sunarpData.propietarios?.[0]
      const nombre = typeof owner === 'string' ? owner : owner?.nombre || owner?.razon_social || owner?.apellidos_nombres || ''
      const documento = typeof owner === 'object' ? String(owner.numero_documento || owner.dni || owner.ruc || '') : ''
      setTitularDetectado(nombre ? { nombre, documento } : null)
      if (documento) {
        const responsePersona = await apiFetch(`/personas?numeroDocumento=${encodeURIComponent(documento)}`)
        if (responsePersona.ok) {
          const payload = await responsePersona.json()
          const persona = payload.data?.find(p => Number(p.id) > 0 && String(p.numeroDocumento || p.numero) === documento)
          if (persona) selectPropietario(persona)
        }
      }
      showToast('Datos cargados', 'success')
    } catch (err) {
      showError('Consulta Fallida', err.message || 'No se pudo obtener la información. Verifique que la placa sea correcta y vuelva a intentarlo.')
    } finally {
      setIsBuscandoSunarp(false)
    }
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    
    const placaClean = formData.placa.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
    const faltan = {
      placa: placaClean ? '' : 'Ingresa la placa del vehículo',
      marca: formData.marca?.trim() ? '' : 'Ingresa la marca',
      modelo: formData.modelo?.trim() ? '' : 'Ingresa el modelo',
      color: formData.color?.trim() ? '' : 'Ingresa el color',
      propietario: formData.propietarioDni.trim() ? '' : 'Busca y selecciona al propietario registrado',
    }
    if (Object.values(faltan).some(Boolean)) {
      // Se marcan dentro del formulario los campos que faltan
      setErroresForm(faltan)
      return
    }
    setErroresForm({})
    if (placaClean.length !== 6) {
      showError('Placa Inválida', 'La placa debe tener exactamente 6 caracteres (letras y números), sin guion.')
      return
    }
    const anioActual = new Date().getFullYear()
    if (formData.anio && (!/^\d{4}$/.test(String(formData.anio)) || Number(formData.anio) < 1900 || Number(formData.anio) > anioActual + 1)) {
      showError('Año Inválido', `El año de fabricación debe ser válido (entre 1900 y ${anioActual + 1}).`)
      return
    }

    try {
      if (editando) {
        const res = await apiFetch(`/vehiculos/${vehiculo.id}`, { method: 'PUT', body: formData })
        if (!res.ok) throw new Error(await leerMensajeError(res, 'No se pudo actualizar el vehículo.'))
        showToast('Vehículo actualizado correctamente', 'success')
        if (onSuccess) onSuccess()
        onClose()
        return
      }
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
        partidaRegistral: formData.partidaRegistral,
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
    <>
    <VehiculoFormModal
      isEditing={editando}
      errores={erroresForm}
      onLimpiarError={(campo) => setErroresForm((prev) => ({ ...prev, [campo]: '' }))}
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
      titularDetectado={titularDetectado}
      onOpenPersonaRapida={() => abrirPersonaRapida(titularDetectado?.documento || '')}
    />
    {modalPersonaRapida}
    </>
  )
}
