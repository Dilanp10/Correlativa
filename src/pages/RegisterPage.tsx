import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import Input from '@/shared/components/Input'
import Button from '@/shared/components/Button'
import { ROUTES } from '@/shared/constants'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [confirmError, setConfirmError] = useState('')
  const { handleSignUp, isLoading, error } = useAuth()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) {
      setConfirmError('Las contraseñas no coinciden.')
      return
    }
    setConfirmError('')
    await handleSignUp(email, password, name)
  }

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / título */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Correlativa</h1>
          <p className="mt-2 text-text-secondary text-sm">Creá tu cuenta para empezar.</p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <Input
            label="¿Cómo te llamamos?"
            type="text"
            autoComplete="name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Tu nombre o apodo"
            required
          />

          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="vos@email.com"
            required
          />

          <Input
            label="Contraseña"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            minLength={8}
            required
          />

          <Input
            label="Repetí la contraseña"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            error={confirmError}
            required
          />

          <Button type="submit" loading={isLoading} className="mt-2 w-full">
            Crear cuenta
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-text-secondary">
          ¿Ya tenés cuenta?{' '}
          <Link to={ROUTES.LOGIN} className="text-accent hover:underline font-medium">
            Iniciá sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
