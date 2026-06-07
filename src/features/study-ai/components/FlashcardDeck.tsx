import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Flashcard, FlashcardStatus } from '@/shared/types/v2'

interface Props {
  cards: Flashcard[]
  onMark: (cardId: string, status: FlashcardStatus) => void
  onExit: () => void
}

export default function FlashcardDeck({ cards, onMark, onExit }: Props) {
  // sessionCards permite reiniciar el mazo con las pendientes sin remount.
  const [sessionCards, setSessionCards] = useState<Flashcard[]>(cards)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [results, setResults] = useState<Record<string, FlashcardStatus>>({})

  const total = sessionCards.length
  const card = sessionCards[index]
  const done = index >= total

  function mark(status: FlashcardStatus) {
    if (!card) return
    onMark(card.id, status)
    setResults(prev => ({ ...prev, [card.id]: status }))
    setFlipped(false)
    setIndex(i => i + 1)
  }

  // ── Pantalla final ───────────────────────────────────────────────────────────
  if (done) {
    const values = Object.values(results)
    const learned = values.filter(v => v === 'aprendida').length
    const toReview = values.filter(v => v === 'repasar').length
    const pendingCards = sessionCards.filter(c => results[c.id] === 'repasar')

    return (
      <div className="px-5 py-8 flex flex-col items-center text-center gap-5 pb-8">
        <motion.p
          className="text-5xl"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
        >
          🎉
        </motion.p>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-text-primary">¡Terminaste el set!</h3>
        </div>

        <div className="flex gap-6">
          <div>
            <p className="text-2xl font-bold text-success">{learned}</p>
            <p className="text-xs text-text-secondary">Aprendidas</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-warning">{toReview}</p>
            <p className="text-xs text-text-secondary">A repasar</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full max-w-xs">
          {pendingCards.length > 0 && (
            <button
              onClick={() => {
                setSessionCards(pendingCards)
                setResults({})
                setIndex(0)
                setFlipped(false)
              }}
              className="w-full bg-accent text-white font-semibold rounded-xl py-3 text-sm hover:bg-accent/90 active:scale-[0.99] transition-all"
            >
              Repasar las {pendingCards.length} pendientes
            </button>
          )}
          <button
            onClick={onExit}
            className="w-full text-text-secondary text-sm py-2 hover:text-text-primary transition-colors"
          >
            ← Volver
          </button>
        </div>
      </div>
    )
  }

  if (!card) return null

  const progress = Math.round((index / total) * 100)

  // ── Tarjeta activa ───────────────────────────────────────────────────────────
  return (
    <div className="px-5 py-4 space-y-4 pb-8">
      <div>
        <p className="text-xs text-text-secondary mb-1.5">
          Tarjeta {index + 1} de {total}
        </p>
        <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Tarjeta con flip 3D */}
      <button
        onClick={() => setFlipped(f => !f)}
        className="w-full"
        style={{ perspective: 1000 }}
        aria-label={flipped ? 'Ver pregunta' : 'Ver respuesta'}
      >
        <motion.div
          className="relative w-full"
          style={{ transformStyle: 'preserve-3d', minHeight: 200 }}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Frente: pregunta */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-bg-elevated border border-muted/40 px-5 py-8"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
              Pregunta
            </span>
            <p className="text-base font-medium text-text-primary text-center leading-snug">
              {card.question}
            </p>
            <span className="text-xs text-text-secondary/70 mt-2">tocá para ver la respuesta</span>
          </div>

          {/* Dorso: respuesta */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-accent/10 border border-accent/30 px-5 py-6 overflow-y-auto"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-accent shrink-0">
              Respuesta
            </span>
            <p className="text-sm text-text-primary text-center leading-relaxed">{card.answer}</p>
          </div>
        </motion.div>
      </button>

      {/* Botón de voltear accesible (alternativa al tap) */}
      <button
        onClick={() => setFlipped(f => !f)}
        className="w-full text-xs text-text-secondary hover:text-text-primary transition-colors py-1"
      >
        🔄 Voltear
      </button>

      {/* Acciones */}
      <AnimatePresence>
        {flipped && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex gap-2"
          >
            <button
              onClick={() => mark('repasar')}
              className="flex-1 bg-warning/15 border border-warning/40 text-warning font-semibold rounded-xl py-3 text-sm active:scale-95 transition-all"
            >
              📚 Repasar
            </button>
            <button
              onClick={() => mark('aprendida')}
              className="flex-1 bg-success/15 border border-success/40 text-success font-semibold rounded-xl py-3 text-sm active:scale-95 transition-all"
            >
              ✓ Aprendida
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={onExit}
        className="w-full text-text-secondary text-sm py-1.5 hover:text-text-primary transition-colors"
      >
        Salir del repaso
      </button>
    </div>
  )
}
