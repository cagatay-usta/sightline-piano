import { midiToPitch, type Clef } from '../music/pitches'
import type { Phrase } from '../music/generatePhrase'
import type { DifficultyId } from '../music/difficulty'
import { intervalBetween } from '../music/intervals'
import type { PerformanceEvent } from './performance'

export type ExerciseStatus = 'ready' | 'playing' | 'complete'
export interface PhraseContext {
  readonly id: string
  readonly notes: Phrase
  readonly clef: Clef
  readonly difficulty: DifficultyId
}
export interface ExerciseState {
  readonly status: ExerciseStatus
  readonly currentIndex: number
  readonly startedAt: number | null
  readonly expectedSince: number | null
  readonly completedAt: number | null
  readonly errors: number
  readonly feedback: 'idle' | 'correct' | 'incorrect'
  readonly feedbackId: number
  readonly lastEvent: PerformanceEvent | null
}
export interface SessionStats {
  readonly phrasesCompleted: number
  readonly notesAttempted: number
  readonly correctNotes: number
  readonly incorrectNotes: number
  readonly totalCompletedTimeMs: number
}
export interface NoteTransition {
  readonly exercise: ExerciseState
  readonly stats: SessionStats
  readonly wasCorrect: boolean
  readonly didComplete: boolean
  readonly event: PerformanceEvent | null
}
export const INITIAL_SESSION_STATS: SessionStats = {
  phrasesCompleted: 0, notesAttempted: 0, correctNotes: 0, incorrectNotes: 0, totalCompletedTimeMs: 0,
}

export function createExercise(presentedAt: number | null = null): ExerciseState {
  return {
    status: 'ready', currentIndex: 0, startedAt: presentedAt, expectedSince: presentedAt,
    completedAt: null, errors: 0, feedback: 'idle', feedbackId: 0, lastEvent: null,
  }
}

/** Arm timing only once after successful notation rendering, never on redraw/resize. */
export function presentExercise(exercise: ExerciseState, now: number): ExerciseState {
  if (exercise.startedAt !== null || !Number.isFinite(now)) return exercise
  return { ...exercise, startedAt: now, expectedSince: now }
}

export function applyNoteAttempt(
  exercise: ExerciseState, stats: SessionStats, phrase: PhraseContext,
  playedMidi: number, now: number, timestamp: number, source: PerformanceEvent['source'],
): NoteTransition {
  const expectedPitch = phrase.notes[exercise.currentIndex]
  if (exercise.status === 'complete' || !expectedPitch || exercise.expectedSince === null ||
      !Number.isInteger(playedMidi) || playedMidi < 0 || playedMidi > 127 ||
      !Number.isFinite(now) || !Number.isFinite(timestamp)) {
    return { exercise, stats, wasCorrect: false, didComplete: false, event: null }
  }
  const correct = expectedPitch.midi === playedMidi
  const previousExpectedPitch = phrase.notes[exercise.currentIndex - 1] ?? null
  const event: PerformanceEvent = {
    expectedPitch, playedPitch: midiToPitch(playedMidi),
    expectedMidi: expectedPitch.midi, playedMidi, correct,
    responseLatencyMs: Math.max(0, now - exercise.expectedSince),
    clef: phrase.clef, phraseId: phrase.id, position: exercise.currentIndex,
    difficulty: phrase.difficulty, previousExpectedPitch,
    expectedInterval: previousExpectedPitch ? intervalBetween(previousExpectedPitch, expectedPitch) : null,
    timestamp, source,
  }
  const nextStats = {
    ...stats, notesAttempted: stats.notesAttempted + 1,
    correctNotes: stats.correctNotes + (correct ? 1 : 0),
    incorrectNotes: stats.incorrectNotes + (correct ? 0 : 1),
  }
  if (!correct) {
    return {
      exercise: { ...exercise, feedback: 'incorrect', feedbackId: exercise.feedbackId + 1, errors: exercise.errors + 1, lastEvent: event },
      stats: nextStats, wasCorrect: false, didComplete: false, event,
    }
  }
  const startedAt = exercise.startedAt ?? now
  const nextIndex = exercise.currentIndex + 1
  const didComplete = nextIndex === phrase.notes.length
  return {
    exercise: {
      status: didComplete ? 'complete' : 'playing', currentIndex: nextIndex,
      startedAt, expectedSince: now, completedAt: didComplete ? now : null,
      errors: exercise.errors, feedback: 'correct', feedbackId: exercise.feedbackId + 1, lastEvent: event,
    },
    stats: {
      ...nextStats, phrasesCompleted: nextStats.phrasesCompleted + (didComplete ? 1 : 0),
      totalCompletedTimeMs: nextStats.totalCompletedTimeMs + (didComplete ? Math.max(0, now - startedAt) : 0),
    },
    wasCorrect: true, didComplete, event,
  }
}

export function accuracy(stats: SessionStats): number {
  return stats.notesAttempted === 0 ? 100 : (stats.correctNotes / stats.notesAttempted) * 100
}
export function averagePhraseTime(stats: SessionStats): number | null {
  return stats.phrasesCompleted === 0 ? null : stats.totalCompletedTimeMs / stats.phrasesCompleted
}
