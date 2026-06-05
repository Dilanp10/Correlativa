export type StudyTool = 'quiz' | 'exercises' | 'summary' | 'flashcards'

interface Props {
  value: StudyTool
  onChange: (t: StudyTool) => void
}

const TOOLS: { id: StudyTool; emoji: string; label: string }[] = [
  { id: 'quiz', emoji: '📝', label: 'Quiz' },
  { id: 'exercises', emoji: '✏️', label: 'Ejercicios' },
  { id: 'summary', emoji: '📄', label: 'Resumen' },
  { id: 'flashcards', emoji: '🃏', label: 'Flashcards' },
]

export default function StudyToolSelector({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {TOOLS.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2.5 transition-all ${
            value === t.id
              ? 'bg-accent/15 border-accent/50'
              : 'bg-bg-surface border-muted/40 hover:border-accent/30'
          }`}
        >
          <span className="text-lg">{t.emoji}</span>
          <span
            className={`text-[10px] font-semibold leading-none ${
              value === t.id ? 'text-accent' : 'text-text-secondary'
            }`}
          >
            {t.label}
          </span>
        </button>
      ))}
    </div>
  )
}
