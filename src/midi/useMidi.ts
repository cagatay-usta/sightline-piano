import { useCallback, useEffect, useRef, useState } from 'react'
import { createMidiDiagnosticBuffer } from './diagnostics'
import { midiPortName, selectMidiInput, subscribeMidiInputs, type MidiPortLike } from './inputs'

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
  const [error, setError] = useState<string | null>(null)
  const [diagnosticBuffer] = useState(createMidiDiagnosticBuffer)
  const [diagnosticsEnabled, setDiagnosticsEnabled] = useState(false)
  const [diagnostics, setDiagnostics] = useState(() => diagnosticBuffer.snapshot())
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
      .map((input) => ({ id: input.id, name: midiPortName(input) }))
    setInputs(available)
    setSelectedInputId((current) => selectMidiInput(available, current))
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
    if (!access) return
    return subscribeMidiInputs(access.inputs.values(), selectedInputId,
      (note) => onNoteRef.current(note), () => onPlayRef.current(), () => performance.now(),
      diagnosticsEnabled ? (input, role, data) => diagnosticBuffer.record(midiPortName(input), role, data, Date.now()) : undefined)
  }, [selectedInputId, inputs, diagnosticsEnabled, diagnosticBuffer])

  // Batch UI updates; MIDI clock traffic must not trigger a render for every byte.
  useEffect(() => {
    if (!diagnosticsEnabled) return
    const timer = window.setInterval(() => {
      const snapshot = diagnosticBuffer.snapshot()
      setDiagnostics((current) => current.received === snapshot.received ? current : snapshot)
    }, 200)
    return () => window.clearInterval(timer)
  }, [diagnosticsEnabled, diagnosticBuffer])

  const clearDiagnostics = useCallback(() => {
    diagnosticBuffer.clear()
    setDiagnostics(diagnosticBuffer.snapshot())
  }, [diagnosticBuffer])
  const startDiagnostics = useCallback(() => {
    clearDiagnostics()
    setDiagnosticsEnabled(true)
  }, [clearDiagnostics])
  const stopDiagnostics = useCallback(() => {
    setDiagnosticsEnabled(false)
    setDiagnostics(diagnosticBuffer.snapshot())
  }, [diagnosticBuffer])

  useEffect(() => () => {
    if (accessRef.current) accessRef.current.onstatechange = null
  }, [])

  return { supported, status, inputs, selectedInputId, setSelectedInputId, error, connect,
    diagnosticsEnabled, diagnostics, startDiagnostics, stopDiagnostics, clearDiagnostics }
}
