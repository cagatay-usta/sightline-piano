import type { Clef } from '../music/pitches'
import { type ConceptStats, type Mastery } from './mastery'

const MIN_WEIGHT = 1
const MAX_WEIGHT = 3

/**
 * Convert aggregate error into a deliberately mild [1, 3] practice weight.
 *
 * Error is smoothed toward zero with two virtual attempts, then multiplied by
 * an evidence factor (`attempts / (attempts + 4)`). Consequently one noisy
 * mistake cannot dominate generation, while repeated errors approach the cap.
 * Zero-error concepts remain at weight 1 and unseen concepts use the same
 * baseline through the optional-stats overload.
 */
export function adaptiveWeight(stats?: ConceptStats): number {
  if (stats === undefined || !Number.isFinite(stats.attempts) || stats.attempts <= 0) {
    return MIN_WEIGHT
  }

  const attempts = Math.max(0, stats.attempts)
  const incorrect = Number.isFinite(stats.incorrectAttempts)
    ? Math.min(attempts, Math.max(0, stats.incorrectAttempts))
    : 0
  const smoothedError = incorrect / (attempts + 2)
  const evidence = attempts / (attempts + 4)
  const weight = MIN_WEIGHT + (MAX_WEIGHT - MIN_WEIGHT) * smoothedError * evidence
  return Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, Number.isFinite(weight) ? weight : MIN_WEIGHT))
}

/** Return adaptive weights for the concepts recorded under one clef. */
export function noteWeightsForClef(
  mastery: Mastery,
  clef: Clef,
): Readonly<Record<number, number>> {
  const weights: Record<number, number> = {}
  for (const concept of Object.values(mastery.notes)) {
    if (concept.clef !== clef || !Number.isInteger(concept.midi) || concept.midi < 0 || concept.midi > 127) {
      continue
    }
    weights[concept.midi] = adaptiveWeight(concept)
  }
  return weights
}
