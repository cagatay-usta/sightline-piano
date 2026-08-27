import { describe, expect, it } from "vitest";
import { generatePhrase } from "./generatePhrase";
import { DIFFICULTY_PROFILES } from "./difficulty";
import { intervalBetween } from "./intervals";
import { naturalToPitch, pitchesForClef } from "./pitches";

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

describe("generatePhrase", () => {
  it.each([4, 8] as const)("generates a %i-note treble phrase", (length) => {
    const phrase = generatePhrase({ clef: "treble", length, rng: () => 0.25 });
    expect(phrase).toHaveLength(length);
    expect(new Set(phrase.map((pitch) => pitch.midi)).size).toBeGreaterThan(1);
    expect(phrase.every((pitch) => pitchesForClef("treble").some((allowed) => allowed.midi === pitch.midi))).toBe(true);
  });

  it("guarantees variety with a constant RNG", () => {
    const phrase = generatePhrase({ clef: "bass", length: 4, rng: () => 0 });
    expect(new Set(phrase.map((pitch) => pitch.midi)).size).toBe(2);
  });

  it("rejects unsupported lengths", () => {
    expect(() => generatePhrase({ clef: "treble", length: 6 as 4 })).toThrow(RangeError);
  });

  it.each(DIFFICULTY_PROFILES)("respects $id range and interval constraints", (profile) => {
    for (const clef of ["treble", "bass"] as const) {
      const allowed = profile.ranges[clef];
      const allowedMidi = new Set(allowed.map((pitch) => pitch.midi));
      for (const seed of [0.03, 0.31, 0.67, 0.93]) {
        const phrase = generatePhrase({
          clef,
          length: profile.defaultLength,
          allowedPitches: allowed,
          maxInterval: profile.maxInterval,
          repeatProbability: profile.repeatProbability,
          stepWeight: profile.stepWeight,
          rng: () => seed,
        });
        expect(phrase.every((pitch) => allowedMidi.has(pitch.midi))).toBe(true);
        expect(phrase.slice(1).every((pitch, index) =>
          intervalBetween(phrase[index]!, pitch).size <= profile.maxInterval,
        )).toBe(true);
      }
    }
  });

  it("rejects a range that cannot produce diversity", () => {
    expect(() => generatePhrase({
      clef: "treble",
      length: 4,
      allowedPitches: pitchesForClef("treble").slice(0, 2),
      maxInterval: 1,
    })).toThrow(RangeError);
  });

  it("rejects non-canonical natural pitch objects", () => {
    const pitch = naturalToPitch("C", 4);
    expect(() => generatePhrase({
      clef: "treble",
      length: 4,
      allowedPitches: [{ ...pitch, midi: 61 }],
    })).toThrow(RangeError);
  });

  it("sweeps every profile, clef, and supported length with seeded RNGs", () => {
    for (const profile of DIFFICULTY_PROFILES) {
      for (const clef of ["treble", "bass"] as const) {
        const allowed = profile.ranges[clef];
        const allowedMidi = new Set(allowed.map((pitch) => pitch.midi));
        for (const length of profile.lengths) {
          for (let seed = 1; seed <= 32; seed += 1) {
            const phrase = generatePhrase({
              clef,
              length,
              allowedPitches: allowed,
              maxInterval: profile.maxInterval,
              repeatProbability: profile.repeatProbability,
              stepWeight: profile.stepWeight,
              rng: seeded(seed),
            });
            expect(phrase).toHaveLength(length);
            expect(phrase.every((pitch) => allowedMidi.has(pitch.midi))).toBe(true);
            for (let index = 1; index < phrase.length; index += 1) {
              expect(intervalBetween(phrase[index - 1]!, phrase[index]!).size).toBeLessThanOrEqual(profile.maxInterval);
            }
          }
        }
      }
    }
  });

  it("handles malformed RNG values without retries or invalid notes", () => {
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -0.25, 1.25]) {
      const phrase = generatePhrase({ clef: "treble", length: 8, rng: () => value });
      expect(phrase.every((pitch) => pitchesForClef("treble").includes(pitch))).toBe(true);
      expect(new Set(phrase.map((pitch) => pitch.midi)).size).toBeGreaterThan(1);
    }
    expect(() => generatePhrase({ clef: "treble", length: 4, maxInterval: -1 })).toThrow(RangeError);
    expect(() => generatePhrase({ clef: "treble", length: 4, repeatProbability: 1.1 })).toThrow(RangeError);
    expect(() => generatePhrase({ clef: "treble", length: 4, stepWeight: Number.NaN })).toThrow(RangeError);
    expect(() => generatePhrase({ clef: "treble", length: 4, allowedPitches: [] })).toThrow(RangeError);
  });

  it("honors zero repetition and guarantees diversity near probability one", () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const phrase = generatePhrase({ clef: "treble", length: 8, repeatProbability: 0, rng: seeded(seed) });
      for (let index = 1; index < phrase.length; index += 1) {
        expect(phrase[index]!.midi).not.toBe(phrase[index - 1]!.midi);
      }
    }
    const nearAlwaysRepeat = generatePhrase({
      clef: "bass", length: 8, repeatProbability: 0.999999, rng: () => 0.25,
    });
    expect(new Set(nearAlwaysRepeat.map((pitch) => pitch.midi)).size).toBeGreaterThan(1);
  });

  it("makes strong step weights produce more steps than low weights", () => {
    const countSteps = (stepWeight: number): number => {
      let steps = 0;
      for (let seed = 1; seed <= 300; seed += 1) {
        const phrase = generatePhrase({
          clef: "treble", length: 8, maxInterval: 4, repeatProbability: 0,
          stepWeight, rng: seeded(seed),
        });
        for (let index = 1; index < phrase.length; index += 1) {
          steps += intervalBetween(phrase[index - 1]!, phrase[index]!).size === 2 ? 1 : 0;
        }
      }
      return steps;
    };
    expect(countSteps(20)).toBeGreaterThan(countSteps(0.01));
  });

  it("increases weighted note exposure while preserving constraints", () => {
    const profile = DIFFICULTY_PROFILES[2]!;
    const allowed = profile.ranges.treble;
    const target = allowed[4]!;
    const sample = (noteWeights?: Readonly<Record<number, number>>) => {
      let appearances = 0;
      const seen = new Set<number>();
      for (let seed = 1; seed <= 300; seed += 1) {
        const phrase = generatePhrase({
          clef: "treble", length: 8, allowedPitches: allowed, maxInterval: profile.maxInterval,
          repeatProbability: 0.1, stepWeight: profile.stepWeight, noteWeights, rng: seeded(seed),
        });
        for (let index = 1; index < phrase.length; index += 1) {
          expect(intervalBetween(phrase[index - 1]!, phrase[index]!).size).toBeLessThanOrEqual(profile.maxInterval);
        }
        phrase.forEach((pitch) => seen.add(pitch.midi));
        appearances += phrase.filter((pitch) => pitch.midi === target.midi).length;
      }
      expect(seen).toEqual(new Set(allowed.map((pitch) => pitch.midi)));
      return appearances;
    };
    const baseline = sample();
    const weighted = sample({ [target.midi]: 4 });
    expect(weighted).toBeGreaterThan(baseline);
  });
});
