import { describe, expect, it, vi } from 'vitest'
import { createMidiRouter, findTransportInput } from './transport'

describe('MIDI Play routing', () => {
  it('detects one named transport port, not an ordinary or ambiguous input', () => {
    expect(findTransportInput([{ id: 'piano', name: 'KeyLab MIDI' }, { id: 'transport', name: 'KeyLab MCU/HUI' }])).toBe('transport')
    expect(findTransportInput([{ id: 'win', name: 'MIDIIN2 (KeyLab Essential)' }])).toBe('win')
    expect(findTransportInput([{ id: 'piano', name: 'KeyLab MIDI' }])).toBe('')
    expect(findTransportInput([{ id: 'a', name: 'DAW 1' }, { id: 'b', name: 'MCU 2' }])).toBe('')
  })

  it('handles MCU presses once, ignores releases, and keeps piano notes separate', () => {
    const note = vi.fn(), play = vi.fn()
    const route = createMidiRouter('keys', 'transport', note, play)
    route('transport', [0x90, 94, 127], 0)
    route('transport', [0x90, 94, 127], 500) // held/duplicate press
    route('transport', [0x90, 94, 0], 600)
    route('transport', [0x90, 94, 127], 700)
    route('transport', [0x80, 94, 64], 800)
    route('transport', [0x9f, 94, 100], 900) // configurable channel
    route('transport', [0x90, 60, 100], 1000)
    route('transport', [0x90, 93, 127], 1100) // Stop, not a played note
    route('keys', [0x90, 60, 100], 1200)
    route('keys', [0x90, 94, 100], 1300) // actual A#6 is never a shortcut here
    expect(play).toHaveBeenCalledTimes(3)
    expect(note.mock.calls).toEqual([[60], [94]])
  })

  it('supports Start/Continue, ignores other ports/clock/stop, and coalesces duplicate transport signals', () => {
    const note = vi.fn(), play = vi.fn()
    const route = createMidiRouter('keys', 'transport', note, play)
    route('other', [0xfa], 0)
    route('keys', [0xfa], 100)
    route('transport', [0x90, 94, 127], 110)
    route('transport', [0x90, 94, 0], 120)
    route('keys', [0xfb], 500)
    route('transport', [0xf8], 700)
    route('keys', [0xfc], 900)
    route('keys', [0xfa, 12], 1000)
    expect(play).toHaveBeenCalledTimes(2)
    expect(note).not.toHaveBeenCalled()
  })

  it('allows explicitly using one combined port without scoring transport', () => {
    const note = vi.fn(), play = vi.fn()
    const route = createMidiRouter('combined', 'combined', note, play)
    route('combined', [0x90, 94, 127], 0)
    route('combined', [0x90, 60, 127], 200)
    expect(play).toHaveBeenCalledOnce()
    expect(note.mock.calls).toEqual([[60]])
  })

  it('does not guess MCU mappings when transport is disabled or data is malformed', () => {
    const note = vi.fn(), play = vi.fn()
    const route = createMidiRouter('keys', '', note, play)
    route('keys', [0x90, 94, 100], 0)
    expect(note).toHaveBeenCalledWith(94)
    const transport = createMidiRouter('keys', 'transport', note, play)
    for (const data of [[], [0x90, 94], [0x90, 94, 128], [0xb0, 94, 127], [0x90, 94, 0]]) {
      transport('transport', data, 1000)
    }
    expect(play).not.toHaveBeenCalled()
  })
})
