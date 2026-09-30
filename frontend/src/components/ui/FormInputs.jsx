import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

export function FloatingInput({
  id,
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  maxLength,
  optional = false,
  autoComplete = 'off',
  className = '',
  inputClassName = '',
  ...props
}) {
  const [isFocused, setIsFocused] = useState(false)
  // Los inputs de fecha/hora siempre muestran su propio esqueleto (dd/mm/aaaa),
  // nunca se ven realmente "vacíos", así que la etiqueta debe quedar arriba
  // desde el inicio para no superponerse con ese texto nativo del navegador.
  const isFloating = ['date', 'time', 'datetime-local', 'month', 'week'].includes(type)
    || isFocused
    || (value !== undefined && value !== null && String(value).trim() !== '')

  return (
    <div className={`relative ${className}`}>
      <input
        id={id}
        type={type}
        required={required}
        maxLength={maxLength}
        value={value ?? ''}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        autoComplete={autoComplete}
        placeholder=" "
        className={`peer block h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 pt-3.5 pb-1 text-xs font-semibold text-slate-800 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-[var(--bg-subtle)] dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-white dark:focus:border-blue-400 ${inputClassName}`}
        {...props}
      />
      <label
        htmlFor={id}
        className={`pointer-events-none absolute left-3 select-none transition-all duration-150 ${
          isFloating
            ? 'top-1 text-[9.5px] font-bold text-slate-500 dark:text-slate-400'
            : 'top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 dark:text-slate-500'
        } ${isFocused ? '!text-blue-600 dark:!text-blue-400' : ''}`}
      >
        {label}
        {optional && (
          <span className="ml-1 text-[9px] font-normal text-slate-400 dark:text-slate-500">(Opcional)</span>
        )}
      </label>
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
  ...props
}) {
  const [isFocused, setIsFocused] = useState(false)
  const textareaRef = useRef(null)

  const isFloating = isFocused || (value !== undefined && value !== null && String(value).trim() !== '')

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.max(42, textareaRef.current.scrollHeight)}px`
    }
  }, [value])

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
          if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
            textareaRef.current.style.height = `${Math.max(42, textareaRef.current.scrollHeight)}px`
          }
          onChange?.(e)
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder=" "
        className={`peer block w-full rounded-xl border border-slate-200 bg-white px-3 pt-3.5 pb-1 text-xs font-semibold text-slate-800 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-[var(--bg-subtle)] dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-white dark:focus:border-blue-400 resize-none min-h-[42px] overflow-hidden ${textareaClassName}`}
        {...props}
      />
      <label
        htmlFor={id}
        className={`pointer-events-none absolute left-3 select-none transition-all duration-150 ${
          isFloating
            ? 'top-1 text-[9.5px] font-bold text-slate-500 dark:text-slate-400'
            : 'top-3 text-xs font-medium text-slate-400 dark:text-slate-500'
        } ${isFocused ? '!text-blue-600 dark:!text-blue-400' : ''}`}
      >
        {label}
        {optional && (
          <span className="ml-1 text-[9px] font-normal text-slate-400 dark:text-slate-500">(Opcional)</span>
        )}
      </label>
    </div>
  )
}

export function FloatingSelect({
  id,
  label,
  value,
  onChange,
  options = [],
  className = '',
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

  // El menú se renderiza vía portal (fuera del cuerpo del modal) con
  // posición fija, para que no quede recortado/con scroll raro cuando el
  // contenedor padre (ej. un modal) tiene su propio overflow. Se cierra si
  // el usuario hace scroll, en vez de recalcular la posición en cada frame.
  useEffect(() => {
    if (!isOpen) return undefined
    const handleScroll = () => setIsOpen(false)
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

  return (
    <div ref={containerRef} className={`relative ${isOpen ? 'z-50' : 'z-10'} ${className}`}>
      <button
        type="button"
        id={id}
        onClick={handleToggle}
        className={`flex h-[42px] w-full items-center justify-between rounded-xl border bg-white px-3 pt-3.5 pb-1 text-left text-xs font-semibold text-slate-800 outline-none transition-all dark:bg-[var(--bg-subtle)] dark:text-white cursor-pointer ${
          isOpen
            ? 'border-blue-500 ring-1 ring-blue-500/20 dark:border-blue-400'
            : 'border-slate-200 hover:border-slate-300 dark:border-[var(--border-strong)] dark:hover:border-slate-600'
        }`}
      >
        <span className="truncate pr-1">{selectedOption?.label || value}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`size-3 text-slate-400 transition-transform duration-150 shrink-0 ml-1.5 ${
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
          style={{ position: 'fixed', left: menuPos.left, width: menuPos.width, top: menuPos.top, bottom: menuPos.bottom }}
          className="max-w-[calc(100vw-2rem)] z-[100] rounded-xl border border-slate-200 bg-white p-1 shadow-2xl shadow-slate-900/20 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="space-y-0.5 max-h-56 overflow-y-auto custom-scrollbar">
            {options.map((opt) => {
              const isSelected = opt.value === value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange({ target: { value: opt.value } })
                    setIsOpen(false)
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-xs transition-colors cursor-pointer text-left ${
                    isSelected
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-bold'
                      : 'font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <span className="truncate pr-2">{opt.label}</span>
                  {isSelected && (
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-3 text-blue-600 dark:text-blue-400 shrink-0"
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

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-2 rounded-xl border bg-slate-50 py-1.5 px-3 text-xs font-bold text-slate-700 transition outline-none dark:bg-[var(--bg-subtle)] dark:text-slate-200 cursor-pointer ${
          isOpen
            ? 'border-indigo-500 ring-2 ring-indigo-500/20 dark:border-indigo-400'
            : 'border-slate-200 hover:border-slate-300 dark:border-[var(--border-strong)] dark:hover:border-slate-600'
        } ${buttonClassName}`}
      >
        <span className="whitespace-nowrap">{selectedOption?.label || placeholder}</span>
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
        <div className="absolute right-0 top-full mt-1.5 min-w-full w-max max-w-[320px] z-50 rounded-xl border border-slate-200 bg-white p-1 shadow-xl shadow-slate-900/10 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] animate-in fade-in zoom-in-95 duration-100">
          <div className="space-y-0.5 max-h-64 overflow-y-auto custom-scrollbar">
            {options.map((opt) => {
              const isSelected = opt.value === value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value)
                    setIsOpen(false)
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-extrabold'
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
