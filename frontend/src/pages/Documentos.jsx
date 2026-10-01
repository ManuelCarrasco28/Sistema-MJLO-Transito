import { useEffect, useState, useRef } from 'react'
import { showToast, showConfirm, showError, showSuccess } from '../utils/SwalUtil'
import { Icon } from '../components/ui/Icon'
import { PageLoadError } from '../components/ui/PageLoadError'
import { Pagination } from '../components/ui/Pagination'
import { SortableHeader } from '../components/ui/SortableHeader'
import { StatusBadge } from '../components/ui/StatusBadge'
import { PlacaBadge } from '../components/ui/PlacaBadge'
import { apiFetch, getCachedData, setCachedData, invalidateCache } from '../config/api'
import { PlantillaImpresionTUC } from '../components/documentos/PlantillaImpresionTUC'
import { exportToExcel } from '../utils/exportToExcel'
import { FloatingInput, FloatingSelect, RoundedSelect } from '../components/ui/FormInputs'
import { formatFecha, formatNumeroTarjeta } from '../utils/formatters'

const TIPO_DOC_OPTIONS = [
  { value: 'TARJETA_OPERATIVIDAD', label: 'Tarjeta de Operatividad (TUC)' },
  { value: 'SOAT', label: 'SOAT Vehicular' },
  { value: 'TARJETA_PROPIEDAD', label: 'Tarjeta de Propiedad' },
]

// Tipos que ya no se emiten desde este módulo (el CertiCAV/inspección técnica
// se registra aparte, en su propio módulo) pero que algún registro antiguo
// todavía puede tener guardado: se muestran de solo lectura al editar.
const TIPO_DOC_LABEL_EXTERNO = {
  CITV: 'CITV (Inspección Técnica)',
  INSPECCION_TECNICA: 'Inspección Técnica',
  REVISION_TECNICA: 'Revisión Técnica (CertiCAV) — legado',
  CERTICAV: 'CertiCAV (Inspección Técnica) — legado',
  PERMISO_OPERACION: 'Tarjeta de Operatividad — legado',
  TARJETA_CIRCULACION: 'Tarjeta de Propiedad — legado',
}

const TIPOS_SIN_VIGENCIA = ['TARJETA_PROPIEDAD', 'TARJETA_CIRCULACION']

const ESTADO_OPTIONS = [
  { value: 'VIGENTE', label: 'VIGENTE' },
  { value: 'EN_TRAMITE', label: 'EN TRÁMITE' },
  { value: 'VENCIDO', label: 'VENCIDO' },
]

// La Tarjeta de Propiedad no vence (vigencia indefinida): "En trámite" y
// "Vencido" no aplican, solo si sigue vigente o fue anulada (venta/cambio
// de propietario, que genera una tarjeta nueva).
const ESTADO_OPTIONS_SIN_VIGENCIA = [
  { value: 'VIGENTE', label: 'VIGENTE' },
  { value: 'ANULADO', label: 'ANULADO' },
]

const FILTER_TIPO_OPTIONS = [
  { value: 'TODOS', label: 'Todos los tipos' },
  { value: 'TARJETA_OPERATIVIDAD', label: 'Tarjeta Operatividad (TUC)' },
  { value: 'SOAT', label: 'SOAT' },
  { value: 'TARJETA_PROPIEDAD', label: 'Tarjeta Propiedad' },
]

const FILTER_ESTADO_OPTIONS = [
  { value: 'TODOS', label: 'Todos los estados' },
  { value: 'VIGENTE', label: 'Vigentes' },
  { value: 'EN_TRAMITE', label: 'En trámite' },
  { value: 'VENCIDO', label: 'Vencidos' },
]

function getCodigoLabel(tipoDocumento) {
  switch (tipoDocumento) {
    case 'SOAT':
      return 'Número de Póliza'
    case 'TARJETA_OPERATIVIDAD':
      return 'Número Res. Municipal'
    case 'TARJETA_PROPIEDAD':
    case 'TARJETA_CIRCULACION':
      return 'Número de Partida Registral'
    default:
      return 'Código / Número de documento'
  }
}

function getDocTypeBadge(tipo) {
  switch (tipo) {
    case 'TARJETA_OPERATIVIDAD':
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10.5px] font-bold text-blue-700 border border-blue-200/80 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800">
          TUC (Operatividad)
        </span>
      )
    case 'SOAT':
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10.5px] font-bold text-amber-700 border border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
          SOAT Vehicular
        </span>
      )
    case 'CERTICAV':
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[10.5px] font-bold text-purple-700 border border-purple-200/80 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800">
          CertiCAV (Inspección)
        </span>
      )
    
    case 'INSPECCION_TECNICA':
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-cyan-50 px-2 py-0.5 text-[10.5px] font-bold text-cyan-700 border border-cyan-200/80 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800">
          CITV
        </span>
      )
    case 'TARJETA_PROPIEDAD':
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10.5px] font-bold text-slate-700 border border-slate-200 dark:bg-[var(--bg-subtle)] dark:text-slate-300 dark:border-[var(--border-strong)]">
          Tarjeta Propiedad
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-0.5 text-[10.5px] font-bold text-slate-600 border border-slate-200 dark:bg-[var(--bg-subtle)] dark:text-slate-300">
          {tipo || '—'}
        </span>
      )
  }
}

export function Documentos() {
  const cached = getCachedData('/documentos')
  const [documentos, setDocumentos] = useState(cached || [])
  const [vehiculos, setVehiculos] = useState([])
  const [isLoading, setIsLoading] = useState(!cached)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setCurrentPage(1)
    }, 160)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const [filterTipo, setFilterTipo] = useState('TODOS')
  const [filterEstado, setFilterEstado] = useState('TODOS')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [sortBy, setSortBy] = useState('')
  const [sortDir, setSortDir] = useState('DESC')
  const handleSort = (column, dir) => {
    setSortBy(column)
    setSortDir(dir)
    setCurrentPage(1)
  }
  const [loadError, setLoadError] = useState('')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [isEditing, setIsEditing] = useState(false)

  // Search dropdown for vehicle plate inside modal
  const [isPlacaDropdownOpen, setIsPlacaDropdownOpen] = useState(false)
  const placaDropdownRef = useRef(null)

  const [formData, setFormData] = useState({
    vehiculoPlaca: '',
    tipoDocumento: 'TARJETA_OPERATIVIDAD',
    codigo: '',
    fechaExpedicion: '',
    fechaExpiracion: '',
    estado: 'VIGENTE',
    propietario: '',
    propietarioDni: '',
    asociacion: '',
  })

  const [totalFiltrado, setTotalFiltrado] = useState(0)
  const [isExportingExcel, setIsExportingExcel] = useState(false)
  const [isExportingPdf, setIsExportingPdf] = useState(false)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        porPagina: String(itemsPerPage),
      })
      if (debouncedSearch) params.set('buscar', debouncedSearch)
      if (filterTipo !== 'TODOS') params.set('tipoDocumento', filterTipo)
      if (filterEstado !== 'TODOS') params.set('estado', filterEstado)
      if (sortBy) { params.set('sortBy', sortBy); params.set('sortDir', sortDir) }

      const docsRes = await apiFetch(`/documentos?${params.toString()}`)
      if (!docsRes.ok) throw docsRes
      const docsPayload = await docsRes.json()
      const dData = docsPayload.data ?? []
      setDocumentos(dData)
      setTotalFiltrado(docsPayload.meta?.total ?? dData.length)
    } catch {
      setLoadError('No se pudo cargar el padrón oficial de documentos.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    setLoadError('')
    loadData()
  }, [currentPage, itemsPerPage, debouncedSearch, filterTipo, filterEstado, sortBy, sortDir])

  const [stats, setStats] = useState({ total: 0, tucDocs: 0, soatDocs: 0, vigentes: 0, inactivosOVencidos: 0 })

  const loadStats = () => {
    apiFetch('/documentos/estadisticas')
      .then((res) => res.ok ? res.json() : Promise.reject(res))
      .then((payload) => setStats(payload.data ?? {}))
      .catch(() => {})
  }

  useEffect(() => {
    loadStats()
  }, [])

  useEffect(() => {
    apiFetch('/vehiculos?porPagina=100')
      .then((res) => (res.ok ? res.json() : null))
      .then((vehPayload) => {
        if (vehPayload?.data) {
          setVehiculos(vehPayload.data)
          setCachedData('/vehiculos', vehPayload.data)
        }
      })
      .catch(() => {})
  }, [])

  // Close plate dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (placaDropdownRef.current && !placaDropdownRef.current.contains(event.target)) {
        setIsPlacaDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // KPIs derivados del total real (COUNT en backend), no de la página cargada
  const totalDocs = stats.total ?? 0
  const tucDocs = stats.tucDocs ?? 0
  const soatDocs = stats.soatDocs ?? 0
  const vigentes = stats.vigentes ?? 0
  const inactivosOVencidos = stats.inactivosOVencidos ?? 0

  const filteredDocs = documentos

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterTipo, filterEstado])

  const paginatedDocs = documentos

  const filteredPlacas = vehiculos.filter((v) =>
    (v.placa || '').toLowerCase().includes((formData.vehiculoPlaca || '').toLowerCase())
  )

  const handleVehicleChange = (placa) => {
    const veh = vehiculos.find((v) => v.placa === placa)
    setFormData((prev) => ({
      ...prev,
      vehiculoPlaca: placa,
      propietario: veh?.propietario || '',
      propietarioDni: veh?.propietarioDni || '',
      asociacion: veh?.asociacion || '',
    }))
  }

  const handleOpenCreateModal = () => {
    setFormData({
      vehiculoPlaca: '',
      tipoDocumento: 'TARJETA_OPERATIVIDAD',
      codigo: '',
      fechaExpedicion: new Date().toISOString().slice(0, 10),
      fechaExpiracion: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      estado: 'VIGENTE',
      propietario: '',
      propietarioDni: '',
      asociacion: '',
    })
    setIsEditing(false)
    setIsPlacaDropdownOpen(false)
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (doc) => {
    setSelectedDoc(doc)
    setFormData({
      vehiculoPlaca: doc.vehiculoPlaca || '',
      tipoDocumento: doc.tipoDocumento || 'TARJETA_OPERATIVIDAD',
      codigo: doc.codigo || '',
      fechaExpedicion: doc.fechaExpedicion || '',
      fechaExpiracion: doc.fechaExpiracion || '',
      estado: doc.estado || 'VIGENTE',
      propietario: doc.propietario || '',
      propietarioDni: doc.propietarioDni || '',
      asociacion: doc.asociacion || '',
    })
    setIsEditing(true)
    setIsPlacaDropdownOpen(false)
    setIsModalOpen(true)
  }

  const handleOpenDetail = (doc) => {
    setSelectedDoc(doc)
    setIsDetailModalOpen(true)
  }

  const handlePrint = (doc) => {
    setSelectedDoc(doc)
    setIsPreviewModalOpen(true)
  }

  const handleDelete = async (id) => {
    const result = await showConfirm(
      '¿Anular documento?',
      '¿Está seguro de anular este documento del padrón oficial?',
      'Sí, anular',
      'Cancelar',
      { confirmColor: 'oklch(58.6% 0.253 17.585)', cancelColor: 'oklch(71.2% 0.194 13.428)' }
    )
    if (result.isConfirmed) {
      try {
        const response = await apiFetch(`/documentos/${id}`, { method: 'DELETE' })
        if (!response.ok) throw response
        const nextDocs = documentos.filter((d) => d.id !== id)
        setDocumentos(nextDocs)
        setCachedData('/documentos', nextDocs)
        loadStats()
        showToast('Documento anulado con éxito')
      } catch {
        showError('Error', 'No se pudo anular el documento.')
      }
    }
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()

    if (!formData.codigo.trim() || !formData.vehiculoPlaca.trim() || !formData.tipoDocumento) {
      alert('Por favor completa los campos requeridos (Placa, Tipo y Número de Documento).')
      return
    }

    if (formData.fechaExpedicion && formData.fechaExpiracion && new Date(formData.fechaExpiracion) < new Date(formData.fechaExpedicion)) {
      alert('La fecha de vencimiento no puede ser anterior a la fecha de expedición.')
      return
    }

    const dataToSubmit = {
      ...formData,
      vehiculoPlaca: formData.vehiculoPlaca.trim().toUpperCase(),
      codigo: formData.codigo.trim().toUpperCase(),
      estado: formData.estado || 'VIGENTE',
    }

    try {
      if (isEditing) {
        const res = await apiFetch(`/documentos/${selectedDoc.id}`, {
          method: 'PUT',
          body: dataToSubmit,
        })
        if (!res.ok) throw res
        const resData = await res.json()
        const updatedDoc = resData.data || { ...selectedDoc, ...dataToSubmit }
        const nextDocs = documentos.map((d) => (d.id === selectedDoc.id ? updatedDoc : d))
        setDocumentos(nextDocs)
        setCachedData('/documentos', nextDocs)
        loadStats()
        showToast('Documento actualizado')
      } else {
        const res = await apiFetch('/documentos', {
          method: 'POST',
          body: dataToSubmit,
        })
        if (!res.ok) throw res
        const resData = await res.json()
        const newDoc = resData.data || {
          ...dataToSubmit,
          id: Date.now(),
        }
        const nextDocs = [newDoc, ...documentos]
        setDocumentos(nextDocs)
        setCachedData('/documentos', nextDocs)
        setCurrentPage(1)
        loadStats()
        showToast('Documento emitido con éxito')
      }
      setIsModalOpen(false)
    } catch (err) {
      let message = 'Error de comunicación con el servidor al registrar el documento.'
      if (err?.json) {
        try {
          const errData = await err.json()
          message = errData.messages?.error || errData.message || errData.error || message
        } catch (_) {
          message = err.statusText || message
        }
      }
      alert(message)
    }
  }

  const fetchTodoElFiltro = async () => {
    const params = new URLSearchParams()
    if (searchTerm) params.set('buscar', searchTerm)
    if (filterTipo !== 'TODOS') params.set('tipoDocumento', filterTipo)
    if (filterEstado !== 'TODOS') params.set('estado', filterEstado)
    const res = await apiFetch(`/documentos?${params.toString()}`)
    if (!res.ok) return filteredDocs
    const payload = await res.json()
    return payload.data ?? []
  }

  const handleExportExcel = async () => {
    setIsExportingExcel(true)
    await new Promise(r => setTimeout(r, 50))
    try {
      const data = await fetchTodoElFiltro()
          exportToExcel({
            filename: `Documentos_Transito_${new Date().toISOString().slice(0, 10)}.xls`,
            sheetName: 'Documentos',
            title: 'PADRÓN OFICIAL DE DOCUMENTOS DE TRANSPORTE Y VIALIDAD',
            subtitle: 'TUC, Carnets de Seguridad Vial, CERTICAV y SOAT - Control Municipal',
            metadata: [
              { label: 'Tipo Documento', value: filterTipo },
              { label: 'Estado', value: filterEstado }
            ],
            columns: [
              { header: 'PLACA', key: 'vehiculoPlaca', isText: true, width: 110, align: 'center' },
              { header: 'TIPO DOCUMENTO', key: 'tipoDocumento', width: 180 },
              { header: 'N° / CÓDIGO', key: 'codigo', isText: true, width: 140, align: 'center' },
              { header: 'EXPEDICIÓN', key: 'fechaExpedicion', width: 110, align: 'center' },
              { header: 'VENCIMIENTO', key: 'fechaExpiracion', width: 110, align: 'center' },
              { header: 'PROPIETARIO / TITULAR', key: 'propietario', width: 190 },
              { header: 'DNI / RUC', key: 'propietarioDni', isText: true, width: 110, align: 'center' },
              { header: 'ASOCIACIÓN', render: (_, r) => r.asociacion || 'PARTICULAR / SIN ASOC.', width: 200 },
              { header: 'ESTADO', key: 'estado', width: 110, align: 'center' }
            ],
            data
          })
    } finally {
      setIsExportingExcel(false)
    }
  }

  const handleExportPdf = async () => {
    setIsExportingPdf(true)
    try {
      const listToExport = await fetchTodoElFiltro()
          if (listToExport.length === 0) {
            alert('No hay registros para exportar.')
            return
          }
      
          const printWin = window.open('', '_blank', 'width=1100,height=750')
          if (!printWin) {
            alert('El navegador bloqueó la ventana emergente. Por favor, habilite los popups.')
            return
          }
      
          const escapeXml = (unsafe) => {
            if (unsafe === null || unsafe === undefined) return ''
            return String(unsafe)
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
          }
      
          const rowsHtml = listToExport
            .map((d, index) => {
              const isVigente = d.estado === 'VIGENTE'
              const estadoBadge = isVigente
                ? `<span style="background:#dcfce7; color:#15803d; padding:2px 7px; border-radius:4px; font-weight:700; font-size:9.5px;">VIGENTE</span>`
                : d.estado === 'EN_TRAMITE'
                  ? `<span style="background:#dbeafe; color:#1d4ed8; padding:2px 7px; border-radius:4px; font-weight:700; font-size:9.5px;">EN TRÁMITE</span>`
                  : `<span style="background:#fee2e2; color:#b91c1c; padding:2px 7px; border-radius:4px; font-weight:700; font-size:9.5px;">VENCIDO</span>`
      
              return `
                <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                  <td style="text-align: center; color: #64748b; font-size: 10px;">${index + 1}</td>
                  <td style="font-family: monospace; font-weight: 700; font-size: 11px; text-align: center;">${escapeXml(d.codigo || '')}</td>
                  <td style="font-size: 10px; font-weight: 600;">${escapeXml(d.tipoDocumento || '')}</td>
                  <td style="font-family: monospace; font-weight: 700; font-size: 11px; text-align: center; background: #fef3c7;">${escapeXml(d.vehiculoPlaca || '')}</td>
                  <td style="font-size: 10.5px; font-weight: 700; color: #0f172a;">${escapeXml(d.propietario || '—')}</td>
                  <td style="font-family: monospace; font-size: 10.5px; text-align: center;">${escapeXml(d.propietarioDni || '—')}</td>
                  <td style="font-size: 10px; color: #475569;">${escapeXml(d.asociacion || 'Independiente')}</td>
                  <td style="text-align: center; font-family: monospace; font-size: 10px;">${escapeXml(formatFecha(d.fechaExpedicion))}</td>
                  <td style="text-align: center; font-family: monospace; font-size: 10px; font-weight: bold;">${escapeXml(formatFecha(d.fechaExpiracion))}</td>
                  <td style="text-align: center;">${estadoBadge}</td>
                </tr>
              `
            })
            .join('')
      
          const pdfHtml = `
            <!doctype html>
            <html lang="es">
              <head>
                <meta charset="utf-8"/>
                <title>Padron_Documentos_MJLO_${new Date().toISOString().slice(0, 10)}</title>
                <style>
                  @page { size: A4 landscape; margin: 10mm 12mm 10mm 12mm; }
                  * { box-sizing: border-box; }
                  body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    color: #0f172a; margin: 0; padding: 0; font-size: 10.5px;
                  }
                  .header {
                    border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 10px;
                    display: flex; justify-content: space-between; align-items: flex-start;
                  }
                  .title {
                    font-size: 15px; font-weight: 900; color: #0f172a; letter-spacing: -0.3px; text-transform: uppercase;
                  }
                  .subtitle {
                    font-size: 10.5px; font-weight: 600; color: #475569; margin-top: 2px;
                  }
                  .meta { font-size: 9.5px; color: #64748b; text-align: right; }
                  .summary-bar {
                    display: flex; gap: 16px; margin-bottom: 10px; background: #f1f5f9; padding: 6px 12px;
                    border-radius: 6px; font-size: 10.5px;
                  }
                  .summary-item strong { color: #0f172a; }
                  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
                  thead { display: table-header-group; }
                  tr { page-break-inside: avoid; break-inside: avoid; }
                  th {
                    background-color: #0f172a; color: #ffffff; text-transform: uppercase; font-size: 9px;
                    font-weight: 800; letter-spacing: 0.4px; padding: 6px 7px; border: 1px solid #0f172a; text-align: left;
                  }
                  td { border: 1px solid #e2e8f0; padding: 5px 7px; vertical-align: middle; }
                  .footer {
                    margin-top: 12px; font-size: 8.5px; color: #94a3b8; display: flex;
                    justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 5px;
                  }
                </style>
              </head>
              <body>
                <div class="header">
                  <div>
                    <div class="title">Municipalidad Distrital José Leonardo Ortiz</div>
                    <div class="subtitle">Subgerencia de Tránsito y Transporte · Padrón Oficial de Documentos Vehiculares (TUC / SOAT / CertiCAV)</div>
                  </div>
                  <div class="meta">
                    <div><strong>Fecha de emisión:</strong> ${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE')}</div>
                    <div><strong>Sistema:</strong> MJLO Tránsito Digital v2026</div>
                  </div>
                </div>
                <div class="summary-bar">
                  <div>Total en padrón: <strong>${totalDocs}</strong></div>
                  <div>· Exportando: <strong>${listToExport.length}</strong> documentos</div>
                  <div>· Vigentes: <strong>${vigentes}</strong></div>
                  <div>· Vencidos / Trámite: <strong>${inactivosOVencidos}</strong></div>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th style="width: 28px; text-align: center;">N°</th>
                      <th style="width: 105px; text-align: center;">Código</th>
                      <th style="width: 110px;">Tipo Doc.</th>
                      <th style="width: 80px; text-align: center;">Placa</th>
                      <th style="width: 170px;">Titular / Propietario</th>
                      <th style="width: 75px; text-align: center;">DNI</th>
                      <th>Asociación</th>
                      <th style="width: 75px; text-align: center;">Expedición</th>
                      <th style="width: 75px; text-align: center;">Vencimiento</th>
                      <th style="width: 75px; text-align: center;">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rowsHtml}
                  </tbody>
                </table>
                <div class="footer">
                  <span>Documento oficial generado para fiscalización y control del transporte en José Leonardo Ortiz.</span>
                  <span>Página 1 de 1</span>
                </div>
                <script>
                  window.onload = function() {
                    window.focus();
                    setTimeout(function() { window.print(); }, 250);
                  };
                </script>
              </body>
            </html>
          `
      
          printWin.document.open()
          printWin.document.write(pdfHtml)
          printWin.document.close()
    } finally {
      setIsExportingPdf(false)
    }
  }

  return (
    <div className="space-y-4">
      {loadError && <PageLoadError message={loadError} />}

      {/* Cabecera Principal - Estilo Exacto Personas */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center text-slate-900 dark:text-white">
            <Icon name="document" className="size-7 stroke-[2.4]" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Emisión de Documentos
              </h1>
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Control oficial y emisión de Tarjetas de Operatividad (TUC), SOAT, CertiCAV e inspecciones vehiculares.
            </p>
          </div>
        </div>
      </div>

      {/* Tarjetas KPI con Bordes de Colores: 5 tarjetas compactas (Estilo exacto Personas) */}
      <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {/* 1. Total documentos */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-indigo-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[var(--bg-surface)] col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Total registros
            </span>
            <span className="grid size-6 place-items-center rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Icon name="document" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {formatNumeroTarjeta(totalDocs)}
            </p>
          </div>
        </div>

        {/* 2. Tarjetas Operatividad (TUC) */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-amber-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Tarjetas TUC
            </span>
            <span className="grid size-6 place-items-center rounded-md bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <Icon name="permit" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {formatNumeroTarjeta(tucDocs)}
            </p>
          </div>
        </div>

        {/* 3. SOAT y CertiCAV */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-cyan-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
              SOAT / CertiCAV
            </span>
            <span className="grid size-6 place-items-center rounded-md bg-cyan-50 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400">
              <Icon name="vehicle" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {formatNumeroTarjeta(soatDocs)}
            </p>
          </div>
        </div>

        {/* 4. Vigentes */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-emerald-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Vigentes
            </span>
            <span className="grid size-6 place-items-center rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 font-bold text-xs">
              ✓
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {formatNumeroTarjeta(vigentes)}
            </p>
          </div>
        </div>

        {/* 5. Vencidos / Otros */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-rose-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Vencidos / Trámite
            </span>
            <span className="grid size-6 place-items-center rounded-md bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 font-bold text-xs">
              ✕
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {formatNumeroTarjeta(inactivosOVencidos)}
            </p>
          </div>
        </div>
      </div>

      {/* Contenedor de la Tabla */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-[var(--border)] dark:bg-[var(--bg-surface)] overflow-hidden">
        <div className="flex flex-col gap-2.5 border-b border-slate-100 px-4 py-2.5 dark:border-[var(--border)] sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Icon
              name={isLoading ? "refresh" : "search"}
              className={`absolute left-3 top-1/2 size-3.5 -translate-y-1/2 transition-colors ${isLoading ? 'animate-spin text-indigo-500' : 'text-slate-400'}`}
            />
            <input
              type="text"
              placeholder="Buscar por código, placa, titular, DNI o asociación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-8 text-xs sm:text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white dark:focus:bg-[var(--bg-subtle)] focus:ring-2 focus:ring-indigo-500/20 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-white dark:focus:border-indigo-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('')
                  setCurrentPage(1)
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <RoundedSelect
              value={filterTipo}
              onChange={(val) => {
                setFilterTipo(val)
                setCurrentPage(1)
              }}
              options={FILTER_TIPO_OPTIONS}
            />

            <RoundedSelect
              value={filterEstado}
              onChange={(val) => {
                setFilterEstado(val)
                setCurrentPage(1)
              }}
              options={FILTER_ESTADO_OPTIONS}
            />

            {(filterTipo !== 'TODOS' || filterEstado !== 'TODOS' || searchTerm !== '') && (
              <button
                type="button"
                onClick={() => {
                  setFilterTipo('TODOS')
                  setFilterEstado('TODOS')
                  setSearchTerm('')
                  setCurrentPage(1)
                }}
                title="Limpiar filtros"
                className="grid size-[34px] place-items-center rounded-xl border border-rose-200/80 bg-rose-50/70 text-rose-600 hover:bg-rose-100 hover:text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60 transition-all active:scale-95 cursor-pointer shadow-2xs"
              >
                <Icon name="filterX" className="size-4" />
              </button>
            )}

            <button
              type="button"
              onClick={handleExportExcel}
              title="Descargar padrón en Excel (.xls)"
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60 transition-all active:scale-95 cursor-pointer shadow-2xs whitespace-nowrap"
             disabled={isExportingExcel}>
              <Icon name={isExportingExcel ? "refresh" : "fileSpreadsheet"} className={`size-3.5 text-emerald-600 dark:text-emerald-400 ${isExportingExcel ? 'animate-spin' : ''}`} />
              <span>{isExportingExcel ? 'Generando...' : 'Excel'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              title="Descargar o imprimir padrón en PDF"
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200/80 bg-rose-50/70 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60 transition-all active:scale-95 cursor-pointer shadow-2xs whitespace-nowrap"
             disabled={isExportingPdf}>
              <Icon name={isExportingPdf ? "refresh" : "filePdf"} className={`size-3.5 text-rose-600 dark:text-rose-400 ${isExportingPdf ? 'animate-spin' : ''}`} />
              <span>{isExportingPdf ? 'Generando...' : 'PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold text-white transition-all active:scale-95 cursor-pointer whitespace-nowrap hover:opacity-90"
              style={{ backgroundColor: 'oklch(62.3% 0.214 259.815)' }}
            >
              <span className="text-base leading-none font-black">+</span>
              <span>Emitir documento</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-left text-xs">
            <colgroup>
              <col className="w-[22%]" />
              <col className="w-[13%]" />
              <col className="w-[24%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[110px]" />
              <col className="w-[110px]" />
            </colgroup>
            <thead className="bg-slate-50/75 dark:bg-[var(--bg-subtle)] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 "><SortableHeader column="tipoDocumento" label="Documento / Código" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="px-4 py-3 "><SortableHeader column="vehiculoPlaca" label="Placa Vehicular" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="px-4 py-3 ">Titular / Propietario</th>
                <th className="px-4 py-3 ">Expedición</th>
                <th className="px-4 py-3 "><SortableHeader column="fechaExpiracion" label="Vencimiento" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="px-4 py-3 text-center"><SortableHeader column="estado" align="center" label="Estado" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="sticky right-0 z-20 px-4 py-3 text-center bg-slate-50/75 dark:bg-[var(--bg-subtle)]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-slate-100 dark:divide-[var(--border)] transition-opacity ${isLoading && documentos.length > 0 ? 'opacity-50' : ''}`}>
              {isLoading && documentos.length === 0 ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-4 py-3">
                      <div className="h-4 w-28 rounded" style={{ backgroundColor: 'var(--bg-subtle)' }} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-5 w-20 rounded" style={{ backgroundColor: 'var(--bg-subtle)' }} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-36 rounded" style={{ backgroundColor: 'var(--bg-subtle)' }} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-20 rounded" style={{ backgroundColor: 'var(--bg-subtle)' }} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-20 rounded" style={{ backgroundColor: 'var(--bg-subtle)' }} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-5 w-16 rounded-full" style={{ backgroundColor: 'var(--bg-subtle)' }} />
                    </td>
                    <td
                      className="sticky right-0 z-10 px-4 py-3 text-right"
                      style={{ backgroundColor: 'var(--bg-surface)' }}
                    >
                      <div className="h-7 w-20 ml-auto rounded" style={{ backgroundColor: 'var(--bg-subtle)' }} />
                    </td>
                  </tr>
                ))
              ) : filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center">
                    <Icon name="document" className="size-10 mb-2 mx-auto text-slate-300 dark:text-slate-600" />
                    <p className="font-bold text-slate-600 dark:text-slate-300">No se encontraron documentos</p>
                  </td>
                </tr>
              ) : (
                paginatedDocs.map((d) => (
                  <tr
                    key={d.id}
                    className="group transition-colors hover:bg-[var(--brand-soft)] dark:hover:bg-[var(--bg-subtle)]"
                  >
                    <td className="px-4 py-3 ">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                            {d.codigo}
                          </span>
                        </div>
                        <div>{getDocTypeBadge(d.tipoDocumento)}</div>
                      </div>
                    </td>

                    <td className="px-4 py-3 ">
                      <div className="space-y-0.5">
                        <PlacaBadge placa={d.vehiculoPlaca} />
                        {(d.vehiculoMarca || d.vehiculoModelo) && (
                          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            {d.vehiculoMarca} {d.vehiculoModelo}
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 max-w-[200px]">
                      <div>
                        <p
                          className="font-bold text-xs text-slate-900 dark:text-white truncate"
                          title={d.propietario}
                        >
                          {d.propietario || 'Sin Propietario Asignado'}
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          {d.propietarioDni && (
                            <span className="font-mono font-semibold">DNI: {d.propietarioDni}</span>
                          )}
                          {d.asociacion && (
                            <span className="truncate" title={d.asociacion}>
                              {d.propietarioDni ? '· ' : ''}{d.asociacion}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 ">
                      <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {formatFecha(d.fechaExpedicion)}
                      </span>
                    </td>

                    <td className="px-4 py-3 ">
                      <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                        {d.fechaExpiracion ? formatFecha(d.fechaExpiracion) : 'Sin vencimiento'}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={d.estado} />
                    </td>

                    <td
                      className="sticky right-0 z-10 px-4 py-3 text-right group-hover:bg-[var(--brand-soft)] dark:group-hover:bg-slate-800/40 transition-colors shadow-[-4px_0_8px_rgba(0,0,0,0.03)]"
                      style={{ backgroundColor: 'var(--bg-surface)' }}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        {/* OJO: Celeste (Ver Ficha) */}
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(d)}
                          title="Ver ficha de documento"
                          className="size-8 rounded-lg grid place-items-center transition-all cursor-pointer shadow-xs active:scale-95"
                          style={{
                            backgroundColor: 'var(--action-eye-bg)',
                            borderColor: 'var(--action-eye-border)',
                            color: 'var(--action-eye-text)',
                            borderWidth: '1.5px',
                            borderStyle: 'solid',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--action-eye-hover)'
                            e.currentTarget.style.borderColor = 'var(--action-eye-hover)'
                            e.currentTarget.style.color = '#ffffff'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--action-eye-bg)'
                            e.currentTarget.style.borderColor = 'var(--action-eye-border)'
                            e.currentTarget.style.color = 'var(--action-eye-text)'
                          }}
                        >
                          <Icon name="eye" className="size-4" />
                        </button>

                        {/* IMPRIMIR: Morado / Púrpura */}
                        <button
                          type="button"
                          onClick={() => handlePrint(d)}
                          title="Imprimir formato oficial / TUC"
                          className="size-8 rounded-lg grid place-items-center transition-all cursor-pointer shadow-xs active:scale-95"
                          style={{
                            backgroundColor: '#f3e8ff',
                            borderColor: '#c084fc',
                            color: '#7e22ce',
                            borderWidth: '1.5px',
                            borderStyle: 'solid',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#7e22ce'
                            e.currentTarget.style.borderColor = '#7e22ce'
                            e.currentTarget.style.color = '#ffffff'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#f3e8ff'
                            e.currentTarget.style.borderColor = '#c084fc'
                            e.currentTarget.style.color = '#7e22ce'
                          }}
                        >
                          <Icon name="print" className="size-4" />
                        </button>

                        {/* EDITAR: Amarillo */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(d)}
                          title="Editar documento"
                          className="size-8 rounded-lg grid place-items-center transition-all cursor-pointer shadow-xs active:scale-95"
                          style={{
                            backgroundColor: 'var(--action-edit-bg)',
                            borderColor: 'var(--action-edit-border)',
                            color: 'var(--action-edit-text)',
                            borderWidth: '1.5px',
                            borderStyle: 'solid',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--action-edit-hover)'
                            e.currentTarget.style.borderColor = 'var(--action-edit-hover)'
                            e.currentTarget.style.color = '#ffffff'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--action-edit-bg)'
                            e.currentTarget.style.borderColor = 'var(--action-edit-border)'
                            e.currentTarget.style.color = 'var(--action-edit-text)'
                          }}
                        >
                          <Icon name="pencil" className="size-4" />
                        </button>

                        {/* ELIMINAR: Rojo */}
                        <button
                          type="button"
                          onClick={() => handleDelete(d.id)}
                          title="Anular documento"
                          className="size-8 rounded-lg grid place-items-center transition-all cursor-pointer shadow-xs active:scale-95"
                          style={{
                            backgroundColor: 'var(--action-del-bg)',
                            borderColor: 'var(--action-del-border)',
                            color: 'var(--action-del-text)',
                            borderWidth: '1.5px',
                            borderStyle: 'solid',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--action-del-hover)'
                            e.currentTarget.style.borderColor = 'var(--action-del-hover)'
                            e.currentTarget.style.color = '#ffffff'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--action-del-bg)'
                            e.currentTarget.style.borderColor = 'var(--action-del-border)'
                            e.currentTarget.style.color = 'var(--action-del-text)'
                          }}
                        >
                          <Icon name="trash" className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalItems={totalFiltrado}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(size) => {
            setItemsPerPage(size)
            setCurrentPage(1)
          }}
          disabled={isLoading}
        />
      </div>

      {/* Modal Emitir / Editar Documento */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-enter" onMouseDown={(e) => { if (e.target === e.currentTarget) e.currentTarget.dataset.downOnOverlay = "1" }} onMouseUp={(e) => { if (e.target === e.currentTarget && e.currentTarget.dataset.downOnOverlay === "1") setIsModalOpen(false); e.currentTarget.dataset.downOnOverlay = "" }}>
          <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl dark:bg-[var(--bg-surface)] border border-slate-200/80 dark:border-[var(--border)]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-3.5 rounded-t-3xl dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-[var(--bg-subtle)] dark:text-slate-300">
                  <Icon name="document" className="size-4" />
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isEditing ? 'Editar documento vehicular' : 'Emitir nuevo documento'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                title="Cerrar"
                className="grid size-9 shrink-0 place-items-center rounded-xl border border-rose-200/80 bg-rose-50/70 text-rose-500 hover:bg-rose-100 hover:text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/50 transition-all active:scale-95 cursor-pointer shadow-xs"
              >
                <Icon name="close" className="size-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} autoComplete="off" className="flex flex-col">
              <div className="p-4 sm:p-5 space-y-3.5 max-h-[75vh] overflow-y-auto">
                {/* 1. Sección: Vehículo y Titular */}
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 space-y-2.5 dark:border-[var(--border)] dark:bg-slate-900/50 shadow-xs">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                    <span className="size-2 rounded-full bg-slate-900 dark:bg-white" />
                    Vehículo y Titular
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    {/* Input de Placa con Autocompletado desde Base de Datos */}
                    <div className="sm:col-span-5 relative" ref={placaDropdownRef}>
                      <FloatingInput
                        id="doc_placa"
                        label="Placa vehicular"
                        required
                        value={formData.vehiculoPlaca}
                        inputClassName="font-mono font-bold tracking-wider uppercase"
                        onFocus={() => setIsPlacaDropdownOpen(true)}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase().trim()
                          handleVehicleChange(val)
                          setIsPlacaDropdownOpen(true)
                        }}
                      />

                      {isPlacaDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg shadow-slate-900/10 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] animate-in fade-in zoom-in-95 duration-100">
                          {filteredPlacas.length === 0 ? (
                            <div className="px-3 py-2 text-center text-xs text-slate-400">
                              No hay vehículos con esa placa
                            </div>
                          ) : (
                            filteredPlacas.map((v) => (
                              <button
                                key={v.id}
                                type="button"
                                onClick={() => {
                                  handleVehicleChange(v.placa)
                                  setIsPlacaDropdownOpen(false)
                                }}
                                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition cursor-pointer ${
                                  formData.vehiculoPlaca === v.placa
                                    ? 'bg-blue-50 text-blue-700 font-bold dark:bg-blue-950/60 dark:text-blue-300'
                                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/60'
                                }`}
                              >
                                <span className="font-mono font-bold">{v.placa}</span>
                                <span className="text-[11px] text-slate-400 truncate max-w-[150px]">
                                  {v.propietario || v.marca || 'Registrado'}
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    {/* Selector de Tipo de Documento */}
                    <div className="sm:col-span-7">
                      {TIPO_DOC_OPTIONS.some((o) => o.value === formData.tipoDocumento) ? (
                        <FloatingSelect
                          id="doc_tipo"
                          label="Tipo de documento"
                          value={formData.tipoDocumento}
                          onChange={(e) => {
                            const nuevoTipo = e.target.value
                            const sinVigencia = TIPOS_SIN_VIGENCIA.includes(nuevoTipo)
                            setFormData((prev) => ({
                              ...prev,
                              tipoDocumento: nuevoTipo,
                              fechaExpiracion: sinVigencia ? '' : prev.fechaExpiracion,
                              estado: sinVigencia && !['VIGENTE', 'ANULADO'].includes(prev.estado) ? 'VIGENTE' : prev.estado,
                            }))
                          }}
                          options={TIPO_DOC_OPTIONS}
                        />
                      ) : (
                        // CITV y CertiCAV/REVISION_TECNICA no se emiten aquí, pero los ya registrados se pueden editar.
                        <FloatingInput
                          id="doc_tipo"
                          label="Tipo de documento"
                          value={TIPO_DOC_LABEL_EXTERNO[formData.tipoDocumento] || formData.tipoDocumento}
                          readOnly
                        />
                      )}
                    </div>
                  </div>

                  {/* Resumen del Propietario / Vehículo cargado desde la BD */}
                  {formData.vehiculoPlaca && (
                    <div className="rounded-xl border border-slate-200/80 bg-white p-2.5 dark:border-[var(--border-strong)] dark:bg-slate-800/80 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <span className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider block">
                          Propietario en Padrón
                        </span>
                        <span className="font-bold text-slate-800 dark:text-white truncate block">
                          {formData.propietario || 'Sin Propietario Asignado en BD'}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        {formData.propietarioDni && (
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200 block">
                            DNI: {formData.propietarioDni}
                          </span>
                        )}
                        {formData.asociacion && (
                          <span className="text-[10px] text-slate-400 truncate block mt-0.5">
                            {formData.asociacion}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Sección: Datos del Documento */}
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 space-y-2.5 dark:border-[var(--border)] dark:bg-slate-900/50 shadow-xs">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                    <span className="size-2 rounded-full bg-slate-900 dark:bg-white" />
                    Datos del Documento
                  </h4>

                  <FloatingInput
                    id="doc_codigo"
                    label={getCodigoLabel(formData.tipoDocumento)}
                    required
                    value={formData.codigo}
                    inputClassName="font-mono font-bold uppercase"
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                  />
                </div>

                {/* 3. Sección: Vigencia y Estado */}
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 space-y-2.5 dark:border-[var(--border)] dark:bg-slate-900/50 shadow-xs">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                    <span className="size-2 rounded-full bg-slate-900 dark:bg-white" />
                    Vigencia y Estado
                  </h4>

                  <div className={`grid grid-cols-1 gap-2.5 ${TIPOS_SIN_VIGENCIA.includes(formData.tipoDocumento) ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
                    <FloatingInput
                      id="doc_expedicion"
                      label="Fecha de expedición"
                      type="date"
                      required
                      value={formData.fechaExpedicion}
                      onChange={(e) => setFormData({ ...formData, fechaExpedicion: e.target.value })}
                    />

                    {!TIPOS_SIN_VIGENCIA.includes(formData.tipoDocumento) && (
                      <FloatingInput
                        id="doc_expiracion"
                        label="Fecha de vencimiento"
                        type="date"
                        required
                        value={formData.fechaExpiracion}
                        onChange={(e) => setFormData({ ...formData, fechaExpiracion: e.target.value })}
                      />
                    )}

                    <FloatingSelect
                      id="doc_estado"
                      label="Estado del documento"
                      value={formData.estado}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                      options={TIPOS_SIN_VIGENCIA.includes(formData.tipoDocumento) ? ESTADO_OPTIONS_SIN_VIGENCIA : ESTADO_OPTIONS}
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/80 px-6 py-2.5 dark:border-[var(--border)] dark:bg-slate-900/80">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-4 py-1.5 text-xs font-bold text-white transition hover:opacity-90 active:scale-95 cursor-pointer"
                  style={{ backgroundColor: 'oklch(71.2% 0.194 13.428)' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl px-5 py-1.5 text-xs font-bold text-white transition hover:opacity-90 active:scale-95 cursor-pointer"
                  style={{ backgroundColor: 'oklch(62.3% 0.214 259.815)' }}
                >
                  {isEditing ? 'Actualizar documento' : 'Emitir documento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ficha de Detalle (Diccionario Visual - Estilo Exacto Personas) */}
      {isDetailModalOpen && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-enter">
          <div className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl dark:bg-[var(--bg-surface)] border border-slate-200/80 dark:border-[var(--border)]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-3.5 rounded-t-3xl dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-[var(--bg-subtle)] dark:text-slate-300">
                  <Icon name="document" className="size-4" />
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Ficha del Documento Vehicular
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                title="Cerrar ficha"
                className="grid size-9 shrink-0 place-items-center rounded-xl border border-rose-200/80 bg-rose-50/70 text-rose-500 hover:bg-rose-100 hover:text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/50 transition-all active:scale-95 cursor-pointer shadow-xs"
              >
                <Icon name="close" className="size-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 pb-6 space-y-3.5 max-h-[80vh] overflow-y-auto">
              {/* Profile Hero Card */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)] shadow-xs">
                <div className="flex items-center gap-3.5">
                  <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-400 dark:border-indigo-800">
                    <Icon name="document" className="size-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-lg font-black text-slate-900 dark:text-white">
                        {selectedDoc.codigo}
                      </span>
                      <PlacaBadge placa={selectedDoc.vehiculoPlaca} />
                    </div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                      {selectedDoc.propietario || 'Sin Propietario Asignado'} · {selectedDoc.asociacion || 'Independiente'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge status={selectedDoc.estado} />
                  <button
                    type="button"
                    onClick={() => {
                      setIsDetailModalOpen(false)
                      handlePrint(selectedDoc)
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer"
                  >
                    <Icon name="print" className="size-3.5" />
                    <span>Imprimir</span>
                  </button>
                </div>
              </div>

              {/* Secciones de Datos en Rejilla: Solo atributos reales de la Base de Datos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* 1. Datos del Vehículo y Titular */}
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 dark:border-[var(--border)] dark:bg-slate-900/50 space-y-1.5 shadow-xs">
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    Datos del Vehículo y Titular
                  </h5>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">Placa</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {selectedDoc.vehiculoPlaca || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">Marca / Modelo</span>
                      <span className="font-bold text-slate-800 dark:text-white text-right">
                        {[selectedDoc.vehiculoMarca, selectedDoc.vehiculoModelo].filter(Boolean).join(' ') || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">Año / Color</span>
                      <span className="font-bold text-slate-800 dark:text-white text-right">
                        {[selectedDoc.vehiculoAnio, selectedDoc.vehiculoColor].filter(Boolean).join(' · ') || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">N° Serie / Chasis</span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-white text-right">
                        {selectedDoc.vehiculoSerie || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">N° Motor</span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-white text-right">
                        {selectedDoc.vehiculoMotor || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">Carrocería</span>
                      <span className="font-bold text-slate-800 dark:text-white text-right">
                        {selectedDoc.vehiculoCarroceria || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">Partida Registral</span>
                      <span className="font-mono text-slate-800 dark:text-white text-right">
                        {selectedDoc.vehiculoPartidaRegistral || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">Titular / Propietario</span>
                      <span className="font-bold text-slate-800 dark:text-white text-right">
                        {selectedDoc.propietario || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">DNI del Titular</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-white">
                        {selectedDoc.propietarioDni || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">N° Licencia</span>
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {selectedDoc.numeroLicencia || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">Asociación</span>
                      <span className="font-bold text-slate-800 dark:text-white text-right">
                        {selectedDoc.asociacion || 'Independiente'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Datos de Emisión y Vigencia */}
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 dark:border-[var(--border)] dark:bg-slate-900/50 space-y-1.5 shadow-xs">
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    Datos de Emisión y Vigencia
                  </h5>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">Tipo de documento</span>
                      <span>{getDocTypeBadge(selectedDoc.tipoDocumento)}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">Código oficial</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {selectedDoc.codigo || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">Fecha expedición</span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-white">
                        {formatFecha(selectedDoc.fechaExpedicion)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">Fecha vencimiento</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {selectedDoc.fechaExpiracion ? formatFecha(selectedDoc.fechaExpiracion) : 'Sin vencimiento'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">Estado de vigencia</span>
                      <StatusBadge status={selectedDoc.estado} />
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">Resolución / Reg. Municipal</span>
                      <span className="font-mono text-slate-800 dark:text-white text-right">
                        {selectedDoc.resMunicipal || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">Dirección del Titular</span>
                      <span className="font-medium text-slate-800 dark:text-white text-right truncate max-w-[200px]" title={selectedDoc.direccion}>
                        {selectedDoc.direccion || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">Código QR</span>
                      <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                        {selectedDoc.codigoQr || '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PLANTILLA OFICIAL DE IMPRESIÓN Y CARNET DEDICADA (#seccion-impresion) */}
      {isPreviewModalOpen && selectedDoc && (
        <PlantillaImpresionTUC
          documento={selectedDoc}
          onClose={() => setIsPreviewModalOpen(false)}
        />
      )}
    </div>
  )
}
