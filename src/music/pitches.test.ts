import { describe, expect, it } from "vitest";
import { ALLOWED_PITCHES, midiToPitch, naturalRange, naturalToPitch, pitchLabel, pitchesForClef } from "./pitches";

describe("naturalToPitch", () => {
  it("centralizes MIDI and VexFlow conversion", () => {
    expect(naturalToPitch("C", 4)).toEqual({ name: "C", octave: 4, midi: 60, vexFlowKey: "c/4" });
    expect(naturalToPitch("G", 5)).toEqual({ name: "G", octave: 5, midi: 79, vexFlowKey: "g/5" });
  });

  it("supports clean MIDI octave -1 naturals and rejects values above MIDI 127", () => {
    expect(naturalToPitch("C", -1)).toEqual({ name: "C", octave: -1, midi: 0, vexFlowKey: "c/-1" });
    expect(naturalToPitch("B", -1).midi).toBe(11);
    expect(naturalToPitch("G", 9).midi).toBe(127);
    expect(() => naturalToPitch("A", 9)).toThrow(RangeError);
    expect(() => naturalToPitch("C", -2)).toThrow(RangeError);
  });

  it("builds only validated ascending natural ranges", () => {
    expect(naturalRange(["C", -1], ["E", -1]).map((pitch) => pitch.midi)).toEqual([0, 2, 4]);
    expect(() => naturalRange(["E", 4], ["C", 4])).toThrow(RangeError);
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

describe("MIDI pitches", () => {
  it("uses canonical chromatic names and preserves MIDI octave -1", () => {
    expect(midiToPitch(0)).toEqual({ name: "C", octave: -1, midi: 0 });
    expect(midiToPitch(61)).toEqual({ name: "C#", octave: 4, midi: 61 });
    expect(midiToPitch(127)).toEqual({ name: "G", octave: 9, midi: 127 });
    expect(pitchLabel(midiToPitch(61))).toBe("C#4");
  });

  it("rejects non-canonical MIDI values", () => {
    expect(() => midiToPitch(-1)).toThrow(RangeError);
    expect(() => midiToPitch(128)).toThrow(RangeError);
    expect(() => midiToPitch(60.5)).toThrow(RangeError);
  });
});
