import { useState } from 'react'
import { Icon } from '../components/ui/Icon'
import { initialVehiculos, initialOrganizaciones } from '../data/mockData'

export function Vehiculos() {
  const [vehiculos, setVehiculos] = useState(initialVehiculos)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTipo, setFilterTipo] = useState('TODOS')
  const [filterEstado, setFilterEstado] = useState('TODOS')
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedVehiculo, setSelectedVehiculo] = useState(null)
  const [isEditing, setIsEditing] = useState(false)

  const [formData, setFormData] = useState({
    placa: '',
    tipo: 'Mototaxi (Trimovil)',
    marca: '',
    modelo: '',
    color: '',
    anio: new Date().getFullYear(),
    numeroSerie: '',
    serieMotor: '',
    partidaRegistral: '',
    organizacion: initialOrganizaciones[0].razonSocial,
    propietario: '',
    propietarioDni: '',
    estado: 'FORMALIZADO',
    soatEstado: 'VIGENTE',
    tucNumero: 'TUC-2026-000',
  })

  const totalVehiculos = vehiculos.length
  const formalizados = vehiculos.filter(v => v.estado === 'FORMALIZADO').length
  const pendientes = vehiculos.filter(v => v.estado === 'PENDIENTE').length
  const suspendidos = vehiculos.filter(v => v.estado === 'SUSPENDIDO' || v.estado === 'BAJA').length

  const filteredVehiculos = vehiculos.filter((v) => {
    const matchesSearch =
      v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.propietario.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.organizacion.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesTipo = filterTipo === 'TODOS' || v.tipo === filterTipo
    const matchesEstado = filterEstado === 'TODOS' || v.estado === filterEstado

    return matchesSearch && matchesTipo && matchesEstado
  })

  const handleOpenCreateModal = () => {
    setFormData({
      placa: '',
      tipo: 'Mototaxi (Trimovil)',
      marca: '',
      modelo: '',
      color: '',
      anio: new Date().getFullYear(),
      numeroSerie: '',
      serieMotor: '',
      partidaRegistral: '',
      organizacion: initialOrganizaciones[0].razonSocial,
      propietario: '',
      propietarioDni: '',
      estado: 'FORMALIZADO',
      soatEstado: 'VIGENTE',
      tucNumero: `TUC-2026-${Math.floor(100 + Math.random() * 900)}`,
    })
    setIsEditing(false)
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (vehiculo) => {
    setSelectedVehiculo(vehiculo)
    setFormData({ ...vehiculo })
    setIsEditing(true)
    setIsModalOpen(true)
  }

  const handleOpenDetail = (vehiculo) => {
    setSelectedVehiculo(vehiculo)
    setIsDetailModalOpen(true)
  }

  const handleDelete = (id) => {
    if (window.confirm('¿Está seguro de eliminar este vehículo del registro?')) {
      setVehiculos(vehiculos.filter((v) => v.id !== id))
    }
  }

  const handleFormSubmit = (e) => {
    e.preventDefault()
    if (!formData.placa.trim() || !formData.propietario.trim()) {
      alert('Por favor completa los campos obligatorios (Placa y Propietario).')
      return
    }

    if (isEditing) {
      setVehiculos(vehiculos.map((v) => (v.id === selectedVehiculo.id ? { ...formData, id: v.id } : v)))
    } else {
      const newVehiculo = {
        ...formData,
        id: Date.now(),
        codigoQr: `QR-VEH-2026-${Math.floor(100 + Math.random() * 900)}`,
      }
      setVehiculos([newVehiculo, ...vehiculos])
    }
    setIsModalOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
              <Icon name="vehicle" className="size-5" />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white sm:text-3xl">
              Registro de Vehículos
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Padrón municipal de unidades de transporte público y mototaxis autorizados en JLO.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-blue-600/25 transition-all hover:-translate-y-0.5 hover:bg-blue-700 active:translate-y-0"
        >
          <span className="text-lg leading-none">+</span>
          <span>Registrar Vehículo</span>
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Unidades</span>
            <span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <Icon name="vehicle" className="size-4.5" />
            </span>
          </div>
          <p className="mt-2 text-3xl font-black text-slate-800 dark:text-white">{totalVehiculos}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Registrados en padrón municipal</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Formalizados</span>
            <span className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              ✓
            </span>
          </div>
          <p className="mt-2 text-3xl font-black text-slate-800 dark:text-white">{formalizados}</p>
          <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">Habilitados para circular</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Pendientes</span>
            <span className="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              ⏳
            </span>
          </div>
          <p className="mt-2 text-3xl font-black text-slate-800 dark:text-white">{pendientes}</p>
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400 font-medium">En proceso de evaluación</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Observados / Baja</span>
            <span className="grid size-9 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
              ⚠
            </span>
          </div>
          <p className="mt-2 text-3xl font-black text-slate-800 dark:text-white">{suspendidos}</p>
          <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">Impedidos de circular</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-[#0f172a]">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Icon name="search" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por placa, marca, modelo, propietario u organización..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-blue-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-semibold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="TODOS">Todos los tipos</option>
              <option value="Mototaxi (Trimovil)">Mototaxi (Trimovil)</option>
              <option value="Colectivo (Auto)">Colectivo (Auto)</option>
              <option value="Combi / Minivan">Combi / Minivan</option>
            </select>

            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-semibold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="FORMALIZADO">Formalizados</option>
              <option value="PENDIENTE">Pendientes</option>
              <option value="SUSPENDIDO">Suspendidos</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/70 text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3.5">Placa</th>
                <th className="px-5 py-3.5">Vehículo</th>
                <th className="px-5 py-3.5">Organización / Empresa</th>
                <th className="px-5 py-3.5">Propietario</th>
                <th className="px-5 py-3.5">SOAT / TUC</th>
                <th className="px-5 py-3.5">Estado</th>
                <th className="px-5 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredVehiculos.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-10 text-center text-slate-400">
                    No se encontraron vehículos registradas con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredVehiculos.map((v) => (
                  <tr key={v.id} className="transition hover:bg-blue-50/30 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-4">
                      <div className="inline-flex items-center gap-1.5 rounded-lg border-2 border-slate-800 bg-amber-300 px-2.5 py-1 text-xs font-black text-slate-900 shadow-xs tracking-wider">
                        <span>🇵🇪</span>
                        <span>{v.placa}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-800 dark:text-white">{v.marca} {v.modelo}</p>
                      <p className="text-xs text-slate-400">{v.tipo} · {v.color} ({v.anio})</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="max-w-xs truncate text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {v.organizacion}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{v.propietario}</p>
                      <p className="text-xs text-slate-400">DNI/RUC: {v.propietarioDni || v.propietarioRuc}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          v.soatEstado === 'VIGENTE'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                        }`}>
                          SOAT: {v.soatEstado}
                        </span>
                        <p className="text-[11px] font-mono text-slate-400">{v.tucNumero}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                        v.estado === 'FORMALIZADO'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : v.estado === 'PENDIENTE'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}>
                        <span className="size-1.5 rounded-full bg-current" />
                        {v.estado}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(v)}
                          title="Ver Ficha Técnica"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                        >
                          👁
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(v)}
                          title="Editar Vehículo"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-amber-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-amber-400"
                        >
                          ✏
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(v.id)}
                          title="Eliminar Vehículo"
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
                {isEditing ? 'Editar Registro de Vehículo' : 'Registrar Nuevo Vehículo'}
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
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Placa *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: M4X-821"
                    value={formData.placa}
                    onChange={(e) => setFormData({ ...formData, placa: e.target.value.toUpperCase() })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Tipo de Vehículo</label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="Mototaxi (Trimovil)">Mototaxi (Trimovil)</option>
                    <option value="Colectivo (Auto)">Colectivo (Auto)</option>
                    <option value="Combi / Minivan">Combi / Minivan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Marca</label>
                  <input
                    type="text"
                    placeholder="Ej: Bajaj, Toyota, TVS"
                    value={formData.marca}
                    onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Modelo</label>
                  <input
                    type="text"
                    placeholder="Ej: Torito RE 4S, Yaris"
                    value={formData.modelo}
                    onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Color</label>
                  <input
                    type="text"
                    placeholder="Ej: Azul / Blanco"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Año de Fabricación</label>
                  <input
                    type="number"
                    value={formData.anio}
                    onChange={(e) => setFormData({ ...formData, anio: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Asociación y Propietario</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Organización / Empresa</label>
                    <select
                      value={formData.organizacion}
                      onChange={(e) => setFormData({ ...formData, organizacion: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      {initialOrganizaciones.map((org) => (
                        <option key={org.id} value={org.razonSocial}>{org.razonSocial}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Nombre del Propietario *</label>
                    <input
                      type="text"
                      required
                      placeholder="Nombre completo o Razón social"
                      value={formData.propietario}
                      onChange={(e) => setFormData({ ...formData, propietario: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">DNI / RUC Propietario</label>
                    <input
                      type="text"
                      placeholder="8 u 11 dígitos"
                      value={formData.propietarioDni}
                      onChange={(e) => setFormData({ ...formData, propietarioDni: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Estado Formalización</label>
                    <select
                      value={formData.estado}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="FORMALIZADO">FORMALIZADO</option>
                      <option value="PENDIENTE">PENDIENTE</option>
                      <option value="SUSPENDIDO">SUSPENDIDO</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Estado SOAT</label>
                    <select
                      value={formData.soatEstado}
                      onChange={(e) => setFormData({ ...formData, soatEstado: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="VIGENTE">VIGENTE</option>
                      <option value="VENCIDO">VENCIDO</option>
                    </select>
                  </div>
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
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-extrabold text-white hover:bg-blue-700 shadow-md shadow-blue-600/20"
                >
                  {isEditing ? 'Guardar Cambios' : 'Registrar Vehículo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDetailModalOpen && selectedVehiculo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-enter">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 bg-[#071a2f] p-5 text-white">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">Ficha Técnica Vehicular Municipal</p>
                <h3 className="text-xl font-black">{selectedVehiculo.placa}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="rounded-lg p-1 text-slate-300 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex flex-col sm:flex-row items-center gap-6 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="grid size-28 shrink-0 place-items-center rounded-xl bg-white p-2 shadow-xs dark:bg-slate-950">
                  <div className="text-center font-mono text-[9px] text-slate-800 dark:text-slate-200">
                    <div className="size-20 border-2 border-slate-800 bg-slate-900 p-1 text-white flex flex-col justify-center items-center rounded-md">
                      <span className="text-[11px] font-black">QR OK</span>
                      <span className="text-[7px] text-cyan-300">MDJLO-2026</span>
                    </div>
                    <span className="mt-1 block font-bold text-slate-400">{selectedVehiculo.codigoQr}</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-center sm:text-left flex-1">
                  <span className="inline-block rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    {selectedVehiculo.tipo}
                  </span>
                  <h4 className="text-lg font-black text-slate-800 dark:text-white">{selectedVehiculo.marca} {selectedVehiculo.modelo}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Color: {selectedVehiculo.color} · Año: {selectedVehiculo.anio}</p>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Asociación: {selectedVehiculo.organizacion}</p>
                </div>
              </div>

              <div className="grid gap-3 text-xs sm:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/40">
                  <p className="font-bold text-slate-400 uppercase">Propietario</p>
                  <p className="mt-1 font-bold text-slate-800 dark:text-white">{selectedVehiculo.propietario}</p>
                  <p className="text-slate-500">DNI/RUC: {selectedVehiculo.propietarioDni || selectedVehiculo.propietarioRuc}</p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/40">
                  <p className="font-bold text-slate-400 uppercase">Tarjeta de Operatividad</p>
                  <p className="mt-1 font-mono font-bold text-blue-600 dark:text-blue-400">{selectedVehiculo.tucNumero}</p>
                  <p className="text-slate-500">Estado SOAT: {selectedVehiculo.soatEstado}</p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/40">
                  <p className="font-bold text-slate-400 uppercase">Serie Chasis</p>
                  <p className="mt-1 font-mono text-slate-700 dark:text-slate-300">{selectedVehiculo.numeroSerie}</p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/40">
                  <p className="font-bold text-slate-400 uppercase">Partida Registral</p>
                  <p className="mt-1 font-mono text-slate-700 dark:text-slate-300">{selectedVehiculo.partidaRegistral}</p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700"
                >
                  Cerrar Ficha
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
