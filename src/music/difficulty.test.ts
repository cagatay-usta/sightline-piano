import { describe, expect, it } from "vitest";
import { DIFFICULTY_PROFILES, getDifficulty, isDifficultyId } from "./difficulty";

describe("difficulty profiles", () => {
  it("defines the four beginner ranges and lengths", () => {
    expect(DIFFICULTY_PROFILES.map((profile) => profile.id)).toEqual([
      "beginner-1",
      "beginner-2",
      "beginner-3",
      "beginner-4",
    ]);
    expect(getDifficulty("beginner-1").ranges.treble.map((pitch) => pitch.midi)).toEqual([60, 62, 64]);
    expect(getDifficulty("beginner-1").ranges.bass.map((pitch) => pitch.midi)).toEqual([48, 50, 52]);
    expect(getDifficulty("beginner-2").ranges.treble).toHaveLength(5);
    expect(getDifficulty("beginner-3").ranges.treble).toHaveLength(8);
    expect(getDifficulty("beginner-4").ranges.treble).toHaveLength(12);
    expect(DIFFICULTY_PROFILES.map((profile) => profile.maxInterval)).toEqual([2, 3, 4, 5]);
    expect(DIFFICULTY_PROFILES.map((profile) => profile.defaultLength)).toEqual([4, 4, 4, 8]);
  });

  it("guards difficulty identifiers", () => {
    expect(isDifficultyId("beginner-3")).toBe(true);
    expect(isDifficultyId("beginner-9")).toBe(false);
    expect(isDifficultyId(null)).toBe(false);
  });
});
