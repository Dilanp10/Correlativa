import { BaseEdge, getSmoothStepPath } from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'
import type { TreeNodeState } from '@/shared/types'

// Edge custom de React Flow con gradiente lineal entre el color del estado
// del nodo source y el del nodo target.
//
// Para que el SVG quede limpio:
// - Usamos la misma curva smoothstep que React Flow para mantener visual.
// - El gradiente lineal va siempre horizontal (las columnas del árbol son
//   por año, izquierda → derecha). Sirve también para casos diagonales.
//
// Spec: specs/009-competitive-ui-redesign/contracts/ui-contracts.md §2

export interface GradientEdgeData {
  sourceState: TreeNodeState
  targetState: TreeNodeState
}

// Color de stroke por estado (usado en ambos extremos del gradiente).
// Los "disponibles" usan el color de acento de la carrera.
const EDGE_COLOR: Record<TreeNodeState, string> = {
  bloqueada: '#3A3A4A',
  disponible_cursar: 'rgb(var(--accent-rgb))',
  disponible_rendir: '#22D3EE',
  cursando: '#F59E0B',
  completada: '#22C55E',
}

function colorFor(state: TreeNodeState | undefined): string {
  if (!state) return EDGE_COLOR.bloqueada
  return EDGE_COLOR[state] ?? EDGE_COLOR.bloqueada
}

// Opacidad del trazo según el estado destino:
// - completada: trazo nítido (es la materia "ganada")
// - cursando/disponibles: visible pero suave
// - bloqueada: muy apagada (no querés sobrecargar el árbol con cosas no útiles)
function opacityFor(targetState: TreeNodeState | undefined): number {
  if (targetState === 'completada') return 0.75
  if (targetState === 'cursando') return 0.55
  if (targetState === 'disponible_cursar' || targetState === 'disponible_rendir') return 0.55
  return 0.3
}

export function GradientEdge(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    markerEnd,
  } = props

  const d = (data ?? {}) as Partial<GradientEdgeData>
  const sourceColor = colorFor(d.sourceState)
  const targetColor = colorFor(d.targetState)
  const opacity = opacityFor(d.targetState)
  const strokeWidth = d.targetState === 'completada' ? 2 : 1.5

  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  // ID único del gradiente para que cada edge tenga el suyo.
  const gradId = `edge-grad-${id}`

  return (
    <>
      <defs>
        <linearGradient
          id={gradId}
          gradientUnits="userSpaceOnUse"
          x1={sourceX}
          y1={sourceY}
          x2={targetX}
          y2={targetY}
        >
          <stop offset="0%" stopColor={sourceColor} />
          <stop offset="100%" stopColor={targetColor} />
        </linearGradient>
      </defs>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: `url(#${gradId})`,
          strokeWidth,
          opacity,
        }}
      />
    </>
  )
}
