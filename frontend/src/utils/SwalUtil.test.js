import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { showToast } from './SwalUtil'

const tarjetasVisibles = () =>
  Array.from(document.querySelectorAll('.mjlo-toast-card')).filter((el) => !el.classList.contains('toast-out'))

describe('showToast anti-spam', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    vi.runAllTimers()
    vi.useRealTimers()
  })

  it('un mensaje repetido no apila tarjetas: se reinicia la existente', () => {
    for (let i = 0; i < 5; i += 1) showToast('Documento actualizado')

    expect(tarjetasVisibles()).toHaveLength(1)
  })

  it('el mensaje repetido sigue visible más tiempo que el primero', () => {
    showToast('Documento actualizado', null, 3000)
    vi.advanceTimersByTime(2500)
    showToast('Documento actualizado', null, 3000)
    vi.advanceTimersByTime(2000)

    expect(tarjetasVisibles()).toHaveLength(1)
  })

  it('mensajes distintos: nunca hay más de dos a la vez', () => {
    showToast('Primero')
    showToast('Segundo')
    showToast('Tercero')
    showToast('Cuarto')

    const textos = tarjetasVisibles().map((el) => el.querySelector('p').textContent)
    expect(textos).toEqual(['Tercero', 'Cuarto'])
  })

  it('la tarjeta se retira sola al terminar su tiempo', () => {
    showToast('Se va sola', null, 1000)
    vi.advanceTimersByTime(1100)

    expect(tarjetasVisibles()).toHaveLength(0)
  })
})
