/** The natural pitch names used by the first sight-reading exercise. */
export const NATURAL_PITCH_NAMES = ["C", "D", "E", "F", "G", "A", "B"] as const;

export type PitchName = (typeof NATURAL_PITCH_NAMES)[number];
export type Clef = "treble" | "bass";

/** Chromatic pitch names used when translating a MIDI note number. */
export const CHROMATIC_PITCH_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

export type ChromaticPitchName = (typeof CHROMATIC_PITCH_NAMES)[number];
/** Alias kept for callers that refer to MIDI note names directly. */
export type MidiPitchName = ChromaticPitchName;
export const MIDI_PITCH_NAMES = CHROMATIC_PITCH_NAMES;

export interface Pitch {
  readonly name: PitchName;
  readonly octave: number;
  readonly midi: number;
  /** VexFlow's key notation, for example `c/4`. */
  readonly vexFlowKey: string;
}

/** A MIDI pitch, including chromatic notes that are not valid exercise pitches. */
export interface MidiPitch {
  readonly name: ChromaticPitchName;
  readonly octave: number;
  readonly midi: number;
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
  if (!NATURAL_PITCH_NAMES.includes(name)) {
    throw new RangeError("name must be a natural pitch name");
  }
  if (!Number.isInteger(octave) || octave < -1 || octave > 9) {
    throw new RangeError("octave must be an integer between -1 and 9");
  }

  const midi = 12 * (octave + 1) + NATURAL_SEMITONES[name];
  if (midi < 0 || midi > 127) {
    throw new RangeError("natural pitch must map to a canonical MIDI note between 0 and 127");
  }

  return Object.freeze({
    name,
    octave,
    midi,
    vexFlowKey: `${name.toLowerCase()}/${octave}`,
  });
}

/** Convert a canonical MIDI note number (0 through 127) to a chromatic pitch. */
export function midiToPitch(midi: number): MidiPitch {
  if (!Number.isInteger(midi) || midi < 0 || midi > 127) {
    throw new RangeError("MIDI note must be an integer between 0 and 127");
  }

  return Object.freeze({
    name: CHROMATIC_PITCH_NAMES[midi % 12]!,
    // MIDI defines C-1 as note 0. Keep the -1 octave: hardware can report
    // pitches outside the exercise ranges and they should not become C0.
    octave: Math.floor(midi / 12) - 1,
    midi,
  });
}

/** Return a compact, human-readable pitch label such as `C#4` or `G5`. */
export function pitchLabel(pitch: Pick<Pitch | MidiPitch, "name" | "octave">): string {
  return `${pitch.name}${pitch.octave}`;
}

/** Build an inclusive, ascending range of canonical natural pitches. */
export function naturalRange(
  first: readonly [PitchName, number],
  last: readonly [PitchName, number],
): readonly Pitch[] {
  const start = naturalToPitch(first[0], first[1]);
  const end = naturalToPitch(last[0], last[1]);
  if (end.midi < start.midi) {
    throw new RangeError("natural pitch range must be ascending");
  }

  const pitches: Pitch[] = [];
  let octave = first[1];
  let nameIndex = NATURAL_PITCH_NAMES.indexOf(first[0]);
  let guard = 0;

  while (guard <= 128) {
    const name = NATURAL_PITCH_NAMES[nameIndex];
    if (name === undefined) throw new Error("invalid natural-note range");
    const pitch = naturalToPitch(name, octave);
    pitches.push(pitch);
    if (pitch.midi === end.midi) return Object.freeze(pitches);
    if (pitch.midi > end.midi) break;

    nameIndex += 1;
    if (nameIndex === NATURAL_PITCH_NAMES.length) {
      nameIndex = 0;
      octave += 1;
    }
    guard += 1;
  }

  throw new RangeError("natural pitch range endpoints must be natural notes in order");
}

/** Inclusive note ranges for the initial exercise, centralized in one place. */
export const ALLOWED_PITCHES: Readonly<Record<Clef, readonly Pitch[]>> = Object.freeze({
  treble: naturalRange(["C", 4], ["G", 5]),
  bass: naturalRange(["F", 2], ["C", 4]),
});

export function pitchesForClef(clef: Clef): readonly Pitch[] {
  const pitches = ALLOWED_PITCHES[clef];
  if (pitches === undefined) throw new RangeError(`unknown clef: ${String(clef)}`);
  return pitches;
}
