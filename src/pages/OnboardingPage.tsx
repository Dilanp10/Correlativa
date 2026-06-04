import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useCareerStore } from '@/features/career/store/careerStore'
import { useUniversities } from '@/features/career/hooks/useUniversities'
import { useCareers } from '@/features/career/hooks/useCareers'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { supabase } from '@/shared/lib/supabase/client'
import Button from '@/shared/components/Button'
import Input from '@/shared/components/Input'
import type { University, CareerWithUniversity } from '@/shared/types'
import { ROUTES } from '@/shared/constants'

type Step = 'university' | 'career' | 'custom' | 'pdf_offer'

export default function OnboardingPage() {
  const user = useAuthStore(s => s.user)
  const setActiveCareer = useCareerStore(s => s.setActiveCareer)
  const setCareerLoading = useCareerStore(s => s.setLoading)
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('university')
  const [search, setSearch] = useState('')
  const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Custom career form
  const [customName, setCustomName] = useState('')
  const [customYears, setCustomYears] = useState('5')

  const debouncedSearch = useDebounce(search, 300)
  const { universities, isLoading: loadingUnis } = useUniversities()
  const { careers, isLoading: loadingCareers, createCustomCareer } = useCareers(
    selectedUniversity?.id ?? null,
    user?.id ?? ''
  )

  const filteredUnis = universities.filter(u =>
    u.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    u.short_name.toLowerCase().includes(debouncedSearch.toLowerCase())
  )

  async function selectCareer(career: CareerWithUniversity) {
    if (!user) return
    setIsSaving(true)
    await supabase.from('users').update({ active_career_id: career.id }).eq('id', user.id)
    setActiveCareer(career)
    setCareerLoading(false)
    setIsSaving(false)
    setStep('pdf_offer')
  }

  async function handleCreateCustom() {
    if (!customName.trim() || !user) return
    setIsSaving(true)
    const career = await createCustomCareer(customName.trim(), Number(customYears))
    if (career) {
      await supabase.from('users').update({ active_career_id: career.id }).eq('id', user.id)
      setActiveCareer(career)
      setCareerLoading(false)
      setIsSaving(false)
      setStep('pdf_offer')
      return
    }
    setIsSaving(false)
  }

  // ── Step indicator ──────────────────────────────────────────
  // 3 steps visibles: universidad, carrera, plan opcional.
  const stepNumber = step === 'university' ? 1 : step === 'pdf_offer' ? 3 : 2
  const stepTotal = 3

  return (
    <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-medium text-text-secondary mb-3 tracking-widest uppercase">
            Paso {stepNumber} de {stepTotal}
          </p>
          <div className="flex gap-2 mb-6">
            {[1, 2, 3].map(n => (
              <div
                key={n}
                className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                  n <= stepNumber ? 'bg-accent' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {step === 'university' && (
            <>
              <h2 className="text-2xl font-bold text-text-primary">¿En qué universidad estudiás?</h2>
              <p className="text-text-secondary text-sm mt-1">Buscá tu universidad en el listado.</p>
            </>
          )}
          {step === 'career' && (
            <>
              <button
                onClick={() => { setStep('university'); setSearch('') }}
                className="flex items-center gap-1 text-text-secondary text-sm mb-3 hover:text-text-primary transition-colors"
              >
                ← {selectedUniversity?.short_name}
              </button>
              <h2 className="text-2xl font-bold text-text-primary">¿Qué carrera cursás?</h2>
              <p className="text-text-secondary text-sm mt-1">Seleccioná tu carrera.</p>
            </>
          )}
          {step === 'custom' && (
            <>
              <button
                onClick={() => setStep('career')}
                className="flex items-center gap-1 text-text-secondary text-sm mb-3 hover:text-text-primary transition-colors"
              >
                ← Volver
              </button>
              <h2 className="text-2xl font-bold text-text-primary">Creá tu carrera</h2>
              <p className="text-text-secondary text-sm mt-1">
                Podés agregar las materias después desde el árbol.
              </p>
            </>
          )}

          {step === 'pdf_offer' && (
            <>
              <h2 className="text-2xl font-bold text-text-primary">¿Subís tu plan de estudios?</h2>
              <p className="text-text-secondary text-sm mt-1">
                Si tenés el PDF a mano, cargamos todas tus materias en un toque.
              </p>
            </>
          )}
        </div>

        {/* ── STEP 1: Universidad ─────────────────────────────── */}
        {step === 'university' && (
          <div className="flex flex-col gap-3">
            <Input
              label="Buscar universidad"
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Ej: UNC, Córdoba, Buenos Aires..."
            />

            <div className="flex flex-col gap-2 mt-1 max-h-72 overflow-y-auto pr-1">
              {loadingUnis ? (
                [...Array(5)].map((_, i) => (
                  <div key={i} className="h-14 rounded-xl bg-bg-elevated animate-pulse" />
                ))
              ) : filteredUnis.length === 0 ? (
                <p className="text-text-secondary text-sm text-center py-6">
                  No encontramos esa universidad.
                </p>
              ) : (
                filteredUnis.map(uni => (
                  <button
                    key={uni.id}
                    onClick={() => { setSelectedUniversity(uni); setStep('career'); setSearch('') }}
                    className="flex items-center gap-3 rounded-xl border border-muted bg-bg-surface px-4 py-3 text-left hover:border-accent/60 hover:bg-bg-elevated transition-all duration-150"
                  >
                    <span className="text-xs font-bold text-accent bg-accent/10 rounded-lg px-2 py-1 min-w-[52px] text-center">
                      {uni.short_name}
                    </span>
                    <span className="text-sm text-text-primary">{uni.name}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── STEP 2: Carrera ─────────────────────────────────── */}
        {step === 'career' && (
          <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
            {loadingCareers ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-bg-elevated animate-pulse" />
              ))
            ) : careers.length === 0 ? (
              <p className="text-text-secondary text-sm text-center py-4">
                No hay carreras cargadas para esta universidad todavía.
              </p>
            ) : (
              careers.map(career => (
                <button
                  key={career.id}
                  onClick={() => selectCareer(career)}
                  disabled={isSaving}
                  className="flex items-center justify-between rounded-xl border border-muted bg-bg-surface px-4 py-4 text-left hover:border-accent/60 hover:bg-bg-elevated transition-all duration-150 disabled:opacity-50"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">{career.name}</p>
                    {career.total_years && (
                      <p className="text-xs text-text-secondary mt-0.5">{career.total_years} años</p>
                    )}
                  </div>
                  <span className="text-muted text-lg">›</span>
                </button>
              ))
            )}

            {/* Opción carrera manual */}
            <button
              onClick={() => setStep('custom')}
              className="flex items-center gap-3 rounded-xl border border-dashed border-muted px-4 py-4 text-left hover:border-accent/40 transition-colors mt-1"
            >
              <span className="text-accent text-lg">+</span>
              <div>
                <p className="text-sm font-medium text-text-primary">Mi carrera no está acá</p>
                <p className="text-xs text-text-secondary">Creala manualmente</p>
              </div>
            </button>
          </div>
        )}

        {/* ── STEP custom: Carrera manual ──────────────────────── */}
        {step === 'custom' && (
          <div className="flex flex-col gap-4">
            <Input
              label="Nombre de la carrera"
              type="text"
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              placeholder="Ej: Ingeniería Civil"
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-secondary">
                Duración (años): <span className="text-text-primary font-bold">{customYears}</span>
              </label>
              <input
                type="range"
                min={3}
                max={7}
                value={customYears}
                onChange={e => setCustomYears(e.target.value)}
                className="accent-accent"
              />
              <div className="flex justify-between text-xs text-text-secondary">
                <span>3</span><span>4</span><span>5</span><span>6</span><span>7</span>
              </div>
            </div>

            <Button
              onClick={handleCreateCustom}
              loading={isSaving}
              disabled={!customName.trim()}
              className="w-full mt-2"
            >
              Crear carrera y continuar
            </Button>
          </div>
        )}

        {/* ── STEP 3 (opcional): Subir el plan de estudios ───────── */}
        {step === 'pdf_offer' && (
          <div className="flex flex-col gap-4">
            <div className="bg-bg-surface border border-muted/40 rounded-2xl px-4 py-4 text-sm text-text-secondary space-y-2">
              <p className="text-text-primary font-semibold">¿Cómo funciona?</p>
              <p>
                Leemos el texto del PDF y usamos IA para detectar todas tus
                materias con su año, cuatrimestre y correlativas.
              </p>
              <p className="text-text-secondary/80">
                Vas a poder revisar todo antes de confirmar. Te ahorra unos
                20 minutos de carga manual.
              </p>
            </div>

            <Button
              onClick={() => navigate(`${ROUTES.PDF_IMPORT}?from=onboarding`)}
              className="w-full"
            >
              Subir PDF ahora
            </Button>
            <button
              onClick={() => navigate(ROUTES.DASHBOARD)}
              className="w-full text-text-secondary text-sm py-2 hover:text-text-primary transition-colors"
            >
              Lo hago después
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
