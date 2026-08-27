import type { Clef, MidiPitch, Pitch } from '../music/pitches'
import type { DifficultyId } from '../music/difficulty'
import type { Interval } from '../music/intervals'

/** One immutable observation; wrong attempts retain elapsed time for the same target. */
export interface PerformanceEvent {
  readonly expectedPitch: Pitch
  readonly playedPitch: MidiPitch
  readonly expectedMidi: number
  readonly playedMidi: number
  readonly correct: boolean
  readonly responseLatencyMs: number
  readonly clef: Clef
  readonly phraseId: string
  readonly position: number
  readonly difficulty: DifficultyId
  readonly previousExpectedPitch: Pitch | null
  readonly expectedInterval: Interval | null
  /** Wall-clock milliseconds; latency calculations use a separate monotonic clock. */
  readonly timestamp: number
  readonly source: 'midi' | 'manual'
}
