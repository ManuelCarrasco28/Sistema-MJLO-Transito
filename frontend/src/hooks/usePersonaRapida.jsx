import { useState } from 'react'
import { PersonaFormModal } from '../components/personas/PersonaFormModal'
import { apiFetch, sanitizarMensaje } from '../config/api'
import { showError, showToast } from '../utils/SwalUtil'

const FORM_VACIO = {
  tipoDocumento: 'DNI', numeroDocumento: '', nombres: '', apellidoPaterno: '', apellidoMaterno: '', celular: '',
  telefonoFijo: '', direccion: '', correoElectronico: '', estado: 'ACTIVO', numeroLicencia: '', estadoCivil: '', fotoImg: '',
}
const TIPOS_DOC = [
  { value: 'DNI', label: 'DNI (Doc. Nacional)' },
  { value: 'CE', label: 'Carnet de Extranjería' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
]
const ESTADO_CIVIL = ['SOLTERO(A)', 'CASADO(A)', 'DIVORCIADO(A)', 'VIUDO(A)']
const ESTADOS = ['ACTIVO', 'INACTIVO', 'FALLECIDO', 'RETIRADO']

/**
 * Alta rápida de una persona del padrón desde otro formulario (p. ej. al crear un usuario cuando la persona
 * aún no está registrada). Devuelve `abrir(dniInicial)` y el `modal` que hay que renderizar.
 * `alCrear(persona)` recibe { id, numeroDocumento, nombres, apellidoPaterno, apellidoMaterno }.
 */
export function usePersonaRapida({ alCrear }) {
  const [abierto, setAbierto] = useState(false)
  const [formData, setFormData] = useState(FORM_VACIO)
  const [buscandoReniec, setBuscandoReniec] = useState(false)
  const [buscandoFoto, setBuscandoFoto] = useState(false)

  const abrir = (documentoInicial = '') => {
    const soloDigitos = String(documentoInicial || '').replace(/\D/g, '').slice(0, 8)
    setFormData({ ...FORM_VACIO, numeroDocumento: soloDigitos })
    setAbierto(true)
  }

  const consultarReniec = async (soloFoto = false) => {
    const dni = formData.numeroDocumento?.trim()
    if (!dni || dni.length !== 8) {
      if (!soloFoto) showError('DNI inválido', 'El DNI debe tener 8 dígitos.')
      return
    }
    soloFoto ? setBuscandoFoto(true) : setBuscandoReniec(true)
    try {
      const respuesta = await apiFetch(`/pide/reniec/${dni}`)
      if (!respuesta.ok) throw new Error('No se pudo consultar el documento.')
      const payload = await respuesta.json()
      const datos = payload.data || payload
      if (soloFoto) {
        if (datos?.foto_url || datos?.foto) setFormData((p) => ({ ...p, fotoImg: datos.foto_url || datos.foto }))
        return
      }
      setFormData((p) => ({
        ...p,
        nombres: datos.nombres || p.nombres,
        apellidoPaterno: datos.apellidoPaterno || datos.apellido_paterno || p.apellidoPaterno,
        apellidoMaterno: datos.apellidoMaterno || datos.apellido_materno || p.apellidoMaterno,
        direccion: datos.direccion || p.direccion,
        estadoCivil: datos.estadoCivil || datos.estado_civil || p.estadoCivil,
      }))
      showToast('Datos cargados')
    } catch (err) {
      showError('Error', sanitizarMensaje(err.message, 'No se pudo consultar el documento.'))
    } finally {
      setBuscandoReniec(false)
      setBuscandoFoto(false)
    }
  }

  const subirFoto = (evento) => {
    const archivo = evento.target.files?.[0]
    if (!archivo) return
    if (!archivo.type.startsWith('image/')) {
      showError('Formato inválido', 'Seleccione una imagen (JPG, PNG o WebP).')
      return
    }
    const lector = new FileReader()
    lector.onload = (e) => {
      const crudo = e.target?.result
      if (!crudo) return
      const img = new Image()
      img.onload = () => {
        const maximo = 400
        const escala = Math.min(1, maximo / Math.max(img.width, img.height))
        const lienzo = document.createElement('canvas')
        lienzo.width = Math.round(img.width * escala)
        lienzo.height = Math.round(img.height * escala)
        lienzo.getContext('2d').drawImage(img, 0, 0, lienzo.width, lienzo.height)
        setFormData((p) => ({ ...p, fotoImg: lienzo.toDataURL('image/jpeg', 0.85) }))
      }
      img.onerror = () => setFormData((p) => ({ ...p, fotoImg: crudo }))
      img.src = crudo
    }
    lector.readAsDataURL(archivo)
  }

  const guardar = async (evento) => {
    evento.preventDefault()
    try {
      const respuesta = await apiFetch('/personas', { method: 'POST', body: formData })
      const resultado = await respuesta.json().catch(() => ({}))
      if (!respuesta.ok) throw new Error(resultado.messages?.error || resultado.message || 'No se pudo registrar la persona.')
      const creada = resultado.data || {}
      showToast('Persona registrada correctamente', 'crear')
      setAbierto(false)
      alCrear({
        id: creada.id,
        numeroDocumento: creada.numeroDocumento || formData.numeroDocumento,
        nombres: creada.nombres || formData.nombres,
        apellidoPaterno: creada.apellidoPaterno || formData.apellidoPaterno,
        apellidoMaterno: creada.apellidoMaterno || formData.apellidoMaterno,
      })
    } catch (err) {
      showError('Error', sanitizarMensaje(err.message, 'No se pudo registrar la persona.'))
    }
  }

  const modal = abierto ? (
    <PersonaFormModal
      isEditing={false}
      formData={formData}
      setFormData={setFormData}
      handlePhotoUpload={subirFoto}
      handleClearPhoto={() => setFormData((p) => ({ ...p, fotoImg: '' }))}
      tipoDocOptions={TIPOS_DOC}
      handleReniecSearch={() => consultarReniec(false)}
      isSearchingReniec={buscandoReniec}
      handleUsarFotoReniec={() => consultarReniec(true)}
      isFetchingFotoReniec={buscandoFoto}
      estadoCivilOptions={ESTADO_CIVIL}
      estadoOptions={ESTADOS}
      onSubmit={guardar}
      onClose={() => setAbierto(false)}
    />
  ) : null

  return { abrir, modal }
}
