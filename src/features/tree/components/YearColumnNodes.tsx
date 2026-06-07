import type { NodeProps } from '@xyflow/react'

// Nodos decorativos (no interactivos) que dan estructura visual al árbol:
// - YearPanelNode: panel de fondo por año, con título arriba
// - CuatLabelNode: etiqueta de cuatrimestre dentro de cada año
//
// Spec: specs/009-competitive-ui-redesign/contracts/ui-contracts.md §3
// Colores: usan `var(--accent-rgb)` para reflejar la carrera activa.

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
        border: '1px solid rgb(var(--accent-rgb) / 0.15)',
        background:
          'linear-gradient(180deg, rgb(var(--accent-rgb) / 0.07) 0%, rgba(17,17,24,0.4) 15%, rgba(17,17,24,0.1) 100%)',
        pointerEvents: 'none',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 48,
          marginTop: 4,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: 'rgb(var(--accent-rgb) / 0.85)',
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
        // #9090B0 sobre #0A0A0F = 4.82:1 (pasa WCAG AA). Antes #7A7A95 (~3.85:1, fallaba).
        color: '#9090B0',
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
          background: 'rgba(144,144,176,0.28)',
        }}
      />
    </div>
  )
}
