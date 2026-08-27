import { useCallback, useEffect, useRef, useState } from 'react'
import { Notation } from './components/Notation'
import { MasteryDashboard } from './components/MasteryDashboard'
import { MidiDiagnostics } from './components/MidiDiagnostics'
import { accuracy, averagePhraseTime, createExercise, presentExercise } from './exercise/exercise'
import { attemptPractice, seededRandom, startPractice } from './exercise/practice'
import { handlePhraseShortcut } from './exercise/shortcuts'
import type { PerformanceEvent } from './exercise/performance'
import { DIFFICULTY_PROFILES, getDifficulty, isDifficultyId } from './music/difficulty'
import { pitchLabel } from './music/pitches'
import { createMastery } from './learning/mastery'
import { useMidi } from './midi/useMidi'
import { loadProgress, saveProgress, type ProgressPreferences } from './storage/progress'

function formatTime(milliseconds: number | null): string {
  return milliseconds === null ? '—' : `${(Math.max(0, milliseconds) / 1000).toFixed(1)}s`
}
let phraseSequence = 0
function nextPhraseId(): string { return `${Date.now().toString(36)}-${++phraseSequence}` }
function randomSeed(): number { return Math.floor(Math.random() * 4294967296) }

export default function App() {
  const [loaded] = useState(loadProgress)
  const [practice, setPractice] = useState(() => startPractice(loaded.data.preferences, loaded.data.mastery, nextPhraseId()))
  const [clock, setClock] = useState(() => performance.now())
  const [storageNotice, setStorageNotice] = useState(loaded.notice)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetMessage, setResetMessage] = useState('')
  const saved = useRef({ preferences: practice.preferences, mastery: practice.mastery })
  const { preferences, phrase, exercise, stats, mastery } = practice
  const { clef, difficultyId, phraseLength, adaptive } = preferences
  const profile = getDifficulty(difficultyId)
  const allowedPitches = profile.ranges[clef]

  const submitNote = useCallback((note: number, source: PerformanceEvent['source']) => {
    if (resetOpen) return
    const now = performance.now()
    const timestamp = Date.now()
    setPractice((current) => attemptPractice(current, note, now, timestamp, source))
    setClock(now)
  }, [resetOpen])
  const submitMidi = useCallback((note: number) => submitNote(note, 'midi'), [submitNote])

  const onNotationReady = useCallback(() => {
    const id = phrase.id
    const now = performance.now()
    setPractice((current) => {
      if (current.phrase.id !== id || current.exercise.startedAt !== null) return current
      return { ...current, exercise: presentExercise(current.exercise, now) }
    })
  }, [phrase.id])

  const nextPhrase = useCallback((changes: Partial<ProgressPreferences> = {}) => {
    const id = nextPhraseId()
    const seed = randomSeed()
    setPractice((current) => startPractice(
      { ...current.preferences, ...changes }, current.mastery, id, seededRandom(seed), current.stats,
    ))
    setResetMessage('')
  }, [])

  const nextPhraseFromTransport = useCallback(() => {
    if (!resetOpen) nextPhrase()
  }, [nextPhrase, resetOpen])
  const midi = useMidi(submitMidi, nextPhraseFromTransport)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      const interactive = target instanceof Element && Boolean(target.closest(
        'input, select, textarea, button, a, summary, [contenteditable]:not([contenteditable="false"]), [role="button"], [role="textbox"], [role="dialog"], [role="alertdialog"]',
      ))
      handlePhraseShortcut(event, resetOpen, interactive, nextPhrase)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [nextPhrase, resetOpen])

  const restartPhrase = () => {
    const id = nextPhraseId()
    setPractice((current) => ({ ...current, phrase: { ...current.phrase, id }, exercise: createExercise() }))
  }

  const resetProgress = () => {
    const id = nextPhraseId()
    const seed = randomSeed()
    setPractice((current) => startPractice(current.preferences, createMastery(), id, seededRandom(seed)))
    setResetOpen(false)
    setResetMessage('Progress cleared for both clefs. Your practice settings were kept.')
  }

  // Persist after actual progress/settings changes, not during render or initial recovery.
  useEffect(() => {
    if (saved.current.preferences === preferences && saved.current.mastery === mastery) return
    const ok = saveProgress({ version: 1, preferences, mastery })
    saved.current = { preferences, mastery }
    setStorageNotice(ok ? null : 'Progress could not be saved. Practice still works, but changes may be lost on reload. Allow browser storage and try another note.')
  }, [preferences, mastery])

  useEffect(() => {
    if (exercise.feedback === 'idle') return
    const feedbackId = exercise.feedbackId
    const id = phrase.id
    const timeout = window.setTimeout(() => {
      setPractice((current) => current.phrase.id === id && current.exercise.feedbackId === feedbackId
        ? { ...current, exercise: { ...current.exercise, feedback: 'idle' } } : current)
    }, 650)
    return () => window.clearTimeout(timeout)
  }, [exercise.feedback, exercise.feedbackId, phrase.id])

  useEffect(() => {
    if (exercise.startedAt === null || exercise.status === 'complete') return
    setClock(performance.now())
    const interval = window.setInterval(() => setClock(performance.now()), 100)
    return () => window.clearInterval(interval)
  }, [exercise.startedAt, exercise.status])

  const elapsedMs = exercise.startedAt === null ? null : (exercise.completedAt ?? clock) - exercise.startedAt
  const complete = exercise.status === 'complete'
  const progressLabel = `${exercise.currentIndex} of ${phrase.notes.length} notes complete`
  const rangeLabel = `${pitchLabel(allowedPitches[0]!)}–${pitchLabel(allowedPitches[allowedPitches.length - 1]!)}`

  return (
    <main className="app-shell">
      <header className="masthead">
        <div><p className="eyebrow">Local MIDI practice · v0.2</p><h1>Sightline</h1></div>
        <div className={`status-pill status-${midi.status}`} aria-live="polite">
          <span aria-hidden="true" />
          {midi.status === 'connected' ? 'MIDI ready' : midi.status === 'requesting' ? 'Connecting…' : 'MIDI not connected'}
        </div>
      </header>

      <section className="exercise-card" aria-labelledby="exercise-heading">
        <div className="exercise-heading-row">
          <div><p className="eyebrow">{profile.name} · {clef} · {phrase.notes.length} notes</p>
            <h2 id="exercise-heading">{complete ? 'Phrase complete' : `Read note ${exercise.currentIndex + 1} of ${phrase.notes.length}`}</h2>
          </div>
          <div className="phrase-progress" aria-label={progressLabel}>{phrase.notes.map((pitch, index) => (
            <span key={`${pitch.midi}-${index}`} className={index < exercise.currentIndex ? 'done' : index === exercise.currentIndex && !complete ? 'current' : ''} />
          ))}</div>
        </div>
        <Notation phrase={phrase.notes} clef={clef} currentIndex={exercise.currentIndex} complete={complete} feedback={exercise.feedback} onReady={onNotationReady} />
        <div className="result-row">
          <p aria-live="polite" className={exercise.feedback === 'incorrect' ? 'wrong-feedback' : ''}>
            {complete ? `Phrase read in ${formatTime(elapsedMs)} · ${exercise.errors} incorrect attempt${exercise.errors === 1 ? '' : 's'}.`
              : exercise.feedback === 'incorrect' ? 'Not quite. Try the marked note again.'
              : exercise.status === 'ready' ? 'Read the staff and play the note marked NEXT.'
              : `${exercise.currentIndex} down, ${phrase.notes.length - exercise.currentIndex} to go.`}
          </p>
          <div className="phrase-actions">
            <button className="text-button" type="button" onClick={restartPhrase}>Restart phrase</button>
            <button className="primary-button" type="button" onClick={() => nextPhrase()}>Next phrase</button>
          </div>
        </div>
        <p className="timing-help">Next phrase: controller Play or Space outside controls. Response timing starts when the staff appears. Connect your keyboard first, or restart when ready. No rhythm scoring.</p>
      </section>

      <div className="lower-grid">
        <section className="panel controls-panel" aria-labelledby="controls-heading">
          <p className="eyebrow">Setup</p><h2 id="controls-heading">Practice controls</h2>
          <label className="difficulty-control">Difficulty profile
            <select value={difficultyId} onChange={(event) => {
              const value = event.target.value
              if (isDifficultyId(value)) nextPhrase({ difficultyId: value, phraseLength: getDifficulty(value).defaultLength })
            }}>{DIFFICULTY_PROFILES.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          </label>
          <p className="section-help">{profile.description} Range: {rangeLabel}. These are exercise settings, not a complete curriculum.</p>
          <div className="control-row">
            <fieldset><legend>Clef</legend><div className="segmented">{(['treble', 'bass'] as const).map((value) => (
              <button key={value} type="button" aria-pressed={clef === value} onClick={() => nextPhrase({ clef: value })}>{value}</button>
            ))}</div></fieldset>
            <fieldset><legend>Phrase length</legend><div className="segmented">{([4, 8] as const).map((value) => (
              <button key={value} type="button" disabled={!profile.lengths.includes(value)} aria-pressed={phraseLength === value} onClick={() => nextPhrase({ phraseLength: value })}>{value} notes</button>
            ))}</div></fieldset>
          </div>
          <label className="checkbox-label"><input type="checkbox" checked={adaptive} onChange={(event) => nextPhrase({ adaptive: event.target.checked })} />Adaptive note practice</label>
          <p className="section-help">Gently revisit missed notes within this profile. All notes remain possible. Changing settings starts a new phrase.</p>
          <div className="midi-block">
            {!midi.supported ? <p className="inline-error">Web MIDI is unavailable. Use current Chrome or Edge on localhost, or try the practice keys below.</p> : (
              <>
                <div className="midi-action-row">
                  <button className="secondary-button" type="button" onClick={midi.connect} disabled={midi.status === 'requesting'}>
                    {midi.status === 'connected' || midi.status === 'no-inputs' ? 'Refresh MIDI' : 'Connect MIDI'}
                  </button>
                  {midi.status === 'no-inputs' && <span>No MIDI inputs found. Connect a keyboard, then refresh.</span>}
                </div>
                {midi.inputs.length > 0 && <label>MIDI input<select value={midi.selectedInputId} onChange={(event) => midi.setSelectedInputId(event.target.value)}>{midi.inputs.map((input) => <option key={input.id} value={input.id}>{input.name}</option>)}</select></label>}
                {midi.inputs.length > 0 && <p className="section-help">KeyLab Essential mk3 piano keys and Play (CC21, channel 1) use the same regular MIDI input. No separate Play port or controller mode change is needed.</p>}
                {midi.error && <p className="inline-error" role="alert">Could not connect to MIDI: {midi.error}</p>}
              </>
            )}
          </div>
          <MidiDiagnostics available={midi.inputs.length > 0} recording={midi.diagnosticsEnabled} snapshot={midi.diagnostics}
            context={{ pianoInput: midi.inputs.find((input) => input.id === midi.selectedInputId)?.name ?? 'None',
              inputs: midi.inputs.map((input) => input.name) }}
            onStart={midi.startDiagnostics} onStop={midi.stopDiagnostics} onClear={midi.clearDiagnostics} />
          <details className="practice-input">
            <summary>Practice without a MIDI keyboard</summary>
            <p>Test keys use the same scoring and saved progress as MIDI. For physical keyboard learning, use your MIDI controller.</p>
            <div className="note-buttons">{allowedPitches.map((pitch) => <button key={pitch.midi} type="button" onClick={() => submitNote(pitch.midi, 'manual')} aria-label={`Play ${pitch.name} ${pitch.octave}`}>{pitch.name}<small>{pitch.octave}</small></button>)}</div>
          </details>
        </section>

        <section className="panel stats-panel" aria-labelledby="stats-heading">
          <p className="eyebrow">This session</p><h2 id="stats-heading">Practice snapshot</h2>
          <dl>
            <div><dt>Phrases</dt><dd>{stats.phrasesCompleted}</dd></div>
            <div><dt>Accuracy</dt><dd>{stats.notesAttempted ? `${accuracy(stats).toFixed(0)}%` : '—'}</dd></div>
            <div><dt>Attempts</dt><dd>{stats.notesAttempted}</dd></div>
            <div><dt>Correct</dt><dd>{stats.correctNotes}</dd></div>
            <div><dt>Incorrect</dt><dd>{stats.incorrectNotes}</dd></div>
            <div><dt>Phrase time</dt><dd>{formatTime(elapsedMs)}</dd></div>
            <div><dt>Average time</dt><dd>{formatTime(averagePhraseTime(stats))}</dd></div>
            <div><dt>Last response</dt><dd>{exercise.lastEvent?.correct ? formatTime(exercise.lastEvent.responseLatencyMs) : '—'}</dd></div>
          </dl>
          <p className="section-help">Session totals reset on reload. Note and interval progress below stays saved locally.</p>
        </section>
      </div>

      <MasteryDashboard mastery={mastery} clef={clef} />
      <footer className="progress-footer">
        <div aria-live="polite">
          {storageNotice && <p className="inline-error" role="status">{storageNotice}</p>}
          {resetMessage && <p>{resetMessage}</p>}
          <p className="section-help">Only preferences and aggregate mastery are saved in this browser. No account, cloud sync, or raw performance history.</p>
        </div>
        <button className="text-button danger-text" type="button" onClick={() => setResetOpen(true)}>Reset progress</button>
      </footer>
      {resetOpen && <div className="reset-confirmation" role="alertdialog" aria-labelledby="reset-title" aria-describedby="reset-description" onKeyDown={(event) => { if (event.key === 'Escape') setResetOpen(false) }}>
        <h3 id="reset-title">Reset all practice progress?</h3>
        <p id="reset-description">Delete saved note and interval statistics for both clefs and clear this session. Your clef, difficulty, phrase length, and adaptive setting will be kept. This cannot be undone.</p>
        <div className="phrase-actions"><button className="secondary-button" type="button" autoFocus onClick={() => setResetOpen(false)}>Cancel</button><button className="danger-button" type="button" onClick={resetProgress}>Delete practice progress</button></div>
      </div>}
    </main>
  )
}
