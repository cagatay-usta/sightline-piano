import { describe, expect, it } from 'vitest'
import { applyNoteAttempt, createExercise, INITIAL_SESSION_STATS } from './exercise'

describe('exercise progression', () => {
  it('does not advance on a wrong note and records the attempt', () => {
    const result = applyNoteAttempt(createExercise(), INITIAL_SESSION_STATS, [60, 62], 61, 100)
    expect(result.exercise.currentIndex).toBe(0)
    expect(result.exercise.status).toBe('ready')
    expect(result.stats).toMatchObject({ notesAttempted: 1, correctNotes: 0, incorrectNotes: 1 })
  })

  it('starts on the first correct note and completes only on the last', () => {
    const first = applyNoteAttempt(createExercise(), INITIAL_SESSION_STATS, [60, 62], 60, 1_000)
    expect(first.exercise).toMatchObject({ currentIndex: 1, status: 'playing', startedAt: 1_000 })

    const last = applyNoteAttempt(first.exercise, first.stats, [60, 62], 62, 2_250)
    expect(last.didComplete).toBe(true)
    expect(last.exercise.status).toBe('complete')
    expect(last.stats).toMatchObject({ phrasesCompleted: 1, correctNotes: 2, totalCompletedTimeMs: 1_250 })
  })

  it('ignores notes after completion', () => {
    const complete = applyNoteAttempt(createExercise(), INITIAL_SESSION_STATS, [60], 60, 10)
    const ignored = applyNoteAttempt(complete.exercise, complete.stats, [60], 60, 20)
    expect(ignored.stats).toEqual(complete.stats)
  })
})
