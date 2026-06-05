import { useState } from 'react'
import BottomSheet from '@/shared/components/BottomSheet'
import SummaryView from '@/features/study-ai/components/SummaryView'

type Mode = 'menu' | 'quiz' | 'summary' | 'flashcards'

interface Props {
  subjectId: string | null
  subjectName: string
  isOpen: boolean
  onClose: () => void
}

const MODES: { id: Exclude<Mode, 'menu'>; emoji: string; label: string; desc: string }[] = [
  { id: 'quiz', emoji: '📝', label: 'Quiz', desc: 'Preguntas para repasar' },
  { id: 'summary', emoji: '📄', label: 'Resumen', desc: 'Resumen del tema' },
  { id: 'flashcards', emoji: '🃏', label: 'Flashcards', desc: 'Tarjetas de repaso' },
]

// Placeholder temporal: las sub-vistas reales llegan en las fases 5-7.
function ComingSoon({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <div className="px-5 py-8 flex flex-col items-center text-center gap-3">
      <p className="text-4xl">🚧</p>
      <p className="text-text-primary font-semibold">{label}</p>
      <p className="text-text-secondary text-sm">Lo estamos terminando. Muy pronto.</p>
      <button
        onClick={onBack}
        className="mt-2 text-sm text-accent hover:text-accent/80 transition-colors"
      >
        ← Volver
      </button>
    </div>
  )
}

export default function StudyAISheet({ subjectId, subjectName, isOpen, onClose }: Props) {
  const [mode, setMode] = useState<Mode>('menu')

  // Al cerrar, reseteamos al menú para la próxima apertura.
  function handleClose() {
    setMode('menu')
    onClose()
  }

  return (
    <BottomSheet isOpen={isOpen && subjectId !== null} onClose={handleClose} title="🤖 Estudiar con IA">
      {mode === 'menu' && (
        <div className="px-5 py-4 space-y-5 pb-8">
          <p className="text-sm text-text-secondary">
            Reforzá <span className="text-text-primary font-medium">{subjectName}</span> con
            ayuda de la IA.
          </p>

          <div className="grid grid-cols-3 gap-3">
            {MODES.map(m => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className="flex flex-col items-center gap-1.5 rounded-2xl bg-bg-elevated border border-muted/40 px-2 py-4 hover:border-accent/50 active:scale-95 transition-all"
              >
                <span className="text-2xl">{m.emoji}</span>
                <span className="text-xs font-semibold text-text-primary">{m.label}</span>
                <span className="text-[10px] text-text-secondary leading-tight text-center">
                  {m.desc}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === 'quiz' && <ComingSoon label="Quiz" onBack={() => setMode('menu')} />}
      {mode === 'summary' && subjectId && (
        <SummaryView
          subjectId={subjectId}
          subjectName={subjectName}
          onBack={() => setMode('menu')}
        />
      )}
      {mode === 'flashcards' && <ComingSoon label="Flashcards" onBack={() => setMode('menu')} />}
    </BottomSheet>
  )
}
