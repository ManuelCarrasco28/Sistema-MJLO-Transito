import { formatRangoHoras12, formatTextoHorario12 } from '../utils/formatters'
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { estadoParticipante, actualizarParticipante } from '../utils/participantesCurso'
import { inscripcionCursoAbierta, fechaLocalActual } from '../utils/calendarioCurso'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { apiFetch, getCachedData, leerMensajeError } from '../config/api'
import { showError, showWarning, showToast } from '../utils/SwalUtil'
import { Icon } from '../components/ui/Icon'
import { Cargando } from '../components/ui/Cargando'
import { CobrarPagoModal } from '../components/pagos/CobrarPagoModal'
import { StatusBadge } from '../components/ui/StatusBadge'
import { PersonaFormModal } from '../components/personas/PersonaFormModal'
import './CursoDetalleVentana.css'
import { retirarInscripcion } from '../utils/retirarInscripcion'

const CLASES_FOTO_PARTICIPANTE = 'size-11 shrink-0 rounded-full border border-slate-200 bg-white object-cover dark:border-[var(--border-strong)]'

function AvatarParticipante({ fotoUrl }) {
  const [fallo, setFallo] = React.useState(false)
  if (fotoUrl && !fallo) {
    return <img src={fotoUrl} alt="" loading="lazy" onError={() => setFallo(true)} className={CLASES_FOTO_PARTICIPANTE} />
  }
  return (
    <span className="grid size-11 shrink-0 place-items-center rounded-full border border-slate-200 bg-slate-100 text-slate-400 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-slate-500" aria-hidden="true">
      <Icon name="user" className="size-5" />
    </span>
  )
}

function fechaLegible(valor) {
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(valor || '') ? new Date(valor + 'T12:00:00Z') : null
  return fecha && !Number.isNaN(fecha.getTime())
    ? new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(fecha)
    : 'Sin registrar'
}

function sanitizarMensaje(msg, defaultMsg) {
  if (typeof msg !== 'string') return defaultMsg
  if (msg.includes('SQLSTATE') || msg.includes('SQL syntax')) return defaultMsg
  return msg
}

function getPersonaNombre(p) {
  if (!p) return ''
  if (p.nombres || p.apellidoPaterno || p.apellidoMaterno) {
    return `${p.nombres || ''} ${p.apellidoPaterno || ''} ${p.apellidoMaterno || ''}`.trim()
  }
  return p.nombres || p.numeroDocumento || p.numero || 'Sin Nombre'
}

export default function CursoDetalleVentana() {
  const { id: idEnRuta } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  // El identificador del curso no se muestra en la dirección: llega en el estado de la navegación
  // (sobrevive a recargar la página). Un enlace antiguo con el id en la ruta se reescribe sin él.
  const id = idEnRuta || location.state?.cursoId
  useEffect(() => {
    if (idEnRuta) navigate('/cursos/detalle', { replace: true, state: { cursoId: idEnRuta } })
    else if (!id) navigate('/cursos', { replace: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [curso, setCurso] = useState(() => {
    const cached = getCachedData('/cursos')
    if (cached) return cached.find(x => x.id == id || x.uuid === id) || null
    return null
  })
  const [loading, setLoading] = useState(!getCachedData('/cursos'))
  const [error, setError] = useState('')

  // Inscripcion states
  const [participanteSearch, setParticipanteSearch] = useState('')
  const [showParticipanteResults, setShowParticipanteResults] = useState(false)
  const [participanteResults, setParticipanteResults] = useState([])
  const [isSearchingParticipante, setIsSearchingParticipante] = useState(false)
  const [inscribiendo, setInscribiendo] = useState(false)
  const buscadorRef = useRef(null)
  const resultadosRef = useRef(null)
  const [posicionResultados, setPosicionResultados] = useState(null)

  useLayoutEffect(() => {
    if (!showParticipanteResults || participanteSearch.trim().length < 2) {
      setPosicionResultados(null)
      return
    }
    const colocar = () => {
      const input = buscadorRef.current
      if (!input) return
      const rect = input.getBoundingClientRect()
      const espacioAbajo = window.innerHeight - rect.bottom - 16
      const espacioArriba = rect.top - 16
      const arriba = espacioAbajo < 220 && espacioArriba > espacioAbajo
      const maxHeight = Math.max(0, Math.min(280, arriba ? espacioArriba : espacioAbajo))
      const left = Math.max(12, rect.left)
      setPosicionResultados({
        left, width: Math.max(0, Math.min(rect.width, document.documentElement.clientWidth - left - 12)),
        maxHeight, ...(arriba ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 })
      })
    }
    const cerrarFuera = event => {
      if (!buscadorRef.current?.contains(event.target) && !resultadosRef.current?.contains(event.target)) setShowParticipanteResults(false)
    }
    colocar()
    window.addEventListener('resize', colocar)
    window.addEventListener('scroll', colocar, true)
    document.addEventListener('pointerdown', cerrarFuera)
    return () => {
      window.removeEventListener('resize', colocar)
      window.removeEventListener('scroll', colocar, true)
      document.removeEventListener('pointerdown', cerrarFuera)
    }
  }, [showParticipanteResults, participanteSearch])
  const [retirando, setRetirando] = useState(null)
  // Participante cuya inscripción se está cobrando desde esta pantalla
  const [cobrando, setCobrando] = useState(null)

  const handleRetirar = async (participante) => {
    if (curso?.estado === 'FINALIZADO') return
    const clave = participante.uuid || participante.idInscripcion || participante.dni
    setRetirando(clave)
    try {
      const resultado = await retirarInscripcion(participante)
      if (!resultado) return
      setCurso(actual => {
        const participantes = actual.participantes.filter(p => (p.uuid || p.idInscripcion || p.dni) !== clave)
        return { ...actual, participantes, inscritos: participantes.length, cuposInscritos: resultado.cuposInscritos }
      })
    } finally {
      setRetirando(null)
    }
  }

  // Persona Form states
  const [isPersonaModalOpen, setPersonaModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    tipoDocumento: 'DNI', numeroDocumento: '', nombres: '', apellidoPaterno: '', apellidoMaterno: '', celular: '',
    telefonoFijo: '', direccion: '', correoElectronico: '', estado: 'ACTIVO', nroLicencia: '', estadoCivil: '', fotoImg: ''
  })
  const [isSearchingReniec, setIsSearchingReniec] = useState(false)
  const [isFetchingFotoReniec, setIsFetchingFotoReniec] = useState(false)
  const ESTADO_CIVIL_OPTIONS = ['SOLTERO(A)', 'CASADO(A)', 'DIVORCIADO(A)', 'VIUDO(A)']
  const ESTADO_OPTIONS = ['ACTIVO', 'INACTIVO', 'FALLECIDO', 'RETIRADO']

  const handleReniecSearch = async () => {
    const dni = formData.numeroDocumento?.trim()
    if (!dni || dni.length !== 8) {
      showError('DNI Inválido', 'El DNI debe tener 8 dígitos.')
      return
    }
    setIsSearchingReniec(true)
    try {
      const response = await apiFetch(`/pide/reniec/${dni}`)
      if (!response.ok) throw new Error('Error al consultar')
      const res = await response.json()
      const data = res.data || res
      if (data) {
        setFormData(prev => ({
          ...prev,
          nombres: data.nombres || prev.nombres,
          apellidoPaterno: data.apellidoPaterno || data.apellido_paterno || prev.apellidoPaterno,
          apellidoMaterno: data.apellidoMaterno || data.apellido_materno || prev.apellidoMaterno,
          direccion: data.direccion || prev.direccion,
          estadoCivil: data.estadoCivil || data.estado_civil || prev.estadoCivil
        }))
        showToast('Datos de RENIEC cargados')
      }
    } catch (err) {
      showError('Error', err.message)
    } finally {
      setIsSearchingReniec(false)
    }
  }

  const handleUsarFotoReniec = async () => {
    const dni = formData.numeroDocumento?.trim()
    if (!dni || dni.length !== 8) return
    setIsFetchingFotoReniec(true)
    try {
      const response = await apiFetch(`/pide/reniec/${dni}`)
      const res = await response.json()
      const data = res.data || res
      if (data?.foto_url || data?.foto) {
        setFormData(prev => ({ ...prev, fotoImg: data.foto_url || data.foto }))
        showToast('Foto cargada')
      }
    } finally {
      setIsFetchingFotoReniec(false)
    }
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    try {
      const response = await apiFetch('/personas', { method: 'POST', body: formData })
      const result = await response.json()
      if (!response.ok) throw new Error(result.messages?.error || 'Error al guardar')

      showToast('Persona registrada correctamente')
      setPersonaModalOpen(false)

      // Auto-inscribir
      const dni = formData.numeroDocumento
      if (dni) {
        try {
          const resIns = await apiFetch(`/cursos/${curso.id}/participantes`, { method: 'POST', body: { dni } })
          const resInsData = await resIns.json()
          if (resIns.ok) {
            const updatedParticipantes = [...(curso.participantes || []), resInsData.data]
            setCurso({ ...curso, participantes: updatedParticipantes, inscritos: updatedParticipantes.length, cuposInscritos: (curso.cuposInscritos ?? 0) + 1 })
            showToast('Persona inscrita en el curso automáticamente')
          } else {
            showError('Inscripción pendiente', resInsData?.messages?.error || resInsData?.message || 'La persona se registró, pero no se pudo inscribir en el curso. Inscríbala manualmente.')
          }
        } catch (err) {
          showError('Inscripción pendiente', 'La persona se registró, pero no se pudo inscribir en el curso. Inscríbala manualmente.')
        }
      }
    } catch (err) {
      showError('Error', err.message)
    }
  }


  // Cargar el curso
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    async function load() {
      try {
        const res = await apiFetch(`/cursos/${encodeURIComponent(id)}`, { signal: controller.signal })
        if (!res.ok) throw new Error('Curso no encontrado.')
        const data = await res.json()
        if (controller.signal.aborted) return
        if (data.data) {
          const c = data.data
          if (c) {
            setCurso(c)
            document.title = `Curso ${c.codigo} - Detalles`
          } else {
            setError('No se encontró el curso.')
          }
        }
      } catch (e) {
        if (!controller.signal.aborted) setError('No se pudo cargar el curso.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [id])

  // Broadcast channel for notifying parent window
  useEffect(() => {
    if (curso) {
      const bc = new BroadcastChannel('cursos_channel')
      bc.postMessage({ type: 'CURSO_UPDATED', cursoId: curso.id })
      return () => bc.close()
    }
  }, [curso])

  // Buscador
  useEffect(() => {
    if (!participanteSearch.trim() || participanteSearch.length < 2) {
      setParticipanteResults([])
      setIsSearchingParticipante(false)
      return
    }
    const rawQuery = participanteSearch.trim()
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setIsSearchingParticipante(true)
      apiFetch(`/personas?page=1&buscar=${encodeURIComponent(rawQuery)}&porPagina=12`, { signal: controller.signal })
        .then((res) => (res.ok ? res.json() : { data: [] }))
        .then((payload) => {
          if (controller.signal.aborted) return
          const list = (payload.data || []).filter((p) => {
            if (getPersonaNombre(p).toUpperCase().includes('SIN PROPIETARIO')) return false
            return true
          })
          setParticipanteResults(list.slice(0, 8))
        })
        .catch(() => {})
        .finally(() => { if (!controller.signal.aborted) setIsSearchingParticipante(false) })
    }, 250)
    return () => { clearTimeout(timer); controller.abort() }
  }, [participanteSearch, curso])

  if (loading) return <Cargando className="min-h-[60vh]" />
  if (error || !curso) return <div className="p-10 text-center font-bold text-rose-500">{error || 'Curso no encontrado.'}</div>

  const inscritos = Number(curso.cuposInscritos ?? curso.participantes?.length ?? 0)
  const capacidad = Number(curso.cuposTotales || 0)
  const disponibles = Math.max(0, capacidad - inscritos)
  const ocupacion = capacidad > 0 ? Math.min(100, inscritos / capacidad * 100) : 0
  const inscripcionAbierta = inscripcionCursoAbierta(curso)
  const cursoIniciado = fechaLocalActual() >= (curso.fecha || curso.fecha_inicio || '')

  return (
    <div className="curso-detalle">
      <div className="curso-detalle__scroll">
        <div className="curso-detalle__container">
          <div className="curso-detalle__hero">
            <button onClick={() => navigate('/cursos')} className="curso-detalle__salir" type="button" title="Salir y volver a cursos" aria-label="Salir y volver a cursos">
              <Icon name="logout" className="size-4" /><span>Volver a cursos</span>
            </button>
            <div className="curso-detalle__heading">
              <span className="curso-detalle__symbol"><Icon name="course" className="size-7" /></span>
              <div className="curso-detalle__title">
                <p className="curso-detalle__eyebrow">SEGURIDAD VIAL · DETALLE DEL CURSO</p>
                <h1>{curso.titulo}</h1>
                <span className="curso-detalle__code">{curso.codigo}</span>
              </div>
              <StatusBadge status={curso.estado} label={curso.estado === 'FINALIZADO' ? 'CULMINADO' : undefined} />
            </div>
            <div className="curso-detalle__metadata">
              <span><Icon name="user" className="size-4" /><span><small>Instructor</small>{curso.instructor || 'Por asignar'}</span></span>
              <span><Icon name="building" className="size-4" /><span><small>Lugar</small>{curso.lugar || 'Por confirmar'}</span></span>
            </div>
          </div>

          <div className="curso-detalle__overview">
            <div className="curso-detalle__card">
              <div className="curso-detalle__card-title"><Icon name="permit" className="size-5" /><h2>Fechas del curso</h2></div>
              <div className="curso-detalle__dates">
                <div><small>Inicio</small><strong>{fechaLegible(curso.fecha)}</strong></div>
                <div><small>Finalización</small><strong>{fechaLegible(curso.fechaFin || curso.fecha_fin)}</strong></div>
              </div>
              <p className="curso-detalle__card-footer">Horario: <strong>{formatRangoHoras12(curso.horaInicio, curso.horaFin) || formatTextoHorario12(curso.horario) || 'Por confirmar'}</strong></p>
            </div>
            <div className="curso-detalle__card">
              <div className="curso-detalle__card-title"><Icon name="idCard" className="size-5" /><h2>Inscripciones</h2></div>
              <div className="curso-detalle__dates">
                <div><small>Apertura</small><strong>{fechaLegible(curso.fechaInscripcionInicio)}</strong></div>
                <div><small>Cierre</small><strong>{fechaLegible(curso.fechaInscripcionFin)}</strong></div>
              </div>
              <p className="curso-detalle__card-footer"><span className={inscripcionAbierta ? 'curso-detalle__open' : ''}>{inscripcionAbierta ? 'Inscripciones abiertas' : 'Inscripciones no disponibles'}</span></p>
            </div>
            <div className="curso-detalle__card">
              <div className="curso-detalle__card-title"><Icon name="people" className="size-5" /><h2>Capacidad del curso</h2></div>
              <div className="curso-detalle__capacity"><strong>{inscritos}<span> / {capacidad}</span></strong><span>{disponibles} {disponibles === 1 ? 'cupo disponible' : 'cupos disponibles'}</span></div>
              <div className="curso-detalle__progress" role="progressbar" aria-label="Ocupación del curso" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ocupacion)}><span style={{ width: ocupacion + '%' }} /></div>
              <p className="curso-detalle__card-footer">Participantes inscritos</p>
            </div>
          </div>

          <div className="curso-detalle__participants">
            <div className="curso-detalle__participants-heading">
              <div><h2>Participantes <span>{curso.participantes?.length || 0}</span></h2><p>Gestiona las inscripciones, la asistencia y los resultados del curso.</p></div>
              <span className="curso-detalle__list-label">LISTA DEL CURSO</span>
            </div>

            {/* Buscador de inscripción */}
            {(() => {
              if (!inscripcionCursoAbierta(curso)) return <p className="text-sm text-slate-500">Las inscripciones no están abiertas para este curso.</p>
              const cupoLleno = curso.cuposTotales > 0 && (curso.cuposInscritos ?? curso.participantes?.length ?? 0) >= curso.cuposTotales
              return cupoLleno ? (
                <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                  Este curso ya alcanzó su cupo máximo ({curso.cuposTotales} participantes).
                </div>
              ) : (
                <div className="relative mb-6 curso-detalle__search">
                    <label htmlFor="buscar-participante">Inscribir participante</label>
                    <div className="curso-detalle__search-row">
                      <div className="curso-detalle__search-field">
                    <Icon name="search" className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      id="buscar-participante"
                      ref={buscadorRef}
                      aria-expanded={showParticipanteResults && participanteSearch.trim().length >= 2}
                      aria-controls="resultados-participante"
                      autoComplete="off"
                      onKeyDown={e => { if (e.key === 'Escape') setShowParticipanteResults(false) }}
                      placeholder="Busca por DNI o nombres"
                      value={participanteSearch}
                      onFocus={() => setShowParticipanteResults(true)}
                      onChange={(e) => {
                        setParticipanteSearch(e.target.value)
                        setIsSearchingParticipante(e.target.value.trim().length >= 2)
                        setShowParticipanteResults(true)
                      }}
                      className="w-full h-[46px] pl-11 pr-4 rounded-xl border-2 border-slate-200 bg-white text-sm font-semibold text-slate-800 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 dark:border-[var(--border-strong)] dark:bg-[#1C2438] dark:text-white"
                    />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ tipoDocumento: 'DNI', numeroDocumento: '', nombres: '', apellidoPaterno: '', apellidoMaterno: '', celular: '', telefonoFijo: '', direccion: '', correoElectronico: '', estado: 'ACTIVO', nroLicencia: '', estadoCivil: '', fotoImg: '' })
                          setPersonaModalOpen(true)
                        }}
                        title="Registrar una nueva persona en el padrón"
                        className="inline-flex h-[46px] items-center justify-center gap-2 rounded-xl bg-purple-600 px-6 text-sm font-bold text-white hover:bg-purple-700 transition shadow-xs cursor-pointer active:scale-95 shrink-0"
                      >
                        <Icon name="idCard" className="size-4" />
                        Registrar persona
                      </button>
                    </div>

                    {showParticipanteResults && participanteSearch.trim().length >= 2 && posicionResultados && createPortal(
                    <div ref={resultadosRef} id="resultados-participante" role="region" aria-label="Resultados de personas"
                      style={posicionResultados}
                      onKeyDown={e => { if (e.key === 'Escape') { setShowParticipanteResults(false); buscadorRef.current?.focus() } }}
                      className="curso-detalle__results rounded-xl border border-slate-200 bg-white shadow-xl dark:border-[var(--border-strong)] dark:bg-[#1C2438]">
                      <div className="curso-detalle__results-header flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-[var(--border)] text-xs font-bold text-slate-400 uppercase">
                        <span>Resultados ({participanteResults.length})</span>
                        <button type="button" onClick={() => setShowParticipanteResults(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">✕ Cerrar</button>
                      </div>
                      {isSearchingParticipante && (
                        <div className="p-4 text-center text-sm text-slate-400 font-medium animate-pulse">
                          Buscando en padrón de ciudadanos...
                        </div>
                      )}
                      {isSearchingParticipante ? null : participanteResults.length === 0 ? (
                        <div className="p-4 text-center text-sm text-slate-500 font-medium space-y-3">
                          <p>No se encontró ninguna persona.</p>
                          <a
                            href={`/personas?accion=registrar`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-lg bg-purple-50 px-3 py-2 text-xs font-bold text-purple-700 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300"
                          >
                            <Icon name="idCard" className="size-4" /> Registrar nueva persona
                          </a>
                        </div>
                      ) : (
                        participanteResults.map((p) => {
                          const dni = p.numeroDocumento || p.numero || ''
                          const yaInscrito = curso.participantes?.some((part) => part.dni === dni)
                          return (
                            <button
                              key={p.id}
                              type="button"
                              disabled={inscribiendo || yaInscrito}
                              onClick={async () => {
                                setInscribiendo(true)
                                try {
                                  const res = await apiFetch(`/cursos/${curso.id}/participantes`, {
                                    method: 'POST',
                                    body: { dni }
                                  });
                                  const result = await res.json();
                                  if (!res.ok) throw new Error(result.messages?.error || 'Error al inscribir');

                                  showToast('Inscripción exitosa');
                                  setParticipanteSearch('')
                                  setShowParticipanteResults(false)

                                  const updatedParticipantes = [...(curso.participantes || []), result.data];
                                  setCurso({ ...curso, participantes: updatedParticipantes, inscritos: updatedParticipantes.length, cuposInscritos: (curso.cuposInscritos ?? 0) + 1 });
                                } catch (err) {
                                  showError('Error', sanitizarMensaje(err.message, 'No se pudo registrar la inscripción.'));
                                } finally {
                                  setInscribiendo(false)
                                }
                              }}
                              className="curso-detalle__result w-full text-left px-3 py-2 hover:bg-purple-50 dark:hover:bg-purple-950/30 flex items-center justify-between gap-3 transition-colors cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <div className="min-w-0">
                                <p className="font-bold text-sm text-slate-800 dark:text-slate-100 group-hover:text-purple-700 dark:group-hover:text-purple-400">
                                  {getPersonaNombre(p)}
                                </p>
                                <p className="font-mono text-xs text-slate-500">DNI: {dni}</p>
                              </div>
                              <span className="text-xs font-bold text-purple-600 dark:text-purple-400 shrink-0 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-md shadow-xs">
                                {yaInscrito ? 'Inscrito ✓' : 'Inscribir +'}
                              </span>
                            </button>
                          )
                        })
                      )}
                    </div>, document.body
                  )}
                </div>
              )
            })()}

            {/* Listado de inscritos */}
            {(!curso.participantes || curso.participantes.length === 0) ? (
              <div className="curso-detalle__empty">
                <span><Icon name="people" className="size-7" /></span>
                <h3>Aún no hay participantes</h3>
                <p>{inscripcionAbierta && disponibles > 0 ? 'Busca una persona por DNI o nombre para registrar la primera inscripción.' : 'Las personas inscritas aparecerán aquí.'}</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {[...(curso.participantes || [])].sort((a, b) => {
                  const nameA = `${a.apellido_paterno || a.apellidoPaterno || ''} ${a.apellido_materno || a.apellidoMaterno || ''} ${a.nombres || ''}`.trim().toLowerCase();
                  const nameB = `${b.apellido_paterno || b.apellidoPaterno || ''} ${b.apellido_materno || b.apellidoMaterno || ''} ${b.nombres || ''}`.trim().toLowerCase();
                  return nameA.localeCompare(nameB);
                }).map((p, i) => {
                  const estadoReal = estadoParticipante(p, curso.estado);

                  return (
                  <li key={p.uuid || p.idInscripcion || p.dni || p.numero || i} className="curso-detalle__participant flex flex-col sm:flex-row sm:justify-between sm:items-center bg-white dark:bg-[var(--bg-subtle)] p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-xs hover:shadow-md transition-shadow gap-3">
                    <div className="curso-detalle__person flex items-center gap-3">
                      <AvatarParticipante fotoUrl={p.fotoUrl} />
                      <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-start gap-2">
                        <span className="text-slate-400 font-mono text-xs mt-0.5">{i + 1}.</span>
                        <span>{p.apellido_paterno || p.apellidoPaterno} {p.apellido_materno || p.apellidoMaterno}, {p.nombres}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-slate-500 font-mono bg-slate-100 dark:bg-slate-800 px-1.5 rounded">DNI: {p.dni || p.numero}</p>
                        {p.fechaInscripcion && (
                          <p className="text-xs text-slate-500">Inscrito el {String(p.fechaInscripcion).slice(0, 10).split('-').reverse().join('/')}</p>
                        )}
                        {curso.estado === 'FINALIZADO' && estadoReal === 'APROBADO' && (
                          <p className={`text-xs font-semibold ${p.carnetEntregado ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            {p.carnetEntregado
                              ? `Carnet entregado${p.carnetFechaEntrega ? ` el ${String(p.carnetFechaEntrega).slice(0, 10).split('-').reverse().join('/')}` : ''}`
                              : 'Carnet por entregar'}
                          </p>
                        )}
                      </div>
                      </div>
                    </div>

                    <div className="curso-detalle__actions">
                      {/* Controles de Asistencia y Estado */}
                      {/* Asistencia y resultado solo desde que comienza el curso; antes es solo inscripción. */}
                      {cursoIniciado && (
                        <div className="curso-detalle__attendance bg-slate-50 dark:bg-[#1C2438] px-3 py-2 rounded-lg border border-slate-200 dark:border-[var(--border-strong)]">
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={Number(p.asistio) === 1}
                              onChange={async (e) => {
                                const asistio = e.target.checked ? 1 : 0;
                                try {
                                  const res = await apiFetch(`/cursos/${curso.id}/participantes/${p.dni || p.numero}`, {
                                    method: 'PUT',
                                    body: { asistio, estado: asistio ? 'APROBADO' : 'DESAPROBADO' }
                                  });
                                  if (!res.ok) {
                                    const mensaje = await leerMensajeError(res, 'No se pudo guardar la asistencia. Intente nuevamente.');
                                    if ([400, 409, 422].includes(res.status)) {
                                      showWarning('No se puede registrar la aprobación', mensaje);
                                      return;
                                    }
                                    throw new Error(mensaje);
                                  }

                                  setCurso(actual => ({ ...actual, participantes: actualizarParticipante(actual.participantes, p, { asistio, estado: asistio ? 'APROBADO' : 'DESAPROBADO' }) }));
                                  showToast(asistio ? 'Marcado como asistente' : 'Desmarcado como asistente');
                                } catch (err) {
                                  showError('No se pudo guardar', err.message || 'No se pudo guardar la asistencia. Intente nuevamente.');
                                }
                              }}
                              className="rounded size-4 text-purple-600 focus:ring-purple-500 cursor-pointer"
                            />
                            Asistió
                          </label>

                        </div>
                      )}
                      {(() => {
                        // Estado del pago de la inscripción (el cobro se hace en Pagos)
                        const pagado = String(p.estado_pago || p.estadoPago || '').toUpperCase() === 'PAGADO'
                        return (
                          <span
                            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-sm)] border px-2 py-1 text-[11px] font-bold uppercase leading-none"
                            style={pagado
                              ? { color: 'var(--ok-fg)', backgroundColor: 'var(--ok-bg)', borderColor: 'var(--border-ok)' }
                              : { color: 'var(--warn-fg)', backgroundColor: 'var(--warn-bg)', borderColor: 'var(--border-warn)' }}
                            title={pagado ? 'La inscripción ya está pagada' : 'La inscripción aún no se ha pagado'}
                          >
                            <Icon name={pagado ? 'check' : 'clock'} className="size-3" />
                            {pagado ? 'Pagado' : 'Sin pagar'}
                          </span>
                        )
                      })()}
                      {String(p.estado_pago || p.estadoPago || '').toUpperCase() !== 'PAGADO' && !['ANULADO', 'CANCELADO'].includes(String(p.estado || '').toUpperCase()) && (
                        <button
                          type="button"
                          onClick={() => setCobrando(p)}
                          title="Cobrar la inscripción"
                          className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border border-amber-300/90 bg-amber-50 px-2.5 text-xs font-bold text-amber-700 shadow-2xs outline-none transition-all hover:border-amber-500 hover:bg-amber-500 hover:text-white focus:outline-none dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-600 dark:hover:text-white active:scale-95"
                        >
                          <Icon name="payment" className="size-3.5" />
                          <span>Cobrar</span>
                        </button>
                      )}
                      <div className="curso-detalle__resultado shrink-0 flex justify-end">
                        {estadoReal === 'APROBADO' ? (
                          <span className="text-emerald-600 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/50 dark:border-emerald-800/50 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase w-full text-center tracking-wider shadow-xs">Aprobado</span>
                        ) : estadoReal === 'DESAPROBADO' ? (
                          <span className="text-rose-600 bg-rose-50 border border-rose-200 dark:bg-rose-950/50 dark:border-rose-800/50 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase w-full text-center tracking-wider shadow-xs">Desaprobado</span>
                        ) : estadoReal === 'CONFIRMADO' ? (
                          <span className="text-blue-600 bg-blue-50 border border-blue-200 dark:bg-blue-950/50 dark:border-blue-800/50 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase w-full text-center tracking-wider shadow-xs">Confirmado</span>
                        ) : estadoReal === 'INSCRITO' ? (
                          <span className="text-amber-600 bg-amber-50 border border-amber-200 dark:bg-amber-950/50 dark:border-amber-800/50 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase w-full text-center tracking-wider shadow-xs">Inscrito</span>
                        ) : (
                          <span className="text-slate-600 bg-slate-50 border border-slate-200 dark:bg-slate-800/50 dark:border-slate-700/50 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase w-full text-center tracking-wider shadow-xs">{estadoReal}</span>
                        )}
                      </div>
                      {curso.estado !== 'FINALIZADO' && <button type="button" onClick={() => handleRetirar(p)} disabled={retirando !== null || inscribiendo}
                        title="Retirar del curso" aria-label={`Retirar del curso a ${p.nombres || p.dni}`}
                        className="curso-detalle__retirar">
                        <Icon name="trash" className="size-4" /> {retirando === (p.uuid || p.idInscripcion || p.dni) ? 'Retirando…' : 'Retirar'}
                      </button>}
                    </div>
                  </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {isPersonaModalOpen && (
        <PersonaFormModal
          isEditing={false}
          formData={formData}
          setFormData={setFormData}
          handlePhotoUpload={(foto) => setFormData(p => ({...p, fotoImg: foto}))}
          handleClearPhoto={() => setFormData(p => ({...p, fotoImg: ''}))}
          tipoDocOptions={[{value: 'DNI', label: 'DNI (Doc. Nacional)'}, {value: 'CE', label: 'Carnet de Extranjería'}, {value: 'PASAPORTE', label: 'Pasaporte'}]}
          handleReniecSearch={handleReniecSearch}
          isSearchingReniec={isSearchingReniec}
          handleUsarFotoReniec={handleUsarFotoReniec}
          isFetchingFotoReniec={isFetchingFotoReniec}
          estadoCivilOptions={ESTADO_CIVIL_OPTIONS}
          estadoOptions={ESTADO_OPTIONS}
          onSubmit={handleFormSubmit}
          onClose={() => setPersonaModalOpen(false)}
        />
      )}

      {cobrando && (
        <CobrarPagoModal
          inscripcion={{ id: cobrando.idInscripcion, dni: cobrando.dni }}
          onClose={() => setCobrando(null)}
          onPagado={() => setCurso(actual => ({ ...actual, participantes: actualizarParticipante(actual.participantes, cobrando, { estado_pago: 'PAGADO', estadoPago: 'PAGADO' }) }))}
        />
      )}
    </div>
  )
}

