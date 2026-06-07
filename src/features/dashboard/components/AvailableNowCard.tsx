import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/shared/constants'

// Card protagonista del dashboard: responde "¿qué puedo cursar ahora?"
// Spec: specs/009-competitive-ui-redesign/contracts/ui-contracts.md §4
//
// Variantes:
// - available > 0: número grande prominente + CTA al árbol
// - available === 0: mensaje motivador para que el usuario apruebe más

interface Props {
  available: number
  isLoading: boolean
}

export default function AvailableNowCard({ available, isLoading }: Props) {
  const navigate = useNavigate()

  // Loading skeleton — mantenemos la altura para evitar saltos de layout
  if (isLoading) {
    return (
      <div
        className="rounded-2xl bg-accent/10 border border-accent/25 px-5 py-6 animate-pulse"
        style={{ minHeight: 132 }}
        aria-label="Cargando materias disponibles"
      />
    )
  }

  // Empty state — nada disponible aún
  if (available === 0) {
    return (
      <div className="rounded-2xl bg-bg-surface border border-muted/40 px-5 py-5 space-y-2">
        <p className="text-3xl">🌱</p>
        <p className="text-sm font-semibold text-text-primary">
          Todavía no tenés materias disponibles
        </p>
        <p className="text-xs text-text-secondary leading-relaxed">
          Marcá tus materias actuales como aprobadas o cargá tu plan de estudios
          para empezar a desbloquear correlativas.
        </p>
      </div>
    )
  }

  return (
    <motion.button
      type="button"
      onClick={() => navigate(ROUTES.TREE)}
      className="w-full rounded-2xl bg-accent/10 border border-accent/30 px-5 py-5 text-left active:scale-[0.99] transition-transform"
      whileHover={{ borderColor: 'rgb(var(--accent-rgb) / 0.5)' }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-accent mb-1">
            Podés cursar
          </p>
          <p className="text-5xl font-bold text-accent leading-none">
            {available}
          </p>
          <p className="text-sm font-medium text-text-primary mt-2">
            materia{available !== 1 ? 's' : ''} disponible{available !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="shrink-0 flex flex-col items-end gap-1">
          <span className="text-3xl">✦</span>
          <span className="text-xs font-semibold text-accent">Ver en el árbol →</span>
        </div>
      </div>
    </motion.button>
  )
}
