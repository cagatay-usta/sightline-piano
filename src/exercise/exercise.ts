export type ExerciseStatus = 'ready' | 'playing' | 'complete'

export interface ExerciseState {
  readonly status: ExerciseStatus
  readonly currentIndex: number
  readonly startedAt: number | null
  readonly completedAt: number | null
  readonly feedback: 'idle' | 'correct' | 'incorrect'
  readonly feedbackId: number
}

export interface SessionStats {
  readonly phrasesCompleted: number
  readonly notesAttempted: number
  readonly correctNotes: number
  readonly incorrectNotes: number
  readonly totalCompletedTimeMs: number
}

export interface NoteTransition {
  readonly exercise: ExerciseState
  readonly stats: SessionStats
  readonly wasCorrect: boolean
  readonly didComplete: boolean
}

export const INITIAL_SESSION_STATS: SessionStats = {
  phrasesCompleted: 0,
  notesAttempted: 0,
  correctNotes: 0,
  incorrectNotes: 0,
  totalCompletedTimeMs: 0,
}

export function createExercise(): ExerciseState {
  return {
    status: 'ready',
    currentIndex: 0,
    startedAt: null,
    completedAt: null,
    feedback: 'idle',
    feedbackId: 0,
  }
}

export function applyNoteAttempt(
  exercise: ExerciseState,
  stats: SessionStats,
  phraseMidi: readonly number[],
  playedMidi: number,
  now: number,
): NoteTransition {
  if (exercise.status === 'complete' || phraseMidi.length === 0) {
    return { exercise, stats, wasCorrect: false, didComplete: false }
  }

  const correct = phraseMidi[exercise.currentIndex] === playedMidi
  const nextStats = {
    ...stats,
    notesAttempted: stats.notesAttempted + 1,
    correctNotes: stats.correctNotes + (correct ? 1 : 0),
    incorrectNotes: stats.incorrectNotes + (correct ? 0 : 1),
  }

  if (!correct) {
    return {
      exercise: {
        ...exercise,
        feedback: 'incorrect',
        feedbackId: exercise.feedbackId + 1,
      },
      stats: nextStats,
      wasCorrect: false,
      didComplete: false,
    }
  }

  const startedAt = exercise.startedAt ?? now
  const nextIndex = exercise.currentIndex + 1
  const didComplete = nextIndex === phraseMidi.length
  const completedAt = didComplete ? now : null

  return {
    exercise: {
      status: didComplete ? 'complete' : 'playing',
      currentIndex: nextIndex,
      startedAt,
      completedAt,
      feedback: 'correct',
      feedbackId: exercise.feedbackId + 1,
    },
    stats: {
      ...nextStats,
      phrasesCompleted: nextStats.phrasesCompleted + (didComplete ? 1 : 0),
      totalCompletedTimeMs:
        nextStats.totalCompletedTimeMs + (didComplete ? Math.max(0, now - startedAt) : 0),
    },
    wasCorrect: true,
    didComplete,
  }
}

export function accuracy(stats: SessionStats): number {
  return stats.notesAttempted === 0 ? 100 : (stats.correctNotes / stats.notesAttempted) * 100
}

export function averagePhraseTime(stats: SessionStats): number | null {
  return stats.phrasesCompleted === 0
    ? null
    : stats.totalCompletedTimeMs / stats.phrasesCompleted
}
