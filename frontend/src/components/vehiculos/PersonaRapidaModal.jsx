import { useState, useEffect } from 'react'
import { Icon } from '../ui/Icon'
import { FloatingInput } from '../ui/FormInputs'
import { apiFetch, leerMensajeError } from '../../config/api'
import { showError, showToast } from '../../utils/SwalUtil'
import { toTitleCase } from '../../utils/formatters'
import { BotonCancelar, BotonCerrarModal, BotonGuardar } from '../ui/ModalControls'

export function PersonaRapidaModal({
  isOpen,
  onClose,
  onPersonaCreada,
  initialNombre = '',
}) {
  const [formData, setFormData] = useState({
    tipoDocumento: 'DNI',
    numeroDocumento: '',
    nombres: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    celular: '',
    direccion: '',
    email: '',
    numeroLicencia: '',
    estadoCivil: '',
    fotoImg: '',
    estado: 'ACTIVO',
  })

  const [isSearchingDoc, setIsSearchingDoc] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // Intentar una división inicial del nombre detectado por si el operador no cuenta con DNI de inmediato
      let parsedPaterno = ''
      let parsedMaterno = ''
      let parsedNombres = ''

      if (initialNombre && typeof initialNombre === 'string') {
        const parts = initialNombre.trim().split(/\s+/).filter(Boolean)
        if (parts.length >= 3) {
          parsedPaterno = parts[0]
          parsedMaterno = parts[1]
          parsedNombres = parts.slice(2).join(' ')
        } else if (parts.length === 2) {
          parsedPaterno = parts[0]
          parsedNombres = parts[1]
        } else if (parts.length === 1) {
          parsedNombres = parts[0]
        }
      }

      setFormData({
        tipoDocumento: 'DNI',
        numeroDocumento: '',
        nombres: parsedNombres,
        apellidoPaterno: parsedPaterno,
        apellidoMaterno: parsedMaterno,
        celular: '',
        direccion: '',
        email: '',
        numeroLicencia: '',
        estadoCivil: '',
        fotoImg: '',
        estado: 'ACTIVO',
      })
    }
  }, [isOpen, initialNombre])

  if (!isOpen) return null

  const handleConsultarDocumento = async () => {
    const dni = formData.numeroDocumento.trim()
    if (!dni || dni.length !== 8 || !/^\d{8}$/.test(dni)) {
      showError('Documento inválido', 'El DNI debe tener exactamente 8 dígitos numéricos.')
      return
    }

    setIsSearchingDoc(true)
    try {
      const response = await apiFetch(`/pide/reniec/${dni}`)
      if (!response.ok) {
        const msg = await leerMensajeError(response, 'No se pudo obtener datos del documento.')
        throw new Error(msg)
      }

      const { data } = await response.json()
      if (data) {
        setFormData((prev) => ({
          ...prev,
          nombres: (data.nombres || '').toUpperCase() || prev.nombres,
          apellidoPaterno: (data.apellidoPaterno || '').toUpperCase() || prev.apellidoPaterno,
          apellidoMaterno: (data.apellidoMaterno || '').toUpperCase() || prev.apellidoMaterno,
          direccion: toTitleCase(data.direccion) || prev.direccion,
          estadoCivil: (data.estadoCivil || '').toUpperCase() || prev.estadoCivil,
        }))
        showToast('Datos de identidad cargados correctamente.')
      }
    } catch (err) {
      showError('Consulta de Documento', err.message || 'No se pudo consultar el documento de identidad.')
    } finally {
      setIsSearchingDoc(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const dni = formData.numeroDocumento.trim()
    if (!dni || dni.length !== 8 || !/^\d{8}$/.test(dni)) {
      showError('Validación', 'El DNI es obligatorio y debe tener 8 dígitos numéricos.')
      return
    }
    if (!formData.nombres.trim()) {
      showError('Validación', 'El nombre es obligatorio.')
      return
    }
    if (!formData.apellidoPaterno.trim()) {
      showError('Validación', 'El apellido paterno es obligatorio.')
      return
    }
    if (formData.celular && !/^\d{9}$/.test(formData.celular.trim())) {
      showError('Validación', 'El número de celular debe tener 9 dígitos numéricos.')
      return
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      showError('Validación', 'El correo electrónico no tiene un formato válido.')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        tipoDocumento: 'DNI',
        numeroDocumento: dni,
        nombres: formData.nombres.trim().toUpperCase(),
        apellidoPaterno: formData.apellidoPaterno.trim().toUpperCase(),
        apellidoMaterno: (formData.apellidoMaterno || '').trim().toUpperCase(),
        direccion: (formData.direccion || '').trim().toUpperCase(),
        celular: (formData.celular || '').trim(),
        telefono: '',
        email: (formData.email || '').trim().toLowerCase(),
        numeroLicencia: (formData.numeroLicencia || '').trim().toUpperCase(),
        estadoCivil: formData.estadoCivil || '',
        fotoImg: formData.fotoImg || '',
        estado: 'ACTIVO',
      }

      const response = await apiFetch('/personas', {
        method: 'POST',
        body: payload,
      })

      if (!response.ok) {
        const msg = await leerMensajeError(response, 'No se pudo registrar la persona.')
        const numDoc = (payload.numeroDocumento || '').trim()
        if (numDoc && (msg.toLowerCase().includes('ya existe') || msg.toLowerCase().includes('registrada') || response.status === 400 || response.status === 409)) {
          try {
            const resBusq = await apiFetch(`/personas?page=1&buscar=${encodeURIComponent(numDoc)}&porPagina=5`)
            if (resBusq.ok) {
              const payloadBusq = await resBusq.json()
              const encontrada = (payloadBusq.data || []).find(p => (p.numeroDocumento || p.numero || '').trim() === numDoc)
              if (encontrada) {
                showToast('La persona ya se encontraba registrada y fue seleccionada.')
                onPersonaCreada?.(encontrada)
                onClose?.()
                return
              }
            }
          } catch { /* continuar con error legible */ }
        }
        throw new Error(msg)
      }

      const resData = await response.json()
      const newPersona = resData.data || {
        ...payload,
        id: Date.now(),
      }

      showToast('Persona registrada y asignada.')
      onPersonaCreada?.(newPersona)
      onClose?.()
    } catch (err) {
      showError('Error al registrar', err.message || 'No se pudo guardar la persona en el padrón.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-60 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-enter">
      <div className="relative w-full max-w-xl rounded-3xl bg-white shadow-2xl dark:bg-[#1C2438] border border-slate-200 dark:border-[var(--border)] overflow-hidden">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-white px-5 py-3.5 dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md">
              <Icon name="people" className="size-4.5" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Registro Rápido de Titular / Persona
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Se guardará en el padrón y se asignará al vehículo automáticamente
              </p>
            </div>
          </div>
          <BotonCerrarModal onClick={onClose} title="Cerrar ventana" />
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} autoComplete="off" className="p-4 sm:p-5 space-y-3.5">
          {/* Banner de titular detectado */}
          {initialNombre ? (
            <div className="flex items-start gap-2.5 rounded-2xl border border-blue-200/80 bg-blue-50/70 p-3 text-xs text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-200">
              <span className="shrink-0 mt-0.5 grid size-5 place-items-center rounded-full bg-blue-600 text-white">
                <Icon name="info" className="size-3" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-extrabold uppercase tracking-wide text-[10.5px] text-blue-700 dark:text-blue-300">
                  Titular detectado en el registro:
                </p>
                <p className="font-bold text-slate-900 dark:text-white text-xs mt-0.5 min-w-0 break-words">
                  {initialNombre}
                </p>
                <p className="text-[10px] text-blue-800/80 dark:text-blue-300/80 mt-1">
                  Ingrese su DNI y presione la lupa para autocompletar sus datos oficiales.
                </p>
              </div>
            </div>
          ) : null}

          {/* DNI + Botón Lupa de Identidad */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Documento Nacional de Identidad (DNI) <span className="text-rose-500">*</span>
            </label>
            <div className="flex gap-2 items-start">
              <div className="flex-1 min-w-0">
                <FloatingInput
                  id="rapida_dni"
                  label="Número de DNI (8 dígitos)"
                  required
                  maxLength={8}
                  value={formData.numeroDocumento}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '')
                    setFormData({ ...formData, numeroDocumento: val })
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleConsultarDocumento()
                    }
                  }}
                  inputClassName="font-mono font-black text-sm tracking-widest"
                />
              </div>
              <button
                type="button"
                onClick={handleConsultarDocumento}
                disabled={isSearchingDoc || formData.numeroDocumento.trim().length !== 8}
                title="Consultar datos del documento"
                className="shrink-0 h-[42px] px-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center gap-1.5 hover:shadow-md hover:from-blue-700 hover:to-indigo-700 transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs text-xs font-bold"
              >
                {isSearchingDoc ? (
                  <span className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Icon name="search" className="size-4" />
                    <span className="hidden sm:inline">Consultar</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Foto si fue cargada */}
          {formData.fotoImg && (
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-2.5 dark:border-[var(--border)] dark:bg-slate-900/50">
              <img
                src={formData.fotoImg}
                alt="Foto"
                className="size-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
              />
              <div className="text-xs">
                <p className="font-bold text-slate-800 dark:text-slate-100">Foto oficial recuperada</p>
                <p className="text-[10px] text-slate-500">Se registrará en la ficha del ciudadano</p>
              </div>
            </div>
          )}

          {/* Nombres y Apellidos */}
          <div className="grid gap-2.5 sm:grid-cols-2">
            <FloatingInput
              id="rapida_paterno"
              label="Apellido Paterno"
              required
              value={formData.apellidoPaterno}
              onChange={(e) => setFormData({ ...formData, apellidoPaterno: e.target.value.toUpperCase() })}
              inputClassName="uppercase font-semibold"
            />
            <FloatingInput
              id="rapida_materno"
              label="Apellido Materno"
              value={formData.apellidoMaterno}
              onChange={(e) => setFormData({ ...formData, apellidoMaterno: e.target.value.toUpperCase() })}
              inputClassName="uppercase font-semibold"
            />
          </div>

          <FloatingInput
            id="rapida_nombres"
            label="Nombres Completos"
            required
            value={formData.nombres}
            onChange={(e) => setFormData({ ...formData, nombres: e.target.value.toUpperCase() })}
            inputClassName="uppercase font-semibold"
          />

          {/* Contacto y Dirección */}
          <div className="grid gap-2.5 sm:grid-cols-2">
            <FloatingInput
              id="rapida_celular"
              label="Celular (9 dígitos)"
              maxLength={9}
              value={formData.celular}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '')
                setFormData({ ...formData, celular: val })
              }}
              inputClassName="font-mono"
            />
            <FloatingInput
              id="rapida_email"
              label="Correo Electrónico"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
            />
          </div>

          <FloatingInput
            id="rapida_direccion"
            label="Dirección de Domicilio"
            value={formData.direccion}
            onChange={(e) => setFormData({ ...formData, direccion: e.target.value.toUpperCase() })}
            inputClassName="uppercase"
          />

          <FloatingInput
            id="rapida_licencia"
            label="N° Licencia de Conducir (Opcional)"
            maxLength={11}
            value={formData.numeroLicencia}
            onChange={(e) => setFormData({ ...formData, numeroLicencia: e.target.value.toUpperCase() })}
            inputClassName="uppercase font-mono"
          />

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-[var(--border)]">
            <BotonCancelar onClick={onClose} disabled={isSubmitting} />
            <BotonGuardar disabled={isSubmitting}>
              {isSubmitting ? (
              <>
              <span className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Guardando...</span>
              </>
              ) : (
              <>
              <Icon name="check" className="size-4" />
              <span>Guardar y Vincular como Propietario</span>
              </>
              )}
            </BotonGuardar>
          </div>
        </form>
      </div>
    </div>
  )
}
