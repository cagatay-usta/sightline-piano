# Sightline Piano

A small, fully local piano sight-reading trainer for a USB/MIDI keyboard. It shows a short phrase, listens for notes in order, gives immediate feedback, and keeps lightweight session statistics.

## Run locally

Requirements: Node.js 20+ (or Node 22+) and current Chrome or Edge.

```bash
npm install
npm run dev
```

Open the localhost URL Vite prints. The first time you use hardware, click **Connect MIDI**, grant browser permission, then select the keyboard if more than one input is available. An Arturia KeyLab Essential Mk3 is treated as a standard MIDI input; no device-specific setup or ID is required.

The app has no backend and makes no runtime service calls. After `npm install`, it can run without an internet connection.

## Check and build

```bash
npm run typecheck
npm test
npm run build
```

The production output is written to `dist/` and can be previewed with `npm run dev` during development or any local static-file server.

## Without a MIDI keyboard

Expand **Practice without a MIDI keyboard** and click a note. This feeds the same normalized MIDI-note path used by physical hardware, so progression and scoring can be tested locally.

## Structure

- `src/music/` — pitch model, clef ranges, and pure phrase generation
- `src/midi/` — MIDI message parsing and Web MIDI lifecycle hook
- `src/exercise/` — pure progression and statistics logic
- `src/components/Notation.tsx` — isolated VexFlow rendering
- `src/App.tsx` — application state and interface composition

## v0.1 limitations

Phrases contain only natural quarter notes in beginner treble or bass ranges. Notes are evaluated in order but not in rhythm. There are no chords, rests, accidentals, audio playback, permanent history, accounts, or Safari/mobile MIDI support. Session statistics reset on refresh; only clef and phrase length preferences persist.

Physical MIDI behavior must ultimately be checked on the user's own connected controller because automated tests use normalized MIDI data rather than USB hardware.
