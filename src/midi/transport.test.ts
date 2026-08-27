import { describe, expect, it, vi } from 'vitest'
import { createMidiRouter, findTransportInput, supportsKeylabCcPlay } from './transport'

describe('MIDI Play routing', () => {
  it('limits CC21 auto-mapping to the known KeyLab Essential mk3 MIDI port', () => {
    expect(supportsKeylabCcPlay('KL Essential 61 mk3 MIDI')).toBe(true)
    expect(supportsKeylabCcPlay('KeyLab Essential 49 mk3 MIDI')).toBe(true)
    for (const name of ['KL Essential 61 mk3 ALV', 'KL Essential 61 mk3 MCU/HUI', 'KL Essential 61 mk3 DINTHRU', 'Other Keyboard MIDI', '']) {
      expect(supportsKeylabCcPlay(name)).toBe(false)
    }
  })

  it('advances once per CC21 press and never on release or repeated held messages', () => {
    const note = vi.fn(), play = vi.fn()
    const route = createMidiRouter('keys', 'transport', note, play, { keylabCcPlay: true })
    route('keys', [0xb0, 21, 127], 0)
    route('keys', [0xb0, 21, 127], 500)
    route('keys', [0xb0, 21, 0], 600)
    expect(play).toHaveBeenCalledTimes(1)
    route('keys', [0xb0, 21, 127], 700)
    route('keys', [0xb0, 21, 0], 800)
    expect(play).toHaveBeenCalledTimes(2)
    expect(note).not.toHaveBeenCalled()
  })

  it('ignores CC21 on unrelated ports/channels, other controls/values, and malformed messages', () => {
    const play = vi.fn()
    const disabled = createMidiRouter('keys', 'transport', vi.fn(), play)
    disabled('keys', [0xb0, 21, 127], 0)
    const route = createMidiRouter('keys', 'transport', vi.fn(), play, { keylabCcPlay: true })
    route('transport', [0xb0, 21, 127], 100)
    route('other', [0xb0, 21, 127], 200)
    for (const data of [[0xb1, 21, 127], [0xb0, 22, 127], [0xb0, 21, 64], [0xb0, 21, 0], [0xb0, 21], [0xb0, 21, 127, 0]]) {
      route('keys', data, 1000)
    }
    expect(play).not.toHaveBeenCalled()
  })

  it('coalesces CC, MCU, and Start messages for the same physical press', () => {
    const play = vi.fn()
    const route = createMidiRouter('keys', 'transport', vi.fn(), play, { keylabCcPlay: true })
    route('keys', [0xb0, 21, 127], 0)
    route('transport', [0x90, 94, 127], 10)
    route('keys', [0xfa], 20)
    route('keys', [0xb0, 21, 0], 200)
    route('transport', [0x90, 94, 0], 210)
    route('transport', [0x90, 94, 127], 500)
    route('keys', [0xb0, 21, 127], 510)
    expect(play).toHaveBeenCalledTimes(2)
  })

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
