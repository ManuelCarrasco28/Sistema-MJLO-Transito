import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Icon } from './Icon'

// Los iconos por defecto de Leaflet rompen con bundlers como Vite porque
// referencian rutas relativas a assets que no se resuelven. Se reemplazan
// por iconos servidos desde un CDN.
const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const CHICLAYO_CENTER = [-6.7714, -79.8409]

function parseCoordenadas(value) {
  const match = String(value || '').match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/)
  if (!match) return null
  const lat = parseFloat(match[1])
  const lng = parseFloat(match[2])
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null
  return [lat, lng]
}

export function MapaCoordenadasPicker({ isOpen, onClose, onConfirm, initialValue, direccionSugerida }) {
  const mapElRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const [position, setPosition] = useState(() => parseCoordenadas(initialValue) || CHICLAYO_CENTER)
  const [searchTerm, setSearchTerm] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  useEffect(() => {
    if (!isOpen) return

    const initial = parseCoordenadas(initialValue) || CHICLAYO_CENTER
    setPosition(initial)
    setSearchTerm('')
    setSearchError('')

    const map = L.map(mapElRef.current, {
      center: initial,
      zoom: parseCoordenadas(initialValue) ? 17 : 14,
    })
    mapRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    const marker = L.marker(initial, { icon: markerIcon, draggable: true }).addTo(map)
    markerRef.current = marker

    const updatePosition = (latlng) => {
      setPosition([latlng.lat, latlng.lng])
      marker.setLatLng(latlng)
    }

    map.on('click', (e) => updatePosition(e.latlng))
    marker.on('dragend', () => updatePosition(marker.getLatLng()))

    setTimeout(() => map.invalidateSize(), 50)

    const yaTieneCoordenadas = Boolean(parseCoordenadas(initialValue))
    if (!yaTieneCoordenadas && direccionSugerida?.trim()) {
      setSearchTerm(direccionSugerida)
      runSearch(direccionSugerida)
    }

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [isOpen])

  const runSearch = async (term) => {
    const value = (term ?? searchTerm).trim()
    if (!value) return
    setSearching(true)
    setSearchError('')
    try {
      const query = `${value}, Chiclayo, Lambayeque, Perú`
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`
      )
      const results = await res.json()
      if (!results?.length) {
        setSearchError('No se encontró esa dirección. Intenta ser más específico o busca el punto directamente en el mapa.')
        return
      }
      const { lat, lon } = results[0]
      const latlng = { lat: parseFloat(lat), lng: parseFloat(lon) }
      setPosition([latlng.lat, latlng.lng])
      markerRef.current?.setLatLng(latlng)
      mapRef.current?.setView(latlng, 17)
    } catch {
      setSearchError('No se pudo buscar la dirección. Verifica tu conexión.')
    } finally {
      setSearching(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    runSearch()
  }

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-xs animate-enter sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-5 py-3.5 dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
              <Icon name="mapPin" className="size-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Ubicar en el mapa</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Busca la dirección o haz clic / arrastra el pin.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-[var(--bg-subtle)] cursor-pointer"
          >
            <Icon name="close" className="size-4" />
          </button>
        </div>

        <div className="border-b border-slate-100 p-3.5 dark:border-[var(--border)]">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Icon name="search" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Escribe la dirección a buscar..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white dark:focus:bg-[var(--bg-subtle)] focus:ring-1 focus:ring-indigo-500/20 dark:border-[var(--border-strong)] dark:bg-[var(--bg-surface)] dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="shrink-0 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60 cursor-pointer"
            >
              {searching ? 'Buscando...' : 'Buscar'}
            </button>
          </form>
          {searchError && (
            <p className="mt-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">{searchError}</p>
          )}
        </div>

        <div ref={mapElRef} className="h-80 w-full sm:h-96" />

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 px-5 py-3.5 dark:border-[var(--border)]">
          <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">
            {position[0].toFixed(6)}, {position[1].toFixed(6)}
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-[var(--border-strong)] dark:text-slate-300 dark:hover:bg-[var(--bg-subtle)] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => onConfirm(`${position[0].toFixed(6)}, ${position[1].toFixed(6)}`)}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 cursor-pointer"
            >
              Usar esta ubicación
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
