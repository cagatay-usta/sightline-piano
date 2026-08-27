import { describe, expect, it, vi } from 'vitest'
import { subscribeMidiInputs, type MidiPortLike } from './inputs'
import { createMidiDiagnosticBuffer } from './diagnostics'

function port(id: string, state: 'connected' | 'disconnected' = 'connected'): MidiPortLike {
  return { id, name: id, state, onmidimessage: null }
}
function send(input: MidiPortLike, data: number[]) { input.onmidimessage?.({ data: new Uint8Array(data) }) }

describe('MIDI subscriptions', () => {
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
