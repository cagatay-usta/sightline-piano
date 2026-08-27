import { parseMidiNoteOn } from './midi'

export interface NamedMidiInput { id: string; name: string }

/** Only auto-select an unambiguous control-surface port; never reserve a piano key. */
export function findTransportInput(inputs: readonly NamedMidiInput[]): string {
  const candidates = inputs.filter((input) => /\b(MCU|DAW)\b|\bMIDIIN2\b/i.test(input.name))
  return candidates.length === 1 ? candidates[0]!.id : ''
}

/** One router per subscription, shared by the piano and optional transport ports. */
export function createMidiRouter(
  noteInputId: string,
  transportInputId: string,
  onNote: (note: number) => void,
  onPlay: () => void,
) {
  let playHeld = false
  let lastPlayAt = -Infinity
  const play = (now: number) => {
    // Some controllers emit both Start and MCU Play for the same press.
    if (now - lastPlayAt < 150) return
    lastPlayAt = now
    onPlay()
  }
  return (inputId: string, data: ArrayLike<number>, now: number) => {
    const noteInput = inputId === noteInputId
    const transportInput = Boolean(transportInputId) && inputId === transportInputId
    if (!noteInput && !transportInput) return
    if (data.length === 1 && (data[0] === 0xfa || data[0] === 0xfb)) {
      play(now)
      return
    }
    // Mackie/MCU Play is note 94. Interpret it as transport ONLY on its selected port.
    if (transportInput && data.length === 3 && data[1] === 94) {
      const status = data[0] ?? 0
      const velocity = data[2] ?? -1
      if (Number.isInteger(velocity) && velocity >= 0 && velocity <= 127) {
        if ((status & 0xf0) === 0x80 || ((status & 0xf0) === 0x90 && velocity === 0)) {
          playHeld = false
          return
        }
        if ((status & 0xf0) === 0x90) {
          if (!playHeld) play(now)
          playHeld = true
          return
        }
      }
    }
    if (noteInput) {
      const note = parseMidiNoteOn(data)
      if (note !== null) onNote(note)
    }
  }
}
