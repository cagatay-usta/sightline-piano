import { generatePhrase, type RandomSource } from '../music/generatePhrase'
import { getDifficulty } from '../music/difficulty'
import { aggregateEvent, type Mastery } from '../learning/mastery'
import { noteWeightsForClef } from '../learning/adaptive'
import type { ProgressPreferences } from '../storage/progress'
import { applyNoteAttempt, createExercise, INITIAL_SESSION_STATS, type ExerciseState, type PhraseContext, type SessionStats } from './exercise'
import type { PerformanceEvent } from './performance'

export interface PracticeState {
  readonly preferences: ProgressPreferences
  readonly phrase: PhraseContext
  readonly exercise: ExerciseState
  readonly stats: SessionStats
  readonly mastery: Mastery
}

/** Reproducible randomness keeps React state transitions pure when replayed in Strict Mode. */
export function seededRandom(seed: number): RandomSource {
  let value = seed >>> 0
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0
    return value / 4294967296
  }
}

/** Pure orchestration: both input sources use this path; no storage or UI effects. */
export function startPractice(
  preferences: ProgressPreferences, mastery: Mastery, id: string,
  rng?: RandomSource, stats: SessionStats = INITIAL_SESSION_STATS,
): PracticeState {
  const profile = getDifficulty(preferences.difficultyId)
  const length = profile.lengths.includes(preferences.phraseLength) ? preferences.phraseLength : profile.defaultLength
  return {
    preferences: length === preferences.phraseLength ? preferences : { ...preferences, phraseLength: length },
    phrase: {
      id, clef: preferences.clef, difficulty: profile.id,
      notes: generatePhrase({
        clef: preferences.clef, length, allowedPitches: profile.ranges[preferences.clef],
        maxInterval: profile.maxInterval, repeatProbability: profile.repeatProbability, stepWeight: profile.stepWeight,
        noteWeights: preferences.adaptive ? noteWeightsForClef(mastery, preferences.clef) : undefined, rng,
      }),
    },
    exercise: createExercise(), stats, mastery,
  }
}

export function attemptPractice(state: PracticeState, midi: number, now: number, timestamp: number, source: PerformanceEvent['source']): PracticeState {
  const result = applyNoteAttempt(state.exercise, state.stats, state.phrase, midi, now, timestamp, source)
  if (!result.event) return state
  return { ...state, exercise: result.exercise, stats: result.stats, mastery: aggregateEvent(state.mastery, result.event) }
}
