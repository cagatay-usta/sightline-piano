import { describe, expect, it } from "vitest";
import { intervalBetween, intervalLabel } from "./intervals";
import { naturalToPitch } from "./pitches";

describe("intervalBetween", () => {
  it("distinguishes diatonic size from chromatic distance", () => {
    expect(intervalBetween(naturalToPitch("C", 4), naturalToPitch("E", 4))).toEqual({
      size: 3,
      direction: "ascending",
      semitones: 4,
    });
    expect(intervalBetween(naturalToPitch("C", 4), naturalToPitch("D", 4))).toEqual({
      size: 2,
      direction: "ascending",
      semitones: 2,
    });
  });

  it("represents descending movement and unison", () => {
    expect(intervalBetween(naturalToPitch("E", 4), naturalToPitch("C", 4))).toEqual({
      size: 3,
      direction: "descending",
      semitones: 4,
    });
    expect(intervalBetween(naturalToPitch("C", 4), naturalToPitch("C", 4))).toEqual({
      size: 1,
      direction: "unison",
      semitones: 0,
    });
    expect(intervalLabel({ size: 3, direction: "ascending", semitones: 4 })).toBe("ascending third");
  });
});
