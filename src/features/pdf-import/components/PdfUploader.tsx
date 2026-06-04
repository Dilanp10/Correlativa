import { useState } from 'react'
import Button from '@/shared/components/Button'

interface Props {
  onFile: (file: File) => void
  disabled?: boolean
}

const MAX_BYTES = 5 * 1024 * 1024

export default function PdfUploader({ onFile, disabled = false }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  // Key para resetear el input y poder elegir el mismo archivo dos veces
  const [inputKey, setInputKey] = useState(0)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null)
    const file = e.target.files?.[0]
    if (!file) return

    // Validación tolerante (algunos browsers mandan type vacío en mobile)
    const looksLikePdf =
      file.type === 'application/pdf' ||
      file.type === '' ||
      file.name.toLowerCase().endsWith('.pdf')

    if (!looksLikePdf) {
      setError('El archivo tiene que ser un PDF.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('El PDF supera el límite de 5 MB.')
      return
    }

    setFileName(file.name)
    onFile(file)
  }

  function handleReset() {
    setFileName(null)
    setError(null)
    setInputKey(k => k + 1)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Usamos <label> envolvente en vez de click programático: el browser
          dispara el file picker directamente, sin JS intermedio. Esto evita
          un bug conocido en iOS Safari donde el click sintético no abre el
          selector si no proviene de un gesto directo del usuario. */}
      <label
        className={`w-full flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-muted bg-bg-surface py-10 px-6 text-text-secondary transition-all ${
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'cursor-pointer hover:border-accent/60 hover:text-text-primary'
        }`}
      >
        <input
          key={inputKey}
          type="file"
          accept="application/pdf,.pdf"
          onChange={handleChange}
          disabled={disabled}
          className="sr-only"
          aria-label="Seleccionar archivo PDF"
        />
        <span className="text-4xl" aria-hidden="true">📄</span>
        <span className="text-sm font-medium text-center break-all px-2">
          {fileName ? fileName : 'Tocá para elegir tu PDF'}
        </span>
        <span className="text-xs text-text-secondary">PDF de hasta 5 MB</span>
      </label>

      {error && (
        <p className="text-sm text-warning text-center" role="alert">
          {error}
        </p>
      )}

      {fileName && !error && !disabled && (
        <Button
          onClick={handleReset}
          variant="ghost"
          className="self-center"
        >
          Elegir otro
        </Button>
      )}
    </div>
  )
}
