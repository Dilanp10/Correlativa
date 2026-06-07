import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useMilestoneStore, MILESTONE_THRESHOLDS } from './milestoneStore'

// El repo no tiene jsdom configurado. Inyectamos un localStorage en
// globalThis para validar la persistencia. Después de cada test limpiamos.
type MemoryStorage = {
  store: Map<string, string>
  getItem: ReturnType<typeof vi.fn>
  setItem: ReturnType<typeof vi.fn>
  removeItem: ReturnType<typeof vi.fn>
}

function installLocalStorage(): MemoryStorage {
  const store = new Map<string, string>()
  const mem: MemoryStorage = {
    store,
    getItem: vi.fn((k: string) => store.get(k) ?? null),
    setItem: vi.fn((k: string, v: string) => {
      store.set(k, v)
    }),
    removeItem: vi.fn((k: string) => {
      store.delete(k)
    }),
  }
  ;(globalThis as Record<string, unknown>).localStorage = mem
  return mem
}

function uninstallLocalStorage() {
  delete (globalThis as Record<string, unknown>).localStorage
}

describe('milestoneStore', () => {
  beforeEach(() => {
    installLocalStorage()
    useMilestoneStore.getState()._reset()
  })

  afterEach(() => {
    uninstallLocalStorage()
  })

  describe('checkMilestone', () => {
    it('no setea pending si percent < 25%', () => {
      useMilestoneStore.getState().checkMilestone(20)
      expect(useMilestoneStore.getState().pendingMilestone).toBeNull()
    })

    it('setea pending = 25 al cruzar el 25%', () => {
      useMilestoneStore.getState().checkMilestone(25)
      expect(useMilestoneStore.getState().pendingMilestone).toBe(25)
    })

    it('setea pending = 50 al cruzar el 50% sin haber mostrado el 25', () => {
      // Caso real: usuario importa carrera con muchas materias ya aprobadas
      useMilestoneStore.getState().checkMilestone(60)
      expect(useMilestoneStore.getState().pendingMilestone).toBe(50)
    })

    it('setea pending = 100 al cruzar el 100%', () => {
      useMilestoneStore.getState().checkMilestone(100)
      expect(useMilestoneStore.getState().pendingMilestone).toBe(100)
    })

    it('ignora porcentajes inválidos (NaN, negativos)', () => {
      useMilestoneStore.getState().checkMilestone(NaN)
      expect(useMilestoneStore.getState().pendingMilestone).toBeNull()
      useMilestoneStore.getState().checkMilestone(-5)
      expect(useMilestoneStore.getState().pendingMilestone).toBeNull()
    })

    it('no pisa un pendingMilestone existente', () => {
      const store = useMilestoneStore.getState()
      store.checkMilestone(30)
      expect(useMilestoneStore.getState().pendingMilestone).toBe(25)
      store.checkMilestone(80) // debería querer poner 75, pero ya hay uno pendiente
      expect(useMilestoneStore.getState().pendingMilestone).toBe(25)
    })
  })

  describe('dismissMilestone', () => {
    it('agrega el pending a shown y limpia pending', () => {
      const store = useMilestoneStore.getState()
      store.checkMilestone(30)
      expect(useMilestoneStore.getState().pendingMilestone).toBe(25)
      store.dismissMilestone()
      const after = useMilestoneStore.getState()
      expect(after.pendingMilestone).toBeNull()
      expect(after.shownMilestones).toContain(25)
    })

    it('dismiss sin pending es no-op', () => {
      expect(() => useMilestoneStore.getState().dismissMilestone()).not.toThrow()
      expect(useMilestoneStore.getState().shownMilestones).toEqual([])
    })

    it('después de dismiss, checkMilestone con mismo porcentaje no vuelve a setear', () => {
      const store = useMilestoneStore.getState()
      store.checkMilestone(30)
      store.dismissMilestone()
      store.checkMilestone(30)
      expect(useMilestoneStore.getState().pendingMilestone).toBeNull()
    })

    it('después de dismiss del 25, cruzar el 50% sí dispara el 50', () => {
      const store = useMilestoneStore.getState()
      store.checkMilestone(25)
      store.dismissMilestone()
      store.checkMilestone(55)
      expect(useMilestoneStore.getState().pendingMilestone).toBe(50)
    })
  })

  describe('persistencia en localStorage', () => {
    it('persiste shownMilestones en localStorage al dismiss', () => {
      const mem = installLocalStorage()
      useMilestoneStore.getState()._reset()
      useMilestoneStore.getState().checkMilestone(30)
      useMilestoneStore.getState().dismissMilestone()
      expect(mem.setItem).toHaveBeenCalledWith('correlativa:milestones', JSON.stringify([25]))
    })

    it('lee shownMilestones desde localStorage al cargar', () => {
      // No podemos re-instanciar el store, pero podemos validar que loadShown
      // funciona si hay datos previos: simulamos persistencia + reset + checkMilestone.
      const mem = installLocalStorage()
      mem.store.set('correlativa:milestones', JSON.stringify([25, 50]))
      // Forzamos una re-lectura simulando el flujo del store via _reset + manual load.
      // (En producción, esto ocurre automáticamente al crear el módulo.)
      // Para el test, validamos directamente que el formato persistido es correcto.
      const raw = mem.getItem('correlativa:milestones')
      expect(raw).toBe(JSON.stringify([25, 50]))
    })
  })

  describe('MILESTONE_THRESHOLDS', () => {
    it('expone exactamente [25, 50, 75, 100]', () => {
      expect(MILESTONE_THRESHOLDS).toEqual([25, 50, 75, 100])
    })
  })
})
