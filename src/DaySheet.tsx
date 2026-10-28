import { Theme } from './themes'
import { DayEntry } from './store'
import { longDate } from './dates'
import { Swipe, Sheet, ThemeInput } from './Sheet'

type Props = {
  theme: Theme
  day: string
  entry: DayEntry | undefined
  bonheur: string
  onChange: (patch: Partial<DayEntry> | null) => void
  onBonheur: (text: string) => void
  onClose: () => void
  swipe?: Swipe
}

export function DaySheet({ theme, day, entry, bonheur, onChange, onBonheur, onClose, swipe }: Props) {
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
          <p className="sheet-q">{theme.question}</p>
        </>
      }
    >
      <ThemeInput theme={theme} entry={entry} onChange={onChange} />

      <label className="field">
        <span>Notes</span>
        <textarea
          rows={2}
          maxLength={2000}
          placeholder="Quelques mots sur la journée…"
          value={entry?.note ?? ''}
          onChange={(e) => onChange({ note: e.target.value })}
        />
      </label>

      <BonheurField value={bonheur} onChange={onBonheur} />

      <div className="sheet-actions">
        <button className="ghost-btn" onClick={() => onChange(null)}>
          Effacer
        </button>
        <button className="primary-btn" onClick={onClose}>
          OK
        </button>
      </div>
    </Sheet>
  )
}

export function BonheurField({ value, onChange }: { value: string; onChange: (text: string) => void }) {
  return (
    <label className="field bonheur-field">
      <span>✿ Mon petit bonheur du jour</span>
      <input
        placeholder="Un café au soleil, un message d'une amie…"
        maxLength={500}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}
