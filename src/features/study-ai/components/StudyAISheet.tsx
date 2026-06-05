import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomSheet from '@/shared/components/BottomSheet'
import SummaryView from '@/features/study-ai/components/SummaryView'
import FlashcardsView from '@/features/study-ai/components/FlashcardsView'
import { useStudyStore } from '@/features/study/store/studyStore'
import { ROUTES } from '@/shared/constants'

type Mode = 'menu' | 'summary' | 'flashcards'
type CardId = 'quiz' | 'summary' | 'flashcards'

interface Props {
  subjectId: string | null
  subjectName: string
  isOpen: boolean
  onClose: () => void
}

const CARDS: { id: CardId; emoji: string; label: string; desc: string }[] = [
  { id: 'quiz', emoji: '📝', label: 'Quiz', desc: 'Preguntas para repasar' },
  { id: 'summary', emoji: '📄', label: 'Resumen', desc: 'Resumen del tema' },
  { id: 'flashcards', emoji: '🃏', label: 'Flashcards', desc: 'Tarjetas de repaso' },
]

export default function StudyAISheet({ subjectId, subjectName, isOpen, onClose }: Props) {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('menu')

  function handleClose() {
    setMode('menu')
    onClose()
  }

  // El quiz reutiliza la página de Estudiar (scoring, rachas, sesiones).
  // Pre-seleccionamos la materia y navegamos.
  function openQuiz() {
    if (!subjectId) return
    const study = useStudyStore.getState()
    study.resetAll()
    study.setMode('quiz')
    study.setSubjectId(subjectId)
    handleClose()
    navigate(ROUTES.STUDY)
  }

  function handleCard(id: CardId) {
    if (id === 'quiz') openQuiz()
    else setMode(id)
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
            {CARDS.map(m => (
              <button
                key={m.id}
                onClick={() => handleCard(m.id)}
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

      {mode === 'summary' && subjectId && (
        <SummaryView
          subjectId={subjectId}
          subjectName={subjectName}
          onBack={() => setMode('menu')}
        />
      )}

      {mode === 'flashcards' && subjectId && (
        <FlashcardsView
          subjectId={subjectId}
          subjectName={subjectName}
          onBack={() => setMode('menu')}
        />
      )}
    </BottomSheet>
  )
}
