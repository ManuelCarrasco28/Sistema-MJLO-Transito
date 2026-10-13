import { useState, useEffect } from 'react'
import { apiFetch, leerMensajeError, getCachedData, setCachedData } from '../../config/api'
import { showError, showToast, showSuccess } from '../../utils/SwalUtil'
import { toTitleCase } from '../../utils/formatters'
import { PersonaFormModal } from './PersonaFormModal'

function formatTipoDocLabel(t) {
  const code = (t.codigo || '').toUpperCase().trim()
  if (code === 'DNI') return 'DNI (Doc. Nacional)'
  if (code === 'CE') return 'Carnet de Extranjería'
  if (code === 'PAS' || code === 'PASAPORTE') return 'Pasaporte'
  if (t.nombre) {
    const clean = t.nombre.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
    return t.codigo ? `${t.codigo} - ${clean}` : clean
  }
  return t.codigo || t.nombre || 'Documento'
}

const ESTADO_OPTIONS = [
  { value: 'ACTIVO', label: 'ACTIVO' },
  { value: 'INACTIVO', label: 'INACTIVO' },
]

const ESTADO_CIVIL_OPTIONS = [
  { value: '', label: '' },
  { value: 'SOLTERO', label: 'SOLTERO(A)' },
  { value: 'CASADO', label: 'CASADO(A)' },
  { value: 'DIVORCIADO', label: 'DIVORCIADO(A)' },
  { value: 'VIUDO', label: 'VIUDO(A)' },
]

export function SmartPersonaFormModal({ onClose, onSuccess, initialPersona = null, initialDni = '', initialNombres = '', initialApellidos = '' }) {
  const cachedTipos = getCachedData('/tipo-documentos')
  const [tipoDocOptions, setTipoDocOptions] = useState(() => {
    if (cachedTipos && Array.isArray(cachedTipos) && cachedTipos.length > 0) {
      return cachedTipos.map((t) => ({
        value: t.codigo || t.nombre,
        label: formatTipoDocLabel(t),
      }))
    }
    return []
  })

  const [formData, setFormData] = useState({
    tipoDocumento: 'DNI',
    numeroDocumento: initialDni,
    nombres: initialNombres,
    apellidoPaterno: initialApellidos ? initialApellidos.split(' ')[0] : '',
    apellidoMaterno: initialApellidos && initialApellidos.split(' ').length > 1 ? initialApellidos.split(' ').slice(1).join(' ') : '',
    direccion: '',
    telefono: '',
    celular: '',
    email: '',
    numeroLicencia: '',
    estado: 'ACTIVO',
    estadoCivil: '',
    fotoImg: '',
    ...(initialPersona || {}),
    tipoDocumento: initialPersona?.tipoDocumento === 'DOCUMENTO NACIONAL DE IDENTIDAD' ? 'DNI' : (initialPersona?.tipoDocumento || 'DNI'),
  })

  const [isSearchingReniec, setIsSearchingReniec] = useState(false)
  const [isFetchingFotoReniec, setIsFetchingFotoReniec] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    apiFetch('/tipo-documentos')
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (payload?.data && Array.isArray(payload.data) && payload.data.length > 0) {
          setCachedData('/tipo-documentos', payload.data)
          const opts = payload.data.map((t) => ({
            value: t.codigo || t.nombre,
            label: formatTipoDocLabel(t),
          }))
          setTipoDocOptions(opts)
        }
      })
      .catch(() => { })
  }, [])

  const handleReniecSearch = async () => {
    const dni = formData.numeroDocumento?.trim()
    if (!dni || dni.length !== 8 || !/^\d{8}$/.test(dni)) {
      showError('DNI Inválido', 'El número de DNI debe tener exactamente 8 dígitos numéricos.')
      return
    }

    setIsSearchingReniec(true)
    try {
      const response = await apiFetch(`/pide/reniec/${dni}`)
      if (!response.ok) {
        throw new Error(await leerMensajeError(response, 'El servicio de consulta no responde en este momento.'))
      }
      const res = await response.json()
      const data = res.data || (res.nombres ? res : null)

      if (data) {
        setFormData(prev => ({
          ...prev,
          nombres: (data.nombres || '').toUpperCase() || prev.nombres,
          apellidoPaterno: (data.apellidoPaterno || data.apellido_paterno || '').toUpperCase() || prev.apellidoPaterno,
          apellidoMaterno: (data.apellidoMaterno || data.apellido_materno || '').toUpperCase() || prev.apellidoMaterno,
          direccion: toTitleCase(data.direccion) || prev.direccion,
          estadoCivil: (data.estadoCivil || data.estado_civil || '').toUpperCase() || prev.estadoCivil,
        }))
      } else {
        throw new Error('No se encontraron datos para el documento ingresado.')
      }
    } catch (err) {
      showError('Consulta de Documento', err.message || 'No se pudo consultar la información del documento.')
    } finally {
      setIsSearchingReniec(false)
    }
  }

  const handleUsarFotoReniec = async () => {
    const dni = formData.numeroDocumento?.trim()
    if (!dni || dni.length !== 8 || !/^\d{8}$/.test(dni)) {
      showError('DNI Inválido', 'El número de DNI debe tener exactamente 8 dígitos numéricos.')
      return
    }

    setIsFetchingFotoReniec(true)
    try {
      const response = await apiFetch(`/pide/reniec/${dni}`)
      if (!response.ok) throw new Error('El servicio de consulta no responde en este momento.')
      const res = await response.json()
      const data = res.data || (res.nombres ? res : null)
      const foto = data?.foto_url || data?.foto
      if (!foto) {
        showError('Sin foto', 'RENIEC no devolvió una foto para este documento.')
        return
      }
      setFormData(prev => ({ ...prev, fotoImg: foto, fotoUrl: foto }))
      showToast('Foto de RENIEC aplicada.')
    } catch (err) {
      showError('Consulta de Foto', err.message || 'No se pudo obtener la foto de RENIEC.')
    } finally {
      setIsFetchingFotoReniec(false)
    }
  }

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      showError('Formato Inválido', 'Selecciona una imagen válida (JPG, PNG).')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const rawData = ev.target?.result
      if (!rawData) return
      const img = new Image()
      img.onload = () => {
        const maxDim = 400
        let width = img.width
        let height = img.height
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          } else {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        const compressed = canvas.toDataURL('image/jpeg', 0.85)
        setFormData((prev) => ({ ...prev, fotoImg: compressed, fotoUrl: compressed }))
      }
      img.onerror = () => {
        setFormData((prev) => ({ ...prev, fotoImg: rawData, fotoUrl: rawData }))
      }
      img.src = rawData
    }
    reader.readAsDataURL(file)
  }

  const handleClearPhoto = () => {
    setFormData((prev) => ({ ...prev, fotoImg: '', fotoUrl: '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isSubmitting) return

    if (!formData.numeroDocumento || !formData.nombres || !formData.apellidoPaterno) {
      showError('Validación', 'Los campos de documento, nombres y apellido paterno son obligatorios.')
      return
    }

    setIsSubmitting(true)
    try {
      if (isSubmitting) return
      const response = await apiFetch(initialPersona ? `/personas/${encodeURIComponent(initialPersona.uuid || initialPersona.id)}` : '/personas', {
        method: initialPersona ? 'PUT' : 'POST',
        body: JSON.stringify(formData),
      })
      if (!response.ok) {
        throw new Error(await leerMensajeError(response))
      }
      const data = await response.json()
      showSuccess(initialPersona ? 'Actualizado' : 'Creado', initialPersona ? 'Persona actualizada correctamente.' : 'Persona registrada correctamente.')
      if (onSuccess) onSuccess(data.data || data)
      onClose()
    } catch (err) {
      showError('Error al guardar', err.message || 'Error desconocido')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PersonaFormModal
      isEditing={Boolean(initialPersona)}
      formData={formData}
      setFormData={setFormData}
      handlePhotoUpload={handlePhotoUpload}
      handleClearPhoto={handleClearPhoto}
      tipoDocOptions={tipoDocOptions}
      handleReniecSearch={handleReniecSearch}
      isSearchingReniec={isSearchingReniec}
      handleUsarFotoReniec={handleUsarFotoReniec}
      isFetchingFotoReniec={isFetchingFotoReniec}
      estadoCivilOptions={ESTADO_CIVIL_OPTIONS}
      estadoOptions={ESTADO_OPTIONS}
      onSubmit={handleSubmit}
      onClose={onClose}
    />
  )
}
