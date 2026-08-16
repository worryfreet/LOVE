import { X } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { LoveLetterContent } from '@/entities/part'
import '../styles/cottage-love-letter.css'

export interface LoveLetterReaderProps {
  content: LoveLetterContent
  onClose: () => void
}

export function LoveLetterReader({ content, onClose }: LoveLetterReaderProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const paragraphs = useMemo(
    () => content.body.split(/\n{2,}/gu).filter(Boolean),
    [content.body],
  )

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusFrame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus({ preventScroll: true })
    })
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Escape') return
      event.preventDefault()
      onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.cancelAnimationFrame(focusFrame)
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus({ preventScroll: true })
    }
  }, [onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="love-letter-reader"
      data-love-letter-reader="open"
      role="dialog"
      aria-modal="true"
      aria-labelledby="love-letter-title"
    >
      <div className="love-letter-reader__ambient" aria-hidden="true">
        <i>♥</i><i>♥</i><i>♥</i><i>♥</i><i>♥</i>
      </div>
      <button
        ref={closeButtonRef}
        className="love-letter-reader__close"
        type="button"
        aria-label="合上情书"
        onClick={onClose}
      >
        <X size={18} aria-hidden="true" />
      </button>

      <div className="love-letter-reader__stage">
        <div className="love-letter-reader__envelope" aria-hidden="true">
          <span />
        </div>
        <article className="love-letter-paper">
          <div className="love-letter-paper__fiber" aria-hidden="true" />
          <header>
            <span aria-hidden="true">❦</span>
            <p>FOR MY DEAREST</p>
            <h2 id="love-letter-title">{content.title}</h2>
          </header>
          <div className="love-letter-paper__body">
            <p className="love-letter-paper__salutation">
              {content.salutation}
            </p>
            {paragraphs.map((paragraph, index) => (
              <p key={`${index}:${paragraph.slice(0, 12)}`}>
                {paragraph.split('\n').map((line, lineIndex) => (
                  <span key={`${lineIndex}:${line.slice(0, 8)}`}>
                    {lineIndex > 0 && <br />}
                    {line}
                  </span>
                ))}
              </p>
            ))}
            <footer>
              <span>此刻，与每一个有你的明天</span>
              <strong>{content.signature}</strong>
              <i aria-hidden="true">♥</i>
            </footer>
          </div>
          <button
            className="love-letter-paper__keep"
            type="button"
            data-love-letter-close
            onClick={onClose}
          >
            珍藏这封信
          </button>
        </article>
      </div>
    </div>,
    document.body,
  )
}
