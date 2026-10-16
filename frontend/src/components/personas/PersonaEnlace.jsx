import { useState } from 'react'
import { createPortal } from 'react-dom'
import { PersonaDetalleModal } from './PersonaDetalleModal'
import { SmartPersonaFormModal } from './SmartPersonaFormModal'
import { apiFetch } from '../../config/api'
import { showError } from '../../utils/SwalUtil'

export function PersonaEnlace({ personaId, nombre, dni, sinDniTexto = 'Sin DNI', children = null, className = '' }) {
  const [persona, setPersona] = useState(null)
  const [editando, setEditando] = useState(false)
  const [cargando, setCargando] = useState(false)

  const cargar = async () => {
    const response = await apiFetch(`/personas/${encodeURIComponent(personaId)}`)
    if (!response.ok) throw new Error('No se pudo cargar la ficha de persona.')
    const payload = await response.json()
    if (!payload.data) throw new Error('No se encontró la persona.')
    return payload.data
  }

  const abrir = async (event) => {
    event.stopPropagation()
    if (cargando) return
    setCargando(true)
    try {
      if (!personaId) throw new Error('Esta fila no tiene una persona asociada.')
      setPersona(await cargar())
    } catch (error) {
      showError('Ficha de persona', error.message)
    } finally {
      setCargando(false)
    }
  }

  const contenido = children ?? (
    <>
      <span className="block text-xs font-semibold leading-snug text-slate-900 dark:text-white">{nombre || 'Sin Propietario'}</span>
      {dni
        ? <span className="mt-0.5 block font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400">{cargando ? 'Cargando…' : `DNI: ${dni}`}</span>
        : <span className="mt-0.5 block font-mono text-[11px] text-slate-400">{sinDniTexto}</span>}
    </>
  )

  if (!personaId) return <div className={`text-left ${className}`}>{contenido}</div>

  return <>
    <button type="button" onClick={abrir} disabled={cargando} title="Ver persona" className={`min-w-0 text-left rounded focus-visible:outline-2 focus-visible:outline-blue-500 hover:underline disabled:opacity-60 ${className}`}>
      {contenido}
    </button>
    {persona && createPortal(editando
      ? <SmartPersonaFormModal initialPersona={persona} onClose={() => setEditando(false)} onSuccess={async () => {
        try { setPersona(await cargar()) } catch { /* se conserva la ficha anterior */ }
      }} />
      : <PersonaDetalleModal selectedPersona={persona} onClose={() => setPersona(null)} onEdit={() => setEditando(true)} />, document.body)}
  </>
}
