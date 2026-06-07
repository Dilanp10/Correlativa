import { useEffect, useRef } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { motion, useAnimate } from 'framer-motion'
import type { SubjectWithCorrelatives, TreeNodeState, SubjectStatus } from '@/shared/types'
import { useSubjectsStore } from '@/features/subjects/store/subjectsStore'

export interface SubjectNodeData {
  subject: SubjectWithCorrelatives
  treeState: TreeNodeState
  userStatus: SubjectStatus
  grade: number | null
  /** Si true, dispara la animación de unlock al montar/actualizar. */
  isPendingUnlock: boolean
}

const STATE_ICON: Record<TreeNodeState, string> = {
  bloqueada: '🔒',
  disponible_cursar: '✦',
  disponible_rendir: '✦',
  cursando: '◉',
  completada: '✓',
}

// Colores de borde y fondo por estado.
// Los estados "disponible_*" usan el color de acento de la carrera activa
// vía CSS custom property (--accent-rgb). Los demás son fijos.
const BORDER: Record<TreeNodeState, string> = {
  bloqueada: '#3A3A4A',
  disponible_cursar: 'rgb(var(--accent-rgb) / 0.65)',
  disponible_rendir: 'rgba(34,211,238,0.7)', // cyan (fase de final)
  cursando: 'rgba(245,158,11,0.75)',
  completada: 'rgba(34,197,94,0.7)',
}

const BG: Record<TreeNodeState, string> = {
  bloqueada: '#111118',
  disponible_cursar: 'rgb(var(--accent-rgb) / 0.08)',
  disponible_rendir: 'rgba(34,211,238,0.06)',
  cursando: 'rgba(245,158,11,0.08)',
  completada: 'rgba(34,197,94,0.08)',
}

const BOX_SHADOW: Record<TreeNodeState, string> = {
  bloqueada: 'none',
  disponible_cursar:
    '0 0 16px rgb(var(--accent-rgb) / 0.18), inset 0 1px 0 rgba(255,255,255,0.04)',
  disponible_rendir: '0 0 16px rgba(34,211,238,0.18), inset 0 1px 0 rgba(255,255,255,0.04)',
  cursando: 'inset 0 1px 0 rgba(255,255,255,0.04)',
  completada: 'inset 0 1px 0 rgba(255,255,255,0.04)',
}

const HANDLE_STYLE: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  width: 4,
  height: 4,
}

// Estados que usan glassmorphism (blur sutil + glow).
function isGlassState(state: TreeNodeState): boolean {
  return state === 'disponible_cursar' || state === 'disponible_rendir'
}

export function SubjectNode({ data }: NodeProps) {
  const d = data as unknown as SubjectNodeData
  const [scope, animate] = useAnimate()
  // Solo permitimos que la animación corra una vez por mount/unlock event.
  const animatedRef = useRef(false)

  useEffect(() => {
    if (!d.isPendingUnlock || animatedRef.current) return
    animatedRef.current = true

    // Pulse de celebración: scale 1 → 1.08 → 0.98 → 1 + glow extra
    animate(
      scope.current,
      {
        scale: [1, 1.08, 0.98, 1],
        boxShadow: [
          BOX_SHADOW[d.treeState],
          '0 0 32px rgb(var(--accent-rgb) / 0.6)',
          '0 0 20px rgb(var(--accent-rgb) / 0.4)',
          BOX_SHADOW[d.treeState],
        ],
      },
      { duration: 0.6, ease: 'easeOut' }
    ).then(() => {
      // Limpiamos el flag en el store para que no se repita.
      useSubjectsStore.getState().clearUnlock(d.subject.id)
    })
  }, [d.isPendingUnlock, d.treeState, d.subject.id, animate, scope])

  const glass = isGlassState(d.treeState)

  return (
    <>
      <Handle type="target" position={Position.Left} style={HANDLE_STYLE} />

      <motion.div
        ref={scope}
        style={{
          position: 'relative',
          borderColor: BORDER[d.treeState],
          backgroundColor: BG[d.treeState],
          backdropFilter: glass ? 'blur(8px)' : 'none',
          WebkitBackdropFilter: glass ? 'blur(8px)' : 'none',
          boxShadow: BOX_SHADOW[d.treeState],
          opacity: d.treeState === 'bloqueada' ? 0.5 : 1,
          width: 180,
          borderWidth: 2,
          borderStyle: 'solid',
          borderRadius: 14,
          padding: '12px 14px',
          cursor: d.treeState === 'bloqueada' ? 'default' : 'pointer',
          transition: 'opacity 0.2s, border-color 0.2s, background-color 0.2s',
          userSelect: 'none',
        }}
      >
        {d.treeState === 'disponible_rendir' && (
          <span
            style={{
              position: 'absolute',
              top: -8,
              right: -6,
              fontSize: 8,
              fontWeight: 800,
              letterSpacing: 0.5,
              color: '#0A0A0F',
              background: '#22D3EE',
              borderRadius: 6,
              padding: '2px 5px',
              lineHeight: 1,
            }}
          >
            FINAL
          </span>
        )}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
          <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>
            {STATE_ICON[d.treeState]}
          </span>
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              lineHeight: 1.35,
              color: '#F0F0FF',
              margin: 0,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {d.subject.name}
          </p>
        </div>

        {d.grade !== null && (
          <p
            style={{
              fontSize: 10,
              color: '#9090B0', // antes #8080A0, ahora pasa WCAG AA (~4.8:1)
              marginTop: 4,
              marginLeft: 20,
            }}
          >
            Nota: {d.grade}
          </p>
        )}
      </motion.div>

      <Handle type="source" position={Position.Right} style={HANDLE_STYLE} />
    </>
  )
}
