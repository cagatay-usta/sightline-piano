import { describe, expect, it } from 'vitest'
import { createMidiDiagnosticBuffer, describeMidiMessage, formatMidiDiagnosticLog, MIDI_LOG_LIMIT } from './diagnostics'

describe('MIDI diagnostics', () => {
  it('preserves port, selected role, timestamp, raw bytes, and decoded press/release', () => {
    const buffer = createMidiDiagnosticBuffer()
    buffer.record('KL Essential 61 mk3 MIDI', 'piano input', [0xb0, 21, 127], 0)
    buffer.record('KL Essential 61 mk3 MIDI', 'piano input', [0xb0, 21, 0], 1)
    const report = formatMidiDiagnosticLog(buffer.snapshot(), { pianoInput: 'MIDI', inputs: ['ALV', 'MIDI', 'DINTHRU', 'MCU/HUI'] })
    expect(report).toContain('1970-01-01T00:00:00.000Z | KL Essential 61 mk3 MIDI | piano input | B0 15 7F')
    expect(report).toContain('CC ch 1, controller 21, value 127')
    expect(report).toContain('CC ch 1, controller 21, value 0')
    expect(report).toContain('Current piano input: MIDI')
    expect(report).not.toContain('Current Play input:')
    expect(report).toContain('Connected inputs: ALV / MIDI / DINTHRU / MCU/HUI')
  })

  it('decodes CC and transport without assuming a CC means Play', () => {
    expect(describeMidiMessage([0xbf, 54, 127])).toBe('CC ch 16, controller 54, value 127')
    expect(describeMidiMessage([0xfa])).toBe('Start')
    expect(describeMidiMessage([0xfb])).toBe('Continue')
    expect(describeMidiMessage([0xfc])).toBe('Stop')
    expect(describeMidiMessage([0xe0, 0, 64])).toBe('Other MIDI message')
    expect(describeMidiMessage([])).toBe('Empty message')
    expect(describeMidiMessage([0x90, 94, 127])).toBe('Note on ch 1, note 94, velocity 127')
    expect(describeMidiMessage([0x90, 94, 0])).toBe('Note off ch 1, note 94, velocity 0')
  })

  it('counts heartbeat traffic without letting it crowd out Play events', () => {
    const buffer = createMidiDiagnosticBuffer()
    buffer.record('MIDI', 'piano input', [0xb0, 21, 127], 0)
    for (let i = 0; i < 500; i++) {
      buffer.record('MIDI', 'piano input', [0xf8], i)
      buffer.record('MIDI', 'piano input', [0xfe], i)
    }
    expect(buffer.snapshot()).toMatchObject({ received: 1001, hidden: 1000, discarded: 0 })
    expect(buffer.snapshot().lines).toHaveLength(1)
  })

  it('bounds event count and raw bytes, snapshots independently, and clears', () => {
    const buffer = createMidiDiagnosticBuffer()
    const empty = buffer.snapshot()
    for (let i = 0; i < MIDI_LOG_LIMIT + 5; i++) buffer.record('MIDI', 'piano input', [0x90, i % 128, 100], i)
    const snapshot = buffer.snapshot()
    expect(snapshot.lines).toHaveLength(MIDI_LOG_LIMIT)
    expect(snapshot.discarded).toBe(5)
    expect(empty.lines).toHaveLength(0)
    buffer.record('Port\nname', 'monitor only', new Uint8Array(5000).fill(0x7f), 1000)
    expect(buffer.snapshot().lines.at(-1)).toContain('Port name')
    expect(buffer.snapshot().lines.at(-1)).toContain('(5000 bytes)')
    expect(buffer.snapshot().lines.at(-1)!.length).toBeLessThan(350)
    buffer.clear()
    expect(buffer.snapshot()).toEqual({ lines: [], received: 0, hidden: 0, discarded: 0 })
    expect(snapshot.lines).toHaveLength(MIDI_LOG_LIMIT)
  })
})
