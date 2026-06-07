import { create } from 'zustand'
import type { CareerWithUniversity, University } from '@/shared/types'
import { useCareerThemeStore } from '@/features/tree/store/careerThemeStore'
import { getCareerTheme, DEFAULT_ACCENT } from '@/shared/constants/careerThemes'

interface CareerStore {
  activeCareer: CareerWithUniversity | null
  university: University | null
  isLoading: boolean
  setActiveCareer: (career: CareerWithUniversity | null) => void
  setUniversity: (university: University | null) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

/**
 * Aplica el color de acento correspondiente a la carrera dada.
 * Si no hay carrera, vuelve al default (violeta).
 *
 * Esto vive acá (en vez de en cada lugar que setea carrera) para
 * garantizar que el tema siempre refleje la carrera activa.
 */
function syncAccentTheme(career: CareerWithUniversity | null) {
  const theme = career ? getCareerTheme(career.name) : DEFAULT_ACCENT
  useCareerThemeStore.getState().setAccentColor(theme.hex)
}

export const useCareerStore = create<CareerStore>(set => ({
  activeCareer: null,
  university: null,
  isLoading: true,
  setActiveCareer: activeCareer => {
    set({ activeCareer })
    syncAccentTheme(activeCareer)
  },
  setUniversity: university => set({ university }),
  setLoading: isLoading => set({ isLoading }),
  reset: () => {
    set({ activeCareer: null, university: null, isLoading: false })
    syncAccentTheme(null)
  },
}))
