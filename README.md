# Sightline Piano

A small, fully local piano sight-reading trainer for a USB/MIDI keyboard. It shows constrained beginner phrases, listens for notes in order, and tracks note and interval mastery. Standard notation stays the primary reading cue.

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

The production output is written to `dist/`. `npm run dev` serves the development app; use a local static-file server to serve `dist/` for a production preview. No lint or formatter command is configured.

## Without a MIDI keyboard

Expand **Practice without a MIDI keyboard** and click a note. This feeds the same evaluation and mastery path used by physical hardware. Test-key attempts count toward saved progress too; use MIDI for physical keyboard learning.

## Difficulty and adaptive practice

All ranges are inclusive natural notes. These profiles are exercise settings, not a complete piano curriculum.

| Profile | Treble range | Bass range | Length | Largest adjacent interval |
| --- | --- | --- | --- | --- |
| Beginner 1 | C4–E4 | C3–E3 | 4 | Second |
| Beginner 2 | C4–G4 | C3–G3 | 4 | Third |
| Beginner 3 | C4–C5 | C3–C4 | 4 or 8 | Fourth |
| Beginner 4 | C4–G5 | F2–C4 | 4 or 8; defaults to 8 | Fifth |

The generator favors steps, permits occasional repeated notes, and rejects all-identical phrases. Each profile supplies its repeat probability and step weight. Seeded/injected randomness makes the pure generator testable.

**Adaptive note practice** is on by default and can be switched off. For each note in the selected clef, its relative selection weight is:

```text
weight = clamp(1 + 2 × (incorrect / (attempts + 2)) × (attempts / (attempts + 4)), 1, 3)
```

Unseen and zero-error notes have weight 1. The evidence factor limits the effect of a single mistake; repeated errors gradually increase exposure. The weights affect the first note and legal non-repeat choices, never the pitch range or maximum interval. Every note in the selected profile remains possible. Response times and interval statistics are displayed, but do not drive adaptation in v0.2.

Changing difficulty, clef, phrase length, or adaptation starts a new phrase. **Next phrase** skips to a fresh phrase; **Restart phrase** keeps the notes and restarts timing. Both retain attempts already recorded.

### Hands-free next phrase

Press the controller's **Play** button or press **Space** in the page to generate the next phrase, even mid-phrase. Both use the same action as **Next phrase**, preserving recorded attempts. Space does not hijack buttons, dropdowns, text fields, or other interactive controls; click the staff first if needed. Holding Space does not skip repeatedly. Shortcuts are blocked while the reset confirmation is open.

For the KeyLab Essential Mk3, keep the regular **MIDI** port selected for piano keys. The app automatically selects a single clearly named MCU/DAW transport port; if needed, choose the controller's **MCU/HUI** port under **Play button input (MCU)**. Set the controller's transport mode to **MCU**, not HUI/Both, as described in [Arturia's transport setup](https://support.arturia.com/hc/en-us/articles/8905862388508-KeyLab-Essential-mk3-DAW-Integration). Manual port choices last until reload; automatic detection runs again on connection.

Supported messages are MIDI Start/Continue and MCU Play (note 94 on the selected transport port). Releases, held MCU presses, clock, and Stop do not advance; duplicate transport signals within 150 ms are coalesced. Ordinary note 94 on a separate piano port is still evaluated as a note. Custom CC mappings, HUI, and SysEx/MMC are not supported; no extra SysEx permission is requested.

## Timing and mastery

- Timing starts after the staff is drawn, including for the first note. After a correct note, timing for the next starts immediately.
- Incorrect attempts do not advance or restart the timer. The eventual correct response includes time spent on retries.
- Connect your keyboard before practicing, then restart the phrase when ready. Idle time, setup time, and time spent away from the tab are included; there is no pause or rhythm scoring.
- Every accepted note-on/manual attempt creates a normalized event with expected/played pitches and MIDI numbers, correctness, latency, clef, phrase ID, zero-based position, difficulty, previous expected pitch/interval, timestamp, and input source. Note-offs, velocity-zero note-ons, invalid MIDI, and input after phrase completion do not count.
- Errors belong to the **expected** note, not the key mistakenly played. Notes are tracked separately by clef. Intervals use diatonic size and ascending/descending/unison direction, based on consecutive expected notes; the first note has no interval.
- The dashboard shows lowest accuracy, longest average successful responses, interval focus, and expandable statistics. Accuracy is correct attempts divided by all attempts. Latency averages use successful responses only, including retries; the latest successful latency is also shown. Small samples are tentative, not a grade.

## Local progress and reset

The `sightline-progress` localStorage entry uses schema version **1** (independent of app version). It saves preferences and note/interval aggregates: counts, total successful latency, and latest successful latency. Raw event history is not persisted. Session totals reset on reload; mastery remains.

Storage belongs to this browser and exact origin: `localhost` and `127.0.0.1`, different ports, and other browsers have separate progress. Use the same URL each time. There is no cloud sync, export, or multi-tab conflict resolution; practice in one tab.

The loader validates saved data. Missing data gets defaults; v0.1 preferences migrate (the old 8-note setting maps to Beginner 3). Malformed, incompatible, or newer-schema data falls back safely with a visible notice, retaining valid preferences where possible. Loading does not overwrite the original entry; the next progress/settings change saves current state. Blocked storage or failed writes show a warning while practice remains usable in memory.

**Reset progress** asks for confirmation before clearing saved mastery for both clefs and current session totals. It preserves practice preferences and starts a fresh phrase. This cannot be undone. Cancel leaves progress unchanged.

## Structure

- `src/music/` — canonical pitch model, difficulty profiles, centralized diatonic intervals, and constrained phrase generation
- `src/midi/` — MIDI message parsing and Web MIDI lifecycle hook
- `src/exercise/` — normalized performance events, pure progression/timing, and practice-state orchestration
- `src/learning/` — immutable mastery aggregation, derived metrics, and capped adaptive weights
- `src/storage/` — versioned persistence, validation, and legacy preference migration
- `src/components/Notation.tsx` — isolated VexFlow rendering
- `src/components/MasteryDashboard.tsx` — compact mastery summary and detailed tables
- `src/App.tsx` — application state and interface composition

The domain modules stay independent of React and browser storage. `App` integrates input, notation readiness, pure state transitions, and persistence effects. See `PLAN_HANDOFF.md` for the v0.2 specification and `PRODUCT_ROADMAP.md` for later milestones.

## v0.2 limitations

Phrases contain only natural quarter notes in beginner treble or bass ranges. Notes are evaluated in order but not in rhythm. There are no chords, rests, accidentals in generated exercises, audio playback, raw/history charts, accounts, or Safari/mobile MIDI support. No new dependencies or runtime services were added for v0.2.

Physical MIDI behavior must ultimately be checked on the user's own connected controller because automated tests use normalized MIDI data rather than USB hardware.
