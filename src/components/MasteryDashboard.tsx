import { conceptAccuracy, meanSuccessfulLatency, type Mastery, type ConceptStats } from '../learning/mastery'
import { midiToPitch, pitchLabel, type Clef } from '../music/pitches'

function percent(stats: ConceptStats): string {
  const value = conceptAccuracy(stats)
  return value === null ? '—' : `${(value * 100).toFixed(0)}%`
}
function seconds(value: number | null): string {
  return value === null ? '—' : `${(value / 1000).toFixed(1)}s`
}
const intervalNames: Record<number, string> = { 1: 'Unison', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th', 6: '6th', 7: '7th', 8: 'Octave' }

export function MasteryDashboard({ mastery, clef }: { mastery: Mastery; clef: Clef }) {
  const notes = Object.values(mastery.notes).filter((note) => note.clef === clef)
  const total = notes.reduce((sum, note) => sum + note.attempts, 0)
  const weak = [...notes].sort((a, b) => (conceptAccuracy(a) ?? 1) - (conceptAccuracy(b) ?? 1) || b.attempts - a.attempts).slice(0, 3)
  const slow = notes.filter((note) => note.correctAttempts > 0).sort((a, b) => (meanSuccessfulLatency(b) ?? 0) - (meanSuccessfulLatency(a) ?? 0)).slice(0, 3)
  const intervals = Object.values(mastery.intervals).filter((interval) => interval.clef === clef)
    .sort((a, b) => (conceptAccuracy(a) ?? 1) - (conceptAccuracy(b) ?? 1) || b.attempts - a.attempts)

  return (
    <section className="panel mastery-panel" aria-labelledby="mastery-heading">
      <div className="mastery-heading-row">
        <div><p className="eyebrow">Saved on this browser · {clef} clef</p><h2 id="mastery-heading">Your reading progress</h2></div>
        <span className="attempt-total">{total} lifetime attempts</span>
      </div>
      <p className="section-help">A practice snapshot, not a grade. Small samples are tentative; compare the latest successful response with your average.</p>
      {notes.length === 0 ? <p className="empty-state">Play a phrase to start learning which notes and intervals need practice. Treble and bass are tracked separately.</p> : (
        <>
          <div className="insight-grid">
            <div><h3>Lowest accuracy</h3><ul>{weak.map((note) => <li key={note.midi}><span>{pitchLabel(midiToPitch(note.midi))}</span><strong>{percent(note)}</strong><small>{note.attempts} attempts</small></li>)}</ul></div>
            <div><h3>Longest responses</h3>{slow.length === 0 ? <p className="section-help">Complete a correct note to measure response time.</p> : <ul>{slow.map((note) => <li key={note.midi}><span>{pitchLabel(midiToPitch(note.midi))}</span><strong>{seconds(meanSuccessfulLatency(note))}</strong><small>{note.correctAttempts} correct</small></li>)}</ul>}</div>
            <div><h3>Interval focus</h3>{intervals.length === 0 ? <p className="section-help">Intervals are measured from the second note in each phrase.</p> : <ul>{intervals.slice(0, 3).map((interval) => <li key={`${interval.direction}-${interval.size}`}><span>{interval.direction === 'unison' ? 'Unison' : `${interval.direction === 'ascending' ? '↑' : '↓'} ${intervalNames[interval.size] ?? interval.size}`}</span><strong>{percent(interval)}</strong><small>{interval.attempts} attempts</small></li>)}</ul>}</div>
          </div>
          <details className="mastery-details">
            <summary>All note and interval statistics</summary>
            <div className="table-scroll"><table><caption>Note accuracy and successful response latency · {clef}</caption><thead><tr><th>Note</th><th>Attempts</th><th>Correct</th><th>Incorrect</th><th>Accuracy</th><th>Average</th><th>Latest</th></tr></thead><tbody>{[...notes].sort((a, b) => a.midi - b.midi).map((note) => <tr key={note.midi}><th scope="row">{pitchLabel(midiToPitch(note.midi))}</th><td>{note.attempts}</td><td>{note.correctAttempts}</td><td>{note.incorrectAttempts}</td><td>{percent(note)}</td><td>{seconds(meanSuccessfulLatency(note))}</td><td>{seconds(note.lastSuccessfulLatencyMs)}</td></tr>)}</tbody></table></div>
            {intervals.length > 0 && <div className="table-scroll"><table><caption>Expected intervals · {clef}</caption><thead><tr><th>Interval</th><th>Direction</th><th>Attempts</th><th>Correct</th><th>Incorrect</th><th>Accuracy</th></tr></thead><tbody>{intervals.map((interval) => <tr key={`${interval.direction}-${interval.size}`}><th scope="row">{intervalNames[interval.size] ?? `${interval.size}th`}</th><td>{interval.direction}</td><td>{interval.attempts}</td><td>{interval.correctAttempts}</td><td>{interval.incorrectAttempts}</td><td>{percent(interval)}</td></tr>)}</tbody></table></div>}
          </details>
        </>
      )}
    </section>
  )
}
