# Piano sight-reading trainer — working specification

Build a small, fully local browser-based piano sight-reading trainer for a connected MIDI keyboard. Use React, TypeScript, Vite, the Web MIDI API, VexFlow as a normal dependency, and maintainable CSS. Target current desktop Chrome and Edge; no backend, accounts, cloud services, telemetry, API keys, or runtime network dependency.

## Required behavior

- Show one complete beginner phrase on standard notation, with notation dominant in the layout.
- Generate natural quarter notes locally. Support treble C4–G5 and bass F2–C4, with selectable 4- or 8-note phrases.
- Keep pitch conversion and phrase generation in testable domain modules. Avoid an entire phrase of one repeated note.
- Expect notes sequentially. A correct note advances exactly once; an incorrect note records an error and does not advance. Start timing with the first correct note. Show completion time and a concise result after the final correct note.
- In notation, distinguish completed/current/future notes and mark the current note without relying only on color. Keep VexFlow isolated from exercise logic and handle rendering failure gracefully.
- Request Web MIDI permission only after an explicit Connect MIDI action. Detect support, enumerate/select inputs, handle state changes/disconnection, normalize note-on messages, treat velocity-zero note-on as note-off, ignore non-note controls, and clean up listeners.
- Always provide Next phrase. Provide a light fallback input that goes through the exact same note-processing path as MIDI.
- Track session-only phrases completed, notes attempted, correct/incorrect notes, accuracy, current elapsed/completion time, and average completed-phrase time.
- Persist only validated clef and phrase-length preferences in localStorage, and remain functional if storage fails.
- Handle unsupported MIDI, denied permission, no inputs, disconnected devices, and notation errors with understandable UI.

## Engineering and validation

Use ordinary React state/hooks, strict TypeScript, modest dependencies, accessible controls, stable desktop layout, and a clean structure. Add unit tests for pitch/range generation, MIDI parsing, progression, and scoring. Verify type checking, automated tests, production build, and a local browser smoke test. Document install, development, build, browser/MIDI usage, project structure, and v0.1 limitations. Physical Arturia KeyLab Essential Mk3 validation may remain a user hardware check.

Out of scope: rhythm scoring, metronome, durations other than displayed quarter notes, chords, rests, accidentals, key signatures, audio, imports, pedagogy/adaptive systems, permanent history, authentication, backend, deployment, PWA, mobile MIDI, Safari, Electron, and Tauri.
