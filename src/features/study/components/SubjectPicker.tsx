import Button from '@/shared/components/Button'
import type { SubjectWithCorrelatives } from '@/shared/types'

interface Props {
  subjects: SubjectWithCorrelatives[]
  selectedSubjectId: string | null
  topic: string
  isGenerating: boolean
  onSubjectChange: (id: string) => void
  onTopicChange: (t: string) => void
  onGenerate: () => void
}

export default function SubjectPicker({
  subjects,
  selectedSubjectId,
  topic,
  isGenerating,
  onSubjectChange,
  onTopicChange,
  onGenerate,
}: Props) {
  const fieldClass =
    'w-full bg-bg-elevated border border-muted rounded-xl px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent transition-colors'

  return (
    <div className="flex flex-col gap-5">
      {/* Materia */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
          Materia
        </label>
        <select
          value={selectedSubjectId ?? ''}
          onChange={e => onSubjectChange(e.target.value)}
          className={fieldClass}
        >
          <option value="">Elegí una materia</option>
          {subjects.map(s => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tema opcional */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
          Tema o foco (opcional)
        </label>
        <input
          type="text"
          value={topic}
          onChange={e => onTopicChange(e.target.value)}
          placeholder="Ej: derivadas, integrales..."
          maxLength={200}
          className={fieldClass}
        />
      </div>

      {/* Botón */}
      <Button
        onClick={onGenerate}
        disabled={!selectedSubjectId || isGenerating}
        loading={isGenerating}
        className="w-full"
      >
        Generar quiz
      </Button>

      {/* Disclaimer IA */}
      <p className="text-xs text-text-secondary flex items-start gap-1.5">
        <span className="mt-0.5 shrink-0">ⓘ</span>
        <span>
          Las respuestas son generadas por IA. Verificá con tu material si tenés dudas.
        </span>
      </p>
    </div>
  )
}
