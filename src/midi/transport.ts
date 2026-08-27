import { parseMidiNoteOn } from './midi'

/** The CC21 mapping was observed on this controller's regular MIDI port.
 * Do not interpret an unrelated device's CC21 knob as a Play button.
 */
export function supportsKeylabCcPlay(inputName: string): boolean {
  return /\b(?:KL|KeyLab) Essential \d+ mk3 MIDI\b/i.test(inputName)
}

/** Notes and supported Play messages share the selected piano input. */
export function createMidiRouter(
  noteInputId: string,
  onNote: (note: number) => void,
  onPlay: () => void,
  options: { keylabCcPlay?: boolean } = {},
) {
  let ccPlayHeld = false
  let lastPlayAt = -Infinity
  const play = (now: number) => {
    // A controller may emit multiple supported transport messages per press.
    if (now - lastPlayAt < 150) return
    lastPlayAt = now
    onPlay()
  }
  return (inputId: string, data: ArrayLike<number>, now: number) => {
    if (inputId !== noteInputId) return
    // Captured KeyLab Play: B0 15 7F (press), B0 15 00 (release).
    // Channel, controller, values, device family, and input port are deliberate.
    if (options.keylabCcPlay && data.length === 3 && data[0] === 0xb0 && data[1] === 21) {
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
    const note = parseMidiNoteOn(data)
    if (note !== null) onNote(note)
  }
}
