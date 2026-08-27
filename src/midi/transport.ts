import { parseMidiNoteOn } from './midi'

export interface NamedMidiInput { id: string; name: string }

/** The CC21 mapping was observed on this controller's regular MIDI port.
 * Do not interpret an unrelated device's CC21 knob as a Play button.
 */
export function supportsKeylabCcPlay(inputName: string): boolean {
  return /\b(?:KL|KeyLab) Essential \d+ mk3 MIDI\b/i.test(inputName)
}

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
  options: { keylabCcPlay?: boolean } = {},
) {
  let playHeld = false
  let ccPlayHeld = false
  let lastPlayAt = -Infinity
  const play = (now: number) => {
    // A controller may emit multiple supported transport messages per press.
    if (now - lastPlayAt < 150) return
    lastPlayAt = now
    onPlay()
  }
  return (inputId: string, data: ArrayLike<number>, now: number) => {
    const noteInput = inputId === noteInputId
    const transportInput = Boolean(transportInputId) && inputId === transportInputId
    if (!noteInput && !transportInput) return
    // Captured KeyLab Play: B0 15 7F (press), B0 15 00 (release).
    // Channel, controller, values, device family, and input port are deliberate.
    if (options.keylabCcPlay && noteInput && data.length === 3 && data[0] === 0xb0 && data[1] === 21) {
      if (data[2] === 0) ccPlayHeld = false
      else if (data[2] === 127) {
        if (!ccPlayHeld) play(now)
        ccPlayHeld = true
      }
      return
    }
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
