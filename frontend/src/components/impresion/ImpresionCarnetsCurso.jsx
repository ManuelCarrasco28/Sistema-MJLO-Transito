import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { PersonaDetalleModal } from '../personas/PersonaDetalleModal'
import { SmartPersonaFormModal } from '../personas/SmartPersonaFormModal'
import { ListaImpresion } from './ListaImpresion'
import { StatusBadge } from '../ui/StatusBadge'
import { CarnetCursoVialLotePrint, precargarPlantillasCarnet } from '../documentos/TarjetaOperatividadPrint'
import { apiFetch } from '../../config/api'
import { showError, showToast } from '../../utils/SwalUtil'
import { resolverFotosDeParticipantes } from '../../utils/impresionCarnets'

const OPCIONES_ENTREGA = [
  { value: 'TODOS', label: 'Todas las entregas' },
  { value: 'PENDIENTE', label: 'Pendientes de entrega' },
  { value: 'ENTREGADO', label: 'Entregados' },
]

const nombreDe = (p) => `${p.nombres || ''} ${p.apellido_paterno || ''} ${p.apellido_materno || ''}`.trim()

// Un año después de la expedición (si el curso no trae su fecha de vencimiento).
const vencimientoDe = (fecha) => {
  const dt = new Date(fecha)
  if (Number.isNaN(dt.getTime())) return ''
  dt.setFullYear(dt.getFullYear() + 1)
  return dt.toISOString().split('T')[0]
}

const aItemCarnet = (p) => {
  const expedicion = p.cursoCarnetExpedicion || p.cursoFecha
  const vencimiento = p.cursoCarnetVencimiento || vencimientoDe(expedicion)
  return {
    codigo: p.cursoCodigo,
    tucNumero: p.cursoCodigo,
    apellidos: `${p.apellido_paterno || ''} ${p.apellido_materno || ''}`.trim(),
    nombres: p.nombres || '',
    dni: p.dni || '',
    licencia: p.licencia || '',
    numeroLicencia: p.licencia || '',
    fotoUrl: p.fotoUrl || '',
    resolucion: p.cursoResolucion || '',
    fechaExpedicion: expedicion,
    fechaExpiracion: vencimiento,
    fechaVencimiento: vencimiento,
    asociacion: 'INDEPENDIENTE',
  }
}

// Marca o revierte la entrega del carnet con un clic en la etiqueta (igual que en Cursos de Seguridad Vial).
function BotonEntrega({ participante: p, actualizarFila }) {
  const [guardando, setGuardando] = useState(false)

  const alternar = async (e) => {
    e.stopPropagation()
    if (guardando) return
    const nuevoValor = !p.carnetEntregado
    setGuardando(true)
    try {
      const response = await apiFetch(`/cursos/inscripciones/${p.idInscripcion}/entrega`, {
        method: 'PUT',
        body: { entregado: nuevoValor },
      })
      if (!response.ok) throw new Error('No se pudo actualizar')
      const payload = await response.json()
      actualizarFila(p.idInscripcion, { carnetEntregado: nuevoValor, carnetFechaEntrega: payload.data?.carnet_fecha_entrega ?? null })
      showToast(nuevoValor ? 'Carnet marcado como entregado' : 'Entrega del carnet revertida')
    } catch {
      showError('Error', 'No se pudo actualizar la entrega del carnet.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <button
      type="button"
      onClick={alternar}
      disabled={guardando}
      title={p.carnetEntregado
        ? `Entregado${p.carnetFechaEntrega ? ' el ' + new Date(p.carnetFechaEntrega).toLocaleDateString('es-PE') : ''}. Clic para revertir.`
        : 'Clic para marcar como entregado'}
      className="inline-flex cursor-pointer disabled:cursor-wait disabled:opacity-50"
    >
      <StatusBadge status={p.carnetEntregado ? 'ENTREGADO' : 'PENDIENTE'} />
    </button>
  )
}

function ParticipantePersona({ participante: p }) {
  const [persona, setPersona] = useState(null)
  const [editando, setEditando] = useState(false)
  const [cargando, setCargando] = useState(false)
  const abrir = async (event) => {
    event.stopPropagation()
    if (cargando) return
    setCargando(true)
    try {
      if (!p.personaId) throw new Error('Actualiza la página para cargar la ficha del participante.')
      const response = await apiFetch(`/personas/${encodeURIComponent(p.personaId)}`)
      if (!response.ok) throw new Error('No se pudo cargar la ficha de persona.')
      const payload = await response.json()
      if (!payload.data) throw new Error('No se encontró la persona.')
      setPersona(payload.data)
    } catch (error) {
      showError('Ficha de persona', error.message)
    } finally {
      setCargando(false)
    }
  }
  return <>
    <button type="button" onClick={abrir} disabled={cargando} title="Ver persona" className="text-left rounded focus-visible:outline-2 focus-visible:outline-blue-500 hover:underline disabled:opacity-60">
      <span className="block text-xs font-semibold leading-snug text-slate-900 dark:text-white">{nombreDe(p) || 'Sin nombre'}</span>
      <span className="block mt-0.5 font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400">{cargando ? 'Cargando…' : `DNI: ${p.dni || ''}`}</span>
    </button>
    {persona && createPortal(editando
      ? <SmartPersonaFormModal initialPersona={persona} onClose={() => setEditando(false)} onSuccess={async () => {
        const response = await apiFetch(`/personas/${encodeURIComponent(p.personaId)}`)
        if (response.ok) {
          const payload = await response.json()
          if (payload.data) setPersona(payload.data)
        }
      }} />
      : <PersonaDetalleModal selectedPersona={persona} onClose={() => setPersona(null)} onEdit={() => setEditando(true)} />, document.body)}
  </>
}

const COLUMNAS_LISTA = [
  {
    titulo: 'Participante',
    ancho: '31%',
    celda: (p) => (
      <ParticipantePersona participante={p} />
    ),
  },
  {
    titulo: 'Curso',
    ancho: '31%',
    celda: (p) => (
      <>
        <p className="text-xs font-bold leading-tight text-slate-700 dark:text-slate-200" title={p.cursoTitulo}>{p.cursoTitulo}</p>
        <span className="font-mono text-[10px] font-bold text-slate-500 dark:text-slate-400">{p.cursoCodigo}</span>
      </>
    ),
  },
  { titulo: 'Fecha del curso', ancho: '14%', celda: (p) => <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-200">{p.cursoFecha}</span> },
  { titulo: 'Entrega', ancho: '15%', celda: (p, { actualizarFila }) => <BotonEntrega participante={p} actualizarFila={actualizarFila} /> },
]

const COLUMNAS_CARRITO = [
  {
    titulo: 'Participante',
    celda: (p) => (
      <>
        <span className="font-semibold text-slate-800 dark:text-slate-100">{nombreDe(p) || 'Sin nombre'}</span>
        <span className="ml-2 font-mono text-[11px] text-indigo-600 dark:text-indigo-400">{p.dni}</span>
      </>
    ),
  },
  { titulo: 'Curso', celda: (p) => <span className="text-slate-600 dark:text-slate-300">{p.cursoCodigo}</span> },
]

const compactar = (p) => ({
  idInscripcion: p.idInscripcion,
  cursoCodigo: p.cursoCodigo,
  cursoTitulo: p.cursoTitulo,
  cursoFecha: p.cursoFecha,
  cursoResolucion: p.cursoResolucion,
  cursoCarnetExpedicion: p.cursoCarnetExpedicion,
  cursoCarnetVencimiento: p.cursoCarnetVencimiento,
  nombres: p.nombres,
  apellido_paterno: p.apellido_paterno,
  apellido_materno: p.apellido_materno,
  dni: p.dni,
  licencia: p.licencia,
  fotoUrl: p.fotoUrl,
})

const FILTROS = [
  {
    clave: 'cursoId',
    valorInicial: 'TODOS',
    // Los cursos se buscan en el servidor al escribir: no se descarga la lista completa.
    remoto: {
      endpoint: '/cursos/finalizados',
      etiquetaTodos: 'Todos los cursos',
      mapear: (c) => ({ value: c.uuid || String(c.id), label: `${c.codigo} · ${c.titulo}` }),
    },
  },
  { clave: 'entrega', valorInicial: 'TODOS', opciones: OPCIONES_ENTREGA },
]

// Pestaña "Carnet del curso": participantes aprobados de cursos finalizados, listos para imprimir sus carnets.
export function ImpresionCarnetsCurso({ cursoInicial, alUsarCursoInicial }) {
  useEffect(() => { precargarPlantillasCarnet() }, [])

  return (
    <ListaImpresion
      storageKey="impresion_carrito_carnets_curso_v2"
      endpoint="/cursos/carnets"
      placeholder="Buscar por nombre, DNI o curso"
      filtros={FILTROS}
      columnas={COLUMNAS_LISTA}
      columnasCarrito={COLUMNAS_CARRITO}
      idDe={(p) => p.idInscripcion}
      compactar={compactar}
      nombreItem={['carnet', 'carnets']}
      tituloCarrito="Cola de impresión de carnets"
      porPaginaMax={1000}
      valoresIniciales={cursoInicial ? { cursoId: cursoInicial.id } : {}}
      etiquetasIniciales={cursoInicial ? { cursoId: cursoInicial.etiqueta } : {}}
      agregarTodoAlAbrir={Boolean(cursoInicial)}
      alAgregarTodoAlAbrir={alUsarCursoInicial}
      preparar={async (items) => {
        const [conFoto] = await Promise.all([resolverFotosDeParticipantes(items), precargarPlantillasCarnet()])
        return conFoto.map(aItemCarnet)
      }}
      renderImpresion={(items) => <CarnetCursoVialLotePrint items={items} />}
    />
  )
}
