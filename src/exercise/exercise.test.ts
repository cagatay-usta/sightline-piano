import { describe, expect, it } from 'vitest'
import { applyNoteAttempt, createExercise, presentExercise, INITIAL_SESSION_STATS, type PhraseContext } from './exercise'
import { naturalToPitch } from '../music/pitches'

const phrase: PhraseContext = {
  id: 'phrase-test', clef: 'treble', difficulty: 'beginner-1',
  notes: [naturalToPitch('C', 4), naturalToPitch('D', 4)],
}

describe('exercise progression and observations', () => {
  it('waits for a rendered staff; re-rendering does not restart timing', () => {
    const waiting = createExercise()
    expect(applyNoteAttempt(waiting, INITIAL_SESSION_STATS, phrase, 60, 100, 1000, 'midi').event).toBeNull()
    const shown = presentExercise(waiting, 100)
    expect(presentExercise(shown, 300)).toBe(shown)
    expect(shown.expectedSince).toBe(100)
  })
  it('records wrong pitches, including accidentals, without advancing or resetting latency', () => {
    const result = applyNoteAttempt(createExercise(0), INITIAL_SESSION_STATS, phrase, 61, 500, 1000, 'midi')
    expect(result.exercise).toMatchObject({ currentIndex: 0, status: 'ready', expectedSince: 0, errors: 1 })
    expect(result.stats).toMatchObject({ notesAttempted: 1, correctNotes: 0, incorrectNotes: 1 })
    expect(result.event).toMatchObject({
      phraseId: 'phrase-test', position: 0, clef: 'treble', difficulty: 'beginner-1',
      expectedMidi: 60, playedMidi: 61, correct: false, responseLatencyMs: 500,
      previousExpectedPitch: null, expectedInterval: null, timestamp: 1000, source: 'midi',
      playedPitch: { name: 'C#', octave: 4, midi: 61 },
    })
    const retry = applyNoteAttempt(result.exercise, result.stats, phrase, 60, 1200, 1700, 'midi')
    expect(retry.event?.responseLatencyMs).toBe(1200)
    expect(retry.exercise.expectedSince).toBe(1200)
  })
  it('starts total timing on appearance and completes only on the final correct note', () => {
    const first = applyNoteAttempt(createExercise(100), INITIAL_SESSION_STATS, phrase, 60, 1000, 2000, 'manual')
    expect(first.exercise).toMatchObject({ currentIndex: 1, status: 'playing', startedAt: 100 })
    expect(first.event?.responseLatencyMs).toBe(900)
    const last = applyNoteAttempt(first.exercise, first.stats, phrase, 62, 2250, 3250, 'manual')
    expect(last.didComplete).toBe(true)
    expect(last.event).toMatchObject({ position: 1, responseLatencyMs: 1250, expectedInterval: { size: 2, direction: 'ascending', semitones: 2 } })
    expect(last.stats).toMatchObject({ phrasesCompleted: 1, correctNotes: 2, totalCompletedTimeMs: 2150 })
    const ignored = applyNoteAttempt(last.exercise, last.stats, phrase, 60, 3000, 4000, 'midi')
    expect(ignored.stats).toBe(last.stats)
    expect(ignored.event).toBeNull()
  })
  it('MIDI and fallback have identical evaluation apart from source attribution', () => {
    const midi = applyNoteAttempt(createExercise(0), INITIAL_SESSION_STATS, phrase, 60, 100, 1000, 'midi')
    const manual = applyNoteAttempt(createExercise(0), INITIAL_SESSION_STATS, phrase, 60, 100, 1000, 'manual')
    expect(midi.stats).toEqual(manual.stats)
    expect({ ...midi.event, source: 'manual' }).toEqual(manual.event)
  })
  it('does not score invalid MIDI values', () => {
    for (const value of [-1, 128, NaN, 60.5]) {
      expect(applyNoteAttempt(createExercise(0), INITIAL_SESSION_STATS, phrase, value, 100, 1000, 'midi').event).toBeNull()
    }
  })
})
