import { describe, expect, it, vi } from 'vitest'
import { subscribeMidiInputs, type MidiPortLike } from './inputs'
import { createMidiDiagnosticBuffer } from './diagnostics'

function port(id: string, state: 'connected' | 'disconnected' = 'connected'): MidiPortLike {
  return { id, name: id, state, onmidimessage: null }
}
function send(input: MidiPortLike, data: number[]) { input.onmidimessage?.({ data: new Uint8Array(data) }) }

describe('MIDI subscriptions', () => {
  it('replays the captured KeyLab sequence: four piano notes and three Play presses', () => {
    const keys = port('KL Essential 61 mk3 MIDI'), control = port('KL Essential 61 mk3 MCU/HUI')
    const note = vi.fn(), play = vi.fn()
    let time = 0
    const cleanup = subscribeMidiInputs([keys, control], keys.id, control.id, note, play, () => time)
    const capture: Array<[number, number[]]> = [
      [0, [0x90, 0x41, 0x46]], [343, [0x90, 0x43, 0x54]],
      [416, [0x80, 0x41, 0]], [655, [0x80, 0x43, 0]],
      [669, [0x90, 0x45, 0x4c]], [983, [0x90, 0x47, 0x3e]],
      [1006, [0x80, 0x45, 0]], [1229, [0x80, 0x47, 0]],
      [5031, [0xb0, 0x15, 0x7f]], [5302, [0xb0, 0x15, 0]],
      [10766, [0xb0, 0x15, 0x7f]], [10899, [0xb0, 0x15, 0]],
      [12299, [0xb0, 0x15, 0x7f]], [12423, [0xb0, 0x15, 0]],
    ]
    for (const [at, data] of capture) { time = at; send(keys, data) }
    expect(note.mock.calls).toEqual([[65], [67], [69], [71]])
    expect(play).toHaveBeenCalledTimes(3)
    cleanup()
  })

  it('supports KeyLab CC Play without a separate MCU port, but not during diagnostics', () => {
    const keys = port('KL Essential 61 mk3 MIDI'), note = vi.fn(), play = vi.fn(), diagnostic = vi.fn()
    const stop = subscribeMidiInputs([keys], keys.id, '', note, play, () => 0, diagnostic)
    send(keys, [0xb0, 21, 127])
    send(keys, [0xb0, 21, 0])
    expect(diagnostic).toHaveBeenCalledTimes(2)
    expect(play).not.toHaveBeenCalled()
    stop()
    const cleanup = subscribeMidiInputs([keys], keys.id, '', note, play, () => 1000)
    send(keys, [0xb0, 21, 127])
    expect(play).toHaveBeenCalledOnce()
    expect(note).not.toHaveBeenCalled()
    cleanup()
  })

  it('normally subscribes only to the chosen piano/Play ports and cleans up', () => {
    const keys = port('MIDI'), control = port('MCU/HUI'), alv = port('ALV')
    const note = vi.fn(), play = vi.fn()
    const cleanup = subscribeMidiInputs([keys, control, alv], keys.id, control.id, note, play, () => 1000)
    expect(alv.onmidimessage).toBeNull()
    send(keys, [0x90, 60, 127])
    send(control, [0x90, 94, 127])
    expect(note.mock.calls).toEqual([[60]])
    expect(play).toHaveBeenCalledOnce()
    cleanup()
    expect(keys.onmidimessage).toBeNull()
    expect(control.onmidimessage).toBeNull()
  })

  it('records every connected port without scoring or advancing, then restores normal routing', () => {
    const keys = port('MIDI'), control = port('MCU/HUI'), alv = port('ALV'), din = port('DINTHRU'), disconnected = port('gone', 'disconnected')
    const ports = [keys, control, alv, din, disconnected]
    const note = vi.fn(), play = vi.fn(), buffer = createMidiDiagnosticBuffer()
    const stop = subscribeMidiInputs(ports, keys.id, control.id, note, play, () => 1000,
      (input, role, data) => buffer.record(input.name!, role, data, 0))
    send(keys, [0x90, 60, 127])
    send(control, [0x90, 94, 127])
    send(alv, [0xb0, 54, 127])
    send(din, [0xfa])
    expect(disconnected.onmidimessage).toBeNull()
    expect(buffer.snapshot().received).toBe(4)
    expect(buffer.snapshot().lines[2]).toContain('ALV | monitor only | B0 36 7F')
    expect(note).not.toHaveBeenCalled()
    expect(play).not.toHaveBeenCalled()
    stop()
    const cleanup = subscribeMidiInputs(ports, keys.id, control.id, note, play, () => 1000)
    send(keys, [0x90, 60, 127])
    send(control, [0x90, 94, 127])
    send(alv, [0xb0, 54, 127])
    expect(note).toHaveBeenCalledOnce()
    expect(play).toHaveBeenCalledOnce()
    expect(buffer.snapshot().received).toBe(4)
    cleanup()
  })

  it('uses one handler for a shared port and does not remove a replacement handler', () => {
    const shared = port('shared'), play = vi.fn()
    const cleanup = subscribeMidiInputs([shared], shared.id, shared.id, vi.fn(), play, () => 1000)
    send(shared, [0x90, 94, 127])
    expect(play).toHaveBeenCalledOnce()
    const replacement = vi.fn()
    shared.onmidimessage = replacement
    cleanup()
    expect(shared.onmidimessage).toBe(replacement)
  })
})
