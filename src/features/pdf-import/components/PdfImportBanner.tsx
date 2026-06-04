import { useNavigate } from 'react-router-dom'
import { useSubjectsStore } from '@/features/subjects/store/subjectsStore'
import { ROUTES } from '@/shared/constants'

/**
 * Banner del Dashboard que invita al usuario a importar el plan de estudios
 * desde un PDF. Solo aparece si:
 *  - el store de subjects ya cargó (`loaded === true`)
 *  - no hay materias del usuario (`userSubjects.length === 0`)
 *
 * Estado completamente derivado (D4 en research.md). En cuanto el usuario
 * cargue materias por PDF o manualmente, el banner desaparece.
 */
export default function PdfImportBanner() {
  const navigate = useNavigate()
  const loaded = useSubjectsStore(s => s.loaded)
  const userSubjects = useSubjectsStore(s => s.userSubjects)
  const subjects = useSubjectsStore(s => s.subjects)

  if (!loaded) return null
  // Si el usuario ya tiene materias del usuario (estados) O ya hay materias
  // cargadas para la carrera, asumimos que ya importó / tiene plan.
  if (userSubjects.length > 0) return null
  if (subjects.length > 0) return null

  return (
    <button
      onClick={() => navigate(ROUTES.PDF_IMPORT)}
      aria-label="Subir plan de estudios desde un PDF"
      className="w-full bg-bg-surface border border-accent/40 rounded-2xl p-5 text-left hover:border-accent/70 hover:bg-bg-elevated transition-all"
    >
      <div className="flex items-start gap-3">
        <span className="text-3xl shrink-0 leading-none mt-0.5">📄</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-accent text-sm leading-none">✦</span>
            <p className="text-xs text-accent uppercase tracking-wider font-semibold">
              Importar plan
            </p>
          </div>
          <p className="text-sm font-semibold text-text-primary leading-snug">
            Cargá tus materias en segundos
          </p>
          <p className="text-xs text-text-secondary mt-1 leading-relaxed">
            Subí el PDF oficial de tu plan de estudios y lo procesamos por vos.
          </p>
        </div>
        <span className="text-accent text-xl ml-1 shrink-0">→</span>
      </div>
    </button>
  )
}
