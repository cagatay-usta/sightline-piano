import { describe, expect, it } from 'vitest'
import { attemptPractice, seededRandom, startPractice } from './practice'
import { presentExercise } from './exercise'
import { createMastery, noteKey } from '../learning/mastery'
import { createProgress, saveProgress, loadProgress } from '../storage/progress'

describe('practice integration', () => {
  it('evaluates a complete phrase and aggregates every attempt exactly once', () => {
    const { preferences } = createProgress()
    let state = startPractice(preferences, createMastery(), 'one', seededRandom(42))
    state = { ...state, exercise: presentExercise(state.exercise, 0) }
    const first = state.phrase.notes[0]!
    state = attemptPractice(state, first.midi + 1, 100, 1000, 'midi')
    expect(state.exercise.currentIndex).toBe(0)
    state.phrase.notes.forEach((pitch, index) => {
      state = attemptPractice(state, pitch.midi, (index + 1) * 500, 1000 + index, 'manual')
    })
    expect(state.exercise.status).toBe('complete')
    expect(state.stats).toMatchObject({ phrasesCompleted: 1, notesAttempted: 5, incorrectNotes: 1, correctNotes: 4, totalCompletedTimeMs: 2000 })
    expect(Object.values(state.mastery.notes).reduce((sum, note) => sum + note.attempts, 0)).toBe(5)
    expect(Object.values(state.mastery.intervals).reduce((sum, interval) => sum + interval.attempts, 0)).toBe(3)
    expect(state.mastery.notes[noteKey(preferences.clef, first.midi)]?.incorrectAttempts).toBe(1)
    expect(attemptPractice(state, first.midi, 3000, 4000, 'midi')).toBe(state)
  })

  it('next/skip keeps previous attempts and restarts the presentation timer', () => {
    const { preferences } = createProgress()
    let state = startPractice(preferences, createMastery(), 'one', seededRandom(42))
    state = { ...state, exercise: presentExercise(state.exercise, 0) }
    state = attemptPractice(state, state.phrase.notes[0]!.midi, 200, 1000, 'manual')
    const next = startPractice(preferences, state.mastery, 'two', seededRandom(21), state.stats)
    expect(next.stats).toBe(state.stats)
    expect(next.mastery).toBe(state.mastery)
    expect(next.exercise.startedAt).toBeNull()
    expect(next.stats.phrasesCompleted).toBe(0)
  })

  it('reset roundtrip clears both clefs and intervals, preserving settings', () => {
    const values = new Map<string, string>()
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) } }
    const preferences = { ...createProgress().preferences, clef: 'bass' as const, difficultyId: 'beginner-3' as const, phraseLength: 8 as const, adaptive: false }
    let state = startPractice(preferences, createMastery(), 'one', seededRandom(42))
    state = { ...state, exercise: presentExercise(state.exercise, 0) }
    state = attemptPractice(state, state.phrase.notes[0]!.midi, 200, 1000, 'manual')
    state = attemptPractice(state, state.phrase.notes[1]!.midi, 400, 1200, 'manual')
    state = startPractice({ ...preferences, clef: 'treble' }, state.mastery, 'treble', seededRandom(44), state.stats)
    state = { ...state, exercise: presentExercise(state.exercise, 500) }
    state = attemptPractice(state, state.phrase.notes[0]!.midi, 700, 1400, 'midi')
    state = attemptPractice(state, state.phrase.notes[1]!.midi, 900, 1600, 'midi')
    saveProgress({ version: 1, preferences, mastery: state.mastery }, storage)
    const beforeReset = loadProgress(storage).data.mastery
    expect(new Set(Object.values(beforeReset.notes).map((note) => note.clef))).toEqual(new Set(['bass', 'treble']))
    expect(new Set(Object.values(beforeReset.intervals).map((interval) => interval.clef))).toEqual(new Set(['bass', 'treble']))
    const reset = startPractice(preferences, createMastery(), 'reset', seededRandom(99))
    expect(saveProgress({ version: 1, preferences: reset.preferences, mastery: reset.mastery }, storage)).toBe(true)
    const reloaded = loadProgress(storage).data
    expect(reloaded.preferences).toEqual(preferences)
    expect(reloaded.mastery).toEqual(createMastery())
    expect(reset.stats.notesAttempted).toBe(0)
    expect(reset.exercise.currentIndex).toBe(0)
  })

  it('replaying a transition with the same seed gives the same phrase', () => {
    const { preferences } = createProgress()
    expect(startPractice(preferences, createMastery(), 'one', seededRandom(900)))
      .toEqual(startPractice(preferences, createMastery(), 'one', seededRandom(900)))
  })
})
