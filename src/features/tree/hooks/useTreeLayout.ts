import { useMemo } from 'react'
import type { Node, Edge } from '@xyflow/react'
import { useSubjectsStore } from '@/features/subjects/store/subjectsStore'
import type { SubjectNodeData } from '@/features/tree/components/SubjectNode'

// Dimensiones de cada nodo y espaciado entre columnas/filas
const COL_SPACING = 224   // 160 (ancho) + 64 (gap horizontal)
const ROW_HEIGHT = 100    // 72 (alto aprox.) + 28 (gap vertical)

export function useTreeLayout() {
  const subjects = useSubjectsStore(s => s.subjects)
  const treeStates = useSubjectsStore(s => s.treeStates)
  const userSubjects = useSubjectsStore(s => s.userSubjects)

  const userSubjectMap = useMemo(
    () => new Map(userSubjects.map(us => [us.subject_id, us])),
    [userSubjects]
  )

  const nodes = useMemo<Node[]>(() => {
    // Agrupar por columna: (año-1)*2 + (cuatrimestre-1)
    // Col 0 = Año1 C1 | Col 1 = Año1 C2 | Col 2 = Año2 C1 | ...
    const byColumn = new Map<number, typeof subjects>()

    for (const subject of subjects) {
      const col = (subject.year - 1) * 2 + (subject.semester - 1)
      if (!byColumn.has(col)) byColumn.set(col, [])
      byColumn.get(col)!.push(subject)
    }

    const result: Node[] = []

    for (const [col, colSubjects] of byColumn.entries()) {
      colSubjects.forEach((subject, row) => {
        const us = userSubjectMap.get(subject.id)

        const data: SubjectNodeData = {
          subject,
          treeState: treeStates[subject.id] ?? 'bloqueada',
          userStatus: us?.status ?? 'no_cursada',
          grade: us?.grade ?? null,
        }

        result.push({
          id: subject.id,
          type: 'subject',
          position: {
            x: col * COL_SPACING,
            y: row * ROW_HEIGHT,
          },
          // React Flow exige Record<string, unknown>; SubjectNode recupera con cast
          data: data as unknown as Record<string, unknown>,
          draggable: false,
          selectable: false,
        })
      })
    }

    return result
  }, [subjects, treeStates, userSubjectMap])

  const edges = useMemo<Edge[]>(() => {
    return subjects.flatMap(subject =>
      subject.requires.map(reqId => {
        const reqState = treeStates[reqId]
        const isCompleted = reqState === 'completada'

        return {
          id: `edge-${reqId}-${subject.id}`,
          source: reqId,
          target: subject.id,
          type: 'smoothstep',
          animated: isCompleted,
          style: {
            stroke: isCompleted ? '#22C55E' : '#3A3A4A',
            strokeWidth: isCompleted ? 2 : 1.5,
            opacity: isCompleted ? 0.85 : 0.4,
          },
        }
      })
    )
  }, [subjects, treeStates])

  return { nodes, edges }
}
