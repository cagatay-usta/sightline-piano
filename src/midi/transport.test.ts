import { describe, expect, it, vi } from 'vitest'
import { createMidiRouter, supportsKeylabCcPlay } from './transport'

describe('MIDI Play routing', () => {
  it('limits CC21 auto-mapping to the known KeyLab Essential mk3 MIDI port', () => {
    expect(supportsKeylabCcPlay('KL Essential 61 mk3 MIDI')).toBe(true)
    expect(supportsKeylabCcPlay('KeyLab Essential 49 mk3 MIDI')).toBe(true)
    for (const name of ['KL Essential 61 mk3 ALV', 'KL Essential 61 mk3 MCU/HUI', 'KL Essential 61 mk3 DINTHRU', 'Other Keyboard MIDI', '']) {
      expect(supportsKeylabCcPlay(name)).toBe(false)
    }
  })

  it('advances once per CC21 press, never on releases or held messages', () => {
    const note = vi.fn(), play = vi.fn()
    const route = createMidiRouter('keys', note, play, { keylabCcPlay: true })
    route('keys', [0xb0, 21, 127], 0)
    route('keys', [0xb0, 21, 127], 500)
    route('keys', [0xb0, 21, 0], 600)
    expect(play).toHaveBeenCalledTimes(1)
    route('keys', [0xb0, 21, 127], 700)
    route('keys', [0xb0, 21, 0], 800)
    expect(play).toHaveBeenCalledTimes(2)
    expect(note).not.toHaveBeenCalled()
  })

  it('ignores unrelated ports, channels, controls, values, and malformed messages', () => {
    const play = vi.fn()
    createMidiRouter('keys', vi.fn(), play)('keys', [0xb0, 21, 127], 0)
    const route = createMidiRouter('keys', vi.fn(), play, { keylabCcPlay: true })
    route('other', [0xb0, 21, 127], 200)
    for (const data of [[0xb1, 21, 127], [0xb0, 22, 127], [0xb0, 21, 64], [0xb0, 21, 0], [0xb0, 21], [0xb0, 21, 127, 0]]) {
      route('keys', data, 1000)
    }
    expect(play).not.toHaveBeenCalled()
  })

  it('supports Start/Continue and coalesces duplicate CC/Start signals', () => {
    const note = vi.fn(), play = vi.fn()
    const route = createMidiRouter('keys', note, play, { keylabCcPlay: true })
    route('other', [0xfa], 0)
    route('keys', [0xb0, 21, 127], 100)
    route('keys', [0xfa], 110)
    route('keys', [0xb0, 21, 0], 120)
    route('keys', [0xfb], 500)
    route('keys', [0xf8], 700)
    route('keys', [0xfc], 900)
    route('keys', [0xfa, 12], 1000)
    expect(play).toHaveBeenCalledTimes(2)
    expect(note).not.toHaveBeenCalled()
  })

  it('never interprets note 94 as MCU Play and ignores unselected input notes', () => {
    const note = vi.fn(), play = vi.fn()
    const route = createMidiRouter('keys', note, play, { keylabCcPlay: true })
    route('MCU/HUI', [0x90, 94, 127], 0)
    route('keys', [0x90, 94, 127], 200)
    route('keys', [0x90, 94, 0], 300)
    route('keys', [0x90, 60, 100], 400)
    route('keys', [0x80, 60, 100], 500)
    expect(note.mock.calls).toEqual([[94], [60]])
    expect(play).not.toHaveBeenCalled()
  })
})
