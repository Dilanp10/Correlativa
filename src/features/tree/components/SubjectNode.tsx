import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import type { SubjectWithCorrelatives, TreeNodeState, SubjectStatus } from '@/shared/types'

export interface SubjectNodeData {
  subject: SubjectWithCorrelatives
  treeState: TreeNodeState
  userStatus: SubjectStatus
  grade: number | null
}

const STATE_ICON: Record<TreeNodeState, string> = {
  bloqueada: '🔒',
  disponible_cursar: '✦',
  disponible_rendir: '✦',
  cursando: '◉',
  completada: '✓',
}

// Inline styles porque los valores de color del tema no son accesibles en JS
const BORDER: Record<TreeNodeState, string> = {
  bloqueada: '#3A3A4A',
  disponible_cursar: 'rgba(108,99,255,0.55)',
  disponible_rendir: 'rgba(34,211,238,0.6)', // cyan: fase de final
  cursando: 'rgba(245,158,11,0.65)',
  completada: 'rgba(34,197,94,0.6)',
}

const BG: Record<TreeNodeState, string> = {
  bloqueada: '#111118',
  disponible_cursar: '#111118',
  disponible_rendir: 'rgba(34,211,238,0.05)',
  cursando: 'rgba(245,158,11,0.06)',
  completada: 'rgba(34,197,94,0.07)',
}

const HANDLE_STYLE: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  width: 4,
  height: 4,
}

export function SubjectNode({ data }: NodeProps) {
  const d = data as unknown as SubjectNodeData

  return (
    <>
      <Handle type="target" position={Position.Left} style={HANDLE_STYLE} />

      <div
        style={{
          position: 'relative',
          borderColor: BORDER[d.treeState],
          backgroundColor: BG[d.treeState],
          opacity: d.treeState === 'bloqueada' ? 0.5 : 1,
          width: 160,
          borderWidth: 2,
          borderStyle: 'solid',
          borderRadius: 12,
          padding: '10px 12px',
          cursor: d.treeState === 'bloqueada' ? 'default' : 'pointer',
          transition: 'opacity 0.2s',
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
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
          <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>
            {STATE_ICON[d.treeState]}
          </span>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              lineHeight: 1.4,
              color: '#F0F0FF',
              margin: 0,
              display: '-webkit-box',
              WebkitLineClamp: 2,
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
              color: '#8080A0',
              marginTop: 4,
              marginLeft: 19,
            }}
          >
            Nota: {d.grade}
          </p>
        )}
      </div>

      <Handle type="source" position={Position.Right} style={HANDLE_STYLE} />
    </>
  )
}
