import { useMemo } from 'react'
import Button from '@/shared/components/Button'
import type { SubjectDraft } from '@/features/pdf-import/lib/types'

interface Props {
  subjects: SubjectDraft[]
  warning: string | null
  onConfirm: () => void
  onCancel: () => void
  isSaving: boolean
}

interface YearGroup {
  year: number | null
  subjects: SubjectDraft[]
}

function groupByYear(subjects: SubjectDraft[]): YearGroup[] {
  const map = new Map<number | null, SubjectDraft[]>()
  for (const s of subjects) {
    const key = s.year
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(s)
  }
  // Orden: años numéricos asc, null al final.
  const entries = Array.from(map.entries()).sort((a, b) => {
    if (a[0] === null) return 1
    if (b[0] === null) return -1
    return a[0] - b[0]
  })
  return entries.map(([year, list]) => ({
    year,
    subjects: list.sort((x, y) => {
      const sx = x.semester ?? 99
      const sy = y.semester ?? 99
      if (sx !== sy) return sx - sy
      return x.name.localeCompare(y.name, 'es')
    }),
  }))
}

function yearLabel(year: number | null): string {
  if (year === null) return 'Sin año detectado'
  return `${year}° año`
}

export default function SubjectPreview({
  subjects,
  warning,
  onConfirm,
  onCancel,
  isSaving,
}: Props) {
  const groups = useMemo(() => groupByYear(subjects), [subjects])
  const lowConfidenceCount = subjects.filter(s => s.confidence === 'low').length

  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-text-primary">Materias detectadas</h2>
        <p className="text-sm text-text-secondary">
          Encontramos <strong className="text-text-primary">{subjects.length}</strong>{' '}
          materia{subjects.length !== 1 ? 's' : ''}. Revisalas antes de confirmar.
        </p>
      </div>

      {/* Warnings */}
      {warning && (
        <div className="rounded-xl bg-warning/10 border border-warning/30 px-4 py-3 text-sm text-warning">
          <strong className="block mb-0.5">Atención</strong>
          <span className="text-warning/90">{warning}</span>
        </div>
      )}

      {lowConfidenceCount > 0 && !warning && (
        <div className="rounded-xl bg-warning/10 border border-warning/30 px-4 py-3 text-sm text-warning">
          <strong className="block mb-0.5">Revisá las materias marcadas</strong>
          <span className="text-warning/90">
            {lowConfidenceCount} materia{lowConfidenceCount !== 1 ? 's' : ''} sin año o cuatrimestre claros. Vas a poder corregirlas después desde el árbol.
          </span>
        </div>
      )}

      {/* Lista por año */}
      <div className="space-y-5">
        {groups.map(group => (
          <section key={String(group.year)} className="space-y-2">
            <header className="text-xs font-bold text-text-secondary uppercase tracking-wider">
              {yearLabel(group.year)}
            </header>
            <ul className="space-y-2">
              {group.subjects.map((s, idx) => (
                <li
                  key={`${s.name}-${idx}`}
                  className="bg-bg-surface border border-muted/40 rounded-xl px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-text-primary font-medium leading-tight">
                        {s.name}
                      </p>
                      <p className="text-xs text-text-secondary mt-1">
                        {s.semester !== null
                          ? `${s.semester}° cuatrimestre`
                          : 'Sin cuatrimestre'}
                        {s.correlativeNames.length > 0 && (
                          <> · {s.correlativeNames.length} correlativa{s.correlativeNames.length !== 1 ? 's' : ''}</>
                        )}
                      </p>
                    </div>
                    {s.confidence === 'low' && (
                      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-warning bg-warning/10 px-2 py-0.5 rounded-md">
                        revisar
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* CTAs */}
      <div className="sticky bottom-0 -mx-5 px-5 pt-3 pb-4 bg-bg-base/95 backdrop-blur-sm border-t border-muted/30 flex flex-col gap-2 mt-2">
        <Button onClick={onConfirm} loading={isSaving} className="w-full">
          Confirmar y cargar materias
        </Button>
        <Button onClick={onCancel} variant="ghost" disabled={isSaving} className="w-full">
          Cancelar
        </Button>
      </div>
    </div>
  )
}
