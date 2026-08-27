import { useCallback, useEffect, useMemo, useState } from 'react'
import { Notation } from './components/Notation'
import { accuracy, applyNoteAttempt, averagePhraseTime, createExercise, INITIAL_SESSION_STATS } from './exercise/exercise'
import { generatePhrase, type PhraseLength } from './music/generatePhrase'
import { pitchesForClef, type Clef } from './music/pitches'
import { useMidi } from './midi/useMidi'
import { loadClef, loadPhraseLength, saveClef, savePhraseLength } from './preferences'

function formatTime(milliseconds: number | null): string {
  if (milliseconds === null) return '—'
  return `${(milliseconds / 1000).toFixed(1)}s`
}

export default function App() {
  const [clef, setClef] = useState<Clef>(loadClef)
  const [phraseLength, setPhraseLength] = useState<PhraseLength>(loadPhraseLength)
  const [phrase, setPhrase] = useState(() => generatePhrase({ clef, length: phraseLength }))
  const [practice, setPractice] = useState(() => ({
    exercise: createExercise(),
    stats: INITIAL_SESSION_STATS,
  }))
  const [clock, setClock] = useState(() => performance.now())
  const { exercise, stats } = practice

  const submitNote = useCallback((midi: number) => {
    const now = performance.now()
    setPractice((current) => {
      const transition = applyNoteAttempt(
        current.exercise,
        current.stats,
        phrase.map((pitch) => pitch.midi),
        midi,
        now,
      )
      return { exercise: transition.exercise, stats: transition.stats }
    })
  }, [phrase])

  const midi = useMidi(submitNote)

  const startPhrase = useCallback((nextClef = clef, nextLength = phraseLength) => {
    setPhrase(generatePhrase({ clef: nextClef, length: nextLength }))
    setPractice((current) => ({ exercise: createExercise(), stats: current.stats }))
    setClock(performance.now())
  }, [clef, phraseLength])

  useEffect(() => {
    if (exercise.feedback === 'idle') return
    const feedbackId = exercise.feedbackId
    const timeout = window.setTimeout(() => {
      setPractice((current) => current.exercise.feedbackId === feedbackId
        ? { ...current, exercise: { ...current.exercise, feedback: 'idle' } }
        : current)
    }, 650)
    return () => window.clearTimeout(timeout)
  }, [exercise.feedback, exercise.feedbackId])

  useEffect(() => {
    if (exercise.status !== 'playing') return
    const interval = window.setInterval(() => setClock(performance.now()), 100)
    return () => window.clearInterval(interval)
  }, [exercise.status])

  const elapsedMs = exercise.startedAt === null
    ? null
    : (exercise.completedAt ?? clock) - exercise.startedAt
  const expected = exercise.status === 'complete' ? null : phrase[exercise.currentIndex]
  const averageMs = averagePhraseTime(stats)
  const allowedPitches = useMemo(() => pitchesForClef(clef), [clef])

  const changeClef = (value: Clef) => {
    setClef(value)
    saveClef(value)
    startPhrase(value, phraseLength)
  }

  const changeLength = (value: PhraseLength) => {
    setPhraseLength(value)
    savePhraseLength(value)
    startPhrase(clef, value)
  }

  return (
    <main className="app-shell">
      <header className="masthead">
        <div>
          <p className="eyebrow">Local MIDI practice</p>
          <h1>Sightline</h1>
        </div>
        <div className={`status-pill status-${midi.status}`} aria-live="polite">
          <span aria-hidden="true" />
          {midi.status === 'connected' ? 'MIDI ready' : midi.status === 'requesting' ? 'Connecting…' : 'MIDI not connected'}
        </div>
      </header>

      <section className="exercise-card" aria-labelledby="exercise-heading">
        <div className="exercise-heading-row">
          <div>
            <p className="eyebrow">Current phrase</p>
            <h2 id="exercise-heading">
              {exercise.status === 'complete' ? 'Phrase complete' : expected ? `Find ${expected.name}${expected.octave}` : 'Get ready'}
            </h2>
          </div>
          <div className="phrase-progress" aria-label={`${Math.min(exercise.currentIndex, phrase.length)} of ${phrase.length} notes complete`}>
            {phrase.map((pitch, index) => (
              <span key={`${pitch.midi}-${index}`} className={index < exercise.currentIndex ? 'done' : index === exercise.currentIndex && exercise.status !== 'complete' ? 'current' : ''} />
            ))}
          </div>
        </div>

        <Notation phrase={phrase} clef={clef} currentIndex={exercise.currentIndex} complete={exercise.status === 'complete'} feedback={exercise.feedback} />

        <div className="result-row" aria-live="polite">
          <p className={exercise.feedback === 'incorrect' ? 'wrong-feedback' : ''}>
            {exercise.status === 'complete'
              ? `Nicely read in ${formatTime(elapsedMs)}.`
              : exercise.feedback === 'incorrect'
                ? `That wasn't ${expected?.name}${expected?.octave}. Stay on this note.`
                : exercise.status === 'ready'
                  ? 'Play the highlighted note to start the clock.'
                  : `${exercise.currentIndex} down, ${phrase.length - exercise.currentIndex} to go.`}
          </p>
          <button className="primary-button" type="button" onClick={() => startPhrase()}>
            {exercise.status === 'complete' ? 'New phrase' : 'Next phrase'}
          </button>
        </div>
      </section>

      <div className="lower-grid">
        <section className="panel controls-panel" aria-labelledby="controls-heading">
          <p className="eyebrow">Setup</p>
          <h2 id="controls-heading">Practice controls</h2>

          <div className="control-row">
            <fieldset>
              <legend>Clef</legend>
              <div className="segmented">
                {(['treble', 'bass'] as const).map((value) => (
                  <button key={value} type="button" aria-pressed={clef === value} onClick={() => changeClef(value)}>{value}</button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>Phrase length</legend>
              <div className="segmented">
                {([4, 8] as const).map((value) => (
                  <button key={value} type="button" aria-pressed={phraseLength === value} onClick={() => changeLength(value)}>{value} notes</button>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="midi-block">
            {!midi.supported ? (
              <p className="inline-error">Web MIDI is unavailable. Use current Chrome or Edge, or try the practice keys below.</p>
            ) : (
              <>
                <div className="midi-action-row">
                  <button className="secondary-button" type="button" onClick={midi.connect} disabled={midi.status === 'requesting'}>
                    {midi.status === 'connected' || midi.status === 'no-inputs' ? 'Refresh MIDI' : 'Connect MIDI'}
                  </button>
                  {midi.status === 'no-inputs' && <span>No MIDI inputs found. Connect a keyboard, then refresh.</span>}
                </div>
                {midi.inputs.length > 0 && (
                  <label>
                    MIDI input
                    <select value={midi.selectedInputId} onChange={(event) => midi.setSelectedInputId(event.target.value)}>
                      {midi.inputs.map((input) => <option key={input.id} value={input.id}>{input.name}</option>)}
                    </select>
                  </label>
                )}
                {midi.error && <p className="inline-error" role="alert">Could not connect to MIDI: {midi.error}</p>}
              </>
            )}
          </div>

          <details className="practice-input">
            <summary>Practice without a MIDI keyboard</summary>
            <p>These buttons send notes through the same exercise path as a connected keyboard.</p>
            <div className="note-buttons">
              {allowedPitches.map((pitch) => (
                <button key={pitch.midi} type="button" onClick={() => submitNote(pitch.midi)} aria-label={`Play ${pitch.name} ${pitch.octave}`}>
                  {pitch.name}<small>{pitch.octave}</small>
                </button>
              ))}
            </div>
          </details>
        </section>

        <section className="panel stats-panel" aria-labelledby="stats-heading">
          <p className="eyebrow">This session</p>
          <h2 id="stats-heading">Practice snapshot</h2>
          <dl>
            <div><dt>Phrases</dt><dd>{stats.phrasesCompleted}</dd></div>
            <div><dt>Accuracy</dt><dd>{accuracy(stats).toFixed(0)}%</dd></div>
            <div><dt>Attempts</dt><dd>{stats.notesAttempted}</dd></div>
            <div><dt>Correct</dt><dd>{stats.correctNotes}</dd></div>
            <div><dt>Incorrect</dt><dd>{stats.incorrectNotes}</dd></div>
            <div><dt>Phrase time</dt><dd>{formatTime(elapsedMs)}</dd></div>
            <div><dt>Average time</dt><dd>{formatTime(averageMs)}</dd></div>
          </dl>
        </section>
      </div>
    </main>
  )
}
