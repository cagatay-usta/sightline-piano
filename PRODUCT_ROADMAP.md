# Product Roadmap

## North star

Build a local, MIDI-driven piano learning application whose primary goal is to develop skills that transfer to real piano playing:

- sight-reading real notation;
- playing unfamiliar pieces fluently;
- rhythm;
- keyboard geography;
- interval recognition;
- music theory;
- eventually harmony, improvisation, and composition.

The application may use heavy gamification, but game performance must remain coupled to genuine musical performance.

The user should become better at reading normal sheet music away from the application.

## Core design principle

Real musical notation remains the source of information.

Avoid mechanics that allow the user to succeed by learning a game-specific representation instead of reading music.

For example, Guitar Hero-style falling notes may be useful as optional feedback, but should not replace staff notation as the primary stimulus.

The learning loop should remain:

see notation → understand it → locate it physically → play it → hear/feel result

rather than:

see game cue → press mapped key

## Two kinds of content

### Generated training

Algorithmically generated exercises exist to isolate and strengthen weaknesses.

Examples:

- narrow note ranges;
- stepwise melodies;
- repeated notes;
- specific intervals;
- ledger lines;
- difficult bass notes;
- accidentals;
- rhythm patterns.

These are the equivalent of drills or practice mode.

### Real music

Actual pieces and excerpts are the ultimate measure of progress.

Eventually the app should support real notation through sources such as:

- MusicXML;
- public-domain scores;
- user-imported material;
- curated exercises written specifically for the app.

Real pieces should become increasingly important as skill improves.

A useful conceptual split is:

Generated exercises = training room

Real pieces = campaign

# Product pillars

## 1. Sight-reading

Progress from:

single-note recognition\
→ short phrases\
→ intervals and patterns\
→ rhythm\
→ longer phrases\
→ continuous reading\
→ two hands\
→ complete pieces

The application should eventually teach the user to continue playing despite small mistakes rather than stopping after every incorrect note.

## 2. Adaptive learning

Measure performance rather than merely counting completed exercises.

Track things such as:

- note accuracy;
- response latency;
- interval accuracy;
- interval direction;
- clef;
- register;
- rhythm;
- recurring mistakes;
- reading speed.

Use these measurements to identify weak areas.

Generated exercises should increasingly emphasize weaknesses while continuing to review mastered material.

## 3. Pedagogical exercise generation

Replace unrestricted randomness with controlled generation.

Potential exercise dimensions include:

- note range;
- phrase length;
- stepwise motion;
- repeated notes;
- interval size;
- ascending/descending movement;
- clef;
- ledger lines;
- accidentals;
- key signatures;
- rhythm;
- hand;
- tempo.

Difficulty should represent meaningful musical complexity rather than arbitrary level numbers.

## 4. Rhythm and continuous reading

Pitch recognition alone is insufficient for real sight-reading.

Eventually support:

- quarter, half, whole and eighth notes;
- rests;
- time signatures;
- metronome;
- BPM;
- timing tolerances;
- maintaining tempo;
- reading ahead.

Early training may wait for correct answers.

More advanced modes should continue moving even after mistakes, because real performance does not pause while the player searches for a note.

## 5. Real-piece system

Eventually support importing or loading actual scores.

The system should understand useful structural concepts:

- notes;
- measures;
- phrases;
- hands;
- voices;
- tempo;
- difficulty;
- sections.

Pieces should be divisible into practice chunks.

Possible progression:

whole piece\
→ difficult section detected\
→ targeted generated drills\
→ return to piece

This creates a feedback loop between real music and isolated training.

## 6. Gamification

Gamification should increase practice volume without replacing the musical task.

Possible systems:

- XP;
- levels;
- ranks;
- combos;
- streaks;
- achievements;
- mastery ratings;
- quests;
- challenges;
- skill trees;
- personal records;
- S/A/B/C grades.

Rewards should ideally correspond to actual musical improvement.

## 7. Arcade mode

Real notation remains visible.

The player performs against time and earns:

- hits;
- perfects;
- combos;
- score multipliers;
- ranks.

This can begin with generated exercises and eventually use real musical passages.

## 8. Larger game modes

Long-term experiments can include:

- roguelite;
- auto-battler;
- lightweight RTS;
- RPG progression.

Musical performance drives game actions.

Examples:

- correct phrase → attack;
- accurate rhythm → stronger attack;
- high combo → resource multiplier;
- mistake → damage;
- difficult passage → boss encounter.

However, the notes being played should ultimately come from genuine musical material.

The ideal long-term experience is not:

"Play random C-D-E combinations to kill enemies."

It is closer to:

"Play this actual musical passage successfully to survive this encounter."

A full piece could therefore become something analogous to a level or campaign mission.

## 9. Theory

Theory exercises can reuse the MIDI and notation infrastructure.

Potential progression:

- intervals;
- scales;
- accidentals;
- key signatures;
- triads;
- chord qualities;
- inversions;
- chord symbols;
- Roman numerals;
- chord progressions;
- voice leading.

Theory should increasingly connect visual knowledge with physical keyboard knowledge.

## 10. Composition and musicianship

This is a later-stage goal rather than the core sight-reading application.

Potential exercises:

- complete a melody;
- harmonize a phrase;
- play chord tones;
- improvise over a progression;
- create bass lines;
- identify scale degrees;
- compose under constraints.

The eventual path is:

read → recognize → understand → manipulate → create

# Development roadmap

## Phase 0 — Proof of concept

Current implementation.

- Web MIDI
- VexFlow
- 4/8-note phrases
- treble/bass
- note validation
- statistics
- local-only web app

Goal: prove the complete physical-keyboard → browser → notation interaction works.

## Phase 1 — Reading trainer

Make generated exercises educational rather than random.

Add:

- pedagogical phrase generator;
- difficulty profiles;
- interval-aware generation;
- response-time measurement;
- note mastery tracking;
- interval mastery tracking;
- adaptive weighting;
- practice results/history.

Still focus primarily on pitch.

Goal: efficiently automate note-to-key recognition.

## Phase 2 — Rhythm and fluency

Add:

- note durations;
- rests;
- tempo;
- metronome;
- rhythmic evaluation;
- continuous-reading mode;
- reading-ahead mechanics.

Goal: transition from note identification to actual sight-reading.

## Phase 3 — Real pieces

Add a structured score model and support a standard notation interchange format, likely MusicXML.

Add:

- score loading;
- measures;
- multiple durations;
- passages;
- practice ranges;
- piece progress;
- performance metrics per passage.

Start with simple, public-domain or user-provided music.

Goal: directly measure whether generated training transfers to music.

## Phase 4 — Adaptive piece practice

Connect real music to the training engine.

Example:

1. User plays a piece.
2. App detects that descending thirds and certain bass notes cause repeated mistakes.
3. App generates a short targeted training session.
4. User returns to the passage.
5. Performance is measured again.

Goal: exercises exist because the music exposed a weakness.

## Phase 5 — Serious gamification

Introduce:

- XP;
- mastery levels;
- ranks;
- achievements;
- skill tree;
- quests;
- arcade scoring.

Generated exercises can still be used for short challenges.

Real pieces should increasingly drive progression.

## Phase 6 — The big game

Build one substantial game mode around actual musical performance.

Possible first candidate:

piano roguelite / auto-battler hybrid

Pieces or passages correspond to encounters.

Playing drives:

- attacks;
- defense;
- resources;
- abilities;
- combos.

Difficulty comes primarily from the music.

The game provides motivation and feedback rather than replacing notation.

## Phase 7 — Theory and creative musicianship

Expand the same platform toward:

- harmony;
- chords;
- scales;
- improvisation;
- composition exercises.

This phase supports the broader goal of producing and composing electronic music.

# Architectural guidance

The application should gradually separate these systems:

- score/music representation;
- exercise generation;
- performance evaluation;
- mastery/learning model;
- MIDI input;
- notation rendering;
- persistence;
- game mechanics.

Game systems should consume musical-performance results rather than directly owning MIDI or notation logic.

This allows the same musical exercise to be used by:

- plain practice mode;
- arcade mode;
- roguelite mode;
- future game modes.

Likewise, generated phrases and imported music should eventually feed the same performance engine.
