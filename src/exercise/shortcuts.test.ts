import { describe, expect, it, vi } from 'vitest'
import { handlePhraseShortcut } from './shortcuts'

function space(overrides: Partial<Parameters<typeof handlePhraseShortcut>[0]> = {}) {
  return {
    code: 'Space', repeat: false, defaultPrevented: false, isComposing: false,
    altKey: false, ctrlKey: false, metaKey: false, shiftKey: false, preventDefault: vi.fn(), ...overrides,
  }
}

describe('next phrase keyboard shortcut', () => {
  it('advances once on Space and prevents scrolling', () => {
    const event = space(), next = vi.fn()
    handlePhraseShortcut(event, false, false, next)
    expect(next).toHaveBeenCalledOnce()
    expect(event.preventDefault).toHaveBeenCalledOnce()
  })

  it('prevents held-Space scrolling without generating extra phrases', () => {
    const event = space({ repeat: true }), next = vi.fn()
    handlePhraseShortcut(event, false, false, next)
    expect(next).not.toHaveBeenCalled()
    expect(event.preventDefault).toHaveBeenCalledOnce()
  })

  it('preserves native controls and does nothing during reset confirmation', () => {
    for (const [blocked, interactive] of [[true, false], [false, true], [true, true]]) {
      const event = space(), next = vi.fn()
      handlePhraseShortcut(event, blocked!, interactive!, next)
      expect(next).not.toHaveBeenCalled()
      expect(event.preventDefault).not.toHaveBeenCalled()
    }
  })

  it('ignores modifiers, composition, handled events, and other keys', () => {
    for (const overrides of [{ code: 'Enter' }, { altKey: true }, { ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { isComposing: true }, { defaultPrevented: true }]) {
      const event = space(overrides), next = vi.fn()
      handlePhraseShortcut(event, false, false, next)
      expect(next).not.toHaveBeenCalled()
      expect(event.preventDefault).not.toHaveBeenCalled()
    }
  })
})
