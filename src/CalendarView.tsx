import { motion } from 'framer-motion'
import { Theme, levelColor } from './themes'
import { DayEntry, filledCount } from './store'
import { MONTH_LETTERS, YEAR, daysInMonth, iso, isFuture, todayIso } from './dates'
import { CardFace } from './ThemeCard'

type Rect = { top: number; left: number; width: number; height: number }

type Props = {
  theme: Theme
  index: number
  days: Record<string, DayEntry> | undefined
  rect: Rect
  selected: string | null
  onBack: () => void
  onDay: (iso: string) => void
}

const grow = { type: 'spring', bounce: 0.14, visualDuration: 0.5 } as const
const shrink = { type: 'spring', bounce: 0.1, visualDuration: 0.45 } as const
// The overlay is always full screen and only its clip grows: nothing re-lays out
// during the zoom, so the 372 cells are laid out once instead of every frame.
const clipTo = (r: Rect) =>
  `inset(${r.top}px ${window.innerWidth - r.left - r.width}px ${window.innerHeight - r.top - r.height}px ${r.left}px round 32px)`
const FULL = 'inset(0px 0px 0px 0px round 0px)'

// moves the card-sized ghost so it grows, centered, toward the full screen
const ghostGrow = (r: Rect) => ({
  x: window.innerWidth / 2 - (r.left + r.width / 2),
  y: window.innerHeight / 2 - (r.top + r.height / 2),
  scale: window.innerHeight / r.height,
})

export function CalendarView({ theme, index, days = {}, rect, selected, onBack, onDay }: Props) {
  const cells: React.ReactNode[] = [<span key="corner" />]
  MONTH_LETTERS.forEach((l, m) => (
    cells.push(
      <span key={`h${m}`} className="cal-month" style={{ ['--d' as string]: `${0.2 + m * 0.02}s` }}>
        {l}
      </span>,
    )
  ))

  for (let d = 1; d <= 31; d++) {
    cells.push(
      <span key={`n${d}`} className="cal-daynum" style={{ ['--d' as string]: `${0.18 + d * 0.008}s` }}>
        {d}
      </span>,
    )
    for (let m = 0; m < 12; m++) {
      if (d > daysInMonth(YEAR, m)) {
        cells.push(<span key={`${m}-${d}`} />)
        continue
      }
      const k = iso(YEAR, m, d)
      const color = levelColor(theme, days[k]?.v)
      const future = isFuture(k)
      const cls = ['c', future && 'future', k === todayIso && 'today', k === selected && 'selected']
        .filter(Boolean)
        .join(' ')
      cells.push(
        <button
          key={k}
          className={cls}
          disabled={future}
          onClick={() => onDay(k)}
          style={{ background: color, ['--d' as string]: `${0.2 + (m + d) * 0.009}s` }}
          aria-label={k}
        />,
      )
    }
  }

  return (
    <motion.div
      className="cal"
      style={{ background: theme.bg }}
      initial={{ clipPath: clipTo(rect) }}
      animate={{ clipPath: FULL }}
      exit={{ clipPath: clipTo(rect), transition: { ...shrink, delay: 0.06 } }}
      transition={grow}
    >
      {/* the card's face grows with the clip, then fades, so the morph reads as one object */}
      <motion.div
        className="ghost"
        style={{ background: theme.bg, top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
        initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
        animate={{ opacity: 0, ...ghostGrow(rect), transition: { ...grow, opacity: { duration: 0.3, delay: 0.12 } } }}
        exit={{ opacity: 1, x: 0, y: 0, scale: 1, transition: { ...shrink, delay: 0.06, opacity: { duration: 0.2, delay: 0.12 } } }}
      >
        <CardFace theme={theme} index={index} days={days} />
      </motion.div>

      <motion.div
        className="cal-inner"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: 0.3, delay: 0.2 } }}
        exit={{ opacity: 0, transition: { duration: 0.15 } }}
      >
        <header className="cal-head">
          <button className="round-btn" onClick={onBack} aria-label="Retour">
            ←
          </button>
          <div>
            <h1 className="cal-title">{theme.title}</h1>
            <p className="cal-sub">
              {YEAR} · {filledCount(days)} jours remplis
            </p>
          </div>
        </header>

        <div className="cal-panel">
          <div className="cal-grid">{cells}</div>
        </div>

        <div className="legend">
          {theme.levels.map((l, i) => (
            <span key={l.value} className="legend-item" style={{ ['--d' as string]: `${0.6 + i * 0.05}s` }}>
              <i style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
