import { useRef, useState } from 'react'
import Button from '@/shared/components/Button'

interface Props {
  onFile: (file: File) => void
  disabled?: boolean
}

const MAX_BYTES = 5 * 1024 * 1024

export default function PdfUploader({ onFile, disabled = false }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  function handlePick() {
    inputRef.current?.click()
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null)
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
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

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={handleChange}
        disabled={disabled}
        className="hidden"
        aria-label="Seleccionar archivo PDF"
      />

      <button
        type="button"
        onClick={handlePick}
        disabled={disabled}
        className="w-full flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-muted bg-bg-surface py-10 px-6 text-text-secondary hover:border-accent/60 hover:text-text-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="text-4xl">📄</span>
        <span className="text-sm font-medium">
          {fileName ? fileName : 'Tocá para elegir tu PDF'}
        </span>
        <span className="text-xs text-text-secondary">PDF de hasta 5 MB</span>
      </button>

      {error && (
        <p className="text-sm text-warning" role="alert">
          {error}
        </p>
      )}

      {fileName && !error && (
        <Button
          onClick={handlePick}
          variant="ghost"
          disabled={disabled}
          className="self-center"
        >
          Elegir otro
        </Button>
      )}
    </div>
  )
}
