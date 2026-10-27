import { Theme, isDark } from './themes'
import { longDate } from './dates'
import { DayPixel, describe, summary } from './pixel'
import { Swipe, Sheet } from './Sheet'

type Props = {
  theme: Theme
  day: string
  pixel: DayPixel
  onEdit: () => void
  onClose: () => void
  swipe?: Swipe
}

export function PixelBadge({ theme, pixel }: { theme: Theme; pixel: DayPixel }) {
  const level = theme.levels.find((l) => l.value === pixel.v)
  if (!level) return <div className="pixel-badge empty">Pas encore de couleur</div>
  return (
    <div className={`pixel-badge${isDark(level.color) ? ' dark' : ''}`} style={{ background: level.color }}>
      {level.label}
    </div>
  )
}

const shortName = (t: Theme) => {
  const s = t.title.replace('Tracker de ', '')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Why a pixel day got its color
export function SummarySheet({ theme, day, pixel, onEdit, onClose, swipe }: Props) {
  const { weighed, lifted } = summary(pixel)
  const factors = [...pixel.factors].sort((a, b) => a.score - b.score)
  return (
    <Sheet
      onClose={onClose}
      swipe={swipe}
      handle={
        <>
          <p className="sheet-kicker" style={{ background: theme.bg }}>
            {theme.title}
          </p>
          <h2 className="sheet-date">{longDate(day)}</h2>
        </>
      }
    >
      <PixelBadge theme={theme} pixel={pixel} />

      {factors.length || pixel.bonheur ? (
        <>
          <div className="summary">
            {weighed && <p>{weighed}</p>}
            {lifted && <p>{lifted}</p>}
          </div>
          <ul className="factors">
            {factors.map((f) => (
              <li key={f.theme.id}>
                <i style={{ background: f.level.color }} />
                <span className="factor-name">{shortName(f.theme)}</span>
                <span className="factor-value">{f.theme.measure && f.n !== undefined ? describe(f) : f.level.label}</span>
                <span className={`factor-sign ${f.score > 0.05 ? 'up' : f.score < -0.05 ? 'down' : ''}`}>
                  {f.score > 0.05 ? '↑' : f.score < -0.05 ? '↓' : '·'}
                </span>
              </li>
            ))}
          </ul>
          {pixel.bonheur && <blockquote className="summary-bonheur">✿ {pixel.bonheur}</blockquote>}
        </>
      ) : (
        <p className="summary">Rien de noté ce jour-là.</p>
      )}

      <div className="sheet-actions">
        <button className="ghost-btn" onClick={onClose}>
          Fermer
        </button>
        <button className="primary-btn" onClick={onEdit}>
          {factors.length ? 'Modifier la journée' : 'Remplir la journée'}
        </button>
      </div>
    </Sheet>
  )
}
