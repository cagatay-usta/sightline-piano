import { describe, expect, it } from 'vitest'
import { parseMidiNoteOn } from './midi'

describe('parseMidiNoteOn', () => {
  it('accepts note-on messages on any MIDI channel', () => {
    expect(parseMidiNoteOn([0x90, 60, 100])).toBe(60)
    expect(parseMidiNoteOn([0x9f, 72, 1])).toBe(72)
  })

  it('ignores velocity-zero note-on, note-off, CC, and incomplete data', () => {
    expect(parseMidiNoteOn([0x90, 60, 0])).toBeNull()
    expect(parseMidiNoteOn([0x80, 60, 100])).toBeNull()
    expect(parseMidiNoteOn([0xb0, 1, 127])).toBeNull()
    expect(parseMidiNoteOn([0x90, 60])).toBeNull()
  })
})
