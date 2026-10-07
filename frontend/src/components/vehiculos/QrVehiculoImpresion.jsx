import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { QRCodeSVG } from 'qrcode.react'
import { Icon } from '../ui/Icon'
import { BotonCerrarModal } from '../ui/ModalControls'
import { buildVehiculoQrValue, isVehiculoFormal } from '../../utils/vehiculos'
import './QrVehiculoImpresion.css'

// Posiciones (en % de la imagen) del recuadro blanco y de la franja amarilla de cada plantilla.
export const PLANTILLAS = {
  mototaxi: {
    nombre: 'Mototaxi',
    ruta: '/img/img-qr-vehiculo/bg-mototaxi-seguro.jpeg',
    ancho: 1095,
    alto: 1600,
    qr: { left: 19.6, top: 33, ancho: 62 },
    placa: { top: 79.5, alto: 10.5 },
  },
  motocarguera: {
    nombre: 'Motocarguera',
    ruta: '/img/img-qr-vehiculo/new-bg-motocarguera-seguro.jpg',
    ancho: 1749,
    alto: 2481,
    qr: { left: 19.5, top: 31.6, ancho: 62 },
    placa: { top: 78.4, alto: 11.1 },
  },
}

// La plantilla sale del tipo de vehículo registrado: solo existen para Mototaxi y Motocarguera.
// Un vehículo informal (sin asociación) no genera QR: devuelve null igual que un tipo sin plantilla.
export const plantillaDeVehiculo = (vehiculo) => {
  if (!isVehiculoFormal(vehiculo)) return null
  const tipo = String(vehiculo?.tipo || '').toUpperCase()
  if (tipo.includes('CARGUERA')) return 'motocarguera'
  if (tipo.includes('MOTOTAXI')) return 'mototaxi'
  return null
}

// Nombre corto de la asociación para la plantilla: lo que va entre comillas o, si no hay, sin las
// palabras genéricas ("ASOCIACION DE MOTOTAXIS ...").
export const nombreAsociacion = (asociacion) => {
  const texto = String(asociacion || '').trim()
  if (!texto || /^(sin asociaci|independiente)/i.test(texto)) return ''
  const entreComillas = texto.match(/["“”«]([^"“”»]+)["“”»]/)
  if (entreComillas) return entreComillas[1].trim()
  return texto.replace(/ASOCIACION DE |ASOCIACION|DE MOTOTAXIS|MOTOTAXIS|MOTO|TAXIS|TAXI|CARGUERAS/gi, '').replace(/\s+/g, ' ').trim()
}

// El QR impreso lleva solo lo necesario para identificar el vehículo: es corto, se escanea bien aunque
// salga pequeño, y la app móvil lee de él la línea "Codigo QR:" para abrir la ficha completa.
export const valorQrVehiculo = (vehiculo) => {
  // El código QR es el uuid del vehículo; si por algún motivo la lista no trae codigoQr se usa el uuid.
  const codigo = vehiculo?.codigoQr || vehiculo?.uuid
  if (!codigo) return buildVehiculoQrValue(vehiculo)
  return [
    'MDJLO - Sistema de Gestion de Transito Municipal',
    `Codigo QR: ${codigo}`,
    `Placa del vehiculo: ${vehiculo.placa || 'SIN PLACA'}`,
  ].join('\n')
}

const cacheDataUri = {}

// La plantilla se embebe como data URI: así sale siempre al imprimir, sin depender de una petición de red.
const cargarPlantilla = async (clave) => {
  if (cacheDataUri[clave]) return cacheDataUri[clave]
  const blob = await fetch(PLANTILLAS[clave].ruta).then((r) => r.blob())
  const uri = await new Promise((resolve, reject) => {
    const lector = new FileReader()
    lector.onload = () => resolve(lector.result)
    lector.onerror = reject
    lector.readAsDataURL(blob)
  })
  await new Promise((resolve) => {
    const img = new Image()
    img.onload = resolve
    img.onerror = resolve
    img.src = uri
  })
  cacheDataUri[clave] = uri
  return uri
}

export function HojaQr({ vehiculo }) {
  const clave = plantillaDeVehiculo(vehiculo)
  if (!clave) return null
  const p = PLANTILLAS[clave]
  const asociacion = nombreAsociacion(vehiculo.asociacion)
  return (
    <div className="qrv-hoja" style={{ aspectRatio: `${p.ancho} / ${p.alto}`, '--qrv-ratio': p.ancho / p.alto }}>
      <div className={`qrv-fondo qrv-bg-${clave}`} />
      <div className="qrv-qr" style={{ left: `${p.qr.left}%`, top: `${p.qr.top}%`, width: `${p.qr.ancho}%` }}>
        <QRCodeSVG value={valorQrVehiculo(vehiculo)} size={512} level="M" marginSize={0} style={{ width: '100%', height: '100%' }} />
      </div>
      <div className="qrv-placa" style={{ top: `${p.placa.top}%`, height: `${p.placa.alto}%` }}>
        {asociacion && <span className="qrv-asoc">{asociacion}</span>}
        <span className="qrv-placa-num">{vehiculo.placa}</span>
      </div>
    </div>
  )
}

// Imprime los vehículos indicados en hojas A4 de 4 cuadrantes (2 x 2), repitiendo cada vehículo `copias` veces.
// Se monta solo cuando hay que imprimir y avisa con onFin al terminar o cancelar.
export function ImpresionQrPortal({ vehiculos, copias = 1, onFin }) {
  const [estilos, setEstilos] = useState(null)

  const hojas = useMemo(() => {
    const items = vehiculos.filter(plantillaDeVehiculo).flatMap((v) => Array.from({ length: copias }, () => v))
    const paginas = []
    for (let i = 0; i < items.length; i += 4) paginas.push(items.slice(i, i + 4))
    return paginas
  }, [vehiculos, copias])

  // Las plantillas se cargan y decodifican antes de montar la hoja para que no salgan en blanco.
  useEffect(() => {
    let activo = true
    const claves = [...new Set(vehiculos.map(plantillaDeVehiculo).filter(Boolean))]
    Promise.all(claves.map(async (k) => `.qrv-portal .qrv-bg-${k}{background-image:url("${await cargarPlantilla(k)}")}`))
      .then((reglas) => { if (activo) setEstilos(reglas.join('\n')) })
      .catch(() => { if (activo) onFin?.() })
    return () => { activo = false }
  }, [vehiculos]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (estilos === null) return
    let cancelado = false
    let terminado = false
    // "afterprint" se dispara dentro de window.print() (que bloquea): el oyente va antes de imprimir.
    const limpiar = () => {
      if (cancelado || terminado) return
      terminado = true
      window.removeEventListener('afterprint', limpiar)
      onFin?.()
    }
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => {
      if (cancelado) return
      window.addEventListener('afterprint', limpiar, { once: true })
      window.print()
      setTimeout(limpiar, 300)
    }))
    return () => { cancelado = true; window.removeEventListener('afterprint', limpiar); cancelAnimationFrame(raf) }
  }, [estilos]) // eslint-disable-line react-hooks/exhaustive-deps

  if (estilos === null) return null
  return createPortal(
    <div className="seccion-impresion-portal qrv-portal">
      {/* Hoja sin márgenes mientras dura la impresión: así el navegador no añade fecha, título, URL ni numeración. */}
      <style>{`@page { size: A4 portrait; margin: 0; }\n${estilos}`}</style>
      {hojas.map((pagina, i) => (
        <div key={i} className="qrv-pagina">
          {pagina.map((v, j) => (
            <div key={j} className="qrv-celda"><HojaQr vehiculo={v} /></div>
          ))}
        </div>
      ))}
    </div>,
    document.body,
  )
}

// Impresión de un solo vehículo (desde la columna Acciones): una hoja con sus 3 QR.
export function QrVehiculoImpresion({ vehiculo, onClose }) {
  const [imprimiendo, setImprimiendo] = useState(false)
  const clave = plantillaDeVehiculo(vehiculo)

  return (
    <>
      <div
        className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <div className="flex max-h-[94vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#1C2438]">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3 dark:border-[var(--border)]">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">Imprimir QR del vehículo</h3>
              <p className="text-xs text-slate-500">
                Placa {vehiculo.placa} · {clave ? PLANTILLAS[clave].nombre : (vehiculo.tipo || 'Sin tipo')}
              </p>
            </div>
            <BotonCerrarModal onClick={onClose} />
          </div>

          <div className="flex min-h-0 flex-1 justify-center overflow-y-auto p-5">
            {clave ? (
              <div className="w-full max-w-[280px] shadow-lg"><HojaQr vehiculo={vehiculo} /></div>
            ) : (
              <p className="self-center text-center text-sm text-slate-500">
                {isVehiculoFormal(vehiculo)
                  ? 'Solo los mototaxis y las motocargueras tienen plantilla de QR. Cambie el tipo del vehículo si corresponde.'
                  : 'Este vehículo es informal (no pertenece a ninguna asociación), por eso no genera QR. Asígnele una asociación para poder imprimirlo.'}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-5 py-3 dark:border-[var(--border)]">
            <span className="text-xs text-slate-500">Se imprimen 3 QR del vehículo en una hoja A4.</span>
            <button
              type="button"
              onClick={() => setImprimiendo(true)}
              disabled={imprimiendo || !clave}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 font-bold text-white transition hover:opacity-90 active:scale-95 disabled:cursor-wait disabled:opacity-60"
              style={{ backgroundColor: 'oklch(62.3% 0.214 259.815)', fontSize: '12px' }}
            >
              <Icon name="print" className="size-4" />
              {imprimiendo ? 'Preparando…' : 'Imprimir'}
            </button>
          </div>
        </div>
      </div>

      {imprimiendo && <ImpresionQrPortal vehiculos={[vehiculo]} copias={3} onFin={() => setImprimiendo(false)} />}
    </>
  )
}
