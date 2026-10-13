import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '../config/api'
import { showError, showToast } from '../utils/SwalUtil'

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))
vi.mock('../config/api', () => ({ apiFetch: vi.fn(), getCachedData: () => null, setCachedData: vi.fn(), sanitizarMensaje: m => m, leerMensajeError: async () => 'Registro vinculado.' }))
vi.mock('../utils/SwalUtil', () => ({ showToast: vi.fn(), showError: vi.fn(), showConfirm: async () => ({ isConfirmed: true }) }))
vi.mock('../utils/exportToExcel', () => ({ exportToExcel: vi.fn() }))
vi.mock('../utils/exportToPdf', () => ({ exportToPdf: vi.fn() }))
globalThis.IS_REACT_ACT_ENVIRONMENT = true
globalThis.React = React
const { CursosSeguridad } = await import('./CursosSeguridad')
let root
let rows
let rechazar
const curso = { id: 7, uuid: 'uuid-curso', codigo: 'CUR-TEST', titulo: 'Curso de prueba', instructor: 'JUAN PEREZ', idInstructor: 3, instructorDni: '12345678', resolucion: 'R.A. N° 001-2040-MDJLO', fecha: '2040-01-20', fechaFin: '2040-01-21', fechaInscripcionInicio: '2040-01-01', fechaInscripcionFin: '2040-01-19', horaInicio: '09:00', horaFin: '12:00', cuposTotales: 5, cuposInscritos: 0, costo: 0, estado: 'PROGRAMADO', tipo: 'SEGURIDAD_VIAL' }
beforeEach(() => {
  rows = [curso]
  rechazar = false
  vi.stubGlobal('BroadcastChannel', class { close() {} })
  apiFetch.mockImplementation(async (url, options = {}) => {
    if (options.method) {
      if (rechazar) return { ok: false, json: async () => ({ messages: { error: 'Registro vinculado.' } }) }
      if (options.method === 'DELETE') rows = []
      return { ok: true, json: async () => ({}) }
    }
    return { ok: true, json: async () => ({ data: rows, meta: { total: rows.length }, estadisticas: {} }) }
  })
})
afterEach(() => {
  if (root) act(() => root.unmount())
  root = null
  document.body.innerHTML = ''
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})
async function renderizar() {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root.render(<CursosSeguridad />))
}
async function editar() {
  await renderizar()
  await act(async () => document.querySelector('[title="Editar Curso"]').click())
  await act(async () => document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
}
describe('Cursos: botones y registro de carnet centralizado', () => {
  it('abre la lista con cursos finalizados y muestra su acceso al Centro de impresión', async () => {
    rows = [{ ...curso, estado: 'FINALIZADO' }, { ...curso, id: 8, uuid: 'uuid-programado', estado: 'PROGRAMADO' }]
    await renderizar()
    expect(document.querySelector('[title="Imprimir carnets en el Centro de impresión"]')).not.toBeNull()
    expect(document.querySelectorAll('[title="Editar Curso"]')).toHaveLength(2)
    expect(apiFetch.mock.calls.some(([url]) => url.includes('/carnets'))).toBe(false)
  })
  it('edita usando UUID y cierra solo tras guardar', async () => {
    await editar()
    expect(apiFetch).toHaveBeenCalledWith('/cursos/uuid-curso', expect.objectContaining({ method: 'PUT' }))
    expect(document.querySelector('form')).toBeNull()
    expect(showToast).toHaveBeenCalledWith('Curso editado exitosamente')
    expect(apiFetch.mock.calls.some(([url]) => url.includes('/carnets'))).toBe(false)
  })
  it('mantiene el formulario si el servidor rechaza la edición', async () => {
    rechazar = true
    await editar()
    expect(document.querySelector('form')).not.toBeNull()
    expect(showError).toHaveBeenCalled()
    expect(showToast).not.toHaveBeenCalled()
  })
  it('elimina usando UUID y actualiza la lista al confirmar el servidor', async () => {
    await renderizar()
    await act(async () => document.querySelector('[title="Eliminar Curso"]').click())
    expect(apiFetch).toHaveBeenCalledWith('/cursos/uuid-curso', { method: 'DELETE' })
    expect(document.querySelector('[title="Editar Curso"]')).toBeNull()
    expect(showToast).toHaveBeenCalledWith('Curso eliminado correctamente')
  })
})

describe('Cursos: instructor obligatorio', () => {
  it('no guarda un curso sin instructor y pide buscarlo por DNI', async () => {
    const { instructor, idInstructor, instructorDni, ...sinInstructor } = curso
    void instructor; void idInstructor; void instructorDni
    const original = { ...curso }
    Object.keys(curso).forEach((k) => delete curso[k])
    Object.assign(curso, sinInstructor)
    try {
      await editar()
      expect(apiFetch).not.toHaveBeenCalledWith('/cursos/uuid-curso', expect.objectContaining({ method: 'PUT' }))
      expect(showError).toHaveBeenCalledWith('Falta el instructor', expect.any(String))
    } finally {
      Object.assign(curso, original)
    }
  })
})
