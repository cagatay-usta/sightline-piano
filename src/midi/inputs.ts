import { createMidiRouter, supportsKeylabCcPlay } from './transport'

export interface MidiMessageLike { data: Uint8Array }
export interface MidiPortLike {
  id: string
  name?: string | null
  manufacturer?: string | null
  state?: 'connected' | 'disconnected'
  onmidimessage: ((event: MidiMessageLike) => void) | null
}

export function midiPortName(input: MidiPortLike): string {
  return input.name || input.manufacturer || 'MIDI input'
}

/** Keep an explicit choice; otherwise prefer the known KeyLab piano/Play port. */
export function selectMidiInput(inputs: readonly { id: string; name: string }[], current: string): string {
  if (inputs.some((input) => input.id === current)) return current
  return inputs.find((input) => supportsKeylabCcPlay(input.name))?.id ?? inputs[0]?.id ?? ''
}

/** Diagnostic capture is exclusive: all ports are observed, no practice actions are fired. */
export function subscribeMidiInputs(
  ports: Iterable<MidiPortLike>, noteInputId: string,
  onNote: (note: number) => void, onPlay: () => void, now: () => number,
  diagnostic?: (input: MidiPortLike, role: string, data: Uint8Array) => void,
): () => void {
  const available = [...ports]
  const pianoInput = available.find((input) => input.id === noteInputId)
  const route = createMidiRouter(noteInputId, onNote, onPlay,
    { keylabCcPlay: supportsKeylabCcPlay(pianoInput?.name ?? '') })
  const subscriptions = available.filter((input) => input.state !== 'disconnected' &&
    (diagnostic || input.id === noteInputId)).map((input) => {
    const role = input.id === noteInputId ? 'piano input' : 'monitor only'
    const handleMessage = (event: MidiMessageLike) => {
      if (diagnostic) diagnostic(input, role, event.data)
      else route(input.id, event.data, now())
    }
    input.onmidimessage = handleMessage
    return { input, handleMessage }
  })
  return () => {
    for (const { input, handleMessage } of subscriptions) {
      if (input.onmidimessage === handleMessage) input.onmidimessage = null
    }
  }
}
