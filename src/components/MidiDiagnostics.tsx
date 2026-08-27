import { useState } from 'react'
import { formatMidiDiagnosticLog, type MidiDiagnosticSnapshot, type MidiDiagnosticContext } from '../midi/diagnostics'

interface Props {
  available: boolean
  recording: boolean
  snapshot: MidiDiagnosticSnapshot
  context: MidiDiagnosticContext
  onStart: () => void
  onStop: () => void
  onClear: () => void
}

export function MidiDiagnostics({ available, recording, snapshot, context, onStart, onStop, onClear }: Props) {
  const [copyStatus, setCopyStatus] = useState('')
  const report = formatMidiDiagnosticLog(snapshot, context)
  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(report)
      setCopyStatus('Copied. Paste the log into our chat.')
    } catch {
      setCopyStatus('Select the log text below and copy it manually.')
    }
  }
  return <details className="midi-diagnostics">
    <summary>MIDI diagnostics{recording ? ' · recording' : ''}</summary>
    <p className="section-help">Connect MIDI, start the log, press and release Play once, then stop and copy the log. All connected inputs are captured, including ALV, MIDI, DINTHRU, and MCU/HUI.</p>
    <p className="section-help">While recording, MIDI notes and Play actions are paused so test presses cannot affect mastery. Stop logging and restart the phrase before practicing. Logs stay in memory only; nothing is saved or sent. SysEx permission is not requested.</p>
    <div className="diagnostic-actions">
      <button type="button" className="secondary-button" disabled={!available && !recording} onClick={() => { setCopyStatus(''); recording ? onStop() : onStart() }}>{recording ? 'Stop MIDI log' : 'Start MIDI log'}</button>
      <button type="button" className="text-button" onClick={() => { setCopyStatus(''); onClear() }}>Clear log</button>
      <button type="button" className="text-button" disabled={recording} onClick={copy}>Copy log</button>
    </div>
    {!available && <p className="section-help">Connect a MIDI controller to start capturing.</p>}
    <p className="section-help" role="status">{recording ? 'Recording all MIDI inputs. Practice MIDI actions are paused.' : 'Not recording.'} {copyStatus}</p>
    <label>Captured MIDI messages<textarea readOnly spellCheck={false} rows={8} value={report} /></label>
    <p className="section-help">Latest 100 messages, oldest first. Clock and active-sensing messages are counted but hidden. If Play adds nothing, try one piano key to check whether any input is arriving.</p>
  </details>
}
