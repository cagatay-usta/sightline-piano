export function parseMidiNoteOn(data: ArrayLike<number>): number | null {
  const status = data[0]
  const note = data[1]
  const velocity = data[2]
  if (status === undefined || note === undefined || velocity === undefined) return null
  if ((status & 0xf0) !== 0x90 || velocity === 0) return null
  return note >= 0 && note <= 127 ? note : null
}
