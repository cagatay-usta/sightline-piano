import type { Clef } from './music/pitches'
import type { PhraseLength } from './music/generatePhrase'

const CLEF_KEY = 'sightline-clef'
const LENGTH_KEY = 'sightline-phrase-length'

function read(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}

function write(key: string, value: string): void {
  try { localStorage.setItem(key, value) } catch { /* Preferences are optional. */ }
}

export function loadClef(): Clef {
  const value = read(CLEF_KEY)
  return value === 'bass' ? 'bass' : 'treble'
}

export function loadPhraseLength(): PhraseLength {
  return read(LENGTH_KEY) === '8' ? 8 : 4
}

export function saveClef(clef: Clef): void { write(CLEF_KEY, clef) }
export function savePhraseLength(length: PhraseLength): void { write(LENGTH_KEY, String(length)) }
