import { useMemo } from 'react'
import type { Node, Edge } from '@xyflow/react'
import { useSubjectsStore } from '@/features/subjects/store/subjectsStore'
import type { SubjectNodeData } from '@/features/tree/components/SubjectNode'

// ── Dimensiones del layout ────────────────────────────────────────────────────
const NODE_WIDTH = 180  // ↑ de 160 a 180 para más espacio de texto (3 líneas)
const PANEL_PAD_X = 16
const PANEL_WIDTH = NODE_WIDTH + PANEL_PAD_X * 2 // 212
const COL_GAP = 56
const COL_SPACING = PANEL_WIDTH + COL_GAP // 268

const PANEL_PAD_TOP = 8
const HEADER_H = 40 // alto del título "AÑO N"
const CUAT_LABEL_H = 28 // alto de la etiqueta de cuatrimestre
const ROW_HEIGHT = 78 // alto aprox del nodo materia + gap
const SECTION_GAP = 16 // separación entre cuatrimestres
const PANEL_PAD_BOTTOM = 18

// Orden de cuatrimestres dentro de un año (null = "sin cuatrimestre", al final)
const SEMESTER_ORDER: (number | null)[] = [1, 2, null]

function cuatLabel(semester: number | null): string {
  if (semester === null) return 'Sin cuatrimestre'
  return `${semester}° Cuatrimestre`
}

function yearLabel(year: number | null): string {
  if (year === null) return 'Sin año'
  return `Año ${year}`
}

export function useTreeLayout() {
  const subjects = useSubjectsStore(s => s.subjects)
  const treeStates = useSubjectsStore(s => s.treeStates)
  const userSubjects = useSubjectsStore(s => s.userSubjects)
  const pendingUnlocks = useSubjectsStore(s => s.pendingUnlocks)

  const userSubjectMap = useMemo(
    () => new Map(userSubjects.map(us => [us.subject_id, us])),
    [userSubjects]
  )

  const pendingSet = useMemo(() => new Set(pendingUnlocks), [pendingUnlocks])

  const nodes = useMemo<Node[]>(() => {
    // Agrupar por año.
    const byYear = new Map<number | null, typeof subjects>()
    for (const subject of subjects) {
      const key = subject.year ?? null
      if (!byYear.has(key)) byYear.set(key, [])
      byYear.get(key)!.push(subject)
    }

    // Orden de columnas: años numéricos ascendentes, null al final.
    const years = Array.from(byYear.keys()).sort((a, b) => {
      if (a === null) return 1
      if (b === null) return -1
      return a - b
    })

    const subjectNodes: Node[] = []
    const labelNodes: Node[] = []
    const panelNodes: Node[] = []

    years.forEach((year, colIdx) => {
      const panelX = colIdx * COL_SPACING
      const contentX = panelX + PANEL_PAD_X
      const yearSubjects = byYear.get(year) ?? []

      // Sub-agrupar por cuatrimestre.
      const bySemester = new Map<number | null, typeof subjects>()
      for (const subject of yearSubjects) {
        const key = subject.semester ?? null
        if (!bySemester.has(key)) bySemester.set(key, [])
        bySemester.get(key)!.push(subject)
      }

      // Cursor vertical: empezamos debajo del header.
      let y = PANEL_PAD_TOP + HEADER_H

      for (const semester of SEMESTER_ORDER) {
        const semSubjects = bySemester.get(semester)
        if (!semSubjects || semSubjects.length === 0) continue

        // Etiqueta del cuatrimestre.
        labelNodes.push({
          id: `cuat-${year}-${semester}`,
          type: 'cuatLabel',
          position: { x: contentX, y },
          data: { label: cuatLabel(semester) },
          draggable: false,
          selectable: false,
          width: NODE_WIDTH,
          zIndex: 1,
        })
        y += CUAT_LABEL_H

        // Materias del cuatrimestre (orden alfabético).
        const sorted = semSubjects
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name, 'es'))

        for (const subject of sorted) {
          const us = userSubjectMap.get(subject.id)
          const data: SubjectNodeData = {
            subject,
            treeState: treeStates[subject.id] ?? 'bloqueada',
            userStatus: us?.status ?? 'no_cursada',
            grade: us?.grade ?? null,
            isPendingUnlock: pendingSet.has(subject.id),
          }

          subjectNodes.push({
            id: subject.id,
            type: 'subject',
            position: { x: contentX, y },
            data: data as unknown as Record<string, unknown>,
            draggable: false,
            selectable: false,
            zIndex: 2,
          })
          y += ROW_HEIGHT
        }

        y += SECTION_GAP
      }

      const panelHeight = y - SECTION_GAP + PANEL_PAD_BOTTOM

      panelNodes.push({
        id: `year-panel-${year}`,
        type: 'yearPanel',
        position: { x: panelX, y: 0 },
        data: {
          label: yearLabel(year),
          width: PANEL_WIDTH,
          height: panelHeight,
        },
        draggable: false,
        selectable: false,
        zIndex: 0,
      })
    })

    // Paneles primero (al fondo), luego etiquetas y materias.
    return [...panelNodes, ...labelNodes, ...subjectNodes]
  }, [subjects, treeStates, userSubjectMap, pendingSet])

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
          zIndex: 1,
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
