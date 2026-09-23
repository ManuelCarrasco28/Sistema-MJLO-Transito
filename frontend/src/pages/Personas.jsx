import { useEffect, useState, useRef } from 'react'
import { showToast, showConfirm, showError, showSuccess } from '../utils/SwalUtil'
import { Icon } from '../components/ui/Icon'
import { PageLoadError } from '../components/ui/PageLoadError'
import { Pagination } from '../components/ui/Pagination'
import { PageHeader } from '../components/ui/PageHeader'
import { KpiStrip } from '../components/ui/KpiStrip'
import { StatusBadge } from '../components/ui/StatusBadge'
import { apiFetch, getCachedData, setCachedData, invalidateCache } from '../config/api'
import { FloatingInput, FloatingSelect, RoundedSelect } from '../components/ui/FormInputs'
function formatFecha(fechaStr) {
  if (!fechaStr) return '—'
  try {
    const parts = fechaStr.split(/[- :T]/)
    if (parts.length >= 3) {
      const year = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10) - 1
      const day = parseInt(parts[2], 10)
      const d = new Date(year, month, day)
      return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    }
    return fechaStr
  } catch {
    return fechaStr
  }
}

function calcularEdad(fechaNacStr) {
  if (!fechaNacStr) return null
  try {
    const d = new Date(fechaNacStr)
    const diffMs = Date.now() - d.getTime()
    const ageDt = new Date(diffMs)
    const edad = Math.abs(ageDt.getUTCFullYear() - 1970)
    return !isNaN(edad) && edad > 0 && edad < 120 ? `(${edad} años)` : null
  } catch {
    return null
  }
}

function formatSexo(val) {
  if (!val) return '—'
  const v = val.toUpperCase().trim()
  if (v === 'M' || v === 'MASCULINO') return 'Masculino'
  if (v === 'F' || v === 'FEMENINO') return 'Femenino'
  return val
}

function formatTipoDocLabel(t) {
  const code = (t.codigo || '').toUpperCase().trim()
  if (code === 'DNI') return 'DNI (Doc. Nacional)'
  if (code === 'CE') return 'Carnet de Extranjería'
  if (code === 'PAS' || code === 'PASAPORTE') return 'Pasaporte'
  if (t.nombre) {
    const clean = t.nombre.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
    return t.codigo ? `${t.codigo} - ${clean}` : clean
  }
  return t.codigo || t.nombre || 'Documento'
}

const ESTADO_OPTIONS = [
  { value: 'ACTIVO', label: 'ACTIVO' },
  { value: 'INACTIVO', label: 'INACTIVO' },
]

const FILTER_ESTADO_OPTIONS = [
  { value: 'TODOS', label: 'Todos los estados' },
  { value: 'ACTIVO', label: 'Activos' },
  { value: 'INACTIVO', label: 'Inactivos' },
]

export function Personas({ user, onUserUpdate }) {
  const cached = getCachedData('/personas')
  const [personas, setPersonas] = useState(cached || [])
  const [isLoading, setIsLoading] = useState(!cached)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEstado, setFilterEstado] = useState('TODOS')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(8)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedPersona, setSelectedPersona] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [loadError, setLoadError] = useState('')

  const cachedTipos = getCachedData('/tipo-documentos')
  const [tipoDocOptions, setTipoDocOptions] = useState(() => {
    if (cachedTipos && Array.isArray(cachedTipos) && cachedTipos.length > 0) {
      return cachedTipos.map((t) => ({
        value: t.codigo || t.nombre,
        label: formatTipoDocLabel(t),
      }))
    }
    return []
  })

  const [formData, setFormData] = useState({
    tipoDocumento: 'DNI',
    numeroDocumento: '',
    nombres: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    direccion: '',
    telefono: '',
    celular: '',
    email: '',
    numeroLicencia: '',
    estado: 'ACTIVO',
    fotoImg: '',
  })

  const loadPersonas = async () => {
    const response = await apiFetch('/personas')
    if (!response.ok) throw response
    const payload = await response.json()
    const data = payload.data ?? []
    setPersonas(data)
    setCachedData('/personas', data)
    return data
  }

  useEffect(() => {
    setLoadError('')
    invalidateCache('/personas')
    loadPersonas()
      .catch(() => setLoadError('No se pudo cargar el padrón de personas.'))
      .finally(() => setIsLoading(false))

    apiFetch('/tipo-documentos')
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (payload?.data && Array.isArray(payload.data) && payload.data.length > 0) {
          setCachedData('/tipo-documentos', payload.data)
          const opts = payload.data.map((t) => ({
            value: t.codigo || t.nombre,
            label: formatTipoDocLabel(t),
          }))
          setTipoDocOptions(opts)
        }
      })
      .catch(() => {})
  }, [])

  const totalPersonas = personas.length
  const conductores = personas.filter((p) => Boolean(p.numeroLicencia)).length
  const propietarios = personas.filter((p) => !p.numeroLicencia).length
  const activos = personas.filter((p) => p.estado === 'ACTIVO').length
  const inactivos = personas.filter((p) => p.estado !== 'ACTIVO').length
  const porcentajeActivos = totalPersonas > 0 ? Math.round((activos / totalPersonas) * 100) : 0

  const kpiItems = [
    {
      label: 'Total registrados',
      value: new Intl.NumberFormat('es-PE').format(totalPersonas),
      context: 'En padrón municipal',
      icon: 'people',
      accentColor: '#1d4f91',
      borderColor: '#93c5fd',
      borderClass: 'border-2 border-blue-400 dark:border-blue-500/80 shadow-xs',
      iconClass: 'bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-700',
    },
    {
      label: 'Con licencia',
      value: new Intl.NumberFormat('es-PE').format(conductores),
      context: 'Habilitados para conducir',
      icon: 'permit',
      accentColor: '#0284c7',
      borderColor: '#7dd3fc',
      borderClass: 'border-2 border-sky-400 dark:border-sky-500/80 shadow-xs',
      iconClass: 'bg-sky-100 text-sky-800 border border-sky-300 dark:bg-sky-950/80 dark:text-sky-300 dark:border-sky-700',
    },
    {
      label: 'Sin licencia',
      value: new Intl.NumberFormat('es-PE').format(propietarios),
      context: 'Propietarios sin registro de conducción',
      icon: 'vehicle',
      accentColor: '#6366f1',
      borderColor: '#a5b4fc',
      borderClass: 'border-2 border-indigo-400 dark:border-indigo-500/80 shadow-xs',
      iconClass: 'bg-indigo-100 text-indigo-800 border border-indigo-300 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-700',
    },
    {
      label: 'Activos',
      value: new Intl.NumberFormat('es-PE').format(activos),
      progress: porcentajeActivos,
      context: `${porcentajeActivos}% del total`,
      icon: 'check',
      accentColor: '#10b981',
      borderColor: '#6ee7b7',
      progressColor: '#10b981',
      borderClass: 'border-2 border-emerald-400 dark:border-emerald-500/80 shadow-xs',
      iconClass: 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700',
    },
  ]

  const filteredPersonas = personas.filter((p) => {
    const fullSearch = `${p.nombres || ''} ${p.apellidoPaterno || ''} ${p.apellidoMaterno || ''} ${p.numeroDocumento || ''} ${p.numeroLicencia || ''}`.toLowerCase()
    const matchesSearch = fullSearch.includes(searchTerm.toLowerCase())
    const matchesEstado = filterEstado === 'TODOS' || p.estado === filterEstado

    return matchesSearch && matchesEstado
  })

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterEstado])


  const paginatedPersonas = filteredPersonas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handleOpenCreateModal = () => {
    setFormData({
      tipoDocumento: 'DNI',
      numeroDocumento: '',
      nombres: '',
      apellidoPaterno: '',
      apellidoMaterno: '',
      direccion: '',
      telefono: '',
      celular: '',
      email: '',
      numeroLicencia: '',
      estado: 'ACTIVO',
      fotoImg: '',
    })
    setIsEditing(false)
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (persona) => {
    setSelectedPersona(persona)
    const normalizedTipo = persona.tipoDocumento === 'DOCUMENTO NACIONAL DE IDENTIDAD' ? 'DNI' : (persona.tipoDocumento || 'DNI')
    setFormData({
      ...persona,
      tipoDocumento: normalizedTipo,
      celular: persona.celular || '',
      telefono: persona.telefono || '',
      fotoImg: persona.fotoImg || '',
    })
    setIsEditing(true)
    setIsModalOpen(true)
  }

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      showError('Formato Inválido', 'Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP).')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const rawData = ev.target?.result
      if (!rawData) return
      const img = new Image()
      img.onload = () => {
        const maxDim = 400
        let width = img.width
        let height = img.height
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          } else {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        const compressed = canvas.toDataURL('image/jpeg', 0.85)
        setFormData((prev) => ({ ...prev, fotoImg: compressed, fotoUrl: compressed }))
      }
      img.onerror = () => {
        setFormData((prev) => ({ ...prev, fotoImg: rawData, fotoUrl: rawData }))
      }
      img.src = rawData
    }
    reader.readAsDataURL(file)
  }

  const handleClearPhoto = () => {
    setFormData((prev) => ({ ...prev, fotoImg: '', fotoUrl: '' }))
  }

  const handleOpenDetail = (persona) => {
    setSelectedPersona(persona)
    setIsDetailModalOpen(true)
  }

  const handleDelete = async (id) => {
    const result = await showConfirm(
      '¿Eliminar persona?',
      '¿Está seguro de eliminar a esta persona del padrón municipal?',
      'Sí, eliminar',
      'Cancelar'
    )
    if (result.isConfirmed) {
      try {
        await apiFetch(`/personas/${id}`, { method: 'DELETE' })
        const nextPersonas = personas.filter((p) => p.id !== id)
        setPersonas(nextPersonas)
        setCachedData('/personas', nextPersonas)
        showToast('Se ha eliminado')
      } catch (err) {
        showError('Error', 'No se pudo eliminar a la persona.')
      }
    }
  }

  const escapeXml = (str) => {
    if (str === null || str === undefined) return ''
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  const handleExportExcel = () => {
    const listToExport = filteredPersonas.length > 0 ? filteredPersonas : personas
    if (listToExport.length === 0) {
      showError('Atención', 'No hay registros de personas para exportar.')
      return
    }

    const rowsHtml = listToExport
      .map((p, index) => {
        const docTipo = p.tipoDocumento === 'DOCUMENTO NACIONAL DE IDENTIDAD' ? 'DNI' : (p.tipoDocumento || 'DNI')
        const cel = p.celular?.trim() || ''
        const tel = p.telefono?.trim() || ''
        const estadoClass = p.estado === 'ACTIVO' ? 'color: #059669; font-weight: bold;' : 'color: #dc2626; font-weight: bold;'

        return `
          <tr>
            <td style="text-align: center;">${index + 1}</td>
            <td style="text-align: center;">${escapeXml(docTipo)}</td>
            <td style="text-align: center; mso-number-format:'\\@';">${escapeXml(p.numeroDocumento || '—')}</td>
            <td>${escapeXml(p.apellidoPaterno || '—')}</td>
            <td>${escapeXml(p.apellidoMaterno || '—')}</td>
            <td>${escapeXml(p.nombres || '—')}</td>
            <td style="text-align: center; mso-number-format:'\\@'; font-weight: bold;">${escapeXml(p.numeroLicencia || 'Sin licencia')}</td>
            <td style="text-align: center; mso-number-format:'\\@';">${escapeXml(cel || '—')}</td>
            <td style="text-align: center; mso-number-format:'\\@';">${escapeXml(tel || '—')}</td>
            <td>${escapeXml(p.email || '—')}</td>
            <td>${escapeXml(p.direccion || '—')}</td>
            <td style="text-align: center;">${escapeXml(p.sexo || '—')}</td>
            <td style="text-align: center;">${escapeXml(p.fechaNacimiento || '—')}</td>
            <td style="text-align: center;">${escapeXml(p.estadoCivil || '—')}</td>
            <td>${escapeXml(p.profesion || '—')}</td>
            <td style="text-align: center; ${estadoClass}">${escapeXml(p.estado || 'ACTIVO')}</td>
          </tr>
        `
      })
      .join('')

    const excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8">
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>Padron Personas</x:Name>
                  <x:WorksheetOptions>
                    <x:DisplayGridlines/>
                  </x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <style>
            body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
            table { border-collapse: collapse; width: 100%; }
            th { background-color: #1e3a8a; color: #ffffff; font-weight: bold; text-align: left; padding: 8px 10px; border: 1px solid #94a3b8; font-size: 11pt; }
            td { padding: 6px 10px; border: 1px solid #cbd5e1; font-size: 10.5pt; vertical-align: middle; }
            .header-title { font-size: 16pt; font-weight: bold; color: #1e3a8a; }
            .header-subtitle { font-size: 11pt; color: #475569; margin-bottom: 8px; }
            .header-meta { font-size: 10pt; color: #64748b; margin-bottom: 14px; }
          </style>
        </head>
        <body>
          <div class="header-title">MUNICIPALIDAD DISTRITAL JOSÉ LEONARDO ORTIZ</div>
          <div class="header-subtitle">Subgerencia de Tránsito y Transporte · Padrón Oficial de Conductores y Propietarios</div>
          <div class="header-meta">
            Fecha de emisión: ${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE')} | 
            Total registros: ${listToExport.length} | 
            Filtro: ${filterEstado === 'TODOS' ? 'Todos' : filterEstado}
          </div>
          <table>
            <thead>
              <tr>
                <th style="text-align: center; width: 45px;">N°</th>
                <th style="text-align: center; width: 90px;">Tipo Doc.</th>
                <th style="text-align: center; width: 110px;">N° Documento</th>
                <th style="width: 160px;">Apellido Paterno</th>
                <th style="width: 160px;">Apellido Materno</th>
                <th style="width: 180px;">Nombres</th>
                <th style="text-align: center; width: 120px;">N° Licencia</th>
                <th style="text-align: center; width: 110px;">Celular</th>
                <th style="text-align: center; width: 110px;">Teléfono Fijo</th>
                <th style="width: 200px;">Correo Electrónico</th>
                <th style="width: 240px;">Dirección</th>
                <th style="text-align: center; width: 80px;">Sexo</th>
                <th style="text-align: center; width: 110px;">F. Nacimiento</th>
                <th style="text-align: center; width: 100px;">Estado Civil</th>
                <th style="width: 160px;">Ocupación</th>
                <th style="text-align: center; width: 90px;">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `

    const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Padron_Personas_MJLO_${new Date().toISOString().slice(0, 10)}.xls`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const handleExportPdf = () => {
    const listToExport = filteredPersonas.length > 0 ? filteredPersonas : personas
    if (listToExport.length === 0) {
      showError('Atención', 'No hay registros de personas para exportar.')
      return
    }

    const printWin = window.open('', '_blank', 'width=1200,height=800')
    if (!printWin) {
      showError('Bloqueador de ventanas', 'No se pudo abrir la vista previa de impresión. Por favor habilita las ventanas emergentes en tu navegador.')
      return
    }

    const rowsHtml = listToExport
      .map((p, index) => {
        const docTipo = p.tipoDocumento === 'DOCUMENTO NACIONAL DE IDENTIDAD' ? 'DNI' : (p.tipoDocumento || 'DNI')
        const apellidos = [p.apellidoPaterno, p.apellidoMaterno].filter(Boolean).join(' ') || (p.apellidoPaterno || '—')
        const nombres = p.nombres || '—'
        const cel = p.celular?.trim()
        const tel = p.telefono?.trim()
        const telefonos = Array.from(new Set([cel, tel].filter(Boolean))).join(' / ') || '—'
        const estadoBadge = p.estado === 'ACTIVO'
          ? '<span style="display:inline-block; padding:2px 7px; font-size:9.5px; font-weight:700; border-radius:5px; background:#ecfdf5; color:#047857; border:1px solid #a7f3d0;">ACTIVO</span>'
          : '<span style="display:inline-block; padding:2px 7px; font-size:9.5px; font-weight:700; border-radius:5px; background:#fff1f2; color:#be123c; border:1px solid #fecdd3;">INACTIVO</span>'

        return `
          <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f8fafc'};">
            <td style="text-align: center; font-weight: bold; color: #64748b;">${index + 1}</td>
            <td style="text-align: center; font-family: monospace; font-size: 10.5px;">
              <span style="color:#64748b; font-size:9.5px;">${escapeXml(docTipo)}</span><br/>
              <strong>${escapeXml(p.numeroDocumento || '—')}</strong>
            </td>
            <td>
              <strong style="color: #0f172a; font-size: 11px; text-transform: uppercase;">${escapeXml(apellidos)}</strong>
            </td>
            <td>
              <span style="color: #334155; font-size: 11px;">${escapeXml(nombres)}</span>
            </td>
            <td style="text-align: center; font-family: monospace;">
              ${p.numeroLicencia ? `<span style="color: #b45309; font-weight: bold;">${escapeXml(p.numeroLicencia)}</span>` : '<span style="color:#94a3b8; font-size:10px;">Sin licencia</span>'}
            </td>
            <td style="text-align: center; font-size: 10.5px; color: #334155;">
              ${escapeXml(telefonos)}
            </td>
            <td style="font-size: 10.5px; color: #4338ca; word-break: break-all;">
              ${escapeXml(p.email || '—')}
            </td>
            <td style="font-size: 10.5px; color: #475569;">
              ${escapeXml(p.direccion || '—')}
            </td>
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
          <title>Padron_Personas_MJLO_${new Date().toISOString().slice(0, 10)}</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 8mm 10mm 8mm 10mm;
            }
            * { box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 0;
              font-size: 10.5px;
            }
            .header {
              border-bottom: 2px solid #0f172a;
              padding-bottom: 8px;
              margin-bottom: 10px;
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }
            .title {
              font-size: 15px;
              font-weight: 900;
              color: #0f172a;
              letter-spacing: -0.3px;
              text-transform: uppercase;
            }
            .subtitle {
              font-size: 10.5px;
              font-weight: 600;
              color: #475569;
              margin-top: 2px;
            }
            .meta {
              font-size: 9.5px;
              color: #64748b;
              text-align: right;
            }
            .summary-bar {
              display: flex;
              gap: 16px;
              margin-bottom: 10px;
              background: #f1f5f9;
              padding: 6px 12px;
              border-radius: 6px;
              font-size: 10.5px;
            }
            .summary-item {
              display: flex;
              align-items: center;
              gap: 5px;
            }
            .summary-item strong {
              color: #0f172a;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 4px;
            }
            th {
              background-color: #0f172a;
              color: #ffffff;
              text-transform: uppercase;
              font-size: 9px;
              font-weight: 800;
              letter-spacing: 0.4px;
              padding: 6px 7px;
              border: 1px solid #0f172a;
              text-align: left;
            }
            td {
              border: 1px solid #e2e8f0;
              padding: 5px 7px;
              vertical-align: middle;
            }
            .footer {
              margin-top: 12px;
              font-size: 8.5px;
              color: #94a3b8;
              display: flex;
              justify-content: space-between;
              border-top: 1px solid #e2e8f0;
              padding-top: 5px;
            }
            @media print {
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">Municipalidad Distrital José Leonardo Ortiz</div>
              <div class="subtitle">Subgerencia de Tránsito y Transporte · Padrón Oficial de Conductores y Propietarios</div>
            </div>
            <div class="meta">
              <div><strong>Fecha de emisión:</strong> ${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE')}</div>
              <div><strong>Sistema:</strong> MJLO Tránsito Digital v2026</div>
            </div>
          </div>

          <div class="summary-bar">
            <div class="summary-item">Total en padrón: <strong>${totalPersonas}</strong></div>
            <div class="summary-item">· Exportando: <strong>${listToExport.length}</strong> personas</div>
            <div class="summary-item">· Con Licencia: <strong>${conductores}</strong></div>
            <div class="summary-item">· Sin Licencia: <strong>${propietarios}</strong></div>
            <div class="summary-item">· Activos: <strong>${activos}</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 28px; text-align: center;">N°</th>
                <th style="width: 80px; text-align: center;">Documento</th>
                <th style="width: 155px;">Apellidos</th>
                <th style="width: 135px;">Nombres</th>
                <th style="width: 85px; text-align: center;">N° Licencia</th>
                <th style="width: 95px; text-align: center;">Celular</th>
                <th style="width: 150px;">Correo Electrónico</th>
                <th>Dirección</th>
                <th style="width: 65px; text-align: center;">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="footer">
            <span>Documento oficial generado para fines administrativos y fiscalización del transporte en José Leonardo Ortiz.</span>
            <span>Página 1 de 1</span>
          </div>

          <script>
            window.onload = function() {
              window.focus();
              setTimeout(function() {
                window.print();
              }, 250);
            };
          </script>
        </body>
      </html>
    `

    printWin.document.open()
    printWin.document.write(pdfHtml)
    printWin.document.close()
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    // Validaciones
    const docLen = formData.numeroDocumento.trim().length
    if (
      !formData.numeroDocumento.trim() ||
      !formData.nombres.trim() ||
      !formData.apellidoPaterno.trim() ||
      !formData.apellidoMaterno.trim() ||
      !formData.numeroLicencia.trim() ||
      !formData.celular.trim() ||
      !formData.direccion.trim() ||
      !formData.email.trim()
    ) {
      showError('Validación Fallida', 'Por favor completa todos los campos requeridos (Documento, Nombres, Apellidos, Licencia, Celular, Dirección y Email).')
      return
    }
    const isDni = formData.tipoDocumento === 'DNI' || formData.tipoDocumento === 'DOCUMENTO NACIONAL DE IDENTIDAD'
    if (isDni && (docLen !== 8 || !/^\d{8}$/.test(formData.numeroDocumento.trim()))) {
      alert('El DNI debe tener exactamente 8 dígitos numéricos.')
      return
    }
    if (!isDni && (docLen < 8 || docLen > 15)) {
      alert('El número de documento debe tener entre 8 y 15 caracteres.')
      return
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      showError('Validación Fallida', 'Por favor ingresa un correo electrónico válido.')
      return
    }
    if (formData.celular && !/^\d{9}$/.test(formData.celular)) {
      showError('Validación Fallida', 'El número de celular debe tener exactamente 9 dígitos numéricos.')
      return
    }

    try {
      if (isEditing) {
        const response = await apiFetch(`/personas/${selectedPersona.id}`, {
          method: 'PUT',
          body: formData,
        })
        if (!response.ok) throw response
        const resData = await response.json()
        const updatedPersona = resData.data || { ...selectedPersona, ...formData }
        const nextPersonas = personas.map((persona) =>
          persona.id === selectedPersona.id ? updatedPersona : persona
        )
        setPersonas(nextPersonas)
        setCachedData('/personas', nextPersonas)
        if (Number(user?.id_persona) === Number(updatedPersona.id) && onUserUpdate) {
          onUserUpdate({
            ...user,
            nombres: updatedPersona.nombres || user.nombres,
            apellidos: [updatedPersona.apellidoPaterno, updatedPersona.apellidoMaterno].filter(Boolean).join(' ') || user.apellidos,
            foto_img: updatedPersona.fotoImg || '',
          })
        }
        showToast('Se ha actualizado')
      } else {
        const res = await apiFetch('/personas', {
          method: 'POST',
          body: formData,
        })
        if (!res.ok) throw response
        const resData = await res.json()
        const newPersona = resData.data || {
          ...formData,
          id: Date.now(),
        }
        const nextPersonas = [newPersona, ...personas]
        setPersonas(nextPersonas)
        setCachedData('/personas', nextPersonas)
        setCurrentPage(1)
        showToast('Se ha agregado')
      }
      setIsModalOpen(false)
    } catch (err) {
      let message = 'Error al guardar la persona en el servidor.'
      if (err?.json) {
        try {
          const errorData = await err.json()
          message = errorData?.message || errorData?.error || message
        } catch (_) {
          message = err.statusText || message
        }
      }
      showError('Error', message)
    }
  }

  return (
    <div className="space-y-4">

      {loadError && <PageLoadError message={loadError} />}

      {/* Cabecera Principal */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25">
            <Icon name="people" className="size-5.5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                Gestión de Personas
              </h1>
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Directorio oficial de administrados y ciudadanos registrados en el sistema.
            </p>
          </div>
        </div>
      </div>

      {/* Tarjetas KPI con Bordes de Colores: 5 tarjetas separadas compactas */}
      <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {/* 1. Total registros */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-indigo-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-indigo-500/80 dark:bg-[#0f172a] col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Total registros</span>
            <span className="grid size-6 place-items-center rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Icon name="people" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {new Intl.NumberFormat('es-PE').format(totalPersonas)}
            </p>
          </div>
        </div>

        {/* 2. Con licencia */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-amber-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-amber-500/80 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Con Licencia</span>
            <span className="grid size-6 place-items-center rounded-md bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <Icon name="permit" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {new Intl.NumberFormat('es-PE').format(conductores)}
            </p>
          </div>
        </div>

        {/* 3. Sin licencia */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-cyan-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-cyan-500/80 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">Sin Licencia</span>
            <span className="grid size-6 place-items-center rounded-md bg-cyan-50 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400">
              <Icon name="user" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {new Intl.NumberFormat('es-PE').format(propietarios)}
            </p>
          </div>
        </div>

        {/* 4. Activos */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-emerald-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-emerald-500/80 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Activos</span>
            <span className="grid size-6 place-items-center rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 font-bold text-xs">
              ✓
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {new Intl.NumberFormat('es-PE').format(activos)}
            </p>
          </div>
        </div>

        {/* 5. Inactivos */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-rose-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-rose-500/80 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Inactivos</span>
            <span className="grid size-6 place-items-center rounded-md bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 font-bold text-xs">
              ✕
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {new Intl.NumberFormat('es-PE').format(inactivos)}
            </p>
          </div>
        </div>
      </div>

      {/* Contenedor de la Tabla */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-[#0f172a] overflow-hidden">
        <div className="flex flex-col gap-2.5 border-b border-slate-100 px-4 py-2.5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Icon name="search" className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por DNI, nombres, apellidos o licencia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-8 text-xs sm:text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-indigo-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <RoundedSelect
              value={filterEstado}
              onChange={setFilterEstado}
              options={FILTER_ESTADO_OPTIONS}
            />

            {(filterEstado !== 'TODOS' || searchTerm !== '') && (
              <button
                type="button"
                onClick={() => {
                  setFilterEstado('TODOS')
                  setSearchTerm('')
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
            >
              <Icon name="fileSpreadsheet" className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Excel</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              title="Descargar o imprimir padrón en PDF"
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200/80 bg-rose-50/70 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60 transition-all active:scale-95 cursor-pointer shadow-2xs whitespace-nowrap"
            >
              <Icon name="filePdf" className="size-3.5 text-rose-600 dark:text-rose-400" />
              <span>PDF</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3.5 py-1.5 text-xs font-extrabold text-white shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-indigo-600/30 active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <span className="text-base leading-none font-black">+</span>
              <span>Nueva persona</span>
            </button>
          </div>
        </div>



        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50/75 dark:bg-slate-800/40 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">Persona</th>
                <th className="px-4 py-3 whitespace-nowrap">Documento</th>
                <th className="px-4 py-3 whitespace-nowrap">Licencia</th>
                <th className="px-4 py-3 whitespace-nowrap">Contacto</th>
                <th className="px-4 py-3 whitespace-nowrap">Estado</th>
                <th className="sticky right-0 z-20 px-4 py-3 text-right whitespace-nowrap bg-slate-50/75 dark:bg-slate-800/40">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading && personas.length === 0 ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="size-9 rounded-full shrink-0"
                          style={{ backgroundColor: 'var(--bg-subtle)' }}
                        />
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div
                            className="h-3.5 w-32 rounded"
                            style={{ backgroundColor: 'var(--bg-subtle)' }}
                          />
                          <div
                            className="h-2.5 w-24 rounded"
                            style={{ backgroundColor: 'var(--bg-subtle)' }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div
                        className="h-4 w-20 rounded"
                        style={{ backgroundColor: 'var(--bg-subtle)' }}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div
                        className="h-4 w-24 rounded"
                        style={{ backgroundColor: 'var(--bg-subtle)' }}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div
                        className="h-4 w-20 rounded"
                        style={{ backgroundColor: 'var(--bg-subtle)' }}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div
                        className="h-5 w-16 rounded-full"
                        style={{ backgroundColor: 'var(--bg-subtle)' }}
                      />
                    </td>
                    <td
                      className="sticky right-0 z-10 px-4 py-3 text-right"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                      }}
                    >
                      <div
                        className="h-7 w-20 ml-auto rounded"
                        style={{ backgroundColor: 'var(--bg-subtle)' }}
                      />
                    </td>
                  </tr>
                ))
              ) : filteredPersonas.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
                    <div className="mx-auto max-w-xs space-y-1.5">
                      <Icon name="people" className="size-8 mx-auto opacity-40" />
                      <p className="font-semibold" style={{ color: 'var(--text)' }}>
                        No se encontraron personas
                      </p>
                      <p className="text-[12.5px]">
                        Intenta con otro término de búsqueda o modifica los filtros.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedPersonas.map((p) => (
                  <tr
                    key={p.id}
                    className="group transition-colors hover:bg-[var(--brand-soft)]"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {p.fotoImg ? (
                          <img
                            src={p.fotoImg}
                            alt={p.nombres}
                            onError={(e) => {
                              e.currentTarget.onerror = null
                              e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.nombres)}+${encodeURIComponent(p.apellidoPaterno)}&background=f1f5f9&color=475569&bold=true`
                            }}
                            className="size-9 shrink-0 rounded-full object-cover border"
                            style={{ borderColor: 'var(--border-brand-subtle)' }}
                          />
                        ) : (
                          <div
                            className="size-9 shrink-0 rounded-full font-semibold flex items-center justify-center text-[12px] uppercase select-none border"
                            style={{
                              backgroundColor: 'var(--brand-soft)',
                              borderColor: 'var(--border-brand-subtle)',
                              color: 'var(--brand)',
                            }}
                          >
                            {p.nombres?.[0] || '?'}{p.apellidoPaterno?.[0] || ''}
                          </div>
                        )}
                        <div>
                          <p
                            className="font-medium text-[13.5px] whitespace-nowrap"
                            style={{ color: 'var(--text)' }}
                            title={`${p.apellidoPaterno || ''} ${p.apellidoMaterno || ''} ${p.nombres || ''}`}
                          >
                            <span className="font-bold text-slate-900 dark:text-white">
                              {[p.apellidoPaterno, p.apellidoMaterno].filter(Boolean).join(' ') || p.nombres}
                            </span>
                            {p.apellidoPaterno && p.nombres && (
                              <span className="font-medium text-slate-500 dark:text-slate-400">
                                , {p.nombres}
                              </span>
                            )}
                          </p>
                          <p
                            className="text-[12px] whitespace-nowrap mt-0.5"
                            style={{ color: 'var(--text-muted)' }}
                            title={p.direccion}
                          >
                            {p.direccion || '—'}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400">
                          {p.tipoDocumento === 'DOCUMENTO NACIONAL DE IDENTIDAD' ? 'DNI' : p.tipoDocumento}
                        </span>
                        <span className="font-bold text-slate-800 dark:text-white text-[13px]">
                          {p.numeroDocumento}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      {p.numeroLicencia ? (
                        <span
                          className="font-mono-code text-[12.5px] font-semibold"
                          style={{ color: 'var(--brand)' }}
                        >
                          {p.numeroLicencia}
                        </span>
                      ) : (
                        <span className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
                          Sin licencia
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>
                        {p.celular || p.telefono || '—'}
                      </p>
                      {p.email && (
                        <p
                          className="mt-0.5 text-[12px] whitespace-nowrap"
                          style={{ color: 'var(--text-muted)' }}
                          title={p.email}
                        >
                          {p.email}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={p.estado} />
                    </td>

                    <td
                      className="sticky right-0 z-10 px-4 py-3 text-right whitespace-nowrap group-hover:bg-[var(--brand-soft)] transition-colors"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                      }}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        {/* OJO: Celeste */}
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(p)}
                          title="Ver ficha"
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

                        {/* EDITAR: Amarillo */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(p)}
                          title="Editar persona"
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
                          onClick={() => handleDelete(p.id)}
                          title="Eliminar persona"
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
          totalItems={filteredPersonas.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(size) => {
            setItemsPerPage(size)
            setCurrentPage(1)
          }}
        />
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-enter">
          <div className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800">
            {/* Header: Limpio, sin morado ni textos largos */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-3.5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <Icon name="people" className="size-4" />
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isEditing ? 'Editar persona' : 'Nueva persona'}
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
              <div className="p-4 sm:p-4.5 space-y-2.5">
                {/* Bloque Superior: Foto a la izquierda + Identidad y Nombres a la derecha */}
                <div className="flex flex-col sm:flex-row gap-3 items-stretch">
                  {/* Foto tipo carnet (ancho óptimo para no desperdiciar espacio horizontal) */}
                  <div className="w-full sm:w-[102px] shrink-0 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-2.5 flex flex-col items-center justify-center gap-2 dark:border-slate-800 dark:bg-slate-900/60 shadow-xs">
                    {formData.fotoImg ? (
                      <img
                        src={formData.fotoImg}
                        alt="Vista previa"
                        onError={(e) => {
                          e.currentTarget.onerror = null
                          e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.nombres || 'P')}+${encodeURIComponent(formData.apellidoPaterno || 'P')}&background=f1f5f9&color=475569&bold=true`
                        }}
                        className="w-[78px] h-[98px] rounded-xl object-cover border-2 border-slate-200 dark:border-slate-700 shadow-xs bg-slate-100 dark:bg-slate-800"
                      />
                    ) : (
                      <div className="w-[78px] h-[98px] rounded-xl font-bold flex flex-col items-center justify-center text-lg uppercase select-none border border-slate-200 bg-slate-800 text-white shrink-0 shadow-xs">
                        <span>{formData.nombres?.[0] || '?'}{formData.apellidoPaterno?.[0] || ''}</span>
                        <span className="text-[9px] text-slate-400 font-normal tracking-wide mt-0.5">Sin foto</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 w-full justify-center">
                      <label className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 px-2 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer">
                        <Icon name="camera" className="size-3" />
                        <span>{formData.fotoImg ? 'Cambiar' : 'Subir'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </label>
                      {formData.fotoImg && (
                        <button
                          type="button"
                          onClick={handleClearPhoto}
                          title="Quitar foto"
                          className="rounded-lg border border-rose-200 bg-rose-50 p-1 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-400 cursor-pointer"
                        >
                          <Icon name="trash" className="size-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Identidad y Nombres */}
                  <div className="flex-1 min-w-0 space-y-2.5 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/50 shadow-xs">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-2">
                      <span className="size-2 rounded-full bg-blue-600" />
                      Datos Personales
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      <div className="sm:col-span-5">
                        <FloatingSelect
                          id="per_tipo_doc"
                          label="Tipo de documento"
                          value={formData.tipoDocumento}
                          onChange={(e) => setFormData({ ...formData, tipoDocumento: e.target.value })}
                          options={tipoDocOptions}
                        />
                      </div>
                      <div className="sm:col-span-7">
                        <FloatingInput
                          id="per_num_doc"
                          label="Número de documento"
                          required
                          maxLength={(formData.tipoDocumento === 'DNI' || formData.tipoDocumento === 'DOCUMENTO NACIONAL DE IDENTIDAD') ? 8 : 15}
                          value={formData.numeroDocumento}
                          inputClassName="font-mono font-bold"
                          onChange={(e) => {
                            const val = e.target.value;
                            const isDni = formData.tipoDocumento === 'DNI' || formData.tipoDocumento === 'DOCUMENTO NACIONAL DE IDENTIDAD';
                            if (isDni && !/^\d*$/.test(val)) return;
                            setFormData({ ...formData, numeroDocumento: val })
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <FloatingInput
                        id="per_nombres"
                        label="Nombres"
                        required
                        value={formData.nombres}
                        onChange={(e) => setFormData({ ...formData, nombres: e.target.value })}
                      />
                      <FloatingInput
                        id="per_paterno"
                        label="Apellido paterno"
                        required
                        value={formData.apellidoPaterno}
                        onChange={(e) => setFormData({ ...formData, apellidoPaterno: e.target.value })}
                      />
                      <FloatingInput
                        id="per_materno"
                        label="Apellido materno"
                        required
                        value={formData.apellidoMaterno}
                        onChange={(e) => setFormData({ ...formData, apellidoMaterno: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Bloque Inferior: Licencia y Contacto */}
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 space-y-2.5 dark:border-slate-800 dark:bg-slate-900/50 shadow-xs">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-600" />
                    Licencia y contacto
                  </h4>

                  <div className={`grid grid-cols-1 sm:grid-cols-2 ${isEditing ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-2.5`}>
                    <FloatingInput
                      id="per_licencia"
                      label="Número de licencia"
                      required
                      maxLength={9}
                      value={formData.numeroLicencia}
                      inputClassName="font-mono font-bold uppercase"
                      onChange={(e) => setFormData({ ...formData, numeroLicencia: e.target.value.toUpperCase() })}
                    />

                    <FloatingInput
                      id="per_celular"
                      label="Celular"
                      required
                      type="tel"
                      maxLength={9}
                      value={formData.celular}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!/^\d*$/.test(val)) return;
                        setFormData({ ...formData, celular: val });
                      }}
                    />

                    <FloatingInput
                      id="per_telefono"
                      label="Teléfono fijo"
                      optional
                      type="tel"
                      maxLength={15}
                      value={formData.telefono || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!/^[0-9\- ]*$/.test(val)) return;
                        setFormData({ ...formData, telefono: val });
                      }}
                    />

                    {isEditing && (
                      <FloatingSelect
                        id="per_estado"
                        label="Estado del registro"
                        value={formData.estado}
                        onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                        options={ESTADO_OPTIONS}
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <FloatingInput
                      id="per_direccion"
                      label="Dirección"
                      required
                      maxLength={250}
                      value={formData.direccion || ''}
                      onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                    />
                    <FloatingInput
                      id="per_email"
                      label="Correo electrónico"
                      required
                      type="email"
                      maxLength={150}
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/80 px-6 py-2.5 dark:border-slate-800 dark:bg-slate-900/80">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 active:scale-95 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 px-5 py-1.5 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer"
                >
                  {isEditing ? 'Actualizar persona' : 'Guardar persona'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDetailModalOpen && selectedPersona && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-enter">
          <div className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800">
            {/* Modal Header (Limpio, sin morado ni textos largos) */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-3.5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <Icon name="user" className="size-4" />
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Ficha del Administrado
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

            {/* Modal Body: Compacto sin scroll */}
            <div className="p-5 pb-6 space-y-3">
              {/* Profile Hero Card */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 flex flex-col sm:flex-row items-center gap-4 dark:border-slate-800 dark:bg-slate-900/60 shadow-xs">
                {selectedPersona.fotoImg ? (
                  <img
                    src={selectedPersona.fotoImg}
                    alt={selectedPersona.nombres}
                    onError={(e) => {
                      e.currentTarget.onerror = null
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedPersona.nombres)}+${encodeURIComponent(selectedPersona.apellidoPaterno)}&background=f1f5f9&color=475569&bold=true`
                    }}
                    className="w-[84px] h-[105px] rounded-xl object-cover border-2 border-slate-200 dark:border-slate-700 shrink-0 shadow-xs bg-slate-100 dark:bg-slate-800"
                  />
                ) : (
                  <div className="w-[84px] h-[105px] rounded-xl font-bold flex flex-col items-center justify-center text-xl uppercase select-none border border-slate-200 bg-slate-800 text-white shrink-0 shadow-xs">
                    <span>{selectedPersona.nombres?.[0] || '?'}{selectedPersona.apellidoPaterno?.[0] || ''}</span>
                    <span className="text-[10px] text-slate-400 font-normal tracking-wide mt-1">Sin foto</span>
                  </div>
                )}
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <h4 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                    {[selectedPersona.apellidoPaterno, selectedPersona.apellidoMaterno].filter(Boolean).join(' ') || selectedPersona.nombres}
                    {selectedPersona.apellidoPaterno && selectedPersona.nombres ? `, ${selectedPersona.nombres}` : ''}
                  </h4>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-mono text-[11px] font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shadow-xs">
                      <span className="text-slate-400 font-semibold">
                        {selectedPersona.tipoDocumento === 'DOCUMENTO NACIONAL DE IDENTIDAD' ? 'DNI' : selectedPersona.tipoDocumento}:
                      </span>
                      <strong>{selectedPersona.numeroDocumento}</strong>
                    </span>

                    <StatusBadge status={selectedPersona.estado} />
                  </div>
                </div>
              </div>

              {/* Secciones de Datos en Rejilla: Solo atributos reales con espacio completo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* 1. Datos Personales y Licencia */}
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-900/50 space-y-1.5 shadow-xs">
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    Datos personales
                  </h5>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 shrink-0 mr-2">Nombres</span>
                      <span className="font-bold text-slate-800 dark:text-white text-right">
                        {selectedPersona.nombres || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 shrink-0 mr-2">Apellido paterno</span>
                      <span className="font-bold text-slate-800 dark:text-white text-right">
                        {selectedPersona.apellidoPaterno || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 shrink-0 mr-2">Apellido materno</span>
                      <span className="font-bold text-slate-800 dark:text-white text-right">
                        {selectedPersona.apellidoMaterno || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 shrink-0 mr-2">Sexo</span>
                      <span className="font-bold text-slate-800 dark:text-white">
                        {formatSexo(selectedPersona.sexo)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 shrink-0 mr-2">Nacimiento</span>
                      <span className="font-bold text-slate-800 dark:text-white text-right">
                        {formatFecha(selectedPersona.fechaNacimiento)} {calcularEdad(selectedPersona.fechaNacimiento)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 shrink-0 mr-2">Estado civil</span>
                      <span className="font-bold text-slate-800 dark:text-white">
                        {selectedPersona.estadoCivil || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 shrink-0 mr-2">Ocupación</span>
                      <span className="font-bold text-slate-800 dark:text-white text-right break-words" title={selectedPersona.profesion}>
                        {selectedPersona.profesion || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 shrink-0 mr-2">N° Licencia</span>
                      {selectedPersona.numeroLicencia ? (
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                          {selectedPersona.numeroLicencia}
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                          Sin licencia
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Contacto */}
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-900/50 space-y-1.5 shadow-xs">
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    Contacto
                  </h5>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 shrink-0 mr-2">Celular</span>
                      <span className="font-bold text-slate-800 dark:text-white">
                        {selectedPersona.celular || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 shrink-0 mr-2">Teléfono fijo</span>
                      <span className="font-semibold text-slate-800 dark:text-white">
                        {selectedPersona.telefono || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 shrink-0 mr-2">Email</span>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400 text-right break-all select-all" title={selectedPersona.email}>
                        {selectedPersona.email || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 shrink-0 mr-2">Dirección</span>
                      <span className="font-semibold text-slate-800 dark:text-white text-right break-words" title={selectedPersona.direccion}>
                        {selectedPersona.direccion || '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Récord 360: Papeletas y Cursos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-3.5">
                {/* 3. Historial de Papeletas */}
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-900/50 flex flex-col shadow-xs max-h-60">
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 shrink-0">
                    Historial de Papeletas ({selectedPersona.historialPapeletas?.length || 0})
                  </h5>
                  <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                    {!selectedPersona.historialPapeletas || selectedPersona.historialPapeletas.length === 0 ? (
                      <p className="text-xs text-slate-400 italic text-center py-4">No registra papeletas.</p>
                    ) : (
                      selectedPersona.historialPapeletas.map((pap, i) => (
                        <div key={i} className="bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                          <div className="flex justify-between items-center mb-1">
                            <strong className="text-rose-600 dark:text-rose-400 font-mono">{pap.numero_papeleta}</strong>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400">{pap.estado}</span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300 font-semibold">Placa: {pap.placa}</p>
                          <p className="text-slate-500 dark:text-slate-400 text-[10px]">{formatFecha(pap.fecha_hora)} - {pap.lugar}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 4. Historial de Cursos */}
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-900/50 flex flex-col shadow-xs max-h-60">
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 shrink-0">
                    Historial de Cursos ({selectedPersona.historialCursos?.length || 0})
                  </h5>
                  <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                    {!selectedPersona.historialCursos || selectedPersona.historialCursos.length === 0 ? (
                      <p className="text-xs text-slate-400 italic text-center py-4">No registra cursos de seguridad vial.</p>
                    ) : (
                      selectedPersona.historialCursos.map((cur, i) => (
                        <div key={i} className="bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                          <div className="flex justify-between items-start mb-1">
                            <strong className="text-indigo-600 dark:text-indigo-400 leading-tight">{cur.curso_nombre}</strong>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ml-2 whitespace-nowrap ${
                              cur.estado === 'APROBADO' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400' :
                              cur.estado === 'DESAPROBADO' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400' :
                              'bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400'
                            }`}>{cur.estado}</span>
                          </div>
                          <p className="text-slate-500 dark:text-slate-400 text-[10px]">Inscrito: {formatFecha(cur.fecha_inscripcion)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
              </div>
            </div>
          </div>
      )}
    </div>
  )
}
