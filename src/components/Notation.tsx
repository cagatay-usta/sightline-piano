import { useEffect, useRef, useState } from 'react'
import { Annotation, Formatter, Renderer, Stave, StaveNote, Voice } from 'vexflow'
import type { Phrase } from '../music/generatePhrase'
import type { Clef } from '../music/pitches'

interface NotationProps {
  phrase: Phrase
  clef: Clef
  currentIndex: number
  complete: boolean
  feedback: 'idle' | 'correct' | 'incorrect'
}

export function Notation({ phrase, clef, currentIndex, complete, feedback }: NotationProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [renderError, setRenderError] = useState(false)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const draw = () => {
      try {
        setRenderError(false)
        host.replaceChildren()
        const width = Math.max(560, Math.floor(host.clientWidth))
        const renderer = new Renderer(host, Renderer.Backends.SVG)
        renderer.resize(width, 235)
        const context = renderer.getContext()
        const stave = new Stave(18, 62, width - 36)
        stave.addClef(clef).addTimeSignature(`${phrase.length}/4`).setContext(context).draw()

        const notes = phrase.map((pitch, index) => {
          const note = new StaveNote({ clef, keys: [pitch.vexFlowKey], duration: 'q' })
          if (index < currentIndex || complete) {
            note.setStyle({ fillStyle: '#62756b', strokeStyle: '#62756b' })
          } else if (index === currentIndex) {
            note.setStyle({ fillStyle: feedback === 'incorrect' ? '#b8493f' : '#173d35', strokeStyle: feedback === 'incorrect' ? '#b8493f' : '#173d35' })
            const marker = new Annotation(feedback === 'incorrect' ? 'TRY AGAIN' : 'NEXT')
              .setVerticalJustification(Annotation.VerticalJustify.BOTTOM)
            note.addModifier(marker)
          } else {
            note.setStyle({ fillStyle: '#1f2624', strokeStyle: '#1f2624' })
          }
          return note
        })

        const voice = new Voice({ numBeats: phrase.length, beatValue: 4 }).addTickables(notes)
        new Formatter().joinVoices([voice]).format([voice], width - 145)
        voice.draw(context, stave)
      } catch (error) {
        console.error('Notation rendering failed', error)
        host.replaceChildren()
        setRenderError(true)
      }
    }

    draw()
    const observer = new ResizeObserver(draw)
    observer.observe(host)
    return () => observer.disconnect()
  }, [phrase, clef, currentIndex, complete, feedback])

  return (
    <div className="notation-frame">
      <div ref={hostRef} className="notation-canvas" aria-label={`${clef} clef phrase with ${phrase.length} quarter notes`} />
      {renderError && <p className="inline-error" role="alert">The staff could not be drawn. Generate a new phrase to try again.</p>}
    </div>
  )
}
