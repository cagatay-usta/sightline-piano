import { intervalBetween } from "./intervals";
import {
  NATURAL_PITCH_NAMES,
  naturalToPitch,
  type Clef,
  type Pitch,
  pitchesForClef,
} from "./pitches";

export type PhraseLength = 4 | 8;
export type RandomSource = () => number;

export interface GeneratePhraseOptions {
  readonly clef: Clef;
  readonly length: PhraseLength;
  readonly rng?: RandomSource;
  readonly allowedPitches?: readonly Pitch[];
  /** Maximum diatonic interval size between adjacent notes. */
  readonly maxInterval?: number;
  readonly repeatProbability?: number;
  /** Relative weight for adjacent diatonic steps. */
  readonly stepWeight?: number;
  /** Positive relative multipliers keyed by MIDI note number. */
  readonly noteWeights?: Readonly<Record<number, number>>;
}

export type Phrase = readonly Pitch[];

const defaultRng: RandomSource = () => Math.random();
const DEFAULT_MAX_INTERVAL = 4;
const DEFAULT_REPEAT_PROBABILITY = 0.15;
const DEFAULT_STEP_WEIGHT = 6;
const MAX_ADAPTIVE_WEIGHT = 4;
const MAX_STEP_WEIGHT = 1_000;

function randomUnit(rng: RandomSource): number {
  const value = rng();
  if (!Number.isFinite(value)) return 0;
  const fraction = value - Math.floor(value);
  return fraction >= 1 ? 0 : fraction;
}

function assertLength(length: number): asserts length is PhraseLength {
  if (length !== 4 && length !== 8) throw new RangeError("phrase length must be 4 or 8");
}

function validatePitches(pitches: readonly Pitch[]): readonly Pitch[] {
  const unique = new Map<number, Pitch>();
  for (const pitch of pitches) {
    const canonical = pitch && NATURAL_PITCH_NAMES.includes(pitch.name)
      ? naturalToPitch(pitch.name, pitch.octave)
      : undefined;
    if (
      !pitch ||
      canonical === undefined ||
      pitch.midi !== canonical.midi ||
      pitch.name !== canonical.name ||
      pitch.octave !== canonical.octave ||
      pitch.vexFlowKey !== canonical.vexFlowKey
    ) {
      throw new RangeError("allowedPitches must contain canonical natural pitches");
    }
    unique.set(pitch.midi, pitch);
  }
  const result = [...unique.values()];
  if (result.length === 0) throw new RangeError("allowedPitches must not be empty");
  return result;
}

function positiveWeight(value: number | undefined, fallback: number, cap: number): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) return fallback;
  return Math.min(cap, value);
}

function weightedChoice(
  candidates: readonly Pitch[],
  rng: RandomSource,
  weightFor: (pitch: Pitch) => number,
): Pitch {
  if (candidates.length === 0) throw new RangeError("no pitch satisfies the generation constraints");
  let total = 0;
  const weights = candidates.map((candidate) => {
    const weight = positiveWeight(weightFor(candidate), 1, MAX_ADAPTIVE_WEIGHT * MAX_STEP_WEIGHT);
    total += weight;
    return weight;
  });

  if (!Number.isFinite(total) || total <= 0) return candidates[0]!;
  let cursor = randomUnit(rng) * total;
  for (let index = 0; index < candidates.length; index += 1) {
    cursor -= weights[index]!;
    if (cursor < 0) return candidates[index]!;
  }
  return candidates[candidates.length - 1]!;
}

function adaptiveMultiplier(pitch: Pitch, noteWeights: Readonly<Record<number, number>> | undefined): number {
  return positiveWeight(noteWeights?.[pitch.midi], 1, MAX_ADAPTIVE_WEIGHT);
}

/** Generate a finite phrase whose adjacent notes obey the configured musical constraints. */
export function generatePhrase({
  clef,
  length,
  rng = defaultRng,
  allowedPitches,
  maxInterval = DEFAULT_MAX_INTERVAL,
  repeatProbability = DEFAULT_REPEAT_PROBABILITY,
  stepWeight = DEFAULT_STEP_WEIGHT,
  noteWeights,
}: GeneratePhraseOptions): Phrase {
  assertLength(length);
  if (!Number.isInteger(maxInterval) || maxInterval < 0) {
    throw new RangeError("maxInterval must be a non-negative integer");
  }
  if (!Number.isFinite(repeatProbability) || repeatProbability < 0 || repeatProbability > 1) {
    throw new RangeError("repeatProbability must be between 0 and 1");
  }
  if (!Number.isFinite(stepWeight) || stepWeight < 0) {
    throw new RangeError("stepWeight must be a non-negative finite number");
  }

  const allowed = validatePitches(allowedPitches ?? pitchesForClef(clef));
  if (length > 1 && allowed.length < 2) {
    throw new RangeError("at least two allowed pitches are required for a non-constant phrase");
  }

  const canFollow = (from: Pitch, to: Pitch): boolean =>
    intervalBetween(from, to).size <= maxInterval;
  const neighbors = (from: Pitch): readonly Pitch[] => allowed.filter((pitch) => canFollow(from, pitch));
  const hasDiverseTransition = allowed.some((from) =>
    allowed.some((to) => from.midi !== to.midi && canFollow(from, to)),
  );
  if (length > 1 && !hasDiverseTransition) {
    throw new RangeError("the allowed pitches and maxInterval cannot produce a diverse phrase");
  }

  const phrase: Pitch[] = [];
  // Isolated pitches cannot participate in a diverse phrase under symmetric
  // interval constraints. Every built-in profile has a connected pitch range.
  const starts = allowed.filter((pitch) => neighbors(pitch).some((candidate) => candidate.midi !== pitch.midi));
  const firstCandidates = starts;
  phrase.push(
    weightedChoice(firstCandidates, rng, (pitch) => adaptiveMultiplier(pitch, noteWeights)),
  );

  for (let position = 1; position < length; position += 1) {
    const previous = phrase[position - 1]!;
    const candidates = neighbors(previous);
    const different = candidates.filter((pitch) => pitch.midi !== previous.midi);

    if (different.length === 0) {
      if (repeatProbability === 0) {
        throw new RangeError("repeatProbability 0 cannot satisfy the pitch constraints");
      }
      phrase.push(previous);
      continue;
    }

    // Model repetition as an explicit probability, then choose all other
    // notes with pedagogical weights. This keeps stepWeight interpretable.
    if (randomUnit(rng) < repeatProbability) {
      phrase.push(previous);
      continue;
    }

    const viable = position === length - 1
      ? different
      : different.filter((pitch) => neighbors(pitch).some((candidate) => candidate.midi !== pitch.midi));
    const choices = viable.length > 0 ? viable : different;
    phrase.push(
      weightedChoice(choices, rng, (pitch) => {
        const interval = intervalBetween(previous, pitch);
        const motionWeight = interval.size === 2
          ? Math.max(0.0001, Math.min(MAX_STEP_WEIGHT, stepWeight))
          : 1;
        return motionWeight * adaptiveMultiplier(pitch, noteWeights);
      }),
    );
  }

  // A constant RNG can repeatedly choose the repeat branch. Replace only the
  // final note with the first legal alternative so this remains finite and
  // guarantees variety without retry loops.
  if (length > 1 && phrase.every((pitch) => pitch.midi === phrase[0]!.midi)) {
    const last = phrase.length - 1;
    const alternate = neighbors(phrase[last - 1]!).find((pitch) => pitch.midi !== phrase[last - 1]!.midi);
    if (alternate === undefined) {
      throw new RangeError("the allowed pitches and maxInterval cannot produce a diverse phrase");
    }
    phrase[last] = alternate;
  }

  return Object.freeze(phrase);
}
