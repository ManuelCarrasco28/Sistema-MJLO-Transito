import { useState } from 'react'
import { Icon } from '../components/ui/Icon'
import { initialOrganizaciones } from '../data/mockData'

export function Organizaciones() {
  const [organizaciones, setOrganizaciones] = useState(initialOrganizaciones)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTipo, setFilterTipo] = useState('TODOS')
  const [filterEstado, setFilterEstado] = useState('TODOS')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedOrg, setSelectedOrg] = useState(null)
  const [isEditing, setIsEditing] = useState(false)

  const [formData, setFormData] = useState({
    tipo: 'ASOCIACION',
    razonSocial: '',
    ruc: '',
    partidaRegistral: '',
    representanteLegal: '',
    direccion: '',
    telefono: '',
    email: '',
    flotaTotal: 50,
    estado: 'ACTIVO',
  })

  const totalOrgs = organizaciones.length
  const empresas = organizaciones.filter((o) => o.tipo === 'EMPRESA').length
  const asociaciones = organizaciones.filter((o) => o.tipo === 'ASOCIACION').length
  const flotaAcumulada = organizaciones.reduce((sum, o) => sum + Number(o.flotaTotal || 0), 0)

  const filteredOrgs = organizaciones.filter((o) => {
    const fullSearch = `${o.razonSocial} ${o.ruc} ${o.representanteLegal} ${o.partidaRegistral}`.toLowerCase()
    const matchesSearch = fullSearch.includes(searchTerm.toLowerCase())
    const matchesTipo = filterTipo === 'TODOS' || o.tipo === filterTipo
    const matchesEstado = filterEstado === 'TODOS' || o.estado === filterEstado

    return matchesSearch && matchesTipo && matchesEstado
  })

  const handleOpenCreateModal = () => {
    setFormData({
      tipo: 'ASOCIACION',
      razonSocial: '',
      ruc: '',
      partidaRegistral: '',
      representanteLegal: '',
      direccion: '',
      telefono: '',
      email: '',
      flotaTotal: 50,
      estado: 'ACTIVO',
    })
    setIsEditing(false)
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (org) => {
    setSelectedOrg(org)
    setFormData({ ...org })
    setIsEditing(true)
    setIsModalOpen(true)
  }

  const handleOpenDetail = (org) => {
    setSelectedOrg(org)
    setIsDetailModalOpen(true)
  }

  const handleDelete = (id) => {
    if (window.confirm('¿Está seguro de eliminar esta organización del registro?')) {
      setOrganizaciones(organizaciones.filter((o) => o.id !== id))
    }
  }

  const handleFormSubmit = (e) => {
    e.preventDefault()
    if (!formData.razonSocial.trim() || !formData.ruc.trim()) {
      alert('Por favor completa los campos obligatorios (Razón Social y RUC).')
      return
    }

    if (isEditing) {
      setOrganizaciones(organizaciones.map((o) => (o.id === selectedOrg.id ? { ...formData, id: o.id } : o)))
    } else {
      const newOrg = {
        ...formData,
        id: Date.now(),
      }
      setOrganizaciones([newOrg, ...organizaciones])
    }
    setIsModalOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
              <Icon name="building" className="size-5" />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white sm:text-3xl">
              Organizaciones y Empresas de Transporte
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Registro de asociaciones de mototaxistas y empresas de transporte público autorizadas en JLO.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-indigo-600/25 transition-all hover:-translate-y-0.5 hover:bg-indigo-700 active:translate-y-0"
        >
          <span className="text-lg leading-none">+</span>
          <span>Registrar Organización</span>
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Entidades</span>
            <span className="grid size-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <Icon name="building" className="size-4.5" />
            </span>
          </div>
          <p className="mt-2 text-3xl font-black text-slate-800 dark:text-white">{totalOrgs}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Registradas en la municipalidad</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Asociaciones Mototaxis</span>
            <span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              🛺
            </span>
          </div>
          <p className="mt-2 text-3xl font-black text-slate-800 dark:text-white">{asociaciones}</p>
          <p className="mt-1 text-xs text-blue-600 dark:text-blue-400 font-medium">Comités y asociaciones de transporte menor</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">Empresas S.A. / S.A.C.</span>
            <span className="grid size-9 place-items-center rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-950/50 dark:text-cyan-400">
              🏢
            </span>
          </div>
          <p className="mt-2 text-3xl font-black text-slate-800 dark:text-white">{empresas}</p>
          <p className="mt-1 text-xs text-cyan-600 dark:text-cyan-400 font-medium">Colectivos y transporte urbano mayor</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Flota Acumulada</span>
            <span className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              ⚡
            </span>
          </div>
          <p className="mt-2 text-3xl font-black text-slate-800 dark:text-white">{flotaAcumulada}</p>
          <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">Unidades agrupadas registradas</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-[#0f172a]">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Icon name="search" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por Razón Social, RUC, Representante Legal o Partida Registral..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-indigo-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-semibold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="TODOS">Todos los tipos</option>
              <option value="ASOCIACION">Asociaciones</option>
              <option value="EMPRESA">Empresas</option>
            </select>

            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-semibold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="ACTIVO">Activas</option>
              <option value="SUSPENDIDO">Suspendidas</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/70 text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3.5">Organización / Empresa</th>
                <th className="px-5 py-3.5">RUC / Partida SUNARP</th>
                <th className="px-5 py-3.5">Representante Legal</th>
                <th className="px-5 py-3.5">Contacto</th>
                <th className="px-5 py-3.5">Flota Estimada</th>
                <th className="px-5 py-3.5">Estado</th>
                <th className="px-5 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredOrgs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-10 text-center text-slate-400">
                    No se encontraron organizaciones con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredOrgs.map((o) => (
                  <tr key={o.id} className="transition hover:bg-indigo-50/30 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className={`grid size-10 shrink-0 place-items-center rounded-xl text-lg ${
                          o.tipo === 'ASOCIACION' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/50' : 'bg-blue-50 text-blue-600 dark:bg-blue-950/50'
                        }`}>
                          {o.tipo === 'ASOCIACION' ? '🛺' : '🏢'}
                        </span>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white max-w-xs">{o.razonSocial}</p>
                          <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {o.tipo}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-mono font-bold text-slate-800 dark:text-slate-200">RUC: {o.ruc}</p>
                      <p className="text-xs text-slate-400">{o.partidaRegistral}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{o.representanteLegal}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-700 dark:text-slate-300">{o.telefono}</p>
                      <p className="text-xs text-slate-400 truncate max-w-xs">{o.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-black text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                        {o.flotaTotal} unidades
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                        o.estado === 'ACTIVO'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}>
                        <span className="size-1.5 rounded-full bg-current" />
                        {o.estado}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(o)}
                          title="Ver Detalle"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                        >
                          👁
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(o)}
                          title="Editar Organización"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-amber-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-amber-400"
                        >
                          ✏
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(o.id)}
                          title="Eliminar Organización"
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
                {isEditing ? 'Editar Organización' : 'Registrar Nueva Organización'}
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
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Tipo de Entidad</label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="ASOCIACION">ASOCIACION DE MOTOTAXISTAS</option>
                    <option value="EMPRESA">EMPRESA DE TRANSPORTE (S.A. / S.A.C.)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">RUC (11 dígitos) *</label>
                  <input
                    type="text"
                    required
                    placeholder="20xxxxxxxx"
                    value={formData.ruc}
                    onChange={(e) => setFormData({ ...formData, ruc: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Razón Social *</label>
                <input
                  type="text"
                  required
                  placeholder="Nombre oficial registrado en SUNARP"
                  value={formData.razonSocial}
                  onChange={(e) => setFormData({ ...formData, razonSocial: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Partida Registral SUNARP</label>
                  <input
                    type="text"
                    placeholder="Ej: 11029841-SUNARP"
                    value={formData.partidaRegistral}
                    onChange={(e) => setFormData({ ...formData, partidaRegistral: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Representante Legal</label>
                  <input
                    type="text"
                    placeholder="Nombres del presidente / gerente"
                    value={formData.representanteLegal}
                    onChange={(e) => setFormData({ ...formData, representanteLegal: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Dirección Institucional</label>
                  <input
                    type="text"
                    placeholder="Av. / Jr. / Calle N° - JLO"
                    value={formData.direccion}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Teléfono Contacto</label>
                  <input
                    type="text"
                    placeholder="Teléfono / Celular"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Flota Estimada</label>
                  <input
                    type="number"
                    value={formData.flotaTotal}
                    onChange={(e) => setFormData({ ...formData, flotaTotal: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Estado de Operatividad</label>
                  <select
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="ACTIVO">ACTIVO</option>
                    <option value="SUSPENDIDO">SUSPENDIDO</option>
                  </select>
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
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-extrabold text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20"
                >
                  {isEditing ? 'Guardar Cambios' : 'Registrar Organización'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDetailModalOpen && selectedOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-enter">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
            <div className="border-b border-slate-100 bg-[#071a2f] p-6 text-white relative">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="absolute right-4 top-4 rounded-lg p-1 text-slate-300 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
              <span className="inline-block rounded-md bg-indigo-500/20 text-indigo-300 px-2 py-0.5 text-[10px] font-bold">
                {selectedOrg.tipo}
              </span>
              <h3 className="mt-1 text-xl font-black">{selectedOrg.razonSocial}</h3>
              <p className="text-xs text-slate-300 font-mono">RUC: {selectedOrg.ruc}</p>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5 dark:border-slate-800">
                  <span className="font-bold text-slate-400">Representante Legal</span>
                  <span className="font-semibold text-slate-800 dark:text-white">{selectedOrg.representanteLegal}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5 dark:border-slate-800">
                  <span className="font-bold text-slate-400">Partida SUNARP</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{selectedOrg.partidaRegistral}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5 dark:border-slate-800">
                  <span className="font-bold text-slate-400">Teléfono / Email</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedOrg.telefono}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-400">Flota de Unidades</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedOrg.flotaTotal} unidades autorizadas</span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="rounded-xl bg-slate-900 px-5 py-2 font-bold text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
