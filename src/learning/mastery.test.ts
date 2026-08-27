import { describe, expect, it } from 'vitest'
import type { PerformanceEvent } from '../exercise/performance'
import { midiToPitch } from '../music/pitches'
import { aggregateEvent, conceptAccuracy, createMastery, intervalKey, meanSuccessfulLatency, noteKey } from './mastery'

function event(overrides: Partial<PerformanceEvent> = {}): PerformanceEvent {
  return {
    expectedPitch: { name: 'C', octave: 4, midi: 60, vexFlowKey: 'c/4' },
    playedPitch: midiToPitch(60),
    expectedMidi: 60,
    playedMidi: overrides.playedMidi ?? 60,
    correct: overrides.correct ?? true,
    responseLatencyMs: overrides.responseLatencyMs ?? 250,
    clef: overrides.clef ?? 'treble',
    phraseId: 'phrase-1',
    position: 0,
    difficulty: overrides.difficulty ?? 'beginner-1',
    previousExpectedPitch: overrides.previousExpectedPitch ?? null,
    expectedInterval: overrides.expectedInterval ?? null,
    timestamp: 1,
    source: 'manual',
  }
}

describe('mastery aggregation', () => {
  it('aggregates expected notes and intervals immutably', () => {
    const initial = createMastery()
    const result = aggregateEvent(initial, event({ expectedInterval: { size: 2, direction: 'ascending', semitones: 2 } }))

    expect(initial).toEqual(createMastery())
    expect(result.notes[noteKey('treble', 60)]).toMatchObject({ attempts: 1, correctAttempts: 1, incorrectAttempts: 0 })
    expect(result.intervals[intervalKey('treble', 2, 'ascending')]).toMatchObject({ attempts: 1, correctAttempts: 1 })
    expect(meanSuccessfulLatency(result.notes[noteKey('treble', 60)]!)).toBe(250)
  })

  it('keeps retries on the same expected concept and records only successful latency', () => {
    const first = aggregateEvent(createMastery(), event({ correct: false, playedMidi: 61, responseLatencyMs: 900 }))
    const second = aggregateEvent(first, event({ correct: true, responseLatencyMs: 300 }))
    const stats = second.notes[noteKey('treble', 60)]!

    expect(stats).toMatchObject({ attempts: 2, correctAttempts: 1, incorrectAttempts: 1 })
    expect(stats.successfulLatencyTotalMs).toBe(300)
    expect(stats.lastSuccessfulLatencyMs).toBe(300)
  })

  it('separates clefs, directions, and omits the first-note interval', () => {
    let mastery = aggregateEvent(createMastery(), event({ expectedInterval: null }))
    mastery = aggregateEvent(mastery, event({ clef: 'bass', expectedInterval: { size: 3, direction: 'descending', semitones: 4 } }))
    mastery = aggregateEvent(mastery, event({ expectedInterval: { size: 3, direction: 'ascending', semitones: 4 } }))

    expect(Object.keys(mastery.intervals)).toEqual([
      intervalKey('bass', 3, 'descending'),
      intervalKey('treble', 3, 'ascending'),
    ])
    expect(conceptAccuracy(mastery.intervals[intervalKey('bass', 3, 'descending')]!)).toBe(1)
  })

  it('returns null for unattempted concepts and avoids divide-by-zero', () => {
    const empty = createMastery()
    expect(conceptAccuracy({ attempts: 0, correctAttempts: 0, incorrectAttempts: 0, successfulLatencyTotalMs: 0, lastSuccessfulLatencyMs: null })).toBeNull()
    expect(meanSuccessfulLatency({ attempts: 1, correctAttempts: 0, incorrectAttempts: 1, successfulLatencyTotalMs: 0, lastSuccessfulLatencyMs: null })).toBeNull()
    expect(empty.notes).toEqual({})
  })
})
