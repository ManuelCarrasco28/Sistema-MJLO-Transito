import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'
import { showToast } from '../../utils/SwalUtil'

const copiarTexto = async (texto) => {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    // Sin permiso de portapapeles (p. ej. página sin HTTPS): se copia con un campo temporal.
    try {
      const campo = document.createElement('textarea')
      campo.value = texto
      campo.style.position = 'fixed'
      campo.style.opacity = '0'
      document.body.appendChild(campo)
      campo.select()
      const ok = document.execCommand('copy')
      campo.remove()
      return ok
    } catch {
      return false
    }
  }
}

// Botón chico para copiar el número de placa; se muestra al pasar el mouse por la fila de la placa.
export function CopiarPlaca({ placa }) {
  const [copiado, setCopiado] = useState(false)
  const temporizador = useRef(null)
  useEffect(() => () => window.clearTimeout(temporizador.current), [])

  const texto = String(placa || '').trim().toUpperCase()
  if (!texto || texto === '—' || texto === 'SIN PLACA' || texto === 'S/P' || texto === 'N/A' || texto.startsWith('SIN-PLACA-')) return null

  const copiar = async (event) => {
    event.stopPropagation()
    event.preventDefault()
    if (!(await copiarTexto(texto))) return
    setCopiado(true)
    showToast(`Placa ${texto} copiada`, 'info', 1500)
    window.clearTimeout(temporizador.current)
    temporizador.current = window.setTimeout(() => setCopiado(false), 1400)
  }

  return (
    <button
      type="button"
      onClick={copiar}
      title="Copiar placa"
      aria-label={`Copiar placa ${texto}`}
      className="grid size-6 shrink-0 cursor-pointer place-items-center rounded-md text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-blue-500 group-hover/placa:opacity-100 dark:hover:bg-[var(--bg-subtle)] dark:hover:text-slate-200"
    >
      <Icon name={copiado ? 'check' : 'copy'} className={`size-3.5 ${copiado ? 'text-emerald-500' : ''}`} />
    </button>
  )
}
