import { create } from 'zustand'

// Store de milestones de progreso de carrera.
// Spec: specs/009-competitive-ui-redesign/data-model.md §3
//
// Cuando el usuario cruza por primera vez 25/50/75/100% de la carrera
// completada, mostramos un modal de celebración. Cada milestone solo se
// muestra una vez por usuario (persistido en localStorage).
//
// La elección de localStorage (en vez de Supabase) es deliberada:
// - Es un detalle de UX, no datos críticos del usuario.
// - Si limpia el navegador, ver el milestone otra vez no es problema.
// - Cero queries adicionales a la DB.

export const MILESTONE_THRESHOLDS = [25, 50, 75, 100] as const
export type MilestoneThreshold = (typeof MILESTONE_THRESHOLDS)[number]

const STORAGE_KEY = 'correlativa:milestones'

function loadShown(): MilestoneThreshold[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((n): n is MilestoneThreshold =>
      typeof n === 'number' && (MILESTONE_THRESHOLDS as readonly number[]).includes(n)
    )
  } catch {
    return []
  }
}

function persistShown(shown: MilestoneThreshold[]): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shown))
  } catch {
    // Cuota llena o modo privado: no es crítico, seguimos.
  }
}

interface MilestoneStore {
  /** Umbrales ya mostrados (persistidos en localStorage). */
  shownMilestones: MilestoneThreshold[]
  /** El umbral más alto pendiente de mostrar al usuario. null si no hay nada. */
  pendingMilestone: MilestoneThreshold | null

  /**
   * Comprueba el porcentaje actual de la carrera y, si cruzó algún umbral
   * no mostrado, lo deja en `pendingMilestone` (toma el más alto).
   */
  checkMilestone(percent: number): void
  /** Marca el `pendingMilestone` actual como mostrado y lo limpia. */
  dismissMilestone(): void
  /** Helper para tests: resetea el estado y limpia localStorage. */
  _reset(): void
}

export const useMilestoneStore = create<MilestoneStore>((set, get) => ({
  shownMilestones: loadShown(),
  pendingMilestone: null,

  checkMilestone(percent) {
    if (!Number.isFinite(percent) || percent < MILESTONE_THRESHOLDS[0]) return

    const { shownMilestones, pendingMilestone } = get()
    if (pendingMilestone !== null) return // ya hay uno pendiente; no lo pisemos

    // Buscamos el umbral más alto que (a) ya se cruzó y (b) no fue mostrado.
    let candidate: MilestoneThreshold | null = null
    for (const threshold of MILESTONE_THRESHOLDS) {
      if (percent >= threshold && !shownMilestones.includes(threshold)) {
        candidate = threshold
      }
    }
    if (candidate !== null) {
      set({ pendingMilestone: candidate })
    }
  },

  dismissMilestone() {
    const { pendingMilestone, shownMilestones } = get()
    if (pendingMilestone === null) return
    const nextShown = Array.from(new Set([...shownMilestones, pendingMilestone]))
    persistShown(nextShown)
    set({ shownMilestones: nextShown, pendingMilestone: null })
  },

  _reset() {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {
        // ignore
      }
    }
    set({ shownMilestones: [], pendingMilestone: null })
  },
}))
