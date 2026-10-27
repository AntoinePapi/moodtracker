import { themes } from './themes'
import { DayEntry, Store } from './store'
import { longDate } from './dates'
import { Swipe, Sheet, ThemeInput } from './Sheet'
import { BonheurField } from './DaySheet'
import { dayPixel } from './pixel'
import { PixelBadge } from './SummarySheet'

type Props = {
  day: string
  store: Store
  onChange: (themeId: string, patch: Partial<DayEntry>) => void
  onBonheur: (text: string) => void
  onClose: () => void
  swipe?: Swipe
}

// Every calendar for one day, with the pixel they add up to
const pixelTheme = themes.find((t) => t.computed)
const inputs = themes.filter((t) => !t.computed)

export function TodaySheet({ day, store, onChange, onBonheur, onClose, swipe }: Props) {
  const done = inputs.filter((t) => store.entries[t.id]?.[day]?.v !== undefined).length
  return (
    <Sheet
      onClose={onClose}
      swipe={swipe}
      handle={
        <>
          <p className="sheet-kicker">
            {done}/{inputs.length} remplis
          </p>
          <h2 className="sheet-date">{longDate(day)}</h2>
          {pixelTheme && (
            <div className="today-pixel">
              <span>Ton pixel du jour</span>
              <PixelBadge theme={pixelTheme} pixel={dayPixel(store, day)} />
            </div>
          )}
        </>
      }
    >
      <BonheurField value={store.bonheur[day] ?? ''} onChange={onBonheur} />

      {inputs.map((t) => {
        const entry = store.entries[t.id]?.[day]
        return (
          <section key={t.id} className="today-theme">
            <header>
              <i className="today-dot" style={{ background: t.bg }} />
              <h3>{t.title}</h3>
              {entry?.v !== undefined && <span className="today-check">✓</span>}
            </header>
            <ThemeInput theme={t} entry={entry} onChange={(p) => onChange(t.id, p)} compact />
          </section>
        )
      })}

      <div className="sheet-actions end">
        <button className="primary-btn" onClick={onClose}>
          OK
        </button>
      </div>
    </Sheet>
  )
}
