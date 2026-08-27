import { describe, expect, it } from "vitest";
import { ALLOWED_PITCHES, naturalToPitch, pitchesForClef } from "./pitches";

describe("naturalToPitch", () => {
  it("centralizes MIDI and VexFlow conversion", () => {
    expect(naturalToPitch("C", 4)).toEqual({ name: "C", octave: 4, midi: 60, vexFlowKey: "c/4" });
    expect(naturalToPitch("G", 5)).toEqual({ name: "G", octave: 5, midi: 79, vexFlowKey: "g/5" });
  });
});

describe("allowed ranges", () => {
  it("contains inclusive treble C4 through G5", () => {
    const pitches = pitchesForClef("treble");
    expect(pitches[0]).toMatchObject({ name: "C", octave: 4, midi: 60 });
    expect(pitches.at(-1)).toMatchObject({ name: "G", octave: 5, midi: 79 });
    expect(pitches).toHaveLength(12);
  });

  it("contains inclusive bass F2 through C4", () => {
    const pitches = ALLOWED_PITCHES.bass;
    expect(pitches[0]).toMatchObject({ name: "F", octave: 2, midi: 41 });
    expect(pitches.at(-1)).toMatchObject({ name: "C", octave: 4, midi: 60 });
    expect(pitches).toHaveLength(12);
  });
});
