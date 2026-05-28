import { create } from 'zustand'
import type { CareerWithUniversity, University } from '@/shared/types'

interface CareerStore {
  activeCareer: CareerWithUniversity | null
  university: University | null
  isLoading: boolean
  setActiveCareer: (career: CareerWithUniversity | null) => void
  setUniversity: (university: University | null) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export const useCareerStore = create<CareerStore>(set => ({
  activeCareer: null,
  university: null,
  isLoading: true,
  setActiveCareer: activeCareer => set({ activeCareer }),
  setUniversity: university => set({ university }),
  setLoading: isLoading => set({ isLoading }),
  reset: () => set({ activeCareer: null, university: null, isLoading: false }),
}))
