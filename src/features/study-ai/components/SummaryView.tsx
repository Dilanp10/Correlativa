import { useState } from 'react'
import { useSummary } from '@/features/study-ai/hooks/useSummary'
import type { StudyNote } from '@/shared/types/v2'

interface Props {
  subjectId: string
  subjectName: string
  onBack: () => void
}

// Renderiza el cuerpo del resumen (title + keyPoints + content).
function SummaryBody({
  title,
  content,
  keyPoints,
}: {
  title: string
  content: string
  keyPoints: string[]
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-text-primary leading-snug">{title}</h3>

      {keyPoints.length > 0 && (
        <div className="rounded-xl bg-accent/10 border border-accent/20 px-4 py-3">
          <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-2">
            📌 Puntos clave
          </p>
          <ul className="space-y-1.5">
            {keyPoints.map((k, i) => (
              <li key={i} className="text-sm text-text-primary flex gap-2">
                <span className="text-accent">•</span>
                <span>{k}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
        {/* La IA puede devolver **negrita** de Markdown; lo limpiamos para que
            no se vea el asterisco crudo (no renderizamos Markdown en v2). */}
        {content.replace(/\*\*/g, '')}
      </p>
    </div>
  )
}

export default function SummaryView({ subjectId, subjectName, onBack }: Props) {
  const { saved, current, isGenerating, error, generate, removeNote, clearCurrent } = useSummary(
    subjectId,
    subjectName
  )

  const [topic, setTopic] = useState('')
  const [text, setText] = useState('')
  const [openNote, setOpenNote] = useState<StudyNote | null>(null)

  const canGenerate = topic.trim().length >= 3 && !isGenerating

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isGenerating) {
    return (
      <div className="px-5 py-10 flex flex-col items-center text-center gap-4">
        <div className="w-9 h-9 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        <p className="text-text-primary font-medium">Generando resumen…</p>
        <p className="text-text-secondary text-sm">Esto tarda unos 10-15 segundos.</p>
      </div>
    )
  }

  // ── Resultado recién generado ────────────────────────────────────────────────
  if (current) {
    return (
      <div className="px-5 py-4 space-y-5 pb-8">
        <SummaryBody title={current.title} content={current.content} keyPoints={current.keyPoints} />
        <div className="flex flex-col gap-2">
          <button
            onClick={() => generate(topic, text || undefined)}
            className="w-full bg-bg-elevated border border-muted/50 text-text-primary font-medium rounded-xl py-2.5 text-sm hover:border-accent/50 transition-all"
          >
            🔄 Regenerar
          </button>
          <button
            onClick={clearCurrent}
            className="w-full text-text-secondary text-sm py-2 hover:text-text-primary transition-colors"
          >
            ← Volver
          </button>
        </div>
      </div>
    )
  }

  // ── Viendo un resumen guardado ───────────────────────────────────────────────
  if (openNote) {
    return (
      <div className="px-5 py-4 space-y-5 pb-8">
        <SummaryBody
          title={openNote.title}
          content={openNote.content}
          keyPoints={openNote.key_points}
        />
        <button
          onClick={() => setOpenNote(null)}
          className="w-full text-text-secondary text-sm py-2 hover:text-text-primary transition-colors"
        >
          ← Volver
        </button>
      </div>
    )
  }

  // ── Formulario + lista de guardados ──────────────────────────────────────────
  return (
    <div className="px-5 py-4 space-y-4 pb-8">
      <button
        onClick={onBack}
        className="text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        ← Modos
      </button>

      <div className="space-y-2">
        <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
          Tema
        </label>
        <input
          type="text"
          value={topic}
          onChange={e => setTopic(e.target.value)}
          placeholder="Ej: Integrales por sustitución"
          className="w-full bg-bg-elevated border border-muted/50 rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
          Texto de referencia <span className="normal-case text-text-secondary/70">(opcional)</span>
        </label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Pegá un apunte o texto si querés que el resumen se base en eso."
          rows={4}
          className="w-full bg-bg-elevated border border-muted/50 rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent transition-colors resize-none"
        />
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      <button
        onClick={() => generate(topic.trim(), text.trim() || undefined)}
        disabled={!canGenerate}
        className="w-full bg-accent text-white font-semibold rounded-xl py-3 text-sm hover:bg-accent/90 active:scale-[0.99] transition-all disabled:opacity-40"
      >
        Generar resumen
      </button>

      {/* Mis resúmenes guardados */}
      {saved.length > 0 && (
        <div className="pt-2 space-y-2">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">
            Mis resúmenes
          </p>
          {saved.map(note => (
            <div
              key={note.id}
              className="flex items-center gap-2 rounded-xl bg-bg-elevated border border-muted/40 px-3 py-2.5"
            >
              <button
                onClick={() => setOpenNote(note)}
                className="flex-1 min-w-0 text-left"
              >
                <p className="text-sm font-medium text-text-primary truncate">{note.title}</p>
                <p className="text-xs text-text-secondary truncate">{note.topic}</p>
              </button>
              <button
                onClick={() => removeNote(note.id)}
                aria-label="Borrar resumen"
                className="shrink-0 text-text-secondary hover:text-red-400 transition-colors text-sm px-1"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
