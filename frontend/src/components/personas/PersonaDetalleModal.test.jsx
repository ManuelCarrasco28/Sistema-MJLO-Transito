import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'

globalThis.React = React
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { PersonaDetalleModal } = await import('./PersonaDetalleModal')

it('permite editar la persona mostrada y deja vacíos los campos sin datos', () => {
  const host = document.createElement('div')
  const root = createRoot(host)
  const persona = { id: 7, nombres: 'Ana', estado: 'ACTIVO' }
  const onEdit = vi.fn()
  try {
    act(() => root.render(<PersonaDetalleModal selectedPersona={persona} onClose={() => {}} onEdit={onEdit} />))
    expect(host.textContent).not.toContain('—')
    expect(host.textContent).not.toContain('--')
    const button = [...host.querySelectorAll('button')].find((el) => el.textContent.includes('Editar persona'))
    act(() => button.click())
    expect(onEdit).toHaveBeenCalledWith(persona)
  } finally {
    act(() => root.unmount())
  }
})
