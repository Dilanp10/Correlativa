import { useState } from 'react'
import { ReactFlow, Background, BackgroundVariant } from '@xyflow/react'
import type { NodeMouseHandler } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { useSubjects } from '@/features/subjects/hooks/useSubjects'
import { useAgenda } from '@/features/agenda/hooks/useAgenda'
import { SubjectNode } from '@/features/tree/components/SubjectNode'
import { YearPanelNode, CuatLabelNode } from '@/features/tree/components/YearColumnNodes'
import { useTreeLayout } from '@/features/tree/hooks/useTreeLayout'
import SubjectDetailSheet from '@/features/subjects/components/SubjectDetailSheet'
import SubjectAgendaEvents from '@/features/agenda/components/SubjectAgendaEvents'
import BottomNav from '@/shared/components/BottomNav'

// Definido fuera del componente: React Flow necesita una referencia estable
const nodeTypes = {
  subject: SubjectNode,
  yearPanel: YearPanelNode,
  cuatLabel: CuatLabelNode,
}

export default function TreePage() {
  const { isLoading, loaded } = useSubjects()
  useAgenda() // precarga los eventos para mostrarlos en el detalle de cada materia
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)

  const { nodes, edges } = useTreeLayout()

  // onNodeClick es el handler nativo de React Flow — siempre se dispara
  // aunque elementsSelectable=false, a diferencia del onClick en el nodo interno
  const handleNodeClick: NodeMouseHandler = (_event, node) => {
    // Solo las materias abren el detalle; los paneles/etiquetas son decorativos.
    if (node.type !== 'subject') return
    setSelectedSubjectId(node.id)
  }

  const showLoading = isLoading && !loaded
  const showEmpty = !isLoading && loaded && nodes.length === 0

  return (
    <div className="bg-bg-base flex flex-col" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="px-5 pt-11 pb-2 shrink-0 w-full max-w-md mx-auto">
        <h1 className="text-xl font-bold text-text-primary">Árbol de correlativas</h1>
      </div>

      {/* Leyenda */}
      <div className="px-5 pb-2 shrink-0 w-full max-w-md mx-auto">
        <div className="flex items-center gap-4 flex-wrap">
          {([
            { icon: '🔒', label: 'Bloqueada',  color: 'text-text-secondary' },
            { icon: '✦',  label: 'Para cursar', color: 'text-accent' },
            { icon: 'FINAL', label: 'Para rendir', color: 'text-cyan-400' },
            { icon: '◉',  label: 'Cursando',   color: 'text-warning' },
            { icon: '✓',  label: 'Completada', color: 'text-success' },
          ] as const).map(({ icon, label, color }) => (
            <span key={label} className="flex items-center gap-1.5 text-xs text-text-secondary">
              <span className={`${color} font-bold`}>{icon}</span>
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative" style={{ minHeight: 0, paddingBottom: 56 }}>
        {showLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-text-secondary text-sm animate-pulse">Cargando materias…</p>
          </div>
        )}

        {showEmpty && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
            <p className="text-4xl">📚</p>
            <p className="text-text-secondary text-sm">
              No hay materias cargadas para tu carrera todavía.
            </p>
          </div>
        )}

        {!showLoading && !showEmpty && (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeClick={handleNodeClick}
            fitView
            fitViewOptions={{ padding: 0.1 }}
            minZoom={0.15}
            maxZoom={1.5}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            proOptions={{ hideAttribution: true }}
            style={{ background: '#0A0A0F', width: '100%', height: '100%' }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              color="#2A2A3A"
              gap={24}
              size={1}
            />
          </ReactFlow>
        )}
      </div>

      <SubjectDetailSheet
        subjectId={selectedSubjectId}
        onClose={() => setSelectedSubjectId(null)}
        extraContent={
          selectedSubjectId ? <SubjectAgendaEvents subjectId={selectedSubjectId} /> : null
        }
      />

      <BottomNav />
    </div>
  )
}
