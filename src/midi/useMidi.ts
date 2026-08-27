import { useCallback, useEffect, useRef, useState } from 'react'
import { parseMidiNoteOn } from './midi'

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

export function useMidi(onNote: (midi: number) => void) {
  const supported = typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator
  const [status, setStatus] = useState<MidiConnectionStatus>(supported ? 'idle' : 'unsupported')
  const [inputs, setInputs] = useState<MidiInputOption[]>([])
  const [selectedInputId, setSelectedInputId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const accessRef = useRef<MidiAccessLike | null>(null)
  const onNoteRef = useRef(onNote)
  onNoteRef.current = onNote

  const refreshInputs = useCallback(() => {
    const access = accessRef.current
    if (!access) return
    const available = Array.from(access.inputs.values())
      .filter((input) => input.state !== 'disconnected')
      .map((input) => ({ id: input.id, name: input.name || input.manufacturer || 'MIDI input' }))
    setInputs(available)
    setSelectedInputId((current) => available.some((item) => item.id === current) ? current : (available[0]?.id ?? ''))
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
    const input = access.inputs.get(selectedInputId)
    if (!input) {
      refreshInputs()
      return
    }
    const handleMessage = (event: MidiMessageLike) => {
      const note = parseMidiNoteOn(event.data)
      if (note !== null) onNoteRef.current(note)
    }
    input.onmidimessage = handleMessage
    return () => {
      if (input.onmidimessage === handleMessage) input.onmidimessage = null
    }
  }, [selectedInputId, inputs, refreshInputs])

  useEffect(() => () => {
    if (accessRef.current) accessRef.current.onstatechange = null
  }, [])

  return { supported, status, inputs, selectedInputId, setSelectedInputId, error, connect }
}
