import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import PdfUploader from '@/features/pdf-import/components/PdfUploader'
import SubjectPreview from '@/features/pdf-import/components/SubjectPreview'
import { usePdfImport } from '@/features/pdf-import/hooks/usePdfImport'
import { ROUTES } from '@/shared/constants'

export default function PdfImportPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const fromOnboarding = searchParams.get('from') === 'onboarding'

  const {
    phase,
    subjects,
    parseWarning,
    error,
    inserted,
    skipped,
    correlativesLinked,
    correlativesUnresolved,
    parse,
    save,
    reset,
  } = usePdfImport()

  // Limpiar el estado al desmontar para que la próxima visita arranque limpia.
  useEffect(() => {
    return () => {
      reset()
    }
  }, [reset])

  function goBack() {
    navigate(fromOnboarding ? ROUTES.DASHBOARD : ROUTES.DASHBOARD)
  }

  function goToTree() {
    navigate(fromOnboarding ? ROUTES.DASHBOARD : ROUTES.TREE)
  }

  return (
    <div className="min-h-screen bg-bg-base flex flex-col md:ml-56">
      {/* Header */}
      <header className="px-5 pt-12 pb-4 flex items-start gap-3">
        <button
          onClick={goBack}
          aria-label="Volver"
          className="shrink-0 text-text-secondary hover:text-text-primary transition-colors text-2xl leading-none mt-1"
        >
          ←
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-text-primary leading-tight">
            Importar plan de estudios
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Subí el PDF oficial de tu plan y cargamos todas las materias por vos.
          </p>
        </div>
      </header>

      <div className="flex-1 px-5 pb-8 space-y-5">
        {/* ── idle ──────────────────────────────────────────────── */}
        {phase === 'idle' && (
          <>
            <PdfUploader onFile={parse} />
            <div className="rounded-xl bg-bg-surface border border-muted/40 px-4 py-3 text-xs text-text-secondary space-y-1">
              <p>
                <strong className="text-text-primary">¿Cómo funciona?</strong>
              </p>
              <p>
                Leemos el texto del PDF y usamos IA para detectar las materias,
                el año, el cuatrimestre y las correlativas. Vas a poder revisar
                todo antes de confirmar.
              </p>
              <p className="pt-1 text-text-secondary/80">
                El PDF se procesa en el momento y no se guarda en nuestros
                servidores.
              </p>
            </div>
          </>
        )}

        {/* ── parsing ───────────────────────────────────────────── */}
        {phase === 'parsing' && (
          <div className="flex flex-col items-center gap-4 pt-16 text-center">
            <div className="w-10 h-10 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            <p className="text-text-primary font-medium">Procesando tu PDF...</p>
            <p className="text-text-secondary text-sm">
              Esto puede tardar entre 10 y 20 segundos.
            </p>
          </div>
        )}

        {/* ── preview ───────────────────────────────────────────── */}
        {phase === 'preview' && (
          <SubjectPreview
            subjects={subjects}
            warning={parseWarning}
            onConfirm={save}
            onCancel={reset}
            isSaving={false}
          />
        )}

        {/* ── saving ────────────────────────────────────────────── */}
        {phase === 'saving' && (
          <SubjectPreview
            subjects={subjects}
            warning={parseWarning}
            onConfirm={save}
            onCancel={reset}
            isSaving={true}
          />
        )}

        {/* ── done ──────────────────────────────────────────────── */}
        {phase === 'done' && (
          <div className="flex flex-col items-center text-center gap-5 pt-10">
            <motion.div
              className="text-6xl"
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              🎉
            </motion.div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold text-text-primary">
                ¡Listo! Tus materias están cargadas
              </h2>
              <p className="text-sm text-text-secondary">
                Ahora podés ver tu árbol de correlativas completo.
              </p>
            </div>

            <div className="bg-bg-surface rounded-2xl border border-muted/30 px-6 py-4 w-full max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between text-text-secondary">
                <span>Materias nuevas</span>
                <span className="text-success font-bold">{inserted}</span>
              </div>
              {skipped > 0 && (
                <div className="flex justify-between text-text-secondary">
                  <span>Ya existían</span>
                  <span className="text-text-primary font-bold">{skipped}</span>
                </div>
              )}
              <div className="flex justify-between text-text-secondary">
                <span>Correlativas vinculadas</span>
                <span className="text-text-primary font-bold">{correlativesLinked}</span>
              </div>
              {correlativesUnresolved.length > 0 && (
                <p className="text-xs text-warning pt-1">
                  {correlativesUnresolved.length} correlativa{correlativesUnresolved.length !== 1 ? 's' : ''} no pudimos vincular automáticamente.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2 w-full pt-2">
              <button
                onClick={goToTree}
                className="w-full bg-accent text-white font-semibold rounded-xl py-3 text-sm hover:bg-accent/90 active:scale-95 transition-all"
              >
                {fromOnboarding ? 'Ir al dashboard' : 'Ver mi árbol'}
              </button>
            </div>
          </div>
        )}

        {/* ── error ─────────────────────────────────────────────── */}
        {phase === 'error' && (
          <div className="flex flex-col items-center text-center gap-4 pt-12 px-2">
            <p className="text-4xl">⚠️</p>
            <p className="text-text-primary font-semibold">Algo salió mal</p>
            <p className="text-text-secondary text-sm">{error}</p>
            <div className="flex flex-col gap-2 w-full max-w-xs pt-2">
              <button
                onClick={reset}
                className="w-full bg-accent text-white font-semibold rounded-xl py-3 text-sm active:scale-95 transition-all"
              >
                Reintentar
              </button>
              <button
                onClick={goBack}
                className="w-full text-text-secondary text-sm py-2 hover:text-text-primary transition-colors"
              >
                Volver al dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
