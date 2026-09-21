import { useState, useEffect } from 'react'
import { Icon } from '../components/ui/Icon'
import { Pagination } from '../components/ui/Pagination'
import { apiFetch, getCachedData, setCachedData } from '../config/api'
import { BoletaInternamientoPrint } from '../components/retenciones/BoletaInternamientoPrint'
import { OrdenLibertadPrint } from '../components/retenciones/OrdenLibertadPrint'
import { exportToExcel } from '../utils/exportToExcel'

export function Retenciones() {
  const cached = getCachedData('/internamientos')
  const [internamientos, setInternamientos] = useState(cached || [])
  const [isLoading, setIsLoading] = useState(!cached)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEstado, setFilterEstado] = useState('TODOS')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(8)
  const [selectedItem, setSelectedItem] = useState(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [printLayout, setPrintLayout] = useState('FICHA')

  useEffect(() => {
    apiFetch('/internamientos')
      .then((res) => res.json())
      .then((res) => {
        const rows = res.data || []
        setInternamientos(rows)
        setCachedData('/internamientos', rows)
        setIsLoading(false)
      })
      .catch(() => {
        setIsLoading(false)
      })
  }, [])

  const totalInternados = internamientos.length
  const enDeposito = internamientos.filter((i) => i.estado === 'RETENIDO').length
  const liberados = internamientos.filter((i) => i.estado === 'LIBERADO').length
  const avgDias = totalInternados > 0
    ? Math.round(internamientos.reduce((acc, curr) => acc + (Number(curr.totalDias) || 0), 0) / totalInternados)
    : 0

  const filteredItems = internamientos.filter((item) => {
    const search = searchTerm.toLowerCase()
    const matchSearch =
      item.vehiculoPlaca?.toLowerCase().includes(search) ||
      item.numeroBoleta?.toLowerCase().includes(search) ||
      item.numeroPapeleta?.toLowerCase().includes(search) ||
      item.interesadoNombre?.toLowerCase().includes(search) ||
      item.interesadoDni?.toLowerCase().includes(search) ||
      item.deposito?.toLowerCase().includes(search)

    const matchEstado = filterEstado === 'TODOS' || item.estado === filterEstado

    return matchSearch && matchEstado
  })

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterEstado])

  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handleExportExcel = () => {
    exportToExcel({
      filename: `Internamientos_Deposito_${new Date().toISOString().slice(0, 10)}.xls`,
      sheetName: 'Internamientos',
      title: 'REGISTRO DE INTERNAMIENTOS EN DEPÓSITO MUNICIPAL DE VEHÍCULOS',
      subtitle: 'Subgerencia de Tránsito y Transporte - Custodia y Órdenes de Libertad',
      metadata: [
        { label: 'Estado', value: filterEstado },
        { label: 'Total Registros', value: String(filteredItems.length) }
      ],
      columns: [
        { header: 'N° BOLETA', key: 'numeroBoleta', isText: true, width: 130, align: 'center' },
        { header: 'DEPÓSITO', key: 'deposito', width: 160 },
        { header: 'PLACA', key: 'vehiculoPlaca', isText: true, width: 110, align: 'center' },
        { header: 'TIPO VEHÍCULO', key: 'vehiculoTipo', width: 140 },
        { header: 'PAPELETA ASOCIADA', render: (_, i) => i.numeroPapeleta || '—', isText: true, width: 130, align: 'center' },
        { header: 'MOTIVO INTERNAMIENTO', key: 'motivoIngreso', width: 220 },
        { header: 'CONDUCTOR / INTERESADO', key: 'interesadoNombre', width: 180 },
        { header: 'DNI CONDUCTOR', key: 'interesadoDni', isText: true, width: 110, align: 'center' },
        { header: 'FECHA INGRESO', render: (_, i) => `${i.fechaIngreso || ''} ${i.horaIngreso || ''}`.trim(), width: 130, align: 'center' },
        { header: 'DÍAS RETENIDO', render: (_, i) => String(i.totalDias || 0), width: 100, align: 'center' },
        { header: 'FECHA LIBERACIÓN', render: (_, i) => i.fechaLiberacion || 'EN CUSTODIA', width: 130, align: 'center' },
        { header: 'ESTADO', key: 'estado', width: 110, align: 'center' }
      ],
      data: filteredItems
    })
  }

  const handleOpenDetail = (item) => {
    setSelectedItem(item)
    setIsDetailModalOpen(true)
  }

  const handlePrint = (layout) => {
    setPrintLayout(layout)
    setTimeout(() => {
      window.print()
      setPrintLayout('FICHA')
    }, 100)
  }

  const getStatusBadge = (estado) => {
    if (estado === 'RETENIDO') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-black text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
          <span className="size-1.5 rounded-full bg-rose-500 animate-pulse" />
          EN DEPÓSITO
        </span>
      )
    }
    if (estado === 'LIBERADO') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-black text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          LIBERADO
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-black text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
        {estado}
      </span>
    )
  }

  const getItemStateColor = (estado) => {
    if (estado === 'BUENO') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
    if (estado === 'REGULAR') return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800'
    if (estado === 'MALO') return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800'
    return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="flex items-center gap-3.5">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-rose-600 to-orange-600 text-white shadow-lg shadow-rose-500/30">
            <Icon name="retention" className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Internamientos Vehiculares
            </h1>
            <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              Control de depósito municipal, actas de internamiento, inventario de custodia y órdenes de libertad.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-horizon dark:shadow-none transition hover:bg-slate-50 dark:border-slate-800 dark:bg-[#111C44] dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Icon name="print" className="size-4 text-slate-500" />
            <span>Imprimir Resumen</span>
          </button>
          <span className="rounded-xl border border-rose-200/80 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 shadow-xs dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
            Depósito Oficial N° 1
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 print:hidden">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-horizon dark:shadow-none dark:border-slate-800/80 dark:bg-[#111C44]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Internamientos
            </span>
            <span className="grid size-8 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Icon name="retention" className="size-4.5" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {totalInternados}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Registros históricos de custodia
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-horizon dark:shadow-none dark:border-slate-800/80 dark:bg-[#111C44]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              En Depósito
            </span>
            <span className="grid size-8 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
              <Icon name="lock" className="size-4.5" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black tracking-tight text-rose-600 dark:text-rose-400">
            {enDeposito}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Vehículos bajo custodia activa
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-horizon dark:shadow-none dark:border-slate-800/80 dark:bg-[#111C44]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Liberados
            </span>
            <span className="grid size-8 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <Icon name="check" className="size-4.5" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
            {liberados}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Con orden de entrega formal
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-horizon dark:shadow-none dark:border-slate-800/80 dark:bg-[#111C44]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Días Promedio
            </span>
            <span className="grid size-8 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <Icon name="clock" className="size-4.5" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {avgDias} días
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Permanencia en depósito
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-horizon dark:shadow-none dark:border-slate-800 dark:bg-[#111C44] sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="relative flex-1 max-w-md">
          <Icon name="search" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por placa, boleta, papeleta o conductor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/10 dark:border-slate-800 dark:bg-[#111C44]/60 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-rose-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Estado:</span>
          {['TODOS', 'RETENIDO', 'LIBERADO'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterEstado(st)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                filterEstado === st
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-[#111C44]/60 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {st === 'TODOS' ? 'Todos' : st === 'RETENIDO' ? 'En Depósito' : 'Liberados'}
            </button>
          ))}

          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-1.5 text-xs font-extrabold text-emerald-700 shadow-2xs hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
            title="Descargar registro de internamientos en Excel"
          >
            <Icon name="table" className="size-4" />
            <span>Exportar Excel</span>
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-horizon dark:shadow-none dark:border-slate-800 dark:bg-[#111C44] print:hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-[#111C44]/60 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3.5">Boleta / Depósito</th>
                <th className="px-4 py-3.5">Vehículo & Placa</th>
                <th className="px-4 py-3.5">Motivo / Infracción</th>
                <th className="px-4 py-3.5">Interesado / Conductor</th>
                <th className="px-4 py-3.5">Ingreso & Custodia</th>
                <th className="px-4 py-3.5">Estado</th>
                <th className="px-4 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Cargando internamientos...
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No se encontraron registros de internamiento con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3.5">
                      <div className="font-extrabold text-slate-900 dark:text-white">
                        {item.numeroBoleta || `BOL-DEP-${String(item.id).padStart(4, '0')}`}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-400 truncate max-w-[180px]" title={item.deposito}>
                        {item.deposito || 'Depósito Municipal'}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black tracking-wider text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                          {item.vehiculoPlaca}
                        </span>
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                            item.vehiculoFormalidad === 'FORMAL'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                          }`}
                        >
                          {item.vehiculoFormalidad}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        {item.vehiculoMarca} {item.vehiculoModelo} ({item.vehiculoColor})
                      </div>
                    </td>

                    <td className="px-4 py-3.5 max-w-[220px]">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={item.motivo}>
                        {item.motivo}
                      </div>
                      {item.numeroPapeleta && (
                        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-rose-600 dark:text-rose-400">
                          <Icon name="ticket" className="size-3.5" />
                          <span>{item.numeroPapeleta}</span>
                          <span className="font-bold">S/ {Number(item.montoPapeleta).toFixed(2)}</span>
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {item.interesadoNombre}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-400">
                        DNI: {item.interesadoDni}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="text-slate-800 dark:text-slate-200 font-medium">
                        {item.fechaIngreso ? new Date(item.fechaIngreso).toLocaleDateString('es-PE') : 'S/F'}
                      </div>
                      <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                        <Icon name="clock" className="size-3" />
                        <span>{item.totalDias} días en custodia</span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      {getStatusBadge(item.estado)}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(item)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-horizon dark:shadow-none transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:border-slate-800 dark:bg-[#111C44]/60 dark:text-slate-300 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
                          title="Ver Ficha e Inventario"
                        >
                          <Icon name="eye" className="size-3.5" />
                          <span>Inventario</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="print:hidden">
          <Pagination
            currentPage={currentPage}
            totalItems={filteredItems.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(size) => {
              setItemsPerPage(size)
              setCurrentPage(1)
            }}
          />
        </div>
      </div>

      {isDetailModalOpen && selectedItem && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto ${printLayout === 'FICHA' ? 'print:static print:block print:p-0 print:bg-transparent print:overflow-visible' : 'print:hidden'}`}>
          <div id={printLayout === 'FICHA' ? "seccion-impresion-ticket" : undefined} className={`relative w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#111C44] my-8 max-h-[90vh] flex flex-col ${printLayout === 'FICHA' ? 'print:shadow-none print:border-none print:m-0 print:p-0 print:max-h-none print:overflow-visible print:max-w-full' : ''}`}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
                  <Icon name="retention" className="size-5" />
                </span>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Acta de Internamiento e Inventario Vehicular
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Boleta N° {selectedItem.numeroBoleta} • Depósito Municipal Oficial
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 print:hidden"
              >
                <Icon name="close" className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-[#111C44]/40">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Vehículo Retenido
                  </span>
                  <p className="mt-1 font-mono text-base font-black text-slate-900 dark:text-white">
                    {selectedItem.vehiculoPlaca}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {selectedItem.vehiculoMarca} {selectedItem.vehiculoModelo} ({selectedItem.vehiculoColor})
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-500">
                    Carrocería: {selectedItem.estadoCarroceria || 'Sin registrar'}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-[#111C44]/40">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Motivo & Infracción
                  </span>
                  <p className="mt-1 text-xs font-extrabold text-slate-900 dark:text-white">
                    {selectedItem.motivo}
                  </p>
                  {selectedItem.numeroPapeleta && (
                    <p className="mt-1 text-xs font-bold text-rose-600 dark:text-rose-400">
                      Papeleta: {selectedItem.numeroPapeleta} (S/ {Number(selectedItem.montoPapeleta).toFixed(2)})
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-slate-500">
                    Autoridad: {selectedItem.autoridadQueDispone}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-[#111C44]/40">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Intervinientes & Estado
                  </span>
                  <p className="mt-1 text-xs font-bold text-slate-900 dark:text-white">
                    Remisor: {selectedItem.remisorNombre}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Interesado: {selectedItem.interesadoNombre} (DNI: {selectedItem.interesadoDni})
                  </p>
                  <div className="mt-2">
                    {getStatusBadge(selectedItem.estado)}
                  </div>
                </div>
              </div>

              {selectedItem.estado === 'LIBERADO' && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                    <Icon name="check" className="size-5" />
                    <h4 className="font-extrabold text-sm">Vehículo Liberado - Orden de Salida</h4>
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                    <p>
                      <strong>N° Orden de Libertad:</strong> {selectedItem.numeroOrdenLibertad || 'S/N'}
                    </p>
                    <p>
                      <strong>Fecha de Salida:</strong> {selectedItem.fechaLiberacion ? new Date(selectedItem.fechaLiberacion).toLocaleDateString('es-PE') : 'Registrado'}
                    </p>
                    <p>
                      <strong>Liquidación Pagada:</strong> S/ {Number(selectedItem.montoTotalLiberacion || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Inventario de Partes, Componentes y Accesorios
                  </h4>
                  <span className="text-xs font-bold text-slate-500">
                    Total evaluados: {selectedItem.inventario?.length || 0} ítems
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200 overflow-hidden dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/80 text-[10px] font-extrabold uppercase text-slate-600 dark:bg-[#111C44] dark:text-slate-400">
                      <tr>
                        <th className="px-3.5 py-2.5">Código</th>
                        <th className="px-3.5 py-2.5">Componente / Criterio</th>
                        <th className="px-3.5 py-2.5">Sección</th>
                        <th className="px-3.5 py-2.5 text-center">Cant.</th>
                        <th className="px-3.5 py-2.5 text-center">Estado Físico</th>
                        <th className="px-3.5 py-2.5">Observación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-[#111C44]">
                      {(!selectedItem.inventario || selectedItem.inventario.length === 0) ? (
                        <tr>
                          <td colSpan={6} className="px-3.5 py-4 text-center text-slate-400">
                            No hay detalle de inventario registrado para esta orden.
                          </td>
                        </tr>
                      ) : (
                        selectedItem.inventario.map((inv, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="px-3.5 py-2 font-mono text-[11px] font-bold text-slate-500">
                              {inv.codigo}
                            </td>
                            <td className="px-3.5 py-2 font-semibold text-slate-800 dark:text-slate-200">
                              {inv.nombre}
                            </td>
                            <td className="px-3.5 py-2">
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                {inv.seccion}
                              </span>
                            </td>
                            <td className="px-3.5 py-2 text-center font-bold text-slate-700 dark:text-slate-300">
                              {inv.cantidad}
                            </td>
                            <td className="px-3.5 py-2 text-center">
                              <span className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-extrabold ${getItemStateColor(inv.estado)}`}>
                                {inv.estado}
                              </span>
                            </td>
                            <td className="px-3.5 py-2 text-slate-500 dark:text-slate-400 text-[11px]">
                              {inv.observacion || '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedItem.observaciones && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3.5 dark:border-slate-800 dark:bg-[#111C44]/30">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Observaciones Generales de Internamiento
                  </span>
                  <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">
                    {selectedItem.observaciones}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800 print:hidden">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => handlePrint('FICHA')}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-800 dark:bg-[#111C44] dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Icon name="print" className="size-4" />
                  <span>Imprimir Ficha</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePrint('INTERNAMIENTO')}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-50 text-blue-700 px-4 py-2 text-xs font-bold hover:bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-800/40 transition"
                >
                  <Icon name="print" className="size-4" />
                  <span>Orden de Internamiento</span>
                </button>

                {selectedItem.estado === 'LIBERADO' && (
                  <button
                    type="button"
                    onClick={() => handlePrint('LIBERTAD')}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 text-emerald-700 px-4 py-2 text-xs font-bold hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-800/40 transition"
                  >
                    <Icon name="print" className="size-4" />
                    <span>Orden de Libertad</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {printLayout === 'INTERNAMIENTO' && selectedItem && (
        <BoletaInternamientoPrint item={selectedItem} />
      )}
      {printLayout === 'LIBERTAD' && selectedItem && (
        <OrdenLibertadPrint item={selectedItem} />
      )}
    </div>
  )
}
