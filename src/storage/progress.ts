import type { Clef } from '../music/pitches'
import { getDifficulty, isDifficultyId, type DifficultyId } from '../music/difficulty'
import {
  createMastery,
  intervalKey,
  noteKey,
  type ConceptStats,
  type IntervalMastery,
  type Mastery,
  type NoteMastery,
} from '../learning/mastery'

export const STORAGE_KEY = 'sightline-progress'

export interface ProgressPreferences {
  readonly clef: Clef
  readonly difficultyId: DifficultyId
  readonly phraseLength: 4 | 8
  readonly adaptive: boolean
}

export interface StoredProgress {
  readonly version: 1
  readonly preferences: ProgressPreferences
  readonly mastery: Mastery
}

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const DEFAULT_PREFERENCES: ProgressPreferences = {
  clef: 'treble',
  difficultyId: 'beginner-1',
  phraseLength: 4,
  adaptive: true,
}

const MAX_SERIALIZED_BYTES = 1_000_000
const MAX_CONCEPTS = 512
const MAX_COUNT = 1_000_000_000
const MAX_LATENCY_MS = 1_000_000_000
// v1 only generates intervals through a fifth; retain headroom through an octave.
const MAX_INTERVAL_SIZE = 8
const DANGEROUS_KEYS = new Set(['__proto__', 'prototype', 'constructor'])
const NATURAL_SEMITONES = new Set([0, 2, 4, 5, 7, 9, 11])

/** Create fresh progress with beginner defaults (or supplied valid preferences). */
export function createProgress(preferences?: Partial<ProgressPreferences>): StoredProgress {
  return {
    version: 1,
    preferences: sanitizePreferences(preferences),
    mastery: createMastery(),
  }
}

interface StorageResolution {
  readonly storage: StorageLike | undefined
  readonly unavailable: boolean
}

function defaultStorage(): StorageResolution {
  try {
    if (typeof window === 'undefined') return { storage: undefined, unavailable: false }
    return { storage: window.localStorage, unavailable: false }
  } catch {
    return { storage: undefined, unavailable: true }
  }
}

function storageOrDefault(storage?: StorageLike): StorageResolution {
  return storage === undefined ? defaultStorage() : { storage, unavailable: false }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function hasSafeKeys(value: Record<string, unknown>): boolean {
  return Object.keys(value).every((key) => !DANGEROUS_KEYS.has(key))
}

function isClef(value: unknown): value is Clef {
  return value === 'treble' || value === 'bass'
}

function sanitizePreferences(value: unknown): ProgressPreferences {
  const candidate = isRecord(value) ? value : {}
  const difficultyId = isDifficultyId(candidate.difficultyId)
    ? candidate.difficultyId
    : DEFAULT_PREFERENCES.difficultyId
  const requestedLength = candidate.phraseLength === 8 ? 8 : 4
  const difficulty = getDifficulty(difficultyId)
  return {
    clef: isClef(candidate.clef) ? candidate.clef : DEFAULT_PREFERENCES.clef,
    difficultyId,
    phraseLength: difficulty.lengths.includes(requestedLength) ? requestedLength : difficulty.defaultLength,
    adaptive: typeof candidate.adaptive === 'boolean' ? candidate.adaptive : DEFAULT_PREFERENCES.adaptive,
  }
}

function validNaturalMidi(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 127 &&
    NATURAL_SEMITONES.has(value % 12)
  )
}

function validCounter(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_COUNT
}

function validLatency(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= MAX_LATENCY_MS
}

function validStats(value: unknown): value is ConceptStats {
  if (!isRecord(value) || !hasSafeKeys(value)) return false
  const expectedKeys = [
    'attempts',
    'correctAttempts',
    'incorrectAttempts',
    'successfulLatencyTotalMs',
    'lastSuccessfulLatencyMs',
  ]
  if (!expectedKeys.every((key) => Object.hasOwn(value, key))) {
    return false
  }
  const { attempts, correctAttempts, incorrectAttempts, successfulLatencyTotalMs, lastSuccessfulLatencyMs } = value
  if (!validCounter(attempts) || !validCounter(correctAttempts) || !validCounter(incorrectAttempts)) return false
  if (attempts !== correctAttempts + incorrectAttempts || correctAttempts > attempts) return false
  if (!validLatency(successfulLatencyTotalMs) || successfulLatencyTotalMs < 0) return false
  if (lastSuccessfulLatencyMs !== null && !validLatency(lastSuccessfulLatencyMs)) return false
  if (correctAttempts === 0 && (successfulLatencyTotalMs !== 0 || lastSuccessfulLatencyMs !== null)) return false
  if (correctAttempts > 0 && lastSuccessfulLatencyMs === null) return false
  if (lastSuccessfulLatencyMs !== null && lastSuccessfulLatencyMs > successfulLatencyTotalMs) return false
  return true
}

function validNote(value: unknown, key: string): value is NoteMastery {
  if (!isRecord(value) || !hasSafeKeys(value)) return false
  const expectedKeys = [
    'clef',
    'midi',
    'attempts',
    'correctAttempts',
    'incorrectAttempts',
    'successfulLatencyTotalMs',
    'lastSuccessfulLatencyMs',
  ]
  if (Object.keys(value).length !== expectedKeys.length || !expectedKeys.every((name) => Object.hasOwn(value, name))) return false
  return (
    isClef(value.clef) &&
    validNaturalMidi(value.midi) &&
    key === noteKey(value.clef, value.midi) &&
    validStats(value)
  )
}

function validInterval(value: unknown, key: string): value is IntervalMastery {
  if (!isRecord(value) || !hasSafeKeys(value)) return false
  const expectedKeys = [
    'clef',
    'size',
    'direction',
    'attempts',
    'correctAttempts',
    'incorrectAttempts',
    'successfulLatencyTotalMs',
    'lastSuccessfulLatencyMs',
  ]
  if (Object.keys(value).length !== expectedKeys.length || !expectedKeys.every((name) => Object.hasOwn(value, name))) return false
  const direction = value.direction
  return (
    isClef(value.clef) &&
    typeof value.size === 'number' &&
    Number.isInteger(value.size) &&
    value.size >= 1 &&
    value.size <= MAX_INTERVAL_SIZE &&
    ((direction === 'unison' && value.size === 1) ||
      ((direction === 'ascending' || direction === 'descending') && value.size > 1)) &&
    key === intervalKey(value.clef, value.size, direction) &&
    validStats(value)
  )
}

function validateMastery(value: unknown): value is Mastery {
  if (!isRecord(value) || !hasSafeKeys(value)) return false
  const notes = value.notes
  const intervals = value.intervals
  if (Object.keys(value).length !== 2 || !isRecord(notes) || !isRecord(intervals)) return false
  if (!hasSafeKeys(notes) || !hasSafeKeys(intervals)) return false
  const noteKeys = Object.keys(notes)
  const intervalKeys = Object.keys(intervals)
  if (noteKeys.length > MAX_CONCEPTS || intervalKeys.length > MAX_CONCEPTS) return false
  return (
    noteKeys.every((key) => validNote(notes[key], key)) &&
    intervalKeys.every((key) => validInterval(intervals[key], key))
  )
}

function validateStoredProgress(value: unknown): value is StoredProgress {
  if (!isRecord(value) || !hasSafeKeys(value)) return false
  return (
    Object.keys(value).length === 3 &&
    value.version === 1 &&
    isRecord(value.preferences) &&
    hasSafeKeys(value.preferences) &&
    Object.keys(value.preferences).length === 4 &&
    isClef(value.preferences.clef) &&
    isDifficultyId(value.preferences.difficultyId) &&
    (value.preferences.phraseLength === 4 || value.preferences.phraseLength === 8) &&
    getDifficulty(value.preferences.difficultyId).lengths.includes(value.preferences.phraseLength) &&
    typeof value.preferences.adaptive === 'boolean' &&
    validateMastery(value.mastery)
  )
}

interface ReadResult {
  readonly value: string | null
  readonly error: boolean
}

function read(storage: StorageLike | undefined, key: string): ReadResult {
  if (storage === undefined) return { value: null, error: false }
  try {
    return { value: storage.getItem(key), error: false }
  } catch {
    return { value: null, error: true }
  }
}

/** Load progress safely; malformed state never escapes as a startup exception. */
export function loadProgress(storage?: StorageLike): { data: StoredProgress; notice: string | null } {
  const resolution = storageOrDefault(storage)
  if (resolution.unavailable) {
    return { data: createProgress(), notice: 'Local progress storage is unavailable; progress was not loaded.' }
  }
  const resolved = resolution.storage
  const primary = read(resolved, STORAGE_KEY)
  if (primary.error) {
    return { data: createProgress(), notice: 'Local progress storage is unavailable; progress was not loaded.' }
  }
  const raw = primary.value
  if (raw === null) {
    const oldClefResult = read(resolved, 'sightline-clef')
    const oldLengthResult = read(resolved, 'sightline-phrase-length')
    if (oldClefResult.error || oldLengthResult.error) {
      return { data: createProgress(), notice: 'Local progress storage is unavailable; progress was not loaded.' }
    }
    const oldClef = oldClefResult.value
    const oldLength = oldLengthResult.value
    if (oldClef !== null || oldLength !== null) {
      const preferences: Partial<ProgressPreferences> = {
        clef: oldClef === 'bass' ? 'bass' : 'treble',
        phraseLength: oldLength === '8' ? 8 : 4,
        difficultyId: oldLength === '8' ? 'beginner-3' : 'beginner-1',
      }
      return { data: createProgress(preferences), notice: 'Migrated v0.1 preferences only; mastery starts fresh.' }
    }
    return { data: createProgress(), notice: null }
  }
  if (raw.length > MAX_SERIALIZED_BYTES) return { data: createProgress(), notice: 'Saved progress was too large; started fresh.' }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { data: createProgress(), notice: 'Saved progress was malformed; started fresh.' }
  }
  if (!isRecord(parsed) || !hasSafeKeys(parsed)) {
    return { data: createProgress(), notice: 'Saved progress was incompatible; started fresh.' }
  }
  if (parsed.version !== 1) {
    const preferenceSource = isRecord(parsed.preferences) ? parsed.preferences : parsed
    if (parsed.version === 0) {
      // v0.1 had no difficulty preference. Keep its valid length and map the
      // old 8-note choice to the first profile that supports 8-note phrases.
      const legacyLength = preferenceSource.phraseLength === 8 ? 8 : 4
      const legacyDifficultyId = isDifficultyId(preferenceSource.difficultyId)
        ? preferenceSource.difficultyId
        : legacyLength === 8
          ? 'beginner-3'
          : 'beginner-1'
      return {
        data: createProgress({
          clef: isClef(preferenceSource.clef) ? preferenceSource.clef : DEFAULT_PREFERENCES.clef,
          phraseLength: legacyLength,
          difficultyId: legacyDifficultyId,
          adaptive: typeof preferenceSource.adaptive === 'boolean' ? preferenceSource.adaptive : DEFAULT_PREFERENCES.adaptive,
        }),
        notice: 'Migrated older preferences only; mastery starts fresh.',
      }
    }
    const preferences = sanitizePreferences(preferenceSource)
    const versionNotice = typeof parsed.version === 'number' && parsed.version > 1
      ? 'Saved progress used a newer schema; started fresh.'
      : 'Saved progress was incompatible; started fresh.'
    return { data: createProgress(preferences), notice: versionNotice }
  }
  if (validateStoredProgress(parsed)) return { data: parsed, notice: null }

  const preferences = sanitizePreferences(parsed.preferences)
  return { data: createProgress(preferences), notice: 'Saved progress was invalid; mastery was reset.' }
}

/** Persist only validated aggregate progress and preferences. */
export function saveProgress(data: StoredProgress, storage?: StorageLike): boolean {
  try {
    if (!validateStoredProgress(data)) return false
  } catch {
    return false
  }
  const resolved = storageOrDefault(storage).storage
  if (resolved === undefined) return false
  try {
    const serialized = JSON.stringify(data)
    if (serialized.length > MAX_SERIALIZED_BYTES) return false
    resolved.setItem(STORAGE_KEY, serialized)
    return true
  } catch {
    return false
  }
}
