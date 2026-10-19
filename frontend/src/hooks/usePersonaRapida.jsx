import { useState } from 'react'
import { PersonaFormModal } from '../components/personas/PersonaFormModal'
import { apiFetch, sanitizarMensaje, leerMensajeError } from '../config/api'
import { showError, showToast, showWarning, showConfirm } from '../utils/SwalUtil'

const FORM_VACIO = {
  tipoDocumento: 'DNI', numeroDocumento: '', nombres: '', apellidoPaterno: '', apellidoMaterno: '', celular: '',
  telefonoFijo: '', direccion: '', correoElectronico: '', estado: 'ACTIVO', numeroLicencia: '', estadoCivil: '', fotoImg: '',
}
const TIPOS_DOC = [
  { value: 'DNI', label: 'DNI (Doc. Nacional)' },
  { value: 'CE', label: 'Carnet de Extranjería' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
]
// Mismos valores que usa la pantalla de Personas (y que devuelve RENIEC): SOLTERO, CASADO…
const ESTADO_CIVIL = [
  { value: '', label: '' },
  { value: 'SOLTERO', label: 'SOLTERO(A)' },
  { value: 'CASADO', label: 'CASADO(A)' },
  { value: 'DIVORCIADO', label: 'DIVORCIADO(A)' },
  { value: 'VIUDO', label: 'VIUDO(A)' },
]
const ESTADOS = ['ACTIVO', 'INACTIVO', 'FALLECIDO', 'RETIRADO']

/**
 * Alta rápida de una persona del padrón desde otro formulario (p. ej. al crear un usuario cuando la persona
 * aún no está registrada). Devuelve `abrir(dniInicial)` y el `modal` que hay que renderizar.
 * `alCrear(persona)` recibe { id, numeroDocumento, nombres, apellidoPaterno, apellidoMaterno }.
 */
export function usePersonaRapida({ alCrear }) {
  const [abierto, setAbierto] = useState(false)
  const [formData, setFormData] = useState(FORM_VACIO)
  const [fieldErrors, setFieldErrors] = useState({})
  const [buscandoReniec, setBuscandoReniec] = useState(false)
  const [buscandoFoto, setBuscandoFoto] = useState(false)

  const abrir = (paramInicial = '') => {
    setFieldErrors({})
    let soloDigitos = ''
    let inicial = {}
    if (typeof paramInicial === 'object' && paramInicial !== null) {
      soloDigitos = String(paramInicial.documento || paramInicial.numeroDocumento || paramInicial.dni || '').replace(/\D/g, '').slice(0, 8)
      const rawName = (paramInicial.nombre || '').trim()
      let paterno = paramInicial.apellidoPaterno || ''
      let materno = paramInicial.apellidoMaterno || ''
      let nombres = paramInicial.nombres || ''
      if (rawName && !paterno && !nombres) {
        const parts = rawName.split(/\s+/)
        if (parts.length >= 3) {
          paterno = parts[0]
          materno = parts[1]
          nombres = parts.slice(2).join(' ')
        } else if (parts.length === 2) {
          paterno = parts[0]
          nombres = parts[1]
        } else if (parts.length === 1) {
          nombres = parts[0]
        }
      }
      inicial = {
        numeroDocumento: soloDigitos,
        apellidoPaterno: paterno,
        apellidoMaterno: materno,
        nombres: nombres,
        fechaNacimiento: String(paramInicial.fechaNacimiento || ''),
        estadoCivil: String(paramInicial.estadoCivil || '').toUpperCase(),
        direccion: String(paramInicial.direccion || ''),
        fotoImg: String(paramInicial.fotoImg || ''),
      }
    } else {
      soloDigitos = String(paramInicial || '').replace(/\D/g, '').slice(0, 8)
      inicial = { numeroDocumento: soloDigitos }
    }
    setFormData({ ...FORM_VACIO, ...inicial })
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
      if (!soloFoto) {
        // Verificar si la persona ya existe en el padrón municipal
        try {
          const resLocal = await apiFetch(`/personas?numeroDocumento=${dni}&soloRegistrados=1`)
          if (resLocal.ok) {
            const dataLocal = await resLocal.json()
            const personaLocal = (dataLocal.data || []).find((p) => Number(p.id) > 0)
            if (personaLocal) {
              const nombreCompleto = personaLocal.nombreCompleto || `${personaLocal.nombres || ''} ${personaLocal.apellidoPaterno || ''} ${personaLocal.apellidoMaterno || ''}`.trim()
              setFieldErrors({ numeroDocumento: `Ya registrada a nombre de ${nombreCompleto}` })
              showWarning('Persona ya registrada', `El DNI ${dni} ya se encuentra registrado en el sistema a nombre de ${nombreCompleto}.`)
              setFormData((p) => ({
                ...p,
                nombres: personaLocal.nombres || p.nombres,
                apellidoPaterno: personaLocal.apellidoPaterno || p.apellidoPaterno,
                apellidoMaterno: personaLocal.apellidoMaterno || p.apellidoMaterno,
                direccion: personaLocal.direccion || p.direccion,
                numeroLicencia: personaLocal.numeroLicencia || p.numeroLicencia,
                fotoImg: personaLocal.fotoUrl || personaLocal.foto || p.fotoImg,
              }))
              return
            }
          }
        } catch (eLocal) {
          console.warn('No se pudo verificar padrón local:', eLocal)
        }
      }

      const respuesta = await apiFetch(`/pide/reniec/${dni}`)
      if (!respuesta.ok) {
        const msg = await leerMensajeError(respuesta, 'No se pudo consultar el documento en RENIEC.')
        throw new Error(msg)
      }
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
        estadoCivil: String(datos.estadoCivil || datos.estado_civil || '').toUpperCase() || p.estadoCivil,
      }))
      showToast('Datos cargados desde RENIEC')
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
    setFieldErrors({})
    try {
      const respuesta = await apiFetch('/personas', { method: 'POST', body: formData })
      const resultado = await respuesta.json().catch(() => ({}))
      
      if (!respuesta.ok) {
        const rawMessages = resultado?.messages || {}
        let errorMsg = ''
        const fieldErrObj = {}

        if (typeof rawMessages === 'object' && Object.keys(rawMessages).length > 0) {
          const errorList = []
          for (const [campo, mensaje] of Object.entries(rawMessages)) {
            const msgStr = Array.isArray(mensaje) ? mensaje.join(', ') : String(mensaje)
            fieldErrObj[campo] = msgStr
            errorList.push(msgStr)
          }
          setFieldErrors(fieldErrObj)
          errorMsg = errorList.join('\n')
        } else if (typeof rawMessages === 'string') {
          errorMsg = rawMessages
        } else if (typeof resultado?.message === 'string') {
          errorMsg = resultado.message
        }

        if (!errorMsg) {
          errorMsg = 'No se pudo registrar la persona.'
        }

        const esDuplicado = /duplicad|ya se encuentra registrado/i.test(errorMsg)

        // Si es duplicado, consultar quién es la persona para darle opción de asignarla directamente
        if (esDuplicado && formData.numeroDocumento) {
          try {
            const resBusqueda = await apiFetch(`/personas?numeroDocumento=${encodeURIComponent(formData.numeroDocumento.trim())}&soloRegistrados=1`)
            if (resBusqueda.ok) {
              const payloadBusq = await resBusqueda.json()
              const encontrada = (payloadBusq.data || []).find((p) => Number(p.id) > 0)
              if (encontrada) {
                const nombreCompleto = encontrada.nombreCompleto || `${encontrada.nombres || ''} ${encontrada.apellidoPaterno || ''} ${encontrada.apellidoMaterno || ''}`.trim()
                const confirmacion = await showConfirm(
                  'Persona ya registrada',
                  `El documento ${formData.numeroDocumento} ya está registrado en el sistema a nombre de:\n\n${nombreCompleto}\n\n¿Desea seleccionarla directamente?`,
                  'Sí, seleccionar persona',
                  'Corregir datos'
                )
                if (confirmacion.isConfirmed) {
                  setAbierto(false)
                  alCrear({
                    id: encontrada.id,
                    numeroDocumento: encontrada.numeroDocumento || encontrada.numero || formData.numeroDocumento,
                    nombres: encontrada.nombres,
                    apellidoPaterno: encontrada.apellidoPaterno,
                    apellidoMaterno: encontrada.apellidoMaterno,
                  })
                  showToast('Persona seleccionada correctamente')
                  return
                }
                return
              }
            }
          } catch (errBusq) {
            console.warn('No se pudo buscar persona duplicada:', errBusq)
          }
        }

        showError(esDuplicado ? 'Persona ya registrada' : 'Error al registrar', sanitizarMensaje(errorMsg, 'No se pudo registrar la persona.'))
        return
      }

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
      fieldErrors={fieldErrors}
      onClearFieldError={(campo) => setFieldErrors((p) => ({ ...p, [campo]: '' }))}
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
