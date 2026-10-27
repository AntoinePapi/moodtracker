import { useEffect, useMemo, useState } from 'react'
import { Theme, levelFor, themes } from './themes'
import { YEAR, daysInMonth, iso, todayIso } from './dates'
import { createSync } from './sync'
import { supabase } from './supabase'

// v: level shown in the grid, n: raw measure (steps, minutes) when the theme has one
export type DayEntry = { v?: number; n?: number; note?: string }
export type Store = {
  entries: Record<string, Record<string, DayEntry>>
  bonheur: Record<string, string>
}

const DEMO_KEY = 'tracker:v1'
const cacheKey = (userId: string) => `tracker:v2:${userId}`

// cycle demo: règles 5j, folliculaire jusqu'à J13, ovulation 3j, lutéale jusqu'à la fin
const cyclePhase = (day: number) => (day < 5 ? 0 : day < 13 ? 1 : day < 16 ? 2 : 3)

// Demo data so the year isn't empty while we iterate on the visuals
function seedTheme(t: Theme): Record<string, DayEntry> {
  const max = t.levels.length - 1
  const days: Record<string, DayEntry> = {}
  let prev = Math.round(max / 2)
  let cycleDay = 9
  let cycleLen = 28
  for (let m = 0; m < 12; m++) {
    for (let d = 1; d <= daysInMonth(YEAR, m); d++) {
      const k = iso(YEAR, m, d)
      if (k > todayIso) break
      if (t.id === 'cycle') {
        days[k] = { v: cyclePhase(cycleDay) }
        if (++cycleDay >= cycleLen) {
          cycleDay = 0
          cycleLen = 26 + Math.floor(Math.random() * 5)
        }
        continue
      }
      if (Math.random() < 0.18) continue
      if (t.measure) {
        const { max, step } = t.measure
        const base = t.id === 'pas' ? 7000 : 200
        const n = Math.round(Math.max(0, base + (Math.random() - 0.4) * base * 1.4) / step) * step
        days[k] = { n: Math.min(n, max), v: levelFor(t.measure, n) }
        continue
      }
      prev = Math.max(0, Math.min(max, Math.round(prev + (Math.random() * 3 - 1.5))))
      days[k] = { v: t.id === 'pixels' || t.id === 'stress' ? prev : Math.floor(Math.random() * (max + 1)) }
    }
  }
  return days
}

const empty = (): Store => ({ entries: {}, bonheur: {} })

function loadDemo(): Store {
  let store = empty()
  try {
    const raw = localStorage.getItem(DEMO_KEY)
    if (raw) store = JSON.parse(raw)
  } catch {}
  // themes added after the first visit get their demo data too
  for (const t of themes) store.entries[t.id] ??= seedTheme(t)
  return store
}

function loadCache(userId: string): Store {
  try {
    const raw = localStorage.getItem(cacheKey(userId))
    if (raw) return JSON.parse(raw)
  } catch {}
  return empty()
}

const isEmpty = (e: DayEntry) => e.v === undefined && e.n === undefined && !e.note

// userId null → local demo; otherwise a per-user cache synced with Supabase
export function useStore(userId: string | null) {
  const [store, setStore] = useState<Store>(() => (userId ? loadCache(userId) : loadDemo()))
  const sync = useMemo(() => (userId && supabase ? createSync(userId) : null), [userId])

  useEffect(() => {
    try {
      localStorage.setItem(userId ? cacheKey(userId) : DEMO_KEY, JSON.stringify(store))
    } catch {}
  }, [store, userId])

  useEffect(() => {
    if (!sync) return
    let alive = true
    const refresh = async () => {
      await sync.flush()
      const remote = await sync.pull()
      if (alive && remote) setStore(remote)
    }
    refresh()
    // back on the app or back online: push what's pending, pick up other devices' edits
    const onVisible = () => document.visibilityState === 'visible' && refresh()
    window.addEventListener('online', refresh)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      alive = false
      window.removeEventListener('online', refresh)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [sync])

  const setEntry = (themeId: string, day: string, patch: Partial<DayEntry> | null) => {
    const next = patch === null ? null : { ...store.entries[themeId]?.[day], ...patch }
    const entry = next && !isEmpty(next) ? next : null
    setStore((s) => {
      const forTheme = { ...(s.entries[themeId] ?? {}) }
      if (entry) forTheme[day] = entry
      else delete forTheme[day]
      return { ...s, entries: { ...s.entries, [themeId]: forTheme } }
    })
    sync?.push({ t: 'entry', themeId, day, entry })
  }

  const setBonheur = (day: string, text: string) => {
    setStore((s) => ({ ...s, bonheur: { ...s.bonheur, [day]: text } }))
    sync?.push({ t: 'bonheur', day, text: text.trim() ? text : '' })
  }

  // before signing out: push what's left, then forget this user's local copy
  const forget = async () => {
    if (!sync || !userId) return
    await sync.flush()
    sync.clear()
    localStorage.removeItem(cacheKey(userId))
  }

  return { store, setEntry, setBonheur, forget }
}

export const filledCount = (days: Record<string, DayEntry> = {}) =>
  Object.values(days).filter((e) => e.v !== undefined).length
