// Paleta de colores de acento por carrera.
// Spec: specs/009-competitive-ui-redesign/contracts/ui-contracts.md §6
//
// Todos los colores fueron verificados contra el fondo principal (#0A0A0F)
// para garantizar contraste WCAG AA (≥4.5:1). Ver research.md §3.

export interface CareerTheme {
  hex: string  // ej "#6C63FF"
  rgb: string  // ej "108 99 255" (formato compatible con Tailwind opacity utilities)
}

export const DEFAULT_ACCENT: CareerTheme = {
  hex: '#6C63FF',
  rgb: '108 99 255',
}

export const ACCENT_PALETTE = {
  violeta:        { hex: '#6C63FF', rgb: '108 99 255' },
  cyan:           { hex: '#22D3EE', rgb: '34 211 238' },
  naranja:        { hex: '#F97316', rgb: '249 115 22' },
  esmeralda:      { hex: '#10B981', rgb: '16 185 129' },
  rosa:           { hex: '#EC4899', rgb: '236 72 153' },
  amarillo:       { hex: '#EAB308', rgb: '234 179 8' },
} as const satisfies Record<string, CareerTheme>

// Mapeo de nombre de carrera (lowercase, sin acentos normalizados) → color.
// El matching es por keyword: si el nombre incluye alguna keyword del map,
// se asigna ese color. La keyword más específica (más larga) gana.
const CAREER_COLOR_KEYWORDS: Array<[string, CareerTheme]> = [
  ['arquitectura',                     ACCENT_PALETTE.naranja],
  ['ingenieria en informatica',        ACCENT_PALETTE.violeta],
  ['ingenieria en sistemas',           ACCENT_PALETTE.violeta],
  ['ingenieria',                       ACCENT_PALETTE.cyan],
  ['medicina',                         ACCENT_PALETTE.rosa],
  ['derecho',                          ACCENT_PALETTE.amarillo],
  ['contador',                         ACCENT_PALETTE.esmeralda],
  ['psicologia',                       ACCENT_PALETTE.rosa],
  ['licenciatura en sistemas',         ACCENT_PALETTE.violeta],
  ['administracion',                   ACCENT_PALETTE.esmeralda],
  ['economia',                         ACCENT_PALETTE.esmeralda],
  ['biologia',                         ACCENT_PALETTE.esmeralda],
  ['quimica',                          ACCENT_PALETTE.rosa],
  ['fisica',                           ACCENT_PALETTE.cyan],
  ['matematica',                       ACCENT_PALETTE.cyan],
  ['letras',                           ACCENT_PALETTE.amarillo],
  ['historia',                         ACCENT_PALETTE.amarillo],
  ['filosofia',                        ACCENT_PALETTE.amarillo],
  ['educacion',                        ACCENT_PALETTE.rosa],
  ['diseno',                           ACCENT_PALETTE.naranja],
]

/** Quita acentos y pasa a minúsculas para matching. */
function normalize(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Devuelve el tema de acento para una carrera dada (por nombre).
 * Si no hay match, retorna el default (violeta).
 *
 * Estrategia: matchea por keyword incluida en el nombre normalizado.
 * Las keywords más largas se evalúan primero para evitar falsos positivos
 * (ej: "ingenieria en informatica" antes que "ingenieria").
 */
export function getCareerTheme(careerName: string | undefined | null): CareerTheme {
  if (!careerName) return DEFAULT_ACCENT
  const norm = normalize(careerName)

  // Ordenamos por longitud descendente (sin mutar el array original)
  const sorted = [...CAREER_COLOR_KEYWORDS].sort((a, b) => b[0].length - a[0].length)

  for (const [keyword, theme] of sorted) {
    if (norm.includes(keyword)) return theme
  }

  return DEFAULT_ACCENT
}

/**
 * Convierte un hex (#RRGGBB o #RGB) al formato "R G B" usado por Tailwind v3
 * con opacity-aware utilities (`rgb(var(--accent-rgb) / <alpha-value>)`).
 *
 * Acepta #6C63FF, 6C63FF, #6C6 (forma corta).
 */
export function hexToRgb(hex: string): string {
  let h = hex.trim().replace(/^#/, '')
  if (h.length === 3) {
    h = h.split('').map(c => c + c).join('')
  }
  if (h.length !== 6 || !/^[0-9a-fA-F]+$/.test(h)) {
    return DEFAULT_ACCENT.rgb
  }
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `${r} ${g} ${b}`
}
