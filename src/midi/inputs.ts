import { createMidiRouter } from './transport'

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

/** Diagnostic capture is exclusive: all ports are observed, no practice actions are fired. */
export function subscribeMidiInputs(
  ports: Iterable<MidiPortLike>, noteInputId: string, transportInputId: string,
  onNote: (note: number) => void, onPlay: () => void, now: () => number,
  diagnostic?: (input: MidiPortLike, role: string, data: Uint8Array) => void,
): () => void {
  const route = createMidiRouter(noteInputId, transportInputId, onNote, onPlay)
  const subscriptions = [...ports].filter((input) => input.state !== 'disconnected' &&
    (diagnostic || input.id === noteInputId || input.id === transportInputId)).map((input) => {
    const role = [input.id === noteInputId ? 'piano input' : '', input.id === transportInputId ? 'Play input' : ''].filter(Boolean).join(' + ') || 'monitor only'
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
