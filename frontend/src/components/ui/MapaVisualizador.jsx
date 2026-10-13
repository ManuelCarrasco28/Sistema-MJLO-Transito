import { useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Icon } from './Icon'
import { BotonCerrarModal } from './ModalControls'

export function parseCoordenadas(value) {
  const match = String(value || '').match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/)
  if (!match) return null
  const lat = parseFloat(match[1])
  const lng = parseFloat(match[2])
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null
  return [lat, lng]
}

// Marcador moderno SVG local — cero peticiones externas (0 ms de latencia)
const customPinIcon = L.divIcon({
  className: 'custom-map-marker',
  html: `
    <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 22px; height: 22px; background: rgba(112, 144, 176, 0.18); border-radius: 50%; transform: scale(1.6);"></div>
      <div style="width: 32px; height: 32px; background: #5B6EE1; border: 2.5px solid white; border-radius: 50%; box-shadow: 0 4px 12px rgba(112, 144, 176, 0.18); display: flex; align-items: center; justify-content: center; color: white;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
})

/**
 * Mapa embebido ultra rápido basado en Leaflet + OpenStreetMap
 */
export function MapaInline({ coordenadas, title, className = 'h-72 w-full' }) {
  const mapElRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const coords = parseCoordenadas(coordenadas)

  useEffect(() => {
    if (!mapElRef.current || !coords) return

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
    }

    const map = L.map(mapElRef.current, {
      center: coords,
      zoom: 17,
      zoomControl: true,
      attributionControl: false,
    })
    mapInstanceRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map)

    const marker = L.marker(coords, { icon: customPinIcon }).addTo(map)
    if (title) {
      marker
        .bindPopup(
          `<div style="font-family: inherit; font-size: 12px; line-height: 1.4; color: #0f172a; font-weight: 700; padding: 2px;">
             ${title}
             <div style="font-size: 11px; font-weight: 500; color: #64748b; font-family: monospace; margin-top: 2px;">
               ${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}
             </div>
           </div>`
        )
        .openPopup()
    }

    // Invalida tamaño para asegurar carga perfecta al renderizar o animar
    const t1 = setTimeout(() => map.invalidateSize(), 50)
    const t2 = setTimeout(() => map.invalidateSize(), 200)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      map.remove()
      mapInstanceRef.current = null
    }
  }, [coords ? coords.join(',') : '', title])

  if (!coords) {
    return (
      <div className={`grid ${className} place-items-center bg-slate-50 px-6 text-center text-xs font-semibold text-slate-400 dark:bg-[var(--bg-subtle)]`}>
        Coordenadas no válidas o no registradas.
      </div>
    )
  }

  const googleMapsUrl = `https://www.google.com/maps?q=${coords[0]},${coords[1]}`

  return (
    <div className={`relative ${className} overflow-hidden`}>
      <div ref={mapElRef} className="h-full w-full" />
      <a
        href={googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Abrir en Google Maps"
        className="absolute bottom-3 right-3 z-[1000] inline-flex items-center gap-1.5 rounded-xl bg-white/95 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-md backdrop-blur hover:bg-white hover:text-indigo-600 transition-all dark:bg-slate-900/95 dark:text-slate-200 dark:hover:text-indigo-400"
      >
        <Icon name="external" className="size-3.5" />
        <span>Abrir en Google Maps</span>
      </a>
    </div>
  )
}

/**
 * Modal visualizador de mapa con carga instantánea y botón directo a Google Maps
 */
export function MapaPreviewModal({ isOpen, onClose, coordenadas, title, direccion, tipo }) {
  if (!isOpen || !coordenadas) return null
  const coords = parseCoordenadas(coordenadas)
  const googleMapsUrl = coords ? `https://www.google.com/maps?q=${coords[0]},${coords[1]}` : null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-3 sm:p-4 backdrop-blur-xs animate-enter">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-[var(--border)] dark:bg-[#1C2438]">
        {/* Cabecera */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-5 py-3.5 dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Icon name="mapPin" className="size-4.5" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                  {title}
                </h3>
                {tipo === 'ASOCIACION' && (
                  <span className="inline-flex items-center rounded-md bg-amber-100 text-amber-800 border border-amber-200/90 px-1.5 py-0.5 text-[9.5px] font-black uppercase tracking-wider dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60">
                    ASOCIACIÓN
                  </span>
                )}
                {tipo === 'PARTICULAR' && (
                  <span className="inline-flex items-center rounded-md bg-cyan-100 text-cyan-800 border border-cyan-200/90 px-1.5 py-0.5 text-[9.5px] font-black uppercase tracking-wider dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800/60">
                    PARTICULAR
                  </span>
                )}
              </div>
              <p className="font-mono text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {coordenadas} {direccion ? `· ${direccion}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {googleMapsUrl && (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-indigo-600 transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:text-indigo-300"
              >
                <Icon name="external" className="size-3.5" />
                <span>Google Maps</span>
              </a>
            )}
            <BotonCerrarModal onClick={onClose} title="Cerrar mapa" />
          </div>
        </div>

        {/* Mapa interactivo instantáneo */}
        <div className="h-[68vh] w-full bg-slate-100 dark:bg-[#1C2438]">
          <MapaInline coordenadas={coordenadas} title={title} className="h-full w-full" />
        </div>
      </div>
    </div>
  )
}

const COLOR_TIPO_MAPA = { ASOCIACION: '#d97706', PARTICULAR: '#0891b2' }

function pinPorTipo(tipo) {
  const color = COLOR_TIPO_MAPA[tipo] || '#5B6EE1'
  // Marca de ubicación (gota con punto blanco); la punta inferior queda sobre la coordenada
  return L.divIcon({
    className: 'custom-map-marker',
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="38" viewBox="0 0 30 38" style="filter:drop-shadow(0 2px 3px rgba(15,23,42,.45))">
      <path d="M15 1C7.8 1 2 6.8 2 14c0 9.6 13 23 13 23s13-13.4 13-23C28 6.8 22.2 1 15 1Z" fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="15" cy="14" r="5" fill="white"/>
    </svg>`,
    iconSize: [30, 38],
    iconAnchor: [15, 37],
    popupAnchor: [0, -34],
  })
}

const escaparHtml = (texto) => String(texto ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

// Mapa con todos los puntos a la vez; se ajusta para que todos queden a la vista
function MapaVarios({ puntos }) {
  const mapElRef = useRef(null)

  useEffect(() => {
    if (!mapElRef.current || puntos.length === 0) return undefined
    const map = L.map(mapElRef.current, { zoomControl: true, attributionControl: false })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)
    const grupo = L.featureGroup()
    puntos.forEach((p) => {
      L.marker(p.coords, { icon: pinPorTipo(p.tipo) })
        .bindPopup(
          `<div style="font-family:inherit;font-size:12px;line-height:1.4;color:#0f172a;padding:2px;max-width:220px">
             <div style="font-weight:700">${escaparHtml(p.title)}</div>
             <div style="font-size:11px;color:#64748b;margin-top:2px">${escaparHtml(p.direccion)}</div>
             <div style="font-size:10px;font-weight:800;margin-top:3px;color:${COLOR_TIPO_MAPA[p.tipo] || '#5B6EE1'}">${p.tipo === 'PARTICULAR' ? 'PARTICULAR' : 'ASOCIACIÓN'}</div>
           </div>`
        )
        .addTo(grupo)
    })
    grupo.addTo(map)
    const ajustar = () => map.fitBounds(grupo.getBounds(), { padding: [30, 30], maxZoom: 16 })
    ajustar()
    const t1 = setTimeout(() => map.invalidateSize(), 50)
    const t2 = setTimeout(() => { map.invalidateSize(); ajustar() }, 250)
    return () => { clearTimeout(t1); clearTimeout(t2); map.remove() }
  }, [puntos])

  return <div ref={mapElRef} className="h-full w-full" />
}

/**
 * Modal con todas las ubicaciones registradas en un solo mapa.
 * `items`: [{ id, title, coordenadas, direccion, tipo }]
 */
export function MapaTodasUbicacionesModal({ isOpen, onClose, items = [], cargando = false, titulo = 'Todas las ubicaciones' }) {
  const puntos = useMemo(() => items
    .map((i) => ({ ...i, coords: parseCoordenadas(i.coordenadas) }))
    .filter((i) => i.coords), [items])

  useEffect(() => {
    if (!isOpen) return undefined
    const tecla = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', tecla)
    return () => document.removeEventListener('keydown', tecla)
  }, [isOpen, onClose])

  if (!isOpen) return null
  const asociaciones = puntos.filter((p) => p.tipo !== 'PARTICULAR').length
  const particulares = puntos.length - asociaciones

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-3 sm:p-4 backdrop-blur-xs animate-enter">
      <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-[var(--border)] dark:bg-[#1C2438]">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 dark:border-[var(--border)]">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Icon name="mapPin" className="size-4.5" />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold text-slate-900 dark:text-white">{titulo}</h3>
              <p className="flex flex-wrap items-center gap-x-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>{cargando ? 'Cargando ubicaciones…' : `${puntos.length} ubicaciones`}</span>
                <span className="inline-flex items-center gap-1"><span style={{ color: COLOR_TIPO_MAPA.ASOCIACION }}><Icon name="mapPin" className="size-3.5" /></span>Asociaciones ({asociaciones})</span>
                <span className="inline-flex items-center gap-1"><span style={{ color: COLOR_TIPO_MAPA.PARTICULAR }}><Icon name="mapPin" className="size-3.5" /></span>Particulares ({particulares})</span>
              </p>
            </div>
          </div>
          <BotonCerrarModal onClick={onClose} title="Cerrar mapa" />
        </div>
        <div className="h-[72vh] w-full bg-slate-100 dark:bg-[#1C2438]">
          {cargando ? (
            <div className="grid h-full place-items-center text-sm font-semibold text-slate-400">Cargando mapa…</div>
          ) : puntos.length === 0 ? (
            <div className="grid h-full place-items-center text-sm font-semibold text-slate-400">No hay ubicaciones con coordenadas para mostrar.</div>
          ) : (
            <MapaVarios puntos={puntos} />
          )}
        </div>
      </div>
    </div>
  )
}
