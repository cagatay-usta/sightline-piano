import type { Pitch } from "./pitches";
import { NATURAL_PITCH_NAMES } from "./pitches";

export interface Interval {
  /** Diatonic interval size: C to E is a third (3), regardless of semitones. */
  readonly size: number;
  readonly direction: "ascending" | "descending" | "unison";
  /** Absolute chromatic distance. Direction is represented separately. */
  readonly semitones: number;
}

function diatonicPosition(pitch: Pitch): number {
  const nameIndex = NATURAL_PITCH_NAMES.indexOf(pitch.name);
  return pitch.octave * NATURAL_PITCH_NAMES.length + nameIndex;
}

/** Derive the musical interval between two natural pitches. */
export function intervalBetween(from: Pitch, to: Pitch): Interval {
  const semitoneDistance = Math.abs(to.midi - from.midi);
  if (semitoneDistance === 0) {
    return Object.freeze({ size: 1, direction: "unison", semitones: 0 });
  }

  const size = Math.abs(diatonicPosition(to) - diatonicPosition(from)) + 1;
  return Object.freeze({
    size,
    direction: to.midi > from.midi ? "ascending" : "descending",
    semitones: semitoneDistance,
  });
}

const INTERVAL_NAMES = [
  "",
  "unison",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
  "octave",
] as const;

function intervalName(size: number): string {
  return INTERVAL_NAMES[size] ?? `${size}th`;
}

/** Format an interval for labels and future mastery reports. */
export function intervalLabel(interval: Interval): string {
  if (interval.direction === "unison") return "unison";
  return `${interval.direction} ${intervalName(interval.size)}`;
}
