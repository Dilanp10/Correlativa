import type { NodeProps } from '@xyflow/react'

// Nodos decorativos (no interactivos) que dan estructura visual al árbol:
// un panel de fondo por año y una etiqueta por cuatrimestre.

export interface YearPanelData {
  label: string
  width: number
  height: number
}

export interface CuatLabelData {
  label: string
}

export function YearPanelNode({ data }: NodeProps) {
  const d = data as unknown as YearPanelData
  return (
    <div
      style={{
        width: d.width,
        height: d.height,
        borderRadius: 20,
        border: '1px solid rgba(108,99,255,0.18)',
        background:
          'linear-gradient(180deg, rgba(108,99,255,0.07) 0%, rgba(17,17,24,0.35) 30%)',
        pointerEvents: 'none',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 36,
          marginTop: 8,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: 0.4,
            textTransform: 'uppercase',
            color: '#B9B4FF',
          }}
        >
          {d.label}
        </span>
      </div>
    </div>
  )
}

export function CuatLabelNode({ data }: NodeProps) {
  const d = data as unknown as CuatLabelData
  return (
    <div
      style={{
        pointerEvents: 'none',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        color: '#7A7A95',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <span>{d.label}</span>
      <span
        style={{
          flex: 1,
          height: 1,
          background: 'rgba(122,122,149,0.25)',
        }}
      />
    </div>
  )
}
