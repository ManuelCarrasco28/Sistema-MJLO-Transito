import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ manage: true }))
vi.mock('../config/roles', () => ({ puedeEliminarRegistros: () => state.manage }))
vi.mock('../config/api', () => ({
  apiFetch: vi.fn(),
  invalidateCache: vi.fn(),
  leerMensajeError: async () => 'No se puede eliminar un procedimiento utilizado.',
}))
vi.mock('../utils/SwalUtil', () => ({ showToast: vi.fn(), showConfirm: vi.fn(async () => ({ isConfirmed: true })) }))

globalThis.React = React
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { ProcedimientosTarifas } = await import('./ProcedimientosTarifas')
const { apiFetch } = await import('../config/api')
const { showToast } = await import('../utils/SwalUtil')
let root
const row = { id: 10, codigo: 'PA-PRUEBA', nombre: 'Procedimiento de prueba', costo: '33.50', estado: 'ACTIVO', tipoTramite: 'INICIAL', usos: 0 }

beforeEach(() => {
  state.manage = true
  vi.clearAllMocks()
  apiFetch.mockImplementation(async (url, options = {}) => ({
    ok: true,
    json: async () => options.method ? { message: 'Guardado.' } : url.endsWith('/10') ? { data: { tarifas: [{ costo: '33.50', fechaInicio: '2026-01-01', estado: 'ACTIVO' }] } } : { data: [row] },
  }))
})
afterEach(() => {
  if (root) act(() => root.unmount())
  document.body.innerHTML = ''
})
async function render() {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => { root.render(<ProcedimientosTarifas />) })
  return host
}

it('muestra la tabla y permite abrir el formulario de creación', async () => {
  const host = await render()
  expect(host.querySelector('table').textContent).toContain('PA-PRUEBA')
  const button = [...host.querySelectorAll('button')].find((item) => item.textContent.includes('Nuevo procedimiento'))
  act(() => button.click())
  expect(host.querySelector('[role="dialog"]').getAttribute('aria-label')).toBe('Nuevo procedimiento')
  expect(document.getElementById('proc_codigo').value).toBe('')
  expect(document.getElementById('proc_costo').required).toBe(true)
})

it('edita con PUT y conserva el valor de la tarifa cargada', async () => {
  const host = await render()
  act(() => host.querySelector('[aria-label="Editar PA-PRUEBA"]').click())
  expect(document.getElementById('proc_codigo').value).toBe(row.codigo)
  expect(document.getElementById('proc_costo').value).toBe('33.50')
  await act(async () => host.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
  expect(apiFetch).toHaveBeenCalledWith('/catalogo-procedimientos/10', expect.objectContaining({ method: 'PUT', body: expect.objectContaining({ costo: '33.50' }) }))
  expect(host.querySelector('[role="dialog"]')).toBe(null)
})

it('muestra el historial sin modificar registros', async () => {
  const host = await render()
  await act(async () => host.querySelector('[aria-label="Ver PA-PRUEBA"]').click())
  expect(host.querySelector('[role="dialog"]').textContent).toContain('2026-01-01')
  expect(apiFetch.mock.calls.every(([, options]) => !options.method)).toBe(true)
})

it('elimina solo después de confirmar', async () => {
  const host = await render()
  await act(async () => host.querySelector('[aria-label="Eliminar PA-PRUEBA"]').click())
  expect(apiFetch).toHaveBeenCalledWith('/catalogo-procedimientos/10', { method: 'DELETE' })
  expect(host.querySelector('tbody').textContent).toContain('No se encontraron')
})

it('conserva la fila cuando el backend bloquea la eliminación', async () => {
  const host = await render()
  apiFetch.mockResolvedValueOnce({ ok: false })
  await act(async () => host.querySelector('[aria-label="Eliminar PA-PRUEBA"]').click())
  expect(host.querySelector('tbody').textContent).toContain('PA-PRUEBA')
  expect(showToast).toHaveBeenCalledWith('No se puede eliminar un procedimiento utilizado.', 'warning')
})

it('no ofrece cambios a roles de solo lectura', async () => {
  state.manage = false
  const host = await render()
  expect(host.querySelector('[aria-label="Editar PA-PRUEBA"]')).toBe(null)
  expect(host.querySelector('[aria-label="Eliminar PA-PRUEBA"]')).toBe(null)
  expect(host.textContent).not.toContain('Nuevo procedimiento')
  expect(host.querySelector('[aria-label="Ver PA-PRUEBA"]')).not.toBe(null)
})

it('muestra cinco filas por defecto y conserva colores de tema al pasar el cursor', async () => {
  apiFetch.mockResolvedValue({ ok: true, json: async () => ({ data: Array.from({ length: 12 }, (_, index) => ({ ...row, id: index + 1, codigo: 'PA-' + (index + 1) })) }) })
  const host = await render()
  const rows = host.querySelectorAll('tbody tr')
  expect(rows.length).toBe(5)
  expect(rows[0].className).toContain('hover:bg-[var(--bg-subtle)]')
  expect(rows[0].className).not.toContain('hover:bg-slate-50')
  expect(host.querySelector('[aria-label="Ver PA-6"]')).toBe(null)
})
