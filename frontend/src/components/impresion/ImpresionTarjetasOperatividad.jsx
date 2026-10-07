import { PlacaBadge } from '../ui/PlacaBadge'
import { StatusBadge } from '../ui/StatusBadge'
import { ListaImpresion } from './ListaImpresion'
import { TarjetaOperatividadLotePrint, precargarPlantillasOperatividad } from '../documentos/TarjetaOperatividadPrint'
import { datosImpresionDocumento } from '../documentos/PlantillaImpresionTUC'
import { resolverFotoParaCarnet } from '../../utils/impresionCarnets'

const FILTROS = [
  {
    clave: 'estado',
    valorInicial: 'VIGENTE',
    opciones: [
      { value: 'TODOS', label: 'Todos los estados' },
      { value: 'VIGENTE', label: 'Vigentes' },
      { value: 'EN_TRAMITE', label: 'En trámite' },
      { value: 'VENCIDO', label: 'Vencidos' },
    ],
  },
]

// Los documentos traen la foto como ruta relativa del almacenamiento; el carnet necesita una URL con sesión.
const urlDeFoto = (ruta) => {
  const texto = String(ruta || '').trim()
  if (!texto || /^(https?:|data:)/.test(texto)) return texto
  return `/files/${texto.replace(/^\/+/, '')}`
}

const COLUMNAS_LISTA = [
  { titulo: 'Placa', ancho: '11%', celda: (d) => <PlacaBadge placa={d.vehiculoPlaca} /> },
  {
    titulo: 'Titular',
    ancho: '25%',
    celda: (d) => (
      <>
        <p className="text-xs font-semibold leading-snug text-slate-900 dark:text-white" title={d.propietario}>{d.propietario || 'Sin Propietario'}</p>
        <p className="mt-0.5 font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400">DNI: {d.propietarioDni || 'N/A'}</p>
      </>
    ),
  },
  {
    titulo: 'Asociación / Empresa',
    ancho: '24%',
    celda: (d) => <p className="text-xs font-bold leading-tight text-slate-700 dark:text-slate-200" title={d.asociacion}>{d.asociacion || 'Independiente'}</p>,
  },
  { titulo: 'N° de tarjeta', ancho: '14%', celda: (d) => <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-200">{d.codigo || '—'}</span> },
  { titulo: 'Vence', ancho: '13%', celda: (d) => <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300">{d.fechaExpiracion || '—'}</span> },
]

const COLUMNAS_CARRITO = [
  { titulo: 'Placa', celda: (d) => <PlacaBadge placa={d.vehiculoPlaca} /> },
  { titulo: 'Titular', celda: (d) => <span className="font-semibold text-slate-800 dark:text-slate-100">{d.propietario || 'Sin propietario'}</span> },
  { titulo: 'Tarjeta', celda: (d) => <span className="font-mono text-slate-600 dark:text-slate-300">{d.codigo}</span> },
]

// Del documento solo se guarda lo que usa la tarjeta: el carrito sobrevive a recargar la página.
const compactar = (d) => ({
  id: d.id,
  tipoDocumento: d.tipoDocumento,
  codigo: d.codigo,
  asociacion: d.asociacion,
  resMunicipal: d.resMunicipal,
  propietario: d.propietario,
  propietarioDni: d.propietarioDni,
  conductorDni: d.conductorDni,
  conductorNombres: d.conductorNombres,
  conductorApellidos: d.conductorApellidos,
  numeroLicencia: d.numeroLicencia,
  direccion: d.direccion,
  fotoConductor: d.fotoConductor,
  vehiculoPlaca: d.vehiculoPlaca,
  vehiculoMotor: d.vehiculoMotor,
  fechaExpedicion: d.fechaExpedicion,
  fechaExpiracion: d.fechaExpiracion,
  codigoQr: d.codigoQr,
})

// Pestaña "Tarjeta de operatividad": tarjetas (TUC) de los vehículos, listas para imprimir.
export function ImpresionTarjetasOperatividad({ inicial }) {
  return (
    <ListaImpresion
      storageKey="impresion_carrito_tarjetas_operatividad_v2"
      endpoint="/documentos"
      baseParams={{ tipoDocumento: 'TARJETA_OPERATIVIDAD' }}
      placeholder="Buscar por placa, titular, DNI, asociación o N° de tarjeta..."
      filtros={FILTROS}
      columnas={COLUMNAS_LISTA}
      columnasCarrito={COLUMNAS_CARRITO}
      idDe={(d) => d.id}
      compactar={compactar}
      nombreItem={['tarjeta', 'tarjetas']}
      tituloCarrito="Carrito de tarjetas de operatividad"
      porPaginaMax={200}
      buscarInicial={inicial?.buscar || ''}
      valoresIniciales={inicial?.estado ? { estado: inicial.estado } : {}}
      preparar={async (items) => {
        const [conFoto] = await Promise.all([
          Promise.all(items.map(async (d) => ({ ...d, fotoConductor: await resolverFotoParaCarnet(urlDeFoto(d.fotoConductor)) }))),
          precargarPlantillasOperatividad(),
        ])
        return conFoto.map((d) => ({ ...datosImpresionDocumento(d), fotoUrl: d.fotoConductor }))
      }}
      renderImpresion={(items) => <TarjetaOperatividadLotePrint items={items} />}
    />
  )
}
