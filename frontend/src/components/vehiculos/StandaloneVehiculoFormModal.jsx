import { useState, useEffect } from 'react'
import { apiFetch, leerMensajeError } from '../../config/api'
import { showError, showToast, showWarning } from '../../utils/SwalUtil'
import { VehiculoFormModal } from './VehiculoFormModal'
import { useOficinaRegistral } from '../../hooks/useOficinaRegistral'
import { usePersonaRapida } from '../../hooks/usePersonaRapida'

export function StandaloneVehiculoFormModal({ onClose, onSuccess, placaInicial = '' }) {
  const [formData, setFormData] = useState({
    placa: placaInicial, tipo: 'Mototaxi', marca: '', modelo: '', color: '', anio: '',
    categoria: '', carroceria: '', sedeRegistro: 'CHICLAYO', tipoCarroceria: '', numeroSerie: '', serieMotor: '', partidaRegistral: '',
    asociacion: '', propietario: '', propietarioDni: '', estado: 'ACTIVO', soatEstado: 'VIGENTE',
    tucNumero: `TUC-2026-${Math.floor(100 + Math.random() * 900)}`
  })
  
  const [erroresForm, setErroresForm] = useState({})
  const [propietarioSearch, setPropietarioSearch] = useState('')
  const [showPropietarioResults, setShowPropietarioResults] = useState(false)
  const [propietarioResults, setPropietarioResults] = useState([])
  const [asociacionSearch, setAsociacionSearch] = useState('')
  const [showAsociacionResults, setShowAsociacionResults] = useState(false)
  const [asociacionesList, setAsociacionesList] = useState([])
  const oficinaReg = useOficinaRegistral()
  const [isBuscandoSunarp, setIsBuscandoSunarp] = useState(false)
  const [titularDetectado, setTitularDetectado] = useState(null)

  const { abrir: abrirPersonaRapida, modal: modalPersonaRapida } = usePersonaRapida({
    alCrear: (persona) => {
      selectPropietario(persona)
      setTitularDetectado(prev => prev ? ({ ...prev, matchedPersona: persona }) : null)
    }
  })

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

      const cat = (sunarpData.categoria || '').toUpperCase().trim()
      const carr = (sunarpData.carroceria || '').toUpperCase().trim()
      let inferredTipo = formData.tipo || 'Mototaxi'
      if (cat === 'L5' && /CARG/.test(carr)) inferredTipo = 'Motocarguera'
      else if (cat === 'L5' || carr.includes('TRIMOVIL') || carr.includes('TRIMOTO') || carr.includes('MOTOTAXI') || carr.includes('MOTOKAR')) inferredTipo = 'Mototaxi'
      else if (cat === 'M1' || carr.includes('SEDAN') || carr.includes('HATCHBACK') || carr.includes('SUV')) inferredTipo = 'Automóvil'
      else if (cat === 'M2' || carr.includes('COMBI') || carr.includes('RURAL') || carr.includes('MICROBUS')) inferredTipo = 'Camioneta Rural'
      else if (sunarpData.clase) inferredTipo = sunarpData.clase

      let rawModalAnio = sunarpData.ano_fabricacion ?? sunarpData.anio_fabricacion ?? sunarpData.anio ?? ''
      let detectedModalAnio = parseInt(String(rawModalAnio).trim(), 10)
      if (!detectedModalAnio || detectedModalAnio < 1900 || detectedModalAnio > 2100) {
        const vin = (sunarpData.serie || sunarpData.vin || sunarpData.numero_serie || '').toUpperCase().trim()
        if (vin.length >= 10) {
          const vinCode = vin.charAt(9)
          const vinYears = {
            '1': 2001, '2': 2002, '3': 2003, '4': 2004, '5': 2005, '6': 2006, '7': 2007, '8': 2008, '9': 2009,
            'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014, 'F': 2015, 'G': 2016, 'H': 2017,
            'J': 2018, 'K': 2019, 'L': 2020, 'M': 2021, 'N': 2022, 'P': 2023, 'R': 2024, 'S': 2025,
            'T': 2026, 'V': 2027, 'W': 2028, 'X': 2029, 'Y': 2030
          }
          if (vinYears[vinCode]) {
            detectedModalAnio = vinYears[vinCode]
          }
        }
      }
      if (!detectedModalAnio || detectedModalAnio < 1900 || detectedModalAnio > 2100) {
        detectedModalAnio = ''
      }

      const rawProps = Array.isArray(sunarpData.propietarios) ? sunarpData.propietarios : []
      const mappedProps = rawProps.map((p, idx) => {
        const nombreStr = typeof p === 'string' ? p.trim() : (p.nombre || p.razon_social || p.apellidos_nombres || '')
        const docStr = typeof p === 'object' ? (p.numero_documento || p.dni || p.ruc || '') : ''
        return {
          nombre: nombreStr,
          documento: docStr,
          esPrincipal: idx === 0,
        }
      }).filter(p => p.nombre)

      const legalOwner = mappedProps[0] || (rawProps[0] ? { nombre: String(rawProps[0]), documento: '', esPrincipal: true } : null)

      if (legalOwner) {
        let matched = null
        if (legalOwner.documento) {
          try {
            const resP = await apiFetch(`/personas?page=1&buscar=${encodeURIComponent(legalOwner.documento.trim())}&porPagina=5`)
            if (resP.ok) {
              const payloadP = await resP.json()
              matched = (payloadP.data || []).find(p => (p.numeroDocumento || p.numero || p.dni || '').trim() === legalOwner.documento.trim()) || null
            }
          } catch (err) { console.warn("No se pudo buscar al titular legal en personas por documento:", err) }
        }
        if (!matched && legalOwner.nombre) {
          const cleanOwnerName = legalOwner.nombre.toUpperCase().trim()
          try {
            const resP = await apiFetch(`/personas?page=1&buscar=${encodeURIComponent(legalOwner.nombre.trim())}&porPagina=5`)
            if (resP.ok) {
              const payloadP = await resP.json()
              matched = (payloadP.data || []).find(p => {
                const fullPName = `${p.nombres || ''} ${p.apellidoPaterno || p.apellido_paterno || ''} ${p.apellidoMaterno || p.apellido_materno || ''}`.toUpperCase().trim()
                return fullPName && (cleanOwnerName.includes(fullPName) || fullPName.includes(cleanOwnerName))
              }) || null
            }
          } catch (err) { console.warn("No se pudo buscar al titular legal en personas por nombre:", err) }
        }

        if (matched) {
          selectPropietario(matched)
          setTitularDetectado({ ...legalOwner, matchedPersona: matched })
        } else {
          setTitularDetectado({ ...legalOwner, matchedPersona: null })
          setPropietarioSearch(legalOwner.nombre)
          setFormData((prev) => ({
            ...prev,
            propietarioDni: legalOwner.documento || '',
            propietario: legalOwner.nombre || '',
          }))
        }
      }
      
      setFormData(prev => ({
        ...prev,
        placa: plate,
        tipo: inferredTipo,
        marca: sunarpData.marca || prev.marca,
        modelo: sunarpData.modelo || prev.modelo,
        color: sunarpData.color || prev.color,
        anio: detectedModalAnio || prev.anio,
        categoria: sunarpData.categoria || prev.categoria,
        carroceria: sunarpData.carroceria || prev.carroceria,
        tipoCarroceria: sunarpData.tipo_carroceria || sunarpData.carroceria || prev.tipoCarroceria,
        sedeRegistro: sunarpData.sede || sunarpData.oficina_registral || sunarpData.oficina || sunarpData.sede_registro || prev.sedeRegistro,
        numeroSerie: sunarpData.serie || sunarpData.vin || sunarpData.numero_serie || sunarpData.nro_serie || prev.numeroSerie,
        serieMotor: sunarpData.nro_motor || sunarpData.numero_motor || sunarpData.motor || prev.serieMotor,
        partidaRegistral: sunarpData.partida || sunarpData.partida_registral || prev.partidaRegistral,
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
      
      const resJson = await response.json().catch(() => null)
      const nuevoVehiculo = resJson?.data || null

      showToast('Vehículo registrado correctamente', 'success')
      if (onSuccess) onSuccess(nuevoVehiculo)
      onClose()
    } catch (err) {
      showError('Error', err.message)
    }
  }

  return (
    <>
      <VehiculoFormModal
        isEditing={false}
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
        onOpenPersonaRapida={(titular) => abrirPersonaRapida(titular || titularDetectado)}
      />
      {modalPersonaRapida}
    </>
  )
}
