import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MidiDiagnostics } from './MidiDiagnostics'
import { createMidiDiagnosticBuffer } from '../midi/diagnostics'

const props = { context: { pianoInput: 'MIDI', inputs: ['ALV', 'MIDI', 'MCU/HUI'] }, onStart() {}, onStop() {}, onClear() {} }

describe('MIDI diagnostics panel', () => {
  it('explains how to capture messages and makes an empty log manually copyable', () => {
    const html = renderToStaticMarkup(<MidiDiagnostics {...props} available={false} recording={false} snapshot={createMidiDiagnosticBuffer().snapshot()} />)
    expect(html).toContain('Connect a MIDI controller')
    expect(html).toContain('disabled="">Start MIDI log')
    expect(html).toContain('textarea readOnly=""')
    expect(html).toContain('Current piano input: MIDI')
    expect(html).not.toContain('Current Play input:')
    expect(html).toContain('No non-heartbeat MIDI messages')
  })
  it('shows recording status, bounded decoded data, and the practice pause warning', () => {
    const buffer = createMidiDiagnosticBuffer()
    buffer.record('ALV', 'monitor only', [0xb0, 54, 127], 0)
    const html = renderToStaticMarkup(<MidiDiagnostics {...props} available={true} recording={true} snapshot={buffer.snapshot()} />)
    expect(html).toContain('Stop MIDI log')
    expect(html).toContain('Practice MIDI actions are paused')
    expect(html).toContain('B0 36 7F')
    expect(html).toContain('controller 54, value 127')
    expect(html).toContain('disabled="">Copy log')
  })
})
