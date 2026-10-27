import { useEffect, useRef, useState } from 'react'
import { animate, motion, MotionValue, useMotionValue, useTransform } from 'framer-motion'
import { Theme, themes } from './themes'
import { DayEntry, Store } from './store'
import { ThemeCard } from './ThemeCard'

type Props = {
  entries: Store['entries']
  index: number
  setIndex: (i: number) => void
  onOpen: (i: number) => void
  hiddenId: string | null
  zoomed: boolean
  cardRefs: React.MutableRefObject<(HTMLDivElement | null)[]>
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const LAST = themes.length - 1
// the summary card sits a little apart from the calendars it sums up
const GAP = 0.8
const gapAt = themes.findIndex((t) => t.computed)
const slot = (p: number) => (gapAt > 0 ? p + clamp(p - (gapAt - 1), 0, 1) * GAP : p)
const spring = { type: 'spring', stiffness: 240, damping: 30, mass: 0.9 } as const

// past the ends the carousel resists instead of stopping dead
const rubber = (p: number) => (p < 0 ? p * 0.3 : p > LAST ? LAST + (p - LAST) * 0.3 : p)

function transform(o: number, cw: number) {
  const a = Math.min(Math.abs(o), 1)
  const rest = Math.max(Math.abs(o) - 1, 0)
  const s = Math.sign(o)
  const x = s * (a * cw * 0.74 + rest * cw * 0.3)
  const z = -a * 200 - rest * 60
  const ry = -s * a * 60
  return `translate(-50%, -50%) translateX(${x}px) translateZ(${z}px) rotateY(${ry}deg)`
}

type CardProps = {
  theme: Theme
  i: number
  pos: MotionValue<number>
  cw: number
  active: boolean
  hidden: boolean
  days: Record<string, DayEntry> | undefined
  refCb: (el: HTMLDivElement | null) => void
}

function FlowCard({ theme, i, pos, cw, active, hidden, days, refCb }: CardProps) {
  const tf = useTransform(pos, (p) => transform(slot(i) - slot(p), cw))
  const z = useTransform(pos, (p) => 100 - Math.round(Math.abs(slot(i) - slot(p)) * 10))
  const shade = useTransform(pos, (p) => Math.min(Math.abs(slot(i) - slot(p)), 1.5) * 0.1)
  return (
    <ThemeCard
      ref={refCb}
      theme={theme}
      index={i}
      days={days}
      className={active ? 'active' : ''}
      shade={shade}
      style={{ transform: tf, zIndex: z, visibility: hidden ? 'hidden' : 'visible' }}
    />
  )
}

export function CoverFlow({ entries, index, setIndex, onOpen, hiddenId, zoomed, cardRefs }: Props) {
  const stageRef = useRef<HTMLDivElement>(null)
  const [cw, setCw] = useState(300)
  const pos = useMotionValue(index)
  const anim = useRef<ReturnType<typeof animate> | null>(null)
  const interacting = useRef(false)
  const start = useRef<{ x: number; pos: number; idx: number | null; moved: boolean } | null>(null)

  const step = cw * 0.55

  const settle = (target: number) => {
    anim.current?.stop()
    // the spring picks up the value's current velocity, so flings carry through
    anim.current = animate(pos, target, spring)
  }
  const snapTo = (i: number) => {
    setIndex(i)
    settle(i)
  }

  // index changed from outside (dots, keyboard)
  useEffect(() => {
    if (!interacting.current && Math.abs(pos.get() - index) > 0.001) settle(index)
  }, [index])

  useEffect(() => {
    const measure = () => setCw(cardRefs.current[0]?.offsetWidth ?? 300)
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [cardRefs])

  // trackpad / wheel: the carousel follows the gesture, then snaps once it pauses
  const latest = useRef({ step, snapTo })
  latest.current = { step, snapTo }
  useEffect(() => {
    const el = stageRef.current!
    let raw = pos.get()
    let timer = 0
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      if (!interacting.current) {
        anim.current?.stop()
        raw = pos.get()
        interacting.current = true
      }
      raw = clamp(raw + d / (latest.current.step * 1.6), -0.6, LAST + 0.6)
      pos.set(rubber(raw))
      clearTimeout(timer)
      timer = window.setTimeout(() => {
        interacting.current = false
        latest.current.snapTo(clamp(Math.round(pos.get()), 0, LAST))
      }, 90)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [pos])

  const onPointerDown = (e: React.PointerEvent) => {
    const card = (e.target as HTMLElement).closest('[data-idx]') as HTMLElement | null
    anim.current?.stop()
    interacting.current = true
    start.current = { x: e.clientX, pos: pos.get(), idx: card ? Number(card.dataset.idx) : null, moved: false }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const s = start.current
    if (!s) return
    const dx = e.clientX - s.x
    if (!s.moved && Math.abs(dx) < 6) return
    s.moved = true
    pos.set(rubber(s.pos - dx / step))
  }

  const onPointerUp = () => {
    const s = start.current
    start.current = null
    interacting.current = false
    if (!s) return
    if (!s.moved) {
      if (s.idx === null) return settle(index)
      if (s.idx === index && Math.abs(pos.get() - index) < 0.05) onOpen(index)
      else snapTo(s.idx)
      return
    }
    // project where the fling would coast to, then snap there
    const v = pos.getVelocity()
    snapTo(clamp(Math.round(pos.get() + v * 0.18), 0, LAST))
  }

  return (
    <motion.div
      ref={stageRef}
      className="stage"
      animate={zoomed ? { scale: 0.88, opacity: 0.5 } : { scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 220, damping: 30 }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {themes.map((t, i) => (
        <FlowCard
          key={t.id}
          theme={t}
          i={i}
          pos={pos}
          cw={cw}
          active={i === index}
          hidden={hiddenId === t.id}
          days={entries[t.id]}
          refCb={(el) => {
            cardRefs.current[i] = el
          }}
        />
      ))}
    </motion.div>
  )
}
