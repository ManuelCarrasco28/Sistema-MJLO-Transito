import { useState } from 'react'
import { Icon } from '../components/ui/Icon'
import { initialDocumentos, initialVehiculos } from '../data/mockData'

export function Documentos() {
  const [documentos, setDocumentos] = useState(initialDocumentos)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTipo, setFilterTipo] = useState('TODOS')
  const [filterEstado, setFilterEstado] = useState('TODOS')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [isEditing, setIsEditing] = useState(false)

  const [formData, setFormData] = useState({
    vehiculoPlaca: initialVehiculos[0].placa,
    tipoDocumento: 'TARJETA_OPERATIVIDAD',
    codigo: '',
    fechaExpedicion: '2026-01-01',
    fechaExpiracion: '2027-01-01',
    estado: 'VIGENTE',
    propietario: initialVehiculos[0].propietario,
    asociacion: initialVehiculos[0].organizacion,
  })

  const totalDocs = documentos.length
  const vigentes = documentos.filter((d) => d.estado === 'VIGENTE').length
  const enTramite = documentos.filter((d) => d.estado === 'EN_TRAMITE').length
  const vencidos = documentos.filter((d) => d.estado === 'VENCIDO').length

  const filteredDocs = documentos.filter((d) => {
    const fullSearch = `${d.codigo} ${d.vehiculoPlaca} ${d.propietario} ${d.asociacion} ${d.tipoDocumento}`.toLowerCase()
    const matchesSearch = fullSearch.includes(searchTerm.toLowerCase())
    const matchesTipo = filterTipo === 'TODOS' || d.tipoDocumento === filterTipo
    const matchesEstado = filterEstado === 'TODOS' || d.estado === filterEstado

    return matchesSearch && matchesTipo && matchesEstado
  })

  const handleOpenCreateModal = () => {
    setFormData({
      vehiculoPlaca: initialVehiculos[0].placa,
      tipoDocumento: 'TARJETA_OPERATIVIDAD',
      codigo: `TUC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      fechaExpedicion: new Date().toISOString().split('T')[0],
      fechaExpiracion: '2027-12-31',
      estado: 'VIGENTE',
      propietario: initialVehiculos[0].propietario,
      asociacion: initialVehiculos[0].organizacion,
    })
    setIsEditing(false)
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (doc) => {
    setSelectedDoc(doc)
    setFormData({ ...doc })
    setIsEditing(true)
    setIsModalOpen(true)
  }

  const handleOpenPreview = (doc) => {
    setSelectedDoc(doc)
    setIsPreviewModalOpen(true)
  }

  const handleDelete = (id) => {
    if (window.confirm('¿Está seguro de anular/eliminar este documento?')) {
      setDocumentos(documentos.filter((d) => d.id !== id))
    }
  }

  const handleFormSubmit = (e) => {
    e.preventDefault()
    if (!formData.codigo.trim() || !formData.vehiculoPlaca.trim()) {
      alert('Por favor completa los campos obligatorios (Placa y Código de Documento).')
      return
    }

    if (isEditing) {
      setDocumentos(documentos.map((d) => (d.id === selectedDoc.id ? { ...formData, id: d.id } : d)))
    } else {
      const newDoc = {
        ...formData,
        id: Date.now(),
      }
      setDocumentos([newDoc, ...documentos])
    }
    setIsModalOpen(false)
  }

  const getDocTypeBadge = (tipo) => {
    switch (tipo) {
      case 'TARJETA_OPERATIVIDAD':
        return <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300">TUC (Tarjeta Operatividad)</span>
      case 'SOAT':
        return <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">SOAT Vehicular</span>
      case 'CERTICAV':
        return <span className="rounded-md bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-800 dark:bg-purple-950 dark:text-purple-300">CERTICAV (Capacitación)</span>
      default:
        return <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">Tarjeta de Propiedad</span>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-emerald-600/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <Icon name="document" className="size-5" />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white sm:text-3xl">
              Control de Documentos y Permisos
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Expedición de Tarjetas Únicas de Circulación (TUC), SOAT y certificados habilitantes.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-600/25 transition-all hover:-translate-y-0.5 hover:bg-emerald-700 active:translate-y-0"
        >
          <span className="text-lg leading-none">+</span>
          <span>Emitir Documento</span>
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Expedidos</span>
            <span className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <Icon name="document" className="size-4.5" />
            </span>
          </div>
          <p className="mt-2 text-3xl font-black text-slate-800 dark:text-white">{totalDocs}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Documentos registrados</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Vigentes</span>
            <span className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              ✓
            </span>
          </div>
          <p className="mt-2 text-3xl font-black text-slate-800 dark:text-white">{vigentes}</p>
          <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">Habilitación activa</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">En Trámite</span>
            <span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              📑
            </span>
          </div>
          <p className="mt-2 text-3xl font-black text-slate-800 dark:text-white">{enTramite}</p>
          <p className="mt-1 text-xs text-blue-600 dark:text-blue-400 font-medium">Pendientes de firma</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Vencidos</span>
            <span className="grid size-9 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
              ⏰
            </span>
          </div>
          <p className="mt-2 text-3xl font-black text-slate-800 dark:text-white">{vencidos}</p>
          <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">Requieren renovación</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-[#0f172a]">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Icon name="search" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por N° Código, placa vehicular, propietario o asociación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-emerald-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-semibold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="TODOS">Todos los tipos</option>
              <option value="TARJETA_OPERATIVIDAD">Tarjeta de Operatividad (TUC)</option>
              <option value="SOAT">SOAT Vehicular</option>
              <option value="CERTICAV">Certificado Capacitación (CERTICAV)</option>
              <option value="TARJETA_PROPIEDAD">Tarjeta de Propiedad</option>
            </select>

            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-semibold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="VIGENTE">Vigentes</option>
              <option value="EN_TRAMITE">En Trámite</option>
              <option value="VENCIDO">Vencidos</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/70 text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3.5">Documento / Expediente</th>
                <th className="px-5 py-3.5">Placa Vehículo</th>
                <th className="px-5 py-3.5">Titular / Empresa</th>
                <th className="px-5 py-3.5">Emisión</th>
                <th className="px-5 py-3.5">Expiración</th>
                <th className="px-5 py-3.5">Estado</th>
                <th className="px-5 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-10 text-center text-slate-400">
                    No se encontraron documentos con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((d) => (
                  <tr key={d.id} className="transition hover:bg-emerald-50/30 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        <p className="font-mono font-bold text-slate-800 dark:text-white">{d.codigo}</p>
                        {getDocTypeBadge(d.tipoDocumento)}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="inline-flex items-center gap-1.5 rounded-lg border-2 border-slate-800 bg-amber-300 px-2 py-0.5 text-xs font-black text-slate-900 shadow-xs tracking-wider">
                        <span>🇵🇪</span>
                        <span>{d.vehiculoPlaca}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{d.propietario}</p>
                      <p className="text-xs text-slate-400 truncate max-w-xs">{d.asociacion}</p>
                    </td>
                    <td className="px-5 py-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {d.fechaExpedicion || 'N/A'}
                    </td>
                    <td className="px-5 py-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {d.fechaExpiracion || 'Indefinida'}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                        d.estado === 'VIGENTE'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : d.estado === 'EN_TRAMITE'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}>
                        <span className="size-1.5 rounded-full bg-current" />
                        {d.estado}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenPreview(d)}
                          title="Imprimir / Ver TUC Digital"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-emerald-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-emerald-400"
                        >
                          🖨
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(d)}
                          title="Editar / Renovar Documento"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-amber-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-amber-400"
                        >
                          ✏
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(d.id)}
                          title="Anular Documento"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-enter">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-white">
                {isEditing ? 'Editar Registro de Documento' : 'Emitir Nuevo Documento / Permiso'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Tipo de Documento</label>
                  <select
                    value={formData.tipoDocumento}
                    onChange={(e) => setFormData({ ...formData, tipoDocumento: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="TARJETA_OPERATIVIDAD">Tarjeta de Operatividad (TUC)</option>
                    <option value="SOAT">SOAT Vehicular</option>
                    <option value="CERTICAV">CERTICAV (Capacitación)</option>
                    <option value="TARJETA_PROPIEDAD">Tarjeta de Propiedad</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Código / N° Expediente *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: TUC-2026-0891"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Placa del Vehículo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: M4X-821"
                    value={formData.vehiculoPlaca}
                    onChange={(e) => setFormData({ ...formData, vehiculoPlaca: e.target.value.toUpperCase() })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Estado de Vigencia</label>
                  <select
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="VIGENTE">VIGENTE</option>
                    <option value="EN_TRAMITE">EN TRAMITE</option>
                    <option value="VENCIDO">VENCIDO</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Propietario / Titular</label>
                  <input
                    type="text"
                    placeholder="Nombre completo o Razón Social"
                    value={formData.propietario}
                    onChange={(e) => setFormData({ ...formData, propietario: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Asociación / Empresa</label>
                  <input
                    type="text"
                    placeholder="Nombre de la empresa"
                    value={formData.asociacion}
                    onChange={(e) => setFormData({ ...formData, asociacion: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Fecha de Expedición</label>
                  <input
                    type="date"
                    value={formData.fechaExpedicion}
                    onChange={(e) => setFormData({ ...formData, fechaExpedicion: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Fecha de Expiración</label>
                  <input
                    type="date"
                    value={formData.fechaExpiracion}
                    onChange={(e) => setFormData({ ...formData, fechaExpiracion: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-extrabold text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20"
                >
                  {isEditing ? 'Guardar Cambios' : 'Emitir Documento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isPreviewModalOpen && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-enter">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#0f172a] border-4 border-[#071a2f]">
            <div className="bg-[#071a2f] p-5 text-white text-center">
              <img src="/img/logo-mjlo.png" alt="MDJLO" className="h-10 mx-auto bg-white rounded-lg p-1" />
              <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-cyan-300">
                MUNICIPALIDAD DISTRITAL DE JOSÉ LEONARDO ORTIZ
              </p>
              <h3 className="mt-1 text-lg font-black tracking-tight">TARJETA ÚNICA DE CIRCULACIÓN (TUC)</h3>
              <p className="text-xs font-mono text-cyan-200 font-bold">{selectedDoc.codigo}</p>
            </div>

            <div className="p-5 space-y-3 text-xs bg-slate-50 dark:bg-slate-900">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2 dark:border-slate-800">
                <span className="font-bold text-slate-400">PLACA VEHICULAR</span>
                <span className="rounded-md bg-amber-300 border border-slate-800 px-2 py-0.5 text-sm font-black text-slate-900">
                  {selectedDoc.vehiculoPlaca}
                </span>
              </div>

              <div className="flex justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
                <span className="font-bold text-slate-400">PROPIETARIO</span>
                <span className="font-semibold text-slate-800 dark:text-white">{selectedDoc.propietario}</span>
              </div>

              <div className="flex justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
                <span className="font-bold text-slate-400">ASOCIACIÓN</span>
                <span className="font-semibold text-slate-800 dark:text-white max-w-[180px] text-right">{selectedDoc.asociacion}</span>
              </div>

              <div className="flex justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
                <span className="font-bold text-slate-400">VIGENCIA HASTA</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{selectedDoc.fechaExpiracion || 'Indefinida'}</span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="size-16 border-2 border-slate-800 bg-slate-900 p-1 text-white flex flex-col justify-center items-center rounded-md">
                  <span className="text-[9px] font-black">QR VALID</span>
                  <span className="text-[6px] text-cyan-300">JLO-TUC</span>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400">FIRMA DIGITAL REGISTRADA</p>
                  <p className="text-[11px] font-black text-slate-700 dark:text-slate-200">Subgerencia de Tránsito · MDJLO</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-100 p-3 flex justify-end gap-2 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(false)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-slate-700"
              >
                Cerrar Documento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
