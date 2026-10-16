import { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { isoATexto, formatearDigitos, textoAIso } from '../../utils/fechaEscrita'

// Editar dd/mm/aaaa y emitir ISO solo si la fecha es válida.
function CampoFecha({ id, value, onChange, required, disabled, readOnly, onFocus, onBlur, inputClassName, name }) {
  const [texto, setTexto] = useState(() => isoATexto(value))
  const inputRef = useRef(null)
  const selectorRef = useRef(null)
  const cursorRef = useRef(null)

  useEffect(() => {
    const isoActual = textoAIso(texto)
    if (value && value !== isoActual) setTexto(isoATexto(value))
    else if (!value && isoActual) setTexto('')
  }, [value])

  useLayoutEffect(() => {
    if (cursorRef.current !== null && inputRef.current && document.activeElement === inputRef.current) {
      inputRef.current.setSelectionRange(cursorRef.current, cursorRef.current)
    }
    cursorRef.current = null
  }, [texto])

  useEffect(() => {
    inputRef.current?.setCustomValidity(texto.length === 10 && !textoAIso(texto) ? 'Ingrese una fecha válida (dd/mm/aaaa).' : '')
  }, [texto])

  const emitir = (iso) => onChange?.({ target: { id, name, value: iso, type: 'date' } })

  const alEscribir = (e) => {
    const crudo = e.target.value
    const posicion = e.target.selectionStart ?? crudo.length
    const digitosAntes = crudo.slice(0, posicion).replace(/\D/g, '').length
    const nuevo = formatearDigitos(crudo.replace(/\D/g, ''))

    let cursor = 0
    let contados = 0
    while (cursor < nuevo.length && contados < digitosAntes) {
      if (/\d/.test(nuevo[cursor])) contados += 1
      cursor += 1
    }
    cursorRef.current = cursor
    setTexto(nuevo)
    emitir(textoAIso(nuevo))
  }

  const abrirCalendario = () => {
    const selector = selectorRef.current
    if (!selector) return
    try {
      selector.showPicker()
    } catch {
      selector.focus()
      selector.click()
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        required={required}
        disabled={disabled}
        readOnly={readOnly}
        value={texto}
        onChange={alEscribir}
        onFocus={onFocus}
        onBlur={onBlur}
        autoComplete="off"
        placeholder="dd/mm/aaaa"
        maxLength={10}
        pattern="\d{2}/\d{2}/\d{4}"
        title="Escriba la fecha como dd/mm/aaaa"
        className={`${inputClassName} pr-11`}
      />
      <input
        ref={selectorRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={textoAIso(texto)}
        onChange={(e) => {
          setTexto(isoATexto(e.target.value))
          emitir(e.target.value)
        }}
        className="pointer-events-none absolute bottom-1 right-2 size-px opacity-0"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={abrirCalendario}
        disabled={disabled || readOnly}
        aria-label="Abrir calendario"
        title="Abrir calendario"
        className="absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 cursor-pointer place-items-center rounded-lg border border-slate-200 bg-slate-100/90 text-slate-600 shadow-xs transition-all hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700/80 dark:bg-slate-800/90 dark:text-slate-300 dark:hover:bg-blue-950/60 dark:hover:border-blue-500/60 dark:hover:text-blue-400"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      </button>
    </>
  )
}

// Funciones auxiliares para formato de hora 12h (AM / PM)
function desglosarHora24(val24) {
  if (!val24 || typeof val24 !== 'string') return null
  const m = val24.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
  if (!m) return null
  const h24 = parseInt(m[1], 10)
  const min = parseInt(m[2], 10)
  if (isNaN(h24) || isNaN(min) || h24 < 0 || h24 > 23 || min < 0 || min > 59) return null
  const periodo = h24 >= 12 ? 'PM' : 'AM'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return {
    h24,
    min,
    h12,
    periodo,
    texto12: `${String(h12).padStart(2, '0')}:${String(min).padStart(2, '0')} ${periodo}`,
  }
}

function componerHora24(h12, min, periodo) {
  const h = parseInt(h12, 10)
  const m = parseInt(min, 10)
  if (isNaN(h) || isNaN(m) || h < 1 || h > 12 || m < 0 || m > 59) return ''
  let h24 = h % 12
  if (periodo === 'PM') h24 += 12
  return `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function parsearEntradaHora(crudo) {
  if (!crudo || typeof crudo !== 'string') return null
  const s = crudo.trim()
  if (!s) return ''

  // 12h con AM/PM (ej: "2:30 pm", "02:30 PM", "2:30p", "02:30am")
  const m12 = s.match(/^(\d{1,2}):(\d{2})\s*([ap]\.?\s*m?\.?)$/i)
  if (m12) {
    const h = parseInt(m12[1], 10)
    const m = parseInt(m12[2], 10)
    const isPm = /p/i.test(m12[3])
    if (h >= 1 && h <= 12 && m >= 0 && m < 60) {
      return componerHora24(h, m, isPm ? 'PM' : 'AM')
    }
  }

  // 24h formato estándar (ej: "14:00", "08:30")
  const m24 = s.match(/^(\d{1,2}):(\d{2})$/)
  if (m24) {
    const h = parseInt(m24[1], 10)
    const m = parseInt(m24[2], 10)
    if (h >= 0 && h < 24 && m >= 0 && m < 60) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }
  }

  // Solo hora con am/pm (ej: "2 pm", "10am")
  const mSoloHora = s.match(/^(\d{1,2})\s*([ap]\.?\s*m?\.?)$/i)
  if (mSoloHora) {
    const h = parseInt(mSoloHora[1], 10)
    const isPm = /p/i.test(mSoloHora[2])
    if (h >= 1 && h <= 12) {
      return componerHora24(h, 0, isPm ? 'PM' : 'AM')
    }
  }

  // 4 dígitos seguidos (ej: "1400" o "0830")
  const m4 = s.match(/^(\d{2})(\d{2})$/)
  if (m4) {
    const h = parseInt(m4[1], 10)
    const m = parseInt(m4[2], 10)
    if (h >= 0 && h < 24 && m >= 0 && m < 60) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }
  }

  return null
}

const ALTO_ITEM_RUEDA = 36
const ITEMS_VISIBLES_RUEDA = 5
function RuedaHora({ items, indice, onElegir, etiqueta }) {
  const columna = useRef(null)
  const temporizador = useRef(null)

  useEffect(() => {
    const el = columna.current
    if (!el) return
    const destino = indice * ALTO_ITEM_RUEDA
    if (Math.abs(el.scrollTop - destino) > 1) el.scrollTo({ top: destino })
  }, [indice])

  useEffect(() => () => window.clearTimeout(temporizador.current), [])

  const alDesplazar = () => {
    window.clearTimeout(temporizador.current)
    temporizador.current = window.setTimeout(() => {
      const el = columna.current
      if (!el) return
      const nuevo = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / ALTO_ITEM_RUEDA)))
      if (nuevo !== indice) onElegir(nuevo)
    }, 90)
  }

  const relleno = ALTO_ITEM_RUEDA * Math.floor(ITEMS_VISIBLES_RUEDA / 2)
  return (
    <div className="min-w-0 flex-1">
      <span className="mb-1 block min-h-[15px] text-center text-[10px] font-bold uppercase leading-[15px] tracking-wider text-slate-500 dark:text-slate-400">{etiqueta || ' '}</span>
      <div
        ref={columna}
        onScroll={alDesplazar}
        role="listbox"
        aria-label={etiqueta}
        className="no-scrollbar overflow-y-auto"
        style={{ height: ALTO_ITEM_RUEDA * ITEMS_VISIBLES_RUEDA, scrollSnapType: 'y mandatory', paddingTop: relleno, paddingBottom: relleno }}
      >
        {items.map((texto, i) => {
          const activo = i === indice
          const distancia = Math.abs(i - indice)
          return (
            <button
              key={texto}
              type="button"
              role="option"
              aria-selected={activo}
              onClick={() => { onElegir(i); columna.current?.scrollTo({ top: i * ALTO_ITEM_RUEDA, behavior: 'smooth' }) }}
              style={{ height: ALTO_ITEM_RUEDA, scrollSnapAlign: 'center', opacity: activo ? 1 : distancia === 1 ? 0.6 : 0.3 }}
              className={`flex w-full cursor-pointer items-center justify-center text-base tabular-nums transition-all ${activo ? 'font-black text-blue-600 dark:text-blue-300' : 'font-semibold text-slate-600 dark:text-slate-300'}`}
            >
              {texto}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const HORAS_RUEDA = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']
const MINUTOS_RUEDA = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))
const PERIODOS_RUEDA = ['AM', 'PM']

function CampoHora12({ id, value, onChange, required, disabled, readOnly, onFocus, onBlur, inputClassName, name }) {
  const inicial = desglosarHora24(value)
  const [texto, setTexto] = useState(() => inicial?.texto12 || '')
  const [selHora, setSelHora] = useState(() => inicial?.h12 ?? 8)
  const [selMin, setSelMin] = useState(() => inicial?.min ?? 0)
  const [selPeriodo, setSelPeriodo] = useState(() => inicial?.periodo ?? 'AM')
  const [abierto, setAbierto] = useState(false)
  const [posicion, setPosicion] = useState(null)

  const inputRef = useRef(null)
  const popoverRef = useRef(null)

  useEffect(() => {
    const d = desglosarHora24(value)
    if (d) {
      setTexto(d.texto12)
      setSelHora(d.h12)
      setSelMin(d.min)
      setSelPeriodo(d.periodo)
    } else if (!value) {
      setTexto('')
    }
  }, [value])

  const emitir = (val24) => {
    onChange?.({
      target: {
        id,
        name,
        value: val24,
        type: 'time',
      },
    })
  }

  const valorAlAbrir = useRef('')
  const restablecer = () => {
    const d = desglosarHora24(valorAlAbrir.current)
    if (d) aplicarCambio(d.h12, d.min, d.periodo)
    else { setTexto(''); emitir('') }
  }

  const alternarPicker = () => {
    if (disabled || readOnly) return
    if (!abierto) valorAlAbrir.current = value || ''
    if (!abierto && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect()
      const pickerHeight = 270
      const spaceBelow = window.innerHeight - rect.bottom
      const openUpwards = spaceBelow < pickerHeight + 8 && rect.top > spaceBelow
      setPosicion({
        left: Math.max(12, Math.min(rect.left, window.innerWidth - 300)),
        top: openUpwards ? undefined : rect.bottom + 4,
        bottom: openUpwards ? window.innerHeight - rect.top + 4 : undefined,
      })
    }
    setAbierto((prev) => !prev)
  }

  useEffect(() => {
    if (!abierto) return
    const handleClickOutside = (e) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target) &&
        inputRef.current && !inputRef.current.contains(e.target)
      ) {
        setAbierto(false)
      }
    }
    const handleScroll = (e) => {
      if (e?.target?.closest?.('[data-hora-popover]')) return
      setAbierto(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleScroll)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleScroll)
    }
  }, [abierto])

  const aplicarCambio = (h, m, p) => {
    setSelHora(h)
    setSelMin(m)
    setSelPeriodo(p)
    const val24 = componerHora24(h, m, p)
    const texto12 = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${p}`
    setTexto(texto12)
    emitir(val24)
  }

  const ponerAhora = () => {
    const ahora = new Date()
    const h24 = ahora.getHours()
    const min = ahora.getMinutes()
    const p = h24 >= 12 ? 'PM' : 'AM'
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12
    aplicarCambio(h12, min, p)
  }

  const alEscribir = (e) => {
    const nuevo = e.target.value
    setTexto(nuevo)
    const parsed = parsearEntradaHora(nuevo)
    if (parsed !== null) {
      const d = desglosarHora24(parsed)
      if (d) {
        setSelHora(d.h12)
        setSelMin(d.min)
        setSelPeriodo(d.periodo)
      }
      emitir(parsed)
    }
  }

  const alPerderFoco = (e) => {
    if (!texto.trim()) {
      emitir('')
    } else {
      const parsed = parsearEntradaHora(texto)
      if (parsed) {
        const d = desglosarHora24(parsed)
        if (d) setTexto(d.texto12)
        emitir(parsed)
      } else if (value) {
        const d = desglosarHora24(value)
        if (d) setTexto(d.texto12)
      } else {
        setTexto('')
        emitir('')
      }
    }
    onBlur?.(e)
  }

  return (
    <>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="text"
        required={required}
        disabled={disabled}
        readOnly={readOnly}
        value={texto}
        onChange={alEscribir}
        onFocus={onFocus}
        onBlur={alPerderFoco}
        autoComplete="off"
        placeholder="hh:mm am/pm"
        className={`${inputClassName} pr-11`}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={alternarPicker}
        disabled={disabled || readOnly}
        aria-label="Abrir selector de hora"
        title="Seleccionar hora (AM/PM)"
        className={`absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 cursor-pointer place-items-center rounded-lg border shadow-xs transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${
          abierto
            ? 'border-blue-500 bg-blue-50 text-blue-600 ring-2 ring-blue-500/20 dark:border-blue-400 dark:bg-blue-950/80 dark:text-blue-300'
            : 'border-slate-200 bg-slate-100/90 text-slate-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 dark:border-slate-700/80 dark:bg-slate-800/90 dark:text-slate-300 dark:hover:bg-blue-950/60 dark:hover:border-blue-500/60 dark:hover:text-blue-400'
        }`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </button>

      {abierto && posicion && createPortal(
        <div
          ref={popoverRef}
          data-hora-popover
          style={{
            position: 'fixed',
            left: posicion.left,
            top: posicion.top,
            bottom: posicion.bottom,
            width: '250px',
          }}
          className="z-[110] rounded-xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-[var(--border-strong)] dark:bg-[#1C2438] animate-in fade-in zoom-in-95 duration-150 select-none text-slate-800 dark:text-slate-100"
        >
          <div className="relative">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 rounded-lg border border-blue-500/30 bg-blue-500/10"
              style={{ top: 18 + ALTO_ITEM_RUEDA * Math.floor(ITEMS_VISIBLES_RUEDA / 2), height: ALTO_ITEM_RUEDA }}
            />
            <div className="flex gap-1">
              <RuedaHora etiqueta="Hora" items={HORAS_RUEDA} indice={Math.max(0, (selHora || 12) - 1)} onElegir={(i) => aplicarCambio(i + 1, selMin ?? 0, selPeriodo)} />
              <RuedaHora etiqueta="Min" items={MINUTOS_RUEDA} indice={selMin ?? 0} onElegir={(i) => aplicarCambio(selHora || 12, i, selPeriodo)} />
              <RuedaHora etiqueta="" items={PERIODOS_RUEDA} indice={selPeriodo === 'PM' ? 1 : 0} onElegir={(i) => aplicarCambio(selHora || 12, selMin ?? 0, PERIODOS_RUEDA[i])} />
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-[12px] dark:border-[var(--border-strong)]">
            <button
              type="button"
              onClick={restablecer}
              className="cursor-pointer rounded-md px-2 py-1 font-bold text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50"
            >
              Restablecer
            </button>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="cursor-pointer rounded-lg bg-blue-600 px-4 py-1 font-bold text-white transition-colors hover:bg-blue-700 dark:hover:bg-blue-500"
            >
              OK
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

export function FloatingInput({
  id,
  label,
  value,
  onChange,
  onFocus: onFocusExterno,
  onBlur: onBlurExterno,
  type = 'text',
  required = false,
  maxLength,
  optional = false,
  autoComplete = 'off',
  className = '',
  inputClassName = '',
  error = '',
  ...props
}) {
  const [isFocused, setIsFocused] = useState(false)
  // Elevar la etiqueta para no superponerla al formato de fecha y hora.
  const isFloating = ['date', 'time', 'datetime-local', 'month', 'week'].includes(type)
    || isFocused
    || Boolean(error)
    || (value !== undefined && value !== null && String(value).trim() !== '')

  const clasesInput = `peer block h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 pt-3.5 pb-1 text-xs font-semibold text-slate-800 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-[var(--bg-subtle)] dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-white dark:focus:border-blue-400 ${inputClassName} ${error ? '!border-red-500 focus:!border-red-500 focus:!ring-red-500/20' : ''}`

  return (
    <div className={`relative ${className}`}>
      {type === 'date' ? (
        <CampoFecha
          id={id}
          name={props.name}
          value={value}
          onChange={onChange}
          required={required}
          disabled={props.disabled}
          readOnly={props.readOnly}
          onFocus={(e) => { setIsFocused(true); onFocusExterno?.(e) }}
          onBlur={(e) => { setIsFocused(false); onBlurExterno?.(e) }}
          inputClassName={clasesInput}
        />
      ) : type === 'time' ? (
        <CampoHora12
          id={id}
          name={props.name}
          value={value}
          onChange={onChange}
          required={required}
          disabled={props.disabled}
          readOnly={props.readOnly}
          onFocus={(e) => { setIsFocused(true); onFocusExterno?.(e) }}
          onBlur={(e) => { setIsFocused(false); onBlurExterno?.(e) }}
          inputClassName={clasesInput}
        />
      ) : (
        <input
          id={id}
          type={type}
          required={required}
          maxLength={maxLength}
          value={value ?? ''}
          onChange={onChange}
          onFocus={(e) => { setIsFocused(true); onFocusExterno?.(e) }}
          onBlur={(e) => { setIsFocused(false); onBlurExterno?.(e) }}
          autoComplete={autoComplete}
          placeholder=" "
          className={clasesInput}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          {...props}
        />
      )}
      <label
        htmlFor={id}
        className={`pointer-events-none absolute left-3 select-none transition-all duration-150 ${
          isFloating
            ? 'top-1 text-[9.5px] font-bold text-slate-500 dark:text-slate-400'
            : 'top-[21px] -translate-y-1/2 text-xs font-medium text-slate-400 dark:text-slate-500'
        } ${error ? '!text-red-600 dark:!text-red-400' : isFocused ? '!text-blue-600 dark:!text-blue-400' : ''}`}
      >
        {label}
        {optional && (
          <span className="ml-1 text-[9px] font-normal text-slate-400 dark:text-slate-500">(Opcional)</span>
        )}
      </label>
      {error && <p id={`${id}-error`} role="alert" className="mt-1 px-1 text-[11px] leading-4 font-medium text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}

export function FloatingTextarea({
  id,
  label,
  value,
  onChange,
  required = false,
  maxLength,
  optional = false,
  rows = 1,
  className = '',
  textareaClassName = '',
  error = '',
  ...props
}) {
  const [isFocused, setIsFocused] = useState(false)
  const textareaRef = useRef(null)

  const isFloating = isFocused || Boolean(error) || (value !== undefined && value !== null && String(value).trim() !== '')

  // Recalcular la altura al cambiar el contenido o el ancho.
  const ajustarAlto = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(160, Math.max(42, el.scrollHeight))}px`
    el.style.overflowY = el.scrollHeight > 160 ? 'auto' : 'hidden'
  }

  useEffect(() => {
    ajustarAlto()
  }, [value])

  useEffect(() => {
    const el = textareaRef.current
    if (!el || typeof ResizeObserver === 'undefined') return undefined
    let ancho = el.clientWidth
    const observador = new ResizeObserver(() => {
      if (el.clientWidth !== ancho) {
        ancho = el.clientWidth
        ajustarAlto()
      }
    })
    observador.observe(el)
    return () => observador.disconnect()
  }, [])

  return (
    <div className={`relative ${className}`}>
      <textarea
        ref={textareaRef}
        id={id}
        required={required}
        maxLength={maxLength}
        rows={rows}
        value={value ?? ''}
        onChange={(e) => {
          ajustarAlto()
          onChange?.(e)
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder=" "
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`peer block w-full rounded-xl border border-slate-200 bg-white px-3 pt-3.5 pb-1 text-xs font-semibold text-slate-800 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-[var(--bg-subtle)] dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-white dark:focus:border-blue-400 resize-none min-h-[42px] overflow-hidden ${textareaClassName} ${error ? '!border-red-500 focus:!border-red-500 focus:!ring-red-500/20' : ''}`}
        {...props}
      />
      <label
        htmlFor={id}
        className={`pointer-events-none absolute left-3 select-none transition-all duration-150 ${
          isFloating
            ? 'top-1 text-[9.5px] font-bold text-slate-500 dark:text-slate-400'
            : 'top-3 text-xs font-medium text-slate-400 dark:text-slate-500'
        } ${error ? '!text-red-600 dark:!text-red-400' : isFocused ? '!text-blue-600 dark:!text-blue-400' : ''}`}
      >
        {label}
        {optional && (
          <span className="ml-1 text-[9px] font-normal text-slate-400 dark:text-slate-500">(Opcional)</span>
        )}
      </label>
      {error && <p id={`${id}-error`} role="alert" className="mt-1 px-1 text-[11px] leading-4 font-medium text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}

// Búsqueda automática en los selectores: con más de UMBRAL_BUSQUEDA opciones (por ejemplo
// las 250 asociaciones) el menú muestra una caja para escribir y filtra mientras se teclea.
const UMBRAL_BUSQUEDA = 8

const normalizarTexto = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

function useOpcionesBuscables(options, isOpen) {
  const [texto, setTexto] = useState('')
  const [activo, setActivo] = useState(0)
  const buscable = options.length > UMBRAL_BUSQUEDA

  useEffect(() => {
    if (!isOpen) {
      setTexto('')
      setActivo(0)
    }
  }, [isOpen])

  useEffect(() => {
    setActivo(0)
  }, [texto])

  const filtradas = useMemo(() => {
    const q = normalizarTexto(texto)
    return q ? options.filter((o) => normalizarTexto(o.label).includes(q)) : options
  }, [options, texto])

  return { buscable, texto, setTexto, filtradas, activo, setActivo }
}

function BuscadorOpciones({ texto, onTexto, onTecla, mostrados, total }) {
  return (
    <div className="sticky top-0 z-10 bg-white px-0.5 pb-1 pt-0.5 dark:bg-[var(--bg-subtle)]">
      <input
        autoFocus
        type="text"
        value={texto}
        onChange={(e) => onTexto(e.target.value)}
        onKeyDown={onTecla}
        placeholder="Escriba para buscar"
        autoComplete="off"
        // La regla global "input { font: inherit }" anula las clases text-*, por eso el tamaño va en línea.
        style={{ fontSize: '11px', lineHeight: '1.25' }}
        className="block w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 font-semibold text-slate-700 outline-none placeholder:font-normal placeholder:text-slate-400 focus:border-blue-400 dark:border-[var(--border-strong)] dark:bg-[#1C2438] dark:text-slate-200"
      />
      {texto && (
        <p className="px-1 pt-1 text-slate-400" style={{ fontSize: '10px' }}>
          {mostrados} de {total}
        </p>
      )}
    </div>
  )
}

// Teclado del buscador: flechas para recorrer, Enter elige, Escape cierra.
function manejarTeclaBuscador(e, { filtradas, activo, setActivo, elegir, cerrar }) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    setActivo(Math.min(filtradas.length - 1, activo + 1))
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    setActivo(Math.max(0, activo - 1))
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (filtradas[activo]) elegir(filtradas[activo])
  } else if (e.key === 'Escape') {
    e.preventDefault()
    cerrar()
  }
}

export function FloatingSelect({
  id,
  label,
  value,
  onChange,
  options = [],
  className = '',
  multilineOptions = false,
  hideEmptyOption = false,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [menuPos, setMenuPos] = useState(null)
  const containerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        containerRef.current && !containerRef.current.contains(e.target) &&
        !e.target.closest?.('[data-floating-select-menu]')
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Usar un portal fijo para evitar recortes; cerrar al desplazar el contenedor.
  useEffect(() => {
    if (!isOpen) return undefined
    // El scroll de la propia lista de opciones NO debe cerrarla (antes, al intentar bajar por las opciones el menú
    // se cerraba, porque este oyente captura todos los scrolls de la página).
    const handleScroll = (e) => {
      if (e?.target?.closest?.('[data-floating-select-menu]')) return
      setIsOpen(false)
    }
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleScroll)
    return () => {
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleScroll)
    }
  }, [isOpen])

  const handleToggle = () => {
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const menuHeight = Math.min(224, options.length * 36 + 8)
      const spaceBelow = window.innerHeight - rect.bottom
      const openUpwards = spaceBelow < menuHeight + 8 && rect.top > spaceBelow
      setMenuPos({
        left: rect.left,
        width: rect.width,
        top: openUpwards ? undefined : rect.bottom + 4,
        bottom: openUpwards ? window.innerHeight - rect.top + 4 : undefined,
      })
    }
    setIsOpen((prev) => !prev)
  }

  const selectedOption = options.find((opt) => opt.value === value) || options[0]
  const buscador = useOpcionesBuscables(options, isOpen)
  const elegir = (opt) => {
    onChange({ target: { value: opt.value } })
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className={`relative ${isOpen ? 'z-50' : 'z-10'} ${className}`}>
      <button
        type="button"
        id={id}
        onClick={handleToggle}
        className={`flex ${multilineOptions ? 'min-h-[42px] items-start' : 'h-[42px] items-center'} w-full justify-between rounded-xl border bg-white px-3 pt-3.5 pb-1 text-left text-xs font-semibold text-slate-800 outline-none transition-all dark:bg-[var(--bg-subtle)] dark:text-white cursor-pointer ${
          isOpen
            ? 'border-blue-500 ring-1 ring-blue-500/20 dark:border-blue-400'
            : 'border-slate-200 hover:border-slate-300 dark:border-[var(--border-strong)] dark:hover:border-slate-600'
        }`}
      >
        <span className={multilineOptions ? 'min-w-0 whitespace-normal break-words pr-1 leading-snug' : 'truncate pr-1'}>{selectedOption?.label || value}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`size-3 text-slate-400 transition-transform duration-150 shrink-0 ml-1.5 ${multilineOptions ? 'mt-1' : ''} ${
            isOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''
          }`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <label
        htmlFor={id}
        className={`pointer-events-none absolute left-3 top-1 text-[9.5px] font-bold select-none transition-all duration-150 ${
          isOpen ? '!text-blue-600 dark:!text-blue-400' : 'text-slate-500 dark:text-slate-400'
        }`}
      >
        {label}
      </label>

      {isOpen && menuPos && createPortal(
        <div
          data-floating-select-menu
          style={{
            position: 'fixed',
            left: menuPos.left,
            // El menú se ajusta al contenido de sus opciones: no se estira al ancho completo del campo.
            width: multilineOptions ? Math.min(menuPos.width, window.innerWidth - 32) : 'max-content',
            minWidth: buscador.buscable
              ? Math.min(Math.max(menuPos.width, 220), window.innerWidth - 32)
              : Math.min(menuPos.width, 150),
            maxWidth: buscador.buscable
              ? Math.min(Math.max(menuPos.width, 300), window.innerWidth - 32)
              : Math.min(menuPos.width, window.innerWidth - 32),
            top: menuPos.top,
            bottom: menuPos.bottom,
          }}
          className="z-[100] rounded-lg border border-slate-200 bg-white p-0.5 shadow-xl shadow-slate-900/15 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="custom-scrollbar max-h-48 overflow-y-auto overscroll-contain">
            {buscador.buscable && (
              <BuscadorOpciones
                texto={buscador.texto}
                onTexto={buscador.setTexto}
                mostrados={buscador.filtradas.length}
                total={options.length}
                onTecla={(e) => manejarTeclaBuscador(e, { ...buscador, elegir, cerrar: () => setIsOpen(false) })}
              />
            )}
            {buscador.buscable && buscador.filtradas.length === 0 && (
              <p className="px-2 py-2 text-center text-slate-400" style={{ fontSize: '11px' }}>Sin resultados</p>
            )}
            {buscador.filtradas.map((opt, indice) => {
              if (hideEmptyOption && !String(opt.label ?? '').trim()) return null
              const isSelected = opt.value === value
              const resaltada = buscador.buscable && indice === buscador.activo
              return (
                <button
                  key={opt.value}
                  type="button"
                  ref={(el) => { if (el && resaltada) el.scrollIntoView({ block: 'nearest' }) }}
                  onClick={() => elegir(opt)}
                  // La regla global "button { font: inherit }" anula las clases text-*, por eso el tamaño va en línea.
                  style={{ fontSize: '11px', lineHeight: '1.25' }}
                  className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 transition-colors cursor-pointer text-left ${
                    isSelected
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-bold'
                      : resaltada
                        ? 'bg-slate-100 font-medium text-slate-800 dark:bg-slate-700/60 dark:text-white'
                        : 'font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <span className={multilineOptions ? 'min-w-0 whitespace-normal break-words leading-relaxed' : 'truncate'}>{opt.label}</span>
                  {isSelected && (
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-2.5 text-blue-600 dark:text-blue-400 shrink-0"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export function RoundedSelect({
  value,
  onChange,
  options = [],
  className = '',
  buttonClassName = '',
  placeholder = 'Seleccionar',
  align = 'end',
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = options.find((opt) => opt.value === value)
  const buscador = useOpcionesBuscables(options, isOpen)
  const elegir = (opt) => {
    onChange(opt.value)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className={`relative min-w-0 ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-2 rounded-xl border bg-slate-50 py-1.5 px-3 text-xs font-bold text-slate-700 transition outline-none dark:bg-[var(--bg-subtle)] dark:text-slate-200 cursor-pointer ${
          isOpen
            ? 'border-indigo-500 ring-2 ring-indigo-500/20 dark:border-indigo-400'
            : 'border-slate-200 hover:border-slate-300 dark:border-[var(--border-strong)] dark:hover:border-slate-600'
        } ${buttonClassName}`}
      >
        <span className="min-w-0 flex-1 truncate text-left" title={selectedOption?.label || placeholder}>{selectedOption?.label || placeholder}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`size-3.5 text-slate-400 transition-transform duration-150 shrink-0 ${
            isOpen ? 'rotate-180 text-indigo-500 dark:text-indigo-400' : ''
          }`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className={`absolute ${align === 'start' ? 'left-0' : 'right-0'} top-full mt-1.5 min-w-full w-max z-50 rounded-xl border border-slate-200 bg-white p-1 shadow-xl shadow-slate-900/10 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] animate-in fade-in zoom-in-95 duration-100 ${
          buscador.buscable ? 'min-w-[240px] max-w-[min(360px,calc(100vw-2rem))]' : 'max-w-[320px]'
        }`}>
          <div className="space-y-0.5 max-h-64 overflow-y-auto custom-scrollbar">
            {buscador.buscable && (
              <BuscadorOpciones
                texto={buscador.texto}
                onTexto={buscador.setTexto}
                mostrados={buscador.filtradas.length}
                total={options.length}
                onTecla={(e) => manejarTeclaBuscador(e, { ...buscador, elegir, cerrar: () => setIsOpen(false) })}
              />
            )}
            {buscador.buscable && buscador.filtradas.length === 0 && (
              <p className="px-2 py-2 text-center text-slate-400" style={{ fontSize: '11px' }}>Sin resultados</p>
            )}
            {buscador.filtradas.map((opt, indice) => {
              const isSelected = opt.value === value
              const resaltada = buscador.buscable && indice === buscador.activo
              return (
                <button
                  key={opt.value}
                  type="button"
                  ref={(el) => { if (el && resaltada) el.scrollIntoView({ block: 'nearest' }) }}
                  onClick={() => elegir(opt)}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-extrabold'
                      : resaltada
                        ? 'bg-slate-100 font-semibold text-slate-800 dark:bg-slate-700/60 dark:text-white'
                        : 'font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <span className="whitespace-normal text-left">{opt.label}</span>
                  {isSelected && (
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-3 text-indigo-600 dark:text-indigo-400 shrink-0"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
