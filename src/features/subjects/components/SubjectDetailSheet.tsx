import { useRef, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import BottomSheet from '@/shared/components/BottomSheet'
import Badge from '@/shared/components/Badge'
import { useSubjectsStore } from '@/features/subjects/store/subjectsStore'
import { useUserSubjects } from '@/features/subjects/hooks/useUserSubjects'
import { useCareerStore } from '@/features/career/store/careerStore'
import { useCorrelatives } from '@/features/correlatives/hooks/useCorrelatives'
import StudyAISheet from '@/features/study-ai/components/StudyAISheet'
import type { CorrelativeType } from '@/shared/types'
import type { SubjectStatus, SubjectWithCorrelatives } from '@/shared/types'
import {
  STATUS_LABELS,
  UNBLOCKING_STATUSES,
  CURSAR_UNBLOCKING_STATUSES,
} from '@/shared/constants'

const ALL_STATUSES: SubjectStatus[] = [
  'no_cursada',
  'cursando',
  'regular',
  'aprobada',
  'promocionada',
  'final_pendiente',
  'libre',
]

const STATUSES_WITH_GRADE: SubjectStatus[] = ['aprobada', 'promocionada']

interface Props {
  subjectId: string | null
  onClose: () => void
  // Slot opcional para contenido de otras features (ej: eventos de agenda),
  // así subjects no depende directamente de agenda.
  extraContent?: ReactNode
}

export default function SubjectDetailSheet({ subjectId, onClose, extraContent }: Props) {
  const subjects = useSubjectsStore(s => s.subjects)
  const treeStates = useSubjectsStore(s => s.treeStates)
  const getUserSubject = useSubjectsStore(s => s.getUserSubject)
  const { updateStatus } = useUserSubjects()
  const activeCareer = useCareerStore(s => s.activeCareer)
  const { updateType, savingKey } = useCorrelatives()

  const [gradeInput, setGradeInput] = useState('')
  const [pendingStatus, setPendingStatus] = useState<SubjectStatus | null>(null)
  const [editingCorrelatives, setEditingCorrelatives] = useState(false)
  const [studyAIOpen, setStudyAIOpen] = useState(false)

  const subject = subjects.find(s => s.id === subjectId) ?? null
  const lastSubjectRef = useRef<SubjectWithCorrelatives | null>(null)
  if (subject) lastSubjectRef.current = subject
  const displaySubject = subject ?? lastSubjectRef.current

  const userSubject = subjectId ? getUserSubject(subjectId) : undefined
  const currentStatus = userSubject?.status ?? 'no_cursada'
  const currentGrade = userSubject?.grade ?? null
  const treeState = subjectId ? treeStates[subjectId] : undefined

  const canChangeStatus = treeState !== undefined && treeState !== 'bloqueada'

  // Correlativas separadas por tipo, con su estado de cumplimiento.
  type CorrItem = { name: string; met: boolean; status: SubjectStatus }
  const buildCorrItems = (ids: string[], unblocking: readonly string[]): CorrItem[] =>
    ids
      .map(id => {
        const s = subjects.find(sub => sub.id === id)
        if (!s) return null
        const st = getUserSubject(id)?.status ?? 'no_cursada'
        return { name: s.name, met: unblocking.includes(st), status: st }
      })
      .filter((x): x is CorrItem => x !== null)

  const cursarItems = displaySubject
    ? buildCorrItems(displaySubject.requiresCursar, CURSAR_UNBLOCKING_STATUSES)
    : []
  const rendirItems = displaySubject
    ? buildCorrItems(displaySubject.requiresRendir, UNBLOCKING_STATUSES)
    : []
  const unlocksNames =
    displaySubject?.unlocks.map(id => subjects.find(s => s.id === id)?.name).filter(Boolean) ?? []

  // Edición de tipo de correlativa: solo en carreras propias (custom/importadas).
  const canEditCorrelatives = activeCareer?.is_custom === true
  type EditItem = { id: string; name: string; type: CorrelativeType }
  const editItems: EditItem[] = displaySubject
    ? displaySubject.requires
        .map(id => {
          const s = subjects.find(sub => sub.id === id)
          if (!s) return null
          const type: CorrelativeType = displaySubject.requiresCursar.includes(id)
            ? 'para_cursar'
            : 'para_rendir'
          return { id, name: s.name, type }
        })
        .filter((x): x is EditItem => x !== null)
    : []

  async function handleStatusSelect(status: SubjectStatus) {
    if (!subjectId) return

    if (STATUSES_WITH_GRADE.includes(status)) {
      setPendingStatus(status)
      setGradeInput(currentGrade?.toString() ?? '')
      await updateStatus(subjectId, status, currentGrade)
    } else {
      setPendingStatus(null)
      await updateStatus(subjectId, status, null)
    }
  }

  async function handleGradeSubmit() {
    if (!subjectId || !pendingStatus) return
    const grade = parseFloat(gradeInput)
    if (!isNaN(grade) && grade >= 1 && grade <= 10) {
      await updateStatus(subjectId, pendingStatus, grade)
    }
    setPendingStatus(null)
  }

  return (
    <>
    <BottomSheet isOpen={subjectId !== null} onClose={onClose}>
      {displaySubject && (
        <div className="px-5 py-4 space-y-5 pb-8">
          {/* Header info */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs text-text-secondary">
                {displaySubject.year}° año · {displaySubject.semester}° cuatrimestre
              </span>
              {displaySubject.is_elective && (
                <span className="text-xs text-accent bg-accent/10 rounded px-2 py-0.5">
                  Optativa
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-text-primary leading-snug">
              {displaySubject.name}
            </h2>
            {displaySubject.code && (
              <p className="text-xs text-text-secondary mt-0.5">Código: {displaySubject.code}</p>
            )}
          </div>

          {/* Estado actual */}
          <div className="flex items-center gap-3">
            <Badge status={currentStatus} />
            {currentGrade !== null && (
              <span className="text-sm font-bold text-text-primary bg-bg-elevated px-2 py-0.5 rounded-lg">
                Nota: {currentGrade}
              </span>
            )}
          </div>

          {/* Bloqueada aviso */}
          {treeState === 'bloqueada' && (
            <div className="rounded-xl bg-bg-elevated border border-muted/50 px-4 py-3 flex items-start gap-2">
              <span className="text-base mt-0.5">🔒</span>
              <p className="text-sm text-text-secondary">
                Bloqueada. Te faltan correlativas para poder cursarla.
              </p>
            </div>
          )}

          {/* Estudiar con IA */}
          <button
            onClick={() => setStudyAIOpen(true)}
            className="w-full flex items-center gap-3 rounded-2xl bg-accent/10 border border-accent/25 px-4 py-3 hover:bg-accent/15 active:scale-[0.99] transition-all text-left"
          >
            <span className="text-xl">🤖</span>
            <span className="flex-1">
              <span className="block text-sm font-semibold text-text-primary">
                Estudiar con IA
              </span>
              <span className="block text-xs text-text-secondary">
                Quiz, resumen y flashcards
              </span>
            </span>
            <span className="text-accent">›</span>
          </button>

          {/* Selector de estado */}
          {canChangeStatus && (
            <div>
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2.5">
                Cambiar estado
              </p>
              <div className="flex flex-wrap gap-2">
                {ALL_STATUSES.map(status => (
                  <button
                    key={status}
                    onClick={() => handleStatusSelect(status)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      currentStatus === status
                        ? 'bg-accent text-white shadow-sm'
                        : 'bg-bg-elevated text-text-secondary hover:text-text-primary border border-muted/50'
                    }`}
                  >
                    {STATUS_LABELS[status]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input de nota */}
          <AnimatePresence>
            {pendingStatus !== null && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Nota (opcional)
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      max="10"
                      step="0.5"
                      value={gradeInput}
                      onChange={e => setGradeInput(e.target.value)}
                      placeholder="Ej: 8"
                      className="flex-1 bg-bg-elevated border border-muted rounded-xl px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent transition-colors"
                    />
                    <button
                      onClick={handleGradeSubmit}
                      className="bg-accent text-white px-4 py-2 rounded-xl text-sm font-medium"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => setPendingStatus(null)}
                      className="text-text-secondary px-2 py-2 rounded-xl text-sm hover:text-text-primary transition-colors"
                    >
                      Omitir
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Correlativas para cursar */}
          {cursarItems.length > 0 && (
            <div>
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
                Para cursar necesitás
              </p>
              <div className="space-y-1.5">
                {cursarItems.map(item => (
                  <div key={item.name} className="flex items-center gap-2 text-sm">
                    <span className={item.met ? 'text-success' : 'text-warning'}>
                      {item.met ? '✓' : '⚠'}
                    </span>
                    <span className="text-text-primary">{item.name}</span>
                    <span className="text-xs text-text-secondary ml-auto">
                      {STATUS_LABELS[item.status]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Correlativas para rendir el final */}
          {rendirItems.length > 0 && (
            <div>
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
                Para rendir el final necesitás
              </p>
              <div className="space-y-1.5">
                {rendirItems.map(item => (
                  <div key={item.name} className="flex items-center gap-2 text-sm">
                    <span className={item.met ? 'text-success' : 'text-red-400'}>
                      {item.met ? '✓' : '✗'}
                    </span>
                    <span className="text-text-primary">{item.name}</span>
                    <span className="text-xs text-text-secondary ml-auto">
                      {item.met ? 'aprobada' : STATUS_LABELS[item.status]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Materias que desbloquea */}
          {unlocksNames.length > 0 && (
            <div>
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
                Desbloquea
              </p>
              <div className="flex flex-wrap gap-2">
                {unlocksNames.map(name => (
                  <span
                    key={name}
                    className="text-xs bg-accent/10 border border-accent/20 text-accent px-2.5 py-1 rounded-lg"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Editar tipo de correlativas (solo carreras propias) */}
          {canEditCorrelatives && editItems.length > 0 && (
            <div>
              <button
                onClick={() => setEditingCorrelatives(v => !v)}
                className="text-xs font-medium text-accent hover:text-accent/80 transition-colors"
              >
                {editingCorrelatives ? 'Listo' : 'Editar correlativas'}
              </button>

              {editingCorrelatives && (
                <div className="mt-3 space-y-2.5">
                  {editItems.map(item => {
                    const key = `${displaySubject!.id}:${item.id}`
                    const isSaving = savingKey === key
                    return (
                      <div key={item.id} className="space-y-1">
                        <p className="text-sm text-text-primary">{item.name}</p>
                        <div className="flex gap-1.5">
                          {(['para_cursar', 'para_rendir'] as const).map(t => (
                            <button
                              key={t}
                              disabled={isSaving}
                              onClick={() =>
                                updateType(displaySubject!.id, item.id, item.type, t)
                              }
                              className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50 ${
                                item.type === t
                                  ? 'bg-accent text-white'
                                  : 'bg-bg-elevated text-text-secondary border border-muted/50'
                              }`}
                            >
                              {t === 'para_cursar' ? 'Para cursar' : 'Para rendir'}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Contenido extra (ej: próximos eventos de agenda) */}
          {extraContent}
        </div>
      )}
    </BottomSheet>

    <StudyAISheet
      subjectId={subjectId}
      subjectName={displaySubject?.name ?? ''}
      isOpen={studyAIOpen}
      onClose={() => setStudyAIOpen(false)}
    />
    </>
  )
}
