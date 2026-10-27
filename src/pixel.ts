import { Level, Theme, themes } from './themes'
import { DayEntry, Store } from './store'

export type Factor = { theme: Theme; level: Level; n?: number; score: number }
export type DayPixel = { v?: number; factors: Factor[]; bonheur?: string }

const BONHEUR = { score: 0.6, weight: 0.6 }
// score thresholds between the pixel's levels, red → green
const CUTS = [-0.45, -0.15, 0.15, 0.45]

const sources = themes.filter((t) => !t.computed)

// The day's color, weighted from every other calendar filled that day
export function dayPixel(store: Store, day: string): DayPixel {
  const factors: Factor[] = []
  let sum = 0
  let weights = 0
  for (const t of sources) {
    const e = store.entries[t.id]?.[day]
    const level = e?.v !== undefined ? t.levels.find((l) => l.value === e.v) : undefined
    if (!level) continue
    const score = level.score ?? 0
    const w = t.weight ?? 1
    factors.push({ theme: t, level, n: e?.n, score })
    sum += score * w
    weights += w
  }
  const bonheur = store.bonheur[day]?.trim() || undefined
  if (bonheur) {
    sum += BONHEUR.score * BONHEUR.weight
    weights += BONHEUR.weight
  }
  if (!weights) return { factors }
  const avg = sum / weights
  const v = CUTS.findIndex((c) => avg < c)
  return { v: v === -1 ? CUTS.length : v, factors, bonheur }
}

export function pixelEntries(store: Store): Record<string, DayEntry> {
  const days = new Set<string>(Object.keys(store.bonheur))
  for (const t of sources) Object.keys(store.entries[t.id] ?? {}).forEach((d) => days.add(d))
  const out: Record<string, DayEntry> = {}
  for (const d of days) {
    const { v } = dayPixel(store, d)
    if (v !== undefined) out[d] = { v }
  }
  return out
}

// "le stress (élevé)" — label in parentheses so the sentence never needs agreeing
export const describe = (f: Factor) =>
  f.theme.measure && f.n !== undefined ? f.theme.measure.format(f.n) + (f.theme.id === 'ecran' ? ' d’écran' : '') : `${f.theme.noun} (${f.level.label.toLowerCase()})`

const join = (parts: string[]) =>
  parts.length < 2 ? parts.join('') : `${parts.slice(0, -1).join(', ')} et ${parts[parts.length - 1]}`

export function summary(p: DayPixel): { weighed?: string; lifted?: string } {
  const down = p.factors.filter((f) => f.score < -0.05).sort((a, b) => a.score - b.score)
  const up = p.factors.filter((f) => f.score > 0.05).sort((a, b) => b.score - a.score)
  const lifted = up.map(describe)
  if (p.bonheur) lifted.push('un petit bonheur')
  return {
    weighed: down.length ? `Ce qui a pesé : ${join(down.map(describe))}.` : undefined,
    lifted: lifted.length ? `Ce qui a aidé : ${join(lifted)}.` : undefined,
  }
}
