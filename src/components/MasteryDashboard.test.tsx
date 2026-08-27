import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MasteryDashboard } from './MasteryDashboard'
import { createMastery, type Mastery } from '../learning/mastery'

describe('mastery dashboard', () => {
  it('shows an understandable empty state', () => {
    expect(renderToStaticMarkup(<MasteryDashboard mastery={createMastery()} clef="treble" />))
      .toContain('Play a phrase to start learning')
  })
  it('formats ratios as percentages and filters by clef', () => {
    const counts = { attempts: 4, correctAttempts: 3, incorrectAttempts: 1, successfulLatencyTotalMs: 4500, lastSuccessfulLatencyMs: 1000 }
    const mastery: Mastery = {
      notes: {
        'treble:60': { ...counts, clef: 'treble', midi: 60 },
        'bass:48': { ...counts, clef: 'bass', midi: 48 },
      },
      intervals: { 'treble:2:ascending': { ...counts, clef: 'treble', size: 2, direction: 'ascending' } },
    }
    const html = renderToStaticMarkup(<MasteryDashboard mastery={mastery} clef="treble" />)
    expect(html).toContain('75%')
    expect(html).toContain('1.5s')
    expect(html).toContain('1.0s')
    expect(html).toContain('C4')
    expect(html).not.toContain('C3')
    expect(html).toContain('4 lifetime attempts')
  })
})
