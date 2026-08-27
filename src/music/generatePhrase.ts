import { type Clef, type Pitch, pitchesForClef } from "./pitches";

export type PhraseLength = 4 | 8;
export type RandomSource = () => number;

export interface GeneratePhraseOptions {
  readonly clef: Clef;
  readonly length: PhraseLength;
  readonly rng?: RandomSource;
}

export type Phrase = readonly Pitch[];

const defaultRng: RandomSource = () => Math.random();

function randomIndex(rng: RandomSource, size: number): number {
  const value = rng();
  // Keep an injected source from producing an invalid array index while still
  // preserving ordinary Math.random behaviour.
  const normalized = Number.isFinite(value) ? value - Math.floor(value) : 0;
  return Math.min(size - 1, Math.floor(normalized * size));
}

/** Generate a finite, non-constant phrase from the selected clef's range. */
export function generatePhrase({ clef, length, rng = defaultRng }: GeneratePhraseOptions): Phrase {
  if (length !== 4 && length !== 8) {
    throw new RangeError("phrase length must be 4 or 8");
  }

  const allowed = pitchesForClef(clef);
  const phrase: Pitch[] = Array.from({ length }, () => allowed[randomIndex(rng, allowed.length)]!);

  if (phrase.every((pitch) => pitch.midi === phrase[0]!.midi)) {
    // The allowed ranges contain at least two notes, so this finite adjustment
    // guarantees variety even for a deliberately constant RNG.
    const alternateIndex = phrase[0]!.midi === allowed[0]!.midi ? 1 : 0;
    phrase[phrase.length - 1] = allowed[alternateIndex]!;
  }

  return Object.freeze(phrase);
}
