import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { apiFetch, getCachedData, setCachedData } from '../../config/api'
import { formatRangoHoras12, formatTextoHorario12 } from '../../utils/formatters'

// Calendario de operativos y cursos. Se usa compacto en el panel de inicio y ampliado en una ventana,
// que también se abre desde el ícono de calendario del encabezado.
export function CalendarioEventos({ grande = false, onAmpliar, alNavegar }) {
  const navigate = useNavigate()
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [operativos, setOperativos] = useState(() => getCachedData('/operativos') || [])
  const [cursos, setCursos] = useState(() => getCachedData('/cursos') || [])
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(null)

  useEffect(() => {
    let active = true
    Promise.allSettled([
      apiFetch('/operativos').then((r) => (r.ok ? r.json() : { data: [] })),
      apiFetch('/cursos?resumen=1').then((r) => (r.ok ? r.json() : { data: [] })),
    ])
      .then(([opRes, curRes]) => {
        if (!active) return
        const ops = opRes.status === 'fulfilled' && Array.isArray(opRes.value?.data) ? opRes.value.data : []
        const curs = curRes.status === 'fulfilled' && Array.isArray(curRes.value?.data) ? curRes.value.data : []
        setOperativos(ops)
        setCursos(curs)
        setCachedData('/operativos', ops)
        setCachedData('/cursos', curs)
      })
      .catch(() => { })
    return () => {
      active = false
    }
  }, [])

  // Calendario
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate()
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay()
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre']

  const currentYear = calendarDate.getFullYear()
  const currentMonth = calendarDate.getMonth()
  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)
  const prevMonthDays = getDaysInMonth(currentYear, currentMonth - 1)

  const today = new Date()
  const isCurrentMonth = today.getMonth() === currentMonth && today.getFullYear() === currentYear

  const handlePrevMonth = () => {
    setSelectedCalendarDay(null)
    setCalendarDate(new Date(currentYear, currentMonth - 1, 1))
  }
  const handleNextMonth = () => {
    setSelectedCalendarDay(null)
    setCalendarDate(new Date(currentYear, currentMonth + 1, 1))
  }

  const getEventsForDay = (year, month, day) => {
    const monthStr = String(month + 1).padStart(2, '0')
    const dayStr = String(day).padStart(2, '0')
    const datePrefix = `${year}-${monthStr}-${dayStr}`

    const dayOperativos = operativos.filter((op) => {
      if (!op.fecha) return false
      return String(op.fecha).slice(0, 10) === datePrefix
    })

    const dayCursos = cursos.filter((c) => {
      const fecha = c.fecha || c.fecha_inicio
      if (!fecha) return false
      return String(fecha).slice(0, 10) === datePrefix
    })

    return {
      dateStr: datePrefix,
      day,
      operativos: dayOperativos,
      cursos: dayCursos,
      hasEvents: dayOperativos.length > 0 || dayCursos.length > 0,
    }
  }

  const currentMonthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`
  const monthOperativos = useMemo(() => {
    return operativos.filter((op) => op.fecha && String(op.fecha).startsWith(currentMonthPrefix))
  }, [operativos, currentMonthPrefix])

  const monthCursos = useMemo(() => {
    return cursos.filter((c) => {
      const fecha = c.fecha || c.fecha_inicio
      return fecha && String(fecha).startsWith(currentMonthPrefix)
    })
  }, [cursos, currentMonthPrefix])


  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h4 className={`font-extrabold text-[#2B3674] dark:text-white ${grande ? 'text-2xl' : 'text-base'}`}>{monthNames[currentMonth]} {currentYear}</h4>
        <div className="flex items-center gap-1">
          {!grande && (
            <button type="button" onClick={() => onAmpliar?.()} aria-label="Ver calendario más grande" title="Ver más grande" className="w-8 h-8 rounded-full bg-[#F4F7FE] dark:bg-white/5 hover:bg-[#E9EDF7] text-[#2B3674] dark:text-white flex items-center justify-center transition-colors cursor-pointer">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" /></svg>
            </button>
          )}
          <button type="button" onClick={handlePrevMonth} className="w-8 h-8 rounded-full bg-[#F4F7FE] dark:bg-white/5 hover:bg-[#E9EDF7] text-[#2B3674] dark:text-white flex items-center justify-center transition-colors cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <button type="button" onClick={handleNextMonth} className="w-8 h-8 rounded-full bg-[#F4F7FE] dark:bg-white/5 hover:bg-[#E9EDF7] text-[#2B3674] dark:text-white flex items-center justify-center transition-colors cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>
      <div className={`grid grid-cols-7 text-center font-bold text-[#A3AED0] gap-y-2 mb-2 ${grande ? 'text-sm' : 'text-xs'}`}>
        <span>Do</span><span>Lu</span><span>Ma</span><span>Mi</span><span>Ju</span><span>Vi</span><span>Sa</span>
      </div>
      <div className={`grid grid-cols-7 text-center font-semibold text-[#2B3674] dark:text-white ${grande ? 'text-base gap-y-3' : 'text-xs gap-y-2.5'}`}>
        {Array.from({ length: firstDay }).map((_, i) => (
          <span key={`prev-${i}`} className={`flex items-center justify-center text-[#A3AED0]/40 ${grande ? 'text-base py-3.5' : 'text-xs py-1'}`}>
            {prevMonthDays - firstDay + i + 1}
          </span>
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const dayEvents = getEventsForDay(currentYear, currentMonth, day)
          const isToday = isCurrentMonth && day === today.getDate()
          const isSelected = selectedCalendarDay?.day === day
          const hasOps = dayEvents.operativos.length > 0
          const hasCur = dayEvents.cursos.length > 0

          return (
            <button
              key={`day-${day}`}
              type="button"
              onClick={() => setSelectedCalendarDay(isSelected ? null : dayEvents)}
              className={`relative flex flex-col items-center justify-center ${grande ? 'py-3.5' : 'py-1'} transition-all rounded-xl cursor-pointer ${isSelected && isToday
                  ? 'bg-[#5B6EE1] text-white font-black ring-2 ring-[#5B6EE1]/50 ring-offset-2 ring-offset-white dark:ring-offset-[#1C2438]'
                  : isSelected
                    ? 'ring-2 ring-[#5B6EE1] bg-[#5B6EE1]/10 text-[#2B3674] dark:text-white font-bold'
                    : isToday
                      ? 'bg-[#5B6EE1] text-white font-black'
                      : (hasOps || hasCur)
                        ? 'hover:bg-slate-100 dark:hover:bg-white/10 font-bold'
                        : 'hover:bg-slate-50 dark:hover:bg-white/5 font-medium text-slate-700 dark:text-slate-200'
                }`}
            >
              <span className={`${grande ? 'text-base' : 'text-xs'} ${isToday ? 'text-white' : ''}`}>
                {day}
              </span>

              {/* Indicadores visuales de operativos y cursos */}
              {(hasOps || hasCur) && (
                <div className="flex items-center gap-0.5 mt-0.5">
                  {hasOps && (dayEvents.operativos.length > 1 ? (
                    <span
                      className={`grid min-w-4 place-items-center rounded-full px-1 text-[9px] font-black leading-4 text-white ${isToday ? 'bg-amber-400' : 'bg-blue-600 dark:bg-blue-500'}`}
                      title={`${dayEvents.operativos.length} operativos`}
                    >{dayEvents.operativos.length}</span>
                  ) : (
                    <span
                      className={`size-1.5 rounded-full ${isToday ? 'bg-amber-300' : 'bg-blue-600 dark:bg-blue-400'}`}
                      title="1 operativo"
                    />
                  ))}
                  {hasCur && (dayEvents.cursos.length > 1 ? (
                    <span
                      className={`grid min-w-4 place-items-center rounded-full px-1 text-[9px] font-black leading-4 text-white ${isToday ? 'bg-emerald-400' : 'bg-emerald-600 dark:bg-emerald-500'}`}
                      title={`${dayEvents.cursos.length} cursos`}
                    >{dayEvents.cursos.length}</span>
                  ) : (
                    <span
                      className={`size-1.5 rounded-full ${isToday ? 'bg-emerald-300' : 'bg-emerald-500 dark:bg-emerald-400'}`}
                      title="1 curso"
                    />
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Leyenda y contador mensual */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[var(--border)] flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
            <span className="size-2 rounded-full bg-blue-600 dark:bg-blue-400" />
            Operativos ({monthOperativos.length})
          </span>
          <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
            <span className="size-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
            Cursos ({monthCursos.length})
          </span>
        </div>
        <span className="text-[10px] font-extrabold text-[#5B6EE1] dark:text-blue-300 bg-[#5B6EE1]/10 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
          Hoy: {today.toLocaleDateString()}
        </span>
      </div>

      {/* Detalle interactivo del día seleccionado */}
      {selectedCalendarDay ? (
        <div className="mt-3.5 rounded-2xl border border-blue-200/80 bg-blue-50/40 p-3.5 dark:border-[var(--border)] dark:bg-slate-900/80 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-blue-100 dark:border-[var(--border)]">
            <div className="flex items-center gap-1.5">
              <Icon name="calendar" className="size-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-black text-slate-800 dark:text-white">
                {selectedCalendarDay.day} de {monthNames[currentMonth]} {currentYear}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedCalendarDay(null)}
              className="grid size-6 place-items-center rounded-md text-rose-500 hover:bg-rose-100 hover:text-rose-600 dark:text-rose-400 dark:hover:bg-rose-900/50 text-xs font-bold transition cursor-pointer"
            >
              ✕
            </button>
          </div>
          {selectedCalendarDay.hasEvents && (
            <p className="mt-2 text-[11px] font-bold text-slate-500 dark:text-slate-300">
              {selectedCalendarDay.operativos.length} {selectedCalendarDay.operativos.length === 1 ? 'operativo' : 'operativos'}
              {selectedCalendarDay.cursos.length > 0 && ` · ${selectedCalendarDay.cursos.length} ${selectedCalendarDay.cursos.length === 1 ? 'curso' : 'cursos'}`}
            </p>
          )}

          {!selectedCalendarDay.hasEvents ? (
            <p className="mt-2.5 text-xs text-slate-500 dark:text-slate-400 text-center py-2">
              Sin operativos ni cursos programados para esta fecha.
            </p>
          ) : (
            <div className="mt-2.5 space-y-2.5">
              {/* Operativos del día */}
              {selectedCalendarDay.operativos.slice(0, grande ? 999 : 3).map((op) => (
                <div
                  key={`op-${op.id}`}
                  className="rounded-xl border border-blue-200/60 bg-white p-2.5 dark:border-[var(--border)] dark:bg-slate-950/80 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-1.5 py-0.5 text-[9.5px] font-black text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        OPERATIVO
                      </span>
                      <h5 className="mt-1 text-xs font-extrabold text-slate-800 dark:text-white">
                        {op.nombre || 'Operativo Inopinado'}
                      </h5>
                      <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Icon name="mapPin" className="size-3 inline shrink-0" /> {op.lugar || 'Distrito J.L. Ortiz'}
                      </p>
                      {op.hora_inicio && (
                        <p className="text-[10px] text-slate-400">
                          Hora: {op.hora_inicio}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => { navigate('/operativos'); alNavegar?.() }}
                      className="shrink-0 text-[10px] font-bold text-blue-600 hover:underline dark:text-blue-400 cursor-pointer pt-0.5"
                    >
                      Ir a módulo →
                    </button>
                  </div>
                </div>
              ))}

              {/* Cursos del día */}
              {selectedCalendarDay.cursos.slice(0, grande ? 999 : Math.max(0, 3 - selectedCalendarDay.operativos.length)).map((c) => (
                <div
                  key={`cur-${c.id}`}
                  className="rounded-xl border border-emerald-200/60 bg-white p-2.5 dark:border-[var(--border)] dark:bg-slate-950/80 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[9.5px] font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        CURSO SEGURIDAD VIAL
                      </span>
                      <h5 className="mt-1 text-xs font-extrabold text-slate-800 dark:text-white">
                        {c.titulo || c.nombre || 'Capacitación Vial'}
                      </h5>
                      <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Icon name="mapPin" className="size-3 inline shrink-0" /> {c.lugar || 'Auditorio Municipal'}
                      </p>
                      {c.horario && (
                        <p className="text-[10px] text-slate-400">
                          Horario: {formatRangoHoras12(c.horaInicio, c.horaFin) || formatTextoHorario12(c.horario)}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => { navigate('/cursos'); alNavegar?.() }}
                      className="shrink-0 text-[10px] font-bold text-emerald-600 hover:underline dark:text-emerald-400 cursor-pointer pt-0.5"
                    >
                      Ir a módulo →
                    </button>
                  </div>
                </div>
              ))}
              {(() => {
                const total = selectedCalendarDay.operativos.length + selectedCalendarDay.cursos.length
                const restantes = grande ? 0 : total - 3
                return restantes > 0 ? (
                  <button
                    type="button"
                    onClick={() => onAmpliar?.()}
                    className="w-full rounded-xl border border-dashed border-[#5B6EE1]/50 bg-[#5B6EE1]/5 py-2 text-[11px] font-bold text-[#5B6EE1] transition hover:bg-[#5B6EE1]/10 cursor-pointer"
                    style={{ fontSize: 11 }}
                  >
                    Ver los {restantes} restantes
                  </button>
                ) : null
              })()}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40 px-3 py-2 text-center text-[11px] text-slate-500 dark:text-slate-400">
          Selecciona cualquier día con puntos de color para ver detalles de operativos o cursos.
        </div>
      )}
    </>
  )
}

// Ventana ampliada del calendario (clic en el calendario del panel o en el ícono del encabezado)
export function CalendarioEventosModal({ onClose }) {
  useEffect(() => {
    const tecla = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', tecla)
    return () => document.removeEventListener('keydown', tecla)
  }, [onClose])

  return createPortal(
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-900/55 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Calendario ampliado"
          onMouseDown={() => onClose()}
        >
          <div
            className="modal-enter sin-scrollbar relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-[30px] bg-white dark:bg-[#1C2438] p-8 shadow-horizon dark:shadow-none"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => onClose()}
              aria-label="Cerrar calendario"
              className="absolute right-5 top-5 z-10 grid size-10 place-items-center rounded-full border border-rose-200/80 bg-rose-50/70 text-rose-500 hover:bg-rose-100 hover:text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/50 transition-all active:scale-95 cursor-pointer"
            >
              <Icon name="close" className="size-5" />
            </button>
            <div className="pr-12"><CalendarioEventos grande alNavegar={onClose} /></div>
          </div>
        </div>
    ,
    document.body,
  )
}
