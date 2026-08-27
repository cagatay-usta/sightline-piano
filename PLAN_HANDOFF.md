# Plan Handoff — v0.2 Pedagogical Phrase Generation and Mastery Tracking

## Goal

Upgrade the existing sight-reading proof of concept into a basic adaptive reading trainer.

Replace unrestricted random phrase generation with controlled pedagogical generation and begin tracking the user's performance by musical concept.

The implementation should remain pitch-focused.

Rhythm, real-score importing, and major game mechanics are later milestones.

## Context

The repository should already contain the v0.1 React/TypeScript/Vite application from the previous handoff.

The existing application should already provide some or all of the following:

- Web MIDI input;
- VexFlow notation rendering;
- phrase progression;
- treble/bass clef selection;
- 4-note and/or 8-note phrases;
- fallback input without physical MIDI hardware;
- session statistics;
- local-only execution.

Inspect the repository before making architectural decisions.

Preserve working functionality unless a refactor is materially necessary.

Refer to `PRODUCT_ROADMAP.md` for the long-term product direction.

The user is a beginner piano player whose primary near-term goal is to improve genuine sight-reading ability.

The application should optimize for transferable musical skill, not merely performance inside the application.

## Requirements

### 1. Difficulty profiles

Introduce explicit beginner-oriented difficulty profiles.

Use simple names or levels that are easy to understand.

A reasonable initial progression is:

#### Beginner 1

- very small pitch range;
- mostly adjacent notes;
- 4-note phrases;
- minimal interval movement.

#### Beginner 2

- wider five-note range;
- primarily steps;
- occasional skips;
- 4-note phrases.

#### Beginner 3

- approximately one-octave range;
- repeated notes;
- seconds and thirds;
- occasional larger movement;
- 4- or 8-note phrases.

#### Beginner 4

- wider staff range;
- seconds, thirds, fourths;
- occasional fifths;
- more directional changes;
- primarily 8-note phrases.

Exact pitch ranges may be refined during implementation.

Do not present these levels as a complete piano curriculum.

The difficulty system should be structured so future profiles can incorporate:

- accidentals;
- ledger lines;
- rhythm;
- hand independence;
- tempo;
- key signatures.

Do not implement those features now.

### 2. Structured phrase generator

Replace unrestricted random phrase generation with a parameterized generator.

The generator should support at least:

- clef;
- allowed pitch range;
- phrase length;
- maximum interval size;
- repeated-note probability;
- stepwise-motion weighting;
- optional adaptive note weighting.

Phrase generation logic should be independent of React rendering.

Prefer pure TypeScript functions.

Where practical, support an injected random-number source or seeded generation so tests can validate deterministic behavior.

Avoid degenerate phrases such as:

- all notes being identical;
- repeated extreme jumps at beginner levels;
- notes outside the selected difficulty range.

### 3. Musical interval model

For each adjacent pair of expected notes, derive a reusable interval representation.

At minimum capture:

- interval size;
- ascending direction;
- descending direction;
- repeated note / unison.

Keep interval calculation logic centralized.

The representation should be suitable for future mastery tracking and later theory features.

### 4. Performance events

Introduce a normalized performance-event model for note attempts.

For each attempted note, record enough data to support future analysis.

At minimum include:

- expected pitch;
- played pitch;
- expected MIDI note;
- played MIDI note;
- correct/incorrect result;
- response latency;
- clef;
- phrase identifier;
- position within phrase;
- difficulty profile;
- previous expected pitch when applicable;
- expected interval when applicable;
- timestamp.

Do not tightly couple this event structure to UI components.

Both physical MIDI input and fallback/manual input should flow through the same evaluation path.

### 5. Response latency

Measure how long the user takes to respond to each expected note.

Define the timer behavior clearly.

A reasonable rule is:

- when a phrase appears, timing for the first note begins;
- after a correct note, timing for the next expected note begins immediately;
- incorrect notes do not reset the timer for that expected note;
- record total response latency when the correct note is eventually played.

If implementation reveals a better model, document it clearly.

The goal is to measure how automatic note recognition is becoming, not just whether the user eventually finds the correct key.

### 6. Note mastery statistics

Track aggregate performance by individual note.

At minimum track:

- attempts;
- correct attempts;
- incorrect attempts;
- accuracy percentage;
- average successful response latency;
- optionally recent response latency.

Keep the underlying stored values sufficient to recalculate derived metrics.

Do not store only display-ready percentages.

### 7. Interval mastery statistics

Track aggregate performance for intervals between consecutive expected notes.

At minimum track:

- interval size;
- direction;
- attempts;
- correct attempts;
- incorrect attempts;
- accuracy.

Where practical, distinguish:

- ascending;
- descending;
- repeated/unison.

Do not build a complete music-theory taxonomy yet.

The purpose is to discover patterns such as:

- descending thirds are difficult;
- ascending seconds are easy;
- larger jumps produce more mistakes.

### 8. Weakness-aware generation

Introduce a simple adaptive weighting mechanism.

Poorly performing notes should gradually become somewhat more likely to appear in generated phrases.

The mechanism should remain intentionally simple and transparent.

Do not introduce machine learning.

Requirements:

- mastered notes must not disappear entirely;
- weak notes should receive increased practice exposure;
- new/unseen notes should still appear;
- adaptation should respect the selected difficulty profile;
- adaptive weighting should not override musical constraints such as maximum interval size.

Cap weighting so the generator does not repeatedly spam one problematic note.

Prefer a clearly documented formula over opaque behavior.

### 9. Progress persistence

Persist mastery data locally.

Use the browser-local persistence approach most appropriate to the current repository.

If `localStorage` remains sufficient, prefer it rather than introducing IndexedDB unnecessarily.

Persist at least:

- note mastery;
- interval mastery;
- selected difficulty;
- relevant practice preferences.

Introduce a version number for the persisted data schema.

The app must handle:

- missing data;
- malformed data;
- older schema versions;
- incompatible saved data.

Bad persisted state must never prevent application startup.

### 10. Reset progress

Provide an explicit `Reset progress` control.

It should:

- clearly indicate what will be removed;
- reset mastery/progress data;
- leave the app usable immediately afterward.

Use a simple confirmation step if appropriate.

Do not add account-like profile management.

### 11. Practice dashboard

Add a modest progress/mastery view.

Show useful learning information rather than generic analytics.

Potential sections include:

- weakest notes;
- slowest notes;
- strongest notes;
- note accuracy;
- average response latency;
- interval weaknesses;
- total attempts.

Keep the dashboard compact.

Do not build a large analytics product.

The dashboard should help answer questions such as:

- Which notes do I hesitate on?
- Which notes do I often miss?
- Which intervals cause problems?
- Am I becoming faster?

### 12. Preserve sight-reading focus

Do not add game mechanics in this version.

Do not introduce alternate visual representations that replace standard notation.

The staff must remain the primary information source.

The purpose of this version is to strengthen the learning engine that later game systems will consume.

## Constraints

Everything must remain local.

Do not add:

- backend services;
- cloud storage;
- authentication;
- paid services;
- API keys;
- hosted AI;
- telemetry;
- external analytics;
- user accounts;
- remote databases.

Avoid large new dependencies.

Do not introduce:

- Redux or another global state library unless clearly justified by the current codebase;
- Electron;
- Tauri;
- Next.js;
- Docker;
- server frameworks;
- databases.

Do not rewrite working v0.1 functionality unnecessarily.

Favor pure TypeScript modules for:

- phrase generation;
- note calculations;
- interval calculations;
- performance event processing;
- mastery aggregation;
- adaptive weighting.

These modules should be testable without rendering React components.

Keep the architecture understandable to a frontend developer.

## Implementation plan

1. Inspect the existing repository thoroughly.
2. Identify the current domain models, phrase generator, exercise state, persistence logic, MIDI handling, and notation integration.
3. Run the existing application and existing tests before modifying behavior where practical.
4. Refactor music-domain types only where needed for the new requirements.
5. Add centralized interval calculation utilities.
6. Add tests for note and interval calculations.
7. Introduce difficulty-profile definitions.
8. Replace unrestricted phrase generation with the new parameterized pedagogical generator.
9. Add deterministic or injectable randomness for generator tests where practical.
10. Add tests covering phrase length, pitch ranges, maximum intervals, repetition constraints, and difficulty differences.
11. Introduce the normalized performance-event model.
12. Route MIDI and fallback inputs through the same note-attempt evaluation path.
13. Implement per-note response latency tracking.
14. Implement note mastery aggregation.
15. Implement interval mastery aggregation.
16. Add versioned local persistence for mastery data.
17. Add safe loading and fallback behavior for malformed or outdated persisted data.
18. Implement the simple adaptive weighting system.
19. Integrate adaptive weights into phrase generation without breaking difficulty constraints.
20. Add tests for mastery aggregation and adaptive weighting.
21. Add the practice/mastery dashboard.
22. Add `Reset progress`.
23. Verify existing MIDI behavior remains intact.
24. Verify VexFlow rendering and phrase progression still work correctly.
25. Run linting, formatting, type checking, tests, and production build.
26. Update the README to explain:
    - difficulty profiles;
    - adaptive phrase generation;
    - mastery tracking;
    - response latency;
    - local persistence;
    - progress reset;
    - relevant architectural modules.
27. Finish with a concise report of:
    - major changes;
    - important architectural decisions;
    - tests performed;
    - any physical-MIDI validation still required by the user.

Suitable bounded work may be delegated to Luna subagents, especially:

- interval utility implementation/tests;
- phrase-generator tests;
- mastery aggregation tests;
- review of persistence migration/error handling.

Codex should integrate and review all delegated work before completion.

## Acceptance checks

The implementation is complete when all of the following are true:

- Existing v0.1 MIDI exercise behavior still works.
- Existing fallback/manual input still works.
- Treble and bass modes still work.
- Difficulty profiles exist and are user-selectable.
- Lower difficulty generates visibly simpler phrases than higher difficulty.
- Generated phrases respect configured pitch ranges.
- Generated phrases respect maximum interval constraints.
- Phrase generation avoids obvious degenerate output.
- Interval calculations are covered by automated tests.
- Each note attempt creates a normalized performance event.
- Correct and incorrect attempts are recorded correctly.
- Response latency is recorded for expected notes.
- Per-note attempts are tracked.
- Per-note accuracy is calculated.
- Per-note average response latency is available.
- Interval attempts and accuracy are tracked.
- Ascending and descending interval performance can be distinguished where implemented.
- Mastery data persists across page reloads.
- Malformed persisted data does not break application startup.
- Persisted data has an explicit schema version.
- Weak notes become somewhat more likely to appear in future phrases.
- Mastered notes remain represented.
- Adaptation does not violate difficulty constraints.
- Resetting progress removes mastery data safely.
- A compact progress/mastery view is available.
- No cloud service, API key, account, or paid service is introduced.
- Unit tests pass.
- Type checking passes.
- Linting passes if configured.
- Production build succeeds.
- README documentation matches the implementation.

## Out of scope

Do not implement the following in this version:

- rhythmic scoring;
- note durations beyond the current simple notation model;
- tempo enforcement;
- metronome;
- rests;
- continuous-reading timing;
- two-hand notation;
- chords;
- simultaneous-note evaluation;
- accidentals unless already required by existing behavior;
- key signatures;
- MusicXML;
- score import;
- real pieces;
- piece segmentation;
- game mechanics;
- XP;
- levels;
- roguelite systems;
- achievements;
- full curriculum design;
- AI-generated exercises;
- ear training;
- audio input;
- microphone pitch recognition;
- composition exercises.

Design decisions should not unnecessarily prevent these features from being added later.

## Open decisions

None required before implementation.

Prefer simple, extensible decisions consistent with `PRODUCT_ROADMAP.md`.
