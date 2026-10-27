export const today = new Date()
export const YEAR = today.getFullYear()

export const MONTH_LETTERS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
export const WEEKDAY_LETTERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

const pad = (n: number) => String(n).padStart(2, '0')
export const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`
export const todayIso = iso(YEAR, today.getMonth(), today.getDate())

export const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate()
export const weekday = (y: number, m: number, d: number) => new Date(y, m, d).getDay()
export const addDays = (isoDate: string, n: number) => {
  const [y, m, d] = isoDate.split('-').map(Number)
  const t = new Date(y, m - 1, d + n)
  return iso(t.getFullYear(), t.getMonth(), t.getDate())
}
// days the grid can show: this year, up to today
export const inYear = (isoDate: string) => isoDate >= iso(YEAR, 0, 1) && isoDate <= todayIso

export const isFuture = (isoDate: string) => isoDate > todayIso

export const shortDate = () =>
  `${pad(today.getDate())}.${pad(today.getMonth() + 1)}.${String(YEAR).slice(2)}`

export const longDate = (isoDate: string) => {
  const [y, m, d] = isoDate.split('-').map(Number)
  const s = new Date(y, m - 1, d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}
