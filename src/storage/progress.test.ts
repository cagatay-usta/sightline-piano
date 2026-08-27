import { describe, expect, it } from 'vitest'
import { aggregateEvent } from '../learning/mastery'
import { conceptAccuracy, createMastery, noteKey } from '../learning/mastery'
import { createProgress, loadProgress, saveProgress, STORAGE_KEY, type StorageLike, type StoredProgress } from './progress'
import type { PerformanceEvent } from '../exercise/performance'
import { midiToPitch } from '../music/pitches'

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>()
  writes = 0
  getItem(key: string): string | null { return this.values.get(key) ?? null }
  setItem(key: string, value: string): void { this.writes += 1; this.values.set(key, value) }
}

const sampleEvent: PerformanceEvent = {
  expectedPitch: { name: 'C', octave: 4, midi: 60, vexFlowKey: 'c/4' },
  playedPitch: midiToPitch(60),
  expectedMidi: 60,
  playedMidi: 60,
  correct: true,
  responseLatencyMs: 180,
  clef: 'treble',
  phraseId: 'p',
  position: 0,
  difficulty: 'beginner-1',
  previousExpectedPitch: null,
  expectedInterval: null,
  timestamp: 0,
  source: 'manual',
}

describe('progress persistence', () => {
  it('round-trips aggregate data and preserves preferences on reset', () => {
    const storage = new MemoryStorage()
    const original = createProgress({ clef: 'bass', difficultyId: 'beginner-3', phraseLength: 8, adaptive: false })
    const withMastery = { ...original, mastery: aggregateEvent(original.mastery, sampleEvent) }
    expect(saveProgress(withMastery, storage)).toBe(true)
    const writesAfterSave = storage.writes
    const loaded = loadProgress(storage)
    expect(loaded.notice).toBeNull()
    expect(storage.writes).toBe(writesAfterSave)
    expect(loaded.data.preferences).toEqual(withMastery.preferences)
    expect(loaded.data.mastery.notes['treble:60']?.attempts).toBe(1)

    const reset = createProgress(loaded.data.preferences)
    expect(saveProgress(reset, storage)).toBe(true)
    expect(loadProgress(storage).data.mastery).toEqual({ notes: {}, intervals: {} })
  })

  it('tracks successful and missed attempts as a half-accurate concept', () => {
    const wrong = aggregateEvent(createMastery(), { ...sampleEvent, correct: false, playedMidi: 61 })
    const result = aggregateEvent(wrong, sampleEvent)
    const stats = result.notes[noteKey('treble', 60)]
    expect(stats).toMatchObject({ attempts: 2, correctAttempts: 1, incorrectAttempts: 1 })
    expect(conceptAccuracy(stats!)).toBe(0.5)
  })

  it('recovers from malformed, old, newer, and hostile state', () => {
    const storage = new MemoryStorage()
    storage.values.set(STORAGE_KEY, '{not-json')
    expect(loadProgress(storage).notice).toMatch(/malformed/i)
    storage.values.set(STORAGE_KEY, JSON.stringify({ version: 0, preferences: { clef: 'bass', phraseLength: 8 } }))
    expect(loadProgress(storage).data.preferences).toMatchObject({ clef: 'bass', phraseLength: 8 })
    expect(loadProgress(storage).notice).toMatch(/older/i)
    storage.values.set(STORAGE_KEY, JSON.stringify({ version: 9, preferences: { difficultyId: 'beginner-4' } }))
    expect(loadProgress(storage).data.preferences.difficultyId).toBe('beginner-4')
    expect(loadProgress(storage).notice).toMatch(/newer/i)
    storage.values.set(STORAGE_KEY, '{"version":1,"__proto__":{"polluted":true}}')
    expect(loadProgress(storage).notice).toMatch(/incompatible|invalid/i)
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined()
  })

  it('migrates v0.1 preferences without writing during load and handles storage errors', () => {
    const storage = new MemoryStorage()
    storage.values.set('sightline-clef', 'bass')
    storage.values.set('sightline-phrase-length', '8')
    const result = loadProgress(storage)
    expect(result.data.preferences).toMatchObject({ clef: 'bass', phraseLength: 8, difficultyId: 'beginner-3' })
    expect(storage.values.has(STORAGE_KEY)).toBe(false)

    const blocked: StorageLike = {
      getItem: () => { throw new Error('blocked') },
      setItem: () => { throw new Error('quota') },
    }
    expect(loadProgress(blocked).data.preferences.difficultyId).toBe('beginner-1')
    expect(saveProgress(createProgress(), blocked)).toBe(false)
  })

  it('rejects malformed counters, NaN-like values, mismatched keys, bad intervals, and unsupported lengths', () => {
    const storage = new MemoryStorage()
    const valid = createProgress()
    const validWithNote = { ...valid, mastery: aggregateEvent(valid.mastery, sampleEvent) }
    expect(saveProgress(validWithNote, storage)).toBe(true)
    const raw = JSON.parse(storage.values.get(STORAGE_KEY)!) as Record<string, any>

    raw.mastery.notes['treble:60'].attempts = 3
    expect(saveProgress(raw as unknown as StoredProgress, storage)).toBe(false)

    raw.mastery.notes['treble:60'].attempts = 'NaN'
    expect(saveProgress(raw as unknown as StoredProgress, storage)).toBe(false)

    raw.mastery.notes['bass:60'] = raw.mastery.notes['treble:60']
    delete raw.mastery.notes['treble:60']
    expect(saveProgress(raw as unknown as StoredProgress, storage)).toBe(false)

    raw.mastery.notes = {}
    raw.mastery.intervals['treble:2:unison'] = {
      clef: 'treble', size: 2, direction: 'unison', attempts: 1,
      correctAttempts: 1, incorrectAttempts: 0, successfulLatencyTotalMs: 10, lastSuccessfulLatencyMs: 10,
    }
    expect(saveProgress(raw as unknown as StoredProgress, storage)).toBe(false)

    const mismatch = JSON.parse(storage.values.get(STORAGE_KEY)!) as Record<string, any>
    mismatch.preferences.difficultyId = 'beginner-1'
    mismatch.preferences.phraseLength = 8
    storage.values.set(STORAGE_KEY, JSON.stringify(mismatch))
    const recovered = loadProgress(storage)
    expect(recovered.notice).toMatch(/invalid/i)
    expect(recovered.data.preferences.phraseLength).toBe(4)
  })

  it('distinguishes missing, oversized, and unavailable storage without writing', () => {
    const missing = new MemoryStorage()
    expect(loadProgress(missing).notice).toBeNull()
    expect(missing.writes).toBe(0)

    const oversized = new MemoryStorage()
    oversized.values.set(STORAGE_KEY, 'x'.repeat(1_000_001))
    expect(loadProgress(oversized).notice).toMatch(/too large/i)
    expect(oversized.writes).toBe(0)

    const unavailable: StorageLike = {
      getItem: () => { throw new Error('blocked') },
      setItem: () => { throw new Error('quota') },
    }
    expect(loadProgress(unavailable).notice).toMatch(/unavailable/i)
    expect(saveProgress(createProgress(), unavailable)).toBe(false)
  })

  it('independently rejects inconsistent latency, keys, and interval identities on load', () => {
    const valid = createProgress()
    const mastery = aggregateEvent(valid.mastery, {
      ...sampleEvent, expectedInterval: { size: 2, direction: 'ascending', semitones: 2 },
    })
    const mutations: Array<(data: StoredProgress) => unknown> = [
      (data) => ({ ...data, mastery: { ...data.mastery, notes: { 'bass:60': mastery.notes['treble:60'] } } }),
      (data) => ({ ...data, mastery: { ...data.mastery, notes: { 'treble:60': { ...mastery.notes['treble:60'], lastSuccessfulLatencyMs: 181 } } } }),
      (data) => ({ ...data, mastery: { ...data.mastery, notes: { 'treble:60': { ...mastery.notes['treble:60'], correctAttempts: 0, incorrectAttempts: 1 } } } }),
      (data) => ({ ...data, mastery: { ...data.mastery, intervals: { 'treble:1:ascending': { ...mastery.intervals['treble:2:ascending'], size: 1 } } } }),
      (data) => ({ ...data, mastery: { ...data.mastery, intervals: { 'treble:9:ascending': { ...mastery.intervals['treble:2:ascending'], size: 9 } } } }),
    ]
    for (const mutate of mutations) {
      const storage = new MemoryStorage()
      storage.values.set(STORAGE_KEY, JSON.stringify(mutate({ ...valid, mastery })))
      expect(loadProgress(storage).notice).toMatch(/invalid/i)
      expect(loadProgress(storage).data.mastery).toEqual(createMastery())
      expect(storage.writes).toBe(0)
    }
  })
})
