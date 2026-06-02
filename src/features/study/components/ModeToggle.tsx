import type { StudyMode } from '@/features/study/lib/exercise'

interface Props {
  mode: StudyMode
  onChange: (m: StudyMode) => void
}

export default function ModeToggle({ mode, onChange }: Props) {
  return (
    <div className="inline-flex rounded-xl bg-bg-surface border border-muted/40 p-1 w-full">
      {(['quiz', 'exercises'] as const).map(m => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === m ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          {m === 'quiz' ? 'Quiz' : 'Ejercicios'}
        </button>
      ))}
    </div>
  )
}
