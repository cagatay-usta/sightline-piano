import {
  ALLOWED_PITCHES,
  type Clef,
  naturalRange,
  type Pitch,
} from "./pitches";
import type { PhraseLength } from "./generatePhrase";

export type DifficultyId = "beginner-1" | "beginner-2" | "beginner-3" | "beginner-4";

export interface DifficultyProfile {
  readonly id: DifficultyId;
  readonly name: string;
  readonly description: string;
  readonly ranges: Readonly<Record<Clef, readonly Pitch[]>>;
  readonly lengths: readonly PhraseLength[];
  readonly defaultLength: PhraseLength;
  /** Maximum diatonic interval size permitted between adjacent notes. */
  readonly maxInterval: number;
  readonly repeatProbability: number;
  readonly stepWeight: number;
}

const B1_RANGES = Object.freeze({
  treble: naturalRange(["C", 4], ["E", 4]),
  bass: naturalRange(["C", 3], ["E", 3]),
});
const B2_RANGES = Object.freeze({
  treble: naturalRange(["C", 4], ["G", 4]),
  bass: naturalRange(["C", 3], ["G", 3]),
});
const B3_RANGES = Object.freeze({
  treble: naturalRange(["C", 4], ["C", 5]),
  bass: naturalRange(["C", 3], ["C", 4]),
});
const B4_RANGES = Object.freeze({
  treble: ALLOWED_PITCHES.treble,
  bass: ALLOWED_PITCHES.bass,
});

function profile(
  id: DifficultyId,
  name: string,
  description: string,
  ranges: Readonly<Record<Clef, readonly Pitch[]>>,
  lengths: readonly PhraseLength[],
  defaultLength: PhraseLength,
  maxInterval: number,
  repeatProbability: number,
  stepWeight: number,
): DifficultyProfile {
  return Object.freeze({
    id,
    name,
    description,
    ranges,
    lengths: Object.freeze([...lengths]),
    defaultLength,
    maxInterval,
    repeatProbability,
    stepWeight,
  });
}

export const DIFFICULTY_PROFILES: readonly DifficultyProfile[] = Object.freeze([
  profile(
    "beginner-1",
    "Beginner 1",
    "Three nearby notes with mostly adjacent motion.",
    B1_RANGES,
    [4],
    4,
    2,
    0.08,
    8,
  ),
  profile(
    "beginner-2",
    "Beginner 2",
    "A five-note position with steps and occasional skips.",
    B2_RANGES,
    [4],
    4,
    3,
    0.12,
    7,
  ),
  profile(
    "beginner-3",
    "Beginner 3",
    "An octave of natural notes with seconds, thirds, and repeats.",
    B3_RANGES,
    [4, 8],
    4,
    4,
    0.18,
    6,
  ),
  profile(
    "beginner-4",
    "Beginner 4",
    "The full v0.1 staff range with broader interval movement.",
    B4_RANGES,
    [4, 8],
    8,
    5,
    0.2,
    5,
  ),
]);

export function isDifficultyId(value: unknown): value is DifficultyId {
  return typeof value === "string" && DIFFICULTY_PROFILES.some((profile) => profile.id === value);
}

export function getDifficulty(id: DifficultyId): DifficultyProfile {
  const result = DIFFICULTY_PROFILES.find((profile) => profile.id === id);
  if (result === undefined) throw new RangeError(`unknown difficulty: ${id}`);
  return result;
}
