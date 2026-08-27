import { describe, expect, it } from 'vitest'
import { adaptiveWeight, noteWeightsForClef } from './adaptive'
import { createMastery, noteKey } from './mastery'

describe('adaptive weighting', () => {
  it('uses a finite capped range and a nonzero unseen baseline', () => {
    expect(adaptiveWeight()).toBe(1)
    expect(adaptiveWeight({ attempts: 1, correctAttempts: 0, incorrectAttempts: 1, successfulLatencyTotalMs: 0, lastSuccessfulLatencyMs: null })).toBeLessThan(2)
    expect(adaptiveWeight({ attempts: 100, correctAttempts: 0, incorrectAttempts: 100, successfulLatencyTotalMs: 0, lastSuccessfulLatencyMs: null })).toBeLessThanOrEqual(3)
    expect(adaptiveWeight({ attempts: Number.POSITIVE_INFINITY, correctAttempts: 0, incorrectAttempts: 0, successfulLatencyTotalMs: 0, lastSuccessfulLatencyMs: null })).toBe(1)
  })

  it('returns only the selected clef concepts', () => {
    const mastery = {
      ...createMastery(),
      notes: {
        [noteKey('treble', 60)]: { clef: 'treble' as const, midi: 60, attempts: 3, correctAttempts: 1, incorrectAttempts: 2, successfulLatencyTotalMs: 200, lastSuccessfulLatencyMs: 200 },
        [noteKey('bass', 48)]: { clef: 'bass' as const, midi: 48, attempts: 3, correctAttempts: 3, incorrectAttempts: 0, successfulLatencyTotalMs: 200, lastSuccessfulLatencyMs: 200 },
      },
    }
    const weights = noteWeightsForClef(mastery, 'treble')
    expect(Object.keys(weights)).toEqual(['60'])
    expect(weights[60]).toBeGreaterThan(1)
    expect(Number.isFinite(weights[60])).toBe(true)
  })
})
