import type { Clef } from '../music/pitches'
import type { PerformanceEvent } from '../exercise/performance'

export interface ConceptStats {
  readonly attempts: number
  readonly correctAttempts: number
  readonly incorrectAttempts: number
  readonly successfulLatencyTotalMs: number
  readonly lastSuccessfulLatencyMs: number | null
}

export interface NoteMastery extends ConceptStats {
  readonly clef: Clef
  readonly midi: number
}

export interface IntervalMastery extends ConceptStats {
  readonly clef: Clef
  readonly size: number
  readonly direction: 'ascending' | 'descending' | 'unison'
}

export interface Mastery {
  readonly notes: Record<string, NoteMastery>
  readonly intervals: Record<string, IntervalMastery>
}

const EMPTY_STATS: ConceptStats = {
  attempts: 0,
  correctAttempts: 0,
  incorrectAttempts: 0,
  successfulLatencyTotalMs: 0,
  lastSuccessfulLatencyMs: null,
}

/** Create an empty aggregate. Aggregates contain no event log or other raw data. */
export function createMastery(): Mastery {
  return { notes: {}, intervals: {} }
}

/** Stable key for a note concept. The clef is intentionally part of the key. */
export function noteKey(clef: Clef, midi: number): string {
  return `${clef}:${midi}`
}

/** Stable key for an interval concept. Direction and clef are distinct concepts. */
export function intervalKey(
  clef: Clef,
  size: number,
  direction: IntervalMastery['direction'],
): string {
  return `${clef}:${size}:${direction}`
}

function successfulLatency(event: PerformanceEvent): number {
  return Number.isFinite(event.responseLatencyMs) && event.responseLatencyMs >= 0
    ? event.responseLatencyMs
    : 0
}

function addAttempt(stats: ConceptStats, correct: boolean, latencyMs: number): ConceptStats {
  return {
    attempts: stats.attempts + 1,
    correctAttempts: stats.correctAttempts + (correct ? 1 : 0),
    incorrectAttempts: stats.incorrectAttempts + (correct ? 0 : 1),
    successfulLatencyTotalMs: stats.successfulLatencyTotalMs + (correct ? latencyMs : 0),
    lastSuccessfulLatencyMs: correct ? latencyMs : stats.lastSuccessfulLatencyMs,
  }
}

/**
 * Aggregate one normalized attempt without mutating the previous aggregate.
 * Every attempt belongs to its expected note; an interval is added only when
 * the event has an expected interval (the first note in a phrase does not).
 */
export function aggregateEvent(mastery: Mastery, event: PerformanceEvent): Mastery {
  const noteConcept = mastery.notes[noteKey(event.clef, event.expectedMidi)]
  const noteStats = noteConcept ?? EMPTY_STATS
  const nextNote: NoteMastery = {
    clef: event.clef,
    midi: event.expectedMidi,
    ...addAttempt(noteStats, event.correct, successfulLatency(event)),
  }
  const notes = { ...mastery.notes, [noteKey(event.clef, event.expectedMidi)]: nextNote }

  if (event.expectedInterval === null) return { notes, intervals: { ...mastery.intervals } }

  const { size, direction } = event.expectedInterval
  const key = intervalKey(event.clef, size, direction)
  const intervalConcept = mastery.intervals[key]
  const intervalStats = intervalConcept ?? EMPTY_STATS
  const nextInterval: IntervalMastery = {
    clef: event.clef,
    size,
    direction,
    ...addAttempt(intervalStats, event.correct, successfulLatency(event)),
  }

  return { notes, intervals: { ...mastery.intervals, [key]: nextInterval } }
}

/** Return a ratio in [0, 1], or null when the concept has not been attempted. */
export function conceptAccuracy(stats: ConceptStats): number | null {
  return stats.attempts > 0 ? stats.correctAttempts / stats.attempts : null
}

/** Return the mean latency of successful attempts, or null without successes. */
export function meanSuccessfulLatency(stats: ConceptStats): number | null {
  return stats.correctAttempts > 0
    ? stats.successfulLatencyTotalMs / stats.correctAttempts
    : null
}
