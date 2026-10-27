// score: how much this answer lifts (+1) or weighs on (-1) the day's pixel
export type Level = { value: number; label: string; color: string; score?: number }

// themes filled with a raw number (steps, minutes) that maps onto a level
export type Measure = {
  input: 'number' | 'range'
  max: number
  step: number
  // upper bound of each level but the last
  thresholds: number[]
  format: (n: number) => string
}

export type Theme = {
  id: string
  title: string
  question: string
  bg: string
  levels: Level[]
  measure?: Measure
  hidden?: boolean
  // colored from the other calendars instead of filled by hand
  computed?: boolean
  // weight of this calendar in the day's pixel, and how the summary names it
  weight?: number
  noun?: string
}

const formatSteps = (n: number) => `${n.toLocaleString('fr-FR')} pas`
const formatMinutes = (n: number) => {
  const h = Math.floor(n / 60)
  const m = n % 60
  return h ? `${h} h${m ? ` ${String(m).padStart(2, '0')}` : ''}` : `${m} min`
}

const allThemes: Theme[] = [
  {
    id: 'reves',
    weight: 0.8,
    noun: 'tes rêves',
    title: 'Tracker de rêves',
    question: 'De quoi as-tu rêvé ?',
    bg: '#C9C2EA',
    levels: [
      { value: 0, label: 'Pas de souvenir', color: '#8A8590', score: 0 },
      { value: 1, label: 'Effrayant', color: '#9B4FC4', score: -0.8 },
      { value: 2, label: 'Triste', color: '#8EC3E6', score: -0.5 },
      { value: 3, label: 'Drôle / bizarre', color: '#EE9A88', score: 0.3 },
      { value: 4, label: 'Joyeux', color: '#F2C641', score: 0.7 },
    ],
  },
  {
    id: 'stress',
    weight: 1.2,
    noun: 'le stress',
    title: 'Tracker de stress',
    question: 'Quel était ton niveau de stress ?',
    bg: '#A9D4C4',
    levels: [
      { value: 0, label: 'Aucun', color: '#8C918F', score: 0.6 },
      { value: 1, label: 'Faible', color: '#7DB84A', score: 0.3 },
      { value: 2, label: 'Moyen', color: '#F2C641', score: -0.2 },
      { value: 3, label: 'Élevé', color: '#EB7A2A', score: -0.7 },
      { value: 4, label: 'Très élevé', color: '#C9302C', score: -1 },
    ],
  },
  {
    id: 'mood',
    weight: 1.5,
    noun: 'l’humeur',
    title: 'Tracker de mood',
    question: 'Quelle était ton humeur ?',
    bg: '#F2D98A',
    levels: [
      { value: 0, label: 'Joyeux', color: '#F2A93B', score: 1 },
      { value: 1, label: 'Calme', color: '#7FB3D5', score: 0.6 },
      { value: 2, label: 'Triste', color: '#4A6FA5', score: -0.7 },
      { value: 3, label: 'Anxieux', color: '#9B7BB8', score: -0.6 },
      { value: 4, label: 'Énervé', color: '#D9483B', score: -1 },
      { value: 5, label: 'Fatigué', color: '#A39B8B', score: -0.3 },
    ],
  },
  {
    id: 'cycle',
    weight: 0.3,
    noun: 'le cycle',
    title: 'Tracker de cycle',
    question: 'Où en est ton cycle ?',
    bg: '#F3C6CF',
    levels: [
      { value: 0, label: 'Règles', color: '#C42F3D', score: -0.1 },
      { value: 1, label: 'Phase folliculaire', color: '#F49AAC', score: 0 },
      { value: 2, label: 'Ovulation', color: '#7D4FC9', score: 0 },
      { value: 3, label: 'Phase lutéale', color: '#F2B866', score: 0 },
    ],
  },
  {
    id: 'pas',
    weight: 0.5,
    noun: 'la marche',
    title: 'Nombre de pas',
    question: 'Combien de pas aujourd’hui ?',
    bg: '#BFD7F2',
    measure: { input: 'number', max: 100000, step: 1, thresholds: [2000, 5000, 8000, 10000], format: formatSteps },
    levels: [
      { value: 0, label: '< 2 000', color: '#DCE8F7', score: -0.3 },
      { value: 1, label: '2 – 5 000', color: '#A9C8EE', score: 0 },
      { value: 2, label: '5 – 8 000', color: '#6D9FE0', score: 0.2 },
      { value: 3, label: '8 – 10 000', color: '#3A6FC4', score: 0.4 },
      { value: 4, label: '10 000 +', color: '#1D3F80', score: 0.5 },
    ],
  },
  {
    id: 'ecran',
    weight: 0.6,
    noun: 'le temps d’écran',
    title: 'Temps d’écran',
    question: 'Combien de temps sur ton téléphone ?',
    bg: '#F6D3B3',
    measure: { input: 'range', max: 720, step: 15, thresholds: [60, 120, 240, 360], format: formatMinutes },
    levels: [
      { value: 0, label: '< 1 h', color: '#7DB84A', score: 0.5 },
      { value: 1, label: '1 – 2 h', color: '#B7D36A', score: 0.3 },
      { value: 2, label: '2 – 4 h', color: '#F2C641', score: 0 },
      { value: 3, label: '4 – 6 h', color: '#EB7A2A', score: -0.4 },
      { value: 4, label: '6 h +', color: '#C9302C', score: -0.7 },
    ],
  },
  {
    id: 'pixels',
    computed: true,
    title: 'Mon année en pixels',
    question: 'Ta journée, vue par tous tes calendriers',
    bg: '#E8B8AE',
    levels: [
      { value: 0, label: 'Journée difficile', color: '#C9302C' },
      { value: 1, label: 'Pas terrible', color: '#EB7A2A' },
      { value: 2, label: 'Mitigée', color: '#F2C641' },
      { value: 3, label: 'Plutôt bonne', color: '#A8CC5C' },
      { value: 4, label: 'Belle journée', color: '#4E9A3A' },
    ],
  },
]

export const themes = allThemes.filter((t) => !t.hidden)

export const levelFor = (m: Measure, n: number) => {
  const i = m.thresholds.findIndex((t) => n < t)
  return i === -1 ? m.thresholds.length : i
}

export const levelColor = (t: Theme, v: number | undefined) =>
  v === undefined ? undefined : t.levels.find((l) => l.value === v)?.color

// true when white text reads better on the color
export const isDark = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  const r = n >> 16, g = (n >> 8) & 255, b = n & 255
  return 0.299 * r + 0.587 * g + 0.114 * b < 140
}
