import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useListaServidor } from './useListaServidor'
import { apiFetch } from '../config/api'

vi.mock('../config/api', () => ({ apiFetch: vi.fn() }))

describe('listados: peticiones antiguas y desmontaje', () => {
  let root, container, pendientes, resultado
  function Vista({ page = 1, activo = true }) {
    resultado = useListaServidor({ endpoint: '/prueba', page, porPagina: 5, activo })
    return createElement('div', null, resultado.filas.map(f => f.nombre).join(','))
  }
  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    pendientes = []
    apiFetch.mockReset().mockImplementation((url, opciones) => new Promise(resolve => pendientes.push({ url, signal: opciones.signal, resolve })))
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
  })
  afterEach(async () => { await act(async () => root.unmount()); container.remove() })
  const resolver = (p, nombre) => p.resolve({ ok: true, json: async () => ({ data: [{ nombre }], meta: { total: 10 } }) })

  it('cancela la página anterior y no permite que sobrescriba la nueva', async () => {
    await act(async () => root.render(createElement(Vista, { page: 1 })))
    await act(async () => root.render(createElement(Vista, { page: 2 })))
    expect(pendientes[0].signal.aborted).toBe(true)
    await act(async () => resolver(pendientes[1], 'nueva'))
    await act(async () => resolver(pendientes[0], 'antigua'))
    expect(container.textContent).toBe('nueva')
    expect(resultado.isLoading).toBe(false)
  })

  it('no consulta un listado inactivo y cancela al desactivarlo', async () => {
    await act(async () => root.render(createElement(Vista, { activo: false })))
    expect(apiFetch).not.toHaveBeenCalled()
    await act(async () => root.render(createElement(Vista)))
    await act(async () => root.render(createElement(Vista, { activo: false })))
    expect(pendientes[0].signal.aborted).toBe(true)
    expect(resultado.isLoading).toBe(false)
  })
})
