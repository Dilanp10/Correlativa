import { useState } from 'react'
import { useFlashcards } from '@/features/study-ai/hooks/useFlashcards'
import FlashcardDeck from '@/features/study-ai/components/FlashcardDeck'
import type { FlashcardSetWithCards, FlashcardStatus } from '@/shared/types/v2'

interface Props {
  subjectId: string
  subjectName: string
  onBack?: () => void
}

export default function FlashcardsView({ subjectId, subjectName, onBack }: Props) {
  const { sets, isGenerating, error, generate, markCard, removeSet } = useFlashcards(
    subjectId,
    subjectName
  )

  const [topic, setTopic] = useState('')
  const [text, setText] = useState('')
  const [count, setCount] = useState(10)
  const [activeSet, setActiveSet] = useState<FlashcardSetWithCards | null>(null)

  const canGenerate = topic.trim().length >= 3 && !isGenerating

  async function handleGenerate() {
    const set = await generate(topic.trim(), count, text.trim() || undefined)
    if (set) setActiveSet(set)
  }

  // ── Repaso de un set ─────────────────────────────────────────────────────────
  if (activeSet) {
    // Tomamos la versión más fresca del set desde el hook (por si se marcaron tarjetas).
    const live = sets.find(s => s.id === activeSet.id) ?? activeSet
    return (
      <FlashcardDeck
        cards={live.flashcards}
        onMark={(cardId: string, status: FlashcardStatus) =>
          markCard(live.id, cardId, status)
        }
        onExit={() => setActiveSet(null)}
      />
    )
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isGenerating) {
    return (
      <div className="px-5 py-10 flex flex-col items-center text-center gap-4">
        <div className="w-9 h-9 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        <p className="text-text-primary font-medium">Generando flashcards…</p>
        <p className="text-text-secondary text-sm">Esto tarda unos 10-15 segundos.</p>
      </div>
    )
  }

  // ── Formulario + lista de sets ───────────────────────────────────────────────
  return (
    <div className="px-5 py-4 space-y-4 pb-8">
      {onBack && (
        <button
          onClick={onBack}
          className="text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          ← Modos
        </button>
      )}

      <div className="space-y-2">
        <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
          Tema
        </label>
        <input
          type="text"
          value={topic}
          onChange={e => setTopic(e.target.value)}
          placeholder="Ej: Leyes de Newton"
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
          placeholder="Pegá un apunte para que las tarjetas se basen en eso."
          rows={3}
          className="w-full bg-bg-elevated border border-muted/50 rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent transition-colors resize-none"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
            Cantidad
          </label>
          <span className="text-sm font-semibold text-accent">{count}</span>
        </div>
        <input
          type="range"
          min={5}
          max={20}
          step={1}
          value={count}
          onChange={e => setCount(Number(e.target.value))}
          className="w-full accent-accent"
        />
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={!canGenerate}
        className="w-full bg-accent text-white font-semibold rounded-xl py-3 text-sm hover:bg-accent/90 active:scale-[0.99] transition-all disabled:opacity-40"
      >
        Generar flashcards
      </button>

      {/* Mis sets guardados */}
      {sets.length > 0 && (
        <div className="pt-2 space-y-2">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">
            Mis sets
          </p>
          {sets.map(set => {
            const learned = set.flashcards.filter(c => c.status === 'aprendida').length
            return (
              <div
                key={set.id}
                className="flex items-center gap-2 rounded-xl bg-bg-elevated border border-muted/40 px-3 py-2.5"
              >
                <button onClick={() => setActiveSet(set)} className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-text-primary truncate">{set.topic}</p>
                  <p className="text-xs text-text-secondary">
                    {set.flashcards.length} tarjetas · {learned} aprendidas
                  </p>
                </button>
                <button
                  onClick={() => removeSet(set.id)}
                  aria-label="Borrar set"
                  className="shrink-0 text-text-secondary hover:text-red-400 transition-colors text-sm px-1"
                >
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
