import { supabase } from './supabase'
import type { DayEntry, Store } from './store'

type EntryOp = { t: 'entry'; themeId: string; day: string; entry: DayEntry | null }
type BonheurOp = { t: 'bonheur'; day: string; text: string }
export type Op = EntryOp | BonheurOp

const opKey = (o: Op) => (o.t === 'entry' ? `e:${o.themeId}:${o.day}` : `b:${o.day}`)

const read = <T,>(k: string): T | null => {
  try {
    const raw = localStorage.getItem(k)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
const write = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v))
  } catch {}
}

export function applyOps(store: Store, ops: Op[]): Store {
  const entries = { ...store.entries }
  const bonheur = { ...store.bonheur }
  for (const o of ops) {
    if (o.t === 'bonheur') {
      if (o.text) bonheur[o.day] = o.text
      else delete bonheur[o.day]
      continue
    }
    const forTheme = { ...(entries[o.themeId] ?? {}) }
    if (o.entry) forTheme[o.day] = o.entry
    else delete forTheme[o.day]
    entries[o.themeId] = forTheme
  }
  return { entries, bonheur }
}

// Local-first sync: edits land in a persisted queue (one op per day/calendar, latest wins)
// and are flushed to Supabase in batches; offline edits wait for the connection.
export function createSync(userId: string) {
  const db = supabase!
  const QKEY = `tracker:queue:${userId}`
  const queue: Record<string, Op> = read(QKEY) ?? {}
  let timer = 0
  let flushing: Promise<void> | null = null

  const save = () => write(QKEY, queue)
  const schedule = (ms: number) => {
    clearTimeout(timer)
    timer = window.setTimeout(flush, ms)
  }

  function push(op: Op) {
    queue[opKey(op)] = op
    save()
    schedule(700)
  }

  async function send(ops: [string, Op][]) {
    const upserts = []
    const bonheurs = []
    for (const [, o] of ops) {
      if (o.t === 'entry' && o.entry) {
        upserts.push({ user_id: userId, theme_id: o.themeId, day: o.day, v: o.entry.v ?? null, n: o.entry.n ?? null, note: o.entry.note || null, updated_at: new Date().toISOString() })
      } else if (o.t === 'entry') {
        const { error } = await db.from('entries').delete().eq('theme_id', o.themeId).eq('day', o.day)
        if (error) throw error
      } else if (o.text) {
        bonheurs.push({ user_id: userId, day: o.day, text: o.text, updated_at: new Date().toISOString() })
      } else {
        const { error } = await db.from('bonheurs').delete().eq('day', o.day)
        if (error) throw error
      }
    }
    if (upserts.length) {
      const { error } = await db.from('entries').upsert(upserts)
      if (error) throw error
    }
    if (bonheurs.length) {
      const { error } = await db.from('bonheurs').upsert(bonheurs)
      if (error) throw error
    }
  }

  function flush(): Promise<void> {
    if (flushing) return flushing
    const ops = Object.entries(queue)
    if (!ops.length || !navigator.onLine) return Promise.resolve()
    flushing = send(ops)
      .then(() => {
        // only drop what was sent; an op edited meanwhile stays queued
        for (const [k, op] of ops) if (queue[k] === op) delete queue[k]
        save()
      })
      .catch(() => schedule(5000))
      .finally(() => {
        flushing = null
      })
    return flushing
  }

  async function pull(): Promise<Store | null> {
    const [e, b] = await Promise.all([
      db.from('entries').select('theme_id, day, v, n, note'),
      db.from('bonheurs').select('day, text'),
    ])
    if (e.error || b.error) return null
    const store: Store = { entries: {}, bonheur: {} }
    for (const r of e.data) {
      const entry: DayEntry = {}
      if (r.v !== null) entry.v = r.v
      if (r.n !== null) entry.n = r.n
      if (r.note) entry.note = r.note
      ;(store.entries[r.theme_id] ??= {})[r.day] = entry
    }
    for (const r of b.data) store.bonheur[r.day] = r.text
    // pending local edits win over what the server had
    return applyOps(store, Object.values(queue))
  }

  const clear = () => {
    clearTimeout(timer)
    localStorage.removeItem(QKEY)
  }

  return { push, flush, pull, clear }
}

export type Sync = ReturnType<typeof createSync>
