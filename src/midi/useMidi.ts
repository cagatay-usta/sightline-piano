import { useCallback, useEffect, useRef, useState } from 'react'
import { createMidiRouter, findTransportInput } from './transport'

interface MidiMessageLike extends Event { data: Uint8Array }
interface MidiPortLike {
  id: string
  name?: string | null
  manufacturer?: string | null
  state?: 'connected' | 'disconnected'
  onmidimessage: ((event: MidiMessageLike) => void) | null
}
interface MidiAccessLike {
  inputs: Map<string, MidiPortLike>
  onstatechange: ((event: Event) => void) | null
}

export interface MidiInputOption { id: string; name: string }
export type MidiConnectionStatus = 'unsupported' | 'idle' | 'requesting' | 'no-inputs' | 'connected' | 'error'

type MidiNavigator = Navigator & {
  requestMIDIAccess?: () => Promise<MidiAccessLike>
}

export function useMidi(onNote: (midi: number) => void, onPlay: () => void) {
  const supported = typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator
  const [status, setStatus] = useState<MidiConnectionStatus>(supported ? 'idle' : 'unsupported')
  const [inputs, setInputs] = useState<MidiInputOption[]>([])
  const [selectedInputId, setSelectedInputId] = useState('')
  // null means automatic detection; empty string explicitly disables MCU routing.
  const [transportChoice, setTransportInputId] = useState<string | null>(null)
  const transportInputId = transportChoice === null ? findTransportInput(inputs) : transportChoice
  const [error, setError] = useState<string | null>(null)
  const accessRef = useRef<MidiAccessLike | null>(null)
  const onNoteRef = useRef(onNote)
  onNoteRef.current = onNote
  const onPlayRef = useRef(onPlay)
  onPlayRef.current = onPlay

  const refreshInputs = useCallback(() => {
    const access = accessRef.current
    if (!access) return
    const available = Array.from(access.inputs.values())
      .filter((input) => input.state !== 'disconnected')
      .map((input) => ({ id: input.id, name: input.name || input.manufacturer || 'MIDI input' }))
    setInputs(available)
    const transportId = findTransportInput(available)
    setSelectedInputId((current) => available.some((item) => item.id === current) ? current
      : (available.find((item) => item.id !== transportId)?.id ?? available[0]?.id ?? ''))
    setTransportInputId((current) => current && !available.some((item) => item.id === current) ? null : current)
    setStatus(available.length > 0 ? 'connected' : 'no-inputs')
  }, [])

  const connect = useCallback(async () => {
    const requestMIDIAccess = (navigator as MidiNavigator).requestMIDIAccess
    if (!requestMIDIAccess) return
    setStatus('requesting')
    setError(null)
    try {
      const access = await requestMIDIAccess.call(navigator)
      accessRef.current = access
      access.onstatechange = refreshInputs
      refreshInputs()
    } catch (cause) {
      setStatus('error')
      setError(cause instanceof Error ? cause.message : 'MIDI permission was denied or unavailable.')
    }
  }, [refreshInputs])

  useEffect(() => {
    const access = accessRef.current
    if (!access || !selectedInputId) return
    const route = createMidiRouter(selectedInputId, transportInputId,
      (note) => onNoteRef.current(note), () => onPlayRef.current())
    const subscriptions = [...new Set([selectedInputId, transportInputId])].flatMap((id) => {
      const input = access.inputs.get(id)
      if (!input || input.state === 'disconnected') return []
      const handleMessage = (event: MidiMessageLike) => route(id, event.data, performance.now())
      input.onmidimessage = handleMessage
      return [{ input, handleMessage }]
    })
    return () => {
      for (const { input, handleMessage } of subscriptions) {
        if (input.onmidimessage === handleMessage) input.onmidimessage = null
      }
    }
  }, [selectedInputId, transportInputId, inputs])

  useEffect(() => () => {
    if (accessRef.current) accessRef.current.onstatechange = null
  }, [])

  return { supported, status, inputs, selectedInputId, setSelectedInputId, transportInputId, setTransportInputId, error, connect }
}
