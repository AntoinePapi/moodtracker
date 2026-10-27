import { forwardRef } from 'react'
import { motion, MotionStyle, MotionValue } from 'framer-motion'
import { Theme, levelColor } from './themes'
import { DayEntry, filledCount } from './store'
import { YEAR, daysInMonth, iso, isFuture } from './dates'

type Props = {
  theme: Theme
  index: number
  days: Record<string, DayEntry> | undefined
  style?: MotionStyle
  className?: string
  shade?: MotionValue<number>
}

export function MiniGrid({ theme, days = {} }: { theme: Theme; days?: Record<string, DayEntry> }) {
  const cells = []
  for (let m = 0; m < 12; m++) {
    const n = daysInMonth(YEAR, m)
    for (let d = 1; d <= 31; d++) {
      if (d > n) {
        cells.push(<i key={`${m}-${d}`} className="mini-cell none" />)
        continue
      }
      const k = iso(YEAR, m, d)
      const color = levelColor(theme, days[k]?.v)
      cells.push(
        <i
          key={k}
          className={`mini-cell${isFuture(k) ? ' future' : ''}`}
          style={color ? { background: color } : undefined}
        />,
      )
    }
  }
  return <div className="mini">{cells}</div>
}

export function CardFace({ theme, index, days }: Pick<Props, 'theme' | 'index' | 'days'>) {
  return (
    <>
      <div className="card-head">
        <h2 className="card-title">{theme.title}</h2>
        <span className="card-num">{theme.computed ? 'Résumé' : String(index + 1).padStart(2, '0')}</span>
      </div>
      <div className="card-grid">
        <MiniGrid theme={theme} days={days} />
      </div>
      <div className="card-foot">
        <span>{filledCount(days)} jours remplis</span>
        <span className="open-btn" aria-hidden>
          ↗
        </span>
      </div>
    </>
  )
}

export const ThemeCard = forwardRef<HTMLDivElement, Props>(function ThemeCard(
  { theme, index, days, style, className = '', shade },
  ref,
) {
  return (
    <motion.div
      ref={ref}
      data-idx={index}
      className={`card ${className}`}
      style={{ background: theme.bg, ...style }}
    >
      <CardFace theme={theme} index={index} days={days} />
      {shade && <motion.i className="card-shade" style={{ opacity: shade }} />}
    </motion.div>
  )
})
