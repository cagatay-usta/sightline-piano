import { describe, expect, it } from "vitest";
import { generatePhrase } from "./generatePhrase";
import { pitchesForClef } from "./pitches";

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
});
