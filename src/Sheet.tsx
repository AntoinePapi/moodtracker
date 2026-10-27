import { ReactNode, useEffect, useRef } from 'react'
import { animate, motion, useDragControls, useMotionValue } from 'framer-motion'
import { Theme, levelFor } from './themes'
import { DayEntry } from './store'

const spring = { type: 'spring', damping: 32, stiffness: 340 } as const

// prev/next day navigation; a missing handler means there's no day that way
export type Swipe = { onPrev?: () => void; onNext?: () => void }

type SheetProps = { onClose: () => void; handle: ReactNode; children: ReactNode; swipe?: Swipe }

// fields keep their own horizontal gestures (slider, text selection)
const ownsGesture = (t: EventTarget) => !!(t as HTMLElement).closest('input, textarea')

// Bottom sheet: the handle drags it down to close, the page swipes sideways to change day
export function Sheet({ onClose, handle, children, swipe }: SheetProps) {
  const controls = useDragControls()
  const x = useMotionValue(0)
  const opacity = useMotionValue(1)
  const busy = useRef(false)
  const g = useRef<{ x: number; y: number; lastX: number; lastT: number; v: number; active: boolean } | null>(null)

  // slide out, swap the day, slide the new one in from the other side
  const go = async (d: 1 | -1) => {
    const fn = d === 1 ? swipe?.onNext : swipe?.onPrev
    if (!fn || busy.current) return animate(x, 0, spring)
    busy.current = true
    await Promise.all([animate(x, -d * 90, { duration: 0.12 }), animate(opacity, 0, { duration: 0.12 })])
    fn()
    // jump, not set: the swap must not carry the swipe's velocity into the spring
    x.jump(d * 90)
    animate(opacity, 1, { duration: 0.2 })
    await animate(x, 0, { type: 'spring', stiffness: 420, damping: 38 })
    busy.current = false
  }

  useEffect(() => {
    if (!swipe) return
    const onKey = (e: KeyboardEvent) => {
      if (ownsGesture(e.target!)) return
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const onPointerDown = (e: React.PointerEvent) => {
    if (!swipe || busy.current || e.button !== 0 || ownsGesture(e.target)) return
    g.current = { x: e.clientX, y: e.clientY, lastX: e.clientX, lastT: e.timeStamp, v: 0, active: false }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const s = g.current
    if (!s) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (!s.active) {
      // decide once: sideways is ours, vertical is the scroll's
      if (Math.abs(dy) > 8 && Math.abs(dy) >= Math.abs(dx)) g.current = null
      else if (Math.abs(dx) > 8) {
        s.active = true
        e.currentTarget.setPointerCapture(e.pointerId)
      }
      return
    }
    s.v = (e.clientX - s.lastX) / Math.max(e.timeStamp - s.lastT, 1)
    s.lastX = e.clientX
    s.lastT = e.timeStamp
    const can = dx < 0 ? swipe?.onNext : swipe?.onPrev
    x.set(dx * (can ? 0.6 : 0.12))
  }

  const onPointerUp = (e: React.PointerEvent) => {
    const s = g.current
    g.current = null
    if (!s?.active) return
    const fling = e.clientX - s.x + s.v * 150
    if (fling < -70) go(1)
    else if (fling > 70) go(-1)
    else animate(x, 0, spring)
  }

  return (
    <>
      <motion.div
        className="backdrop"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, pointerEvents: 'none' }}
      />
      <motion.div
        className="sheet"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={spring}
        drag="y"
        dragListener={false}
        dragControls={controls}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={(_, i) => {
          if (i.offset.y > 100 || i.velocity.y > 500) onClose()
        }}
      >
        <div className="sheet-grab" onPointerDown={(e) => controls.start(e)}>
          {swipe && (
            <button className="nav-btn" disabled={!swipe.onPrev} onClick={() => go(-1)} aria-label="Jour précédent">
              ‹
            </button>
          )}
          <div className="grabber" />
          {swipe && (
            <button className="nav-btn" disabled={!swipe.onNext} onClick={() => go(1)} aria-label="Jour suivant">
              ›
            </button>
          )}
        </div>
        <motion.div
          className="sheet-page"
          style={{ x, opacity }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="sheet-handle" onPointerDown={(e) => controls.start(e)}>
            {handle}
          </div>
          <div className="sheet-body">{children}</div>
        </motion.div>
      </motion.div>
    </>
  )
}

type InputProps = {
  theme: Theme
  entry: DayEntry | undefined
  onChange: (patch: Partial<DayEntry>) => void
  compact?: boolean
}

// Level chips, plus the raw value field for measured themes
export function ThemeInput({ theme, entry, onChange, compact }: InputProps) {
  const m = theme.measure
  const setMeasure = (raw: string) => {
    if (!m) return
    if (raw === '') return onChange({ n: undefined, v: undefined })
    const n = Math.max(0, Math.min(m.max, Number(raw)))
    onChange({ n, v: levelFor(m, n) })
  }

  return (
    <div className={compact ? 'theme-input compact' : 'theme-input'}>
      {m && (
        <div className="measure">
          {m.input === 'number' ? (
            <input
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={entry?.n ?? ''}
              onChange={(e) => setMeasure(e.target.value)}
            />
          ) : (
            <input
              type="range"
              min={0}
              max={m.max}
              step={m.step}
              value={entry?.n ?? 0}
              style={{ ['--fill' as string]: `${((entry?.n ?? 0) / m.max) * 100}%` }}
              onChange={(e) => setMeasure(e.target.value)}
            />
          )}
          <span className="measure-value">{entry?.n !== undefined ? m.format(entry.n) : '—'}</span>
        </div>
      )}
      <div className="levels">
        {theme.levels.map((l) => (
          <button
            key={l.value}
            className={`lvl${entry?.v === l.value ? ' on' : ''}`}
            onClick={() => onChange(entry?.v === l.value ? { v: undefined, n: undefined } : { v: l.value, n: undefined })}
          >
            <i className="sw" style={{ background: l.color }} />
            {l.label}
          </button>
        ))}
      </div>
    </div>
  )
}
