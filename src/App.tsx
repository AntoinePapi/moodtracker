import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { themes } from './themes'
import { useStore } from './store'
import { addDays, inYear, shortDate, todayIso } from './dates'
import { CoverFlow } from './CoverFlow'
import { CalendarView } from './CalendarView'
import { DaySheet } from './DaySheet'
import { TodaySheet } from './TodaySheet'
import { SummarySheet } from './SummarySheet'
import { dayPixel, pixelEntries } from './pixel'
import { AccountSheet } from './AccountSheet'

type Rect = { top: number; left: number; width: number; height: number }

type User = { id: string; email: string }

export default function App({ user }: { user: User | null }) {
  const { store, setEntry, setBonheur, forget } = useStore(user?.id ?? null)
  const [accountOpen, setAccountOpen] = useState(false)
  const [index, setIndex] = useState(0)
  const [open, setOpen] = useState<{ i: number; rect: Rect } | null>(null)
  const [hiddenId, setHiddenId] = useState<string | null>(null)
  const [sheet, setSheet] = useState<{ themeId: string; day: string } | null>(null)
  const [allDay, setAllDay] = useState<string | null>(null)
  const [pixelDay, setPixelDay] = useState<string | null>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])

  // prev/next for a day panel, staying inside the year shown by the grid
  const swipeFor = (day: string, set: (d: string) => void) => {
    const prev = addDays(day, -1)
    const next = addDays(day, 1)
    return {
      onPrev: inYear(prev) ? () => set(prev) : undefined,
      onNext: inYear(next) ? () => set(next) : undefined,
    }
  }

  const entries = useMemo(() => {
    const all = { ...store.entries }
    for (const t of themes) if (t.computed) all[t.id] = pixelEntries(store)
    return all
  }, [store])

  const openTheme = (i: number) => {
    const el = cardRefs.current[i]
    if (!el) return
    const r = el.getBoundingClientRect()
    setOpen({ i, rect: { top: r.top, left: r.left, width: r.width, height: r.height } })
    setHiddenId(themes[i].id)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea')) return
      if (e.key === 'Escape') {
        if (accountOpen) setAccountOpen(false)
        else if (allDay) setAllDay(null)
        else if (pixelDay) setPixelDay(null)
        else if (sheet) setSheet(null)
        else if (open) setOpen(null)
        return
      }
      if (open || sheet || allDay || pixelDay || accountOpen) return
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, themes.length - 1))
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0))
      if (e.key === 'Enter') openTheme(index)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const sheetTheme = sheet && themes.find((t) => t.id === sheet.themeId)!
  const todayBonheur = store.bonheur[todayIso]

  return (
    <main className="home">
      <header className="topbar">
        <div className="topbar-left">
          {user && (
            <button className="avatar" onClick={() => setAccountOpen(true)} aria-label="Mon compte">
              {user.email.charAt(0).toUpperCase()}
            </button>
          )}
          <span>{shortDate()}</span>
        </div>
        <div className="dots">
          {themes.map((t, i) => (
            <button
              key={t.id}
              className={t.computed ? 'dot dot-summary' : 'dot'}
              aria-label={t.title}
              style={{ background: i === index ? t.bg : undefined }}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      </header>

      <CoverFlow
        entries={entries}
        index={index}
        setIndex={setIndex}
        onOpen={openTheme}
        hiddenId={hiddenId}
        zoomed={!!open}
        cardRefs={cardRefs}
      />

      <button className="bonheur" onClick={() => setAllDay(todayIso)}>
        <span className="bonheur-text">{todayBonheur || 'Mon petit bonheur du jour'}</span>
        <span>{todayBonheur ? '✿' : '+'}</span>
      </button>

      <AnimatePresence onExitComplete={() => setHiddenId(null)}>
        {open && (
          <CalendarView
            key={themes[open.i].id}
            theme={themes[open.i]}
            index={open.i}
            days={entries[themes[open.i].id]}
            rect={open.rect}
            selected={sheet?.day ?? pixelDay}
            onBack={() => setOpen(null)}
            onDay={(day) =>
              themes[open.i].computed ? setPixelDay(day) : setSheet({ themeId: themes[open.i].id, day })
            }
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sheet && sheetTheme && (
          <DaySheet
            key="sheet"
            theme={sheetTheme}
            day={sheet.day}
            entry={store.entries[sheet.themeId]?.[sheet.day]}
            bonheur={store.bonheur[sheet.day] ?? ''}
            onChange={(patch) => setEntry(sheet.themeId, sheet.day, patch)}
            onBonheur={(text) => setBonheur(sheet.day, text)}
            onClose={() => setSheet(null)}
            swipe={swipeFor(sheet.day, (day) => setSheet({ ...sheet, day }))}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pixelDay && !allDay && (
          <SummarySheet
            key="summary"
            theme={themes.find((t) => t.computed)!}
            day={pixelDay}
            pixel={dayPixel(store, pixelDay)}
            onEdit={() => setAllDay(pixelDay)}
            onClose={() => setPixelDay(null)}
            swipe={swipeFor(pixelDay, setPixelDay)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {allDay && (
          <TodaySheet
            key="today"
            day={allDay}
            store={store}
            onChange={(themeId, patch) => setEntry(themeId, allDay, patch)}
            onBonheur={(text) => setBonheur(allDay, text)}
            onClose={() => setAllDay(null)}
            swipe={swipeFor(allDay, setAllDay)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {accountOpen && user && (
          <AccountSheet key="account" email={user.email} store={store} forget={forget} onClose={() => setAccountOpen(false)} />
        )}
      </AnimatePresence>
    </main>
  )
}
