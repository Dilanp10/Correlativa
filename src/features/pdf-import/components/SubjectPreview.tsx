import { useMemo } from 'react'
import Button from '@/shared/components/Button'
import type { SubjectDraft } from '@/features/pdf-import/lib/types'
import { usePdfImport } from '@/features/pdf-import/hooks/usePdfImport'

interface Props {
  subjects: SubjectDraft[]
  warning: string | null
  onConfirm: () => void
  onCancel: () => void
  isSaving: boolean
}

interface IndexedSubject {
  subject: SubjectDraft
  index: number
}

interface YearGroup {
  year: number | null
  items: IndexedSubject[]
}

const YEAR_OPTIONS: (number | null)[] = [1, 2, 3, 4, 5, 6, null]
const SEMESTER_OPTIONS: (number | null)[] = [1, 2, null]

function groupByYear(subjects: SubjectDraft[]): YearGroup[] {
  const map = new Map<number | null, IndexedSubject[]>()
  subjects.forEach((subject, index) => {
    const key = subject.year
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push({ subject, index })
  })

  const entries = Array.from(map.entries()).sort((a, b) => {
    if (a[0] === null) return 1
    if (b[0] === null) return -1
    return a[0] - b[0]
  })

  return entries.map(([year, list]) => ({
    year,
    items: list.sort((x, y) => {
      const sx = x.subject.semester ?? 99
      const sy = y.subject.semester ?? 99
      if (sx !== sy) return sx - sy
      return x.subject.name.localeCompare(y.subject.name, 'es')
    }),
  }))
}

function yearLabel(year: number | null): string {
  if (year === null) return 'Sin año'
  return `${year}° año`
}

export default function SubjectPreview({
  subjects,
  warning,
  onConfirm,
  onCancel,
  isSaving,
}: Props) {
  const updateSubject = usePdfImport().updateSubject
  const removeSubject = usePdfImport().removeSubject
  const addSubject = usePdfImport().addSubject

  const groups = useMemo(() => groupByYear(subjects), [subjects])

  const yearsPresent = new Set(groups.map(g => g.year))
  const yearsToShow: (number | null)[] = [1, 2, 3, 4, 5, 6].filter(
    y => yearsPresent.has(y) || subjects.length > 0
  )
  if (yearsPresent.has(null)) yearsToShow.push(null)

  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-text-primary">Materias detectadas</h2>
        <p className="text-sm text-text-secondary">
          Encontramos <strong className="text-text-primary">{subjects.length}</strong>{' '}
          materia{subjects.length !== 1 ? 's' : ''}. Editá lo que haga falta antes de confirmar.
        </p>
      </div>

      {warning && (
        <div className="rounded-xl bg-warning/10 border border-warning/30 px-4 py-3 text-sm text-warning">
          <strong className="block mb-0.5">Atención</strong>
          <span className="text-warning/90">{warning}</span>
        </div>
      )}

      <div className="rounded-xl bg-bg-surface border border-muted/30 px-4 py-3 text-xs text-text-secondary">
        Cambiá el <strong className="text-text-primary">año</strong> y{' '}
        <strong className="text-text-primary">cuatrimestre</strong> con los selectores. Tocá
        <strong className="text-text-primary"> ✕ </strong> para borrar o
        <strong className="text-text-primary"> + Agregar </strong> para sumar una materia a ese año.
      </div>

      {/* Lista por año */}
      <div className="space-y-5">
        {yearsToShow.map(year => {
          const group = groups.find(g => g.year === year)
          const items = group?.items ?? []

          return (
            <section key={String(year)} className="space-y-2">
              <header className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                  {yearLabel(year)} · {items.length} materia{items.length !== 1 ? 's' : ''}
                </h3>
                <button
                  type="button"
                  onClick={() => addSubject(year)}
                  disabled={isSaving}
                  className="text-xs font-semibold text-accent hover:text-accent/80 disabled:opacity-40"
                >
                  + Agregar
                </button>
              </header>

              {items.length === 0 ? (
                <p className="text-xs text-text-secondary/70 italic px-1">
                  Sin materias en este año.
                </p>
              ) : (
                <ul className="space-y-2">
                  {items.map(({ subject, index }) => (
                    <li
                      key={index}
                      className="bg-bg-surface border border-muted/40 rounded-xl px-3 py-3 space-y-2"
                    >
                      <div className="flex items-start gap-2">
                        <input
                          type="text"
                          value={subject.name}
                          onChange={e => updateSubject(index, { name: e.target.value })}
                          disabled={isSaving}
                          placeholder="Nombre de la materia"
                          className="flex-1 min-w-0 bg-bg-base border border-muted/40 rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent disabled:opacity-50"
                        />
                        <button
                          type="button"
                          onClick={() => removeSubject(index)}
                          disabled={isSaving}
                          aria-label="Borrar materia"
                          className="shrink-0 w-9 h-9 rounded-lg text-red-400 hover:bg-red-500/10 disabled:opacity-40 text-lg leading-none"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        <label className="flex items-center gap-1.5 text-xs text-text-secondary">
                          Año
                          <select
                            value={subject.year ?? ''}
                            onChange={e =>
                              updateSubject(index, {
                                year: e.target.value === '' ? null : Number(e.target.value),
                              })
                            }
                            disabled={isSaving}
                            className="bg-bg-base border border-muted/40 rounded-md px-2 py-1 text-text-primary text-xs focus:outline-none focus:border-accent disabled:opacity-50"
                          >
                            {YEAR_OPTIONS.map(y => (
                              <option key={String(y)} value={y ?? ''}>
                                {y === null ? '—' : y}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="flex items-center gap-1.5 text-xs text-text-secondary">
                          Cuat.
                          <select
                            value={subject.semester ?? ''}
                            onChange={e =>
                              updateSubject(index, {
                                semester: e.target.value === '' ? null : Number(e.target.value),
                              })
                            }
                            disabled={isSaving}
                            className="bg-bg-base border border-muted/40 rounded-md px-2 py-1 text-text-primary text-xs focus:outline-none focus:border-accent disabled:opacity-50"
                          >
                            {SEMESTER_OPTIONS.map(s => (
                              <option key={String(s)} value={s ?? ''}>
                                {s === null ? '—' : s}
                              </option>
                            ))}
                          </select>
                        </label>

                        {subject.correlativeNames.length > 0 && (
                          <span className="text-xs text-text-secondary self-center">
                            · {subject.correlativeNames.length} correlativa
                            {subject.correlativeNames.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </div>

      {/* CTAs */}
      <div className="sticky bottom-0 -mx-5 px-5 pt-3 pb-4 bg-bg-base/95 backdrop-blur-sm border-t border-muted/30 flex flex-col gap-2 mt-2">
        <Button
          onClick={onConfirm}
          loading={isSaving}
          disabled={subjects.length === 0 || subjects.some(s => s.name.trim() === '')}
          className="w-full"
        >
          Confirmar y cargar materias
        </Button>
        <Button onClick={onCancel} variant="ghost" disabled={isSaving} className="w-full">
          Cancelar
        </Button>
      </div>
    </div>
  )
}
