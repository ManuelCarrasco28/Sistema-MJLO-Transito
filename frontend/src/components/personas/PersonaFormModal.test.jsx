import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
globalThis.React = React
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { PersonaFormModal } = await import('./PersonaFormModal')
let root
afterEach(() => { if (root) act(() => root.unmount()); document.body.innerHTML = '' })
it('presenta duplicados en rojo junto al documento y la licencia sin perder valores', () => {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  act(() => root.render(<PersonaFormModal formData={{ tipoDocumento: 'DNI', numeroDocumento: '12345678', numeroLicencia: 'B12345678' }} setFormData={vi.fn()} fieldErrors={{ numeroDocumento: 'Documento duplicado.', numeroLicencia: 'Licencia duplicada.' }} tipoDocOptions={[]} estadoCivilOptions={[]} estadoOptions={[]} onSubmit={vi.fn()} onClose={vi.fn()} />))
  for (const id of ['per_num_doc', 'per_licencia']) {
    const input = document.getElementById(id)
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(input.className).toContain('!border-red-500')
    expect(document.getElementById(input.getAttribute('aria-describedby')).textContent).toContain('duplicad')
  }
  expect(document.getElementById('per_num_doc').value).toBe('12345678')
  expect(document.getElementById('per_licencia').value).toBe('B12345678')
})
