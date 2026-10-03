import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiFetch, getCachedData } from '../config/api'
import { showError, showToast } from '../utils/SwalUtil'
import { Icon } from '../components/ui/Icon'
import { StatusBadge } from '../components/ui/StatusBadge'
import { PersonaFormModal } from '../components/personas/PersonaFormModal'


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
  const { id } = useParams()
  const navigate = useNavigate()
  const [curso, setCurso] = useState(() => {
    const cached = getCachedData('/cursos')
    if (cached) return cached.find(x => x.id == id) || null
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
            setCurso({ ...curso, participantes: updatedParticipantes, inscritos: updatedParticipantes.length })
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
    async function load() {
      try {
        const res = await apiFetch('/cursos')
        const data = await res.json()
        if (data.data) {
          const c = data.data.find(x => x.id == id)
          if (c) {
            setCurso(c)
            document.title = `Curso ${c.codigo} - Detalles`
          } else {
            setError('No se encontró el curso.')
          }
        }
      } catch (e) {
        setError('Error al cargar datos.')
      } finally {
        setLoading(false)
      }
    }
    load()
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
    const timer = setTimeout(() => {
      setIsSearchingParticipante(true)
      apiFetch(`/personas?buscar=${encodeURIComponent(rawQuery)}&porPagina=12`)
        .then((res) => (res.ok ? res.json() : { data: [] }))
        .then((payload) => {
          const list = (payload.data || []).filter((p) => {
            if (getPersonaNombre(p).toUpperCase().includes('SIN PROPIETARIO')) return false
            return true
          })
          setParticipanteResults(list.slice(0, 8))
        })
        .catch(() => {})
        .finally(() => setIsSearchingParticipante(false))
    }, 250)
    return () => clearTimeout(timer)
  }, [participanteSearch, curso])

  if (loading) return <div className="p-10 text-center font-bold text-slate-500">Cargando curso...</div>
  if (error || !curso) return <div className="p-10 text-center font-bold text-rose-500">{error || 'Curso no encontrado.'}</div>

  return (
    <div className="h-screen w-full bg-white dark:bg-[#1C2438] flex flex-col font-sans overflow-hidden">
      <div className="w-full flex flex-col flex-1 h-full">
        
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 py-5 dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/cursos')}
                className="mr-1 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition dark:bg-[var(--bg-subtle)] dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer shadow-xs active:scale-95"
                title="Volver a la lista de cursos"
              >
                <Icon name="arrowLeft" className="size-5" />
              </button>
            <span className="grid size-10 place-items-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
              <Icon name="course" className="size-5" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{curso.titulo}</h3>
              <p className="text-sm font-mono text-slate-500">{curso.codigo}</p>
            </div>
          </div>
          <StatusBadge status={curso.estado} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Detalles info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[var(--bg-subtle)] p-5 rounded-2xl border border-slate-100 dark:border-slate-800/60">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Fecha</p>
              <p className="font-semibold">{curso.fecha}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Horario</p>
              <p className="font-semibold">{curso.horario}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Inscritos</p>
              <p className="font-semibold">{curso.inscritos || (curso.participantes?.length || 0)} / {curso.cuposTotales}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Instructor</p>
              <p className="font-semibold truncate" title={curso.instructor}>{curso.instructor || 'Por asignar'}</p>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-[var(--border)] pt-8">
            <h4 className="text-base font-extrabold text-slate-800 dark:text-slate-200 mb-5 flex items-center gap-2">
              <Icon name="users" className="size-4" />
              Participantes del Curso
            </h4>

            {/* Buscador de inscripción */}
            {(() => {
              const cupoLleno = curso.cuposTotales > 0 && (curso.participantes?.length || 0) >= curso.cuposTotales
              return cupoLleno ? (
                <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                  Este curso ya alcanzó su cupo máximo ({curso.cuposTotales} participantes).
                </div>
              ) : (
                <div className="relative mb-6">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                    <Icon name="search" className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Buscar persona por DNI o nombres para inscribirla..."
                      value={participanteSearch}
                      onFocus={() => setShowParticipanteResults(true)}
                      onChange={(e) => {
                        setParticipanteSearch(e.target.value)
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
                        Nueva Persona
                      </button>
                    </div>

                    {showParticipanteResults && participanteSearch.trim() && (
                    <div className="absolute left-0 right-0 top-full mt-2 z-50 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-[var(--border-strong)] dark:bg-[#1C2438]">
                      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-[var(--border)] text-xs font-bold text-slate-400 uppercase">
                        <span>Resultados ({participanteResults.length})</span>
                        <button type="button" onClick={() => setShowParticipanteResults(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">✕ Cerrar</button>
                      </div>
                      {isSearchingParticipante && (
                        <div className="p-4 text-center text-sm text-slate-400 font-medium animate-pulse">
                          Buscando en padrón de ciudadanos...
                        </div>
                      )}
                      {!isSearchingParticipante && participanteResults.length === 0 ? (
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
                                  setCurso({ ...curso, participantes: updatedParticipantes, inscritos: updatedParticipantes.length });
                                } catch (err) {
                                  showError('Error', sanitizarMensaje(err.message, 'No se pudo registrar la inscripción.'));
                                } finally {
                                  setInscribiendo(false)
                                }
                              }}
                              className="w-full text-left px-4 py-3 mt-1 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/30 flex items-center justify-between gap-3 transition-colors cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed"
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
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Listado de inscritos */}
            {(!curso.participantes || curso.participantes.length === 0) ? (
              <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                <Icon name="users" className="size-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-sm font-medium text-slate-500">Aún no hay participantes inscritos.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {[...(curso.participantes || [])].sort((a, b) => {
                  const nameA = `${a.apellido_paterno || a.apellidoPaterno || ''} ${a.apellido_materno || a.apellidoMaterno || ''} ${a.nombres || ''}`.trim().toLowerCase();
                  const nameB = `${b.apellido_paterno || b.apellidoPaterno || ''} ${b.apellido_materno || b.apellidoMaterno || ''} ${b.nombres || ''}`.trim().toLowerCase();
                  return nameA.localeCompare(nameB);
                }).map((p, i) => {
                  const estadoReal = curso.estado === 'FINALIZADO' 
                    ? (p.asistio ? 'APROBADO' : 'DESAPROBADO') 
                    : (p.estado || 'PENDIENTE');
                    
                  return (
                  <li key={i} className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-white dark:bg-[var(--bg-subtle)] p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-xs hover:shadow-md transition-shadow gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-start gap-2">
                        <span className="text-slate-400 font-mono text-xs mt-0.5">{i + 1}.</span>
                        <span>{p.apellido_paterno || p.apellidoPaterno} {p.apellido_materno || p.apellidoMaterno}, {p.nombres}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-slate-500 font-mono bg-slate-100 dark:bg-slate-800 px-1.5 rounded">DNI: {p.dni || p.numero}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {/* Controles de Asistencia y Estado */}
                      <div className="flex items-center gap-3 bg-slate-50 dark:bg-[#1C2438] px-3 py-2 rounded-lg border border-slate-200 dark:border-[var(--border-strong)]">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={!!p.asistio}
                            onChange={async (e) => {
                              const asistio = e.target.checked ? 1 : 0;
                              try {
                                const res = await apiFetch(`/cursos/${curso.id}/participantes/${p.dni || p.numero}`, {
                                  method: 'PUT',
                                  body: { asistio }
                                });
                                if (!res.ok) throw new Error('Error al guardar asistencia');
                                
                                const updatedParticipantes = [...curso.participantes];
                                updatedParticipantes[i] = { ...p, asistio };
                                setCurso({ ...curso, participantes: updatedParticipantes });
                                showToast(asistio ? 'Marcado como asistente' : 'Desmarcado como asistente');
                              } catch (err) {
                                showError('Error', sanitizarMensaje(err.message, 'No se pudo guardar.'));
                              }
                            }}
                            className="rounded size-4 text-purple-600 focus:ring-purple-500 cursor-pointer"
                          />
                          Asistió
                        </label>
                        
                        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700"></div>
                        
                        <select 
                          value={p.estado || 'INSCRITO'}
                          onChange={async (e) => {
                            const nuevoEstado = e.target.value;
                            try {
                              const res = await apiFetch(`/cursos/${curso.id}/participantes/${p.dni || p.numero}`, {
                                method: 'PUT',
                                body: { estado: nuevoEstado }
                              });
                              if (!res.ok) throw new Error('Error al guardar estado');
                              
                              const updatedParticipantes = [...curso.participantes];
                              updatedParticipantes[i] = { ...p, estado: nuevoEstado };
                              setCurso({ ...curso, participantes: updatedParticipantes });
                              showToast('Estado actualizado', 'editar');
                            } catch (err) {
                              showError('Error', 'No se pudo actualizar.');
                            }
                          }}
                          className={`text-xs font-bold bg-transparent outline-none cursor-pointer ${(p.estado === 'APROBADO' || estadoReal === 'APROBADO') ? 'text-emerald-600 dark:text-emerald-400' : (p.estado === 'DESAPROBADO' || estadoReal === 'DESAPROBADO') ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400'}`}
                        >
                          <option value="INSCRITO">Inscrito</option>
                          <option value="CONFIRMADO">Confirmado</option>
                          <option value="APROBADO">Aprobado</option>
                          <option value="DESAPROBADO">Desaprobado</option>
                        </select>
                      </div>
                      <div className="w-24 shrink-0 flex justify-end">
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
    </div>
  )
}

