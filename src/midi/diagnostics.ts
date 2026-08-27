export const MIDI_LOG_LIMIT = 100
const BYTE_LIMIT = 64

export interface MidiDiagnosticSnapshot {
  readonly lines: readonly string[]
  readonly received: number
  readonly hidden: number
  readonly discarded: number
}

export function describeMidiMessage(data: ArrayLike<number>): string {
  const status = data[0]
  if (status === undefined) return 'Empty message'
  if (data.length === 1) {
    const names: Record<number, string> = { 0xfa: 'Start', 0xfb: 'Continue', 0xfc: 'Stop', 0xf8: 'Timing clock', 0xfe: 'Active sensing' }
    if (names[status]) return names[status]
  }
  const channel = (status & 0x0f) + 1
  if (data.length === 3 && (status & 0xf0) === 0xb0) return `CC ch ${channel}, controller ${data[1]}, value ${data[2]}`
  if (data.length === 3 && ((status & 0xf0) === 0x90 || (status & 0xf0) === 0x80)) {
    const on = (status & 0xf0) === 0x90 && data[2] !== 0
    return `Note ${on ? 'on' : 'off'} ch ${channel}, note ${data[1]}, velocity ${data[2]}`
  }
  return status === 0xf0 ? 'System exclusive' : 'Other MIDI message'
}

/** Memory-only bounded log. Hide heartbeat traffic, but count it so activity is visible. */
export function createMidiDiagnosticBuffer() {
  let lines: string[] = []
  let received = 0, hidden = 0, discarded = 0
  return {
    record(port: string, role: string, data: ArrayLike<number>, timestamp: number) {
      received += 1
      if (data.length === 1 && (data[0] === 0xf8 || data[0] === 0xfe)) {
        hidden += 1
        return
      }
      const bytes = Array.from({ length: Math.min(data.length, BYTE_LIMIT) }, (_, index) =>
        (data[index] ?? 0).toString(16).toUpperCase().padStart(2, '0')).join(' ')
      const suffix = data.length > BYTE_LIMIT ? ` … (${data.length} bytes)` : ''
      lines.push(`${new Date(timestamp).toISOString()} | ${port.replace(/[\r\n]+/g, ' ')} | ${role} | ${bytes}${suffix} | ${describeMidiMessage(data)}`)
      if (lines.length > MIDI_LOG_LIMIT) {
        lines.shift()
        discarded += 1
      }
    },
    snapshot(): MidiDiagnosticSnapshot { return { lines: [...lines], received, hidden, discarded } },
    clear() { lines = []; received = 0; hidden = 0; discarded = 0 },
  }
}

export interface MidiDiagnosticContext {
  readonly pianoInput: string
  readonly inputs: readonly string[]
}

export function formatMidiDiagnosticLog(snapshot: MidiDiagnosticSnapshot, context?: MidiDiagnosticContext): string {
  return [
    'Sightline MIDI diagnostic capture (practice MIDI actions paused while recording)',
    ...(context ? [`Current piano input: ${context.pianoInput}`, `Connected inputs: ${context.inputs.join(' / ') || 'None'}`] : []),
    `Received: ${snapshot.received}; hidden clock/active sensing: ${snapshot.hidden}; older entries dropped: ${snapshot.discarded}`,
    'Time | Input port | Selected role at capture | Hex bytes | Decoded message',
    ...snapshot.lines,
    ...(snapshot.lines.length === 0 ? ['No non-heartbeat MIDI messages captured yet.'] : []),
  ].join('\n')
}
