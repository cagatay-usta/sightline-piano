/** The natural pitch names used by the first sight-reading exercise. */
export const NATURAL_PITCH_NAMES = ["C", "D", "E", "F", "G", "A", "B"] as const;

export type PitchName = (typeof NATURAL_PITCH_NAMES)[number];
export type Clef = "treble" | "bass";

export interface Pitch {
  readonly name: PitchName;
  readonly octave: number;
  readonly midi: number;
  /** VexFlow's key notation, for example `c/4`. */
  readonly vexFlowKey: string;
}

const NATURAL_SEMITONES: Readonly<Record<PitchName, number>> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

/** Convert one natural note and octave to the canonical pitch model. */
export function naturalToPitch(name: PitchName, octave: number): Pitch {
  if (!Number.isInteger(octave) || octave < 0 || octave > 9) {
    throw new RangeError("octave must be an integer between 0 and 9");
  }

  return Object.freeze({
    name,
    octave,
    midi: 12 * (octave + 1) + NATURAL_SEMITONES[name],
    vexFlowKey: `${name.toLowerCase()}/${octave}`,
  });
}

function naturalRange(first: readonly [PitchName, number], last: readonly [PitchName, number]): readonly Pitch[] {
  const pitches: Pitch[] = [];
  let octave = first[1];
  let nameIndex = NATURAL_PITCH_NAMES.indexOf(first[0]);
  const endMidi = naturalToPitch(last[0], last[1]).midi;

  while (true) {
    const name = NATURAL_PITCH_NAMES[nameIndex];
    if (name === undefined) throw new Error("invalid natural-note range");
    const pitch = naturalToPitch(name, octave);
    pitches.push(pitch);
    if (pitch.midi === endMidi) return Object.freeze(pitches);

    nameIndex += 1;
    if (nameIndex === NATURAL_PITCH_NAMES.length) {
      nameIndex = 0;
      octave += 1;
    }
  }
}

/** Inclusive note ranges for the initial exercise, centralized in one place. */
export const ALLOWED_PITCHES: Readonly<Record<Clef, readonly Pitch[]>> = Object.freeze({
  treble: naturalRange(["C", 4], ["G", 5]),
  bass: naturalRange(["F", 2], ["C", 4]),
});

export function pitchesForClef(clef: Clef): readonly Pitch[] {
  return ALLOWED_PITCHES[clef];
}
